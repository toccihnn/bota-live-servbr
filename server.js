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
   サンプルランキング
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
  id: "rank-" + (index + 1),
  name,
  score: 50000 - index * 731,
  viewers: Math.max(1, 1200 - index * 19),
  icon: ["🌙", "⭐", "🌸", "🎙️", "✨"][index % 5]
}));


/* =====================================================
   新人ライバー
===================================================== */

const newcomers = [
  {
    id: "new-1",
    name: "新人ぼた",
    title: "はじめまして🌙",
    icon: "🌙",
    live: true
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    live: false
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    live: true
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    live: false
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    live: true
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    live: false
  },
  {
    id: "new-7",
    name: "月乃",
    title: "夜の雑談",
    icon: "🌙",
    live: false
  },
  {
    id: "new-8",
    name: "あおい",
    title: "歌います",
    icon: "💙",
    live: false
  },
  {
    id: "new-9",
    name: "ゆら",
    title: "のんびり配信",
    icon: "✨",
    live: false
  },
  {
    id: "new-10",
    name: "カナ",
    title: "お話しよう",
    icon: "🌸",
    live: false
  },
  {
    id: "new-11",
    name: "れい",
    title: "初見歓迎",
    icon: "⭐",
    live: false
  },
  {
    id: "new-12",
    name: "なぎ",
    title: "深夜雑談",
    icon: "🌙",
    live: false
  }
];


/* =====================================================
   配信管理
=====================================================

   liveStreams
   key   = broadcaster clientId
   value = 配信情報

===================================================== */

const clients = new Map();

const liveStreams = new Map();


/* =====================================================
   HTML
===================================================== */

