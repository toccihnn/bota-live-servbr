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

const clients = new Set();

let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "配信者",
  title: "音声ライブ配信",
  description: "",
  themeColor: "#3156ff",
  backgroundImage: "",
  avatar: "🎙️",
  startedAt: null
};

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

/* =========================================================
   HTML
========================================================= */

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">

<title>音声ライブ</title>

<style>
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f3f5fb;
  color: #222;
}

body {
  padding: 12px;
}

.app {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  min-height: calc(100vh - 24px);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0,0,0,.08);
}

header {
  padding: 18px;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg,#6d5dfc,#3156ff);
  color: white;
}

.screen {
  padding: 18px;
}

h2 {
  margin-top: 0;
}

label {
  display: block;
  margin-top: 14px;
  margin-bottom: 6px;
  font-weight: 700;
}

input,
textarea,
button {
  font: inherit;
}

input[type="text"],
textarea {
  width: 100%;
  padding: 13px;
  border: 1px solid #dfe3ee;
  border-radius: 12px;
  outline: none;
  background: #fafbff;
}

textarea {
  min-height: 90px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #3156ff;
}

input[type="color"] {
  width: 70px;
  height: 45px;
  border: 0;
  background: none;
}

input[type="file"] {
  width: 100%;
  margin-top: 8px;
}

button {
  border: 0;
  border-radius: 14px;
  padding: 13px 16px;
  cursor: pointer;
  font-weight: 800;
}

.primary {
  width: 100%;
  margin-top: 18px;
  background: #3156ff;
  color: white;
}

.secondary {
  background: #eef1f8;
  color: #222;
}

.danger {
  background: #ff4757;
  color: white;
}

.status {
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: #f1f3f8;
  font-size: 14px;
}

.preview {
  position: relative;
  min-height: 380px;
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #3156ff;
  background-size: cover;
  background-position: center;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,.10),
    rgba(0,0,0,.55)
  );
}

.preview-content {
  position: relative;
  z-index: 2;
  width: 90%;
  color: white;
}

.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255,255,255,.20);
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  backdrop-filter: blur(8px);
}

.preview-title {
  font-size: 25px;
  font-weight: 900;
}

.preview-description {
  margin-top: 10px;
  opacity: .92;
  white-space: pre-wrap;
}

.preview-host {
  margin-top: 12px;
  opacity: .85;
}

.control-row {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.control-row button {
  flex: 1;
}

.hidden {
  display: none !important;
}

.image-preview {
  width: 100%;
  min-height: 150px;
  margin-top: 10px;
  border-radius: 15px;
  background: #f1f3f8;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
}

.live-list {
  margin-top: 18px;
}

.live-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: #f7f8fc;
  margin-bottom: 10px;
  align-items: center;
}

.live-card-avatar {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  background: #3156ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.live-card-info {
  flex: 1;
  min-width: 0;
}

.live-card-title {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-card-name {
  color: #777;
  font-size: 13px;
  margin-top: 4px;
}

.badge {
  display: inline-block;
  margin-top: 6px;
  padding: 4px 8px;
  border-radius: 20px;
  background: #ff4757;
  color: white;
  font-size: 11px;
  font-weight: 800;
}

.viewer-area {
  margin-top: 15px;
}

.notice {
  padding: 12px;
  border-radius: 12px;
  background: #fff7dd;
  font-size: 13px;
  color: #765d00;
}

.small {
  font-size: 12px;
  color: #777;
  line-height: 1.6;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

#remoteAudio {
  display: none;
}

#customSettings {
  margin-top: 15px;
}

hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 22px 0;
}
</style>
</head>

<body>

<div class="app">

<header>
🎤 音声ライブ
</header>

<!-- =========================
     HOME
========================= -->

<div id="homeScreen" class="screen">

  <h2>音声ライブへようこそ</h2>

  <div class="notice">
    音声だけで配信できるライブアプリです。
  </div>

  <div class="live-list" id="liveList">
    <div class="small">
      現在配信中のライブを確認しています…
    </div>
  </div>

  <button class="primary"
          onclick="showScreen('settingScreen')">
    🎙️ 配信を始める
  </button>

