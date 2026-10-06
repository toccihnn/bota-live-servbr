const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

let clients = new Set();
let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  background: ""
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

<meta
  name="theme-color"
  content="#050510"
>

<title>VoiceボタLive</title>

<style>

/* =========================================================
   BASE
========================================================= */

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

  background: #050510;
  color: white;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
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
  cursor: pointer;
}


/* =========================================================
   APP
========================================================= */

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

  padding: 0 18px;

  background:
    rgba(5,5,16,.94);

  backdrop-filter:
    blur(15px);

  border-bottom:
    1px solid
    rgba(130,140,255,.15);
}

.logo {

  font-size: 18px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #8fd9ff,
      #d38cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}


/* =========================================================
   HOME HERO
========================================================= */

.hero {

  margin-top: 58px;

  width: 100%;

  overflow: hidden;
}

.hero-image-wrap {

  width: 100%;
  max-width: 1000px;

  margin: auto;

  position: relative;

  overflow: hidden;

  background: #050510;
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

  height: 55%;

  background:
    linear-gradient(
      0deg,
      #050510,
      rgba(5,5,16,.7),
      transparent
    );
}

.hero-content {

  max-width: 1000px;

  margin:
    -30px auto 0;

  padding:
    0 18px 28px;

  position: relative;
}

.hero-small {

  font-size: 12px;

  color: #b8c7ff;

  font-weight: 800;
}

.hero-title {

  margin:
    8px 0 0;

  font-size:
    clamp(28px,8vw,48px);

  line-height: 1.2;

  font-weight: 900;
}

.hero-title span {

  background:
    linear-gradient(
      90deg,
      #fff,
      #9edcff,
      #d38cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}

.hero-description {

  margin-top: 12px;

  font-size: 13px;

  line-height: 1.8;

  color: #d2d9ef;
}


/* =========================================================
   SECTION
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

  color: #7780a0;
}


/* =========================================================
   LIVE LIST
========================================================= */

.live-list {

  display: flex;

  flex-direction: column;

  gap: 10px;
}

.empty {

  padding: 35px 20px;

  text-align: center;

  color: #78819e;

  background: #0b0f25;

  border:
    1px solid
    rgba(100,120,200,.12);

  border-radius: 20px;
}

.live-card {

  min-height: 90px;

  display: flex;

  align-items: center;

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
    rgba(120,140,255,.15);

  transition:
    transform .15s ease;
}

.live-card:active {

  transform:
    scale(.98);
}

.live-avatar {

  width: 58px;
  height: 58px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

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

  color: #aab3d1;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.live-badge {

  display: inline-block;

  margin-top: 6px;

  padding:
    3px 9px;

  border-radius: 999px;

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

  display: grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 10px;

  margin-top: 15px;
}

.feature {

  min-height: 110px;

  padding:
    17px 14px;

  border-radius: 18px;

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

  font-size: 10px;

  line-height: 1.6;

  color: #8f99ba;
}


/* =========================================================
   FULL SCREEN LIVE PANEL
========================================================= */

.live-panel {

  display: none;

  position: fixed;

  inset: 0;

  z-index: 2000;

  width: 100vw;
  height: 100dvh;

  background: #050510;

  overflow: hidden;

  padding: 0 !important;
}

.live-panel.show {

  display: block;
}


/* =========================================================
   LIVE SCREEN
========================================================= */

.live-screen {

  position: relative;

  width: 100%;
  height: 100dvh;

  min-height: 100vh;

  overflow: hidden;

  background:
    radial-gradient(
      circle at 50% 30%,
      #30205f,
      #050510 70%
    );
}


/* =========================================================
   LIVE BACKGROUND
========================================================= */

.live-screen-bg {

  position: absolute;

  inset: 0;

  z-index: 0;

  background-size: cover;

  background-position: center;

  background-repeat: no-repeat;

  transform:
    scale(1.03);

  transition:
    background-image .3s ease;
}

.live-screen-overlay {

  position: absolute;

  inset: 0;

  z-index: 1;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.58),
      rgba(0,0,0,.10) 35%,
      rgba(0,0,0,.18) 60%,
      rgba(0,0,0,.82)
    );
}


/* =========================================================
   TOP
========================================================= */

.live-top {

  position: absolute;

  left: 0;
  right: 0;
  top: 0;

  z-index: 10;

  padding:
    calc(
      10px +
      env(safe-area-inset-top)
    )
    12px
    10px;
}

.live-top-title {

  display: flex;

  align-items: center;

  gap: 8px;

  padding:
    8px 10px;

  border-radius: 18px;

  background:
    rgba(5,5,15,.48);

  backdrop-filter:
    blur(12px);
}

.live-top-name {

  flex: 1;

  min-width: 0;

  font-size: 14px;

  font-weight: 900;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.live-close {

  width: 38px;
  height: 38px;

  border: 0;

  border-radius: 50%;

  background:
    rgba(0,0,0,.42);

  color: white;

  font-size: 26px;

  line-height: 1;
}


/* =========================================================
   HOST
========================================================= */

.live-host {

  display: flex;

  align-items: center;

  gap: 10px;

  margin-top: 9px;
}

.live-host-avatar {

  width: 58px;
  height: 58px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 28px;

  background:
    linear-gradient(
      135deg,
      #ff72d2,
      #7c63ff
    );

  border:
    3px solid
    rgba(255,255,255,.9);

  box-shadow:
    0 0 20px
    rgba(180,90,255,.55);
}

.live-host-info {

  flex: 1;

  min-width: 0;
}

.live-host-name {

  font-size: 16px;

  font-weight: 900;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.live-host-count {

  margin-top: 3px;

  font-size: 12px;

  color: #fff;
}

.live-live-badge {

  padding:
    5px 10px;

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      #ff3d86,
      #b13cff
    );

  font-size: 10px;

  font-weight: 900;
}


/* =========================================================
   VIEWERS
========================================================= */

.viewer-row {

  display: flex;

  gap: 6px;

  margin-top: 8px;

  overflow: hidden;
}

.viewer-avatar {

  width: 38px;
  height: 38px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 19px;

  background:
    linear-gradient(
      135deg,
      #73dcff,
      #a855f7
    );

  border:
    2px solid
    rgba(255,255,255,.8);
}


/* =========================================================
   COMMENTS
========================================================= */

.live-comments {

  position: absolute;

  left: 10px;
  right: 10px;

  bottom:
    calc(
      105px +
      env(safe-area-inset-bottom)
    );

  z-index: 8;

  max-height: 50vh;

  overflow: hidden;

  display: flex;

  flex-direction: column;

  justify-content: flex-end;

  pointer-events: none;
}

.live-comment {

  display: flex;

  align-items: flex-start;

  gap: 8px;

  margin-top: 8px;

  animation:
    commentIn .25s ease;
}

.live-comment-avatar {

  width: 36px;
  height: 36px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  background:
    linear-gradient(
      135deg,
      #ff8ad8,
      #596cff
    );

  font-size: 18px;

  border:
    1px solid
    rgba(255,255,255,.5);
}

.live-comment-body {

  max-width: 82%;
}

.live-comment-name {

  font-size: 11px;

  font-weight: 900;

  margin-bottom: 3px;
}

.live-comment-text {

  padding:
    8px 12px;

  border-radius: 15px;

  background:
    rgba(10,10,25,.72);

  backdrop-filter:
    blur(8px);

  font-size: 13px;

  line-height: 1.5;
}

@keyframes commentIn {

  from {
    opacity: 0;
    transform:
      translateY(12px);
  }

  to {
    opacity: 1;
    transform:
      translateY(0);
  }

}


/* =========================================================
   GIFT
========================================================= */

.live-gift-area {

  position: absolute;

  inset: 0;

  z-index: 12;

  pointer-events: none;
}

.live-gift {

  position: absolute;

  left: 55px;

  top: 32%;

  display: flex;

  align-items: center;

  gap: 8px;

  padding:
    7px 14px
    7px 7px;

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      rgba(255,55,180,.92),
      rgba(125,60,255,.9)
    );

  box-shadow:
    0 8px 30px
    rgba(0,0,0,.35);

  animation:
    giftIn 3s ease forwards;
}

.live-gift-icon {

  width: 42px;
  height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background:
    rgba(255,255,255,.25);

  font-size: 23px;
}

.live-gift-text {

  font-size: 11px;

  font-weight: 900;
}

@keyframes giftIn {

  0% {
    opacity: 0;
    transform:
      translateX(-100px)
      scale(.8);
  }

  15% {
    opacity: 1;
    transform:
      translateX(0)
      scale(1);
  }

  75% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translateX(100px)
      scale(.9);
  }

}


