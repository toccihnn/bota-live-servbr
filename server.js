const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/* =====================================================
   ランキング
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
  score: 50000 - index * 731,
  viewers: Math.max(1, 1200 - index * 19),
  icon: ["🌙", "⭐", "🌸", "🎙️", "✨"][index % 5],
  live: false
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
    live: true,
    score: 9800
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    live: false,
    score: 8600
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    live: true,
    score: 8200
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    live: false,
    score: 7600
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    live: true,
    score: 7100
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    live: false,
    score: 6500
  },
  {
    id: "new-7",
    name: "月乃ソラ",
    title: "夜にゆっくり話そう",
    icon: "🌙",
    live: false,
    score: 6200
  },
  {
    id: "new-8",
    name: "星野ミナ",
    title: "初見さん歓迎",
    icon: "⭐",
    live: false,
    score: 5900
  },
  {
    id: "new-9",
    name: "花音リオ",
    title: "雑談中心です",
    icon: "🌸",
    live: false,
    score: 5400
  },
  {
    id: "new-10",
    name: "白雪あお",
    title: "よろしくお願いします",
    icon: "✨",
    live: false,
    score: 5000
  },
  {
    id: "new-11",
    name: "夜空ミオ",
    title: "のんびり配信",
    icon: "🌙",
    live: false,
    score: 4800
  },
  {
    id: "new-12",
    name: "春風ユイ",
    title: "お話ししませんか？",
    icon: "🌸",
    live: false,
    score: 4500
  }
];

/* =====================================================
   現在の配信
===================================================== */

let liveBroadcaster = null;

/*
  liveBroadcaster:

  {
    id,
    name,
    startedAt
  }
*/


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

  z-index: 1000;

  display: flex;
  align-items: center;

  padding: 0 18px;

  background:
    rgba(3,5,16,.88);

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
  background-clip: text;

  color: transparent;
}


/* =====================================================
   PAGE
===================================================== */

.page {

  display: none;

  padding-top: 58px;
}

.page.active {
  display: block;
}


/* =====================================================
   HERO
===================================================== */

.hero {

  position: relative;

  margin-top: 0;

  width: 100%;

  overflow: hidden;

  background: #030510;
}

.hero-image {

  display: block;

  width: 100%;

  height: auto;

  max-width: 100%;

  object-fit: contain;
}

.hero::after {

  content: "";

  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 52%;

  pointer-events: none;

  background:
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,.92) 18%,
      rgba(3,5,16,.45) 50%,
      rgba(3,5,16,0) 100%
    );
}

.hero-content {

  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  z-index: 5;

  padding:
    70px
    18px
    30px;
}