</div>

<!-- =========================
     SETTING
========================= -->

<div id="settingScreen" class="screen hidden">

  <h2>配信を設定</h2>

  <label>配信者名</label>
  <input
    id="hostName"
    type="text"
    placeholder="配信者名"
    maxlength="30"
  >

  <label>配信タイトル</label>
  <input
    id="streamTitle"
    type="text"
    placeholder="今日も楽しくお話ししよう"
    maxlength="60"
  >

  <label>配信説明</label>
  <textarea
    id="streamDescription"
    placeholder="配信内容を書いてください"
    maxlength="500"
  ></textarea>

  <label>背景色</label>

  <div class="color-row">
    <input
      id="backgroundColor"
      type="color"
      value="#3156ff"
      onchange="updatePreview()"
    >

    <span id="colorText">#3156ff</span>
  </div>

  <label>背景画像</label>

  <input
    id="backgroundImage"
    type="file"
    accept="image/*"
    onchange="loadBackgroundImage(event)"
  >

  <div id="imagePreview"
       class="image-preview">
    背景画像を選択できます
  </div>

  <hr>

  <h3>配信プレビュー</h3>

  <div id="customPreview"
       class="preview">

    <div class="preview-overlay"></div>

    <div class="preview-content">

      <div id="previewAvatar"
           class="avatar">
        🎙️
      </div>

      <div id="previewTitle"
           class="preview-title">
        音声ライブ配信
      </div>

      <div id="previewDescription"
           class="preview-description">
        配信説明
      </div>

      <div id="previewHost"
           class="preview-host">
        配信者
      </div>

    </div>

  </div>

  <button class="secondary"
          style="width:100%;margin-top:12px"
          onclick="updatePreview()">
    🔄 プレビュー更新
  </button>

  <button class="primary"
          onclick="startLive()">
    🔴 配信開始
  </button>

  <button class="secondary"
          style="width:100%;margin-top:10px"
          onclick="showScreen('homeScreen')">
    戻る
  </button>

  <div id="settingStatus"
       class="status">
    配信前にマイクの使用許可が必要です。
  </div>

</div>

<!-- =========================
     LIVE
========================= -->

<div id="liveScreen" class="screen hidden">

  <div id="livePreview"
       class="preview">

    <div class="preview-overlay"></div>

    <div class="preview-content">

      <div id="liveAvatar"
           class="avatar">
        🎙️
      </div>

      <div id="liveTitle"
           class="preview-title">
        音声ライブ配信
      </div>

      <div id="liveDescription"
           class="preview-description">
      </div>

      <div id="liveHost"
           class="preview-host">
        配信者
      </div>

      <div class="badge">
        🔴 LIVE
      </div>

    </div>

  </div>

  <div class="control-row">

    <button id="micButton"
            class="secondary"
            onclick="toggleMic()">
      🎙️ マイクON
    </button>

    <button id="muteButton"
            class="secondary"
            onclick="toggleMute()">
      🔊 音声ON
    </button>

  </div>

  <button id="stopLiveButton"
          class="danger"
          style="width:100%;margin-top:15px"
          onclick="stopLive()">
    ⏹️ 配信終了
  </button>

  <div id="liveStatus"
       class="status">
    配信準備中…
  </div>

  <div id="customSettings"
       class="hidden">

    <hr>

    <h3>配信画面カスタム</h3>

    <label>タイトル変更</label>

    <input
      id="liveEditTitle"
      type="text"
      maxlength="60"
    >

    <label>説明変更</label>

    <textarea
      id="liveEditDescription"
      maxlength="500"
    ></textarea>

    <label>背景色</label>

    <input
      id="liveEditColor"
      type="color"
    >

    <button class="primary"
            onclick="applyLiveCustom()">
      ✨ 配信画面を更新
    </button>

  </div>

</div>

<!-- =========================
     VIEWER
========================= -->

