const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}


/* =====================================================
   人気ランキング
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

const ranking = rankingUsers.map((name, index) => ({
  id: `rank-${index + 1}`,
  name,
  rank: index + 1,
  score: 50000 - index * 731,
  viewers: Math.max(1, 1200 - index * 19),
  icon: ["🌙", "⭐", "🌸", "🎙️", "✨"][index % 5]
}));


/* =====================================================
   新人ライバー
   人気順
===================================================== */

const newcomers = [
  {
    id: "new-1",
    name: "新人ぼた",
    title: "はじめまして🌙",
    icon: "🌙",
    viewers: 850,
    score: 12000,
    live: true
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    viewers: 720,
    score: 10800,
    live: true
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    viewers: 680,
    score: 10100,
    live: true
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    viewers: 590,
    score: 9200,
    live: true
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    viewers: 510,
    score: 8500,
    live: true
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    viewers: 430,
    score: 7600,
    live: false
  },
  {
    id: "new-7",
    name: "月乃りん",
    title: "ゆっくり話そう",
    icon: "🌙",
    viewers: 390,
    score: 7000,
    live: true
  },
  {
    id: "new-8",
    name: "星野そら",
    title: "歌と雑談",
    icon: "⭐",
    viewers: 350,
    score: 6500,
    live: false
  },
  {
    id: "new-9",
    name: "花音",
    title: "今日もよろしく",
    icon: "🌸",
    viewers: 310,
    score: 5900,
    live: true
  },
  {
    id: "new-10",
    name: "天音",
    title: "夜のまったり配信",
    icon: "🎙️",
    viewers: 280,
    score: 5300,
    live: false
  },
  {
    id: "new-11",
    name: "雪乃",
    title: "初見さん歓迎",
    icon: "❄️",
    viewers: 250,
    score: 4900,
    live: true
  },
  {
    id: "new-12",
    name: "青空ミナ",
    title: "おしゃべりタイム",
    icon: "💎",
    viewers: 230,
    score: 4500,
    live: false
  }
];


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

<meta
  name="theme-color"
  content="#030510"
>

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

button,
div {
  -webkit-user-select: none;
  user-select: none;
}


/* =====================================================
   APP
===================================================== */

.app {
  min-height: 100vh;
  padding-bottom: 92px;
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
    rgba(3,5,16,.86);

  backdrop-filter: blur(18px);

  border-bottom:
    1px solid rgba(120,140,255,.10);
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
  background-clip: text;

  color: transparent;
}


/* =====================================================
   HERO
   画像全体を表示
===================================================== */

.hero {

  position: relative;

  margin-top: 58px;

  width: 100%;

  overflow: hidden;

  background: #030510;
}


/* 画像を実サイズ比率で表示 */

.hero-image {

  display: block;

  width: 100%;

  height: auto;

  min-height: 0;

  object-fit: contain;
}


/* 下側の暗いグラデーション */

.hero::after {

  content: "";

  position: absolute;

  inset: 0;

  pointer-events: none;

  background:
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,.15) 35%,
      rgba(3,5,16,0) 65%
    );
}


/* =====================================================
   HERO TEXT
===================================================== */

.hero-content {

  position: absolute;

  z-index: 5;

  left: 0;
  right: 0;
  bottom: 0;

  padding:
    80px
    20px
    28px;
}

.hero-small {

  font-size: 12px;

  font-weight: 700;

  color: #b7c9ff;

  margin-bottom: 8px;

  text-shadow:
    0 0 12px rgba(90,130,255,.7);
}

.hero-title {

  margin: 0;

  font-size:
    clamp(28px, 8vw, 48px);

  line-height: 1.15;

  font-weight: 900;

  letter-spacing: -1px;

  text-shadow:
    0 3px 20px rgba(0,0,0,.8);
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
  background-clip: text;

  color: transparent;
}

.hero-description {

  margin-top: 12px;

  max-width: 390px;

  font-size: 13px;

  line-height: 1.8;

  color: #d9def1;

  text-shadow:
    0 2px 12px #000;
}


/* =====================================================
   SECTION
===================================================== */

.section {

  padding:
    26px
    15px
    0;
}

.section-head {

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 14px;
}

.section-title {

  font-size: 20px;

  font-weight: 900;
}

