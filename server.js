const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/* =====================================================
   LIVE DATA
===================================================== */

const clients = new Set();
let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  startedAt: null,
  background: ""
};

/* =====================================================
   HTML
===================================================== */

const HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<meta name="theme-color" content="#030510">
<title>VoiceポタLive</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #030510;
  color: #fff;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  min-height: 100vh;
  padding-bottom: 90px;
}

button {
  font-family: inherit;
}

.app {
  min-height: 100vh;
}

.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3,5,16,.88);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(150,170,255,.08);
}

.logo {
  font-size: 21px;
  font-weight: 900;
  letter-spacing: .5px;
  background:
    linear-gradient(
      90deg,
      #fff,
      #c9ddff,
      #b89cff
    );
  -webkit-background-clip: text;
  color: transparent;
}

.hero {
  position: relative;
  min-height: 430px;
  padding: 60px 22px 45px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  background:
    linear-gradient(
      rgba(3,5,16,.35),
      rgba(3,5,16,.82)
    ),
    url("/home.png") center/cover no-repeat;
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle at 50% 20%,
      rgba(120,150,255,.18),
      transparent 45%
    );
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 32px;
  line-height: 1.25;
  font-weight: 900;
  margin: 0 0 16px;
}

.hero-subtitle {
  font-size: 16px;
  line-height: 1.7;
  color: #d8e0ff;
  font-weight: 700;
}

.hero-text {
  margin-top: 16px;
  color: #aab4d4;
  font-size: 13px;
  line-height: 1.8;
}

.section {
  padding: 28px 16px;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

.section-title span {
  color: #7683aa;
  font-size: 11px;
  font-weight: 800;
}

.live-list {
  display: grid;
  gap: 12px;
}

.live-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px;
  border-radius: 18px;
  background:
    linear-gradient(
      145deg,
      rgba(24,32,75,.9),
      rgba(8,11,28,.95)
    );
  border: 1px solid rgba(130,150,255,.1);
  cursor: pointer;
  transition: transform .15s ease;
}

.live-card:active {
  transform: scale(.98);
}

.live-avatar {
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27px;
  background:
    linear-gradient(
      145deg,
      #28356f,
      #11162e
    );
}

.live-info {
  min-width: 0;
  flex: 1;
}

.live-name {
  font-size: 15px;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-title {
  margin-top: 4px;
  font-size: 12px;
  color: #98a5c9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-badge {
  display: inline-block;
  margin-top: 7px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ff315b;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
}

.empty {
  padding: 28px 15px;
  text-align: center;
  color: #697596;
  border-radius: 18px;
  background: rgba(15,20,45,.7);
}

.features {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 12px;
}

.feature {
  min-height: 115px;
  padding: 18px 14px;
  border-radius: 18px;
  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.9),
      rgba(8,11,28,.95)
    );
  border: 1px solid rgba(120,140,255,.12);
}

.feature-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.feature-title {
  font-size: 13px;
  font-weight: 900;
}

.feature-text {
  margin-top: 6px;
  font-size: 10px;
  line-height: 1.6;
  color: #8f9abb;
}

.live-panel {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(2,4,15,.96);
  backdrop-filter: blur(20px);
  padding: 20px 16px 100px;
  overflow-y: auto;
  background-size: cover;
  background-position: center;
}

.live-panel.show {
  display: block;
}

.panel-title {
  font-size: 22px;
  font-weight: 900;
  margin-top: 20px;
}

.panel-status {
  margin-top: 10px;
  padding: 13px;
  border-radius: 15px;
  background: rgba(20,28,70,.9);
  color: #bcd2ff;
  font-size: 13px;
}

.audio-status {
  margin-top: 15px;
  padding: 20px;
  text-align: center;
  border-radius: 20px;
  background:
    linear-gradient(
      145deg,
      rgba(35,45,110,.9),
      rgba(10,14,40,.95)
    );
}