.hero-small {

  font-size: 11px;

  font-weight: 800;

  color: #b7c9ff;

  margin-bottom: 8px;

  text-shadow:
    0 0 12px
    rgba(90,130,255,.8);
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
  background-clip: text;

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

.section-title {

  font-size: 19px;

  font-weight: 900;
}

.section-sub {

  font-size: 10px;

  color: #687394;

  letter-spacing: 1px;
}


/* =====================================================
   HORIZONTAL LIST
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

  -webkit-overflow-scrolling: touch;
}

.horizontal-list::-webkit-scrollbar {
  display: none;
}


/* =====================================================
   RANK CARD
===================================================== */

.rank-card {

  flex:
    0 0
    250px;

  min-height: 90px;

  display: flex;

  align-items: center;

  padding: 11px;

  border-radius: 18px;

  background:
    linear-gradient(
      125deg,
      rgba(25,34,82,.96),
      rgba(7,11,31,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.14);

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.22);

  cursor: pointer;
}

.rank-number {

  width: 30px;

  text-align: center;

  font-size: 15px;

  font-weight: 900;

  color: #8792b5;
}

.rank-number.top {

  font-size: 20px;

  color: #ffd76a;

  text-shadow:
    0 0 12px
    rgba(255,210,80,.6);
}

.rank-avatar {

  position: relative;

  width: 54px;

  height: 54px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 25px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 18px
    rgba(80,130,255,.3);
}

.rank-live {

  position: absolute;

  right: -2px;

  bottom: -2px;

  width: 15px;

  height: 15px;

  border-radius: 50%;

  background: #ff3d6e;

  border:
    3px solid
    #11162e;

  box-shadow:
    0 0 9px
    rgba(255,60,110,.8);
}

.rank-info {

  min-width: 0;

  flex: 1;

  padding-left: 10px;
}

.rank-name {

  font-size: 13px;

  font-weight: 900;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.rank-score {

  margin-top: 4px;

  font-size: 10px;

  color: #8f9abd;
}

.rank-viewers {

  margin-top: 4px;

  font-size: 10px;

  color: #697595;
}


/* =====================================================
   NEWCOMER CARD
===================================================== */

.new-card {

  flex:
    0 0
    150px;

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
    1px solid
    rgba(120,140,255,.13);

  cursor: pointer;
}

.new-avatar-wrap {

  position: relative;

  width: 60px;

  height: 60px;

  margin-bottom: 10px;
}

.new-avatar {

  width: 60px;
  height: 60px;

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
}

.live-dot {

  position: absolute;

  right: -1px;

  bottom: -1px;

  width: 15px;

  height: 15px;

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

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.new-title {

  margin-top: 5px;

  font-size: 10px;

  line-height: 1.5;

  color: #8f9abb;

  height: 31px;

  overflow: hidden;
}

.new-badge {

  display: inline-block;

  margin-top: 8px;

  padding: 4px 8px;

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
   MORE BUTTON
===================================================== */

.more-button {

  width: 100%;

  height: 44px;

  margin-top: 4px;

  border-radius: 14px;

  border:
    1px solid
    rgba(120,140,255,.16);

  background:
    rgba(15,20,55,.75);

  color: #b8c5ea;

  font-size: 12px;

  font-weight: 900;
}


/* =====================================================
   LIST PAGE
===================================================== */

.list-page {

  padding:
    78px
    15px
    30px;
}

.page-title {

  font-size: 24px;

  font-weight: 900;

  margin-bottom: 6px;
}

.page-subtitle {

  font-size: 11px;

  color: #7884a7;

  margin-bottom: 20px;
}

.back-button {

  width: 100%;

  height: 43px;

  margin-bottom: 15px;

  border-radius: 13px;

  border:
    1px solid
    rgba(120,140,255,.15);

  background:
    rgba(15,20,55,.8);

  color: #b9c6e8;

  font-weight: 800;
}


/* =====================================================
   FULL RANK LIST
===================================================== */

.full-rank-list {

  display: flex;

  flex-direction: column;

  gap: 9px;
}

.full-rank-card {

  min-height: 73px;

  display: flex;

  align-items: center;

  padding: 10px;

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

.full-rank-number {

  width: 35px;

  text-align: center;

  font-size: 15px;

  font-weight: 900;

  color: #8c97ba;
}

.full-rank-number.top {
  color: #ffd76a;
}

.full-rank-avatar {

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

.full-rank-info {

  flex: 1;

  min-width: 0;

  padding-left: 10px;
}

.full-rank-name {

  font-size: 13px;

  font-weight: 900;
}

.full-rank-score {

  margin-top: 4px;

  font-size: 10px;

  color: #8f9abd;
}


/* =====================================================
   NEWCOMER FULL
===================================================== */

.full-new-list {

  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;
}

.full-new-card {

  min-height: 180px;

  padding: 14px;

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


/* =====================================================
   LIVE PAGE
===================================================== */

.live-page {

  min-height: 100vh;

  padding:
    78px
    15px
    30px;
}

.live-card {

  padding: 25px 18px;

  border-radius: 24px;

  background:
    linear-gradient(
      145deg,
      rgba(24,32,75,.97),
      rgba(7,11,30,.99)
    );

  border:
    1px solid
    rgba(120,140,255,.15);

  box-shadow:
    0 12px 40px
    rgba(0,0,0,.3);
}

.live-title {

  font-size: 22px;

  font-weight: 900;

  margin-bottom: 8px;
}

.live-status {

  font-size: 11px;

  color: #8490b5;

  margin-bottom: 20px;
}

.mic-button {

  width: 100%;

  height: 58px;

  border: 0;

  border-radius: 18px;

  background:
    linear-gradient(
      90deg,
      #6d4aff,
      #b12cff
    );

  color: white;

  font-size: 15px;

  font-weight: 900;

  box-shadow:
    0 0 25px
    rgba(125,70,255,.35);
}

.stop-button {

  width: 100%;

  height: 52px;

  margin-top: 10px;

  border: 0;

  border-radius: 17px;

  background:
    rgba(255,50,90,.14);

  border:
    1px solid
    rgba(255,70,100,.35);

  color: #ff7d9a;

  font-weight: 900;
}

.viewer-box {

  margin-top: 15px;

  padding: 15px;

  border-radius: 16px;

  background:
    rgba(8,12,35,.8);

  color: #9ca8ca;

  font-size: 11px;

  line-height: 1.8;
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

  z-index: 2000;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  padding:
    6px
    5px
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

  position: relative;

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

  color: #c7d7ff;
}

.nav-item.active .nav-icon {

  filter:
    drop-shadow(
      0 0 8px #5e8cff
    );
}


/* =====================================================
   LIVE BUTTON
===================================================== */

.live-nav {

  margin-top: -25px;

  width: 58px;

  height: 58px;

  border-radius: 50%;

  border:
    4px solid
    #030510;

  background:
    linear-gradient(
      145deg,
      #8c5cff,
      #d32cff
    );

  color: white;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 25px;

  box-shadow:
    0 0 25px
    rgba(145,70,255,.55);
}

.live-nav-label {

  margin-top: 2px;

  font-size: 9px;

  color: #c8d2f0;

  font-weight: 900;
}


/* =====================================================
   DESKTOP
===================================================== */

@media (min-width: 700px) {

  .hero-image {

    max-height: 760px;

    width: 100%;

    object-fit: contain;
  }

  .hero-content {

    max-width: 700px;

    padding:
      100px
      50px
      45px;
  }

  .section {

    max-width: 1000px;

    margin: auto;
  }

  .rank-card {

    flex-basis: 280px;
  }

  .full-new-list {

    grid-template-columns:
      repeat(4, 1fr);
  }

}


/* =====================================================
   SMALL MOBILE
===================================================== */

@media (max-width: 380px) {

  .hero-content {

    padding:
      50px
      15px
      22px;
  }

  .hero-title {

    font-size: 25px;
  }

  .hero-description {

    font-size: 11px;
  }

  .rank-card {

    flex-basis: 235px;
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

<main
  id="homePage"
  class="page active"
>

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


<!-- 人気 -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 人気ライバー
    </div>

    <div class="section-sub">
      TOP 10
    </div>

  </div>

  <div
    id="rankingHorizontal"
    class="horizontal-list"
  ></div>

  <button
    class="more-button"
    onclick="showPage('rankingPage')"
  >
    トップ50をもっと見る →
  </button>

</section>


<!-- 新人 -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <div class="section-sub">
      人気順
    </div>

  </div>

  <div
    id="newHorizontal"
    class="horizontal-list"
  ></div>

  <button
    class="more-button"
    onclick="showPage('newcomerPage')"
  >
    新人ライバーをもっと見る →
  </button>

</section>

</main>


<!-- =================================================
     TOP50
================================================= -->

<main
  id="rankingPage"
  class="page"
>

<div class="list-page">

  <button
    class="back-button"
    onclick="showPage('homePage')"
  >
    ← ホームに戻る
  </button>

  <div class="page-title">
    🏆 トップ50
  </div>

  <div class="page-subtitle">
    人気順ランキング
  </div>

  <div
    id="fullRanking"
    class="full-rank-list"
  ></div>

</div>

</main>


<!-- =================================================
     新人一覧
================================================= -->

<main
  id="newcomerPage"
  class="page"
>

<div class="list-page">

  <button
    class="back-button"
    onclick="showPage('homePage')"
  >
    ← ホームに戻る
  </button>

  <div class="page-title">
    🌱 新人ライバー
  </div>

  <div class="page-subtitle">
    人気順・新人一覧
  </div>

  <div
    id="fullNewcomers"
    class="full-new-list"
  ></div>

</div>

</main>


<!-- =================================================
     配信
================================================= -->

<main
  id="livePage"
  class="page"
>

<div class="live-page">

  <div class="live-card">

    <div class="live-title">
      🎙️ 音声ライブ配信
    </div>

    <div
      id="liveStatus"
      class="live-status"
    >
      マイクを使って配信できます。
    </div>

    <button
      id="startLiveButton"
      class="mic-button"
      onclick="startLive()"
    >
      🎙️ 配信を開始する
    </button>

    <button
      id="stopLiveButton"
      class="stop-button"
      onclick="stopLive()"
      style="display:none;"
    >
      ■ 配信を終了する
    </button>

    <div
      id="viewerInfo"
      class="viewer-box"
    >
      配信を開始すると、ここに視聴者の接続状況が表示されます。
    </div>

  </div>

</div>

</main>


<!-- =================================================
     BOTTOM NAV
================================================= -->

<nav class="bottom-nav">

  <button
    id="navHome"
    class="nav-item active"
    onclick="showPage('homePage')"
  >

    <div class="nav-icon">
      ⌂
    </div>

    ホーム

  </button>


  <button
    class="nav-item"
    onclick="showSearch()"
  >

    <div class="nav-icon">
      ⌕
    </div>

    探す

  </button>


  <button
    class="nav-item"
    onclick="showPage('livePage')"
  >

    <div class="live-nav">
      🎙️
    </div>

    <div class="live-nav-label">
      配信
    </div>

  </button>


  <button
    class="nav-item"
    onclick="showNotice()"
  >

    <div class="nav-icon">
      ♧
    </div>

    お知らせ

  </button>


  <button
    class="nav-item"
    onclick="showProfile()"
  >

    <div class="nav-icon">
      ♙
    </div>

    マイページ

  </button>

</nav>

</div>


<!-- =====================================================
     JAVASCRIPT
===================================================== -->

<script>

/* =====================================================
   データ
===================================================== */

let rankingData = [];

let newcomerData = [];


/* =====================================================
   ページ
===================================================== */

function showPage(id) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove("active");

    });


  const page =
    document.getElementById(id);

  if (page) {

    page.classList.add("active");

  }


  window.scrollTo({
    top: 0,
    behavior: "instant"
  });


  document
    .querySelectorAll(".nav-item")
    .forEach(item => {

      item.classList.remove("active");

    });


  if (id === "homePage") {

    const nav =
      document.getElementById(
        "navHome"
      );

    if (nav) {

      nav.classList.add("active");

    }

  }

}


/* =====================================================
   ランキング横スクロール
===================================================== */

function renderRanking(list) {

  rankingData = Array.isArray(list)
    ? list
    : [];


  const box =
    document.getElementById(
      "rankingHorizontal"
    );


  if (!box) return;


  box.innerHTML =
    rankingData
      .slice(0, 10)
      .map(
        (user, index) => {

          const rank =
            index + 1;


          return `

          <div
            class="rank-card"
            onclick="openLive('${escapeHtml(user.id)}')"
          >

            <div
              class="
                rank-number
                ${rank <= 3 ? "top" : ""}
              "
            >
              ${rank}
            </div>

            <div class="rank-avatar">

              ${escapeHtml(user.icon)}

              ${
                user.live
                  ? `
                    <div
                      class="rank-live"
                    ></div>
                  `
                  : ""
              }

            </div>

            <div class="rank-info">

              <div class="rank-name">
                ${escapeHtml(user.name)}
              </div>

              <div class="rank-score">
                応援ポイント
                ${Number(
                  user.score
                ).toLocaleString()}
              </div>

              <div class="rank-viewers">
                👁
                ${Number(
                  user.viewers
                ).toLocaleString()}
                人
              </div>

            </div>

          </div>

          `;

        }
      )
      .join("");


  renderFullRanking();

}


/* =====================================================
   TOP50
===================================================== */

function renderFullRanking() {

  const box =
    document.getElementById(
      "fullRanking"
    );


  if (!box) return;


  box.innerHTML =
    rankingData
      .slice(0, 50)
      .map(
        (user, index) => {

          const rank =
            index + 1;


          return `

          <div
            class="full-rank-card"
            onclick="openLive('${escapeHtml(user.id)}')"
          >

            <div
              class="
                full-rank-number
                ${rank <= 3 ? "top" : ""}
              "
            >
              ${rank}
            </div>

            <div class="full-rank-avatar">
              ${escapeHtml(user.icon)}
            </div>

            <div class="full-rank-info">

              <div class="full-rank-name">
                ${escapeHtml(user.name)}
              </div>

              <div class="full-rank-score">
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

          `;

        }
      )
      .join("");

}


/* =====================================================
   新人
===================================================== */

function renderNewcomers(list) {

  newcomerData = Array.isArray(list)
    ? list
    : [];


  newcomerData.sort(
    (a, b) =>
      Number(b.score || 0) -
      Number(a.score || 0)
  );


  const box =
    document.getElementById(
      "newHorizontal"
    );


  if (!box) return;


  box.innerHTML =
    newcomerData
      .slice(0, 10)
      .map(
        user => `

        <div
          class="new-card"
          onclick="openLive('${escapeHtml(user.id)}')"
        >

          <div class="new-avatar-wrap">

            <div class="new-avatar">
              ${escapeHtml(user.icon)}
            </div>

            ${
              user.live
                ? `
                  <div
                    class="live-dot"
                  ></div>
                `
                : ""
            }

          </div>

          <div class="new-name">
            ${escapeHtml(user.name)}
          </div>

          <div class="new-title">
            ${escapeHtml(user.title)}
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

        `
      )
      .join("");


  renderFullNewcomers();

}


/* =====================================================
   新人全員
===================================================== */

function renderFullNewcomers() {

  const box =
    document.getElementById(
      "fullNewcomers"
    );


  if (!box) return;


  box.innerHTML =
    newcomerData
      .map(
        user => `

        <div
          class="full-new-card"
          onclick="openLive('${escapeHtml(user.id)}')"
        >

          <div class="new-avatar-wrap">

            <div class="new-avatar">
              ${escapeHtml(user.icon)}
            </div>

            ${
              user.live
                ? `
                  <div
                    class="live-dot"
                  ></div>
                `
                : ""
            }

          </div>

          <div class="new-name">
            ${escapeHtml(user.name)}
          </div>

          <div class="new-title">
            ${escapeHtml(user.title)}
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

        `
      )
      .join("");

}


/* =====================================================
   配信を見る
===================================================== */

function openLive(id) {

  if (
    liveBroadcasterInfo &&
    liveBroadcasterInfo.id === id
  ) {

    startViewer(id);

    return;

  }


  alert(
    "この配信は現在準備中です。\\n\\n" +
    "ID: " +
    id
  );

}


/* =====================================================
   検索
===================================================== */

function showSearch() {

  alert(
    "配信検索を準備中です。"
  );

}


/* =====================================================
   お知らせ
===================================================== */

function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}


/* =====================================================
   マイページ
===================================================== */

function showProfile() {

  alert(
    "マイページを準備中です。"
  );

}


/* =====================================================
   HTML ESCAPE
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
   WEBSOCKET
===================================================== */

let socket = null;

let myClientId = null;

let isBroadcaster = false;

let localStream = null;

let peerConnections = {};

let liveBroadcasterInfo = null;


/* =====================================================
   SOCKET CONNECT
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

  };


  socket.onmessage = async event => {

    try {

      const data =
        JSON.parse(
          event.data
        );


      /* -------------------------------
         接続ID
      ------------------------------- */

      if (
        data.type ===
        "connected"
      ) {

        myClientId =
          data.clientId;

      }


      /* -------------------------------
         ホームデータ
      ------------------------------- */

      if (
        data.type ===
        "home_data"
      ) {

        renderRanking(
          data.ranking
        );

        renderNewcomers(
          data.newcomers
        );

      }


      /* -------------------------------
         配信状態
      ------------------------------- */

      if (
        data.type ===
        "live_status"
      ) {

        if (data.live) {

          liveBroadcasterInfo = {
            id: data.id,
            name: data.name
          };

          updateLiveState(
            true,
            data.name
          );

        } else {

          liveBroadcasterInfo =
            null;

          updateLiveState(
            false
          );

        }

      }


      /* -------------------------------
         視聴者が入室
      ------------------------------- */

      if (
        data.type ===
        "viewer_join"
      ) {

        if (
          !isBroadcaster
        ) return;


        await createPeerForViewer(
          data.viewerId
        );

      }


      /* -------------------------------
         OFFER
      ------------------------------- */

      if (
        data.type ===
        "offer"
      ) {

        await handleOffer(
          data
        );

      }


      /* -------------------------------
         ANSWER
      ------------------------------- */

      if (
        data.type ===
        "answer"
      ) {

        await handleAnswer(
          data
        );

      }


      /* -------------------------------
         ICE
      ------------------------------- */

      if (
        data.type ===
        "ice"
      ) {

        await handleIce(
          data
        );

      }


      /* -------------------------------
         配信終了
      ------------------------------- */

      if (
        data.type ===
        "live_ended"
      ) {

        stopAllPeerConnections();

        updateLiveState(
          false
        );

        if (
          !isBroadcaster
        ) {

          alert(
            "配信が終了しました。"
          );

        }

      }

    } catch (error) {

      console.error(
        "WebSocket message error",
        error
      );

    }

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


  socket.onerror = error => {

    console.error(
      "WebSocket error",
      error
    );

  };

}


/* =====================================================
   配信開始
===================================================== */

async function startLive() {

  if (!socket) {

    alert(
      "サーバーに接続中です。"
    );

    return;

  }


  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });


    isBroadcaster = true;


    const name =
      prompt(
        "配信者名を入力してください",
        "月夜ぼた"
      ) ||
      "月夜ぼた";


    socket.send(
      JSON.stringify({
        type: "host_start",
        name
      })
    );


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


    updateLiveState(
      true,
      name
    );


    document
      .getElementById(
        "viewerInfo"
      )
      .innerText =
      "🔴 配信中です。\\n視聴者が接続すると音声配信が開始されます。";


  } catch (error) {

    console.error(
      error
    );


    alert(
      "マイクを使用できませんでした。\\n\\n" +
      "ブラウザのマイク許可を確認してください。"
    );

  }

}


