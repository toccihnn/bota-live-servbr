const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

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
    if (
      client.ws !== except &&
      client.ws.readyState === WebSocket.OPEN
    ) {
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
    liveInfo: liveInfo
  });
}

function stopLive() {
  liveInfo.active = false;
  liveInfo.id = null;
  liveInfo.viewers = 0;
  liveInfo.background = "";

  broadcast({
    type: "live-ended"
  });

  broadcaster = null;
}

const server = http.createServer(function (req, res) {
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("OK");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8"
  });

  res.end(HTML);
});

const wss = new WebSocket.Server({
  server: server,
  maxPayload: 12 * 1024 * 1024
});

wss.on("connection", function (ws) {

  const id = nextId++;

  const client = {
    id: id,
    ws: ws,
    role: null,
    name: "名無し"
  };

  clients.set(id, client);

  send(ws, {
    type: "welcome",
    id: id
  });

  send(ws, {
    type: "live-info",
    liveInfo: liveInfo
  });

  send(ws, {
    type: "comments",
    comments: comments.slice(-50)
  });

  ws.on("message", async function (raw) {

    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch (error) {
      return;
    }

    /* =========================================
       JOIN
    ========================================= */

    if (data.type === "join") {

      client.role = data.role || null;

      client.name =
        String(data.name || "名無し")
          .trim()
          .slice(0, 30) || "名無し";

      if (client.role === "host") {

        broadcaster = client;

        liveInfo.active = true;
        liveInfo.id = client.id;
        liveInfo.name = client.name;
        liveInfo.viewers = 0;
        liveInfo.likes = 0;
        liveInfo.background = "";

        comments.length = 0;

        send(ws, {
          type: "host-ready",
          liveInfo: liveInfo
        });

        broadcast({
          type: "live-started",
          liveInfo: liveInfo
        });

        updateViewers();

        return;
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
          liveInfo: liveInfo
        });

        return;
      }
    }

    /* =========================================
       WEBRTC SIGNAL
    ========================================= */

    if (data.type === "signal") {

      const target =
        clients.get(Number(data.target));

      if (target) {

        send(target.ws, {
          type: "signal",
          from: client.id,
          data: data.data
        });

      }

      return;
    }

    /* =========================================
       配信開始
    ========================================= */

    if (data.type === "stream-started") {

      if (client.role !== "host") {
        return;
      }

      liveInfo.active = true;

      broadcast({
        type: "stream-started",
        liveInfo: liveInfo
      });

      return;
    }

    /* =========================================
       配信終了
    ========================================= */

    if (data.type === "stream-stopped") {

      if (client.role !== "host") {
        return;
      }

      stopLive();
      return;
    }

    /* =========================================
       名前変更
    ========================================= */

    if (data.type === "update-profile") {

      if (client.role !== "host") {
        return;
      }

      const newName =
        String(data.name || "")
          .trim()
          .slice(0, 30);

      if (newName) {
        liveInfo.name = newName;
        client.name = newName;
      }

      broadcast({
        type: "live-info",
        liveInfo: liveInfo
      });

      return;
    }

    /* =========================================
       背景画像
    ========================================= */

    if (data.type === "background") {

      if (client.role !== "host") {
        return;
      }

      if (
        typeof data.background !== "string" ||
        !data.background.startsWith("data:image/")
      ) {
        return;
      }

      if (data.background.length > 10 * 1024 * 1024) {

        send(ws, {
          type: "error",
          message: "画像が大きすぎます。8MB以下の画像を選んでください。"
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
        liveInfo: liveInfo
      });

      return;
    }

    /* =========================================
       背景削除
    ========================================= */

    if (data.type === "remove-background") {

      if (client.role !== "host") {
        return;
      }

      liveInfo.background = "";

      broadcast({
        type: "background",
        background: ""
      });

      return;
    }

    /* =========================================
       コメント
    ========================================= */

    if (data.type === "comment") {

      if (
        client.role !== "host" &&
        client.role !== "viewer"
      ) {
        return;
      }

      let text =
        String(data.text || "")
          .trim()
          .slice(0, 100);

      if (!text) {
        return;
      }

      const comment = {
        id:
          Date.now() +
          "-" +
          Math.random()
            .toString(16)
            .slice(2),

        name:
          client.role === "host"
            ? liveInfo.name
            : client.name,

        text: text,

        host:
          client.role === "host",

        time: Date.now()
      };

      comments.push(comment);

      if (comments.length > 200) {
        comments.shift();
      }

      broadcast({
        type: "new-comment",
        comment: comment
      });

      return;
    }

    /* =========================================
       いいね
    ========================================= */

    if (data.type === "like") {

      liveInfo.likes++;

      broadcast({
        type: "like",
        likes: liveInfo.likes
      });

      return;
    }

    /* =========================================
       名前設定
    ========================================= */

    if (data.type === "set-name") {

      client.name =
        String(data.name || "名無し")
          .trim()
          .slice(0, 20) || "名無し";

      return;
    }
  });

  ws.on("close", function () {

    clients.delete(id);

    if (
      client.role === "host" &&
      broadcaster === client
    ) {
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

  ws.on("error", function () {});
});


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
  min-height: 100%;
  background: #030510;
  color: #fff;
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


/* =========================================
   HOME
========================================= */

#home {
  min-height: 100vh;
  padding-bottom: 30px;
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
      rgba(3,5,16,.90)
    );

  border-bottom:
    1px solid rgba(255,255,255,.08);
}