/* =========================================================
   HEART
========================================================= */

.floating-heart {

  position: absolute;

  bottom: 125px;

  right: 25px;

  z-index: 20;

  font-size: 30px;

  pointer-events: none;

  animation:
    heartUp 2.2s ease forwards;
}

@keyframes heartUp {

  0% {
    opacity: 0;

    transform:
      translateY(0)
      scale(.5);
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: 0;

    transform:
      translateY(-230px)
      translateX(
        calc(
          -50px +
          100px * var(--random)
        )
      )
      scale(1.5);
  }
}


/* =========================================================
   MUSIC NOTES
========================================================= */

.music-note {

  position: absolute;

  z-index: 3;

  pointer-events: none;

  font-size: 30px;

  opacity: .8;

  animation:
    noteFloat 4s linear forwards;
}

@keyframes noteFloat {

  from {

    opacity: 0;

    transform:
      translateY(40px)
      rotate(0deg);
  }

  20% {
    opacity: .9;
  }

  to {

    opacity: 0;

    transform:
      translateY(-180px)
      rotate(25deg);
  }
}


/* =========================================================
   AUDIO BUTTON
========================================================= */

.audio-enable-button {

  position: absolute;

  top: 50%;
  left: 50%;

  transform:
    translate(-50%,-50%);

  z-index: 30;

  width: 82px;
  height: 82px;

  border: 0;

  border-radius: 50%;

  background:
    linear-gradient(
      135deg,
      #35d8ff,
      #5568ff,
      #c54cff
    );

  color: white;

  font-size: 34px;

  box-shadow:
    0 0 35px
    rgba(90,120,255,.7);
}


