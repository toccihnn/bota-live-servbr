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
  startedAt: null
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

/* =====================================================
   CUSTOM INPUT
===================================================== */

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

  border:
    1px solid
    rgba(120,140,255,.25);

  background: #080d22;

  color: #fff;

  outline: none;

  font-size: 14px;
}

.custom-input:focus {
  border-color: #72cfff;

  box-shadow:
    0 0 0 2px
    rgba(114,207,255,.12);
}

.custom-title-preview {
  margin-top: 10px;

  padding: 10px 12px;

  border-radius: 12px;

  background:
    rgba(20,28,70,.7);

  color: #d7e3ff;

  font-size: 12px;
}

/* =====================================================
   STATUS
===================================================== */

.panel-status {
  margin-top: 15px;

  padding: 14px;

  border-radius: 15px;

  background:
    rgba(20,28,70,.9);

  color: #bcd2ff;

  font-size: 13px;
}

/* =====================================================
   AUDIO
===================================================== */

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
    1px solid
    rgba(120,140,255,.15);
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

  0%,
  100% {
    height: 10px;
  }

  50% {
    height: 32px;
  }

}

#remoteAudio {
  display: none;
}

/* =====================================================
   BUTTON
===================================================== */

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
    1px solid
    rgba(130,150,255,.25);
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
    1px solid
    rgba(120,140,255,.12);
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
    1px solid
    rgba(120,140,255,.12);
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

  line-height: 1;
}

.nav-live {
  width: 54px;
  height: 54px;

  margin-top: -22px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 25px;

  background:
    linear-gradient(
      145deg,
      #39d9ff,
      #5467ff,
      #be4cff
    );

  border:
    3px solid
    #080b20;

  box-shadow:
    0 0 28px
    rgba(80,110,255,.7);
}

/* =====================================================
   RESPONSIVE
===================================================== */

@media (min-width:700px) {

  .hero-image-wrap,
  .hero-content,
  .section {
    max-width: 1000px;

    margin-left: auto;
    margin-right: auto;
  }

  .features {
    grid-template-columns:
      repeat(4,1fr);
  }

}

</style>

</head>

<body>

<div class="app">

<!-- =====================================================
     HEADER
===================================================== -->

<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


<!-- =====================================================
     HERO
===================================================== -->

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

      月明かりの下で、話して、聴いて、笑って。<br>

      VoiceポタLiveで、あなたの声をもっと近くに。

    </div>

  </div>

</section>


<!-- =====================================================
     LIVE
===================================================== -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🔴 ライブ中
    </div>

    <div class="section-sub">
      REAL TIME
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


  <h2 style="margin-top:30px;">
    VoiceポタLive
  </h2>


  <div class="features">

    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <div class="feature-title">
        音声ライブ
      </div>

      <div class="feature-text">
        声だけで気軽にライブ配信。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        ⚡
      </div>

      <div class="feature-title">
        リアルタイム
      </div>

      <div class="feature-text">
        配信者とリスナーをつなぎます。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        💬
      </div>

      <div class="feature-title">
        みんなの居場所
      </div>

      <div class="feature-text">
        話して、聴いて、笑える場所。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        🌙
      </div>

      <div class="feature-title">
        夜の音声配信
      </div>

      <div class="feature-text">
        いつでも声でつながれます。
      </div>

    </div>

  </div>

</section>

</div>


<!-- =====================================================
     配信画面
===================================================== -->

<div
  id="livePanel"
  class="live-panel"
