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

/* =========================================================
   CLIENT / LIVE DATA
========================================================= */

const clients = new Set();

let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  background: "",
  startedAt: null
};


/* =========================================================
   HTML
========================================================= */

const HTML = String.raw`<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no,viewport-fit=cover"
>

<meta name="theme-color" content="#030510">

<title>VoiceボタLive</title>

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

button,
input {

  font-family: inherit;

}

button {

  border: 0;
  cursor: pointer;

}

.app {

  min-height: 100vh;

  padding-bottom:
    calc(
      90px +
      env(safe-area-inset-bottom)
    );

}


/* =========================================================
   HEADER
========================================================= */

.header {

  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  height: 58px;

  z-index: 1000;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding:
    0 17px;

  background:
    rgba(3,5,16,.92);

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid
    rgba(120,140,255,.14);

}

.logo {

  font-size: 18px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #fff,
      #8edaff,
      #d18cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;

}

.online {

  display: flex;

  align-items: center;

  gap: 6px;

  color: #9eabc9;

  font-size: 10px;

}

.online-dot {

  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: #45ffab;

  box-shadow:
    0 0 12px
    #45ffab;

}


/* =========================================================
   HERO
========================================================= */

.hero {

  margin-top: 58px;

  width: 100%;

  overflow: hidden;

}

.hero-image-wrap {

  position: relative;

  width: 100%;

  max-width: 1000px;

  margin: auto;

  overflow: hidden;

  background: #030510;

}

.hero-image {

  display: block;

  width: 100%;

  height: auto;

}

.hero-gradient {

  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 60%;

  background:
    linear-gradient(
      0deg,
      #030510,
      rgba(3,5,16,.8),
      transparent
    );

}

.hero-content {

  position: relative;

  max-width: 1000px;

  margin:
    -35px auto 0;

  padding:
    0 18px 25px;

}

.hero-small {

  font-size: 12px;

  color: #aebdff;

  font-weight: 900;

}

.hero-title {

  margin:
    8px 0 0;

  font-size:
    clamp(
      29px,
      8vw,
      48px
    );

  line-height: 1.2;

  font-weight: 900;

}

.hero-title span {

  background:
    linear-gradient(
      90deg,
      #fff,
      #8edbff,
      #d28cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;

}

.hero-description {

  margin-top: 12px;

  color: #c8d1ea;

  font-size: 13px;

  line-height: 1.8;

}


/* =========================================================
   SECTIONS
========================================================= */

.section {

  max-width: 1000px;

  margin: auto;

  padding:
    20px 15px 0;

}

.section-head {

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 12px;

}

.section-title {

  font-size: 20px;

  font-weight: 900;

}

.section-sub {

  font-size: 10px;

  color: #687391;

}


/* =========================================================
   LIVE LIST
========================================================= */

.live-list {

  display:
    flex;

  flex-direction:
    column;

  gap: 10px;

}

.empty {

  padding:
    35px 20px;

  text-align: center;

  color: #77819e;

  background:
    #0b1027;

  border:
    1px solid
    rgba(100,120,200,.14);

  border-radius:
    20px;

}

.live-card {

  min-height: 90px;

  display:
    flex;

  align-items:
    center;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      120deg,
      #18204c,
      #090d20
    );

  border:
    1px solid
    rgba(120,140,255,.16);

  transition:
    transform .15s;

}

.live-card:active {

  transform:
    scale(.98);

}

.live-avatar {

  width: 58px;
  height: 58px;

  flex-shrink: 0;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    50%;

  font-size: 27px;

  background:
    radial-gradient(
      circle,
      #72d7ff,
      #4259e8 55%,
      #24104b
    );

}

.live-info {

  min-width: 0;

  flex: 1;

  padding-left: 12px;

}

.live-name {

  font-size: 14px;

  font-weight: 900;

}

.live-title {

  margin-top: 5px;

  font-size: 12px;

  color: #aab4d1;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;

}

.live-meta {

  margin-top: 5px;

  color: #818dab;

  font-size: 10px;

}

.live-badge {

  display:
    inline-block;

  margin-top: 6px;

  padding:
    3px 9px;

  border-radius:
    999px;

  font-size: 9px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3d70,
      #a82cff
    );

}


/* =========================================================
   FEATURES
========================================================= */

.features {

  display:
    grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 10px;

  margin-top: 15px;

}

.feature {

  min-height: 110px;

  padding:
    17px 14px;

  border-radius:
    18px;

  background:
    linear-gradient(
      145deg,
      #19204b,
      #090d20
    );

  border:
    1px solid
    rgba(120,140,255,.12);

}

.feature-icon {

  font-size: 25px;

}

.feature-title {

  margin-top: 7px;

  font-size: 13px;

  font-weight: 900;

}

.feature-text {

  margin-top: 5px;

  color: #8f99ba;

  font-size: 10px;

  line-height: 1.6;

}


/* =========================================================
   FULLSCREEN LIVE
========================================================= */

.live-panel {

  position: fixed;

  inset: 0;

  z-index: 3000;

  display: none;

  overflow: hidden;

  background:
    #030510;

}

.live-panel.show {

  display: block;

}

.live-background {

  position: absolute;

  inset: 0;

  z-index: 0;

  background:
    linear-gradient(
      135deg,
      #101846,
      #07091b
    );

  background-position:
    center;

  background-size:
    cover;

  background-repeat:
    no-repeat;

}

.live-dark {

  position: absolute;

  inset: 0;

  z-index: 1;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.58),
      transparent 30%,
      transparent 55%,
      rgba(0,0,0,.88)
    );

  pointer-events: none;

}

.live-content {

  position: relative;

  z-index: 5;

  width: 100%;
  height: 100%;

  display:
    flex;

  flex-direction:
    column;

}


/* =========================================================
   LIVE TOP
========================================================= */

.live-top {

  display:
    flex;

  align-items:
    flex-start;

  justify-content:
    space-between;

  padding:
    calc(
      16px +
      env(safe-area-inset-top)
    )
    14px
    0;

}

.live-user {

  display:
    flex;

  align-items:
    center;

  min-width: 0;

}

.live-user-avatar {

  width: 46px;
  height: 46px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  flex-shrink: 0;

  font-size: 22px;

  background:
    linear-gradient(
      145deg,
      #5de1ff,
      #5364ff,
      #b943e8
    );

  border:
    2px solid
    rgba(255,255,255,.75);

  box-shadow:
    0 5px 25px
    rgba(0,0,0,.35);

}

.live-user-info {

  min-width: 0;

  padding-left: 10px;

}

.live-user-name {

  max-width: 190px;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;

  font-size: 14px;

  font-weight: 900;

}

.live-user-title {

  max-width: 210px;

  margin-top: 3px;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;

  color: #d5dbed;

  font-size: 10px;

}

.live-top-right {

  display:
    flex;

  align-items:
    center;

  gap: 7px;

}

.live-badge-big {

  padding:
    6px 10px;

  border-radius:
    999px;

  font-size: 10px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3869,
      #a92cff
    );

  box-shadow:
    0 5px 20px
    rgba(255,50,130,.25);

}

.close-live {

  width: 38px;
  height: 38px;

  border-radius:
    50%;

  background:
    rgba(0,0,0,.42);

  color: white;

  font-size: 20px;

  border:
    1px solid
    rgba(255,255,255,.18);

}


/* =========================================================
   LIVE CENTER
========================================================= */

.live-center {

  flex: 1;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  pointer-events: none;

}

.voice-orb {

  width: 135px;
  height: 135px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  font-size: 62px;

  background:
    radial-gradient(
      circle,
      rgba(100,220,255,.95),
      rgba(65,85,230,.75) 45%,
      rgba(90,30,150,.28) 70%,
      transparent 72%
    );

  box-shadow:
    0 0 80px
    rgba(65,170,255,.38);

  animation:
    voicePulse 2s
    ease-in-out
    infinite;

}

@keyframes voicePulse {

  0% {
    transform: scale(.94);
  }

  50% {
    transform: scale(1.06);
  }

  100% {
    transform: scale(.94);
  }

}

.live-center-text {

  position: absolute;

  margin-top: 180px;

  padding:
    7px 12px;

  border-radius:
    999px;

  background:
    rgba(0,0,0,.35);

  backdrop-filter:
    blur(10px);

  color: #e8edff;

  font-size: 11px;

}


/* =========================================================
   LIVE COMMENTS
========================================================= */

.live-comments {

  position: absolute;

  left: 12px;
  right: 85px;
  bottom: 175px;

  z-index: 10;

  max-height: 210px;

  overflow: hidden;

  pointer-events: none;

}

.live-comment {

  display:
    table;

  max-width: 100%;

  margin-top: 6px;

  padding:
    7px 11px;

  border-radius:
    14px;

  background:
    rgba(0,0,0,.48);

  backdrop-filter:
    blur(10px);

  color: white;

  font-size: 12px;

  animation:
    commentIn .2s
    ease-out;

}

.live-comment-name {

  color: #a9dcff;

  font-weight: 900;

}

@keyframes commentIn {

  from {

    opacity: 0;

    transform:
      translateY(10px);

  }

  to {

    opacity: 1;

    transform:
      translateY(0);

  }

}


/* =========================================================
   RIGHT ACTIONS
========================================================= */

.live-actions {

  position: absolute;

  right: 10px;

  bottom: 190px;

  z-index: 20;

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  gap: 13px;

}

.live-action {

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  width: 53px;

  min-height: 53px;

  border-radius:
    50%;

  background:
    rgba(0,0,0,.43);

  backdrop-filter:
    blur(12px);

  color: white;

  border:
    1px solid
    rgba(255,255,255,.16);

}

.live-action-icon {

  font-size: 23px;

  line-height: 1;

}

.live-action-label {

  margin-top: 3px;

  font-size: 8px;

  font-weight: 800;

}

.like-pop {

  position: absolute;

  right: 16px;

  bottom: 225px;

  z-index: 30;

  font-size: 28px;

  pointer-events: none;

  animation:
    likeFloat 1s
    ease-out
    forwards;

}

@keyframes likeFloat {

  0% {

    opacity: 0;

    transform:
      translateY(30px)
      scale(.6);

  }

  20% {

    opacity: 1;

  }

  100% {

    opacity: 0;

    transform:
      translateY(-120px)
      scale(1.5);

  }

}


/* =========================================================
   LIVE BOTTOM
========================================================= */

.live-bottom {

  padding:
    10px 12px
    calc(
      12px +
      env(safe-area-inset-bottom)
    );

  background:
    linear-gradient(
      0deg,
      rgba(0,0,0,.94),
      rgba(0,0,0,.72),
      transparent
    );

}

.viewer-count {

  display:
    inline-flex;

  align-items:
    center;

  gap: 5px;

  padding:
    5px 9px;

  border-radius:
    999px;

  background:
    rgba(0,0,0,.42);

  color: #d9e0f4;

  font-size: 10px;

  margin-bottom: 8px;

}

.comment-box {

  display:
    flex;

  gap: 8px;

}

.comment-box input {

  min-width: 0;

  flex: 1;

  height: 46px;

  padding:
    0 14px;

  border-radius:
    24px;

  outline: none;

  border:
    1px solid
    rgba(255,255,255,.18);

  background:
    rgba(10,12,28,.74);

  backdrop-filter:
    blur(12px);

  color: white;

  font-size: 13px;

}

.comment-box input::placeholder {

  color:
    #8b94ad;

}

.comment-send {

  width: 48px;
  height: 46px;

  border-radius:
    50%;

  background:
    linear-gradient(
      135deg,
      #42d9ff,
      #5668ff
    );

  color: white;

  font-size: 18px;

}


/* =========================================================
   BROADCASTER CONTROLS
========================================================= */

.broadcaster-controls {

  display: none;

  margin-top: 8px;

}

.broadcaster-controls.show {

  display: block;

}

.end-live-button {

  width: 100%;

  height: 48px;

  border-radius:
    16px;

  color: white;

  font-size: 13px;

  font-weight: 900;

  background:
    linear-gradient(
      100deg,
      #ff365f,
      #a62cff
    );

}


/* =========================================================
   BACKGROUND SETTINGS
========================================================= */

.background-settings {

  position: absolute;

  left: 12px;
  right: 12px;

  bottom: 112px;

  z-index: 100;

  display: none;

  padding: 13px;

  border-radius:
    18px;

  background:
    rgba(5,7,20,.91);

  backdrop-filter:
    blur(18px);

  border:
    1px solid
    rgba(140,155,255,.2);

}

.background-settings.show {

  display: block;

}

.background-title {

  margin-bottom: 9px;

  font-size: 12px;

  font-weight: 900;

}

.background-grid {

  display:
    grid;

  grid-template-columns:
    repeat(4,1fr);

  gap: 7px;

}

.background-grid button {

  min-height: 38px;

  border-radius:
    10px;

  color: white;

  font-size: 10px;

  font-weight: 900;

}

.bg-blue {

  background:
    linear-gradient(
      135deg,
      #111a4b,
      #263d96
    );

}

.bg-purple {

  background:
    linear-gradient(
      135deg,
      #25103e,
      #8d2f9d
    );

}

.bg-pink {

  background:
    linear-gradient(
      135deg,
      #42102e,
      #c82f76
    );

}

.bg-image {

  background:
    linear-gradient(
      135deg,
      #1a203c,
      #4d60e8
    );

}

.bg-reset {

  width: 100%;

  margin-top: 7px;

  min-height: 36px;

  border-radius:
    10px;

  background:
    #202640;

  color: white;

  font-size: 10px;

}

#backgroundFile {

  display: none;

}


/* =========================================================
   AUDIO BUTTON
========================================================= */

.audio-enable {

  position: absolute;

  left: 50%;

  bottom: 100px;

  z-index: 200;

  transform:
    translateX(-50%);

  display: none;

  min-width: 210px;

  height: 48px;

  padding:
    0 18px;

  border-radius:
    999px;

  background:
    linear-gradient(
      100deg,
      #00cfff,
      #5368ff
    );

  color: white;

  font-weight: 900;

  box-shadow:
    0 8px 30px
    rgba(40,130,255,.35);

}


/* =========================================================
   GIFT PANEL
========================================================= */

.gift-menu {

  position: absolute;

  right: 10px;

  bottom: 250px;

  z-index: 100;

  display: none;

  width: 230px;

  padding: 10px;

  border-radius:
    18px;

  background:
    rgba(7,9,25,.94);

  backdrop-filter:
    blur(18px);

  border:
    1px solid
    rgba(140,155,255,.2);

}

.gift-menu.show {

  display: block;

}

.gift-grid {

  display:
    grid;

  grid-template-columns:
    repeat(4,1fr);

  gap: 7px;

}

.gift-btn {

  min-height: 65px;

  border-radius:
    13px;

  background:
    #171d3e;

  color: white;

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

}

.gift-btn b {

  font-size: 25px;

}

.gift-btn span {

  margin-top: 3px;

  font-size: 9px;

}


/* =========================================================
   OLD PANEL HIDDEN
========================================================= */

#remoteAudio {

  display: none;

}


/* =========================================================
   BOTTOM NAV
========================================================= */

.bottom-nav {

  position: fixed;

  left: 0;
  right: 0;
  bottom: 0;

  z-index: 1500;

  height: 78px;

  display:
    grid;

  grid-template-columns:
    repeat(5,1fr);

  padding:
    5px 6px
    calc(
      5px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.97);

  backdrop-filter:
    blur(18px);

  border-top:
    1px solid
    rgba(120,140,255,.12);

}

.nav-item {

  border: 0;

  background:
    transparent;

  color: #727c9c;

  font-size: 10px;

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  gap: 4px;

}

.nav-icon {

  font-size: 20px;

}

.nav-live {

  width: 52px;
  height: 52px;

  margin-top:
    -20px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  font-size: 24px;

  background:
    linear-gradient(
      145deg,
      #35d8ff,
      #5568ff,
      #c54cff
    );

  border:
    3px solid
    #070a20;

  box-shadow:
    0 0 25px
    rgba(80,110,255,.65);

}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (min-width:700px) {

  .features {

    grid-template-columns:
      repeat(4,1fr);

  }

}

</style>

</head>


<body>

<div class="app">


<header class="header">

  <div class="logo">
    VoiceボタLive
  </div>

  <div class="online">
    <span class="online-dot"></span>
    <span id="onlineText">
      オンライン
    </span>
  </div>

</header>


<!-- =======================================================
     HOME
======================================================= -->

<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="VoiceボタLive"
      onerror="this.style.display='none'"
    >

    <div class="hero-gradient"></div>

  </div>


  <div class="hero-content">

    <div class="hero-small">
      声でつながる、みんなの居場所。
    </div>

    <h1 class="hero-title">

      <span>
        あなたの声が、
      </span>

      <br>

      誰かの夜を照らす。

    </h1>

    <div class="hero-description">

      気軽に話して、聞いて、つながって。<br>

      VoiceボタLiveで、
      あなたの声をもっと近くに。

    </div>

  </div>

</section>


<!-- =======================================================
     LIVE LIST
======================================================= -->

<section
  class="section"
  id="liveSection"
>

  <div class="section-head">

    <div class="section-title">
      🔴 ライブ中
    </div>

    <div class="section-sub">
      REAL TIME
    </div>

  </div>


  <div
    class="live-list"
    id="liveList"
  >

    <div class="empty">
      現在ライブ中の配信はありません
    </div>

  </div>

</section>


<!-- =======================================================
     FEATURES
======================================================= -->

<section class="section">

  <div class="section-title">
    VoiceボタLive
  </div>


  <div class="features">

    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <div class="feature-title">
        音声配信
      </div>

      <div class="feature-text">
        声でリアルタイムにつながる。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        💬
      </div>

      <div class="feature-title">
        コメント
      </div>

      <div class="feature-text">
        配信者と会話できます。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        ❤️
      </div>

      <div class="feature-title">
        いいね
      </div>

      <div class="feature-text">
        配信を応援できます。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        🎁
      </div>

      <div class="feature-title">
        ギフト
      </div>

      <div class="feature-text">
        配信者にギフトを送れます。
      </div>

    </div>

  </div>

</section>


</div>


<!-- =======================================================
     FULLSCREEN LIVE PANEL
======================================================= -->

<div
  id="livePanel"
  class="live-panel"
>

  <div
    id="liveBackground"
    class="live-background"
  ></div>


  <div class="live-dark"></div>


  <div class="live-content">


    <!-- TOP -->

    <div class="live-top">

      <div class="live-user">

        <div class="live-user-avatar">
          🎙️
        </div>

        <div class="live-user-info">

          <div
            class="live-user-name"
            id="liveUserName"
          >
            VoiceボタLive
          </div>

          <div
            class="live-user-title"
            id="liveUserTitle"
          >
            音声ライブ配信中
          </div>

        </div>

      </div>


      <div class="live-top-right">

        <div class="live-badge-big">
          🔴 LIVE
        </div>

        <button
          class="close-live"
          onclick="closeLivePanel()"
        >
          ×
        </button>

      </div>

    </div>


    <!-- CENTER -->

    <div class="live-center">

      <div class="voice-orb">
        🎙️
      </div>

      <div
        class="live-center-text"
        id="liveCenterText"
      >
        音声ライブ配信中
      </div>

    </div>


    <!-- COMMENTS -->

    <div
      class="live-comments"
      id="liveComments"
    ></div>


    <!-- RIGHT ACTIONS -->

    <div class="live-actions">

      <button
        class="live-action"
        onclick="sendLike()"
      >

        <div class="live-action-icon">
          ❤️
        </div>

        <div class="live-action-label">
          いいね
        </div>

      </button>


      <button
        class="live-action"
        onclick="toggleGiftMenu()"
      >

        <div class="live-action-icon">
          🎁
        </div>

        <div class="live-action-label">
          ギフト
        </div>

      </button>


      <button
        class="live-action"
        onclick="shareLive()"
      >

        <div class="live-action-icon">
          📤
        </div>

        <div class="live-action-label">
          シェア
        </div>

      </button>


      <button
        class="live-action"
        id="muteButton"
        onclick="toggleMute()"
      >

        <div
          class="live-action-icon"
          id="muteIcon"
        >
          🔊
        </div>

        <div class="live-action-label">
          音声
        </div>

      </button>


      <button
        class="live-action"
        id="backgroundButton"
        onclick="toggleBackgroundSettings()"
        style="display:none"
      >

        <div class="live-action-icon">
          🎨
        </div>

        <div class="live-action-label">
          背景
        </div>

      </button>

    </div>


    <!-- GIFT MENU -->

    <div
      class="gift-menu"
      id="giftMenu"
    >

      <div class="gift-grid">

        <button
          class="gift-btn"
          onclick="sendGift('🌸','花')"
        >

          <b>🌸</b>

          <span>
            花
          </span>

        </button>


        <button
          class="gift-btn"
          onclick="sendGift('⭐','星')"
        >

          <b>⭐</b>

          <span>
            星
          </span>

        </button>


        <button
          class="gift-btn"
          onclick="sendGift('💎','ダイヤ')"
        >

          <b>💎</b>

          <span>
            ダイヤ
          </span>

        </button>


        <button
          class="gift-btn"
          onclick="sendGift('🌙','月')"
        >

          <b>🌙</b>

          <span>
            月
          </span>

        </button>

      </div>

    </div>


    <!-- BACKGROUND SETTINGS -->

    <div
      class="background-settings"
      id="backgroundSettings"
    >

      <div class="background-title">
        🎨 配信画面の背景
      </div>

      <div class="background-grid">

        <button
          class="bg-blue"
          onclick="setLiveBackgroundPreset('blue')"
        >
          青
        </button>

        <button
          class="bg-purple"
          onclick="setLiveBackgroundPreset('purple')"
        >
          紫
        </button>

        <button
          class="bg-pink"
          onclick="setLiveBackgroundPreset('pink')"
        >
          ピンク
        </button>

        <button
          class="bg-image"
          onclick="document.getElementById('backgroundFile').click()"
        >
          画像
        </button>

      </div>


      <input
        id="backgroundFile"
        type="file"
        accept="image/*"
        onchange="handleBackgroundFile(event)"
      >


      <button
        class="bg-reset"
        onclick="resetLiveBackground()"
      >
        背景をリセット
      </button>

    </div>


    <!-- AUDIO -->

    <button
      id="audioEnableButton"
      class="audio-enable"
      onclick="enableAudio()"
    >
      🔊 音声をONにする
    </button>


    <!-- BOTTOM -->

    <div class="live-bottom">

      <div
        class="viewer-count"
        id="viewerCount"
      >
        👀 1人が視聴中
      </div>


      <div class="comment-box">

        <input
          id="commentInput"
          maxlength="200"
          placeholder="コメントを入力..."
          onkeydown="handleCommentKey(event)"
        >

        <button
          class="comment-send"
          onclick="sendComment()"
        >
          ➤
        </button>

      </div>


      <div
        class="broadcaster-controls"
        id="broadcasterControls"
      >

        <button
          class="end-live-button"
          onclick="stopLive()"
        >
          ⛔ 配信を終了する
        </button>

      </div>

    </div>


  </div>


  <audio
    id="remoteAudio"
    autoplay
    playsinline
  ></audio>

</div>


<!-- =======================================================
     BOTTOM NAV
======================================================= -->

<nav class="bottom-nav">

  <button
    class="nav-item"
    onclick="goHome()"
  >

    <div class="nav-icon">
      🏠
    </div>

    ホーム

  </button>


  <button
    class="nav-item"
    onclick="scrollLive()"
  >

    <div class="nav-icon">
      🔎
    </div>

    探す

  </button>


  <button
    class="nav-item"
    onclick="startLive()"
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

    <div class="nav-icon">
      🔔
    </div>

    お知らせ

  </button>


  <button
    class="nav-item"
    onclick="showProfile()"
  >

    <div class="nav-icon">
      👤
    </div>

    マイページ

  </button>

</nav>


<script>

/* =========================================================
   VARIABLES
========================================================= */

let socket = null;

let myId =
  "user_" +
  Math.random()
    .toString(36)
    .substring(2,12);

let connected = false;

let isBroadcaster = false;

let localStream = null;

let peerConnections = {};

let pendingIceCandidates = {};

let currentUserName = "ユーザー";

let currentLiveId = null;

let currentBroadcasterId = null;

let currentLiveTitle = "";

let viewerCount = 1;

let isMuted = false;

let liveBackgroundData =
  localStorage.getItem(
    "voiceBotaLiveBackground"
  ) || "";


/* =========================================================
   SOCKET
========================================================= */

function connectSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const url =
    protocol +
    "//" +
    location.host;

  try {

    socket =
      new WebSocket(url);

  } catch(error) {

    console.error(error);

    return;

  }


  socket.onopen =
    function() {

      connected = true;

      const online =
        document.getElementById(
          "onlineText"
        );

      if (online) {

        online.textContent =
          "オンライン";

      }

      send({

        type:
          "hello",

        clientId:
          myId

      });

    };


  socket.onclose =
    function() {

      connected = false;

      const online =
        document.getElementById(
          "onlineText"
        );

      if (online) {

        online.textContent =
          "再接続中...";

      }

      setTimeout(
        connectSocket,
        2000
      );

    };


  socket.onerror =
    function(error) {

      console.error(
        "WebSocket error",
        error
      );

    };


  socket.onmessage =
    function(event) {

      let data;

      try {

        data =
          JSON.parse(
            event.data
          );

      } catch(error) {

        return;

      }

      handleMessage(data);

    };

}


function send(data) {

  if (
    socket &&
    socket.readyState ===
      WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

    return true;

  }

  return false;

}


/* =========================================================
   MESSAGE
========================================================= */

function handleMessage(data) {


  if (
    data.type ===
    "live_list"
  ) {

    renderLiveList(
      data.lives || []
    );

    return;

  }


  if (
    data.type ===
    "live_started"
  ) {

    setLiveCenterText(
      "🔴 配信中"
    );

    return;

  }


  if (
    data.type ===
    "live_start_failed"
  ) {

    alert(
      data.reason ||
      "配信を開始できませんでした。"
    );

    return;

  }


  if (
    data.type ===
    "viewer_joined"
  ) {

    viewerCount++;

    updateViewerCount();

    createOffer(
      data.viewerId
    );

    return;

  }


  if (
    data.type ===
    "viewer_count"
  ) {

    viewerCount =
      Number(
        data.count || 1
      );

    updateViewerCount();

    return;

  }


  if (
    data.type ===
    "offer"
  ) {

    receiveOffer(
      data
    );

    return;

  }


  if (
    data.type ===
    "answer"
  ) {

    receiveAnswer(
      data
    );

    return;

  }


  if (
    data.type ===
    "ice"
  ) {

    receiveIce(
      data
    );

    return;

  }


  if (
    data.type ===
    "comment"
  ) {

    addLiveComment(
      data.name,
      data.text
    );

    return;

  }


  if (
    data.type ===
    "like"
  ) {

    addLiveComment(
      "システム",
      "❤️ " +
      data.name +
      " さんがいいねしました"
    );

    showLikeAnimation();

    return;

  }


  if (
    data.type ===
    "gift"
  ) {

    addLiveComment(
      "🎁 ギフト",
      data.name +
      " さんが " +
      data.gift +
      " " +
      data.giftName +
      " を送りました"
    );

    showGiftAnimation(
      data.gift || "🎁"
    );

    return;

  }


  if (
    data.type ===
    "live_stopped"
  ) {

    setLiveCenterText(
      "配信終了"
    );

    const audio =
      document.getElementById(
        "remoteAudio"
      );

    try {

      audio.pause();

    } catch(error) {}

    closePeers();

    if (!isBroadcaster) {

      setTimeout(
        function() {

          closeLivePanel();

        },
        1200
      );

    }

    renderLiveList([]);

    return;

  }


  if (
    data.type ===
    "live_unavailable"
  ) {

    alert(
      "このライブは終了しています。"
    );

    closeLivePanel();

    return;

  }

}


/* =========================================================
   LIVE LIST
========================================================= */

let liveBackgrounds = {};


function renderLiveList(lives) {

  liveBackgrounds = {};

  const list =
    document.getElementById(
      "liveList"
    );

  if (
    !lives ||
    lives.length === 0
  ) {

    list.innerHTML =
      '<div class="empty">' +
      '現在ライブ中の配信はありません' +
      '</div>';

    return;

  }


  let html = "";


  lives.forEach(
    function(live) {

      liveBackgrounds[
        live.id
      ] =
        live.background || "";


      html +=

        '<div class="live-card" ' +
        'onclick="listenLive(\'' +
        escapeJsString(
          live.id
        ) +
        '\')">' +

        '<div class="live-avatar">' +
        '🎙️' +
        '</div>' +

        '<div class="live-info">' +

        '<div class="live-name">' +
        escapeHtml(
          live.name
        ) +
        '</div>' +

        '<div class="live-title">' +
        escapeHtml(
          live.title
        ) +
        '</div>' +

        '<div class="live-meta">' +
        '👀 LIVE NOW' +
        '</div>' +

        '<span class="live-badge">' +
        'LIVE' +
        '</span>' +

        '</div>' +

        '</div>';

    }
  );


  list.innerHTML =
    html;

}


function escapeHtml(value) {

  return String(
    value || ""
  )
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
    "&#39;"
  );

}


function escapeJsString(value) {

  return String(
    value || ""
  )
  .replace(
    /\\/g,
    "\\\\"
  )
  .replace(
    /'/g,
    "\\'"
  )
  .replace(
    /\n/g,
    "\\n"
  )
  .replace(
    /\r/g,
    "\\r"
  );

}


/* =========================================================
   START LIVE
========================================================= */

async function startLive() {

  if (
    isBroadcaster
  ) {

    openLivePanel();

    return;

  }


  if (!connected) {

    alert(
      "サーバーに接続中です。\\n" +
      "少し待ってからもう一度押してください。"
    );

    return;

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "このブラウザではマイクを使用できません。"
    );

    return;

  }


  const name =
    prompt(
      "配信者名を入力してください",
      "まめコロ"
    );


  if (
    name === null ||
    name.trim() === ""
  ) {

    return;

  }


  const title =
    prompt(
      "配信タイトルを入力してください",
      "VoiceボタLive 配信中"
    );


  if (
    title === null ||
    title.trim() === ""
  ) {

    return;

  }


  currentUserName =
    name.trim();

  currentLiveTitle =
    title.trim();


  try {

    localStream =
      await navigator
        .mediaDevices
        .getUserMedia({

          audio: {

            echoCancellation:
              true,

            noiseSuppression:
              true,

            autoGainControl:
              true,

            channelCount:
              1,

            sampleRate:
              48000

          },

          video:
            false

        });


  } catch(error) {

    console.error(
      "MIC ERROR",
      error
    );

    alert(
      "マイクを使用できませんでした。\\n\\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    return;

  }


  isBroadcaster =
    true;


  document.getElementById(
    "liveUserName"
  ).textContent =
    currentUserName;


  document.getElementById(
    "liveUserTitle"
  ).textContent =
    currentLiveTitle;


  document.getElementById(
    "backgroundButton"
  ).style.display =
    "flex";


  document.getElementById(
    "broadcasterControls"
  ).classList.add(
    "show"
  );


  openLivePanel();


  setLiveCenterText(
    "🎙️ マイク配信中"
  );


  const sent =
    send({

      type:
        "start_live",

      clientId:
        myId,

      name:
        currentUserName,

      title:
        currentLiveTitle,

      background:
        liveBackgroundData || ""

    });


  if (!sent) {

    alert(
      "サーバーとの接続が切れました。"
    );

    stopLocalMicrophone();

    return;

  }


  viewerCount =
    1;

  updateViewerCount();

}


/* =========================================================
   STOP LIVE
========================================================= */

function stopLive() {

  if (!isBroadcaster) {

    closeLivePanel();

    return;

  }


  send({

    type:
      "stop_live"

  });


  stopLocalMicrophone();

  closePeers();


  isBroadcaster =
    false;


  document.getElementById(
    "backgroundButton"
  ).style.display =
    "none";


  document.getElementById(
    "broadcasterControls"
  ).classList.remove(
    "show"
  );


  viewerCount =
    1;

  updateViewerCount();


  setTimeout(
    function() {

      closeLivePanel();

    },
    300
  );

}


function stopLocalMicrophone() {

  if (
    localStream
  ) {

    localStream
      .getTracks()
      .forEach(
        function(track) {

          try {

            track.stop();

          } catch(error) {}

        }
      );

  }

  localStream =
    null;

}


/* =========================================================
   LISTEN LIVE
========================================================= */

function listenLive(liveId) {

  if (
    isBroadcaster
  ) {

    alert(
      "配信中は他のライブを視聴できません。"
    );

    return;

  }


  currentLiveId =
    liveId;


  const bg =
    liveBackgrounds[
      liveId
    ] || "";


  if (bg) {

    applyLiveBackground(
      bg
    );

  } else {

    setLiveBackgroundPreset(
      "blue"
    );

  }


  openLivePanel();


  document.getElementById(
    "backgroundButton"
  ).style.display =
    "none";


  document.getElementById(
    "broadcasterControls"
  ).classList.remove(
    "show"
  );


  document.getElementById(
    "liveCenterText"
  ).textContent =
    "🎧 配信者に接続中";


  send({

    type:
      "join_live",

    clientId:
      myId,

    liveId:
      liveId

  });

}


/* =========================================================
   WEBRTC OFFER
========================================================= */

async function createOffer(viewerId) {

  if (
    !isBroadcaster ||
    !localStream
  ) {

    return;

  }


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    viewerId
  ] =
    pc;


  pendingIceCandidates[
    viewerId
  ] = [];


  localStream
    .getTracks()
    .forEach(
      function(track) {

        const sender =
          pc.addTrack(
            track,
            localStream
          );


        try {

          const params =
            sender.getParameters();

          if (
            !params.encodings ||
            !params.encodings.length
          ) {

            params.encodings =
              [{}];

          }

          params.encodings[0]
            .maxBitrate =
              64000;

          sender.setParameters(
            params
          );

        } catch(error) {}

      }
    );


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send({

          type:
            "ice",

          from:
            myId,

          to:
            viewerId,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    function() {

      if (
        pc.connectionState ===
          "connected"
      ) {

        console.log(
          "Viewer connected:",
          viewerId
        );

      }

      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "closed"
      ) {

        delete
          peerConnections[
            viewerId
          ];

      }

    };


  try {

    const offer =
      await pc.createOffer({

        offerToReceiveAudio:
          false,

        offerToReceiveVideo:
          false

      });


    await pc.setLocalDescription(
      offer
    );


    send({

      type:
        "offer",

      from:
        myId,

      to:
        viewerId,

      sdp:
        pc.localDescription

    });


  } catch(error) {

    console.error(
      "OFFER ERROR",
      error
    );

  }

}


/* =========================================================
   RECEIVE OFFER
========================================================= */

async function receiveOffer(data) {

  currentBroadcasterId =
    data.from;


  closeViewerPeer();


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    data.from
  ] =
    pc;


  pendingIceCandidates[
    data.from
  ] = [];


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

      }


      audio.volume =
        1;


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioEnableButton"
            ).style.display =
              "none";


            document.getElementById(
              "muteIcon"
            ).textContent =
              "🔊";


            setLiveCenterText(
              "🔊 LIVE 音声"
            );

          }
        )
        .catch(
          function() {

            document.getElementById(
              "audioEnableButton"
            ).style.display =
              "block";


            setLiveCenterText(
              "🔊 音声をONにしてください"
            );

          }
        );

    };


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send({

          type:
            "ice",

          from:
            myId,

          to:
            data.from,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    function() {

      if (
        pc.connectionState ===
        "connected"
      ) {

        setLiveCenterText(
          "🔊 LIVE 音声"
        );

      }

    };


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


    const candidates =
      pendingIceCandidates[
        data.from
      ] || [];


    for (
      const candidate
      of candidates
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch(error) {}

    }


    pendingIceCandidates[
      data.from
    ] = [];


    const answer =
      await pc.createAnswer();


    await pc.setLocalDescription(
      answer
    );


    send({

      type:
        "answer",

      from:
        myId,

      to:
        data.from,

      sdp:
        pc.localDescription

    });


  } catch(error) {

    console.error(
      "RECEIVE OFFER ERROR",
      error
    );

  }

}


/* =========================================================
   ANSWER
========================================================= */

async function receiveAnswer(data) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) {

    return;

  }


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


  } catch(error) {

    console.error(
      "ANSWER ERROR",
      error
    );

  }

}


/* =========================================================
   ICE
========================================================= */

async function receiveIce(data) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) {

    return;

  }


  try {

    if (
      pc.remoteDescription &&
      pc.remoteDescription.type
    ) {

      await pc.addIceCandidate(
        data.candidate
      );

    } else {

      if (
        !pendingIceCandidates[
          data.from
        ]
      ) {

        pendingIceCandidates[
          data.from
        ] = [];

      }

      pendingIceCandidates[
        data.from
      ].push(
        data.candidate
      );

    }

  } catch(error) {

    console.error(
      "ICE ERROR",
      error
    );

  }

}


/* =========================================================
   AUDIO
========================================================= */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  audio.muted =
    false;

  audio.volume =
    1;


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioEnableButton"
        ).style.display =
          "none";


        document.getElementById(
          "muteIcon"
        ).textContent =
          "🔊";


        isMuted =
          false;


        setLiveCenterText(
          "🔊 LIVE 音声"
        );

      }
    )
    .catch(
      function(error) {

        console.error(
          "AUDIO ERROR",
          error
        );

      }
    );

}


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  if (
    isBroadcaster
  ) {

    if (!localStream) {

      return;

    }


    const tracks =
      localStream.getAudioTracks();


    tracks.forEach(
      function(track) {

        track.enabled =
          !track.enabled;

        isMuted =
          !track.enabled;

      }
    );


    document.getElementById(
      "muteIcon"
    ).textContent =
      isMuted
        ? "🔇"
        : "🎙️";


    return;

  }


  isMuted =
    !isMuted;


  audio.muted =
    isMuted;


  document.getElementById(
    "muteIcon"
  ).textContent =
    isMuted
      ? "🔇"
      : "🔊";

}


/* =========================================================
   COMMENTS
========================================================= */

function handleCommentKey(event) {

  if (
    event.key ===
    "Enter"
  ) {

    sendComment();

  }

}


function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );


  const text =
    input.value.trim();


  if (!text) {

    return;

  }


  send({

    type:
      "comment",

    name:
      currentUserName,

    text:
      text

  });


  input.value =
    "";

}


function addLiveComment(
  name,
  text
) {

  const list =
    document.getElementById(
      "liveComments"
    );


  const item =
    document.createElement(
      "div"
    );


  item.className =
    "live-comment";


  const safeName =
    escapeHtml(
      name
    );


  const safeText =
    escapeHtml(
      text
    );


  item.innerHTML =
    '<span class="live-comment-name">' +
    safeName +
    '</span> ' +
    safeText;


  list.appendChild(
    item
  );


  while (
    list.children.length >
    8
  ) {

    list.removeChild(
      list.firstChild
    );

  }


  setTimeout(
    function() {

      if (
        item.parentNode
      ) {

        item.remove();

      }

    },
    10000
  );

}


/* =========================================================
   LIKE
========================================================= */

function sendLike() {

  send({

    type:
      "like",

    name:
      currentUserName

  });


  showLikeAnimation();

}


function showLikeAnimation() {

  const panel =
    document.getElementById(
      "livePanel"
    );


  const like =
    document.createElement(
      "div"
    );


  like.className =
    "like-pop";


  like.textContent =
    Math.random() > .5
      ? "❤️"
      : "💗";


  panel.appendChild(
    like
  );


  setTimeout(
    function() {

      like.remove();

    },
    1100
  );

}


/* =========================================================
   GIFTS
========================================================= */

function toggleGiftMenu() {

  const menu =
    document.getElementById(
      "giftMenu"
    );


  menu.classList.toggle(
    "show"
  );

}


function sendGift(
  emoji,
  name
) {

  send({

    type:
      "gift",

    name:
      currentUserName,

    gift:
      emoji,

    giftName:
      name

  });


  document.getElementById(
    "giftMenu"
  ).classList.remove(
    "show"
  );


  showGiftAnimation(
    emoji
  );

}


function showGiftAnimation(
  emoji
) {

  const panel =
    document.getElementById(
      "livePanel"
    );


  const gift =
    document.createElement(
      "div"
    );


  gift.className =
    "like-pop";


  gift.textContent =
    emoji;


  panel.appendChild(
    gift
  );


  setTimeout(
    function() {

      gift.remove();

    },
    1100
  );

}


/* =========================================================
   SHARE
========================================================= */

async function shareLive() {

  const title =
    document.getElementById(
      "liveUserTitle"
    ).textContent;


  const shareData = {

    title:
      "VoiceボタLive",

    text:
      title +
      " - VoiceボタLive",

    url:
      location.href

  };


  if (
    navigator.share
  ) {

    try {

      await navigator.share(
        shareData
      );

    } catch(error) {}

    return;

  }


  try {

    await navigator.clipboard.writeText(
      location.href
    );

    alert(
      "配信ページのURLをコピーしました。"
    );

  } catch(error) {

    alert(
      location.href
    );

  }

}


/* =========================================================
   BACKGROUND
========================================================= */

function applyLiveBackground(
  background
) {

  const bg =
    document.getElementById(
      "liveBackground"
    );


  if (!bg) {

    return;

  }


  if (
    background &&
    background.startsWith(
      "data:image"
    )
  ) {

    bg.style.backgroundImage =
      "linear-gradient(rgba(3,5,16,.32),rgba(3,5,16,.70)),url('" +
      background +
      "')";

  } else if (
    background
  ) {

    bg.style.backgroundImage =
      background;

  } else {

    bg.style.backgroundImage =
      "linear-gradient(135deg,#101846,#07091b)";

  }


  bg.style.backgroundSize =
    "cover";

  bg.style.backgroundPosition =
    "center";

  bg.style.backgroundRepeat =
    "no-repeat";

}


function setLiveBackgroundPreset(
  type
) {

  const backgrounds = {

    blue:
      "linear-gradient(135deg,#111a4b,#243b8f 55%,#080b1e)",

    purple:
      "linear-gradient(135deg,#24103e,#8d2f9d 55%,#090719)",

    pink:
      "linear-gradient(135deg,#3d102b,#c82f76 55%,#100617)"

  };


  const bg =
    document.getElementById(
      "liveBackground"
    );


  bg.style.backgroundImage =
    backgrounds[type] ||
    backgrounds.blue;


  bg.style.backgroundSize =
    "cover";

  bg.style.backgroundPosition =
    "center";

}


function handleBackgroundFile(
  event
) {

  const file =
    event.target.files &&
    event.target.files[0];


  if (!file) {

    return;

  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    alert(
      "画像ファイルを選択してください。"
    );

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      const img =
        new Image();


      img.onload =
        function() {

          const maxSize =
            1400;


          const scale =
            Math.min(
              1,
              maxSize /
              Math.max(
                img.width,
                img.height
              )
            );


          const canvas =
            document.createElement(
              "canvas"
            );


          canvas.width =
            Math.max(
              1,
              Math.round(
                img.width *
                scale
              )
            );


          canvas.height =
            Math.max(
              1,
              Math.round(
                img.height *
                scale
              )
            );


          const ctx =
            canvas.getContext(
              "2d"
            );


          ctx.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
          );


          liveBackgroundData =
            canvas.toDataURL(
              "image/jpeg",
              0.68
            );


          try {

            localStorage.setItem(
              "voiceBotaLiveBackground",
              liveBackgroundData
            );

          } catch(error) {

            console.error(
              "BACKGROUND SAVE ERROR",
              error
            );

          }


          applyLiveBackground(
            liveBackgroundData
          );


          if (
            isBroadcaster
          ) {

            send({

              type:
                "update_background",

              background:
                liveBackgroundData

            });

          }


          alert(
            "背景画像を設定しました。"
          );

        };


      img.src =
        e.target.result;

    };


  reader.readAsDataURL(
    file
  );

}


function resetLiveBackground() {

  liveBackgroundData =
    "";


  localStorage.removeItem(
    "voiceBotaLiveBackground"
  );


  setLiveBackgroundPreset(
    "blue"
  );


  if (
    isBroadcaster
  ) {

    send({

      type:
        "update_background",

      background:
        ""

    });

  }

}


function toggleBackgroundSettings() {

  const settings =
    document.getElementById(
      "backgroundSettings"
    );


  settings.classList.toggle(
    "show"
  );

}


/* =========================================================
   PANEL
========================================================= */

function openLivePanel() {

  document.getElementById(
    "livePanel"
  ).classList.add(
    "show"
  );


  if (
    liveBackgroundData &&
    isBroadcaster
  ) {

    applyLiveBackground(
      liveBackgroundData
    );

  } else {

    setLiveBackgroundPreset(
      "blue"
    );

  }

}


function closeLivePanel() {

  if (
    isBroadcaster
  ) {

    return;

  }


  closePeers();


  document.getElementById(
    "livePanel"
  ).classList.remove(
    "show"
  );


  document.getElementById(
    "audioEnableButton"
  ).style.display =
    "none";


  document.getElementById(
    "giftMenu"
  ).classList.remove(
    "show"
  );

}


function setLiveCenterText(
  text
) {

  const el =
    document.getElementById(
      "liveCenterText"
    );


  if (el) {

    el.textContent =
      text;

  }

}


/* =========================================================
   VIEWER COUNT
========================================================= */

function updateViewerCount() {

  const el =
    document.getElementById(
      "viewerCount"
    );


  if (!el) {

    return;

  }


  el.textContent =
    "👀 " +
    Math.max(
      1,
      viewerCount
    ) +
    "人が視聴中";

}


/* =========================================================
   PEERS
========================================================= */

function closeViewerPeer() {

  if (
    currentBroadcasterId &&
    peerConnections[
      currentBroadcasterId
    ]
  ) {

    try {

      peerConnections[
        currentBroadcasterId
      ].close();

    } catch(error) {}

    delete
      peerConnections[
        currentBroadcasterId
      ];

  }

}


function closePeers() {

  Object.keys(
    peerConnections
  ).forEach(
    function(key) {

      try {

        peerConnections[
          key
        ].close();

      } catch(error) {}

    }
  );


  peerConnections =
    {};


  pendingIceCandidates =
    {};

}


/* =========================================================
   NAV
========================================================= */

function goHome() {

  if (
    document.getElementById(
      "livePanel"
    ).classList.contains(
      "show"
    ) &&
    !isBroadcaster
  ) {

    closeLivePanel();

  }


  window.scrollTo({

    top:
      0,

    behavior:
      "smooth"

  });

}


function scrollLive() {

  document.getElementById(
    "liveSection"
  ).scrollIntoView({

    behavior:
      "smooth"

  });

}


function showNotice() {

  alert(
    "お知らせ機能はこれから追加できます。"
  );

}


function showProfile() {

  alert(
    "マイページ機能はこれから追加できます。"
  );

}


/* =========================================================
   RTC CONFIG
========================================================= */

const rtcConfig = {

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
    "require"

};


/* =========================================================
   LOAD
========================================================= */

window.addEventListener(
  "load",
  function() {

    if (
      liveBackgroundData
    ) {

      applyLiveBackground(
        liveBackgroundData
      );

    }


    connectSocket();

  }
);

</script>

</body>
</html>`;


