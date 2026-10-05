const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

let clients = new Set();
let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: ""
};


/* =========================================================
   HTML
========================================================= */

const HTML = String.raw`
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<meta name="theme-color" content="#050510">

<title>voice繝懊ちLive</title>

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

.app {
  min-height: 100vh;
  padding-bottom: 90px;
}


/* =========================
   HEADER
========================= */

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

  background: rgba(5,5,16,.92);

  backdrop-filter: blur(15px);

  border-bottom:
    1px solid rgba(130,140,255,.15);
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


/* =========================
   HOME
========================= */

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
  margin: 8px 0 0;

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


/* =========================
   SECTION
========================= */

.section {
  max-width: 1000px;
  margin: auto;
  padding: 20px 15px 0;
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


/* =========================
   LIVE LIST
========================= */

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
    1px solid rgba(100,120,200,.12);

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
    1px solid rgba(120,140,255,.15);
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

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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

  padding: 3px 9px;

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


/* =========================
   FEATURES
========================= */

.features {
  display: grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 10px;

  margin-top: 15px;
}

.feature {
  min-height: 110px;

  padding: 17px 14px;

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      #19204b,
      #090d20
    );

  border:
    1px solid rgba(120,140,255,.12);
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


/* =========================
   LIVE PANEL
========================= */

.live-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 2000;

  background:
    rgba(4,5,17,.98);

  overflow-y: auto;

  padding:
    20px 16px 110px;
}

.live-panel.show {
  display: block;
}

.panel-header {
  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-top: 20px;
}

.panel-title {
  max-width: 75%;

  font-size: 21px;

  font-weight: 900;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.panel-live {
  padding: 5px 10px;

  border-radius: 999px;

  font-size: 9px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3d6b,
      #a82cff
    );
}

.panel-status {
  margin-top: 14px;

  padding: 14px;

  border-radius: 15px;

  background: #101638;

  color: #bed0ff;

  font-size: 13px;
}

.audio-status {
  margin-top: 14px;

  padding: 30px 20px;

  text-align: center;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      #232d69,
      #0b0f2a
    );
}

.audio-icon {
  font-size: 58px;
}

#audioText {
  margin-top: 8px;

  font-size: 14px;

  font-weight: 800;
}

#remoteAudio {
  display: none;
}

.panel-button {
  width: 100%;

  height: 52px;

  margin-top: 11px;

  border: 0;

  border-radius: 16px;

  color: white;

  font-size: 14px;

  font-weight: 900;
}

.start-button {
  background:
    linear-gradient(
      100deg,
      #24cfff,
      #5265ff
    );
}

.stop-button {
  background:
    linear-gradient(
      100deg,
      #ff3c62,
      #a52dff
    );
}

.close-button {
  background: #1b203c;

  border:
    1px solid rgba(140,150,255,.2);
}

.like-button {
  background:
    rgba(255,60,130,.16);

  color: #ff8bb5;
}


/* =========================
   COMMENTS
========================= */

.comments {
  margin-top: 14px;
}

.comment-list {
  height: 180px;

  overflow-y: auto;

  padding: 10px;

  border-radius: 15px;

  background: #080c20;
}

.comment-item {
  padding: 8px 4px;

  border-bottom:
    1px solid rgba(255,255,255,.06);

  font-size: 13px;
}

.comment-input {
  display: flex;

  gap: 8px;

  margin-top: 8px;
}

.comment-input input {
  min-width: 0;

  flex: 1;

  height: 46px;

  padding: 0 12px;

  border-radius: 13px;

  border:
    1px solid rgba(120,140,255,.2);

  background: #0d1230;

  color: white;

  outline: none;
}

.comment-input button {
  width: 70px;

  border: 0;

  border-radius: 13px;

  background: #526cff;

  color: white;

  font-weight: 900;
}


/* =========================
   BOTTOM NAV
========================= */

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
    1px solid rgba(120,140,255,.12);
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
    3px solid #070a20;

  box-shadow:
    0 0 25px
    rgba(80,110,255,.65);
}


/* =========================
   DESKTOP
========================= */

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
    voice繝懊ちLive
  </div>

</header>


<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="voice繝懊ちLive"
      onerror="this.style.display='none'"
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
      voice繝懊ちLive縺ｧ縲√≠縺ｪ縺溘�螢ｰ繧偵ｂ縺｣縺ｨ霑代￥縺ｫ縲�

    </div>

  </div>

</section>


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


<section class="section">

  <div class="section-title">
    voice繝懊ちLive
  </div>


  <div class="features">


    <div class="feature">

      <div class="feature-icon">
        児��
      </div>

      <div class="feature-title">
        髻ｳ螢ｰ驟堺ｿ｡
      </div>

      <div class="feature-text">
        螢ｰ縺ｧ繝ｪ繧｢繝ｫ繧ｿ繧､繝�縺ｫ縺､縺ｪ縺後ｋ縲�
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        町
      </div>

      <div class="feature-title">
        繧ｳ繝｡繝ｳ繝�
      </div>

      <div class="feature-text">
        驟堺ｿ｡閠�→莨夊ｩｱ縺ｧ縺阪∪縺吶�
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        笶､��
      </div>

      <div class="feature-title">
        縺�＞縺ｭ
      </div>

      <div class="feature-text">
        驟堺ｿ｡繧貞ｿ懈抄縺ｧ縺阪∪縺吶�
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        圻
      </div>

      <div class="feature-title">
        繝悶Ο繝�け
      </div>

      <div class="feature-text">
        隕九◆縺上↑縺�嶌謇九ｒ繝悶Ο繝�け縲�
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
      voice繝懊ちLive
    </div>

    <div class="panel-live">
      LIVE
    </div>

  </div>


  <div
    class="panel-status"
    id="panelStatus"
  >
    驟堺ｿ｡貅門ｙ荳ｭ
  </div>


  <div class="audio-status">

    <div class="audio-icon">
      児��
    </div>

    <div id="audioText">
      髻ｳ螢ｰ謗･邯�
    </div>

  </div>


  <audio
    id="remoteAudio"
    autoplay
    playsinline
  ></audio>


  <button
    id="audioButton"
    class="panel-button start-button"
    type="button"
    onclick="enableAudio()"
    style="display:none"
  >
    矧 髻ｳ螢ｰ繧丹N縺ｫ縺吶ｋ
  </button>


  <button
    id="likeButton"
    class="panel-button like-button"
    type="button"
    onclick="sendLike()"
  >
    笶､�� 縺�＞縺ｭ
  </button>


  <div class="comments">

    <div
      class="comment-list"
      id="commentList"
    ></div>


    <div class="comment-input">

      <input
        id="commentInput"
        maxlength="200"
        placeholder="繧ｳ繝｡繝ｳ繝医ｒ蜈･蜉�"
      >

      <button
        type="button"
        onclick="sendComment()"
      >
        騾∽ｿ｡
      </button>

    </div>

  </div>


  <button
    id="stopButton"
    class="panel-button stop-button"
    type="button"
    onclick="stopLive()"
    style="display:none"
  >
    笵� 驟堺ｿ｡繧堤ｵゆｺ�
  </button>


  <button
    class="panel-button close-button"
    type="button"
    onclick="closePanel()"
  >
    髢峨§繧�
  </button>

</div>


<nav class="bottom-nav">


  <button
    class="nav-item"
    type="button"
    onclick="goHome()"
  >

    <div class="nav-icon">
      匠
    </div>

    繝帙�繝�

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="scrollLive()"
  >

    <div class="nav-icon">
      剥
    </div>

    謗｢縺�

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="startLive()"
  >

    <div class="nav-live">
      児��
    </div>

    驟堺ｿ｡

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="showNotice()"
  >

    <div class="nav-icon">
      粕
    </div>

    縺顔衍繧峨○

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="showProfile()"
  >

    <div class="nav-icon">
      側
    </div>

    繝槭う繝壹�繧ｸ

  </button>


</nav>


</div>


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

let currentUserName = "繝ｦ繝ｼ繧ｶ繝ｼ";

let currentLiveId = null;

let currentBroadcasterId = null;


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

  ]

};


/* =========================================================
   CONNECT
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

  console.log(
    "WebSocket connecting:",
    url
  );

  socket =
    new WebSocket(url);


  socket.onopen =
    function() {

      connected = true;

      console.log(
        "WebSocket connected"
      );

      send({

        type: "hello",

        clientId: myId

      });

    };


  socket.onclose =
    function() {

      connected = false;

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

        console.error(
          "JSON error",
          error
        );

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


  console.log(
    "SERVER:",
    data
  );


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

    setPanelStatus(
      "閥 驟堺ｿ｡荳ｭ縺ｧ縺�"
    );

    return;

  }


  if (
    data.type ===
    "live_start_failed"
  ) {

    alert(
      data.reason ||
      "驟堺ｿ｡繧帝幕蟋九〒縺阪∪縺帙ｓ縺ｧ縺励◆"
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
    "comment"
  ) {

    addComment(
      data.name,
      data.text
    );

    return;

  }


  if (
    data.type ===
    "like"
  ) {

    addComment(
      "繧ｷ繧ｹ繝�Β",
      "笶､�� " +
      data.name +
      " 縺輔ｓ縺後＞縺��縺励∪縺励◆"
    );

    return;

  }


  if (
    data.type ===
    "live_stopped"
  ) {

    setPanelStatus(
      "驟堺ｿ｡縺檎ｵゆｺ�＠縺ｾ縺励◆"
    );

    document.getElementById(
      "audioText"
    ).textContent =
      "繝ｩ繧､繝也ｵゆｺ�";

    closePeers();

    renderLiveList([]);

    return;

  }


  if (
    data.type ===
    "live_unavailable"
  ) {

    alert(
      "縺薙�繝ｩ繧､繝悶�邨ゆｺ�＠縺ｦ縺�∪縺�"
    );

    return;

  }

}


/* =========================================================
   LIVE LIST
========================================================= */

function renderLiveList(
  lives
) {

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
      '迴ｾ蝨ｨ驟堺ｿ｡荳ｭ縺ｮ繝ｩ繧､繝悶�縺ゅｊ縺ｾ縺帙ｓ' +
      '</div>';

    return;

  }


  let html = "";


  lives.forEach(
    function(live) {

      html +=

        '<div class="live-card" ' +

        'onclick="listenLive(\'' +
        escapeHtml(live.id) +
        '\')">' +

        '<div class="live-avatar">' +
        '児��' +
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


function escapeHtml(
  value
) {

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

  console.log(
    "START LIVE CLICK"
  );


  alert(
    "驟堺ｿ｡繝懊ち繝ｳ繧呈款縺励∪縺励◆"
  );


  if (!connected) {

    alert(
      "繧ｵ繝ｼ繝舌�縺ｫ謗･邯壻ｸｭ縺ｧ縺吶�\n" +
      "蟆代＠蠕�▲縺ｦ縺九ｉ繧ゅ≧荳蠎ｦ謚ｼ縺励※縺上□縺輔＞縲�"
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
      "縺薙�繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ繝槭う繧ｯ繧剃ｽｿ逕ｨ縺ｧ縺阪∪縺帙ｓ縲�"
    );

    return;

  }


  const name =
    prompt(
      "驟堺ｿ｡閠�錐繧貞�蜉帙＠縺ｦ縺上□縺輔＞",
      "縺ｼ縺溘ｂ縺｡"
    );


  if (
    name === null ||
    name.trim() === ""
  ) {

    return;

  }


  const title =
    prompt(
      "驟堺ｿ｡繧ｿ繧､繝医Ν繧貞�蜉帙＠縺ｦ縺上□縺輔＞",
      "voice繝懊ちLive 驟堺ｿ｡荳ｭ"
    );


  if (
    title === null ||
    title.trim() === ""
  ) {

    return;

  }


  currentUserName =
    name.trim();


  setPanelStatus(
    "痔 繝槭う繧ｯ繧堤｢ｺ隱阪＠縺ｦ縺�∪縺�..."
  );


  openPanel();


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
              true

          },

          video:
            false

        });


    console.log(
      "MIC OK"
    );


  } catch(error) {

    console.error(
      "MIC ERROR",
      error
    );


    setPanelStatus(
      "繝槭う繧ｯ險ｱ蜿ｯ縺悟ｿ�ｦ√〒縺�"
    );


    alert(
      "繝槭う繧ｯ繧剃ｽｿ逕ｨ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲�\n\n" +
      "繝悶Λ繧ｦ繧ｶ縺ｮ繝槭う繧ｯ險ｱ蜿ｯ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲�"
    );


    return;

  }


  isBroadcaster =
    true;


  document.getElementById(
    "panelTitle"
  ).textContent =
    title;


  document.getElementById(
    "stopButton"
  ).style.display =
    "block";


  document.getElementById(
    "likeButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioText"
  ).textContent =
    "児�� 繝槭う繧ｯ驟堺ｿ｡荳ｭ";


  setPanelStatus(
    "閥 驟堺ｿ｡繧帝幕蟋九＠縺ｦ縺�∪縺�..."
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
        title

    });


  if (!sent) {

    alert(
      "繧ｵ繝ｼ繝舌�縺ｨ縺ｮ謗･邯壹′蛻�ｌ縺ｾ縺励◆縲�"
    );

    return;

  }


  setPanelStatus(
    "閥 驟堺ｿ｡荳ｭ縺ｧ縺�"
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
    "stopButton"
  ).style.display =
    "none";


  document.getElementById(
    "audioText"
  ).textContent =
    "驟堺ｿ｡邨ゆｺ�";


  setPanelStatus(
    "驟堺ｿ｡繧堤ｵゆｺ�＠縺ｾ縺励◆"
  );


  renderLiveList([]);


  setTimeout(
    closePanel,
    800
  );

}


/* =========================================================
   LISTEN LIVE
========================================================= */

function listenLive(
  liveId
) {

  if (isBroadcaster) {

    alert(
      "驟堺ｿ｡荳ｭ縺ｯ隕冶�縺ｧ縺阪∪縺帙ｓ縲�"
    );

    return;

  }


  currentLiveId =
    liveId;


  openPanel();


  document.getElementById(
    "panelTitle"
  ).textContent =
    "LIVE";


  setPanelStatus(
    "而 驟堺ｿ｡閠�↓謗･邯壹＠縺ｦ縺�∪縺�..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "謗･邯壻ｸｭ...";


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
   BROADCASTER OFFER
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
        pc.connectionState
      );

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
      "CREATE OFFER ERROR",
      error
    );

  }

}


/* =========================================================
   VIEWER OFFER
========================================================= */

async function receiveOffer(
  data
) {

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
        "REMOTE AUDIO"
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


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioText"
            ).textContent =
              "矧 LIVE 髻ｳ螢ｰ";


            setPanelStatus(
              "而 謗･邯壹＠縺ｾ縺励◆"
            );

          }
        )
        .catch(
          function(error) {

            console.log(
              "AUTOPLAY BLOCKED",
              error
            );


            document.getElementById(
              "audioButton"
            ).style.display =
              "block";


            document.getElementById(
              "audioText"
            ).textContent =
              "矧 髻ｳ螢ｰ繝懊ち繝ｳ繧呈款縺励※縺上□縺輔＞";

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

async function receiveIce(
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


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioButton"
        ).style.display =
          "none";


        document.getElementById(
          "audioText"
        ).textContent =
          "矧 LIVE 髻ｳ螢ｰ";

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
   LIKE
========================================================= */

function sendLike() {

  send({

    type:
      "like",

    name:
      currentUserName

  });

}


/* =========================================================
   COMMENT
========================================================= */

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


function addComment(
  name,
  text
) {

  const list =
    document.getElementById(
      "commentList"
    );


  const item =
    document.createElement(
      "div"
    );


  item.className =
    "comment-item";


  item.textContent =
    name +
    ": " +
    text;


  list.appendChild(
    item
  );


  list.scrollTop =
    list.scrollHeight;

}


/* =========================================================
   CLOSE PEERS
========================================================= */

function closePeers() {

  Object.keys(
    peerConnections
  ).forEach(
    function(key) {

      try {

        peerConnections[key].close();

      } catch(error) {}

    }
  );


  peerConnections =
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

}


function closePanel() {

  if (!isBroadcaster) {

    closePeers();

  }


  document.getElementById(
    "livePanel"
  ).classList.remove(
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
    "縺顔衍繧峨○讖溯�縺ｯ縺薙ｌ縺九ｉ霑ｽ蜉�縺ｧ縺阪∪縺吶�"
  );

}


function showProfile() {

  alert(
    "繝槭う繝壹�繧ｸ讖溯�縺ｯ縺薙ｌ縺九ｉ霑ｽ蜉�縺ｧ縺阪∪縺吶�"
  );

}


/* =========================================================
   START
========================================================= */

window.addEventListener(
  "load",
  function() {

    console.log(
      "voice繝懊ちLive loaded"
    );

    connectSocket();

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

        const fs =
          require("fs");

        const path =
          require("path");

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
                "image/png"
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
   WEBSOCKET SERVER
========================================================= */

const wss =
  new WebSocket.Server({
    server: server
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
      JSON.stringify(data)
    );

  }

}


function broadcast(
  data
) {

  const message =
    JSON.stringify(data);


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
        liveInfo.title

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
   WEBSOCKET CONNECTION
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


    console.log(
      "CLIENT CONNECT:",
      ws.clientId
    );


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


        /* =====================
           HELLO
        ===================== */

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


        /* =====================
           START LIVE
        ===================== */

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
                  "迴ｾ蝨ｨ縺ｻ縺九�驟堺ｿ｡閠�′驟堺ｿ｡荳ｭ縺ｧ縺�"

              }
            );

            return;

          }


          broadcaster =
            ws;


          ws.isBroadcaster =
            true;


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
              "髻ｳ螢ｰ繝ｩ繧､繝夜�菫｡荳ｭ"

          };


          console.log(
            "LIVE START:",
            liveInfo.name,
            liveInfo.title
          );


          sendTo(
            ws,
            {

              type:
                "live_started"

            }
          );


          sendLiveList();


          return;

        }


        /* =====================
           STOP LIVE
        ===================== */

        if (
          data.type ===
          "stop_live"
        ) {

          if (
            broadcaster ===
            ws
          ) {

            broadcaster =
              null;


            ws.isBroadcaster =
              false;


            liveInfo = {

              active:
                false,

              id:
                null,

              name:
                "",

              title:
                ""

            };


            broadcast({

              type:
                "live_stopped"

            });


            sendLiveList();


            console.log(
              "LIVE STOP"
            );

          }


          return;

        }


        /* =====================
           JOIN LIVE
        ===================== */

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


          sendTo(
            broadcaster,
            {

              type:
                "viewer_joined",

              viewerId:
                ws.clientId

            }
          );


          console.log(
            "VIEWER JOIN:",
            ws.clientId
          );


          return;

        }


        /* =====================
           WEBRTC SIGNALING
        ===================== */

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


        /* =====================
           COMMENT
        ===================== */

        if (
          data.type ===
          "comment"
        ) {

          broadcast({

            type:
              "comment",

            name:
              String(
                data.name ||
                "繝ｦ繝ｼ繧ｶ繝ｼ"
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


        /* =====================
           LIKE
        ===================== */

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
                "繝ｦ繝ｼ繧ｶ繝ｼ"
              ).substring(
                0,
                30
              )

          });


          return;

        }


        /* =====================
           BLOCK
        ===================== */

        if (
          data.type ===
          "block"
        ) {

          console.log(
            "BLOCK:",
            ws.clientId,
            data.target
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


        if (
          broadcaster ===
          ws
        ) {

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
              ""

          };


          broadcast({

            type:
              "live_stopped"

          });


          sendLiveList();

        }


        console.log(
          "CLIENT DISCONNECT:",
          ws.clientId
        );

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
      "voice繝懊ちLive START"
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