/* =====================================================
   配信終了
===================================================== */

function stopLive() {

  if (socket) {

    socket.send(
      JSON.stringify({
        type: "host_stop"
      })
    );

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    localStream = null;

  }


  stopAllPeerConnections();

  isBroadcaster = false;

  updateLiveState(
    false
  );


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
      "viewerInfo"
    )
    .innerText =
    "配信を終了しました。";

}


/* =====================================================
   配信状態UI
===================================================== */

function updateLiveState(
  live,
  name
) {

  const status =
    document.getElementById(
      "liveStatus"
    );


  if (!status) return;


  if (live) {

    status.innerText =
      "🔴 LIVE配信中" +
      (
        name
          ? " ・ " + name
          : ""
      );

  } else {

    status.innerText =
      "マイクを使って配信できます。";

  }

}


/* =====================================================
   視聴開始
===================================================== */

function startViewer(
  hostId
) {

  if (!socket) {

    alert(
      "サーバーに接続されていません。"
    );

    return;

  }


  socket.send(
    JSON.stringify({
      type: "join_live",
      hostId
    })
  );


  alert(
    "配信に接続しています。"
  );

}


/* =====================================================
   BROADCASTER
===================================================== */

async function createPeerForViewer(
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
      track => {

        pc.addTrack(
          track,
          localStream
        );

      }
    );


  pc.onicecandidate =
    event => {

      if (
        event.candidate &&
        socket
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


  pc.onconnectionstatechange =
    () => {

      console.log(
        "Viewer connection:",
        viewerId,
        pc.connectionState
      );


      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "closed" ||
        pc.connectionState ===
          "disconnected"
      ) {

        delete
          peerConnections[
            viewerId
          ];

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
      offer:
        pc.localDescription
    })
  );

}


