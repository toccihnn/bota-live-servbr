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
   LIVE DATA
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
  color: #fff;
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  height: 58px;

  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 18px;

  background: rgba(3,5,16,.92);

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
      #fff,
      #8bd8ff,
      #d08cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}

.online {
  display: flex;
  align-items: center;
  gap: 6px;

  font-size: 11px;

  color: #b5c1df;
}

.online-dot {
  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: #48ffad;

  box-shadow:
    0 0 12px #48ffad;
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
      rgba(3,5,16,.88) 20%,
      rgba(3,5,16,.15) 72%,
      transparent 100%
    );
}

.hero-top {
  position: absolute;

  top: 18px;
  left: 16px;
  right: 16px;

  z-index: 10;

  display: flex;
  justify-content: space-between;
}

.tag {
  display: inline-flex;
  align-items: center;

  padding: 7px 12px;

  border-radius: 999px;

  color: #e7edff;

  font-size: 11px;
  font-weight: 800;

  background:
    rgba(8,13,40,.68);

  border:
    1px solid rgba(130,150,255,.3);

  backdrop-filter: blur(10px);
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
      #fff,
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
   BUTTONS
===================================================== */

.buttons {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 10px;

  margin-top: 20px;
}

.main-button {
  height: 52px;

  border: 0;

  border-radius: 17px;

  color: white;

  font-size: 14px;
  font-weight: 900;

  cursor: pointer;

  transition:
    transform .12s ease,
    opacity .12s ease;
}

.main-button:active {
  transform: scale(.96);
}

.start-button {
  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff,
      #c34cff
    );

  box-shadow:
    0 8px 30px rgba(70,90,255,.35);
}

.listen-button {
  background:
    rgba(13,18,50,.9);

  border:
    1px solid rgba(120,145,255,.4);
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

  transition:
    transform .12s ease;
}

.live-card:active {
  transform: scale(.98);
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
    rgba(2,4,15,.97);

  backdrop-filter: blur(20px);

  padding:
    20px
    16px
    100px;

  overflow-y: auto;
}

.live-panel.show {
  display: block;
}

.panel-title {
  font-size: 22px;

  font-weight: 900;

  margin-top: 20px;
}

.panel-status {
  margin-top: 10px;

  padding: 13px;

  border-radius: 15px;

  background:
    rgba(20,28,70,.9);

  color: #bcd2ff;

  font-size: 13px;
}

.audio-status {
  margin-top: 15px;

  padding: 20px;

  text-align: center;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(35,45,110,.9),
      rgba(10,14,40,.95)
    );
}

.audio-icon {
  font-size: 55px;

  animation:
    pulse 1.2s infinite;
}

@keyframes pulse {

  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.08);
  }

  100% {
    transform: scale(1);
  }

}

.panel-button {
  width: 100%;

  height: 52px;

  margin-top: 12px;

  border: 0;

  border-radius: 16px;

  color: white;

  background:
    linear-gradient(
      100deg,
      #456cff,
      #c24cff
    );

  font-weight: 900;

  font-size: 14px;
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
   AUDIO BUTTON
===================================================== */

.audio-button {
  display: none;

  width: 100%;

  height: 52px;

  margin-top: 12px;

  border: 0;

  border-radius: 16px;

  color: #fff;

  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff
    );

  font-size: 14px;

  font-weight: 900;
}

