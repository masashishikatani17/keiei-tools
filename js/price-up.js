/* 値上げシミュレーター（/price-up/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var formatPercent1 = KT.formatPercent1;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var r = input.priceUpPercent;
    var m = input.grossMarginPercent;
    var result = {
      allowedDropPercent: (r / (m + r)) * 100,
      newMarginPercent: (m + r) / (1 + r / 100),
      gain: null
    };
    if (input.monthlySales !== null) {
      var monthlyGain = input.monthlySales * (r / 100);
      result.gain = {
        monthlyGain: monthlyGain,
        annualGain: monthlyGain * 12
      };
    }
    return result;
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">値上げの許容ライン</p>';
    html += '<p class="result-hero-label">値上げ前の粗利益額を維持できる客数減少の目安</p>';
    html += '<p class="result-hero">客数 <strong>約' + formatPercent1(r.allowedDropPercent) + '％減</strong> まで</p>';
    html += '<p class="result-lead">値上げ後、客数（販売数）の減少がこの範囲に収まれば、値上げ前と同じ粗利益額を確保できる計算です。減少がこれより大きいと、粗利益額は値上げ前を下回ります。</p>';

    html += resultBlock('値上げの効果', [
      resultRow('値上げ率', formatPercent1(input.priceUpPercent) + '％'),
      resultRow('現在の粗利益率', formatPercent1(input.grossMarginPercent) + '％'),
      resultRow('値上げ後の粗利益率', '約' + formatPercent1(r.newMarginPercent) + '％'),
      resultRow('客数減少の許容ライン', '約' + formatPercent1(r.allowedDropPercent) + '％', true)
    ]);

    if (r.gain) {
      html += resultBlock('現在の売上を前提とした場合', [
        resultRow('現在の月間売上', formatApproxYen(input.monthlySales)),
        resultRow('客数が変わらない場合の粗利益増加（月間）', formatApproxYen(r.gain.monthlyGain), true),
        resultRow('同（年間換算）', formatApproxYen(r.gain.annualGain))
      ], '値上げ分は原価が増えないため、そのまま粗利益の増加になります。');
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('priceup-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = [
    'price-up-rate',
    'gross-margin',
    'monthly-sales',
    'helper-sales',
    'helper-cost'
  ];

  KT.setupFields(allFieldIds);
  KT.setupMarginHelper('gross-margin');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(KT.clearFieldError);

    var input = {};
    var firstInvalid = null;

    var rateRes = KT.readNumber($('price-up-rate'));
    if (rateRes.error) {
      KT.showFieldError('price-up-rate', rateRes.error);
    } else if (rateRes.empty) {
      KT.showFieldError('price-up-rate', '必須項目です。値上げ率（％）を入力してください。');
    } else if (rateRes.value <= 0) {
      KT.showFieldError('price-up-rate', '値上げ率は0より大きい値を入力してください。');
    } else if (rateRes.value > 100) {
      KT.showFieldError('price-up-rate', '値上げ率は100以下で入力してください。');
    } else {
      input.priceUpPercent = rateRes.value;
    }
    if (input.priceUpPercent === undefined) {
      firstInvalid = $('price-up-rate');
    }

    var marginRes = KT.readNumber($('gross-margin'));
    if (marginRes.error) {
      KT.showFieldError('gross-margin', marginRes.error);
    } else if (marginRes.empty) {
      KT.showFieldError('gross-margin', '必須項目です。粗利益率（％）を入力してください。');
    } else if (marginRes.value <= 0) {
      KT.showFieldError('gross-margin', '粗利益率は0より大きい値を入力してください。');
    } else if (marginRes.value > 100) {
      KT.showFieldError('gross-margin', '粗利益率は100以下で入力してください。');
    } else {
      input.grossMarginPercent = marginRes.value;
    }
    if (input.grossMarginPercent === undefined && !firstInvalid) {
      firstInvalid = $('gross-margin');
    }

    var salesRes = KT.readYen($('monthly-sales'));
    if (salesRes.error) {
      KT.showFieldError('monthly-sales', salesRes.error);
      if (!firstInvalid) {
        firstInvalid = $('monthly-sales');
      }
    } else {
      input.monthlySales = salesRes.empty ? null : salesRes.value;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, input, compute(input));
    resultSection.hidden = false;
    KT.trackEvent('calc-price-up');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
