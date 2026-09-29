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

/* =========================================================
   データ
========================================================= */

const rankingNames = [
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

const ranking = rankingNames.map((name, i) => ({
  id: `rank-${i + 1}`,
  name,
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
    score: 9800,
    viewers: 220
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    score: 9100,
    viewers: 190
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    score: 8500,
    viewers: 170
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    score: 7900,
    viewers: 140
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    score: 7200,
    viewers: 120
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    score: 6800,
    viewers: 100
  },
  {
    id: "new-7",
    name: "月乃そら",
    title: "夜に少しだけ",
    icon: "🌙",
    score: 6400,
    viewers: 95
  },
  {
    id: "new-8",
    name: "星野ミナ",
    title: "初見さん歓迎",
    icon: "⭐",
    score: 6100,
    viewers: 90
  }
];

/* =========================================================
   LIVE ROOM
========================================================= */

const liveRooms = new Map();

/*
room = {
  id,
  hostId,
  hostName,
  title,
  icon,
  theme,
  background,
  viewers: Map(),
  likes,
  gifts,
  startedAt
}
*/

function createId(prefix = "user") {
  return (
    prefix +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    "-" +
    Date.now().toString(36)
  );
}

function send(ws, data) {
  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastRoom(room, data) {
  if (!room) return;

  send(room.hostSocket, data);

  for (const viewer of room.viewers.values()) {
    send(viewer.socket, data);
  }
}

function publicLiveRoom(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    hostName: room.hostName,
    title: room.title,
    icon: room.icon,
    theme: room.theme,
    background: room.background,
    viewers: room.viewers.size,
    likes: room.likes,
    gifts: room.gifts
  };
}

function getHomeData() {
  return {
    type: "home_data",
    ranking,
    newcomers,
    liveRooms: [...liveRooms.values()].map(publicLiveRoom)
  };
}

function broadcastHome() {
  const message = getHomeData();

  for (const ws of clients) {
    send(ws, message);
  }
}

/* =========================================================
   HTML
========================================================= */

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
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,
body {
  margin:0;
  padding:0;
  background:#030510;
  color:#fff;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    "Yu Gothic",
    sans-serif;
}

body {
  overflow-x:hidden;
}

button,
input,
textarea,
select {
  font-family:inherit;
}

button {
  cursor:pointer;
}

.app {
  min-height:100vh;
  padding-bottom:90px;
}

/* =========================================================
HEADER
========================================================= */

.header {
  position:fixed;
  top:0;
  left:0;
  right:0;
  height:58px;
  z-index:1000;

  display:flex;
  align-items:center;
  justify-content:space-between;

  padding:0 17px;

  background:rgba(3,5,16,.88);
  backdrop-filter:blur(18px);

  border-bottom:
    1px solid
    rgba(120,140,255,.12);
}

.logo {
  font-size:18px;
  font-weight:900;

  background:
    linear-gradient(
      90deg,
      #fff,
      #9bd8ff,
      #d18cff
    );

  -webkit-background-clip:text;
  color:transparent;
}

/* =========================================================
PAGE
========================================================= */

.page {
  display:none;
  padding-top:58px;
}

.page.active {
  display:block;
}

/* =========================================================
HOME HERO
========================================================= */

.hero {
  position:relative;
  width:100%;

  background:#000;

  overflow:hidden;
}

.hero-image {
  display:block;

  width:100%;
  height:auto;

  max-height:70vh;

  object-fit:contain;

  object-position:center top;

  background:#000;
}

.hero-content {
  position:relative;

  padding:
    25px
    18px
    30px;

  background:
    linear-gradient(
      180deg,
      #030510 0%,
      #080b1d 100%
    );
}

.hero-small {
  font-size:12px;
  font-weight:800;

  color:#b7c9ff;

  margin-bottom:9px;
}

.hero-title {
  margin:0;

  font-size:
    clamp(27px,8vw,48px);

  line-height:1.18;

  font-weight:900;
}

.hero-title span {
  background:
    linear-gradient(
      90deg,
      #fff,
      #9bdcff,
      #d68cff
    );

  -webkit-background-clip:text;
  color:transparent;
}

.hero-description {
  margin-top:12px;

  max-width:500px;

  font-size:13px;
  line-height:1.8;

  color:#d9def1;
}

/* =========================================================
SECTION
========================================================= */

.section {
  padding:
    26px
    15px
    0;
}

.section-head {
  display:flex;
  align-items:center;
  justify-content:space-between;

  margin-bottom:13px;
}

.section-title {
  font-size:20px;
  font-weight:900;
}

.section-sub {
  font-size:10px;
  color:#7581a7;
  letter-spacing:1px;
}

.more-link {
  border:0;
  background:none;
  color:#9fb7ff;
  font-size:11px;
  font-weight:800;
}

/* =========================================================
HORIZONTAL LIST
========================================================= */

.horizontal-list {
  display:flex;

  gap:10px;

  overflow-x:auto;

  padding:
    2px
    1px
    12px;

  scrollbar-width:none;

  scroll-snap-type:x mandatory;
}

.horizontal-list::-webkit-scrollbar {
  display:none;
}

/* =========================================================
RANK CARD
========================================================= */

.rank-card {
  flex:
    0 0
    min(250px,82vw);

  min-height:112px;

  scroll-snap-align:start;

  display:flex;
  align-items:center;

  padding:12px;

  border-radius:18px;

  background:
    linear-gradient(
      135deg,
      rgba(25,33,82,.98),
      rgba(7,10,28,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.14);

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.25);
}

.rank-number {
  width:34px;

  text-align:center;

  font-size:17px;
  font-weight:900;

  color:#8d98bb;
}

.rank-number.top {
  color:#ffd76a;

  text-shadow:
    0 0 12px
    rgba(255,215,100,.55);
}

.avatar {
  width:52px;
  height:52px;

  flex-shrink:0;

  display:flex;
  align-items:center;
  justify-content:center;

  border-radius:50%;

  font-size:25px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 18px
    rgba(80,130,255,.28);
}

.rank-info {
  min-width:0;
  flex:1;

  padding-left:10px;
}

.rank-name {
  font-size:13px;
  font-weight:900;

  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.rank-score {
  margin-top:4px;

  font-size:10px;

  color:#8f9abd;
}

.rank-viewers {
  margin-top:5px;

  font-size:9px;

  color:#687495;
}

/* =========================================================
NEWCOMER
========================================================= */

.new-card {
  flex:
    0 0
    145px;

  min-height:180px;

  padding:14px;

  scroll-snap-align:start;

  border-radius:20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.98),
      rgba(8,11,28,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.13);
}

.new-avatar {
  width:58px;
  height:58px;

  margin-bottom:10px;

  display:flex;
  align-items:center;
  justify-content:center;

  border-radius:50%;

  font-size:27px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.new-name {
  font-size:13px;
  font-weight:900;

  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.new-title {
  margin-top:5px;

  height:32px;

  font-size:10px;
  line-height:1.5;

  color:#8f9abb;

  overflow:hidden;
}

.live-badge {
  display:inline-block;

  margin-top:8px;

  padding:4px 8px;

  border-radius:999px;

  font-size:8px;
  font-weight:900;

  color:#fff;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );
}

/* =========================================================
LIVE LIST
========================================================= */

.live-card {
  position:relative;

  flex:
    0 0
    190px;

  min-height:155px;

  padding:15px;

  border-radius:20px;

  background:
    linear-gradient(
      145deg,
      rgba(35,35,85,.98),
      rgba(8,10,25,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.14);
}

.live-icon {
  font-size:38px;
}

.live-title {
  margin-top:10px;

  font-size:13px;
  font-weight:900;
}

.live-host {
  margin-top:5px;

  font-size:10px;

  color:#929cbd;
}

.live-meta {
  margin-top:9px;

  font-size:10px;

  color:#7682a4;
}

.live-label {
  position:absolute;

  top:10px;
  right:10px;

  padding:4px 7px;

  border-radius:999px;

  background:#ff3d6e;

  font-size:8px;
  font-weight:900;
}

/* =========================================================
BUTTON
========================================================= */

.primary-button {
  width:100%;

  min-height:48px;

  border:0;

  border-radius:15px;

  color:#fff;

  font-size:13px;
  font-weight:900;

  background:
    linear-gradient(
      90deg,
      #4d65ff,
      #9b3cff
    );

  box-shadow:
    0 8px 25px
    rgba(80,80,255,.22);
}

.secondary-button {
  width:100%;

  min-height:45px;

  border-radius:14px;

  border:
    1px solid
    rgba(120,140,255,.18);

  background:
    rgba(20,25,55,.8);

  color:#b9c5e7;

  font-weight:800;
}

/* =========================================================
BOTTOM NAV
========================================================= */

.bottom-nav {
  position:fixed;

  left:0;
  right:0;
  bottom:0;

  height:78px;

  z-index:2000;

  display:grid;

  grid-template-columns:
    repeat(5,1fr);

  padding:
    7px
    5px
    calc(
      7px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.96);

  backdrop-filter:blur(20px);

  border-top:
    1px solid
    rgba(120,140,255,.12);
}

.nav-item {
  border:0;

  background:none;

  color:#687497;

  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;

  gap:4px;

  font-size:9px;
}

.nav-icon {
  font-size:20px;
}

.nav-item.active {
  color:#bcd2ff;
}

/* =========================================================
LIST PAGE
========================================================= */

.list-page {
  padding:
    82px
    15px
    30px;
}

.back-button {
  border:0;
  background:none;

  color:#aebeff;

  font-size:13px;
  font-weight:800;

  margin-bottom:18px;
}

.full-list {
  display:flex;
  flex-direction:column;

  gap:9px;
}

.full-rank {
  display:flex;
  align-items:center;

  min-height:72px;

  padding:10px 12px;

  border-radius:17px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.95),
      rgba(8,12,32,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.11);
}

/* =========================================================
LIVE PAGE
========================================================= */

.live-page {
  min-height:100vh;

  background:#030510;
}

.live-top {
  position:fixed;

  top:0;
  left:0;
  right:0;

  height:58px;

  z-index:1000;

  display:flex;
  align-items:center;

  justify-content:space-between;

  padding:0 12px;

  background:
    rgba(3,5,16,.85);

  backdrop-filter:blur(18px);
}

.live-top button {
  border:0;

  background:
    rgba(255,255,255,.08);

  color:#fff;

  width:38px;
  height:38px;

  border-radius:50%;
}

.live-stage {
  position:relative;

  min-height:
    55vh;

  padding-top:58px;

  display:flex;
  align-items:center;
  justify-content:center;

  overflow:hidden;

  background:
    radial-gradient(
      circle at center,
      #17245d,
      #030510 70%
    );
}

.live-background {
  position:absolute;

  inset:0;

  width:100%;
  height:100%;

  object-fit:cover;

  opacity:.35;
}

.live-overlay {
  position:relative;

  z-index:2;

  width:100%;

  padding:30px 18px;

  text-align:center;
}

.live-avatar-big {
  width:90px;
  height:90px;

  margin:auto;

  display:flex;
  align-items:center;
  justify-content:center;

  border-radius:50%;

  font-size:45px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 35px
    rgba(90,130,255,.45);
}

.live-name-big {
  margin-top:13px;

  font-size:19px;
  font-weight:900;
}

.live-title-big {
  margin-top:5px;

  font-size:12px;

  color:#c0c8e2;
}

.live-status {
  margin-top:12px;

  font-size:11px;

  color:#93a4d4;
}

#remoteAudio {
  display:none;
}

.live-controls {
  padding:15px;

  background:
    #060916;
}

.control-row {
  display:grid;

  grid-template-columns:
    repeat(4,1fr);

  gap:8px;
}

.action-button {
  min-height:55px;

  border:0;

  border-radius:16px;

  background:
    rgba(30,37,75,.9);

  color:#fff;

  font-size:11px;
  font-weight:800;
}

.action-button .emoji {
  display:block;

  font-size:21px;

  margin-bottom:3px;
}

.action-button.like {
  background:
    linear-gradient(
      145deg,
      #702d83,
      #36226e
    );
}

.action-button.gift {
  background:
    linear-gradient(
      145deg,
      #8b4c20,
      #4b2632
    );
}

.action-button.block {
  background:
    linear-gradient(
      145deg,
      #572638,
      #271527
    );
}

.live-info {
  padding:5px 15px 25px;

  color:#9ba6c5;

  font-size:11px;

  line-height:1.8;
}

/* =========================================================
GIFT PANEL
========================================================= */

.modal {
  position:fixed;

  inset:0;

  z-index:5000;

  display:none;

  align-items:flex-end;

  background:
    rgba(0,0,0,.65);
}

.modal.show {
  display:flex;
}

.modal-box {
  width:100%;

  padding:20px;

  border-radius:
    24px
    24px
    0
    0;

  background:
    #0b1025;

  border-top:
    1px solid
    rgba(120,140,255,.18);
}

.modal-title {
  font-size:18px;
  font-weight:900;

  margin-bottom:15px;
}

.gift-grid {
  display:grid;

  grid-template-columns:
    repeat(4,1fr);

  gap:9px;
}

.gift-item {
  min-height:72px;

  border:0;

  border-radius:15px;

  background:
    rgba(30,38,75,.9);

  color:#fff;

  font-size:11px;
}

.gift-item span {
  display:block;
  font-size:25px;
  margin-bottom:3px;
}

/* =========================================================
CUSTOM PANEL
========================================================= */

.custom-box {
  margin-top:15px;

  padding:16px;

  border-radius:18px;

  background:
    rgba(14,19,43,.95);

  border:
    1px solid
    rgba(120,140,255,.12);
}

.custom-box input,
.custom-box select {
  width:100%;

  height:44px;

  margin-top:8px;

  padding:0 12px;

  border-radius:12px;

  border:
    1px solid
    rgba(120,140,255,.18);

  background:#070b1d;

  color:#fff;
}

/* =========================================================
DESKTOP
========================================================= */

@media (min-width:700px) {

  .hero-image {
    max-height:760px;
  }

  .hero-content {
    padding-left:
      max(
        30px,
        calc(
          (100vw - 1000px) / 2
        )
      );
  }

  .section {
    max-width:1000px;
    margin:auto;
  }

  .live-stage {
    max-width:900px;
    margin:auto;
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


<!-- =====================================================
 HOME
===================================================== -->

<main
  id="homePage"
  class="page active"
>

<section class="hero">

  <img
    class="hero-image"
    src="/home.png"
    alt="VoiceポタLive"
    onerror="this.style.display='none'"
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


<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 トップランキング
    </div>

    <button
      class="more-link"
      onclick="showRankingPage()"
    >
      TOP50を見る →
    </button>

  </div>

  <div
    id="rankingHorizontal"
    class="horizontal-list"
  ></div>

</section>


<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <button
      class="more-link"
      onclick="showNewcomerPage()"
    >
      全員を見る →
    </button>

  </div>

  <div
    id="newcomerHorizontal"
    class="horizontal-list"
  ></div>

</section>


<section class="section">

  <div class="section-head">

    <div class="section-title">
      🔴 配信中
    </div>

    <div class="section-sub">
      LIVE
    </div>

  </div>

  <div
    id="liveHorizontal"
    class="horizontal-list"
  ></div>

</section>

</main>


<!-- =====================================================
 RANKING PAGE
===================================================== -->

<main
  id="rankingPage"
  class="page"
>

<div class="list-page">

  <button
    class="back-button"
    onclick="goHome()"
  >
    ← ホームに戻る
  </button>

  <div class="section-title">
    🏆 トップランキング TOP50
  </div>

  <div
    id="rankingFull"
    class="full-list"
    style="margin-top:15px"
  ></div>

</div>

</main>


<!-- =====================================================
 NEWCOMER PAGE
===================================================== -->

<main
  id="newcomerPage"
  class="page"
>

<div class="list-page">

  <button
    class="back-button"
    onclick="goHome()"
  >
    ← ホームに戻る
  </button>

  <div class="section-title">
    🌱 新人ライバー
  </div>

  <div
    id="newcomerFull"
    class="full-list"
    style="margin-top:15px"
  ></div>

</div>

</main>


<!-- =====================================================
 SEARCH
===================================================== -->

<main
  id="searchPage"
  class="page"
>

<div class="list-page">

  <div class="section-title">
    🔎 配信を探す
  </div>

  <div style="margin-top:15px">

    <input
      id="searchInput"
      placeholder="ライバー名・配信タイトルを検索"
      style="
        width:100%;
        height:48px;
        border-radius:14px;
        border:1px solid rgba(120,140,255,.18);
        background:#090d20;
        color:#fff;
        padding:0 14px;
        outline:none;
      "
      oninput="searchRooms()"
    >

  </div>

  <div
    id="searchResults"
    class="full-list"
    style="margin-top:15px"
  ></div>

</div>

</main>


<!-- =====================================================
 PROFILE
===================================================== -->

<main
  id="profilePage"
  class="page"
>

<div class="list-page">

  <div class="section-title">
    👤 マイページ
  </div>

  <div class="custom-box">

    <div>
      現在のユーザー名
    </div>

    <input
      id="profileName"
      placeholder="名前"
      value="ぼた"
    >

    <button
      class="primary-button"
      style="margin-top:12px"
      onclick="saveProfile()"
    >
      保存
    </button>

  </div>

</div>

</main>


<!-- =====================================================
 NOTICE
===================================================== -->

<main
  id="noticePage"
  class="page"
>

<div class="list-page">

  <div class="section-title">
    ♧ お知らせ
  </div>

  <div class="custom-box">
    現在、お知らせはありません。
  </div>

</div>

</main>


<!-- =====================================================
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
    onclick="showSearchPage()"
  >
    <div class="nav-icon">⌕</div>
    探す
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
    onclick="startLive()"
  >
    <div class="nav-icon">🎙</div>
    配信
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
 LIVE SCREEN
===================================================== -->

<div
  id="liveScreen"
  style="display:none"
  class="live-page"
>

  <div class="live-top">

    <button onclick="closeLive()">
      ←
    </button>

    <div
      id="liveTopTitle"
      style="
        font-size:13px;
        font-weight:900;
      "
    >
      LIVE
    </div>

    <button onclick="toggleCustomPanel()">
      ⚙
    </button>

  </div>


  <section class="live-stage">

    <img
      id="liveBackground"
      class="live-background"
      style="display:none"
    >

    <div class="live-overlay">

      <div
        id="liveAvatarBig"
        class="live-avatar-big"
      >
        🌙
      </div>

      <div
        id="liveNameBig"
        class="live-name-big"
      >
        配信
      </div>

      <div
        id="liveTitleBig"
        class="live-title-big"
      >
        声でつながる、みんなの居場所。
      </div>

      <div
        id="liveStatus"
        class="live-status"
      >
        接続中...
      </div>

    </div>

    <audio
      id="remoteAudio"
      autoplay
      playsinline
    ></audio>

  </section>


  <section class="live-controls">

    <div class="control-row">

      <button
        class="action-button like"
        onclick="sendLike()"
      >
        <span class="emoji">❤️</span>
        いいね
        <span id="likeCount">0</span>
      </button>

      <button
        class="action-button gift"
        onclick="openGift()"
      >
        <span class="emoji">🎁</span>
        ギフト
      </button>

      <button
        class="action-button"
        onclick="shareLive()"
      >
        <span class="emoji">↗️</span>
        シェア
      </button>

      <button
        class="action-button block"
        onclick="blockCurrentLive()"
      >
        <span class="emoji">🚫</span>
        ブロック
      </button>

    </div>

  </section>


  <div class="live-info">

    <div id="giftResult"></div>

    <div id="viewerCount">
      👁 0人
    </div>

    <div style="margin-top:8px">
      VoiceポタLive
    </div>

  </div>


  <!-- CUSTOM -->

  <div
    id="customPanel"
    class="custom-box"
    style="
      display:none;
      margin:0 15px 25px;
    "
  >

    <div
      style="
        font-size:16px;
        font-weight:900;
      "
    >
      🎨 配信画面カスタム
    </div>

    <input
      id="customTitle"
      placeholder="配信タイトル"
    >

    <input
      id="customBackground"
      placeholder="背景画像URL（任意）"
    >

    <select id="customTheme">

      <option value="blue">
        月夜ブルー
      </option>

      <option value="purple">
        星空パープル
      </option>

      <option value="pink">
        夜桜ピンク
      </option>

      <option value="green">
        月森グリーン
      </option>

    </select>

    <button
      class="primary-button"
      style="margin-top:10px"
      onclick="applyCustom()"
    >
      カスタムを反映
    </button>

    <button
      class="secondary-button"
      style="margin-top:8px"
      onclick="toggleCustomPanel()"
    >
      閉じる
    </button>

  </div>

</div>


<!-- =====================================================
 GIFT MODAL
===================================================== -->

<div
  id="giftModal"
  class="modal"
  onclick="closeGift(event)"
>

  <div
    class="modal-box"
    onclick="event.stopPropagation()"
  >

    <div class="modal-title">
      🎁 ギフトを送る
    </div>

    <div class="gift-grid">

      <button
        class="gift-item"
        onclick="sendGift('ハート','❤️')"
      >
        <span>❤️</span>
        ハート
      </button>

      <button
        class="gift-item"
        onclick="sendGift('星','⭐')"
      >
        <span>⭐</span>
        星
      </button>

      <button
        class="gift-item"
        onclick="sendGift('月','🌙')"
      >
        <span>🌙</span>
        月
      </button>

      <button
        class="gift-item"
        onclick="sendGift('花','🌸')"
      >
        <span>🌸</span>
        花
      </button>

      <button
        class="gift-item"
        onclick="sendGift('ダイヤ','💎')"
      >
        <span>💎</span>
        ダイヤ
      </button>

      <button
        class="gift-item"
        onclick="sendGift('王冠','👑')"
      >
        <span>👑</span>
        王冠
      </button>

      <button
        class="gift-item"
        onclick="sendGift('マイク','🎤')"
      >
        <span>🎤</span>
        マイク
      </button>

      <button
        class="gift-item"
        onclick="sendGift('花火','🎆')"
      >
        <span>🎆</span>
        花火
      </button>

    </div>

    <button
      class="secondary-button"
      style="margin-top:15px"
      onclick="closeGift()"
    >
      閉じる
    </button>

  </div>

</div>


<script>

/* =========================================================
 STATE
========================================================= */

let socket = null;

let rankingData = [];
let newcomerData = [];
let liveData = [];

let currentLiveId = null;
let currentLiveIsHost = false;

let localStream = null;

let peerConnections = {};

let currentRoom = null;

let myUserId =
  localStorage.getItem("voice_bota_user_id");

if (!myUserId) {

  myUserId =
    "user-" +
    Math.random()
      .toString(36)
      .slice(2,10);

  localStorage.setItem(
    "voice_bota_user_id",
    myUserId
  );
}

let myName =
  localStorage.getItem(
    "voice_bota_name"
  ) || "ぼた";


/* =========================================================
 ESCAPE
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")

    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


/* =========================================================
 SOCKET
========================================================= */

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

    sendSocket({
      type:"request_home"
    });

  };

  socket.onmessage = event => {

    try {

      const data =
        JSON.parse(event.data);

      handleSocketMessage(data);

    } catch(error) {

      console.error(
        "Socket message error",
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


function sendSocket(data) {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

  }

}


/* =========================================================
 SOCKET MESSAGE
========================================================= */

async function handleSocketMessage(data) {

  if (
    data.type ===
    "home_data"
  ) {

    rankingData =
      data.ranking || [];

    newcomerData =
      data.newcomers || [];

    liveData =
      data.liveRooms || [];

    renderHome();

    return;
  }


  if (
    data.type ===
    "offer"
  ) {

    await receiveOffer(data);

    return;
  }


  if (
    data.type ===
    "answer"
  ) {

    const pc =
      peerConnections[data.from];

    if (pc) {

      await pc.setRemoteDescription(
        new RTCSessionDescription(
          data.answer
        )
      );

    }

    return;
  }


  if (
    data.type ===
    "ice_candidate"
  ) {

    const pc =
      peerConnections[data.from];

    if (
      pc &&
      data.candidate
    ) {

      try {

        await pc.addIceCandidate(
          new RTCIceCandidate(
            data.candidate
          )
        );

      } catch(error) {

        console.error(
          "ICE error",
          error
        );

      }

    }

    return;
  }


  if (
    data.type ===
    "viewer_joined"
  ) {

    if (currentLiveIsHost) {

      await createOfferForViewer(
        data.viewerId
      );

    }

    return;
  }


  if (
    data.type ===
    "viewer_left"
  ) {

    removePeer(
      data.viewerId
    );

    return;
  }


  if (
    data.type ===
    "live_started"
  ) {

    currentRoom =
      data.room;

    updateLiveRoomUI();

    return;
  }


  if (
    data.type ===
    "live_state"
  ) {

    currentRoom =
      data.room;

    updateLiveRoomUI();

    return;
  }


  if (
    data.type ===
    "gift"
  ) {

    const text =
      data.icon +
      " " +
      escapeHtml(data.name) +
      " が " +
      escapeHtml(data.gift) +
      " を送りました！";

    document.getElementById(
      "giftResult"
    ).innerHTML =
      text;

    return;
  }


  if (
    data.type ===
    "like"
  ) {

    if (currentRoom) {

      currentRoom.likes =
        data.likes;

      document.getElementById(
        "likeCount"
      ).textContent =
        data.likes;

    }

    return;
  }


  if (
    data.type ===
    "blocked"
  ) {

    alert(
      "この配信者をブロックしました。"
    );

    closeLive();

    return;
  }


  if (
    data.type ===
    "viewer_blocked"
  ) {

    alert(
      "配信者によってブロックされました。"
    );

    closeLive();

    return;
  }


  if (
    data.type ===
    "live_ended"
  ) {

    alert(
      "配信が終了しました。"
    );

    closeLive();

    return;
  }

}


/* =========================================================
 HOME
========================================================= */

function renderHome() {

  renderRanking();

  renderNewcomers();

  renderLiveRooms();

}


function renderRanking() {

  const box =
    document.getElementById(
      "rankingHorizontal"
    );

  box.innerHTML =
    rankingData
      .slice(0,10)
      .map((user,index) => `

        <div
          class="rank-card"
          onclick="
            openUser(
              '${escapeHtml(user.id)}'
            )
          "
        >

          <div
            class="
              rank-number
              ${index < 3 ? "top" : ""}
            "
          >
            ${index + 1}
          </div>

          <div class="avatar">
            ${escapeHtml(user.icon)}
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
            </div>

          </div>

        </div>

      `)
      .join("");

}


function renderNewcomers() {

  const box =
    document.getElementById(
      "newcomerHorizontal"
    );

  box.innerHTML =
    newcomerData
      .map(user => `

        <div
          class="new-card"
          onclick="
            openUser(
              '${escapeHtml(user.id)}'
            )
          "
        >

          <div class="new-avatar">
            ${escapeHtml(user.icon)}
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

}


function renderLiveRooms() {

  const box =
    document.getElementById(
      "liveHorizontal"
    );

  if (!liveData.length) {

    box.innerHTML = `

      <div
        style="
          padding:25px;
          color:#7883a4;
          font-size:12px;
        "
      >
        現在配信中のライバーはいません。
      </div>

    `;

    return;
  }

  box.innerHTML =
    liveData
      .map(room => `

        <div
          class="live-card"
          onclick="
            joinLive(
              '${escapeHtml(room.id)}'
            )
          "
        >

          <div class="live-label">
            LIVE
          </div>

          <div class="live-icon">
            ${escapeHtml(room.icon)}
          </div>

          <div class="live-title">
            ${escapeHtml(room.title)}
          </div>

          <div class="live-host">
            ${escapeHtml(room.hostName)}
          </div>

          <div class="live-meta">
            👁 ${room.viewers}
            &nbsp;&nbsp;
            ❤️ ${room.likes}
          </div>

        </div>

      `)
      .join("");

}


/* =========================================================
 PAGES
========================================================= */

function hidePages() {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active"
      );

    });

}


function goHome() {

  closeLive(false);

  hidePages();

  document
    .getElementById(
      "homePage"
    )
    .classList.add("active");

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


function showRankingPage() {

  hidePages();

  document
    .getElementById(
      "rankingPage"
    )
    .classList.add("active");

  renderFullRanking();

  window.scrollTo(0,0);

}


function showNewcomerPage() {

  hidePages();

  document
    .getElementById(
      "newcomerPage"
    )
    .classList.add("active");

  renderFullNewcomers();

  window.scrollTo(0,0);

}


function showSearchPage() {

  hidePages();

  document
    .getElementById(
      "searchPage"
    )
    .classList.add("active");

}


function showNotice() {

  hidePages();

  document
    .getElementById(
      "noticePage"
    )
    .classList.add("active");

}


function showProfile() {

  hidePages();

  document
    .getElementById(
      "profilePage"
    )
    .classList.add("active");

  document.getElementById(
    "profileName"
  ).value = myName;

}


/* =========================================================
 FULL RANKING
========================================================= */

function renderFullRanking() {

  const box =
    document.getElementById(
      "rankingFull"
    );

  box.innerHTML =
    rankingData
      .map((user,index) => `

        <div class="full-rank">

          <div
            class="
              rank-number
              ${index < 3 ? "top" : ""}
            "
          >
            ${index + 1}
          </div>

          <div class="avatar">
            ${escapeHtml(user.icon)}
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

          </div>

          <div class="rank-viewers">
            👁 ${Number(
              user.viewers
            ).toLocaleString()}
          </div>

        </div>

      `)
      .join("");

}


/* =========================================================
 FULL NEWCOMERS
========================================================= */

function renderFullNewcomers() {

  const box =
    document.getElementById(
      "newcomerFull"
    );

  box.innerHTML =
    newcomerData
      .map((user,index) => `

        <div class="full-rank">

          <div
            class="rank-number"
          >
            ${index + 1}
          </div>

          <div class="avatar">
            ${escapeHtml(user.icon)}
          </div>

          <div class="rank-info">

            <div class="rank-name">
              ${escapeHtml(user.name)}
            </div>

            <div class="rank-score">
              ${escapeHtml(user.title)}
            </div>

          </div>

          <div class="rank-viewers">
            👁 ${user.viewers}
          </div>

        </div>

      `)
      .join("");

}


/* =========================================================
 SEARCH
========================================================= */

function searchRooms() {

  const keyword =
    document.getElementById(
      "searchInput"
    ).value
      .trim()
      .toLowerCase();

  const box =
    document.getElementById(
      "searchResults"
    );

  const results =
    liveData.filter(room => {

      return (
        room.hostName
          .toLowerCase()
          .includes(keyword)
        ||
        room.title
          .toLowerCase()
          .includes(keyword)
      );

    });

  box.innerHTML =
    results
      .map(room => `

        <div
          class="live-card"
          onclick="
            joinLive(
              '${escapeHtml(room.id)}'
            )
          "
        >

          <div class="live-label">
            LIVE
          </div>

          <div class="live-icon">
            ${escapeHtml(room.icon)}
          </div>

          <div class="live-title">
            ${escapeHtml(room.title)}
          </div>

          <div class="live-host">
            ${escapeHtml(room.hostName)}
          </div>

        </div>

      `)
      .join("");

}


/* =========================================================
 PROFILE
========================================================= */

function saveProfile() {

  const name =
    document.getElementById(
      "profileName"
    ).value.trim();

  if (!name) return;

  myName = name;

  localStorage.setItem(
    "voice_bota_name",
    myName
  );

  alert(
    "ユーザー名を保存しました。"
  );

}


/* =========================================================
 START LIVE
========================================================= */

async function startLive() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "この端末ではマイクを使用できません。HTTPS接続を確認してください。"
    );

    return;

  }

  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({
        audio:{
          echoCancellation:true,
          noiseSuppression:true,
          autoGainControl:true
        },
        video:false
      });

  } catch(error) {

    console.error(error);

    alert(
      "マイクへのアクセスが許可されていません。"
    );

    return;

  }


  currentLiveIsHost = true;

  currentLiveId =
    createClientLiveId();

  currentRoom = {
    id:currentLiveId,
    hostId:myUserId,
    hostName:myName,
    title:"新しい配信",
    icon:"🌙",
    theme:"blue",
    background:"",
    viewers:0,
    likes:0,
    gifts:0
  };


  sendSocket({

    type:"start_live",

    liveId:currentLiveId,

    hostId:myUserId,

    hostName:myName,

    title:"新しい配信",

    icon:"🌙",

    theme:"blue",

    background:""

  });


  openLiveScreen();

  updateLiveRoomUI();

}


function createClientLiveId() {

  return (
    "live-" +
    Math.random()
      .toString(36)
      .slice(2,10)
  );

}


/* =========================================================
 JOIN LIVE
========================================================= */

function joinLive(roomId) {

  const room =
    liveData.find(
      r => r.id === roomId
    );

  if (!room) {

    alert(
      "この配信は終了しています。"
    );

    return;

  }

  currentLiveIsHost = false;

  currentLiveId = room.id;

  currentRoom = room;

  openLiveScreen();

  updateLiveRoomUI();


  sendSocket({

    type:"join_live",

    liveId:room.id,

    viewerId:myUserId,

    viewerName:myName

  });

}


/* =========================================================
 OPEN LIVE
========================================================= */

function openLiveScreen() {

  document
    .querySelector(".app")
    .style.display = "none";

  document
    .getElementById(
      "liveScreen"
    )
    .style.display = "block";

}


function closeLive(sendStop = true) {

  if (
    currentLiveIsHost &&
    sendStop &&
    currentLiveId
  ) {

    sendSocket({

      type:"stop_live",

      liveId:currentLiveId

    });

  }


  for (
    const id in peerConnections
  ) {

    try {

      peerConnections[id].close();

    } catch {}

  }

  peerConnections = {};


  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        track.stop();

      });

    localStream = null;

  }


  if (
    !currentLiveIsHost &&
    currentLiveId
  ) {

    sendSocket({

      type:"leave_live",

      liveId:currentLiveId,

      viewerId:myUserId

    });

  }


  currentLiveId = null;

  currentLiveIsHost = false;

  currentRoom = null;


  document
    .getElementById(
      "liveScreen"
    )
    .style.display = "none";

  document
    .querySelector(".app")
    .style.display = "block";

  goHome();

}


/* =========================================================
 UPDATE LIVE UI
========================================================= */

function updateLiveRoomUI() {

  if (!currentRoom) return;

  document.getElementById(
    "liveTopTitle"
  ).textContent =
    currentRoom.title ||
    "LIVE";

  document.getElementById(
    "liveAvatarBig"
  ).textContent =
    currentRoom.icon ||
    "🌙";

  document.getElementById(
    "liveNameBig"
  ).textContent =
    currentRoom.hostName ||
    "配信者";

  document.getElementById(
    "liveTitleBig"
  ).textContent =
    currentRoom.title ||
    "";

  document.getElementById(
    "likeCount"
  ).textContent =
    currentRoom.likes || 0;

  document.getElementById(
    "viewerCount"
  ).textContent =
    "👁 " +
    (currentRoom.viewers || 0) +
    "人";


  applyTheme(
    currentRoom.theme
  );


  const bg =
    document.getElementById(
      "liveBackground"
    );

  if (
    currentRoom.background
  ) {

    bg.src =
      currentRoom.background;

    bg.style.display =
      "block";

  } else {

    bg.removeAttribute("src");

    bg.style.display =
      "none";

  }


  document.getElementById(
    "liveStatus"
  ).textContent =
    currentLiveIsHost
      ? "🎙 配信中"
      : "🔊 音声に接続しています...";

}


/* =========================================================
 THEME
========================================================= */

function applyTheme(theme) {

  const stage =
    document.querySelector(
      ".live-stage"
    );

  if (!stage) return;

  const themes = {

    blue:
      "radial-gradient(circle at center,#17245d,#030510 70%)",

    purple:
      "radial-gradient(circle at center,#49245d,#030510 70%)",

    pink:
      "radial-gradient(circle at center,#5d2447,#030510 70%)",

    green:
      "radial-gradient(circle at center,#174d42,#030510 70%)"

  };

  stage.style.background =
    themes[theme] ||
    themes.blue;

}


/* =========================================================
 WEBRTC HOST
========================================================= */

async function createOfferForViewer(
  viewerId
) {

  if (!localStream) return;

  const pc =
    new RTCPeerConnection({
      iceServers:[
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


  peerConnections[viewerId] =
    pc;


  localStream
    .getTracks()
    .forEach(track => {

      pc.addTrack(
        track,
        localStream
      );

    });


  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        sendSocket({

          type:"ice_candidate",

          to:viewerId,

          from:myUserId,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    () => {

      console.log(
        "Host peer state:",
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

        removePeer(
          viewerId
        );

      }

    };


  const offer =
    await pc.createOffer({
      offerToReceiveAudio:false,
      offerToReceiveVideo:false
    });


  await pc.setLocalDescription(
    offer
  );


  sendSocket({

    type:"offer",

    to:viewerId,

    from:myUserId,

    offer:pc.localDescription

  });

}


/* =========================================================
 WEBRTC VIEWER
========================================================= */

async function receiveOffer(data) {

  const pc =
    new RTCPeerConnection({
      iceServers:[
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


  peerConnections[data.from] =
    pc;


  pc.ontrack =
    event => {

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

        audio.muted = false;

        audio.volume = 1;

        audio.play()
          .then(() => {

            document.getElementById(
              "liveStatus"
            ).textContent =
              "🔊 音声配信中";

          })
          .catch(error => {

            console.log(
              "Autoplay blocked",
              error
            );

            document.getElementById(
              "liveStatus"
            ).textContent =
              "🔊 画面をタップすると音声が再生されます";

          });

      }

    };


  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        sendSocket({

          type:"ice_candidate",

          to:data.from,

          from:myUserId,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    () => {

      console.log(
        "Viewer peer state:",
        pc.connectionState
      );

      if (
        pc.connectionState ===
        "connected"
      ) {

        document.getElementById(
          "liveStatus"
        ).textContent =
          "🔊 音声配信中";

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


  sendSocket({

    type:"answer",

    to:data.from,

    from:myUserId,

    answer:
      pc.localDescription

  });

}


/* =========================================================
 PEER REMOVE
========================================================= */

function removePeer(id) {

  if (
    peerConnections[id]
  ) {

    try {

      peerConnections[id].close();

    } catch {}

    delete peerConnections[id];

  }

}


/* =========================================================
 LIKE
========================================================= */

function sendLike() {

  if (!currentLiveId) return;

  sendSocket({

    type:"like",

    liveId:currentLiveId,

    userId:myUserId,

    userName:myName

  });

}


/* =========================================================
 GIFT
========================================================= */

function openGift() {

  document
    .getElementById(
      "giftModal"
    )
    .classList.add("show");

}


function closeGift() {

  document
    .getElementById(
      "giftModal"
    )
    .classList.remove("show");

}


function sendGift(
  name,
  icon
) {

  if (!currentLiveId) return;

  sendSocket({

    type:"gift",

    liveId:currentLiveId,

    userId:myUserId,

    userName:myName,

    gift:name,

    icon

  });

  closeGift();

}


/* =========================================================
 BLOCK
========================================================= */

function blockCurrentLive() {

  if (!currentLiveId) return;

  if (
    !confirm(
      "この配信者をブロックしますか？"
    )
  ) {

    return;

  }

  sendSocket({

    type:"block",

    liveId:currentLiveId,

    userId:myUserId,

    userName:myName

  });

}


/* =========================================================
 SHARE
========================================================= */

async function shareLive() {

  const url =
    location.origin +
    "/?live=" +
    encodeURIComponent(
      currentLiveId || ""
    );

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:"VoiceポタLive",
        text:"配信を見てね！",
        url
      });

    } catch {}

  } else {

    try {

      await navigator.clipboard.writeText(
        url
      );

      alert(
        "配信URLをコピーしました。"
      );

    } catch {

      alert(url);

    }

  }

}


/* =========================================================
 CUSTOM
========================================================= */

function toggleCustomPanel() {

  const panel =
    document.getElementById(
      "customPanel"
    );

  panel.style.display =
    panel.style.display === "none"
      ? "block"
      : "none";

}


function applyCustom() {

  if (!currentLiveIsHost) {

    alert(
      "配信者のみ変更できます。"
    );

    return;

  }


  const title =
    document.getElementById(
      "customTitle"
    ).value.trim();

  const background =
    document.getElementById(
      "customBackground"
    ).value.trim();

  const theme =
    document.getElementById(
      "customTheme"
    ).value;


  currentRoom.title =
    title ||
    "新しい配信";

  currentRoom.background =
    background;

  currentRoom.theme =
    theme;


  sendSocket({

    type:"update_live",

    liveId:currentLiveId,

    title:
      currentRoom.title,

    background,

    theme

  });


  updateLiveRoomUI();

  alert(
    "配信画面を更新しました。"
  );

}


/* =========================================================
 OPEN USER
========================================================= */

function openUser(id) {

  const room =
    liveData.find(
      r => r.hostId === id
    );

  if (room) {

    joinLive(room.id);

    return;

  }

  alert(
    "このライバーは現在配信していません。"
  );

}


/* =========================================================
 START
========================================================= */

connectSocket();


/* =========================================================
 URL LIVE
========================================================= */

window.addEventListener(
  "load",
  () => {

    const params =
      new URLSearchParams(
        location.search
      );

    const live =
      params.get("live");

    if (live) {

      setTimeout(
        () => {

          joinLive(live);

        },
        1000
      );

    }

  }
);

</script>

</body>
</html>
`;


/* =========================================================
 HTTP SERVER
========================================================= */

const server =
  http.createServer(
    (req,res) => {

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


/* =========================================================
 WEBSOCKET
========================================================= */

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

    ws.userId = null;
    ws.userName = null;
    ws.liveId = null;
    ws.isHost = false;


    console.log(
      "WebSocket connected"
    );


    send(
      ws,
      getHomeData()
    );


    ws.on(
      "message",
      raw => {

        try {

          const data =
            JSON.parse(
              raw.toString()
            );

          handleSocketServer(
            ws,
            data
          );

        } catch(error) {

          console.error(
            "WS message error:",
            error
          );

        }

      }
    );


    ws.on(
      "close",
      () => {

        handleDisconnect(
          ws
        );

        clients.delete(ws);

        console.log(
          "WebSocket disconnected"
        );

      }
    );


    ws.on(
      "error",
      error => {

        console.error(
          "WebSocket error:",
          error.message
        );

      }
    );

  }
);


/* =========================================================
 SERVER SOCKET HANDLER
========================================================= */

function handleSocketServer(
  ws,
  data
) {

  switch(data.type) {


    /* -----------------------------------------------
       HOME
    ----------------------------------------------- */

    case "request_home":

      send(
        ws,
        getHomeData()
      );

      break;


    /* -----------------------------------------------
       START LIVE
    ----------------------------------------------- */

    case "start_live":

      startLiveRoom(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       JOIN LIVE
    ----------------------------------------------- */

    case "join_live":

      joinLiveRoom(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       LEAVE LIVE
    ----------------------------------------------- */

    case "leave_live":

      leaveLiveRoom(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       STOP LIVE
    ----------------------------------------------- */

    case "stop_live":

      stopLiveRoom(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       OFFER
    ----------------------------------------------- */

    case "offer":

      relayToUser(
        data.to,
        {
          type:"offer",
          from:data.from,
          offer:data.offer
        }
      );

      break;


    /* -----------------------------------------------
       ANSWER
    ----------------------------------------------- */

    case "answer":

      relayToUser(
        data.to,
        {
          type:"answer",
          from:data.from,
          answer:data.answer
        }
      );

      break;


    /* -----------------------------------------------
       ICE
    ----------------------------------------------- */

    case "ice_candidate":

      relayToUser(
        data.to,
        {
          type:"ice_candidate",
          from:data.from,
          candidate:data.candidate
        }
      );

      break;


    /* -----------------------------------------------
       LIKE
    ----------------------------------------------- */

    case "like":

      handleLike(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       GIFT
    ----------------------------------------------- */

    case "gift":

      handleGift(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       BLOCK
    ----------------------------------------------- */

    case "block":

      handleBlock(
        ws,
        data
      );

      break;


    /* -----------------------------------------------
       CUSTOM
    ----------------------------------------------- */

    case "update_live":

      updateLiveRoom(
        ws,
        data
      );

      break;

  }

}


/* =========================================================
 START ROOM
========================================================= */

function startLiveRoom(
  ws,
  data
) {

  if (
    liveRooms.has(
      data.liveId
    )
  ) {

    send(
      ws,
      {
        type:"error",
        message:"この配信IDは使用中です。"
      }
    );

    return;

  }


  ws.userId =
    data.hostId ||
    createId("host");

  ws.userName =
    data.hostName ||
    "配信者";

  ws.liveId =
    data.liveId;

  ws.isHost = true;


  const room = {

    id:data.liveId,

    hostId:ws.userId,

    hostName:ws.userName,

    hostSocket:ws,

    title:
      data.title ||
      "新しい配信",

    icon:
      data.icon ||
      "🌙",

    theme:
      data.theme ||
      "blue",

    background:
      data.background ||
      "",

    viewers:new Map(),

    likes:0,

    gifts:0,

    startedAt:
      Date.now()

  };


  liveRooms.set(
    room.id,
    room
  );


  send(
    ws,
    {
      type:"live_started",
      room:
        publicLiveRoom(room)
    }
  );


  broadcastHome();

  console.log(
    "LIVE START:",
    room.id
  );

}


/* =========================================================
 JOIN ROOM
========================================================= */

function joinLiveRoom(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );


  if (!room) {

    send(
      ws,
      {
        type:"live_ended"
      }
    );

    return;

  }


  ws.userId =
    data.viewerId ||
    createId("viewer");

  ws.userName =
    data.viewerName ||
    "視聴者";

  ws.liveId =
    room.id;

  ws.isHost = false;


  room.viewers.set(
    ws.userId,
    {
      id:ws.userId,
      name:ws.userName,
      socket:ws
    }
  );


  send(
    ws,
    {
      type:"live_state",
      room:
        publicLiveRoom(room)
    }
  );


  send(
    room.hostSocket,
    {
      type:"viewer_joined",
      viewerId:ws.userId,
      viewerName:ws.userName
    }
  );


  broadcastRoom(
    room,
    {
      type:"live_state",
      room:
        publicLiveRoom(room)
    }
  );


  broadcastHome();

  console.log(
    "VIEWER JOIN:",
    ws.userId,
    room.id
  );

}


/* =========================================================
 LEAVE ROOM
========================================================= */

function leaveLiveRoom(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );

  if (!room) return;


  room.viewers.delete(
    data.viewerId ||
    ws.userId
  );


  send(
    room.hostSocket,
    {
      type:"viewer_left",
      viewerId:
        data.viewerId ||
        ws.userId
    }
  );


  broadcastRoom(
    room,
    {
      type:"live_state",
      room:
        publicLiveRoom(room)
    }
  );


  broadcastHome();

}


/* =========================================================
 STOP ROOM
========================================================= */

function stopLiveRoom(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );


  if (!room) return;


  if (
    room.hostSocket !== ws
  ) {

    return;

  }


  for (
    const viewer
    of room.viewers.values()
  ) {

    send(
      viewer.socket,
      {
        type:"live_ended"
      }
    );

  }


  liveRooms.delete(
    room.id
  );


  broadcastHome();


  console.log(
    "LIVE END:",
    room.id
  );

}


/* =========================================================
 LIKE
========================================================= */

function handleLike(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );

  if (!room) return;


  room.likes++;


  broadcastRoom(
    room,
    {
      type:"like",
      likes:room.likes
    }
  );


  broadcastHome();

}


/* =========================================================
 GIFT
========================================================= */

function handleGift(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );

  if (!room) return;


  room.gifts++;


  broadcastRoom(
    room,
    {
      type:"gift",

      name:
        data.userName ||
        "視聴者",

      gift:
        data.gift ||
        "ギフト",

      icon:
        data.icon ||
        "🎁",

      gifts:
        room.gifts
    }
  );


  broadcastHome();

}


/* =========================================================
 BLOCK
========================================================= */

function handleBlock(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );

  if (!room) return;


  /*
    視聴者がブロックを押した場合
    → 自分側でその配信を閉じる
  */

  if (!ws.isHost) {

    send(
      ws,
      {
        type:"blocked"
      }
    );

    return;

  }


  /*
    配信者側からのブロック
  */

  const viewer =
    room.viewers.get(
      data.userId
    );


  if (viewer) {

    send(
      viewer.socket,
      {
        type:"viewer_blocked"
      }
    );


    room.viewers.delete(
      data.userId
    );


    send(
      room.hostSocket,
      {
        type:"viewer_left",
        viewerId:data.userId
      }
    );

  }


  broadcastRoom(
    room,
    {
      type:"live_state",
      room:
        publicLiveRoom(room)
    }
  );

}


/* =========================================================
 UPDATE ROOM
========================================================= */

function updateLiveRoom(
  ws,
  data
) {

  const room =
    liveRooms.get(
      data.liveId
    );

  if (!room) return;


  if (
    room.hostSocket !== ws
  ) {

    return;

  }


  if (
    typeof data.title ===
    "string"
  ) {

    room.title =
      data.title
        .slice(0,80);

  }


  if (
    typeof data.background ===
    "string"
  ) {

    room.background =
      data.background
        .slice(0,1000);

  }


  if (
    typeof data.theme ===
    "string"
  ) {

    room.theme =
      data.theme;

  }


  broadcastRoom(
    room,
    {
      type:"live_state",
      room:
        publicLiveRoom(room)
    }
  );


  broadcastHome();

}


/* =========================================================
 RELAY
========================================================= */

function relayToUser(
  userId,
  message
) {

  for (
    const ws
    of clients
  ) {

    if (
      ws.userId === userId
    ) {

      send(
        ws,
        message
      );

      return;

    }

  }

}


/* =========================================================
 DISCONNECT
========================================================= */

function handleDisconnect(
  ws
) {

  if (
    ws.isHost &&
    ws.liveId
  ) {

    const room =
      liveRooms.get(
        ws.liveId
      );


    if (room) {

      for (
        const viewer
        of room.viewers.values()
      ) {

        send(
          viewer.socket,
          {
            type:"live_ended"
          }
        );

      }


      liveRooms.delete(
        room.id
      );

      broadcastHome();

    }

    return;

  }


  if (
    ws.liveId &&
    ws.userId
  ) {

    const room =
      liveRooms.get(
        ws.liveId
      );


    if (room) {

      room.viewers.delete(
        ws.userId
      );


      send(
        room.hostSocket,
        {
          type:"viewer_left",
          viewerId:ws.userId
        }
      );


      broadcastRoom(
        room,
        {
          type:"live_state",
          room:
            publicLiveRoom(room)
        }
      );


      broadcastHome();

    }

  }

}


/* =========================================================
 START SERVER
========================================================= */

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "VoiceポタLive STARTED"
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
      "================================="
    );

  }
);
