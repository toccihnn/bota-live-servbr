const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

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
  height: 180px;
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

let ws = null;

let myId = null;

let myRole = null;

let localStream = null;

let viewerPeer = null;

let viewerId = null;

let viewerConnections = new Map();

let pendingViewerCandidates = [];

let pendingHostCandidates = new Map();

const room = "bota";


const statusBox =
document.getElementById("status");

const infoBox =
document.getElementById("info");

const logBox =
document.getElementById("log");

const remoteAudio =
document.getElementById("remoteAudio");


// ======================================
// LOG
// ======================================

function log(text) {

  console.log(text);

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


// ======================================
// STATUS
// ======================================

function setStatus(text, live = false) {

  statusBox.textContent =
    text;

  statusBox.className =
    "status " +
    (live ? "live" : "wait");
}


// ======================================
// SEND
// ======================================

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


// ======================================
// WEBSOCKET
// ======================================

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
          "WebSocketエラー"
        );

        reject(
          new Error(
            "WebSocket接続失敗"
          )
        );

      };


      ws.onclose = () => {

        log(
          "WebSocket切断"
        );

      };


      ws.onmessage =
        async event => {

          try {

            const msg =
              JSON.parse(
                event.data
              );


            await handleMessage(
              msg
            );


          } catch (e) {

            log(
              "Message Error: " +
              e.message
            );

          }

        };

    }
  );

}


// ======================================
// HOST
// ======================================

async function startHost() {

  myRole =
    "host";


  document
    .getElementById(
      "roleSelect"
    )
    .classList
    .add("hidden");


  document
    .getElementById(
      "liveArea"
    )
    .classList
    .remove("hidden");


  setStatus(
    "配信者として接続中..."
  );


  try {

    await connectSocket();


    send({

      type:
        "join",

      role:
        "host",

      room:
        room

    });


    await startMicrophone();


    setStatus(
      "🎙️ 配信中",
      true
    );


    document.getElementById(
      "voiceText"
    ).textContent =
      "あなたは配信者です";


    send({

      type:
        "stream-started"

    });


  } catch (e) {

    log(
      "配信開始失敗: " +
      e.message
    );


    setStatus(
      "配信開始に失敗しました"
    );

  }

}


// ======================================
// VIEWER
// ======================================

async function startViewer() {

  myRole =
    "viewer";


  document
    .getElementById(
      "roleSelect"
    )
    .classList
    .add("hidden");


  document
    .getElementById(
      "liveArea"
    )
    .classList
    .remove("hidden");


  setStatus(
    "配信を接続中..."
  );


  document.getElementById(
    "voiceText"
  ).textContent =
    "配信者を待っています";


  try {

    await connectSocket();


    send({

      type:
        "join",

      role:
        "viewer",

      room:
        room

    });


  } catch (e) {

    log(
      "接続失敗: " +
      e.message
    );

  }

}


// ======================================
// MICROPHONE
// ======================================

async function startMicrophone() {

  localStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        audio: {

          echoCancellation:
            true,

          noiseSuppression:
            true,

          autoGainControl:
            true,

          channelCount:
            1,

          sampleRate:
            48000

        },

        video:
          false

      });


  log(
    "🎙️ マイク取得OK"
  );

}


// ======================================
// RTC CONFIG
// ======================================

function createRTCConfig() {

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

    bundlePolicy:
      "max-bundle",

    rtcpMuxPolicy:
      "require"

  };

}


// ======================================
// HOST PEER
// ======================================

function createHostPeer(viewer) {

  const old =
    viewerConnections.get(
      viewer
    );


  if (old) {

    try {

      old.close();

    } catch (e) {}

    viewerConnections.delete(
      viewer
    );

  }


  const pc =
    new RTCPeerConnection(
      createRTCConfig()
    );


  viewerConnections.set(
    viewer,
    pc
  );


  // ==================================
  // AUDIO TRACK
  // ==================================

  if (localStream) {

    const tracks =
      localStream
        .getAudioTracks();


    for (
      const track
      of tracks
    ) {

      const sender =
        pc.addTrack(
          track,
          localStream
        );


      // 音声ビットレート
      try {

        const params =
          sender.getParameters();


        if (
          !params.encodings
        ) {

          params.encodings =
            [{}];

        }


        params.encodings[0]
          .maxBitrate =
            64000;


        sender
          .setParameters(
            params
          )
          .catch(
            () => {}
          );


      } catch (e) {

        console.log(e);

      }

    }

  }


  // ==================================
  // ICE