/* =========================================================
   BOTTOM
========================================================= */

.live-bottom {

  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  z-index: 15;

  padding:
    10px 10px
    calc(
      10px +
      env(safe-area-inset-bottom)
    );

  background:
    linear-gradient(
      0deg,
      rgba(0,0,0,.88),
      transparent
    );
}

.live-actions {

  display: flex;

  align-items: center;

  gap: 7px;
}

.live-comment-input {

  flex: 1;

  min-width: 0;

  height: 48px;

  padding:
    0 16px;

  border: 0;

  border-radius: 25px;

  outline: none;

  color: white;

  background:
    rgba(0,0,0,.58);

  backdrop-filter:
    blur(12px);

  font-size: 14px;
}

.live-comment-input::placeholder {

  color:
    rgba(255,255,255,.7);
}

.live-action-btn {

  width: 48px;
  height: 48px;

  flex-shrink: 0;

  border: 0;

  border-radius: 50%;

  color: white;

  background:
    rgba(0,0,0,.58);

  backdrop-filter:
    blur(12px);

  font-size: 21px;
}

.live-like {

  background:
    rgba(255,60,140,.25);
}

.live-share {

  background:
    rgba(0,0,0,.58);
}


/* =========================================================
   GIFT BUTTON
========================================================= */

.live-gift-button {

  position: absolute;

  right: 12px;

  bottom:
    calc(
      78px +
      env(safe-area-inset-bottom)
    );

  z-index: 20;

  width: 54px;
  height: 54px;

  border: 0;

  border-radius: 50%;

  background:
    linear-gradient(
      135deg,
      #ff58bc,
      #805cff
    );

  color: white;

  font-size: 25px;

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.35);
}


/* =========================================================
   GIFT PANEL
========================================================= */

.gift-panel {

  position: absolute;

  right: 12px;

  bottom:
    calc(
      140px +
      env(safe-area-inset-bottom)
    );

  z-index: 25;

  padding: 10px;

  border-radius: 17px;

  background:
    rgba(8,12,32,.94);

  border:
    1px solid
    rgba(140,150,255,.2);

  backdrop-filter:
    blur(15px);
}

.gift-panel.hidden {

  display: none;
}

.gift-grid {

  display: grid;

  grid-template-columns:
    repeat(4,1fr);

  gap: 7px;
}

.gift-btn {

  min-width: 65px;

  min-height: 72px;

  border: 0;

  border-radius: 14px;

  background:
    #161d40;

  color: white;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;
}

.gift-btn b {

  font-size: 27px;
}

.gift-btn span {

  font-size: 10px;
}


/* =========================================================
   LIVE OWNER CONTROLS
========================================================= */

.owner-control {

  position: absolute;

  left: 12px;

  bottom:
    calc(
      78px +
      env(safe-area-inset-bottom)
    );

  z-index: 25;

  padding:
    9px 13px;

  border: 0;

  border-radius: 999px;

  background:
    rgba(255,50,80,.85);

  color: white;

  font-size: 11px;

  font-weight: 900;

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

  display: grid;

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

  background: transparent;

  color: #727c9c;

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

  width: 52px;
  height: 52px;

  margin-top: -20px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

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

  .live-screen {

    max-width: 520px;

    margin: auto;

    box-shadow:
      0 0 80px
      rgba(80,80,255,.25);
  }

}


/* =========================================================
   DESKTOP LIVE BACKDROP
========================================================= */

@media (min-width:700px) {

  .live-panel {

    background:
      #02030a;
  }

}


/* =========================================================
   ACCESSIBILITY
========================================================= */

button:active {

  transform:
    scale(.97);
}

</style>

</head>


<body>


<!-- =======================================================
     HOME
======================================================= -->

<div class="app">


<header class="header">

  <div class="logo">
    VoiceボタLive
  </div>

</header>


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
        🚫
      </div>

      <div class="feature-title">
        ブロック
      </div>

      <div class="feature-text">
        見たくない相手をブロック。
      </div>

    </div>


  </div>

</section>


</div>


<!-- =======================================================
     FULL SCREEN LIVE
======================================================= -->