.audio-icon {
  font-size: 55px;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.08);
  }

  100% {
    transform: scale(1);
  }
}

#remoteAudio {
  width: 100%;
  margin-top: 15px;
}

.panel-button {
  width: 100%;
  margin-top: 14px;
  padding: 15px;
  border: 0;
  border-radius: 15px;
  color: #fff;
  background:
    linear-gradient(
      135deg,
      #4e61ff,
      #7958d9
    );
  font-size: 14px;
  font-weight: 900;
}

.stop-button {
  background:
    linear-gradient(
      135deg,
      #ff315b,
      #c51e47
    );
}

.close-button {
  background: rgba(70,80,120,.8);
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  height: 76px;
  display: grid;
  grid-template-columns: repeat(5,1fr);
  background: rgba(3,5,16,.94);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(140,160,255,.1);
}

.nav-item {
  border: 0;
  background: transparent;
  color: #687394;
  font-size: 9px;
  font-weight: 800;
}

.nav-item.active {
  color: #dce5ff;
}

.nav-icon {
  font-size: 23px;
  margin-bottom: 3px;
}

.nav-live {
  width: 49px;
  height: 49px;
  margin: -12px auto 2px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(
      135deg,
      #6677ff,
      #9b6cff
    );
  box-shadow:
    0 7px 25px rgba(90,90,255,.4);
  font-size: 23px;
}

</style>
</head>

<body>

<div class="app">

<header class="header">
  <div class="logo">VoiceポタLive</div>
</header>

<section class="hero">

  <div class="hero-content">

    <h1 class="hero-title">
      声でつながる、<br>
      みんなの居場所。
    </h1>

    <div class="hero-subtitle">
      あなたの声が、誰かの夜を照らす。
    </div>

    <div class="hero-text">
      月明かりの下で、話して、聴いて、笑って。<br>
      VoiceポタLiveで、あなたの声をもっと近くに。
    </div>

  </div>

</section>

<section class="section" id="liveSection">

  <div class="section-title">
    <h2>🔴 配信中</h2>
    <span>LIVE</span>
  </div>

  <div class="live-list" id="liveList">
    <div class="empty">
      現在配信中のライブはありません
    </div>
  </div>

</section>

<section class="section">

  <div class="section-title">
    <h2>✨ VoiceポタLive</h2>
    <span>FEATURE</span>
  </div>

  <div class="features">

    <div class="feature">
      <div class="feature-icon">🎙️</div>
      <div class="feature-title">音声ライブ</div>
      <div class="feature-text">
        声だけで気軽に配信できます。
      </div>
    </div>

    <div class="feature">
      <div class="feature-icon">🌙</div>
      <div class="feature-title">夜の居場所</div>
      <div class="feature-text">
        月明かりのように落ち着ける場所。
      </div>
    </div>

    <div class="feature">
      <div class="feature-icon">⚡</div>
      <div class="feature-title">低遅延</div>
      <div class="feature-text">
        リアルタイムに近い音声体験。
      </div>
    </div>

    <div class="feature">
      <div class="feature-icon">👥</div>
      <div class="feature-title">みんなで楽しめる</div>
      <div class="feature-text">
        好きな声でつながる場所。
      </div>
    </div>

  </div>

</section>

<div class="live-panel" id="livePanel">

  <div class="panel-title">VoiceポタLive</div>

  <div class="panel-status" id="panelStatus">
    接続準備中...
  </div>

  <div class="audio-status">
    <div class="audio-icon">🎙️</div>
    <div id="audioText">音声接続</div>
  </div>

  <audio id="remoteAudio" autoplay playsinline></audio>

  <button
    class="panel-button stop-button"
    id="stopLiveButton"
    onclick="stopLive()"
  >
    🔴 配信を終了
  </button>

  <button
    class="panel-button"
    id="backgroundButton"
    onclick="setLiveBackground()"
    style="display:none;"
  >
    🖼️ 配信背景リンクを設定
  </button>

  <button
    class="panel-button close-button"
    onclick="closePanel()"
  >
    閉じる
  </button>