.logo {
  font-size: 22px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #aeeaff,
      #b99cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}

.home-content {
  padding: 18px 14px;
}

.hero {
  min-height: 500px;

  padding: 28px 20px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  border-radius: 28px;

  overflow: hidden;

  background:
    radial-gradient(
      circle at 70% 20%,
      rgba(120,100,255,.28),
      transparent 35%
    ),
    radial-gradient(
      circle at 20% 25%,
      rgba(80,220,255,.18),
      transparent 35%
    ),
    linear-gradient(
      180deg,
      #111326,
      #030510
    );

  border:
    1px solid rgba(255,255,255,.1);
}

.hero h1 {
  margin: 0 0 12px;

  font-size: 32px;
  line-height: 1.3;
}

.hero p {
  margin: 0;

  color:
    rgba(255,255,255,.75);

  line-height: 1.8;
}

.primary-btn {
  width: 100%;

  margin-top: 22px;

  padding: 16px;

  border-radius: 18px;

  color: #fff;

  font-weight: 900;

  background:
    linear-gradient(
      135deg,
      #765cff,
      #a74fff
    );

  box-shadow:
    0 10px 35px
    rgba(120,80,255,.25);
}

.secondary-btn {
  padding: 13px 18px;

  border-radius: 15px;

  color: #fff;

  background:
    rgba(255,255,255,.10);

  border:
    1px solid rgba(255,255,255,.12);
}


/* =========================================
   LIVE SCREEN
========================================= */

#liveScreen {
  position: fixed;
  inset: 0;

  z-index: 1000;

  display: none;

  overflow: hidden;

  background: #02030a;
}

#liveScreen.show {
  display: block;
}

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
    background-image .25s ease;
}

.live-background::after {
  content: "";

  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.20),
      rgba(0,0,0,.12) 45%,
      rgba(0,0,0,.88)
    );
}


/* =========================================
   LIVE TOP
========================================= */

.live-top {
  position: absolute;

  top: 0;
  left: 0;
  right: 0;

  z-index: 20;

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
  width: 45px;
  height: 45px;

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

  border:
    2px solid
    rgba(255,255,255,.65);
}

.live-name {
  font-size: 15px;
  font-weight: 900;
}

.live-badge {
  display: inline-block;

  margin-top: 3px;

  padding: 3px 8px;

  border-radius: 20px;

  background: #ff315d;

  font-size: 10px;
  font-weight: 900;
}

.viewer-count {
  padding: 8px 12px;

  border-radius: 20px;

  background:
    rgba(0,0,0,.48);

  backdrop-filter: blur(10px);

  font-size: 13px;
}


/* =========================================
   VOICE
========================================= */

.voice-center {
  position: absolute;

  top: 37%;
  left: 0;
  right: 0;

  z-index: 5;

  text-align: center;
}

