const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("OK");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8"
  });

  res.end(HTML);
});

const wss = new WebSocket.Server({ server });

let nextId = 1;
const clients = new Map();

let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "ぼたもち",
  viewers: 0,
  likes: 0,
  background: ""
};

const comments = [];

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data, except = null) {
  const message = JSON.stringify(data);

  for (const client of clients.values()) {
    if (client.ws !== except && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function updateViewers() {
  let count = 0;

  for (const client of clients.values()) {
    if (client.role === "viewer") {
      count++;
    }
  }

  liveInfo.viewers = count;

  broadcast({
    type: "live-info",
    liveInfo
  });
}

function sendInitialData(ws) {
  send(ws, {
    type: "live-info",
    liveInfo
  });

  send(ws, {
    type: "comments",
    comments: comments.slice(-50)
  });
}

wss.on("connection", (ws) => {
  const id = nextId++;

  const client = {
    id,
    ws,
    role: null,
    name: ""
  };

  clients.set(id, client);

  send(ws, {
    type: "welcome",
    id
  });

  sendInitialData(ws);

  ws.on("message", (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    /* =========================
       JOIN
    ========================= */

    if (data.type === "join") {
      client.role = data.role || null;
      client.name = data.name || "名無し";

      if (client.role === "host") {
        broadcaster = client;

        liveInfo.active = true;
        liveInfo.id = client.id;
        liveInfo.name = client.name || "ぼたもち";
        liveInfo.viewers = 0;
        liveInfo.likes = 0;
        liveInfo.background = "";

        comments.length = 0;

        broadcast({
          type: "live-started",
          liveInfo
        });

        send(ws, {
          type: "host-ready",
          liveInfo
        });
      }

      if (client.role === "viewer") {
        updateViewers();

        if (broadcaster) {
          send(broadcaster.ws, {
            type: "viewer-joined",
            viewerId: client.id
          });
        }

        send(ws, {
          type: "live-info",
          liveInfo
        });
      }

      return;
    }

    /* =========================
       WEBRTC SIGNAL
    ========================= */

    if (data.type === "signal") {
      const target = clients.get(Number(data.target));

      if (target) {
        send(target.ws, {
          type: "signal",
          from: client.id,
          data: data.data
        });
      }

      return;
    }

    /* =========================
       配信開始
    ========================= */

    if (data.type === "stream-started") {
      if (client.role !== "host") return;

      liveInfo.active = true;

      broadcast({
        type: "stream-started",
        liveInfo
      });

      return;
    }

    /* =========================
       配信終了
    ========================= */

    if (data.type === "stream-stopped") {
      if (client.role !== "host") return;

      stopLive();
      return;
    }

    /* =========================
       配信者情報変更
    ========================= */

    if (data.type === "update-profile") {
      if (client.role !== "host") return;

      if (typeof data.name === "string" && data.name.trim()) {
        liveInfo.name = data.name.trim().slice(0, 30);
      }

      broadcast({
        type: "live-info",
        liveInfo
      });

      return;
    }

    /* =========================
       背景画像変更
    ========================= */

    if (data.type === "background") {
      if (client.role !== "host") return;

      if (
        typeof data.background === "string" &&
        data.background.startsWith("data:image/")
      ) {
        /*
          大きすぎる画像を防止
        */
        if (data.background.length > 8 * 1024 * 1024) {
          send(ws, {
            type: "error",
            message: "画像が大きすぎます。8MB以下にしてください。"
          });
          return;
        }

        liveInfo.background = data.background;

        broadcast({
          type: "background",
          background: liveInfo.background
        });

        broadcast({
          type: "live-info",
          liveInfo
        });
      }

      return;
    }

    /* =========================
       背景を元に戻す
    ========================= */

    if (data.type === "remove-background") {
      if (client.role !== "host") return;

      liveInfo.background = "";

      broadcast({
        type: "background",
        background: ""
      });

      broadcast({
        type: "live-info",
        liveInfo
      });

      return;
    }

    /* =========================
       コメント
    ========================= */

    if (data.type === "comment") {
      if (client.role !== "viewer" && client.role !== "host") {
        return;
      }

      let text = String(data.text || "").trim();

      if (!text) return;

      /*
        コメント最大100文字
      */
      text = text.slice(0, 100);

      const comment = {
        id: Date.now() + "-" + Math.random().toString(16).slice(2),
        name:
          client.role === "host"
            ? liveInfo.name
            : client.name || "名無し",
        text,
        host: client.role === "host",
        time: Date.now()
      };

      comments.push(comment);

      if (comments.length > 200) {
        comments.shift();
      }

      broadcast({
        type: "new-comment",
        comment
      });

      return;
    }

    /* =========================
       いいね
    ========================= */

    if (data.type === "like") {
      liveInfo.likes++;

      broadcast({
        type: "like",
        likes: liveInfo.likes
      });

      return;
    }

    /* =========================
       視聴者名前変更
    ========================= */

    if (data.type === "set-name") {
      client.name =
        String(data.name || "名無し")
          .trim()
          .slice(0, 20) || "名無し";

      return;
    }
  });

  ws.on("close", () => {
    clients.delete(id);

    if (client.role === "host" && broadcaster === client) {
      stopLive();
    }

    if (client.role === "viewer") {
      updateViewers();

      if (broadcaster) {
        send(broadcaster.ws, {
          type: "viewer-left",
          viewerId: client.id
        });
      }
    }
  });
});

function stopLive() {
  liveInfo.active = false;
  liveInfo.id = null;
  liveInfo.viewers = 0;
  liveInfo.background = "";

  broadcast({
    type: "live-ended"
  });

  broadcaster = null;

  for (const client of clients.values()) {
    if (client.role === "viewer") {
      send(client.ws, {
        type: "live-info",
        liveInfo
      });
    }
  }
}


/* =========================================================
   HTML
========================================================= */

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
  height: 100%;
  background: #030510;
  color: white;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  overflow-x: hidden;
}

button,
input {
  font: inherit;
}

button {
  border: 0;
  cursor: pointer;
}


/* =====================================================
   HOME
===================================================== */

#home {
  min-height: 100vh;
  padding-bottom: 90px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 62px;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    linear-gradient(
      180deg,
      rgba(3,5,16,.98),
      rgba(3,5,16,.88)
    );

  border-bottom: 1px solid rgba(255,255,255,.08);
}

.logo {
  font-size: 22px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #fff,
      #aeeaff,
      #b99cff
    );

  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.home-content {
  padding: 22px 16px;
}

.hero {
  min-height: 390px;

  border-radius: 28px;

  padding: 35px 22px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  overflow: hidden;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.05),
      rgba(0,0,0,.82)
    ),
    radial-gradient(
      circle at 70% 25%,
      rgba(140,130,255,.35),
      transparent 35%
    ),
    radial-gradient(
      circle at 25% 30%,
      rgba(100,220,255,.18),
      transparent 35%
    );

  border: 1px solid rgba(255,255,255,.1);
}

