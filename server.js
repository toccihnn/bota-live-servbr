const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const rooms = new Map();

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ぼたライブ 音声テスト</title>
  <style>
    body {
      font-family: sans-serif;
      background: #111;
      color: #fff;
      margin: 0;
      padding: 24px;
      text-align: center;
    }

    h1 {
      margin-top: 20px;
    }

    .box {
      max-width: 420px;
      margin: 20px auto;
      padding: 20px;
      background: #222;
      border-radius: 16px;
    }

    button {
      width: 100%;
      padding: 16px;
      margin: 8px 0;
      border: 0;
      border-radius: 12px;
      font-size: 17px;
      font-weight: bold;
    }

    input {
      width: 90%;
      padding: 14px;
      border-radius: 10px;
      border: 0;
      margin: 8px 0;
      font-size: 16px;
    }

    #status {
      margin: 16px 0;
      padding: 12px;
      background: #333;
      border-radius: 10px;
    }

    audio {
      width: 100%;
      margin-top: 20px;
    }
  </style>
</head>

<body>

<h1>🎙️ ぼたライブ</h1>

<div class="box">

  <p>音声配信テスト</p>

  <input
    id="room"
    value="test-room"
    placeholder="ルーム名"
  >

  <button id="broadcast">
    🎙️ 配信者として入る
  </button>

  <button id="listen">
    👂 視聴者として入る
  </button>

  <div id="status">
    接続準備中...
  </div>

  <audio id="remoteAudio" controls autoplay></audio>

</div>

<script>

const statusEl = document.getElementById("status");
const roomInput = document.getElementById("room");
const broadcastButton = document.getElementById("broadcast");
const listenButton = document.getElementById("listen");
const remoteAudio = document.getElementById("remoteAudio");

let socket = null;
let peer = null;
let localStream = null;
let role = null;

const rtcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

function status(text) {
  statusEl.textContent = text;
}

function connectWebSocket() {

  const protocol =
    location.protocol === "https:" ? "wss://" : "ws://";

  socket = new WebSocket(
    protocol + location.host
  );

  socket.onopen = () => {
    status("サーバーに接続しました");
  };

  socket.onclose = () => {
    status("サーバーとの接続が切れました");
  };

  socket.onerror = () => {
    status("サーバー接続エラー");
  };

  socket.onmessage = async (event) => {

    const message = JSON.parse(event.data);

    if (message.type === "connected") {
      return;
    }

    if (message.type === "presence") {

      status(
        "ルーム参加者: " +
        message.count +
        "人"
      );

      return;
    }

    if (message.type === "offer") {

      if (role !== "viewer") {
        return;
      }

      await createPeer();

      await peer.setRemoteDescription(
        new RTCSessionDescription(message.data)
      );

      const answer =
        await peer.createAnswer();

      await peer.setLocalDescription(answer);

      socket.send(JSON.stringify({
        type: "answer",
        roomId: roomInput.value,
        data: answer
      }));

      status("配信者に接続中...");

      return;
    }

    if (message.type === "answer") {

      if (!peer) {
        return;
      }

      await peer.setRemoteDescription(
        new RTCSessionDescription(message.data)
      );

      status("音声接続完了");

      return;
    }

    if (message.type === "ice-candidate") {

      if (!peer || !message.data) {
        return;
      }

      try {
        await peer.addIceCandidate(
          new RTCIceCandidate(message.data)
        );
      } catch (error) {
        console.log(error);
      }

      return;
    }
  };
}

async function createPeer() {

  peer = new RTCPeerConnection(rtcConfig);

  peer.onicecandidate = (event) => {

    if (!event.candidate) {
      return;
    }

    socket.send(JSON.stringify({
      type: "ice-candidate",
      roomId: roomInput.value,
      data: event.candidate
    }));
  };

  peer.onconnectionstatechange = () => {

    status(
      "WebRTC: " +
      peer.connectionState
    );
  };

  peer.ontrack = (event) => {

    if (event.streams && event.streams[0]) {

      remoteAudio.srcObject =
        event.streams[0];

      remoteAudio.play().catch(() => {});
    }
  };

  return peer;
}