.voice-circle {
  width: 135px;
  height: 135px;

  margin: auto;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 55px;

  background:
    radial-gradient(
      circle,
      rgba(180,150,255,.48),
      rgba(80,60,150,.12)
    );

  border:
    1px solid
    rgba(255,255,255,.3);

  box-shadow:
    0 0 60px
    rgba(120,90,255,.35);

  animation:
    pulse 2.4s infinite;
}

@keyframes pulse {

  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }

}

.voice-text {
  margin-top: 16px;

  font-size: 16px;
  font-weight: 800;
}


/* =========================================
   COMMENTS
========================================= */

.comments {
  position: absolute;

  z-index: 15;

  left: 12px;
  right: 12px;

  bottom: 122px;

  height: 190px;

  overflow-y: auto;

  display: flex;
  flex-direction: column;

  justify-content: flex-end;

  pointer-events: none;

  scrollbar-width: none;
}

.comments::-webkit-scrollbar {
  display: none;
}

.comment {
  width: fit-content;
  max-width: 90%;

  margin-top: 7px;

  padding: 7px 12px;

  border-radius: 15px;

  background:
    rgba(0,0,0,.52);

  backdrop-filter: blur(8px);

  font-size: 14px;

  line-height: 1.4;

  animation:
    commentIn .2s ease;
}

.comment.host {
  border:
    1px solid
    rgba(180,150,255,.55);
}

.comment-name {
  margin-right: 5px;

  font-weight: 900;
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


/* =========================================
   BOTTOM
========================================= */

.live-bottom {
  position: absolute;

  z-index: 30;

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
      rgba(0,0,0,.90) 35%
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

  color: #fff;

  background:
    rgba(0,0,0,.55);

  border:
    1px solid
    rgba(255,255,255,.15);
}

.comment-input::placeholder {
  color:
    rgba(255,255,255,.55);
}

.send-comment {
  width: 50px;

  border-radius: 50%;

  color: #fff;

  background:
    linear-gradient(
      135deg,
      #765cff,
      #ad50ff
    );
}

.live-actions {
  display: flex;

  gap: 8px;

  margin-top: 9px;
}

.live-action {
  flex: 1;

  padding: 11px;

  border-radius: 15px;

  color: #fff;

  background:
    rgba(255,255,255,.10);

  border:
    1px solid
    rgba(255,255,255,.10);
}

.like-button.liked {
  background:
    rgba(255,50,100,.30);
}


/* =========================================
   HOST MENU
========================================= */

#hostControls {
  display: none;

  position: absolute;

  z-index: 50;

  top: 130px;
  right: 12px;

  width: 225px;

  padding: 14px;

  border-radius: 20px;

  background:
    rgba(15,15,25,.94);

  backdrop-filter: blur(20px);

  border:
    1px solid
    rgba(255,255,255,.12);

  box-shadow:
    0 15px 50px
    rgba(0,0,0,.5);
}

#hostControls.show {
  display: block;
}

.control-title {
  margin-bottom: 10px;

  font-weight: 900;
}

.control-button {
  width: 100%;

  padding: 12px;

  margin-top: 8px;

  border-radius: 13px;

  color: #fff;

  background:
    rgba(255,255,255,.10);
}

.control-button.danger {
  background:
    rgba(255,40,70,.25);
}

.file-input {
  display: none;
}


/* =========================================
   MODAL
========================================= */

.modal {
  position: fixed;
  inset: 0;

  z-index: 2000;

  display: none;

  align-items: center;
  justify-content: center;

  padding: 20px;

  background:
    rgba(0,0,0,.72);

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
    1px solid
    rgba(255,255,255,.12);
}

.modal-box h2 {
  margin-top: 0;
}

.name-input {
  width: 100%;

  padding: 14px;

  border-radius: 13px;

  outline: none;

  color: #fff;

  background:
    rgba(255,255,255,.07);

  border:
    1px solid
    rgba(255,255,255,.15);
}

#remoteAudio {
  display: none;
}

</style>

</head>


<body>


<!-- =========================================
     HOME
========================================= -->

<div id="home">

  <header class="header">
    <div class="logo">
      VoiceポタLive
    </div>
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
        style="width:100%;margin-top:10px"
        onclick="joinViewer()"
      >
        👂 配信を見る
      </button>

    </section>

  </main>

