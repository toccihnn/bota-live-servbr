const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";


// =====================================================
// ルーム管理
// =====================================================

const rooms = new Map();

function getRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      host: null,
      live: false
    });
  }

  return rooms.get(roomName);
}


// =====================================================
// HTTP SERVER
// =====================================================

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


// =====================================================
// WEBSOCKET
// =====================================================

const wss = new WebSocket.Server({
  server
});


let nextId = 1;

const clients = new Map();


function send(ws, data) {

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


function sendToClient(id, data) {

  const client = clients.get(id);

  if (!client) {
    return;
  }

  send(client.ws, data);
}


function getRoomClients(roomName) {

  const result = [];

  for (const client of clients.values()) {

    if (client.room === roomName) {
      result.push(client);
    }
  }

  return result;
}


function updateRoomStatus(roomName) {

  const room = getRoom(roomName);

  let viewers = 0;

  for (
    const client
    of getRoomClients(roomName)
  ) {

    if (
      client.role === "viewer"
    ) {

      viewers++;
    }
  }


  for (
    const client
    of getRoomClients(roomName)
  ) {

    send(client.ws, {

      type: "room-status",

      live: !!room.host && room.live,

      viewers

    });
  }
}


// =====================================================
// CONNECTION
// =====================================================

wss.on("connection", (ws) => {

  const id = String(nextId++);


  const client = {

    id,

    ws,

    role: null,

    room: "bota"

  };


  clients.set(id, client);


  console.log(
    `[CONNECT] ${id}`
  );


  send(ws, {

    type: "welcome",

    id

  });


  // ===================================================
  // MESSAGE
  // ===================================================

  ws.on("message", (raw) => {

    let msg;


    try {

      msg = JSON.parse(
        raw.toString()
      );

    } catch (e) {

      console.log(
        "[JSON ERROR]"
      );

      return;
    }


    // =================================================
    // JOIN
    // =================================================

    if (
      msg.type === "join"
    ) {

      client.role =
        msg.role === "host"
          ? "host"
          : "viewer";


      client.room =
        msg.room || "bota";


      const room =
        getRoom(client.room);


      console.log(
        `[JOIN] id=${client.id} role=${client.role} room=${client.room}`
      );


      // -----------------------------------------------
      // HOST
      // -----------------------------------------------

      if (
        client.role === "host"
      ) {

        // 古い配信者がいた場合
        if (
          room.host &&
          room.host !== client.id
        ) {

          const oldHost =
            clients.get(room.host);

          if (oldHost) {

            send(oldHost.ws, {

              type: "host-replaced"

            });
          }
        }


        room.host =
          client.id;


        room.live = true;


        send(ws, {

          type: "role-confirmed",

          role: "host"

        });


        send(ws, {

          type: "status",

          text:
            "配信者として接続しました"

        });


        send(ws, {

          type: "stream-started"

        });


        // 既にいる視聴者へ通知
        for (
          const other
          of getRoomClients(client.room)
        ) {

          if (
            other.id !== client.id &&
            other.role === "viewer"
          ) {

            send(other.ws, {

              type: "stream-started"

            });

            send(other.ws, {

              type: "host-available"

            });


            // 視聴者にも準備を促す
            send(other.ws, {

              type: "viewer-ready"

            });
          }
        }


        updateRoomStatus(
          client.room
        );


        return;
      }


      // -----------------------------------------------
      // VIEWER
      // -----------------------------------------------

      if (
        client.role === "viewer"
      ) {

        send(ws, {

          type: "role-confirmed",

          role: "viewer"

        });


        send(ws, {

          type: "status",

          text:
            "視聴者として接続しました"

        });


        // 配信中か確認
        if (
          room.host &&
          room.live
        ) {

          send(ws, {

            type: "stream-started"

          });


          send(ws, {

            type: "host-available"

          });


          // 配信者へ視聴者参加を通知
          sendToClient(
            room.host,
            {

              type: "viewer-joined",

              viewerId: client.id

            }
          );


          // 視聴者側にも準備通知
          send(ws, {

            type: "viewer-ready"

          });

        } else {

          send(ws, {

            type: "waiting",

            text:
              "配信者を待っています"

          });
        }


        updateRoomStatus(
          client.room
        );


        return;
      }
    }


    // =================================================
    // VIEWER READY
    // =================================================

    if (
      msg.type === "viewer-ready"
    ) {

      const room =
        getRoom(client.room);


      if (
        client.role !== "viewer"
      ) {

        return;
      }


      if (
        room.host &&
        room.live
      ) {

        console.log(
          `[VIEWER READY] viewer=${client.id} host=${room.host}`
        );


        sendToClient(
          room.host,
          {

            type: "viewer-ready",

            viewerId: client.id

          }
        );
      }


      return;
    }


    // =================================================
    // SIGNAL
    // =================================================

    if (
      msg.type === "signal"
    ) {

      const targetId =
        msg.target;


      const target =
        clients.get(targetId);


      if (!target) {

        console.log(
          `[SIGNAL] target not found ${targetId}`
        );

        return;
      }


      if (
        target.room !== client.room
      ) {

        return;
      }


      console.log(
        `[SIGNAL] ${client.id} -> ${targetId} type=${msg.signal?.type || "unknown"}`
      );


      send(target.ws, {

        type: "signal",

        from: client.id,

        signal: msg.signal

      });


      return;
    }


    // =================================================
    // STREAM STARTED
    // =================================================

    if (
      msg.type === "stream-started"
    ) {

      if (
        client.role === "host"
      ) {

        const room =
          getRoom(client.room);


        room.host =
          client.id;


        room.live =
          true;


        for (
          const other
          of getRoomClients(client.room)
        ) {

          if (
            other.role === "viewer"
          ) {

            send(other.ws, {

              type: "stream-started"

            });

            send(other.ws, {

              type: "host-available"

            });


            sendToClient(
              client.id,
              {

                type: "viewer-joined",

                viewerId: other.id

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


    // =================================================
    // STREAM STOPPED
    // =================================================

    if (
      msg.type === "stream-stopped"
    ) {

      if (
        client.role === "host"
      ) {

        const room =
          getRoom(client.room);


        room.live =
          false;


        for (
          const other
          of getRoomClients(client.room)
        ) {

          if (
            other.role === "viewer"
          ) {

            send(other.ws, {

              type: "stream-stopped"

            });
          }
        }


        updateRoomStatus(
          client.room
        );
      }


      return;
    }
  });


  // ===================================================
  // CLOSE
  // ===================================================

  ws.on("close", () => {

    console.log(
      `[CLOSE] ${client.id}`
    );


    const roomName =
      client.room;


    const room =
      getRoom(roomName);


    // -----------------------------------------------
    // HOST
    // -----------------------------------------------

    if (
      client.role === "host"
    ) {

      if (
        room.host === client.id
      ) {

        room.host = null;

        room.live = false;


        for (
          const other
          of getRoomClients(roomName)
        ) {

          if (
            other.role === "viewer"
          ) {

            send(other.ws, {

              type: "host-left"

            });

            send(other.ws, {

              type: "stream-stopped"

            });
          }
        }
      }
    }


    // -----------------------------------------------
    // VIEWER
    // -----------------------------------------------

    if (
      client.role === "viewer"
    ) {

      if (
        room.host
      ) {

        sendToClient(
          room.host,
          {

            type: "viewer-left",

            viewerId: client.id

          }
        );
      }
    }


    clients.delete(
      client.id
    );


    updateRoomStatus(
      roomName
    );
  });
});


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

  padding: 14px;
}


.card {

  max-width: 700px;

  margin: 0 auto;

  background: #151515;

  border-radius: 18px;

  padding: 18px;
}


h1 {

  text-align: center;

  margin: 5px 0 18px;

}


button {

  width: 100%;

  padding: 16px;

  margin: 7px 0;

  border: 0;

  border-radius: 12px;

  font-size: 17px;

  font-weight: bold;

  cursor: pointer;
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

  transform:
    scaleX(-1);
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


<h1>
🎥 Bota Live
</h1>


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



<div
  id="info"
  class="small"
></div>



<div id="log"></div>


</div>

</div>

</div>



<script>


// =====================================================
// GLOBAL
// =====================================================

let ws = null;

let myId = null;

let myRole = null;

let localStream = null;


const room = "bota";


const viewerConnections =
  new Map();


const viewerIceQueues =
  new Map();


let viewerPeer = null;

let viewerId = null;

let viewerIceQueue = [];

let viewerRemoteDescriptionSet =
  false;


const localVideo =
  document.getElementById(
    "localVideo"
  );


const remoteVideo =
  document.getElementById(
    "remoteVideo"
  );


const statusBox =
  document.getElementById(
    "status"
  );


const info =
  document.getElementById(
    "info"
  );


const logBox =
  document.getElementById(
    "log"
  );



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



// =====================================================
// SEND
// =====================================================

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



// =====================================================
// WEBSOCKET CONNECT
// =====================================================

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
              "Message Error: " +
              e.message
            );
          }
        };

    }
  );
}



// =====================================================
// HOST START
// =====================================================

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


  localVideo
    .classList
    .remove("hidden");


  setStatus(
    "配信準備中..."
  );


  try {

    await connectSocket();


    send({

      type: "join",

      role: "host",

      room

    });


    await waitForMyId();


    log(
      "配信者として参加"
    );


    await startCamera();


    setStatus(
      "配信中",
      true
    );


    send({

      type:
        "stream-started"

    });


    log(
      "🎥 配信開始"
    );


  } catch (e) {

    console.error(e);


    log(
      "配信開始エラー: " +
      e.message
    );


    setStatus(
      "配信開始に失敗しました"
    );
  }
}



