const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>VoiceボタLive</title>

<style>
*{box-sizing:border-box}

:root{
  --bg:#050817;
  --panel:#0b1027;
  --panel2:#11183a;
  --line:rgba(143,124,255,.24);
  --blue:#35c9ff;
  --violet:#a85cff;
  --pink:#ef6cff;
  --text:#f7f5ff;
  --muted:#a8afd1;
}

html,body{
  margin:0;
  padding:0;
  background:
    radial-gradient(circle at 75% 8%,rgba(58,116,255,.25),transparent 25%),
    radial-gradient(circle at 20% 35%,rgba(130,56,255,.16),transparent 30%),
    var(--bg);
  color:var(--text);
  font-family:Arial,"Noto Sans JP",sans-serif;
  min-height:100%;
  overflow-x:hidden;
}

body{
  min-height:100vh;
  background-attachment:fixed;
}

button{
  font:inherit;
}

.hidden{
  display:none!important;
}

#app{
  min-height:100vh;
  padding-bottom:92px;
}

.topbar{
  height:64px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 18px;
  position:sticky;
  top:0;
  z-index:20;
  background:rgba(5,8,23,.78);
  backdrop-filter:blur(18px);
  border-bottom:1px solid rgba(255,255,255,.05);
}

.brand{
  font-weight:900;
  font-size:21px;
  letter-spacing:-.8px;
  background:linear-gradient(90deg,#fff,#66d9ff,#c87cff);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.connection{
  font-size:11px;
  color:#9fffc9;
  display:flex;
  align-items:center;
  gap:6px;
}

.connection i{
  width:7px;
  height:7px;
  border-radius:50%;
  background:#48ff9b;
  box-shadow:0 0 12px #48ff9b;
}

.page{
  max-width:760px;
  margin:0 auto;
  padding:14px 14px 0;
}

.hero{
  position:relative;
  min-height:560px;
  overflow:hidden;
  border:1px solid var(--line);
  border-radius:30px;
  background:
    linear-gradient(
      145deg,
      rgba(13,18,49,.95),
      rgba(6,8,24,.92)
    );
  box-shadow:
    0 24px 80px rgba(31,74,255,.18),
    inset 0 1px rgba(255,255,255,.07);
}

.hero:before{
  content:"";
  position:absolute;
  width:190px;
  height:190px;
  border-radius:50%;
  right:-18px;
  top:26px;
  background:
    radial-gradient(
      circle at 38% 35%,
      #dff6ff 0,
      #9bc9ff 38%,
      #5d8eff 68%,
      rgba(92,105,255,.08) 72%
    );
  box-shadow:
    0 0 55px rgba(99,144,255,.85),
    0 0 120px rgba(105,75,255,.38);
}

.hero:after{
  content:"✦  ·  ✧   ·   ✦    ·   ✧";
  position:absolute;
  top:62px;
  left:28px;
  color:#8fb9ff;
  font-size:18px;
  letter-spacing:9px;
  opacity:.65;
  transform:rotate(-8deg);
}

.moon-flower{
  position:absolute;
  right:28px;
  top:178px;
  font-size:80px;
  filter:drop-shadow(0 0 20px #6f7cff);
  opacity:.82;
  transform:rotate(-12deg);
}

.hero-content{
  position:relative;
  z-index:2;
  padding:38px 25px 32px;
  max-width:560px;
}

.mini-pill{
  display:inline-flex;
  align-items:center;
  gap:7px;
  border:1px solid rgba(108,202,255,.35);
  background:rgba(38,73,150,.22);
  color:#cbeeff;
  border-radius:999px;
  padding:8px 13px;
  font-size:12px;
  font-weight:700;
  box-shadow:0 0 20px rgba(49,180,255,.12);
}

.hero-logo{
  margin-top:24px;
  font-size:45px;
  line-height:1.02;
  font-weight:900;
  letter-spacing:-2px;
  background:
    linear-gradient(
      90deg,
      #ffffff 0%,
      #9deaff 42%,
      #cf78ff 100%
    );
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 30px rgba(75,145,255,.22);
}

.hero-sub{
  margin-top:12px;
  color:#d9dff7;
  font-size:15px;
  letter-spacing:2px;
}

.hero-copy{
  margin-top:22px;
  font-size:29px;
  line-height:1.45;
  font-weight:900;
  letter-spacing:1px;
}

.hero-copy span{
  background:
    linear-gradient(
      90deg,
      #fff,
      #b8eaff,
      #d76cff
    );
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.hero-desc{
  margin-top:13px;
  color:var(--muted);
  font-size:13px;
  line-height:1.8;
  max-width:430px;
}

.primary{
  width:100%;
  margin-top:25px;
  border:0;
  border-radius:18px;
  padding:17px 18px;
  color:#fff;
  font-weight:900;
  font-size:16px;
  background:
    linear-gradient(
      90deg,
      #16c8ff,
      #696bff,
      #c43fff
    );
  box-shadow:0 10px 30px rgba(92,82,255,.34);
  cursor:pointer;
}

.primary:active{
  transform:scale(.985);
}

.secondary{
  width:100%;
  margin-top:9px;
  border:1px solid rgba(152,140,255,.35);
  border-radius:16px;
  padding:13px;
  background:rgba(255,255,255,.045);
  color:#e6e4ff;
  font-weight:700;
  cursor:pointer;
}

.flower{
  position:absolute;
  left:-35px;
  bottom:-55px;
  width:190px;
  height:190px;
  border-radius:50%;
  background:
    radial-gradient(
      circle,
      #fff 0 8%,
      #8edcff 12%,
      #6f7aff 25%,
      transparent 27%
    ),
    conic-gradient(
      from 10deg,
      transparent 0 8%,
      rgba(93,149,255,.4) 9% 17%,
      transparent 18% 25%,
      rgba(165,83,255,.35) 26% 34%,
      transparent 35% 100%
    );
  filter:blur(.2px);
  box-shadow:0 0 70px rgba(70,132,255,.4);
}

.live-section{
  margin-top:18px;
}

.section-head{
  display:flex;
  justify-content:space-between;
  align-items:end;
  margin:0 4px 10px;
}

.section-title{
  font-size:20px;
  font-weight:900;
}

.section-note{
  font-size:11px;
  color:#7e87ad;
}

.live-card{
  position:relative;
  padding:17px;
  border-radius:22px;
  background:
    linear-gradient(
      135deg,
      rgba(20,28,65,.9),
      rgba(10,14,35,.9)
    );
  border:1px solid rgba(117,113,255,.2);
  box-shadow:0 12px 35px rgba(0,0,0,.2);
}

.live-row{
  display:flex;
  align-items:center;
  gap:13px;
}

.avatar{
  width:52px;
  height:52px;
  border-radius:50%;
  display:grid;
  place-items:center;
  font-size:25px;
  background:
    radial-gradient(
      circle at 35% 30%,
      #8fdfff,
      #5d5aff 48%,
      #d15cff
    );
  box-shadow:0 0 24px rgba(109,95,255,.35);
}

.live-name{
  font-weight:900;
}

.live-meta{
  font-size:11px;
  color:#9da5c9;
  margin-top:4px;
}

.live-badge{
  margin-left:auto;
  background:#ff365f;
  color:#fff;
  font-size:10px;
  font-weight:900;
  padding:6px 9px;
  border-radius:999px;
  box-shadow:0 0 15px rgba(255,54,95,.3);
}

#status{
  margin-top:14px;
}

.status{
  padding:12px 14px;
  border-radius:14px;
  text-align:center;
  background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.07);
  font-size:13px;
}

.live{
  color:#7effbb;
}

.wait{
  color:#b3bad8;
}

.info{
  text-align:center;
  color:#aeb6d7;
  margin:9px 0;
  font-size:12px;
}

.features{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
  margin-top:18px;
}

.feature{
  padding:17px 14px;
  border-radius:20px;
  background:rgba(11,16,39,.85);
  border:1px solid rgba(132,124,255,.16);
}

.feature-icon{
  font-size:27px;
}

.feature h3{
  margin:8px 0 4px;
  font-size:14px;
}

.feature p{
  margin:0;
  color:#8992b7;
  font-size:11px;
  line-height:1.6;
}

#liveArea{
  margin-top:18px;
  padding:18px;
  border-radius:24px;
  background:
    linear-gradient(
      145deg,
      #0d1432,
      #080b20
    );
  border:1px solid rgba(112,116,255,.25);
  box-shadow:0 20px 60px rgba(38,50,160,.18);
}

