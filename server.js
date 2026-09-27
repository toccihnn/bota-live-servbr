const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

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

const wss = new WebSocket.Server({ server });

let nextId = 1;
const clients = new Map();

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  const id = String(nextId++);

  const client = {
    id,
    ws,
    role: null,
    room: "bota"
  };

  clients.set(id, client);

  send(ws, {
    type: "welcome",
    id
  });

  ws.on("message", (raw) => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // ============================
    // 参加
    // ============================
    if (msg.type === "join") {
      client.role =
        msg.role === "host"
          ? "host"
          : "viewer";

      client.room =
        msg.room || "bota";

      console.log(
        `[JOIN] ${id} role=${client.role} room=${client.room}`
      );

      if (client.role === "host") {
        send(ws, {
          type: "status",
          text: "配信者として接続しました"
        });

        // 既にいる視聴者を通知
        for (const other of clients.values()) {
          if (
            other.id !== client.id &&
            other.room === client.room &&
            other.role === "viewer"
          ) {
            send(ws, {
              type: "viewer-joined",
              viewerId: other.id
            });
          }
        }
      }

      if (client.role === "viewer") {
        send(ws, {
          type: "status",
          text: "視聴者として接続しました"
        });

        // 配信者へ通知
        for (const other of clients.values()) {
          if (
            other.room === client.room &&
            other.role === "host"
          ) {
            send(other.ws, {
              type: "viewer-joined",
              viewerId: client.id
            });
          }
        }
      }

      updateRoomStatus(client.room);
      return;
    }

    // ============================
    // WebRTCシグナリング
    // ============================
    if (msg.type === "signal") {
      const target = clients.get(msg.target);

      if (!target) {
        console.log(
          "[SIGNAL] target not found:",
          msg.target
        );
        return;
      }

      if (target.room !== client.room) {
        return;
      }

      send(target.ws, {
        type: "signal",
        from: client.id,
        signal: msg.signal
      });

      return;
    }

    // ============================
    // 配信開始
    // ============================
    if (msg.type === "stream-started") {
      for (const other of clients.values()) {
        if (
          other.room === client.room &&
          other.role === "viewer"
        ) {
          send(other.ws, {
            type: "stream-started"
          });
        }
      }

      updateRoomStatus(client.room);
      return;
    }

    // ============================
    // 配信停止
    // ============================
    if (msg.type === "stream-stopped") {
      for (const other of clients.values()) {
        if (
          other.room === client.room &&
          other.role === "viewer"
        ) {
          send(other.ws, {
            type: "stream-stopped"
          });
        }
      }

      updateRoomStatus(client.room);
      return;
    }
  });

  ws.on("close", () => {
    console.log(`[CLOSE] ${id}`);

    const room = client.room;
    const role = client.role;

    clients.delete(id);

    if (role === "host") {
      for (const other of clients.values()) {
        if (
          other.room === room &&
          other.role === "viewer"
        ) {
          send(other.ws, {
            type: "host-left"
          });
        }
      }
    }

    if (role === "viewer") {
      for (const other of clients.values()) {
        if (
          other.room === room &&
          other.role === "host"
        ) {
          send(other.ws, {
            type: "viewer-left",
            viewerId: id
          });
        }
      }
    }

    updateRoomStatus(room);
  });
});

function updateRoomStatus(room) {
  let host = false;
  let viewers = 0;

  for (const client of clients.values()) {
    if (client.room !== room) continue;

    if (client.role === "host") {
      host = true;
    }

    if (client.role === "viewer") {
      viewers++;
    }
  }

  for (const client of clients.values()) {
    if (client.room === room) {
      send(client.ws, {
        type: "room-status",
        live: host,
        viewers
      });
    }
  }
}

server.listen(PORT, HOST, () => {
  console.log("=================================");
  console.log("Bota Live Server");
  console.log(`PORT: ${PORT}`);
  console.log("Server started!");
  console.log("=================================");
});


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
  width: 100%;
  min-height: 100vh;
  padding: 16px;
}

h1 {
  text-align: center;
  margin: 10px 0 20px;
}

.card {
  max-width: 700px;
  margin: 0 auto;
  background: #151515;
  border-radius: 18px;
  padding: 18px;
}

button {
  width: 100%;
  padding: 16px;
  margin: 7px 0;
  border: 0;
  border-radius: 12px;
  font-size: 17px;
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

video {
  width: 100%;
  max-height: 65vh;
  background: #000;
  border-radius: 14px;
  object-fit: contain;
  display: block;
}

#localVideo {
  transform: scaleX(-1);
}

.status {
  margin: 12px 0;
  padding: 12px;
  background: #202020;
  border-radius: 10px;
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
  margin-top: 10px;
}

.warning {
  color: #ffd43b;
  font-size: 13px;
  text-align: center;
  margin: 10px 0;
  line-height: 1.6;
}

#log {
  margin-top: 15px;
  padding: 10px;
  background: #050505;
  border-radius: 10px;
  font-size: 12px;
  color: #00ff66;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
}

</style>