// =====================================================
// VIEWER START
// =====================================================

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


  setStatus(
    "配信を探しています..."
  );


  try {

    await connectSocket();


    send({

      type: "join",

      role: "viewer",

      room

    });


    await waitForMyId();


    log(
      "👀 視聴者として参加"
    );


  } catch (e) {

    log(
      "接続エラー: " +
      e.message
    );
  }
}



// =====================================================
// WAIT ID
// =====================================================

function waitForMyId() {

  return new Promise(
    (resolve) => {

      if (myId) {

        resolve();

        return;
      }


      const timer =
        setInterval(
          () => {

            if (myId) {

              clearInterval(
                timer
              );

              resolve();
            }

          },
          50
        );


      setTimeout(
        () => {

          clearInterval(
            timer
          );

          resolve();

        },
        5000
      );
    }
  );
}



// =====================================================
// CAMERA
// =====================================================

async function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "カメラ機能が利用できません"
    );
  }


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


  await localVideo.play()
    .catch(() => {});


  log(
    "🎥 カメラOK"
  );


  log(
    "🎤 マイクOK"
  );
}



// =====================================================
// ICE SERVERS
// =====================================================

function createPeerConnection() {

  return new RTCPeerConnection({

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
}



// =====================================================
// HOST PEER
// =====================================================

function createHostPeer(
  viewer
) {

  const old =
    viewerConnections.get(
      viewer
    );


  if (old) {

    try {
      old.close();
    } catch (e) {}

  }


  const pc =
    createPeerConnection();


  viewerConnections.set(
    viewer,
    pc
  );


  viewerIceQueues.set(
    viewer,
    []
  );


  // -----------------------------------------------
  // CAMERA TRACK
  // -----------------------------------------------

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


  // -----------------------------------------------
  // ICE
  // -----------------------------------------------

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


  // -----------------------------------------------
  // CONNECTION
  // -----------------------------------------------

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
          "🎉 視聴者との接続成功"
        );
      }


      if (
        pc.connectionState ===
        "failed"
      ) {

        log(
          "⚠️ 接続失敗"
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

async function sendOffer(
  viewer
) {

  if (
    myRole !== "host"
  ) {

    return;
  }


  if (!localStream) {

    log(
      "カメラがまだ準備できていません"
    );

    return;
  }


  log(
    "📨 Offer作成: " +
    viewer
  );


  const pc =
    createHostPeer(
      viewer
    );


  try {

    const offer =
      await pc.createOffer({

        offerToReceiveAudio: false,

        offerToReceiveVideo: false

      });


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
      "📨 Offer送信"
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

    try {

      viewerPeer.close();

    } catch (e) {}

  }


  viewerPeer =
    createPeerConnection();


  viewerRemoteDescriptionSet =
    false;


  viewerIceQueue = [];


  // -----------------------------------------------
  // ICE
  // -----------------------------------------------

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


  // -----------------------------------------------
  // TRACK
  // -----------------------------------------------

  viewerPeer.ontrack =
    async (event) => {

      log(
        "🎥 映像・音声受信"
      );


      let stream =
        event.streams &&
        event.streams[0];


      if (!stream) {

        stream =
          new MediaStream([
            event.track
          ]);
      }


      remoteVideo.srcObject =
        stream;


      remoteVideo
        .classList
        .remove("hidden");


      remoteVideo.autoplay =
        true;


      remoteVideo.playsInline =
        true;


      // 音声は最初ミュート
      // ボタンでONにする
      remoteVideo.muted =
        true;


      await remoteVideo
        .play()
        .catch(() => {});


      document
        .getElementById(
          "audioButton"
        )
        .classList
        .remove("hidden");


      setStatus(
        "配信中",
        true
      );


      log(
        "✅ 配信映像表示OK"
      );
    };


  // -----------------------------------------------
  // CONNECTION
  // -----------------------------------------------

  viewerPeer
    .onconnectionstatechange =
    () => {

      if (!viewerPeer) {
        return;
      }


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


      if (
        viewerPeer.connectionState ===
        "failed"
      ) {

        setStatus(
          "接続に失敗しました"
        );


        log(
          "⚠️ WebRTC接続失敗"
        );
      }
    };


  // -----------------------------------------------
  // ICE STATE
  // -----------------------------------------------

  viewerPeer
    .oniceconnectionstatechange =
    () => {

      if (!viewerPeer) {
        return;
      }


      log(
        "Viewer ICE: " +
        viewerPeer.iceConnectionState
      );
    };


  return viewerPeer;
}



// =====================================================
// HANDLE VIEWER SIGNAL
// =====================================================

async function handleViewerSignal(
  signal,
  from
) {

  viewerId =
    from;


  if (
    !viewerPeer
  ) {

    createViewerPeer();
  }


  // -----------------------------------------------
  // OFFER
  // -----------------------------------------------

  if (
    signal.type ===
    "offer"
  ) {

    log(
      "📨 Offer受信"
    );


    try {

      await viewerPeer
        .setRemoteDescription({

          type: "offer",

          sdp: signal.sdp

        });


      viewerRemoteDescriptionSet =
        true;


      // 保留していたICEを追加
      for (
        const candidate
        of viewerIceQueue
      ) {

        try {

          await viewerPeer
            .addIceCandidate(
              candidate
            );

        } catch (e) {

          console.log(
            "queued ICE error",
            e
          );
        }
      }


      viewerIceQueue = [];


      const answer =
        await viewerPeer
          .createAnswer();


      await viewerPeer
        .setLocalDescription(
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
        "📨 Answer送信"
      );


    } catch (e) {

      log(
        "Offer処理エラー: " +
        e.message
      );
    }


    return;
  }


  // -----------------------------------------------
  // CANDIDATE
  // -----------------------------------------------

  if (
    signal.type ===
    "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        signal.candidate
      );


    if (
      viewerRemoteDescriptionSet
    ) {

      try {

        await viewerPeer
          .addIceCandidate(
            candidate
          );

      } catch (e) {

        log(
          "ICE追加エラー"
        );
      }

    } else {

      viewerIceQueue.push(
        candidate
      );


      log(
        "ICEを一時保存"
      );
    }
  }
}



// =====================================================
// HANDLE HOST SIGNAL
// =====================================================

async function handleHostSignal(
  msg
) {

  const viewer =
    msg.from;


  const pc =
    viewerConnections.get(
      viewer
    );


  if (!pc) {

    log(
      "Peerなし: " +
      viewer
    );


    return;
  }


  // -----------------------------------------------
  // ANSWER
  // -----------------------------------------------

  if (
    msg.signal.type ===
    "answer"
  ) {

    try {

      await pc.setRemoteDescription({

        type: "answer",

        sdp: msg.signal.sdp

      });


      log(
        "📨 Answer受信: " +
        viewer
      );


      const queue =
        viewerIceQueues.get(
          viewer
        ) || [];


      for (
        const candidate
        of queue
      ) {

        try {

          await pc.addIceCandidate(
            candidate
          );

        } catch (e) {

          console.log(e);
        }
      }


      viewerIceQueues.set(
        viewer,
        []
      );


    } catch (e) {

      log(
        "Answerエラー: " +
        e.message
      );
    }


    return;
  }


  // -----------------------------------------------
  // CANDIDATE
  // -----------------------------------------------

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
          "Host ICEエラー"
        );
      }

    } else {

      const queue =
        viewerIceQueues.get(
          viewer
        ) || [];


      queue.push(
        candidate
      );


      viewerIceQueues.set(
        viewer,
        queue
      );
    }
  }
}



