const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

/*
  VoiceボタLive - stable integrated version
  - WebRTC audio path kept from the previously working low-latency version
  - Home / TOP50 / 新人ライバー pages
  - Horizontal ranking previews (10 entries)
  - Live screen: gift / like / block / custom image
  - Comments
  - Images use object-fit:contain so they are never cropped
*/

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// public/home.png
const HERO_IMAGE_URL = "/home.png";

const RANK_IMAGES = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=700&q=85"
];

const HERO_COPY =
  "声でつながる、みんなの居場所。";

const HERO_TITLE =
  "あなたの声が、誰かの夜を照らす。";

const names = [
  "月夜ぼた",
  "蒼い月",
  "花音",
  "夜空りん",
  "ミルキー",
  "星乃こえ",
  "しずく",
  "月灯り",
  "あかね",
  "みお",
  "ルナ",
  "そらね",
  "ゆら",
  "ひなた",
  "ことは",
  "あお",
  "みつき",
  "ほたる",
  "しおん",
  "りつ",
  "ねむ",
  "すず",
  "こはる",
  "あんず",
  "つむぎ",
  "なぎ",
  "ひかり",
  "さくら",
  "ゆめ",
  "かえで",
  "みなと",
  "れん",
  "あいり",
  "ゆき",
  "ましろ",
  "うた",
  "りお",
  "こよみ",
  "かなで",
  "なな",
  "つき",
  "こまち",
  "あおい",
  "すみれ",
  "ちさ",
  "えま",
  "ゆう",
  "りんね",
  "ほのか",
  "せな"
];

const top50 = names.map((name, i) => ({
  rank: i + 1,
  name,
  viewers: Math.max(8, 1680 - i * 27),
  likes: Math.max(30, 9800 - i * 91),
  image: RANK_IMAGES[i % RANK_IMAGES.length],
  live: i < 12,
  room: "月光花の部屋"
}));

const newcomers = Array.from({ length: 30 }, (_, i) => ({
  rank: i + 1,
  name:
    [
      "新人ぼた",
      "はじめまして月",
      "ことり声",
      "新人ルナ",
      "初配信あお",
      "夜ふかし新人",
      "新人かなで",
      "星くず",
      "新人しずく",
      "月見うた"
    ][i % 10] + (i >= 10 ? i + 1 : ""),
  viewers: Math.max(1, 220 - i * 6),
  likes: Math.max(10, 1300 - i * 31),
  image: RANK_IMAGES[(i + 3) % RANK_IMAGES.length],
  live: i < 6,
  room: "新人ライバーの部屋"
}));

