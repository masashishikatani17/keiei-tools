/* 目標利益シミュレーター（/target-profit/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var marginRate = input.grossMarginPercent / 100;
    var monthlyRequired = (input.monthlyFixedCost + input.targetProfit) / marginRate;
    return {
      monthlyRequired: monthlyRequired,
      annualRequired: monthlyRequired * 12,
      monthlyBreakeven: input.monthlyFixedCost / marginRate,
      profitUplift: input.targetProfit / marginRate
    };
  }

  function renderResult(resultSection, r) {
    var html = '';
    html += '<p class="result-kicker">あなたの必要売上</p>';
    html += '<p class="result-hero-label">目標利益を出すために必要な月間売上</p>';
    html += '<p class="result-hero">月間 <strong>' + formatApproxYen(r.monthlyRequired) + '</strong> の売上</p>';
    html += '<p class="result-lead">固定費を払い、目標の利益を残すために必要な売上の目安です。</p>';

    html += resultBlock('必要売上', [
      resultRow('月間', formatApproxYen(r.monthlyRequired), true),
      resultRow('年間換算', formatApproxYen(r.annualRequired))
    ]);

    html += resultBlock('内訳の考え方', [
      resultRow('損益分岐点（利益ゼロの売上・月間）', formatApproxYen(r.monthlyBreakeven)),
      resultRow('目標利益分の上乗せ（月間）', formatApproxYen(r.profitUplift))
    ], '売上は粗利益率の分しか手元に残らないため、目標利益そのものより大きな売上の上乗せが必要になります。');

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('target-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = [
    'target-profit',
    'monthly-fixed-cost',
    'gross-margin',
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

    var targetRes = KT.readYen($('target-profit'));
    if (targetRes.error) {
      KT.showFieldError('target-profit', targetRes.error);
    } else if (targetRes.empty) {
      KT.showFieldError('target-profit', '必須項目です。毎月残したい利益を入力してください。');
    } else {
      input.targetProfit = targetRes.value;
    }
    if (input.targetProfit === undefined) {
      firstInvalid = $('target-profit');
    }

    var fixedRes = KT.readYen($('monthly-fixed-cost'));
    if (fixedRes.error) {
      KT.showFieldError('monthly-fixed-cost', fixedRes.error);
    } else if (fixedRes.empty) {
      KT.showFieldError('monthly-fixed-cost', '必須項目です。月間の固定費を入力してください。');
    } else {
      input.monthlyFixedCost = fixedRes.value;
    }
    if (input.monthlyFixedCost === undefined && !firstInvalid) {
      firstInvalid = $('monthly-fixed-cost');
    }

    var marginRes = KT.readNumber($('gross-margin'));
    if (marginRes.error) {
      KT.showFieldError('gross-margin', marginRes.error);
    } else if (marginRes.empty) {
      KT.showFieldError('gross-margin', '必須項目です。粗利益率（％）を入力してください。');
    } else if (marginRes.value <= 0) {
      KT.showFieldError('gross-margin', '粗利益率は0より大きい値を入力してください。0％のままでは必要売上を計算できません。');
    } else if (marginRes.value > 100) {
      KT.showFieldError('gross-margin', '粗利益率は100以下で入力してください。');
    } else {
      input.grossMarginPercent = marginRes.value;
    }
    if (input.grossMarginPercent === undefined && !firstInvalid) {
      firstInvalid = $('gross-margin');
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, compute(input));
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
