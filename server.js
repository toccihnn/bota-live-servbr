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
  height: 170px;
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

let room = "bota";

let reconnectTimer = null;

let stopping = false;


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

  statusBox.textContent = text;

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
    ws.readyState === WebSocket.OPEN
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

      log("WebSocketエラー");

      reject(
        new Error(
          "WebSocket接続失敗"
        )
      );
    };


    ws.onclose = () => {

      log("WebSocket切断");

    };


    ws.onmessage = async event => {

      try {

        const msg =
          JSON.parse(
            event.data
          );

        await handleMessage(msg);

      } catch (e) {

        log(
          "Message Error: " +
          e.message
        );

      }

    };

  });

}


// ======================================
// START HOST
// ======================================

async function startHost() {

  stopping = false;

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
    "配信者として接続中..."
  );


  try {

    await connectSocket();


    send({

      type: "join",

      role: "host",

      room: room

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
      "マイクを開始できません"
    );

  }

}


// ======================================
// START VIEWER
// ======================================

async function startViewer() {

  stopping = false;

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
    "配信を接続中..."
  );


  document.getElementById(
    "voiceText"
  ).textContent =
    "配信者を待っています";


  try {

    await connectSocket();


    send({

      type: "join",

      role: "viewer",

      room: room

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

          echoCancellation: false,

          noiseSuppression: false,

          autoGainControl: false,

          channelCount: 1,

          sampleRate: 48000

        },

        video: false

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
      "require",

    iceCandidatePoolSize: 2

  };

}


// ======================================
// OPUS優先
// ======================================

function preferOpus(pc) {

  try {

    const transceivers =
      pc.getTransceivers();


    for (
      const transceiver
      of transceivers
    ) {

      if (
        transceiver.sender &&
        transceiver.sender
          .getCapabilities
      ) {

        const capabilities =
          RTCRtpSender
            .getCapabilities(
              "audio"
            );


        if (
          !capabilities ||
          !capabilities.codecs
        ) {

          continue;

        }


        const codecs =
          capabilities.codecs;


        const opus =
          codecs.filter(codec => {

            return (
              codec.mimeType &&
              codec.mimeType
                .toLowerCase() ===
                "audio/opus"
            );

          });


        const others =
          codecs.filter(codec => {

            return (
              !codec.mimeType ||
              codec.mimeType
                .toLowerCase() !==
                "audio/opus"
            );

          });


        if (
          opus.length &&
          transceiver
            .setCodecPreferences
        ) {

          transceiver
            .setCodecPreferences(
              opus.concat(others)
            );

        }

      }

    }

  } catch (e) {

    log(
      "Opus設定: " +
      e.message
    );

  }

}


// ======================================
// LOW LATENCY SDP
// ======================================