.audio-button.show {
  display: block;
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
    rgba(4,7,20,.94);

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

  .hero-image-wrap,
  .hero-content {
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

  .section {
    max-width: 1000px;

    margin-left: auto;
    margin-right: auto;
  }

}

/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 500px) {

  .buttons {
    grid-template-columns: 1fr;
  }

  .main-button {
    height: 50px;
  }

  .hero-content {
    margin-top: -20px;
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

    オンライン

  </div>

</header>


<!-- =================================================
     HERO
================================================= -->

<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="VoiceボタLive"
    >

    <div class="hero-gradient"></div>

    <div class="hero-top">

      <div class="tag">
        🌙 月光花 × Voice
      </div>

      <div class="tag">
        LIVE
      </div>

    </div>

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

      VoiceボタLiveで、あなたの声をもっと近くに。

    </div>


    <div class="buttons">

      <button
        class="main-button start-button"
        onclick="startLive()"
      >
        🎙️ 配信をはじめる
      </button>

      <button
        class="main-button listen-button"
        onclick="scrollLive()"
      >
        🎧 ライブを聴いてみる
      </button>

    </div>

  </div>

</section>


<!-- =================================================
     LIVE
================================================= -->

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


<!-- =================================================
     FEATURES
================================================= -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      VoiceボタLive
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
        🎁
      </div>

      <div class="feature-title">
        投げ銭で応援
      </div>

      <div class="feature-text">
        あなたの応援が配信者の力に。
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


<!-- =================================================
     LIVE PANEL
================================================= -->

<div
  class="live-panel"
  id="livePanel"
>

  <div class="panel-title">
    VoiceボタLive
  </div>

  <div
    class="panel-status"
    id="panelStatus"
  >
    接続準備中...
  </div>

  <div class="audio-status">

    <div class="audio-icon">
      🎙️
    </div>

    <div id="audioText">
      音声接続
    </div>

  </div>

  <audio
    id="remoteAudio"
    autoplay
    playsinline
  ></audio>

  <button
    class="audio-button"
    id="audioButton"
    onclick="enableAudio()"
  >
    🔊 音声をONにする
  </button>

  <button
    class="panel-button stop-button"
    id="stopLiveButton"
    onclick="stopLive()"
  >
    🔴 配信を終了
  </button>

  <button
    class="panel-button close-button"
    onclick="closePanel()"
  >
    閉じる
  </button>

</div>


<!-- =================================================
     NAV
================================================= -->

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
    onclick="searchLive()"
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

/* =====================================================
   GLOBAL
===================================================== */

var socket = null;

var myId =
  "client_" +
  Math.random()
    .toString(36)
    .substring(2);

var isBroadcaster = false;

var localStream = null;

var peerConnections = {};

var pendingIceCandidates = {};

var currentLiveId = null;


/* =====================================================
   WEBRTC
===================================================== */

var rtcConfig = {

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
   SOCKET CONNECT
===================================================== */

function connectSocket() {

  var protocol =
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

      console.log(
        "WebSocket connected"
      );

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

        var data =
          JSON.parse(
            event.data
          );

        handleSocketMessage(
          data
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

      console.log(
        "WebSocket disconnected"
      );

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
   SOCKET MESSAGE
===================================================== */

function handleSocketMessage(data) {

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

    renderLiveList(
      data.lives || []
    );

    return;
  }


  if (
    data.type ===
    "live_stopped"
  ) {

    renderLiveList(
      data.lives || []
    );

    if (!isBroadcaster) {

      setPanelStatus(
        "配信が終了しました"
      );

      document.getElementById(
        "audioText"
      ).textContent =
        "配信終了";

    }

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


  /* 配信者側 */

  if (
    data.type ===
    "viewer_joined"
  ) {

    createOfferForViewer(
      data.viewerId
    );

    return;
  }


  /* 視聴者側 */

  if (
    data.type ===
    "offer"
  ) {

    receiveOffer(
      data
    );

    return;
  }


  /* 配信者側 */

  if (
    data.type ===
    "answer"
  ) {

    receiveAnswer(
      data
    );

    return;
  }


  /* ICE */

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
    "viewer_left"
  ) {

    var viewerPc =
      peerConnections[
        data.viewerId
      ];

    if (viewerPc) {

      try {
        viewerPc.close();
      } catch (e) {}

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

  var list =
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


  var html = "";


  lives.forEach(
    function(live) {

      var safeId =
        escapeHtml(
          live.id || ""
        );


      html +=
        "<div class='live-card' " +
        "onclick=\"listenLive('" +
        safeId +
        "')\">" +

        "<div class='live-avatar'>" +
        "🎙️" +
        "</div>" +

        "<div class='live-info'>" +

        "<div class='live-name'>" +
        escapeHtml(
          live.name ||
          "Voice配信者"
        ) +
        "</div>" +

        "<div class='live-title'>" +
        escapeHtml(
          live.title ||
          "音声ライブ配信中"
        ) +
        "</div>" +

        "<span class='live-badge'>" +
        "LIVE" +
        "</span>" +

        "</div>" +

        "</div>";

    }
  );


  list.innerHTML =
    html;

}


/* =====================================================
   START LIVE
===================================================== */

async function startLive() {

  if (isBroadcaster) {

    openPanel();

    return;

  }


  var name =
    prompt(
      "配信者名を入力してください",
      "ぼたもち"
    );


  if (!name) {

    return;

  }


  var title =
    prompt(
      "配信タイトルを入力してください",
      "VoiceボタLive 配信中"
    );


  if (!title) {

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

    alert(
      "マイクへのアクセスが必要です。\\n\\n" +
      "ブラウザのマイク許可をONにしてください。"
    );

    console.log(
      error
    );

    return;

  }


  isBroadcaster =
    true;


  openPanel();


  setPanelStatus(
    "配信開始中..."
  );


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioButton"
  ).classList.remove(
    "show"
  );


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


  document.getElementById(
    "audioText"
  ).textContent =
    "🎙️ マイク配信中";

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


  Object.keys(
    peerConnections
  ).forEach(
    function(id) {

      try {

        peerConnections[
          id
        ].close();

      } catch (e) {}

    }
  );


  peerConnections =
    {};


  pendingIceCandidates =
    {};


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


  currentLiveId =
    null;


  document.getElementById(
    "audioButton"
  ).classList.remove(
    "show"
  );


  document.getElementById(
    "stopLiveButton"
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


  setPanelStatus(
    "配信者へ接続しています..."
  );


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";


  document.getElementById(
    "audioButton"
  ).classList.remove(
    "show"
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


  var pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    viewerId
  ] = pc;


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
        "Broadcaster connection:",
        viewerId,
        pc.connectionState
      );


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

        delete peerConnections[
          viewerId
        ];

      }

    };


  try {

    var offer =
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

    console.log(
      "offer error",
      error
    );

  }

}


/* =====================================================
   RECEIVE OFFER
===================================================== */

async function receiveOffer(data) {

  if (
    isBroadcaster
  ) {

    return;

  }


  var oldPc =
    peerConnections[
      data.from
    ];


  if (oldPc) {

    try {
      oldPc.close();
    } catch (e) {}

  }


  var pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    data.from
  ] = pc;


  pc.ontrack =
    function(event) {

      var audio =
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


      audio.volume =
        1.0;


      audio.muted =
        false;


      var playPromise =
        audio.play();


      if (playPromise) {

        playPromise
          .then(
            function() {

              document.getElementById(
                "audioButton"
              ).classList.remove(
                "show"
              );

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
                "Autoplay blocked:",
                error
              );


              document.getElementById(
                "audioButton"
              ).classList.add(
                "show"
              );


              setPanelStatus(
                "🔊 音声をONにしてください"
              );

            }
          );

      }

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
        "Viewer connection:",
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
          "failed"
      ) {

        setPanelStatus(
          "接続に失敗しました"
        );

      }

    };


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


    var answer =
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


    if (
      pendingIceCandidates[
        data.from
      ]
    ) {

      for (
        var i = 0;
        i <
        pendingIceCandidates[
          data.from
        ].length;
        i++
      ) {

        try {

          await pc.addIceCandidate(
            pendingIceCandidates[
              data.from
            ][i]
          );

        } catch (e) {

          console.log(
            "Pending ICE error:",
            e
          );

        }

      }


      delete pendingIceCandidates[
        data.from
      ];

    }

  } catch (error) {

    console.log(
      "answer error",
      error
    );

    setPanelStatus(
      "接続エラーが発生しました"
    );

  }

}