</div>


<!-- =========================================
     LIVE
========================================= -->

<div id="liveScreen">

  <div
    id="liveBackground"
    class="live-background"
  ></div>


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


  <button
    id="hostMenuButton"
    onclick="toggleHostControls()"
    style="
      position:absolute;
      top:80px;
      right:12px;
      z-index:40;
      width:42px;
      height:42px;
      border-radius:50%;
      color:white;
      background:rgba(0,0,0,.48);
      font-size:20px;
    "
  >
    ⚙️
  </button>


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


  <div
    id="comments"
    class="comments"
  ></div>


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


<!-- =========================================
     NAME MODAL
========================================= -->

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

let socket = null;

let myId = null;

let myRole = null;

let myName = "名無し";

let localStream = null;

let viewerConnections = new Map();

let viewerPeer = null;

let comments = [];


const iceServers = [
  {
    urls: "stun:stun.l.google.com:19302"
  },
  {
    urls: "stun:stun1.l.google.com:19302"
  }
];


/* =========================================
   SOCKET
========================================= */

function connectSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  socket =
    new WebSocket(
      protocol + "//" + location.host
    );


  socket.onopen = function () {

    console.log(
      "VoiceポタLive WebSocket connected"
    );

  };


  socket.onmessage = async function (event) {

    let data;

    try {
      data =
        JSON.parse(event.data);
    } catch (e) {
      return;
    }

    await handleMessage(data);

  };


  socket.onclose = function () {

    console.log(
      "WebSocket disconnected"
    );

    setTimeout(
      connectSocket,
      1500
    );

  };

}


/* =========================================
   MESSAGE
========================================= */

async function handleMessage(data) {

  if (data.type === "welcome") {

    myId = data.id;

    return;
  }


  if (data.type === "host-ready") {

    updateLiveInfo(
      data.liveInfo
    );

    showLiveScreen();

    document.getElementById(
      "voiceText"
    ).textContent =
      "🔴 配信中";

    return;
  }


  if (data.type === "live-started") {

    updateLiveInfo(
      data.liveInfo
    );

    if (myRole === "viewer") {

      showLiveScreen();

      document.getElementById(
        "voiceText"
      ).textContent =
        "配信者を待っています";

    }

    return;
  }


  if (data.type === "live-info") {

    updateLiveInfo(
      data.liveInfo
    );

    return;
  }


  if (data.type === "stream-started") {

    if (myRole === "viewer") {

      document.getElementById(
        "voiceText"
      ).textContent =
        "🎙️ 配信者の音声を受信中";

    }

    return;
  }


  if (data.type === "live-ended") {

    stopViewerAudio();

    if (document.getElementById("liveScreen").classList.contains("show")) {

      alert(
        "配信が終了しました"
      );

    }

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
      viewerConnections.get(
        data.viewerId
      );

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

    addComment(
      data.comment
    );

    return;
  }


  if (data.type === "comments") {

    clearComments();

    if (Array.isArray(data.comments)) {

      data.comments.forEach(
        function(comment) {
          addComment(comment);
        }
      );

    }

    return;
  }


  if (data.type === "like") {

    document.getElementById(
      "likeCount"
    ).textContent =
      data.likes || 0;

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

    alert(
      data.message ||
      "エラーが発生しました"
    );

  }

}


/* =========================================
   START BROADCAST
========================================= */

async function startBroadcast() {

  myName =
    document.getElementById(
      "nameInput"
    ).value
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

    console.error(error);

    alert(
      "マイクを使用できません。\n\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    return;

  }


  waitSocketAndJoin();

}


/* =========================================
   JOIN
========================================= */

function waitSocketAndJoin() {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify({
        type: "join",
        role: "host",
        name: myName
      })
    );

    return;
  }

  setTimeout(
    waitSocketAndJoin,
    200
  );

}


/* =========================================
   VIEWER
========================================= */

function joinViewer() {

  myRole = "viewer";

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

    socket.send(
      JSON.stringify({
        type: "join",
        role: "viewer",
        name: myName
      })
    );

    showLiveScreen();

    document.getElementById(
      "voiceText"
    ).textContent =
      "配信者を待っています";

    return;
  }

  setTimeout(
    waitViewerJoin,
    200
  );

}