/* =========================================================
   HTTP SERVER
========================================================= */

const server =
  http.createServer(
    function(req, res) {

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

        res.end(
          HTML
        );

        return;

      }


      if (
        url === "/home.png"
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
                "public, max-age=3600"
            }
          );


          fs.createReadStream(
            file
          ).pipe(res);

          return;

        }


        res.writeHead(
          404
        );

        res.end(
          "home.png not found"
        );

        return;

      }


      if (
        url === "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "application/json"
          }
        );


        res.end(
          JSON.stringify({

            status:
              "ok",

            live:
              liveInfo.active,

            name:
              liveInfo.name,

            title:
              liveInfo.title

          })
        );

        return;

      }


      res.writeHead(
        404
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
    server:
      server
  });


function sendTo(
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

  const message =
    JSON.stringify(
      data
    );


  clients.forEach(
    function(client) {

      if (
        client.readyState ===
        WebSocket.OPEN
      ) {

        client.send(
          message
        );

      }

    }
  );

}


function getLiveList() {

  if (
    !liveInfo.active
  ) {

    return [];

  }


  return [

    {

      id:
        liveInfo.id,

      name:
        liveInfo.name,

      title:
        liveInfo.title,

      background:
        liveInfo.background || "",

      startedAt:
        liveInfo.startedAt

    }

  ];

}