<div id="viewerScreen"
     class="screen hidden">

  <div id="viewerPreview"
       class="preview">

    <div class="preview-overlay"></div>

    <div class="preview-content">

      <div id="viewerAvatar"
           class="avatar">
        🎙️
      </div>

      <div id="viewerTitle"
           class="preview-title">
        配信
      </div>

      <div id="viewerDescription"
           class="preview-description">
      </div>

      <div id="viewerHost"
           class="preview-host">
      </div>

      <div class="badge">
        🔴 LIVE
      </div>

    </div>

  </div>

  <audio id="remoteAudio"
         autoplay
         playsinline>
  </audio>

  <button id="viewerAudioButton"
          class="primary"
          onclick="startViewerAudio()">
    🔊 音声を再生
  </button>

  <button class="secondary"
          style="width:100%;margin-top:10px"
          onclick="leaveViewer()">
    ← 戻る
  </button>

  <div id="viewerStatus"
       class="status">
    接続中…
  </div>

</div>

</div>

<script>

/* =========================================================
   VARIABLES
========================================================= */

let ws = null;

let myId =
  Math.random().toString(36).slice(2) +
  Date.now().toString(36);

let localStream = null;

let isBroadcaster = false;

let isMicOn = true;

let isMuted = false;

let backgroundImageData = "";

let currentBroadcasterId = null;

let peerConnections = {};

let pendingIceCandidates = {};

let reconnectTimer = null;


/* =========================================================
   SCREEN
========================================================= */

function showScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(el => el.classList.add("hidden"));

  document
    .getElementById(id)
    .classList.remove("hidden");
}


/* =========================================================
   WEBSOCKET
========================================================= */

