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
   データ
===================================================== */

const rankingUsers = [
  "月夜ぼた","星空レン","夜桜ミク","蒼空レイ","月乃あかり",
  "白雪ユナ","黒猫ルナ","天音ソラ","星野ナギ","桜音ミオ",
  "夜空カナ","水瀬リオ","月島ハル","青葉ナナ","神楽ユイ",
  "雪村レナ","花音メイ","星川アオ","春風ミナ","雨宮シオン",
  "月城アイ","白石ユウ","天宮コト","星宮リナ","夜凪マオ",
  "桜庭ユキ","水野ソラ","月影ナナ","青空ミオ","花咲レイ",
  "星乃ユメ","白月カナ","夜風リオ","春野アカリ","天音ミナ",
  "雪空ユイ","月森レン","桜井ソラ","星空ミオ","花月ナギ",
  "夜空ユナ","水城レイ","白雪ミオ","月野カナ","星川ユキ",
  "春風ソラ","天宮ナナ","夜桜レナ","花音ユイ","月光アオ"
];

const ranking = rankingUsers.map((name, i) => ({
  id: "rank-" + (i + 1),
  name,
  rank: i + 1,
  score: 50000 - i * 731,
  viewers: Math.max(1, 1200 - i * 19),
  icon: ["🌙","⭐","🌸","🎙️","✨"][i % 5]
}));

const newcomers = [
  {
    id: "new-1",
    name: "新人ぼた",
    title: "はじめまして🌙",
    icon: "🌙",
    score: 9800
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    score: 8700
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    score: 8200
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    score: 7600
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    score: 6900
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    score: 6200
  },
  {
    id: "new-7",
    name: "月空",
    title: "ゆっくり話します",
    icon: "🌙",
    score: 5800
  },
  {
    id: "new-8",
    name: "星乃",
    title: "新人配信",
    icon: "⭐",
    score: 5400
  }
];


/* =====================================================
   配信管理
===================================================== */

const streams = new Map();

let nextStreamId = 1;


/* =====================================================
   WebSocket
===================================================== */

const clients = new Set();

function send(ws, data) {
  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data) {
  const message = JSON.stringify(data);

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}


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

.app {
  min-height: 100vh;
  padding-bottom: 88px;
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

  background: rgba(3,5,16,.80);
  backdrop-filter: blur(18px);

  border-bottom:
    1px solid rgba(120,140,255,.10);
}

.logo {
  font-size: 18px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #fff,
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
      rgba(3,5,16,.20) 60%,
      #030510 100%
    ),
    url("/home.png");

  background-size: contain;
  background-repeat: no-repeat;
  background-position: center top;

  background-color: #030510;

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
      0deg,
      #030510 0%,
      rgba(3,5,16,.03) 42%,
      rgba(3,5,16,0) 72%
    );
}

.hero-content {
  position: relative;
  z-index: 5;

  width: 100%;

  padding:
    40px
    20px
    30px;
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
    clamp(28px,8vw,48px);

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
      #fff,
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

  text-shadow:
    0 2px 12px #000;
}


/* =====================================================
   SECTION
===================================================== */

.section {
  padding:
    26px 14px 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 13px;
}

.section-title {
  font-size: 20px;
  font-weight: 900;
}

.section-sub {
  font-size: 10px;
  color: #697596;
  letter-spacing: 1px;
}


/* =====================================================
   横スクロール
===================================================== */

.horizontal-list {
  display: flex;

  gap: 10px;

  overflow-x: auto;

  padding:
    2px 1px 12px;

  scrollbar-width: none;

  scroll-snap-type: x mandatory;
}

.horizontal-list::-webkit-scrollbar {
  display: none;
}


/* =====================================================
   RANK CARD
===================================================== */

.rank-card {
  flex: 0 0 155px;

  min-height: 175px;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid rgba(120,140,255,.13);

  scroll-snap-align: start;

  cursor: pointer;
}

.rank-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rank-number {
  font-size: 18px;
  font-weight: 900;
  color: #8793b8;
}

.rank-number.gold {
  color: #ffd86b;

  text-shadow:
    0 0 10px rgba(255,210,80,.5);
}

