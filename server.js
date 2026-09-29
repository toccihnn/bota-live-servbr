const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}


/* =====================================================
   人気ランキング TOP50
===================================================== */

const rankingUsers = [
  "月夜ぼた",
  "星空レン",
  "夜桜ミク",
  "蒼空レイ",
  "月乃あかり",
  "白雪ユナ",
  "黒猫ルナ",
  "天音ソラ",
  "星野ナギ",
  "桜音ミオ",
  "夜空カナ",
  "水瀬リオ",
  "月島ハル",
  "青葉ナナ",
  "神楽ユイ",
  "雪村レナ",
  "花音メイ",
  "星川アオ",
  "春風ミナ",
  "雨宮シオン",
  "月城アイ",
  "白石ユウ",
  "天宮コト",
  "星宮リナ",
  "夜凪マオ",
  "桜庭ユキ",
  "水野ソラ",
  "月影ナナ",
  "青空ミオ",
  "花咲レイ",
  "星乃ユメ",
  "白月カナ",
  "夜風リオ",
  "春野アカリ",
  "天音ミナ",
  "雪空ユイ",
  "月森レン",
  "桜井ソラ",
  "星空ミオ",
  "花月ナギ",
  "夜空ユナ",
  "水城レイ",
  "白雪ミオ",
  "月野カナ",
  "星川ユキ",
  "春風ソラ",
  "天宮ナナ",
  "夜桜レナ",
  "花音ユイ",
  "月光アオ"
];

const ranking = rankingUsers.map(function(name, index) {
  return {
    id: "rank-" + (index + 1),
    name: name,
    score: 50000 - index * 731,
    viewers: Math.max(1, 1200 - index * 19),
    icon: ["🌙", "⭐", "🌸", "🎙️", "✨"][index % 5]
  };
});


/* =====================================================
   新人ライバー
===================================================== */

const newcomers = [
  {
    id: "new-1",
    name: "新人ぼた",
    title: "はじめまして🌙",
    icon: "🌙",
    live: true,
    viewers: 820
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    live: false,
    viewers: 650
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    live: true,
    viewers: 910
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    live: false,
    viewers: 410
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    live: true,
    viewers: 730
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    live: false,
    viewers: 520
  }
];


/*
 * 新人も人気順
 */
newcomers.sort(function(a, b) {
  return b.viewers - a.viewers;
});


/* =====================================================
   HTML
===================================================== */

