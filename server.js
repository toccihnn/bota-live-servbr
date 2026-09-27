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
  margin: auto;
  padding: 20px;
  background: #151515;
  border-radius: 20px;
}

h1 {
  text-align: center;
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

#connectionInfo {
  margin-top: 10px;
  padding: 10px;
  background: #101010;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
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

<div id="connectionInfo">
WebRTC状態: -
<br>
ICE状態: -
<br>
音声トラック: -
</div>


<button
id="audioButton"
class="audioButton"
onclick="enableAudio()">
🔊 音声を開始
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

let remoteStream = null;

const room = "bota";


const statusBox =
document.getElementById("status");

const infoBox =
document.getElementById("info");

const logBox =
document.getElementById("log");

const remoteAudio =
document.getElementById("remoteAudio");

const connectionInfo =
document.getElementById(
  "connectionInfo"
);


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
// WEBRTC STATUS
// ======================================

function updateRTCStatus(
  pc,
  trackText = null
) {

  if (!pc) {
    return;
  }

  connectionInfo.innerHTML =
    "WebRTC状態: " +
    pc.connectionState +
    "<br>" +
    "ICE状態: " +
    pc.iceConnectionState +
    "<br>" +
    "音声トラック: " +
    (
      trackText ||
      "-"
    );
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
// SOCKET
// ======================================

function connectSocket() {

  return new Promise(
    (resolve, reject) => {

      const protocol =
        location.protocol ===
        "https:"
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
          "✅ WebSocket接続OK"
        );

        resolve();

      };


      ws.onerror = () => {

        log(
          "❌ WebSocketエラー"
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
// HOST START
// ======================================

async function startHost() {

  myRole =
    "host";


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
      "❌ 配信開始失敗: " +
      e.message
    );

  }

}


// ======================================
// VIEWER START
// ======================================

async function startViewer() {

  myRole =
    "viewer";


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

      type:
        "join",

      role:
        "viewer",

      room:
        room

    });


  } catch (e) {

    log(
      "❌ 接続失敗: " +
      e.message
    );

  }

}


// ======================================
// MICROPHONE
// ======================================

async function startMicrophone() {

  log(
    "🎙️ マイク取得開始"
  );


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
            1

        },

        video:
          false

      });


  const tracks =
    localStream.getAudioTracks();


  log(
    "🎙️ マイク取得OK"
  );


  log(
    "音声トラック数: " +
    tracks.length
  );


  if (tracks.length > 0) {

    log(
      "マイクtrack: " +
      tracks[0].readyState
    );

  }

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

function createHostPeer(
  viewer
) {

  log(
    "🔗 Host Peer作成"
  );


  const old =
    viewerConnections.get(
      viewer
    );


  if (old) {

    try {
      old.close();
    } catch {}

  }


  const pc =
    new RTCPeerConnection(
      createRTCConfig()
    );


  viewerConnections.set(
    viewer,
    pc
  );


  if (localStream) {

    const tracks =
      localStream
        .getAudioTracks();


    for (
      const track
      of tracks
    ) {

      log(
        "🎙️ 音声track追加"
      );


      const sender =
        pc.addTrack(
          track,
          localStream
        );


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

      } catch {}

    }

  }


  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        log(
          "📡 ICE candidate送信"
        );


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

        );

      }

    };


  pc.oniceconnectionstatechange =
    () => {

      log(
        "Host ICE: " +
        pc.iceConnectionState
      );


      updateRTCStatus(
        pc
      );

    };


  pc.onconnectionstatechange =
    () => {

      log(
        "Host WebRTC: " +
        pc.connectionState
      );


      updateRTCStatus(
        pc
      );

    };


  return pc;

}


// ======================================
// OFFER
// ======================================