<div
  class="live-panel"
  id="livePanel"
>


  <div class="live-screen">


    <!-- 背景 -->

    <div
      class="live-screen-bg"
      id="liveScreenBg"
    ></div>

    <div class="live-screen-overlay"></div>


    <!-- 上部 -->

    <div class="live-top">


      <div class="live-top-title">

        <div class="live-top-name">
          🎙️ VoiceボタLive
        </div>

        <button
          class="live-close"
          type="button"
          onclick="closePanel()"
        >
          ×
        </button>

      </div>


      <div class="live-host">


        <div
          class="live-host-avatar"
          id="liveHostAvatar"
        >
          🎙️
        </div>


        <div class="live-host-info">

          <div
            class="live-host-name"
            id="liveHostName"
          >
            配信者
          </div>

          <div
            class="live-host-count"
            id="liveViewerCount"
          >
            🎧 0人
          </div>

        </div>


        <div class="live-live-badge">
          🔴 LIVE
        </div>


      </div>


      <div
        class="viewer-row"
        id="viewerRow"
      >

        <div class="viewer-avatar">
          🌙
        </div>

        <div class="viewer-avatar">
          ⭐
        </div>

        <div class="viewer-avatar">
          🌸
        </div>

        <div class="viewer-avatar">
          🎀
        </div>

        <div class="viewer-avatar">
          ✨
        </div>

      </div>


    </div>


    <!-- コメント -->

    <div
      class="live-comments"
      id="liveComments"
    ></div>


    <!-- ギフト -->

    <div
      class="live-gift-area"
      id="liveGiftArea"
    ></div>


    <!-- 音符 -->

    <div
      id="musicNotes"
    ></div>


    <!-- 音声 -->

    <audio
      id="remoteAudio"
      autoplay
      playsinline
    ></audio>


    <!-- 音声ON -->

    <button
      id="audioButton"
      class="audio-enable-button"
      type="button"
      onclick="enableAudio()"
      style="display:none"
    >
      🔊
    </button>


    <!-- ギフト -->

    <button
      class="live-gift-button"
      type="button"
      onclick="toggleGiftPanel()"
    >
      🎁
    </button>


    <div
      class="gift-panel hidden"
      id="giftPanel"
    >

      <div class="gift-grid">


        <button
          class="gift-btn"
          type="button"
          onclick="sendGift('🌸','花')"
        >

          <b>🌸</b>

          <span>花</span>

        </button>


        <button
          class="gift-btn"
          type="button"
          onclick="sendGift('⭐','星')"
        >

          <b>⭐</b>

          <span>星</span>

        </button>


        <button
          class="gift-btn"
          type="button"
          onclick="sendGift('💎','ダイヤ')"
        >

          <b>💎</b>

          <span>ダイヤ</span>

        </button>


        <button
          class="gift-btn"
          type="button"
          onclick="sendGift('🌙','月')"
        >

          <b>🌙</b>

          <span>月</span>

        </button>


      </div>

    </div>


    <!-- 配信者用終了ボタン -->

    <button
      id="ownerStopButton"
      class="owner-control"
      type="button"
      onclick="stopLive()"
    >
      ⛔ 配信終了
    </button>


    <!-- 下部 -->

    <div class="live-bottom">


      <div class="live-actions">


        <input
          id="liveCommentInput"
          class="live-comment-input"
          maxlength="200"
          placeholder="コメントを入力"
          onkeydown="
            if(event.key === 'Enter'){
              sendLiveComment();
            }
          "
        >


        <button
          class="live-action-btn live-like"
          type="button"
          onclick="sendLike()"
        >
          ❤️
        </button>


        <button
          class="live-action-btn live-share"
          type="button"
          onclick="shareLive()"
        >
          ↗
        </button>


        <button
          class="live-action-btn"
          type="button"
          onclick="enableAudio()"
        >
          🎙️
        </button>


      </div>

    </div>


  </div>

</div>


<!-- =======================================================
     BOTTOM NAV
======================================================= -->

<nav class="bottom-nav">


  <button
    class="nav-item"
    type="button"
    onclick="goHome()"
  >

    <div class="nav-icon">
      🏠
    </div>

    ホーム

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="scrollLive()"
  >

    <div class="nav-icon">
      🔎
    </div>

    探す

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="startLive()"
  >

    <div class="nav-live">
      🎙️
    </div>

    配信

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="showNotice()"
  >

    <div class="nav-icon">
      🔔
    </div>

    お知らせ

  </button>


  <button
    class="nav-item"
    type="button"
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

let currentLiveName = "";

let currentViewerCount = 0;

let currentLives = [];

let liveBackgroundData =
  localStorage.getItem(
    "voiceBotaLiveBackground"
  ) || "";

let liveBackgrounds = {};


/* =========================================================
   BACKGROUND
========================================================= */

