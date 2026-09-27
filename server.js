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

<title>Bota Live</title>

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
  width: 100%;
  min-height: 100vh;
  padding: 12px;
}

.card {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  background: #151515;
  border-radius: 18px;
  padding: 16px;
}

h1 {
  text-align: center;
  margin: 8px 0 18px;
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

#delay {
  margin-top: 10px;
  padding: 10px;
  background: #101010;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
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
preload="none"
class="hidden"
></video>


<button
id="audioButton"
class="audioButton hidden"
onclick="enableAudio()"
>
🔊 音声をONにする
</button>


<button
id="stopButton"
class="stopButton"
onclick="stopLive()"
>
⛔ 終了
</button>


<div id="info" class="small"></div>

<div id="delay">
📡 接続確認中...
</div>

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

let statsTimer = null;

const room = "bota";


const localVideo =
document.getElementById("localVideo");

const remoteVideo =
document.getElementById("remoteVideo");

const statusBox =
document.getElementById("status");

const info =
document.getElementById("info");

const delayBox =
document.getElementById("delay");

const logBox =
document.getElementById("log");


// =====================================
// ログ
// =====================================

function log(text) {

  console.log(text);

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


// =====================================
// ステータス
// =====================================

function setStatus(text, live = false) {

  statusBox.textContent = text;

  statusBox.className =
    "status " +
    (live ? "live" : "wait");
}


// =====================================
// 視聴者側低遅延設定
// =====================================

function setupLowLatencyVideo() {

  if (!remoteVideo) {
    return;
  }

  remoteVideo.autoplay = true;

  remoteVideo.playsInline = true;

  remoteVideo.muted = true;

  remoteVideo.setAttribute(
    "autoplay",
    ""
  );

  remoteVideo.setAttribute(
    "playsinline",
    ""
  );

  log(
    "⚡ 視聴者側低遅延設定ON"
  );
}


// =====================================
// WebSocket接続
// =====================================

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
  });
}


// =====================================
// 送信
// =====================================

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


// =====================================
// 配信者開始
// =====================================

async function startHost() {

  myRole = "host";


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

      type: "join",

      role: "host",

      room: room
    });


    await startCamera();


    setStatus(
      "配信中",
      true
    );


    send({

      type:
        "stream-started"
    });


    startStats();


  } catch (e) {

    log(
      "配信開始エラー: " +
      e.message
    );


    setStatus(
      "開始できません"
    );
  }
}


// =====================================
// 視聴者開始
// =====================================

async function startViewer() {

  myRole = "viewer";


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


  remoteVideo
    .classList
    .remove("hidden");


  setupLowLatencyVideo();


  // ハウリング防止
  remoteVideo.muted = true;


  setStatus(
    "配信を接続中..."
  );


  try {

    await connectSocket();


    send({

      type: "join",

      role: "viewer",

      room: room
    });


    startStats();


  } catch (e) {

    log(
      "接続エラー: " +
      e.message
    );
  }
}


// =====================================
// カメラ・マイク
// =====================================

async function startCamera() {

  localStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        video: {

          facingMode:
            "user",

          width: {

            ideal: 640,

            max: 640
          },

          height: {

            ideal: 360,

            max: 360
          },

          frameRate: {

            ideal: 20,

            max: 20
          }
        },


        audio: {

          echoCancellation:
            true,

          noiseSuppression:
            true,

          autoGainControl:
            true,

          channelCount:
            1
        }
      });


  localVideo.srcObject =
    localStream;


  localVideo
    .classList
    .remove("hidden");


  log(
    "🎥 カメラ・マイク取得OK"
  );


  log(
    "⚡ 超低遅延モード"
  );
}


// =====================================
// 配信者Peer
// =====================================