// =====================================================
// MESSAGE
// =====================================================

async function handleMessage(
  msg
) {

  // -----------------------------------------------
  // WELCOME
  // -----------------------------------------------

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


  // -----------------------------------------------
  // ROLE
  // -----------------------------------------------

  if (
    msg.type ===
    "role-confirmed"
  ) {

    log(
      "役割確認: " +
      msg.role
    );


    return;
  }


  // -----------------------------------------------
  // STATUS
  // -----------------------------------------------

  if (
    msg.type === "status"
  ) {

    log(
      msg.text
    );


    return;
  }


  // -----------------------------------------------
  // ROOM STATUS
  // -----------------------------------------------

  if (
    msg.type ===
    "room-status"
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


  // -----------------------------------------------
  // WAITING
  // -----------------------------------------------

  if (
    msg.type === "waiting"
  ) {

    setStatus(
      "配信者を待っています..."
    );


    log(
      "配信者待機中"
    );


    return;
  }


  // -----------------------------------------------
  // STREAM STARTED
  // -----------------------------------------------

  if (
    msg.type ===
    "stream-started"
  ) {

    if (
      myRole === "viewer"
    ) {

      setStatus(
        "配信者が配信中",
        true
      );


      log(
        "🔴 配信開始"
      );
    }


    return;
  }


  // -----------------------------------------------
  // HOST AVAILABLE
  // -----------------------------------------------

  if (
    msg.type ===
    "host-available"
  ) {

    if (
      myRole === "viewer"
    ) {

      log(
        "配信者を発見"
      );


      send({

        type:
          "viewer-ready"

      });
    }


    return;
  }


  // -----------------------------------------------
  // VIEWER READY
  // -----------------------------------------------

  if (
    msg.type ===
    "viewer-ready"
  ) {

    if (
      myRole === "host"
    ) {

      const id =
        msg.viewerId;


      if (!id) {
        return;
      }


      log(
        "👀 視聴者準備OK: " +
        id
      );


      await sendOffer(
        id
      );
    }


    return;
  }


  // -----------------------------------------------
  // VIEWER JOINED
  // -----------------------------------------------

  if (
    msg.type ===
    "viewer-joined"
  ) {

    if (
      myRole === "host"
    ) {

      const id =
        msg.viewerId;


      log(
        "👀 新しい視聴者: " +
        id
      );


      await sendOffer(
        id
      );
    }


    return;
  }


  // -----------------------------------------------
  // SIGNAL
  // -----------------------------------------------

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

      await handleViewerSignal(
        msg.signal,
        msg.from
      );
    }


    return;
  }


  // -----------------------------------------------
  // STREAM STOPPED
  // -----------------------------------------------

  if (
    msg.type ===
    "stream-stopped"
  ) {

    setStatus(
      "配信終了"
    );


    remoteVideo.srcObject =
      null;


    remoteVideo
      .classList
      .add("hidden");


    document
      .getElementById(
        "audioButton"
      )
      .classList
      .add("hidden");


    return;
  }


  // -----------------------------------------------
  // HOST LEFT
  // -----------------------------------------------

  if (
    msg.type ===
    "host-left"
  ) {

    setStatus(
      "配信者が退出しました"
    );


    remoteVideo.srcObject =
      null;


    log(
      "配信者が退出しました"
    );


    return;
  }


  // -----------------------------------------------
  // VIEWER LEFT
  // -----------------------------------------------

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

      } catch (e) {}

    }


    viewerConnections.delete(
      msg.viewerId
    );


    viewerIceQueues.delete(
      msg.viewerId
    );


    log(
      "視聴者退出: " +
      msg.viewerId
    );


    return;
  }


  // -----------------------------------------------
  // HOST REPLACED
  // -----------------------------------------------

  if (
    msg.type ===
    "host-replaced"
  ) {

    log(
      "配信者が変更されました"
    );


    return;
  }
}



