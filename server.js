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
   LIVE STATE
===================================================== */

const clients = new Set();

let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  startedAt: null,
  likes: 0,
  comments: 0,
  gifts: 0,
  viewers: 0
};

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

.app {
  min-height: 100vh;
  padding-bottom: 90px;
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

  background: rgba(3,5,16,.88);

  backdrop-filter: blur(18px);

  border-bottom:
    1px solid rgba(120,140,255,.14);
}

.logo {
  font-size: 18px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #8bd8ff,
      #d08cff
    );

  -webkit-background-clip: text;
  background-clip: text;

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

.hero-image-wrap {
  position: relative;

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

.hero-gradient {
  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 55%;

  pointer-events: none;

  background:
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,.85) 18%,
      rgba(3,5,16,.15) 70%,
      transparent 100%
    );
}

.hero-content {
  position: relative;

  z-index: 20;

  margin-top: -30px;

  padding:
    0
    18px
    26px;

  background:
    linear-gradient(
      180deg,
      transparent 0,
      #030510 30px
    );
}

.hero-small {
  font-size: 12px;
  font-weight: 800;

  color: #b7caff;

  margin-bottom: 8px;
}

.hero-title {
  margin: 0;

  font-size:
    clamp(28px, 8vw, 48px);

  line-height: 1.18;

  font-weight: 900;

  letter-spacing: -1px;
}

.hero-title span {
  background:
    linear-gradient(
      90deg,
      #ffffff,
      #a5ddff,
      #d78cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}

.hero-description {
  margin-top: 12px;

  font-size: 13px;

  line-height: 1.8;

  color: #d8def1;
}

/* =====================================================
   SECTION
===================================================== */

.section {
  padding:
    22px
    15px
    0;
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

  color: #7580a5;

  letter-spacing: 1px;
}

/* =====================================================
   LIVE LIST
===================================================== */

.live-list {
  display: flex;

  flex-direction: column;

  gap: 10px;
}

.live-card {
  display: flex;

  align-items: center;

  min-height: 92px;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.95),
      rgba(8,12,32,.98)
    );

  border:
    1px solid rgba(120,140,255,.15);

  cursor: pointer;
}

.live-avatar {
  width: 58px;
  height: 58px;

  flex-shrink: 0;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  font-size: 26px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 22px rgba(80,130,255,.35);
}

.live-info {
  min-width: 0;

  flex: 1;

  padding-left: 12px;
}

.live-name {
  font-size: 14px;

  font-weight: 900;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.live-title {
  margin-top: 5px;

  color: #aab4d5;

  font-size: 12px;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.live-badge {
  display: inline-block;

  margin-top: 6px;

  padding: 3px 8px;

  border-radius: 999px;

  font-size: 9px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );
}

.empty {
  padding: 35px 20px;

  text-align: center;

  border-radius: 20px;

  color: #737d9e;

  background:
    rgba(10,14,35,.7);

  border:
    1px solid rgba(100,120,200,.1);
}

/* =====================================================
   LIVE PANEL
===================================================== */

.live-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 2000;

  background:
    rgba(2,4,15,.97);

  backdrop-filter: blur(20px);

  padding:
    20px
    16px
    110px;

  overflow-y: auto;
}

.live-panel.show {
  display: block;
}

.panel-header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  margin-top: 15px;
}

.panel-title {
  font-size: 22px;

  font-weight: 900;
}

.panel-live {
  padding: 5px 10px;

  border-radius: 999px;

  font-size: 10px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3b69,
      #a72cff
    );
}

.custom-field {
  margin-top: 14px;
}

.custom-label {
  display: block;
  margin-bottom: 7px;
  color: #aebbe0;
  font-size: 12px;
  font-weight: 800;
}

.custom-input {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(120,140,255,.25);
  background: #080d22;
  color: #fff;
  outline: none;
  font-size: 14px;
}

.custom-input:focus {
  border-color: #72cfff;
  box-shadow: 0 0 0 2px rgba(114,207,255,.12);
}

.custom-title-preview {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(20,28,70,.7);
  color: #d7e3ff;
  font-size: 12px;
}

.panel-status {
  margin-top: 15px;

  padding: 14px;

  border-radius: 15px;

  background:
    rgba(20,28,70,.9);

  color: #bcd2ff;

  font-size: 13px;
}

.audio-status {
  margin-top: 15px;

  padding: 30px 20px;

  text-align: center;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(35,45,110,.9),
      rgba(10,14,40,.95)
    );

  border:
    1px solid rgba(120,140,255,.15);
}

.audio-icon {
  font-size: 58px;

  margin-bottom: 12px;
}

.audio-wave {
  display: flex;

  justify-content: center;

  align-items: center;

  gap: 4px;

  height: 35px;

  margin-top: 12px;
}

.audio-wave span {
  width: 4px;

  height: 15px;

  border-radius: 10px;

  background: #72cfff;

  animation:
    wave .8s infinite ease-in-out;
}

.audio-wave span:nth-child(2) {
  animation-delay: .1s;
}

.audio-wave span:nth-child(3) {
  animation-delay: .2s;
}

.audio-wave span:nth-child(4) {
  animation-delay: .3s;
}

.audio-wave span:nth-child(5) {
  animation-delay: .4s;
}

@keyframes wave {
  0%,100% {
    height: 10px;
  }

  50% {
    height: 32px;
  }
}

#remoteAudio {
  display: none;
}

.panel-button {
  width: 100%;

  height: 52px;

  margin-top: 12px;

  border: 0;

  border-radius: 16px;

  color: white;

  font-weight: 900;

  font-size: 14px;
}

.audio-on-button {
  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff
    );
}

.stop-button {
  background:
    linear-gradient(
      100deg,
      #ff385f,
      #a52fff
    );
}

.close-button {
  background:
    rgba(30,35,65,.9);

  border:
    1px solid rgba(130,150,255,.25);
}

/* =====================================================
   LIVE SOCIAL FEATURES
===================================================== */

.live-social {
  margin-top: 14px;
  padding: 14px;
  border-radius: 20px;
  background:
    linear-gradient(
      145deg,
      rgba(20,28,70,.92),
      rgba(7,10,28,.98)
    );
  border:
    1px solid rgba(120,140,255,.14);
}

.social-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
}

.social-stat {
  padding: 10px 5px;
  border-radius: 13px;
  text-align: center;
  background: rgba(5,8,24,.65);
}

.social-stat strong {
  display: block;
  font-size: 18px;
}

.social-stat span {
  color: #7e89aa;
  font-size: 10px;
}

.social-actions {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
  margin-top: 10px;
}

.social-button {
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  color: #fff;
  font-weight: 900;
  background: #161d3c;
}

.social-like {
  background:
    linear-gradient(
      135deg,
      #ff3d70,
      #ff5b37
    );
}

.social-gift {
  background:
    linear-gradient(
      135deg,
      #ffb300,
      #ff6a00
    );
}

.social-block {
  background: #202641;
}

.comment-box {
  margin-top: 12px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(5,8,24,.72);
  border:
    1px solid rgba(120,140,255,.10);
}

.comment-list {
  max-height: 190px;
  overflow-y: auto;
  padding: 8px 12px;
}

.comment-row {
  padding: 8px 0;
  border-bottom:
    1px solid rgba(255,255,255,.05);
}

.comment-user {
  color: #a9baff;
  font-size: 11px;
  font-weight: 900;
}

.comment-text {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.comment-block {
  margin-top: 3px;
  border: 0;
  background: transparent;
  color: #687398;
  font-size: 9px;
  padding: 0;
}

.comment-form {
  display: flex;
  gap: 7px;
  padding: 9px;
  border-top:
    1px solid rgba(255,255,255,.05);
}

.comment-input {
  flex: 1;
  min-width: 0;
  height: 42px;
  border:
    1px solid rgba(120,140,255,.18);
  border-radius: 12px;
  background: #090d21;
  color: #fff;
  padding: 0 11px;
  outline: none;
}

.comment-send {
  width: 64px;
  border: 0;
  border-radius: 12px;
  background: #3156ff;
  color: #fff;
  font-weight: 900;
}

.gift-panel {
  display: none;
  margin-top: 10px;
  padding: 10px;
  border-radius: 16px;
  background: #090d21;
  border:
    1px solid rgba(120,140,255,.14);
}

.gift-panel.show {
  display: block;
}

.gift-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 7px;
}

.gift-item {
  border: 0;
  border-radius: 12px;
  background: #161d3c;
  color: #fff;
  padding: 8px 3px;
}

.gift-item .icon {
  font-size: 23px;
  display: block;
}

.gift-item .name {
  font-size: 9px;
  margin-top: 3px;
}

.gift-item .coins {
  font-size: 8px;
  color: #7e89aa;
}

.like-pop {
  position: fixed;
  right: 22px;
  bottom: 115px;
  z-index: 3000;
  font-size: 28px;
  pointer-events: none;
  animation:
    likeUp 1.8s ease-out forwards;
}

@keyframes likeUp {
  from {
    transform:
      translateY(0)
      scale(.8);
    opacity: 1;
  }

  to {
    transform:
      translateY(-180px)
      scale(1.4);
    opacity: 0;
  }
}

/* =====================================================
   FEATURES
===================================================== */

.features {
  display: grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 10px;

  margin-top: 18px;
}

.feature {
  min-height: 115px;

  padding: 18px 14px;

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.9),
      rgba(8,11,28,.95)
    );

  border:
    1px solid rgba(120,140,255,.12);
}

.feature-icon {
  font-size: 24px;

  margin-bottom: 8px;
}

.feature-title {
  font-size: 13px;

  font-weight: 900;
}

.feature-text {
  margin-top: 6px;

  font-size: 10px;

  line-height: 1.6;

  color: #8f9abb;
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

  z-index: 1500;

  display: grid;

  grid-template-columns:
    repeat(5,1fr);

  padding:
    6px
    7px
    calc(
      6px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.96);

  backdrop-filter:
    blur(20px);

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

  border-radius: 15px;
}

.nav-icon {
  font-size: 22px;
}

.nav-item.active {
  color: #7dd7ff;

  background:
    rgba(60,100,255,.10);
}

/* =====================================================
   SEARCH
===================================================== */

.search-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 1900;

  background:
    #030510;

  padding:
    80px
    16px
    100px;

  overflow-y: auto;
}

.search-panel.show {
  display: block;
}

.search-input {
  width: 100%;

  height: 52px;

  border-radius: 16px;

  border:
    1px solid rgba(120,140,255,.2);

  background: #080d22;

  color: white;

  padding:
    0 16px;

  font-size: 15px;

  outline: none;
}