.voiceBox{
  margin-top:15px;
  padding:36px 15px;
  border-radius:22px;
  text-align:center;
  background:
    radial-gradient(
      circle,
      rgba(82,107,255,.22),
      rgba(5,8,23,.25) 55%
    );
  border:1px solid rgba(113,137,255,.15);
}

.mic{
  font-size:62px;
  filter:drop-shadow(0 0 18px #5d7cff);
}

#voiceText{
  margin-top:12px;
  font-weight:800;
}

.audioButton,
.stopButton{
  width:100%;
  border:0;
  border-radius:16px;
  padding:15px;
  margin-top:10px;
  font-weight:900;
  cursor:pointer;
}

.audioButton{
  background:
    linear-gradient(
      90deg,
      #ffc83d,
      #ff8b47
    );
  color:#1b1200;
}

.stopButton{
  background:
    linear-gradient(
      90deg,
      #ff4f86,
      #a83dff
    );
  color:#fff;
}

#log{
  margin-top:12px;
  padding:11px;
  height:150px;
  overflow-y:auto;
  background:#040611;
  border-radius:13px;
  color:#80ffc0;
  font-size:11px;
  white-space:pre-wrap;
  border:1px solid rgba(255,255,255,.05);
}

.bottom-nav{
  position:fixed;
  left:0;
  right:0;
  bottom:0;
  height:78px;
  z-index:30;
  display:grid;
  grid-template-columns:repeat(5,1fr);
  align-items:center;
  background:rgba(5,8,23,.9);
  backdrop-filter:blur(20px);
  border-top:1px solid rgba(255,255,255,.07);
  padding-bottom:env(safe-area-inset-bottom);
}