/* =========================================
   HOST WEBRTC
========================================= */

async function createOfferForViewer(viewerId) {

  if (!localStream) {
    return;
  }


  const peer =
    new RTCPeerConnection({
      iceServers: iceServers,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });


  viewerConnections.set(
    viewerId,
    peer
  );


  const tracks =
    localStream.getAudioTracks();


  for (
    const track of tracks
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

    } catch (error) {

      console.log(
        "sender parameter error",
        error
      );

    }

  }


  peer.onicecandidate =
    function(event) {

      if (
        event.candidate &&
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {

        socket.send(
          JSON.stringify({
            type: "signal",
            target: viewerId,
            data: {
              type: "candidate",
              candidate: event.candidate
            }
          })
        );

      }

    };


  peer.onconnectionstatechange =
    function() {

      console.log(
        "Host peer:",
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
    await peer.createOffer();


  await peer.setLocalDescription(
    offer
  );


  socket.send(
    JSON.stringify({
      type: "signal",
      target: viewerId,
      data: {
        type: "offer",
        sdp: peer.localDescription
      }
    })
  );

}


/* =========================================
   SIGNAL
========================================= */

async function handleSignal(
  from,
  data
) {

  if (!data) {
    return;
  }


  /* VIEWER */

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

      } catch (error) {

        console.log(
          "viewer candidate error",
          error
        );

      }

    }

    return;
  }


  /* HOST */

  if (
    myRole === "host" &&
    data.type === "answer"
  ) {

    const peer =
      viewerConnections.get(from);

    if (!peer) {
      return;
    }

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

      } catch (error) {

        console.log(
          "host candidate error",
          error
        );

      }

    }

  }

}


/* =========================================
   VIEWER WEBRTC
========================================= */