/* =====================================================
   RECEIVE ANSWER
===================================================== */

async function receiveAnswer(data) {

  var pc =
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

    console.log(
      "remote description error",
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

  var pc =
    peerConnections[
      data.from
    ];


  if (!pc) {

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
      new RTCIceCandidate(
        data.candidate
      )
    );

    return;

  }


  try {

    if (
      pc.remoteDescription
    ) {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          data.candidate
        )
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
        new RTCIceCandidate(
          data.candidate
        )
      );

    }

  } catch (error) {

    console.log(
      "ICE error",
      error
    );

  }

}


/* =====================================================
   ENABLE AUDIO
===================================================== */

function enableAudio() {

  var audio =
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
          "audioButton"
        ).classList.remove(
          "show"
        );


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
          "Audio play error:",
          error
        );

        setPanelStatus(
          "音声を再生できませんでした"
        );

      }
    );

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

  if (isBroadcaster) {

    return;

  }


  document
    .getElementById(
      "livePanel"
    )
    .classList.remove(
      "show"
    );

}


/* =====================================================
   PANEL STATUS
===================================================== */

function setPanelStatus(text) {

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


function searchLive() {

  scrollLive();

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
              "application/json; charset=utf-8"
          }
        );


        res.end(
          JSON.stringify({

            status:
              "ok",

            app:
              "VoiceボタLive",

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
    server:
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
                  "start_live_error",

                message:
                  "すでに配信中です"

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
              "VoiceボタLive 配信中",

            startedAt:
              Date.now()

          };


          console.log(
            "================================="
          );

          console.log(
            "LIVE START"
          );

          console.log(
            "Name:",
            liveInfo.name
          );

          console.log(
            "Title:",
            liveInfo.title
          );

          console.log(
            "================================="
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

            stopBroadcast();

          }

          return;

        }


        /* VIEWER JOIN */

        if (
          data.type ===
          "join_live"
        ) {

          if (
            broadcaster &&
            broadcaster.readyState ===
              WebSocket.OPEN &&
            liveInfo.active
          ) {

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

          } else {

            ws.send(
              JSON.stringify({

                type:
                  "live_unavailable"

              })
            );

          }

          return;

        }


        /* OFFER / ANSWER / ICE */

        if (
          data.type ===
            "offer" ||
          data.type ===
            "answer" ||
          data.type ===
            "ice_candidate"
        ) {

          relaySignaling(
            ws,
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


        /* 配信者切断 */

        if (
          broadcaster ===
          ws
        ) {

          stopBroadcast();

          console.log(
            "BROADCASTER DISCONNECTED"
          );

        }


        /* 視聴者退出 */

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
   STOP BROADCAST
===================================================== */

function stopBroadcast() {

  if (
    broadcaster
  ) {

    for (
      const client of clients
    ) {

      if (
        client !== broadcaster &&
        client.readyState ===
          WebSocket.OPEN
      ) {

        client.send(
          JSON.stringify({

            type:
              "live_stopped",

            lives:
              []

          })
        );

      }

    }

  }


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


  broadcastLiveList();


  console.log(
    "LIVE STOP"
  );

}


/* =====================================================
   SIGNALING
===================================================== */

function relaySignaling(
  sender,
  data
) {

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