/* =====================================================
   VIEWER OFFER
===================================================== */

let viewerPeer = null;

async function handleOffer(
  data
) {

  if (isBroadcaster) return;


  viewerPeer =
    new RTCPeerConnection({
      iceServers: [
        {
          urls:
            "stun:stun.l.google.com:19302"
        }
      ]
    });


  viewerPeer.onicecandidate =
    event => {

      if (
        event.candidate &&
        socket
      ) {

        socket.send(
          JSON.stringify({
            type: "ice",
            target:
              data.from,
            candidate:
              event.candidate
          })
        );

      }

    };


  viewerPeer.ontrack =
    event => {

      let audio =
        document.getElementById(
          "remoteAudio"
        );


      if (!audio) {

        audio =
          document.createElement(
            "audio"
          );

        audio.id =
          "remoteAudio";

        audio.autoplay =
          true;

        audio.playsInline =
          true;

        audio.controls =
          false;

        document.body.appendChild(
          audio
        );

      }


      if (
        event.streams &&
        event.streams[0]
      ) {

        audio.srcObject =
          event.streams[0];

        audio
          .play()
          .catch(
            error =>
              console.log(
                "audio play waiting",
                error
              )
          );

      }

    };


  await viewerPeer.setRemoteDescription(
    new RTCSessionDescription(
      data.offer
    )
  );


  const answer =
    await viewerPeer.createAnswer();


  await viewerPeer.setLocalDescription(
    answer
  );


  socket.send(
    JSON.stringify({
      type: "answer",
      target: data.from,
      answer:
        viewerPeer.localDescription
    })
  );

}


