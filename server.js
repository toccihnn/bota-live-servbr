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

<title>Bota Live Voice</title>

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
  min-height: 100vh;
  padding: 14px;
}

.card {
  width: 100%;
  max-width: 700px;
  margin: auto;
  background: #151515;
  border-radius: 20px;
  padding: 18px;
}

h1 {
  text-align: center;
  margin: 8px 0 20px;
}

button {
  width: 100%;
  border: 0;
  border-radius: 13px;
  padding: 15px;
  margin: 6px 0;
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

.likeButton {
  background: #ff4d6d;
  color: white;
}

.status {
  padding: 13px;
  margin: 10px 0;
  border-radius: 12px;
  background: #202020;
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

.info {
  text-align: center;
  color: #aaa;
  margin: 10px 0;
}

.voiceBox {
  padding: 30px 15px;
  margin: 12px 0;
  border-radius: 18px;
  background: #101010;
  text-align: center;
}

.micIcon {
  font-size: 70px;
}

.voiceText {
  font-size: 20px;
  margin-top: 10px;
}

.commentBox {
  margin-top: 15px;
}

#comments {
  height: 220px;
  overflow-y: auto;
  background: #090909;
  border-radius: 12px;
  padding: 10px;
}

.comment {
  padding: 7px 5px;
  border-bottom: 1px solid #222;
  word-break: break-word;
}

.commentName {
  color: #8ab4ff;
  font-weight: bold;
}

.commentInput {
  display: flex;
  gap: 7px;
  margin-top: 8px;
}

.commentInput input {
  flex: 1;
  min-width: 0;
  padding: 13px;
  border: 0;
  border-radius: 10px;
  background: #252525;
  color: white;
  font-size: 16px;
}

.commentInput button {
  width: 90px;
  margin: 0;
  background: #635bff;
  color: white;
}

#likes {
  text-align: center;
  font-size: 22px;
  margin: 12px 0;
}

#log {
  margin-top: 15px;
  background: #050505;
  border-radius: 10px;
  padding: 10px;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  color: #00ff66;
  font-size: 12px;
}

.small {
  text-align: center;
  color: #777;
  font-size: 12px;
  margin-top: 12px;
}

</style>
</head>

<body>

<div id="app">

<div class="card">

<h1>🎙️ Bota Live</h1>

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
🎧 視聴者として参加
</button>

</div>


<div id="liveArea" class="hidden">

<div id="status" class="status">
接続中...
</div>

<div class="voiceBox">

<div class="micIcon">
🎙️
</div>

<div
id="voiceText"
class="voiceText"
>
音声ライブ
</div>

</div>


<div
id="info"
class="info"
>
視聴者: 0人
</div>


<div id="likes">
❤️ 0
</div>


<audio
id="remoteAudio"
autoplay
playsinline
></audio>


<button
id="audioButton"
class="audioButton hidden"
onclick="enableAudio()"
>
🔊 音声をONにする
</button>


<button
id="micButton"
class="audioButton hidden"
onclick="toggleMic()"
>
🎙️ マイクOFF
</button>


<button
id="likeButton"
class="likeButton hidden"
onclick="sendLike()"
>
❤️ いいね
</button>


<div class="commentBox">

<div id="comments"></div>

<div class="commentInput">

<input
id="commentInput"
type="text"
maxlength="100"
placeholder="コメントを入力..."
>

<button
onclick="sendComment()"
>
送信
</button>

</div>

</div>


<button
class="stopButton"
onclick="stopLive()"
>
⛔ 終了
</button>


<div
id="log"
></div>

<div class="small">
Bota Live Voice v1
</div>

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

let likes = 0;

let micEnabled = true;

const room = "bota";


const statusBox =
document.getElementById("status");

const info =
document.getElementById("info");

const remoteAudio =
document.getElementById("remoteAudio");

const logBox =
document.getElementById("log");

const comments =
document.getElementById("comments");


function log(text) {

  console.log(text);

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


function setStatus(
  text,
  live = false
) {

  statusBox.textContent =
    text;

  statusBox.className =
    "status " +
    (live ? "live" : "wait");
}


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


function connectSocket() {

  return new Promise(
    (resolve, reject) => {

      const protocol =
        location.protocol ===
        "https:"
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
              "Message error: " +
              e.message
            );
          }
        };

    }
  );
}


// =================================
// 配信者
// =================================

