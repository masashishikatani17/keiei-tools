/* 口コミ作成アシスタント 試作版
   - 入力内容はブラウザ内でのみ処理する（サーバー送信・保存なし）。
     「控えを送る」は顧客本人のメールアプリ経由（mailto）でのみ送信される。
   - 文章生成は generateDrafts() に隔離してある。
     本番でLLM APIに差し替える場合はこの関数だけを置き換える。
   - 原則: 顧客が入力・選択した内容以外の事実を文章に加えない。
     満足度（星）の値によって画面の流れを変えない（Googleポリシー対応） */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  /* ---------- 設定 ---------- */

  var Q1_OPTIONS = [
    { key: 'komon', label: '顧問契約（税務顧問）' },
    { key: 'shinkoku', label: '確定申告' },
    { key: 'souzoku', label: '相続の相談' },
    { key: 'setsuritsu', label: '会社設立・創業支援' },
    { key: 'kichou', label: '記帳・経理サポート' },
    { key: 'nencho', label: '給与計算・年末調整' },
    { key: 'yushi', label: '融資・資金繰りの相談' },
    { key: 'other', label: 'その他' }
  ];

  var Q2_OPTIONS = [
    { key: 'wakariyasui', label: '説明が分かりやすかった' },
    { key: 'hayai', label: '対応が早かった' },
    { key: 'shinmi', label: '親身だった' },
    { key: 'senmon', label: '専門知識が豊富だった' },
    { key: 'gyoukai', label: '業界に詳しかった' },
    { key: 'teian', label: '提案が具体的だった' },
    { key: 'igai', label: '税務以外も相談できた' },
    { key: 'anshin', label: '長く安心して任せられる' },
    { key: 'other', label: 'その他' }
  ];

  /* 複数サービス選択時に文中へ組み込む名詞形 */
  var SERVICE_NOUNS = {
    komon: '税務顧問',
    shinkoku: '確定申告',
    souzoku: '相続の相談',
    setsuritsu: '会社設立',
    kichou: '記帳や経理のサポート',
    nencho: '給与計算・年末調整',
    yushi: '融資・資金繰りの相談'
  };

  /* 文体2種 × 各2バリエーション */
  var OPENINGS = {
    komon: {
      formal: ['顧問税理士としてお世話になっています。', '税務顧問をお願いしています。'],
      soft: ['顧問税理士としていつもお世話になっています。', 'いつも税務顧問でお世話になっています。']
    },
    shinkoku: {
      formal: ['確定申告をお願いしました。', '確定申告の際にお世話になりました。'],
      soft: ['確定申告でお世話になりました。', '確定申告をお願いしました。']
    },
    souzoku: {
      formal: ['相続の件で相談させていただきました。', '相続のことで相談に乗っていただきました。'],
      soft: ['相続のことで相談に乗ってもらいました。', '相続の件でお世話になりました。']
    },
    setsuritsu: {
      formal: ['会社設立の際にお世話になりました。', '創業のタイミングから相談に乗っていただいています。'],
      soft: ['会社設立のときからお世話になっています。', '創業のときに相談に乗ってもらいました。']
    },
    kichou: {
      formal: ['記帳や経理まわりのサポートをお願いしています。', '経理のサポートをお願いしています。'],
      soft: ['経理まわりをいつも助けてもらっています。', '記帳や経理のサポートをお願いしています。']
    },
    nencho: {
      formal: ['給与計算や年末調整をお願いしています。', '年末調整などの手続きをお任せしています。'],
      soft: ['給与や年末調整まわりをお任せしています。', '給与計算や年末調整をお願いしています。']
    },
    yushi: {
      formal: ['融資・資金繰りの相談でお世話になりました。', '資金繰りの相談に乗っていただきました。'],
      soft: ['融資の相談に乗ってもらいました。', '資金繰りの相談でお世話になりました。']
    }
  };

  var CLAUSES = {
    wakariyasui: {
      formal: ['難しい内容も分かりやすく説明していただけます', '専門的な話も噛み砕いて説明してくださいます'],
      soft: ['難しい話もかみくだいて説明してくれるので、とても分かりやすいです', '説明が分かりやすくて、毎回すっきり理解できます']
    },
    hayai: {
      formal: ['質問への対応が非常に迅速です', 'レスポンスが早く、安心してやり取りできます'],
      soft: ['連絡するとすぐに対応してくれます', 'レスポンスが早くて助かっています']
    },
    shinmi: {
      formal: ['こちらの事情に親身に寄り添っていただけます', '親身にご対応いただけます'],
      soft: ['いつも親身になって話を聞いてくれます', 'こちらの事情までしっかり考えてくれて心強いです']
    },
    senmon: {
      formal: ['専門知識が豊富で、安心してお任せできます', '知識が豊富で大変頼りになります'],
      soft: ['知識が豊富で、何を聞いても頼りになります', '専門的なことも安心して任せられます']
    },
    gyoukai: {
      formal: ['業界の事情にも精通しておられ、話が早いです', 'こちらの業界に詳しく、相談がスムーズです'],
      soft: ['うちの業界のこともよく分かってくれていて話が早いです', '業界の事情に詳しいので相談しやすいです']
    },
    teian: {
      formal: ['ご提案が具体的で、すぐに実行に移せます', 'アドバイスが具体的で助かります'],
      soft: ['アドバイスが具体的で、すぐ実行できるのがありがたいです', '提案が具体的で助かっています']
    },
    igai: {
      formal: ['税務以外のことも気軽に相談できます', '経営の相談まで幅広く乗っていただけます'],
      soft: ['税金以外のことも気軽に相談できるのが助かります', '経営の相談まで幅広く乗ってくれます']
    },
    anshin: {
      formal: ['長くお付き合いできる安心感があります', '安心して長くお任せできる事務所だと思います'],
      soft: ['これからも長くお付き合いしたいと思える事務所です', '安心してずっとお任せできます']
    }
  };

  var CLOSINGS = {
    formal: ['お願いしてよかったです。', 'これからもお世話になりたいと思います。'],
    soft: ['本当にお願いしてよかったです。', 'いつもありがとうございます。これからもよろしくお願いします。']
  };

  var TONES = ['soft', 'formal'];
  var STYLES = ['simple', 'standard', 'detail'];

  /* ---------- 状態 ---------- */

  var state = {
    office: null,
    q1: [],
    q1Other: '',
    q2: [],
    q2Other: '',
    q3: '',
    q4: '',
    q5: '',
    drafts: null,
    currentTone: 'formal',
    currentStyle: 'standard',
    finalText: ''
  };

  var QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'];
  var qIndex = 0;

  /* ---------- 汎用 ---------- */

  function show(id) {
    ['s-error', 's-intro', 's-question', 's-generating', 's-drafts', 's-edit', 's-final'].forEach(function (s) {
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

  /* 回答内容から決まる簡易ハッシュ。
     同じ回答なら同じ文章、違う顧客なら言い回しが変わるようにする */
  function answerHash() {
    var s = JSON.stringify([state.q1, state.q2, state.q3, state.q4]);
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function pick(arr, seed) {
    return arr[seed % arr.length];
  }

  /* 文末に句点がなければ付ける */
  function ensurePeriod(text) {
    var t = text.trim();
    if (!t) { return ''; }
    if (!/[。．！？!?]$/.test(t)) { t += '。'; }
    return t;
  }

  /* ---------- 文章生成（本番ではここをLLM APIに差し替える） ---------- */

  function buildDraftSet(tone, seed) {
    /* 書き出し（複数サービス選択に対応） */
    var nouns = [];
    state.q1.forEach(function (key) {
      if (key === 'other') {
        var svc = state.q1Other.trim();
        if (svc) { nouns.push(svc); }
      } else {
        nouns.push(SERVICE_NOUNS[key]);
      }
    });

    function joinNouns(list) {
      if (list.length <= 1) { return list[0] || ''; }
      if (list.length === 2) { return list[0] + 'や' + list[1]; }
      return list[0] + 'や' + list[1] + 'など';
    }

    var opening;
    var hasKomon = state.q1.indexOf('komon') !== -1;
    var othersNouns = nouns.filter(function (n) { return n !== SERVICE_NOUNS.komon; });

    if (state.q1.length === 1 && state.q1[0] === 'other') {
      var single = state.q1Other.trim();
      if (single) {
        opening = tone === 'soft'
          ? single + 'の件で相談に乗ってもらいました。'
          : single + 'の件でお世話になりました。';
      } else {
        opening = 'いろいろと相談に乗っていただいています。';
      }
    } else if (state.q1.length === 1) {
      opening = pick(OPENINGS[state.q1[0]][tone], seed);
    } else if (hasKomon && othersNouns.length > 0) {
      opening = tone === 'soft'
        ? '顧問税理士としていつもお世話になっていて、' + joinNouns(othersNouns) + 'もお願いしています。'
        : '顧問税理士としてお世話になっており、' + joinNouns(othersNouns) + 'もお願いしています。';
    } else if (hasKomon) {
      opening = pick(OPENINGS.komon[tone], seed);
    } else if (nouns.length > 0) {
      opening = tone === 'soft'
        ? joinNouns(nouns) + 'でいつもお世話になっています。'
        : joinNouns(nouns) + 'でお世話になっています。';
    } else {
      opening = 'いろいろと相談に乗っていただいています。';
    }

    /* 印象に残った点 → 文のリスト */
    var clauses = [];
    state.q2.forEach(function (key, i) {
      if (key === 'other') {
        var o = ensurePeriod(state.q2Other);
        if (o) { clauses.push(o); }
      } else {
        clauses.push(pick(CLAUSES[key][tone], seed + i) + '。');
      }
    });

    var episode = ensurePeriod(state.q3);

    var recommend = '';
    var q4 = state.q4.trim().replace(/[。．]$/, '');
    if (q4) {
      recommend = /(です|ます|でしょう|思います)$/.test(q4)
        ? q4 + '。'
        : q4 + 'にもおすすめできると思います。';
    }

    var closing = pick(CLOSINGS[tone], seed + 7);

    var simple = opening + clauses.slice(0, 2).join('') + closing;

    var standard = opening + clauses.slice(0, 3).join('');
    if (recommend) { standard += recommend; }
    standard += closing;

    var detailParts = [opening + clauses.slice(0, 4).join('')];
    if (episode) { detailParts.push(episode); }
    var tail = '';
    if (recommend) { tail += recommend; }
    tail += closing;
    detailParts.push(tail);
    var detail = detailParts.join('\n\n');

    return { simple: simple, standard: standard, detail: detail };
  }

  function generateDrafts() {
    var seed = answerHash();
    return {
      soft: buildDraftSet('soft', seed),
      formal: buildDraftSet('formal', seed)
    };
  }

  /* ---------- チップ描画 ---------- */

  function renderChips(containerId, options, isMulti, selectedGetter, onToggle) {
    var box = $(containerId);
    box.textContent = '';
    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = opt.label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { onToggle(opt.key); });
      b.dataset.key = opt.key;
      box.appendChild(b);
    });
    updateChips(containerId, selectedGetter);
  }

  function updateChips(containerId, selectedGetter) {
    var selected = selectedGetter();
    Array.from($(containerId).children).forEach(function (b) {
      var on = selected.indexOf(b.dataset.key) !== -1;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- 質問ナビゲーション ---------- */

  function showQuestion(i) {
    qIndex = i;
    QUESTIONS.forEach(function (q, idx) { $(q).hidden = (idx !== i); });
    $('progress-bar').style.width = ((i + 1) / QUESTIONS.length * 100) + '%';
    var optional = (i >= 2) ? '（任意）' : '';
    $('step-label').textContent = '質問 ' + (i + 1) + ' / ' + QUESTIONS.length + optional;
    $('btn-next').textContent = (i === QUESTIONS.length - 1) ? '下書きを作る' : '次へ';
    show('s-question');
  }

  function validateCurrent() {
    if (QUESTIONS[qIndex] === 'q1') {
      var ok1 = state.q1.length > 0;
      $('q1-error').hidden = ok1;
      return ok1;
    }
    if (QUESTIONS[qIndex] === 'q2') {
      var ok2 = state.q2.length > 0;
      $('q2-error').hidden = ok2;
      return ok2;
    }
    return true;
  }

  function collectTexts() {
    state.q1Other = $('q1-other').value;
    state.q2Other = $('q2-other').value;
    state.q3 = $('q3-text').value;
    state.q4 = $('q4-text').value;
    state.q5 = $('q5-text').value;
  }

  /* ---------- 画面遷移 ---------- */

  function toDrafts() {
    collectTexts();
    show('s-generating');
    setTimeout(function () {
      state.drafts = generateDrafts();
      updateDraftView();
      show('s-drafts');
      track('kuchikomi-drafts');
    }, 700);
  }

  function updateDraftView() {
    Array.from($('tone-tabs').children).forEach(function (t) {
      t.classList.toggle('on', t.dataset.tone === state.currentTone);
    });
    Array.from($('draft-tabs').children).forEach(function (t) {
      t.classList.toggle('on', t.dataset.style === state.currentStyle);
    });
    $('draft-preview').textContent = state.drafts[state.currentTone][state.currentStyle];
  }

  /* ---------- 初期化 ---------- */

  var params = new URLSearchParams(location.search);
  var token = params.get('t') || 'demo';
  var office = window.OFFICES[token];

  if (!office) {
    show('s-error');
    return;
  }
  state.office = office;
  $('intro-office').textContent = office.name + ' からのお願い';

  renderChips('q1-chips', Q1_OPTIONS, true, function () {
    return state.q1;
  }, function (key) {
    var idx1 = state.q1.indexOf(key);
    if (idx1 === -1) { state.q1.push(key); } else { state.q1.splice(idx1, 1); }
    $('q1-other-wrap').hidden = (state.q1.indexOf('other') === -1);
    $('q1-error').hidden = true;
    updateChips('q1-chips', function () { return state.q1; });
  });

  renderChips('q2-chips', Q2_OPTIONS, true, function () {
    return state.q2;
  }, function (key) {
    var idx2 = state.q2.indexOf(key);
    if (idx2 === -1) { state.q2.push(key); } else { state.q2.splice(idx2, 1); }
    $('q2-other-wrap').hidden = (state.q2.indexOf('other') === -1);
    $('q2-error').hidden = true;
    updateChips('q2-chips', function () { return state.q2; });
  });

  $('btn-start').addEventListener('click', function () {
    track('kuchikomi-start');
    showQuestion(0);
  });

  $('btn-back').addEventListener('click', function () {
    if (qIndex === 0) { show('s-intro'); } else { showQuestion(qIndex - 1); }
  });

  $('btn-next').addEventListener('click', function () {
    if (!validateCurrent()) { return; }
    if (qIndex === QUESTIONS.length - 1) { toDrafts(); } else { showQuestion(qIndex + 1); }
  });

  Array.from($('tone-tabs').children).forEach(function (t) {
    t.addEventListener('click', function () {
      state.currentTone = t.dataset.tone;
      updateDraftView();
    });
  });

  Array.from($('draft-tabs').children).forEach(function (t) {
    t.addEventListener('click', function () {
      state.currentStyle = t.dataset.style;
      updateDraftView();
    });
  });

  $('btn-drafts-back').addEventListener('click', function () { showQuestion(QUESTIONS.length - 1); });

  $('btn-choose').addEventListener('click', function () {
    $('edit-text').value = state.drafts[state.currentTone][state.currentStyle];
    show('s-edit');
  });

  $('btn-edit-back').addEventListener('click', function () { show('s-drafts'); });

  $('btn-to-final').addEventListener('click', function () {
    var text = $('edit-text').value.trim();
    if (!text) {
      toast('文章が空です。内容を入力してください。');
      return;
    }
    state.finalText = text;
    $('final-text').textContent = text;
    $('google-note').hidden = !!state.office.reviewUrl;
    show('s-final');
  });

  $('btn-copy').addEventListener('click', function () {
    var done = function () { toast('文章をコピーしました'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(state.finalText).then(done, function () { fallbackCopy(); });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = state.finalText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('コピーできませんでした。文章を長押しして選択してください。'); }
      document.body.removeChild(ta);
    }
  });

  $('btn-google').addEventListener('click', function () {
    if (!state.office.reviewUrl) {
      $('google-note').hidden = false;
      toast('試作版のため投稿画面URLは未設定です');
      return;
    }
    track('kuchikomi-google');
    window.open(state.office.reviewUrl, '_blank', 'noopener');
    $('thanks').hidden = false;
  });

  show('s-intro');
})();