.hero h1 {
  font-size: 32px;
  margin: 0 0 12px;
  line-height: 1.25;
}

.hero p {
  color: rgba(255,255,255,.78);
  line-height: 1.7;
  margin: 0;
}


/* =====================================================
   BUTTON
===================================================== */

.primary-btn {
  width: 100%;
  margin-top: 22px;

  padding: 16px;

  border-radius: 18px;

  color: white;

  font-weight: 800;

  background:
    linear-gradient(
      135deg,
      #765cff,
      #a74fff
    );

  box-shadow:
    0 10px 35px rgba(120,80,255,.25);
}

.secondary-btn {
  padding: 13px 18px;

  border-radius: 14px;

  color: white;

  background: rgba(255,255,255,.1);

  border: 1px solid rgba(255,255,255,.12);
}


/* =====================================================
   LIVE SCREEN
===================================================== */

#liveScreen {
  position: fixed;
  inset: 0;

  z-index: 1000;

  display: none;

  background: #02030a;
}

#liveScreen.show {
  display: block;
}


/*
   配信背景
*/

.live-background {
  position: absolute;
  inset: 0;

  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(100,100,255,.28),
      transparent 45%
    ),
    linear-gradient(
      180deg,
      #101020,
      #030510
    );

  background-size: cover;
  background-position: center;

  transition:
    background-image .3s ease;
}

.live-background::after {
  content: "";

  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.25),
      rgba(0,0,0,.18) 45%,
      rgba(0,0,0,.82)
    );
}


/* =====================================================
   LIVE TOP
===================================================== */