/* =====================================================
   ANSWER
===================================================== */

async function handleAnswer(
  data
) {

  if (!isBroadcaster) return;


  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) return;


  await pc.setRemoteDescription(
    new RTCSessionDescription(
      data.answer
    )
  );

}


/* =====================================================
   ICE
===================================================== */

async function handleIce(
  data
) {

  try {

    if (isBroadcaster) {

      const pc =
        peerConnections[
          data.from
        ];


      if (pc) {

        await pc.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );

      }

    } else {

      if (viewerPeer) {

        await viewerPeer.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );

      }

    }

  } catch (error) {

    console.error(
      "ICE error",
      error
    );

  }

}


/* =====================================================
   PEER終了
===================================================== */

function stopAllPeerConnections() {

  Object
    .values(peerConnections)
    .forEach(
      pc => {

        try {

          pc.close();

        } catch (_) {}

      }
    );


  peerConnections = {};


  if (viewerPeer) {

    try {

      viewerPeer.close();

    } catch (_) {}

    viewerPeer = null;

  }

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


      /* -----------------------------------------------
         ホーム・各ページ
      ----------------------------------------------- */

      if (
        url === "/" ||
        url === "/index.html" ||
        url === "/top50" ||
        url === "/ranking" ||
        url === "/newcomers" ||
        url === "/live"
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


      /* -----------------------------------------------
         HOME IMAGE
      ----------------------------------------------- */

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
          ).pipe(
            res
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
          "home.png がありません"
        );


        return;

      }


      /* -----------------------------------------------
         404
      ----------------------------------------------- */

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
  new Map();