const HTML = `<!doctype html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<title>VoiceボタLive</title>

<style>

* {
  box-sizing: border-box;
}

:root {
  --bg: #050713;
  --panel: #0d1125;
  --panel2: #121938;
  --line: #282d55;
  --text: #fff;
  --muted: #9da6c9;
  --blue: #4fc8ff;
  --violet: #8d67ff;
  --pink: #f14cff;
  --danger: #ff426d;
  --green: #63f7ae;
}

html,
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Arial, "Noto Sans JP", sans-serif;
}

body {
  min-height: 100vh;
  overflow-x: hidden;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.hidden {
  display: none !important;
}

#app {
  min-height: 100vh;
  padding-bottom: 92px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 62px;
  padding: 0 16px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  background: rgba(5, 7, 19, 0.92);
  backdrop-filter: blur(18px);

  border-bottom: 1px solid rgba(255,255,255,.07);
}

.brand {
  font-size: 21px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #fff,
      #5bd6ff,
      #cf74ff
    );

  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.online {
  font-size: 11px;
  color: #8fffc0;

  display: flex;
  gap: 6px;
  align-items: center;
}

.online i {
  width: 7px;
  height: 7px;
  border-radius: 50%;

  background: #5dffab;

  box-shadow:
    0 0 12px #5dffab;
}

.page {
  max-width: 760px;
  margin: auto;
  padding: 12px 12px 30px;
}

.hero {
  position: relative;
  overflow: hidden;

  border-radius: 28px;
  min-height: 560px;

  background: #070914;

  border: 1px solid #2a2e58;

  box-shadow:
    0 20px 70px rgba(52,60,170,.22);
}

.hero-img-wrap {
  position: absolute;
  inset: 0;

  background: #02030a;

  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-img {
  width: 100%;
  height: 100%;

  object-fit: contain;
  object-position: center;

  display: block;

  opacity: .78;
}

.hero-shade {
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.08) 15%,
      rgba(2,4,15,.25) 45%,
      rgba(2,3,10,.96) 100%
    );
}

.hero-content {
  position: relative;
  z-index: 2;

  min-height: 560px;

  padding: 32px 22px 25px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pill {
  align-self: flex-start;

  padding: 7px 11px;

  border: 1px solid rgba(130,205,255,.35);

  border-radius: 999px;

  background: rgba(10,20,50,.58);

  font-size: 11px;
}

.hero h1 {
  font-size: 42px;
  line-height: 1.05;

  margin: 14px 0 8px;

  letter-spacing: -1.5px;
}

.hero .sub {
  font-size: 14px;
  color: #d8dcf3;
  letter-spacing: 1px;
}

.hero .copy {
  font-size: 27px;
  line-height: 1.4;

  font-weight: 900;

  margin-top: 16px;
}

.hero .desc {
  color: #c2c7dc;

  font-size: 12px;
  line-height: 1.8;

  margin-top: 10px;
}

.primary,
.secondary {
  width: 100%;

  border-radius: 17px;

  padding: 15px;

  margin-top: 14px;

  font-weight: 900;
}

.primary {
  border: 0;

  color: #fff;

  background:
    linear-gradient(
      90deg,
      #13caff,
      #7564ff,
      #df4cff
    );

  box-shadow:
    0 12px 30px rgba(109,73,255,.3);
}

.secondary {
  color: #eee;

  border: 1px solid #41466e;

  background: rgba(10,13,30,.75);
}

.section {
  margin-top: 22px;
}

.section-head {
  display: flex;

  justify-content: space-between;
  align-items: center;

  margin: 0 4px 10px;
}

.section-title {
  font-size: 20px;
  font-weight: 900;
}

.more {
  font-size: 12px;
  color: #b28cff;

  background: none;
  border: 0;
}

.scroller {
  display: flex;

  gap: 10px;

  overflow-x: auto;

  padding: 2px 2px 10px;

  scroll-snap-type: x proximity;
}

.scroller::-webkit-scrollbar {
  display: none;
}

.rank-card {
  flex: 0 0 112px;

  scroll-snap-align: start;

  border-radius: 17px;

  overflow: hidden;

  background:
    linear-gradient(
      145deg,
      #151b3c,
      #0c1024
    );

  border: 1px solid #272d55;

  position: relative;
}

.rank-img {
  width: 100%;
  height: 128px;

  display: block;

  object-fit: contain;

  background: #05060d;
}

.rank-body {
  padding: 8px;
}

.rank-no {
  font-size: 10px;
  color: #aeb5d2;
}

.rank-name {
  font-size: 12px;
  font-weight: 900;

  margin-top: 2px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-meta {
  font-size: 9px;

  color: #9199ba;

  margin-top: 4px;
}

.live-pill {
  position: absolute;

  top: 7px;
  left: 7px;

  background: #f02c7d;
  color: #fff;

  padding: 4px 7px;

  border-radius: 999px;

  font-size: 8px;

  font-weight: 900;
}

.features {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 10px;

  margin-top: 18px;
}

.feature {
  padding: 15px;

  border-radius: 18px;

  background: #0d1127;

  border: 1px solid #24294e;
}

.feature b {
  font-size: 13px;
}

.feature p {
  font-size: 10px;

  color: #8f98ba;

  line-height: 1.6;

  margin: 6px 0 0;
}

.bottom-nav {
  position: fixed;

  z-index: 100;

  left: 0;
  right: 0;
  bottom: 0;

  height: 78px;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  align-items: center;

  background:
    rgba(5,7,19,.95);

  backdrop-filter: blur(18px);

  border-top:
    1px solid rgba(255,255,255,.08);

  padding-bottom:
    env(safe-area-inset-bottom);
}

.nav-item {
  background: none;

  border: 0;

  color: #7f88ad;

  font-size: 10px;

  font-weight: 700;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 4px;
}

.nav-item.active {
  color: #bd8cff;
}

.nav-icon {
  font-size: 21px;
}

.nav-center {
  width: 54px;
  height: 54px;

  margin-top: -26px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  background:
    linear-gradient(
      145deg,
      #30d2ff,
      #7766ff,
      #e34cff
    );

  border: 3px solid #111632;

  box-shadow:
    0 0 28px rgba(111,91,255,.65);

  font-size: 24px;

  color: #fff;
}

.page-view {
  padding-top: 4px;
}

.back {
  border: 0;

  background: none;

  color: #b18bff;

  padding: 8px 0;

  font-weight: 900;
}

.list-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 10px;
}

.list-card {
  border:
    1px solid #282d55;

  border-radius: 18px;

  overflow: hidden;

  background: #0d1127;
}

.list-card img {
  width: 100%;
  height: 160px;

  object-fit: contain;

  background: #05060d;

  display: block;
}

.list-card .lb {
  padding: 10px;
}

.list-card .nm {
  font-weight: 900;
}

.list-card .sm {
  font-size: 10px;

  color: #9099b8;

  margin-top: 4px;
}

.live-screen {
  position: fixed;

  inset: 0;

  z-index: 200;

  background: #02030a;

  color: #fff;

  overflow: auto;

  padding-bottom: 28px;
}

.live-top {
  height: 58px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 0 14px;

  position: sticky;

  top: 0;

  z-index: 3;

  background:
    rgba(0,0,0,.72);

  backdrop-filter: blur(14px);
}

.live-title {
  font-weight: 900;
}

.live-dot {
  color: #ff4d91;

  font-size: 11px;

  font-weight: 900;
}

.live-media {
  width: 100%;

  height:
    min(68vh,620px);

  background: #000;

  display: flex;

  align-items: center;

  justify-content: center;

  border-bottom:
    1px solid #1d2140;
}

.live-media img {
  width: 100%;
  height: 100%;

  object-fit: contain;

  display: block;
}

.live-info {
  padding: 13px 14px;
}

.host-name {
  font-size: 19px;
  font-weight: 900;
}

.viewers {
  font-size: 11px;

  color: #9da6c9;

  margin-top: 3px;
}

.tagline {
  color: #c7cbe0;

  font-size: 12px;

  line-height: 1.7;

  margin-top: 10px;
}

.actions {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;

  margin-top: 13px;
}

.action {
  border: 0;

  border-radius: 14px;

  padding: 12px 6px;

  font-weight: 900;

  color: #fff;

  background: #151a38;
}

.action.gift {
  background:
    linear-gradient(
      90deg,
      #ff3d9b,
      #ff5c5c
    );
}

.action.like {
  background:
    linear-gradient(
      90deg,
      #ff425f,
      #ff78a5
    );
}

.action.block {
  background: #2a0e1a;
}

.count {
  font-size: 10px;

  opacity: .85;

  margin-left: 3px;
}

.custom-panel {
  margin-top: 12px;

  padding: 12px;

  border-radius: 16px;

  background: #0d1128;

  border:
    1px solid #252a4d;
}

.custom-panel h3 {
  font-size: 13px;

  margin: 0 0 8px;
}

.custom-row {
  display: flex;

  gap: 7px;
}

.custom-row input {
  min-width: 0;

  flex: 1;

  border:
    1px solid #343a63;

  background: #070914;

  color: #fff;

  border-radius: 11px;

  padding: 10px;

  font-size: 11px;
}

.small-btn {
  border: 0;

  border-radius: 11px;

  padding: 0 12px;

  background: #7564ff;

  color: #fff;

  font-weight: 900;
}

.stop-live {
  width: 100%;

  border: 0;

  border-radius: 14px;

  padding: 14px;

  margin-top: 12px;

  background:
    linear-gradient(
      90deg,
      #ff477c,
      #a845ff
    );

  color: #fff;

  font-weight: 900;
}

.audio-on {
  width: 100%;

  border: 0;

  border-radius: 14px;

  padding: 14px;

  margin-top: 10px;

  background: #ffbf3e;

  color: #1c1200;

  font-weight: 900;
}

.gift-panel {
  position: fixed;

  left: 10px;
  right: 10px;

  bottom: 88px;

  z-index: 220;

  padding: 12px;

  border-radius: 20px;

  background:
    rgba(12,15,34,.98);

  border:
    1px solid #3a3f6b;

  box-shadow:
    0 20px 60px rgba(0,0,0,.5);
}

.gift-grid {
  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  gap: 8px;
}

.gift-btn {
  border: 0;

  border-radius: 14px;

  padding: 10px 3px;

  background: #171c3d;

  color: #fff;
}

.gift-btn b {
  display: block;

  font-size: 22px;
}

.gift-btn span {
  font-size: 9px;
}

.status {
  margin-top: 10px;

  padding: 10px;

  border-radius: 12px;

  background: #0d1229;

  border:
    1px solid #252b50;

  color: #aab2d0;

  text-align: center;

  font-size: 11px;
}

.comments {
  margin-top: 14px;

  border:
    1px solid #252b50;

  background: #080b18;

  border-radius: 16px;

  padding: 10px;
}

.comments-title {
  font-size: 12px;

  font-weight: 900;

  margin-bottom: 8px;
}

.comment-list {
  height: 150px;

  overflow: auto;

  display: flex;

  flex-direction: column;

  gap: 6px;
}

.comment {
  font-size: 11px;

  color: #eef1ff;

  line-height: 1.45;
}

.comment b {
  color: #9fc9ff;
}

.comment-form {
  display: flex;

  gap: 7px;

  margin-top: 8px;
}

.comment-form input {
  min-width: 0;

  flex: 1;

  border:
    1px solid #343a63;

  background: #05060d;

  color: #fff;

  border-radius: 11px;

  padding: 11px;

  font-size: 12px;
}

.comment-form button {
  border: 0;

  border-radius: 11px;

  padding: 0 14px;

  background:
    linear-gradient(
      90deg,
      #20caff,
      #7866ff
    );

  color: #fff;

  font-weight: 900;
}

.log {
  margin: 10px 14px;

  padding: 10px;

  background: #05060d;

  border-radius: 12px;

  min-height: 60px;

  max-height: 140px;

  overflow: auto;

  color: #75ffc1;

  font-size: 10px;

  white-space: pre-wrap;
}

@media(min-width:650px) {

  .hero h1 {
    font-size: 58px;
  }

  .hero-content {
    padding: 45px 38px;
  }

  .list-grid {
    grid-template-columns:
      repeat(4, 1fr);
  }

  .rank-card {
    flex-basis: 140px;
  }

  .rank-img {
    height: 160px;
  }

}

</style>

</head>

<body>

<div id="app">

<header class="topbar">

  <div class="brand">
    VoiceボタLive
  </div>

  <div class="online">
    <i></i>
    オンライン
  </div>

</header>


<main class="page" id="homePage">

<section class="hero">

  <div class="hero-img-wrap">

    <img
      class="hero-img"
      src="${HERO_IMAGE_URL}"
      alt=""
    >

    <div class="hero-shade"></div>

  </div>


  <div class="hero-content">

    <div class="pill">
      🌙 月光花 × Voice
    </div>

    <h1>
      VoiceボタLive
    </h1>

    <div class="sub">
      ${HERO_COPY}
    </div>

    <div class="copy">
      ${HERO_TITLE}
    </div>

    <div class="desc">
      月明かりの下で、話して、聴いて、笑って。<br>
      VoiceボタLiveで、あなたの声をもっと近くに。
    </div>

    <button
      class="primary"
      onclick="startHost()"
    >
      🎙️ 配信をはじめる
    </button>

    <button
      class="secondary"
      onclick="startViewer()"
    >
      👂 ライブを聴いてみる
    </button>

  </div>

</section>


<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 人気トップ50
    </div>

    <button
      class="more"
      onclick="openPage('top50')"
    >
      TOP 50 ›
    </button>

  </div>

  <div
    class="scroller"
    id="topPreview"
  ></div>

</section>


<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <button
      class="more"
      onclick="openPage('newcomers')"
    >
      新人をもっと見る ›
    </button>

  </div>

  <div
    class="scroller"
    id="newPreview"
  ></div>

</section>


<section class="features">

  <div class="feature">
    <b>🎙️ 高音質音声</b>
    <p>
      前に音声が聞こえていたWebRTC経路をそのまま使用。
    </p>
  </div>

  <div class="feature">
    <b>⚡ 低遅延</b>
    <p>
      Opusと受信側の低遅延設定を維持。
    </p>
  </div>

  <div class="feature">
    <b>🎁 ギフト・いいね</b>
    <p>
      ライブ中にリアルタイムで送信。
    </p>
  </div>

  <div class="feature">
    <b>🚫 ブロック</b>
    <p>
      視聴者側から配信者をブロック。
    </p>
  </div>

</section>

</main>


<main
  class="page page-view hidden"
  id="listPage"
>

  <button
    class="back"
    onclick="openPage('home')"
  >
    ‹ ホームへ戻る
  </button>

  <h2 id="listTitle"></h2>

  <div
    class="list-grid"
    id="listGrid"
  ></div>

</main>


<nav class="bottom-nav">

  <button
    class="nav-item active"
    onclick="openPage('home')"
  >
    <span class="nav-icon">⌂</span>
    ホーム
  </button>

  <button
    class="nav-item"
    onclick="document.getElementById('topPreview').scrollIntoView({behavior:'smooth'})"
  >
    <span class="nav-icon">⌕</span>
    探す
  </button>

  <button
    class="nav-item"
    onclick="startHost()"
  >
    <span class="nav-center">
      🎙️
    </span>
    配信
  </button>

  <button
    class="nav-item"
    onclick="alert('お知らせは準備中です')"
  >
    <span class="nav-icon">♧</span>
    お知らせ
  </button>

  <button
    class="nav-item"
    onclick="alert('マイページは準備中です')"
  >
    <span class="nav-icon">♙</span>
    マイページ
  </button>

</nav>

</div>


<div
  id="liveScreen"
  class="live-screen hidden"
>

  <div class="live-top">

    <button
      class="back"
      style="color:#fff"
      onclick="closeLive()"
    >
      ✕
    </button>

    <div class="live-title">
      あなたの配信
    </div>

    <div class="live-dot">
      ● LIVE
    </div>

  </div>


  <div class="live-media">

    <img
      id="liveImage"
      src="${RANK_IMAGES[0]}"
      alt=""
    >

  </div>


  <div class="live-info">

    <div class="host-name">
      あなたの配信
    </div>

    <div
      class="viewers"
      id="liveViewers"
    >
      視聴者 0人
    </div>

    <div class="tagline">
      声でつながる、みんなの居場所。
    </div>


    <div class="comments">

      <div class="comments-title">
        💬 コメント
      </div>

      <div
        id="commentList"
        class="comment-list"
      ></div>

      <form
        class="comment-form"
        onsubmit="sendComment(event)"
      >

        <input
          id="commentInput"
          maxlength="120"
          placeholder="コメントを入力"
        >

        <button type="submit">
          送信
        </button>

      </form>

    </div>


    <div class="actions">

      <button
        class="action gift"
        onclick="toggleGifts()"
      >
        🎁 ギフト
      </button>

      <button
        class="action like"
        onclick="sendLike()"
      >
        ♥ いいね
        <span
          id="likeCount"
          class="count"
        >
          0
        </span>
      </button>

      <button
        class="action block"
        onclick="sendBlock()"
      >
        🚫 ブロック
      </button>

    </div>


    <div
      id="customPanel"
      class="custom-panel hidden"
    >

      <h3>
        🎨 配信画面カスタム
      </h3>

      <div class="custom-row">

        <input
          id="customUrl"
          placeholder="画像URLを入力"
        >

        <button
          class="small-btn"
          onclick="applyCustomImage()"
        >
          変更
        </button>

      </div>

      <button
        class="secondary"
        style="margin-top:8px"
        onclick="resetCustomImage()"
      >
        初期画像に戻す
      </button>

    </div>


    <button
      class="secondary"
      onclick="toggleCustom()"
    >
      🎨 配信画面カスタムを開く
    </button>


    <button
      id="audioButton"
      class="audio-on hidden"
      onclick="enableAudio()"
    >
      🔊 音声をONにする
    </button>


    <button
      class="stop-live"
      onclick="stopLive()"
    >
      ⛔ 配信を終了する
    </button>


    <div
      id="liveStatus"
      class="status"
    >
      接続中...
    </div>

  </div>


  <div
    id="log"
    class="log"
  ></div>

</div>


<div
  id="giftPanel"
  class="gift-panel hidden"
>

  <div class="gift-grid">

    <button
      class="gift-btn"
      onclick="sendGift('🌸','花')"
    >
      <b>🌸</b>
      <span>花</span>
    </button>

    <button
      class="gift-btn"
      onclick="sendGift('⭐','星')"
    >
      <b>⭐</b>
      <span>星</span>
    </button>

    <button
      class="gift-btn"
      onclick="sendGift('💎','ダイヤ')"
    >
      <b>💎</b>
      <span>ダイヤ</span>
    </button>

    <button
      class="gift-btn"
      onclick="sendGift('🌙','月')"
    >
      <b>🌙</b>
      <span>月</span>
    </button>

  </div>

</div>


<audio
  id="remoteAudio"
  autoplay
  playsinline
></audio>


<script>

"use strict";


const top50 = ${JSON.stringify(top50)};

const newcomers = ${JSON.stringify(newcomers)};

const defaultLiveImage =
  ${JSON.stringify(HERO_IMAGE_URL)};


let ws = null;

let myId = null;

let myRole = null;

let localStream = null;

let viewerPeer = null;

let viewerId = null;

let viewerConnections = new Map();

let pendingCandidates = [];

let hostPendingCandidates = new Map();

let reconnectTimer = null;

let manuallyStopped = false;

let roomJoined = false;

let likeCount = 0;


const room = "bota";


const liveScreen =
  document.getElementById("liveScreen");

const liveStatus =
  document.getElementById("liveStatus");

const liveImage =
  document.getElementById("liveImage");

const liveLog =
  document.getElementById("log");

const commentList =
  document.getElementById("commentList");

const commentInput =
  document.getElementById("commentInput");

const remoteAudio =
  document.getElementById("remoteAudio");


function log(text) {

  console.log(text);

  liveLog.textContent +=
    text + "\\n";

  liveLog.scrollTop =
    liveLog.scrollHeight;
}


function setLiveStatus(text) {

  liveStatus.textContent =
    text;
}


function addComment(name, text) {

  const div =
    document.createElement("div");

  div.className =
    "comment";


  const b =
    document.createElement("b");

  b.textContent =
    name + "：";


  div.appendChild(b);


  div.appendChild(
    document.createTextNode(text)
  );


  commentList.appendChild(div);


  while (
    commentList.children.length > 80
  ) {

    commentList.removeChild(
      commentList.firstChild
    );

  }


  commentList.scrollTop =
    commentList.scrollHeight;
}


function sendComment(event) {

  event.preventDefault();

  const text =
    commentInput.value.trim();

  if (!text) return;

  send({
    type: "comment",
    text
  });

  commentInput.value = "";
}


function renderCards(
  list,
  targetId,
  limit
) {

  const el =
    document.getElementById(targetId);


  el.innerHTML =
    list
      .slice(0, limit)
      .map(x => `

        <article
          class="rank-card"
          onclick="startViewer()"
        >

          ${
            x.live
              ? '<div class="live-pill">LIVE</div>'
              : ''
          }

          <img
            class="rank-img"
            src="${x.image}"
            alt=""
            loading="lazy"
          >

          <div class="rank-body">

            <div class="rank-no">
              #${x.rank}
            </div>

            <div class="rank-name">
              ${x.name}
            </div>

            <div class="rank-meta">
              👥 ${x.viewers}
              ·
              ♥ ${x.likes}
            </div>

          </div>

        </article>

      `)
      .join("");
}


function renderList(type) {

  const list =
    type === "top50"
      ? top50
      : newcomers;


  document
    .getElementById("homePage")
    .classList.add("hidden");


  document
    .getElementById("listPage")
    .classList.remove("hidden");


  document
    .getElementById("listTitle")
    .textContent =
      type === "top50"
        ? "🏆 人気トップ50"
        : "🌱 新人ライバー";


  document
    .getElementById("listGrid")
    .innerHTML =
      list
        .map(x => `

          <article
            class="list-card"
            onclick="startViewer()"
          >

            <img
              src="${x.image}"
              alt=""
              loading="lazy"
            >

            <div class="lb">

              <div class="nm">
                #${x.rank}
                ${x.name}
              </div>

              <div class="sm">
                ${
                  x.live
                    ? "🔴 LIVE"
                    : "⚪ 待機中"
                }

                👥 ${x.viewers}

                ♥ ${x.likes}

              </div>

            </div>

          </article>

        `)
        .join("");


  window.scrollTo(0, 0);
}


function openPage(page) {

  if (page === "home") {

    document
      .getElementById("homePage")
      .classList.remove("hidden");


    document
      .getElementById("listPage")
      .classList.add("hidden");

  } else {

    renderList(page);

  }


  history.replaceState(
    {},
    "",
    page === "home"
      ? location.pathname
      : "?page=" + page
  );


  window.scrollTo(0, 0);
}


renderCards(
  top50,
  "topPreview",
  10
);


renderCards(
  newcomers,
  "newPreview",
  10
);


const initialPage =
  new URLSearchParams(
    location.search
  ).get("page");


if (
  initialPage === "top50" ||
  initialPage === "newcomers"
) {

  renderList(initialPage);

}


function getSocketURL() {

  return (
    location.protocol === "https:"
      ? "wss://"
      : "ws://"
  ) + location.host;

}


function send(data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    try {

      ws.send(
        JSON.stringify(data)
      );

    } catch (e) {

      log(
        "送信エラー: " +
        e.message
      );

    }

  }

}


function connectSocket() {

  return new Promise(
    (resolve, reject) => {

      if (
        ws &&
        ws.readyState ===
          WebSocket.OPEN
      ) {

        resolve();

        return;
      }


      ws =
        new WebSocket(
          getSocketURL()
        );


      let settled = false;


      ws.onopen = () => {

        log(
          "WebSocket接続OK"
        );


        if (!settled) {

          settled = true;

          resolve();

        }


        if (
          myRole &&
          !roomJoined
        ) {

          send({
            type: "join",
            role: myRole,
            room
          });

        }

      };


      ws.onerror = () => {

        if (!settled) {

          settled = true;

          reject(
            new Error(
              "WebSocket接続失敗"
            )
          );

        }


        log(
          "WebSocketエラー"
        );

      };


      ws.onclose = e => {

        roomJoined = false;


        log(
          "WebSocket切断 code=" +
          e.code
        );


        if (
          !manuallyStopped &&
          myRole
        ) {

          setLiveStatus(
            "接続が切れました。再接続中..."
          );

          scheduleReconnect();

        }

      };


      ws.onmessage =
        async e => {

          try {

            await handleMessage(
              JSON.parse(e.data)
            );

          } catch (err) {

            log(
              "Message Error: " +
              err.message
            );

          }

        };

    }
  );

}


function scheduleReconnect() {

  if (reconnectTimer)
    return;


  reconnectTimer =
    setTimeout(
      async () => {

        reconnectTimer = null;


        if (
          manuallyStopped ||
          !myRole
        ) {

          return;

        }


        try {

          await connectSocket();

        } catch (e) {

          scheduleReconnect();

        }

      },
      1500
    );

}


async function startHost() {

  manuallyStopped = false;

  myRole = "host";


  openLive();


  try {

    await connectSocket();


    if (!roomJoined) {

      send({
        type: "join",
        role: "host",
        room
      });

    }


    await startMicrophone();


    setLiveStatus(
      "🎙️ 配信中"
    );


    send({
      type: "stream-started"
    });


    send({
      type: "live-meta",
      image: liveImage.src
    });


  } catch (e) {

    setLiveStatus(
      "配信開始失敗: " +
      e.message
    );


    log(
      "配信開始失敗: " +
      e.message
    );

  }

}


async function startViewer() {

  manuallyStopped = false;

  myRole = "viewer";


  openLive();


  setLiveStatus(
    "配信を接続中..."
  );


  try {

    await connectSocket();


    if (!roomJoined) {

      send({
        type: "join",
        role: "viewer",
        room
      });

    }

  } catch (e) {

    setLiveStatus(
      "接続失敗"
    );


    log(e.message);

  }

}


function openLive() {

  liveScreen.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";
}


function closeLive() {

  if (myRole) {

    stopLive();

  } else {

    liveScreen.classList.add(
      "hidden"
    );

    document.body.style.overflow =
      "";

  }

}


async function startMicrophone() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "マイク機能が利用できません"
    );

  }


  localStream =
    await navigator.mediaDevices
      .getUserMedia({

        audio: {

          echoCancellation: false,

          noiseSuppression: false,

          autoGainControl: false,

          channelCount: 1,

          sampleRate: 48000

        },

        video: false

      });


  log(
    "マイク取得OK / LOW LATENCY AUDIO"
  );

}


function optimizeOpusSDP(sdp) {

  if (!sdp)
    return sdp;


  const lines =
    sdp.split("\\r\\n");


  let payload = null;


  for (const line of lines) {

    const m =
      line.match(
        /^a=rtpmap:(\\d+) opus\\/48000\\/2/i
      );


    if (m) {

      payload = m[1];

      break;

    }

  }


  if (!payload)
    return sdp;


  const fmtp =
    "a=fmtp:" +
    payload +
    " minptime=10;useinbandfec=0;stereo=0;sprop-stereo=0;maxaveragebitrate=32000";


  let replaced = false;


  const out =
    lines.map(line => {

      if (
        line.startsWith(
          "a=fmtp:" +
          payload +
          " "
        )
      ) {

        replaced = true;

        return fmtp;

      }


      return line;

    });


  if (!replaced) {

    const i =
      out.findIndex(
        x =>
          x.startsWith(
            "a=rtpmap:" +
            payload
          )
      );


    if (i >= 0) {

      out.splice(
        i + 1,
        0,
        fmtp
      );

    }

  }


  const pi =
    out.findIndex(
      x =>
        /^a=ptime:/i.test(x)
    );


  if (pi >= 0) {

    out[pi] =
      "a=ptime:10";

  } else {

    out.push(
      "a=ptime:10"
    );

  }


  return out.join("\\r\\n");

}


function applyReceiverLowLatency(
  receiver
) {

  try {

    if (
      "playoutDelayHint" in
      receiver
    ) {

      receiver.playoutDelayHint =
        0;

    }

  } catch (e) {}


  try {

    if (
      "jitterBufferTarget" in
      receiver
    ) {

      receiver.jitterBufferTarget =
        0;

    }

  } catch (e) {}

}


function makePeerConnection() {

  return new RTCPeerConnection({

    iceServers: [

      {
        urls:
          "stun:stun.l.google.com:19302"
      },

      {
        urls:
          "stun:stun1.l.google.com:19302"
      }

    ],

    bundlePolicy:
      "max-bundle",

    rtcpMuxPolicy:
      "require",

    iceCandidatePoolSize:
      0

  });

}


function createHostPeer(
  viewer
) {

  const old =
    viewerConnections.get(
      viewer
    );


  if (old) {

    try {
      old.close();
    } catch (e) {}

  }


  const pc =
    makePeerConnection();


  viewerConnections.set(
    viewer,
    pc
  );


  if (localStream) {

    for (
      const track of
      localStream.getAudioTracks()
    ) {

      const sender =
        pc.addTrack(
          track,
          localStream
        );


      try {

        const p =
          sender.getParameters();


        if (!p.encodings)
          p.encodings = [{}];


        p.encodings[0].maxBitrate =
          32000;


        p.encodings[0].priority =
          "high";


        sender
          .setParameters(p)
          .catch(() => {});

      } catch (e) {}

    }

  }


  pc.onicecandidate =
    e => {

      if (e.candidate) {

        send({

          type: "signal",

          target: viewer,

          signal: {

            type: "candidate",

            candidate:
              e.candidate

          }

        });

      }

    };


  pc.onconnectionstatechange =
    () => {

      log(
        "視聴者 " +
        viewer +
        " : " +
        pc.connectionState
      );

    };


  return pc;

}


async function sendOffer(
  viewer
) {

  try {

    const pc =
      createHostPeer(
        viewer
      );


    let offer =
      await pc.createOffer({
        offerToReceiveAudio: false
      });


    offer = {
      type: "offer",

      sdp:
        optimizeOpusSDP(
          offer.sdp
        )
    };


    await pc.setLocalDescription(
      offer
    );


    send({

      type: "signal",

      target: viewer,

      signal: offer

    });

  } catch (e) {

    log(
      "Offerエラー: " +
      e.message
    );

  }

}


function createViewerPeer() {

  if (viewerPeer)
    return viewerPeer;


  viewerPeer =
    makePeerConnection();


  viewerPeer.onicecandidate =
    e => {

      if (
        e.candidate &&
        viewerId
      ) {

        send({

          type: "signal",

          target: viewerId,

          signal: {

            type: "candidate",

            candidate:
              e.candidate

          }

        });

      }

    };


  viewerPeer.ontrack =
    e => {

      const receiver =
        e.receiver;


      if (receiver)
        applyReceiverLowLatency(
          receiver
        );


      let stream =
        e.streams &&
        e.streams[0];


      if (!stream) {

        stream =
          new MediaStream();

        stream.addTrack(
          e.track
        );

      }


      remoteAudio.srcObject =
        stream;


      remoteAudio.volume =
        1;

      remoteAudio.muted =
        false;


      const p =
        remoteAudio.play();


      if (p) {

        p.catch(() => {

          document
            .getElementById(
              "audioButton"
            )
            .classList.remove(
              "hidden"
            );


          setLiveStatus(
            "🔊 音声ONを押してください"
          );

        });

      }


      setLiveStatus(
        "🔴 配信中 / 音声受信中"
      );


      log(
        "音声トラック受信"
      );

    };


  viewerPeer.onconnectionstatechange =
    () => {

      if (!viewerPeer)
        return;


      if (
        viewerPeer.connectionState ===
        "connected"
      ) {

        setLiveStatus(
          "🔴 配信中"
        );

      }


      if (
        viewerPeer.connectionState ===
        "failed"
      ) {

        setLiveStatus(
          "WebRTC接続失敗"
        );

      }

    };


  return viewerPeer;

}


async function handleViewerSignal(
  msg
) {

  const pc =
    createViewerPeer();


  if (msg.type === "offer") {

    try {

      await pc.setRemoteDescription({
        type: "offer",
        sdp: msg.sdp
      });


      for (
        const c of
        pendingCandidates
      ) {

        try {

          await pc.addIceCandidate(
            c
          );

        } catch (e) {}

      }


      pendingCandidates = [];


      let answer =
        await pc.createAnswer();


      answer = {

        type: "answer",

        sdp:
          optimizeOpusSDP(
            answer.sdp
          )

      };


      await pc.setLocalDescription(
        answer
      );


      send({

        type: "signal",

        target: viewerId,

        signal: answer

      });


    } catch (e) {

      log(
        "Offer処理エラー: " +
        e.message
      );

    }


    return;

  }


  if (msg.type === "candidate") {

    const c =
      new RTCIceCandidate(
        msg.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          c
        );

      } catch (e) {}

    } else {

      pendingCandidates.push(
        c
      );

    }

  }

}


async function handleHostSignal(
  msg
) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc)
    return;


  if (
    msg.signal.type ===
    "answer"
  ) {

    await pc.setRemoteDescription({

      type: "answer",

      sdp:
        msg.signal.sdp

    });


    const list =
      hostPendingCandidates.get(
        msg.from
      ) || [];


    for (
      const c of list
    ) {

      try {

        await pc.addIceCandidate(
          c
        );

      } catch (e) {}

    }


    hostPendingCandidates.delete(
      msg.from
    );


    return;

  }


  if (
    msg.signal.type ===
    "candidate"
  ) {

    const c =
      new RTCIceCandidate(
        msg.signal.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          c
        );

      } catch (e) {}

    } else {

      if (
        !hostPendingCandidates.has(
          msg.from
        )
      ) {

        hostPendingCandidates.set(
          msg.from,
          []
        );

      }


      hostPendingCandidates
        .get(msg.from)
        .push(c);

    }

  }

}


async function handleMessage(
  msg
) {

  if (
    msg.type ===
    "welcome"
  ) {

    myId = msg.id;

    return;

  }


  if (
    msg.type ===
    "join-ok"
  ) {

    roomJoined = true;

    return;

  }


  if (
    msg.type ===
    "room-status"
  ) {

    document
      .getElementById(
        "liveViewers"
      )
      .textContent =
        "視聴者 " +
        msg.viewers +
        "人";


    if (
      myRole === "viewer" &&
      !msg.live
    ) {

      setLiveStatus(
        "配信者を待っています..."
      );

    }


    return;

  }


  if (
    msg.type ===
    "viewer-joined"
  ) {

    if (
      myRole ===
      "host"
    ) {

      await sendOffer(
        msg.viewerId
      );

    }


    return;

  }


  if (
    msg.type ===
    "signal"
  ) {

    if (
      myRole ===
      "host"
    ) {

      await handleHostSignal(
        msg
      );

    } else {

      viewerId =
        msg.from;

      await handleViewerSignal(
        msg.signal
      );

    }


    return;

  }


  if (
    msg.type ===
    "stream-started"
  ) {

    setLiveStatus(
      "🔴 配信中"
    );

    return;

  }


  if (
    msg.type ===
      "stream-stopped" ||
    msg.type ===
      "host-left"
  ) {

    setLiveStatus(
      "配信終了"
    );


    remoteAudio.srcObject =
      null;


    return;

  }


  if (
    msg.type ===
    "viewer-left"
  ) {

    const pc =
      viewerConnections.get(
        msg.viewerId
      );


    if (pc) {

      try {
        pc.close();
      } catch (e) {}


      viewerConnections.delete(
        msg.viewerId
      );

    }


    hostPendingCandidates.delete(
      msg.viewerId
    );


    return;

  }


  if (
    msg.type ===
    "live-meta"
  ) {

    if (
      myRole === "viewer" &&
      msg.image
    ) {

      liveImage.src =
        msg.image;

    }


    return;

  }


  if (
    msg.type ===
    "like-count"
  ) {

    document
      .getElementById(
        "likeCount"
      )
      .textContent =
        msg.count;


    return;

  }


  if (
    msg.type ===
    "gift"
  ) {

    log(
      "🎁 " +
      msg.gift +
      " が届きました"
    );


    return;

  }


  if (
    msg.type ===
    "comment"
  ) {

    addComment(
      msg.name ||
        "ライバー",

      String(
        msg.text || ""
      )
    );


    return;

  }


  if (
    msg.type ===
    "blocked"
  ) {

    setLiveStatus(
      "この配信者をブロックしました"
    );


    return;

  }

}


async function enableAudio() {

  try {

    remoteAudio.muted =
      false;

    remoteAudio.volume =
      1;


    await remoteAudio.play();


    document
      .getElementById(
        "audioButton"
      )
      .classList.add(
        "hidden"
      );


    setLiveStatus(
      "🔴 配信中 / 音声ON"
    );


  } catch (e) {

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}


function sendLike() {

  send({
    type: "like"
  });

}


function toggleGifts() {

  document
    .getElementById(
      "giftPanel"
    )
    .classList.toggle(
      "hidden"
    );

}


function sendGift(
  icon,
  name
) {

  send({

    type: "gift",

    gift:
      icon +
      " " +
      name

  });


  document
    .getElementById(
      "giftPanel"
    )
    .classList.add(
      "hidden"
    );


  log(
    "🎁 " +
    name +
    " を送信"
  );

}


function sendBlock() {

  if (
    confirm(
      "この配信者をブロックしますか？"
    )
  ) {

    send({
      type: "block"
    });

  }

}


function toggleCustom() {

  document
    .getElementById(
      "customPanel"
    )
    .classList.toggle(
      "hidden"
    );

}


function applyCustomImage() {

  const url =
    document
      .getElementById(
        "customUrl"
      )
      .value
      .trim();


  if (!url)
    return;


  liveImage.src =
    url;


  if (
    myRole === "host"
  ) {

    send({

      type: "live-meta",

      image: url

    });

  }

}


function resetCustomImage() {

  liveImage.src =
    defaultLiveImage;


  if (
    myRole === "host"
  ) {

    send({

      type: "live-meta",

      image:
        defaultLiveImage

    });

  }

}


function stopLive() {

  manuallyStopped =
    true;

  roomJoined =
    false;


  if (reconnectTimer) {

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      null;

  }


  if (localStream) {

    for (
      const t of
      localStream.getTracks()
    ) {

      t.stop();

    }

    localStream =
      null;

  }


  for (
    const pc of
    viewerConnections.values()
  ) {

    try {

      pc.close();

    } catch (e) {}

  }


  viewerConnections.clear();


  hostPendingCandidates.clear();


  if (viewerPeer) {

    try {

      viewerPeer.close();

    } catch (e) {}

    viewerPeer =
      null;

  }


  pendingCandidates =
    [];


  if (
    ws &&
    ws.readyState ===
    WebSocket.OPEN
  ) {

    send({
      type:
        "stream-stopped"
    });

  }


  if (ws) {

    try {

      ws.close(
        1000,
        "user stopped"
      );

    } catch (e) {}

    ws = null;

  }


  remoteAudio.srcObject =
    null;

  remoteAudio.muted =
    true;


  myRole =
    null;

  viewerId =
    null;


  document
    .getElementById(
      "giftPanel"
    )
    .classList.add(
      "hidden"
    );


  liveScreen
    .classList.add(
      "hidden"
    );


  document.body.style.overflow =
    "";


  setLiveStatus(
    "停止しました"
  );

}


remoteAudio.autoplay =
  true;

remoteAudio.playsInline =
  true;

remoteAudio.volume =
  1;


document.addEventListener(
  "click",
  () => {

    if (
      myRole === "viewer" &&
      remoteAudio.srcObject &&
      remoteAudio.paused
    ) {

      remoteAudio.muted =
        false;


      remoteAudio
        .play()
        .then(
          () =>
            document
              .getElementById(
                "audioButton"
              )
              .classList.add(
                "hidden"
              )
        )
        .catch(
          () => {}
        );

    }

  },
  {
    passive: true
  }
);

</script>

</body>

</html>`;