.live-top {
  position: absolute;

  top: 0;
  left: 0;
  right: 0;

  z-index: 10;

  padding:
    calc(env(safe-area-inset-top) + 12px)
    14px
    12px;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.live-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 44px;
  height: 44px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 22px;

  background:
    linear-gradient(
      135deg,
      #6e5cff,
      #b15cff
    );

  border: 2px solid rgba(255,255,255,.6);
}

.live-name {
  font-weight: 800;
}

.live-badge {
  display: inline-flex;

  margin-top: 3px;

  padding: 3px 8px;

  border-radius: 20px;

  font-size: 11px;
  font-weight: 800;

  background: #ff315d;
}

.viewer-count {
  padding: 8px 12px;

  border-radius: 20px;

  background: rgba(0,0,0,.45);

  backdrop-filter: blur(10px);

  font-size: 13px;
}


/* =====================================================
   VOICE CENTER
===================================================== */

.voice-center {
  position: absolute;

  left: 0;
  right: 0;

  top: 38%;

  z-index: 5;

  text-align: center;
}

.voice-circle {
  width: 130px;
  height: 130px;

  margin: auto;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 55px;

  background:
    radial-gradient(
      circle,
      rgba(180,150,255,.5),
      rgba(80,60,150,.15)
    );

  border:
    1px solid rgba(255,255,255,.3);

  box-shadow:
    0 0 60px rgba(120,90,255,.35);

  animation: pulse 2.4s infinite;
}

@keyframes pulse {

  0% {
    transform: scale(1);
    box-shadow:
      0 0 30px rgba(120,90,255,.25);
  }

  50% {
    transform: scale(1.05);
    box-shadow:
      0 0 70px rgba(120,90,255,.45);
  }

  100% {
    transform: scale(1);
    box-shadow:
      0 0 30px rgba(120,90,255,.25);
  }

}

.voice-text {
  margin-top: 16px;

  font-size: 16px;
  font-weight: 700;
}


/* =====================================================
   COMMENTS
===================================================== */

.comments {
  position: absolute;

  z-index: 10;

  left: 14px;
  right: 14px;

  bottom: 108px;

  height: 190px;

  overflow-y: auto;

  display: flex;
  flex-direction: column;

  justify-content: flex-end;

  pointer-events: none;
}

.comment {
  width: fit-content;
  max-width: 90%;

  margin-top: 7px;

  padding: 7px 12px;

  border-radius: 15px;

  background:
    rgba(0,0,0,.48);

  backdrop-filter: blur(8px);

  font-size: 14px;

  line-height: 1.4;

  animation: commentIn .2s ease;
}

.comment.host {
  border:
    1px solid rgba(180,150,255,.5);
}

.comment-name {
  font-weight: 800;
  margin-right: 5px;
}

@keyframes commentIn {

  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }

}


/* =====================================================
   BOTTOM
===================================================== */

.live-bottom {
  position: absolute;

  z-index: 20;

  left: 0;
  right: 0;
  bottom: 0;

  padding:
    10px
    12px
    calc(env(safe-area-inset-bottom) + 12px);

  background:
    linear-gradient(
      transparent,
      rgba(0,0,0,.88) 35%
    );
}

.comment-row {
  display: flex;
  gap: 8px;
}

.comment-input {
  flex: 1;

  min-width: 0;

  padding: 13px 15px;

  border-radius: 25px;

  outline: none;

  border:
    1px solid rgba(255,255,255,.15);

  color: white;

  background:
    rgba(0,0,0,.55);

  backdrop-filter: blur(10px);
}

.comment-input::placeholder {
  color: rgba(255,255,255,.55);
}

.send-comment {
  width: 50px;

  border-radius: 50%;

  color: white;

  background:
    linear-gradient(
      135deg,
      #765cff,
      #ad50ff
    );
}

.live-actions {
  display: flex;

  gap: 9px;

  margin-top: 10px;
}

.live-action {
  flex: 1;

  padding: 11px;

  border-radius: 15px;

  color: white;

  background:
    rgba(255,255,255,.1);

  border:
    1px solid rgba(255,255,255,.1);
}

.like-button {
  color: white;
}

.like-button.liked {
  background: rgba(255,50,100,.3);
}


/* =====================================================
   HOST CONTROL
===================================================== */

