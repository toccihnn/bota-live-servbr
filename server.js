const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const clients = new Map();
const streams = new Map();

let nextId = 1;
let nextStreamId = 1;

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendClient(client, data) {
  if (client) {
    send(client.ws, data);
  }
}

function getStream(streamId) {
  return streams.get(String(streamId));
}

function getStreamClients(streamId) {
  const result = [];

  for (const client of clients.values()) {
    if (client.streamId === String(streamId)) {
      result.push(client);
    }
  }

  return result;
}

function sendStreamList() {
  const list = [];

  for (const stream of streams.values()) {
    if (!stream.live) continue;

    let viewers = 0;

    for (const client of clients.values()) {
      if (
        client.streamId === stream.id &&
        client.role === "viewer"
      ) {
        viewers++;
      }
    }

    list.push({
      id: stream.id,
      name: stream.name,
      viewers,
      likes: stream.likes,
      gifts: stream.gifts
    });
  }

  for (const client of clients.values()) {
    if (!client.role) continue;

    send(client.ws, {
      type: "stream-list",
      streams: list
    });
  }
}

function sendRoomStatus(streamId) {
  const stream = getStream(streamId);

  if (!stream) return;

  let viewers = 0;

  for (const client of clients.values()) {
    if (
      client.streamId === String(streamId) &&
      client.role === "viewer"
    ) {
      viewers++;
    }
  }

  for (const client of getStreamClients(streamId)) {
    send(client.ws, {
      type: "room-status",
      live: stream.live,
      viewers,
      likes: stream.likes,
      gifts: stream.gifts
    });
  }

  sendStreamList();
}

function broadcastToStream(streamId, data) {
  for (const client of getStreamClients(streamId)) {
    send(client.ws, data);
  }
}

const server = http.createServer((req, res) => {
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
  server
});