.search-results {
  margin-top: 15px;
}

.search-empty {
  padding: 30px 10px;

  text-align: center;

  color: #737d9e;

  font-size: 13px;
}

/* =====================================================
   NOTIFICATION
===================================================== */

.notification-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 1900;

  background: #030510;

  padding:
    78px
    16px
    100px;

  overflow-y: auto;
}

.notification-panel.show {
  display: block;
}

.notification-card {
  padding: 15px;

  margin-bottom: 10px;

  border-radius: 16px;

  background:
    rgba(15,20,50,.9);

  border:
    1px solid rgba(120,140,255,.12);
}

/* =====================================================
   MY PAGE
===================================================== */

.mypage-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 1900;

  background: #030510;

  padding:
    78px
    16px
    100px;

  overflow-y: auto;
}

.mypage-panel.show {
  display: block;
}

.profile-card {
  padding: 20px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid rgba(120,140,255,.14);

  text-align: center;
}

.profile-avatar {
  width: 78px;
  height: 78px;

  margin: 0 auto 12px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 36px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.profile-name {
  font-size: 20px;

  font-weight: 900;
}

.profile-sub {
  margin-top: 5px;

  color: #8591b4;

  font-size: 12px;
}

.profile-menu {
  margin-top: 15px;

  display: grid;

  gap: 9px;
}

.profile-menu button {
  height: 50px;

  border-radius: 15px;

  border:
    1px solid rgba(120,140,255,.12);

  background:
    rgba(14,19,45,.95);

  color: white;

  text-align: left;

  padding:
    0 16px;

  font-weight: 800;
}

/* =====================================================
   MODAL
===================================================== */

.modal {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 4000;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background:
    rgba(0,0,0,.72);

  backdrop-filter: blur(8px);
}

.modal.show {
  display: flex;
}

.modal-box {
  width: 100%;

  max-width: 430px;

  padding: 20px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      #151d45,
      #080b1f
    );

  border:
    1px solid rgba(130,150,255,.2);

  box-shadow:
    0 20px 70px rgba(0,0,0,.5);
}

.modal-title {
  font-size: 19px;

  font-weight: 900;
}

.modal-text {
  margin-top: 9px;

  color: #9ca8ca;

  font-size: 12px;

  line-height: 1.7;
}

.modal-actions {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin-top: 18px;
}

.modal-actions button {
  height: 46px;

  border: 0;

  border-radius: 14px;

  font-weight: 900;

  color: white;

  background:
    #202746;
}

.modal-actions .primary {
  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff
    );
}

/* =====================================================
   LIVE START
===================================================== */

.start-live-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 3500;

  background:
    #030510;

  padding:
    70px
    16px
    100px;

  overflow-y: auto;
}

.start-live-panel.show {
  display: block;
}

.start-live-title {
  font-size: 24px;

  font-weight: 900;

  margin-bottom: 18px;
}

.start-card {
  padding: 18px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid rgba(120,140,255,.14);
}

.start-label {
  display: block;

  margin-bottom: 7px;

  font-size: 12px;

  color: #aebbe0;

  font-weight: 800;
}

.start-input {
  width: 100%;

  height: 50px;

  border-radius: 14px;

  border:
    1px solid rgba(120,140,255,.2);

  background:
    #080d22;

  color: white;

  outline: none;

  padding:
    0 14px;

  font-size: 14px;
}

.start-input + .start-input {
  margin-top: 12px;
}

.start-button {
  width: 100%;

  height: 54px;

  margin-top: 16px;

  border: 0;

  border-radius: 16px;

  color: white;

  font-weight: 900;

  font-size: 15px;

  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff
    );
}

.start-note {
  margin-top: 10px;

  color: #707b9f;

  font-size: 10px;

  line-height: 1.6;
}

/* =====================================================
   RESPONSIVE
===================================================== */

@media (min-width: 700px) {

  .app {
    max-width: 720px;

    margin: 0 auto;
  }

  .header {
    max-width: 720px;

    left: 50%;

    right: auto;

    width: 720px;

    transform:
      translateX(-50%);
  }

  .bottom-nav {
    max-width: 720px;

    left: 50%;

    right: auto;

    width: 720px;

    transform:
      translateX(-50%);
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

<main id="homePage">

<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="VoiceポタLive"
    >

    <div class="hero-gradient"></div>

  </div>

  <div class="hero-content">

    <div class="hero-small">
      VOICE LIVE PLATFORM
    </div>

    <h1 class="hero-title">
      <span>声でつながる。</span>
    </h1>

    <div class="hero-description">
      話したい人と、聴きたい人がつながる<br>
      音声ライブ配信サービス。
    </div>

  </div>

</section>

<section class="section">

  <div class="section-head">

    <div class="section-title">
      ライブ中
    </div>

    <div class="section-sub">
      LIVE NOW
    </div>

  </div>

  <div
    id="liveList"
    class="live-list"
  >

    <div class="empty">
      現在ライブ配信はありません
    </div>

  </div>

</section>

<section class="section">

  <div class="section-head">

    <div class="section-title">
      VoiceポタLive
    </div>

  </div>

  <div class="features">

    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <div class="feature-title">
        音声ライブ
      </div>

      <div class="feature-text">
        声だけで気軽にライブ配信できます。
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
        配信者とリスナーがリアルタイムで交流できます。
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
        配信を応援して気持ちを届けられます。
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
        ギフトで配信者を応援できます。
      </div>

    </div>

  </div>

</section>

</main>

<!-- =====================================================
     SEARCH PANEL
===================================================== -->

<section
  id="searchPanel"
  class="search-panel"
>

  <input
    id="searchInput"
    class="search-input"
    placeholder="配信者やタイトルを検索"
    autocomplete="off"
  >

  <div
    id="searchResults"
    class="search-results"
  ></div>

</section>

<!-- =====================================================
     NOTIFICATION PANEL
===================================================== -->

<section
  id="notificationPanel"
  class="notification-panel"
>

  <h2>
    お知らせ
  </h2>

  <div class="notification-card">
    VoiceポタLiveへようこそ。
  </div>

</section>

<!-- =====================================================
     MY PAGE
===================================================== -->

<section
  id="mypagePanel"
  class="mypage-panel"
>

  <div class="profile-card">

    <div class="profile-avatar">
      🎧
    </div>

    <div
      id="profileName"
      class="profile-name"
    >
      ぼたもち
    </div>

    <div class="profile-sub">
      VoiceポタLive
    </div>

  </div>

  <div class="profile-menu">

    <button onclick="showStartLive()">
      🎙️ 配信する
    </button>

    <button>
      ⚙️ 設定
    </button>

    <button>
      📖 利用規約
    </button>

  </div>

</section>

<!-- =====================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    class="nav-item active"
    id="navHome"
    onclick="showPage('home')"
  >

    <div class="nav-icon">
      🏠
    </div>

    <div>
      ホーム
    </div>

  </button>

  <button
    class="nav-item"
    id="navSearch"
    onclick="showPage('search')"
  >

    <div class="nav-icon">
      🔎
    </div>

    <div>
      探す
    </div>

  </button>

  <button
    class="nav-item"
    id="navLive"
    onclick="showStartLive()"
  >

    <div class="nav-icon">
      🎙️
    </div>

    <div>
      配信
    </div>

  </button>

  <button
    class="nav-item"
    id="navNotification"
    onclick="showPage('notification')"
  >

    <div class="nav-icon">
      🔔
    </div>

    <div>
      お知らせ
    </div>

  </button>

  <button
    class="nav-item"
    id="navMypage"
    onclick="showPage('mypage')"
  >

    <div class="nav-icon">
      👤
    </div>

    <div>
      マイページ
    </div>

  </button>

</nav>

</div>

<!-- =====================================================
     START LIVE PANEL
===================================================== -->

<section
  id="startLivePanel"
  class="start-live-panel"
>

  <div class="start-live-title">
    配信を始める
  </div>

  <div class="start-card">

    <label class="start-label">
      配信者名
    </label>

    <input
      id="streamName"
      class="start-input"
      value="ぼたもち"
      maxlength="30"
    >

    <label
      class="start-label"
      style="margin-top:14px;"
    >
      配信タイトル
    </label>

    <input
      id="streamTitle"
      class="start-input"
      value="VoiceポタLive 配信中"
      maxlength="60"
    >

    <button
      class="start-button"
      onclick="startLive()"
    >
      🎙️ 配信開始
    </button>

    <div class="start-note">
      配信開始を押すとマイクの使用許可が表示されます。
    </div>

    <button
      class="panel-button close-button"
      onclick="closeStartLive()"
    >
      閉じる
    </button>

  </div>

</section>

<!-- =====================================================
     LIVE PANEL
===================================================== -->

<section
  id="livePanel"
  class="live-panel"
>

  <div class="panel-header">

    <div class="panel-title">
      ライブ配信
    </div>

    <div class="panel-live">
      LIVE
    </div>

  </div>

  <div class="custom-field">

    <label class="custom-label">
      配信者名
    </label>

    <input
      id="customName"
      class="custom-input"
      value="ぼたもち"
      maxlength="30"
    >

  </div>

  <div class="custom-field">

    <label class="custom-label">
      配信タイトル
    </label>

    <input
      id="customTitle"
      class="custom-input"
      value="VoiceポタLive 配信中"
      maxlength="60"
    >

    <div
      id="customTitlePreview"
      class="custom-title-preview"
    >
      VoiceポタLive 配信中
    </div>

  </div>

  <div
    id="panelStatus"
    class="panel-status"
  >
    配信準備中...
  </div>

  <div class="audio-status">

    <div class="audio-icon">
      🎙️
    </div>

    <div>
      音声ライブ
    </div>

    <div class="audio-wave">

      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>

    </div>

  </div>

  <audio
    id="remoteAudio"
    autoplay
    playsinline
  ></audio>

  <div class="live-social">

    <div class="social-stats">

      <div class="social-stat">

        <strong id="viewerCount">
          0
        </strong>

        <span>
          視聴者
        </span>

      </div>

      <div class="social-stat">

        <strong id="likeCount">
          0
        </strong>

        <span>
          いいね
        </span>

      </div>

      <div class="social-stat">

        <strong id="giftCount">
          0
        </strong>

        <span>
          ギフト
        </span>

      </div>

    </div>

    <div class="social-actions">

      <button
        class="social-button social-like"
        onclick="sendLike()"
      >
        ❤️ いいね
      </button>

      <button
        class="social-button social-gift"
        onclick="toggleGiftPanel()"
      >
        🎁 ギフト
      </button>

      <button
        class="social-button social-block"
        onclick="blockUser()"
      >
        🚫 ブロック
      </button>

    </div>

    <div
      id="giftPanel"
      class="gift-panel"
    >

      <div class="gift-grid">

        <button
          class="gift-item"
          onclick="sendGift('🌹','バラ',10)"
        >
          <span class="icon">
            🌹
          </span>
          <span class="name">
            バラ
          </span>
          <span class="coins">
            10コイン
          </span>
        </button>

        <button
          class="gift-item"
          onclick="sendGift('❤️','ハート',50)"
        >
          <span class="icon">
            ❤️
          </span>
          <span class="name">
            ハート
          </span>
          <span class="coins">
            50コイン
          </span>
        </button>

        <button
          class="gift-item"
          onclick="sendGift('⭐','スター',100)"
        >
          <span class="icon">
            ⭐
          </span>
          <span class="name">
            スター
          </span>
          <span class="coins">
            100コイン
          </span>
        </button>

        <button
          class="gift-item"
          onclick="sendGift('🎁','プレゼント',500)"
        >
          <span class="icon">
            🎁
          </span>
          <span class="name">
            プレゼント
          </span>
          <span class="coins">
            500コイン
          </span>
        </button>

      </div>

    </div>

    <div class="comment-box">

      <div
        id="commentList"
        class="comment-list"
      ></div>

      <div class="comment-form">

        <input
          id="commentInput"
          class="comment-input"
          placeholder="コメントを入力"
          maxlength="200"
          autocomplete="off"
        >

        <button
          class="comment-send"
          onclick="sendComment()"
        >
          送信
        </button>

      </div>

    </div>

  </div>

  <button
    class="panel-button audio-on-button"
    id="audioButton"
    onclick="enableAudio()"
  >
    🎙️ マイクを有効にする
  </button>

  <button
    class="panel-button stop-button"
    id="stopLiveButton"
    onclick="stopLive()"
  >
    ⛔ 配信終了
  </button>

  <button
    class="panel-button close-button"
    onclick="closeLivePanel()"
  >
    閉じる
  </button>

</section>

<!-- =====================================================
     MODAL
===================================================== -->

<div
  id="modal"
  class="modal"
>

  <div class="modal-box">

    <div
      id="modalTitle"
      class="modal-title"
    >
      確認
    </div>

    <div
      id="modalText"
      class="modal-text"
    >
    </div>

    <div class="modal-actions">

      <button
        onclick="closeModal()"
      >
        キャンセル
      </button>

      <button
        id="modalPrimary"
        class="primary"
      >
        OK
      </button>

    </div>

  </div>

</div>

<script>

/* =====================================================
   CLIENT STATE
===================================================== */

let ws = null;

let localStream = null;

let peerConnection = null;

let currentLiveId = null;

let isBroadcaster = false;

let blockedUsers = new Set();

let comments = [];

let giftPanelOpen = false;

let audioEnabled = false;

/* =====================================================
   DOM
===================================================== */

const livePanel =
  document.getElementById("livePanel");

const startLivePanel =
  document.getElementById("startLivePanel");

const searchPanel =
  document.getElementById("searchPanel");

const notificationPanel =
  document.getElementById("notificationPanel");

const mypagePanel =
  document.getElementById("mypagePanel");

const liveList =
  document.getElementById("liveList");

const panelStatus =
  document.getElementById("panelStatus");

const viewerCount =
  document.getElementById("viewerCount");

const likeCount =
  document.getElementById("likeCount");

const giftCount =
  document.getElementById("giftCount");

const commentList =
  document.getElementById("commentList");

const commentInput =
  document.getElementById("commentInput");

const customName =
  document.getElementById("customName");

const customTitle =
  document.getElementById("customTitle");

const customTitlePreview =
  document.getElementById("customTitlePreview");

/* =====================================================
   PAGE NAVIGATION
===================================================== */

function hideAllPages() {

  searchPanel.classList.remove("show");

  notificationPanel.classList.remove("show");

  mypagePanel.classList.remove("show");

  document
    .getElementById("homePage")
    .style.display = "none";

}

function clearNavActive() {

  document
    .querySelectorAll(".nav-item")
    .forEach(el => {
      el.classList.remove("active");
    });

}

function showPage(page) {

  hideAllPages();

  clearNavActive();

  if (page === "home") {

    document
      .getElementById("homePage")
      .style.display = "block";

    document
      .getElementById("navHome")
      .classList.add("active");

    refreshLives();

    return;
  }

  if (page === "search") {

    searchPanel.classList.add("show");

    document
      .getElementById("navSearch")
      .classList.add("active");

    refreshSearch();

    return;
  }

  if (page === "notification") {

    notificationPanel.classList.add("show");

    document
      .getElementById("navNotification")
      .classList.add("active");

    return;
  }

  if (page === "mypage") {

    mypagePanel.classList.add("show");

    document
      .getElementById("navMypage")
      .classList.add("active");

    return;
  }

}

/* =====================================================
   START LIVE PANEL
===================================================== */

function showStartLive() {

  startLivePanel.classList.add("show");

}

function closeStartLive() {

  startLivePanel.classList.remove("show");

}

/* =====================================================
   CUSTOM TITLE
===================================================== */

customTitle.addEventListener(
  "input",
  function() {

    customTitlePreview.textContent =
      customTitle.value ||
      "VoiceポタLive 配信中";

  }
);

/* =====================================================
   WEBSOCKET
===================================================== */

function connectWebSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  ws = new WebSocket(
    protocol +
    "//" +
    location.host
  );

  ws.onopen = function() {

    console.log(
      "WebSocket connected"
    );

  };

  ws.onmessage = async function(event) {

    let data;

    try {

      data =
        JSON.parse(event.data);

    } catch(e) {

      return;

    }

    await handleSocketMessage(data);

  };

  ws.onclose = function() {

    setTimeout(
      connectWebSocket,
      1500
    );

  };

  ws.onerror = function() {

    try {
      ws.close();
    } catch(e) {}

  };

}

connectWebSocket();

/* =====================================================
   SOCKET SEND
===================================================== */

function sendSocket(data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify(data)
    );

  }

}