#hostControls {
  display: none;

  position: absolute;

  z-index: 50;

  top: 75px;
  right: 12px;

  width: 220px;

  padding: 14px;

  border-radius: 20px;

  background:
    rgba(15,15,25,.92);

  backdrop-filter: blur(20px);

  border:
    1px solid rgba(255,255,255,.12);

  box-shadow:
    0 15px 50px rgba(0,0,0,.5);
}

#hostControls.show {
  display: block;
}

.control-title {
  font-weight: 900;
  margin-bottom: 12px;
}

.control-button {
  width: 100%;

  padding: 12px;

  margin-top: 8px;

  border-radius: 13px;

  color: white;

  background:
    rgba(255,255,255,.1);
}

.control-button.danger {
  background:
    rgba(255,40,70,.25);
}

.file-input {
  display: none;
}


/* =====================================================
   NAME MODAL
===================================================== */

.modal {
  position: fixed;
  inset: 0;

  z-index: 2000;

  display: none;

  align-items: center;
  justify-content: center;

  padding: 20px;

  background:
    rgba(0,0,0,.7);

  backdrop-filter: blur(10px);
}

.modal.show {
  display: flex;
}

.modal-box {
  width: 100%;
  max-width: 360px;

  padding: 22px;

  border-radius: 25px;

  background: #11121d;

  border:
    1px solid rgba(255,255,255,.12);
}

.modal-box h2 {
  margin-top: 0;
}

.name-input {
  width: 100%;

  padding: 14px;

  border-radius: 13px;

  border: 1px solid rgba(255,255,255,.15);

  outline: none;

  color: white;

  background: rgba(255,255,255,.07);
}


/* =====================================================
   HIDDEN AUDIO
===================================================== */

#remoteAudio {
  display: none;
}

</style>

</head>

<body>


<!-- =====================================================
     HOME
===================================================== -->

<div id="home">

  <header class="header">
    <div class="logo">VoiceポタLive</div>
  </header>

  <main class="home-content">

    <section class="hero">

      <h1>
        声でつながる、<br>
        みんなの居場所。
      </h1>

      <p>
        あなたの声が、誰かの夜を照らす。<br>
        月明かりの下で、話して、聴いて、笑って。
      </p>

      <button
        class="primary-btn"
        onclick="openNameModal()"
      >
        🎙️ 配信をはじめる
      </button>

      <button
        class="secondary-btn"
        style="margin-top:10px"
        onclick="joinViewer()"
      >
        👂 配信を見る
      </button>

    </section>

  </main>

</div>


<!-- =====================================================
     LIVE SCREEN
===================================================== -->

<div id="liveScreen">

  <div
    id="liveBackground"
    class="live-background"
  ></div>


  <!-- TOP -->

  <div class="live-top">

    <div class="live-user">

      <div class="avatar">
        🌙
      </div>

      <div>

        <div
          id="liveName"
          class="live-name"
        >
          ぼたもち
        </div>

        <div class="live-badge">
          🔴 LIVE
        </div>

      </div>

    </div>


    <div
      id="viewerCount"
      class="viewer-count"
    >
      👥 0
    </div>

  </div>


  <!-- HOST MENU -->

  <button
    id="hostMenuButton"
    onclick="toggleHostControls()"
    style="
      position:absolute;
      top:80px;
      right:12px;
      z-index:30;
      width:42px;
      height:42px;
      border-radius:50%;
      color:white;
      background:rgba(0,0,0,.45);
      font-size:20px;
    "
  >
    ⚙️
  </button>


  <!-- HOST CONTROLS -->

  <div id="hostControls">

    <div class="control-title">
      🎙️ 配信設定
    </div>

    <button
      class="control-button"
      onclick="chooseBackground()"
    >
      🖼️ 背景画像を変更
    </button>

    <button
      class="control-button"
      onclick="removeBackground()"
    >
      🌙 背景を元に戻す
    </button>

    <button
      class="control-button"
      onclick="changeName()"
    >
      ✏️ 配信者名を変更
    </button>

    <button
      class="control-button danger"
      onclick="stopBroadcast()"
    >
      ⛔ 配信を終了
    </button>

    <input
      id="backgroundFile"
      class="file-input"
      type="file"
      accept="image/*"
      onchange="backgroundSelected(event)"
    >

  </div>


  <!-- VOICE -->

  <div class="voice-center">

    <div class="voice-circle">
      🎙️
    </div>

    <div
      id="voiceText"
      class="voice-text"
    >
      配信中
    </div>

  </div>


  <!-- COMMENTS -->

  <div
    id="comments"
    class="comments"
  ></div>


  <!-- BOTTOM -->

  <div class="live-bottom">

    <div class="comment-row">

      <input
        id="commentInput"
        class="comment-input"
        type="text"
        maxlength="100"
        placeholder="コメントを書く..."
        onkeydown="
          if(event.key === 'Enter'){
            sendComment();
          }
        "
      >

      <button
        class="send-comment"
        onclick="sendComment()"
      >
        ➤
      </button>

    </div>


    <div class="live-actions">

      <button
        class="live-action like-button"
        onclick="sendLike()"
      >
        ❤️ <span id="likeCount">0</span>
      </button>

      <button
        id="audioButton"
        class="live-action"
        onclick="enableAudio()"
      >
        🔊 音声ON
      </button>

      <button
        class="live-action"
        onclick="closeLiveScreen()"
      >
        ← 戻る
      </button>

    </div>

  </div>


  <audio
    id="remoteAudio"
    autoplay
    playsinline
  ></audio>