.nav-item{
  border:0;
  background:transparent;
  color:#7f88ae;
  font-size:10px;
  font-weight:700;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:5px;
  cursor:pointer;
}

.nav-icon{
  font-size:21px;
  line-height:1;
}

.nav-item.active{
  color:#b887ff;
}

.nav-center{
  width:55px;
  height:55px;
  margin:-25px auto 0;
  border-radius:50%;
  border:3px solid #101635;
  background:
    linear-gradient(
      145deg,
      #31cfff,
      #7866ff 55%,
      #d65cff
    );
  box-shadow:0 0 28px rgba(91,101,255,.6);
  display:grid;
  place-items:center;
  color:#fff;
  font-size:25px;
}

#roleSelect{
  padding-top:0;
}

.role-panel{
  margin-top:18px;
  padding:18px;
  border-radius:22px;
  background:rgba(10,15,38,.82);
  border:1px solid rgba(125,118,255,.17);
}

.role-title{
  font-size:15px;
  font-weight:900;
  margin-bottom:8px;
}

.role-help{
  color:#8f97b8;
  font-size:11px;
  line-height:1.6;
  margin-bottom:12px;
}

.role-btn{
  width:100%;
  border:0;
  border-radius:16px;
  padding:15px;
  margin-top:8px;
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.hostButton{
  background:
    linear-gradient(
      90deg,
      #17c9ff,
      #7865ff
    );
}

.viewerButton{
  background:
    linear-gradient(
      90deg,
      #584fff,
      #bd55ff
    );
}

@media(min-width:650px){

  .features{
    grid-template-columns:repeat(4,1fr);
  }

  .hero-content{
    padding:46px 40px;
  }

  .hero{
    min-height:600px;
  }

  .hero-logo{
    font-size:58px;
  }

  .hero-copy{
    font-size:34px;
  }
}
</style>
</head>

<body>

<div id="app">

<header class="topbar">
  <div class="brand">VoiceボタLive</div>

  <div class="connection">
    <i></i>
    オンライン
  </div>
</header>

<main class="page">

<section class="hero" id="homeHero">

  <div class="moon-flower">✿</div>

  <div class="flower"></div>

  <div class="hero-content">

    <div class="mini-pill">
      🌙 月光花 × Voice
    </div>

    <div class="hero-logo">
      VoiceボタLive
    </div>

    <div class="hero-sub">
      声でつながる、みんなの居場所。
    </div>

    <div class="hero-copy">
      夜に咲く、<br>
      <span>君の声が、誰かの光になる。</span>
    </div>

    <div class="hero-desc">
      月明かりの下で、話して、聴いて、笑って。<br>
      VoiceボタLiveで、あなたの声をもっと近くに。
    </div>

    <button class="primary" onclick="startHost()">
      🎙️ 配信をはじめる
    </button>

    <button class="secondary" onclick="startViewer()">
      👂 ライブを聴いてみる
    </button>

  </div>

</section>

<section class="live-section" id="live-section">

  <div class="section-head">
    <div class="section-title">
      🔴 ライブ中
    </div>

    <div class="section-note">
      REAL TIME
    </div>
  </div>

  <div class="live-card">

    <div class="live-row">

      <div class="avatar">
        🎙️
      </div>

      <div>
        <div class="live-name">
          VoiceボタLive
        </div>

        <div class="live-meta">
          月光花の部屋 · 音声ライブ
        </div>
      </div>

      <div class="live-badge">
        LIVE
      </div>

    </div>

    <div
      id="homeLiveStatus"
      class="status wait"
      style="margin-top:14px"
    >
      現在配信中のライブを待っています
    </div>

  </div>

</section>

<section class="features">

  <div class="feature">
    <div class="feature-icon">🎙️</div>
    <h3>高音質の音声配信</h3>
    <p>クリアな声で、もっと近くに。</p>
  </div>

  <div class="feature">
    <div class="feature-icon">⚡</div>
    <h3>低遅延でリアルタイム</h3>
    <p>今この瞬間を、一緒に。</p>
  </div>

  <div class="feature">
    <div class="feature-icon">🎁</div>
    <h3>投げ銭で応援</h3>
    <p>あなたの応援が配信者の力に。</p>
  </div>

  <div class="feature">
    <div class="feature-icon">👥</div>
    <h3>みんなで楽しめる</h3>
    <p>好きな声でつながる場所。</p>
  </div>

</section>

<div id="roleSelect" class="role-panel hidden">

  <div class="role-title">
    配信モードを選択
  </div>

  <div class="role-help">
    VoiceボタLiveへようこそ。
    配信するか、ライブを聴くか選んでください。
  </div>

  <button
    class="role-btn hostButton"
    onclick="startHost()"
  >
    🎙️ 配信者として開始
  </button>

  <button
    class="role-btn viewerButton"
    onclick="startViewer()"
  >
    👂 視聴者として参加
  </button>

</div>

<section id="liveArea" class="hidden">

  <div id="status" class="status wait">
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
    onclick="enableAudio()"
  >
    🔊 音声をONにする
  </button>

  <button
    class="stopButton"
    onclick="stopLive()"
  >
    ⛔ ライブを終了
  </button>

  <div id="log"></div>

</section>

</main>

<nav class="bottom-nav">

  <button
    class="nav-item active"
    onclick="scrollTo({top:0,behavior:'smooth'})"
  >
    <span class="nav-icon">⌂</span>
    ホーム
  </button>

  <button
    class="nav-item"
    onclick="document.getElementById('live-section')?.scrollIntoView({behavior:'smooth'})"
  >
    <span class="nav-icon">⌕</span>
    探す
  </button>

  <button
    class="nav-item"
    onclick="startHost()"
  >
    <span class="nav-center">🎙️</span>
    配信
  </button>

  <button
    class="nav-item"
    onclick="alert('お知らせは準備中です')"
  >
    <span class="nav-icon">♧</span>
    お知らせ
  </button>

  <button
    class="nav-item"
    onclick="alert('マイページは準備中です')"
  >
    <span class="nav-icon">♙</span>
    マイページ
  </button>

</nav>

</div>

<audio
  id="remoteAudio"
  autoplay
  playsinline
></audio>

<script>
"use strict";

let ws = null;
let myId = null;
let myRole = null;
let localStream = null;
let viewerPeer = null;
let viewerId = null;

let viewerConnections = new Map();
let pendingCandidates = [];
let hostPendingCandidates = new Map();

let reconnectTimer = null;
let manuallyStopped = false;
let roomJoined = false;

const room = "bota";

const statusBox =
  document.getElementById("status");

const infoBox =
  document.getElementById("info");

const logBox =
  document.getElementById("log");

const remoteAudio =
  document.getElementById("remoteAudio");

function log(text){

  console.log(text);

  logBox.textContent += text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}

function setStatus(text,live=false){

  statusBox.textContent = text;

  statusBox.className =
    "status " +
    (live ? "live" : "wait");
}

function getSocketURL(){

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return protocol +
    "//" +
    location.host;
}

function connectSocket(){

  return new Promise((resolve,reject)=>{

    if(
      ws &&
      ws.readyState === WebSocket.OPEN
    ){
      resolve();
      return;
    }

    log("WebSocket接続開始");

    ws =
      new WebSocket(
        getSocketURL()
      );

    let settled = false;

    ws.onopen = ()=>{

      log("✅ WebSocket接続OK");

      if(!settled){
        settled = true;
        resolve();
      }

      if(
        myRole &&
        !roomJoined
      ){
        sendJoin();
      }
    };

    ws.onerror = ()=>{

      log("❌ WebSocketエラー");

      if(!settled){

        settled = true;

        reject(
          new Error(
            "WebSocket接続失敗"
          )
        );

      }

    };

    ws.onclose = event=>{

      log("❌ WebSocket切断");

      log(
        "code=" +
        event.code +
        " reason=" +
        (event.reason || "なし") +
        " clean=" +
        event.wasClean
      );

      roomJoined = false;

      if(
        !manuallyStopped &&
        myRole
      ){

        setStatus(
          "接続が切れました。再接続中..."
        );

        scheduleReconnect();
      }

    };

    ws.onmessage = async event=>{

      try{

        await handleMessage(
          JSON.parse(event.data)
        );

      }catch(e){

        log(
          "Message Error: " +
          e.message
        );

      }

    };

  });

}

function scheduleReconnect(){

  if(reconnectTimer) return;

  reconnectTimer =
    setTimeout(
      async()=>{

        reconnectTimer = null;

        if(
          manuallyStopped ||
          !myRole
        ){
          return;
        }

        try{

          await connectSocket();

        }catch(e){

          log("再接続失敗");

          scheduleReconnect();
        }

      },
      2000
    );
}

function send(data){

  if(
    ws &&
    ws.readyState === WebSocket.OPEN
  ){

    try{

      ws.send(
        JSON.stringify(data)
      );

    }catch(e){

      log(
        "送信エラー: " +
        e.message
      );

    }

  }

}

function sendJoin(){

  send({
    type:"join",
    role:myRole,
    room
  });

}

async function startHost(){

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
    "配信者として接続中..."
  );

  try{

    await connectSocket();

    if(!roomJoined){
      sendJoin();
    }

    await startMicrophone();

    setStatus(
      "🎙️ 配信中",
      true
    );

    document
      .getElementById("voiceText")
      .textContent =
      "あなたは配信者です";

    send({
      type:"stream-started"
    });

  }catch(e){

    log(
      "配信開始失敗: " +
      e.message
    );

    setStatus(
      "配信開始失敗"
    );

  }

}

