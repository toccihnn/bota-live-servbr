const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";


// =====================================================
// HTML
// =====================================================

const HTML = `
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1.0,user-scalable=no">

<title>Voice Bota Live</title>

<style>

* {
  box-sizing: border-box;
}

html,body {
  margin: 0;
  padding: 0;
  background: #080808;
  color: white;
  font-family: Arial,"Noto Sans JP",sans-serif;
}

body {
  min-height: 100vh;
}

#app {
  padding: 14px;
}

.card {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
  background: #151515;
  border-radius: 20px;
}

h1 {
  text-align: center;
  margin: 5px 0 20px;
}

.status {
  padding: 14px;
  margin: 12px 0;
  border-radius: 12px;
  background: #222;
  text-align: center;
}

.live {
  color: #00ff66;
  font-weight: bold;
}

.wait {
  color: #aaa;
}

button {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 16px;
  margin: 7px 0;
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

.audioButton {
  background: #f59f00;
  color: black;
}

.stopButton {
  background: #d6336c;
  color: white;
}

.hidden {
  display: none !important;
}

.info {
  text-align: center;
  color: #aaa;
  margin: 12px 0;
}

.voiceBox {
  margin-top: 15px;
  padding: 30px 15px;
  background: #0d0d0d;
  border-radius: 18px;
  text-align: center;
}

.mic {
  font-size: 60px;
}

#log {
  margin-top: 15px;
  padding: 10px;
  height: 220px;
  overflow-y: auto;
  background: #050505;
  border-radius: 10px;
  color: #00ff66;
  font-size: 12px;
  white-space: pre-wrap;
}

</style>

</head>


<body>

<div id="app">

<div class="card">

<h1>🎙️ Voice Bota Live</h1>


<div id="roleSelect">

<div class="status">
役割を選んでください
</div>

<button
class="hostButton"
onclick="startHost()">
🎙️ 配信者として開始
</button>

<button
class="viewerButton"
onclick="startViewer()">
👂 視聴者として参加
</button>

</div>


<div id="liveArea" class="hidden">

<div id="status" class="status">
接続中...
</div>

<div class="voiceBox">

<div class="mic">
🎙️
</div>

<div id="voiceText">
音声配信
</div>

</div>

<div id="info" class="info"></div>


<button
id="audioButton"
class="audioButton hidden"
onclick="enableAudio()">
🔊 音声をONにする
</button>


<button
class="stopButton"
onclick="stopLive()">
⛔ 終了
</button>


<div id="log"></div>

</div>

</div>

</div>


<audio
id="remoteAudio"
autoplay
playsinline>
</audio>


<script>

// =====================================================
// VARIABLES
// =====================================================

let ws = null;

let myId = null;

let myRole = null;

let localStream = null;

let viewerPeer = null;

let viewerId = null;

let viewerConnections = new Map();

let pendingViewerCandidates = [];

let pendingHostCandidates = new Map();

let reconnectTimer = null;

let manuallyStopped = false;

let joined = false;

let streamStarted = false;

const ROOM = "bota";


const statusBox =
document.getElementById("status");

const infoBox =
document.getElementById("info");

const logBox =
document.getElementById("log");

const remoteAudio =
document.getElementById("remoteAudio");


// =====================================================
// LOG
// =====================================================

function log(text) {

  console.log(text);

  logBox.textContent += text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


// =====================================================
// STATUS
// =====================================================

function setStatus(text, live = false) {

  statusBox.textContent = text;

  statusBox.className =
    live
      ? "status live"
      : "status wait";
}


// =====================================================
// SOCKET URL
// =====================================================

function socketURL() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return protocol + "//" + location.host;
}


// =====================================================
// SEND
// =====================================================

function send(data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    ws.send(JSON.stringify(data));

  } else {

    log("⚠️ WebSocket未接続");

  }
}


// =====================================================
// CONNECT
// =====================================================

function connectSocket() {

  return new Promise((resolve, reject) => {

    if (
      ws &&
      ws.readyState === WebSocket.OPEN
    ) {

      resolve();

      return;
    }


    log("WebSocket接続中...");


    ws = new WebSocket(socketURL());


    let finished = false;


    ws.onopen = () => {

      log("✅ WebSocket接続OK");


      if (!finished) {

        finished = true;

        resolve();

      }


      if (myRole && !joined) {

        joinRoom();

      }

    };


    ws.onerror = () => {

      log("❌ WebSocketエラー");


      if (!finished) {

        finished = true;

        reject(
          new Error("WebSocket接続失敗")
        );

      }

    };


    ws.onmessage = async event => {

      try {

        const msg =
          JSON.parse(event.data);

        await handleMessage(msg);

      } catch (e) {

        log(
          "メッセージエラー: " +
          e.message
        );

      }

    };


    ws.onclose = event => {

      log(
        "❌ WebSocket切断 code=" +
        event.code
      );


      joined = false;


      if (
        !manuallyStopped &&
        myRole
      ) {

        setStatus(
          "接続切断。再接続中..."
        );

        reconnect();

      }

    };

  });

}


// =====================================================
// RECONNECT
// =====================================================

function reconnect() {

  if (reconnectTimer) {
    return;
  }


  reconnectTimer =
    setTimeout(async () => {

      reconnectTimer = null;


      if (
        manuallyStopped ||
        !myRole
      ) {

        return;

      }


      try {

        await connectSocket();

      } catch {

        reconnect();

      }

    }, 2000);

}


// =====================================================
// JOIN
// =====================================================

function joinRoom() {

  send({

    type: "join",

    role: myRole,

    room: ROOM

  });

}


// =====================================================
// HOST START
// =====================================================

async function startHost() {

  manuallyStopped = false;

  myRole = "host";


  document
    .getElementById("roleSelect")
    .classList
    .add("hidden");


  document
    .getElementById("liveArea")
    .classList
    .remove("hidden");


  setStatus(
    "🎙️ マイクを準備中..."
  );


  try {

    await connectSocket();

    joinRoom();


    await startMicrophone();


    streamStarted = true;


    setStatus(
      "🎙️ 配信中",
      true
    );


    document.getElementById(
      "voiceText"
    ).textContent =
      "あなたは配信者です";


    send({
      type: "stream-started"
    });


  } catch (e) {

    log(
      "配信開始エラー: " +
      e.message
    );


    setStatus(
      "配信開始失敗"
    );

  }

}


// =====================================================
// VIEWER START
// =====================================================

async function startViewer() {

  manuallyStopped = false;

  myRole = "viewer";


  document
    .getElementById("roleSelect")
    .classList
    .add("hidden");


  document
    .getElementById("liveArea")
    .classList
    .remove("hidden");


  setStatus(
    "👂 配信に接続中..."
  );


  document.getElementById(
    "voiceText"
  ).textContent =
    "配信者を待っています";


  try {

    await connectSocket();

    joinRoom();


    // 視聴者はクリックした直後なので
    // 音声再生の許可を取りやすくする
    try {

      const audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();

      await audioContext.resume();

      audioContext.close();

    } catch {}


  } catch (e) {

    log(
      "視聴者接続エラー: " +
      e.message
    );

  }

}


// =====================================================
// MICROPHONE
// =====================================================

async function startMicrophone() {

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


  log("🎙️ マイク取得成功");


  const tracks =
    localStream.getAudioTracks();


  if (tracks.length > 0) {

    log(
      "🎤 マイクトラックOK"
    );

  }

}


// =====================================================
// RTC CONFIG
// =====================================================

function rtcConfig() {

  return {

    iceServers: [

      {
        urls:
          "stun:stun.l.google.com:19302"
      },

      {
        urls:
          "stun:stun1.l.google.com:19302"
      }

    ],

    bundlePolicy: "max-bundle",

    rtcpMuxPolicy: "require"

  };

}


// =====================================================
// HOST PEER
// =====================================================

function createHostPeer(viewer) {

  const old =
    viewerConnections.get(viewer);


  if (old) {

    try {
      old.close();
    } catch {}

  }


  const pc =
    new RTCPeerConnection(
      rtcConfig()
    );


  viewerConnections.set(
    viewer,
    pc
  );


  if (localStream) {

    for (
      const track
      of localStream.getAudioTracks()
    ) {

      pc.addTrack(
        track,
        localStream
      );

    }

  }


  pc.onicecandidate =
  event => {

    if (event.candidate) {

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
      "👤 " +
      viewer +
      " WebRTC: " +
      pc.connectionState
    );


    if (
      pc.connectionState ===
      "connected"
    ) {

      log(
        "🎉 視聴者へ音声接続成功"
      );

    }

  };


  pc.oniceconnectionstatechange =
  () => {

    log(
      "ICE: " +
      pc.iceConnectionState
    );

  };


  return pc;

}


// =====================================================
// SEND OFFER
// =====================================================

async function sendOffer(viewer) {

  try {

    log(
      "📡 Offer作成"
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

        sdp:
          pc.localDescription.sdp

      }

    });


    log(
      "📡 Offer送信"
    );


  } catch (e) {

    log(
      "Offerエラー: " +
      e.message
    );

  }

}


// =====================================================
// VIEWER PEER
// =====================================================

function createViewerPeer() {

  if (viewerPeer) {

    return viewerPeer;

  }


  viewerPeer =
    new RTCPeerConnection(
      rtcConfig()
    );


  viewerPeer.onicecandidate =
  event => {

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
  async event => {

    log(
      "🔊 音声トラック受信"
    );


    let stream =
      event.streams &&
      event.streams[0];


    if (!stream) {

      stream =
        new MediaStream();

      stream.addTrack(
        event.track
      );

    }


    remoteAudio.srcObject =
      stream;


    remoteAudio.autoplay =
      true;

    remoteAudio.playsInline =
      true;

    remoteAudio.volume =
      1;

    remoteAudio.muted =
      false;


    try {

      await remoteAudio.play();


      log(
        "🔊 音声再生開始"
      );


      document
        .getElementById("audioButton")
        .classList
        .add("hidden");


    } catch (e) {

      log(
        "⚠️ 自動再生できません"
      );


      document
        .getElementById("audioButton")
        .classList
        .remove("hidden");

    }


    setStatus(
      "🔴 配信中",
      true
    );


    document.getElementById(
      "voiceText"
    ).textContent =
      "🎙️ 配信者の音声を受信中";

  };


  viewerPeer.onconnectionstatechange =
  () => {

    log(
      "配信者WebRTC: " +
      viewerPeer.connectionState
    );


    if (
      viewerPeer.connectionState ===
      "connected"
    ) {

      setStatus(
        "🔴 配信中",
        true
      );


      log(
        "🎉 音声接続成功"
      );

    }


    if (
      viewerPeer.connectionState ===
      "failed"
    ) {

      setStatus(
        "WebRTC接続失敗"
      );

      log(
        "⚠️ WebRTC接続失敗"
      );

    }

  };


  viewerPeer.oniceconnectionstatechange =
  () => {

    log(
      "Viewer ICE: " +
      viewerPeer.iceConnectionState
    );

  };


  return viewerPeer;

}


// =====================================================
// VIEWER SIGNAL
// =====================================================

async function handleViewerSignal(signal) {

  const pc =
    createViewerPeer();


  // ---------------------------------
  // OFFER
  // ---------------------------------

  if (
    signal.type === "offer"
  ) {

    try {

      await pc.setRemoteDescription({

        type: "offer",

        sdp: signal.sdp

      });


      log(
        "📡 Offer受信"
      );


      // 待っていたICEを追加
      for (
        const candidate
        of pendingViewerCandidates
      ) {

        try {

          await pc.addIceCandidate(
            candidate
          );

        } catch {}

      }


      pendingViewerCandidates = [];


      const answer =
        await pc.createAnswer();


      await pc.setLocalDescription(
        answer
      );


      send({

        type: "signal",

        target: viewerId,

        signal: {

          type: "answer",

          sdp:
            pc.localDescription.sdp

        }

      });


      log(
        "📡 Answer送信"
      );


    } catch (e) {

      log(
        "Viewer Offerエラー: " +
        e.message
      );

    }


    return;

  }


  // ---------------------------------
  // CANDIDATE
  // ---------------------------------

  if (
    signal.type === "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        signal.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch (e) {

        log(
          "ICE追加失敗"
        );

      }

    } else {

      pendingViewerCandidates.push(
        candidate
      );

    }

  }

}


// =====================================================
// HOST SIGNAL
// =====================================================

async function handleHostSignal(msg) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc) {

    return;

  }


  const signal =
    msg.signal;


  // ---------------------------------
  // ANSWER
  // ---------------------------------

  if (
    signal.type === "answer"
  ) {

    try {

      await pc.setRemoteDescription({

        type: "answer",

        sdp: signal.sdp

      });


      log(
        "📡 Answer受信"
      );


      const pending =
        pendingHostCandidates.get(
          msg.from
        ) || [];


      for (
        const candidate
        of pending
      ) {

        try {

          await pc.addIceCandidate(
            candidate
          );

        } catch {}

      }


      pendingHostCandidates.delete(
        msg.from
      );


    } catch (e) {

      log(
        "Answerエラー: " +
        e.message
      );

    }


    return;

  }


  // ---------------------------------
  // CANDIDATE
  // ---------------------------------

  if (
    signal.type === "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        signal.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch {

        log(
          "Host ICE追加失敗"
        );

      }

    } else {

      let list =
        pendingHostCandidates.get(
          msg.from
        );


      if (!list) {

        list = [];

        pendingHostCandidates.set(
          msg.from,
          list
        );

      }


      list.push(
        candidate
      );

    }

  }

}


// =====================================================
// MESSAGE
// =====================================================

async function handleMessage(msg) {

  // ---------------------------------
  // WELCOME
  // ---------------------------------

  if (
    msg.type === "welcome"
  ) {

    myId =
      msg.id;


    log(
      "ID=" + myId
    );


    return;

  }


  // ---------------------------------
  // JOIN OK
  // ---------------------------------

  if (
    msg.type === "join-ok"
  ) {

    joined = true;

    log(
      "✅ ルーム参加完了"
    );


    return;

  }


  // ---------------------------------
  // STATUS
  // ---------------------------------

  if (
    msg.type === "status"
  ) {

    log(
      msg.text
    );


    return;

  }


  // ---------------------------------
  // ROOM
  // ---------------------------------

  if (
    msg.type === "room-status"
  ) {

    if (
      myRole === "host"
    ) {

      infoBox.textContent =
        "👥 視聴者: " +
        msg.viewers +
        "人";

    } else {

      infoBox.textContent =
        msg.live
          ? "🟢 配信中"
          : "⚪ 配信待機中";

    }


    return;

  }


  // ---------------------------------
  // VIEWER JOINED
  // ---------------------------------

  if (
    msg.type === "viewer-joined"
  ) {

    if (
      myRole === "host"
    ) {

      log(
        "👤 視聴者参加: " +
        msg.viewerId
      );


      await sendOffer(
        msg.viewerId
      );

    }


    return;

  }


  // ---------------------------------
  // SIGNAL
  // ---------------------------------

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


  // ---------------------------------
  // STREAM STARTED
  // ---------------------------------

  if (
    msg.type === "stream-started"
  ) {

    streamStarted = true;


    setStatus(
      "🎙️ 配信中",
      true
    );


    document.getElementById(
      "voiceText"
    ).textContent =
      "配信者が配信中";


    return;

  }


  // ---------------------------------
  // STREAM STOPPED
  // ---------------------------------

  if (
    msg.type === "stream-stopped"
  ) {

    streamStarted = false;


    setStatus(
      "配信終了"
    );


    remoteAudio.srcObject =
      null;


    return;

  }


  // ---------------------------------
  // HOST LEFT
  // ---------------------------------

  if (
    msg.type === "host-left"
  ) {

    setStatus(
      "配信者が退出しました"
    );


    remoteAudio.srcObject =
      null;


    document.getElementById(
      "voiceText"
    ).textContent =
      "配信終了";


    return;

  }


  // ---------------------------------
  // VIEWER LEFT
  // ---------------------------------

  if (
    msg.type === "viewer-left"
  ) {

    const pc =
      viewerConnections.get(
        msg.viewerId
      );


    if (pc) {

      try {
        pc.close();
      } catch {}

      viewerConnections.delete(
        msg.viewerId
      );

    }


    pendingHostCandidates.delete(
      msg.viewerId
    );


    return;

  }

}


// =====================================================
// ENABLE AUDIO
// =====================================================

async function enableAudio() {

  try {

    remoteAudio.muted =
      false;


    remoteAudio.volume =
      1;


    await remoteAudio.play();


    document
      .getElementById("audioButton")
      .classList
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


// =====================================================
// STOP
// =====================================================

function stopLive() {

  manuallyStopped =
    true;

  joined =
    false;


  if (reconnectTimer) {

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      null;

  }


  // マイク
  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {
        track.stop();
      });

    localStream =
      null;

  }


  // Host peers
  for (
    const pc
    of viewerConnections.values()
  ) {

    try {
      pc.close();
    } catch {}

  }


  viewerConnections.clear();

  pendingHostCandidates.clear();


  // Viewer peer
  if (viewerPeer) {

    try {
      viewerPeer.close();
    } catch {}

    viewerPeer =
      null;

  }


  pendingViewerCandidates = [];


  // サーバーへ終了通知
  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    send({
      type: "stream-stopped"
    });

  }


  // WebSocket
  if (ws) {

    try {

      ws.close(
        1000,
        "user stopped"
      );

    } catch {}

    ws =
      null;

  }


  remoteAudio.srcObject =
    null;

  remoteAudio.muted =
    true;


  document
    .getElementById("liveArea")
    .classList
    .add("hidden");


  document
    .getElementById("roleSelect")
    .classList
    .remove("hidden");


  document
    .getElementById("audioButton")
    .classList
    .add("hidden");


  setStatus(
    "停止しました"
  );


  myRole =
    null;

}


// =====================================================
// START
// =====================================================

remoteAudio.autoplay =
  true;

remoteAudio.playsInline =
  true;

remoteAudio.volume =
  1;


// =====================================================
// PAGE CLICK
// =====================================================

document.addEventListener(
  "click",
  () => {

    if (
      myRole === "viewer" &&
      remoteAudio.srcObject
    ) {

      remoteAudio.muted =
        false;


      remoteAudio.play()
        .then(() => {

          document
            .getElementById(
              "audioButton"
            )
            .classList
            .add("hidden");

        })
        .catch(() => {});

    }

  },
  {
    passive: true
  }
);

</script>

</body>
</html>
`;