/* =====================================================
   SOCKET MESSAGE
===================================================== */

async function handleSocketMessage(data) {

  if (data.type === "live_list") {

    renderLiveList(
      data.lives || []
    );

    return;

  }

  if (data.type === "live_started") {

    currentLiveId =
      data.live.id;

    panelStatus.textContent =
      "配信中";

    updateLiveCounters(
      data.live
    );

    return;

  }

  if (data.type === "live_stopped") {

    if (
      data.id === currentLiveId
    ) {

      panelStatus.textContent =
        "配信が終了しました";

      stopLocalMedia();

    }

    refreshLives();

    return;

  }

  if (data.type === "live_update") {

    if (
      data.live &&
      data.live.id === currentLiveId
    ) {

      updateLiveCounters(
        data.live
      );

    }

    renderLiveList(
      data.lives || []
    );

    return;

  }

  if (data.type === "comment") {

    if (
      data.liveId === currentLiveId
    ) {

      addComment(
        data.name,
        data.text
      );

    }

    return;

  }

  if (data.type === "like") {

    if (
      data.liveId === currentLiveId
    ) {

      updateLiveCounters(
        data.live
      );

      showLikeAnimation();

    }

    return;

  }

  if (data.type === "gift") {

    if (
      data.liveId === currentLiveId
    ) {

      updateLiveCounters(
        data.live
      );

      showGiftAnimation(
        data.icon
      );

    }

    return;

  }

  if (data.type === "offer") {

    await handleOffer(
      data
    );

    return;

  }

  if (data.type === "answer") {

    await handleAnswer(
      data
    );

    return;

  }

  if (data.type === "ice") {

    await handleIce(
      data
    );

    return;

  }

  if (data.type === "viewer_count") {

    if (
      data.liveId === currentLiveId
    ) {

      viewerCount.textContent =
        data.viewers || 0;

    }

    return;

  }

}

/* =====================================================
   LIVE LIST
===================================================== */

function refreshLives() {

  sendSocket({
    type: "get_live_list"
  });

}

function renderLiveList(lives) {

  if (!Array.isArray(lives)) {

    lives = [];

  }

  if (
    lives.length === 0
  ) {

    liveList.innerHTML = `
      <div class="empty">
        現在ライブ配信はありません
      </div>
    `;

    return;

  }

  liveList.innerHTML =
    lives
      .map(live => `

        <div
          class="live-card"
          onclick="joinLive('${escapeHtml(live.id)}')"
        >

          <div class="live-avatar">
            🎙️
          </div>

          <div class="live-info">

            <div class="live-name">
              ${escapeHtml(live.name || "配信者")}
            </div>

            <div class="live-title">
              ${escapeHtml(live.title || "ライブ配信")}
            </div>

            <span class="live-badge">
              LIVE
            </span>

          </div>

        </div>

      `)
      .join("");

}

/* =====================================================
   START LIVE
===================================================== */

async function startLive() {

  const name =
    document
      .getElementById("streamName")
      .value
      .trim() ||
    "ぼたもち";

  const title =
    document
      .getElementById("streamTitle")
      .value
      .trim() ||
    "VoiceポタLive 配信中";

  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false
        });

  } catch(error) {

    alert(
      "マイクの使用を許可してください。"
    );

    return;

  }

  isBroadcaster = true;

  customName.value =
    name;

  customTitle.value =
    title;

  customTitlePreview.textContent =
    title;

  startLivePanel
    .classList
    .remove("show");

  livePanel
    .classList
    .add("show");

  panelStatus.textContent =
    "配信開始中...";

  sendSocket({

    type: "start_live",

    name: name,

    title: title

  });

}

/* =====================================================
   JOIN LIVE
===================================================== */

async function joinLive(id) {

  if (!id) {
    return;
  }

  currentLiveId =
    id;

  isBroadcaster = false;

  livePanel
    .classList
    .add("show");

  panelStatus.textContent =
    "配信に接続しています...";

  sendSocket({

    type: "join_live",

    id: id

  });

}

/* =====================================================
   ENABLE AUDIO
===================================================== */

async function enableAudio() {

  if (
    audioEnabled
  ) {

    return;

  }

  try {

    const audio =
      document.getElementById(
        "remoteAudio"
      );

    audio.muted = false;

    await audio.play();

    audioEnabled = true;

    document
      .getElementById(
        "audioButton"
      )
      .textContent =
      "🔊 音声ON";

    panelStatus.textContent =
      "音声を受信しています";

  } catch(error) {

    console.error(
      error
    );

    panelStatus.textContent =
      "音声を再生できませんでした";

  }

}