function sendLiveList() {

  broadcast({

    type:
      "live_list",

    lives:
      getLiveList()

  });

}


/* =========================================================
   VIEWER COUNT
========================================================= */

function getViewerCount() {

  let count =
    0;


  clients.forEach(
    function(client) {

      if (
        client.joinedLive
      ) {

        count++;

      }

    }
  );


  return Math.max(
    1,
    count
  );

}


function sendViewerCount() {

  broadcast({

    type:
      "viewer_count",

    count:
      getViewerCount()

  });

}


/* =========================================================
   STOP SERVER LIVE
========================================================= */

function stopLiveServer() {

  broadcaster =
    null;


  clients.forEach(
    function(client) {

      client.joinedLive =
        false;

      client.isBroadcaster =
        false;

    }
  );


  liveInfo = {

    active:
      false,

    id:
      null,

    name:
      "",

    title:
      "",

    background:
      "",

    startedAt:
      null

  };


  broadcast({

    type:
      "live_stopped",

    lives:
      []

  });


  sendLiveList();

}


/* =========================================================
   CONNECTION
========================================================= */

wss.on(
  "connection",
  function(ws) {

    clients.add(
      ws
    );


    ws.clientId =
      "server_" +
      Math.random()
        .toString(36)
        .substring(2,12);


    ws.isBroadcaster =
      false;

    ws.joinedLive =
      false;


    sendTo(
      ws,
      {

        type:
          "live_list",

        lives:
          getLiveList()

      }
    );


    ws.on(
      "message",
      function(raw) {

        let data;


        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch(error) {

          return;

        }


        /* =================================================
           HELLO
        ================================================= */

        if (
          data.type ===
          "hello"
        ) {

          if (
            data.clientId
          ) {

            ws.clientId =
              String(
                data.clientId
              ).substring(
                0,
                100
              );

          }

          return;

        }


        /* =================================================
           START LIVE
        ================================================= */

        if (
          data.type ===
          "start_live"
        ) {

          if (
            broadcaster &&
            broadcaster !== ws &&
            broadcaster.readyState ===
              WebSocket.OPEN
          ) {

            sendTo(
              ws,
              {

                type:
                  "live_start_failed",

                reason:
                  "現在ほかの配信者が配信中です。"

              }
            );

            return;

          }


          broadcaster =
            ws;


          ws.isBroadcaster =
            true;


          ws.joinedLive =
            true;


          liveInfo = {

            active:
              true,

            id:
              ws.clientId,

            name:
              String(
                data.name ||
                "VoiceボタLive配信者"
              ).substring(
                0,
                30
              ),

            title:
              String(
                data.title ||
                "音声ライブ配信中"
              ).substring(
                0,
                100
              ),

            background:
              String(
                data.background ||
                ""
              ).substring(
                0,
                180000
              ),

            startedAt:
              Date.now()

          };


          sendTo(
            ws,
            {

              type:
                "live_started"

            }
          );


          sendLiveList();

          sendViewerCount();

          return;

        }


        /* =================================================
           UPDATE BACKGROUND
        ================================================= */

        if (
          data.type ===
          "update_background"
        ) {

          if (
            broadcaster ===
            ws
          ) {

            liveInfo.background =
              String(
                data.background ||
                ""
              ).substring(
                0,
                180000
              );


            sendLiveList();

          }

          return;

        }


        /* =================================================
           STOP LIVE
        ================================================= */

        if (
          data.type ===
          "stop_live"
        ) {

          if (
            broadcaster ===
            ws
          ) {

            stopLiveServer();

          }

          return;

        }


        /* =================================================
           JOIN LIVE
        ================================================= */

        if (
          data.type ===
          "join_live"
        ) {

          if (
            !liveInfo.active ||
            !broadcaster ||
            broadcaster.readyState !==
              WebSocket.OPEN
          ) {

            sendTo(
              ws,
              {

                type:
                  "live_unavailable"

              }
            );

            return;

          }


          ws.joinedLive =
            true;


          sendTo(
            broadcaster,
            {

              type:
                "viewer_joined",

              viewerId:
                ws.clientId

            }
          );


          sendViewerCount();

          return;

        }


        /* =================================================
           WEBRTC
        ================================================= */

        if (
          data.type === "offer" ||
          data.type === "answer" ||
          data.type === "ice"
        ) {

          let target =
            null;


          clients.forEach(
            function(client) {

              if (
                client.clientId ===
                data.to
              ) {

                target =
                  client;

              }

            }
          );


          if (
            target
          ) {

            sendTo(
              target,
              data
            );

          }


          return;

        }


        /* =================================================
           COMMENT
        ================================================= */

        if (
          data.type ===
          "comment"
        ) {

          if (
            !liveInfo.active
          ) {

            return;

          }


          broadcast({

            type:
              "comment",

            name:
              String(
                data.name ||
                "ユーザー"
              ).substring(
                0,
                30
              ),

            text:
              String(
                data.text ||
                ""
              ).substring(
                0,
                200
              )

          });


          return;

        }


        /* =================================================
           LIKE
        ================================================= */

        if (
          data.type ===
          "like"
        ) {

          if (
            !liveInfo.active
          ) {

            return;

          }


          broadcast({

            type:
              "like",

            name:
              String(
                data.name ||
                "ユーザー"
              ).substring(
                0,
                30
              )

          });


          return;

        }


        /* =================================================
           GIFT
        ================================================= */

        if (
          data.type ===
          "gift"
        ) {

          if (
            !liveInfo.active
          ) {

            return;

          }


          broadcast({

            type:
              "gift",

            name:
              String(
                data.name ||
                "ユーザー"
              ).substring(
                0,
                30
              ),

            gift:
              String(
                data.gift ||
                "🎁"
              ).substring(
                0,
                10
              ),

            giftName:
              String(
                data.giftName ||
                "ギフト"
              ).substring(
                0,
                30
              )

          });


          return;

        }

      }
    );


    /* =====================================================
       CLOSE
    ===================================================== */

    ws.on(
      "close",
      function() {

        clients.delete(
          ws
        );


        if (
          broadcaster ===
          ws
        ) {

          stopLiveServer();

          console.log(
            "Broadcaster disconnected"
          );

          return;

        }


        if (
          ws.joinedLive
        ) {

          ws.joinedLive =
            false;


          if (
            broadcaster &&
            broadcaster.readyState ===
              WebSocket.OPEN
          ) {

            sendTo(
              broadcaster,
              {

                type:
                  "viewer_left",

                viewerId:
                  ws.clientId

              }
            );

          }


          sendViewerCount();

        }

      }
    );


    ws.on(
      "error",
      function(error) {

        console.error(
          "WS ERROR:",
          error
        );

      }
    );

  }
);


/* =========================================================
   SERVER START
========================================================= */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "================================="
    );

    console.log(
      "VoiceボタLive"
    );

    console.log(
      "Server started"
    );

    console.log(
      "HOST:",
      HOST
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "================================="
    );

  }
);


/* =========================================================
   ERROR HANDLING
========================================================= */

process.on(
  "uncaughtException",
  function(error) {

    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );

  }
);


process.on(
  "unhandledRejection",
  function(error) {

    console.error(
      "UNHANDLED REJECTION:",
      error
    );

  }
);
