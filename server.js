const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("OK");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(HTML);
});

const wss = new WebSocket.Server({ server });

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

const clients = new Map();

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data) {
  for (const ws of wss.clients) {
    send(ws, data);
  }
}

function getLiveInfo() {
  return {
    active: liveInfo.active,
    id: liveInfo.id,
    name: liveInfo.name,
    title: liveInfo.title,
    description: liveInfo.description,
    themeColor: liveInfo.themeColor,
    backgroundImage: liveInfo.backgroundImage,
    avatar: liveInfo.avatar,
    startedAt: liveInfo.startedAt
  };
}

function cleanText(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanColor(value) {
  if (typeof value !== "string") return "#3156ff";

  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return "#3156ff";
}

function stopLive() {
  liveInfo = {
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

  broadcast({
    type: "live_ended"
  });
}

wss.on("connection", (ws) => {
  const id =
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);

  clients.set(id, {
    ws,
    role: "unknown"
  });

  send(ws, {
    type: "connected",
    id
  });

  send(ws, {
    type: "live_list",
    live: getLiveInfo()
  });

  ws.on("message", async (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch (error) {
      send(ws, {
        type: "error",
        message: "通信データを読み込めませんでした。"
      });
      return;
    }

    const client = clients.get(id);

    if (!client) return;

    try {
      switch (data.type) {

        case "start_live": {
          client.role = "broadcaster";

          liveInfo = {
            active: true,
            id: id,
            name: cleanText(data.name, 50) || "配信者",
            title: cleanText(data.title, 100) || "音声ライブ配信",
            description: cleanText(data.description, 500),
            themeColor: cleanColor(data.themeColor),
            backgroundImage:
              typeof data.backgroundImage === "string"
                ? data.backgroundImage.slice(0, 1500000)
                : "",
            avatar: cleanText(data.avatar, 10) || "🎙️",
            startedAt: Date.now()
          };

          broadcast({
            type: "live_list",
            live: getLiveInfo()
          });

          send(ws, {
            type: "live_started",
            live: getLiveInfo()
          });

          break;
        }

        case "update_live": {
          if (liveInfo.id !== id || !liveInfo.active) {
            return;
          }

          if (typeof data.name === "string") {
            liveInfo.name = cleanText(data.name, 50) || liveInfo.name;
          }

          if (typeof data.title === "string") {
            liveInfo.title =
              cleanText(data.title, 100) || "音声ライブ配信";
          }

          if (typeof data.description === "string") {
            liveInfo.description =
              cleanText(data.description, 500);
          }

          if (typeof data.themeColor === "string") {
            liveInfo.themeColor =
              cleanColor(data.themeColor);
          }

          if (typeof data.backgroundImage === "string") {
            liveInfo.backgroundImage =
              data.backgroundImage.slice(0, 1500000);
          }

          broadcast({
            type: "live_updated",
            live: getLiveInfo()
          });

          break;
        }

        case "stop_live": {
          if (liveInfo.id !== id) {
            return;
          }

          stopLive();
          break;
        }

        case "join_live": {
          client.role = "viewer";

          if (!liveInfo.active) {
            send(ws, {
              type: "live_not_found"
            });
            return;
          }

          send(ws, {
            type: "live_joined",
            live: getLiveInfo(),
            broadcasterId: liveInfo.id
          });

          const broadcaster = clients.get(liveInfo.id);

          if (broadcaster) {
            send(broadcaster.ws, {
              type: "viewer_joined",
              viewerId: id
            });
          }

          break;
        }

        case "viewer_leave": {
          const broadcaster = clients.get(liveInfo.id);

          if (broadcaster) {
            send(broadcaster.ws, {
              type: "viewer_left",
              viewerId: id
            });
          }

          break;
        }

        case "offer": {
          const target = clients.get(data.to);

          if (!target) return;

          send(target.ws, {
            type: "offer",
            from: id,
            sdp: data.sdp
          });

          break;
        }

        case "answer": {
          const target = clients.get(data.to);

          if (!target) return;

          send(target.ws, {
            type: "answer",
            from: id,
            sdp: data.sdp
          });

          break;
        }

        case "ice_candidate": {
          const target = clients.get(data.to);

          if (!target) return;

          send(target.ws, {
            type: "ice_candidate",
            from: id,
            candidate: data.candidate
          });

          break;
        }

        default:
          break;
      }

    } catch (error) {
      console.error("Message handling error:", error);

      send(ws, {
        type: "error",
        message: "サーバー側でエラーが発生しました。"
      });
    }
  });

  ws.on("close", () => {
    const client = clients.get(id);

    if (
      client &&
      liveInfo.active &&
      liveInfo.id === id
    ) {
      stopLive();
    }

    if (
      client &&
      client.role === "viewer"
    ) {
      const broadcaster = clients.get(liveInfo.id);

      if (broadcaster) {
        send(broadcaster.ws, {
          type: "viewer_left",
          viewerId: id
        });
      }
    }

    clients.delete(id);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
});


const HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"
>

<title>音声ライブ</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f5f6fa;
  color: #222;
}

button,
input,
textarea {
  font: inherit;
}

button {
  border: 0;
  cursor: pointer;
}

.page {
  width: 100%;
  min-height: 100vh;
}

.hidden {
  display: none !important;
}

.header {
  height: 64px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #eeeeee;
  position: sticky;
  top: 0;
  z-index: 20;
}

.logo {
  font-size: 21px;
  font-weight: 800;
}

.headerButton {
  padding: 9px 14px;
  border-radius: 12px;
  background: #f0f2f7;
}

.container {
  width: min(720px, 100%);
  margin: auto;
  padding: 20px 16px 40px;
}

.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.05);
}