/* =====================================================
   STOP LIVE
===================================================== */

function stopLive() {

  sendSocket({

    type: "stop_live",

    id: currentLiveId

  });

  stopLocalMedia();

  currentLiveId = null;

  isBroadcaster = false;

  livePanel
    .classList
    .remove("show");

  refreshLives();

}

/* =====================================================
   CLOSE LIVE PANEL
===================================================== */

function closeLivePanel() {

  livePanel
    .classList
    .remove("show");

}

/* =====================================================
   STOP LOCAL MEDIA
===================================================== */

function stopLocalMedia() {

  if (
    localStream
  ) {

    localStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

    localStream = null;

  }

  if (
    peerConnection
  ) {

    try {
      peerConnection.close();
    } catch(e) {}

    peerConnection = null;

  }

}

/* =====================================================
   LIVE COUNTERS
===================================================== */

function updateLiveCounters(live) {

  if (!live) {
    return;
  }

  viewerCount.textContent =
    live.viewers || 0;

  likeCount.textContent =
    live.likes || 0;

  giftCount.textContent =
    live.gifts || 0;

}

/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  if (
    !currentLiveId
  ) {

    return;

  }

  sendSocket({

    type: "like",

    liveId:
      currentLiveId

  });

  showLikeAnimation();

}

/* =====================================================
   LIKE ANIMATION
===================================================== */

function showLikeAnimation() {

  const el =
    document.createElement(
      "div"
    );

  el.className =
    "like-pop";

  el.textContent =
    "❤️";

  document.body
    .appendChild(el);

  setTimeout(
    () => el.remove(),
    1800
  );

}

/* =====================================================
   GIFT PANEL
===================================================== */

function toggleGiftPanel() {

  giftPanelOpen =
    !giftPanelOpen;

  const panel =
    document.getElementById(
      "giftPanel"
    );

  if (
    giftPanelOpen
  ) {

    panel
      .classList
      .add("show");

  } else {

    panel
      .classList
      .remove("show");

  }

}

/* =====================================================
   GIFT
===================================================== */

function sendGift(
  icon,
  name,
  coins
) {

  if (
    !currentLiveId
  ) {

    return;

  }

  sendSocket({

    type: "gift",

    liveId:
      currentLiveId,

    icon:
      icon,

    name:
      name,

    coins:
      coins

  });

  showGiftAnimation(
    icon
  );

}

/* =====================================================
   GIFT ANIMATION
===================================================== */

function showGiftAnimation(
  icon
) {

  const el =
    document.createElement(
      "div"
    );

  el.className =
    "like-pop";

  el.textContent =
    icon || "🎁";

  document.body
    .appendChild(el);

  setTimeout(
    () => el.remove(),
    1800
  );

}

/* =====================================================
   COMMENT
===================================================== */

function sendComment() {

  const text =
    commentInput
      .value
      .trim();

  if (
    !text ||
    !currentLiveId
  ) {

    return;

  }

  sendSocket({

    type: "comment",

    liveId:
      currentLiveId,

    name:
      customName.value ||
      "リスナー",

    text:
      text

  });

  commentInput.value =
    "";

}

/* =====================================================
   ADD COMMENT
===================================================== */

function addComment(
  name,
  text
) {

  if (
    !name ||
    !text
  ) {

    return;

  }

  if (
    blockedUsers.has(name)
  ) {

    return;

  }

  comments.push({
    name: name,
    text: text
  });

  if (
    comments.length > 100
  ) {

    comments.shift();

  }

  commentList.innerHTML =
    comments
      .map(item => `

        <div class="comment-row">

          <div class="comment-user">
            ${escapeHtml(item.name)}
          </div>

          <div class="comment-text">
            ${escapeHtml(item.text)}
          </div>

          <button
            class="comment-block"
            onclick="blockCommentUser('${escapeHtml(item.name)}')"
          >
            このユーザーをブロック
          </button>

        </div>

      `)
      .join("");

  commentList.scrollTop =
    commentList.scrollHeight;

}

/* =====================================================
   BLOCK USER
===================================================== */

function blockUser() {

  const name =
    customName.value ||
    "このユーザー";

  if (
    confirm(
      name +
      " をブロックしますか？"
    )
  ) {

    blockedUsers.add(
      name
    );

    alert(
      "ブロックしました"
    );

  }

}

/* =====================================================
   BLOCK COMMENT USER
===================================================== */

function blockCommentUser(
  name
) {

  if (!name) {
    return;
  }

  blockedUsers.add(
    name
  );

  comments =
    comments.filter(
      item =>
        item.name !== name
    );

  addAllComments();

}

/* =====================================================
   RENDER COMMENTS
===================================================== */

function addAllComments() {

  commentList.innerHTML =
    comments
      .filter(
        item =>
          !blockedUsers.has(
            item.name
          )
      )
      .map(item => `

        <div class="comment-row">

          <div class="comment-user">
            ${escapeHtml(item.name)}
          </div>

          <div class="comment-text">
            ${escapeHtml(item.text)}
          </div>

          <button
            class="comment-block"
            onclick="blockCommentUser('${escapeHtml(item.name)}')"
          >
            このユーザーをブロック
          </button>

        </div>

      `)
      .join("");

}

/* =====================================================
   SEARCH
===================================================== */

function refreshSearch() {

  const input =
    document.getElementById(
      "searchInput"
    );

  input.value =
    "";

  document
    .getElementById(
      "searchResults"
    )
    .innerHTML = `
      <div class="search-empty">
        配信者やタイトルを検索できます
      </div>
    `;

  refreshLives();

}

/* =====================================================
   SEARCH INPUT
===================================================== */

document
  .getElementById(
    "searchInput"
  )
  .addEventListener(
    "input",
    function() {

      const keyword =
        this.value
          .trim()
          .toLowerCase();

      const result =
        document.getElementById(
          "searchResults"
        );

      if (!keyword) {

        result.innerHTML = `
          <div class="search-empty">
            配信者やタイトルを検索できます
          </div>
        `;

        return;

      }

      sendSocket({

        type:
          "search_live",

        keyword:
          keyword

      });

    }
  );

/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
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
      "&#039;"
    );

}

/* =====================================================
   WEBRTC
===================================================== */

function createPeerConnection() {

  const config = {

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

  };

  peerConnection =
    new RTCPeerConnection(
      config
    );

  peerConnection.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        sendSocket({

          type: "ice",

          liveId:
            currentLiveId,

          candidate:
            event.candidate

        });

      }

    };

  peerConnection.ontrack =
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

        audio
          .play()
          .catch(
            () => {}
          );

      }

    };

  return peerConnection;

}

/* =====================================================
   BROADCASTER WEBRTC
===================================================== */

async function startBroadcasterPeer() {

  if (
    !localStream
  ) {

    return;

  }

  createPeerConnection();

  localStream
    .getTracks()
    .forEach(
      track => {

        peerConnection
          .addTrack(
            track,
            localStream
          );

      }
    );

  const offer =
    await peerConnection
      .createOffer();

  await peerConnection
    .setLocalDescription(
      offer
    );

  sendSocket({

    type: "offer",

    liveId:
      currentLiveId,

    offer:
      offer

  });

}

/* =====================================================
   VIEWER WEBRTC
===================================================== */

async function handleOffer(
  data
) {

  if (
    isBroadcaster
  ) {

    return;

  }

  currentLiveId =
    data.liveId;

  createPeerConnection();

  await peerConnection
    .setRemoteDescription(
      new RTCSessionDescription(
        data.offer
      )
    );

  const answer =
    await peerConnection
      .createAnswer();

  await peerConnection
    .setLocalDescription(
      answer
    );

  sendSocket({

    type: "answer",

    liveId:
      currentLiveId,

    answer:
      answer

  });

}

/* =====================================================
   HANDLE ANSWER
===================================================== */

async function handleAnswer(
  data
) {

  if (
    !peerConnection
  ) {

    return;

  }

  await peerConnection
    .setRemoteDescription(
      new RTCSessionDescription(
        data.answer
      )
    );

}

/* =====================================================
   HANDLE ICE
===================================================== */

async function handleIce(
  data
) {

  if (
    !peerConnection ||
    !data.candidate
  ) {

    return;

  }

  try {

    await peerConnection
      .addIceCandidate(
        new RTCIceCandidate(
          data.candidate
        )
      );

  } catch(error) {

    console.error(
      error
    );

  }

}

/* =====================================================
   KEYBOARD COMMENT
===================================================== */

commentInput
  .addEventListener(
    "keydown",
    function(event) {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        sendComment();

      }

    }
  );

/* =====================================================
   INITIAL
===================================================== */

showPage("home");

refreshLives();

</script>

</body>

