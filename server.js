const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";


// =====================================================
// HTML
// =====================================================

const HTML = `
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<title>Voice Bota Live</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #080808;
  color: white;
  font-family: Arial, "Noto Sans JP", sans-serif;
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

button:active {
  transform: scale(0.98);
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
  word-break: break-word;
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
onclick="startHost()"
>
🎙️ 配信者として開始
</button>

<button
class="viewerButton"
onclick="startViewer()"
>
👂 視聴者として参加
</button>

</div>


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


<div class="voiceBox">

<div class="mic">
🎙️
</div>

<div id="voiceText">
音声配信
</div>

</div>


<div
id="info"
class="info"
></div>


<button
id="audioButton"
class="audioButton hidden"
onclick="enableAudio()"
>
🔊 音声をONにする
</button>


<button
class="stopButton"
onclick="stopLive()"
>
⛔ 終了
</button>


<div id="log"></div>

</div>

</div>

</div>


<audio
id="remoteAudio"
autoplay
playsinline
></audio>


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

let roomJoined = false;

let joining = false;

const room = "bota";


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

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;

}


// =====================================================
// STATUS
// =====================================================

function setStatus(text, live = false) {

  statusBox.textContent = text;

  statusBox.className =
    "status " +
    (
      live
        ? "live"
        : "wait"
    );

}


// =====================================================
// SOCKET URL
// =====================================================

function getSocketURL() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return (
    protocol +
    "//" +
    location.host
  );

}


// =====================================================
// CONNECT WEBSOCKET
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


    log("🔌 WebSocket接続開始");


    const socket =
      new WebSocket(
        getSocketURL()
      );


    ws = socket;


    let settled = false;


    socket.onopen = () => {

      log("✅ WebSocket接続OK");


      if (!settled) {

        settled = true;

        resolve();

      }


      // 接続時に一度だけJOIN
      if (
        myRole &&
        !roomJoined &&
        !joining
      ) {

        sendJoin();

      }

    };


    socket.onerror = error => {

      log("❌ WebSocketエラー");


      if (!settled) {

        settled = true;

        reject(
          new Error(
            "WebSocket接続失敗"
          )
        );

      }

    };


    socket.onclose = event => {

      log(
        "❌ WebSocket切断 code=" +
        event.code +
        " reason=" +
        (
          event.reason ||
          "なし"
        )
      );


      if (ws === socket) {

        ws = null;

      }


      roomJoined = false;

      joining = false;


      if (
        !manuallyStopped &&
        myRole
      ) {

        setStatus(
          "接続が切れました。再接続中..."
        );


        scheduleReconnect();

      }

    };


    socket.onmessage = async event => {

      try {

        const msg =
          JSON.parse(
            event.data
          );


        await handleMessage(msg);

      } catch (error) {

        log(
          "Message Error: " +
          error.message
        );

      }

    };

  });

}


// =====================================================
// RECONNECT
// =====================================================

function scheduleReconnect() {

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

      } catch (error) {

        log(
          "再接続失敗"
        );

        scheduleReconnect();

      }

    }, 3000);

}


// =====================================================
// SEND
// =====================================================

function send(data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {

    try {

      ws.send(
        JSON.stringify(data)
      );

    } catch (error) {

      log(
        "送信エラー: " +
        error.message
      );

    }

  } else {

    log(
      "⚠️ WebSocket未接続"
    );

  }

}


// =====================================================
// JOIN
// =====================================================

function sendJoin() {

  if (
    !myRole ||
    roomJoined ||
    joining
  ) {

    return;

  }


  joining = true;


  log(
    "ルーム参加送信"
  );


  send({

    type: "join",

    role: myRole,

    room: room

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
    "🎙️ 配信準備中..."
  );


  try {

    await connectSocket();


    await startMicrophone();


    setStatus(
      "🎙️ 配信中",
      true
    );


    document.getElementById(
      "voiceText"
    ).textContent =
      "あなたは配信者です";


    // JOINはconnectSocket内で一回だけ


  } catch (error) {

    log(
      "配信開始失敗: " +
      error.message
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
    "👂 配信を接続中..."
  );


  document.getElementById(
    "voiceText"
  ).textContent =
    "配信者を待っています";


  try {

    await connectSocket();

  } catch (error) {

    log(
      "接続失敗: " +
      error.message
    );

  }

}


// =====================================================
// MICROPHONE
// =====================================================

async function startMicrophone() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "マイク機能が利用できません"
    );

  }


  log(
    "🎙️ マイク取得開始"
  );


  localStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        audio: {

          echoCancellation: false,

          noiseSuppression: false,

          autoGainControl: false,

          channelCount: 1

        },

        video: false

      });


  log(
    "✅ マイク取得OK"
  );


  const tracks =
    localStream.getAudioTracks();


  for (
    const track of tracks
  ) {

    log(
      "🎤 track: " +
      track.label
    );

  }

}


// =====================================================
// CREATE HOST PEER
// =====================================================

function createHostPeer(viewer) {

  const old =
    viewerConnections.get(
      viewer
    );


  if (old) {

    try {

      old.close();

    } catch {}

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

      ],

      bundlePolicy:
        "max-bundle",

      rtcpMuxPolicy:
        "require"

    });


  viewerConnections.set(
    viewer,
    pc
  );


  // ===================================================
  // ADD AUDIO
  // ===================================================

  if (localStream) {

    const tracks =
      localStream.getAudioTracks();


    for (
      const track of tracks
    ) {

      const sender =
        pc.addTrack(
          track,
          localStream
        );


      // 低遅延用ビットレート
      try {

        const params =
          sender.getParameters();


        if (!params.encodings) {

          params.encodings = [
            {}
          ];

        }


        params.encodings[0].maxBitrate =
          32000;


        params.encodings[0].priority =
          "high";


        if (
          "networkPriority"
          in params.encodings[0]
        ) {

          params.encodings[0].networkPriority =
            "high";

        }


        sender.setParameters(
          params
        ).catch(() => {});

      } catch {}

    }

  }


  // ===================================================
  // ICE
  // ===================================================

  pc.onicecandidate =
    event => {

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


  // ===================================================
  // ICE STATE
  // ===================================================

  pc.oniceconnectionstatechange =
    () => {

      log(
        "視聴者 " +
        viewer +
        " ICE: " +
        pc.iceConnectionState
      );

    };


  // ===================================================
  // CONNECTION
  // ===================================================

  pc.onconnectionstatechange =
    () => {

      log(
        "視聴者 " +
        viewer +
        " : " +
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "connected"
      ) {

        log(
          "🎉 視聴者音声接続成功"
        );

      }


      if (
        pc.connectionState ===
        "failed"
      ) {

        log(
          "⚠️ WebRTC接続失敗"
        );

      }

    };


  return pc;

}


// =====================================================
// SEND OFFER
// =====================================================

async function sendOffer(viewer) {

  try {

    log(
      "Offer作成: " +
      viewer
    );


    const pc =
      createHostPeer(
        viewer
      );


    // ブラウザ標準のSDPを使用
    // 手作業でSDPを書き換えない
    const offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    log(
      "✅ setLocalDescription OK"
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


  } catch (error) {

    log(
      "❌ Offerエラー: " +
      error.message
    );

  }

}


// =====================================================
// CREATE VIEWER PEER
// =====================================================

function createViewerPeer() {

  if (viewerPeer) {

    return viewerPeer;

  }


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

      ],

      bundlePolicy:
        "max-bundle",

      rtcpMuxPolicy:
        "require"

    });


  // ===================================================
  // ICE
  // ===================================================

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


  // ===================================================
  // ICE STATE
  // ===================================================

  viewerPeer.oniceconnectionstatechange =
    () => {

      log(
        "配信者 ICE: " +
        viewerPeer.iceConnectionState
      );

    };


  // ===================================================
  // TRACK
  // ===================================================

  viewerPeer.ontrack =
    event => {

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


      remoteAudio.muted =
        false;


      remoteAudio.volume =
        1;


      // =================================================
      // 低遅延再生
      // =================================================

      try {

        const receivers =
          viewerPeer.getReceivers();


        for (
          const receiver
          of receivers
        ) {

          if (
            "playoutDelayHint"
            in receiver
          ) {

            receiver.playoutDelayHint =
              0;

          }

        }

      } catch {}


      const promise =
        remoteAudio.play();


      if (
        promise &&
        typeof promise.catch ===
          "function"
      ) {

        promise.catch(error => {

          log(
            "🔊 自動再生待機: " +
            error.message
          );


          document
            .getElementById(
              "audioButton"
            )
            .classList
            .remove("hidden");

        });

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


  // ===================================================
  // CONNECTION
  // ===================================================

  viewerPeer.onconnectionstatechange =
    () => {

      log(
        "配信者接続: " +
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
        "disconnected"
      ) {

        setStatus(
          "WebRTC接続切断"
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
          "⚠️ ICE接続失敗"
        );

      }

    };


  return viewerPeer;

}


// =====================================================
// VIEWER SIGNAL
// =====================================================

async function handleViewerSignal(signal) {

  const pc =
    createViewerPeer();


  // ===================================================
  // OFFER
  // ===================================================

  if (
    signal.type ===
    "offer"
  ) {

    try {

      log(
        "📡 Offer受信"
      );


      await pc.setRemoteDescription({

        type: "offer",

        sdp:
          signal.sdp

      });


      log(
        "✅ RemoteDescription OK"
      );


      // 先に届いたICE
      for (
        const candidate
        of pendingViewerCandidates
      ) {

        try {

          await pc.addIceCandidate(
            candidate
          );

        } catch (error) {

          log(
            "ICE追加失敗"
          );

        }

      }


      pendingViewerCandidates =
        [];


      const answer =
        await pc.createAnswer();


      await pc.setLocalDescription(
        answer
      );


      log(
        "✅ Answer作成OK"
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


    } catch (error) {

      log(
        "❌ Viewer Offer処理エラー: " +
        error.message
      );

    }


    return;

  }


  // ===================================================
  // CANDIDATE
  // ===================================================

  if (
    signal.type ===
    "candidate"
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

      } catch (error) {

        log(
          "ICE追加エラー: " +
          error.message
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

    log(
      "Peerなし: " +
      msg.from
    );

    return;

  }


  const signal =
    msg.signal;


  // ===================================================
  // ANSWER
  // ===================================================

  if (
    signal.type ===
    "answer"
  ) {

    try {

      await pc.setRemoteDescription({

        type: "answer",

        sdp:
          signal.sdp

      });


      log(
        "✅ Answer受信: " +
        msg.from
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


    } catch (error) {

      log(
        "❌ Answer処理エラー: " +
        error.message
      );

    }


    return;

  }


  // ===================================================
  // CANDIDATE
  // ===================================================

  if (
    signal.type ===
    "candidate"
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

      } catch (error) {

        log(
          "ICE追加エラー"
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

  // ===================================================
  // WELCOME
  // ===================================================

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


  // ===================================================
  // STATUS
  // ===================================================

  if (
    msg.type ===
    "status"
  ) {

    log(
      msg.text
    );


    return;

  }


  // ===================================================
  // JOIN OK
  // ===================================================

  if (
    msg.type ===
    "join-ok"
  ) {

    roomJoined =
      true;

    joining =
      false;


    log(
      "✅ ルーム参加完了"
    );


    return;

  }


  // ===================================================
  // JOIN ERROR
  // ===================================================

  if (
    msg.type ===
    "join-error"
  ) {

    joining =
      false;


    log(
      "❌ " +
      msg.text
    );


    setStatus(
      msg.text
    );


    return;

  }


  // ===================================================
  // ROOM STATUS
  // ===================================================

  if (
    msg.type ===
    "room-status"
  ) {

    if (
      myRole ===
      "host"
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


  // ===================================================
  // VIEWER JOINED
  // ===================================================

  if (
    msg.type ===
    "viewer-joined"
  ) {

    if (
      myRole ===
      "host"
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


  // ===================================================
  // SIGNAL
  // ===================================================

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


  // ===================================================
  // STREAM STARTED
  // ===================================================

  if (
    msg.type ===
    "stream-started"
  ) {

    setStatus(
      "🔴 配信中",
      true
    );


    document.getElementById(
      "voiceText"
    ).textContent =
      "配信者が配信中";


    return;

  }


  // ===================================================
  // STREAM STOPPED
  // ===================================================

  if (
    msg.type ===
    "stream-stopped"
  ) {

    setStatus(
      "配信終了"
    );


    remoteAudio.srcObject =
      null;


    document.getElementById(
      "voiceText"
    ).textContent =
      "配信終了";


    return;

  }


  // ===================================================
  // HOST LEFT
  // ===================================================

  if (
    msg.type ===
    "host-left"
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


    if (viewerPeer) {

      try {

        viewerPeer.close();

      } catch {}

      viewerPeer =
        null;

    }


    return;

  }


  // ===================================================
  // VIEWER LEFT
  // ===================================================

  if (
    msg.type ===
    "viewer-left"
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
      .getElementById(
        "audioButton"
      )
      .classList
      .add("hidden");


    log(
      "🔊 音声ON"
    );


  } catch (error) {

    log(
      "音声再生エラー: " +
      error.message
    );

  }

}


// =====================================================
// STOP
// =====================================================

function stopLive() {

  manuallyStopped =
    true;


  roomJoined =
    false;


  joining =
    false;


  if (reconnectTimer) {

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      null;

  }


  // ===================================================
  // STOP MICROPHONE
  // ===================================================

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


  // ===================================================
  // STOP HOST PEERS
  // ===================================================

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


  // ===================================================
  // STOP VIEWER
  // ===================================================

  if (viewerPeer) {

    try {

      viewerPeer.close();

    } catch {}


    viewerPeer =
      null;

  }


  pendingViewerCandidates =
    [];


  // ===================================================
  // SERVER
  // ===================================================

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    send({

      type:
        "stream-stopped"

    });

  }


  // ===================================================
  // WEBSOCKET
  // ===================================================

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


  // ===================================================
  // AUDIO
  // ===================================================

  remoteAudio.pause();

  remoteAudio.srcObject =
    null;

  remoteAudio.muted =
    true;


  // ===================================================
  // UI
  // ===================================================

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


  myRole =
    null;


  setStatus(
    "停止しました"
  );

}


// =====================================================
// AUDIO
// =====================================================

remoteAudio.autoplay =
  true;

remoteAudio.playsInline =
  true;

remoteAudio.volume =
  1;


// =====================================================
// USER INTERACTION
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
  http.createServer(
    (req, res) => {

      if (
        req.url === "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );


        res.end("OK");

        return;

      }


      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-store"
        }
      );


      res.end(
        HTML
      );

    }
  );


// =====================================================
// WEBSOCKET
// =====================================================

const wss =
  new WebSocket.Server({

    server,

    perMessageDeflate:
      false

  });


let nextId =
  1;


const clients =
  new Map();


// =====================================================
// SEND
// =====================================================

function send(ws, data) {

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    try {

      ws.send(
        JSON.stringify(data)
      );

    } catch (error) {

      console.log(
        "[SEND ERROR]",
        error.message
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
      String(
        nextId++
      );


    const client = {

      id,

      ws,

      role:
        null,

      room:
        "bota",

      streaming:
        false,

      isAlive:
        true

    };


    clients.set(
      id,
      client
    );


    console.log(
      "[CONNECT]",
      id
    );


    send(
      ws,
      {
        type:
          "welcome",

        id:
          id
      }
    );


    // =================================================
    // PONG
    // =================================================

    ws.on(
      "pong",
      () => {

        client.isAlive =
          true;

      }
    );


    // =================================================
    // MESSAGE
    // =================================================

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

          return;

        }


        // =============================================
        // JOIN
        // =============================================

        if (
          msg.type ===
          "join"
        ) {

          // 同じクライアントの二重JOIN防止
          if (
            client.role
          ) {

            send(
              ws,
              {
                type:
                  "join-ok"
              }
            );

            return;

          }


          client.role =
            msg.role ===
            "host"
              ? "host"
              : "viewer";


          client.room =
            msg.room ||
            "bota";


          console.log(
            "[JOIN]",
            id,
            client.role,
            client.room
          );


          // =========================================
          // HOST
          // =========================================

          if (
            client.role ===
            "host"
          ) {

            let existingHost =
              null;


            for (
              const other
              of clients.values()
            ) {

              if (
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ) {

                existingHost =
                  other;

                break;

              }

            }


            if (existingHost) {

              client.role =
                null;


              send(
                ws,
                {
                  type:
                    "join-error",

                  text:
                    "このルームには既に配信者がいます"
                }
              );


              return;

            }


            send(
              ws,
              {
                type:
                  "status",

                text:
                  "配信者として接続しました"
              }
            );


            send(
              ws,
              {
                type:
                  "join-ok"
              }
            );


            // =======================================
            // EXISTING VIEWERS
            // =======================================

            for (
              const other
              of clients.values()
            ) {

              if (
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "viewer"
              ) {

                send(
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


          // =========================================
          // VIEWER
          // =========================================

          if (
            client.role ===
            "viewer"
          ) {

            send(
              ws,
              {
                type:
                  "status",

                text:
                  "視聴者として接続しました"
              }
            );


            send(
              ws,
              {
                type:
                  "join-ok"
              }
            );


            for (
              const other
              of clients.values()
            ) {

              if (
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ) {

                send(
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

                  send(
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


        // =============================================
        // SIGNAL
        // =============================================

        if (
          msg.type ===
          "signal"
        ) {

          const target =
            clients.get(
              msg.target
            );


          if (!target) {

            console.log(
              "[SIGNAL] target not found",
              msg.target
            );


            return;

          }


          if (
            target.room !==
            client.room
          ) {

            return;

          }


          send(
            target.ws,
            {
              type:
                "signal",

              from:
                client.id,

              signal:
                msg.signal
            }
          );


          return;

        }


        // =============================================
        // STREAM STARTED
        // =============================================

        if (
          msg.type ===
          "stream-started"
        ) {

          if (
            client.role !==
            "host"
          ) {

            return;

          }


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
              other.room ===
                client.room &&
              other.role ===
                "viewer"
            ) {

              send(
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


          return;

        }


        // =============================================
        // STREAM STOPPED
        // =============================================

        if (
          msg.type ===
          "stream-stopped"
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
              other.room ===
                client.room &&
              other.role ===
                "viewer"
            ) {

              send(
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


          return;

        }

      }
    );


    // =================================================
    // CLOSE
    // =================================================

    ws.on(
      "close",
      (code, reason) => {

        console.log(
          "[CLOSE]",
          id,
          "code=",
          code,
          "reason=",
          reason.toString()
        );


        const room =
          client.room;


        const role =
          client.role;


        clients.delete(
          id
        );


        // =============================================
        // HOST LEFT
        // =============================================

        if (
          role ===
          "host"
        ) {

          for (
            const other
            of clients.values()
          ) {

            if (
              other.room ===
                room &&
              other.role ===
                "viewer"
            ) {

              send(
                other.ws,
                {
                  type:
                    "host-left"
                }
              );

            }

          }

        }


        // =============================================
        // VIEWER LEFT
        // =============================================

        if (
          role ===
          "viewer"
        ) {

          for (
            const other
            of clients.values()
          ) {

            if (
              other.room ===
                room &&
              other.role ===
                "host"
            ) {

              send(
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


    // =================================================
    // ERROR
    // =================================================

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
// HEARTBEAT
// =====================================================

const heartbeat =
  setInterval(
    () => {

      for (
        const client
        of clients.values()
      ) {

        const ws =
          client.ws;


        if (
          client.isAlive ===
          false
        ) {

          console.log(
            "[HEARTBEAT TIMEOUT]",
            client.id
          );


          try {

            ws.terminate();

          } catch {}


          continue;

        }


        client.isAlive =
          false;


        try {

          ws.ping();

        } catch {}

      }

    },
    25000
  );


wss.on(
  "close",
  () => {

    clearInterval(
      heartbeat
    );

  }
);


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
      client.room !==
      room
    ) {

      continue;

    }


    if (
      client.role ===
      "host"
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
      client.role ===
      "viewer"
    ) {

      viewers++;

    }

  }


  for (
    const client
    of clients.values()
  ) {

    if (
      client.room ===
      room
    ) {

      send(
        client.ws,
        {
          type:
            "room-status",

          live:
            host &&
            streaming,

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
// START
// =====================================================

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "Voice Bota Live"
    );

    console.log(
      "WEBRTC AUDIO"
    );

    console.log(
      "NO SDP MUNGING"
    );

    console.log(
      "WEBSOCKET HEARTBEAT ENABLED"
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
      "Server started!"
    );

    console.log(
      "================================="
    );

  }
);