.mainButton {
  width: 100%;
  padding: 15px;
  border-radius: 15px;
  color: #ffffff;
  background: #3156ff;
  font-weight: 700;
  font-size: 16px;
}

.secondaryButton {
  width: 100%;
  padding: 14px;
  border-radius: 15px;
  background: #eef0f5;
  color: #222;
  font-weight: 700;
}

.dangerButton {
  width: 100%;
  padding: 14px;
  border-radius: 15px;
  background: #ff4d67;
  color: white;
  font-weight: 700;
}

label {
  display: block;
  margin: 15px 0 7px;
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  border: 1px solid #dfe2e8;
  border-radius: 13px;
  padding: 12px;
  outline: none;
  background: #ffffff;
}

textarea {
  min-height: 90px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #3156ff;
}

.colorRow {
  display: flex;
  gap: 12px;
  align-items: center;
}

#themeColor {
  width: 70px;
  height: 46px;
  padding: 3px;
}

.preview {
  border-radius: 20px;
  padding: 25px 18px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  overflow: hidden;
  position: relative;
  background-size: cover;
  background-position: center;
}

.preview::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.25);
}

.preview > * {
  position: relative;
  z-index: 1;
}

.avatar {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: 12px;
}

.previewTitle {
  font-size: 22px;
  font-weight: 800;
}

.previewName {
  margin-top: 6px;
  opacity: .9;
}

.previewDescription {
  margin-top: 12px;
  white-space: pre-wrap;
  opacity: .9;
}

