/* 経費削減シミュレーター（/cost-cut/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var marginRate = input.grossMarginPercent / 100;
    var equivalentMonthlySales = input.monthlyCut / marginRate;
    return {
      annualCut: input.monthlyCut * 12,
      equivalentMonthlySales: equivalentMonthlySales,
      equivalentAnnualSales: equivalentMonthlySales * 12
    };
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">削減の売上換算</p>';
    html += '<p class="result-hero-label">同じ利益効果を売上の増加で得る場合の金額</p>';
    html += '<p class="result-hero">月間 <strong>' + formatApproxYen(r.equivalentMonthlySales) + '</strong> の売上増に相当</p>';
    html += '<p class="result-lead">この経費削減は、粗利益ベースでみると、これだけの売上増加と同じ利益効果を持つ計算です。</p>';

    html += resultBlock('削減効果の整理', [
      resultRow('削減できる経費（月間）', formatApproxYen(input.monthlyCut)),
      resultRow('削減できる経費（年間）', formatApproxYen(r.annualCut)),
      resultRow('相当する売上増加（月間）', formatApproxYen(r.equivalentMonthlySales), true),
      resultRow('相当する売上増加（年間）', formatApproxYen(r.equivalentAnnualSales))
    ], '経費削減は全額が利益になりますが、売上は粗利益率の分しか残らないため、この差が生まれます。');

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('costcut-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = ['monthly-cut', 'gross-margin', 'helper-sales', 'helper-cost'];

  KT.setupFields(allFieldIds);
  KT.setupMarginHelper('gross-margin');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(KT.clearFieldError);

    var input = {};
    var firstInvalid = null;

    var cutRes = KT.readYen($('monthly-cut'));
    if (cutRes.error) {
      KT.showFieldError('monthly-cut', cutRes.error);
    } else if (cutRes.empty) {
      KT.showFieldError('monthly-cut', '必須項目です。削減できる経費を入力してください。');
    } else {
      input.monthlyCut = cutRes.value;
    }
    if (input.monthlyCut === undefined) {
      firstInvalid = $('monthly-cut');
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

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, input, compute(input));
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