</div>

<nav class="bottom-nav">

  <button class="nav-item active" onclick="goHome()">
    <div class="nav-icon">⌂</div>
    ホーム
  </button>

  <button class="nav-item" onclick="searchLive()">
    <div class="nav-icon">⌕</div>
    探す
  </button>

  <button class="nav-item" onclick="startLive()">
    <div class="nav-live">🎙️</div>
    配信
  </button>

  <button class="nav-item" onclick="showNotice()">
    <div class="nav-icon">♧</div>
    お知らせ
  </button>

  <button class="nav-item" onclick="showProfile()">
    <div class="nav-icon">♙</div>
    マイページ
  </button>

</nav>

</div>

<script>

var socket = null;

var myId =
  localStorage.getItem("voicePotaClientId") ||
  (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );

localStorage.setItem(
  "voicePotaClientId",
  myId
);

var isBroadcaster = false;
var localStream = null;
var peerConnections = {};
var currentViewerId = null;

var rtcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "stun:stun1.l.google.com:19302"
    }
  ]
};

function connectSocket() {

  var protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  socket =
    new WebSocket(
      protocol + "//" + location.host
    );

  socket.onopen = function() {

    console.log("WebSocket connected");

    sendMessage({
      type: "hello",
      clientId: myId
    });

  };

  socket.onmessage = function(event) {

    try {

      var data =
        JSON.parse(event.data);

      handleSocketMessage(data);

    } catch (error) {

      console.log(
        "message error",
        error
      );

    }

  };

  socket.onclose = function() {

    console.log(
      "WebSocket disconnected"
    );

    setTimeout(
      function() {
        connectSocket();
      },
      2000
    );

  };

  socket.onerror = function(error) {

    console.log(
      "WebSocket error",
      error
    );

  };

}

function sendMessage(data) {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

  }

}

function handleSocketMessage(data) {

  if (
    data.type === "live_list" ||
    data.type === "live_started" ||
    data.type === "live_stopped"
  ) {

    renderLiveList(
      data.lives || []
    );

    return;

  }

  if (data.type === "live_state") {

    applyLiveBackground(
      data.background || ""
    );

    return;

  }

  if (data.type === "background_update") {

    applyLiveBackground(
      data.background || ""
    );

    return;

  }

  if (data.type === "viewer_joined") {

    createOfferForViewer(
      data.viewerId
    );

    return;

  }

  if (data.type === "offer") {

    receiveOffer(data);

    return;

  }

  if (data.type === "answer") {

    receiveAnswer(data);

    return;

  }

  if (data.type === "ice_candidate") {

    receiveIceCandidate(data);

    return;

  }

  if (data.type === "viewer_left") {

    if (
      peerConnections[data.viewerId]
    ) {

      peerConnections[
        data.viewerId
      ].close();

      delete peerConnections[
        data.viewerId
      ];

    }

    return;

  }

  if (data.type === "live_unavailable") {

    setPanelStatus(
      "現在ライブ配信はありません"
    );

    document
      .getElementById(
        "stopLiveButton"
      )
      .style.display = "none";

    return;

  }

}

function renderLiveList(lives) {

  var list =
    document.getElementById(
      "liveList"
    );

  if (
    !lives ||
    lives.length === 0
  ) {

    list.innerHTML =
      "<div class='empty'>" +
      "現在配信中のライブはありません" +
      "</div>";

    return;

  }

  var html = "";

  lives.forEach(
    function(live) {

      html +=
        "<div class='live-card' onclick=\"listenLive('" +
        escapeHtml(live.id) +
        "')\">" +

        "<div class='live-avatar'>🎙️</div>" +

        "<div class='live-info'>" +

        "<div class='live-name'>" +
        escapeHtml(
          live.name ||
          "Voice配信者"
        ) +
        "</div>" +

        "<div class='live-title'>" +
        escapeHtml(
          live.title ||
          "音声ライブ配信中"
        ) +
        "</div>" +

        "<span class='live-badge'>LIVE</span>" +

        "</div>" +

        "</div>";

    }
  );

  list.innerHTML = html;

}