.rank-avatar {
  width: 58px;
  height: 58px;

  margin-top: 10px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 27px;

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
  margin-top: 10px;

  font-size: 13px;
  font-weight: 900;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-score {
  margin-top: 5px;

  font-size: 10px;

  color: #8f9abb;
}

.rank-viewers {
  margin-top: 5px;

  font-size: 10px;

  color: #697595;
}


/* =====================================================
   NEW CARD
===================================================== */

.new-card {
  flex: 0 0 155px;

  min-height: 180px;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid rgba(120,140,255,.13);

  scroll-snap-align: start;

  cursor: pointer;
}

.new-avatar {
  width: 60px;
  height: 60px;

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

  box-shadow:
    0 0 20px rgba(80,130,255,.28);
}

.new-name {
  margin-top: 10px;

  font-size: 13px;
  font-weight: 900;
}

.new-title {
  margin-top: 6px;

  font-size: 10px;

  color: #8f9abb;

  line-height: 1.5;
}

.live-badge {
  display: inline-block;

  margin-top: 9px;

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


/* =====================================================
   MORE
===================================================== */

.more-button {
  width: 100%;

  height: 45px;

  margin-top: 8px;

  border-radius: 14px;

  border:
    1px solid rgba(120,140,255,.16);

  background:
    rgba(15,20,55,.78);

  color: #b5c2e6;

  font-size: 12px;
  font-weight: 900;
}


/* =====================================================
   LIVE SCREEN
===================================================== */

.screen {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 500;

  background: #030510;
}

.screen.active {
  display: block;
}

.live-screen {
  position: absolute;

  inset: 0;

  overflow: hidden;

  background:
    radial-gradient(
      circle at 50% 20%,
      #17245d,
      #030510 65%
    );
}

.live-bg {
  position: absolute;

  inset: 0;

  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  opacity: .75;
}

.live-overlay {
  position: absolute;

  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.40),
      transparent 30%,
      rgba(0,0,0,.78) 100%
    );
}

.live-top {
  position: absolute;

  top: 0;
  left: 0;
  right: 0;

  padding:
    16px;

  display: flex;
  justify-content: space-between;

  z-index: 10;
}

.close-live {
  width: 42px;
  height: 42px;

  border: 0;

  border-radius: 50%;

  background:
    rgba(0,0,0,.55);

  color: white;

  font-size: 20px;
}

.live-info-box {
  position: absolute;

  left: 18px;
  right: 18px;
  bottom: 105px;

  z-index: 10;
}

.live-name-big {
  font-size: 22px;
  font-weight: 900;
}

.live-title-big {
  margin-top: 5px;

  color: #d2d8ee;

  font-size: 13px;
}

.live-actions {
  position: absolute;

  right: 15px;
  bottom: 125px;

  z-index: 20;

  display: flex;
  flex-direction: column;

  gap: 12px;
}

.action-button {
  width: 54px;
  height: 54px;

  border: 0;

  border-radius: 50%;

  background:
    rgba(10,15,40,.80);

  color: white;

  font-size: 23px;

  box-shadow:
    0 5px 20px rgba(0,0,0,.3);
}

.gift-panel {
  position: absolute;

  left: 15px;
  right: 15px;
  bottom: 20px;

  z-index: 30;

  display: flex;
  gap: 8px;

  overflow-x: auto;
}

.gift-button {
  flex: 0 0 auto;

  border: 0;

  padding: 10px 13px;

  border-radius: 999px;

  background:
    rgba(20,25,65,.90);

  color: white;

  font-size: 12px;
}

.block-button {
  margin-top: 8px;

  border: 0;

  background: transparent;

  color: #ff819c;

  font-size: 11px;
}


/* =====================================================
   BROADCAST SCREEN
===================================================== */

.broadcast-controls {
  position: absolute;

  left: 15px;
  right: 15px;
  bottom: 20px;

  z-index: 20;
}

.broadcast-row {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 9px;
}

.control-button {
  height: 50px;

  border: 0;

  border-radius: 16px;

  color: white;

  font-weight: 900;

  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff,
      #c24cff
    );
}

.control-button.dark {
  background:
    rgba(15,20,55,.90);

  border:
    1px solid rgba(130,150,255,.35);
}

.custom-file {
  margin-top: 10px;

  display: block;

  text-align: center;

  padding: 13px;

  border-radius: 14px;

  background:
    rgba(10,15,40,.85);

  color: #c4cdef;

  font-size: 12px;
}