function optimizeAudioSDP(sdp) {

  if (!sdp) {

    return sdp;

  }


  // Opusのpayload番号を探す
  const opusMatch =
    sdp.match(
      /a=rtpmap:(\\d+) opus\\/48000\\/2/i
    );


  if (!opusMatch) {

    return sdp;

  }


  const payload =
    opusMatch[1];


  const lines =
    sdp.split("\\r\\n");


  let foundFmtp = false;


  const result =
    lines.map(line => {

      if (
        line.startsWith(
          "a=fmtp:" + payload
        )
      ) {

        foundFmtp = true;


        let params =
          line.substring(
            line.indexOf(" ") + 1
          );


        if (
          !params.includes(
            "maxaveragebitrate"
          )
        ) {

          params +=
            ";maxaveragebitrate=32000";

        }


        if (
          !params.includes(
            "useinbandfec"
          )
        ) {

          params +=
            ";useinbandfec=1";

        }


        if (
          !params.includes(
            "usedtx"
          )
        ) {

          params +=
            ";usedtx=0";

        }


        return (
          "a=fmtp:" +
          payload +
          " " +
          params
        );

      }


      return line;

    });


  if (!foundFmtp) {

    const index =
      result.findIndex(
        line =>
          line.startsWith(
            "a=rtpmap:" +
            payload +
            " opus"
          )
      );


    if (index >= 0) {

      result.splice(
        index + 1,
        0,
        "a=fmtp:" +
        payload +
        " maxaveragebitrate=32000;useinbandfec=1;usedtx=0"
      );

    }

  }


  // Opus packetization interval
  result.push(
    "a=ptime:10"
  );


  return result.join(
    "\\r\\n"
  );

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

    } catch {}

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
  // AUDIO
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


      try {

        const params =
          sender.getParameters();


        if (!params.encodings) {

          params.encodings =
            [{}];

        }


        params.encodings[0]
          .maxBitrate =
            32000;


        params.encodings[0]
          .networkPriority =
            "high";


        sender
          .setParameters(params)
          .catch(() => {});


      } catch (e) {

        console.log(e);

      }

    }

  }


  preferOpus(pc);


  // ==================================
  // ICE
  // ==================================

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


  // ==================================
  // CONNECTION
  // ==================================

  pc.onconnectionstatechange =
    async () => {

      log(
        "視聴者 " +
        viewer +
        " : " +
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "failed"
      ) {

        log(
          "WebRTC再接続を試行"
        );


        try {

          await sendOffer(
            viewer
          );

        } catch {}

      }

    };


  return pc;

}


// ======================================
// SEND OFFER
// ======================================

async function sendOffer(viewer) {

  log(
    "音声Offer作成"
  );


  const pc =
    createHostPeer(
      viewer
    );


  const offer =
    await pc.createOffer({

      offerToReceiveAudio:
        false,

      offerToReceiveVideo:
        false

    });


  offer.sdp =
    optimizeAudioSDP(
      offer.sdp
    );


  await pc.setLocalDescription(
    offer
  );


  send({

    type: "signal",

    target: viewer,

    signal: {

      type: "offer",

      sdp:
        offer.sdp

    }

  });


  log(
    "低遅延Audio Offer送信"
  );

}


// ======================================
// VIEWER PEER
// ======================================

function createViewerPeer() {

  if (
    viewerPeer
  ) {

    return viewerPeer;

  }


  viewerPeer =
    new RTCPeerConnection(
      createRTCConfig()
    );


  // ==================================
  // ICE
  // ==================================

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


  // ==================================
  // AUDIO
  // ==================================

  viewerPeer.ontrack =
    event => {

      log(
        "🔊 音声トラック受信"
      );


      if (
        event.streams &&
        event.streams[0]
      ) {

        remoteAudio.srcObject =
          event.streams[0];


        remoteAudio.volume =
          1;


        // 自動再生制限対策
        remoteAudio.muted =
          true;


        document
          .getElementById(
            "audioButton"
          )
          .classList
          .remove("hidden");


        document.getElementById(
          "voiceText"
        ).textContent =
          "🎙️ 配信者の音声を受信中";


        setStatus(
          "🔴 音声接続中",
          true
        );

      }

    };


  // ==================================
  // CONNECTION
  // ==================================

  viewerPeer
    .onconnectionstatechange =
    () => {

      log(
        "配信者接続: " +
        viewerPeer
          .connectionState
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
          "🎉 低遅延音声接続成功"
        );

      }


      if (
        viewerPeer.connectionState ===
        "disconnected"
      ) {

        setStatus(
          "接続が不安定です"
        );

      }


      if (
        viewerPeer.connectionState ===
        "failed"
      ) {

        setStatus(
          "接続失敗"
        );

      }

    };


  return viewerPeer;

}


// ======================================
// VIEWER SIGNAL
// ======================================