async function startLive() {

  if (isBroadcaster) {

    openPanel();

    return;

  }

  var name =
    prompt(
      "配信者名を入力してください",
      "ぼたもち"
    );

  if (!name) return;

  var title =
    prompt(
      "配信タイトルを入力してください",
      "VoiceポタLive 配信中"
    );

  if (!title) return;

  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: {

            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1

          },

          video: false

        });

  } catch (error) {

    alert(
      "マイクへのアクセスが必要です。\\n\\n" +
      "ブラウザのマイク許可をONにしてください。"
    );

    console.log(error);

    return;

  }

  isBroadcaster = true;

  document
    .getElementById(
      "stopLiveButton"
    )
    .style.display = "block";

  document
    .getElementById(
      "backgroundButton"
    )
    .style.display = "block";

  applyLiveBackground("");

  openPanel();

  setPanelStatus(
    "配信開始中..."
  );

  sendMessage({

    type: "start_live",

    clientId: myId,

    name: name,

    title: title

  });

  setPanelStatus(
    "🔴 配信中です"
  );

  document
    .getElementById(
      "audioText"
    )
    .textContent =
    "マイク配信中";

}

function stopLive() {

  if (!isBroadcaster) {

    closePanel();

    return;

  }

  sendMessage({

    type: "stop_live",

    clientId: myId

  });

  Object.keys(
    peerConnections
  ).forEach(
    function(id) {

      try {

        peerConnections[id].close();

      } catch (e) {}

    }
  );

  peerConnections = {};

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        function(track) {
          track.stop();
        }
      );

  }

  localStream = null;

  isBroadcaster = false;

  document
    .getElementById(
      "backgroundButton"
    )
    .style.display = "none";

  applyLiveBackground("");

  setPanelStatus(
    "配信を終了しました"
  );

  document
    .getElementById(
      "audioText"
    )
    .textContent =
    "配信終了";

}

function listenLive(id) {

  if (isBroadcaster) {

    alert(
      "配信中は別のライブを視聴できません。"
    );

    return;

  }

  currentViewerId = myId;

  openPanel();

  setPanelStatus(
    "配信者へ接続しています..."
  );

  document
    .getElementById(
      "stopLiveButton"
    )
    .style.display = "none";

  document
    .getElementById(
      "backgroundButton"
    )
    .style.display = "none";

  sendMessage({

    type: "join_live",

    clientId: myId,

    liveId: id

  });

}