async function startViewer(){

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
    "配信を接続中..."
  );

  document
    .getElementById("voiceText")
    .textContent =
    "配信者を待っています";

  try{

    await connectSocket();

    if(!roomJoined){
      sendJoin();
    }

  }catch(e){

    log(
      "接続失敗: " +
      e.message
    );

  }

}

async function startMicrophone(){

  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ){

    throw new Error(
      "マイク機能が利用できません"
    );

  }

  localStream =
    await navigator.mediaDevices
      .getUserMedia({

        audio:{
          echoCancellation:false,
          noiseSuppression:false,
          autoGainControl:false,
          channelCount:1,
          sampleRate:48000
        },

        video:false

      });

  log("🎙️ マイク取得OK");

  log(
    "⚡ LOW LATENCY AUDIO"
  );

}

function optimizeOpusSDP(sdp){

  if(!sdp) return sdp;

  const lines =
    sdp.split("\\r\\n");

  let opusPayload = null;

  for(const line of lines){

    const m =
      line.match(
        /^a=rtpmap:(\\d+) opus\\/48000\\/2/i
      );

    if(m){

      opusPayload = m[1];

      break;
    }

  }

  if(!opusPayload){
    return sdp;
  }

  const fmtp =
    "a=fmtp:" +
    opusPayload +
    " minptime=10;useinbandfec=0;stereo=0;sprop-stereo=0;maxaveragebitrate=32000";

  let replaced = false;

  const result =
    lines.map(line=>{

      if(
        line.startsWith(
          "a=fmtp:" +
          opusPayload +
          " "
        )
      ){

        replaced = true;

        return fmtp;
      }

      return line;

    });

  if(!replaced){

    const index =
      result.findIndex(
        line =>
          line.startsWith(
            "a=rtpmap:" +
            opusPayload
          )
      );

    if(index >= 0){

      result.splice(
        index + 1,
        0,
        fmtp
      );

    }

  }

  const ptimeIndex =
    result.findIndex(
      line =>
        /^a=ptime:/i.test(line)
    );

  if(ptimeIndex >= 0){

    result[ptimeIndex] =
      "a=ptime:10";

  }else{

    result.push(
      "a=ptime:10"
    );

  }

  return result.join("\\r\\n");
}