</div>


<!-- =====================================================
     NAME MODAL
===================================================== -->

<div
  id="nameModal"
  class="modal"
>

  <div class="modal-box">

    <h2>
      🎙️ 配信をはじめる
    </h2>

    <p>
      配信者名を入力してください
    </p>

    <input
      id="nameInput"
      class="name-input"
      maxlength="30"
      value="ぼたもち"
      placeholder="配信者名"
    >

    <button
      class="primary-btn"
      onclick="startBroadcast()"
    >
      🔴 配信開始
    </button>

    <button
      class="secondary-btn"
      style="width:100%;margin-top:8px"
      onclick="closeNameModal()"
    >
      キャンセル
    </button>

  </div>

</div>


<script>

/* =====================================================
   GLOBAL
===================================================== */

let socket = null;

let myId = null;

let myRole = null;

let myName = "名無し";

let localStream = null;

let viewerConnections = new Map();

let viewerPeer = null;

let liveStarted = false;

let comments = [];


/* =====================================================
   WEBRTC
===================================================== */

const iceServers = [
  {
    urls: "stun:stun.l.google.com:19302"
  },
  {
    urls: "stun:stun1.l.google.com:19302"
  }
];


/* =====================================================
   SOCKET
===================================================== */

function connectSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  socket = new WebSocket(
    protocol + "//" + location.host
  );

  socket.onopen = () => {

    console.log("WebSocket connected");

  };

  socket.onmessage = async (event) => {

    let data;

    try {
      data = JSON.parse(event.data);
    } catch(e) {
      return;
    }

    await handleMessage(data);

  };

  socket.onclose = () => {

    console.log("WebSocket closed");

    setTimeout(() => {

      if (!socket ||
          socket.readyState === WebSocket.CLOSED) {

        connectSocket();

      }

    }, 1500);

  };

}


/* =====================================================
   MESSAGE
===================================================== */

async function handleMessage(data) {

  if (data.type === "welcome") {

    myId = data.id;

    return;
  }


  if (data.type === "host-ready") {

    showLiveScreen();

    document.getElementById("voiceText").textContent =
      "🎙️ 配信中";

    return;
  }


  if (data.type === "live-started") {

    updateLiveInfo(data.liveInfo);

    if (myRole === "viewer") {

      showLiveScreen();

      document.getElementById("voiceText").textContent =
        "配信者を待っています";

    }

    return;
  }


  if (data.type === "live-info") {

    updateLiveInfo(data.liveInfo);

    if (
      data.liveInfo &&
      data.liveInfo.active &&
      myRole === "viewer"
    ) {

      showLiveScreen();

    }

    return;
  }


  if (data.type === "stream-started") {

    if (myRole === "viewer") {

      document.getElementById("voiceText").textContent =
        "🎙️ 配信者の音声を受信中";

    }

    return;
  }


  if (data.type === "live-ended") {

    stopViewerAudio();

    alert("配信が終了しました");

    closeLiveScreen();

    return;
  }


  if (data.type === "viewer-joined") {

    if (myRole === "host") {

      await createOfferForViewer(
        data.viewerId
      );

    }

    return;
  }


  if (data.type === "viewer-left") {

    const peer =
      viewerConnections.get(data.viewerId);

    if (peer) {

      peer.close();

      viewerConnections.delete(
        data.viewerId
      );

    }

    return;
  }


  if (data.type === "signal") {

    await handleSignal(
      data.from,
      data.data
    );

    return;
  }


  if (data.type === "new-comment") {

    addComment(data.comment);

    return;
  }


  if (data.type === "comments") {

    clearComments();

    if (Array.isArray(data.comments)) {

      data.comments.forEach(
        comment => addComment(comment)
      );

    }

    return;
  }


  if (data.type === "like") {

    document.getElementById("likeCount")
      .textContent = data.likes || 0;

    animateLike();

    return;
  }


  if (data.type === "background") {

    setBackground(
      data.background || ""
    );

    return;
  }


  if (data.type === "error") {

    alert(data.message || "エラー");

    return;
  }

}


