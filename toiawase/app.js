/* 問い合わせ対応アシスタント 試作版
   - 入力内容はブラウザ内でのみ処理する（サーバー送信・保存なし）。
   - AIは使用しない。サンプルメールの「読み取り」は、あらかじめ用意した
     構造化データを流し込む模擬動作。本番ではメール本文の解析をLLM APIに
     差し替える想定で、importInquiry() と judge系関数に処理を隔離してある。
   - 「受任すべき／断るべき」という断定は表示しない。基準との一致・不一致
     という事実と、返信文のたたき台の提示にとどめる。 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  /* ---------- 選択肢 ---------- */

  var INDUSTRIES = [
    { key: 'kensetsu', label: '建設・不動産' },
    { key: 'inshoku', label: '飲食・小売' },
    { key: 'iryo', label: '医療・介護' },
    { key: 'it', label: 'IT・Web' },
    { key: 'seizo', label: '製造' },
    { key: 'service', label: 'サービス業' },
    { key: 'biyo', label: '美容・理容' }
  ];

  var C_INDUSTRY = INDUSTRIES.concat([{ key: 'any', label: '業種は問わない' }]);
  var I_INDUSTRY = INDUSTRIES.concat([{ key: 'fumei', label: '不明・上記以外' }]);

  var C_FEE = [
    { key: 'f_any', label: '特に決めていない', min: 0 },
    { key: 'f_1', label: '月1万円〜', min: 1 },
    { key: 'f_3', label: '月3万円〜', min: 3 },
    { key: 'f_5', label: '月5万円〜', min: 5 }
  ];

  var C_KICHO = [
    { key: 'kicho_ok', label: '記帳代行も受けている' },
    { key: 'kicho_jikei', label: '原則、お客様側で記帳（自計化）' }
  ];

  var C_AREA = [
    { key: 'a_local', label: '事務所の近隣が中心' },
    { key: 'a_online', label: 'オンラインで全国対応' }
  ];

  var I_SERVICES = [
    { key: 'komon', label: '税務顧問' },
    { key: 'kicho', label: '記帳代行' },
    { key: 'kessan', label: '決算・申告のみ' },
    { key: 'setsuritsu', label: '会社設立' },
    { key: 'souzoku', label: '相続' },
    { key: 'kyuyo', label: '給与・年末調整' },
    { key: 'fumei', label: 'まだ分からない' }
  ];

  var SERVICE_NOUNS = {
    komon: '税務顧問',
    kicho: '記帳代行',
    kessan: '決算・申告',
    setsuritsu: '会社設立のご支援',
    souzoku: '相続のご相談',
    kyuyo: '給与計算・年末調整'
  };

  var I_BUDGET = [
    { key: 'b_low', label: '月1万円くらいまで', lower: 0, upper: 1 },
    { key: 'b_1_3', label: '月1〜3万円', lower: 1, upper: 3 },
    { key: 'b_3_5', label: '月3〜5万円', lower: 3, upper: 5 },
    { key: 'b_5p', label: '月5万円以上', lower: 5, upper: 99 },
    { key: 'b_unknown', label: '決めていない・不明', lower: null, upper: null }
  ];

  var I_LOCATION = [
    { key: 'loc_near', label: '事務所の近く' },
    { key: 'loc_far', label: '遠方（オンライン希望）' },
    { key: 'loc_unknown', label: '不明' }
  ];

  /* ---------- サンプル問い合わせ ---------- */

  var SAMPLES = {
    a: {
      subject: '件名：顧問税理士を探しています（ホームページより）',
      body: 'はじめまして。市内でWeb制作の会社を経営している◯◯と申します。\n昨年法人を設立し、はじめての決算が近づいてきたため、顧問をお願いできる税理士さんを探しています。\n経理はほとんど手がつけられておらず、記帳からお願いしたいです。売上は年2,000万円ほどで、顧問料は月2〜3万円くらいを考えています。\n事務所が近かったのでご連絡しました。よろしくお願いいたします。',
      inquiry: { industry: 'it', services: ['komon', 'kicho'], budget: 'b_1_3', location: 'loc_near' }
    },
    b: {
      subject: '件名：【ご紹介】税理士変更のご相談（飲食業）',
      body: '紹介会社の◯◯です。飲食店を2店舗経営されているお客様をご紹介します。\n現在の税理士さんの廃業にともなう変更です。レシートや通帳をお渡しして、記帳からすべてお任せしたいとのご希望で、ご予算は月1万円以内とのことです。\n所在地は隣県のため、オンラインでの対応をご希望です。ご検討いただけますでしょうか。',
      inquiry: { industry: 'inshoku', services: ['komon', 'kicho'], budget: 'b_low', location: 'loc_far' }
    },
    c: {
      subject: '件名：料金について',
      body: '顧問をお願いすると、月いくらかかりますか。\nよろしくお願いします。',
      inquiry: { industry: 'fumei', services: ['komon'], budget: 'b_unknown', location: 'loc_unknown' }
    }
  };

  /* ---------- 状態 ---------- */

  var state = {
    criteria: {
      industries: [],
      fee: 'f_any',
      kicho: 'kicho_ok',
      area: 'a_local'
    },
    currentSample: 'a',
    inquiry: {
      industry: null,
      services: [],
      budget: null,
      location: null
    },
    checks: [],
    verdict: 'ask',
    currentReply: 'ask'
  };

  /* ---------- 汎用 ---------- */

  function show(id) {
    ['s-intro', 's-criteria', 's-inquiry', 's-generating', 's-fields', 's-result'].forEach(function (s) {
      $(s).hidden = (s !== id);
    });
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._h);
    toast._h = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* 利用状況の計測（GoatCounter）。入力内容は送らない */
  function track(name) {
    try {
      if (window.goatcounter && typeof window.goatcounter.count === 'function') {
        window.goatcounter.count({ path: name, event: true });
      }
    } catch (ignore) {
      /* 計測の失敗は無視する */
    }
  }

  function findLabel(options, key) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].key === key) { return options[i].label; }
    }
    return '';
  }

  function findOpt(options, key) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].key === key) { return options[i]; }
    }
    return null;
  }

  /* ---------- チップ描画 ----------
     multi: 複数選択（exclusiveKey を選ぶと他が外れる）
     single: 1つだけ選択 */

  function renderChips(containerId, options, config) {
    var box = $(containerId);
    box.textContent = '';
    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = opt.label;
      b.dataset.key = opt.key;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (config.multi) {
          var list = config.get();
          var idx = list.indexOf(opt.key);
          if (idx === -1) {
            if (opt.key === config.exclusiveKey) {
              list.length = 0;
            } else if (config.exclusiveKey) {
              var exIdx = list.indexOf(config.exclusiveKey);
              if (exIdx !== -1) { list.splice(exIdx, 1); }
            }
            list.push(opt.key);
          } else {
            list.splice(idx, 1);
          }
        } else {
          config.set(opt.key);
        }
        if (config.errorId) { $(config.errorId).hidden = true; }
        updateChips(containerId, config);
      });
      box.appendChild(b);
    });
    updateChips(containerId, config);
  }

  function updateChips(containerId, config) {
    Array.from($(containerId).children).forEach(function (b) {
      var on = config.multi
        ? config.get().indexOf(b.dataset.key) !== -1
        : config.get() === b.dataset.key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- 照合（本番ではメール解析と合わせてAIに差し替える部分） ---------- */

  function judgeIndustry() {
    var c = state.criteria;
    var q = state.inquiry;
    var row = { label: '業種', value: findLabel(I_INDUSTRY, q.industry) };
    if (q.industry === 'fumei') {
      row.mark = 'tri';
      row.comment = '業種がまだ分かりません。返信か面談での確認が必要です。';
      row.question = 'どのような事業をされているか（業種・事業内容）';
    } else if (c.industries.indexOf('any') !== -1) {
      row.mark = 'ok';
      row.comment = '業種を問わず受ける方針です。';
    } else if (c.industries.indexOf(q.industry) !== -1) {
      row.mark = 'ok';
      row.comment = '対応したい業種に含まれています。';
    } else {
      row.mark = 'ng';
      row.comment = '対応したい業種に含まれていません。';
    }
    return row;
  }

  function judgeBudget() {
    var fee = findOpt(C_FEE, state.criteria.fee);
    var budget = findOpt(I_BUDGET, state.inquiry.budget);
    var row = { label: 'ご予算（月額）', value: budget.label };
    if (budget.lower === null) {
      row.mark = 'tri';
      row.comment = '予算がまだ分かりません。';
      row.question = '顧問料のご予算のめやす';
    } else if (fee.min === 0) {
      row.mark = 'ok';
      row.comment = '顧問料の下限は設けない方針です。';
    } else if (fee.min <= budget.lower) {
      row.mark = 'ok';
      row.comment = '下限（' + fee.label + '）を満たしています。';
    } else if (fee.min <= budget.upper) {
      row.mark = 'tri';
      row.comment = '下限（' + fee.label + '）と同じ水準です。業務の範囲しだいで調整が必要かもしれません。';
      row.question = 'ご予算の上限と、含めたい業務の範囲';
    } else {
      row.mark = 'ng';
      row.comment = '下限（' + fee.label + '）を下回っています。';
    }
    return row;
  }

  function judgeKicho() {
    var q = state.inquiry;
    var wantsKicho = q.services.indexOf('kicho') !== -1;
    var row = { label: '記帳代行の希望', value: wantsKicho ? 'あり' : (q.services.indexOf('fumei') !== -1 ? '不明' : 'なし') };
    if (q.services.indexOf('fumei') !== -1) {
      row.mark = 'tri';
      row.comment = 'ご希望の内容がまだ分かりません。';
      row.question = 'お願いしたい業務の内容（顧問・記帳・申告のみ など）';
    } else if (wantsKicho && state.criteria.kicho === 'kicho_jikei') {
      row.mark = 'tri';
      row.comment = '記帳代行のご希望ですが、事務所は自計化が前提です。切り替えられるかの確認が必要です。';
      row.question = '記帳をお客様側で入力する体制に切り替えられるか';
    } else if (wantsKicho) {
      row.mark = 'ok';
      row.comment = '記帳代行のご希望に対応できる方針です。';
    } else {
      row.mark = 'ok';
      row.comment = '記帳代行のご希望はありません。';
    }
    return row;
  }

  function judgeArea() {
    var q = state.inquiry;
    var row = { label: '所在地', value: findLabel(I_LOCATION, q.location) };
    if (q.location === 'loc_unknown') {
      row.mark = 'tri';
      row.comment = '所在地がまだ分かりません。';
      row.question = 'ご所在地と、オンラインでのやり取りの可否';
    } else if (q.location === 'loc_far' && state.criteria.area === 'a_local') {
      row.mark = 'ng';
      row.comment = '対応エリアは近隣中心の方針です。';
    } else if (q.location === 'loc_far') {
      row.mark = 'ok';
      row.comment = 'オンラインで全国対応の方針です。';
    } else {
      row.mark = 'ok';
      row.comment = '事務所の近隣からのお問い合わせです。';
    }
    return row;
  }

  function analyze() {
    state.checks = [judgeIndustry(), judgeBudget(), judgeKicho(), judgeArea()];
    var ng = state.checks.filter(function (r) { return r.mark === 'ng'; }).length;
    var tri = state.checks.filter(function (r) { return r.mark === 'tri'; }).length;
    state.verdict = ng > 0 ? 'decline' : (tri > 0 ? 'ask' : 'meet');
    state.currentReply = state.verdict;
  }

  /* ---------- 返信文の生成（本番ではLLM APIに差し替える部分） ---------- */

  function serviceNounText() {
    var nouns = [];
    state.inquiry.services.forEach(function (key) {
      if (SERVICE_NOUNS[key]) { nouns.push(SERVICE_NOUNS[key]); }
    });
    if (nouns.length === 0) { return '税務のご相談'; }
    if (nouns.length === 1) { return nouns[0]; }
    if (nouns.length === 2) { return nouns[0] + 'と' + nouns[1]; }
    return nouns[0] + 'や' + nouns[1] + 'など';
  }

  var GREETING = '◯◯様\n\nお問い合わせいただきありがとうございます。\n税理士の◯◯（お名前）です。\n\n';

  function buildMeetReply() {
    var industryPart = state.inquiry.industry !== 'fumei'
      ? findLabel(I_INDUSTRY, state.inquiry.industry) + 'のお客様の'
      : '';
    return GREETING +
      industryPart + serviceNounText() + 'のご相談とのこと、当事務所でもお受けしている内容です。\n' +
      '詳しいお話を伺いたいので、まずは30分ほど、オンラインまたはご来所にてお話しできればと思います。\n\n' +
      '【候補日】\n' +
      '・◯月◯日（◯）◯時〜\n' +
      '・◯月◯日（◯）◯時〜\n\n' +
      '当日は、直近の申告書の控えや、お使いの会計ソフトが分かるものがあるとお話がスムーズです。\n' +
      'ご都合をお聞かせください。どうぞよろしくお願いいたします。';
  }

  function buildAskReply() {
    var questions = [];
    state.checks.forEach(function (r) {
      if (r.question) { questions.push(r.question); }
    });
    if (questions.length === 0) {
      questions = [
        'どのような事業をされているか（業種・事業内容）',
        '顧問料のご予算のめやす',
        '現在の記帳・申告の状況'
      ];
    }
    return GREETING +
      serviceNounText() + 'のご相談ですね。\n' +
      '正確なご案内のため、いくつか教えていただけますでしょうか。\n\n' +
      questions.map(function (q) { return '・' + q; }).join('\n') + '\n\n' +
      'ご返信をいただけましたら、お受けできる内容かどうかと、料金のめやすをあらためてご案内いたします。\n' +
      'どうぞよろしくお願いいたします。';
  }

  function buildDeclineReply() {
    return GREETING +
      'ご相談の内容を確認いたしました。\n' +
      '大変恐縮ですが、現在の当事務所の体制では、ご希望の内容に十分お応えすることが難しい状況です。\n' +
      'せっかくご連絡いただいたにもかかわらず、申し訳ございません。\n\n' +
      'お近くの税理士会の紹介制度などもございますので、よいご縁がありますことをお祈りしております。';
  }

  function buildReply(type) {
    if (type === 'meet') { return buildMeetReply(); }
    if (type === 'decline') { return buildDeclineReply(); }
    return buildAskReply();
  }

  /* ---------- 結果画面の描画 ---------- */

  var MARK_CHAR = { ok: '○', tri: '△', ng: '×' };
  var VERDICT_LABEL = { meet: '面談をご案内', ask: '追加で確認', decline: '今回は見送り' };

  function renderResult() {
    var ok = state.checks.filter(function (r) { return r.mark === 'ok'; }).length;
    var tri = state.checks.filter(function (r) { return r.mark === 'tri'; }).length;
    var ng = state.checks.filter(function (r) { return r.mark === 'ng'; }).length;

    $('result-summary').textContent =
      '受任基準との照合：一致 ' + ok + '件 ／ 要確認 ' + tri + '件 ／ 不一致 ' + ng + '件';

    var list = $('check-list');
    list.textContent = '';
    state.checks.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'check-row';

      var mark = document.createElement('div');
      mark.className = 'check-mark ' + r.mark;
      mark.textContent = MARK_CHAR[r.mark];

      var body = document.createElement('div');
      body.className = 'check-body';
      var label = document.createElement('p');
      label.className = 'check-label';
      label.textContent = r.label;
      var value = document.createElement('p');
      value.className = 'check-value';
      value.textContent = r.value;
      var comment = document.createElement('p');
      comment.className = 'check-comment';
      comment.textContent = r.comment;
      body.appendChild(label);
      body.appendChild(value);
      body.appendChild(comment);

      row.appendChild(mark);
      row.appendChild(body);
      list.appendChild(row);
    });

    var confirms = [];
    state.checks.forEach(function (r) {
      if (r.question) { confirms.push(r.question); }
    });
    confirms.push('前任の税理士の有無と、引き継ぎの状況');
    confirms.push('直近の申告期限までの残り時間');
    var ul = $('confirm-list');
    ul.textContent = '';
    confirms.forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = c;
      ul.appendChild(li);
    });

    if (state.verdict === 'meet') {
      $('reply-note').textContent = '不一致はありませんでした。照合結果からは「面談をご案内」の返信が近そうです。';
    } else if (state.verdict === 'ask') {
      $('reply-note').textContent = '要確認が' + tri + '件あります。照合結果からは「追加で確認」の返信が近そうです。';
    } else {
      $('reply-note').textContent = '不一致が' + ng + '件あります。照合結果からは「今回は見送り」も含めた検討になりそうです。';
    }

    updateReplyView();
  }

  function updateReplyView() {
    Array.from($('reply-tabs').children).forEach(function (t) {
      t.classList.toggle('on', t.dataset.reply === state.currentReply);
    });
    $('reply-text').value = buildReply(state.currentReply);
  }

  /* ---------- サンプルメール表示 ---------- */

  function renderMail() {
    Array.from($('sample-tabs').children).forEach(function (t) {
      t.classList.toggle('on', t.dataset.sample === state.currentSample);
    });
    var sample = SAMPLES[state.currentSample];
    var box = $('mail-box');
    box.textContent = '';
    var subject = document.createElement('span');
    subject.className = 'mail-subject';
    subject.textContent = sample.subject;
    box.appendChild(subject);
    box.appendChild(document.createTextNode(sample.body));
  }

  /* ---------- 問い合わせ内容チップ ---------- */

  var inquiryConfigs = {
    'i-industry': {
      options: I_INDUSTRY, errorId: 'i-industry-error',
      get: function () { return state.inquiry.industry; },
      set: function (k) { state.inquiry.industry = k; }
    },
    'i-budget': {
      options: I_BUDGET, errorId: 'i-budget-error',
      get: function () { return state.inquiry.budget; },
      set: function (k) { state.inquiry.budget = k; }
    },
    'i-location': {
      options: I_LOCATION, errorId: 'i-location-error',
      get: function () { return state.inquiry.location; },
      set: function (k) { state.inquiry.location = k; }
    }
  };

  function refreshInquiryChips() {
    Object.keys(inquiryConfigs).forEach(function (id) {
      updateChips(id, inquiryConfigs[id]);
    });
    updateChips('i-services', servicesConfig);
  }

  function importInquiry(sampleKey) {
    var src = SAMPLES[sampleKey].inquiry;
    state.inquiry.industry = src.industry;
    state.inquiry.services = src.services.slice();
    state.inquiry.budget = src.budget;
    state.inquiry.location = src.location;
  }

  function clearInquiry() {
    state.inquiry.industry = null;
    state.inquiry.services = [];
    state.inquiry.budget = null;
    state.inquiry.location = null;
  }

  function hideInquiryErrors() {
    ['i-industry-error', 'i-services-error', 'i-budget-error', 'i-location-error'].forEach(function (id) {
      $(id).hidden = true;
    });
  }

  function validateInquiry() {
    var firstError = null;
    [
      ['i-industry-error', !state.inquiry.industry],
      ['i-services-error', state.inquiry.services.length === 0],
      ['i-budget-error', !state.inquiry.budget],
      ['i-location-error', !state.inquiry.location]
    ].forEach(function (pair) {
      if (pair[1]) {
        $(pair[0]).hidden = false;
        if (!firstError) { firstError = $(pair[0]); }
      }
    });
    if (firstError) {
      firstError.scrollIntoView({ block: 'center' });
      return false;
    }
    return true;
  }

  /* ---------- 初期化 ---------- */

  renderChips('c-industry', C_INDUSTRY, {
    multi: true, exclusiveKey: 'any', errorId: 'c-industry-error',
    get: function () { return state.criteria.industries; }
  });
  renderChips('c-fee', C_FEE, {
    get: function () { return state.criteria.fee; },
    set: function (k) { state.criteria.fee = k; }
  });
  renderChips('c-kicho', C_KICHO, {
    get: function () { return state.criteria.kicho; },
    set: function (k) { state.criteria.kicho = k; }
  });
  renderChips('c-area', C_AREA, {
    get: function () { return state.criteria.area; },
    set: function (k) { state.criteria.area = k; }
  });

  Object.keys(inquiryConfigs).forEach(function (id) {
    var cfg = inquiryConfigs[id];
    renderChips(id, cfg.options, cfg);
  });
  var servicesConfig = {
    multi: true, exclusiveKey: 'fumei', errorId: 'i-services-error',
    get: function () { return state.inquiry.services; }
  };
  renderChips('i-services', I_SERVICES, servicesConfig);

  $('btn-start').addEventListener('click', function () {
    track('toiawase-start');
    show('s-criteria');
  });

  $('btn-criteria-back').addEventListener('click', function () { show('s-intro'); });

  $('btn-criteria-next').addEventListener('click', function () {
    if (state.criteria.industries.length === 0) {
      $('c-industry-error').hidden = false;
      $('c-industry-error').scrollIntoView({ block: 'center' });
      return;
    }
    renderMail();
    show('s-inquiry');
  });

  Array.from($('sample-tabs').children).forEach(function (t) {
    t.addEventListener('click', function () {
      state.currentSample = t.dataset.sample;
      renderMail();
    });
  });

  $('btn-inquiry-back').addEventListener('click', function () { show('s-criteria'); });

  $('btn-import').addEventListener('click', function () {
    track('toiawase-import');
    importInquiry(state.currentSample);
    hideInquiryErrors();
    $('fields-title').textContent = '読み取った内容をご確認ください';
    $('fields-note').textContent = '本番版では、ここまでをAIが自動で入力する想定です。違っている箇所があれば直してください。';
    $('generating-text').textContent = 'メールの内容を読み取っています…';
    show('s-generating');
    setTimeout(function () {
      refreshInquiryChips();
      show('s-fields');
    }, 900);
  });

  $('btn-manual').addEventListener('click', function () {
    clearInquiry();
    hideInquiryErrors();
    $('fields-title').textContent = '問い合わせの内容を入力してください';
    $('fields-note').textContent = '分かる範囲で選んでください。分からない項目は「不明」のままで構いません。';
    refreshInquiryChips();
    show('s-fields');
  });

  $('btn-fields-back').addEventListener('click', function () { show('s-inquiry'); });

  $('btn-analyze').addEventListener('click', function () {
    if (!validateInquiry()) { return; }
    $('generating-text').textContent = '受任基準と照合しています…';
    show('s-generating');
    setTimeout(function () {
      analyze();
      renderResult();
      show('s-result');
      track('toiawase-result');
    }, 700);
  });

  Array.from($('reply-tabs').children).forEach(function (t) {
    t.addEventListener('click', function () {
      state.currentReply = t.dataset.reply;
      updateReplyView();
    });
  });

  $('btn-copy').addEventListener('click', function () {
    var text = $('reply-text').value.trim();
    if (!text) {
      toast('返信文が空です。');
      return;
    }
    track('toiawase-copy');
    var done = function () { toast('返信文をコピーしました'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(); });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('コピーできませんでした。文章を長押しして選択してください。'); }
      document.body.removeChild(ta);
    }
  });

  $('btn-result-back').addEventListener('click', function () { show('s-fields'); });

  $('btn-restart').addEventListener('click', function () {
    renderMail();
    show('s-inquiry');
  });

  show('s-intro');
})();