// =====================================================
// HTTP SERVER
// =====================================================

const server =
http.createServer((req, res) => {

  if (req.url === "/health") {

    res.writeHead(200, {
      "Content-Type":
        "text/plain; charset=utf-8"
    });

    res.end("OK");

    return;

  }


  res.writeHead(200, {

    "Content-Type":
      "text/html; charset=utf-8",

    "Cache-Control":
      "no-store"

  });


  res.end(HTML);

});


// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss =
new WebSocket.Server({

  server,

  perMessageDeflate: false

});


let nextId = 1;

const clients = new Map();


// =====================================================
// SERVER SEND
// =====================================================

function serverSend(ws, data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    try {

      ws.send(
        JSON.stringify(data)
      );

    } catch (e) {

      console.log(
        "[SEND ERROR]",
        e.message
      );

    }

  }

}


// =====================================================
// CONNECTION
// =====================================================

wss.on(
  "connection",
  ws => {

    const id =
      String(nextId++);


    const client = {

      id,

      ws,

      role: null,

      room: ROOM_NAME(),

      streaming: false

    };


    clients.set(
      id,
      client
    );


    console.log(
      "[CONNECT]",
      id
    );


    serverSend(
      ws,
      {
        type: "welcome",
        id: id
      }
    );


    // ===============================================
    // MESSAGE
    // ===============================================

    ws.on(
      "message",
      raw => {

        let msg;


        try {

          msg =
            JSON.parse(
              raw.toString()
            );

        } catch {

          console.log(
            "[BAD JSON]"
          );

          return;

        }


        // ===========================================
        // JOIN
        // ===========================================

        if (
          msg.type === "join"
        ) {

          client.role =
            msg.role === "host"
              ? "host"
              : "viewer";


          client.room =
            msg.room || "bota";


          console.log(
            "[JOIN]",
            id,
            client.role,
            client.room
          );


          // -----------------------------------------
          // HOST
          // -----------------------------------------

          if (
            client.role === "host"
          ) {

            let existingHost =
              null;


            for (
              const other
              of clients.values()
            ) {

              if (
                other.id !== id &&
                other.room === client.room &&
                other.role === "host"
              ) {

                existingHost =
                  other;

                break;

              }

            }


            if (existingHost) {

              serverSend(
                ws,
                {
                  type: "join-error",

                  text:
                    "このルームには既に配信者がいます"
                }
              );


              return;

            }


            serverSend(
              ws,
              {
                type: "status",

                text:
                  "配信者として接続しました"
              }
            );


            serverSend(
              ws,
              {
                type: "join-ok"
              }
            );


            // すでにいる視聴者
            for (
              const other
              of clients.values()
            ) {

              if (
                other.id !== id &&
                other.room === client.room &&
                other.role === "viewer"
              ) {

                serverSend(
                  ws,
                  {
                    type:
                      "viewer-joined",

                    viewerId:
                      other.id
                  }
                );

              }

            }

          }


          // -----------------------------------------
          // VIEWER
          // -----------------------------------------

          if (
            client.role === "viewer"
          ) {

            serverSend(
              ws,
              {
                type: "status",

                text:
                  "視聴者として接続しました"
              }
            );


            serverSend(
              ws,
              {
                type: "join-ok"
              }
            );


            for (
              const other
              of clients.values()
            ) {

              if (
                other.room === client.room &&
                other.role === "host"
              ) {

                serverSend(
                  other.ws,
                  {
                    type:
                      "viewer-joined",

                    viewerId:
                      client.id
                  }
                );


                if (
                  other.streaming
                ) {

                  serverSend(
                    ws,
                    {
                      type:
                        "stream-started"
                    }
                  );

                }

              }

            }

          }


          updateRoomStatus(
            client.room
          );


          return;

        }


        // ===========================================
        // SIGNAL
        // ===========================================

        if (
          msg.type === "signal"
        ) {

          const target =
            clients.get(
              msg.target
            );


          if (!target) {

            console.log(
              "[SIGNAL TARGET NOT FOUND]",
              msg.target
            );

            return;

          }


          if (
            target.room !== client.room
          ) {

            return;

          }


          serverSend(
            target.ws,
            {
              type: "signal",

              from:
                client.id,

              signal:
                msg.signal
            }
          );


          return;

        }


        // ===========================================
        // STREAM STARTED
        // ===========================================

        if (
          msg.type === "stream-started"
        ) {

          if (
            client.role === "host"
          ) {

            client.streaming =
              true;


            console.log(
              "[STREAM STARTED]",
              client.id
            );


            for (
              const other
              of clients.values()
            ) {

              if (
                other.room === client.room &&
                other.role === "viewer"
              ) {

                serverSend(
                  other.ws,
                  {
                    type:
                      "stream-started"
                  }
                );

              }

            }


            updateRoomStatus(
              client.room
            );

          }


          return;

        }


        // ===========================================
        // STREAM STOPPED
        // ===========================================

        if (
          msg.type === "stream-stopped"
        ) {

          if (
            client.role === "host"
          ) {

            client.streaming =
              false;


            console.log(
              "[STREAM STOPPED]",
              client.id
            );


            for (
              const other
              of clients.values()
            ) {

              if (
                other.room === client.room &&
                other.role === "viewer"
              ) {

                serverSend(
                  other.ws,
                  {
                    type:
                      "stream-stopped"
                  }
                );

              }

            }


            updateRoomStatus(
              client.room
            );

          }


          return;

        }

      }
    );


    // ===============================================
    // CLOSE
    // ===============================================

    ws.on(
      "close",
      (code, reason) => {

        console.log(
          "[CLOSE]",
          id,
          code,
          reason.toString()
        );


        const room =
          client.room;


        const role =
          client.role;


        clients.delete(
          id
        );


        // -------------------------------------------
        // HOST
        // -------------------------------------------

        if (
          role === "host"
        ) {

          for (
            const other
            of clients.values()
          ) {

            if (
              other.room === room &&
              other.role === "viewer"
            ) {

              serverSend(
                other.ws,
                {
                  type:
                    "host-left"
                }
              );

            }

          }

        }


        // -------------------------------------------
        // VIEWER
        // -------------------------------------------

        if (
          role === "viewer"
        ) {

          for (
            const other
            of clients.values()
          ) {

            if (
              other.room === room &&
              other.role === "host"
            ) {

              serverSend(
                other.ws,
                {
                  type:
                    "viewer-left",

                  viewerId:
                    id
                }
              );

            }

          }

        }


        updateRoomStatus(
          room
        );

      }
    );


    ws.on(
      "error",
      error => {

        console.log(
          "[WS ERROR]",
          id,
          error.message
        );

      }
    );

  }
);