async function sendOffer(
  viewer
) {

  log(
    "📨 Offer作成開始"
  );


  const pc =
    createHostPeer(
      viewer
    );


  const offer =
    await pc.createOffer();


  log(
    "📨 Offer作成OK"
  );


  await pc.setLocalDescription(
    offer
  );


  log(
    "📨 LocalDescription設定OK"
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
    "📨 Offer送信"
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


  log(
    "🔗 Viewer Peer作成"
  );


  viewerPeer =
    new RTCPeerConnection(
      createRTCConfig()
    );


  viewerPeer.onicecandidate =
    event => {

      if (
        event.candidate &&
        viewerId
      ) {

        log(
          "📡 Viewer ICE送信"
        );


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

        );

      }

    };


  viewerPeer.oniceconnectionstatechange =
    () => {

      log(
        "Viewer ICE: " +
        viewerPeer.iceConnectionState
      );


      updateRTCStatus(
        viewerPeer
      );

    };


  viewerPeer.onconnectionstatechange =
    () => {

      log(
        "Viewer WebRTC: " +
        viewerPeer.connectionState
      );


      updateRTCStatus(
        viewerPeer
      );


      if (
        viewerPeer.connectionState ===
        "connected"
      ) {

        setStatus(
          "🔴 配信中",
          true
        );

      }

    };


  // ====================================
  // AUDIO TRACK
  // ====================================

  viewerPeer.ontrack =
    event => {

      log(
        "🔊🔊🔊 AUDIO TRACK RECEIVED"
      );


      log(
        "track kind: " +
        event.track.kind
      );


      log(
        "track state: " +
        event.track.readyState
      );


      // 新しいMediaStreamを作る
      if (
        !remoteStream
      ) {

        remoteStream =
          new MediaStream();

      }


      // track追加
      try {

        remoteStream.addTrack(
          event.track
        );

      } catch {}


      remoteAudio.srcObject =
        remoteStream;


      remoteAudio.volume =
        1;


      remoteAudio.muted =
        false;


      updateRTCStatus(
        viewerPeer,
        "受信済み: " +
        event.track.readyState
      );


      document.getElementById(
        "voiceText"
      ).textContent =
        "🔊 音声を受信しました";


      setStatus(
        "🔴 音声受信中",
        true
      );


      // 再生を試す
      remoteAudio
        .play()
        .then(
          () => {

            log(
              "🔊 自動音声再生成功"
            );

            document
              .getElementById(
                "audioButton"
              )
              .classList
              .add("hidden");

          }
        )
        .catch(
          e => {

            log(
              "⚠️ 自動再生待ち"
            );

            document
              .getElementById(
                "audioButton"
              )
              .classList
              .remove("hidden");

          }
        );

    };


  return viewerPeer;

}


// ======================================
// VIEWER SIGNAL
// ======================================

async function handleViewerSignal(
  msg
) {

  const pc =
    createViewerPeer();


  // ==================================
  // OFFER
  // ==================================

  if (
    msg.type ===
    "offer"
  ) {

    log(
      "📨 Offer受信"
    );


    await pc.setRemoteDescription({

      type:
        "offer",

      sdp:
        msg.sdp

    });


    log(
      "📨 RemoteDescription設定OK"
    );


    for (
      const candidate
      of pendingViewerCandidates
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

        log(
          "📡 待機ICE追加OK"
        );

      } catch (e) {

        log(
          "❌ 待機ICE失敗"
        );

      }

    }


    pendingViewerCandidates =
      [];


    const answer =
      await pc.createAnswer();


    log(
      "📨 Answer作成OK"
    );


    await pc.setLocalDescription(
      answer
    );


    log(
      "📨 LocalDescription設定OK"
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
      "📨 Answer送信"
    );


    return;

  }


  // ==================================
  // ICE
  // ==================================

  if (
    msg.type ===
    "candidate"
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


        log(
          "📡 Viewer ICE追加OK"
        );

      } catch (e) {

        log(
          "❌ Viewer ICE追加失敗"
        );

      }

    } else {

      log(
        "📡 Viewer ICEを待機"
      );


      pendingViewerCandidates
        .push(
          candidate
        );

    }

  }

}


// ======================================
// HOST SIGNAL
// ======================================

