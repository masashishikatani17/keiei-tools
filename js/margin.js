/* 粗利益率計算ツール（/margin/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var formatPercent1 = KT.formatPercent1;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var grossProfit = input.sales - input.cost;
    return {
      grossProfit: grossProfit,
      marginPercent: (grossProfit / input.sales) * 100,
      costPercent: (input.cost / input.sales) * 100,
      per1MillionSales: 1000000 * (grossProfit / input.sales)
    };
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">あなたの粗利益率</p>';

    if (r.grossProfit >= 0) {
      html += '<p class="result-hero-label">売上のうち、会社に残る粗利益の割合</p>';
      html += '<p class="result-hero">粗利益率 <strong>約' + formatPercent1(r.marginPercent) + '％</strong></p>';
      html += '<p class="result-lead">売上100万円あたり、約' + formatPercent1(r.marginPercent) + '万円が会社に残り、そこから固定費を払って利益を残す構造です。</p>';

      html += resultBlock('計算の内訳', [
        resultRow('売上高', formatApproxYen(input.sales)),
        resultRow('売上原価', formatApproxYen(input.cost)),
        resultRow('粗利益額', formatApproxYen(r.grossProfit), true),
        resultRow('粗利益率', '約' + formatPercent1(r.marginPercent) + '％', true),
        resultRow('原価率', '約' + formatPercent1(r.costPercent) + '％'),
        resultRow('売上100万円あたりの粗利益', formatApproxYen(r.per1MillionSales))
      ]);
    } else {
      html += '<p class="result-hero-label">売上原価が売上高を上回っています</p>';
      html += '<p class="result-message">粗利益が' + formatApproxYen(r.grossProfit) +
        'のマイナスとなり、粗利益率は約' + formatPercent1(r.marginPercent) +
        '％です。売る（作る）ほど損失が増える状態のため、入力値が正しいかも含めてご確認ください。</p>';

      html += resultBlock('計算の内訳', [
        resultRow('売上高', formatApproxYen(input.sales)),
        resultRow('売上原価', formatApproxYen(input.cost)),
        resultRow('粗利益額', 'マイナス' + formatApproxYen(r.grossProfit), true),
        resultRow('粗利益率', '約' + formatPercent1(r.marginPercent) + '％', true)
      ]);
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('margin-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = ['sales-amount', 'cost-amount'];

  KT.setupFields(allFieldIds);

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(KT.clearFieldError);

    var input = {};
    var firstInvalid = null;

    var salesRes = KT.readYen($('sales-amount'));
    if (salesRes.error) {
      KT.showFieldError('sales-amount', salesRes.error);
    } else if (salesRes.empty) {
      KT.showFieldError('sales-amount', '必須項目です。売上高を入力してください。');
    } else if (salesRes.value === 0) {
      KT.showFieldError('sales-amount', '売上高は0より大きい金額を入力してください。0円のままでは粗利益率を計算できません。');
    } else {
      input.sales = salesRes.value;
    }
    if (input.sales === undefined) {
      firstInvalid = $('sales-amount');
    }

    var costRes = KT.readYen($('cost-amount'));
    if (costRes.error) {
      KT.showFieldError('cost-amount', costRes.error);
    } else if (costRes.empty) {
      KT.showFieldError('cost-amount', '必須項目です。売上原価を入力してください（ない場合は0）。');
    } else {
      input.cost = costRes.value;
    }
    if (input.cost === undefined && !firstInvalid) {
      firstInvalid = $('cost-amount');
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, input, compute(input));
    resultSection.hidden = false;
    KT.trackEvent('calc-margin');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