// =====================================================
// ROOM NAME
// =====================================================

function ROOM_NAME() {

  return "bota";

}


// =====================================================
// ROOM STATUS
// =====================================================

function updateRoomStatus(room) {

  let host =
    false;

  let viewers =
    0;

  let streaming =
    false;


  for (
    const client
    of clients.values()
  ) {

    if (
      client.room !== room
    ) {

      continue;

    }


    if (
      client.role === "host"
    ) {

      host =
        true;


      if (
        client.streaming
      ) {

        streaming =
          true;

      }

    }


    if (
      client.role === "viewer"
    ) {

      viewers++;

    }

  }


  for (
    const client
    of clients.values()
  ) {

    if (
      client.room === room
    ) {

      serverSend(
        client.ws,
        {
          type:
            "room-status",

          live:
            host && streaming,

          viewers:
            viewers
        }
      );

    }

  }

}


// =====================================================
// SERVER ERROR
// =====================================================

server.on(
  "error",
  error => {

    console.error(
      "[SERVER ERROR]",
      error
    );

  }
);


// =====================================================
// START SERVER
// =====================================================

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "VOICE BOTA LIVE"
    );

    console.log(
      "WebRTC AUDIO"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "HOST:",
      HOST
    );

    console.log(
      "SERVER STARTED"
    );

    console.log(
      "================================="
    );

  }
);