wss.on("connection", (ws) => {

  const id = String(nextId++);

  const client = {
    id,
    ws,
    role: null,
    streamId: null,
    name: "ゲスト"
  };

  clients.set(id, client);

  send(ws, {
    type: "welcome",
    id
  });

  sendStreamList();

  ws.on("message", (raw) => {

    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // -----------------------------
    // ホーム画面
    // -----------------------------

    if (msg.type === "get-streams") {
      sendStreamList();
      return;
    }

    // -----------------------------
    // 配信開始
    // -----------------------------

    if (msg.type === "start-stream") {

      client.role = "host";
      client.name =
        String(msg.name || "ぼたもちの配信");

      const streamId =
        String(nextStreamId++);

      client.streamId = streamId;

      const stream = {
        id: streamId,
        hostId: client.id,
        name: client.name,
        live: true,
        likes: 0,
        gifts: 0
      };

      streams.set(
        streamId,
        stream
      );

      console.log(
        `[STREAM START] ${streamId} ${client.name}`
      );

      send(ws, {
        type: "stream-created",
        streamId,
        name: stream.name
      });

      send(ws, {
        type: "status",
        text: "配信者として配信開始"
      });

      sendRoomStatus(streamId);

      return;
    }

    // -----------------------------
    // 視聴開始
    // -----------------------------

    if (msg.type === "join-stream") {

      const streamId =
        String(msg.streamId);

      const stream =
        getStream(streamId);

      if (!stream || !stream.live) {

        send(ws, {
          type: "error",
          text: "この配信は終了しています"
        });

        return;
      }

      client.role = "viewer";
      client.streamId = streamId;
      client.name =
        String(msg.name || "視聴者");

      console.log(
        `[VIEWER JOIN] ${client.id} -> ${streamId}`
      );

      send(ws, {
        type: "joined-stream",
        streamId,
        name: stream.name
      });

      // 配信者に視聴者参加通知
      const host =
        clients.get(stream.hostId);

      if (host) {
        send(host.ws, {
          type: "viewer-joined",
          viewerId: client.id
        });
      }

      sendRoomStatus(streamId);

      return;
    }

    // -----------------------------
    // WebRTCシグナリング
    // -----------------------------

    if (msg.type === "signal") {

      const target =
        clients.get(String(msg.target));

      if (!target) {
        console.log(
          "[SIGNAL] target not found",
          msg.target
        );
        return;
      }

      if (
        client.streamId &&
        target.streamId !== client.streamId
      ) {
        return;
      }

      send(target.ws, {
        type: "signal",
        from: client.id,
        signal: msg.signal
      });

      return;
    }

    // -----------------------------
    // 配信開始通知
    // -----------------------------

    if (msg.type === "stream-started") {

      const stream =
        getStream(client.streamId);

      if (!stream) return;

      stream.live = true;

      broadcastToStream(
        client.streamId,
        {
          type: "stream-started"
        }
      );

      sendStreamList();

      return;
    }

    // -----------------------------
    // いいね
    // -----------------------------

    if (msg.type === "like") {

      const stream =
        getStream(client.streamId);

      if (!stream) return;

      stream.likes++;

      broadcastToStream(
        client.streamId,
        {
          type: "like-count",
          likes: stream.likes
        }
      );

      sendStreamList();

      return;
    }

    // -----------------------------
    // ギフト
    // -----------------------------

    if (msg.type === "gift") {

      const stream =
        getStream(client.streamId);

      if (!stream) return;

      stream.gifts++;

      const giftName =
        String(msg.gift || "ハート");

      broadcastToStream(
        client.streamId,
        {
          type: "gift",
          gift: giftName,
          gifts: stream.gifts,
          from: client.name
        }
      );

      sendStreamList();

      return;
    }

    // -----------------------------
    // コメント
    // -----------------------------

    if (msg.type === "comment") {

      const text =
        String(msg.text || "")
          .trim()
          .slice(0, 200);

      if (!text) return;

      broadcastToStream(
        client.streamId,
        {
          type: "comment",
          name: client.name,
          text
        }
      );

      return;
    }

    // -----------------------------
    // 配信終了
    // -----------------------------

    if (msg.type === "stop-stream") {

      const stream =
        getStream(client.streamId);

      if (!stream) return;

      if (
        stream.hostId !== client.id
      ) {
        return;
      }

      stream.live = false;

      broadcastToStream(
        client.streamId,
        {
          type: "stream-stopped"
        }
      );

      console.log(
        `[STREAM STOP] ${stream.id}`
      );

      sendStreamList();

      return;
    }
  });

  ws.on("close", () => {

    console.log(
      `[CLOSE] ${client.id}`
    );

    const streamId =
      client.streamId;

    const role =
      client.role;

    const stream =
      getStream(streamId);

    clients.delete(client.id);

    // 配信者が退出
    if (
      role === "host" &&
      stream
    ) {

      stream.live = false;

      for (
        const other of clients.values()
      ) {

        if (
          other.streamId === streamId &&
          other.role === "viewer"
        ) {

          send(other.ws, {
            type: "host-left"
          });
        }
      }

      sendStreamList();
    }

    // 視聴者が退出
    if (
      role === "viewer" &&
      stream
    ) {

      const host =
        clients.get(stream.hostId);

      if (host) {

        send(host.ws, {
          type: "viewer-left",
          viewerId: client.id
        });
      }

      sendRoomStatus(streamId);
    }
  });
});

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "Bota Live Server"
    );

    console.log(
      `PORT: ${PORT}`
    );

    console.log(
      "Server started!"
    );

    console.log(
      "================================="
    );
  }
);


// ======================================================
// HTML
// ======================================================