async function createOfferForViewer(
  viewerId
) {

  if (
    !isBroadcaster ||
    !localStream
  ) {

    return;

  }

  var pc =
    new RTCPeerConnection(
      rtcConfig
    );

  peerConnections[
    viewerId
  ] = pc;

  localStream
    .getTracks()
    .forEach(
      function(track) {

        pc.addTrack(
          track,
          localStream
        );

      }
    );

  pc.onicecandidate =
    function(event) {

      if (event.candidate) {

        sendMessage({

          type: "ice_candidate",

          from: myId,

          to: viewerId,

          candidate:
            event.candidate

        });

      }

    };

  pc.onconnectionstatechange =
    function() {

      console.log(
        "broadcaster connection:",
        viewerId,
        pc.connectionState
      );

    };

  try {

    var offer =
      await pc.createOffer({

        offerToReceiveAudio: false,

        offerToReceiveVideo: false

      });

    await pc.setLocalDescription(
      offer
    );

    sendMessage({

      type: "offer",

      from: myId,

      to: viewerId,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.log(
      "offer error",
      error
    );

  }

}

async function receiveOffer(data) {

  if (isBroadcaster) return;

  var pc =
    new RTCPeerConnection(
      rtcConfig
    );

  peerConnections[
    data.from
  ] = pc;

  var remoteAudio =
    document.getElementById(
      "remoteAudio"
    );

  pc.ontrack =
    function(event) {

      if (
        event.streams &&
        event.streams[0]
      ) {

        remoteAudio.srcObject =
          event.streams[0];

      }

      remoteAudio.muted = false;

      var promise =
        remoteAudio.play();

      if (
        promise &&
        promise.catch
      ) {

        promise.catch(
          function() {

            setPanelStatus(
              "🔊 画面をタップして音声をONにしてください"
            );

            document
              .getElementById(
                "audioText"
              )
              .textContent =
              "🔊 タップして音声ON";

            remoteAudio.onclick =
              function() {

                remoteAudio.muted =
                  false;

                remoteAudio.volume =
                  1;

                remoteAudio.play()
                  .catch(
                    function() {}
                  );

                document
                  .getElementById(
                    "audioText"
                  )
                  .textContent =
                  "🔴 配信中";

              };

          }
        );

      }

      setPanelStatus(
        "🔴 配信中"
      );

      document
        .getElementById(
          "audioText"
        )
        .textContent =
        "🎙️ 配信者の音声を受信中";

    };

  pc.onicecandidate =
    function(event) {

      if (event.candidate) {

        sendMessage({

          type: "ice_candidate",

          from: myId,

          to: data.from,

          candidate:
            event.candidate

        });

      }

    };

  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

    var answer =
      await pc.createAnswer();

    await pc.setLocalDescription(
      answer
    );

    sendMessage({

      type: "answer",

      from: myId,

      to: data.from,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.log(
      "answer error",
      error
    );

  }

}

async function receiveAnswer(data) {

  var pc =
    peerConnections[
      data.from
    ];

  if (!pc) return;

  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

  } catch (error) {

    console.log(
      "remote description error",
      error
    );

  }

}

async function receiveIceCandidate(
  data
) {

  var pc =
    peerConnections[
      data.from
    ];

  if (!pc) return;

  try {

    await pc.addIceCandidate(
      new RTCIceCandidate(
        data.candidate
      )
    );

  } catch (error) {

    console.log(
      "ICE error",
      error
    );

  }

}

/* =====================================================
   BACKGROUND
===================================================== */

function setLiveBackground() {

  if (!isBroadcaster) return;

  var url =
    prompt(
      "視聴者にも表示する背景画像のリンクを入力してください。\\n\\n" +
      "例：\\n" +
      "https://example.com/background.jpg\\n\\n" +
      "空欄にすると背景を元に戻します。",
      ""
    );

  if (url === null) return;

  url = url.trim();

  if (
    url &&
    !/^https?:\/\//i.test(url)
  ) {

    alert(
      "http:// または https:// で始まる画像リンクを入力してください。"
    );

    return;

  }

  sendMessage({

    type: "set_background",

    clientId: myId,

    background: url

  });

  applyLiveBackground(url);

}

function applyLiveBackground(url) {

  var panel =
    document.getElementById(
      "livePanel"
    );

  if (!panel) return;

  if (url) {

    var safeUrl =
      String(url)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');

    panel.style.backgroundImage =
      'linear-gradient(' +
      'rgba(2,4,15,.72),' +
      'rgba(2,4,15,.92)' +
      '),url("' +
      safeUrl +
      '")';

    panel.style.backgroundSize =
      "cover";

    panel.style.backgroundPosition =
      "center";

    panel.style.backgroundAttachment =
      "fixed";

  } else {

    panel.style.backgroundImage =
      "";

    panel.style.backgroundSize =
      "";

    panel.style.backgroundPosition =
      "";

    panel.style.backgroundAttachment =
      "";

  }

}

function openPanel() {

  document
    .getElementById(
      "livePanel"
    )
    .classList.add("show");

}

function closePanel() {

  if (isBroadcaster) {

    stopLive();

  }

  document
    .getElementById(
      "livePanel"
    )
    .classList.remove("show");

}

function setPanelStatus(text) {

  document
    .getElementById(
      "panelStatus"
    )
    .textContent =
    text;

}

function scrollLive() {

  document
    .getElementById(
      "liveSection"
    )
    .scrollIntoView({
      behavior: "smooth"
    });

}

function goHome() {

  window.scrollTo({

    top: 0,

    behavior: "smooth"

  });

}

function searchLive() {

  scrollLive();

}

function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}

function showProfile() {

  alert(
    "マイページ機能を準備中です。"
  );

}

function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}