</html>
`;

/* =====================================================
   SERVER
===================================================== */

const server =
  http.createServer(
    (req, res) => {

      if (
        req.url === "/" ||
        req.url === "/index.html"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8"
          }
        );

        res.end(
          HTML
        );

        return;

      }

      if (
        req.url === "/home.png"
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
                "image/png"
            }
          );

          fs.createReadStream(
            file
          ).pipe(res);

          return;

        }

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

const wss =
  new WebSocket.Server({
    server
  });

/* =====================================================
   WEBSOCKET SERVER
===================================================== */

wss.on(
  "connection",
  socket => {

    clients.add(
      socket
    );

    socket.send(
      JSON.stringify({
        type:
          "live_list",
        lives:
          getLiveList()
      })
    );

    socket.on(
      "message",
      message => {

        let data;

        try {

          data =
            JSON.parse(
              message.toString()
            );

        } catch(error) {

          return;

        }

        handleMessage(
          socket,
          data
        );

      }
    );

    socket.on(
      "close",
      () => {

        clients.delete(
          socket
        );

        if (
          broadcaster === socket
        ) {

          broadcaster =
            null;

        }

        updateViewers();

      }
    );

  }
);

/* =====================================================
   MESSAGE HANDLER
===================================================== */

function handleMessage(
  socket,
  data
) {

  if (
    data.type ===
    "get_live_list"
  ) {

    sendTo(
      socket,
      {
        type:
          "live_list",
        lives:
          getLiveList()
      }
    );

    return;

  }

  if (
    data.type ===
    "start_live"
  ) {

    startServerLive(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "stop_live"
  ) {

    stopServerLive(
      socket
    );

    return;

  }

  if (
    data.type ===
    "join_live"
  ) {

    joinServerLive(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "like"
  ) {

    handleLike(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "gift"
  ) {

    handleGift(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "comment"
  ) {

    handleComment(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "offer"
  ) {

    relayOffer(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "answer"
  ) {

    relayAnswer(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "ice"
  ) {

    relayIce(
      socket,
      data
    );

    return;

  }

  if (
    data.type ===
    "search_live"
  ) {

    searchLives(
      socket,
      data.keyword
    );

    return;

  }

}

/* =====================================================
   LIVE START SERVER
===================================================== */

function startServerLive(
  socket,
  data
) {

  if (
    liveInfo.active
  ) {

    sendTo(
      socket,
      {
        type:
          "error",
        message:
          "現在は別の配信が行われています"
      }
    );

    return;

  }

  broadcaster =
    socket;

  liveInfo = {

    active: true,

    id:
      Date.now().toString(),

    name:
      String(
        data.name ||
        "ぼたもち"
      ).slice(
        0,
        30
      ),

    title:
      String(
        data.title ||
        "VoiceポタLive 配信中"
      ).slice(
        0,
        60
      ),

    startedAt:
      Date.now(),

    likes: 0,

    comments: 0,

    gifts: 0,

    viewers: 0

  };

  sendTo(
    socket,
    {
      type:
        "live_started",
      live:
        liveInfo
    }
  );

  broadcast({

    type:
      "live_list",

    lives:
      getLiveList()

  });

  updateViewers();

}

/* =====================================================
   LIVE STOP SERVER
===================================================== */

function stopServerLive(
  socket
) {

  if (
    broadcaster !== socket
  ) {

    return;

  }

  const id =
    liveInfo.id;

  liveInfo.active =
    false;

  liveInfo.id =
    null;

  liveInfo.name =
    "";

  liveInfo.title =
    "";

  liveInfo.startedAt =
    null;

  liveInfo.likes =
    0;

  liveInfo.comments =
    0;

  liveInfo.gifts =
    0;

  liveInfo.viewers =
    0;

  broadcaster =
    null;

  broadcast({

    type:
      "live_stopped",

    id:
      id

  });

  broadcast({

    type:
      "live_list",

    lives:
      getLiveList()

  });

}

/* =====================================================
   LIVE LIST
===================================================== */

function getLiveList() {

  if (
    !liveInfo.active
  ) {

    return [];

  }

  return [
    {
      ...liveInfo
    }
  ];

}

/* =====================================================
   JOIN LIVE
===================================================== */

function joinServerLive(
  socket,
  data
) {

  if (
    !liveInfo.active ||
    liveInfo.id !== data.id
  ) {

    sendTo(
      socket,
      {
        type:
          "error",
        message:
          "配信が見つかりません"
      }
    );

    return;

  }

  liveInfo.viewers++;

  sendTo(
    socket,
    {
      type:
        "live_update",
      live:
        liveInfo,
      lives:
        getLiveList()
    }
  );

  updateViewers();

}

/* =====================================================
   VIEWERS
===================================================== */

function updateViewers() {

  if (
    !liveInfo.active
  ) {

    return;

  }

  broadcast({

    type:
      "viewer_count",

    liveId:
      liveInfo.id,

    viewers:
      liveInfo.viewers

  });

}

/* =====================================================
   LIKE SERVER
===================================================== */

function handleLike(
  socket,
  data
) {

  if (
    !liveInfo.active ||
    data.liveId !== liveInfo.id
  ) {

    return;

  }

  liveInfo.likes++;

  broadcast({

    type:
      "like",

    liveId:
      liveInfo.id,

    live:
      liveInfo

  });

}

/* =====================================================
   GIFT SERVER
===================================================== */

function handleGift(
  socket,
  data
) {

  if (
    !liveInfo.active ||
    data.liveId !== liveInfo.id
  ) {

    return;

  }

  liveInfo.gifts++;

  broadcast({

    type:
      "gift",

    liveId:
      liveInfo.id,

    icon:
      data.icon || "🎁",

    name:
      data.name || "ギフト",

    coins:
      Number(
        data.coins || 0
      ),

    live:
      liveInfo

  });

}

/* =====================================================
   COMMENT SERVER
===================================================== */

function handleComment(
  socket,
  data
) {

  if (
    !liveInfo.active ||
    data.liveId !== liveInfo.id
  ) {

    return;

  }

  const name =
    String(
      data.name ||
      "リスナー"
    ).slice(
      0,
      30
    );

  const text =
    String(
      data.text ||
      ""
    ).slice(
      0,
      200
    );

  if (!text) {
    return;
  }

  liveInfo.comments++;

  broadcast({

    type:
      "comment",

    liveId:
      liveInfo.id,

    name:
      name,

    text:
      text

  });

  broadcast({

    type:
      "live_update",

    live:
      liveInfo,

    lives:
      getLiveList()

  });

}

/* =====================================================
   WEBRTC OFFER
===================================================== */

function relayOffer(
  socket,
  data
) {

  if (
    !broadcaster ||
    !liveInfo.active
  ) {

    return;

  }

  if (
    socket !== broadcaster
  ) {

    return;

  }

  broadcastExcept(
    socket,
    {
      type:
        "offer",

      liveId:
        liveInfo.id,

      offer:
        data.offer
    }
  );

}

/* =====================================================
   WEBRTC ANSWER
===================================================== */

function relayAnswer(
  socket,
  data
) {

  if (
    !broadcaster ||
    !liveInfo.active
  ) {

    return;

  }

  sendTo(
    broadcaster,
    {
      type:
        "answer",

      liveId:
        liveInfo.id,

      answer:
        data.answer
    }
  );

}

/* =====================================================
   WEBRTC ICE
===================================================== */

function relayIce(
  socket,
  data
) {

  if (
    !liveInfo.active
  ) {

    return;

  }

  broadcastExcept(
    socket,
    {
      type:
        "ice",

      liveId:
        liveInfo.id,

      candidate:
        data.candidate
    }
  );

}

/* =====================================================
   SEARCH LIVE
===================================================== */

function searchLives(
  socket,
  keyword
) {

  const key =
    String(
      keyword || ""
    )
      .toLowerCase()
      .trim();

  const lives =
    getLiveList()
      .filter(
        live =>
          !key ||
          String(
            live.name
          )
            .toLowerCase()
            .includes(key) ||
          String(
            live.title
          )
            .toLowerCase()
            .includes(key)
      );

  sendTo(
    socket,
    {
      type:
        "search_results",

      lives:
        lives
    }
  );

}

/* =====================================================
   SEND
===================================================== */

function sendTo(
  socket,
  data
) {

  if (
    socket &&
    socket.readyState ===
      WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(
        data
      )
    );

  }

}

/* =====================================================
   BROADCAST
===================================================== */

function broadcast(
  data
) {

  const message =
    JSON.stringify(
      data
    );

  for (
    const socket of clients
  ) {

    if (
      socket.readyState ===
      WebSocket.OPEN
    ) {

      socket.send(
        message
      );

    }

  }

}

/* =====================================================
   BROADCAST EXCEPT
===================================================== */

function broadcastExcept(
  except,
  data
) {

  const message =
    JSON.stringify(
      data
    );

  for (
    const socket of clients
  ) {

    if (
      socket === except
    ) {

      continue;

    }

    if (
      socket.readyState ===
      WebSocket.OPEN
    ) {

      socket.send(
        message
      );

    }

  }

}

/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "VoiceポタLive started"
    );

    console.log(
      "http://" +
      HOST +
      ":" +
      PORT
    );

  }
);
  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;

  border-radius: 15px;
}

.nav-icon {
  font-size: 22px;
}

.nav-item.active {
  color: #7dd7ff;

  background:
    rgba(60,100,255,.10);
}

/* =====================================================
   SEARCH
===================================================== */

.search-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 1900;

  background:
    #030510;

  padding:
    80px
    16px
    100px;

  overflow-y: auto;
}

.search-panel.show {
  display: block;
}

.search-input {
  width: 100%;

  height: 52px;

  border-radius: 16px;

  border:
    1px solid rgba(120,140,255,.2);

  background: #080d22;

  color: white;

  padding:
    0 16px;

  font-size: 15px;

  outline: none;
}

.search-results {
  margin-top: 15px;
}

.search-empty {
  padding: 30px 10px;

  text-align: center;

  color: #737d9e;

  font-size: 13px;
}

/* =====================================================
   NOTIFICATION
===================================================== */

.notification-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 1900;

  background: #030510;

  padding:
    78px
    16px
    100px;

  overflow-y: auto;
}

.notification-panel.show {
  display: block;
}

.notification-card {
  padding: 15px;

  margin-bottom: 10px;

  border-radius: 16px;

  background:
    rgba(15,20,50,.9);

  border:
    1px solid rgba(120,140,255,.12);
}

/* =====================================================
   MY PAGE
===================================================== */

.mypage-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 1900;

  background: #030510;

  padding:
    78px
    16px
    100px;

  overflow-y: auto;
}

.mypage-panel.show {
  display: block;
}

.profile-card {
  padding: 20px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid rgba(120,140,255,.14);

  text-align: center;
}

.profile-avatar {
  width: 78px;
  height: 78px;

  margin: 0 auto 12px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 36px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.profile-name {
  font-size: 20px;

  font-weight: 900;
}

.profile-sub {
  margin-top: 5px;

  color: #8591b4;

  font-size: 12px;
}

.profile-menu {
  margin-top: 15px;

  display: grid;

  gap: 9px;
}

.profile-menu button {
  height: 50px;

  border-radius: 15px;

  border:
    1px solid rgba(120,140,255,.12);

  background:
    rgba(14,19,45,.95);

  color: white;

  text-align: left;

  padding:
    0 16px;

  font-weight: 800;
}

/* =====================================================
   MODAL
===================================================== */

.modal {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 4000;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background:
    rgba(0,0,0,.72);

  backdrop-filter: blur(8px);
}

.modal.show {
  display: flex;
}

.modal-box {
  width: 100%;

  max-width: 430px;

  padding: 20px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      #151d45,
      #080b1f
    );

  border:
    1px solid rgba(130,150,255,.2);

  box-shadow:
    0 20px 70px rgba(0,0,0,.5);
}

.modal-title {
  font-size: 19px;

  font-weight: 900;
}

.modal-text {
  margin-top: 9px;

  color: #9ca8ca;

  font-size: 12px;

  line-height: 1.7;
}

.modal-actions {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin-top: 18px;
}

.modal-actions button {
  height: 46px;

  border: 0;

  border-radius: 14px;

  font-weight: 900;

  color: white;

  background:
    #202746;
}

.modal-actions .primary {
  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff
    );
}

/* =====================================================
   LIVE START
===================================================== */

.start-live-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 3500;

  background:
    #030510;

  padding:
    70px
    16px
    100px;

  overflow-y: auto;
}

.start-live-panel.show {
  display: block;
}

.start-live-title {
  font-size: 24px;

  font-weight: 900;

  margin-bottom: 18px;
}

.start-card {
  padding: 18px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid rgba(120,140,255,.14);
}

.start-label {
  display: block;

  margin-bottom: 7px;

  font-size: 12px;

  color: #aebbe0;

  font-weight: 800;
}

.start-input {
  width: 100%;

  height: 50px;

  border-radius: 14px;

  border:
    1px solid rgba(120,140,255,.2);

  background:
    #080d22;

  color: white;

  outline: none;

  padding:
    0 14px;

  font-size: 14px;
}

.start-input + .start-input {
  margin-top: 12px;
}

.start-button {
  width: 100%;

  height: 54px;

  margin-top: 16px;

  border: 0;

  border-radius: 16px;

  color: white;

  font-weight: 900;

  font-size: 15px;

  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff
    );
}

.start-note {
  margin-top: 10px;

  color: #707b9f;

  font-size: 10px;

  line-height: 1.6;
}

/* =====================================================
   RESPONSIVE
===================================================== */

@media (min-width: 700px) {

  .app {
    max-width: 720px;

    margin: 0 auto;
  }

  .header {
    max-width: 720px;

    left: 50%;

    right: auto;

    width: 720px;

    transform:
      translateX(-50%);
  }

  .bottom-nav {
    max-width: 720px;

    left: 50%;

    right: auto;

    width: 720px;

    transform:
      translateX(-50%);
  }

}

/* =====================================================
   BODY
===================================================== */

</style>

</head>

<body>

<div class="app">

<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>

<main id="homePage">

<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="VoiceポタLive"
    >

    <div class="hero-gradient"></div>

  </div>

  <div class="hero-content">

    <div class="hero-small">
      VOICE LIVE PLATFORM
    </div>

    <h1 class="hero-title">
      <span>声でつながる。</span>
    </h1>

    <div class="hero-description">
      話したい人と、聴きたい人がつながる<br>
      音声ライブ配信サービス。
    </div>

  </div>

</section>

<section class="section">

  <div class="section-head">

    <div class="section-title">
      ライブ中
    </div>

    <div class="section-sub">
      LIVE NOW
    </div>

  </div>

  <div
    id="liveList"
    class="live-list"
  >

    <div class="empty">
      現在ライブ配信はありません
    </div>

  </div>

</section>

<section class="section">

  <div class="section-head">

    <div class="section-title">
      VoiceポタLive
    </div>

  </div>

  <div class="features">

    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <div class="feature-title">
        音声ライブ
      </div>

      <div class="feature-text">
        声だけで気軽にライブ配信できます。
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
        配信者とリスナーがリアルタイムで交流できます。
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
        配信を応援して気持ちを届けられます。
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
        ギフトで配信者を応援できます。
      </div>

    </div>

  </div>

</section>

</main>

<!-- =====================================================
     SEARCH PANEL
===================================================== -->

<section
  id="searchPanel"
  class="search-panel"
>

  <input
    id="searchInput"
    class="search-input"
    placeholder="配信者やタイトルを検索"
    autocomplete="off"
  >

  <div
    id="searchResults"
    class="search-results"
  ></div>

</section>

<!-- =====================================================
     NOTIFICATION PANEL
===================================================== -->

<section
  id="notificationPanel"
  class="notification-panel"
>

  <h2>
    お知らせ
  </h2>

  <div class="notification-card">
    VoiceポタLiveへようこそ。
  </div>

</section>

<!-- =====================================================
     MY PAGE
===================================================== -->

<section
  id="mypagePanel"
  class="mypage-panel"
>

  <div class="profile-card">

    <div class="profile-avatar">
      🎧
    </div>

    <div
      id="profileName"
      class="profile-name"
    >
      ぼたもち
    </div>

    <div class="profile-sub">
      VoiceポタLive
    </div>

  </div>

  <div class="profile-menu">

    <button onclick="showStartLive()">
      🎙️ 配信する
    </button>

    <button>
      ⚙️ 設定
    </button>

    <button>
      📖 利用規約
    </button>

  </div>

</section>

<!-- =====================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    class="nav-item active"
    id="navHome"
    onclick="showPage('home')"
  >

    <div class="nav-icon">
      🏠
    </div>

    <div>
      ホーム
    </div>

  </button>

  <button
    class="nav-item"
    id="navSearch"
    onclick="showPage('search')"
  >

    <div class="nav-icon">
      🔎
    </div>

    <div>
      探す
    </div>

  </button>

  <button
    class="nav-item"
    id="navLive"
    onclick="showStartLive()"
  >

    <div class="nav-icon">
      🎙️
    </div>

    <div>
      配信
    </div>

  </button>

  <button
    class="nav-item"
    id="navNotification"
    onclick="showPage('notification')"
  >

    <div class="nav-icon">
      🔔
    </div>

    <div>
      お知らせ
    </div>

  </button>

  <button
    class="nav-item"
    id="navMypage"
    onclick="showPage('mypage')"
  >

    <div class="nav-icon">
      👤
    </div>

    <div>
      マイページ
    </div>

  </button>

</nav>

</div>

<!-- =====================================================
     START LIVE PANEL
===================================================== -->

<section
  id="startLivePanel"
  class="start-live-panel"
>

  <div class="start-live-title">
    配信を始める
  </div>

  <div class="start-card">

    <label class="start-label">
      配信者名
    </label>

    <input
      id="streamName"
      class="start-input"
      value="ぼたもち"
      maxlength="30"
    >

    <label
      class="start-label"
      style="margin-top:14px;"
    >
      配信タイトル
    </label>

    <input
      id="streamTitle"
      class="start-input"
      value="VoiceポタLive 配信中"
      maxlength="60"
    >

    <button
      class="start-button"
      onclick="startLive()"
    >
      🎙️ 配信開始
    </button>

    <div class="start-note">
      配信開始を押すとマイクの使用許可が表示されます。
    </div>

    <button
      class="panel-button close-button"
      onclick="closeStartLive()"
    >
      閉じる
    </button>

  </div>

</section>

<!-- =====================================================
     LIVE PANEL
===================================================== -->

<section
  id="livePanel"
  class="live-panel"
>

  <div class="panel-header">

    <div class="panel-title">
      ライブ配信
    </div>

    <div class="panel-live">
      LIVE
    </div>

  </div>

  <div class="custom-field">

    <label class="custom-label">
      配信者名
    </label>

    <input
      id="customName"
      class="custom-input"
      value="ぼたもち"
      maxlength="30"
    >

  </div>

  <div class="custom-field">

    <label class="custom-label">
      配信タイトル
    </label>

    <input
      id="customTitle"
      class="custom-input"
      value="VoiceポタLive 配信中"
      maxlength="60"
    >

    <div
      id="customTitlePreview"
      class="custom-title-preview"
    >
      VoiceポタLive 配信中
    </div>

  </div>

  <div
    id="panelStatus"
    class="panel-status"
  >
    配信準備中...
  </div>

  <div class="audio-status">

    <div class="audio-icon">
      🎙️
    </div>

    <div>
      音声ライブ
    </div>

    <div class="audio-wave">

      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>

    </div>

  </div>

  <audio
    id="remoteAudio"
    autoplay
    playsinline
  ></audio>

  <div class="live-social">

    <div class="social-stats">

      <div class="social-stat">

        <strong id="viewerCount">
          0
        </strong>

        <span>
          視聴者
        </span>

      </div>

      <div class="social-stat">

        <strong id="likeCount">
          0
        </strong>

        <span>
          いいね
        </span>

      </div>

      <div class="social-stat">

        <strong id="giftCount">
          0
        </strong>

        <span>
          ギフト
        </span>

      </div>

    </div>

    <div class="social-actions">

      <button
        class="social-button social-like"
        onclick="sendLike()"
      >
        ❤️ いいね
      </button>

      <button
        class="social-button social-gift"
        onclick="toggleGiftPanel()"
      >
        🎁 ギフト
      </button>

      <button
        class="social-button social-block"
        onclick="blockUser()"
      >
        🚫 ブロック
      </button>

    </div>

    <div
      id="giftPanel"
      class="gift-panel"
    >

      <div class="gift-grid">

        <button
          class="gift-item"
          onclick="sendGift('🌹','バラ',10)"
        >
          <span class="icon">
            🌹
          </span>

          <span class="name">
            バラ
          </span>

          <span class="coins">
            10コイン
          </span>

        </button>

        <button
          class="gift-item"
          onclick="sendGift('❤️','ハート',50)"
        >
          <span class="icon">
            ❤️
          </span>

          <span class="name">
            ハート
          </span>

          <span class="coins">
            50コイン
          </span>

        </button>

        <button
          class="gift-item"
          onclick="sendGift('⭐','スター',100)"
        >
          <span class="icon">
            ⭐
          </span>

          <span class="name">
            スター
          </span>

          <span class="coins">
            100コイン
          </span>

        </button>

        <button
          class="gift-item"
          onclick="sendGift('🎁','プレゼント',500)"
        >
          <span class="icon">
            🎁
          </span>

          <span class="name">
            プレゼント
          </span>

          <span class="coins">
            500コイン
          </span>

        </button>

      </div>

    </div>

    <div class="comment-box">

      <div
        id="commentList"
        class="comment-list"
      ></div>

      <div class="comment-form">

        <input
          id="commentInput"
          class="comment-input"
          placeholder="コメントを入力"
          maxlength="200"
          autocomplete="off"
        >

        <button
          class="comment-send"
          onclick="sendComment()"
        >
          送信
        </button>

      </div>

    </div>

  </div>

  <button
    class="panel-button audio-on-button"
    id="audioButton"
    onclick="enableAudio()"
  >
    🎙️ マイクを有効にする
  </button>

  <button
    class="panel-button stop-button"
    id="stopLiveButton"
    onclick="stopLive()"
  >
    ⛔ 配信終了
  </button>

  <button
    class="panel-button close-button"
    onclick="closeLivePanel()"
  >
    閉じる
  </button>

</section>

<!-- =====================================================
     MODAL
===================================================== -->

<div
  id="modal"
  class="modal"
>

  <div class="modal-box">

    <div
      id="modalTitle"
      class="modal-title"
    >
      確認
    </div>

    <div
      id="modalText"
      class="modal-text"
    >
    </div>

    <div class="modal-actions">

      <button
        onclick="closeModal()"
      >
        キャンセル
      </button>

      <button
        id="modalPrimary"
        class="primary"
      >
        OK
      </button>

    </div>

  </div>

</div>
    return;
  }


  if (
    data.type ===
    "viewer_count"
  ) {

    const e =
      document.getElementById(
        "viewerCount"
      );

    if (e) {
      e.textContent =
        data.viewers || 0;
    }

    return;
  }


  if (
    data.type ===
    "live_start_failed"
  ) {

    isBroadcaster =
      false;

    if (localStream) {

      localStream
        .getTracks()
        .forEach(
          function(track) {
            track.stop();
          }
        );

      localStream = null;
    }

    alert(
      data.reason ||
      "配信を開始できませんでした"
    );

    return;
  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function renderLiveList(lives) {

  const list =
    document.getElementById(
      "liveList"
    );


  if (
    !lives ||
    lives.length === 0
  ) {

    list.innerHTML =
      "<div class='empty'>" +
      "現在配信中のライブはありません" +
      "</div>";

    return;

  }


  let html = "";


  lives.forEach(
    function(live) {

      html +=
        "<div class='live-card' " +
        "data-live-id='" +
        escapeHtml(live.id) +
        "'>";

      html +=
        "<div class='live-avatar'>🎙️</div>";

      html +=
        "<div class='live-info'>";

      html +=
        "<div class='live-name'>" +
        escapeHtml(
          live.name ||
          "Voice配信者"
        ) +
        "</div>";

      html +=
        "<div class='live-title'>" +
        escapeHtml(
          live.title ||
          "音声ライブ配信中"
        ) +
        "</div>";

      html +=
        "<span class='live-badge'>LIVE</span>";

      html +=
        "</div></div>";

    }
  );


  list.innerHTML =
    html;


  Array.prototype.forEach.call(
    list.querySelectorAll(
      ".live-card"
    ),
    function(card) {

      card.addEventListener(
        "click",
        function() {

          listenLive(
            card.getAttribute(
              "data-live-id"
            )
          );

        }
      );

    }
  );

}


/* =====================================================
   START LIVE
===================================================== */

async function startLive() {

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


  const nameInput =
    document.getElementById(
      "liveNameInput"
    );

  const titleInput =
    document.getElementById(
      "liveTitleInput"
    );


  const name =
    nameInput.value.trim();

  const title =
    titleInput.value.trim();


  if (!name) {

    alert(
      "配信者名を入力してください"
    );

    nameInput.focus();

    return;

  }


  if (!title) {

    alert(
      "配信タイトルを入力してください"
    );

    titleInput.focus();

    return;

  }


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

  } catch (error) {

    console.error(
      "getUserMedia error:",
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


  openPanel();


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


  const panelTitle =
    document.getElementById(
      "panelTitleText"
    );


  if (panelTitle) {

    panelTitle.textContent =
      title;

  }


  setPanelStatus(
    "🔴 配信を開始しています..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "🎙️ マイク配信中";


  sendMessage({

    type:
      "start_live",

    clientId:
      myId,

    name:
      name,

    title:
      title

  });


  setPanelStatus(
    "🔴 配信中です"
  );

}


/* =====================================================
   STOP LIVE
===================================================== */

function stopLive() {

  if (!isBroadcaster) {

    closePanel();

    return;

  }


  sendMessage({

    type:
      "stop_live",

    clientId:
      myId

  });


  closePeerConnections();


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

  isBroadcaster =
    false;


  setPanelStatus(
    "配信を終了しました"
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "配信終了";


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";

}


/* =====================================================
   LISTEN LIVE
===================================================== */

function listenLive(id) {

  if (isBroadcaster) {

    alert(
      "配信中は別のライブを視聴できません。"
    );

    return;

  }


  currentLiveId =
    id;


  openPanel();


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


  setPanelStatus(
    "🎧 配信者へ接続しています..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "接続中...";


  sendMessage({

    type:
      "join_live",

    clientId:
      myId,

    liveId:
      id

  });

}


/* =====================================================
   BROADCASTER CREATE OFFER
===================================================== */

async function createOfferForViewer(
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


  const audioTracks =
    localStream.getAudioTracks();


  audioTracks.forEach(
    function(track) {

      const sender =
        pc.addTrack(
          track,
          localStream
        );


      try {

        const params =
          sender.getParameters();


        if (!params.encodings) {

          params.encodings = [
            {}
          ];

        }


        params.encodings[0]
          .maxBitrate =
          64000;


        sender.setParameters(
          params
        ).catch(
          function(error) {

            console.log(
              "setParameters error",
              error
            );

          }
        );

      } catch (error) {

        console.log(
          "sender parameter error",
          error
        );

      }

    }
  );


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        sendMessage({

          type:
            "ice_candidate",

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
        "Broadcaster:",
        viewerId,
        pc.connectionState
      );


      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "closed"
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


    sendMessage({

      type:
        "offer",

      from:
        myId,

      to:
        viewerId,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.error(
      "offer error",
      error
    );

  }

}


/* =====================================================
   VIEWER RECEIVE OFFER
===================================================== */

async function receiveOffer(data) {

  if (isBroadcaster) {
    return;
  }


  closePeerConnections();


  currentBroadcasterId =
    data.from;


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    data.from
  ] = pc;


  pc.ontrack =
    function(event) {

      console.log(
        "Remote audio track received"
      );


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


      audio.autoplay =
        true;

      audio.playsInline =
        true;


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioOnButton"
            ).style.display =
              "none";


            setPanelStatus(
              "🔊 ライブ音声を受信中"
            );


            document.getElementById(
              "audioText"
            ).textContent =
              "🔊 LIVE 音声";

          }
        )
        .catch(
          function(error) {

            console.log(
              "Autoplay blocked",
              error
            );


            document.getElementById(
              "audioOnButton"
            ).style.display =
              "block";


            setPanelStatus(
              "音声をONにしてください"
            );

          }
        );

    };


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        sendMessage({

          type:
            "ice_candidate",

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
        "Viewer:",
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "connected"
      ) {

        setPanelStatus(
          "🔊 ライブ音声を受信中"
        );

      }


      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "disconnected"
      ) {

        setPanelStatus(
          "音声接続が切れました"
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


    sendMessage({

      type:
        "answer",

      from:
        myId,

      to:
        data.from,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.error(
      "receive offer error",
      error
    );

  }

}


/* =====================================================
   RECEIVE ANSWER
===================================================== */

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

  } catch (error) {

    console.error(
      "answer error",
      error
    );

  }

}


/* =====================================================
   ICE
===================================================== */

async function receiveIceCandidate(
  data
) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) {
    return;
  }


  try {

    /*
     * remoteDescription設定後にICEを追加
     */

    if (!pc.remoteDescription) {

      pc._pendingIce =
        pc._pendingIce || [];

      pc._pendingIce.push(
        data.candidate
      );

      return;
    }


    await pc.addIceCandidate(
      new RTCIceCandidate(
        data.candidate
      )
    );

  } catch (error) {

    console.error(
      "ICE error",
      error
    );

  }

}


/* =====================================================
   ENABLE AUDIO
===================================================== */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  audio.muted =
    false;

  audio.volume =
    1.0;


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioOnButton"
        ).style.display =
          "none";


        setPanelStatus(
          "🔊 ライブ音声を受信中"
        );
                  "🔊 ライブ音声を受信中"
        );


        document.getElementById(
          "audioText"
        ).textContent =
          "🔊 LIVE 音声";

      }
    )
    .catch(
      function(error) {

        console.error(
          "audio play error",
          error
        );

      }
    );

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  sendMessage({

    type:
      "like",

    clientId:
      myId

  });

}


/* =====================================================
   GIFT
===================================================== */

function toggleGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (panel) {

    panel.classList.toggle(
      "show"
    );

  }

}


function sendGift(
  giftId
) {

  sendMessage({

    type:
      "gift",

    clientId:
      myId,

    giftId:
      giftId,

    name:
      getMyName()

  });


  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (panel) {

    panel.classList.remove(
      "show"
    );

  }

}


/* =====================================================
   COMMENT
===================================================== */

function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );


  if (!input) {
    return;
  }


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  sendMessage({

    type:
      "comment",

    clientId:
      myId,

    text:
      text,

    name:
      getMyName()

  });


  input.value =
    "";

}


function getMyName() {

  const input =
    document.getElementById(
      "liveNameInput"
    );


  return (
    input &&
    input.value.trim()
  ) ||
  "ゲスト";

}


/* =====================================================
   COMMENT DISPLAY
===================================================== */

function addComment(
  comment
) {

  const list =
    document.getElementById(
      "commentList"
    );


  if (!list) {
    return;
  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "comment-row";


  const user =
    document.createElement(
      "div"
    );

  user.className =
    "comment-user";

  user.textContent =
    comment.name ||
    "ゲスト";


  const text =
    document.createElement(
      "div"
    );

  text.className =
    "comment-text";

  text.textContent =
    comment.text ||
    "";


  const block =
    document.createElement(
      "button"
    );

  block.className =
    "comment-block";

  block.textContent =
    "🚫 ブロック";


  block.onclick =
    function() {

      blockUser(
        comment.userId
      );

    };


  row.appendChild(
    user
  );

  row.appendChild(
    text
  );

  row.appendChild(
    block
  );


  list.appendChild(
    row
  );


  while (
    list.children.length >
    100
  ) {

    list.removeChild(
      list.firstChild
    );

  }


  list.scrollTop =
    list.scrollHeight;

}


/* =====================================================
   BLOCK
===================================================== */

function blockUser(
  userId
) {

  if (
    !userId ||
    userId === myId
  ) {

    return;

  }


  sendMessage({

    type:
      "block_user",

    clientId:
      myId,

    targetId:
      userId

  });

}


function blockCurrentUser() {

  if (isBroadcaster) {

    alert(
      "配信者はコメント欄のユーザーからブロックできます。"
    );

    return;

  }


  if (
    !currentBroadcasterId
  ) {

    return;

  }


  blockUser(
    currentBroadcasterId
  );


  closePanel();

}


/* =====================================================
   LIKE ANIMATION
===================================================== */

function showLike() {

  const el =
    document.createElement(
      "div"
    );


  el.className =
    "like-pop";


  el.textContent =
    "❤️";


  document.body.appendChild(
    el
  );


  setTimeout(
    function() {

      el.remove();

    },
    1800
  );

}


/* =====================================================
   RESET SOCIAL UI
===================================================== */

function resetSocialUI() {

  const ids = [
    "viewerCount",
    "likeCount",
    "giftCount"
  ];


  ids.forEach(
    function(id) {

      const e =
        document.getElementById(
          id
        );

      if (e) {
        e.textContent =
          "0";
      }

    }
  );


  const list =
    document.getElementById(
      "commentList"
    );


  if (list) {
    list.innerHTML =
      "";
  }

}


/* =====================================================
   CLOSE PEERS
===================================================== */

function closePeerConnections() {

  Object.keys(
    peerConnections
  ).forEach(
    function(id) {

      try {

        peerConnections[
          id
        ].close();

      } catch (error) {}

    }
  );


  peerConnections = {};

}


/* =====================================================
   PANEL
===================================================== */

function openPanel() {

  document
    .getElementById(
      "livePanel"
    )
    .classList.add(
      "show"
    );


  resetSocialUI();

}


function closePanel() {

  if (
    !isBroadcaster
  ) {

    closePeerConnections();

  }


  document
    .getElementById(
      "livePanel"
    )
    .classList.remove(
      "show"
    );

}


function setPanelStatus(
  text
) {

  document.getElementById(
    "panelStatus"
  ).textContent =
    text;

}


/* =====================================================
   SCROLL
===================================================== */

function scrollLive() {

  document
    .getElementById(
      "liveSection"
    )
    .scrollIntoView({
      behavior:
        "smooth"
    });

}


/* =====================================================
   NAV
===================================================== */

function goHome() {

  window.scrollTo({

    top:
      0,

    behavior:
      "smooth"

  });

}


function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}


function showProfile() {

  alert(
    "マイページ機能を準備中です。"
  );

}


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(
  value
) {

  return String(
    value
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
      "&#039;"
    );

}


/* =====================================================
   START
===================================================== */

connectSocket();


/* =====================================================
   TITLE INPUT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const titleInput =
      document.getElementById(
        "liveTitleInput"
      );


    if (titleInput) {

      titleInput.addEventListener(
        "input",
        updateTitlePreview
      );

    }


    updateTitlePreview();

  }
);

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
              "no-cache, no-store"
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


      /* NOT FOUND */

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


wss.on(
  "connection",
  function(ws) {

    clients.add(
      ws
    );


    ws.clientId =
      "client_" +
      Math.random()
        .toString(36)
        .substring(2);


    ws.joinedLive =
      false;

    ws.blockedUsers =
      new Set();


    console.log(
      "WebSocket connected:",
      ws.clientId
    );


    sendLiveListTo(
      ws
    );


    ws.on(
      "message",
      function(message) {

        let data;


        try {

          data =
            JSON.parse(
              message.toString()
            );

        } catch (error) {

          console.log(
            "Invalid JSON"
          );

          return;

        }


        /* =============================================
           HELLO
        ============================================= */

        if (
          data.type ===
          "hello"
        ) {

          if (
            data.clientId
          ) {

            ws.clientId =
              data.clientId;

          }

          return;
        }


        /* =============================================
           START LIVE
        ============================================= */

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

            ws.send(
              JSON.stringify({

                type:
                  "live_start_failed",

                reason:
                  "現在ほかの配信者が配信中です"

              })
            );

            return;

          }


          broadcaster =
            ws;


          liveInfo = {

            active:
              true,

            id:
              ws.clientId,

            name:
              String(
                data.name ||
                "Voice配信者"
              ).slice(
                0,
                30
              ),

            title:
              String(
                data.title ||
                "音声ライブ配信中"
              ).slice(
                0,
                60
              ),

            startedAt:
              Date.now(),

            likes:
              0,

            comments:
              0,

            gifts:
              0,

            viewers:
              0

          };


          ws.isBroadcaster =
            true;


          console.log(
            "LIVE START:",
            liveInfo.name
          );


          broadcastLiveList();

          return;
        }


        /* =============================================
           STOP LIVE
        ============================================= */

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


        /* =============================================
           JOIN LIVE
        ============================================= */

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

            ws.send(
              JSON.stringify({

                type:
                  "live_unavailable"

              })
            );

            return;
          }


          ws.joinedLive =
            true;


          ws.broadcasterId =
            broadcaster.clientId;


          broadcaster.send(
            JSON.stringify({

              type:
                "viewer_joined",

              viewerId:
                ws.clientId

            })
          );


          liveInfo.viewers =
            (
              liveInfo.viewers ||
              0
            ) + 1;


          broadcast({

            type:
              "viewer_count",

            viewers:
              liveInfo.viewers
          });


          console.log(
            "VIEWER JOIN:",
            ws.clientId
          );


          return;
        }


        /* =============================================
           LIKE
        ============================================= */

        if (
          data.type ===
          "like"
        ) {

          if (
            !liveInfo.active
          ) {
            return;
          }


          const now =
            Date.now();


          if (
            ws.lastLikeAt &&
            now -
              ws.lastLikeAt <
              300
          ) {

            return;

          }


          ws.lastLikeAt =
            now;


          liveInfo.likes =
            (
              liveInfo.likes ||
              0
            ) + 1;


          broadcast({

            type:
              "like_update",

            likes:
              liveInfo.likes

          });


          return;
        }


        /* =============================================
           GIFT
        ============================================= */

        if (
          data.type ===
          "gift"
        ) {

          if (
            !liveInfo.active
          ) {
            return;
          }


          const gifts = {

            rose: {
              name:
                "バラ",

              coins:
                10
            },

            heart: {
              name:
                "ハート",

              coins:
                50
            },

            star: {
              name:
                "スター",

              coins:
                100
            },

            present: {
              name:
                "プレゼント",

              coins:
                500
            }

          };


          const gift =
            gifts[
              data.giftId
            ];


          if (!gift) {
            return;
          }


          const now =
            Date.now();


          if (
            ws.lastGiftAt &&
            now -
              ws.lastGiftAt <
              700
          ) {

            return;

          }


          ws.lastGiftAt =
            now;


          liveInfo.gifts =
            (
              liveInfo.gifts ||
              0
            ) + 1;


          broadcast({

            type:
              "gift_update",

            gifts:
              liveInfo.gifts,

            name:
              String(
                data.name ||
                "ゲスト"
              ).slice(
                0,
                30
              ),

            giftName:
              gift.name,

            coins:
              gift.coins

          });


          return;
        }


        /* =============================================
           COMMENT
        ============================================= */

        if (
          data.type ===
          "comment"
        ) {

          if (
            !liveInfo.active
          ) {
            return;
          }


          const now =
            Date.now();


          if (
            ws.lastCommentAt &&
            now -
              ws.lastCommentAt <
              700
          ) {

            return;

          }


          ws.lastCommentAt =
            now;


          const text =
            String(
              data.text ||
              ""
            )
              .replace(
                /[\u0000-\u001F\u007F]/g,
                ""
              )
              .trim()
              .slice(
                0,
                120
              );


          if (!text) {
            return;
          }


          liveInfo.comments =
            (
              liveInfo.comments ||
              0
            ) + 1;


          broadcast({

            type:
              "comment",

            userId:
              ws.clientId,

            name:
              String(
                data.name ||
                "ゲスト"
              ).slice(
                0,
                30
              ),

            text:
              text

          });


          return;
        }


        /* =============================================
           BLOCK
        ============================================= */

        if (
          data.type ===
          "block_user"
        ) {

          ws.blockedUsers =
            ws.blockedUsers ||
            new Set();


          if (
            data.targetId
          ) {

            ws.blockedUsers.add(
              String(
                data.targetId
              )
            );

          }


          return;
        }


        /* =============================================
           OFFER / ANSWER / ICE
        ============================================= */

        if (
          data.type ===
            "offer" ||
          data.type ===
            "answer" ||
          data.type ===
            "ice_candidate"
        ) {

          relaySignaling(
            data
          );

          return;
        }

      }
    );


    ws.on(
      "close",
      function() {

        clients.delete(
          ws
        );


        /*
         * 配信者が切断
         */

        if (
          broadcaster ===
          ws
        ) {

          stopLiveServer();

        }


        /*
         * 視聴者が退出
         */

        if (
          ws.joinedLive &&
          broadcaster &&
          broadcaster.readyState ===
            WebSocket.OPEN
        ) {

          broadcaster.send(
            JSON.stringify({

              type:
                "viewer_left",

              viewerId:
                ws.clientId

            })
          );


          liveInfo.viewers =
            Math.max(
              0,
              (
                liveInfo.viewers ||
                0
              ) - 1
            );


          broadcast({

            type:
              "viewer_count",

            viewers:
              liveInfo.viewers

          });

        }


        console.log(
          "WebSocket disconnected:",
          ws.clientId
        );

      }
    );

  }
);


/* =====================================================
   SIGNALING
===================================================== */

function relaySignaling(
  data
) {

  if (!data.to) {
    return;
  }


  for (
    const client of clients
  ) {

    if (
      client.clientId ===
      data.to
    ) {

      if (
        client.readyState ===
        WebSocket.OPEN
      ) {

        client.send(
          JSON.stringify(
            data
          )
        );

      }

      return;
    }

  }

}


/* =====================================================
   STOP LIVE SERVER
===================================================== */

function stopLiveServer() {

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

    startedAt:
      null,

    likes:
      0,

    comments:
      0,

    gifts:
      0,

    viewers:
      0

  };


  broadcast({

    type:
      "live_stopped",

    lives:
      []

  });


  console.log(
    "LIVE STOP"
  );

}


/* =====================================================
   LIVE LIST
===================================================== */

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

      startedAt:
        liveInfo.startedAt,

      likes:
        liveInfo.likes ||
        0,

      comments:
        liveInfo.comments ||
        0,

      gifts:
        liveInfo.gifts ||
        0,

      viewers:
        liveInfo.viewers ||
        0

    }

  ];

}


/* =====================================================
   SEND LIVE LIST
===================================================== */

function sendLiveListTo(
  ws
) {

  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {

    return;

  }


  ws.send(
    JSON.stringify({

      type:
        "live_list",

      lives:
        getLiveList()

    })
  );

}


/* =====================================================
   BROADCAST LIVE LIST
===================================================== */

function broadcastLiveList() {

  broadcast({

    type:
      "live_list",

    lives:
      getLiveList()

  });

}


/* =====================================================
   BROADCAST
===================================================== */

function broadcast(
  data
) {

  const message =
    JSON.stringify(
      data
    );


  for (
    const client of clients
  ) {

    if (
      client.readyState ===
      WebSocket.OPEN
    ) {

      client.send(
        message
      );

    }

  }

}


/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "================================="
    );

    console.log(
      "VoiceポタLive"
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