/* =====================================================
   START BROADCAST
===================================================== */

async function startBroadcast() {

  myName =
    document.getElementById("nameInput")
      .value
      .trim()
      .slice(0, 30)
      || "ぼたもち";

  myRole = "host";

  closeNameModal();

  try {

    localStream =
      await navigator.mediaDevices.getUserMedia({

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

    alert(
      "マイクを使用できません。\\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    return;

  }


  waitSocketAndJoin();

}


/* =====================================================
   JOIN
===================================================== */

function waitSocketAndJoin() {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(JSON.stringify({

      type: "join",

      role: myRole,

      name: myName

    }));

    return;

  }


  setTimeout(
    waitSocketAndJoin,
    200
  );

}


/* =====================================================
   VIEWER
===================================================== */

function joinViewer() {

  myRole = "viewer";

  openViewerName();

}


/* =====================================================
   VIEWER NAME
===================================================== */

function openViewerName() {

  const name =
    prompt(
      "コメントに表示する名前",
      "名無し"
    );

  myName =
    String(name || "名無し")
      .trim()
      .slice(0, 20)
      || "名無し";

  waitViewerJoin();

}


function waitViewerJoin() {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(JSON.stringify({

      type: "join",

      role: "viewer",

      name: myName

    }));

    showLiveScreen();

    document.getElementById("voiceText").textContent =
      "配信者を待っています";

    return;

  }

  setTimeout(
    waitViewerJoin,
    200
  );

}


/* =====================================================
   HOST WEBRTC
===================================================== */

async function createOfferForViewer(viewerId) {

  if (!localStream) return;

  const peer =
    new RTCPeerConnection({

      iceServers,

      bundlePolicy: "max-bundle",

      rtcpMuxPolicy: "require"

    });


  viewerConnections.set(
    viewerId,
    peer
  );


  for (
    const track of localStream.getAudioTracks()
  ) {

    const sender =
      peer.addTrack(
        track,
        localStream
      );


    try {

      const params =
        sender.getParameters();

      params.encodings =
        params.encodings || [{}];

      params.encodings[0].maxBitrate =
        64000;

      await sender.setParameters(
        params
      );

    } catch(e) {

      console.log(
        "sender parameter error",
        e
      );

    }

  }


  peer.onicecandidate =
    event => {

      if (
        event.candidate &&
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {

        socket.send(JSON.stringify({

          type: "signal",

          target: viewerId,

          data: {
            type: "candidate",
            candidate: event.candidate
          }

        }));

      }

    };


  peer.onconnectionstatechange =
    () => {

      console.log(
        "host peer",
        viewerId,
        peer.connectionState
      );

      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "closed"
      ) {

        viewerConnections.delete(
          viewerId
        );

      }

    };


  const offer =
    await peer.createOffer({

      offerToReceiveAudio: false,

      offerToReceiveVideo: false

    });


  await peer.setLocalDescription(
    offer
  );


  socket.send(JSON.stringify({

    type: "signal",

    target: viewerId,

    data: {
      type: "offer",
      sdp: peer.localDescription
    }

  }));

}


/* =====================================================
   SIGNAL
===================================================== */

async function handleSignal(from, data) {

  if (!data) return;


  /* =========================
     VIEWER
  ========================= */

  if (
    myRole === "viewer" &&
    data.type === "offer"
  ) {

    await createViewerPeer(
      from,
      data.sdp
    );

    return;
  }


  if (
    myRole === "viewer" &&
    data.type === "candidate"
  ) {

    if (
      viewerPeer &&
      data.candidate
    ) {

      try {

        await viewerPeer.addIceCandidate(
          data.candidate
        );

      } catch(e) {

        console.log(
          "candidate error",
          e
        );

      }

    }

    return;
  }


  /* =========================
     HOST
  ========================= */

  if (
    myRole === "host" &&
    data.type === "answer"
  ) {

    const peer =
      viewerConnections.get(from);

    if (!peer) return;

    await peer.setRemoteDescription(
      data.sdp
    );

    return;
  }


  if (
    myRole === "host" &&
    data.type === "candidate"
  ) {

    const peer =
      viewerConnections.get(from);

    if (
      peer &&
      data.candidate
    ) {

      try {

        await peer.addIceCandidate(
          data.candidate
        );

      } catch(e) {

        console.log(
          "host candidate error",
          e
        );

      }

    }

  }

}


/* =====================================================
   VIEWER PEER
===================================================== */

async function createViewerPeer(
  hostId,
  offer
) {

  if (viewerPeer) {

    viewerPeer.close();

  }


  viewerPeer =
    new RTCPeerConnection({

      iceServers,

      bundlePolicy: "max-bundle",

      rtcpMuxPolicy: "require"

    });


  viewerPeer.ontrack =
    event => {

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

      } else {

        const stream =
          new MediaStream([
            event.track
          ]);

        audio.srcObject =
          stream;

      }


      /*
        Android / Chrome の
        autoplay対策
      */

      audio.muted = true;

      audio.play()
        .then(() => {

          document.getElementById(
            "audioButton"
          ).style.display = "block";

          document.getElementById(
            "voiceText"
          ).textContent =
            "🎙️ 配信者の音声を受信中";

        })
        .catch(() => {

          document.getElementById(
            "audioButton"
          ).style.display = "block";

        });

    };


  viewerPeer.onicecandidate =
    event => {

      if (
        event.candidate &&
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {

        socket.send(JSON.stringify({

          type: "signal",

          target: hostId,

          data: {
            type: "candidate",
            candidate: event.candidate
          }

        }));

      }

    };


  viewerPeer.onconnectionstatechange =
    () => {

      console.log(
        "viewer peer",
        viewerPeer.connectionState
      );

      if (
        viewerPeer.connectionState === "connected"
      ) {

        document.getElementById(
          "voiceText"
        ).textContent =
          "🎙️ 配信者の音声を受信中";

      }

    };


  await viewerPeer.setRemoteDescription(
    offer
  );


  const answer =
    await viewerPeer.createAnswer();


  await viewerPeer.setLocalDescription(
    answer
  );


  socket.send(JSON.stringify({

    type: "signal",

    target: hostId,

    data: {
      type: "answer",
      sdp: viewerPeer.localDescription
    }

  }));

}


/* =====================================================
   AUDIO
===================================================== */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  audio.muted = false;

  audio.volume = 1;

  audio.play()
    .then(() => {

      document.getElementById(
        "audioButton"
      ).textContent =
        "🔊 音声ON";

    })
    .catch(() => {

      alert(
        "音声を再生できませんでした。もう一度押してください。"
      );

    });

}


function stopViewerAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );

  audio.pause();

  audio.srcObject = null;

  if (viewerPeer) {

    viewerPeer.close();

    viewerPeer = null;

  }

}


/* =====================================================
   COMMENTS
===================================================== */

function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );

  const text =
    input.value.trim();

  if (!text) return;

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {

    return;

  }

  socket.send(JSON.stringify({

    type: "comment",

    text

  }));

  input.value = "";

}


function addComment(comment) {

  if (!comment) return;

  comments.push(comment);

  if (comments.length > 200) {

    comments.shift();

  }


  const container =
    document.getElementById(
      "comments"
    );


  const div =
    document.createElement("div");


  div.className =
    "comment" +
    (
      comment.host
        ? " host"
        : ""
    );


  const name =
    document.createElement("span");

  name.className =
    "comment-name";

  name.textContent =
    comment.name || "名無し";


  const text =
    document.createElement("span");

  text.textContent =
    comment.text || "";


  div.appendChild(name);

  div.appendChild(text);

  container.appendChild(div);


  while (
    container.children.length > 30
  ) {

    container.removeChild(
      container.firstChild
    );

  }


  requestAnimationFrame(() => {

    container.scrollTop =
      container.scrollHeight;

  });

}


function clearComments() {

  comments = [];

  document.getElementById(
    "comments"
  ).innerHTML = "";

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) return;

  socket.send(JSON.stringify({

    type: "like"

  }));

}