async function handleViewerSignal(msg) {

  const pc =
    createViewerPeer();


  // ==================================
  // OFFER
  // ==================================

  if (
    msg.type === "offer"
  ) {

    await pc.setRemoteDescription({

      type: "offer",

      sdp:
        msg.sdp

    });


    log(
      "Offer受信"
    );


    for (
      const candidate
      of pendingViewerCandidates
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch (e) {

        console.log(
          "ICE追加失敗",
          e
        );

      }

    }


    pendingViewerCandidates =
      [];


    const answer =
      await pc.createAnswer();


    answer.sdp =
      optimizeAudioSDP(
        answer.sdp
      );


    await pc.setLocalDescription(
      answer
    );


    send({

      type: "signal",

      target: viewerId,

      signal: {

        type: "answer",

        sdp:
          answer.sdp

      }

    });


    log(
      "Answer送信"
    );


    return;

  }


  // ==================================
  // CANDIDATE
  // ==================================

  if (
    msg.type === "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        msg.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch (e) {

        console.log(
          "ICE Error",
          e
        );

      }

    } else {

      pendingViewerCandidates
        .push(candidate);

    }

  }

}


// ======================================
// HOST SIGNAL
// ======================================

async function handleHostSignal(msg) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc) {

    return;

  }


  // ==================================
  // ANSWER
  // ==================================

  if (
    msg.signal.type ===
    "answer"
  ) {

    await pc.setRemoteDescription({

      type: "answer",

      sdp:
        msg.signal.sdp

    });


    log(
      "Answer受信"
    );


    const pending =
      pendingHostCandidates.get(
        msg.from
      );


    if (pending) {

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

    }


    return;

  }


  // ==================================
  // CANDIDATE
  // ==================================

  if (
    msg.signal.type ===
    "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        msg.signal.candidate
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
          "ICE追加エラー"
        );

      }

    } else {

      if (
        !pendingHostCandidates
          .has(msg.from)
      ) {

        pendingHostCandidates.set(
          msg.from,
          []
        );

      }


      pendingHostCandidates
        .get(msg.from)
        .push(candidate);

    }

  }

}


// ======================================
// MESSAGE
// ======================================

async function handleMessage(msg) {

  // ==================================
  // WELCOME
  // ==================================

  if (
    msg.type === "welcome"
  ) {

    myId =
      msg.id;


    log(
      "ID=" +
      myId
    );


    return;

  }


  // ==================================
  // STATUS
  // ==================================

  if (
    msg.type === "status"
  ) {

    log(
      msg.text
    );


    return;

  }


  // ==================================
  // ROOM
  // ==================================

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


  // ==================================
  // VIEWER JOIN
  // ==================================

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


      try {

        await sendOffer(
          msg.viewerId
        );

      } catch (e) {

        log(
          "Offerエラー: " +
          e.message
        );

      }

    }


    return;

  }


  // ==================================
  // SIGNAL
  // ==================================

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


  // ==================================
  // STREAM STARTED
  // ==================================

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
      "配信者を接続しています";


    return;

  }


  // ==================================
  // STREAM STOPPED
  // ==================================

  if (
    msg.type ===
    "stream-stopped"
  ) {

    setStatus(
      "配信終了"
    );


    remoteAudio.srcObject =
      null;


    return;

  }


  // ==================================
  // HOST LEFT
  // ==================================

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


    return;

  }


  // ==================================
  // VIEWER LEFT
  // ==================================

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


    pendingHostCandidates
      .delete(
        msg.viewerId
      );


    return;

  }

}


// ======================================
// AUDIO ON
// ======================================

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


  } catch (e) {

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}


// ======================================
// STOP
// ======================================