function createHostPeer(viewer) {

  const old =
    viewerConnections
      .get(viewer);


  if (old) {

    old.close();

    viewerConnections
      .delete(viewer);
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


  // ===================================
  // カメラ映像・音声
  // ===================================

  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      const sender =
        pc.addTrack(
          track,
          localStream
        );


      if (
        track.kind ===
        "video"
      ) {

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
            500000;


          params.encodings[0]
            .maxFramerate =
            20;


          params.encodings[0]
            .scaleResolutionDownBy =
            1;


          params.degradationPreference =
            "maintain-framerate";


          sender
            .setParameters(
              params
            )
            .catch(() => {});


          log(
            "⚡ 映像低遅延設定"
          );


        } catch (e) {

          console.log(e);
        }
      }
    }
  }


  // ===================================
  // ICE
  // ===================================

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


  // ===================================
  // 接続状態
  // ===================================

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
          "🎉 映像接続成功"
        );
      }
    };


  return pc;
}


// =====================================
// Offer送信
// =====================================

async function sendOffer(viewer) {

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


// =====================================
// 視聴者Peer
// =====================================

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
      ]
    });


  // ===================================
  // ICE
  // ===================================

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


  // ===================================
  // 映像・音声受信
  // ===================================

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


        remoteVideo
          .classList
          .remove("hidden");


        // ハウリング防止
        remoteVideo.muted =
          true;


        document
          .getElementById(
            "audioButton"
          )
          .classList
          .remove("hidden");


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


  // ===================================
  // 接続状態
  // ===================================

  viewerPeer
    .onconnectionstatechange =
    () => {

      log(

        "配信者 : " +
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
          "🎉 配信者との接続成功"
        );
      }
    };


  return viewerPeer;
}


// =====================================
// 視聴者シグナル
// =====================================

async function handleViewerSignal(msg) {

  const pc =
    createViewerPeer();


  // ===================================
  // Offer
  // ===================================

  if (
    msg.type ===
    "offer"
  ) {

    await pc
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

        await pc
          .addIceCandidate(
            candidate
          );

      } catch (e) {

        console.log(e);
      }
    }


    pendingCandidates =
      [];


    const answer =
      await pc.createAnswer();


    await pc
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


    return;
  }


  // ===================================
  // ICE
  // ===================================

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

        await pc
          .addIceCandidate(
            candidate
          );

      } catch (e) {

        log(
          "ICE追加エラー"
        );
      }

    } else {

      pendingCandidates
        .push(candidate);
    }
  }
}


// =====================================
// 配信者シグナル
// =====================================

