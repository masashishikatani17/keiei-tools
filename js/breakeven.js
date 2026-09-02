/* 損益分岐点シミュレーター（/breakeven/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var formatPercent1 = KT.formatPercent1;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var marginRate = input.grossMarginPercent / 100;
    var monthlyBreakeven = input.monthlyFixedCost / marginRate;
    var result = {
      monthlyBreakeven: monthlyBreakeven,
      annualBreakeven: monthlyBreakeven * 12,
      current: null
    };
    if (input.currentSales !== null) {
      result.current = {
        sales: input.currentSales,
        diff: input.currentSales - monthlyBreakeven
      };
    }
    return result;
  }

  function renderResult(resultSection, r) {
    var html = '';
    html += '<p class="result-kicker">あなたの損益分岐点</p>';
    html += '<p class="result-hero-label">赤字にならないために必要な月間売上</p>';
    html += '<p class="result-hero">月間 <strong>' + formatApproxYen(r.monthlyBreakeven) + '</strong> の売上</p>';
    html += '<p class="result-lead">売上がこの金額を下回ると粗利益で固定費を払いきれず赤字に、上回ると黒字になる目安です。</p>';

    html += resultBlock('損益分岐点売上', [
      resultRow('月間', formatApproxYen(r.monthlyBreakeven), true),
      resultRow('年間換算', formatApproxYen(r.annualBreakeven))
    ]);

    if (r.current) {
      var rows = [
        resultRow('現在の月間売上', formatApproxYen(r.current.sales)),
        resultRow('損益分岐点（月間）', formatApproxYen(r.monthlyBreakeven))
      ];
      var note = null;
      if (r.current.diff > 0) {
        rows.push(resultRow('分岐点までの余裕（月間）', formatApproxYen(r.current.diff) + 'の余裕', true));
        if (r.current.sales > 0) {
          var safetyPercent = (r.current.diff / r.current.sales) * 100;
          rows.push(resultRow('安全余裕率', '約' + formatPercent1(safetyPercent) + '％'));
          note = '安全余裕率は、売上が何％落ちると損益分岐点に達するかの目安です。';
        }
      } else if (r.current.diff < 0) {
        rows.push(resultRow('分岐点までの不足（月間）', formatApproxYen(r.current.diff) + 'の不足', true));
        if (r.current.sales > 0) {
          var increasePercent = (r.monthlyBreakeven / r.current.sales - 1) * 100;
          rows.push(resultRow('必要な売上増加率', '約' + formatPercent1(increasePercent) + '％'));
        }
        note = '現在の売上は損益分岐点を下回っています。この差を粗利益で埋めるまでは赤字となる計算です。';
      } else {
        note = '現在の売上は、ほぼ損益分岐点上にあります。';
      }
      html += resultBlock('現在の売上との比較', rows, note);
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('breakeven-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = [
    'monthly-fixed-cost',
    'gross-margin',
    'current-sales',
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

    var fixedRes = KT.readYen($('monthly-fixed-cost'));
    if (fixedRes.error) {
      KT.showFieldError('monthly-fixed-cost', fixedRes.error);
    } else if (fixedRes.empty) {
      KT.showFieldError('monthly-fixed-cost', '必須項目です。月間の固定費を入力してください。');
    } else {
      input.monthlyFixedCost = fixedRes.value;
    }
    if (input.monthlyFixedCost === undefined) {
      firstInvalid = $('monthly-fixed-cost');
    }

    var marginRes = KT.readNumber($('gross-margin'));
    if (marginRes.error) {
      KT.showFieldError('gross-margin', marginRes.error);
    } else if (marginRes.empty) {
      KT.showFieldError('gross-margin', '必須項目です。粗利益率（％）を入力してください。');
    } else if (marginRes.value <= 0) {
      KT.showFieldError('gross-margin', '粗利益率は0より大きい値を入力してください。0％のままでは損益分岐点を計算できません。');
    } else if (marginRes.value > 100) {
      KT.showFieldError('gross-margin', '粗利益率は100以下で入力してください。');
    } else {
      input.grossMarginPercent = marginRes.value;
    }
    if (input.grossMarginPercent === undefined && !firstInvalid) {
      firstInvalid = $('gross-margin');
    }

    var currentRes = KT.readYen($('current-sales'));
    if (currentRes.error) {
      KT.showFieldError('current-sales', currentRes.error);
      if (!firstInvalid) {
        firstInvalid = $('current-sales');
      }
    } else {
      input.currentSales = currentRes.empty ? null : currentRes.value;
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