function applyReceiverLowLatency(receiver){

  try{

    if(
      "playoutDelayHint" in receiver
    ){

      receiver.playoutDelayHint = 0;

    }

  }catch(e){}

  try{

    if(
      "jitterBufferTarget" in receiver
    ){

      receiver.jitterBufferTarget = 0;

    }

  }catch(e){}

}

function makePeerConnection(){

  return new RTCPeerConnection({

    iceServers:[

      {
        urls:
          "stun:stun.l.google.com:19302"
      },

      {
        urls:
          "stun:stun1.l.google.com:19302"
      }

    ],

    bundlePolicy:"max-bundle",

    rtcpMuxPolicy:"require",

    iceCandidatePoolSize:0

  });

}

function createHostPeer(viewer){

  const old =
    viewerConnections.get(viewer);

  if(old){

    try{
      old.close();
    }catch(e){}

    viewerConnections.delete(
      viewer
    );

  }

  const pc =
    makePeerConnection();

  viewerConnections.set(
    viewer,
    pc
  );

  if(localStream){

    for(
      const track
      of localStream.getAudioTracks()
    ){

      const sender =
        pc.addTrack(
          track,
          localStream
        );

      try{

        const params =
          sender.getParameters();

        if(!params.encodings){
          params.encodings=[{}];
        }

        params.encodings[0].maxBitrate =
          32000;

        params.encodings[0].priority =
          "high";

        sender
          .setParameters(params)
          .catch(()=>{});

      }catch(e){}

    }

  }

  pc.onicecandidate =
    event=>{

      if(event.candidate){

        send({

          type:"signal",

          target:viewer,

          signal:{
            type:"candidate",
            candidate:event.candidate
          }

        });

      }

    };

  pc.onconnectionstatechange =
    ()=>{

      log(
        "視聴者 " +
        viewer +
        " : " +
        pc.connectionState
      );

      if(
        pc.connectionState ===
        "connected"
      ){

        log(
          "🎉 視聴者音声接続成功"
        );

      }

    };

  return pc;
}

async function sendOffer(viewer){

  try{

    log(
      "Offer作成: " +
      viewer
    );

    const pc =
      createHostPeer(viewer);

    let offer =
      await pc.createOffer({
        offerToReceiveAudio:false
      });

    offer = {
      type:"offer",
      sdp:
        optimizeOpusSDP(
          offer.sdp
        )
    };

    await pc.setLocalDescription(
      offer
    );

    send({

      type:"signal",

      target:viewer,

      signal:{
        type:"offer",
        sdp:offer.sdp
      }

    });

    log(
      "⚡ 低遅延Offer送信"
    );

  }catch(e){

    log(
      "Offerエラー: " +
      e.message
    );

  }

}

