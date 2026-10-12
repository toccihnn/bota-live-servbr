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

<title>Voice繝昴ちLive</title>

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

  .hero-content {
    max-width: 1000px;

    margin-left: auto;
    margin-right: auto;

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

@media (max-width: 500px) {

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
    Voice繝昴ちLive
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
      alt="Voice繝昴ちLive"
    >

    <div class="hero-gradient"></div>

  </div>

  <div class="hero-content">

    <div class="hero-small">
      螢ｰ縺ｧ縺､縺ｪ縺後ｋ縲√∩繧薙↑縺ｮ螻��ｴ謇縲�
    </div>

    <h1 class="hero-title">

      <span>
        縺ゅ↑縺溘�螢ｰ縺後�
      </span>

      <br>

      隱ｰ縺九�螟懊ｒ辣ｧ繧峨☆縲�

    </h1>

    <div class="hero-description">

      譛域�縺九ｊ縺ｮ荳九〒縲∬ｩｱ縺励※縲∬�縺�※縲∫ｬ代▲縺ｦ縲�<br>

      Voice繝昴ちLive縺ｧ縲√≠縺ｪ縺溘�螢ｰ繧偵ｂ縺｣縺ｨ霑代￥縺ｫ縲�

    </div>

  </div>

</section>


<!-- =====================================================
     LIVE
===================================================== -->

<section
  class="section"
  id="liveSection"
>

  <div class="section-head">

    <div class="section-title">
      閥 繝ｩ繧､繝紋ｸｭ
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
      迴ｾ蝨ｨ驟堺ｿ｡荳ｭ縺ｮ繝ｩ繧､繝悶�縺ゅｊ縺ｾ縺帙ｓ
    </div>

  </div>

</section>


<!-- =====================================================
     FEATURES
===================================================== -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      Voice繝昴ちLive
    </div>

  </div>

  <div class="features">

    <div class="feature">

      <div class="feature-icon">
        児��
      </div>

      <div class="feature-title">
        鬮倬浹雉ｪ縺ｮ髻ｳ螢ｰ驟堺ｿ｡
      </div>

      <div class="feature-text">
        繧ｯ繝ｪ繧｢縺ｪ螢ｰ縺ｧ縲√ｂ縺｣縺ｨ霑代￥縺ｫ縲�
      </div>

    </div>

    <div class="feature">

      <div class="feature-icon">
        笞｡
      </div>

      <div class="feature-title">
        菴朱≦蟒ｶ縺ｧ繝ｪ繧｢繝ｫ繧ｿ繧､繝�
      </div>

      <div class="feature-text">
        莉翫％縺ｮ迸ｬ髢薙ｒ縲∽ｸ邱偵↓縲�
      </div>

    </div>

    <div class="feature">

      <div class="feature-icon">
        氏
      </div>

      <div class="feature-title">
        謚輔￡驫ｭ縺ｧ蠢懈抄
      </div>

      <div class="feature-text">
        縺ゅ↑縺溘�蠢懈抄縺碁�菫｡閠��蜉帙↓縲�
      </div>

    </div>

    <div class="feature">

      <div class="feature-icon">
        則
      </div>

      <div class="feature-title">
        縺ｿ繧薙↑縺ｧ讌ｽ縺励ａ繧�
      </div>

      <div class="feature-text">
        螂ｽ縺阪↑螢ｰ縺ｧ縺､縺ｪ縺後ｋ蝣ｴ謇縲�
      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     LIVE PANEL
===================================================== -->

<div
  class="live-panel"
  id="livePanel"
>

  <div class="panel-header">

    <div class="panel-title">
      Voice繝昴ちLive
    </div>

    <div
      class="panel-live"
      id="panelLive"
    >
      LIVE
    </div>

  </div>

  <div
    class="panel-status"
    id="panelStatus"
  >
    謗･邯壽ｺ門ｙ荳ｭ...
  </div>

  <div class="audio-status">

    <div class="audio-icon">
      児��
    </div>

    <div id="audioText">
      髻ｳ螢ｰ謗･邯�
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
    矧 髻ｳ螢ｰ繧丹N縺ｫ縺吶ｋ
  </button>

  <button
    class="panel-button stop-button"
    id="stopLiveButton"
    onclick="stopLive()"
    style="display:none"
  >
    笵� 驟堺ｿ｡繧堤ｵゆｺ�
  </button>

  <button
    class="panel-button close-button"
    onclick="closePanel()"
  >
    髢峨§繧�
  </button>

</div>


<!-- =====================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    class="nav-item active"
    onclick="goHome()"
  >

    <div class="nav-icon">
      竚�
    </div>

    繝帙�繝�

  </button>

  <button
    class="nav-item"
    onclick="scrollLive()"
  >

    <div class="nav-icon">
      竚�
    </div>

    謗｢縺�

  </button>

  <button
    class="nav-item"
    onclick="startLive()"
  >

    <div class="nav-live">
      児��
    </div>

    驟堺ｿ｡

  </button>

  <button
    class="nav-item"
    onclick="showNotice()"
  >

    <div class="nav-icon">
      笙ｧ
    </div>

    縺顔衍繧峨○

  </button>

  <button
    class="nav-item"
    onclick="showProfile()"
  >

    <div class="nav-icon">
      笙�
    </div>

    繝槭う繝壹�繧ｸ

  </button>

</nav>

</div>


<script>

/* =====================================================
   GLOBAL
===================================================== */

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

let pendingCandidates = [];


/* =====================================================
   WEBRTC
===================================================== */

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


  socket.onopen = function() {

    console.log(
      "WebSocket connected"
    );

    sendMessage({

      type: "hello",

      clientId: myId

    });

  };


  socket.onmessage =
    function(event) {

      try {

        const data =
          JSON.parse(
            event.data
          );

        handleMessage(data);

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
        "WebSocket closed"
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
      "縺薙�繝ｩ繧､繝悶�邨ゆｺ�＠縺ｦ縺�∪縺�"
    );

    return;
  }


  if (
    data.type ===
    "live_stopped"
  ) {

    renderLiveList(
      []
    );

    if (!isBroadcaster) {

      setPanelStatus(
        "驟堺ｿ｡縺檎ｵゆｺ�＠縺ｾ縺励◆"
      );

      document.getElementById(
        "audioText"
      ).textContent =
        "繝ｩ繧､繝也ｵゆｺ�";

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
      "迴ｾ蝨ｨ驟堺ｿ｡荳ｭ縺ｮ繝ｩ繧､繝悶�縺ゅｊ縺ｾ縺帙ｓ" +
      "</div>";

    return;

  }


  list.innerHTML =
    lives.map(
      function(live) {

        return `

          <div
            class="live-card"
            onclick="listenLive('${escapeHtml(live.id)}')"
          >

            <div class="live-avatar">
              児��
            </div>

            <div class="live-info">

              <div class="live-name">
                ${escapeHtml(
                  live.name ||
                  "Voice驟堺ｿ｡閠�"
                )}
              </div>

              <div class="live-title">
                ${escapeHtml(
                  live.title ||
                  "髻ｳ螢ｰ繝ｩ繧､繝夜�菫｡荳ｭ"
                )}
              </div>

              <span class="live-badge">
                LIVE
              </span>

            </div>

          </div>

        `;

      }
    ).join("");

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
      "縺薙�繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ繝槭う繧ｯ繧剃ｽｿ逕ｨ縺ｧ縺阪∪縺帙ｓ縲�"
    );

    return;

  }


  const name =
    prompt(
      "驟堺ｿ｡閠�錐繧貞�蜉帙＠縺ｦ縺上□縺輔＞",
      "縺ｼ縺溘ｂ縺｡"
    );


  if (!name) {

    return;

  }


  const title =
    prompt(
      "驟堺ｿ｡繧ｿ繧､繝医Ν繧貞�蜉帙＠縺ｦ縺上□縺輔＞",
      "Voice繝昴ちLive 驟堺ｿ｡荳ｭ"
    );


  if (!title) {

    return;

  }


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
      "getUserMedia error:",
      error
    );

    alert(
      "繝槭う繧ｯ繧剃ｽｿ逕ｨ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲�\\n\\n" +
      "繝悶Λ繧ｦ繧ｶ縺ｮ繝槭う繧ｯ險ｱ蜿ｯ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲�"
    );

    return;

  }


  isBroadcaster = true;


  openPanel();


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


  setPanelStatus(
    "閥 驟堺ｿ｡繧帝幕蟋九＠縺ｦ縺�∪縺�..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "児�� 繝槭う繧ｯ驟堺ｿ｡荳ｭ";


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
    "閥 驟堺ｿ｡荳ｭ縺ｧ縺�"
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


  localStream = null;

  isBroadcaster = false;

  setPanelStatus(
    "驟堺ｿ｡繧堤ｵゆｺ�＠縺ｾ縺励◆"
  );

  document.getElementById(
    "audioText"
  ).textContent =
    "驟堺ｿ｡邨ゆｺ�";

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
      "驟堺ｿ｡荳ｭ縺ｯ蛻･縺ｮ繝ｩ繧､繝悶ｒ隕冶�縺ｧ縺阪∪縺帙ｓ縲�"
    );

    return;

  }


  currentLiveId = id;


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
    "而 驟堺ｿ｡閠�∈謗･邯壹＠縺ｦ縺�∪縺�..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "謗･邯壻ｸｭ...";


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


      audio.autoplay = true;

      audio.playsInline = true;


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioOnButton"
            ).style.display =
              "none";

            setPanelStatus(
              "矧 繝ｩ繧､繝夜浹螢ｰ繧貞女菫｡荳ｭ"
            );

            document.getElementById(
              "audioText"
            ).textContent =
              "矧 LIVE 髻ｳ螢ｰ";

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
              "髻ｳ螢ｰ繧丹N縺ｫ縺励※縺上□縺輔＞"
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
          "矧 繝ｩ繧､繝夜浹螢ｰ繧貞女菫｡荳ｭ"
        );

      }


      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "disconnected"
      ) {

        setPanelStatus(
          "髻ｳ螢ｰ謗･邯壹′蛻�ｌ縺ｾ縺励◆"
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


  audio.muted = false;

  audio.volume = 1.0;


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioOnButton"
        ).style.display =
          "none";

        setPanelStatus(
          "矧 繝ｩ繧､繝夜浹螢ｰ繧貞女菫｡荳ｭ"
        );

        document.getElementById(
          "audioText"
        ).textContent =
          "矧 LIVE 髻ｳ螢ｰ";

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

    top: 0,

    behavior:
      "smooth"

  });

}