const HTML = `
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<meta name="theme-color" content="#030510">

<title>VoiceポタLive</title>

<style>

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  background: #030510;
  color: white;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    "Yu Gothic",
    sans-serif;
}

body {
  overflow-x: hidden;
}

button {
  font-family: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

.app {
  min-height: 100vh;
  padding-bottom: 100px;
}


/* =====================================================
   HEADER
===================================================== */

.header {

  height: 58px;

  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  z-index: 100;

  display: flex;

  align-items: center;

  padding: 0 18px;

  background:
    rgba(3,5,16,.82);

  backdrop-filter: blur(18px);

  border-bottom:
    1px solid
    rgba(120,140,255,.10);
}

.logo {

  font-size: 18px;

  font-weight: 900;

  letter-spacing: -.5px;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #9bd8ff,
      #c98cff
    );

  -webkit-background-clip: text;

  color: transparent;
}


/* =====================================================
   HERO
===================================================== */

.hero {

  position: relative;

  margin-top: 58px;

  width: 100%;

  overflow: hidden;

  background: #030510;
}

.hero-image {

  position: relative;

  width: 100%;

  line-height: 0;
}

.hero-image img {

  display: block;

  width: 100%;

  height: auto;

  max-width: 100%;

  object-fit: contain;
}

.hero-image::after {

  content: "";

  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 55%;

  background:
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,.85) 20%,
      rgba(3,5,16,.20) 75%,
      transparent 100%
    );

  pointer-events: none;
}

.hero-content {

  position: absolute;

  z-index: 5;

  left: 0;
  right: 0;
  bottom: 0;

  padding:
    20px
    18px
    28px;
}

.hero-small {

  font-size: 12px;

  font-weight: 700;

  color: #b7c9ff;

  margin-bottom: 8px;

  text-shadow:
    0 0 12px
    rgba(90,130,255,.7);
}

.hero-title {

  margin: 0;

  font-size:
    clamp(27px, 8vw, 48px);

  line-height: 1.15;

  font-weight: 900;

  letter-spacing: -1px;

  text-shadow:
    0 3px 20px
    rgba(0,0,0,.9);
}

.hero-title span {

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #9bdcff,
      #d68cff
    );

  -webkit-background-clip: text;

  color: transparent;
}

.hero-description {

  margin-top: 12px;

  max-width: 390px;

  font-size: 12px;

  line-height: 1.8;

  color: #d9def1;

  text-shadow:
    0 2px 12px #000;
}


/* =====================================================
   PAGE TITLE
===================================================== */

.page-title-area {

  margin-top: 58px;

  padding:
    30px
    18px
    15px;
}

.page-title {

  margin: 0;

  font-size: 27px;

  font-weight: 900;
}

.page-description {

  margin-top: 8px;

  font-size: 12px;

  color: #8994b5;

  line-height: 1.7;
}


/* =====================================================
   SECTION
===================================================== */

.section {

  padding:
    24px
    15px
    0;
}

.section-head {

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 14px;
}

.section-head-left {

  display: flex;

  align-items: center;

  gap: 8px;
}

.section-title {

  font-size: 20px;

  font-weight: 900;
}

.section-sub {

  font-size: 10px;

  color: #687394;

  letter-spacing: 1px;
}

.more-link {

  border: 0;

  background: transparent;

  color: #91aaff;

  font-size: 11px;

  font-weight: 800;

  padding: 5px;
}


/* =====================================================
   HORIZONTAL LIST
===================================================== */

.horizontal-list {

  display: flex;

  gap: 10px;

  overflow-x: auto;

  padding:
    3px
    2px
    12px;

  scrollbar-width: none;

  scroll-snap-type: x proximity;
}

.horizontal-list::-webkit-scrollbar {
  display: none;
}


/* =====================================================
   RANKING CARD
===================================================== */

.ranking-card {

  flex:
    0 0
    155px;

  min-height: 190px;

  position: relative;

  padding: 15px 13px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.98),
      rgba(8,11,28,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.14);

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.20);

  scroll-snap-align: start;
}

.rank-position {

  position: absolute;

  top: 10px;
  left: 11px;

  width: 27px;
  height: 27px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background:
    rgba(3,5,16,.75);

  font-size: 11px;

  font-weight: 900;

  color: #9ba7ca;
}

.rank-position.top {

  color: #ffd76a;

  box-shadow:
    0 0 14px
    rgba(255,210,80,.25);
}

.rank-avatar {

  width: 66px;
  height: 66px;

  margin:
    10px
    auto
    10px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 30px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 20px
    rgba(80,130,255,.32);
}

.rank-name {

  font-size: 14px;

  font-weight: 900;

  text-align: center;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.rank-score {

  margin-top: 7px;

  font-size: 10px;

  color: #919cbd;

  text-align: center;
}

.rank-viewers {

  margin-top: 7px;

  font-size: 10px;

  color: #6f7a9b;

  text-align: center;
}


/* =====================================================
   NEWCOMER CARD
===================================================== */

.newcomer-card {

  flex:
    0 0
    155px;

  min-height: 190px;

  position: relative;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.13);

  scroll-snap-align: start;
}

.new-rank {

  position: absolute;

  top: 10px;
  left: 10px;

  font-size: 11px;

  font-weight: 900;

  color: #909abd;
}

.new-avatar-wrap {

  position: relative;

  width: 66px;
  height: 66px;

  margin:
    10px
    auto
    11px;
}

.new-avatar {

  width: 66px;
  height: 66px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 30px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.live-dot {

  position: absolute;

  right: -1px;
  bottom: -1px;

  width: 16px;
  height: 16px;

  border-radius: 50%;

  background: #ff3d6e;

  border:
    3px solid
    #11162e;

  box-shadow:
    0 0 9px
    rgba(255,60,110,.8);
}

.new-name {

  font-size: 13px;

  font-weight: 900;

  text-align: center;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.new-title {

  margin-top: 6px;

  font-size: 10px;

  line-height: 1.5;

  color: #8f9abb;

  height: 31px;

  overflow: hidden;

  text-align: center;
}

.new-badge {

  display: block;

  width: fit-content;

  margin:
    9px
    auto
    0;

  padding:
    3px
    8px;

  border-radius: 999px;

  font-size: 8px;

  font-weight: 900;

  color: white;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );
}


/* =====================================================
   FULL LIST
===================================================== */

.full-list {

  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;
}

.full-list .ranking-card,
.full-list .newcomer-card {

  width: 100%;

  min-width: 0;

  flex: none;
}


/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {

  position: fixed;

  left: 0;
  right: 0;
  bottom: 0;

  height: 78px;

  z-index: 200;

  display: grid;

  grid-template-columns:
    1fr
    1fr
    1.25fr
    1fr
    1fr;

  align-items: center;

  padding:
    6px
    7px
    calc(
      6px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.96);

  backdrop-filter: blur(20px);

  border-top:
    1px solid
    rgba(120,140,255,.12);
}

.nav-item {

  border: 0;

  background: transparent;

  color: #697496;

  font-size: 9px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 3px;

  height: 65px;
}

.nav-icon {

  font-size: 20px;

  line-height: 1;
}

.nav-item.active {

  color: #bcd2ff;
}

.live-button-wrap {

  display: flex;

  justify-content: center;

  align-items: center;
}

.live-button {

  width: 64px;
  height: 64px;

  margin-top: -24px;

  border-radius: 50%;

  border:
    4px solid
    #030510;

  background:
    linear-gradient(
      145deg,
      #ff4b91,
      #9b35ff
    );

  color: white;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  font-size: 10px;

  font-weight: 900;

  box-shadow:
    0 5px 22px
    rgba(190,50,255,.45);
}

.live-button-icon {

  font-size: 23px;

  line-height: 1;

  margin-bottom: 2px;
}


/* =====================================================
   EMPTY
===================================================== */

.empty {

  padding:
    40px
    15px;

  text-align: center;

  color: #697496;

  font-size: 12px;
}


/* =====================================================
   DESKTOP
===================================================== */

@media (min-width: 700px) {

  .hero-image {
    max-width: 900px;
    margin: auto;
  }

  .hero-content {
    max-width: 900px;
    margin: auto;
    left: 0;
    right: 0;
  }

  .section {
    max-width: 1000px;
    margin: auto;
  }

  .full-list {
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
  }

}

</style>

</head>


<body>

<div class="app">

<header class="header">

  <a
    href="/"
    class="logo"
  >
    VoiceポタLive
  </a>

</header>


<div id="page"></div>


<nav class="bottom-nav">

  <button
    class="nav-item"
    onclick="goHome()"
  >
    <div class="nav-icon">⌂</div>
    ホーム
  </button>


  <button
    class="nav-item"
    onclick="searchLive()"
  >
    <div class="nav-icon">⌕</div>
    探す
  </button>


  <div class="live-button-wrap">

    <button
      class="live-button"
      onclick="startLive()"
    >
      <div class="live-button-icon">🎙️</div>
      配信する
    </button>

  </div>


  <button
    class="nav-item"
    onclick="showNotice()"
  >
    <div class="nav-icon">♧</div>
    お知らせ
  </button>


  <button
    class="nav-item"
    onclick="showProfile()"
  >
    <div class="nav-icon">♙</div>
    マイページ
  </button>

</nav>

</div>


<script>

var socket = null;

var currentPath = window.location.pathname;


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =====================================================
   HOME
===================================================== */

function renderHome(data) {

  var page =
    document.getElementById("page");

  page.innerHTML =
    '<section class="hero">' +

      '<div class="hero-image">' +

        '<img ' +
          'src="/home.png" ' +
          'alt="VoiceポタLive" ' +
        '>' +

        '<div class="hero-content">' +

          '<div class="hero-small">' +
            '声でつながる、みんなの居場所。' +
          '</div>' +

          '<h1 class="hero-title">' +
            '<span>あなたの声が、</span><br>' +
            '誰かの夜を照らす。' +
          '</h1>' +

          '<div class="hero-description">' +
            '月明かりの下で、話して、聴いて、笑って。<br>' +
            'VoiceポタLiveで、あなたの声をもっと近くに。' +
          '</div>' +

        '</div>' +

      '</div>' +

    '</section>' +


    '<section class="section">' +

      '<div class="section-head">' +

        '<div class="section-head-left">' +

          '<div class="section-title">' +
            '🏆 人気ランキング' +
          '</div>' +

          '<div class="section-sub">' +
            'TOP 50' +
          '</div>' +

        '</div>' +

        '<button ' +
          'class="more-link" ' +
          'onclick="openRanking()"' +
        '>' +
          'もっと見る ›' +
        '</button>' +

      '</div>' +

      '<div ' +
        'class="horizontal-list" ' +
        'id="rankingList"' +
      '></div>' +

    '</section>' +


    '<section class="section">' +

      '<div class="section-head">' +

        '<div class="section-head-left">' +

          '<div class="section-title">' +
            '🌱 新人ライバー' +
          '</div>' +

          '<div class="section-sub">' +
            'NEW' +
          '</div>' +

        '</div>' +

        '<button ' +
          'class="more-link" ' +
          'onclick="openNewcomers()"' +
        '>' +
          'もっと見る ›' +
        '</button>' +

      '</div>' +

      '<div ' +
        'class="horizontal-list" ' +
        'id="newcomerList"' +
      '></div>' +

    '</section>';

  renderRankingHome(data.ranking);
  renderNewcomersHome(data.newcomers);
}


/* =====================================================
   RANKING HOME
===================================================== */

function renderRankingHome(list) {

  var box =
    document.getElementById("rankingList");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  list.slice(0, 10).forEach(function(user, index) {

    var card =
      document.createElement("div");

    card.className =
      "ranking-card";

    card.onclick = function() {
      openUser(user.id);
    };

    card.innerHTML =

      '<div class="rank-position ' +
      (index < 3 ? "top" : "") +
      '">' +
      (index + 1) +
      '</div>' +

      '<div class="rank-avatar">' +
      escapeHtml(user.icon) +
      '</div>' +

      '<div class="rank-name">' +
      escapeHtml(user.name) +
      '</div>' +

      '<div class="rank-score">' +
      '応援ポイント ' +
      Number(user.score).toLocaleString() +
      '</div>' +

      '<div class="rank-viewers">' +
      '👁 ' +
      Number(user.viewers).toLocaleString() +
      '</div>';

    box.appendChild(card);

  });

}


/* =====================================================
   NEWCOMER HOME
===================================================== */

function renderNewcomersHome(list) {

  var box =
    document.getElementById("newcomerList");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  list.forEach(function(user, index) {

    var card =
      document.createElement("div");

    card.className =
      "newcomer-card";

    card.onclick = function() {
      openUser(user.id);
    };

    card.innerHTML =

      '<div class="new-rank">' +
      '#' + (index + 1) +
      '</div>' +

      '<div class="new-avatar-wrap">' +

        '<div class="new-avatar">' +
          escapeHtml(user.icon) +
        '</div>' +

        (
          user.live
            ? '<div class="live-dot"></div>'
            : ''
        ) +

      '</div>' +

      '<div class="new-name">' +
        escapeHtml(user.name) +
      '</div>' +

      '<div class="new-title">' +
        escapeHtml(user.title) +
      '</div>' +

      (
        user.live
          ? '<span class="new-badge">LIVE</span>'
          : '<span class="new-badge">新人</span>'
      );

    box.appendChild(card);

  });

}


/* =====================================================
   RANKING PAGE
===================================================== */

function renderRankingPage(list) {

  var page =
    document.getElementById("page");

  page.innerHTML =

    '<section class="page-title-area">' +

      '<h1 class="page-title">' +
        '🏆 人気ランキング TOP50' +
      '</h1>' +

      '<div class="page-description">' +
        '現在の人気順で50人を表示しています。' +
      '</div>' +

    '</section>' +

    '<section class="section">' +

      '<div ' +
        'class="full-list" ' +
        'id="rankingFullList"' +
      '></div>' +

    '</section>';

  var box =
    document.getElementById("rankingFullList");

  list.forEach(function(user, index) {

    var card =
      document.createElement("div");

    card.className =
      "ranking-card";

    card.onclick = function() {
      openUser(user.id);
    };

    card.innerHTML =

      '<div class="rank-position ' +
      (index < 3 ? "top" : "") +
      '">' +
      (index + 1) +
      '</div>' +

      '<div class="rank-avatar">' +
      escapeHtml(user.icon) +
      '</div>' +

      '<div class="rank-name">' +
      escapeHtml(user.name) +
      '</div>' +

      '<div class="rank-score">' +
      '応援ポイント ' +
      Number(user.score).toLocaleString() +
      '</div>' +

      '<div class="rank-viewers">' +
      '👁 ' +
      Number(user.viewers).toLocaleString() +
      '</div>';

    box.appendChild(card);

  });

}


/* =====================================================
   NEWCOMER PAGE
===================================================== */

function renderNewcomerPage(list) {

  var page =
    document.getElementById("page");

  page.innerHTML =

    '<section class="page-title-area">' +

      '<h1 class="page-title">' +
        '🌱 新人ライバー' +
      '</h1>' +

      '<div class="page-description">' +
        '新人ライバーを人気順で表示しています。' +
      '</div>' +

    '</section>' +

    '<section class="section">' +

      '<div ' +
        'class="full-list" ' +
        'id="newcomerFullList"' +
      '></div>' +

    '</section>';

  var box =
    document.getElementById("newcomerFullList");

  list.forEach(function(user, index) {

    var card =
      document.createElement("div");

    card.className =
      "newcomer-card";

    card.onclick = function() {
      openUser(user.id);
    };

    card.innerHTML =

      '<div class="new-rank">' +
      '#' + (index + 1) +
      '</div>' +

      '<div class="new-avatar-wrap">' +

        '<div class="new-avatar">' +
          escapeHtml(user.icon) +
        '</div>' +

        (
          user.live
            ? '<div class="live-dot"></div>'
            : ''
        ) +

      '</div>' +

      '<div class="new-name">' +
        escapeHtml(user.name) +
      '</div>' +

      '<div class="new-title">' +
        escapeHtml(user.title) +
      '</div>' +

      (
        user.live
          ? '<span class="new-badge">LIVE</span>'
          : '<span class="new-badge">新人</span>'
      );

    box.appendChild(card);

  });

}


/* =====================================================
   NAVIGATION
===================================================== */

function goHome() {

  window.location.href = "/";

}


function openRanking() {

  window.location.href = "/ranking";

}


function openNewcomers() {

  window.location.href = "/newcomers";

}


function openUser(id) {

  alert(
    "配信者ページを開きます\\n\\n" +
    id
  );

}


function searchLive() {

  alert(
    "配信検索は次の機能で追加します。"
  );

}


function startLive() {

  alert(
    "配信開始画面を準備します。"
  );

}


function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}


function showProfile() {

  alert(
    "マイページを準備します。"
  );

}


/* =====================================================
   WEBSOCKET
===================================================== */

function connectSocket() {

  var protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  socket =
    new WebSocket(
      protocol +
      "//" +
      location.host
    );


  socket.onopen = function() {

    console.log(
      "WebSocket connected"
    );

  };


  socket.onmessage = function(event) {

    try {

      var data =
        JSON.parse(event.data);

      if (data.type !== "home_data") {
        return;
      }


      if (currentPath === "/ranking") {

        renderRankingPage(
          data.ranking
        );

        return;
      }


      if (currentPath === "/newcomers") {

        renderNewcomerPage(
          data.newcomers
        );

        return;
      }


      renderHome(data);

    } catch (error) {

      console.error(
        "WebSocket message error:",
        error
      );

    }

  };


  socket.onerror = function(error) {

    console.error(
      "WebSocket error:",
      error
    );

  };


  socket.onclose = function() {

    console.log(
      "WebSocket disconnected"
    );

    setTimeout(
      connectSocket,
      2000
    );

  };

}


/* =====================================================
   START
===================================================== */

connectSocket();

</script>

</body>
</html>
`;


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(function(req, res) {

    const url =
      req.url.split("?")[0];


    /* =================================================
       HOME
    ================================================= */

    if (
      url === "/" ||
      url === "/index.html"
    ) {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache"
        }
      );

      res.end(HTML);

      return;
    }


    /* =================================================
       RANKING
    ================================================= */

    if (url === "/ranking") {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache"
        }
      );

      res.end(HTML);

      return;
    }


    /* =================================================
       NEWCOMERS
    ================================================= */

    if (url === "/newcomers") {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache"
        }
      );

      res.end(HTML);

      return;
    }


    /* =================================================
       HOME IMAGE
    ================================================= */

    if (url === "/home.png") {

      const imagePath =
        path.join(
          PUBLIC_DIR,
          "home.png"
        );


      if (
        fs.existsSync(imagePath)
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "image/png",

            "Cache-Control":
              "public, max-age=3600"
          }
        );

        fs.createReadStream(
          imagePath
        ).pipe(res);

        return;
      }


      res.writeHead(
        404,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );

      res.end(
        "home.png がありません"
      );

      return;
    }


    /* =================================================
       NOT FOUND
    ================================================= */

    res.writeHead(
      404,
      {
        "Content-Type":
          "text/plain; charset=utf-8"
      }
    );

    res.end(
      "Not Found"
    );

  });


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server: server
  });


const clients =
  new Set();


wss.on(
  "connection",
  function(ws) {

    clients.add(ws);

    console.log(
      "WebSocket client connected"
    );


    ws.send(
      JSON.stringify({
        type: "home_data",
        ranking: ranking,
        newcomers: newcomers
      })
    );


    ws.on(
      "close",
      function() {

        clients.delete(ws);

        console.log(
          "WebSocket client disconnected"
        );

      }
    );


    ws.on(
      "error",
      function(error) {

        console.error(
          "WebSocket error:",
          error
        );

        clients.delete(ws);

      }
    );

  }
);


/* =====================================================
   START SERVER
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "VoiceポタLive server started"
    );

    console.log(
      "Listening on port:",
      PORT
    );

  }
);
