const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const rooms = new Map();

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1,maximum-scale=1">

<title>Bota Live</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #090909;
  color: white;
  font-family: Arial, "Noto Sans JP", sans-serif;
}

button,
input {
  font: inherit;
}

#login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loginBox {
  width: 100%;
  max-width: 400px;
  background: #181818;
  padding: 25px;
  border-radius: 20px;
}

.loginBox h1 {
  text-align: center;
}

.loginBox input {
  width: 100%;
  margin: 7px 0;
  padding: 14px;
  border: 1px solid #444;
  border-radius: 10px;
  background: #222;
  color: white;
}

.loginBox button {
  width: 100%;
  margin-top: 10px;
  padding: 14px;
  border: 0;
  border-radius: 10px;
  background: #ff2876;
  color: white;
  font-weight: bold;
}

#app {
  display: none;
  max-width: 700px;
  margin: auto;
}

header {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  background: #151515;
}

.logo {
  font-size: 21px;
  font-weight: bold;
}

.logo span {
  color: #ff2876;
}

.status {
  color: #aaa;
  font-size: 12px;
  text-align: right;
}

.videoArea {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  max-height: 72vh;
  background: #151515;
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #111;
}

#localVideo,
#remoteVideo {
  display: none;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #aaa;
}

.live {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 6px 12px;
  background: #ff1744;
  border-radius: 20px;
  font-weight: bold;
  display: none;
}

.viewers {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 6px 12px;
  background: #0009;
  border-radius: 20px;
}

.debug {
  padding: 8px 12px;
  background: #191919;
  color: #80ff80;
  font-size: 11px;
  word-break: break-all;
}

.info {
  padding: 14px;
  background: #111;
}

.title {
  font-size: 19px;
  font-weight: bold;
}

.roomName {
  color: #888;
  font-size: 13px;
  margin-top: 4px;
}

.chat {
  height: 180px;
  overflow-y: auto;
  padding: 10px;
  background: #0d0d0d;
}

.message {
  margin: 7px 0;
  font-size: 14px;
}

.name {
  color: #ff72a7;
  font-weight: bold;
}

.controls {
  display: flex;
  gap: 7px;
  padding: 10px;
  background: #111;
  overflow-x: auto;
}

.controls button {
  flex: 1;
  min-width: 95px;
  padding: 11px;
  border: 0;
  border-radius: 10px;
  background: #292929;
  color: white;
}

.controls .start {
  background: #ff2876;
}

.controls .gift {
  background: #ff9700;
}

.chatForm {
  display: flex;
  gap: 7px;
  padding: 10px;
  background: #111;
}

.chatForm input {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 10px;
  background: #222;
  color: white;
}

.chatForm button {
  border: 0;
  border-radius: 10px;
  padding: 0 15px;
  background: #ff2876;
  color: white;
}

.giftAnimation {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  font-size: 45px;
  z-index: 50;
  animation: gift 1s forwards;
  pointer-events: none;
}

@keyframes gift {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(.3);
  }

  30% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -80%) scale(1);
  }
}
</style>
</head>

<body>

<div id="login">

  <div class="loginBox">

    <h1>💗 Bota Live</h1>

    <input
      id="nameInput"
      placeholder="あなたの名前"
    >

    <input
      id="roomInput"
      placeholder="ルーム名"
      value="bota"
    >

    <button onclick="enterRoom()">
      入室する
    </button>

  </div>

</div>

<div id="app">

<header>

  <div class="logo">
    Bota <span>Live</span>
  </div>

  <div
    class="status"
    id="status"
  >
    接続中...
  </div>

</header>

<div class="videoArea">

  <video
    id="localVideo"
    autoplay
    muted
    playsinline
  ></video>

  <video
    id="remoteVideo"
    autoplay
    playsinline
  ></video>

  <div
    class="placeholder"
    id="placeholder"
  >

    <div style="font-size:50px">
      📺
    </div>

    <div id="placeholderText">
      配信を待っています
    </div>

  </div>

  <div
    class="live"
    id="liveBadge"
  >
    🔴 LIVE
  </div>

  <div class="viewers">
    👤
    <span id="viewerCount">
      0
    </span>
  </div>