const HTML = String.raw`
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

button:active {
  transform: scale(.97);
}

.app {
  min-height: 100vh;
  padding-bottom: 105px;
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
  background: rgba(3,5,16,.84);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(120,140,255,.10);
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
  min-height: 590px;
  overflow: hidden;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,0) 35%,
      rgba(3,5,16,.35) 62%,
      #030510 100%
    ),
    url("/home.png");

  background-size: cover;
  background-position: center top;

  display: flex;
  align-items: flex-end;
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;

  background:
    linear-gradient(
      90deg,
      rgba(2,4,15,.04),
      rgba(2,4,15,0) 70%
    ),
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,0) 46%
    );
}

.hero-content {
  position: relative;
  z-index: 5;
  width: 100%;
  padding: 40px 20px 28px;
}

.hero-small {
  font-size: 12px;
  font-weight: 700;
  color: #b7c9ff;
  margin-bottom: 8px;
  text-shadow: 0 0 12px rgba(90,130,255,.7);
}

.hero-title {
  margin: 0;
  font-size: clamp(28px, 8vw, 48px);
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -1px;
  text-shadow: 0 3px 20px rgba(0,0,0,.8);
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
  font-size: 13px;
  line-height: 1.8;
  color: #d9def1;
  text-shadow: 0 2px 12px #000;
}


/* =====================================================
   SECTION
===================================================== */

.section {
  padding: 28px 15px 0;
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

.section-link {
  border: 0;
  background: transparent;
  color: #8faaff;
  font-size: 11px;
  font-weight: 800;
}


/* =====================================================
   横スクロール
===================================================== */

.horizontal-list {
  display: flex;
  gap: 11px;
  overflow-x: auto;
  padding: 3px 2px 12px;
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
  flex: 0 0 145px;
  min-height: 190px;
  padding: 14px;
  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.98),
      rgba(8,11,28,.98)
    );

  border: 1px solid rgba(120,140,255,.14);

  box-shadow:
    0 10px 30px rgba(0,0,0,.25);

  position: relative;
  overflow: hidden;
  scroll-snap-align: start;
}

.rank-position {
  font-size: 11px;
  color: #ffd76a;
  font-weight: 900;
}

.rank-avatar {
  width: 66px;
  height: 66px;
  margin: 10px auto 10px;
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
    0 0 20px rgba(80,130,255,.30);
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
  font-size: 9px;
  color: #8995b8;
  text-align: center;
}

.rank-viewers {
  margin-top: 8px;
  font-size: 10px;
  color: #b2bddb;
  text-align: center;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
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

.live-badge.offline {
  background: rgba(80,90,130,.7);
}


/* =====================================================
   NEWCOMER
===================================================== */

.newcomer-card {
  flex: 0 0 145px;
  min-height: 180px;
  padding: 14px;
  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border: 1px solid rgba(120,140,255,.13);

  scroll-snap-align: start;
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
  border: 3px solid #11162e;

  box-shadow:
    0 0 9px rgba(255,60,110,.8);
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


/* =====================================================
   LIVE AREA
===================================================== */

.live-section {
  display: none;
}

.live-section.show {
  display: block;
}

.live-card {
  padding: 18px;
  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(35,18,65,.98),
      rgba(8,11,28,.98)
    );

  border:
    1px solid
    rgba(190,100,255,.20);

  box-shadow:
    0 12px 35px
    rgba(0,0,0,.30);
}

.live-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  color: #ff6b92;
  font-size: 12px;
  font-weight: 900;
}

.live-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff3d6e;
  box-shadow: 0 0 10px #ff3d6e;
}

.live-title {
  font-size: 18px;
  font-weight: 900;
}

.live-viewers {
  margin-top: 5px;
  color: #8995b8;
  font-size: 11px;
}


/* =====================================================
   LIVE PLAYER
===================================================== */

.player-overlay {
  display: none;

  position: fixed;
  inset: 0;

  z-index: 1000;

  background:
    rgba(1,2,9,.97);

  padding:
    20px
    16px
    calc(
      20px +
      env(safe-area-inset-bottom)
    );
}

.player-overlay.show {
  display: flex;
  flex-direction: column;
}

.player-top {
  display: flex;
  align-items: center;
  justify-content: space-between;

  height: 50px;
}

.player-name {
  font-size: 17px;
  font-weight: 900;
}

.close-player {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;

  background: rgba(80,90,130,.45);
  color: white;

  font-size: 20px;
}

.player-box {
  margin-top: 20px;

  flex: 1;

  border-radius: 24px;

  background:
    radial-gradient(
      circle at 50% 25%,
      rgba(72,91,190,.25),
      transparent 45%
    ),
    #070a18;

  border: 1px solid rgba(120,140,255,.15);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.player-icon {
  width: 110px;
  height: 110px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 50px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 45px
    rgba(80,130,255,.35);
}

.player-live {
  margin-top: 20px;

  color: #ff5c85;

  font-weight: 900;
}

.player-hint {
  margin-top: 8px;

  color: #7d89ab;

  font-size: 11px;
}

audio {
  display: none;
}


/* =====================================================
   BROADCASTER
===================================================== */

.broadcast-panel {
  display: none;

  position: fixed;
  inset: 0;

  z-index: 900;

  background:
    radial-gradient(
      circle at 50% 15%,
      rgba(60,80,180,.22),
      transparent 40%
    ),
    #030510;

  padding:
    25px
    18px
    calc(
      25px +
      env(safe-area-inset-bottom)
    );
}

.broadcast-panel.show {
  display: flex;
  flex-direction: column;
}

.broadcast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.broadcast-title {
  font-size: 22px;
  font-weight: 900;
}

.broadcast-close {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;

  background: rgba(80,90,130,.4);
  color: white;
  font-size: 20px;
}

.broadcast-center {
  flex: 1;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.broadcast-mic {
  width: 140px;
  height: 140px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 60px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 50px
    rgba(80,130,255,.35);
}

.broadcast-state {
  margin-top: 25px;
  font-size: 18px;
  font-weight: 900;
}

.broadcast-sub {
  margin-top: 8px;
  color: #7f8bab;
  font-size: 11px;
}

.start-live-button {
  width: 100%;
  height: 58px;

  border: 0;
  border-radius: 18px;

  color: white;

  font-size: 16px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #9f2fff
    );

  box-shadow:
    0 10px 30px
    rgba(180,50,180,.25);
}

.stop-live-button {
  width: 100%;
  height: 58px;

  border: 1px solid rgba(255,80,110,.35);
  border-radius: 18px;

  color: white;

  font-size: 16px;
  font-weight: 900;

  background:
    rgba(80,15,35,.8);

  display: none;
}


/* =====================================================
   MORE
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

  color: #aebbe0;

  font-size: 12px;
  font-weight: 800;
}


/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {
  position: fixed;

  left: 0;
  right: 0;
  bottom: 0;

  height: 86px;

  z-index: 200;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  padding:
    6px
    7px
    calc(
      7px +
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
  font-size: 20px;
  line-height: 1;
}

.nav-item.active {
  color: #bcd2ff;
}

.nav-item.active .nav-icon {
  filter:
    drop-shadow(
      0 0 8px #5e8cff
    );
}

.nav-live {
  position: relative;
}

.nav-live .nav-icon {
  width: 48px;
  height: 48px;

  margin-top: -23px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    linear-gradient(
      135deg,
      #ff3e72,
      #9f2fff
    );

  color: white;

  border:
    4px solid
    #030510;

  box-shadow:
    0 0 20px
    rgba(180,60,255,.45);
}

.nav-live span {
  color: #c5cce4;
}


/* =====================================================
   FULL PAGE
===================================================== */

.page {
  display: none;

  position: fixed;
  inset: 0;

  z-index: 800;

  overflow-y: auto;

  background:
    #030510;

  padding:
    25px
    15px
    100px;
}

.page.show {
  display: block;
}

.page-header {
  height: 50px;

  display: flex;
  align-items: center;
  gap: 15px;
}

.page-back {
  width: 40px;
  height: 40px;

  border: 0;
  border-radius: 50%;

  background: rgba(80,90,130,.4);

  color: white;

  font-size: 22px;
}

.page-title {
  font-size: 20px;
  font-weight: 900;
}

.full-grid {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;

  margin-top: 15px;
}

.full-card {
  min-height: 175px;

  padding: 15px;

  border-radius: 19px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.13);
}

.full-avatar {
  width: 60px;
  height: 60px;

  margin-bottom: 10px;

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

.full-name {
  font-size: 13px;
  font-weight: 900;
}

.full-info {
  margin-top: 5px;

  color: #8792b3;

  font-size: 10px;
}


/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 500px) {

  .hero {
    min-height: 590px;
    background-size: auto 590px;
    background-position: 57% top;
  }

  .hero-content {
    padding: 30px 18px 25px;
  }

  .hero-title {
    font-size: 30px;
  }

  .hero-description {
    font-size: 12px;
  }
}

</style>

</head>


<body>

<div class="app">

<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


<section class="hero">

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


<!-- 人気ランキング -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 人気トップ50
    </div>

    <button
      class="section-link"
      onclick="openRankingPage()"
    >
      もっと見る →
    </button>

  </div>

  <div
    class="horizontal-list"
    id="rankingList"
  ></div>

  <button
    class="more-button"
    onclick="openRankingPage()"
  >
    トップ50をすべて見る
  </button>

</section>


<!-- 新人 -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <button
      class="section-link"
      onclick="openNewcomerPage()"
    >
      もっと見る →
    </button>

  </div>

  <div
    class="horizontal-list"
    id="newcomerList"
  ></div>

  <button
    class="more-button"
    onclick="openNewcomerPage()"
  >
    新人ライバーをすべて見る
  </button>

</section>


<!-- 現在配信中 -->

<section
  class="section live-section"
  id="liveSection"
>

  <div class="section-head">

    <div class="section-title">
      🔴 現在配信中
    </div>

  </div>

  <div id="liveList"></div>

</section>


<!-- 下部ナビ -->

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
    class="nav-item nav-live"
    onclick="openBroadcast()"
  >
    <div class="nav-icon">🎙</div>
    <span>配信する</span>
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


<!-- =====================================================
     ランキングページ
===================================================== -->

<div
  class="page"
  id="rankingPage"
>

  <div class="page-header">

    <button
      class="page-back"
      onclick="closePages()"
    >
      ←
    </button>

    <div class="page-title">
      🏆 人気トップ50
    </div>

  </div>

  <div
    class="full-grid"
    id="fullRankingList"
  ></div>

</div>


<!-- =====================================================
     新人ページ
===================================================== -->

<div
  class="page"
  id="newcomerPage"
>

  <div class="page-header">

    <button
      class="page-back"
      onclick="closePages()"
    >
      ←
    </button>

    <div class="page-title">
      🌱 新人ライバー
    </div>

  </div>

  <div
    class="full-grid"
    id="fullNewcomerList"
  ></div>

</div>


<!-- =====================================================
     配信者画面
===================================================== -->

<div
  class="broadcast-panel"
  id="broadcastPanel"
>

  <div class="broadcast-header">

    <div class="broadcast-title">
      🎙 配信する
    </div>

    <button
      class="broadcast-close"
      onclick="closeBroadcast()"
    >
      ×
    </button>

  </div>

  <div class="broadcast-center">

    <div class="broadcast-mic">
      🎙️
    </div>

    <div
      class="broadcast-state"
      id="broadcastState"
    >
      配信準備完了
    </div>

    <div class="broadcast-sub">
      マイクへのアクセスを許可して配信を開始します
    </div>

  </div>

  <button
    class="start-live-button"
    id="startLiveButton"
    onclick="startBroadcast()"
  >
    🔴 配信を開始する
  </button>

  <button
    class="stop-live-button"
    id="stopLiveButton"
    onclick="stopBroadcast()"
  >
    ■ 配信を終了する
  </button>

</div>


<!-- =====================================================
     視聴画面
===================================================== -->

<div
  class="player-overlay"
  id="playerOverlay"
>

  <div class="player-top">

    <div
      class="player-name"
      id="playerName"
    >
      LIVE
    </div>

    <button
      class="close-player"
      onclick="closePlayer()"
    >
      ×
    </button>

  </div>

  <div class="player-box">

    <div
      class="player-icon"
      id="playerIcon"
    >
      🎙️
    </div>

    <div class="player-live">
      🔴 LIVE
    </div>

    <div class="player-hint">
      音声を接続しています…
    </div>

    <audio
      id="remoteAudio"
      autoplay
      playsinline
      controls="false"
    ></audio>

  </div>

</div>


<script>

/* =====================================================
   状態
===================================================== */

let socket = null;

let myClientId = null;

let myStream = null;

let isBroadcasting = false;

let currentLiveId = null;

let currentViewerPeer = null;

const broadcasterPeers = new Map();

let liveData = [];


/* =====================================================
   WebSocket接続
===================================================== */

function connectSocket() {

  const protocol =
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

      const data =
        JSON.parse(
          event.data
        );

      handleSocketMessage(data);

    } catch (error) {

      console.log(
        "message error",
        error
      );

    }

  };

  socket.onclose = function() {

    setTimeout(
      connectSocket,
      2000
    );

  };

}


/* =====================================================
   WebSocketメッセージ
===================================================== */

function handleSocketMessage(data) {

  if (
    data.type ===
    "welcome"
  ) {

    myClientId =
      data.clientId;

    updateLiveList(
      data.liveStreams || []
    );

    return;
  }


  if (
    data.type ===
    "live_list"
  ) {

    updateLiveList(
      data.liveStreams || []
    );

    return;
  }


  if (
    data.type ===
    "viewer_joined"
  ) {

    if (
      !isBroadcasting
    ) {
      return;
    }

    createOfferForViewer(
      data.viewerId
    );

    return;
  }


  if (
    data.type ===
    "offer"
  ) {

    handleOffer(
      data
    );

    return;
  }


  if (
    data.type ===
    "answer"
  ) {

    handleAnswer(
      data
    );

    return;
  }


  if (
    data.type ===
    "ice"
  ) {

    handleIce(
      data
    );

    return;
  }


  if (
    data.type ===
    "live_started"
  ) {

    updateLiveList(
      data.liveStreams || []
    );

    return;
  }


  if (
    data.type ===
    "live_stopped"
  ) {

    updateLiveList(
      data.liveStreams || []
    );

    if (
      currentLiveId ===
      data.liveId
    ) {

      closePlayer();

    }

    return;
  }

}


/* =====================================================
   送信
===================================================== */

function send(data) {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

  }

}


/* =====================================================
   ランキング表示
===================================================== */

function renderRanking(list) {

  const box =
    document.getElementById(
      "rankingList"
    );

  box.innerHTML =
    list
      .slice(0, 10)
      .map(function(user) {

        return (

          '<div class="ranking-card" ' +
          'onclick="openRankingUser(\'' +
          escapeHtml(user.id) +
          '\')">' +

            '<div class="rank-position">' +
              '🏆 ' +
              user.rank +
            '</div>' +

            '<div class="rank-avatar">' +
              user.icon +
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
            '</div>' +

          '</div>'

        );

      })
      .join("");

}


/* =====================================================
   新人表示
===================================================== */

function renderNewcomers(list) {

  const box =
    document.getElementById(
      "newcomerList"
    );

  box.innerHTML =
    list
      .slice(0, 10)
      .map(function(user) {

        return (

          '<div class="newcomer-card" ' +
          'onclick="openNewcomerUser(\'' +
          escapeHtml(user.id) +
          '\')">' +

            '<div class="new-avatar-wrap">' +

              '<div class="new-avatar">' +
                user.icon +
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
                ? '<span class="live-badge">LIVE</span>'
                : '<span class="live-badge offline">新人</span>'
            ) +

          '</div>'

        );

      })
      .join("");

}


/* =====================================================
   ランキングページ
===================================================== */

function openRankingPage() {

  closePages();

  document
    .getElementById(
      "rankingPage"
    )
    .classList.add(
      "show"
    );

  renderFullRanking();

}


function renderFullRanking() {

  const box =
    document.getElementById(
      "fullRankingList"
    );

  box.innerHTML =
    rankingData
      .map(function(user) {

        return (

          '<div class="full-card" ' +
          'onclick="openRankingUser(\'' +
          escapeHtml(user.id) +
          '\')">' +

            '<div class="full-avatar">' +
              user.icon +
            '</div>' +

            '<div class="full-name">' +
              user.rank +
              '. ' +
              escapeHtml(user.name) +
            '</div>' +

            '<div class="full-info">' +
              '応援 ' +
              Number(user.score).toLocaleString() +
              '<br>' +
              '👁 ' +
              Number(user.viewers).toLocaleString() +
            '</div>' +

          '</div>'

        );

      })
      .join("");

}


/* =====================================================
   新人ページ
===================================================== */

function openNewcomerPage() {

  closePages();

  document
    .getElementById(
      "newcomerPage"
    )
    .classList.add(
      "show"
    );

  renderFullNewcomers();

}


function renderFullNewcomers() {

  const box =
    document.getElementById(
      "fullNewcomerList"
    );

  box.innerHTML =
    newcomerData
      .map(function(user) {

        return (

          '<div class="full-card" ' +
          'onclick="openNewcomerUser(\'' +
          escapeHtml(user.id) +
          '\')">' +

            '<div class="full-avatar">' +
              user.icon +
            '</div>' +

            '<div class="full-name">' +
              escapeHtml(user.name) +
            '</div>' +

            '<div class="full-info">' +
              escapeHtml(user.title) +
              '<br><br>' +
              (
                user.live
                  ? '🔴 LIVE'
                  : '🌱 新人'
              ) +
            '</div>' +

          '</div>'

        );

      })
      .join("");

}


function closePages() {

  document
    .getElementById(
      "rankingPage"
    )
    .classList.remove(
      "show"
    );

  document
    .getElementById(
      "newcomerPage"
    )
    .classList.remove(
      "show"
    );

}


/* =====================================================
   ユーザー
===================================================== */

function openRankingUser(id) {

  const stream =
    liveData.find(function(item) {

      return item.broadcasterId === id;

    });

  if (stream) {

    joinLive(
      stream.broadcasterId,
      stream.name,
      stream.icon
    );

    return;
  }

  alert(
    "このライバーは現在配信していません。"
  );

}


function openNewcomerUser(id) {

  const stream =
    liveData.find(function(item) {

      return item.broadcasterId === id;

    });

  if (stream) {

    joinLive(
      stream.broadcasterId,
      stream.name,
      stream.icon
    );

    return;
  }

  alert(
    "このライバーは現在配信していません。"
  );

}


/* =====================================================
   配信一覧
===================================================== */

function updateLiveList(list) {

  liveData =
    Array.isArray(list)
      ? list
      : [];

  const section =
    document.getElementById(
      "liveSection"
    );

  const box =
    document.getElementById(
      "liveList"
    );

  if (
    liveData.length === 0
  ) {

    section.classList.remove(
      "show"
    );

    box.innerHTML = "";

    return;
  }

  section.classList.add(
    "show"
  );

  box.innerHTML =
    liveData
      .map(function(stream) {

        return (

          '<div class="live-card" ' +
          'onclick="joinLive(\'' +
          escapeHtml(stream.broadcasterId) +
          '\',\'' +
          escapeHtml(stream.name) +
          '\',\'' +
          escapeHtml(stream.icon) +
          '\')">' +

            '<div class="live-status">' +
              '<span class="live-status-dot"></span>' +
              'LIVE配信中' +
            '</div>' +

            '<div class="live-title">' +
              stream.icon +
              ' ' +
              escapeHtml(stream.name) +
            '</div>' +

            '<div class="live-viewers">' +
              '👁 ' +
              stream.viewers +
              '人が視聴中' +
            '</div>' +

          '</div>'

        );

      })
      .join("");

}


/* =====================================================
   配信開始画面
===================================================== */

function openBroadcast() {

  document
    .getElementById(
      "broadcastPanel"
    )
    .classList.add(
      "show"
    );

}


function closeBroadcast() {

  if (
    isBroadcasting
  ) {

    const ok =
      confirm(
        "配信を終了しますか？"
      );

    if (!ok) {
      return;
    }

    stopBroadcast();

  }

  document
    .getElementById(
      "broadcastPanel"
    )
    .classList.remove(
      "show"
    );

}


/* =====================================================
   配信開始
===================================================== */

async function startBroadcast() {

  if (
    isBroadcasting
  ) {
    return;
  }

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

    myStream =
      stream;

    isBroadcasting =
      true;

    document
      .getElementById(
        "startLiveButton"
      )
      .style.display =
      "none";

    document
      .getElementById(
        "stopLiveButton"
      )
      .style.display =
      "block";

    document
      .getElementById(
        "broadcastState"
      )
      .textContent =
      "🔴 LIVE配信中";

    send({
      type: "start_live",
      name: "月夜ぼた",
      icon: "🌙"
    });

  } catch (error) {

    console.error(
      error
    );

    alert(
      "マイクを使用できませんでした。\n\n" +
      "ブラウザのマイク許可を確認してください。"
    );

  }

}


/* =====================================================
   配信終了
===================================================== */

function stopBroadcast() {

  if (
    !isBroadcasting
  ) {
    return;
  }

  send({
    type: "stop_live"
  });

  broadcasterPeers.forEach(
    function(peer) {

      try {
        peer.close();
      } catch (e) {}

    }
  );

  broadcasterPeers.clear();

  if (myStream) {

    myStream
      .getTracks()
      .forEach(
        function(track) {

          track.stop();

        }
      );

  }

  myStream =
    null;

  isBroadcasting =
    false;

  document
    .getElementById(
      "startLiveButton"
    )
    .style.display =
    "block";

  document
    .getElementById(
      "stopLiveButton"
    )
    .style.display =
    "none";

  document
    .getElementById(
      "broadcastState"
    )
    .textContent =
    "配信準備完了";

}


/* =====================================================
   視聴開始
===================================================== */

function joinLive(
  broadcasterId,
  name,
  icon
) {

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {

    alert(
      "サーバーに接続中です。"
    );

    return;
  }

  if (
    broadcasterId ===
    myClientId
  ) {

    return;
  }

  currentLiveId =
    broadcasterId;

  document
    .getElementById(
      "playerName"
    )
    .textContent =
    icon +
    " " +
    name;

  document
    .getElementById(
      "playerIcon"
    )
    .textContent =
    icon;

  document
    .getElementById(
      "playerOverlay"
    )
    .classList.add(
      "show"
    );

  send({
    type: "join_live",
    broadcasterId
  });

}


/* =====================================================
   視聴終了
===================================================== */

function closePlayer() {

  send({
    type: "leave_live",
    broadcasterId:
      currentLiveId
  });

  if (
    currentViewerPeer
  ) {

    try {
      currentViewerPeer.close();
    } catch (e) {}

  }

  currentViewerPeer =
    null;

  currentLiveId =
    null;

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  audio.srcObject =
    null;

  document
    .getElementById(
      "playerOverlay"
    )
    .classList.remove(
      "show"
    );

}


/* =====================================================
   配信者側
===================================================== */

async function createOfferForViewer(
  viewerId
) {

  if (
    !myStream
  ) {
    return;
  }

  const pc =
    new RTCPeerConnection({
      iceServers: [
        {
          urls:
            "stun:stun.l.google.com:19302"
        },
        {
          urls:
            "stun:stun1.l.google.com:19302"
        }
      ]
    });

  broadcasterPeers.set(
    viewerId,
    pc
  );

  myStream
    .getTracks()
    .forEach(
      function(track) {

        pc.addTrack(
          track,
          myStream
        );

      }
    );

  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send({
          type: "ice",
          target: viewerId,
          candidate:
            event.candidate
        });

      }

    };

  pc.onconnectionstatechange =
    function() {

      if (
        [
          "failed",
          "closed",
          "disconnected"
        ].includes(
          pc.connectionState
        )
      ) {

        try {
          pc.close();
        } catch (e) {}

        broadcasterPeers.delete(
          viewerId
        );

      }

    };

  const offer =
    await pc.createOffer();

  await pc.setLocalDescription(
    offer
  );

  send({
    type: "offer",
    target: viewerId,
    offer:
      pc.localDescription
  });

}


/* =====================================================
   視聴者側
===================================================== */

async function handleOffer(
  data
) {

  if (
    data.target !==
    myClientId
  ) {
    return;
  }

  if (
    currentViewerPeer
  ) {

    try {
      currentViewerPeer.close();
    } catch (e) {}

  }

  const pc =
    new RTCPeerConnection({
      iceServers: [
        {
          urls:
            "stun:stun.l.google.com:19302"
        },
        {
          urls:
            "stun:stun1.l.google.com:19302"
        }
      ]
    });

  currentViewerPeer =
    pc;

  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send({
          type: "ice",
          target:
            data.from,
          candidate:
            event.candidate
        });

      }

    };

  pc.ontrack =
    function(event) {

      const audio =
        document.getElementById(
          "remoteAudio"
        );

      if (
        event.streams &&
        event.streams[0]
      ) {

        audio.srcObject =
          event.streams[0];

        audio.play()
          .catch(
            function(error) {

              console.log(
                "audio play",
                error
              );

            }
          );

      }

    };

  pc.onconnectionstatechange =
    function() {

      const state =
        pc.connectionState;

      if (
        state ===
        "connected"
      ) {

        document
          .querySelector(
            ".player-hint"
          )
          .textContent =
          "🔊 音声接続済み";

      }

      if (
        state ===
        "failed"
      ) {

        document
          .querySelector(
            ".player-hint"
          )
          .textContent =
          "音声接続に失敗しました";

      }

    };

  await pc.setRemoteDescription(
    new RTCSessionDescription(
      data.offer
    )
  );

  const answer =
    await pc.createAnswer();

  await pc.setLocalDescription(
    answer
  );

  send({
    type: "answer",
    target:
      data.from,
    answer:
      pc.localDescription
  });

}


/* =====================================================
   Answer
===================================================== */

async function handleAnswer(
  data
) {

  if (
    data.target !==
    myClientId
  ) {
    return;
  }

  const pc =
    broadcasterPeers.get(
      data.from
    );

  if (!pc) {
    return;
  }

  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.answer
      )
    );

  } catch (error) {

    console.log(
      "answer error",
      error
    );

  }

}


/* =====================================================
   ICE
===================================================== */

async function handleIce(
  data
) {

  if (
    data.target !==
    myClientId
  ) {
    return;
  }

  try {

    if (
      isBroadcasting
    ) {

      const pc =
        broadcasterPeers.get(
          data.from
        );

      if (
        pc &&
        data.candidate
      ) {

        await pc.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );

      }

      return;
    }

    if (
      currentViewerPeer &&
      data.candidate
    ) {

      await currentViewerPeer.addIceCandidate(
        new RTCIceCandidate(
          data.candidate
        )
      );

    }

  } catch (error) {

    console.log(
      "ICE error",
      error
    );

  }

}


/* =====================================================
   NAV
===================================================== */

function goHome() {

  closePages();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function searchLive() {

  const section =
    document.getElementById(
      "liveSection"
    );

  if (
    liveData.length
  ) {

    section.scrollIntoView({
      behavior: "smooth"
    });

  } else {

    alert(
      "現在配信中のライバーはいません。"
    );

  }

}


function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}


function showProfile() {

  alert(
    "マイページは準備中です。"
  );

}


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =====================================================
   初期データ
===================================================== */

const rankingData =
  ${JSON.stringify(
    ranking.map(function(user, index) {
      return {
        id: user.id,
        name: user.name,
        score: user.score,
        viewers: user.viewers,
        icon: user.icon,
        rank: index + 1
      };
    })
  )};

const newcomerData =
  ${JSON.stringify(newcomers)};


/* =====================================================
   START
===================================================== */

renderRanking(
  rankingData
);

renderNewcomers(
  newcomerData
);

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
    function(req, res) {

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

        res.end(
          HTML
        );

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
   WEBSOCKET SERVER
===================================================== */

const wss =
  new WebSocket.Server({
    server
  });


/* =====================================================
   Client ID
===================================================== */

function makeClientId() {

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


/* =====================================================
   LIVE LIST
===================================================== */

function getLiveList() {

  return Array.from(
    liveStreams.values()
  ).map(
    function(stream) {

      return {
        broadcasterId:
          stream.broadcasterId,

        name:
          stream.name,

        icon:
          stream.icon,

        viewers:
          stream.viewers.size
      };

    }
  );

}


/* =====================================================
   全員にLIVE一覧送信
===================================================== */

function broadcastLiveList() {

  const message =
    JSON.stringify({
      type: "live_list",
      liveStreams:
        getLiveList()
    });

  clients.forEach(
    function(client) {

      if (
        client.ws.readyState ===
        WebSocket.OPEN
      ) {

        client.ws.send(
          message
        );

      }

    }
  );

}


/* =====================================================
   WEBSOCKET CONNECTION
===================================================== */

wss.on(
  "connection",
  function(ws) {

    const clientId =
      makeClientId();

    clients.set(
      clientId,
      {
        ws
      }
    );


    console.log(
      "WebSocket connected:",
      clientId
    );


    ws.send(
      JSON.stringify({
        type: "welcome",
        clientId,
        liveStreams:
          getLiveList()
      })
    );


    /* =================================================
       MESSAGE
    ================================================= */

    ws.on(
      "message",
      function(raw) {

        let data;

        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch (error) {

          return;

        }


        /* =============================================
           配信開始
        ============================================= */

        if (
          data.type ===
          "start_live"
        ) {

          if (
            liveStreams.has(
              clientId
            )
          ) {

            return;

          }

          liveStreams.set(
            clientId,
            {
              broadcasterId:
                clientId,

              name:
                data.name ||
                "月夜ぼた",

              icon:
                data.icon ||
                "🌙",

              viewers:
                new Set()
            }
          );


          console.log(
            "LIVE START:",
            clientId
          );


          broadcastLiveList();

          return;
        }


        /* =============================================
           配信終了
        ============================================= */

        if (
          data.type ===
          "stop_live"
        ) {

          stopLive(
            clientId
          );

          return;
        }


        /* =============================================
           視聴者入室
        ============================================= */

        if (
          data.type ===
          "join_live"
        ) {

          const live =
            liveStreams.get(
              data.broadcasterId
            );

          if (!live) {

            ws.send(
              JSON.stringify({
                type:
                  "live_stopped",
                liveId:
                  data.broadcasterId,
                liveStreams:
                  getLiveList()
              })
            );

            return;

          }


          live.viewers.add(
            clientId
          );


          const broadcaster =
            clients.get(
              data.broadcasterId
            );


          if (
            broadcaster &&
            broadcaster.ws.readyState ===
              WebSocket.OPEN
          ) {

            broadcaster.ws.send(
              JSON.stringify({
                type:
                  "viewer_joined",

                viewerId:
                  clientId
              })
            );

          }


          broadcastLiveList();

          return;
        }


        /* =============================================
           視聴終了
        ============================================= */

        if (
          data.type ===
          "leave_live"
        ) {

          const live =
            liveStreams.get(
              data.broadcasterId
            );

          if (live) {

            live.viewers.delete(
              clientId
            );

          }

          broadcastLiveList();

          return;
        }


        /* =============================================
           WebRTC offer
        ============================================= */

        if (
          data.type ===
          "offer"
        ) {

          relayWebRTC(
            clientId,
            data.target,
            {
              type:
                "offer",

              from:
                clientId,

              target:
                data.target,

              offer:
                data.offer
            }
          );

          return;
        }


        /* =============================================
           WebRTC answer
        ============================================= */

        if (
          data.type ===
          "answer"
        ) {

          relayWebRTC(
            clientId,
            data.target,
            {
              type:
                "answer",

              from:
                clientId,

              target:
                data.target,

              answer:
                data.answer
            }
          );

          return;
        }


        /* =============================================
           ICE
        ============================================= */

        if (
          data.type ===
          "ice"
        ) {

          relayWebRTC(
            clientId,
            data.target,
            {
              type:
                "ice",

              from:
                clientId,

              target:
                data.target,

              candidate:
                data.candidate
            }
          );

          return;
        }

      }
    );


    /* =================================================
       CLOSE
    ================================================= */

    ws.on(
      "close",
      function() {

        console.log(
          "WebSocket disconnected:",
          clientId
        );


        stopLive(
          clientId
        );


        clients.delete(
          clientId
        );


        liveStreams.forEach(
          function(live) {

            live.viewers.delete(
              clientId
            );

          }
        );


        broadcastLiveList();

      }
    );


    ws.on(
      "error",
      function(error) {

        console.log(
          "WebSocket error:",
          error.message
        );

      }
    );

  }
);


/* =====================================================
   WebRTC RELAY
===================================================== */

function relayWebRTC(
  from,
  target,
  message
) {

  const targetClient =
    clients.get(
      target
    );

  if (
    !targetClient
  ) {
    return;
  }

  if (
    targetClient.ws.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  targetClient.ws.send(
    JSON.stringify(
      message
    )
  );

}


/* =====================================================
   STOP LIVE
===================================================== */

function stopLive(
  broadcasterId
) {

  const live =
    liveStreams.get(
      broadcasterId
    );

  if (!live) {
    return;
  }


  live.viewers.forEach(
    function(viewerId) {

      const viewer =
        clients.get(
          viewerId
        );

      if (
        viewer &&
        viewer.ws.readyState ===
          WebSocket.OPEN
      ) {

        viewer.ws.send(
          JSON.stringify({
            type:
              "live_stopped",

            liveId:
              broadcasterId,

            liveStreams:
              getLiveList()
          })
        );

      }

    }
  );


  liveStreams.delete(
    broadcasterId
  );


  console.log(
    "LIVE STOP:",
    broadcasterId
  );


  broadcastLiveList();

}


/* =====================================================
   START SERVER
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "===================================="
    );

    console.log(
      "VoiceポタLive server started"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "HOST:",
      HOST
    );

    console.log(
      "WebRTC: ENABLED"
    );

    console.log(
      "WebSocket: ENABLED"
    );

    console.log(
      "===================================="
    );

  }
);
