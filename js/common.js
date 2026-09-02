/* 経営tools 共通ヘルパー
   数値フォーマット・入力読み取り・エラー表示・粗利益率補助など、
   全ツールで共通の処理のみを置く。ツール固有の計算は各ツールのJSに書く。 */
window.KT = (function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  /* ---------- 数値フォーマット ---------- */

  function formatComma(value) {
    return Math.round(value).toLocaleString('ja-JP');
  }

  /* 円単位の金額を1万円単位に四捨五入して「約○万円」で表示する。
     1万円未満は円のまま、1億円以上は「約○億○万円」で表示する。 */
  function formatApproxYen(yen) {
    if (typeof yen !== 'number' || !isFinite(yen)) {
      return '計算できません';
    }
    var abs = Math.abs(yen);
    if (abs < 10000) {
      return '約' + formatComma(abs) + '円';
    }
    var man = Math.round(abs / 10000);
    if (man >= 10000) {
      var oku = Math.floor(man / 10000);
      var rest = man % 10000;
      return '約' + formatComma(oku) + '億' + (rest > 0 ? formatComma(rest) + '万' : '') + '円';
    }
    return '約' + formatComma(man) + '万円';
  }

  /* パーセントを小数1桁に丸めて表示する（例: 16.7 / 25） */
  function formatPercent1(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '計算できません';
    }
    var rounded = Math.round(value * 10) / 10;
    return rounded.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
  }

  /* 入力欄の下に出すカンマ区切りの補助表示 */
  function formatAid(value) {
    var text = formatComma(value) + '円';
    if (value >= 10000) {
      var man = value / 10000;
      text += man === Math.floor(man)
        ? '（' + formatComma(man) + '万円）'
        : '（約' + formatComma(Math.round(man)) + '万円）';
    }
    return text;
  }

  /* ---------- 入力の読み取り ---------- */

  function readNumber(inputEl) {
    var raw = inputEl.value.trim();
    if (raw === '') {
      if (inputEl.validity && inputEl.validity.badInput) {
        return { error: '数値で入力してください。' };
      }
      return { empty: true };
    }
    var value = Number(raw);
    if (!isFinite(value)) {
      return { error: '数値で入力してください。' };
    }
    return { value: value };
  }

  /* 金額欄（0以上の数値のみ） */
  function readYen(inputEl) {
    var r = readNumber(inputEl);
    if (r.error || r.empty) {
      return r;
    }
    if (r.value < 0) {
      return { error: '0以上の金額を入力してください。' };
    }
    return r;
  }

  /* ---------- エラー表示 ---------- */

  function showFieldError(fieldId, message) {
    var input = $(fieldId);
    var errorEl = $(fieldId + '-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    if (input) {
      input.classList.add('input-error');
      input.setAttribute('aria-invalid', 'true');
    }
  }

  function clearFieldError(fieldId) {
    var input = $(fieldId);
    var errorEl = $(fieldId + '-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
    if (input) {
      input.classList.remove('input-error');
      input.removeAttribute('aria-invalid');
    }
  }

  /* ---------- 結果表示の部品 ---------- */

  function resultRow(label, value, isTotal) {
    return '<div class="result-row' + (isTotal ? ' result-row-total' : '') + '">' +
      '<span class="result-row-label">' + label + '</span>' +
      '<span class="result-row-value">' + value + '</span>' +
      '</div>';
  }

  function resultBlock(title, rows, note) {
    var html = '<section class="result-block"><h3>' + title + '</h3>';
    html += rows.join('');
    if (note) {
      html += '<p class="result-note">' + note + '</p>';
    }
    html += '</section>';
    return html;
  }

  /* ---------- フォームの共通セットアップ ----------
     各入力欄に「入力し直したらエラーを消す」「金額欄はカンマ区切り補助を出す」を仕込む。 */
  function setupFields(fieldIds) {
    fieldIds.forEach(function (fieldId) {
      var input = $(fieldId);
      if (!input) {
        return;
      }
      var aid = $(fieldId + '-aid');
      input.addEventListener('input', function () {
        clearFieldError(fieldId);
        if (aid) {
          var r = readNumber(input);
          aid.textContent = (r.value !== undefined && r.value >= 0) ? formatAid(r.value) : '';
        }
      });
    });
  }

  /* ---------- 粗利益率の補助機能 ----------
     ページ内の #helper-sales / #helper-cost / #apply-margin /
     #margin-helper-error / #margin-helper-result を使い、
     計算結果を marginInputId の欄に反映する。 */
  function setupMarginHelper(marginInputId) {
    var applyBtn = $('apply-margin');
    if (!applyBtn) {
      return;
    }

    function hideMessages() {
      var errorEl = $('margin-helper-error');
      var resultEl = $('margin-helper-result');
      errorEl.textContent = '';
      errorEl.hidden = true;
      resultEl.textContent = '';
      resultEl.hidden = true;
    }

    ['helper-sales', 'helper-cost'].forEach(function (id) {
      $(id).addEventListener('input', hideMessages);
    });

    applyBtn.addEventListener('click', function () {
      clearFieldError('helper-sales');
      clearFieldError('helper-cost');
      hideMessages();

      var salesRes = readYen($('helper-sales'));
      var costRes = readYen($('helper-cost'));
      var hasError = false;

      if (salesRes.error) {
        showFieldError('helper-sales', salesRes.error);
        hasError = true;
      } else if (salesRes.empty) {
        showFieldError('helper-sales', '売上高を入力してください。');
        hasError = true;
      } else if (salesRes.value === 0) {
        showFieldError('helper-sales', '売上高が0円のままでは粗利益率を計算できません。0より大きい金額を入力してください。');
        hasError = true;
      }

      if (costRes.error) {
        showFieldError('helper-cost', costRes.error);
        hasError = true;
      } else if (costRes.empty) {
        showFieldError('helper-cost', '売上原価を入力してください。ない場合は0を入力してください。');
        hasError = true;
      }

      if (hasError) {
        return;
      }

      var marginPercent = ((salesRes.value - costRes.value) / salesRes.value) * 100;
      if (marginPercent <= 0) {
        var helperError = $('margin-helper-error');
        helperError.textContent = '売上原価が売上高以上のため、粗利益率が0％以下になり計算できません。金額をご確認ください。';
        helperError.hidden = false;
        return;
      }

      var rounded = Math.round(marginPercent * 10) / 10;
      $(marginInputId).value = String(rounded);
      clearFieldError(marginInputId);

      var helperResult = $('margin-helper-result');
      helperResult.textContent = '粗利益率 ' + rounded + '％ を上の入力欄に反映しました。';
      helperResult.hidden = false;
    });
  }

  /* ---------- アクセス計測（GoatCounter） ----------
     計算実行などのイベントを記録する。計測がブロックされていても
     ツールの動作には影響させない。入力値は送信しない。 */
  function trackEvent(name) {
    try {
      if (window.goatcounter && typeof window.goatcounter.count === 'function') {
        window.goatcounter.count({ path: name, event: true });
      }
    } catch (ignore) {
      /* 計測の失敗は無視する */
    }
  }

  return {
    $: $,
    trackEvent: trackEvent,
    formatComma: formatComma,
    formatApproxYen: formatApproxYen,
    formatPercent1: formatPercent1,
    formatAid: formatAid,
    readNumber: readNumber,
    readYen: readYen,
    showFieldError: showFieldError,
    clearFieldError: clearFieldError,
    resultRow: resultRow,
    resultBlock: resultBlock,
    setupFields: setupFields,
    setupMarginHelper: setupMarginHelper
  };
})();
