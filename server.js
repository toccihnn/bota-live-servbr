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
.nav-item.active {
  color: #8fdcff;
}

.nav-icon {
  font-size: 21px;
  line-height: 1;
  margin-bottom: 4px;
}

.nav-label {
  font-size: 9px;
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

  backdrop-filter:
    blur(8px);
}

.modal.show {
  display: flex;
}

.modal-box {
  width: 100%;
  max-width: 420px;

  padding: 20px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      #151d47,
      #070a1d
    );

  border:
    1px solid rgba(130,150,255,.2);

  box-shadow:
    0 20px 70px rgba(0,0,0,.55);
}

.modal-title {
  font-size: 18px;
  font-weight: 900;
}

.modal-text {
  margin-top: 9px;

  color: #aab5d4;

  font-size: 12px;

  line-height: 1.7;
}

.modal-buttons {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin-top: 16px;
}

.modal-button {
  height: 46px;

  border: 0;

  border-radius: 13px;

  color: #fff;

  font-weight: 900;
}

.modal-ok {
  background:
    linear-gradient(
      100deg,
      #315cff,
      #7b38ff
    );
}

.modal-cancel {
  background: #202744;
}

/* =====================================================
   TOAST
===================================================== */

.toast {
  position: fixed;

  left: 50%;

  bottom: 95px;

  z-index: 5000;

  transform:
    translateX(-50%)
    translateY(20px);

  min-width: 190px;

  max-width: 90%;

  padding: 12px 16px;

  border-radius: 999px;

  text-align: center;

  font-size: 12px;

  font-weight: 800;

  background:
    rgba(20,25,55,.96);

  border:
    1px solid rgba(130,150,255,.2);

  box-shadow:
    0 10px 30px rgba(0,0,0,.35);

  opacity: 0;

  pointer-events: none;

  transition:
    opacity .25s,
    transform .25s;
}

.toast.show {
  opacity: 1;

  transform:
    translateX(-50%)
    translateY(0);
}

/* =====================================================
   SEARCH
===================================================== */

.search-area {
  display: none;

  padding:
    80px
    15px
    110px;
}

.search-area.show {
  display: block;
}

.search-input {
  width: 100%;

  height: 50px;

  padding:
    0 15px;

  border-radius: 16px;

  border:
    1px solid rgba(120,140,255,.18);

  background: #090d21;

  color: #fff;

  outline: none;

  font-size: 14px;
}

.search-result {
  margin-top: 15px;
}

/* =====================================================
   NOTICE
===================================================== */

.notice-area {
  display: none;

  padding:
    80px
    15px
    110px;
}

.notice-area.show {
  display: block;
}

.notice-card {
  padding: 16px;

  border-radius: 17px;

  margin-bottom: 9px;

  background:
    rgba(15,20,48,.9);

  border:
    1px solid rgba(120,140,255,.1);
}

.notice-title {
  font-size: 13px;

  font-weight: 900;
}

.notice-text {
  margin-top: 6px;

  font-size: 11px;

  color: #8792b3;

  line-height: 1.6;
}

/* =====================================================
   MY PAGE
===================================================== */

.mypage-area {
  display: none;

  padding:
    80px
    15px
    110px;
}

.mypage-area.show {
  display: block;
}

.profile-card {
  padding: 22px;

  text-align: center;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      rgba(25,33,78,.95),
      rgba(8,11,29,.98)
    );

  border:
    1px solid rgba(120,140,255,.14);
}

.profile-avatar {
  width: 78px;
  height: 78px;

  margin: auto;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  font-size: 35px;

  background:
    radial-gradient(
      circle,
      #78dfff,
      #485cff 55%,
      #21104c
    );
}

.profile-name {
  margin-top: 11px;

  font-size: 18px;

  font-weight: 900;
}

.profile-sub {
  margin-top: 5px;

  color: #8792b3;

  font-size: 11px;
}

/* =====================================================
   RESPONSIVE
===================================================== */