async function handleHostSignal(
  msg
) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc) {

    log(
      "❌ Peerがありません"
    );

    return;

  }


  // ==================================
  // ANSWER
  // ==================================

  if (
    msg.signal.type ===
    "answer"
  ) {

    log(
      "📨 Answer受信"
    );


    await pc.setRemoteDescription({

      type:
        "answer",

      sdp:
        msg.signal.sdp

    });


    log(
      "📨 Answer設定OK"
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
  // ICE
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


        log(
          "📡 Host ICE追加OK"
        );

      } catch {

        log(
          "❌ Host ICE追加失敗"
        );

      }

    } else {

      if (
        !pendingHostCandidates.has(
          msg.from
        )
      ) {

        pendingHostCandidates.set(
          msg.from,
          []
        );

      }


      pendingHostCandidates
        .get(msg.from)
        .push(
          candidate
        );

    }

  }

}


// ======================================
// MESSAGE
// ======================================

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
    "status"
  ) {

    log(
      msg.text
    );


    return;

  }


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
    "stream-started"
  ) {

    setStatus(
      "🔴 配信中",
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


    remoteAudio.srcObject =
      null;


    return;

  }


  if (
    msg.type ===
    "host-left"
  ) {

    setStatus(
      "配信者が退出しました"
    );


    remoteAudio.srcObject =
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

}


// ======================================
// AUDIO BUTTON
// ======================================

async function enableAudio() {

  log(
    "🔊 音声開始ボタン押下"
  );


  try {

    remoteAudio.muted =
      false;


    remoteAudio.volume =
      1;


    if (
      remoteAudio.srcObject
    ) {

      await remoteAudio.play();


      log(
        "🔊🔊🔊 音声再生成功"
      );


      document
        .getElementById(
          "audioButton"
        )
        .classList
        .add("hidden");

    } else {

      log(
        "⚠️ まだ音声ストリームがありません"
      );

    }

  } catch (e) {

    log(
      "❌ 音声再生エラー: " +
      e.message
    );

  }

}


// ======================================
// STOP
// ======================================

function stopLive() {

  if (
    myRole ===
    "host"
  ) {

    send({

      type:
        "stream-stopped"

    });

  }


  if (
    localStream
  ) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    localStream =
      null;

  }


  for (
    const pc
    of viewerConnections.values()
  ) {

    try {
      pc.close();
    } catch {}

  }


  viewerConnections.clear();


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


  pendingHostCandidates.clear();


  remoteStream =
    null;


  remoteAudio.srcObject =
    null;


  remoteAudio.muted =
    true;


  if (
    ws
  ) {

    try {
      ws.close();
    } catch {}

    ws =
      null;

  }


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


  myRole =
    null;


  viewerId =
    null;


  setStatus(
    "停止しました"
  );

}

</script>

</body>

</html>
`;


// ==========================================
// HTTP
// ==========================================

const server =
  http.createServer(
    (req, res) => {

      if (
        req.url ===
        "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );

        res.end(
          "OK"
        );

        return;

      }


      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8"
        }
      );


      res.end(
        HTML
      );

    }
  );


// ==========================================
// WEBSOCKET
// ==========================================

const wss =
  new WebSocket.Server({
    server
  });


let nextId =
  1;


const clients =
  new Map();


// ==========================================
// SEND
// ==========================================

function send(
  ws,
  data
) {

  if (
    ws &&
    ws.readyState ===
    WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify(
        data
      )
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
      String(
        nextId++
      );


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

        id:
          id
      }
    );


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


        // =================================
        // JOIN
        // =================================

        if (
          msg.type ===
          "join"
        ) {

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


        // =================================
        // SIGNAL
        // =================================

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


        // =================================
        // STREAM START
        // =================================

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


        // =================================
        // STREAM STOP
        // =================================

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


    // =================================
    // CLOSE
    // =================================

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


        if (
          role ===
          "host"
        ) {

          for (
            const other
            of clients.values()
          ) {

            if (
              other.room === room &&
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


        if (
          role ===
          "viewer"
        ) {

          for (
            const other
            of clients.values()
          ) {

            if (
              other.room === room &&
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

  }
);


// ==========================================
// ROOM STATUS
// ==========================================

function updateRoomStatus(
  room
) {

  let host =
    false;


  let viewers =
    0;


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
      "WEBRTC DEBUG MODE"
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