const HTML = `
<!DOCTYPE html>

<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<title>Bota Live</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: #080808;
  color: white;
  font-family:
    Arial,
    "Noto Sans JP",
    sans-serif;
}

#app {
  min-height: 100vh;
  padding: 15px;
}

.card {
  max-width: 720px;
  margin: auto;
  background: #151515;
  border-radius: 20px;
  padding: 16px;
}

h1 {
  text-align: center;
  margin: 5px 0 20px;
}

h2 {
  margin-top: 10px;
}

button {
  width: 100%;
  border: 0;
  border-radius: 13px;
  padding: 15px;
  margin: 6px 0;
  font-size: 16px;
  font-weight: bold;
}

.hostButton {
  background: #635bff;
  color: white;
}

.viewerButton {
  background: #2f9e44;
  color: white;
}

.stopButton {
  background: #d6336c;
  color: white;
}

.audioButton {
  background: #f59f00;
  color: black;
}

.likeButton {
  background: #ff4d6d;
  color: white;
}

.giftButton {
  background: #9c36b5;
  color: white;
}

.backButton {
  background: #343a40;
  color: white;
}

.stream {
  background: #202020;
  border-radius: 15px;
  padding: 15px;
  margin: 10px 0;
}

.streamTitle {
  font-size: 18px;
  font-weight: bold;
}

.streamInfo {
  color: #aaa;
  font-size: 13px;
  margin: 7px 0;
}

.liveDot {
  color: #00ff66;
  font-weight: bold;
}

video {
  width: 100%;
  max-height: 65vh;
  background: black;
  border-radius: 15px;
  object-fit: contain;
  display: block;
}

#localVideo {
  transform: scaleX(-1);
}

.status {
  background: #202020;
  border-radius: 10px;
  padding: 12px;
  margin: 10px 0;
  text-align: center;
}

.live {
  color: #00ff66;
  font-weight: bold;
}

.wait {
  color: #aaa;
}

.hidden {
  display: none !important;
}

.small {
  color: #aaa;
  font-size: 13px;
  text-align: center;
  margin: 8px;
}

.stats {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.stat {
  flex: 1;
  background: #202020;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}

.comments {
  background: #090909;
  border-radius: 12px;
  padding: 10px;
  margin-top: 10px;
  height: 180px;
  overflow-y: auto;
}

.comment {
  padding: 6px 2px;
  border-bottom: 1px solid #222;
}

.commentName {
  font-weight: bold;
}

.commentText {
  color: #ddd;
}

.commentInput {
  display: flex;
  gap: 7px;
  margin-top: 8px;
}

.commentInput input {
  flex: 1;
  min-width: 0;
  padding: 13px;
  border-radius: 10px;
  border: 0;
  font-size: 15px;
}

.commentInput button {
  width: 90px;
  margin: 0;
  background: #228be6;
  color: white;
}

#log {
  margin-top: 12px;
  background: #050505;
  color: #00ff66;
  border-radius: 10px;
  padding: 10px;
  font-size: 11px;
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.giftPopup {
  position: fixed;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  background: #9c36b5;
  padding: 20px 30px;
  border-radius: 20px;
  font-size: 22px;
  font-weight: bold;
  z-index: 999;
  display: none;
}

</style>

</head>


<body>

<div id="app">

<div class="card">

<h1>🎥 Bota Live</h1>


<!-- ==========================================
     ホーム
========================================== -->

<div id="home">

  <div class="status">
    🔴 配信中のライブ
  </div>

  <div id="streamList">
    配信を読み込んでいます...
  </div>

  <button
    class="hostButton"
    onclick="showHostStart()"
  >
    🎥 配信を開始する
  </button>

</div>


<!-- ==========================================
     配信開始画面
========================================== -->

<div
  id="hostStart"
  class="hidden"
>

  <div class="status">
    🎥 配信者
  </div>

  <input
    id="streamName"
    placeholder="配信タイトル"
    value="ぼたもちの配信"
    style="
      width:100%;
      padding:14px;
      border-radius:10px;
      border:0;
      margin:8px 0;
      font-size:16px;
    "
  >

  <button
    class="hostButton"
    onclick="startHost()"
  >
    🔴 配信開始
  </button>

  <button
    class="backButton"
    onclick="showHome()"
  >
    ← 戻る
  </button>

</div>


<!-- ==========================================
     ライブ画面
========================================== -->

<div
  id="liveArea"
  class="hidden"
>

  <div
    id="status"
    class="status"
  >
    接続中...
  </div>


  <video
    id="localVideo"
    autoplay
    playsinline
    muted
    class="hidden"
  ></video>


  <video
    id="remoteVideo"
    autoplay
    playsinline
    class="hidden"
  ></video>


  <button
    id="audioButton"
    class="audioButton hidden"
    onclick="enableAudio()"
  >
    🔊 音声をONにする
  </button>


  <div class="stats">

    <div class="stat">
      👤
      <span id="viewerCount">
        0
      </span>
    </div>

    <div class="stat">
      ❤️
      <span id="likeCount">
        0
      </span>
    </div>

    <div class="stat">
      🎁
      <span id="giftCount">
        0
      </span>
    </div>

  </div>


  <button
    id="likeButton"
    class="likeButton"
    onclick="sendLike()"
  >
    ❤️ いいね
  </button>


  <button
    id="giftButton"
    class="giftButton"
    onclick="sendGift()"
  >
    🎁 ギフトを送る
  </button>


  <div
    id="comments"
    class="comments"
  ></div>


  <div class="commentInput">

    <input
      id="commentText"
      placeholder="コメントを書く..."
      maxlength="200"
      onkeydown="
        if(event.key === 'Enter'){
          sendComment();
        }
      "
    >

    <button
      onclick="sendComment()"
    >
      送信
    </button>

  </div>


  <button
    id="stopButton"
    class="stopButton"
    onclick="stopLive()"
  >
    ⛔ 配信終了
  </button>


  <button
    class="backButton"
    onclick="leaveLive()"
  >
    ← 戻る
  </button>


  <div
    id="info"
    class="small"
  ></div>


  <div id="log"></div>

</div>

</div>

</div>


<div
  id="giftPopup"
  class="giftPopup"
></div>


<script>

let ws = null;

let myId = null;

let myRole = null;

let myStreamId = null;

let myName = "視聴者";

let localStream = null;

let viewerConnections = new Map();

let viewerPeer = null;

let viewerId = null;

let pendingCandidates = [];


// -----------------------------
// 要素
// -----------------------------

const home =
  document.getElementById("home");

const hostStart =
  document.getElementById("hostStart");

const liveArea =
  document.getElementById("liveArea");

const streamList =
  document.getElementById("streamList");

const localVideo =
  document.getElementById("localVideo");

const remoteVideo =
  document.getElementById("remoteVideo");

const statusBox =
  document.getElementById("status");

const info =
  document.getElementById("info");

const logBox =
  document.getElementById("log");


// -----------------------------
// ログ
// -----------------------------

function log(text) {

  console.log(text);

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


// -----------------------------
// 画面
// -----------------------------

function showHome() {

  home.classList.remove(
    "hidden"
  );

  hostStart.classList.add(
    "hidden"
  );

  liveArea.classList.add(
    "hidden"
  );

  if (ws) {

    ws.close();

    ws = null;
  }
}


function showHostStart() {

  home.classList.add(
    "hidden"
  );

  hostStart.classList.remove(
    "hidden"
  );

  liveArea.classList.add(
    "hidden"
  );
}


// -----------------------------
// WebSocket
// -----------------------------

function connectSocket() {

  return new Promise(
    (resolve, reject) => {

      const protocol =
        location.protocol === "https:"
          ? "wss:"
          : "ws:";

      ws =
        new WebSocket(
          protocol +
          "//" +
          location.host
        );


      ws.onopen = () => {

        log(
          "WebSocket接続OK"
        );

        resolve();
      };


      ws.onerror = () => {

        log(
          "WebSocket ERROR"
        );

        reject(
          new Error(
            "WebSocket error"
          )
        );
      };


      ws.onclose = () => {

        log(
          "WebSocket切断"
        );
      };


      ws.onmessage =
        async (event) => {

          try {

            const msg =
              JSON.parse(
                event.data
              );

            await handleMessage(
              msg
            );

          } catch (e) {

            console.error(e);

            log(
              "message error: " +
              e.message
            );
          }
        };
    }
  );
}


function send(data) {

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


// -----------------------------
// 配信一覧
// -----------------------------

function loadStreams() {

  if (!ws) {

    connectSocket()
      .then(() => {

        send({
          type:
            "get-streams"
        });

      });

    return;
  }

  send({
    type:
      "get-streams"
  });
}


function renderStreams(streams) {

  streamList.innerHTML = "";

  if (
    !streams ||
    streams.length === 0
  ) {

    streamList.innerHTML =
      '<div class="status">' +
      '現在配信中のライブはありません' +
      '</div>';

    return;
  }


  streams.forEach(
    (stream) => {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "stream";


      const title =
        document.createElement(
          "div"
        );

      title.className =
        "streamTitle";

      title.textContent =
        "🔴 " +
        stream.name;


      const info =
        document.createElement(
          "div"
        );

      info.className =
        "streamInfo";

      info.textContent =
        "👤 " +
        stream.viewers +
        "人　❤️ " +
        stream.likes;


      const button =
        document.createElement(
          "button"
        );

      button.className =
        "viewerButton";

      button.textContent =
        "👀 この配信を見る";


      button.onclick =
        () => {

          joinStream(
            stream.id
          );

        };


      div.appendChild(
        title
      );

      div.appendChild(
        info
      );

      div.appendChild(
        button
      );

      streamList.appendChild(
        div
      );

    }
  );
}


// -----------------------------
// 配信開始
// -----------------------------

async function startHost() {

  myRole = "host";

  myName =
    document
      .getElementById(
        "streamName"
      )
      .value
      .trim() ||
    "ぼたもちの配信";


  home.classList.add(
    "hidden"
  );

  hostStart.classList.add(
    "hidden"
  );

  liveArea.classList.remove(
    "hidden"
  );


  setStatus(
    "配信者として接続中..."
  );


  try {

    await connectSocket();


    send({
      type:
        "start-stream",

      name:
        myName
    });


    await startCamera();

  } catch (e) {

    log(
      "配信開始エラー: " +
      e.message
    );

    setStatus(
      "配信を開始できません"
    );
  }
}


// -----------------------------
// カメラ
// -----------------------------

async function startCamera() {

  localStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        video: {
          facingMode: "user",

          width: {
            ideal: 1280
          },

          height: {
            ideal: 720
          }
        },

        audio: {

          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true
        }

      });


  localVideo.srcObject =
    localStream;


  localVideo.classList.remove(
    "hidden"
  );


  log(
    "🎥 カメラ・マイク取得OK"
  );
}


// -----------------------------
// 視聴
// -----------------------------

async function joinStream(
  streamId
) {

  myRole = "viewer";

  myStreamId =
    String(streamId);

  myName =
    "視聴者";


  home.classList.add(
    "hidden"
  );

  hostStart.classList.add(
    "hidden"
  );

  liveArea.classList.remove(
    "hidden"
  );


  remoteVideo.classList.remove(
    "hidden"
  );


  document
    .getElementById(
      "stopButton"
    )
    .classList.add(
      "hidden"
    );


  setStatus(
    "配信を接続中..."
  );


  try {

    await connectSocket();


    send({
      type:
        "join-stream",

      streamId:
        myStreamId,

      name:
        myName
    });


    log(
      "視聴者として参加"
    );


  } catch (e) {

    log(
      "接続エラー: " +
      e.message
    );
  }
}


// -----------------------------
// 配信者Peer
// -----------------------------

function createHostPeer(
  viewer
) {

  const old =
    viewerConnections.get(
      viewer
    );


  if (old) {

    old.close();

    viewerConnections.delete(
      viewer
    );
  }


  const pc =
    new RTCPeerConnection({

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
    });


  viewerConnections.set(
    viewer,
    pc
  );


  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      pc.addTrack(
        track,
        localStream
      );
    }
  }


  pc.onicecandidate =
    (event) => {

      if (
        event.candidate
      ) {

        send({

          type:
            "signal",

          target:
            viewer,

          signal: {

            type:
              "candidate",

            candidate:
              event.candidate
          }
        });
      }
    };


  pc.onconnectionstatechange =
    () => {

      log(
        "視聴者 " +
        viewer +
        " connection=" +
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "connected"
      ) {

        log(
          "🎉 映像接続成功"
        );
      }
    };


  return pc;
}


// -----------------------------
// Offer
// -----------------------------

async function sendOffer(
  viewer
) {

  log(
    "Offer作成"
  );


  const pc =
    createHostPeer(
      viewer
    );


  const offer =
    await pc.createOffer();


  await pc.setLocalDescription(
    offer
  );


  send({

    type:
      "signal",

    target:
      viewer,

    signal: {

      type:
        "offer",

      sdp:
        offer.sdp
    }

  });


  log(
    "Offer送信"
  );
}


// -----------------------------
// Viewer WebRTC
// -----------------------------

async function handleViewerSignal(
  msg
) {

  if (!viewerPeer) {

    viewerPeer =
      new RTCPeerConnection({

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
      });


    viewerPeer.onicecandidate =
      (event) => {

        if (
          event.candidate &&
          viewerId
        ) {

          send({

            type:
              "signal",

            target:
              viewerId,

            signal: {

              type:
                "candidate",

              candidate:
                event.candidate
            }

          });
        }
      };


    viewerPeer.ontrack =
      (event) => {

        log(
          "🎥 映像・音声受信"
        );


        if (
          event.streams &&
          event.streams[0]
        ) {

          remoteVideo.srcObject =
            event.streams[0];


          remoteVideo.classList
            .remove(
              "hidden"
            );


          document
            .getElementById(
              "audioButton"
            )
            .classList
            .remove(
              "hidden"
            );


          remoteVideo
            .play()
            .catch(() => {

              log(
                "音声ONボタンを押してください"
              );
            });


          setStatus(
            "配信中",
            true
          );
        }
      };


    viewerPeer
      .onconnectionstatechange =
      () => {

        log(
          "配信者 connection=" +
          viewerPeer
            .connectionState
        );


        if (
          viewerPeer
            .connectionState ===
          "connected"
        ) {

          setStatus(
            "配信中",
            true
          );

          log(
            "🎉 配信者と接続成功"
          );
        }
      };
  }


  if (
    msg.type ===
    "offer"
  ) {

    await viewerPeer
      .setRemoteDescription({

        type:
          "offer",

        sdp:
          msg.sdp
      });


    log(
      "Offer受信"
    );


    for (
      const candidate
      of pendingCandidates
    ) {

      try {

        await viewerPeer
          .addIceCandidate(
            candidate
          );

      } catch (e) {

        console.log(e);
      }
    }


    pendingCandidates = [];


    const answer =
      await viewerPeer
        .createAnswer();


    await viewerPeer
      .setLocalDescription(
        answer
      );


    send({

      type:
        "signal",

      target:
        viewerId,

      signal: {

        type:
          "answer",

        sdp:
          answer.sdp
      }

    });


    log(
      "Answer送信"
    );
  }


  if (
    msg.type ===
    "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        msg.candidate
      );


    if (
      viewerPeer
        .remoteDescription
    ) {

      try {

        await viewerPeer
          .addIceCandidate(
            candidate
          );

      } catch (e) {

        log(
          "ICEエラー"
        );
      }

    } else {

      pendingCandidates.push(
        candidate
      );
    }
  }
}


// -----------------------------
// Host signal
// -----------------------------

async function handleHostSignal(
  msg
) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc) {

    log(
      "Peerがありません"
    );

    return;
  }


  if (
    msg.signal.type ===
    "answer"
  ) {

    await pc
      .setRemoteDescription({

        type:
          "answer",

        sdp:
          msg.signal.sdp
      });


    log(
      "Answer受信"
    );

    return;
  }


  if (
    msg.signal.type ===
    "candidate"
  ) {

    try {

      await pc
        .addIceCandidate(

          new RTCIceCandidate(
            msg.signal.candidate
          )

        );

    } catch (e) {

      log(
        "ICE追加エラー"
      );
    }
  }
}


// -----------------------------
// メッセージ
// -----------------------------

async function handleMessage(
  msg
) {

  if (
    msg.type ===
    "welcome"
  ) {

    myId =
      msg.id;

    log(
      "ID=" +
      myId
    );

    return;
  }


  if (
    msg.type ===
    "stream-list"
  ) {

    renderStreams(
      msg.streams
    );

    return;
  }


  if (
    msg.type ===
    "stream-created"
  ) {

    myStreamId =
      msg.streamId;

    setStatus(
      "配信中",
      true
    );

    send({
      type:
        "stream-started"
    });

    return;
  }


  if (
    msg.type ===
    "joined-stream"
  ) {

    setStatus(
      "配信者を接続中..."
    );

    log(
      "配信参加OK"
    );

    return;
  }


  if (
    msg.type ===
    "viewer-joined"
  ) {

    if (
      myRole ===
      "host"
    ) {

      log(
        "視聴者参加: " +
        msg.viewerId
      );


      await sendOffer(
        msg.viewerId
      );
    }

    return;
  }


  if (
    msg.type ===
    "signal"
  ) {

    if (
      myRole ===
      "host"
    ) {

      await handleHostSignal(
        msg
      );

    } else {

      viewerId =
        msg.from;

      await handleViewerSignal(
        msg.signal
      );
    }

    return;
  }


  if (
    msg.type ===
    "room-status"
  ) {

    document
      .getElementById(
        "viewerCount"
      )
      .textContent =
      msg.viewers || 0;


    document
      .getElementById(
        "likeCount"
      )
      .textContent =
      msg.likes || 0;


    document
      .getElementById(
        "giftCount"
      )
      .textContent =
      msg.gifts || 0;


    if (myRole === "host") {

      info.textContent =
        "視聴者 " +
        msg.viewers +
        "人";
    }

    return;
  }


  if (
    msg.type ===
    "like-count"
  ) {

    document
      .getElementById(
        "likeCount"
      )
      .textContent =
      msg.likes;

    return;
  }


  if (
    msg.type ===
    "gift"
  ) {

    document
      .getElementById(
        "giftCount"
      )
      .textContent =
      msg.gifts;


    showGift(
      msg.from +
      " さんから 🎁 " +
      msg.gift
    );

    return;
  }


  if (
    msg.type ===
    "comment"
  ) {

    addComment(
      msg.name,
      msg.text
    );

    return;
  }


  if (
    msg.type ===
    "stream-started"
  ) {

    setStatus(
      "配信中",
      true
    );

    return;
  }


  if (
    msg.type ===
    "stream-stopped"
  ) {

    setStatus(
      "配信終了"
    );

    return;
  }


  if (
    msg.type ===
    "host-left"
  ) {

    setStatus(
      "配信者が退出しました"
    );


    remoteVideo.srcObject =
      null;

    return;
  }


  if (
    msg.type ===
    "viewer-left"
  ) {

    const pc =
      viewerConnections.get(
        msg.viewerId
      );


    if (pc) {

      pc.close();

      viewerConnections.delete(
        msg.viewerId
      );
    }

    return;
  }


  if (
    msg.type ===
    "error"
  ) {

    alert(
      msg.text
    );

    showHome();

    return;
  }
}


// -----------------------------
// ステータス
// -----------------------------

function setStatus(
  text,
  live = false
) {

  statusBox.textContent =
    text;

  statusBox.className =
    "status " +
    (
      live
        ? "live"
        : "wait"
    );
}


// -----------------------------
// 音声
// -----------------------------

async function enableAudio() {

  try {

    remoteVideo.muted =
      false;

    remoteVideo.volume =
      1;


    await remoteVideo.play();


    document
      .getElementById(
        "audioButton"
      )
      .classList
      .add(
        "hidden"
      );


    log(
      "🔊 音声ON"
    );

  } catch (e) {

    log(
      "音声エラー: " +
      e.message
    );
  }
}


// -----------------------------
// いいね
// -----------------------------

function sendLike() {

  if (
    myRole !==
    "viewer"
  ) {
    return;
  }

  send({
    type:
      "like"
  });
}


// -----------------------------
// ギフト
// -----------------------------

function sendGift() {

  if (
    myRole !==
    "viewer"
  ) {
    return;
  }

  send({

    type:
      "gift",

    gift:
      "ハートギフト"
  });
}


function showGift(
  text
) {

  const popup =
    document.getElementById(
      "giftPopup"
    );


  popup.textContent =
    text;


  popup.style.display =
    "block";


  setTimeout(
    () => {

      popup.style.display =
        "none";

    },
    1800
  );
}


// -----------------------------
// コメント
// -----------------------------

function sendComment() {

  const input =
    document.getElementById(
      "commentText"
    );


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  send({

    type:
      "comment",

    text
  });


  input.value =
    "";
}


function addComment(
  name,
  text
) {

  const box =
    document.getElementById(
      "comments"
    );


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "comment";


  const nameEl =
    document.createElement(
      "span"
    );


  nameEl.className =
    "commentName";


  nameEl.textContent =
    name + ": ";


  const textEl =
    document.createElement(
      "span"
    );


  textEl.className =
    "commentText";


  textEl.textContent =
    text;


  row.appendChild(
    nameEl
  );


  row.appendChild(
    textEl
  );


  box.appendChild(
    row
  );


  box.scrollTop =
    box.scrollHeight;
}


// -----------------------------
// 配信終了
// -----------------------------

function stopLive() {

  if (
    myRole !==
    "host"
  ) {
    return;
  }


  send({
    type:
      "stop-stream"
  });


  cleanup();


  showHome();


  loadStreams();
}


// -----------------------------
// 視聴終了
// -----------------------------

function leaveLive() {

  cleanup();

  showHome();

  loadStreams();
}


// -----------------------------
// クリーンアップ
// -----------------------------

function cleanup() {

  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      track.stop();
    }

    localStream =
      null;
  }


  for (
    const pc
    of viewerConnections.values()
  ) {

    pc.close();
  }


  viewerConnections.clear();


  if (viewerPeer) {

    viewerPeer.close();

    viewerPeer =
      null;
  }


  viewerId =
    null;


  pendingCandidates =
    [];


  if (ws) {

    ws.close();

    ws =
      null;
  }


  localVideo.srcObject =
    null;


  remoteVideo.srcObject =
    null;


  myRole =
    null;

  myStreamId =
    null;
}


// -----------------------------
// 最初に接続
// -----------------------------

connectSocket()
  .then(() => {

    send({
      type:
        "get-streams"
    });

  })
  .catch(() => {

    streamList.innerHTML =
      '<div class="status">' +
      'サーバーに接続できません' +
      '</div>';
  });

</script>

</body>

</html>
`;