.section-sub {

  font-size: 10px;

  color: #8492bb;

  letter-spacing: 1px;

  cursor: pointer;
}


/* =====================================================
   横スクロール
===================================================== */

.horizontal-list {

  display: flex;

  gap: 11px;

  overflow-x: auto;

  padding:
    3px
    2px
    12px;

  scrollbar-width: none;

  scroll-snap-type: x mandatory;
}

.horizontal-list::-webkit-scrollbar {
  display: none;
}


/* =====================================================
   人気カード
===================================================== */

.ranking-card {

  flex:
    0 0 170px;

  min-height: 205px;

  position: relative;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.96),
      rgba(8,11,28,.99)
    );

  border:
    1px solid
    rgba(120,140,255,.14);

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.20);

  scroll-snap-align: start;

  cursor: pointer;
}

.ranking-card:active {
  transform: scale(.97);
}

.rank-badge {

  position: absolute;

  top: 10px;
  left: 10px;

  min-width: 30px;

  padding: 4px 7px;

  border-radius: 999px;

  background:
    rgba(0,0,0,.45);

  color: #b9c7ed;

  font-size: 10px;

  font-weight: 900;
}

.rank-badge.top {

  color: #ffd76a;

  box-shadow:
    0 0 12px
    rgba(255,210,80,.25);
}

.rank-avatar {

  width: 70px;

  height: 70px;

  margin:
    14px
    auto
    12px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 32px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 22px
    rgba(80,130,255,.30);
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

  margin-top: 6px;

  font-size: 10px;

  color: #929fc1;

  text-align: center;
}

.rank-viewers {

  margin-top: 8px;

  font-size: 10px;

  color: #687596;

  text-align: center;
}

.live-label {

  position: absolute;

  right: 10px;
  top: 10px;

  padding: 3px 6px;

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );

  font-size: 8px;

  font-weight: 900;
}


/* =====================================================
   MORE BUTTON
===================================================== */

.more-button {

  width: 100%;

  height: 46px;

  margin-top: 5px;

  border-radius: 14px;

  border:
    1px solid
    rgba(120,140,255,.16);

  background:
    rgba(15,20,55,.75);

  color: #b7c5e9;

  font-size: 12px;

  font-weight: 900;
}

.more-button:active {
  transform: scale(.98);
}


/* =====================================================
   新人
===================================================== */

.newcomer-card {

  flex:
    0 0 155px;

  min-height: 188px;

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

  cursor: pointer;
}

.new-avatar-wrap {

  position: relative;

  width: 62px;
  height: 62px;

  margin-bottom: 10px;
}

.new-avatar {

  width: 62px;
  height: 62px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 28px;

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
    3px solid #11162e;

  box-shadow:
    0 0 9px
    rgba(255,60,110,.8);
}

.new-name {

  font-size: 13px;

  font-weight: 900;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.new-title {

  margin-top: 5px;

  font-size: 10px;

  line-height: 1.5;

  color: #8f9abb;

  height: 30px;

  overflow: hidden;
}

.new-viewers {

  margin-top: 7px;

  font-size: 10px;

  color: #697595;
}

.new-badge {

  display: inline-block;

  margin-top: 8px;

  padding: 3px 7px;

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
   PAGE
===================================================== */

.page {

  display: none;

  min-height: calc(100vh - 58px);

  padding:
    82px
    15px
    110px;
}

.page.active {
  display: block;
}

.page-title {

  font-size: 25px;

  font-weight: 900;

  margin-bottom: 18px;
}

.back-button {

  border: 0;

  background: transparent;

  color: #9fb2e6;

  font-size: 13px;

  padding: 0;

  margin-bottom: 15px;
}


/* =====================================================
   FULL LIST
===================================================== */

.full-list {

  display: flex;

  flex-direction: column;

  gap: 9px;
}

.full-ranking-card {

  min-height: 74px;

  display: flex;

  align-items: center;

  padding: 10px 12px;

  border-radius: 17px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.92),
      rgba(8,12,32,.96)
    );

  border:
    1px solid
    rgba(120,140,255,.11);
}

.full-rank {

  width: 40px;

  text-align: center;

  font-weight: 900;

  color: #9ba8cc;
}

.full-rank.top {
  color: #ffd76a;
  font-size: 18px;
}

