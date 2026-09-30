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
  description: "",
  themeColor: "#3156ff",
  avatar: "🎙️",
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

button,
input,
textarea,
select {
  font: inherit;
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

  background: rgba(3,5,16,.9);

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

  overflow: hidden;

  background: #030510;
}

.hero-image-wrap {
  position: relative;

  width: 100%;

  overflow: hidden;
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

.live-name,
.live-title,
.live-desc {
  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.live-name {
  font-size: 14px;

  font-weight: 900;
}

.live-title {
  margin-top: 5px;

  color: #aab4d5;

  font-size: 12px;
}

.live-desc {
  margin-top: 4px;

  color: #7683a7;

  font-size: 10px;
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
   LIVE PANEL
===================================================== */

.live-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 2000;

  background:
    rgba(2,4,15,.98);

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
   CUSTOM SETTINGS
===================================================== */

.custom-settings {
  margin-top: 15px;

  padding: 15px;

  border-radius: 20px;

  background:
    rgba(12,17,45,.96);

  border:
    1px solid rgba(120,140,255,.16);
}

.custom-settings-title {
  font-size: 15px;

  font-weight: 900;

  margin-bottom: 12px;
}

.custom-label {
  display: block;

  margin:
    10px
    0
    6px;

  font-size: 11px;

  color: #aeb9d8;
}

.custom-input,
.custom-textarea {
  width: 100%;

  border:
    1px solid rgba(130,150,255,.2);

  border-radius: 12px;

  background:
    rgba(4,7,20,.9);

  color: white;

  padding: 11px;

  outline: none;
}

.custom-textarea {
  min-height: 75px;

  resize: vertical;
}

.custom-color-row {
  display: flex;

  align-items: center;

  gap: 10px;
}

.custom-color {
  width: 54px;

  height: 42px;

  padding: 2px;

  border: 0;

  border-radius: 10px;

  background: transparent;
}

.custom-preview {
  margin-top: 12px;

  min-height: 120px;

  padding: 15px;

  border-radius: 17px;

  background:
    linear-gradient(
      145deg,
      #3156ff,
      #10162f
    );

  border:
    1px solid rgba(255,255,255,.12);

  overflow: hidden;
}

.custom-preview-live {
  display: inline-block;

  padding: 4px 8px;

  border-radius: 999px;

  font-size: 9px;

  font-weight: 900;

  background: #ff3b69;
}

.custom-preview-title {
  margin-top: 10px;

  font-size: 18px;

  font-weight: 900;
}

.custom-preview-description {
  margin-top: 5px;

  color: #d7def6;

  font-size: 11px;

  line-height: 1.5;
}


/* =====================================================
   AUDIO
===================================================== */

.audio-status {
  margin-top: 15px;

  padding:
    30px
    20px;

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


/* =====================================================
   BUTTONS
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
    1px solid rgba(130,150,255,.25);
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
}

.nav-icon {
  font-size: 20px;

  line-height: 1;
}

.nav-item.active {
  color: #bcd2ff;
}

.nav-live {
  width: 50px;
  height: 50px;

  margin-top: -20px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 24px;

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
}


/* =====================================================
   DESKTOP
===================================================== */

@media (min-width: 700px) {

  .hero-image-wrap {
    max-width: 1000px;

    margin-left: auto;
    margin-right: auto;
  }

  .hero-content,
  .section {
    max-width: 1000px;

    margin-left: auto;
    margin-right: auto;
  }

  .hero-content {
    padding-left: 35px;
    padding-right: 35px;
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


<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


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
      現在配信中のライブはありません
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
        高音質の音声配信
      </div>

      <div class="feature-text">
        クリアな声で、もっと近くに。
      </div>

    </div>

    <div class="feature">

      <div class="feature-icon">
        ⚡
      </div>

      <div class="feature-title">
        低遅延でリアルタイム
      </div>

      <div class="feature-text">
        今この瞬間を、一緒に。
      </div>

    </div>

    <div class="feature">

      <div class="feature-icon">
        🎨
      </div>

      <div class="feature-title">
        配信画面カスタム
      </div>

      <div class="feature-text">
        タイトル・説明・カラーを自由に。
      </div>

    </div>

    <div class="feature">

      <div class="feature-icon">
        👥
      </div>

      <div class="feature-title">
        みんなで楽しめる
      </div>

      <div class="feature-text">
        好きな声でつながる場所。
      </div>

    </div>

  </div>

</section>


<div
  class="live-panel"
  id="livePanel"
>

  <div class="panel-header">

    <div
      class="panel-title"
      id="panelTitle"
    >
      VoiceポタLive
    </div>

    <div class="panel-live">
      LIVE
    </div>

  </div>


  <div
    class="panel-status"
    id="panelStatus"
  >
    接続準備中...
  </div>


  <!-- 配信カスタム -->

  <div
    class="custom-settings"
    id="customSettings"
  >

    <div class="custom-settings-title">
      🎨 配信画面カスタム
    </div>


    <label class="custom-label">
      配信者名
    </label>

    <input
      id="customName"
      class="custom-input"
      maxlength="30"
      value="ぼたもち"
      placeholder="配信者名"
    >


    <label class="custom-label">
      配信タイトル
    </label>

    <input
      id="customTitle"
      class="custom-input"
      maxlength="50"
      value="VoiceポタLive 配信中"
      placeholder="配信タイトル"
    >


    <label class="custom-label">
      配信説明
    </label>

    <textarea
      id="customDescription"
      class="custom-textarea"
      maxlength="160"
      placeholder="配信内容を入力してください"
    ></textarea>


    <label class="custom-label">
      配信画面カラー
    </label>

    <div class="custom-color-row">

      <input
        id="customColor"
        class="custom-color"
        type="color"
        value="#3156ff"
      >

      <span id="customColorText">
        #3156ff
      </span>

    </div>


    <div
      class="custom-preview"
      id="customPreview"
    >

      <span class="custom-preview-live">
        LIVE
      </span>

      <div
        class="custom-preview-title"
        id="customPreviewTitle"
      >
        VoiceポタLive 配信中
      </div>

      <div
        class="custom-preview-description"
        id="customPreviewDescription"
      >
        配信説明がここに表示されます。
      </div>

    </div>

  </div>


  <div class="audio-status">

    <div class="audio-icon">
      🎙️
    </div>

    <div id="audioText">
      音声接続
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


  <button
    class="panel-button audio-on-button"
    id="audioOnButton"
    onclick="enableAudio()"
    style="display:none"
  >
    🔊 音声をONにする
  </button>


  <button
    class="panel-button stop-button"
    id="stopLiveButton"
    onclick="stopLive()"
    style="display:none"
  >
    ⛔ 配信を終了
  </button>


  <button
    class="panel-button close-button"
    onclick="closePanel()"
  >
    閉じる
  </button>

</div>


<nav class="bottom-nav">

  <button
    class="nav-item active"
    onclick="goHome()"
  >

    <div class="nav-icon">
      ⌂
    </div>

    ホーム

  </button>


  <button
    class="nav-item"
    onclick="scrollLive()"
  >

    <div class="nav-icon">
      ⌕
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


<script>

let socket = null;

let myId =
  "client_" +
  Math.random()
    .toString(36)
    .substring(2);

let isBroadcaster = false;

let localStream = null;

let peerConnections = {};

let currentLiveId = null;

let currentBroadcasterId = null;

let liveCatalog = {};


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

  ]

};


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


  socket.onopen =
    function() {

      sendMessage({

        type:
          "hello",

        clientId:
          myId

      });

    };


  socket.onmessage =
    function(event) {

      try {

        handleMessage(
          JSON.parse(
            event.data
          )
        );

      } catch (error) {

        console.log(
          "message error",
          error
        );

      }

    };


  socket.onclose =
    function() {

      setTimeout(
        connectSocket,
        2000
      );

    };


  socket.onerror =
    function(error) {

      console.log(
        "WebSocket error",
        error
      );

    };

}


/* =====================================================
   SEND
===================================================== */

function sendMessage(data) {

  if (
    socket &&
    socket.readyState ===
      WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

  }

}


/* =====================================================
   MESSAGE
===================================================== */

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

    receiveOffer(data);

    return;
  }


  if (
    data.type ===
    "answer"
  ) {

    receiveAnswer(data);

    return;
  }


  if (
    data.type ===
    "ice_candidate"
  ) {

    receiveIceCandidate(data);

    return;
  }


  if (
    data.type ===
    "live_unavailable"
  ) {

    setPanelStatus(
      "このライブは終了しています"
    );

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

    stopLocalStream();

    isBroadcaster = false;

    return;
  }


  if (
    data.type ===
    "live_stopped"
  ) {

    renderLiveList([]);

    if (!isBroadcaster) {

      setPanelStatus(
        "配信が終了しました"
      );

      document.getElementById(
        "audioText"
      ).textContent =
        "ライブ終了";

      closePeerConnections();

    }

    return;
  }


  if (
    data.type ===
    "viewer_left"
  ) {

    const pc =
      peerConnections[
        data.viewerId
      ];

    if (pc) {

      pc.close();

      delete peerConnections[
        data.viewerId
      ];

    }

  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function renderLiveList(lives) {

  liveCatalog = {};

  (
    lives || []
  ).forEach(
    function(live) {

      liveCatalog[
        live.id
      ] = live;

    }
  );


  const list =
    document.getElementById(
      "liveList"
    );


  if (!lives.length) {

    list.innerHTML =
      "<div class='empty'>" +
      "現在配信中のライブはありません" +
      "</div>";

    return;
  }


  list.innerHTML =
    lives.map(
      function(live) {

        return (
          "<div " +
          "class=\"live-card\" " +
          "onclick=\"listenLive('" +
          escapeHtml(live.id) +
          "')\">" +

          "<div class=\"live-avatar\">" +
          escapeHtml(
            live.avatar ||
            "🎙️"
          ) +
          "</div>" +

          "<div class=\"live-info\">" +

          "<div class=\"live-name\">" +
          escapeHtml(
            live.name ||
            "Voice配信者"
          ) +
          "</div>" +

          "<div class=\"live-title\">" +
          escapeHtml(
            live.title ||
            "音声ライブ配信中"
          ) +
          "</div>" +

          "<div class=\"live-desc\">" +
          escapeHtml(
            live.description ||
            ""
          ) +
          "</div>" +

          "<span class=\"live-badge\">" +
          "LIVE" +
          "</span>" +

          "</div>" +

          "</div>"
        );

      }
    ).join("");

}


/* =====================================================
   CUSTOM PREVIEW
===================================================== */

function updateCustomPreview() {

  const title =
    document.getElementById(
      "customTitle"
    ).value.trim()
    ||
    "VoiceポタLive 配信中";


  const description =
    document.getElementById(
      "customDescription"
    ).value.trim()
    ||
    "配信説明がここに表示されます。";


  const color =
    document.getElementById(
      "customColor"
    ).value
    ||
    "#3156ff";


  document.getElementById(
    "customPreviewTitle"
  ).textContent =
    title;


  document.getElementById(
    "customPreviewDescription"
  ).textContent =
    description;


  document.getElementById(
    "customColorText"
  ).textContent =
    color;


  document.getElementById(
    "customPreview"
  ).style.background =
    "linear-gradient(145deg," +
    color +
    ",#10162f)";

}


function getCustomLiveData() {

  return {

    name:
      document.getElementById(
        "customName"
      ).value.trim()
      ||
      "Voice配信者",

    title:
      document.getElementById(
        "customTitle"
      ).value.trim()
      ||
      "VoiceポタLive 配信中",

    description:
      document.getElementById(
        "customDescription"
      ).value.trim(),

    themeColor:
      document.getElementById(
        "customColor"
      ).value
      ||
      "#3156ff",

    avatar:
      "🎙️"

  };

}


function applyLiveCustomData(data) {

  document.getElementById(
    "panelTitle"
  ).textContent =
    data.title ||
    "音声ライブ配信中";


  setPanelStatus(

    data.name

      ? "🎙️ " +
        data.name +
        " のライブ"

      : "🔊 ライブ音声を受信中"

  );


  if (
    data.description
  ) {

    document.getElementById(
      "audioText"
    ).textContent =
      data.description;

  }

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


  updateCustomPreview();


  const custom =
    getCustomLiveData();


  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: {

            echoCancellation: true,

            noiseSuppression: true,

            autoGainControl: true,

            channelCount: 1,

            sampleRate: 48000

          },

          video: false

        });

  } catch (error) {

    console.error(
      error
    );

    alert(
      "マイクを使用できませんでした。\n\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    return;

  }


  isBroadcaster = true;


  openPanel();


  applyLiveCustomData(
    custom
  );


  document.getElementById(
    "customSettings"
  ).style.display =
    "block";


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


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
      custom.name,

    title:
      custom.title,

    description:
      custom.description,

    themeColor:
      custom.themeColor,

    avatar:
      custom.avatar

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


  stopLocalStream();


  isBroadcaster = false;


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";


  document.getElementById(
    "customSettings"
  ).style.display =
    "block";


  setPanelStatus(
    "配信を終了しました"
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "配信終了";

}


/* =====================================================
   STOP LOCAL STREAM
===================================================== */

function stopLocalStream() {

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        function(track) {

          track.stop();

        }
      );

    localStream =
      null;

  }

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


  const selected =
    liveCatalog[id];


  openPanel();


  document.getElementById(
    "customSettings"
  ).style.display =
    "none";


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


  if (selected) {

    applyLiveCustomData(
      selected
    );

  }


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
   RECEIVE OFFER
===================================================== */

async function receiveOffer(
  data
) {

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
          function() {

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
   ANSWER
===================================================== */

async function receiveAnswer(
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
    1;


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

      }
    )
    .catch(
      function(error) {

        console.error(
          error
        );

      }
    );

}


/* =====================================================
   CLOSE PEERS
===================================================== */

function closePeerConnections() {

  Object.values(
    peerConnections
  ).forEach(
    function(pc) {

      try {

        pc.close();

      } catch (error) {}

    }
  );


  peerConnections =
    {};

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
   NAV
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


function goHome() {

  window.scrollTo({

    top: 0,

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
   CUSTOM INPUT
===================================================== */

[
  "customName",
  "customTitle",
  "customDescription",
  "customColor"
].forEach(
  function(id) {

    const element =
      document.getElementById(
        id
      );


    if (element) {

      element.addEventListener(
        "input",
        updateCustomPreview
      );

    }

  }
);


updateCustomPreview();


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

            status:
              "ok",

            live:
              liveInfo.active

          })
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
   WEBSOCKET
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

        } catch (error) {

          console.log(
            "Invalid JSON"
          );

          return;

        }


        /* HELLO */

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


        /* START LIVE */

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
              data.name ||
              "Voice配信者",

            title:
              data.title ||
              "音声ライブ配信中",

            description:
              data.description ||
              "",

            themeColor:
              data.themeColor ||
              "#3156ff",

            avatar:
              data.avatar ||
              "🎙️",

            startedAt:
              Date.now()

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


        /* STOP LIVE */

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


        /* JOIN LIVE */

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


          return;

        }


        /* SIGNALING */

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

        clients.delete(ws);


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

    description:
      "",

    themeColor:
      "#3156ff",

    avatar:
      "🎙️",

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

      description:
        liveInfo.description,

      themeColor:
        liveInfo.themeColor,

      avatar:
        liveInfo.avatar,

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