const server =
  http.createServer(
    (req, res) => {

      const urlPath =
        decodeURIComponent(
          (req.url || "/")
            .split("?")[0]
        );


      if (
        urlPath ===
        "/home.png"
      ) {

        const file =
          path.join(
            PUBLIC_DIR,
            "home.png"
          );


        if (
          fs.existsSync(file)
        ) {

          res.writeHead(
            200,
            {
              "Content-Type":
                "image/png",

              "Cache-Control":
                "no-store"
            }
          );


          fs
            .createReadStream(file)
            .pipe(res);


          return;

        }

      }


      if (
        req.url ===
        "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );


        res.end("OK");

        return;

      }


      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-store"
        }
      );


      res.end(HTML);

    }
  );


const wss =
  new WebSocket.Server({
    server,

    perMessageDeflate:
      false
  });


let nextId =
  1;


const clients =
  new Map();


let likeCount =
  0;


function send(
  ws,
  data
) {

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    try {

      ws.send(
        JSON.stringify(data)
      );

    } catch (e) {

      console.log(
        "[SEND ERROR]",
        e.message
      );

    }

  }

}


function broadcastRoom(
  room,
  data,
  exceptId = null
) {

  for (
    const c of
    clients.values()
  ) {

    if (
      c.room === room &&
      c.id !== exceptId
    ) {

      send(
        c.ws,
        data
      );

    }

  }

}