async function startHost() {

  myRole = "host";

  showLiveArea();

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

    document
      .getElementById(
        "micButton"
      )
      .classList
      .remove("hidden");

    setStatus(
      "配信中",
      true
    );

    send({
      type:
        "stream-started"
    });

    log(
      "🎙️ 音声配信開始"
    );

  } catch (e) {

    log(
      "配信開始エラー: " +
      e.message
    );

    setStatus(
      "マイクを開始できません"
    );
  }
}


// =================================
// 視聴者
// =================================

async function startViewer() {

  myRole = "viewer";

  showLiveArea();

  document
    .getElementById(
      "likeButton"
    )
    .classList
    .remove("hidden");

  document
    .getElementById(
      "audioButton"
    )
    .classList
    .remove("hidden");

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

    log(
      "🎧 視聴者として参加"
    );

  } catch (e) {

    log(
      "接続エラー: " +
      e.message
    );
  }
}


function showLiveArea() {

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
}


// =================================
// マイク
// =================================

async function startMicrophone() {

  localStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        audio: {

          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true,

          channelCount: 1
        },

        video: false
      });

  const track =
    localStream
      .getAudioTracks()[0];

  if (track) {

    track.enabled = true;

    micEnabled = true;
  }

  log(
    "🎙️ マイク取得OK"
  );
}


// =================================
// 配信者Peer
// =================================

function createHostPeer(
  viewer
) {

  const old =
    viewerConnections.get(
      viewer
    );

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
    event => {

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


  pc.onconnectionstatechange =
    () => {

      log(
        "視聴者 " +
        viewer +
        ": " +
        pc.connectionState
      );

      if (
        pc.connectionState ===
        "connected"
      ) {

        log(
          "🎉 音声接続成功"
        );
      }
    };


  return pc;
}


// =================================
// Offer
// =================================

async function sendOffer(
  viewer
) {

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


// =================================
// 視聴者Peer
// =================================

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


  viewerPeer.onicecandidate =
    event => {

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


  viewerPeer.ontrack =
    event => {

      log(
        "🎧 音声受信"
      );

      if (
        event.streams &&
        event.streams[0]
      ) {

        remoteAudio.srcObject =
          event.streams[0];

        remoteAudio.muted =
          true;

        remoteAudio
          .play()
          .catch(() => {});

        setStatus(
          "配信中",
          true
        );
      }
    };


  viewerPeer
    .onconnectionstatechange =
    () => {

      log(
        "配信者: " +
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
          "🎧 配信者との音声接続成功"
        );
      }
    };


  return viewerPeer;
}


// =================================
// 視聴者シグナル
// =================================

async function handleViewerSignal(
  signal
) {

  const pc =
    createViewerPeer();


  if (
    signal.type ===
    "offer"
  ) {

    await pc
      .setRemoteDescription({

        type:
          "offer",

        sdp:
          signal.sdp
      });


    for (
      const candidate
      of pendingCandidates
    ) {

      try {

        await pc
          .addIceCandidate(
            candidate
          );

      } catch (e) {}

    }


    pendingCandidates = [];


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

        await pc
          .addIceCandidate(
            candidate
          );

      } catch (e) {

        log(
          "ICEエラー"
        );
      }

    } else {

      pendingCandidates
        .push(candidate);
    }
  }
}


// =================================
// 配信者シグナル
// =================================

async function handleHostSignal(
  msg
) {

  const pc =
    viewerConnections.get(
      msg.from
    );

  if (!pc) {

    return;
  }


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

    return;
  }


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


// =================================
// メッセージ
// =================================

async function handleMessage(
  msg
) {

  if (
    msg.type ===
    "welcome"
  ) {

    myId =
      msg.id;

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

    info.textContent =
      "視聴者: " +
      msg.viewers +
      "人";

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
        "👤 視聴者入室: " +
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
      "配信者が配信中",
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


  if (
    msg.type ===
    "comment"
  ) {

    addComment(
      msg.name,
      msg.text
    );

    return;
  }


  if (
    msg.type ===
    "like"
  ) {

    likes++;

    document
      .getElementById(
        "likes"
      )
      .textContent =
        "❤️ " + likes;

    return;
  }
}


// =================================
// 音声ON
// =================================

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
      "音声再生エラー"
    );
  }
}


// =================================
// マイクON/OFF
// =================================