function send(
  ws,
  data
) {

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify(
        data
      )
    );

  }

}


function broadcast(
  data
) {

  clients.forEach(
    client => {

      send(
        client.ws,
        data
      );

    }
  );

}


/* =====================================================
   CONNECTION
===================================================== */

wss.on(
  "connection",
  ws => {

    const clientId =
      Math.random()
        .toString(36)
        .slice(2) +
      Date.now()
        .toString(36);


    const client = {
      ws,
      id: clientId,
      role: "viewer",
      name: ""
    };


    clients.set(
      clientId,
      client
    );


    console.log(
      "WebSocket connected:",
      clientId
    );


    /* 接続ID */

    send(
      ws,
      {
        type:
          "connected",

        clientId
      }
    );


    /* ホームデータ */

    send(
      ws,
      {
        type:
          "home_data",

        ranking,

        newcomers
      }
    );


    /* 現在LIVEなら通知 */

    if (
      liveBroadcaster
    ) {

      send(
        ws,
        {
          type:
            "live_status",

          live:
            true,

          id:
            liveBroadcaster.id,

          name:
            liveBroadcaster.name
        }
      );

    }


    /* =================================================
       MESSAGE
    ================================================= */

    ws.on(
      "message",
      raw => {

        try {

          const data =
            JSON.parse(
              raw.toString()
            );


          /* -------------------------------------------
             配信開始
          ------------------------------------------- */

          if (
            data.type ===
            "host_start"
          ) {

            client.role =
              "broadcaster";

            client.name =
              String(
                data.name ||
                "月夜ぼた"
              );


            liveBroadcaster = {

              id:
                clientId,

              name:
                client.name,

              startedAt:
                Date.now()

            };


            console.log(
              "LIVE START:",
              client.name
            );


            broadcast(
              {
                type:
                  "live_status",

                live:
                  true,

                id:
                  clientId,

                name:
                  client.name
              }
            );


            return;

          }


          /* -------------------------------------------
             配信終了
          ------------------------------------------- */

          if (
            data.type ===
            "host_stop"
          ) {

            if (
              liveBroadcaster &&
              liveBroadcaster.id ===
                clientId
            ) {

              liveBroadcaster =
                null;


              console.log(
                "LIVE END:",
                client.name
              );


              broadcast(
                {
                  type:
                    "live_ended"
                }
              );


              broadcast(
                {
                  type:
                    "live_status",

                  live:
                    false
                }
              );

            }


            client.role =
              "viewer";


            return;

          }


          /* -------------------------------------------
             視聴者入室
          ------------------------------------------- */

          if (
            data.type ===
            "join_live"
          ) {

            if (
              !liveBroadcaster
            ) {

              send(
                ws,
                {
                  type:
                    "live_status",

                  live:
                    false
                }
              );


              return;

            }


            const host =
              clients.get(
                liveBroadcaster.id
              );


            if (!host) {

              return;

            }


            send(
              host.ws,
              {
                type:
                  "viewer_join",

                viewerId:
                  clientId
              }
            );


            return;

          }


          /* -------------------------------------------
             OFFER / ANSWER / ICE
          ------------------------------------------- */

          if (
            data.type ===
              "offer" ||
            data.type ===
              "answer" ||
            data.type ===
              "ice"
          ) {

            const target =
              clients.get(
                data.target
              );


            if (!target) {

              return;

            }


            send(
              target.ws,
              {
                ...data,

                from:
                  clientId
              }
            );


            return;

          }

        } catch (error) {

          console.error(
            "message error:",
            error
          );

        }

      }
    );


    /* =================================================
       CLOSE
    ================================================= */

    ws.on(
      "close",
      () => {

        console.log(
          "WebSocket disconnected:",
          clientId
        );


        if (
          liveBroadcaster &&
          liveBroadcaster.id ===
            clientId
        ) {

          liveBroadcaster =
            null;


          broadcast(
            {
              type:
                "live_ended"
            }
          );


          broadcast(
            {
              type:
                "live_status",

              live:
                false
            }
          );

        }


        clients.delete(
          clientId
        );

      }
    );


    ws.on(
      "error",
      error => {

        console.error(
          "WebSocket error:",
          error
        );

      }
    );

  });


/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "======================================"
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
      "======================================"
    );

  }
);