async function createViewerPeer(
  hostId,
  offer
) {

  if (viewerPeer) {

    viewerPeer.close();

  }


  viewerPeer =
    new RTCPeerConnection({
      iceServers: iceServers,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });


  viewerPeer.ontrack =
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

      } else {

        const stream =
          new MediaStream([
            event.track
          ]);

        audio.srcObject =
          stream;

      }


      audio.muted = true;


      audio.play()
        .then(function() {

          document.getElementById(
            "voiceText"
          ).textContent =
            "🎙️ 配信者の音声を受信中";

        })
        .catch(function() {

          document.getElementById(
            "audioButton"
          ).style.display =
            "block";

        });

    };


  viewerPeer.onicecandidate =
    function(event) {

      if (
        event.candidate &&
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {

        socket.send(
          JSON.stringify({
            type: "signal",
            target: hostId,
            data: {
              type: "candidate",
              candidate: event.candidate
            }
          })
        );

      }

    };


  viewerPeer.onconnectionstatechange =
    function() {

      console.log(
        "Viewer peer:",
        viewerPeer.connectionState
      );

      if (
        viewerPeer.connectionState ===
        "connected"
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


  socket.send(
    JSON.stringify({
      type: "signal",
      target: hostId,
      data: {
        type: "answer",
        sdp: viewerPeer.localDescription
      }
    })
  );

}


/* =========================================
   AUDIO
========================================= */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  audio.muted = false;

  audio.volume = 1;


  audio.play()
    .then(function() {

      document.getElementById(
        "audioButton"
      ).textContent =
        "🔊 音声ON";

      document.getElementById(
        "voiceText"
      ).textContent =
        "🎙️ 配信者の音声を受信中";

    })
    .catch(function() {

      alert(
        "音声を再生できませんでした。\nもう一度押してください。"
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


/* =========================================
   COMMENTS
========================================= */

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


  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {
    return;
  }


  socket.send(
    JSON.stringify({
      type: "comment",
      text: text
    })
  );


  input.value = "";

}


function addComment(comment) {

  if (!comment) {
    return;
  }


  const container =
    document.getElementById(
      "comments"
    );


  const div =
    document.createElement(
      "div"
    );


  div.className =
    comment.host
      ? "comment host"
      : "comment";


  const name =
    document.createElement(
      "span"
    );


  name.className =
    "comment-name";


  name.textContent =
    comment.name || "名無し";


  const text =
    document.createElement(
      "span"
    );


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


  requestAnimationFrame(
    function() {

      container.scrollTop =
        container.scrollHeight;

    }
  );

}


function clearComments() {

  document.getElementById(
    "comments"
  ).innerHTML = "";

}


/* =========================================
   LIKE
========================================= */

function sendLike() {

  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {
    return;
  }


  socket.send(
    JSON.stringify({
      type: "like"
    })
  );

}


function animateLike() {

  const button =
    document.querySelector(
      ".like-button"
    );


  if (!button) {
    return;
  }


  button.classList.add(
    "liked"
  );


  setTimeout(
    function() {

      button.classList.remove(
        "liked"
      );

    },
    350
  );

}


/* =========================================
   BACKGROUND
========================================= */

function chooseBackground() {

  document.getElementById(
    "backgroundFile"
  ).click();

}


function backgroundSelected(event) {

  const file =
    event.target.files[0];


  if (!file) {
    return;
  }


  if (
    !file.type.startsWith("image/")
  ) {

    alert(
      "画像ファイルを選択してください。"
    );

    return;

  }


  if (
    file.size >
    8 * 1024 * 1024
  ) {

    alert(
      "画像は8MB以下にしてください。"
    );

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function() {

      const image =
        reader.result;


      setBackground(
        image
      );


      if (
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {

        socket.send(
          JSON.stringify({
            type: "background",
            background: image
          })
        );

      }

    };


  reader.readAsDataURL(
    file
  );

}


function setBackground(image) {

  const bg =
    document.getElementById(
      "liveBackground"
    );


  if (!image) {

    bg.style.backgroundImage =
      "radial-gradient(circle at 50% 20%, rgba(100,100,255,.28), transparent 45%), linear-gradient(180deg, #101020, #030510)";

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

    socket.send(
      JSON.stringify({
        type: "remove-background"
      })
    );

  }

}


/* =========================================
   LIVE INFO
========================================= */

function updateLiveInfo(info) {

  if (!info) {
    return;
  }


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


/* =========================================
   NAME
========================================= */

function openNameModal() {

  document.getElementById(
    "nameModal"
  ).classList.add(
    "show"
  );

}


function closeNameModal() {

  document.getElementById(
    "nameModal"
  ).classList.remove(
    "show"
  );

}


function changeName() {

  const name =
    prompt(
      "新しい配信者名",
      myName
    );


  if (!name) {
    return;
  }


  myName =
    name.trim().slice(0, 30);


  document.getElementById(
    "liveName"
  ).textContent =
    myName;


  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify({
        type: "update-profile",
        name: myName
      })
    );

  }

}


/* =========================================
   HOST MENU
========================================= */

function toggleHostControls() {

  document.getElementById(
    "hostControls"
  ).classList.toggle(
    "show"
  );

}


/* =========================================
   STOP
========================================= */

function stopBroadcast() {

  const ok =
    confirm(
      "配信を終了しますか？"
    );


  if (!ok) {
    return;
  }


  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify({
        type: "stream-stopped"
      })
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

    localStream = null;

  }


  for (
    const peer of
    viewerConnections.values()
  ) {

    peer.close();

  }


  viewerConnections.clear();


  closeLiveScreen();

}


function closeLiveScreen() {

  document.getElementById(
    "liveScreen"
  ).classList.remove(
    "show"
  );


  document.getElementById(
    "home"
  ).style.display =
    "block";


  document.getElementById(
    "hostControls"
  ).classList.remove(
    "show"
  );


  if (myRole === "viewer") {

    stopViewerAudio();

  }

}


/* =========================================
   SHOW LIVE
========================================= */

function showLiveScreen() {

  document.getElementById(
    "home"
  ).style.display =
    "none";


  document.getElementById(
    "liveScreen"
  ).classList.add(
    "show"
  );


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


/* =========================================
   START
========================================= */

connectSocket();

</script>

</body>

</html>
`;


server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "================================="
    );

    console.log(
      "VoiceポタLive started"
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