</div>

<div
  class="debug"
  id="debug"
>
  WebRTC: 待機中
</div>

<div class="info">

  <div class="title">
    Bota Live 配信
  </div>

  <div class="roomName">
    ルーム：
    <span id="roomLabel"></span>
  </div>

</div>

<div
  class="chat"
  id="chat"
></div>

<div class="chatForm">

  <input
    id="message"
    placeholder="コメントを入力"
  >

  <button onclick="sendChat()">
    送信
  </button>

</div>

<div class="controls">

  <button
    class="start"
    id="startButton"
    onclick="startLive()"
  >
    🎥 配信開始
  </button>

  <button onclick="toggleCamera()">
    📷 カメラ
  </button>

  <button onclick="toggleMic()">
    🎤 マイク
  </button>

  <button
    class="gift"
    onclick="sendGift()"
  >
    🎁 ギフト
  </button>

</div>

</div>

<script>

let socket = null;

let roomId = "";

let userName = "";

let isHost = false;

let isLive = false;

let localStream = null;

const peers = {};

const pendingCandidates = {};

const rtcConfig = {

  iceServers: [

    {
      urls:
        "stun:stun.l.google.com:19302"
    }

  ]

};

function $(id) {

  return document.getElementById(id);

}

function debug(message) {

  console.log(
    "Bota Live:",
    message
  );

  $("debug").textContent =
    "WebRTC: " + message;

}

function enterRoom() {

  userName =
    $("nameInput")
      .value
      .trim() || "匿名";

  roomId =
    $("roomInput")
      .value
      .trim() || "bota";

  $("login").style.display =
    "none";

  $("app").style.display =
    "block";

  $("roomLabel").textContent =
    roomId;

  connect();

}

function connect() {

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

  socket.onopen = () => {

    $("status").textContent =
      isHost
        ? "配信者"
        : "接続中";

    debug(
      "WebSocket接続OK"
    );

    socket.send(
      JSON.stringify({

        type: "join",

        roomId: roomId,

        name: userName

      })
    );
  };

  socket.onerror = () => {

    debug(
      "WebSocketエラー"
    );
  };

  socket.onclose = () => {

    debug(
      "WebSocket切断"
    );

  };

  socket.onmessage =
    async event => {

      const data =
        JSON.parse(
          event.data
        );

      console.log(
        "受信:",
        data
      );

      if (
        data.type === "joined"
      ) {

        isHost =
          data.isHost;

        $("viewerCount")
          .textContent =
          data.count;

        $("status")
          .textContent =
          isHost
            ? "配信者"
            : "視聴者";

        debug(
          isHost
            ? "配信者として入室"
            : "視聴者として入室"
        );

        return;
      }

      if (
        data.type ===
        "viewerCount"
      ) {

        $("viewerCount")
          .textContent =
          data.count;

        return;
      }

      if (
        data.type ===
        "viewerJoined"
      ) {

        debug(
          "視聴者接続要求を受信"
        );

        if (
          isHost &&
          isLive
        ) {

          await createOffer(
            data.viewerId
          );
        }

        return;
      }

      if (
        data.type === "live"
      ) {

        $("liveBadge")
          .style.display =
          data.active
            ? "block"
            : "none";

        if (data.active) {

          $("placeholderText")
            .textContent =
            "配信中";

        } else {

          $("placeholderText")
            .textContent =
            "配信を待っています";
        }

        debug(
          data.active
            ? "配信中"
            : "待機中"
        );

        return;
      }

      if (
        data.type === "offer"
      ) {

        debug(
          "Offer受信"
        );

        await receiveOffer(
          data
        );

        return;
      }

      if (
        data.type === "answer"
      ) {

        debug(
          "Answer受信"
        );

        await receiveAnswer(
          data
        );

        return;
      }

      if (
        data.type ===
        "candidate"
      ) {

        await receiveCandidate(
          data
        );

        return;
      }

      if (
        data.type === "chat"
      ) {

        addChat(
          data.name,
          data.message
        );

        return;
      }

      if (
        data.type === "gift"
      ) {

        showGift(
          data.name
        );

        return;
      }

    };

}