async function joinRoom() {

  const roomId =
    roomInput.value.trim();

  if (!roomId) {

    alert("ルーム名を入力してください");

    return false;
  }

  if (!socket) {
    connectWebSocket();
  }

  await new Promise(resolve => {

    if (socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    socket.addEventListener(
      "open",
      resolve,
      { once: true }
    );
  });

  socket.send(JSON.stringify({
    type: "join",
    roomId: roomId
  }));

  return true;
}

broadcastButton.onclick = async () => {

  try {

    role = "broadcaster";

    status("マイクへのアクセスを確認しています...");

    localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

    await joinRoom();

    await createPeer();

    for (const track of localStream.getTracks()) {

      peer.addTrack(
        track,
        localStream
      );
    }

    const offer =
      await peer.createOffer();

    await peer.setLocalDescription(offer);

    socket.send(JSON.stringify({
      type: "offer",
      roomId: roomInput.value,
      data: offer
    }));

    status(
      "🎙️ 配信中！視聴者の接続を待っています..."
    );

  } catch (error) {

    console.error(error);

    status(
      "マイクを使用できませんでした"
    );

    alert(
      "マイクの使用を許可してください"
    );
  }
};

listenButton.onclick = async () => {

  try {

    role = "viewer";

    await joinRoom();

    status(
      "👂 視聴中。配信者を待っています..."
    );

  } catch (error) {

    console.error(error);

    status(
      "視聴者として接続できませんでした"
    );
  }
};

connectWebSocket();

</script>

</body>
</html>`;

const server = http.createServer((req, res) => {

  if (req.url === "/" || req.url === "/index.html") {

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    res.end(html);

    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Bota Live Server is running!");
});

const wss = new WebSocket.Server({
  server
});

function send(ws, data) {

  if (ws.readyState === WebSocket.OPEN) {

    ws.send(
      JSON.stringify(data)
    );
  }
}

function broadcast(roomId, data) {

  const room = rooms.get(roomId);

  if (!room) {
    return;
  }

  for (const client of room.clients) {

    send(client, data);
  }
}

wss.on("connection", (ws) => {

  let roomId = null;

  const userId =
    Math.random()
      .toString(36)
      .slice(2);

  send(ws, {
    type: "connected",
    userId
  });

  ws.on("message", (raw) => {

    let message;

    try {

      message =
        JSON.parse(
          raw.toString()
        );

    } catch {

      return;
    }

    if (message.type === "join") {

      roomId =
        String(
          message.roomId || ""
        );

      if (!roomId) {

        send(ws, {
          type: "error",
          message: "roomIdが必要です"
        });

        return;
      }

      if (!rooms.has(roomId)) {

        rooms.set(roomId, {
          clients: new Set()
        });
      }

      const room =
        rooms.get(roomId);

      room.clients.add(ws);

      broadcast(roomId, {
        type: "presence",
        count: room.clients.size
      });

      return;
    }

    if (
      message.type === "offer" ||
      message.type === "answer" ||
      message.type === "ice-candidate"
    ) {

      if (!roomId) {
        return;
      }

      const room =
        rooms.get(roomId);

      if (!room) {
        return;
      }

      for (const client of room.clients) {

        if (client !== ws) {

          send(client, {
            type: message.type,
            from: userId,
            data: message.data
          });
        }
      }

      return;
    }
  });

  ws.on("close", () => {

    if (!roomId) {
      return;
    }

    const room =
      rooms.get(roomId);

    if (!room) {
      return;
    }

    room.clients.delete(ws);

    if (room.clients.size === 0) {

      rooms.delete(roomId);

    } else {

      broadcast(roomId, {
        type: "presence",
        count: room.clients.size
      });
    }
  });
});

server.listen(PORT, HOST, () => {

  console.log(
    "Bota Live Server running on port " +
    PORT
  );
});
