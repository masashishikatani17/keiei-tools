/* 採用判断シミュレーター（/hiring/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatComma = KT.formatComma;
  var formatApproxYen = KT.formatApproxYen;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

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

  KT.setupFields(allFieldIds);
  KT.setupMarginHelper('gross-margin');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    /* 古い結果・エラーを消す */
    resultSection.hidden = true;
    resultSection.innerHTML = '';
    allFieldIds.forEach(KT.clearFieldError);

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
      var res = KT.readYen($(field.id));
      if (res.error) {
        KT.showFieldError(field.id, res.error);
      } else if (res.empty) {
        KT.showFieldError(field.id, '必須項目です。金額を入力してください（ない場合は0）。');
      } else {
        input[field.key] = res.value;
        return;
      }
      if (!firstInvalid) {
        firstInvalid = $(field.id);
      }
    });

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

    var expectedRes = KT.readYen($('expected-monthly-sales'));
    if (expectedRes.error) {
      KT.showFieldError('expected-monthly-sales', expectedRes.error);
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