connectSocket();

</script>

</body>
</html>
`;

/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(
    function(req, res) {

      const url =
        req.url.split("?")[0];

      if (url === "/health") {

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

      if (
        url === "/" ||
        url === "/index.html"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8"
          }
        );

        res.end(HTML);

        return;

      }

      if (url === "/home.png") {

        const file =
          path.join(
            PUBLIC_DIR,
            "home.png"
          );

        if (
          fs.existsSync(file)
        ) {

          res.writeHead(
            200,
            {
              "Content-Type":
                "image/png"
            }
          );

          fs.createReadStream(
            file
          ).pipe(res);

          return;

        }

      }

      res.writeHead(
        404,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );

      res.end("Not Found");

    }
  );

/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server: server
  });

wss.on(
  "connection",
  function(ws) {

    clients.add(ws);

    ws.clientId = null;
    ws.joinedLive = false;
    ws.broadcasterId = null;

    console.log(
      "WebSocket connected"
    );

    sendLiveListTo(ws);

    ws.on(
      "message",
      function(message) {

        let data;

        try {

          data =
            JSON.parse(
              message.toString()
            );

        } catch (error) {

          return;

        }

        if (data.type === "hello") {

          if (data.clientId) {

            ws.clientId =
              data.clientId;

          }

          return;

        }

        /* =================================================
           START LIVE
        ================================================= */

        if (
          data.type === "start_live"
        ) {

          if (
            broadcaster &&
            broadcaster !== ws &&
            broadcaster.readyState ===
              WebSocket.OPEN &&
            liveInfo.active
          ) {

            ws.send(
              JSON.stringify({

                type:
                  "live_unavailable",

                reason:
                  "already_live"

              })
            );

            return;

          }

          broadcaster = ws;

          liveInfo = {

            active: true,

            id:
              ws.clientId,

            name:
              data.name ||
              "Voice配信者",

            title:
              data.title ||
              "音声ライブ配信中",

            startedAt:
              Date.now(),

            background: ""

          };

          console.log(
            "LIVE START:",
            liveInfo.name
          );

          broadcastLiveList();

          return;

        }

        /* =================================================
           STOP LIVE
        ================================================= */

        if (
          data.type === "stop_live"
        ) {

          if (
            broadcaster === ws
          ) {

            broadcaster = null;

            liveInfo = {

              active: false,

              id: null,

              name: "",

              title: "",

              startedAt: null,

              background: ""

            };

            broadcast({

              type:
                "live_stopped",

              lives: []

            });

            console.log(
              "LIVE STOP"
            );

          }

          return;

        }

        /* =================================================
           JOIN LIVE
        ================================================= */

        if (
          data.type === "join_live"
        ) {

          if (
            broadcaster &&
            broadcaster.readyState ===
              WebSocket.OPEN &&
            liveInfo.active &&
            data.liveId ===
              liveInfo.id
          ) {

            ws.joinedLive =
              true;

            ws.broadcasterId =
              broadcaster.clientId;

            /*
             * 視聴者へ現在の背景を送信
             */
            ws.send(
              JSON.stringify({

                type:
                  "live_state",

                liveId:
                  liveInfo.id,

                name:
                  liveInfo.name,

                title:
                  liveInfo.title,

                background:
                  liveInfo.background ||
                  ""

              })
            );

            broadcaster.send(
              JSON.stringify({

                type:
                  "viewer_joined",

                viewerId:
                  ws.clientId

              })
            );

            console.log(
              "VIEWER JOIN:",
              ws.clientId
            );

          } else {

            ws.send(
              JSON.stringify({

                type:
                  "live_unavailable"

              })
            );

          }

          return;

        }

        /* =================================================
           BACKGROUND UPDATE
        ================================================= */

        if (
          data.type ===
          "set_background"
        ) {

          if (
            broadcaster === ws &&
            liveInfo.active
          ) {

            liveInfo.background =
              typeof data.background ===
                "string"
                ? data.background.trim()
                : "";

            /*
             * http / https の画像リンクだけ許可
             */
            if (
              liveInfo.background &&
              !/^https?:\/\//i.test(
                liveInfo.background
              )
            ) {

              liveInfo.background = "";

            }

            /*
             * 全接続中ユーザーへ通知
             */
            broadcast({

              type:
                "background_update",

              background:
                liveInfo.background

            });

            console.log(
              "LIVE BACKGROUND UPDATED:",
              liveInfo.background
            );

          }

          return;

        }

        /* =================================================
           WEBRTC SIGNALING
        ================================================= */

        if (
          data.type === "offer" ||
          data.type === "answer" ||
          data.type ===
            "ice_candidate"
        ) {

          relaySignaling(
            ws,
            data
          );

          return;

        }

      }
    );

    ws.on(
      "close",
      function() {

        clients.delete(ws);

        if (
          broadcaster === ws
        ) {

          broadcaster = null;

          liveInfo = {

            active: false,

            id: null,

            name: "",

            title: "",

            startedAt: null,

            background: ""

          };

          broadcast({

            type:
              "live_stopped",

            lives: []

          });

          console.log(
            "BROADCASTER DISCONNECTED"
          );

        }

        if (
          ws.joinedLive &&
          broadcaster &&
          broadcaster.readyState ===
            WebSocket.OPEN
        ) {

          broadcaster.send(
            JSON.stringify({

              type:
                "viewer_left",

              viewerId:
                ws.clientId

            })
          );

        }

        console.log(
          "WebSocket disconnected:",
          ws.clientId
        );

      }
    );

  }
);

/* =====================================================
   SIGNALING RELAY
===================================================== */

function relaySignaling(
  sender,
  data
) {

  if (!data.to) {

    return;

  }

  for (
    const client of clients
  ) {

    if (
      client.clientId ===
      data.to
    ) {

      if (
        client.readyState ===
        WebSocket.OPEN
      ) {

        client.send(
          JSON.stringify(data)
        );

      }

      return;

    }

  }

}

/* =====================================================
   LIVE LIST
===================================================== */

function getLiveList() {

  if (
    !liveInfo.active
  ) {

    return [];

  }

  return [

    {

      id:
        liveInfo.id,

      name:
        liveInfo.name,

      title:
        liveInfo.title,

      startedAt:
        liveInfo.startedAt,

      background:
        liveInfo.background || ""

    }

  ];

}

function broadcastLiveList() {

  broadcast({

    type:
      "live_list",

    lives:
      getLiveList()

  });

}

function sendLiveListTo(ws) {

  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {

    return;

  }

  ws.send(
    JSON.stringify({

      type:
        "live_list",

      lives:
        getLiveList()

    })
  );

}

/* =====================================================
   BROADCAST
===================================================== */

function broadcast(data) {

  const message =
    JSON.stringify(data);

  for (
    const client of clients
  ) {

    if (
      client.readyState ===
      WebSocket.OPEN
    ) {

      client.send(message);

    }

  }

}

/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "================================="
    );

    console.log(
      "VoiceポタLive"
    );

    console.log(
      "Server started"
    );

    console.log(
      "HOST:",
      HOST
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "================================="
    );

  }
);