async function startLive() {

  if (localStream) {

    return;

  }

  try {

    debug(
      "カメラ・マイク取得中..."
    );

    localStream =
      await navigator
        .mediaDevices
        .getUserMedia({

          video: true,

          audio: true

        });

    $("localVideo")
      .srcObject =
      localStream;

    $("localVideo")
      .style.display =
      "block";

    $("remoteVideo")
      .style.display =
      "none";

    $("placeholder")
      .style.display =
      "none";

    $("liveBadge")
      .style.display =
      "block";

    $("startButton")
      .textContent =
      "🔴 配信中";

    isLive = true;

    debug(
      "カメラ・マイクOK"
    );

    socket.send(
      JSON.stringify({

        type: "live",

        roomId: roomId,

        active: true

      })
    );

  } catch (error) {

    console.error(error);

    debug(
      "カメラ・マイク取得失敗"
    );

    alert(
      "カメラとマイクを許可してください。"
    );

  }

}

async function createPeer(
  viewerId
) {

  debug(
    "PeerConnection作成"
  );

  const pc =
    new RTCPeerConnection(
      rtcConfig
    );

  peers[viewerId] = pc;

  pendingCandidates[viewerId] =
    [];

  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {

        pc.addTrack(
          track,
          localStream
        );

      });

  }

  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        debug(
          "ICE candidate送信"
        );

        socket.send(
          JSON.stringify({

            type:
              "candidate",

            target:
              viewerId,

            candidate:
              event.candidate

          })
        );

      }

    };

  pc.oniceconnectionstatechange =
    () => {

      debug(
        "ICE: " +
        pc.iceConnectionState
      );

    };

  pc.onconnectionstatechange =
    () => {

      debug(
        "接続: " +
        pc.connectionState
      );

      if (
        pc.connectionState ===
        "connected"
      ) {

        debug(
          "🎉 映像接続成功"
        );

      }

    };

  pc.onicegatheringstatechange =
    () => {

      console.log(
        "ICE gathering:",
        pc.iceGatheringState
      );

    };

  return pc;

}

async function createOffer(
  viewerId
) {

  try {

    debug(
      "Offer作成中..."
    );

    const pc =
      await createPeer(
        viewerId
      );

    const offer =
      await pc.createOffer();

    await pc.setLocalDescription(
      offer
    );

    debug(
      "Offer送信"
    );

    socket.send(
      JSON.stringify({

        type: "offer",

        target: viewerId,

        offer:
          pc.localDescription

      })
    );

  } catch (error) {

    console.error(
      error
    );

    debug(
      "Offer作成失敗"
    );

  }

}

async function receiveOffer(
  data
) {

  try {

    debug(
      "Offer処理中..."
    );

    const pc =
      new RTCPeerConnection(
        rtcConfig
      );

    peers[data.from] =
      pc;

    pendingCandidates[data.from] =
      [];

    pc.onicecandidate =
      event => {

        if (
          event.candidate
        ) {

          socket.send(
            JSON.stringify({

              type:
                "candidate",

              target:
                data.from,

              candidate:
                event.candidate

            })
          );

        }

      };

    pc.oniceconnectionstatechange =
      () => {

        debug(
          "ICE: " +
          pc.iceConnectionState
        );

      };

    pc.onconnectionstatechange =
      () => {

        debug(
          "接続: " +
          pc.connectionState
        );

        if (
          pc.connectionState ===
          "connected"
        ) {

          debug(
            "🎉 映像接続成功"
          );

        }

      };

    pc.ontrack =
      event => {

        console.log(
          "TRACK受信",
          event.streams
        );

        if (
          event.streams &&
          event.streams[0]
        ) {

          $("remoteVideo")
            .srcObject =
            event.streams[0];

          $("remoteVideo")
            .style.display =
            "block";

          $("localVideo")
            .style.display =
            "none";

          $("placeholder")
            .style.display =
            "none";

          $("liveBadge")
            .style.display =
            "block";

          debug(
            "🎥 映像・音声受信"
          );

        }

      };

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.offer
      )
    );

    if (
      pendingCandidates[data.from]
    ) {

      for (
        const candidate
        of pendingCandidates[data.from]
      ) {

        await pc.addIceCandidate(
          candidate
        );

      }

      pendingCandidates[data.from] =
        [];

    }

    const answer =
      await pc.createAnswer();

    await pc.setLocalDescription(
      answer
    );

    socket.send(
      JSON.stringify({

        type: "answer",

        target: data.from,

        answer:
          pc.localDescription

      })
    );

    debug(
      "Answer送信"
    );

  } catch (error) {

    console.error(
      error
    );

    debug(
      "Offer処理失敗"
    );

  }

}