function applyLiveBackground(background) {

  const screen =
    document.getElementById(
      "liveScreenBg"
    );

  if (!screen) return;

  if (!background) {

    screen.style.backgroundImage =
      "none";

    screen.style.background =
      "radial-gradient(circle at 50% 30%,#30205f,#050510 70%)";

    return;
  }

  screen.style.background =
    "none";

  if (
    background.startsWith(
      "data:image"
    )
  ) {

    screen.style.backgroundImage =
      "url('" +
      background +
      "')";

  } else {

    screen.style.backgroundImage =
      background;

  }

  screen.style.backgroundSize =
    "cover";

  screen.style.backgroundPosition =
    "center";

  screen.style.backgroundRepeat =
    "no-repeat";
}


function setLiveBackgroundPreset(type) {

  const backgrounds = {

    blue:
      "linear-gradient(135deg,#111a4b,#243b8f 55%,#080b1e)",

    purple:
      "linear-gradient(135deg,#24103e,#8d2f9d 55%,#090719)",

    pink:
      "linear-gradient(135deg,#3d102b,#c82f76 55%,#100617)"

  };

  const screen =
    document.getElementById(
      "liveScreenBg"
    );

  if (!screen) return;

  screen.style.backgroundImage =
    backgrounds[type] ||
    backgrounds.blue;

  screen.style.background =
    "none";

  screen.style.backgroundSize =
    "cover";

  screen.style.backgroundPosition =
    "center";

  screen.style.backgroundRepeat =
    "no-repeat";
}


function handleBackgroundFile(event) {

  const file =
    event.target.files &&
    event.target.files[0];

  if (!file) return;

  if (
    !file.type.startsWith("image/")
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

          const maxSize = 1200;

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
                img.width * scale
              )
            );

          canvas.height =
            Math.max(
              1,
              Math.round(
                img.height * scale
              )
            );

          const ctx =
            canvas.getContext("2d");

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
              0.65
            );

          localStorage.setItem(
            "voiceBotaLiveBackground",
            liveBackgroundData
          );

          applyLiveBackground(
            liveBackgroundData
          );

          alert(
            "背景画像を設定しました。"
          );
        };

      img.src =
        e.target.result;
    };

  reader.readAsDataURL(file);
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
}


/* =========================================================
   WEBRTC
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

    console.error(
      "WebSocket create error",
      error
    );

    setTimeout(
      connectSocket,
      2000
    );

    return;
  }


  socket.onopen =
    function() {

      connected = true;

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

    currentLives =
      data.lives || [];

    renderLiveList(
      currentLives
    );

    return;
  }


  if (
    data.type ===
    "live_started"
  ) {

    setPanelStatus(
      "🔴 配信中です"
    );

    updateLiveScreenInfo(
      currentUserName,
      currentLiveTitle,
      currentViewerCount
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

    createOffer(
      data.viewerId
    );

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
    "viewer_count"
  ) {

    currentViewerCount =
      Number(
        data.count || 0
      );

    updateLiveScreenInfo(
      currentLiveName,
      currentLiveTitle,
      currentViewerCount
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

    createHeart();

    return;
  }


  if (
    data.type ===
    "gift"
  ) {

    showGiftEffect(
      data.gift || "🎁",
      data.giftName || "ギフト",
      data.name || "ユーザー"
    );

    return;
  }


  if (
    data.type ===
    "live_stopped"
  ) {

    setPanelStatus(
      "配信が終了しました"
    );

    const audio =
      document.getElementById(
        "remoteAudio"
      );

    if (audio) {

      audio.pause();

      audio.srcObject =
        null;
    }

    document.getElementById(
      "audioText"
    );

    closePeers();

    if (!isBroadcaster) {

      setTimeout(
        function() {

          closePanel();

        },
        600
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

    closePanel();

    return;
  }

}


/* =========================================================
   LIVE LIST
========================================================= */