function connectWebSocket() {

  if (ws &&
      (ws.readyState === WebSocket.OPEN ||
       ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  ws = new WebSocket(
    protocol + "//" + location.host
  );

  ws.onopen = function() {

    console.log("WebSocket connected");

    sendMessage({
      type: "hello",
      clientId: myId
    });

    setTimeout(requestLiveList, 300);
  };

  ws.onmessage = async function(event) {

    try {

      const data = JSON.parse(event.data);

      await handleMessage(data);

    } catch(error) {

      console.error(
        "message error",
        error
      );

    }

  };

  ws.onclose = function() {

    console.log("WebSocket closed");

    clearTimeout(reconnectTimer);

    reconnectTimer =
      setTimeout(
        connectWebSocket,
        2000
      );

  };

  ws.onerror = function(error) {

    console.error(
      "WebSocket error",
      error
    );

  };

}


function sendMessage(data) {

  if (!ws ||
      ws.readyState !== WebSocket.OPEN) {

    console.warn(
      "WebSocket not connected",
      data
    );

    return false;
  }

  ws.send(JSON.stringify(data));

  return true;
}


/* =========================================================
   MESSAGE
========================================================= */

async function handleMessage(data) {

  switch(data.type) {

    case "live_list":

      renderLiveList(
        data.live
      );

      break;


    case "viewer_joined":

      if (isBroadcaster) {

        await createOfferForViewer(
          data.viewerId
        );

      }

      break;


    case "offer":

      await receiveOffer(data);

      break;


    case "answer":

      await receiveAnswer(data);

      break;


    case "ice_candidate":

      await receiveIceCandidate(data);

      break;


    case "live_started":

      renderLiveList(
        data.live
      );

      break;


    case "live_updated":

      if (
        !isBroadcaster &&
        data.live
      ) {

        applyViewerInfo(
          data.live
        );

      }

      renderLiveList(
        data.live
      );

      break;


    case "live_ended":

      renderLiveList(null);

      if (!isBroadcaster &&
          currentBroadcasterId === data.broadcasterId) {

        document.getElementById(
          "viewerStatus"
        ).textContent =
          "配信が終了しました。";

        closePeerConnections();

      }

      break;


    case "viewer_left":

      if (isBroadcaster) {

        const pc =
          peerConnections[
            data.viewerId
          ];

        if (pc) {

          try {
            pc.close();
          } catch(e) {}

          delete peerConnections[
            data.viewerId
          ];

        }

        delete pendingIceCandidates[
          data.viewerId
        ];

      }

      break;

  }

}


/* =========================================================
   LIVE LIST
========================================================= */

function requestLiveList() {

  sendMessage({
    type: "get_live"
  });

}


function renderLiveList(live) {

  const area =
    document.getElementById(
      "liveList"
    );

  if (!live || !live.active) {

    area.innerHTML =
      '<div class="small">現在配信中のライブはありません。</div>';

    return;
  }

  const safeTitle =
    escapeHtml(
      live.title || "音声ライブ"
    );

  const safeName =
    escapeHtml(
      live.name || "配信者"
    );

  const avatar =
    escapeHtml(
      live.avatar || "🎙️"
    );

  area.innerHTML =

    '<div class="live-card">' +

      '<div class="live-card-avatar">' +
        avatar +
      '</div>' +

      '<div class="live-card-info">' +

        '<div class="live-card-title">' +
          safeTitle +
        '</div>' +

        '<div class="live-card-name">' +
          safeName +
        '</div>' +

        '<span class="badge">🔴 LIVE</span>' +

      '</div>' +

      '<button class="primary" ' +
        'style="width:auto;margin:0" ' +
        'onclick="joinLive()">' +
        '入室' +
      '</button>' +

    '</div>';

}


function escapeHtml(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   CUSTOM SETTINGS
========================================================= */

function getCustomLiveData() {

  const name =
    document
      .getElementById("hostName")
      .value
      .trim() ||
    "配信者";

  const title =
    document
      .getElementById("streamTitle")
      .value
      .trim() ||
    "音声ライブ配信";

  const description =
    document
      .getElementById("streamDescription")
      .value
      .trim();

  const themeColor =
    document
      .getElementById("backgroundColor")
      .value ||
    "#3156ff";

  return {
    name,
    title,
    description,
    themeColor,
    backgroundImage:
      backgroundImageData,
    avatar: "🎙️"
  };

}


function updatePreview() {

  const data =
    getCustomLiveData();

  const preview =
    document.getElementById(
      "customPreview"
    );

  document.getElementById(
    "previewTitle"
  ).textContent =
    data.title;

  document.getElementById(
    "previewDescription"
  ).textContent =
    data.description;

  document.getElementById(
    "previewHost"
  ).textContent =
    data.name;

  preview.style.backgroundColor =
    data.themeColor;

  if (data.backgroundImage) {

    preview.style.backgroundImage =
      "url('" +
      data.backgroundImage +
      "')";

  } else {

    preview.style.backgroundImage =
      "none";

  }

  document.getElementById(
    "colorText"
  ).textContent =
    data.themeColor;

}


function loadBackgroundImage(event) {

  const file =
    event.target.files &&
    event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {

    alert(
      "画像ファイルを選択してください。"
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = function(e) {

    backgroundImageData =
      e.target.result;

    const imagePreview =
      document.getElementById(
        "imagePreview"
      );

    imagePreview.style.backgroundImage =
      "url('" +
      backgroundImageData +
      "')";

    imagePreview.textContent =
      "";

    updatePreview();

  };

  reader.readAsDataURL(file);

}


function applyLiveCustomData(data) {

  document.getElementById(
    "liveTitle"
  ).textContent =
    data.title;

  document.getElementById(
    "liveDescription"
  ).textContent =
    data.description;

  document.getElementById(
    "liveHost"
  ).textContent =
    data.name;

  const livePreview =
    document.getElementById(
      "livePreview"
    );

  livePreview.style.backgroundColor =
    data.themeColor;

  if (data.backgroundImage) {

    livePreview.style.backgroundImage =
      "url('" +
      data.backgroundImage +
      "')";

  } else {

    livePreview.style.backgroundImage =
      "none";

  }

  document.getElementById(
    "liveEditTitle"
  ).value =
    data.title;

  document.getElementById(
    "liveEditDescription"
  ).value =
    data.description;

  document.getElementById(
    "liveEditColor"
  ).value =
    data.themeColor;

}


/* =========================================================
   START LIVE
========================================================= */

async function startLive() {

  if (isBroadcaster) {

    showScreen(
      "liveScreen"
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

  updatePreview();

  const custom =
    getCustomLiveData();

  try {

    document.getElementById(
      "settingStatus"
    ).textContent =
      "🎙️ マイクの許可を確認しています…";

    localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        video: false
      });

  } catch(error) {

    console.error(
      "getUserMedia error",
      error
    );

    document.getElementById(
      "settingStatus"
    ).textContent =
      "❌ マイクを使用できませんでした。";

    alert(
      "マイクを使用できませんでした。\n\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    return;
  }

  isBroadcaster = true;
  isMicOn = true;
  isMuted = false;

  showScreen(
    "liveScreen"
  );

  applyLiveCustomData(
    custom
  );

  document.getElementById(
    "customSettings"
  ).classList.remove("hidden");

  document.getElementById(
    "liveStatus"
  ).textContent =
    "🔴 配信中です";

  updateMicButton();

  sendMessage({
    type: "start_live",
    clientId: myId,
    name: custom.name,
    title: custom.title,
    description: custom.description,
    themeColor: custom.themeColor,
    backgroundImage: custom.backgroundImage,
    avatar: custom.avatar
  });

}


/* =========================================================
   STOP LIVE
========================================================= */

function stopLive() {

  if (!isBroadcaster) {

    leaveViewer();

    return;
  }

  sendMessage({
    type: "stop_live",
    clientId: myId
  });

  closePeerConnections();

  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        try {
          track.stop();
        } catch(e) {}

      });

    localStream = null;
  }

  isBroadcaster = false;

  showScreen(
    "homeScreen"
  );

  requestLiveList();

}


/* =========================================================
   MIC
========================================================= */

function toggleMic() {

  if (!localStream) return;

  const tracks =
    localStream.getAudioTracks();

  if (!tracks.length) return;

  isMicOn =
    !isMicOn;

  tracks.forEach(
    track => {
      track.enabled =
        isMicOn;
    }
  );

  updateMicButton();

}


function updateMicButton() {

  const button =
    document.getElementById(
      "micButton"
    );

  if (!button) return;

  button.textContent =
    isMicOn
      ? "🎙️ マイクON"
      : "🔇 マイクOFF";

}


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

  isMuted =
    !isMuted;

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  if (audio) {

    audio.muted =
      isMuted;

  }

  const button =
    document.getElementById(
      "muteButton"
    );

  if (button) {

    button.textContent =
      isMuted
        ? "🔇 音声OFF"
        : "🔊 音声ON";

  }

}


/* =========================================================
   LIVE CUSTOM UPDATE
========================================================= */

function applyLiveCustom() {

  if (!isBroadcaster) return;

  const title =
    document.getElementById(
      "liveEditTitle"
    ).value.trim() ||
    "音声ライブ配信";

  const description =
    document.getElementById(
      "liveEditDescription"
    ).value.trim();

  const themeColor =
    document.getElementById(
      "liveEditColor"
    ).value ||
    "#3156ff";

  document.getElementById(
    "liveTitle"
  ).textContent =
    title;

  document.getElementById(
    "liveDescription"
  ).textContent =
    description;

  const preview =
    document.getElementById(
      "livePreview"
    );

  preview.style.backgroundColor =
    themeColor;

  sendMessage({
    type: "update_live",
    clientId: myId,
    title,
    description,
    themeColor
  });

  document.getElementById(
    "liveStatus"
  ).textContent =
    "✨ 配信画面を更新しました";

}


/* =========================================================
   WEBRTC - BROADCASTER
========================================================= */

async function createOfferForViewer(
  viewerId
) {

  if (
    !isBroadcaster ||
    !localStream
  ) {
    return;
  }

  try {

    const pc =
      new RTCPeerConnection(
        rtcConfig
      );

    peerConnections[
      viewerId
    ] = pc;

    localStream
      .getAudioTracks()
      .forEach(track => {

        pc.addTrack(
          track,
          localStream
        );

      });

    pc.onicecandidate =
      function(event) {

        if (event.candidate) {

          sendMessage({
            type: "ice_candidate",
            from: myId,
            to: viewerId,
            candidate: event.candidate
          });

        }

      };

    pc.onconnectionstatechange =
      function() {

        console.log(
          "broadcaster connection",
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

          delete pendingIceCandidates[
            viewerId
          ];

        }

      };

    const offer =
      await pc.createOffer();

    await pc.setLocalDescription(
      offer
    );

    sendMessage({
      type: "offer",
      from: myId,
      to: viewerId,
      sdp: pc.localDescription
    });

  } catch(error) {

    console.error(
      "createOffer error",
      error
    );

  }

}


/* =========================================================
   WEBRTC - VIEWER OFFER
========================================================= */

async function receiveOffer(data) {

  if (isBroadcaster) {
    return;
  }

  try {

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
          .then(() => {

            document.getElementById(
              "viewerStatus"
            ).textContent =
              "🔊 音声配信を再生中";

          })
          .catch(() => {

            document.getElementById(
              "viewerStatus"
            ).textContent =
              "🔊 「音声を再生」を押してください";

          });

      };

    pc.onicecandidate =
      function(event) {

        if (event.candidate) {

          sendMessage({
            type: "ice_candidate",
            from: myId,
            to: data.from,
            candidate: event.candidate
          });

        }

      };

    pc.onconnectionstatechange =
      function() {

        console.log(
          "viewer connection",
          pc.connectionState
        );

        if (
          pc.connectionState ===
            "connected"
        ) {

          document.getElementById(
            "viewerStatus"
          ).textContent =
            "🟢 配信に接続しました";

        }

        if (
          pc.connectionState ===
            "failed"
        ) {

          document.getElementById(
            "viewerStatus"
          ).textContent =
            "❌ 接続に失敗しました";

        }

      };

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

    await flushIceCandidates(
      data.from
    );

    const answer =
      await pc.createAnswer();

    await pc.setLocalDescription(
      answer
    );

    sendMessage({
      type: "answer",
      from: myId,
      to: data.from,
      sdp: pc.localDescription
    });

  } catch(error) {

    console.error(
      "receiveOffer error",
      error
    );

    document.getElementById(
      "viewerStatus"
    ).textContent =
      "❌ 接続エラー";

  }

}


/* =========================================================
   WEBRTC - BROADCASTER ANSWER
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

    await flushIceCandidates(
      data.from
    );

  } catch(error) {

    console.error(
      "receiveAnswer error",
      error
    );

  }

}


/* =========================================================
   ICE QUEUE
========================================================= */

function queueIceCandidate(
  peerId,
  candidate
) {

  if (
    !pendingIceCandidates[
      peerId
    ]
  ) {

    pendingIceCandidates[
      peerId
    ] = [];

  }

  pendingIceCandidates[
    peerId
  ].push(candidate);

}


async function flushIceCandidates(
  peerId
) {

  const pc =
    peerConnections[
      peerId
    ];

  if (
    !pc ||
    !pc.remoteDescription
  ) {
    return;
  }

  const candidates =
    pendingIceCandidates[
      peerId
    ] || [];

  for (
    const candidate
    of candidates
  ) {

    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch(error) {

      console.error(
        "ICE flush error",
        error
      );

    }

  }

  delete pendingIceCandidates[
    peerId
  ];

}


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

  if (
    !pc.remoteDescription
  ) {

    queueIceCandidate(
      data.from,
      data.candidate
    );

    return;

  }

  try {

    await pc.addIceCandidate(
      new RTCIceCandidate(
        data.candidate
      )
    );

  } catch(error) {

    console.error(
      "ICE error",
      error
    );

  }

}