function updateRoomStatus(
  room
) {

  let host =
    false;

  let streaming =
    false;

  let viewers =
    0;


  for (
    const c of
    clients.values()
  ) {

    if (
      c.room !== room
    ) {

      continue;

    }


    if (
      c.role ===
      "host"
    ) {

      host = true;

      if (
        c.streaming
      ) {

        streaming =
          true;

      }

    }


    if (
      c.role ===
      "viewer"
    ) {

      viewers++;

    }

  }


  for (
    const c of
    clients.values()
  ) {

    if (
      c.room ===
      room
    ) {

      send(
        c.ws,
        {
          type:
            "room-status",

          live:
            host &&
            streaming,

          viewers
        }
      );

    }

  }

}


wss.on(
  "connection",
  ws => {

    const id =
      String(nextId++);


    const client = {

      id,

      ws,

      role: null,

      room: "bota",

      streaming: false,

      isAlive: true,

      blocked: false

    };


    clients.set(
      id,
      client
    );


    send(
      ws,
      {
        type:
          "welcome",

        id
      }
    );


    ws.on(
      "pong",
      () => {

        client.isAlive =
          true;

      }
    );


    ws.on(
      "message",
      raw => {

        let msg;


        try {

          msg =
            JSON.parse(
              raw.toString()
            );

        } catch (e) {

          return;

        }


        if (
          msg.type ===
          "join"
        ) {

          client.role =
            msg.role ===
            "host"
              ? "host"
              : "viewer";


          client.room =
            msg.room ||
            "bota";


          if (
            client.role ===
            "host"
          ) {

            for (
              const other of
              clients.values()
            ) {

              if (
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ) {

                send(
                  ws,
                  {
                    type:
                      "join-error",

                    text:
                      "このルームには既に配信者がいます"
                  }
                );


                return;

              }

            }

          }


          send(
            ws,
            {
              type:
                "join-ok"
            }
          );


          if (
            client.role ===
            "host"
          ) {

            for (
              const other of
              clients.values()
            ) {

              if (
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "viewer"
              ) {

                send(
                  ws,
                  {
                    type:
                      "viewer-joined",

                    viewerId:
                      other.id
                  }
                );

              }

            }

          } else {

            for (
              const other of
              clients.values()
            ) {

              if (
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ) {

                send(
                  other.ws,
                  {
                    type:
                      "viewer-joined",

                    viewerId:
                      id
                  }
                );


                if (
                  other.streaming
                ) {

                  send(
                    ws,
                    {
                      type:
                        "stream-started"
                    }
                  );

                }

              }

            }

          }


          updateRoomStatus(
            client.room
          );


          return;

        }


        if (
          msg.type ===
          "signal"
        ) {

          const target =
            clients.get(
              msg.target
            );


          if (
            !target ||
            target.room !==
              client.room
          ) {

            return;

          }


          send(
            target.ws,
            {
              type:
                "signal",

              from:
                client.id,

              signal:
                msg.signal
            }
          );


          return;

        }


        if (
          msg.type ===
            "stream-started" &&
          client.role ===
            "host"
        ) {

          client.streaming =
            true;


          console.log(
            "[LIVE START]",
            id
          );


          broadcastRoom(
            client.room,
            {
              type:
                "stream-started"
            }
          );


          updateRoomStatus(
            client.room
          );


          return;

        }


        if (
          msg.type ===
            "stream-stopped" &&
          client.role ===
            "host"
        ) {

          client.streaming =
            false;


          console.log(
            "[LIVE STOP]",
            id
          );


          broadcastRoom(
            client.room,
            {
              type:
                "stream-stopped"
            }
          );


          updateRoomStatus(
            client.room
          );


          return;

        }


        if (
          msg.type ===
          "live-meta"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "live-meta",

              image:
                msg.image
            },
            client.id
          );


          return;

        }


        if (
          msg.type ===
          "like"
        ) {

          likeCount++;


          broadcastRoom(
            client.room,
            {
              type:
                "like-count",

              count:
                likeCount
            }
          );


          return;

        }


        if (
          msg.type ===
          "gift"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "gift",

              gift:
                String(
                  msg.gift ||
                  "🎁 ギフト"
                )
            },
            client.id
          );


          return;

        }


        if (
          msg.type ===
          "comment"
        ) {

          const text =
            String(
              msg.text || ""
            )
              .trim()
              .slice(
                0,
                120
              );


          if (!text)
            return;


          const name =
            client.role ===
            "host"
              ? "配信者"
              : "視聴者";


          broadcastRoom(
            client.room,
            {
              type:
                "comment",

              name,

              text
            }
          );


          return;

        }


        if (
          msg.type ===
          "block"
        ) {

          client.blocked =
            true;


          send(
            ws,
            {
              type:
                "blocked"
            }
          );


          return;

        }

      }
    );


    ws.on(
      "close",
      () => {

        const room =
          client.room;

        const role =
          client.role;


        clients.delete(
          id
        );


        if (
          role ===
          "host"
        ) {

          for (
            const other of
            clients.values()
          ) {

            if (
              other.room ===
                room &&
              other.role ===
                "viewer"
            ) {

              send(
                other.ws,
                {
                  type:
                    "host-left"
                }
              );

            }

          }

        }


        if (
          role ===
          "viewer"
        ) {

          for (
            const other of
            clients.values()
          ) {

            if (
              other.room ===
                room &&
              other.role ===
                "host"
            ) {

              send(
                other.ws,
                {
                  type:
                    "viewer-left",

                  viewerId:
                    id
                }
              );

            }

          }

        }


        updateRoomStatus(
          room
        );

      }
    );


    ws.on(
      "error",
      e => {

        console.log(
          "[WS ERROR]",
          id,
          e.message
        );

      }
    );

  }
);


const heartbeat =
  setInterval(
    () => {

      for (
        const c of
        clients.values()
      ) {

        if (
          c.isAlive ===
          false
        ) {

          try {

            c.ws.terminate();

          } catch (e) {}

          continue;

        }


        c.isAlive =
          false;


        try {

          c.ws.ping();

        } catch (e) {}

      }

    },
    25000
  );


wss.on(
  "close",
  () => {

    clearInterval(
      heartbeat
    );

  }
);


server.on(
  "error",
  e => {

    console.error(
      "[SERVER ERROR]",
      e
    );

  }
);


server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "VoiceボタLive integrated server"
    );

    console.log(
      "LOW LATENCY AUDIO + RANKING + GIFTS"
    );

    console.log(
      "LISTENING ON",
      PORT
    );

    console.log(
      "================================="
    );

  }
);