.liveCard {
  border-radius: 20px;
  overflow: hidden;
  color: white;
  margin-bottom: 16px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.liveCardOverlay {
  padding: 20px;
  min-height: 190px;
  background: rgba(0,0,0,.35);
}

.liveBadge {
  display: inline-block;
  background: #ff3152;
  padding: 5px 9px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

.liveTitle {
  font-size: 24px;
  font-weight: 800;
  margin-top: 18px;
}

.liveName {
  margin-top: 7px;
}

.liveDescription {
  margin-top: 10px;
  white-space: pre-wrap;
  opacity: .9;
}

.status {
  margin: 10px 0;
  padding: 11px;
  border-radius: 12px;
  background: #f0f2f7;
  text-align: center;
}

.micButton {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #3156ff;
  color: white;
  font-size: 35px;
  margin: 20px auto;
  display: block;
}

.micButton.muted {
  background: #555;
}

.liveControls {
  display: grid;
  gap: 10px;
}

.sectionTitle {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 14px;
}

.small {
  font-size: 13px;
  color: #777;
  line-height: 1.6;
}

.fileInput {
  padding: 10px;
  background: #f4f5f8;
}

.message {
  margin-top: 12px;
  text-align: center;
  font-weight: 700;
}

.back {
  margin-bottom: 15px;
  background: transparent;
  padding: 5px 0;
  color: #3156ff;
  font-weight: 700;
}

</style>

</head>

<body>

<div id="homePage" class="page">

  <div class="header">
    <div class="logo">🎙️ 音声ライブ</div>

    <button
      class="headerButton"
      onclick="showPage('settingPage')"
    >
      配信設定
    </button>
  </div>

  <div class="container">

    <div class="card">

      <div class="sectionTitle">
        配信する
      </div>

      <p class="small">
        マイクを使って音声ライブ配信ができます。
      </p>

      <button
        class="mainButton"
        onclick="showPage('settingPage')"
      >
        🎙️ 配信を作る
      </button>

    </div>

    <div class="card">

      <div class="sectionTitle">
        現在の配信
      </div>

      <div id="liveList">
        <div class="status">
          現在配信中のライブはありません
        </div>
      </div>

    </div>

  </div>

</div>


<div id="settingPage" class="page hidden">

  <div class="header">

    <button
      class="headerButton"
      onclick="showPage('homePage')"
    >
      ← 戻る
    </button>

    <div class="logo">
      配信設定
    </div>

    <div style="width:60px"></div>

  </div>

  <div class="container">

    <div class="card">

      <div class="sectionTitle">
        配信画面をカスタム
      </div>

      <label>
        配信者名
      </label>

      <input
        id="hostName"
        maxlength="50"
        placeholder="配信者名"
        value="配信者"
        oninput="updatePreview()"
      >

      <label>
        配信タイトル
      </label>

      <input
        id="streamTitle"
        maxlength="100"
        placeholder="配信タイトル"
        value="音声ライブ配信"
        oninput="updatePreview()"
      >

      <label>
        配信説明
      </label>

      <textarea
        id="streamDescription"
        maxlength="500"
        placeholder="配信内容を入力してください"
        oninput="updatePreview()"
      ></textarea>

      <label>
        背景カラー
      </label>

      <div class="colorRow">

        <input
          type="color"
          id="themeColor"
          value="#3156ff"
          onchange="updatePreview()"
        >

        <span class="small">
          配信画面の基本カラー
        </span>

      </div>

      <label>
        背景画像
      </label>

      <input
        class="fileInput"
        type="file"
        id="backgroundImage"
        accept="image/*"
        onchange="loadBackgroundImage(event)"
      >

      <p class="small">
        スマホの写真から背景画像を選べます。
      </p>

    </div>


    <div class="card">

      <div class="sectionTitle">
        配信プレビュー
      </div>

      <div
        id="preview"
        class="preview"
      >

        <div
          id="previewAvatar"
          class="avatar"
        >
          🎙️
        </div>

        <div
          id="previewTitle"
          class="previewTitle"
        >
          音声ライブ配信
        </div>

        <div
          id="previewName"
          class="previewName"
        >
          配信者
        </div>

        <div
          id="previewDescription"
          class="previewDescription"
        ></div>

      </div>

    </div>


    <div class="card">

      <button
        class="mainButton"
        onclick="startLive()"
      >
        🎙️ 配信開始
      </button>

      <div
        id="settingMessage"
        class="message"
      ></div>

    </div>

  </div>

</div>


<div id="livePage" class="page hidden">

  <div class="header">

    <div class="logo">
      🔴 配信中
    </div>

    <button
      class="headerButton"
      onclick="showPage('homePage')"
    >
      ホーム
    </button>

  </div>

  <div class="container">

    <div
      id="liveScreen"
      class="preview"
    >

      <div
        id="liveAvatar"
        class="avatar"
      >
        🎙️
      </div>

      <div
        id="liveTitle"
        class="previewTitle"
      >
        音声ライブ配信
      </div>

      <div
        id="liveName"
        class="previewName"
      >
        配信者
      </div>

      <div
        id="liveDescription"
        class="previewDescription"
      ></div>

    </div>


    <div class="card">

      <div
        id="liveStatus"
        class="status"
      >
        配信準備中
      </div>

      <button
        id="micButton"
        class="micButton"
        onclick="toggleMute()"
      >
        🎙️
      </button>

      <div class="small" style="text-align:center">
        マイクボタンでミュートできます
      </div>

    </div>


    <div class="card">

      <div class="sectionTitle">
        配信内容を変更
      </div>

      <label>
        配信タイトル
      </label>

      <input
        id="editTitle"
        maxlength="100"
        oninput="sendLiveUpdate()"
      >

      <label>
        配信説明
      </label>

      <textarea
        id="editDescription"
        maxlength="500"
        oninput="sendLiveUpdate()"
      ></textarea>

      <label>
        背景カラー
      </label>

      <input
        type="color"
        id="editColor"
        onchange="sendLiveUpdate()"
      >

    </div>


    <div class="card">

      <button
        class="dangerButton"
        onclick="stopLive()"
      >
        ■ 配信終了
      </button>

    </div>

  </div>

</div>


<div id="viewerPage" class="page hidden">

  <div class="header">

    <button
      class="headerButton"
      onclick="leaveLive()"
    >
      ← 戻る
    </button>

    <div class="logo">
      🔴 LIVE
    </div>

    <div style="width:60px"></div>

  </div>

  <div class="container">

    <div
      id="viewerScreen"
      class="preview"
    >

      <div
        id="viewerAvatar"
        class="avatar"
      >
        🎙️
      </div>

      <div
        id="viewerTitle"
        class="previewTitle"
      >
        音声ライブ配信
      </div>

      <div
        id="viewerName"
        class="previewName"
      >
        配信者
      </div>

      <div
        id="viewerDescription"
        class="previewDescription"
      ></div>

    </div>


    <div class="card">

      <div
        id="viewerStatus"
        class="status"
      >
        接続しています...
      </div>

      <audio
        id="remoteAudio"
        controls
        autoplay
        playsinline
        style="width:100%"
      ></audio>

    </div>

  </div>

</div>


<script>

let socket = null;

let myId = null;

let isBroadcaster = false;

let localStream = null;

let isMuted = false;

let currentLive = null;

let currentBackgroundImage = "";

const peerConnections = {};

const pendingIceCandidates = {};

let reconnectTimer = null;


function getSocketUrl() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return protocol +
    "//" +
    location.host;

}


function connectWebSocket() {

  if (
    socket &&
    (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )
  ) {
    return;
  }

  socket = new WebSocket(getSocketUrl());

  socket.onopen = () => {

    console.log("WebSocket connected");

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

  };


  socket.onmessage = async (event) => {

    let data;

    try {
      data = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    await handleMessage(data);

  };


  socket.onclose = () => {

    console.log("WebSocket closed");

    reconnectTimer = setTimeout(
      connectWebSocket,
      2000
    );

  };


  socket.onerror = (error) => {

    console.error(
      "WebSocket error",
      error
    );

  };

}


function sendMessage(data) {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {
    socket.send(JSON.stringify(data));
    return true;
  }

  return false;

}


async function handleMessage(data) {

  switch (data.type) {

    case "connected":

      myId = data.id;

      break;


    case "live_list":

      renderLiveList(data.live);

      break;


    case "live_started":

      currentLive = data.live;

      renderBroadcasterLive(data.live);

      showPage("livePage");

      break;


    case "live_updated":

      currentLive = data.live;

      if (isBroadcaster) {
        renderBroadcasterLive(data.live);
      } else {
        renderViewer(data.live);
      }

      renderLiveList(data.live);

      break;


    case "live_ended":

      currentLive = null;

      renderLiveList(null);

      if (!isBroadcaster) {
        document.getElementById(
          "viewerStatus"
        ).textContent =
          "配信が終了しました";

        setTimeout(() => {
          showPage("homePage");
        }, 1000);
      }

      break;


    case "live_joined":

      currentLive = data.live;

      renderViewer(data.live);

      showPage("viewerPage");

      document.getElementById(
        "viewerStatus"
      ).textContent =
        "配信に接続しています...";

      break;


    case "live_not_found":

      alert("現在配信中のライブがありません");

      break;


    case "viewer_joined":

      if (isBroadcaster) {

        await createOfferForViewer(
          data.viewerId
        );

      }

      break;


    case "viewer_left":

      closePeerConnection(
        data.viewerId
      );

      break;


    case "offer":

      await handleOffer(data);

      break;


    case "answer":

      await handleAnswer(data);

      break;


    case "ice_candidate":

      await receiveIceCandidate(data);

      break;


    case "error":

      console.error(
        data.message
      );

      break;

  }

}


function showPage(pageId) {

  const pages = [
    "homePage",
    "settingPage",
    "livePage",
    "viewerPage"
  ];

  pages.forEach(id => {

    document
      .getElementById(id)
      .classList.add("hidden");

  });

  document
    .getElementById(pageId)
    .classList.remove("hidden");

}


function updatePreview() {

  const name =
    document.getElementById(
      "hostName"
    ).value || "配信者";

  const title =
    document.getElementById(
      "streamTitle"
    ).value || "音声ライブ配信";

  const description =
    document.getElementById(
      "streamDescription"
    ).value || "";

  const color =
    document.getElementById(
      "themeColor"
    ).value || "#3156ff";


  document.getElementById(
    "previewName"
  ).textContent = name;

  document.getElementById(
    "previewTitle"
  ).textContent = title;

  document.getElementById(
    "previewDescription"
  ).textContent = description;

  document.getElementById(
    "preview"
  ).style.backgroundColor = color;


  if (currentBackgroundImage) {

    document.getElementById(
      "preview"
    ).style.backgroundImage =
      "url('" +
      currentBackgroundImage +
      "')";

  } else {

    document.getElementById(
      "preview"
    ).style.backgroundImage =
      "none";

  }

}


function loadBackgroundImage(event) {

  const file =
    event.target.files &&
    event.target.files[0];

  if (!file) return;


  if (!file.type.startsWith("image/")) {

    alert("画像ファイルを選択してください");

    return;

  }


  const reader = new FileReader();


  reader.onload = () => {

    currentBackgroundImage =
      reader.result;

    updatePreview();

  };


  reader.readAsDataURL(file);

}


async function startLive() {

  const message =
    document.getElementById(
      "settingMessage"
    );

  message.textContent =
    "マイクを確認しています...";


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    message.textContent =
      "このブラウザではマイクを使用できません。";

    return;

  }


  try {

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


    isBroadcaster = true;


    const name =
      document.getElementById(
        "hostName"
      ).value.trim() ||
      "配信者";

    const title =
      document.getElementById(
        "streamTitle"
      ).value.trim() ||
      "音声ライブ配信";

    const description =
      document.getElementById(
        "streamDescription"
      ).value.trim();

    const themeColor =
      document.getElementById(
        "themeColor"
      ).value ||
      "#3156ff";


    message.textContent =
      "配信を開始しています...";


    sendMessage({

      type: "start_live",

      name: name,

      title: title,

      description: description,

      themeColor: themeColor,

      backgroundImage:
        currentBackgroundImage,

      avatar: "🎙️"

    });


  } catch (error) {

    console.error(
      "getUserMedia error:",
      error
    );

    message.textContent =
      "マイクを使用できませんでした。ブラウザのマイク許可を確認してください。";

    isBroadcaster = false;

  }

}


function renderBroadcasterLive(live) {

  if (!live) return;


  const screen =
    document.getElementById(
      "liveScreen"
    );


  screen.style.backgroundColor =
    live.themeColor ||
    "#3156ff";


  if (live.backgroundImage) {

    screen.style.backgroundImage =
      "url('" +
      live.backgroundImage +
      "')";

  } else {

    screen.style.backgroundImage =
      "none";

  }


  document.getElementById(
    "liveAvatar"
  ).textContent =
    live.avatar || "🎙️";

  document.getElementById(
    "liveTitle"
  ).textContent =
    live.title;

  document.getElementById(
    "liveName"
  ).textContent =
    live.name;

  document.getElementById(
    "liveDescription"
  ).textContent =
    live.description || "";


  document.getElementById(
    "liveStatus"
  ).textContent =
    "🔴 配信中";


  document.getElementById(
    "editTitle"
  ).value =
    live.title || "";


  document.getElementById(
    "editDescription"
  ).value =
    live.description || "";


  document.getElementById(
    "editColor"
  ).value =
    live.themeColor || "#3156ff";

}


function renderViewer(live) {

  if (!live) return;


  const screen =
    document.getElementById(
      "viewerScreen"
    );


  screen.style.backgroundColor =
    live.themeColor ||
    "#3156ff";


  if (live.backgroundImage) {

    screen.style.backgroundImage =
      "url('" +
      live.backgroundImage +
      "')";

  } else {

    screen.style.backgroundImage =
      "none";

  }


  document.getElementById(
    "viewerAvatar"
  ).textContent =
    live.avatar || "🎙️";


  document.getElementById(
    "viewerTitle"
  ).textContent =
    live.title;


  document.getElementById(
    "viewerName"
  ).textContent =
    live.name;


  document.getElementById(
    "viewerDescription"
  ).textContent =
    live.description || "";

}


function renderLiveList(live) {

  const list =
    document.getElementById(
      "liveList"
    );


  if (
    !live ||
    !live.active
  ) {

    list.innerHTML =
      '<div class="status">' +
      '現在配信中のライブはありません' +
      '</div>';

    return;

  }


  const background =
    live.backgroundImage
      ? "background-image:url('" +
        live.backgroundImage +
        "');"
      : "background-color:" +
        (live.themeColor || "#3156ff") +
        ";";


  list.innerHTML =

    '<div class="liveCard" style="' +
    background +
    '">' +

      '<div class="liveCardOverlay">' +

        '<span class="liveBadge">' +
        'LIVE' +
        '</span>' +

        '<div class="liveTitle">' +
        escapeHtml(live.title) +
        '</div>' +

        '<div class="liveName">' +
        escapeHtml(live.name) +
        '</div>' +

        '<div class="liveDescription">' +
        escapeHtml(live.description || "") +
        '</div>' +

        '<button ' +
        'class="mainButton" ' +
        'style="margin-top:20px;background:white;color:#222;" ' +
        'onclick="joinLive()">' +
        '👂 この配信を聴く' +
        '</button>' +

      '</div>' +

    '</div>';

}


function escapeHtml(text) {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function joinLive() {

  if (!currentLive || !currentLive.active) {

    alert(
      "現在配信中のライブがありません"
    );

    return;

  }


  sendMessage({

    type: "join_live"

  });

}


function leaveLive() {

  sendMessage({

    type: "viewer_leave"

  });


  const audio =
    document.getElementById(
      "remoteAudio"
    );

  audio.srcObject = null;


  for (
    const peerId in peerConnections
  ) {

    closePeerConnection(peerId);

  }


  showPage("homePage");

}


async function createOfferForViewer(
  viewerId
) {

  if (
    !localStream ||
    !isBroadcaster
  ) {
    return;
  }


  const oldPc =
    peerConnections[viewerId];

  if (oldPc) {

    try {
      oldPc.close();
    } catch (error) {}

    delete peerConnections[viewerId];

  }


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[viewerId] =
    pc;


  localStream
    .getTracks()
    .forEach(track => {

      pc.addTrack(
        track,
        localStream
      );

    });


  pc.onicecandidate =
    event => {

      if (event.candidate) {

        sendMessage({

          type: "ice_candidate",

          to: viewerId,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    () => {

      console.log(
        "Broadcaster connection:",
        viewerId,
        pc.connectionState
      );

      if (
        pc.connectionState ===
        "failed" ||
        pc.connectionState ===
        "closed"
      ) {

        closePeerConnection(
          viewerId
        );

      }

    };


  try {

    const offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    sendMessage({

      type: "offer",

      to: viewerId,

      sdp: pc.localDescription

    });


  } catch (error) {

    console.error(
      "createOffer error:",
      error
    );

  }

}


async function handleOffer(data) {

  if (isBroadcaster) {
    return;
  }


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[data.from] =
    pc;


  pc.onicecandidate =
    event => {

      if (event.candidate) {

        sendMessage({

          type: "ice_candidate",

          to: data.from,

          candidate:
            event.candidate

        });

      }

    };


  pc.ontrack =
    event => {

      const audio =
        document.getElementById(
          "remoteAudio"
        );


      if (event.streams &&
          event.streams[0]) {

        audio.srcObject =
          event.streams[0];

      } else {

        const stream =
          new MediaStream();

        stream.addTrack(
          event.track
        );

        audio.srcObject =
          stream;

      }


      audio.play().catch(
        error => {
          console.log(
            "Audio autoplay waiting:",
            error
          );
        }
      );


      document.getElementById(
        "viewerStatus"
      ).textContent =
        "🔴 配信を再生中";

    };


  pc.onconnectionstatechange =
    () => {

      console.log(
        "Viewer connection:",
        pc.connectionState
      );


      const status =
        document.getElementById(
          "viewerStatus"
        );


      if (
        pc.connectionState ===
        "connected"
      ) {

        status.textContent =
          "🔴 接続しました";

      }


      if (
        pc.connectionState ===
        "failed"
      ) {

        status.textContent =
          "接続に失敗しました";

      }

    };


  try {

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

      to: data.from,

      sdp: pc.localDescription

    });


  } catch (error) {

    console.error(
      "handleOffer error:",
      error
    );

    document.getElementById(
      "viewerStatus"
    ).textContent =
      "接続エラーが発生しました";

  }

}


async function handleAnswer(data) {

  const pc =
    peerConnections[data.from];


  if (!pc) {
    return;
  }


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


    await flushIceCandidates(
      data.from
    );


  } catch (error) {

    console.error(
      "handleAnswer error:",
      error
    );

  }

}


function queueIceCandidate(
  peerId,
  candidate
) {

  if (
    !pendingIceCandidates[peerId]
  ) {

    pendingIceCandidates[peerId] =
      [];

  }


  pendingIceCandidates[peerId]
    .push(candidate);

}


async function flushIceCandidates(
  peerId
) {

  const pc =
    peerConnections[peerId];


  if (
    !pc ||
    !pc.remoteDescription
  ) {

    return;

  }


  const candidates =
    pendingIceCandidates[peerId] ||
    [];


  for (
    const candidate of candidates
  ) {

    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch (error) {

      console.error(
        "ICE flush error:",
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
    peerConnections[data.from];


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

  } catch (error) {

    console.error(
      "ICE error:",
      error
    );

  }

}


function closePeerConnection(
  peerId
) {

  const pc =
    peerConnections[peerId];


  if (pc) {

    try {
      pc.close();
    } catch (error) {}

    delete peerConnections[
      peerId
    ];

  }


  delete pendingIceCandidates[
    peerId
  ];

}


function toggleMute() {

  if (!localStream) {
    return;
  }


  const tracks =
    localStream.getAudioTracks();


  if (!tracks.length) {
    return;
  }


  isMuted = !isMuted;


  tracks.forEach(
    track => {
      track.enabled =
        !isMuted;
    }
  );


  const button =
    document.getElementById(
      "micButton"
    );


  if (isMuted) {

    button.textContent =
      "🔇";

    button.classList.add(
      "muted"
    );

    document.getElementById(
      "liveStatus"
    ).textContent =
      "🔇 ミュート中";

  } else {

    button.textContent =
      "🎙️";

    button.classList.remove(
      "muted"
    );

    document.getElementById(
      "liveStatus"
    ).textContent =
      "🔴 配信中";

  }

}


let updateTimer = null;


function sendLiveUpdate() {

  if (
    !isBroadcaster ||
    !currentLive ||
    !currentLive.active
  ) {

    return;

  }


  clearTimeout(
    updateTimer
  );


  updateTimer =
    setTimeout(() => {

      const title =
        document.getElementById(
          "editTitle"
        ).value.trim();


      const description =
        document.getElementById(
          "editDescription"
        ).value.trim();


      const color =
        document.getElementById(
          "editColor"
        ).value;


      sendMessage({

        type: "update_live",

        title:
          title || "音声ライブ配信",

        description:
          description,

        themeColor:
          color

      });

    }, 300);

}


function stopLive() {

  if (!isBroadcaster) {
    return;
  }


  if (
    !confirm(
      "配信を終了しますか？"
    )
  ) {

    return;

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        try {
          track.stop();
        } catch (error) {}

      });

    localStream = null;

  }


  for (
    const peerId in peerConnections
  ) {

    closePeerConnection(
      peerId
    );

  }


  sendMessage({

    type: "stop_live"

  });


  isBroadcaster = false;

  isMuted = false;

  currentLive = null;


  document.getElementById(
    "micButton"
  ).textContent =
    "🎙️";


  document.getElementById(
    "micButton"
  ).classList.remove(
    "muted"
  );


  showPage(
    "homePage"
  );

}


window.addEventListener(
  "beforeunload",
  () => {

    if (
      isBroadcaster &&
      localStream
    ) {

      localStream
        .getTracks()
        .forEach(
          track => track.stop()
        );

      sendMessage({
        type: "stop_live"
      });

    }

  }
);


document.addEventListener(
  "DOMContentLoaded",
  () => {

    connectWebSocket();

    updatePreview();

  }
);

</script>

</body>
</html>
`;