/* =========================================================
   CLOSE PEERS
========================================================= */

function closePeerConnections() {

  Object
    .keys(peerConnections)
    .forEach(id => {

      try {

        peerConnections[id]
          .close();

      } catch(e) {}

    });

  peerConnections = {};

  pendingIceCandidates = {};

  currentBroadcasterId = null;

}


/* =========================================================
   JOIN LIVE
========================================================= */

function joinLive() {

  sendMessage({
    type: "join_live",
    viewerId: myId
  });

  showScreen(
    "viewerScreen"
  );

  document.getElementById(
    "viewerStatus"
  ).textContent =
    "🎧 配信に接続しています…";

}


function startViewerAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  if (!audio) return;

  audio.muted =
    false;

  audio.play()
    .then(() => {

      document.getElementById(
        "viewerStatus"
      ).textContent =
        "🔊 音声配信を再生中";

      document.getElementById(
        "viewerAudioButton"
      ).textContent =
        "🔊 再生中";

    })
    .catch(error => {

      console.error(
        "audio play error",
        error
      );

      document.getElementById(
        "viewerStatus"
      ).textContent =
        "音声を再生できませんでした";

    });

}


function leaveViewer() {

  if (currentBroadcasterId) {

    sendMessage({
      type: "viewer_leave",
      viewerId: myId,
      broadcasterId:
        currentBroadcasterId
    });

  }

  closePeerConnections();

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  if (audio) {

    audio.pause();

    audio.srcObject =
      null;

  }

  showScreen(
    "homeScreen"
  );

  requestLiveList();

}