>

  <div class="panel-header">

    <div class="panel-title">
      🎙️ 配信設定
    </div>

    <div
      id="panelLiveBadge"
      class="panel-live"
      style="display:none;"
    >
      🔴 LIVE
    </div>

  </div>


  <!-- 配信者名 -->

  <div class="custom-field">

    <label
      class="custom-label"
      for="liveNameInput"
    >
      配信者名
    </label>

    <input
      id="liveNameInput"
      class="custom-input"
      type="text"
      maxlength="30"
      value="ぼたもち"
      placeholder="配信者名を入力"
    >

  </div>


  <!-- 配信タイトル -->

  <div class="custom-field">

    <label
      class="custom-label"
      for="liveTitleInput"
    >
      配信タイトル
    </label>

    <input
      id="liveTitleInput"
      class="custom-input"
      type="text"
      maxlength="60"
      value="VoiceポタLive 配信中"
      placeholder="配信タイトルを入力"
    >

    <div
      id="titlePreview"
      class="custom-title-preview"
    >
      タイトル：
      VoiceポタLive 配信中
    </div>

  </div>


  <!-- ステータス -->

  <div
    id="panelStatus"
    class="panel-status"
  >
    🎙️ 配信タイトルを決めてから配信を開始できます。
  </div>


  <!-- 音声状態 -->

  <div
    id="audioStatus"
    class="audio-status"
  >

    <div class="audio-icon">
      🎙️
    </div>

    <div id="audioStatusText">
      配信準備中
    </div>

    <div
      id="audioWave"
      class="audio-wave"
      style="display:none;"
    >

      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>

    </div>

  </div>


  <!-- 配信開始 -->

  <button
    id="startButton"
    type="button"
    class="panel-button audio-on-button"
    onclick="startLive()"
  >
    🎙️ マイクを許可して配信開始
  </button>


  <!-- 配信終了 -->

  <button
    id="stopButton"
    type="button"
    class="panel-button stop-button"
    style="display:none;"
    onclick="stopLive()"
  >
    ⏹ 配信を終了する
  </button>


  <!-- 閉じる -->

  <button
    id="closeButton"
    type="button"
    class="panel-button close-button"
    onclick="closeLivePanel()"
  >
    閉じる
  </button>

</div>


<!-- =====================================================
     AUDIO
===================================================== -->

<audio
  id="remoteAudio"
  autoplay
  playsinline
></audio>


<!-- =====================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    type="button"
    class="nav-item"
    onclick="homeAction()"
  >

    <div class="nav-icon">
      ⌂
    </div>

    <div>
      ホーム
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="searchAction()"
  >

    <div class="nav-icon">
      ⌕
    </div>

    <div>
      探す
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="openLivePanel()"
  >

    <div class="nav-live">
      🎙️
    </div>

    <div>
      配信
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="alert('お知らせは準備中です')"
  >

    <div class="nav-icon">
      ♧
    </div>

    <div>
      お知らせ
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="alert('マイページは準備中です')"
  >

    <div class="nav-icon">
      ♙
    </div>

    <div>
      マイページ
    </div>

  </button>

</nav>


<script>