function renderLiveList(lives) {

  liveBackgrounds = {};

  currentLives =
    lives || [];

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
        escapeHtml(
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


/* =========================================================
   START LIVE
========================================================= */

async function startLive() {

  if (!connected) {

    alert(
      "サーバーに接続中です。\n少し待ってからもう一度押してください。"
    );

    return;
  }


  if (isBroadcaster) {

    openPanel();

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

  currentLiveName =
    currentUserName;

  currentLiveTitle =
    title.trim();


  openPanel();


  setPanelStatus(
    "🎙️ マイクを確認しています..."
  );


  try {

    localStream =
      await navigator.mediaDevices
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

    setPanelStatus(
      "マイク許可が必要です"
    );

    alert(
      "マイクを使用できませんでした。\n\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    closePanel();

    return;
  }


  isBroadcaster =
    true;


  document.getElementById(
    "ownerStopButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioButton"
  ).style.display =
    "none";


  updateLiveScreenInfo(
    currentUserName,
    currentLiveTitle,
    0
  );


  updateLiveScreenBackground(
    liveBackgroundData || ""
  );


  setPanelStatus(
    "🔴 配信を開始しています..."
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

    return;
  }


  setPanelStatus(
    "🔴 配信中です"
  );

}


/* =========================================================
   STOP LIVE
========================================================= */

function stopLive() {

  if (!isBroadcaster) {

    closePanel();

    return;
  }


  send({

    type:
      "stop_live"

  });


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        function(track) {

          track.stop();

        }
      );
  }


  localStream =
    null;


  closePeers();


  isBroadcaster =
    false;


  document.getElementById(
    "ownerStopButton"
  ).style.display =
    "none";


  setPanelStatus(
    "配信を終了しました"
  );


  const audio =
    document.getElementById(
      "remoteAudio"
    );

  if (audio) {

    audio.pause();

    audio.srcObject =
      null;
  }


  renderLiveList([]);


  setTimeout(
    closePanel,
    600
  );
}


/* =========================================================
   LISTEN LIVE
========================================================= */

function listenLive(liveId) {

  if (isBroadcaster) {

    alert(
      "配信中は他のライブを視聴できません。"
    );

    return;
  }


  const live =
    currentLives.find(
      function(item) {

        return item.id === liveId;

      }
    );


  if (!live) {

    alert(
      "ライブ情報が見つかりません。"
    );

    return;
  }


  currentLiveId =
    liveId;

  currentLiveName =
    live.name || "配信者";

  currentLiveTitle =
    live.title || "";


  currentViewerCount =
    Number(
      live.viewerCount || 0
    );


  openPanel();


  updateLiveScreenInfo(
    currentLiveName,
    currentLiveTitle,
    currentViewerCount
  );


  updateLiveScreenBackground(
    live.background || ""
  );


  setPanelStatus(
    "🎧 配信者に接続しています..."
  );


  document.getElementById(
    "audioButton"
  ).style.display =
    "none";


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
   CREATE OFFER
========================================================= */

async function createOffer(
  viewerId
) {

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
  ] = pc;


  localStream
    .getAudioTracks()
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
            params &&
            params.encodings &&
            params.encodings.length
          ) {

            params.encodings[0]
              .maxBitrate =
              64000;

            sender.setParameters(
              params
            )
            .catch(
              function() {}
            );

          }

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

      console.log(
        "Broadcaster connection:",
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

        delete peerConnections[
          viewerId
        ];

      }

    };


  try {

    const offer =
      await pc.createOffer();


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

async function receiveOffer(
  data
) {

  currentBroadcasterId =
    data.from;


  closeViewerPeer();


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    data.from
  ] = pc;


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


      audio.muted =
        false;

      audio.volume =
        1;


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioButton"
            ).style.display =
              "none";

            setPanelStatus(
              "🎧 接続しました"
            );

          }
        )
        .catch(
          function() {

            document.getElementById(
              "audioButton"
            ).style.display =
              "block";

            setPanelStatus(
              "🔊 音声ボタンを押してください"
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

      console.log(
        "Viewer connection:",
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "connected"
      ) {

        setPanelStatus(
          "🎧 配信者の音声を受信中"
        );

      }


      if (
        pc.connectionState ===
        "failed"
      ) {

        setPanelStatus(
          "⚠️ 接続に失敗しました"
        );

      }

    };


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


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


    const queue =
      pendingIceCandidates[
        data.from
      ] || [];


    for (
      const candidate of queue
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch(error) {

        console.error(
          "QUEUED ICE ERROR",
          error
        );

      }

    }


    pendingIceCandidates[
      data.from
    ] = [];


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

async function receiveAnswer(
  data
) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) return;


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

async function receiveIce(
  data
) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) return;


  if (
    !pc.remoteDescription
  ) {

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

    return;
  }


  try {

    await pc.addIceCandidate(
      data.candidate
    );

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


  if (!audio) return;


  audio.muted =
    false;

  audio.volume =
    1;


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioButton"
        ).style.display =
          "none";

        setPanelStatus(
          "🎧 LIVE 音声"
        );

      }
    )
    .catch(
      function(error) {

        console.error(
          "AUDIO ERROR",
          error
        );

        setPanelStatus(
          "🔊 もう一度音声ボタンを押してください"
        );

      }
    );
}


/* =========================================================
   LIVE SCREEN INFO
========================================================= */

function updateLiveScreenInfo(
  name,
  title,
  viewerCount
) {

  const nameEl =
    document.getElementById(
      "liveHostName"
    );


  const countEl =
    document.getElementById(
      "liveViewerCount"
    );


  if (nameEl) {

    nameEl.textContent =
      name || "配信者";

  }


  if (countEl) {

    countEl.textContent =
      "🎧 " +
      String(
        viewerCount || 0
      ) +
      "人";

  }


  const topName =
    document.querySelector(
      ".live-top-name"
    );


  if (topName) {

    topName.textContent =
      "🎙️ " +
      (
        title ||
        "VoiceボタLive"
      );

  }

}


