/* 投資回収シミュレーター（/investment/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var formatPercent1 = KT.formatPercent1;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var net = input.monthlyGain - input.monthlyMaintain;
    var result = {
      net: net,
      annualNet: net * 12,
      months: null,
      years: null
    };
    if (net > 0) {
      result.months = input.investment / net;
      result.years = result.months / 12;
    }
    return result;
  }

  function periodText(r) {
    if (r.months >= 1200) {
      return '100年以上';
    }
    if (r.years >= 1) {
      return '約' + formatPercent1(r.years) + '年';
    }
    return '約' + formatPercent1(r.months) + 'か月';
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">投資回収の目安</p>';

    if (r.months !== null) {
      html += '<p class="result-hero-label">投資額を回収できるまでの期間（単純回収期間）</p>';
      html += '<p class="result-hero">回収まで <strong>' + periodText(r) + '</strong></p>';
      html += '<p class="result-lead">投資による毎月の純増分（増える粗利益 − 維持費）が、見込みどおり続いた場合の概算です。</p>';

      var rows = [
        resultRow('投資額', formatApproxYen(input.investment)),
        resultRow('増える粗利益（月間）', formatApproxYen(input.monthlyGain)),
        resultRow('維持費（月間）', formatApproxYen(input.monthlyMaintain)),
        resultRow('純増分（月間）', formatApproxYen(r.net), true),
        resultRow('純増分（年間）', formatApproxYen(r.annualNet))
      ];
      if (r.months < 1200) {
        rows.push(resultRow('回収期間', periodText(r) + '（約' + Math.ceil(r.months) + 'か月）', true));
      }
      html += resultBlock('回収の内訳', rows,
        '回収が終わった後は、毎月の純増分がそのまま利益側に効いてくる計算になります。');
    } else {
      html += '<p class="result-hero-label">この前提では回収できない計算になります</p>';
      html += '<p class="result-message">増える粗利益（月間' + formatApproxYen(input.monthlyGain) + '）が維持費（月間' +
        formatApproxYen(input.monthlyMaintain) + '）以下のため、毎月の純増分がなく、投資額を回収できない計算です。</p>';

      html += resultBlock('前提の整理', [
        resultRow('投資額', formatApproxYen(input.investment)),
        resultRow('増える粗利益（月間）', formatApproxYen(input.monthlyGain)),
        resultRow('維持費（月間）', formatApproxYen(input.monthlyMaintain)),
        resultRow('純増分（月間）', (r.net < 0 ? formatApproxYen(r.net) + 'のマイナス' : '0円'), true)
      ], '増える粗利益の見込みか維持費の前提を変えると、結果は変わります。');
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('investment-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = ['investment-amount', 'monthly-gain', 'monthly-maintain'];

  KT.setupFields(allFieldIds);

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(KT.clearFieldError);

    var input = {};
    var firstInvalid = null;

    var investRes = KT.readYen($('investment-amount'));
    if (investRes.error) {
      KT.showFieldError('investment-amount', investRes.error);
    } else if (investRes.empty) {
      KT.showFieldError('investment-amount', '必須項目です。投資額を入力してください。');
    } else if (investRes.value === 0) {
      KT.showFieldError('investment-amount', '投資額は0より大きい金額を入力してください。');
    } else {
      input.investment = investRes.value;
    }
    if (input.investment === undefined) {
      firstInvalid = $('investment-amount');
    }

    var gainRes = KT.readYen($('monthly-gain'));
    if (gainRes.error) {
      KT.showFieldError('monthly-gain', gainRes.error);
    } else if (gainRes.empty) {
      KT.showFieldError('monthly-gain', '必須項目です。増える月間の粗利益を入力してください。');
    } else {
      input.monthlyGain = gainRes.value;
    }
    if (input.monthlyGain === undefined && !firstInvalid) {
      firstInvalid = $('monthly-gain');
    }

    var maintainRes = KT.readYen($('monthly-maintain'));
    if (maintainRes.error) {
      KT.showFieldError('monthly-maintain', maintainRes.error);
      if (!firstInvalid) {
        firstInvalid = $('monthly-maintain');
      }
    } else {
      input.monthlyMaintain = maintainRes.empty ? 0 : maintainRes.value;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, input, compute(input));
    resultSection.hidden = false;
    KT.trackEvent('calc-investment');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