async function handleHostSignal(msg) {

  const pc =
    viewerConnections
      .get(msg.from);


  if (!pc) {

    log(
      "Peerがありません"
    );

    return;
  }


  // Answer
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


  // ICE
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


// =====================================
// メッセージ処理
// =====================================

async function handleMessage(msg) {

  // welcome
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


  // status
  if (
    msg.type ===
    "status"
  ) {

    log(
      msg.text
    );


    return;
  }


  // room status
  if (
    msg.type ===
    "room-status"
  ) {

    if (
      myRole ===
      "host"
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


  // viewer joined
  if (
    msg.type ===
    "viewer-joined"
  ) {

    if (
      myRole ===
      "host"
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


  // signal
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


  // stream started
  if (
    msg.type ===
    "stream-started"
  ) {

    setStatus(
      "配信者が配信中",
      true
    );


    return;
  }


  // stream stopped
  if (
    msg.type ===
    "stream-stopped"
  ) {

    setStatus(
      "配信終了"
    );


    remoteVideo.srcObject =
      null;


    return;
  }


  // host left
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


  // viewer left
  if (
    msg.type ===
    "viewer-left"
  ) {

    const pc =
      viewerConnections
        .get(
          msg.viewerId
        );


    if (pc) {

      pc.close();


      viewerConnections
        .delete(
          msg.viewerId
        );
    }


    return;
  }
}


// =====================================
// 音声ON
// =====================================

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


// =====================================
// 通信状態
// =====================================

async function updateStats(pc) {

  if (!pc) {
    return;
  }


  try {

    const stats =
      await pc.getStats();


    let packetsLost = 0;

    let packetsReceived = 0;

    let jitter = 0;


    stats.forEach(
      (report) => {

        if (
          report.type ===
          "inbound-rtp"
        ) {

          if (
            report.kind ===
              "video" ||
            report.mediaType ===
              "video"
          ) {

            packetsLost +=
              report.packetsLost ||
              0;


            packetsReceived +=
              report.packetsReceived ||
              0;


            jitter =
              report.jitter ||
              0;
          }
        }
      }
    );


    const total =
      packetsLost +
      packetsReceived;


    let loss = 0;


    if (total > 0) {

      loss =
        (
          packetsLost /
          total
        ) *
        100;
    }


    const jitterMs =
      jitter * 1000;


    delayBox.textContent =
      "📡 通信状態　" +
      "ロス " +
      loss.toFixed(1) +
      "%　" +
      "揺れ " +
      jitterMs.toFixed(0) +
      "ms";


  } catch (e) {

    console.log(e);
  }
}


// =====================================
// Stats
// =====================================

function startStats() {

  if (statsTimer) {

    clearInterval(
      statsTimer
    );
  }


  statsTimer =
    setInterval(
      () => {

        if (
          myRole ===
            "viewer" &&
          viewerPeer
        ) {

          updateStats(
            viewerPeer
          );
        }

      },
      1000
    );
}


// =====================================
// 終了
// =====================================

function stopLive() {

  if (statsTimer) {

    clearInterval(
      statsTimer
    );

    statsTimer =
      null;
  }


  // カメラ・マイク
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


  // 配信者Peer
  for (
    const pc
    of viewerConnections
      .values()
  ) {

    pc.close();
  }


  viewerConnections.clear();


  // 視聴者Peer
  if (viewerPeer) {

    viewerPeer.close();

    viewerPeer =
      null;
  }


  // WebSocket
  if (ws) {

    ws.close();

    ws =
      null;
  }


  localVideo.srcObject =
    null;


  remoteVideo.srcObject =
    null;


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


  delayBox.textContent =
    "📡 接続確認中...";


  setStatus(
    "停止しました"
  );
}

</script>

</body>
</html>
`;


// =====================================
// HTTP SERVER
// =====================================

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


// =====================================
// WEBSOCKET SERVER
// =====================================

const wss =
  new WebSocket.Server({
    server
  });


let nextId = 1;

const clients =
  new Map();


// =====================================
// 送信
// =====================================

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


// =====================================
// 接続
// =====================================

wss.on(
  "connection",
  (ws) => {

    const id =
      String(
        nextId++
      );


    const client = {

      id: id,

      ws: ws,

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


    // =================================
    // message
    // =================================

    ws.on(
      "message",
      (raw) => {

        let msg;


        try {

          msg =
            JSON.parse(
              raw.toString()
            );

        } catch {

          return;
        }


        // ===============================
        // JOIN
        // ===============================

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
            client.role
          );


          // -----------------------------
          // HOST
          // -----------------------------

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


          // -----------------------------
          // VIEWER
          // -----------------------------

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


        // ===============================
        // SIGNAL
        // ===============================

        if (
          msg.type ===
          "signal"
        ) {

          const target =
            clients.get(
              msg.target
            );


          if (!target) {
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


        // ===============================
        // STREAM START
        // ===============================

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


        // ===============================
        // STREAM STOP
        // ===============================

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


    // ===================================
    // CLOSE
    // ===================================

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


        // -------------------------------
        // HOST退出
        // -------------------------------

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


        // -------------------------------
        // VIEWER退出
        // -------------------------------

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
  }
);


// =====================================
// 部屋状態
// =====================================

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


// =====================================
// SERVER START
// =====================================

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
      "LOW LATENCY MODE"
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