function showNotice() {

  alert(
    "縺顔衍繧峨○縺ｯ縺ｾ縺�縺ゅｊ縺ｾ縺帙ｓ縲�"
  );

}


function showProfile() {

  alert(
    "繝槭う繝壹�繧ｸ讖溯�繧呈ｺ門ｙ荳ｭ縺ｧ縺吶�"
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
          "home.png 縺後≠繧翫∪縺帙ｓ"
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


    ws.joinedLive = false;


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

          /*
           * 迴ｾ蝨ｨ縺ｯ1莠ｺ驟堺ｿ｡譁ｹ蠑�
           */

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
                  "迴ｾ蝨ｨ縺ｻ縺九�驟堺ｿ｡閠�′驟堺ｿ｡荳ｭ縺ｧ縺�"

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
              "Voice驟堺ｿ｡閠�",

            title:
              data.title ||
              "髻ｳ螢ｰ繝ｩ繧､繝夜�菫｡荳ｭ",

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


    ws.on(
      "close",
      function() {

        clients.delete(ws);


        /*
         * 驟堺ｿ｡閠�′蛻�妙
         */

        if (
          broadcaster ===
          ws
        ) {

          stopLiveServer();

        }


        /*
         * 隕冶�閠�′騾蜃ｺ
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
      "Voice繝昴ちLive"
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