function updateLiveScreenBackground(
  background
) {

  applyLiveBackground(
    background
  );

}


/* =========================================================
   LIVE COMMENTS
========================================================= */

function addLiveComment(
  name,
  text
) {

  const container =
    document.getElementById(
      "liveComments"
    );


  if (!container) return;


  const item =
    document.createElement(
      "div"
    );

  item.className =
    "live-comment";


  const avatar =
    document.createElement(
      "div"
    );

  avatar.className =
    "live-comment-avatar";

  avatar.textContent =
    "👤";


  const body =
    document.createElement(
      "div"
    );

  body.className =
    "live-comment-body";


  const nameEl =
    document.createElement(
      "div"
    );

  nameEl.className =
    "live-comment-name";

  nameEl.textContent =
    name ||
    "ユーザー";


  const textEl =
    document.createElement(
      "div"
    );

  textEl.className =
    "live-comment-text";

  textEl.textContent =
    text ||
    "";


  body.appendChild(
    nameEl
  );

  body.appendChild(
    textEl
  );


  item.appendChild(
    avatar
  );

  item.appendChild(
    body
  );


  container.appendChild(
    item
  );


  while (
    container.children.length >
    12
  ) {

    container.removeChild(
      container.firstChild
    );

  }
}


/* =========================================================
   SEND COMMENT
========================================================= */

function sendLiveComment() {

  const input =
    document.getElementById(
      "liveCommentInput"
    );


  if (!input) return;


  const text =
    input.value.trim();


  if (!text) return;


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


  createHeart();
}


function createHeart() {

  const screen =
    document.querySelector(
      ".live-screen"
    );


  if (!screen) return;


  const heart =
    document.createElement(
      "div"
    );


  heart.className =
    "floating-heart";


  const hearts = [
    "❤️",
    "💗",
    "💖",
    "💕",
    "💜",
    "💙"
  ];


  heart.textContent =
    hearts[
      Math.floor(
        Math.random() *
        hearts.length
      )
    ];


  heart.style.right =
    (
      15 +
      Math.random() * 45
    ) +
    "px";


  heart.style.setProperty(
    "--random",
    Math.random()
  );


  screen.appendChild(
    heart
  );


  setTimeout(
    function() {

      heart.remove();

    },
    2300
  );
}


/* =========================================================
   GIFTS
========================================================= */

function toggleGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (!panel) return;


  panel.classList.toggle(
    "hidden"
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


  showGiftEffect(
    emoji,
    name,
    currentUserName
  );


  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (panel) {

    panel.classList.add(
      "hidden"
    );

  }
}


function showGiftEffect(
  emoji,
  name,
  userName
) {

  const area =
    document.getElementById(
      "liveGiftArea"
    );


  if (!area) return;


  const gift =
    document.createElement(
      "div"
    );


  gift.className =
    "live-gift";


  gift.innerHTML =

    '<div class="live-gift-icon">' +
    escapeHtml(
      emoji || "🎁"
    ) +
    '</div>' +

    '<div class="live-gift-text">' +

    escapeHtml(
      userName ||
      "ユーザー"
    ) +

    " さんが " +

    escapeHtml(
      name ||
      "ギフト"
    ) +

    " を送信しました" +

    '</div>';


  area.appendChild(
    gift
  );


  setTimeout(
    function() {

      gift.remove();

    },
    3000
  );
}


/* =========================================================
   MUSIC NOTES
========================================================= */

function createMusicNote() {

  const screen =
    document.querySelector(
      ".live-screen"
    );


  if (!screen) return;


  const note =
    document.createElement(
      "div"
    );


  note.className =
    "music-note";


  note.textContent =
    Math.random() > .5
      ? "♪"
      : "♫";


  note.style.left =
    (
      10 +
      Math.random() * 80
    ) +
    "%";


  note.style.bottom =
    (
      110 +
      Math.random() * 100
    ) +
    "px";


  const colors = [

    "#8fe8ff",
    "#ff9ce8",
    "#d6a4ff",
    "#ffffff"

  ];


  note.style.color =
    colors[
      Math.floor(
        Math.random() *
        colors.length
      )
    ];


  screen.appendChild(
    note
  );


  setTimeout(
    function() {

      note.remove();

    },
    4000
  );
}


setInterval(
  function() {

    const panel =
      document.getElementById(
        "livePanel"
      );


    if (
      panel &&
      panel.classList.contains(
        "show"
      )
    ) {

      createMusicNote();

    }

  },
  1800
);


/* =========================================================
   SHARE
========================================================= */