@media (min-width: 700px) {

  .app {
    max-width: 720px;
    margin: auto;
  }

  .header {
    max-width: 720px;
    left: 50%;
    right: auto;
    width: 720px;
    transform: translateX(-50%);
  }

  .bottom-nav {
    max-width: 720px;
    left: 50%;
    right: auto;
    width: 720px;
    transform: translateX(-50%);
  }

  .hero {
    margin-top: 58px;
  }

  .live-panel {
    max-width: 720px;
    left: 50%;
    right: auto;
    width: 720px;
    transform: translateX(-50%);
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

</header>

<main id="homeArea">

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
        AUDIO LIVE STREAMING
      </div>

      <h1 class="hero-title">
        声でつながる<br>
        <span>VoiceボタLive</span>
      </h1>

      <div class="hero-description">
        声だけだから、もっと自然に。<br>
        好きな声と出会える音声ライブ配信。
      </div>

    </div>

  </section>

  <section class="section">

    <div class="section-head">

      <div class="section-title">
        LIVE NOW
      </div>

      <div class="section-sub">
        配信中
      </div>

    </div>

    <div
      id="liveList"
      class="live-list"
    >

      <div class="empty">
        現在配信中のライブはありません
      </div>

    </div>

  </section>

  <section class="section">

    <div class="section-head">

      <div class="section-title">
        VoiceボタLiveの特徴
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
          顔を出さずに声だけで
          気軽に配信できます。
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
          配信者とリスナーが
          コメントで交流できます。
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
          配信を応援して
          気持ちを届けられます。
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
          ギフトを送って
          配信者を応援できます。
        </div>

      </div>

    </div>

  </section>

</main>

<!-- ===================================================
     SEARCH AREA
=================================================== -->

<section
  id="searchArea"
  class="search-area"
>

  <input
    id="searchInput"
    class="search-input"
    type="search"
    placeholder="配信者やタイトルを検索"
  >

  <div
    id="searchResult"
    class="search-result"
  ></div>

</section>

<!-- ===================================================
     NOTICE AREA
=================================================== -->

<section
  id="noticeArea"
  class="notice-area"
>

  <div class="section-title">
    お知らせ
  </div>

  <div
    class="notice-card"
    style="margin-top:15px"
  >

    <div class="notice-title">
      VoiceボタLiveへようこそ
    </div>

    <div class="notice-text">
      声でつながる音声ライブをお楽しみください。
    </div>

  </div>

</section>

<!-- ===================================================
     MY PAGE
=================================================== -->

<section
  id="mypageArea"
  class="mypage-area"
>

  <div class="profile-card">

    <div class="profile-avatar">
      🎙️
    </div>

    <div class="profile-name">
      ぼたもち
    </div>

    <div class="profile-sub">
      VoiceボタLiveユーザー
    </div>

  </div>

</section>

<!-- ===================================================
     LIVE PANEL
=================================================== -->

<section
  id="livePanel"
  class="live-panel"
>

  <div class="panel-header">

    <div class="panel-title">
      音声ライブ
    </div>

    <div
      id="panelLiveBadge"
      class="panel-live"
    >
      LIVE
    </div>

  </div>

  <div
    id="streamerName"
    class="panel-status"
  >
    配信者：ぼたもち
  </div>

  <div
    id="streamTitle"
    class="panel-status"
  >
    VoiceボタLive 配信中
  </div>

  <div
    id="streamTitleEdit"
    class="custom-field"
    style="display:none"
  >

    <label
      class="custom-label"
      for="titleInput"
    >
      配信タイトル
    </label>

    <input
      id="titleInput"
      class="custom-input"
      type="text"
      maxlength="60"
      placeholder="配信タイトルを入力"
    >

    <div
      id="titlePreview"
      class="custom-title-preview"
    >
      VoiceボタLive 配信中
    </div>

  </div>

  <div class="audio-status">

    <div class="audio-icon">
      🎙️
    </div>

    <div id="audioStatusText">
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
        <strong id="viewerCount">0</strong>
        <span>視聴者</span>
      </div>

      <div class="social-stat">
        <strong id="likeCount">0</strong>
        <span>いいね</span>
      </div>

      <div class="social-stat">
        <strong id="giftCount">0</strong>
        <span>ギフト</span>
      </div>

    </div>

    <div class="social-actions">

      <button
        id="likeButton"
        class="social-button social-like"
      >
        ❤️ いいね
      </button>

      <button
        id="giftButton"
        class="social-button social-gift"
      >
        🎁 ギフト
      </button>

      <button
        id="blockButton"
        class="social-button social-block"
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
          data-gift="rose"
          data-coins="10"
        >
          <span class="icon">🌹</span>
          <span class="name">バラ</span>
          <span class="coins">10コイン</span>
        </button>

        <button
          class="gift-item"
          data-gift="heart"
          data-coins="50"
        >
          <span class="icon">❤️</span>
          <span class="name">ハート</span>
          <span class="coins">50コイン</span>
        </button>

        <button
          class="gift-item"
          data-gift="star"
          data-coins="100"
        >
          <span class="icon">⭐</span>
          <span class="name">スター</span>
          <span class="coins">100コイン</span>
        </button>

        <button
          class="gift-item"
          data-gift="present"
          data-coins="500"
        >
          <span class="icon">🎁</span>
          <span class="name">プレゼント</span>
          <span class="coins">500コイン</span>
        </button>

      </div>

    </div>

    <div class="comment-box">

      <div
        id="commentList"
        class="comment-list"
      ></div>

      <form
        id="commentForm"
        class="comment-form"
      >

        <input
          id="commentInput"
          class="comment-input"
          type="text"
          maxlength="200"
          placeholder="コメントを入力"
        >

        <button
          class="comment-send"
          type="submit"
        >
          送信
        </button>

      </form>

    </div>

  </div>

  <button
    id="enableAudioButton"
    class="panel-button audio-on-button"
  >
    🔊 音声を有効にする
  </button>

  <button
    id="stopLiveButton"
    class="panel-button stop-button"
    style="display:none"
  >
    ⏹ 配信を終了
  </button>

  <button
    id="closeLiveButton"
    class="panel-button close-button"
  >
    閉じる
  </button>

</section>

<!-- ===================================================
     MODAL
=================================================== -->

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
      確認してください。
    </div>

    <div class="modal-buttons">

      <button
        id="modalCancel"
        class="modal-button modal-cancel"
      >
        キャンセル
      </button>

      <button
        id="modalOk"
        class="modal-button modal-ok"
      >
        OK
      </button>

    </div>

  </div>

</div>

<div
  id="toast"
  class="toast"
></div>

<!-- ===================================================
     BOTTOM NAV
=================================================== -->

<nav class="bottom-nav">

  <button
    class="nav-item active"
    data-page="home"
  >

    <span class="nav-icon">🏠</span>

    <span class="nav-label">
      ホーム
    </span>

  </button>

  <button
    class="nav-item"
    data-page="search"
  >

    <span class="nav-icon">🔍</span>

    <span class="nav-label">
      探す
    </span>

  </button>

  <button
    class="nav-item"
    data-page="live"
  >

    <span class="nav-icon">🎙️</span>

    <span class="nav-label">
      配信
    </span>

  </button>

  <button
    class="nav-item"
    data-page="notice"
  >

    <span class="nav-icon">🔔</span>

    <span class="nav-label">
      お知らせ
    </span>

  </button>

  <button
    class="nav-item"
    data-page="mypage"
  >

    <span class="nav-icon">👤</span>

    <span class="nav-label">
      マイページ
    </span>

  </button>

</nav>

</div>

.nav-item {
  border: 0;

  background: transparent;

  color: #697496;

  font-size: 10px;

  display: flex;

  flex-direction: column;
            }
        }
      }
    );
  }
);


