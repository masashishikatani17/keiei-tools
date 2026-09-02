/* 資金繰りシミュレーター（/cash/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatApproxYen = KT.formatApproxYen;
  var formatPercent1 = KT.formatPercent1;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var burn = input.monthlyOut - input.monthlyIn;
    var result = {
      burn: burn,
      months: null
    };
    if (burn > 0) {
      result.months = input.cashBalance / burn;
    }
    return result;
  }

  /* 月数を「約8.3か月」形式にする。12か月以上は「（約1年3か月）」を併記する */
  function formatMonths(months) {
    if (months >= 1200) {
      return '100年以上';
    }
    var text = '約' + formatPercent1(months) + 'か月';
    if (months >= 12) {
      var years = Math.floor(months / 12);
      var rest = Math.round(months - years * 12);
      if (rest === 12) {
        years += 1;
        rest = 0;
      }
      text += '（約' + years + '年' + (rest > 0 ? rest + 'か月' : '') + '）';
    }
    return text;
  }

  /* 現金が尽きる時期の目安（今月 ＋ 残り月数） */
  function depletionLabel(months) {
    if (months >= 1200) {
      return '100年以上先';
    }
    var now = new Date();
    var target = new Date(now.getFullYear(), now.getMonth() + Math.floor(months), 1);
    return target.getFullYear() + '年' + (target.getMonth() + 1) + '月頃';
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">資金の残り時間</p>';

    var balanceRows = [
      resultRow('現在の現金・預金残高', formatApproxYen(input.cashBalance)),
      resultRow('月間の支出合計', formatApproxYen(input.monthlyOut)),
      resultRow('月間の収入合計', formatApproxYen(input.monthlyIn))
    ];

    if (r.months !== null) {
      html += '<p class="result-hero-label">今の収支が続いた場合に現金がもつ期間</p>';
      html += '<p class="result-hero">あと <strong>' + formatMonths(r.months) + '</strong></p>';
      html += '<p class="result-lead">今の収支がそのまま続いた場合の単純計算です。実際には入金・支払いのタイミングや季節変動で前後します。</p>';

      balanceRows.push(resultRow('月間収支', formatApproxYen(r.burn) + 'の減少 / 月', true));
      balanceRows.push(resultRow('現金が尽きる時期の目安', depletionLabel(r.months), true));
      html += resultBlock('資金繰りの整理', balanceRows);
    } else if (r.burn < 0) {
      html += '<p class="result-hero-label">今の収支が続いた場合</p>';
      html += '<p class="result-message">収入が支出を上回っているため、この前提では現金は減らず、毎月' +
        formatApproxYen(r.burn) + 'ずつ増えていく計算です。</p>';

      balanceRows.push(resultRow('月間収支', formatApproxYen(r.burn) + 'の増加 / 月', true));
      html += resultBlock('資金繰りの整理', balanceRows,
        '今の収支が続いた場合の単純計算です。大きな支払いの予定がある場合は、その分も考慮してください。');
    } else {
      html += '<p class="result-hero-label">今の収支が続いた場合</p>';
      html += '<p class="result-message">収入と支出が同額のため、この前提では現金残高は増えも減りもしない計算です。</p>';

      balanceRows.push(resultRow('月間収支', '±0円 / 月', true));
      html += resultBlock('資金繰りの整理', balanceRows,
        '今の収支が続いた場合の単純計算です。大きな支払いの予定がある場合は、その分も考慮してください。');
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('cash-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = ['cash-balance', 'monthly-out', 'monthly-in'];

  KT.setupFields(allFieldIds);

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(KT.clearFieldError);

    var fields = [
      { id: 'cash-balance', key: 'cashBalance', label: '現金・預金残高' },
      { id: 'monthly-out', key: 'monthlyOut', label: '月間の支出合計' },
      { id: 'monthly-in', key: 'monthlyIn', label: '月間の収入合計' }
    ];

    var input = {};
    var firstInvalid = null;

    fields.forEach(function (field) {
      var res = KT.readYen($(field.id));
      if (res.error) {
        KT.showFieldError(field.id, res.error);
      } else if (res.empty) {
        KT.showFieldError(field.id, '必須項目です。' + field.label + 'を入力してください（ない場合は0）。');
      } else {
        input[field.key] = res.value;
        return;
      }
      if (!firstInvalid) {
        firstInvalid = $(field.id);
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResult(resultSection, input, compute(input));
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