(function() {

"use strict";


/* =====================================================
   VARIABLES
===================================================== */

var ws = null;

var clientId =
  "client_" +
  Math.random()
    .toString(36)
    .substring(2) +
  Date.now();

var localStream = null;

var isBroadcaster = false;

var viewerPeer = null;

var viewerPeers = {};

var pendingIce = [];

var liveConnected = false;

var reconnectTimer = null;


/* =====================================================
   STUN
===================================================== */

var iceServers = [

  {
    urls:
      "stun:stun.l.google.com:19302"
  },

  {
    urls:
      "stun:stun1.l.google.com:19302"
  }

];


/* =====================================================
   ELEMENT
===================================================== */

function el(id) {

  return document.getElementById(id);

}


/* =====================================================
   TOAST
===================================================== */

function toast(message) {

  var old =
    document.getElementById(
      "voiceToast"
    );


  if (old) {
    old.remove();
  }


  var box =
    document.createElement(
      "div"
    );


  box.id =
    "voiceToast";


  box.textContent =
    message;


  box.style.position =
    "fixed";

  box.style.left =
    "50%";

  box.style.bottom =
    "95px";

  box.style.transform =
    "translateX(-50%)";

  box.style.zIndex =
    "5000";

  box.style.padding =
    "12px 18px";

  box.style.borderRadius =
    "14px";

  box.style.background =
    "#111a3a";

  box.style.color =
    "#fff";

  box.style.border =
    "1px solid rgba(130,150,255,.35)";

  box.style.fontSize =
    "13px";

  box.style.fontWeight =
    "800";

  document.body.appendChild(
    box
  );


  setTimeout(
    function() {

      if (box) {
        box.remove();
      }

    },
    2200
  );

}


/* =====================================================
   STATUS
===================================================== */

function setStatus(message) {

  el(
    "panelStatus"
  ).textContent =
    message;

}


/* =====================================================
   TITLE PREVIEW
===================================================== */

function updateTitlePreview() {

  var input =
    el(
      "liveTitleInput"
    );


  var value =
    input.value.trim();


  if (!value) {

    value =
      "タイトル未設定";

  }


  el(
    "titlePreview"
  ).textContent =
    "タイトル：" +
    value;

}


/* =====================================================
   OPEN LIVE PANEL
===================================================== */

window.openLivePanel =
  function() {

    el(
      "livePanel"
    ).classList.add(
      "show"
    );


    if (isBroadcaster) {

      setStatus(
        "🔴 現在配信中です"
      );

    }

    else {

      setStatus(
        "🎙️ 配信タイトルを決めてから配信を開始できます。"
      );

    }

  };


/* =====================================================
   CLOSE LIVE PANEL
===================================================== */

window.closeLivePanel =
  function() {

    if (isBroadcaster) {

      alert(
        "配信中は先に配信を終了してください。"
      );

      return;

    }


    el(
      "livePanel"
    ).classList.remove(
      "show"
    );

  };


/* =====================================================
   HOME
===================================================== */

window.homeAction =
  function() {

    window.scrollTo(
      {
        top: 0,
        behavior: "smooth"
      }
    );

  };


/* =====================================================
   SEARCH
===================================================== */

window.searchAction =
  function() {

    document
      .querySelector(
        ".section"
      )
      .scrollIntoView(
        {
          behavior: "smooth"
        }
      );

  };


/* =====================================================
   CONNECT WEBSOCKET
===================================================== */

function connectWebSocket() {

  var protocol =
    location.protocol === "https:"
      ? "wss://"
      : "ws://";


  try {

    ws =
      new WebSocket(
        protocol +
        location.host
      );

  }

  catch (error) {

    setTimeout(
      connectWebSocket,
      3000
    );

    return;

  }


  ws.onopen =
    function() {

      liveConnected =
        true;


      ws.send(
        JSON.stringify(
          {
            type:
              "hello",

            clientId:
              clientId
          }
        )
      );


      ws.send(
        JSON.stringify(
          {
            type:
              "get_live_list"
          }
        )
      );

    };


  ws.onmessage =
    function(event) {

      var data;

      try {

        data =
          JSON.parse(
            event.data
          );

      }

      catch (error) {

        return;

      }


      handleServerMessage(
        data
      );

    };


  ws.onclose =
    function() {

      liveConnected =
        false;


      clearTimeout(
        reconnectTimer
      );


      reconnectTimer =
        setTimeout(
          connectWebSocket,
          3000
        );

    };


  ws.onerror =
    function() {

      liveConnected =
        false;

    };

}


/* =====================================================
   SEND
===================================================== */

function send(data) {

  if (
    !ws ||
    ws.readyState !==
      WebSocket.OPEN
  ) {

    toast(
      "サーバーに接続中です…"
    );

    return false;

  }


  ws.send(
    JSON.stringify(
      data
    )
  );


  return true;

}


/* =====================================================
   START LIVE
===================================================== */

window.startLive =
  async function() {

    toast(
      "🎙️ 配信ボタンが反応しました"
    );


    var name =
      el(
        "liveNameInput"
      )
      .value
      .trim();


    var title =
      el(
        "liveTitleInput"
      )
      .value
      .trim();


    if (!name) {

      alert(
        "配信者名を入力してください"
      );

      return;

    }


    if (!title) {

      alert(
        "配信タイトルを入力してください"
      );

      el(
        "liveTitleInput"
      ).focus();

      return;

    }


    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      alert(
        "このブラウザではマイクを使用できません。HTTPSで開いてください。"
      );

      return;

    }


    setStatus(
      "🎙️ マイクの許可を確認しています…"
    );


    toast(
      "マイクの許可を押してください"
    );


    try {

      localStream =
        await navigator
          .mediaDevices
          .getUserMedia(
            {
              audio:
                {
                  echoCancellation:
                    true,

                  noiseSuppression:
                    true,

                  autoGainControl:
                    true
                },

              video:
                false
            }
          );

    }

    catch (error) {

      console.log(
        "Microphone error:",
        error
      );


      setStatus(
        "❌ マイクを使用できませんでした。"
      );


      alert(
        "マイクの使用を許可してください。"
      );


      return;

    }


    isBroadcaster =
      true;


    setStatus(
      "🔴 配信を開始しています…"
    );


    el(
      "startButton"
    ).style.display =
    "none";


    el(
      "stopButton"
    ).style.display =
    "block";


    el(
      "closeButton"
    ).style.display =
    "none";


    el(
      "panelLiveBadge"
    ).style.display =
    "block";


    el(
      "audioStatusText"
    ).textContent =
    "🔴 配信中：" +
    title;


    el(
      "audioWave"
    ).style.display =
    "flex";


    var success =
      send(
        {
          type:
            "start_live",

          clientId:
            clientId,

          name:
            name,

          title:
            title
        }
      );


    if (!success) {

      setStatus(
        "サーバーへの接続を待っています…"
      );

    }

  };


/* =====================================================
   STOP LIVE
===================================================== */

window.stopLive =
  function() {

    if (
      isBroadcaster
    ) {

      send(
        {
          type:
            "stop_live",

          clientId:
            clientId
        }
      );

    }


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


    closeAllPeerConnections();


    el(
      "startButton"
    ).style.display =
    "block";


    el(
      "stopButton"
    ).style.display =
    "none";


    el(
      "closeButton"
    ).style.display =
    "block";


    el(
      "panelLiveBadge"
    ).style.display =
    "none";


    el(
      "audioWave"
    ).style.display =
    "none";


    el(
      "audioStatusText"
    ).textContent =
    "配信終了";


    setStatus(
      "配信を終了しました。"
    );


    toast(
      "配信を終了しました"
    );

  };


/* =====================================================
   RENDER LIVE LIST
===================================================== */

function renderLiveList(lives) {

  var list =
    el(
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


  var html =
    "";


  lives.forEach(
    function(live) {

      html +=
        "<div " +
        "class='live-card' " +
        "data-live-id='" +
        escapeHtml(
          live.id
        ) +
        "'>";


      html +=
        "<div class='live-avatar'>" +
        "🎙️" +
        "</div>";


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
        "<span class='live-badge'>" +
        "LIVE" +
        "</span>";


      html +=
        "</div>";


      html +=
        "</div>";

    }
  );


  list.innerHTML =
    html;


  var cards =
    list.querySelectorAll(
      ".live-card"
    );


  for (
    var i = 0;
    i < cards.length;
    i++
  ) {

    cards[i].addEventListener(
      "click",

      function() {

        var id =
          this.getAttribute(
            "data-live-id"
          );


        listenLive(
          id
        );

      }
    );

  }

}


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(value) {

  return String(
    value == null
      ? ""
      : value
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
   VIEW LIVE
===================================================== */

function listenLive(
  liveId
) {

  if (
    isBroadcaster
  ) {

    alert(
      "配信中は別のライブを視聴できません。"
    );

    return;

  }


  el(
    "livePanel"
  ).classList.add(
    "show"
  );


  el(
    "startButton"
  ).style.display =
  "none";


  el(
    "stopButton"
  ).style.display =
  "none";


  el(
    "closeButton"
  ).style.display =
  "block";


  setStatus(
    "🎧 配信へ接続しています…"
  );


  send(
    {
      type:
        "join_live",

      clientId:
        clientId,

      liveId:
        liveId
    }
  );

}


/* =====================================================
   SERVER MESSAGE
===================================================== */

function handleServerMessage(
  data
) {

  if (
    data.type ===
    "live_list"
  ) {

    renderLiveList(
      data.lives ||
      []
    );

    return;

  }


  if (
    data.type ===
    "live_started"
  ) {

    renderLiveList(
      data.lives ||
      []
    );


    if (
      isBroadcaster
    ) {

      setStatus(
        "🔴 配信中です"
      );

    }

    return;

  }


  if (
    data.type ===
    "live_start_failed"
  ) {

    alert(
      data.reason ||
      "配信を開始できませんでした"
    );


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


    el(
      "startButton"
    ).style.display =
    "block";


    el(
      "stopButton"
    ).style.display =
    "none";


    return;

  }


  if (
    data.type ===
    "live_stopped"
  ) {

    renderLiveList(
      []
    );


    if (
      !isBroadcaster
    ) {

      setStatus(
        "配信が終了しました"
      );

      closeAllPeerConnections();

    }

    return;

  }


  if (
    data.type ===
    "viewer_joined"
  ) {

    createOfferForViewer(
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
    "ice_candidate"
  ) {

    receiveIceCandidate(
      data
    );

    return;

  }


  if (
    data.type ===
    "live_unavailable"
  ) {

    setStatus(
      "このライブは終了しています"
    );

    return;

  }


  if (
    data.type ===
    "viewer_left"
  ) {

    if (
      viewerPeers[
        data.viewerId
      ]
    ) {

      viewerPeers[
        data.viewerId
      ].close();


      delete viewerPeers[
        data.viewerId
      ];

    }

  }

}


/* =====================================================
   CREATE OFFER
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


  var pc =
    new RTCPeerConnection(
      {
        iceServers:
          iceServers
      }
    );


  viewerPeers[
    viewerId
  ] =
  pc;


  localStream
    .getTracks()
    .forEach(
      function(track) {

        pc.addTrack(
          track,
          localStream
        );

      }
    );


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send(
          {
            type:
              "ice_candidate",

            to:
              viewerId,

            from:
              clientId,

            candidate:
              event.candidate
          }
        );

      }

    };


  try {

    var offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    send(
      {
        type:
          "offer",

        to:
          viewerId,

        from:
          clientId,

        offer:
          offer
      }
    );

  }

  catch (error) {

    console.log(
      "Offer error:",
      error
    );

  }

}


/* =====================================================
   RECEIVE OFFER
===================================================== */

async function receiveOffer(
  data
) {

  if (
    isBroadcaster
  ) {

    return;

  }


  if (
    viewerPeer
  ) {

    viewerPeer.close();

  }


  viewerPeer =
    new RTCPeerConnection(
      {
        iceServers:
          iceServers
      }
    );


  viewerPeer.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send(
          {
            type:
              "ice_candidate",

            to:
              data.from,

            from:
              clientId,

            candidate:
              event.candidate
          }
        );

      }

    };


  viewerPeer.ontrack =
    function(event) {

      var audio =
        el(
          "remoteAudio"
        );


      if (
        event.streams &&
        event.streams[0]
      ) {

        audio.srcObject =
          event.streams[0];

      }


      audio
        .play()
        .then(
          function() {

            setStatus(
              "🔊 配信を聴いています"
            );

          }
        )
        .catch(
          function() {

            setStatus(
              "🔊 画面をタップすると音声を再生できます"
            );

          }
        );

    };


  try {

    await viewerPeer
      .setRemoteDescription(
        new RTCSessionDescription(
          data.offer
        )
      );


    var answer =
      await viewerPeer
        .createAnswer();


    await viewerPeer
      .setLocalDescription(
        answer
      );


    send(
      {
        type:
          "answer",

        to:
          data.from,

        from:
          clientId,

        answer:
          answer
      }
    );

  }

  catch (error) {

    console.log(
      "Viewer offer error:",
      error
    );

  }

}


/* =====================================================
   RECEIVE ANSWER
===================================================== */

async function receiveAnswer(
  data
) {

  var pc =
    viewerPeers[
      data.from
    ];


  if (!pc) {

    return;

  }


  try {

    await pc
      .setRemoteDescription(
        new RTCSessionDescription(
          data.answer
        )
      );

  }

  catch (error) {

    console.log(
      "Answer error:",
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

  try {

    var pc = null;


    if (
      isBroadcaster
    ) {

      pc =
        viewerPeers[
          data.from
        ];

    }

    else {

      pc =
        viewerPeer;

    }


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

  }

  catch (error) {

    console.log(
      "ICE error:",
      error
    );

  }

}


/* =====================================================
   CLOSE PEERS
===================================================== */

function closeAllPeerConnections() {

  if (viewerPeer) {

    viewerPeer.close();

    viewerPeer =
      null;

  }


  for (
    var id in viewerPeers
  ) {

    if (
      viewerPeers[id]
    ) {

      viewerPeers[id].close();

    }

  }


  viewerPeers =
    {};


  el(
    "remoteAudio"
  ).srcObject =
  null;

}


/* =====================================================
   INIT
===================================================== */

window.addEventListener(
  "load",

  function() {

    var titleInput =
      el(
        "liveTitleInput"
      );


    titleInput.addEventListener(
      "input",

      updateTitlePreview
    );


    updateTitlePreview();


    connectWebSocket();

  }

);

})();

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
            status: "ok",
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

    clients.add(ws);


    ws.clientId =
      "client_" +
      Math.random()
        .toString(36)
        .substring(2);


    ws.joinedLive =
      false;


    console.log(
      "WebSocket connected:",
      ws.clientId
    );


    sendLiveListTo(ws);


    ws.on(
      "message",

      function(message) {

        let data;


        try {

          data =
            JSON.parse(
              message.toString()
            );

        }

        catch (error) {

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
           GET LIVE LIST
        ============================================= */

        if (
          data.type ===
          "get_live_list"
        ) {

          sendLiveListTo(
            ws
          );

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
                60
              ),

            startedAt:
              Date.now()

          };


          ws.isBroadcaster =
            true;


          console.log(
            "LIVE START:",
            liveInfo.name,
            liveInfo.title
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


          console.log(
            "VIEWER JOIN:",
            ws.clientId
          );


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


    /* ===============================================
       CLOSE
    =============================================== */

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

        }


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

function relaySignaling(data) {

  if (
    !data.to
  ) {

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
      null

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
        liveInfo.startedAt

    }

  ];

}


/* =====================================================
   SEND LIVE LIST
===================================================== */

function sendLiveListTo(ws) {

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

function broadcast(data) {

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