</head>

<body>

<div id="app">

<div class="card">

<h1>🎥 Bota Live</h1>

<div id="roleSelect">

<div class="status">
役割を選んでください
</div>

<button
class="hostButton"
onclick="startHost()"
>
🎥 配信者として開始
</button>

<button
class="viewerButton"
onclick="startViewer()"
>
👀 視聴者として見る
</button>

</div>


<div id="liveArea" class="hidden">

<div id="status" class="status">
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
muted
class="hidden"
></video>


<div
id="audioWarning"
class="warning hidden"
>
🔇 現在は音声OFFです<br>
音声をONにするときはイヤホン推奨
</div>


<button
id="audioButton"
class="audioButton hidden"
onclick="enableAudio()"
>
🔊 音声をONにする
</button>


<button
id="muteButton"
class="audioButton hidden"
onclick="disableAudio()"
>
🔇 音声をOFFにする
</button>


<button
id="stopButton"
class="stopButton"
onclick="stopLive()"
>
⛔ 終了
</button>


<div id="info" class="small"></div>

<div id="log"></div>

</div>

</div>

</div>


<script>

let ws = null;

let myId = null;

let myRole = null;

let localStream = null;

let viewerConnections = new Map();

let viewerPeer = null;

let viewerId = null;

let pendingCandidates = [];

const room = "bota";


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

const audioButton =
document.getElementById("audioButton");

const muteButton =
document.getElementById("muteButton");

const audioWarning =
document.getElementById("audioWarning");


function log(text) {

  console.log(text);

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


function setStatus(text, live = false) {

  statusBox.textContent = text;

  statusBox.className =
    "status " +
    (live ? "live" : "wait");
}


function connectSocket() {

  return new Promise((resolve, reject) => {

    const protocol =
      location.protocol === "https:"
        ? "wss:"
        : "ws:";

    ws = new WebSocket(
      protocol +
      "//" +
      location.host
    );

    ws.onopen = () => {

      log("WebSocket接続OK");

      resolve();

    };

    ws.onerror = () => {

      log("WebSocket ERROR");

      reject(
        new Error("WebSocket接続エラー")
      );

    };

    ws.onclose = () => {

      log("WebSocket切断");

    };

    ws.onmessage = async (event) => {

      try {

        const msg =
          JSON.parse(event.data);

        await handleMessage(msg);

      } catch (e) {

        console.error(e);

        log(
          "message error: " +
          e.message
        );

      }

    };

  });

}


function send(data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify(data)
    );

  }

}


// ====================================
// 配信者
// ====================================

async function startHost() {

  myRole = "host";

  document
    .getElementById("roleSelect")
    .classList.add("hidden");

  document
    .getElementById("liveArea")
    .classList.remove("hidden");

  setStatus(
    "配信者として接続中..."
  );

  try {

    await connectSocket();

    send({
      type: "join",
      role: "host",
      room
    });

    log(
      "配信者として参加"
    );

    await startCamera();

    setStatus(
      "配信中",
      true
    );

    send({
      type: "stream-started"
    });

  } catch (e) {

    log(
      "配信開始エラー: " +
      e.message
    );

    setStatus(
      "カメラを開始できません"
    );

  }

}


// ====================================
// 視聴者
// ====================================

async function startViewer() {

  myRole = "viewer";

  document
    .getElementById("roleSelect")
    .classList.add("hidden");

  document
    .getElementById("liveArea")
    .classList.remove("hidden");

  remoteVideo.classList.remove(
    "hidden"
  );

  // ★最重要
  // 視聴者は最初から必ずミュート
  remoteVideo.muted = true;

  audioWarning.classList.remove(
    "hidden"
  );

  setStatus(
    "配信を接続中..."
  );

  try {

    await connectSocket();

    send({
      type: "join",
      role: "viewer",
      room
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


// ====================================
// カメラ・マイク
// ====================================

async function startCamera() {

  localStream =
    await navigator.mediaDevices
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


// ====================================
// 配信者側 Peer
// ====================================

function createHostPeer(viewer) {

  const old =
    viewerConnections.get(viewer);

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

          type: "signal",

          target: viewer,

          signal: {

            type: "candidate",

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
          "🎉 視聴者と接続成功"
        );

      }

    };


  return pc;

}


async function sendOffer(viewer) {

  log(
    "Offer作成: " +
    viewer
  );

  const pc =
    createHostPeer(viewer);


  const offer =
    await pc.createOffer();


  await pc.setLocalDescription(
    offer
  );


  send({

    type: "signal",

    target: viewer,

    signal: {

      type: "offer",

      sdp: offer.sdp

    }

  });


  log(
    "Offer送信"
  );

}


// ====================================
// 視聴者側 Peer
// ====================================

async function handleViewerSignal(msg) {

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

            type: "signal",

            target: viewerId,

            signal: {

              type: "candidate",

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
            .remove("hidden");


          // ★最初は必ずミュート
          remoteVideo.muted = true;


          audioButton.classList
            .remove("hidden");


          audioWarning.classList
            .remove("hidden");


          remoteVideo.play()
            .catch(() => {

              log(
                "映像再生待ち"
              );

            });


          setStatus(
            "配信中",
            true
          );

        }

      };


    viewerPeer.onconnectionstatechange =
      () => {

        log(
          "配信者 connection=" +
          viewerPeer.connectionState
        );


        if (
          viewerPeer.connectionState ===
          "connected"
        ) {

          setStatus(
            "配信中",
            true
          );

          log(
            "🎉 配信者との接続成功"
          );

        }

      };

  }


  if (
    msg.type === "offer"
  ) {

    await viewerPeer.setRemoteDescription({

      type: "offer",

      sdp: msg.sdp

    });


    log(
      "Offer受信"
    );


    for (
      const candidate
      of pendingCandidates
    ) {

      try {

        await viewerPeer.addIceCandidate(
          candidate
        );

      } catch (e) {

        console.log(e);

      }

    }


    pendingCandidates = [];


    const answer =
      await viewerPeer.createAnswer();


    await viewerPeer.setLocalDescription(
      answer
    );


    send({

      type: "signal",

      target: viewerId,

      signal: {

        type: "answer",

        sdp: answer.sdp

      }

    });


    log(
      "Answer送信"
    );

  }


  if (
    msg.type === "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        msg.candidate
      );


    if (
      viewerPeer.remoteDescription
    ) {

      try {

        await viewerPeer.addIceCandidate(
          candidate
        );

      } catch (e) {

        log(
          "ICE candidate error"
        );

      }

    } else {

      pendingCandidates.push(
        candidate
      );

    }

  }

}