// =====================================================
// ENABLE AUDIO
// =====================================================

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



// =====================================================
// STOP
// =====================================================

function stopLive() {

  // -----------------------------------------------
  // HOST STOP
  // -----------------------------------------------

  if (
    myRole === "host"
  ) {

    send({

      type:
        "stream-stopped"

    });
  }


  // -----------------------------------------------
  // CAMERA
  // -----------------------------------------------

  if (localStream) {

    for (
      const track
      of localStream.getTracks()
    ) {

      try {

        track.stop();

      } catch (e) {}
    }


    localStream =
      null;
  }


  // -----------------------------------------------
  // HOST PEERS
  // -----------------------------------------------

  for (
    const pc
    of viewerConnections.values()
  ) {

    try {

      pc.close();

    } catch (e) {}
  }


  viewerConnections.clear();

  viewerIceQueues.clear();


  // -----------------------------------------------
  // VIEWER PEER
  // -----------------------------------------------

  if (viewerPeer) {

    try {

      viewerPeer.close();

    } catch (e) {}


    viewerPeer =
      null;
  }


  viewerId =
    null;


  viewerIceQueue =
    [];


  // -----------------------------------------------
  // WEBSOCKET
  // -----------------------------------------------

  if (ws) {

    try {

      ws.close();

    } catch (e) {}


    ws =
      null;
  }


  // -----------------------------------------------
  // VIDEO
  // -----------------------------------------------

  localVideo.srcObject =
    null;


  remoteVideo.srcObject =
    null;


  // -----------------------------------------------
  // SCREEN
  // -----------------------------------------------

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


  localVideo
    .classList
    .add("hidden");


  remoteVideo
    .classList
    .add("hidden");


  document
    .getElementById(
      "audioButton"
    )
    .classList
    .add("hidden");


  info.textContent =
    "";


  logBox.textContent =
    "";


  myId =
    null;


  myRole =
    null;


  setStatus(
    "停止しました"
  );
}

</script>

</body>

</html>
`;