function animateLike() {

  const button =
    document.querySelector(
      ".like-button"
    );

  if (!button) return;

  button.classList.add("liked");

  setTimeout(() => {

    button.classList.remove("liked");

  }, 350);

}


/* =====================================================
   BACKGROUND
===================================================== */

function chooseBackground() {

  document.getElementById(
    "backgroundFile"
  ).click();

}


function backgroundSelected(event) {

  const file =
    event.target.files[0];

  if (!file) return;


  if (!file.type.startsWith("image/")) {

    alert(
      "画像ファイルを選択してください。"
    );

    return;

  }


  if (file.size > 8 * 1024 * 1024) {

    alert(
      "画像は8MB以下にしてください。"
    );

    return;

  }


  const reader =
    new FileReader();


  reader.onload = () => {

    const image =
      reader.result;

    setBackground(image);


    if (
      socket &&
      socket.readyState === WebSocket.OPEN
    ) {

      socket.send(JSON.stringify({

        type: "background",

        background: image

      }));

    }

  };


  reader.readAsDataURL(file);

}


function setBackground(image) {

  const bg =
    document.getElementById(
      "liveBackground"
    );

  if (!image) {

    bg.style.backgroundImage =
      `
      radial-gradient(
        circle at 50% 20%,
        rgba(100,100,255,.28),
        transparent 45%
      ),
      linear-gradient(
        180deg,
        #101020,
        #030510
      )
      `;

    return;

  }


  bg.style.backgroundImage =
    "url('" + image + "')";
}


function removeBackground() {

  setBackground("");

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(JSON.stringify({

      type: "remove-background"

    }));

  }

}


/* =====================================================
   LIVE INFO
===================================================== */

function updateLiveInfo(info) {

  if (!info) return;


  document.getElementById(
    "liveName"
  ).textContent =
    info.name || "ぼたもち";


  document.getElementById(
    "viewerCount"
  ).textContent =
    "👥 " + (info.viewers || 0);


  document.getElementById(
    "likeCount"
  ).textContent =
    info.likes || 0;


  setBackground(
    info.background || ""
  );

}


/* =====================================================
   NAME
===================================================== */

function openNameModal() {

  document.getElementById(
    "nameModal"
  ).classList.add("show");

}


function closeNameModal() {

  document.getElementById(
    "nameModal"
  ).classList.remove("show");

}


function changeName() {

  const name =
    prompt(
      "新しい配信者名",
      myName
    );

  if (!name) return;


  myName =
    name.trim().slice(0,30);


  document.getElementById(
    "liveName"
  ).textContent =
    myName;


  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(JSON.stringify({

      type: "update-profile",

      name: myName

    }));

  }

}


/* =====================================================
   HOST CONTROL
===================================================== */

function toggleHostControls() {

  document.getElementById(
    "hostControls"
  ).classList.toggle("show");

}


/* =====================================================
   STOP
===================================================== */

function stopBroadcast() {

  if (
    !confirm(
      "配信を終了しますか？"
    )
  ) {

    return;

  }


  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(JSON.stringify({

      type: "stream-stopped"

    }));

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

    localStream = null;

  }


  for (
    const peer of viewerConnections.values()
  ) {

    peer.close();

  }

  viewerConnections.clear();

  closeLiveScreen();

}


/* =====================================================
   SCREEN
===================================================== */

function showLiveScreen() {

  document.getElementById(
    "home"
  ).style.display = "none";


  document.getElementById(
    "liveScreen"
  ).classList.add("show");


  document.getElementById(
    "hostMenuButton"
  ).style.display =
    myRole === "host"
      ? "block"
      : "none";


  document.getElementById(
    "audioButton"
  ).style.display =
    myRole === "viewer"
      ? "block"
      : "none";

}


function closeLiveScreen() {

  document.getElementById(
    "liveScreen"
  ).classList.remove("show");


  document.getElementById(
    "home"
  ).style.display = "block";


  if (myRole === "viewer") {

    stopViewerAudio();

  }

}


/* =====================================================
   START
===================================================== */

connectSocket();

</script>

</body>
</html>
`;


server.listen(PORT, HOST, () => {

  console.log(
    "VoiceポタLive server started"
  );

  console.log(
    "PORT:",
    PORT
  );

});
