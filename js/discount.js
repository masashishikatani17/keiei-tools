/* 値引きシミュレーター（/discount/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatComma = KT.formatComma;
  var formatPercent1 = KT.formatPercent1;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var d = input.discountPercent;
    var m = input.grossMarginPercent;
    var result = {
      recoverable: d < m,
      newMarginPercent: (m - d) / (1 - d / 100),
      neededIncreasePercent: null,
      units: null
    };
    if (result.recoverable) {
      result.neededIncreasePercent = (d / (m - d)) * 100;
      if (input.monthlyUnits !== null) {
        var needed = Math.ceil(input.monthlyUnits * (1 + result.neededIncreasePercent / 100));
        result.units = {
          current: input.monthlyUnits,
          needed: needed,
          added: needed - input.monthlyUnits
        };
      }
    }
    return result;
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">値引きの回収ライン</p>';

    if (r.recoverable) {
      html += '<p class="result-hero-label">値引き前の粗利益額を維持するために必要な販売数の増加</p>';
      html += '<p class="result-hero">販売数 <strong>約' + formatPercent1(r.neededIncreasePercent) + '％増</strong> が必要</p>';
      html += '<p class="result-lead">値引き後の販売数の増加がこれを下回ると、たくさん売れても粗利益額は値引き前より減る計算です。</p>';

      html += resultBlock('値引きの影響', [
        resultRow('値引き率', formatPercent1(input.discountPercent) + '％'),
        resultRow('現在の粗利益率', formatPercent1(input.grossMarginPercent) + '％'),
        resultRow('値引き後の粗利益率', '約' + formatPercent1(r.newMarginPercent) + '％'),
        resultRow('必要な販売数の増加', '約' + formatPercent1(r.neededIncreasePercent) + '％', true)
      ]);

      if (r.units) {
        html += resultBlock('販売数でみた場合', [
          resultRow('現在の月間販売数', formatComma(r.units.current) + ' 個'),
          resultRow('必要な月間販売数', '約' + formatComma(r.units.needed) + ' 個', true),
          resultRow('増やす必要がある数', '約＋' + formatComma(r.units.added) + ' 個')
        ], '端数は切り上げています。');
      }
    } else {
      html += '<p class="result-hero-label">この値引き率では回収できない計算になります</p>';
      html += '<p class="result-message">値引き率（' + formatPercent1(input.discountPercent) + '％）が粗利益率（' +
        formatPercent1(input.grossMarginPercent) + '％）以上のため、1個あたりの粗利益がなくなり、販売数をどれだけ増やしても値引き前の粗利益額には届きません。</p>';

      html += resultBlock('値引きの影響', [
        resultRow('値引き率', formatPercent1(input.discountPercent) + '％'),
        resultRow('現在の粗利益率', formatPercent1(input.grossMarginPercent) + '％'),
        resultRow('値引き後の粗利益率', '約' + formatPercent1(r.newMarginPercent) + '％', true)
      ], '値引き後の粗利益率が0％以下の場合、売るほど粗利益が増えない（またはマイナスになる）状態です。');
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('discount-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = [
    'discount-rate',
    'gross-margin',
    'monthly-units',
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

    var rateRes = KT.readNumber($('discount-rate'));
    if (rateRes.error) {
      KT.showFieldError('discount-rate', rateRes.error);
    } else if (rateRes.empty) {
      KT.showFieldError('discount-rate', '必須項目です。値引き率（％）を入力してください。');
    } else if (rateRes.value <= 0) {
      KT.showFieldError('discount-rate', '値引き率は0より大きい値を入力してください。');
    } else if (rateRes.value >= 100) {
      KT.showFieldError('discount-rate', '値引き率は100未満で入力してください。');
    } else {
      input.discountPercent = rateRes.value;
    }
    if (input.discountPercent === undefined) {
      firstInvalid = $('discount-rate');
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

    var unitsRes = KT.readNumber($('monthly-units'));
    if (unitsRes.error) {
      KT.showFieldError('monthly-units', unitsRes.error);
      if (!firstInvalid) {
        firstInvalid = $('monthly-units');
      }
    } else if (unitsRes.empty) {
      input.monthlyUnits = null;
    } else if (unitsRes.value < 0) {
      KT.showFieldError('monthly-units', '0以上の数を入力してください。');
      if (!firstInvalid) {
        firstInvalid = $('monthly-units');
      }
    } else {
      input.monthlyUnits = unitsRes.value;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, input, compute(input));
    resultSection.hidden = false;
    KT.trackEvent('calc-discount');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