.custom-file input {
  display: none;
}


/* =====================================================
   AUDIO
===================================================== */

audio {
  display: none;
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
    repeat(5, 1fr);

  padding:
    7px 7px
    calc(
      7px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.95);

  backdrop-filter: blur(20px);

  border-top:
    1px solid rgba(120,140,255,.12);
}

.nav-item {
  border: 0;

  background: transparent;

  color: #697496;

  font-size: 10px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;
}

.nav-icon {
  font-size: 20px;
}

.nav-live {
  width: 50px;
  height: 50px;

  margin-top: -22px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    linear-gradient(
      145deg,
      #39d9ff,
      #5467ff,
      #be4cff
    );

  border:
    3px solid #080b20;

  box-shadow:
    0 0 28px rgba(80,110,255,.7);

  font-size: 23px;
}


/* =====================================================
   LIST PAGE
===================================================== */

.page {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 400;

  overflow-y: auto;

  padding:
    75px
    15px
    95px;

  background: #030510;
}

.page.active {
  display: block;
}

.page-header {
  display: flex;

  align-items: center;

  gap: 12px;

  margin-bottom: 20px;
}

.page-back {
  width: 42px;
  height: 42px;

  border: 0;

  border-radius: 50%;

  background:
    rgba(20,25,65,.8);

  color: white;

  font-size: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 900;
}

.full-list {
  display: flex;

  flex-direction: column;

  gap: 9px;
}

.full-card {
  min-height: 70px;

  display: flex;

  align-items: center;

  padding: 10px 13px;

  border-radius: 17px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.92),
      rgba(8,12,32,.96)
    );

  border:
    1px solid rgba(120,140,255,.11);
}

.full-number {
  width: 38px;

  text-align: center;

  font-weight: 900;

  color: #8995ba;
}

.full-avatar {
  width: 46px;
  height: 46px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

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

  padding-left: 10px;
}

.full-name {
  font-size: 13px;
  font-weight: 900;
}

.full-score {
  margin-top: 4px;

  color: #8f9abb;

  font-size: 10px;
}


/* =====================================================
   MOBILE
===================================================== */

