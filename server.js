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
  title: "",
  background: ""
};

const HTML = String.raw`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1.0,user-scalable=no">
<meta name="theme-color" content="#050510">

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

  background: rgba(5,5,16,.94);
  backdrop-filter: blur(15px);

  border-bottom: 1px solid rgba(130,140,255,.15);
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
  margin: -30px auto 0;
  padding: 0 18px 28px;
  position: relative;
}

.hero-small {
  font-size: 12px;
  color: #b8c7ff;
  font-weight: 800;
}

.hero-title {
  margin: 8px 0 0;
  font-size: clamp(28px,8vw,48px);
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

  border: 1px solid rgba(100,120,200,.12);
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

  border: 1px solid rgba(120,140,255,.15);
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
   LIVE PANEL
========================= */

.live-panel {
  display: none;

  position: fixed;
  inset: 0;

  z-index: 2000;

  background-color: #040511;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  overflow-y: auto;

  padding: 20px 16px 110px;
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
  background: rgba(255,60,130,.16);
  color: #ff8bb5;
}

/* =========================
   BACKGROUND CUSTOM
========================= */

.background-custom {
  margin-top: 12px;
  padding: 12px;

  border-radius: 16px;

  background: rgba(8,12,32,.82);

  border:
    1px solid rgba(140,150,255,.18);
}

.background-custom-title {
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 9px;
}

.background-custom-buttons {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 7px;
}

.background-custom button {
  min-height: 40px;

  border: 0;
  border-radius: 11px;

  color: white;

  font-size: 11px;
  font-weight: 800;
}

.bg-preset-blue {
  background:
    linear-gradient(
      135deg,
      #111a4b,
      #243b8f
    );
}

.bg-preset-purple {
  background:
    linear-gradient(
      135deg,
      #24103e,
      #8d2f9d
    );
}

.bg-preset-pink {
  background:
    linear-gradient(
      135deg,
      #3d102b,
      #c82f76
    );
}

.bg-upload {
  background:
    linear-gradient(
      135deg,
      #1a203c,
      #4c5fe8
    );
}

.bg-reset {
  margin-top: 7px;
  width: 100%;
  background: #202640;
}

#backgroundFile {
  display: none;
}

.background-custom-note {
  margin-top: 8px;

  color: #8e98b8;

  font-size: 10px;
  line-height: 1.5;
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
   GIFTS
========================= */

.gift-panel {
  margin-top: 12px;
  padding: 12px;

  border-radius: 16px;

  background: rgba(8,12,32,.9);

  border:
    1px solid rgba(140,150,255,.18);
}

.gift-panel.hidden {
  display: none;
}

.gift-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 8px;
}

.gift-btn {
  min-height: 75px;

  border: 0;
  border-radius: 14px;

  background: #161d40;
  color: white;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 4px;
}

.gift-btn b {
  font-size: 28px;
}

.gift-btn span {
  font-size: 10px;
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
      VoiceボタLiveで、あなたの声をもっと近くに。

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

<!-- =========================
     LIVE PANEL
========================= -->

<div
  class="live-panel"
  id="livePanel"
>

  <div class="panel-header">

    <div
      class="panel-title"
      id="panelTitle"
    >
      VoiceボタLive
    </div>

    <div class="panel-live">
      LIVE
    </div>

  </div>

  <div
    class="panel-status"
    id="panelStatus"
  >
    配信準備中
  </div>

  <div class="audio-status">

    <div class="audio-icon">
      🎙️
    </div>

    <div id="audioText">
      音声待機中
    </div>

  </div>

  <!-- 背景カスタム -->

  <div class="background-custom">

    <div class="background-custom-title">
      🎨 配信画面の背景をカスタム
    </div>

    <div class="background-custom-buttons">

      <button
        type="button"
        class="bg-preset-blue"
        onclick="setLiveBackgroundPreset('blue')"
      >
        青
      </button>

      <button
        type="button"
        class="bg-preset-purple"
        onclick="setLiveBackgroundPreset('purple')"
      >
        紫
      </button>

      <button
        type="button"
        class="bg-preset-pink"
        onclick="setLiveBackgroundPreset('pink')"
      >
        ピンク
      </button>

      <button
        type="button"
        class="bg-upload"
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
      type="button"
      class="bg-reset"
      onclick="resetLiveBackground()"
    >
      背景をリセット
    </button>

    <div class="background-custom-note">
      スマホ・タブレット内の画像を選んで、
      配信画面の背景にできます。
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
    🔊 音声をONにする
  </button>

  <button
    id="likeButton"
    class="panel-button like-button"
    type="button"
    onclick="sendLike()"
  >
    ❤️ いいね
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
        placeholder="コメントを入力"
      >

      <button
        type="button"
        onclick="sendComment()"
      >
        送信
      </button>

    </div>

  </div>

  <div class="gift-panel hidden" id="giftPanel">

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

  <button
    id="stopButton"
    class="panel-button stop-button"
    type="button"
    onclick="stopLive()"
    style="display:none"
  >
    ⛔ 配信を終了する
  </button>

  <button
    class="panel-button close-button"
    type="button"
    onclick="closePanel()"
  >
    閉じる
  </button>

</div>

<!-- =========================
     BOTTOM NAV
========================= -->

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

let currentUserName = "ユーザー";

let currentLiveId = null;

let currentBroadcasterId = null;

let liveBackgroundData =
  localStorage.getItem(
    "voiceBotaLiveBackground"
  ) || "";

let liveBackgrounds = {};


/* =========================================================
   BACKGROUND
========================================================= */

function applyLiveBackground(background) {

  const panel =
    document.getElementById(
      "livePanel"
    );

  if (!panel) return;

  if (background) {

    if (
      background.startsWith("data:image")
    ) {

      panel.style.backgroundImage =
        "linear-gradient(rgba(4,5,17,.62),rgba(4,5,17,.88)),url('" +
        background +
        "')";

    } else {

      panel.style.backgroundImage =
        background;

    }

  } else {

    panel.style.backgroundImage =
      "none";

  }

  panel.style.backgroundSize =
    "cover";

  panel.style.backgroundPosition =
    "center";

  panel.style.backgroundRepeat =
    "no-repeat";

}


function setLiveBackgroundPreset(type) {

  const panel =
    document.getElementById(
      "livePanel"
    );

  if (!panel) return;

  const backgrounds = {

    blue:
      "linear-gradient(135deg,#111a4b,#243b8f 55%,#080b1e)",

    purple:
      "linear-gradient(135deg,#24103e,#8d2f9d 55%,#090719)",

    pink:
      "linear-gradient(135deg,#3d102b,#c82f76 55%,#100617)"

  };

  panel.style.backgroundImage =
    backgrounds[type] ||
    backgrounds.blue;

  panel.style.backgroundSize =
    "cover";

  panel.style.backgroundPosition =
    "center";

  panel.style.backgroundRepeat =
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

  ]

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

  socket =
    new WebSocket(url);

  socket.onopen =
    function() {

      connected = true;

      send({

        type: "hello",

        clientId: myId

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
      "🔴 配信中です"
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
    "ice"
  ) {

    receiveIce(data);

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
      "システム",
      "❤️ " +
      data.name +
      " さんがいいねしました"
    );

    return;

  }

  if (
    data.type ===
    "gift"
  ) {

    addComment(
      "🎁 ギフト",
      data.name +
      " さんから " +
      data.giftName
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

    document.getElementById(
      "audioText"
    ).textContent =
      "配信終了";

    closePeers();

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

  }

}


/* =========================================================
   LIVE LIST
========================================================= */

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
        escapeHtml(live.id) +
        '\')">' +

        '<div class="live-avatar">' +
        '🎙️' +
        '</div>' +

        '<div class="live-info">' +

        '<div class="live-name">' +
        escapeHtml(live.name) +
        '</div>' +

        '<div class="live-title">' +
        escapeHtml(live.title) +
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
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#39;");

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

  openPanel();

  setPanelStatus(
    "🎙️ マイクを確認しています..."
  );

  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: {

            echoCancellation: true,

            noiseSuppression: true,

            autoGainControl: true

          },

          video: false

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

    return;

  }

  isBroadcaster = true;

  document.getElementById(
    "panelTitle"
  ).textContent =
    title;

  document.getElementById(
    "stopButton"
  ).style.display =
    "block";

  document.getElementById(
    "audioText"
  ).textContent =
    "🎙️ マイク配信中";

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
        title,

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

  localStream = null;

  closePeers();

  isBroadcaster = false;

  document.getElementById(
    "stopButton"
  ).style.display =
    "none";

  document.getElementById(
    "audioText"
  ).textContent =
    "配信終了";

  setPanelStatus(
    "配信を終了しました"
  );

  renderLiveList([]);

  setTimeout(
    closePanel,
    800
  );

}


/* =========================================================
   LISTEN
========================================================= */

function listenLive(liveId) {

  if (isBroadcaster) {

    alert(
      "配信中は他のライブを視聴できません。"
    );

    return;

  }

  currentLiveId =
    liveId;

  if (
    liveBackgrounds[liveId]
  ) {

    applyLiveBackground(
      liveBackgrounds[liveId]
    );

  } else {

    setLiveBackgroundPreset(
      "blue"
    );

  }

  openPanel();

  document.getElementById(
    "panelTitle"
  ).textContent =
    "LIVE";

  setPanelStatus(
    "🎧 配信者に接続しています..."
  );

  document.getElementById(
    "audioText"
  ).textContent =
    "接続中...";

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

async function receiveOffer(data) {

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
              "🔊 LIVE 音声";

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

            document.getElementById(
              "audioText"
            ).textContent =
              "🔊 音声ボタンを押してください";

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

async function receiveAnswer(data) {

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

async function receiveIce(data) {

  const pc =
    peerConnections[
      data.from
    ];

  if (!pc) return;

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
          "🔊 LIVE 音声";

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


function addComment(name,text) {

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
   GIFTS
========================================================= */

function toggleGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );

  panel.classList.toggle(
    "hidden"
  );

}


function sendGift(emoji,name) {

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

}


/* =========================================================
   PEERS
========================================================= */

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

  peerConnections = {};

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

  if (liveBackgroundData) {

    applyLiveBackground(
      liveBackgroundData
    );

  } else {

    setLiveBackgroundPreset(
      "blue"
    );

  }

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


function setPanelStatus(text) {

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
    function(req,res) {

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

        res.writeHead(404);

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

      res.writeHead(404);

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
    server: server
  });


function sendTo(ws,data) {

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


function broadcast(data) {

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
        liveInfo.title,

      background:
        liveInfo.background || ""

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

          return;

        }


        /* WEBRTC */

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


        /* COMMENT */

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


        /* LIKE */

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
              ).substring(
                0,
                30
              )

          });

          return;

        }


        /* GIFT */

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