// ====================================
// 配信者側 Signal
// ====================================

async function handleHostSignal(msg) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc) {

    log(
      "Peerが見つかりません: " +
      msg.from
    );

    return;

  }


  if (
    msg.signal.type ===
    "answer"
  ) {

    await pc.setRemoteDescription({

      type: "answer",

      sdp: msg.signal.sdp

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

      await pc.addIceCandidate(

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


// ====================================
// メッセージ
// ====================================

async function handleMessage(msg) {

  if (
    msg.type === "welcome"
  ) {

    myId = msg.id;

    log(
      "ID=" + myId
    );

    return;

  }


  if (
    msg.type === "status"
  ) {

    log(
      msg.text
    );

    return;

  }


  if (
    msg.type === "room-status"
  ) {

    if (
      myRole === "host"
    ) {

      info.textContent =
        "視聴者: " +
        msg.viewers +
        "人";

    } else {

      info.textContent =
        msg.live
          ? "配信者が配信中"
          : "配信待機中";

    }

    return;

  }


  if (
    msg.type === "viewer-joined"
  ) {

    if (
      myRole === "host"
    ) {

      log(
        "新しい視聴者: " +
        msg.viewerId
      );

      await sendOffer(
        msg.viewerId
      );

    }

    return;

  }


  if (
    msg.type === "signal"
  ) {

    if (
      myRole === "host"
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
    msg.type === "stream-started"
  ) {

    if (
      myRole === "viewer"
    ) {

      setStatus(
        "配信者が配信中",
        true
      );

    }

    return;

  }


  if (
    msg.type === "stream-stopped"
  ) {

    setStatus(
      "配信終了"
    );

    remoteVideo.srcObject =
      null;

    return;

  }


  if (
    msg.type === "host-left"
  ) {

    setStatus(
      "配信者が退出しました"
    );

    remoteVideo.srcObject =
      null;

    return;

  }


  if (
    msg.type === "viewer-left"
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

}


// ====================================
// 音声ON
// ====================================

async function enableAudio() {

  try {

    remoteVideo.muted = false;

    remoteVideo.volume = 1;

    await remoteVideo.play();


    audioButton.classList
      .add("hidden");


    muteButton.classList
      .remove("hidden");


    audioWarning.classList
      .add("hidden");


    log(
      "🔊 音声ON"
    );


  } catch (e) {

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}


// ====================================
// 音声OFF
// ====================================

function disableAudio() {

  remoteVideo.muted = true;

  remoteVideo.pause();

  remoteVideo.play()
    .catch(() => {});


  audioButton.classList
    .remove("hidden");


  muteButton.classList
    .add("hidden");


  audioWarning.classList
    .remove("hidden");


  log(
    "🔇 音声OFF"
  );

}


// ====================================
// 終了
// ====================================

function stopLive() {

  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      track.stop();

    }

    localStream = null;

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

    viewerPeer = null;

  }


  if (ws) {

    ws.close();

    ws = null;

  }


  localVideo.srcObject =
    null;

  remoteVideo.srcObject =
    null;


  document
    .getElementById("liveArea")
    .classList
    .add("hidden");


  document
    .getElementById("roleSelect")
    .classList
    .remove("hidden");


  audioButton.classList
    .add("hidden");


  muteButton.classList
    .add("hidden");


  audioWarning.classList
    .add("hidden");


  setStatus(
    "停止しました"
  );

}

</script>

</body>
</html>
`;