/* =========================================================
   VIEWER CUSTOM
========================================================= */

function applyViewerInfo(live) {

  document.getElementById(
    "viewerTitle"
  ).textContent =
    live.title ||
    "音声ライブ";

  document.getElementById(
    "viewerDescription"
  ).textContent =
    live.description ||
    "";

  document.getElementById(
    "viewerHost"
  ).textContent =
    live.name ||
    "配信者";

  document.getElementById(
    "viewerAvatar"
  ).textContent =
    live.avatar ||
    "🎙️";

  const preview =
    document.getElementById(
      "viewerPreview"
    );

  preview.style.backgroundColor =
    live.themeColor ||
    "#3156ff";

  if (
    live.backgroundImage
  ) {

    preview.style.backgroundImage =
      "url('" +
      live.backgroundImage +
      "')";

  } else {

    preview.style.backgroundImage =
      "none";

  }

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
  "input",
  function(event) {

    if (
      event.target.id ===
        "hostName" ||
      event.target.id ===
        "streamTitle" ||
      event.target.id ===
        "streamDescription" ||
      event.target.id ===
        "backgroundColor"
    ) {

      updatePreview();

    }

  }
);

updatePreview();

connectWebSocket();

</script>

</body>
</html>`;


/* =========================================================
   HTTP SERVER
========================================================= */

const server =
  http.createServer(
    (req, res) => {

      const url =
        new URL(
          req.url,
          "http://" +
          req.headers.host
        );

      if (
        url.pathname === "/" ||
        url.pathname === "/index.html"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8",
            "Cache-Control":
              "no-store"
          }
        );

        res.end(HTML);

        return;
      }

      if (
        url.pathname === "/health"
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
            ok: true,
            live: liveInfo.active
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


/* =========================================================
   WEBSOCKET SERVER
========================================================= */

const wss =
  new WebSocket.Server({
    server
  });


wss.on(
  "connection",
  function(ws) {

    clients.add(ws);

    ws.clientId =
      Math.random()
        .toString(36)
        .slice(2) +
      Date.now().toString(36);

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

        handleServerMessage(
          ws,
          data
        );

      }
    );


    ws.on(
      "close",
      function() {

        clients.delete(ws);

        if (
          broadcaster === ws
        ) {

          stopBroadcast(
            ws
          );

        }

        broadcastLiveList();

      }
    );


    ws.on(
      "error",
      function() {

        clients.delete(ws);

      }
    );

  }
);


/* =========================================================
   SERVER MESSAGE
========================================================= */

function handleServerMessage(
  ws,
  data
) {

  switch(data.type) {


    case "hello":

      ws.clientId =
        data.clientId ||
        ws.clientId;

      sendTo(
        ws,
        {
          type: "connected",
          clientId:
            ws.clientId
        }
      );

      break;


    case "get_live":

      sendTo(
        ws,
        {
          type: "live_list",
          live:
            liveInfo.active
              ? liveInfo
              : null
        }
      );

      break;


    case "start_live":

      startBroadcast(
        ws,
        data
      );

      break;


    case "stop_live":

      if (
        broadcaster === ws
      ) {

        stopBroadcast(
          ws
        );

      }

      break;


    case "update_live":

      if (
        broadcaster === ws &&
        liveInfo.active
      ) {

        liveInfo.title =
          data.title ||
          liveInfo.title;

        liveInfo.description =
          data.description ||
          "";

        liveInfo.themeColor =
          data.themeColor ||
          "#3156ff";

        broadcastLiveUpdate();

      }

      break;


    case "join_live":

      joinLive(
        ws,
        data
      );

      break;


    case "viewer_leave":

      if (
        broadcaster
      ) {

        sendTo(
          broadcaster,
          {
            type: "viewer_left",
            viewerId:
              data.viewerId
          }
        );

      }

      break;


    case "offer":

      forwardToClient(
        data.to,
        {
          type: "offer",
          from: ws.clientId,
          to: data.to,
          sdp: data.sdp
        }
      );

      break;


    case "answer":

      forwardToClient(
        data.to,
        {
          type: "answer",
          from: ws.clientId,
          to: data.to,
          sdp: data.sdp
        }
      );

      break;


    case "ice_candidate":

      forwardToClient(
        data.to,
        {
          type:
            "ice_candidate",
          from:
            ws.clientId,
          to:
            data.to,
          candidate:
            data.candidate
        }
      );

      break;

  }

}


/* =========================================================
   START BROADCAST
========================================================= */

function startBroadcast(
  ws,
  data
) {

  if (
    broadcaster &&
    broadcaster !== ws
  ) {

    sendTo(
      ws,
      {
        type: "error",
        message:
          "現在すでに配信中です。"
      }
    );

    return;
  }

  broadcaster = ws;

  liveInfo = {

    active: true,

    id: ws.clientId,

    name:
      data.name ||
      "配信者",

    title:
      data.title ||
      "音声ライブ配信",

    description:
      data.description ||
      "",

    themeColor:
      data.themeColor ||
      "#3156ff",

    backgroundImage:
      data.backgroundImage ||
      "",

    avatar:
      data.avatar ||
      "🎙️",

    startedAt:
      Date.now()

  };

  broadcastLiveList();

}


/* =========================================================
   STOP BROADCAST
========================================================= */

function stopBroadcast(
  ws
) {

  if (
    broadcaster !== ws
  ) {
    return;
  }

  const broadcasterId =
    ws.clientId;

  broadcaster = null;

  liveInfo = {

    active: false,
    id: null,
    name: "",
    title: "",
    description: "",
    themeColor: "#3156ff",
    backgroundImage: "",
    avatar: "🎙️",
    startedAt: null

  };

  broadcast(
    {
      type:
        "live_ended",
      broadcasterId
    }
  );

  broadcastLiveList();

}


/* =========================================================
   JOIN
========================================================= */

function joinLive(
  ws,
  data
) {

  if (
    !broadcaster ||
    !liveInfo.active
  ) {

    sendTo(
      ws,
      {
        type: "error",
        message:
          "現在配信中ではありません。"
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

  sendTo(
    ws,
    {
      type:
        "live_updated",
      live:
        liveInfo
    }
  );

}


/* =========================================================
   LIVE UPDATE
========================================================= */

function broadcastLiveUpdate() {

  broadcast(
    {
      type:
        "live_updated",
      live:
        liveInfo
    }
  );

}


/* =========================================================
   LIVE LIST
========================================================= */

function broadcastLiveList() {

  broadcast(
    {
      type:
        "live_list",
      live:
        liveInfo.active
          ? liveInfo
          : null
    }
  );

}


/* =========================================================
   HELPERS
========================================================= */

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


function broadcast(data) {

  const message =
    JSON.stringify(data);

  for (
    const ws of clients
  ) {

    if (
      ws.readyState ===
        WebSocket.OPEN
    ) {

      try {

        ws.send(message);

      } catch(error) {

        console.error(
          error
        );

      }

    }

  }

}


function forwardToClient(
  clientId,
  data
) {

  for (
    const ws of clients
  ) {

    if (
      ws.clientId ===
      clientId
    ) {

      sendTo(
        ws,
        data
      );

      return;
    }

  }

}


/* =========================================================
   START SERVER
========================================================= */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "===================================="
    );

    console.log(
      " 音声ライブサーバー起動"
    );

    console.log(
      " Port: " + PORT
    );

    console.log(
      "===================================="
    );

  }
);