@media(max-width:500px) {

  .hero {
    min-height: 590px;

    background-size: auto 590px;
  }

  .hero-content {
    padding:
      30px 18px 25px;
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


<!-- =================================================
     HOME
================================================= -->

<main id="homePage">

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


<!-- RANKING -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 人気トップ50
    </div>

    <div class="section-sub">
      TOP 50
    </div>

  </div>

  <div
    class="horizontal-list"
    id="rankingHome"
  ></div>

  <button
    class="more-button"
    onclick="showRankingPage()"
  >
    人気トップ50をもっと見る
  </button>

</section>


<!-- NEWCOMER -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <div class="section-sub">
      NEW
    </div>

  </div>

  <div
    class="horizontal-list"
    id="newcomerHome"
  ></div>

  <button
    class="more-button"
    onclick="showNewcomerPage()"
  >
    新人ライバーをもっと見る
  </button>

</section>

</main>


<!-- =================================================
     RANKING PAGE
================================================= -->

<section
  class="page"
  id="rankingPage"
>

  <div class="page-header">

    <button
      class="page-back"
      onclick="closePages()"
    >
      ‹
    </button>

    <div class="page-title">
      🏆 人気トップ50
    </div>

  </div>

  <div
    class="full-list"
    id="rankingFull"
  ></div>

</section>


<!-- =================================================
     NEWCOMER PAGE
================================================= -->

<section
  class="page"
  id="newcomerPage"
>

  <div class="page-header">

    <button
      class="page-back"
      onclick="closePages()"
    >
      ‹
    </button>

    <div class="page-title">
      🌱 新人ライバー
    </div>

  </div>

  <div
    class="full-list"
    id="newcomerFull"
  ></div>

</section>


<!-- =================================================
     BOTTOM NAV
================================================= -->

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

  <button
    class="nav-item"
    onclick="startBroadcast()"
  >
    <div class="nav-live">
      🎙️
    </div>
    配信
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


<!-- =================================================
     VIEW SCREEN
================================================= -->

<div
  class="screen"
  id="viewScreen"
>

  <div class="live-screen">

    <div
      class="live-bg"
      id="viewerBg"
    ></div>

    <div class="live-overlay"></div>

    <div class="live-top">

      <button
        class="close-live"
        onclick="closeViewer()"
      >
        ×
      </button>

    </div>

    <div class="live-info-box">

      <div
        class="live-name-big"
        id="viewerName"
      >
        Voice配信
      </div>

      <div
        class="live-title-big"
        id="viewerTitle"
      >
        音声ライブ配信中
      </div>

      <button
        class="block-button"
        onclick="blockStreamer()"
      >
        🚫 この配信者をブロック
      </button>

    </div>

    <div class="live-actions">

      <button
        class="action-button"
        onclick="sendLike()"
      >
        ❤️
      </button>

      <button
        class="action-button"
        onclick="openGiftPanel()"
      >
        🎁
      </button>

    </div>

    <div
      class="gift-panel"
      id="giftPanel"
      style="display:none"
    >

      <button
        class="gift-button"
        onclick="sendGift('🌸')"
      >
        🌸 花
      </button>

      <button
        class="gift-button"
        onclick="sendGift('⭐')"
      >
        ⭐ 星
      </button>

      <button
        class="gift-button"
        onclick="sendGift('🌙')"
      >
        🌙 月
      </button>

      <button
        class="gift-button"
        onclick="sendGift('💎')"
      >
        💎 ダイヤ
      </button>

    </div>

    <audio
      id="remoteAudio"
      autoplay
      playsinline
    ></audio>

  </div>

</div>


<!-- =================================================
     BROADCAST SCREEN
================================================= -->

<div
  class="screen"
  id="broadcastScreen"
>

  <div class="live-screen">

    <div
      class="live-bg"
      id="broadcastBg"
    ></div>

    <div class="live-overlay"></div>

    <div class="live-top">

      <button
        class="close-live"
        onclick="closeBroadcast()"
      >
        ×
      </button>

    </div>

    <div
      class="live-info-box"
    >

      <div
        class="live-name-big"
        id="broadcastName"
      >
        Voice配信
      </div>

      <div
        class="live-title-big"
        id="broadcastTitle"
      >
        音声ライブ配信
      </div>

    </div>

    <div class="broadcast-controls">

      <div class="broadcast-row">

        <button
          class="control-button"
          id="startMicButton"
          onclick="startMicrophone()"
        >
          🎙️ 配信開始
        </button>

        <button
          class="control-button dark"
          onclick="editBroadcast()"
        >
          ✏️ タイトル
        </button>

      </div>

      <label class="custom-file">

        🖼️ 配信画像を変更

        <input
          type="file"
          accept="image/*"
          onchange="changeBroadcastImage(event)"
        >

      </label>

    </div>

  </div>

</div>

</div>


<script>

/* =====================================================
   STATE
===================================================== */

let socket = null;

let localStream = null;

let peerConnections = {};

let currentViewerStreamId = null;

let currentBroadcast = null;

let blockedUsers = new Set();


/* =====================================================
   SOCKET
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

  socket.onopen = () => {

    console.log(
      "WebSocket connected"
    );

    socket.send(
      JSON.stringify({
        type: "home_request"
      })
    );

  };

  socket.onmessage = event => {

    let data;

    try {
      data =
        JSON.parse(
          event.data
        );
    } catch {
      return;
    }

    handleSocketMessage(data);

  };

  socket.onclose = () => {

    setTimeout(
      connectSocket,
      2000
    );

  };

}


/* =====================================================
   SOCKET MESSAGE
===================================================== */

function handleSocketMessage(data) {

  if (data.type === "home_data") {

    renderRanking(
      data.ranking || []
    );

    renderNewcomers(
      data.newcomers || []
    );

    return;
  }


  if (data.type === "stream_list") {

    return;
  }


  if (data.type === "viewer_joined") {

    if (
      currentBroadcast &&
      data.streamId ===
      currentBroadcast.streamId
    ) {

      createOfferForViewer(
        data.viewerId
      );

    }

    return;
  }


  if (data.type === "offer") {

    handleOffer(data);

    return;
  }


  if (data.type === "answer") {

    handleAnswer(data);

    return;
  }


  if (data.type === "ice") {

    handleIce(data);

    return;
  }


  if (data.type === "broadcast_event") {

    console.log(
      data.event
    );

    return;
  }

}


/* =====================================================
   HOME
===================================================== */

function renderRanking(list) {

  const home =
    document.getElementById(
      "rankingHome"
    );

  home.innerHTML =
    list
      .slice(0,10)
      .map(user => `

        <div
          class="rank-card"
          onclick="openRankingUser('${user.id}')"
        >

          <div class="rank-top">

            <div
              class="
                rank-number
                ${
                  user.rank <= 3
                    ? "gold"
                    : ""
                }
              "
            >
              ${user.rank}
            </div>

          </div>

          <div class="rank-avatar">
            ${user.icon}
          </div>

          <div class="rank-name">
            ${escapeHtml(user.name)}
          </div>

          <div class="rank-score">
            応援
            ${Number(
              user.score
            ).toLocaleString()}
          </div>

          <div class="rank-viewers">
            👁
            ${Number(
              user.viewers
            ).toLocaleString()}
          </div>

        </div>

      `)
      .join("");


  const full =
    document.getElementById(
      "rankingFull"
    );

  full.innerHTML =
    list
      .map(user => `

        <div
          class="full-card"
          onclick="openRankingUser('${user.id}')"
        >

          <div class="full-number">
            ${user.rank}
          </div>

          <div class="full-avatar">
            ${user.icon}
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
             　
              👁
              ${Number(
                user.viewers
              ).toLocaleString()}
            </div>

          </div>

        </div>

      `)
      .join("");

}


function renderNewcomers(list) {

  const home =
    document.getElementById(
      "newcomerHome"
    );

  home.innerHTML =
    list
      .slice(0,10)
      .map(user => `

        <div
          class="new-card"
          onclick="openNewUser('${user.id}')"
        >

          <div class="new-avatar">
            ${user.icon}
          </div>

          <div class="new-name">
            ${escapeHtml(user.name)}
          </div>

          <div class="new-title">
            ${escapeHtml(user.title)}
          </div>

          <span class="live-badge">
            NEW
          </span>

        </div>

      `)
      .join("");


  const full =
    document.getElementById(
      "newcomerFull"
    );

  full.innerHTML =
    list
      .map((user,index) => `

        <div
          class="full-card"
          onclick="openNewUser('${user.id}')"
        >

          <div class="full-number">
            ${index + 1}
          </div>

          <div class="full-avatar">
            ${user.icon}
          </div>

          <div class="full-info">

            <div class="full-name">
              ${escapeHtml(user.name)}
            </div>

            <div class="full-score">
              ${escapeHtml(user.title)}
            </div>

          </div>

        </div>

      `)
      .join("");

}


/* =====================================================
   PAGES
===================================================== */

function showRankingPage() {

  document
    .getElementById(
      "rankingPage"
    )
    .classList.add("active");

}

function showNewcomerPage() {

  document
    .getElementById(
      "newcomerPage"
    )
    .classList.add("active");

}

function closePages() {

  document
    .querySelectorAll(".page")
    .forEach(
      page =>
        page.classList.remove(
          "active"
        )
    );

}


/* =====================================================
   OPEN USER
===================================================== */

function openRankingUser(id) {

  const user =
    window.__ranking
      ?.find(
        x => x.id === id
      );

  if (user) {

    alert(
      user.name +
      "\\n\\nランキング " +
      user.rank +
      "位"
    );

  }

}

function openNewUser(id) {

  const user =
    window.__newcomers
      ?.find(
        x => x.id === id
      );

  if (user) {

    alert(
      user.name +
      "\\n\\n" +
      user.title
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

  alert(
    "配信検索機能を準備中です。"
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
   BROADCAST
===================================================== */

function startBroadcast() {

  const name =
    prompt(
      "配信者名を入力してください",
      "ぼた"
    );

  if (!name) return;

  const title =
    prompt(
      "配信タイトルを入力してください",
      "のんびりお話しします🌙"
    );

  if (!title) return;

  currentBroadcast = {
    name,
    title,
    streamId:
      "stream-" +
      Date.now()
  };

  document
    .getElementById(
      "broadcastName"
    )
    .textContent =
      name;

  document
    .getElementById(
      "broadcastTitle"
    )
    .textContent =
      title;

  document
    .getElementById(
      "broadcastScreen"
    )
    .classList.add("active");

  socket.send(
    JSON.stringify({
      type: "start_stream",
      streamId:
        currentBroadcast.streamId,
      name,
      title
    })
  );

}


async function startMicrophone() {

  if (localStream) {

    stopBroadcast();

    return;
  }

  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });


    document
      .getElementById(
        "startMicButton"
      )
      .textContent =
        "🔴 配信終了";


    socket.send(
      JSON.stringify({
        type: "mic_ready",
        streamId:
          currentBroadcast.streamId
      })
    );

    alert(
      "マイクを開始しました。\\n配信中です。"
    );

  } catch (error) {

    console.error(error);

    alert(
      "マイクを使用できませんでした。\\nブラウザのマイク許可を確認してください。"
    );

  }

}


function stopBroadcast() {

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    localStream = null;
  }


  for (
    const id in peerConnections
  ) {

    try {
      peerConnections[id].close();
    } catch {}

  }

  peerConnections = {};


  if (socket &&
      currentBroadcast) {

    socket.send(
      JSON.stringify({
        type: "stop_stream",
        streamId:
          currentBroadcast.streamId
      })
    );

  }


  document
    .getElementById(
      "startMicButton"
    )
    .textContent =
      "🎙️ 配信開始";

}


function closeBroadcast() {

  stopBroadcast();

  currentBroadcast = null;

  document
    .getElementById(
      "broadcastScreen"
    )
    .classList.remove(
      "active"
    );

}


/* =====================================================
   BROADCAST CUSTOM
===================================================== */

function editBroadcast() {

  if (!currentBroadcast) return;

  const title =
    prompt(
      "配信タイトル",
      currentBroadcast.title
    );

  if (!title) return;

  currentBroadcast.title =
    title;

  document
    .getElementById(
      "broadcastTitle"
    )
    .textContent =
      title;

  socket.send(
    JSON.stringify({
      type: "update_stream",
      streamId:
        currentBroadcast.streamId,
      title
    })
  );

}


function changeBroadcastImage(event) {

  const file =
    event.target.files[0];

  if (!file) return;

  if (
    file.size >
    1024 * 1024 * 2
  ) {

    alert(
      "画像は2MB以下にしてください。"
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {

    const image =
      reader.result;

    document
      .getElementById(
        "broadcastBg"
      )
      .style.backgroundImage =
        "url('" +
        image +
        "')";

    if (
      currentBroadcast &&
      socket
    ) {

      socket.send(
        JSON.stringify({
          type: "broadcast_image",
          streamId:
            currentBroadcast.streamId,
          image
        })
      );

    }

  };

  reader.readAsDataURL(file);

}


/* =====================================================
   VIEWER
===================================================== */

function openViewer(stream) {

  if (
    blockedUsers.has(
      stream.name
    )
  ) {

    alert(
      "この配信者はブロックしています。"
    );

    return;
  }


  currentViewerStreamId =
    stream.streamId;

  document
    .getElementById(
      "viewerName"
    )
    .textContent =
      stream.name;

  document
    .getElementById(
      "viewerTitle"
    )
    .textContent =
      stream.title;


  document
    .getElementById(
      "viewScreen"
    )
    .classList.add(
      "active"
    );


  socket.send(
    JSON.stringify({
      type: "join_stream",
      streamId:
        stream.streamId
    })
  );

}


function closeViewer() {

  if (socket) {

    socket.send(
      JSON.stringify({
        type: "leave_stream",
        streamId:
          currentViewerStreamId
      })
    );

  }

  currentViewerStreamId =
    null;

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  audio.srcObject = null;

  document
    .getElementById(
      "viewScreen"
    )
    .classList.remove(
      "active"
    );

}


/* =====================================================
   WEBRTC
===================================================== */

async function createOfferForViewer(
  viewerId
) {

  if (!localStream) return;

  const pc =
    new RTCPeerConnection({
      iceServers: [
        {
          urls:
            "stun:stun.l.google.com:19302"
        }
      ]
    });

  peerConnections[
    viewerId
  ] = pc;


  localStream
    .getTracks()
    .forEach(
      track =>
        pc.addTrack(
          track,
          localStream
        )
    );


  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        socket.send(
          JSON.stringify({
            type: "ice",
            target: viewerId,
            candidate:
              event.candidate
          })
        );

      }

    };


  const offer =
    await pc.createOffer();

  await pc.setLocalDescription(
    offer
  );


  socket.send(
    JSON.stringify({
      type: "offer",
      target: viewerId,
      streamId:
        currentBroadcast.streamId,
      offer:
        pc.localDescription
    })
  );

}


async function handleOffer(
  data
) {

  const pc =
    new RTCPeerConnection({
      iceServers: [
        {
          urls:
            "stun:stun.l.google.com:19302"
        }
      ]
    });


  peerConnections[
    data.sender
  ] = pc;


  pc.ontrack =
    event => {

      const audio =
        document.getElementById(
          "remoteAudio"
        );

      audio.srcObject =
        event.streams[0];

      audio.play()
        .catch(
          () => {}
        );

    };


  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        socket.send(
          JSON.stringify({
            type: "ice",
            target:
              data.sender,
            candidate:
              event.candidate
          })
        );

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


  socket.send(
    JSON.stringify({
      type: "answer",
      target:
        data.sender,
      answer:
        pc.localDescription
    })
  );

}


async function handleAnswer(
  data
) {

  const pc =
    peerConnections[
      data.sender
    ];

  if (!pc) return;

  await pc.setRemoteDescription(
    new RTCSessionDescription(
      data.answer
    )
  );

}


async function handleIce(
  data
) {

  const pc =
    peerConnections[
      data.sender
    ];

  if (!pc) return;

  try {

    await pc.addIceCandidate(
      data.candidate
    );

  } catch (error) {

    console.log(
      "ICE error",
      error
    );

  }

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  if (!currentViewerStreamId)
    return;

  socket.send(
    JSON.stringify({
      type: "like",
      streamId:
        currentViewerStreamId
    })
  );

  alert("❤️ いいねしました");

}


/* =====================================================
   GIFT
===================================================== */

function openGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );

  panel.style.display =
    panel.style.display ===
    "none"
      ? "flex"
      : "none";

}