/* =====================================================
   JOIN LIVE
===================================================== */

wss.clients.forEach(
  function(client) {

    if (
      client.readyState ===
      WebSocket.OPEN
    ) {

      client.send(
        JSON.stringify({

          type:
            "live_list",

          lives:
            getLiveList()

        })
      );

    }

  }
);


/* =====================================================
   LIVE LIST UPDATE
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

      likes:
        liveInfo.likes,

      comments:
        liveInfo.comments,

      gifts:
        liveInfo.gifts,

      viewers:
        liveInfo.viewers,

      startedAt:
        liveInfo.startedAt

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
    !ws ||
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

  const message =
    JSON.stringify({

      type:
        "live_list",

      lives:
        getLiveList()

    });


  wss.clients.forEach(
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


/* =====================================================
   VIEWER COUNT
===================================================== */

function updateViewerCount() {

  if (
    !liveInfo.active
  ) {

    return;

  }


  let count =
    0;


  wss.clients.forEach(
    function(client) {

      if (
        client.joinedLive &&
        client !== broadcaster
      ) {

        count++;

      }

    }
  );


  liveInfo.viewers =
    count;


  if (
    broadcaster &&
    broadcaster.readyState ===
      WebSocket.OPEN
  ) {

    broadcaster.send(
      JSON.stringify({

        type:
          "viewer_count",

        viewers:
          count

      })
    );

  }


  broadcastLiveList();

}


/* =====================================================
   STOP LIVE SERVER
===================================================== */

function stopLiveServer() {

  if (
    broadcaster
  ) {

    broadcaster.isBroadcaster =
      false;

  }


  wss.clients.forEach(
    function(client) {

      client.joinedLive =
        false;

      if (
        client.readyState ===
        WebSocket.OPEN
      ) {

        client.send(
          JSON.stringify({

            type:
              "live_ended"

          })
        );

      }

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


  broadcaster =
    null;


  broadcastLiveList();

}


/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "VoiceボタLive server started"
    );

    console.log(
      "PORT:",
      PORT
    );

  }
);
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
