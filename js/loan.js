/* 借入返済シミュレーター（/loan/）
   すべてブラウザ内で計算し、入力値の送信・保存は行いません。 */
(function () {
  'use strict';

  var $ = KT.$;
  var formatComma = KT.formatComma;
  var formatApproxYen = KT.formatApproxYen;
  var resultRow = KT.resultRow;
  var resultBlock = KT.resultBlock;

  function compute(input) {
    var n = Math.round(input.years * 12);
    var monthlyRate = input.annualRatePercent / 100 / 12;
    var monthlyPayment;
    if (monthlyRate > 0) {
      var factor = Math.pow(1 + monthlyRate, n);
      monthlyPayment = input.principal * monthlyRate * factor / (factor - 1);
    } else {
      monthlyPayment = input.principal / n;
    }
    var totalPayment = monthlyPayment * n;

    var result = {
      months: n,
      monthlyPayment: monthlyPayment,
      annualPayment: monthlyPayment * Math.min(12, n),
      totalPayment: totalPayment,
      totalInterest: totalPayment - input.principal,
      requiredSales: null
    };

    if (input.grossMarginPercent !== null) {
      var marginRate = input.grossMarginPercent / 100;
      result.requiredSales = {
        monthly: monthlyPayment / marginRate,
        annual: (monthlyPayment / marginRate) * Math.min(12, n)
      };
    }
    return result;
  }

  function renderResult(resultSection, input, r) {
    var html = '';
    html += '<p class="result-kicker">毎月の返済ライン</p>';
    html += '<p class="result-hero-label">毎月の返済額（元利均等・目安）</p>';
    html += '<p class="result-hero">月々 <strong>' + formatApproxYen(r.monthlyPayment) + '</strong> の返済</p>';
    html += '<p class="result-lead">毎月同じ金額を返す「元利均等返済」で、金利が期間中変わらない前提の概算です。</p>';

    html += resultBlock('返済の内訳', [
      resultRow('毎月の返済額（円単位）', formatComma(r.monthlyPayment) + '円'),
      resultRow('返済回数', formatComma(r.months) + '回（' + input.years + '年）'),
      resultRow('年間の返済額', formatApproxYen(r.annualPayment)),
      resultRow('総返済額', formatApproxYen(r.totalPayment), true),
      resultRow('うち利息の合計', formatApproxYen(r.totalInterest))
    ]);

    if (r.requiredSales) {
      html += resultBlock('返済を売上でまかなう場合の目安', [
        resultRow('必要な売上（月間）', formatApproxYen(r.requiredSales.monthly), true),
        resultRow('必要な売上（年間）', formatApproxYen(r.requiredSales.annual))
      ], '毎月の返済額 ÷ 粗利益率で計算した簡易目安です。実際の返済原資は税引後の利益に減価償却費などを加えたものになります。');
    }

    resultSection.innerHTML = html;
  }

  /* ---------- 画面との接続 ---------- */

  var form = $('loan-form');
  var resultSection = $('result');
  if (!form || !resultSection) {
    return;
  }

  var allFieldIds = [
    'loan-amount',
    'annual-rate',
    'loan-years',
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

    var amountRes = KT.readYen($('loan-amount'));
    if (amountRes.error) {
      KT.showFieldError('loan-amount', amountRes.error);
    } else if (amountRes.empty) {
      KT.showFieldError('loan-amount', '必須項目です。借入金額を入力してください。');
    } else if (amountRes.value === 0) {
      KT.showFieldError('loan-amount', '借入金額は0より大きい金額を入力してください。');
    } else {
      input.principal = amountRes.value;
    }
    if (input.principal === undefined) {
      firstInvalid = $('loan-amount');
    }

    var rateRes = KT.readNumber($('annual-rate'));
    if (rateRes.error) {
      KT.showFieldError('annual-rate', rateRes.error);
    } else if (rateRes.empty) {
      KT.showFieldError('annual-rate', '必須項目です。年利（％）を入力してください。');
    } else if (rateRes.value < 0) {
      KT.showFieldError('annual-rate', '年利は0以上で入力してください。');
    } else if (rateRes.value > 30) {
      KT.showFieldError('annual-rate', '年利は30以下で入力してください。');
    } else {
      input.annualRatePercent = rateRes.value;
    }
    if (input.annualRatePercent === undefined && !firstInvalid) {
      firstInvalid = $('annual-rate');
    }

    var yearsRes = KT.readNumber($('loan-years'));
    if (yearsRes.error) {
      KT.showFieldError('loan-years', yearsRes.error);
    } else if (yearsRes.empty) {
      KT.showFieldError('loan-years', '必須項目です。返済期間（年）を入力してください。');
    } else if (yearsRes.value <= 0) {
      KT.showFieldError('loan-years', '返済期間は0より大きい値を入力してください。');
    } else if (yearsRes.value > 50) {
      KT.showFieldError('loan-years', '返済期間は50年以下で入力してください。');
    } else if (Math.round(yearsRes.value * 12) < 1) {
      KT.showFieldError('loan-years', '返済期間が短すぎます。1か月以上（0.1年程度）で入力してください。');
    } else {
      input.years = yearsRes.value;
    }
    if (input.years === undefined && !firstInvalid) {
      firstInvalid = $('loan-years');
    }

    var marginRes = KT.readNumber($('gross-margin'));
    if (marginRes.error) {
      KT.showFieldError('gross-margin', marginRes.error);
      if (!firstInvalid) {
        firstInvalid = $('gross-margin');
      }
    } else if (marginRes.empty) {
      input.grossMarginPercent = null;
    } else if (marginRes.value <= 0) {
      KT.showFieldError('gross-margin', '粗利益率は0より大きい値を入力してください。');
      if (!firstInvalid) {
        firstInvalid = $('gross-margin');
      }
    } else if (marginRes.value > 100) {
      KT.showFieldError('gross-margin', '粗利益率は100以下で入力してください。');
      if (!firstInvalid) {
        firstInvalid = $('gross-margin');
      }
    } else {
      input.grossMarginPercent = marginRes.value;
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
