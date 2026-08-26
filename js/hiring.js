/* 採用判断シミュレーター（/hiring/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
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

  var allFieldIds = [
    'monthly-salary',
    'annual-bonus',
    'annual-social-cost',
    'annual-other-cost',
    'initial-hiring-cost',
    'gross-margin',
    'expected-monthly-sales',
    'helper-sales',
    'helper-cost'
  ];

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

  function hideHelperMessages() {
    var errorEl = $('margin-helper-error');
    var resultEl = $('margin-helper-result');
    errorEl.textContent = '';
    errorEl.hidden = true;
    resultEl.textContent = '';
    resultEl.hidden = true;
  }

  /* ---------- 計算 ---------- */

  function compute(input) {
    var annualSalary = input.monthlySalary * 12;
    var annualRecurringCost =
      annualSalary + input.annualBonus + input.annualSocialCost + input.annualOtherCost;
    var firstYearCost = annualRecurringCost + input.initialHiringCost;
    var marginRate = input.grossMarginPercent / 100;

    var result = {
      annualSalary: annualSalary,
      annualRecurringCost: annualRecurringCost,
      firstYearCost: firstYearCost,
      firstYearRequiredSales: firstYearCost / marginRate,
      ongoingRequiredSales: annualRecurringCost / marginRate,
      expected: null
    };
    result.firstYearRequiredSalesMonthly = result.firstYearRequiredSales / 12;
    result.ongoingRequiredSalesMonthly = result.ongoingRequiredSales / 12;

    if (input.expectedMonthlySales !== null) {
      var annualExpectedSales = input.expectedMonthlySales * 12;
      var annualExpectedGross = annualExpectedSales * marginRate;
      result.expected = {
        annualExpectedSales: annualExpectedSales,
        annualExpectedGross: annualExpectedGross,
        firstYearImpact: annualExpectedGross - firstYearCost,
        ongoingImpact: annualExpectedGross - annualRecurringCost
      };
    }
    return result;
  }

  /* ---------- 結果表示 ---------- */

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

  function impactText(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '計算できません';
    }
    if (value === 0) {
      return '概ね損益均衡';
    }
    if (value > 0) {
      return formatApproxYen(value) + 'の利益増加';
    }
    return formatApproxYen(value) + 'の利益減少';
  }

  function renderResult(resultSection, input, r) {
    var sameEveryYear = input.initialHiringCost === 0;
    var html = '';

    html += '<p class="result-kicker">あなたの採用ライン</p>';
    html += '<p class="result-hero-label">' +
      (sameEveryYear ? '必要な月間追加売上（毎年）' : '初年度に必要な月間追加売上') +
      '</p>';
    html += '<p class="result-hero">月間 <strong>' +
      formatApproxYen(r.firstYearRequiredSalesMonthly) +
      '</strong> の追加売上</p>';
    html += '<p class="result-lead">この採用によって増える費用を回収し、現在の利益水準を維持するために会社全体で必要となる追加売上の目安です。採用した社員本人が1人で売り上げるべき金額ではありません。</p>';

    if (sameEveryYear) {
      html += resultBlock('初年度・2年目以降（毎年共通）', [
        resultRow('会社負担（年間）', formatApproxYen(r.annualRecurringCost)),
        resultRow('必要な追加売上（年間）', formatApproxYen(r.ongoingRequiredSales)),
        resultRow('必要な追加売上（月間）', formatApproxYen(r.ongoingRequiredSalesMonthly))
      ], '採用時だけかかる費用が0円のため、初年度と2年目以降は同じ金額になります。');
    } else {
      html += resultBlock('初年度', [
        resultRow('会社負担（年間）', formatApproxYen(r.firstYearCost)),
        resultRow('必要な追加売上（年間）', formatApproxYen(r.firstYearRequiredSales)),
        resultRow('必要な追加売上（月間）', formatApproxYen(r.firstYearRequiredSalesMonthly))
      ]);
      html += resultBlock('2年目以降（毎年）', [
        resultRow('会社負担（年間）', formatApproxYen(r.annualRecurringCost)),
        resultRow('必要な追加売上（年間）', formatApproxYen(r.ongoingRequiredSales)),
        resultRow('必要な追加売上（月間）', formatApproxYen(r.ongoingRequiredSalesMonthly))
      ]);
    }

    if (r.expected) {
      var expectedRows = [
        resultRow('期待する追加売上（年間）', formatApproxYen(r.expected.annualExpectedSales)),
        resultRow('そこから生じる粗利益（年間）', formatApproxYen(r.expected.annualExpectedGross))
      ];
      if (sameEveryYear) {
        expectedRows.push(
          resultRow('利益への影響（毎年）', impactText(r.expected.ongoingImpact), true)
        );
      } else {
        expectedRows.push(
          resultRow('初年度の利益への影響', impactText(r.expected.firstYearImpact), true)
        );
        expectedRows.push(
          resultRow('2年目以降の利益への影響', impactText(r.expected.ongoingImpact), true)
        );
      }
      html += resultBlock('期待する追加売上を前提とした場合', expectedRows,
        '入力された「期待する追加売上」がそのまま実現した場合の試算です。実現可能性の判断は含みません。');
    }

    var breakdownRows = [
      resultRow('年間給与（月給 × 12か月）', formatComma(r.annualSalary) + '円'),
      resultRow('年間賞与', formatComma(input.annualBonus) + '円'),
      resultRow('会社負担の社会保険等（年間）', formatComma(input.annualSocialCost) + '円'),
      resultRow('その他の年間費用', formatComma(input.annualOtherCost) + '円'),
      resultRow('毎年継続する費用の合計', formatComma(r.annualRecurringCost) + '円', true),
      resultRow('採用時だけかかる費用（初年度のみ）', formatComma(input.initialHiringCost) + '円')
    ];
    if (!sameEveryYear) {
      breakdownRows.push(
        resultRow('初年度の合計', formatComma(r.firstYearCost) + '円', true)
      );
    }
    html += resultBlock('採用コストの内訳', breakdownRows,
      '「毎年継続する費用」は2年目以降も毎年かかる費用、「採用時だけかかる費用」は初年度のみかかる費用です。');

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('hiring-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  /* 金額欄のカンマ区切り補助表示 */
  var aidFieldIds = [
    'monthly-salary',
    'annual-bonus',
    'annual-social-cost',
    'annual-other-cost',
    'initial-hiring-cost',
    'expected-monthly-sales',
    'helper-sales',
    'helper-cost'
  ];
  aidFieldIds.forEach(function (fieldId) {
    var input = $(fieldId);
    var aid = $(fieldId + '-aid');
    if (!input || !aid) {
      return;
    }
    input.addEventListener('input', function () {
      var r = readNumber(input);
      aid.textContent = (r.value !== undefined && r.value >= 0) ? formatAid(r.value) : '';
    });
  });

  /* 入力し直したら、その欄のエラーを消す */
  allFieldIds.forEach(function (fieldId) {
    var input = $(fieldId);
    if (!input) {
      return;
    }
    input.addEventListener('input', function () {
      clearFieldError(fieldId);
      if (fieldId === 'helper-sales' || fieldId === 'helper-cost') {
        hideHelperMessages();
      }
    });
  });

  /* 粗利益率の補助計算 */
  $('apply-margin').addEventListener('click', function () {
    clearFieldError('helper-sales');
    clearFieldError('helper-cost');
    hideHelperMessages();

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
    $('gross-margin').value = String(rounded);
    clearFieldError('gross-margin');

    var helperResult = $('margin-helper-result');
    helperResult.textContent = '粗利益率 ' + rounded + '％ を上の入力欄に反映しました。';
    helperResult.hidden = false;
  });

  /* 計算の実行 */
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    /* 古い結果・エラーを消す */
    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(clearFieldError);

    var requiredYenFields = [
      { id: 'monthly-salary', key: 'monthlySalary' },
      { id: 'annual-bonus', key: 'annualBonus' },
      { id: 'annual-social-cost', key: 'annualSocialCost' },
      { id: 'annual-other-cost', key: 'annualOtherCost' },
      { id: 'initial-hiring-cost', key: 'initialHiringCost' }
    ];

    var input = {};
    var firstInvalid = null;

    requiredYenFields.forEach(function (field) {
      var res = readYen($(field.id));
      if (res.error) {
        showFieldError(field.id, res.error);
      } else if (res.empty) {
        showFieldError(field.id, '必須項目です。金額を入力してください（ない場合は0）。');
      } else {
        input[field.key] = res.value;
        return;
      }
      if (!firstInvalid) {
        firstInvalid = $(field.id);
      }
    });

    var marginRes = readNumber($('gross-margin'));
    if (marginRes.error) {
      showFieldError('gross-margin', marginRes.error);
    } else if (marginRes.empty) {
      showFieldError('gross-margin', '必須項目です。粗利益率（％）を入力してください。');
    } else if (marginRes.value <= 0) {
      showFieldError('gross-margin', '粗利益率は0より大きい値を入力してください。0％のままでは必要売上を計算できません。');
    } else if (marginRes.value > 100) {
      showFieldError('gross-margin', '粗利益率は100以下で入力してください。');
    } else {
      input.grossMarginPercent = marginRes.value;
    }
    if (input.grossMarginPercent === undefined && !firstInvalid) {
      firstInvalid = $('gross-margin');
    }

    var expectedRes = readYen($('expected-monthly-sales'));
    if (expectedRes.error) {
      showFieldError('expected-monthly-sales', expectedRes.error);
      if (!firstInvalid) {
        firstInvalid = $('expected-monthly-sales');
      }
    } else {
      input.expectedMonthlySales = expectedRes.empty ? null : expectedRes.value;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var result = compute(input);
    renderResult(resultSection, input, result);
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