function stopLive() {

  stopping = true;


  // ==================================
  // STREAM STOPPED
  // ==================================

  if (
    myRole === "host"
  ) {

    send({

      type:
        "stream-stopped"

    });

  }


  // ==================================
  // MICROPHONE
  // ==================================

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


  // ==================================
  // HOST PEERS
  // ==================================

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


  // ==================================
  // VIEWER PEER
  // ==================================

  if (
    viewerPeer
  ) {

    try {

      viewerPeer.close();

    } catch {}


    viewerPeer =
      null;

  }


  pendingViewerCandidates =
    [];


  // ==================================
  // AUDIO
  // ==================================

  remoteAudio.srcObject =
    null;


  remoteAudio.muted =
    true;


  // ==================================
  // SOCKET
  // ==================================

  if (
    ws
  ) {

    try {

      ws.close();

    } catch {}


    ws =
      null;

  }


  // ==================================
  // UI
  // ==================================

  document
    .getElementById(
      "liveArea"
    )
    .classList
    .add("hidden");


  document
    .getElementById(
      "roleSelect"
    )
    .classList
    .remove("hidden");


  document
    .getElementById(
      "audioButton"
    )
    .classList
    .add("hidden");


  setStatus(
    "停止しました"
  );


  myRole =
    null;


  viewerId =
    null;

}

</script>

</body>

</html>
`;


// ==========================================
// HTTP SERVER
// ==========================================

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
            "text/html; charset=utf-8"
        }
      );


      res.end(HTML);

    }
  );


// ==========================================
// WEBSOCKET SERVER
// ==========================================

const wss =
  new WebSocket.Server({
    server
  });


let nextId = 1;

const clients =
  new Map();


// ==========================================
// SEND
// ==========================================

function send(ws, data) {

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


// ==========================================
// CONNECTION
// ==========================================

wss.on(
  "connection",
  ws => {

    const id =
      String(nextId++);


    const client = {

      id,

      ws,

      role: null,

      room: "bota"

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

        id
      }
    );


    // ==================================
    // MESSAGE
    // ==================================

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


        // ==============================
        // JOIN
        // ==============================

        if (
          msg.type === "join"
        ) {

          client.role =
            msg.role === "host"
              ? "host"
              : "viewer";


          client.room =
            msg.room ||
            "bota";


          console.log(
            "[JOIN]",
            id,
            client.role
          );


          // ============================
          // HOST
          // ============================

          if (
            client.role ===
            "host"
          ) {

            send(
              ws,
              {
                type:
                  "status",

                text:
                  "配信者として接続しました"
              }
            );


            // 既存視聴者へOffer
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


          // ============================
          // VIEWER
          // ============================

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


            // 配信者へ通知
            for (
              const other
              of clients.values()
            ) {

              if (
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

              }

            }

          }


          updateRoomStatus(
            client.room
          );


          return;

        }


        // ==============================
        // SIGNAL
        // ==============================

        if (
          msg.type === "signal"
        ) {

          const target =
            clients.get(
              msg.target
            );


          if (!target) {

            console.log(
              "[SIGNAL] target not found"
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


        // ==============================
        // STREAM STARTED
        // ==============================

        if (
          msg.type ===
          "stream-started"
        ) {

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


          return;

        }


        // ==============================
        // STREAM STOPPED
        // ==============================

        if (
          msg.type ===
          "stream-stopped"
        ) {

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


          return;

        }

      }
    );


    // ==================================
    // CLOSE
    // ==================================

    ws.on(
      "close",
      () => {

        console.log(
          "[CLOSE]",
          id
        );


        const room =
          client.room;

        const role =
          client.role;


        clients.delete(
          id
        );


        // ==============================
        // HOST LEFT
        // ==============================

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


        // ==============================
        // VIEWER LEFT
        // ==============================

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

  }
);


// ==========================================
// ROOM STATUS
// ==========================================

function updateRoomStatus(room) {

  let host =
    false;

  let viewers =
    0;


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
      client.role ===
      "host"
    ) {

      host =
        true;

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
      client.room === room
    ) {

      send(
        client.ws,
        {
          type:
            "room-status",

          live:
            host,

          viewers:
            viewers

        }
      );

    }

  }

}


// ==========================================
// START
// ==========================================

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
      "LOW LATENCY OPUS MODE"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "Server started!"
    );

    console.log(
      "================================="
    );

  }
);