async function receiveAnswer(
  data
) {

  const pc =
    peers[data.from];

  if (!pc) {

    debug(
      "Peerが見つからない"
    );

    return;

  }

  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.answer
      )
    );

    debug(
      "Answer設定完了"
    );

  } catch (error) {

    console.error(
      error
    );

    debug(
      "Answer設定失敗"
    );

  }

}

async function receiveCandidate(
  data
) {

  const candidate =
    new RTCIceCandidate(
      data.candidate
    );

  const pc =
    peers[data.from];

  if (!pc) {

    return;

  }

  if (
    pc.remoteDescription
  ) {

    try {

      await pc.addIceCandidate(
        candidate
      );

    } catch (error) {

      console.error(
        error
      );

    }

  } else {

    if (
      !pendingCandidates[data.from]
    ) {

      pendingCandidates[data.from] =
        [];

    }

    pendingCandidates[data.from]
      .push(candidate);

  }

}

function toggleCamera() {

  if (!localStream) {

    alert(
      "先に配信開始してね"
    );

    return;

  }

  const track =
    localStream
      .getVideoTracks()[0];

  track.enabled =
    !track.enabled;

}

function toggleMic() {

  if (!localStream) {

    alert(
      "先に配信開始してね"
    );

    return;

  }

  const track =
    localStream
      .getAudioTracks()[0];

  track.enabled =
    !track.enabled;

}

function sendChat() {

  const input =
    $("message");

  const message =
    input.value.trim();

  if (
    !message ||
    !socket
  ) {

    return;

  }

  socket.send(
    JSON.stringify({

      type: "chat",

      roomId: roomId,

      name: userName,

      message: message

    })
  );

  input.value = "";

}

$("message").addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      sendChat();

    }

  }
);

function addChat(
  name,
  message
) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    "message";

  const nameSpan =
    document.createElement(
      "span"
    );

  nameSpan.className =
    "name";

  nameSpan.textContent =
    name;

  div.appendChild(
    nameSpan
  );

  div.appendChild(
    document.createTextNode(
      "：" + message
    )
  );

  $("chat").appendChild(
    div
  );

  $("chat").scrollTop =
    $("chat").scrollHeight;

}

function sendGift() {

  if (!socket) {

    return;

  }

  socket.send(
    JSON.stringify({

      type: "gift",

      roomId: roomId,

      name: userName

    })
  );

}

function showGift(name) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    "giftAnimation";

  div.textContent =
    "🎁 " + name;

  document.body.appendChild(
    div
  );

  setTimeout(
    () => div.remove(),
    1000
  );

}

</script>