async function shareLive() {

  const shareData = {

    title:
      "VoiceボタLive",

    text:
      currentLiveName +
      " さんがVoiceボタLiveで配信中！",

    url:
      location.href

  };


  try {

    if (
      navigator.share
    ) {

      await navigator.share(
        shareData
      );

    } else if (
      navigator.clipboard
    ) {

      await navigator.clipboard.writeText(
        location.href
      );

      alert(
        "配信ページのURLをコピーしました。"
      );

    } else {

      alert(
        location.href
      );

    }

  } catch(error) {

    console.log(
      "Share cancelled"
    );

  }
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

    delete peerConnections[
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
   PANEL
========================================================= */

function openPanel() {

  document.getElementById(
    "livePanel"
  ).classList.add(
    "show"
  );


  if (
    isBroadcaster &&
    liveBackgroundData
  ) {

    applyLiveBackground(
      liveBackgroundData
    );

  } else {

    setLiveBackgroundPreset(
      "blue"
    );

  }


  document.body.style.overflow =
    "hidden";
}


function closePanel() {

  if (!isBroadcaster) {

    closeViewerPeer();

  }


  document.getElementById(
    "livePanel"
  ).classList.remove(
    "show"
  );


  document.body.style.overflow =
    "";


  const giftPanel =
    document.getElementById(
      "giftPanel"
    );


  if (giftPanel) {

    giftPanel.classList.add(
      "hidden"
    );

  }
}


function setPanelStatus(text) {

  const oldStatus =
    document.getElementById(
      "panelStatus"
    );

  if (oldStatus) {

    oldStatus.textContent =
      text;

  }
}


/* =========================================================
   NAV
========================================================= */

function goHome() {

  window.scrollTo({

    top: 0,

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
   LOAD
========================================================= */

window.addEventListener(
  "load",
  function() {

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


      /* HOME IMAGE */

      if (
        url === "/home.png"
      ) {

        const file =
          path.join(
            __dirname,
            "public",
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


      /* HEALTH */

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
              liveInfo.active

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


/* =========================================================
   LIVE LIST
========================================================= */

function getLiveList() {

  if (
    !liveInfo.active
  ) {

    return [];
  }


  let viewerCount =
    0;


  clients.forEach(
    function(client) {

      if (
        client.liveId ===
        liveInfo.id &&
        client !== broadcaster
      ) {

        viewerCount++;

      }

    }
  );


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

      viewerCount:
        viewerCount

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

function sendViewerCount() {

  const count =
    getLiveList()[0]
      ? getLiveList()[0].viewerCount
      : 0;


  broadcast({

    type:
      "viewer_count",

    count:
      count

  });
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


    ws.liveId =
      null;


    sendTo(
      ws,
      {

        type:
          "live_list",

        lives:
          getLiveList()

      }
    );


    /* =====================================================
       MESSAGE
    ===================================================== */

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
                80
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


          ws.liveId =
            ws.clientId;


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
              )

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

            stopBroadcasterLive();

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


          if (
            String(
              data.liveId
            ) !==
            String(
              liveInfo.id
            )
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


          ws.liveId =
            liveInfo.id;


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
          data.type ===
            "offer" ||
          data.type ===
            "answer" ||
          data.type ===
            "ice"
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


          const text =
            String(
              data.text ||
              ""
            )
            .substring(
              0,
              200
            );


          if (!text) {

            return;
          }


          const name =
            String(
              data.name ||
              "ユーザー"
            )
            .substring(
              0,
              30
            );


          broadcast({

            type:
              "comment",

            name:
              name,

            text:
              text

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


          broadcast({

            type:
              "like",

            name:
              String(
                data.name ||
                "ユーザー"
              )
              .substring(
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


          broadcast({

            type:
              "gift",

            name:
              String(
                data.name ||
                "ユーザー"
              )
              .substring(
                0,
                30
              ),

            gift:
              String(
                data.gift ||
                "🎁"
              )
              .substring(
                0,
                10
              ),

            giftName:
              String(
                data.giftName ||
                "ギフト"
              )
              .substring(
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

          stopBroadcasterLive();

          return;
        }


        if (
          ws.liveId
        ) {

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
   STOP BROADCASTER LIVE
========================================================= */

function stopBroadcasterLive() {

  if (
    broadcaster
  ) {

    broadcaster.isBroadcaster =
      false;

    broadcaster.liveId =
      null;

  }


  /* 全視聴者のliveIdを解除 */

  clients.forEach(
    function(client) {

      if (
        client.liveId ===
        liveInfo.id
      ) {

        client.liveId =
          null;

      }

    }
  );


  broadcaster =
    null;


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
      ""

  };


  broadcast({

    type:
      "live_stopped"

  });


  sendLiveList();

}


/* =========================================================
   START SERVER
========================================================= */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "================================"
    );

    console.log(
      "VoiceボタLive START"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "================================"
    );

  }
);