function sendGift(gift) {

  if (!currentViewerStreamId)
    return;

  socket.send(
    JSON.stringify({
      type: "gift",
      streamId:
        currentViewerStreamId,
      gift
    })
  );

  alert(
    gift +
    " ギフトを送りました！"
  );

}


/* =====================================================
   BLOCK
===================================================== */

function blockStreamer() {

  const name =
    document
      .getElementById(
        "viewerName"
      )
      .textContent;

  blockedUsers.add(
    name
  );

  alert(
    name +
    " をブロックしました。"
  );

  closeViewer();

}


/* =====================================================
   OTHER
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
   SAVE DATA
===================================================== */

const oldRenderRanking =
  renderRanking;

function renderRanking(list) {

  window.__ranking =
    list;

  oldRenderRanking(list);

}

const oldRenderNewcomers =
  renderNewcomers;

function renderNewcomers(list) {

  window.__newcomers =
    list;

  oldRenderNewcomers(list);

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
   HTTP
===================================================== */

const server =
  http.createServer(
    (req, res) => {

      const url =
        req.url.split("?")[0];


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
                "public,max-age=3600"
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
              "text/plain;charset=utf-8"
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
            "text/plain;charset=utf-8"
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


wss.on(
  "connection",
  ws => {

    ws.clientId =
      Math.random()
        .toString(36)
        .slice(2);

    ws.role = "none";

    clients.add(ws);


    send(
      ws,
      {
        type: "home_data",
        ranking,
        newcomers
      }
    );


    ws.on(
      "message",
      raw => {

        let data;

        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch {

          return;

        }


        /* HOME */

        if (
          data.type ===
          "home_request"
        ) {

          send(
            ws,
            {
              type:
                "home_data",
              ranking,
              newcomers
            }
          );

          return;
        }


        /* START STREAM */

        if (
          data.type ===
          "start_stream"
        ) {

          ws.role =
            "broadcaster";

          ws.streamId =
            data.streamId;

          streams.set(
            data.streamId,
            {
              streamId:
                data.streamId,

              broadcaster:
                ws,

              name:
                data.name,

              title:
                data.title,

              viewers:
                new Set(),

              likes: 0,

              gifts: []
            }
          );

          broadcast({
            type:
              "stream_list"
          });

          return;
        }


        /* UPDATE STREAM */

        if (
          data.type ===
          "update_stream"
        ) {

          const stream =
            streams.get(
              data.streamId
            );

          if (!stream)
            return;

          stream.title =
            data.title;

          return;
        }


        /* IMAGE */

        if (
          data.type ===
          "broadcast_image"
        ) {

          const stream =
            streams.get(
              data.streamId
            );

          if (!stream)
            return;

          for (
            const viewer of
            stream.viewers
          ) {

            send(
              viewer,
              {
                type:
                  "broadcast_image",
                image:
                  data.image
              }
            );

          }

          return;
        }


        /* JOIN */

        if (
          data.type ===
          "join_stream"
        ) {

          const stream =
            streams.get(
              data.streamId
            );

          if (!stream)
            return;

          ws.role =
            "viewer";

          ws.streamId =
            data.streamId;

          stream.viewers.add(
            ws
          );

          send(
            stream.broadcaster,
            {
              type:
                "viewer_joined",

              streamId:
                data.streamId,

              viewerId:
                ws.clientId
            }
          );

          return;
        }


        /* LEAVE */

        if (
          data.type ===
          "leave_stream"
        ) {

          const stream =
            streams.get(
              data.streamId
            );

          if (stream) {

            stream.viewers.delete(
              ws
            );

          }

          return;
        }


        /* OFFER */

        if (
          data.type ===
          "offer"
        ) {

          const target =
            findClient(
              data.target
            );

          if (!target)
            return;

          send(
            target,
            {
              type:
                "offer",

              sender:
                ws.clientId,

              offer:
                data.offer,

              streamId:
                data.streamId
            }
          );

          return;
        }


        /* ANSWER */

        if (
          data.type ===
          "answer"
        ) {

          const target =
            findClient(
              data.target
            );

          if (!target)
            return;

          send(
            target,
            {
              type:
                "answer",

              sender:
                ws.clientId,

              answer:
                data.answer
            }
          );

          return;
        }


        /* ICE */

        if (
          data.type ===
          "ice"
        ) {

          const target =
            findClient(
              data.target
            );

          if (!target)
            return;

          send(
            target,
            {
              type:
                "ice",

              sender:
                ws.clientId,

              candidate:
                data.candidate
            }
          );

          return;
        }


        /* LIKE */

        if (
          data.type ===
          "like"
        ) {

          const stream =
            streams.get(
              data.streamId
            );

          if (!stream)
            return;

          stream.likes++;

          send(
            stream.broadcaster,
            {
              type:
                "broadcast_event",

              event:
                "❤️ いいね +" +
                stream.likes
            }
          );

          return;
        }


        /* GIFT */

        if (
          data.type ===
          "gift"
        ) {

          const stream =
            streams.get(
              data.streamId
            );

          if (!stream)
            return;

          stream.gifts.push(
            data.gift
          );

          send(
            stream.broadcaster,
            {
              type:
                "broadcast_event",

              event:
                "🎁 ギフト " +
                data.gift
            }
          );

          return;
        }


        /* STOP */

        if (
          data.type ===
          "stop_stream"
        ) {

          removeStream(
            data.streamId
          );

          return;
        }

      }
    );


    ws.on(
      "close",
      () => {

        clients.delete(ws);


        if (
          ws.streamId
        ) {

          const stream =
            streams.get(
              ws.streamId
            );

          if (stream) {

            if (
              stream.broadcaster ===
              ws
            ) {

              removeStream(
                ws.streamId
              );

            } else {

              stream.viewers.delete(
                ws
              );

            }

          }

        }

      }
    );

  }
);


/* =====================================================
   HELPERS
===================================================== */

function findClient(id) {

  for (const client of clients) {

    if (
      client.clientId ===
      id
    ) {

      return client;

    }

  }

  return null;
}


function removeStream(
  streamId
) {

  const stream =
    streams.get(
      streamId
    );

  if (!stream)
    return;


  for (
    const viewer of
    stream.viewers
  ) {

    send(
      viewer,
      {
        type:
          "stream_ended"
      }
    );

  }


  streams.delete(
    streamId
  );

}


/* =====================================================
   START
===================================================== */

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "===================================="
    );

    console.log(
      "VoiceポタLive"
    );

    console.log(
      "Server started"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "===================================="
    );

  }
);