</body>
</html>`;

const server =
  http.createServer(
    (req, res) => {

      if (
        req.url === "/" ||
        req.url === "/index.html"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8"
          }
        );

        res.end(html);

        return;

      }

      res.writeHead(404);

      res.end("Not Found");

    }
  );

const wss =
  new WebSocket.Server({
    server
  });

function send(ws, data) {

  if (
    ws.readyState ===
    WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify(data)
    );

  }

}

function broadcastRoom(
  roomId,
  data
) {

  const room =
    rooms.get(roomId);

  if (!room) {

    return;

  }

  for (
    const client
    of room.clients
  ) {

    send(
      client,
      data
    );

  }

}

function findClient(id) {

  for (
    const client
    of wss.clients
  ) {

    if (
      client.id === id
    ) {

      return client;

    }

  }

  return null;

}

wss.on(
  "connection",
  ws => {

    ws.id =
      Math.random()
        .toString(36)
        .substring(2);

    ws.roomId = null;

    ws.name = "匿名";

    ws.isHost = false;

    ws.on(
      "message",
      raw => {

        let data;

        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch {

          return;

        }

        if (
          data.type ===
          "join"
        ) {

          ws.roomId =
            String(
              data.roomId ||
              "bota"
            );

          ws.name =
            String(
              data.name ||
              "匿名"
            ).substring(
              0,
              30
            );

          if (
            !rooms.has(
              ws.roomId
            )
          ) {

            rooms.set(
              ws.roomId,
              {
                clients:
                  new Set(),
                host: null,
                live: false
              }
            );

          }

          const room =
            rooms.get(
              ws.roomId
            );

          if (!room.host) {

            room.host = ws;

            ws.isHost = true;

          }

          room.clients.add(ws);

          send(
            ws,
            {
              type: "joined",

              isHost:
                ws.isHost,

              count:
                room.clients.size
            }
          );

          broadcastRoom(
            ws.roomId,
            {
              type:
                "viewerCount",

              count:
                room.clients.size
            }
          );

          if (
            !ws.isHost &&
            room.live &&
            room.host
          ) {

            send(
              room.host,
              {
                type:
                  "viewerJoined",

                viewerId:
                  ws.id
              }
            );

            send(
              ws,
              {
                type: "live",

                active: true
              }
            );

          }

          return;

        }

        if (!ws.roomId) {

          return;

        }

        const room =
          rooms.get(
            ws.roomId
          );

        if (!room) {

          return;

        }

        if (
          data.type ===
          "live"
        ) {

          if (
            !ws.isHost
          ) {

            return;

          }

          room.live =
            Boolean(
              data.active
            );

          broadcastRoom(
            ws.roomId,
            {
              type: "live",

              active:
                room.live
            }
          );

          return;

        }

        if (
          data.type ===
          "chat"
        ) {

          broadcastRoom(
            ws.roomId,
            {
              type: "chat",

              name:
                ws.name,

              message:
                String(
                  data.message ||
                  ""
                ).substring(
                  0,
                  300
                )
            }
          );

          return;

        }

        if (
          data.type ===
          "gift"
        ) {

          broadcastRoom(
            ws.roomId,
            {
              type: "gift",

              name:
                ws.name
            }
          );

          return;

        }

        if (
          data.type ===
            "offer" ||
          data.type ===
            "answer" ||
          data.type ===
            "candidate"
        ) {

          const target =
            findClient(
              data.target
            );

          if (!target) {

            console.log(
              "送信先なし:",
              data.target
            );

            return;

          }

          send(
            target,
            {
              type:
                data.type,

              from:
                ws.id,

              offer:
                data.offer,

              answer:
                data.answer,

              candidate:
                data.candidate
            }
          );

          return;

        }

      }
    );

    ws.on(
      "close",
      () => {

        if (!ws.roomId) {

          return;

        }

        const room =
          rooms.get(
            ws.roomId
          );

        if (!room) {

          return;

        }

        room.clients.delete(ws);

        if (
          room.host === ws
        ) {

          room.host = null;

          room.live = false;

        }

        if (
          room.clients.size ===
          0
        ) {

          rooms.delete(
            ws.roomId
          );

        } else {

          broadcastRoom(
            ws.roomId,
            {
              type:
                "viewerCount",

              count:
                room.clients.size
            }
          );

        }

      }
    );

  }
);

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "Bota Live Server running on port " +
      PORT
    );

  }
);