function createViewerPeer(){

  if(viewerPeer){
    return viewerPeer;
  }

  viewerPeer =
    makePeerConnection();

  viewerPeer.onicecandidate =
    event=>{

      if(
        event.candidate &&
        viewerId
      ){

        send({

          type:"signal",

          target:viewerId,

          signal:{
            type:"candidate",
            candidate:event.candidate
          }

        });

      }

    };

  viewerPeer.ontrack =
    event=>{

      log(
        "🔊 音声トラック受信"
      );

      const receiver =
        event.receiver;

      if(receiver){
        applyReceiverLowLatency(
          receiver
        );
      }

      let stream =
        event.streams &&
        event.streams[0];

      if(!stream){

        stream =
          new MediaStream();

        stream.addTrack(
          event.track
        );

      }

      remoteAudio.srcObject =
        stream;

      remoteAudio.volume = 1;

      remoteAudio.muted = false;

      try{

        const receivers =
          viewerPeer.getReceivers();

        for(
          const r
          of receivers
        ){

          applyReceiverLowLatency(r);

        }

      }catch(e){}

      const p =
        remoteAudio.play();

      if(
        p &&
        typeof p.catch ===
        "function"
      ){

        p.catch(error=>{

          log(
            "自動再生待機: " +
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

      document
        .getElementById("voiceText")
        .textContent =
        "🎙️ 配信者の音声を受信中";

    };

  viewerPeer.onconnectionstatechange =
    ()=>{

      if(!viewerPeer){
        return;
      }

      log(
        "配信者接続: " +
        viewerPeer.connectionState
      );

      if(
        viewerPeer.connectionState ===
        "connected"
      ){

        setStatus(
          "🔴 配信中",
          true
        );

        log(
          "🎉 音声接続成功"
        );

      }

      if(
        viewerPeer.connectionState ===
        "disconnected"
      ){

        setStatus(
          "WebRTC接続切断"
        );

      }

      if(
        viewerPeer.connectionState ===
        "failed"
      ){

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

async function handleViewerSignal(msg){

  const pc =
    createViewerPeer();

  if(msg.type === "offer"){

    try{

      await pc.setRemoteDescription({
        type:"offer",
        sdp:msg.sdp
      });

      log(
        "Offer受信"
      );

      for(
        const candidate
        of pendingCandidates
      ){

        try{

          await pc.addIceCandidate(
            candidate
          );

        }catch(e){}

      }

      pendingCandidates = [];

      let answer =
        await pc.createAnswer();

      answer = {
        type:"answer",
        sdp:
          optimizeOpusSDP(
            answer.sdp
          )
      };

      await pc.setLocalDescription(
        answer
      );

      send({

        type:"signal",

        target:viewerId,

        signal:{
          type:"answer",
          sdp:answer.sdp
        }

      });

      log(
        "⚡ 低遅延Answer送信"
      );

    }catch(e){

      log(
        "Viewer Offer処理エラー: " +
        e.message
      );

    }

    return;
  }

  if(msg.type === "candidate"){

    const candidate =
      new RTCIceCandidate(
        msg.candidate
      );

    if(pc.remoteDescription){

      try{

        await pc.addIceCandidate(
          candidate
        );

      }catch(e){

        log(
          "ICE追加エラー"
        );

      }

    }else{

      pendingCandidates.push(
        candidate
      );

    }

  }

}

async function handleHostSignal(msg){

  const pc =
    viewerConnections.get(
      msg.from
    );

  if(!pc){
    return;
  }

  if(
    msg.signal.type ===
    "answer"
  ){

    try{

      await pc.setRemoteDescription({

        type:"answer",

        sdp:
          msg.signal.sdp

      });

      const pending =
        hostPendingCandidates.get(
          msg.from
        ) || [];

      for(
        const candidate
        of pending
      ){

        try{

          await pc.addIceCandidate(
            candidate
          );

        }catch(e){}

      }

      hostPendingCandidates.delete(
        msg.from
      );

      log(
        "Answer受信: " +
        msg.from
      );

    }catch(e){

      log(
        "Answer処理エラー: " +
        e.message
      );

    }

    return;
  }

  if(
    msg.signal.type ===
    "candidate"
  ){

    const candidate =
      new RTCIceCandidate(
        msg.signal.candidate
      );

    if(pc.remoteDescription){

      try{

        await pc.addIceCandidate(
          candidate
        );

      }catch(e){

        log(
          "ICE追加エラー"
        );

      }

    }else{

      let list =
        hostPendingCandidates.get(
          msg.from
        );

      if(!list){

        list = [];

        hostPendingCandidates.set(
          msg.from,
          list
        );

      }

      list.push(candidate);

    }

  }

}

async function handleMessage(msg){

  if(msg.type === "welcome"){

    myId = msg.id;

    log(
      "ID=" +
      myId
    );

    return;
  }

  if(msg.type === "status"){

    log(msg.text);

    return;
  }

  if(msg.type === "join-ok"){

    roomJoined = true;

    log(
      "✅ ルーム参加完了"
    );

    return;
  }

  if(msg.type === "join-error"){

    log(
      "❌ " +
      msg.text
    );

    setStatus(
      msg.text
    );

    return;
  }

  if(msg.type === "room-status"){

    const homeLiveStatus =
      document.getElementById(
        "homeLiveStatus"
      );

    if(myRole === "host"){

      infoBox.textContent =
        "👥 視聴者: " +
        msg.viewers +
        "人";

    }else{

      infoBox.textContent =
        msg.live
          ? "🟢 配信中"
          : "⚪ 配信待機中";

    }

    if(homeLiveStatus){

      homeLiveStatus.textContent =
        msg.live
          ? "🔴 現在ライブ配信中 · 視聴者 " +
            msg.viewers +
            "人"
          : "現在配信中のライブを待っています";

      homeLiveStatus.className =
        "status " +
        (msg.live
          ? "live"
          : "wait");

    }

    return;
  }

  if(msg.type === "viewer-joined"){

    if(myRole === "host"){

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

  if(msg.type === "signal"){

    if(myRole === "host"){

      await handleHostSignal(
        msg
      );

    }else{

      viewerId =
        msg.from;

      await handleViewerSignal(
        msg.signal
      );

    }

    return;
  }

  if(msg.type === "stream-started"){

    setStatus(
      "🎙️ 配信中",
      true
    );

    document
      .getElementById(
        "voiceText"
      )
      .textContent =
      "配信者が配信中";

    return;
  }

  if(msg.type === "stream-stopped"){

    setStatus(
      "配信終了"
    );

    remoteAudio.srcObject =
      null;

    document
      .getElementById(
        "voiceText"
      )
      .textContent =
      "配信終了";

    return;
  }

  if(msg.type === "host-left"){

    setStatus(
      "配信者が退出しました"
    );

    remoteAudio.srcObject =
      null;

    document
      .getElementById(
        "voiceText"
      )
      .textContent =
      "配信終了";

    return;
  }

  if(msg.type === "viewer-left"){

    const pc =
      viewerConnections.get(
        msg.viewerId
      );

    if(pc){

      try{
        pc.close();
      }catch(e){}

      viewerConnections.delete(
        msg.viewerId
      );

    }

    hostPendingCandidates.delete(
      msg.viewerId
    );

  }

}

async function enableAudio(){

  try{

    remoteAudio.muted = false;

    remoteAudio.volume = 1;

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

  }catch(e){

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}

function stopLive(){

  manuallyStopped = true;

  roomJoined = false;

  if(reconnectTimer){

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer = null;

  }

  if(localStream){

    for(
      const track
      of localStream.getTracks()
    ){

      track.stop();

    }

    localStream = null;

  }

  for(
    const pc
    of viewerConnections.values()
  ){

    try{
      pc.close();
    }catch(e){}

  }

  viewerConnections.clear();

  hostPendingCandidates.clear();

  if(viewerPeer){

    try{
      viewerPeer.close();
    }catch(e){}

    viewerPeer = null;

  }

  pendingCandidates = [];

  if(
    ws &&
    ws.readyState ===
    WebSocket.OPEN
  ){

    send({
      type:"stream-stopped"
    });

  }

  if(ws){

    try{

      ws.close(
        1000,
        "user stopped"
      );

    }catch(e){}

    ws = null;

  }

  remoteAudio.srcObject =
    null;

  remoteAudio.muted = true;

  document
    .getElementById("liveArea")
    .classList
    .add("hidden");

  document
    .getElementById("roleSelect")
    .classList
    .add("hidden");

  document
    .getElementById("audioButton")
    .classList
    .add("hidden");

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

  setStatus(
    "停止しました"
  );

  myRole = null;

  viewerId = null;

}

remoteAudio.autoplay = true;

remoteAudio.playsInline = true;

remoteAudio.volume = 1;

document.addEventListener(
  "click",
  ()=>{
    if(
      myRole === "viewer" &&
      remoteAudio.srcObject &&
      remoteAudio.paused
    ){

      remoteAudio.muted = false;

      remoteAudio
        .play()
        .then(()=>{

          document
            .getElementById(
              "audioButton"
            )
            .classList
            .add("hidden");

        })
        .catch(()=>{});

    }

  },
  {
    passive:true
  }
);

</script>

</body>
</html>
`;

const server =
  http.createServer(
    (req,res)=>{

      if(req.url === "/health"){

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

      res.end(HTML);

    }
  );

const wss =
  new WebSocket.Server({
    server,
    perMessageDeflate:false
  });

let nextId = 1;

const clients =
  new Map();

function send(ws,data){

  if(
    ws &&
    ws.readyState ===
    WebSocket.OPEN
  ){

    try{

      ws.send(
        JSON.stringify(data)
      );

    }catch(e){

      console.log(
        "[SEND ERROR]",
        e.message
      );

    }

  }

}

wss.on(
  "connection",
  ws=>{

    const id =
      String(nextId++);

    const client = {

      id,

      ws,

      role:null,

      room:"bota",

      streaming:false,

      isAlive:true

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
        type:"welcome",
        id
      }
    );

    ws.on(
      "pong",
      ()=>{
        client.isAlive = true;
      }
    );

    ws.on(
      "message",
      raw=>{

        let msg;

        try{

          msg =
            JSON.parse(
              raw.toString()
            );

        }catch(e){

          return;

        }

        if(msg.type === "join"){

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

          if(
            client.role ===
            "host"
          ){

            let existingHost =
              null;

            for(
              const other
              of clients.values()
            ){

              if(
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ){

                existingHost =
                  other;

                break;
              }

            }

            if(existingHost){

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
                type:"status",

                text:
                  "配信者として接続しました"
              }
            );

            send(
              ws,
              {
                type:"join-ok"
              }
            );

            for(
              const other
              of clients.values()
            ){

              if(
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "viewer"
              ){

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

          if(
            client.role ===
            "viewer"
          ){

            send(
              ws,
              {
                type:"status",

                text:
                  "視聴者として接続しました"
              }
            );

            send(
              ws,
              {
                type:"join-ok"
              }
            );

            for(
              const other
              of clients.values()
            ){

              if(
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ){

                send(
                  other.ws,
                  {
                    type:
                      "viewer-joined",

                    viewerId:
                      client.id
                  }
                );

                if(
                  other.streaming
                ){

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

        if(
          msg.type ===
          "signal"
        ){

          const target =
            clients.get(
              msg.target
            );

          if(!target){
            return;
          }

          if(
            target.room !==
            client.room
          ){

            return;
          }

          send(
            target.ws,
            {
              type:"signal",

              from:
                client.id,

              signal:
                msg.signal
            }
          );

          return;
        }

        if(
          msg.type ===
          "stream-started"
        ){

          if(
            client.role !==
            "host"
          ){

            return;
          }

          client.streaming =
            true;

          console.log(
            "[STREAM STARTED]",
            client.id
          );

          for(
            const other
            of clients.values()
          ){

            if(
              other.room ===
                client.room &&
              other.role ===
                "viewer"
            ){

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

        if(
          msg.type ===
          "stream-stopped"
        ){

          if(
            client.role !==
            "host"
          ){

            return;
          }

          client.streaming =
            false;

          console.log(
            "[STREAM STOPPED]",
            client.id
          );

          for(
            const other
            of clients.values()
          ){

            if(
              other.room ===
                client.room &&
              other.role ===
                "viewer"
            ){

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

        }

      }
    );

    ws.on(
      "close",
      (code,reason)=>{

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

        clients.delete(id);

        if(
          role === "host"
        ){

          for(
            const other
            of clients.values()
          ){

            if(
              other.room === room &&
              other.role ===
                "viewer"
            ){

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

        if(
          role === "viewer"
        ){

          for(
            const other
            of clients.values()
          ){

            if(
              other.room === room &&
              other.role ===
                "host"
            ){

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

    ws.on(
      "error",
      error=>{

        console.log(
          "[WS ERROR]",
          id,
          error.message
        );

      }
    );

  }
);

const heartbeat =
  setInterval(
    ()=>{

      for(
        const client
        of clients.values()
      ){

        const ws =
          client.ws;

        if(
          client.isAlive ===
          false
        ){

          console.log(
            "[HEARTBEAT TIMEOUT]",
            client.id
          );

          try{
            ws.terminate();
          }catch(e){}

          continue;
        }

        client.isAlive =
          false;

        try{

          ws.ping();

        }catch(e){}

      }

    },
    25000
  );

wss.on(
  "close",
  ()=>{
    clearInterval(
      heartbeat
    );
  }
);

function updateRoomStatus(room){

  let host = false;
  let viewers = 0;
  let streaming = false;

  for(
    const client
    of clients.values()
  ){

    if(
      client.room !== room
    ){

      continue;
    }

    if(
      client.role ===
      "host"
    ){

      host = true;

      if(
        client.streaming
      ){

        streaming = true;

      }

    }

    if(
      client.role ===
      "viewer"
    ){

      viewers++;

    }

  }

  for(
    const client
    of clients.values()
  ){

    if(
      client.room === room
    ){

      send(
        client.ws,
        {
          type:
            "room-status",

          live:
            host && streaming,

          viewers
        }
      );

    }

  }

}

server.on(
  "error",
  error=>{

    console.error(
      "[SERVER ERROR]",
      error
    );

  }
);

server.listen(
  PORT,
  HOST,
  ()=>{

    console.log(
      "================================="
    );

    console.log(
      "Voice Bota Live"
    );

    console.log(
      "LOW LATENCY AUDIO MODE"
    );

    console.log(
      "Opus 10ms / FEC OFF / 32kbps"
    );

    console.log(
      "WebSocket heartbeat ENABLED"
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