.full-avatar {

  width: 48px;
  height: 48px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 22px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.full-info {

  flex: 1;

  min-width: 0;

  padding-left: 11px;
}

.full-name {

  font-size: 14px;

  font-weight: 900;
}

.full-score {

  margin-top: 4px;

  font-size: 10px;

  color: #8f9abd;
}

.full-viewers {

  font-size: 10px;

  color: #697595;
}


/* =====================================================
   FULL NEWCOMER
===================================================== */

.full-new-card {

  min-height: 86px;

  display: flex;

  align-items: center;

  padding: 12px;

  border-radius: 18px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.92),
      rgba(8,12,32,.96)
    );

  border:
    1px solid
    rgba(120,140,255,.11);
}

.full-new-avatar {

  width: 52px;
  height: 52px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 24px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.full-new-info {

  flex: 1;

  padding-left: 12px;

  min-width: 0;
}

.full-new-name {

  font-size: 14px;

  font-weight: 900;
}

.full-new-title {

  margin-top: 4px;

  font-size: 10px;

  color: #8f9abd;
}

.full-new-viewers {

  font-size: 10px;

  color: #697595;
}


/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {

  position: fixed;

  left: 0;
  right: 0;
  bottom: 0;

  height: 82px;

  z-index: 200;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

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

  gap: 4px;
}

.nav-icon {

  font-size: 19px;

  line-height: 1;
}

.nav-item.active {

  color: #bcd2ff;
}


/* =====================================================
   配信ボタン
===================================================== */

.live-nav {

  position: relative;

  top: -18px;
}

.live-button {

  width: 58px;
  height: 58px;

  border-radius: 50%;

  border:
    4px solid
    #030510;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 25px;

  background:
    linear-gradient(
      135deg,
      #ff4f87,
      #8d38ff
    );

  box-shadow:
    0 0 25px
    rgba(176,70,255,.55);

  color: white;
}

.live-text {

  margin-top: -1px;

  font-size: 9px;

  color: #ff9abc;

  font-weight: 900;
}


/* =====================================================
   DESKTOP
===================================================== */

@media (min-width: 700px) {

  .hero-content {

    padding:
      120px
      50px
      45px;
  }

  .section,
  .page {

    max-width: 1000px;

    margin:
      0 auto;
  }

}

</style>

</head>


<body>

<div class="app">


<!-- =================================================
     HEADER
================================================= -->

<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


<!-- =================================================
     HOME
================================================= -->

<main id="homePage">


<section class="hero">

  <img
    class="hero-image"
    src="/home.png"
    alt="VoiceポタLive"
  >

  <div class="hero-content">

    <div class="hero-small">
      声でつながる、みんなの居場所。
    </div>

    <h1 class="hero-title">
      <span>あなたの声が、</span><br>
      誰かの夜を照らす。
    </h1>

    <div class="hero-description">
      月明かりの下で、話して、聴いて、笑って。<br>
      VoiceポタLiveで、あなたの声をもっと近くに。
    </div>

  </div>

</section>


<!-- =================================================
     人気
================================================= -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 トップランキング
    </div>

    <div
      class="section-sub"
      onclick="showRankingPage()"
    >
      TOP 50 ＞
    </div>

  </div>

  <div
    class="horizontal-list"
    id="rankingList"
  ></div>

  <button
    class="more-button"
    onclick="showRankingPage()"
  >
    🏆 トップ50をもっと見る
  </button>

</section>


<!-- =================================================
     新人
================================================= -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <div
      class="section-sub"
      onclick="showNewcomerPage()"
    >
      全員を見る ＞
    </div>

  </div>

  <div
    class="horizontal-list"
    id="newcomerList"
  ></div>

  <button
    class="more-button"
    onclick="showNewcomerPage()"
  >
    🌱 新人ライバーをもっと見る
  </button>

</section>


</main>


<!-- =================================================
     RANKING PAGE
===================================================== -->

<section
  id="rankingPage"
  class="page"
>

  <button
    class="back-button"
    onclick="goHome()"
  >
    ← ホームに戻る
  </button>

  <div class="page-title">
    🏆 トップランキング50
  </div>

  <div
    id="fullRankingList"
    class="full-list"
  ></div>

</section>


<!-- =================================================
     NEWCOMER PAGE
===================================================== -->

<section
  id="newcomerPage"
  class="page"
>

  <button
    class="back-button"
    onclick="goHome()"
  >
    ← ホームに戻る
  </button>

  <div class="page-title">
    🌱 新人ライバー
  </div>

  <div
    id="fullNewcomerList"
    class="full-list"
  ></div>

</section>


<!-- =================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    class="nav-item active"
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


  <button
    class="nav-item live-nav"
    onclick="startLive()"
  >

    <div class="live-button">
      🎙️
    </div>

    <div class="live-text">
      配信する
    </div>

  </button>


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

/* =====================================================
   DATA
===================================================== */

let rankingData = [];
let newcomerData = [];


/* =====================================================
   HTML ESCAPE
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
   人気ランキング
===================================================== */

function renderRanking(list) {

  rankingData = Array.isArray(list)
    ? list
    : [];

  const box =
    document.getElementById(
      "rankingList"
    );

  box.innerHTML =
    rankingData
      .slice(0, 10)
      .map(user => `

        <div
          class="ranking-card"
          onclick="openUser('${escapeHtml(user.id)}')"
        >

          <div
            class="rank-badge
            ${user.rank <= 3 ? "top" : ""}"
          >
            ${user.rank}位
          </div>

          ${
            user.rank <= 10
              ? `<div class="live-label">LIVE</div>`
              : ""
          }

          <div class="rank-avatar">
            ${escapeHtml(user.icon)}
          </div>

          <div class="rank-name">
            ${escapeHtml(user.name)}
          </div>

          <div class="rank-score">
            応援
            ${Number(user.score).toLocaleString()}
          </div>

          <div class="rank-viewers">
            👁
            ${Number(user.viewers).toLocaleString()}
          </div>

        </div>

      `)
      .join("");
}


/* =====================================================
   新人
===================================================== */

function renderNewcomers(list) {

  newcomerData = Array.isArray(list)
    ? list
    : [];

  /* 人気順 */

  newcomerData.sort(
    (a, b) =>
      Number(b.viewers || 0) -
      Number(a.viewers || 0)
  );

  const box =
    document.getElementById(
      "newcomerList"
    );

  box.innerHTML =
    newcomerData
      .map(user => `

        <div
          class="newcomer-card"
          onclick="openUser('${escapeHtml(user.id)}')"
        >

          <div class="new-avatar-wrap">

            <div class="new-avatar">
              ${escapeHtml(user.icon)}
            </div>

            ${
              user.live
                ? `<div class="live-dot"></div>`
                : ""
            }

          </div>

          <div class="new-name">
            ${escapeHtml(user.name)}
          </div>

          <div class="new-title">
            ${escapeHtml(user.title)}
          </div>

          <div class="new-viewers">
            👁
            ${Number(
              user.viewers || 0
            ).toLocaleString()}
          </div>

          ${
            user.live
              ? `
                <span class="new-badge">
                  LIVE
                </span>
              `
              : `
                <span
                  class="new-badge"
                  style="
                    background:
                    rgba(80,90,130,.7)
                  "
                >
                  新人
                </span>
              `
          }

        </div>

      `)
      .join("");
}


/* =====================================================
   ランキング50ページ
===================================================== */

function showRankingPage() {

  document
    .getElementById("homePage")
    .style.display = "none";

  document
    .getElementById("newcomerPage")
    .classList.remove("active");

  document
    .getElementById("rankingPage")
    .classList.add("active");

  renderFullRanking();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function renderFullRanking() {

  const box =
    document.getElementById(
      "fullRankingList"
    );

  box.innerHTML =
    rankingData
      .slice(0, 50)
      .map(user => `

        <div
          class="full-ranking-card"
          onclick="openUser('${escapeHtml(user.id)}')"
        >

          <div
            class="full-rank
            ${user.rank <= 3 ? "top" : ""}"
          >
            ${user.rank}
          </div>

          <div class="full-avatar">
            ${escapeHtml(user.icon)}
          </div>

          <div class="full-info">

            <div class="full-name">
              ${escapeHtml(user.name)}
            </div>

            <div class="full-score">
              応援ポイント
              ${Number(
                user.score
              ).toLocaleString()}
            </div>

          </div>

          <div class="full-viewers">
            👁
            ${Number(
              user.viewers
            ).toLocaleString()}
          </div>

        </div>

      `)
      .join("");
}


/* =====================================================
   新人全員ページ
===================================================== */

function showNewcomerPage() {

  document
    .getElementById("homePage")
    .style.display = "none";

  document
    .getElementById("rankingPage")
    .classList.remove("active");

  document
    .getElementById("newcomerPage")
    .classList.add("active");

  renderFullNewcomers();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function renderFullNewcomers() {

  const box =
    document.getElementById(
      "fullNewcomerList"
    );

  const list =
    [...newcomerData].sort(
      (a, b) =>
        Number(b.viewers || 0) -
        Number(a.viewers || 0)
    );

  box.innerHTML =
    list
      .map(user => `

        <div
          class="full-new-card"
          onclick="openUser('${escapeHtml(user.id)}')"
        >

          <div class="full-new-avatar">
            ${escapeHtml(user.icon)}
          </div>

          <div class="full-new-info">

            <div class="full-new-name">
              ${escapeHtml(user.name)}
            </div>

            <div class="full-new-title">
              ${escapeHtml(user.title)}
            </div>

          </div>

          <div class="full-new-viewers">
            👁
            ${Number(
              user.viewers || 0
            ).toLocaleString()}
          </div>

        </div>

      `)
      .join("");
}


/* =====================================================
   ホーム
===================================================== */

function goHome() {

  document
    .getElementById("homePage")
    .style.display = "block";

  document
    .getElementById("rankingPage")
    .classList.remove("active");

  document
    .getElementById("newcomerPage")
    .classList.remove("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =====================================================
   USER
===================================================== */

function openUser(id) {

  alert(
    "配信者ページを準備中です。\\n\\n" +
    id
  );

}


/* =====================================================
   配信
===================================================== */

function startLive() {

  alert(
    "配信画面を準備中です。\\n\\n" +
    "ここから音声ライブ配信を開始できるようにします。"
  );

}


/* =====================================================
   その他
===================================================== */

function searchLive() {

  alert(
    "配信検索を準備中です。"
  );

}

function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}

function showProfile() {

  alert(
    "マイページを準備中です。"
  );

}


/* =====================================================
   WEBSOCKET
===================================================== */

let socket = null;

function connectSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  try {

    socket =
      new WebSocket(
        protocol +
        "//" +
        location.host
      );

  } catch (error) {

    console.log(
      "WebSocket error",
      error
    );

    return;
  }


  socket.onopen = () => {

    console.log(
      "WebSocket connected"
    );

  };


  socket.onmessage = event => {

    try {

      const data =
        JSON.parse(
          event.data
        );

      if (
        data.type ===
        "home_data"
      ) {

        renderRanking(
          data.ranking || []
        );

        renderNewcomers(
          data.newcomers || []
        );

      }

    } catch (error) {

      console.log(
        "message error",
        error
      );

    }

  };


  socket.onerror = error => {

    console.log(
      "WebSocket error",
      error
    );

  };


  socket.onclose = () => {

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
  http.createServer(
    (req, res) => {

      const url =
        req.url.split("?")[0];


      /* HOME */

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


      /* HOME IMAGE */

      if (
        url === "/home.png"
      ) {

        const imagePath =
          path.join(
            PUBLIC_DIR,
            "home.png"
          );


        if (
          fs.existsSync(
            imagePath
          )
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


      /* 404 */

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

    }
  );


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server
  });

const clients =
  new Set();


wss.on(
  "connection",
  ws => {

    clients.add(ws);

    console.log(
      "WebSocket client connected"
    );


    /* ホームデータ送信 */

    ws.send(
      JSON.stringify({
        type: "home_data",
        ranking,
        newcomers
      })
    );


    ws.on(
      "close",
      () => {

        clients.delete(ws);

        console.log(
          "WebSocket client disconnected"
        );

      }
    );


    ws.on(
      "error",
      error => {

        console.log(
          "WebSocket error:",
          error.message
        );

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
  () => {

    console.log(
      "===================================="
    );

    console.log(
      "VoiceポタLive server started"
    );

    console.log(
      "Port:",
      PORT
    );

    console.log(
      "Host:",
      HOST
    );

    console.log(
      "===================================="
    );

  }
);