function toggleMic() {

  if (!localStream) {
    return;
  }

  const tracks =
    localStream
      .getAudioTracks();

  if (!tracks.length) {
    return;
  }

  micEnabled =
    !micEnabled;

  for (
    const track
    of tracks
  ) {

    track.enabled =
      micEnabled;
  }

  document
    .getElementById(
      "micButton"
    )
    .textContent =
      micEnabled
        ? "🎙️ マイクOFF"
        : "🔇 マイクON";

  log(
    micEnabled
      ? "🎙️ マイクON"
      : "🔇 マイクOFF"
  );
}


// =================================
// いいね
// =================================

function sendLike() {

  send({
    type:
      "like"
  });
}


// =================================
// コメント
// =================================

function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  send({

    type:
      "comment",

    text:
      text
  });

  input.value =
    "";
}


function addComment(
  name,
  text
) {

  const div =
    document.createElement(
      "div"
    );

  div.className =
    "comment";

  const safeName =
    document.createElement(
      "span"
    );

  safeName.className =
    "commentName";

  safeName.textContent =
    name + ": ";

  const safeText =
    document.createElement(
      "span"
    );

  safeText.textContent =
    text;

  div.appendChild(
    safeName
  );

  div.appendChild(
    safeText
  );

  comments.appendChild(
    div
  );

  comments.scrollTop =
    comments.scrollHeight;
}


// =================================
// 終了
// =================================

function stopLive() {

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


  for (
    const pc
    of viewerConnections
      .values()
  ) {

    pc.close();
  }

  viewerConnections.clear();


  if (viewerPeer) {

    viewerPeer.close();

    viewerPeer =
      null;
  }


  if (ws) {

    ws.close();

    ws =
      null;
  }


  remoteAudio.srcObject =
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
      "micButton"
    )
    .classList
    .add("hidden");

  document
    .getElementById(
      "likeButton"
    )
    .classList
    .add("hidden");

  document
    .getElementById(
      "audioButton"
    )
    .classList
    .add("hidden");

  setStatus(
    "停止しました"
  );
}

</script>

</body>
</html>
`;


// ============================================
// HTTP SERVER
// ============================================

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

      res.end(
        HTML
      );
    }
  );


// ============================================
// WEBSOCKET
// ============================================

const wss =
  new WebSocket.Server({
    server
  });


let nextId = 1;

const clients =
  new Map();


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


function broadcastRoom(
  room,
  data,
  exceptId = null
) {

  for (
    const client
    of clients.values()
  ) {

    if (
      client.room === room &&
      client.id !== exceptId
    ) {

      send(
        client.ws,
        data
      );
    }
  }
}


// ============================================
// CONNECTION
// ============================================

wss.on(
  "connection",
  ws => {

    const id =
      String(
        nextId++
      );


    const client = {

      id: id,

      ws: ws,

      role: null,

      room: "bota",

      name:
        "ユーザー" + id
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


    // ========================================
    // MESSAGE
    // ========================================

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


          send(
            ws,
            {
              type:
                "status",

              text:
                client.role ===
                "host"
                  ? "配信者として接続しました"
                  : "視聴者として接続しました"
            }
          );


          // 配信者の場合
          if (
            client.role ===
            "host"
          ) {

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


          // 視聴者の場合
          if (
            client.role ===
            "viewer"
          ) {

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


        // ==============================
        // STREAM START
        // ==============================

        if (
          msg.type ===
          "stream-started"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "stream-started"
            },
            client.id
          );

          return;
        }


        // ==============================
        // STREAM STOP
        // ==============================

        if (
          msg.type ===
          "stream-stopped"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "stream-stopped"
            },
            client.id
          );

          return;
        }


        // ==============================
        // LIKE
        // ==============================

        if (
          msg.type ===
          "like"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "like"
            }
          );

          return;
        }


        // ==============================
        // COMMENT
        // ==============================

        if (
          msg.type ===
          "comment"
        ) {

          const text =
            String(
              msg.text || ""
            )
            .trim()
            .slice(0, 100);


          if (!text) {
            return;
          }


          broadcastRoom(
            client.room,
            {

              type:
                "comment",

              name:
                client.name,

              text:
                text
            }
          );

          return;
        }

      }
    );


    // ========================================
    // CLOSE
    // ========================================

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

          broadcastRoom(
            room,
            {
              type:
                "host-left"
            }
          );

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


// ============================================
// ROOM STATUS
// ============================================

function updateRoomStatus(
  room
) {

  let host = false;

  let viewers = 0;


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

      host = true;
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


// ============================================
// START
// ============================================

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "Bota Live Voice v1"
    );

    console.log(
      "Audio Live / WebRTC"
    );

    console.log(
      "Comments / Likes"
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
