const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

/* =====================================================
   HTML
===================================================== */

const HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<title>VoiceボタLive</title>

<style>

*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
  width:100%;
  min-height:100%;
  background:#000;
  color:#fff;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    sans-serif;
}

body{
  overflow-x:hidden;
}

button,
input{
  font-family:inherit;
}

.app{
  width:100%;
  max-width:480px;
  min-height:100vh;
  margin:auto;

  background:
    radial-gradient(
      circle at 70% 0%,
      rgba(120,70,190,.35),
      transparent 35%
    ),
    linear-gradient(
      180deg,
      #08070d,
      #020204
    );

  position:relative;
  overflow:hidden;
}

/* =====================================================
   HEADER
===================================================== */

.header{
  height:62px;
  padding:0 17px;

  display:flex;
  align-items:center;
  justify-content:space-between;

  border-bottom:
    1px solid rgba(255,255,255,.08);

  background:
    rgba(5,4,9,.94);

  position:sticky;
  top:0;
  z-index:50;
}

.logo{
  font-size:21px;
  font-weight:900;
}

.logo .bota{
  color:#dc82ff;
}

.logo .live{
  color:#8dbfff;
}

.status{
  font-size:11px;
  color:#aaa;
}

/* =====================================================
   SCREEN
===================================================== */

.screen{
  display:none;

  min-height:
    calc(100vh - 62px);

  padding-bottom:80px;
}

.screen.active{
  display:block;
}

/* =====================================================
   CARD
===================================================== */

.card{
  margin:14px;
  padding:16px;

  border-radius:20px;

  background:
    rgba(17,12,23,.94);

  border:
    1px solid rgba(255,255,255,.08);
}

.cardTitle{
  font-size:17px;
  font-weight:900;
  margin-bottom:14px;
}

/* =====================================================
   HOME
===================================================== */

.homeHero{
  margin:14px;

  border-radius:24px;

  overflow:hidden;

  border:
    1px solid rgba(190,130,255,.25);

  background:#090711;
}

.moonScene{
  height:245px;

  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 72% 27%,
      rgba(235,242,255,.95) 0 7%,
      rgba(169,196,255,.4) 8%,
      transparent 23%
    ),
    linear-gradient(
      180deg,
      #09091b,
      #080512 55%,
      #020204
    );
}

.moon{
  position:absolute;

  width:90px;
  height:90px;

  right:68px;
  top:38px;

  border-radius:50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #fff,
      #dce7ff 48%,
      #9eafff
    );

  box-shadow:
    0 0 35px rgba(183,202,255,.75);
}

.flower{
  position:absolute;
  bottom:-4px;

  font-size:75px;
  opacity:.85;
}

.flower.left{
  left:20px;
}

.flower.right{
  right:20px;
}

.heroText{
  padding:17px;
}

.heroTitle{
  font-size:21px;
  font-weight:900;
  margin-bottom:6px;
}

.heroSub{
  color:#aaa1b3;
  font-size:12px;
  margin-bottom:15px;
}

/* =====================================================
   BUTTON
===================================================== */

.btn{
  border:0;

  border-radius:14px;

  padding:12px 17px;

  color:#fff;

  font-weight:800;

  background:
    linear-gradient(
      90deg,
      #54bfff,
      #835bff,
      #e35bca
    );
}

.btn.dark{
  background:#17121f;

  border:
    1px solid #392a48;
}

.btn.red{
  background:
    linear-gradient(
      90deg,
      #9f2b55,
      #ec4e77
    );
}

.btn.smallBtn{
  padding:7px 10px;
  font-size:11px;
}

/* =====================================================
   INPUT
===================================================== */

.input{
  width:100%;

  padding:13px;

  margin:6px 0;

  color:#fff;

  background:#09070d;

  border:
    1px solid #3b2b4a;

  border-radius:13px;

  outline:none;
}

.label{
  display:block;

  color:#aaa1ae;

  font-size:12px;

  margin-top:10px;
}

/* =====================================================
   PREVIEW
===================================================== */

.preview{
  width:100%;
  height:190px;

  margin-top:8px;

  border-radius:16px;

  overflow:hidden;

  display:grid;
  place-items:center;

  border:
    1px dashed #513b65;

  background:#0a0710;

  color:#71677b;
}

.preview img{
  width:100%;
  height:100%;

  object-fit:cover;
}

/* =====================================================
   LIVE LIST
===================================================== */

.liveCard{
  display:flex;

  gap:12px;

  align-items:center;

  padding:10px;

  border-radius:15px;

  background:
    rgba(255,255,255,.035);

  margin-bottom:8px;
}

.liveThumb{
  width:82px;
  height:65px;

  flex-shrink:0;

  border-radius:12px;

  overflow:hidden;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #17132d,
      #40215a
    );
}

.liveThumb img{
  width:100%;
  height:100%;

  object-fit:cover;
}

.liveName{
  font-weight:800;
  font-size:14px;
}

.liveTitle{
  color:#aaa0b0;
  font-size:12px;
  margin-top:4px;
}

.empty{
  padding:20px;

  text-align:center;

  color:#777;

  font-size:12px;
}

/* =====================================================
   LIVE
===================================================== */

.liveScreen{
  min-height:
    calc(100vh - 62px);

  display:flex;

  flex-direction:column;

  padding-bottom:75px;
}

.liveCover{
  height:300px;

  position:relative;

  overflow:hidden;

  background:
    radial-gradient(
      circle at 70% 25%,
      #3d2c61,
      #08070d 50%
    );
}

.liveCover img{
  width:100%;
  height:100%;

  object-fit:cover;

  opacity:.75;
}

.liveCover::after{
  content:"";

  position:absolute;

  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.58),
      transparent 40%,
      rgba(0,0,0,.85)
    );

  pointer-events:none;
}

.liveTop{
  position:absolute;

  top:14px;
  left:14px;
  right:14px;

  z-index:5;

  display:flex;

  justify-content:space-between;

  align-items:center;
}

.hostInfo{
  display:flex;

  align-items:center;

  gap:9px;
}

.avatar{
  width:40px;
  height:40px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #55c9ff,
      #b64cff
    );

  border:
    2px solid rgba(255,255,255,.45);
}

.hostName{
  font-size:14px;
  font-weight:900;
}

.liveBadge{
  display:inline-block;

  padding:4px 7px;

  border-radius:7px;

  background:#e93671;

  font-size:9px;

  font-weight:900;

  margin-top:3px;
}

.viewerBadge{
  padding:8px 10px;

  border-radius:99px;

  background:
    rgba(0,0,0,.5);

  border:
    1px solid rgba(255,255,255,.14);

  font-size:11px;
}

/* =====================================================
   AUDIO
===================================================== */

.audioBox{
  margin:10px 14px 0;

  padding:13px;

  border-radius:16px;

  background:#100c16;

  border:
    1px solid #35243f;
}

.audioStatus{
  font-size:12px;

  color:#aaa;

  margin-bottom:9px;
}

.audioStatus.ok{
  color:#72e3a4;
}

.audioStatus.error{
  color:#ff7695;
}

.audioButton{
  width:100%;

  padding:13px;

  border:0;

  border-radius:13px;

  color:#fff;

  font-weight:900;

  background:
    linear-gradient(
      90deg,
      #5d7cff,
      #b45cff
    );
}

/* =====================================================
   COMMENTS
===================================================== */

.comments{
  flex:1;

  min-height:150px;

  max-height:260px;

  overflow-y:auto;

  padding:10px 14px;
}

.comment{
  font-size:13px;

  margin:7px 0;

  display:flex;

  align-items:center;

  gap:3px;
}

.commentName{
  color:#d28cff;

  font-weight:800;
}

.commentBlockBtn{
  border:0;

  background:transparent;

  color:#777;

  font-size:11px;

  padding:2px 5px;
}

/* =====================================================
   CHAT
===================================================== */

.chatBar{
  position:fixed;

  bottom:0;
  left:50%;

  transform:
    translateX(-50%);

  width:100%;
  max-width:480px;

  height:70px;

  padding:10px;

  display:flex;

  gap:6px;

  align-items:center;

  background:
    rgba(8,6,12,.97);

  border-top:
    1px solid #281c34;

  z-index:40;
}

.chatInput{
  flex:1;

  min-width:0;

  padding:12px;

  border-radius:14px;

  border:
    1px solid #3b2b49;

  background:#0c0910;

  color:#fff;

  outline:none;
}

.iconBtn{
  width:43px;
  height:43px;

  border-radius:13px;

  border:
    1px solid #392a49;

  background:#15101c;

  color:#fff;

  font-size:18px;
}

/* =====================================================
   NAV
===================================================== */

.nav{
  position:fixed;

  bottom:0;
  left:50%;

  transform:
    translateX(-50%);

  width:100%;
  max-width:480px;

  height:68px;

  background:
    rgba(8,6,12,.97);

  border-top:
    1px solid #281c35;

  display:flex;

  align-items:center;

  justify-content:space-around;

  z-index:30;
}

.nav button{
  border:0;

  background:transparent;

  color:#817689;

  font-size:10px;
}

.nav button span{
  display:block;

  font-size:21px;

  margin-bottom:3px;
}

/* =====================================================
   MODAL
===================================================== */

.modal{
  position:fixed;

  inset:0;

  display:none;

  align-items:flex-end;

  justify-content:center;

  background:
    rgba(0,0,0,.72);

  z-index:100;
}

.modal.show{
  display:flex;
}

.sheet{
  width:100%;
  max-width:480px;

  padding:20px;

  border-radius:
    25px 25px 0 0;

  background:#120d19;

  border:
    1px solid #443151;
}

.gifts{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:8px;

  margin-top:15px;
}

.gift{
  padding:13px;

  border-radius:15px;

  border:
    1px solid #39294a;

  background:#191221;

  color:#fff;
}

.giftIcon{
  font-size:27px;

  display:block;

  margin-bottom:5px;
}

.small{
  color:#9990a0;

  font-size:11px;
}

.toast{
  position:fixed;

  left:50%;
  bottom:90px;

  transform:
    translateX(-50%);

  padding:10px 15px;

  border-radius:99px;

  background:#21172c;

  border:
    1px solid #604478;

  font-size:12px;

  display:none;

  z-index:200;
}

.toast.show{
  display:block;
}

/* =====================================================
   BLOCK LIST
===================================================== */

.blockList{
  max-height:300px;

  overflow-y:auto;

  margin-top:10px;
}

.blockUser{
  display:flex;

  align-items:center;

  justify-content:space-between;

  gap:8px;

  padding:10px;

  margin-bottom:7px;

  border-radius:13px;

  background:#0e0a13;

  border:1px solid #2d2038;
}

.blockUserName{
  flex:1;

  font-size:13px;

  font-weight:800;
}

</style>

</head>

<body>

<div class="app">

<header class="header">

  <div class="logo">
    Voice<span class="bota">ボタ</span><span class="live">Live</span>
  </div>

  <div id="status" class="status">
    ● 接続中
  </div>

</header>


<!-- =====================================================
     HOME
===================================================== -->

<section id="home" class="screen active">

  <div class="homeHero">

    <div class="moonScene">

      <div class="moon"></div>

      <div class="flower left">
        🪻
      </div>

      <div class="flower right">
        🪻
      </div>

    </div>

    <div class="heroText">

      <div class="heroTitle">
        声でつながる、みんなの居場所。
      </div>

      <div class="heroSub">
        月光の夜に、声でつながろう。
      </div>

      <button
        class="btn"
        onclick="openHost()"
      >
        🎙️ 配信する
      </button>

    </div>

  </div>


  <div class="card">

    <div class="cardTitle">
      🔴 ライブ中
    </div>

    <div id="liveList">

      <div class="empty">
        配信を確認しています...
      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     SETUP
===================================================== -->

<section id="setup" class="screen">

  <div class="card">

    <div class="cardTitle">
      🎙️ 配信準備
    </div>

    <label class="label">
      配信者名
    </label>

    <input
      id="hostName"
      class="input"
      value="ぼたもち"
      maxlength="30"
    >

    <label class="label">
      配信タイトル
    </label>

    <input
      id="liveTitle"
      class="input"
      value="月光の夜に雑談しよ🌙"
      maxlength="80"
    >

    <label class="label">
      配信画像
    </label>

    <input
      id="imageFile"
      class="input"
      type="file"
      accept="image/*"
    >

    <div
      id="preview"
      class="preview"
    >
      🌙 月光花の画像を設定
    </div>

    <br>

    <button
      class="btn"
      onclick="startBroadcast()"
    >
      🎙️ 配信開始
    </button>

    <button
      class="btn dark"
      onclick="showScreen('home')"
      style="margin-left:5px"
    >
      戻る
    </button>

  </div>

</section>


<!-- =====================================================
     LIVE
===================================================== -->

<section
  id="live"
  class="screen"
  style="padding:0"
>

  <div class="liveScreen">

    <div class="liveCover">

      <img
        id="liveImage"
        style="display:none"
      >

      <div class="liveTop">

        <div class="hostInfo">

          <div class="avatar">
            🎙️
          </div>

          <div>

            <div
              id="liveName"
              class="hostName"
            >
              配信者
            </div>

            <div class="liveBadge">
              LIVE
            </div>

          </div>

        </div>

        <div class="viewerBadge">

          👥
          <span id="viewerCount">
            0
          </span>

        </div>

      </div>

    </div>


    <div class="audioBox">

      <div
        id="audioStatus"
        class="audioStatus"
      >
        🔊 音声接続を待っています
      </div>

      <button
        id="audioButton"
        class="audioButton"
        onclick="startAudio()"
      >
        🔊 音声を開始
      </button>

    </div>


    <div
      id="comments"
      class="comments"
    ></div>

  </div>


  <div class="chatBar">

    <input
      id="chatInput"
      class="chatInput"
      placeholder="コメントを入力..."
      maxlength="200"
    >

    <button
      class="iconBtn"
      onclick="sendChat()"
    >
      ➤
    </button>

    <button
      class="iconBtn"
      onclick="openGifts()"
    >
      🎁
    </button>

    <button
      id="blockListButton"
      class="iconBtn"
      onclick="openBlockList()"
      style="display:none"
    >
      🚫
    </button>

    <button
      id="hostEndButton"
      class="iconBtn"
      onclick="stopBroadcast()"
      style="display:none"
    >
      ×
    </button>

  </div>

</section>


<!-- =====================================================
     PROFILE
===================================================== -->

<section id="profile" class="screen">

  <div class="card">

    <div class="cardTitle">
      👤 マイページ
    </div>

    <div class="hostInfo">

      <div class="avatar">
        🎙️
      </div>

      <div>

        <div id="profileName">
          ぼたもち
        </div>

        <div class="small">
          VoiceボタLive
        </div>

      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     NAV
===================================================== -->

<nav class="nav">

  <button
    onclick="showScreen('home')"
  >
    <span>⌂</span>
    ホーム
  </button>

  <button
    onclick="openHost()"
  >
    <span>🎙️</span>
    配信
  </button>

  <button
    onclick="showScreen('profile')"
  >
    <span>♙</span>
    マイページ
  </button>

</nav>


<!-- =====================================================
     GIFTS
===================================================== -->

<div
  id="giftModal"
  class="modal"
>

  <div class="sheet">

    <div
      style="
      display:flex;
      justify-content:space-between;
      align-items:center
      "
    >

      <b>
        🎁 ギフト
      </b>

      <button
        class="btn dark"
        onclick="closeGifts()"
      >
        閉じる
      </button>

    </div>

    <div class="gifts">

      <button
        class="gift"
        onclick="sendGift('🌙 月光花')"
      >
        <span class="giftIcon">🌙</span>
        月光花
      </button>

      <button
        class="gift"
        onclick="sendGift('💜 ハート')"
      >
        <span class="giftIcon">💜</span>
        ハート
      </button>

      <button
        class="gift"
        onclick="sendGift('✨ 星の雫')"
      >
        <span class="giftIcon">✨</span>
        星の雫
      </button>

    </div>

  </div>

</div>


<!-- =====================================================
     BLOCK LIST
===================================================== -->

<div
  id="blockModal"
  class="modal"
>

  <div class="sheet">

    <div
      style="
      display:flex;
      justify-content:space-between;
      align-items:center
      "
    >

      <b>
        🚫 ブロック管理
      </b>

      <button
        class="btn dark"
        onclick="closeBlockList()"
      >
        閉じる
      </button>

    </div>

    <div
      id="blockUsers"
      class="blockList"
    ></div>

  </div>

</div>


<div
  id="toast"
  class="toast"
></div>


<script>

let socket = null;

let role = null;

let localStream = null;

let viewerPeer = null;

let viewerPeers = new Map();

let customImage = "";

let currentLive = false;

let currentMeta = null;

let audioStarted = false;


/* =====================================================
   ブロック管理
===================================================== */

let blockedUsers = new Set();

let userNames = new Map();


/* =====================================================
   RTC
===================================================== */

const rtcConfig = {

  bundlePolicy:"max-bundle",

  rtcpMuxPolicy:"require",

  iceServers:[

    {
      urls:"stun:stun.l.google.com:19302"
    },

    {
      urls:"stun:stun1.l.google.com:19302"
    }

  ]

};


/* =====================================================
   基本
===================================================== */

function $(id){
  return document.getElementById(id);
}


function showScreen(id){

  document
    .querySelectorAll(".screen")
    .forEach(x=>{
      x.classList.remove("active");
    });

  const el=$(id);

  if(el){
    el.classList.add("active");
  }

}


function setAudioStatus(text,type){

  const el=$("audioStatus");

  el.textContent=text;

  el.className="audioStatus";

  if(type){
    el.classList.add(type);
  }

}


/* =====================================================
   SOCKET
===================================================== */

function connectSocket(){

  if(
    socket &&
    (
      socket.readyState===WebSocket.OPEN ||
      socket.readyState===WebSocket.CONNECTING
    )
  ){
    return;
  }


  const protocol =
    location.protocol==="https:"
      ? "wss"
      : "ws";


  socket=
    new WebSocket(
      protocol+
      "://"+
      location.host
    );


  socket.onopen=()=>{

    $("status").textContent=
      "● 接続済み";

    send({
      type:"hello"
    });

  };


  socket.onerror=()=>{

    $("status").textContent=
      "● 接続エラー";

  };


  socket.onclose=()=>{

    $("status").textContent=
      "● 切断";

  };


  socket.onmessage=(event)=>{

    try{

      handleMessage(
        JSON.parse(
          event.data
        )
      );

    }catch(error){

      console.error(error);

    }

  };

}


function send(data){

  if(
    socket &&
    socket.readyState===
    WebSocket.OPEN
  ){

    socket.send(
      JSON.stringify(data)
    );

  }

}


/* =====================================================
   MESSAGE
===================================================== */

function handleMessage(m){

  if(m.type==="state"){

    currentLive=
      !!m.live;

    currentMeta=
      m.meta||null;

    updateLiveList();

    return;

  }


  if(m.type==="host-ready"){

    $("status").textContent=
      "● LIVE";

    setAudioStatus(
      "🎙️ 配信中・低遅延音声送信中",
      "ok"
    );

    return;

  }


  if(m.type==="live-meta"){

    currentMeta=
      m.meta||null;

    currentLive=true;

    updateLiveList();

    return;

  }


  if(m.type==="viewer"){

    if(role==="host"){

      createOffer(m.id);

    }

    return;

  }


  if(m.type==="viewer-user"){

    userNames.set(
      m.id,
      m.name||"ゲスト"
    );

    return;

  }


  if(m.type==="offer"){

    receiveOffer(m);

    return;

  }


  if(m.type==="answer"){

    const peer=
      viewerPeers.get(m.from);

    if(peer){

      peer
        .setRemoteDescription(
          m.sdp
        )
        .catch(console.error);

    }

    return;

  }


  if(m.type==="ice"){

    let peer=null;


    if(role==="host"){

      peer=
        viewerPeers.get(m.from);

    }else{

      peer=
        viewerPeer;

    }


    if(
      peer &&
      m.candidate
    ){

      peer
        .addIceCandidate(
          m.candidate
        )
        .catch(()=>{});

    }

    return;

  }


  if(m.type==="count"){

    $("viewerCount").textContent=
      m.n;

    return;

  }


  if(m.type==="chat"){

    if(
      blockedUsers.has(
        m.userId
      )
    ){

      return;

    }

    addComment(
      m.userId,
      m.name,
      m.text
    );

    return;

  }


  if(m.type==="gift"){

    if(
      blockedUsers.has(
        m.userId
      )
    ){

      return;

    }

    addComment(
      m.userId,
      m.name,
      "🎁 "+m.gift
    );

    return;

  }


  if(m.type==="blocked"){

    blockedUsers.add(
      m.userId
    );

    showToast(
      "🚫 "+m.name+
      " をブロックしました"
    );

    return;

  }


  if(m.type==="unblocked"){

    blockedUsers.delete(
      m.userId
    );

    showToast(
      "🔓 ブロックを解除しました"
    );

    renderBlockList();

    return;

  }


  if(m.type==="block-list"){

    blockedUsers=
      new Set(
        m.users||[]
      );

    renderBlockList();

    return;

  }


  if(m.type==="live-ended"){

    currentLive=false;

    currentMeta=null;

    updateLiveList();

    if(role!=="host"){

      closeViewerPeer();

      showScreen("home");

      setAudioStatus(
        "配信が終了しました",
        "error"
      );

    }

    return;

  }


  if(m.type==="error"){

    alert(
      m.text||
      "エラーが発生しました"
    );

  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function updateLiveList(){

  const list=$("liveList");

  list.innerHTML="";


  if(!currentLive){

    list.innerHTML=
      '<div class="empty">'+
      '現在配信中のライブはありません'+
      '</div>';

    return;

  }


  const meta=
    currentMeta||{};


  const card=
    document.createElement(
      "div"
    );

  card.className=
    "liveCard";


  const thumb=
    document.createElement(
      "div"
    );

  thumb.className=
    "liveThumb";


  if(meta.image){

    const img=
      document.createElement(
        "img"
      );

    img.src=
      meta.image;

    thumb.appendChild(img);

  }else{

    thumb.textContent="🌙";

  }


  const info=
    document.createElement(
      "div"
    );

  info.style.flex="1";


  const name=
    document.createElement(
      "div"
    );

  name.className=
    "liveName";

  name.textContent=
    "🔴 "+
    (
      meta.name||
      "配信者"
    );


  const title=
    document.createElement(
      "div"
    );

  title.className=
    "liveTitle";

  title.textContent=
    meta.title||
    "ライブ配信";


  info.appendChild(name);

  info.appendChild(title);


  const button=
    document.createElement(
      "button"
    );

  button.className="btn";

  button.textContent="見る";

  button.onclick=joinLive;


  card.appendChild(thumb);

  card.appendChild(info);

  card.appendChild(button);

  list.appendChild(card);

}


/* =====================================================
   BROADCAST
===================================================== */

async function startBroadcast(){

  if(role==="host"){
    return;
  }


  if(
    !navigator.mediaDevices||
    !navigator.mediaDevices.getUserMedia
  ){

    alert(
      "このブラウザではマイクを利用できません。HTTPSで開いてください。"
    );

    return;

  }


  try{

    localStream=
      await navigator.mediaDevices
        .getUserMedia({

          audio:{

            echoCancellation:false,

            noiseSuppression:false,

            autoGainControl:false,

            channelCount:1,

            sampleRate:48000,

            sampleSize:16,

            latency:0

          },

          video:false

        });

  }catch(error){

    console.error(error);

    alert(
      "マイクを取得できませんでした。"
    );

    return;

  }


  role="host";


  const name=
    (
      $("hostName").value||
      "ぼたもち"
    ).trim();


  const title=
    (
      $("liveTitle").value||
      "月光の夜に雑談しよ🌙"
    ).trim();


  $("profileName").textContent=name;

  $("liveName").textContent=name;

  $("hostEndButton")
    .style.display="block";

  $("blockListButton")
    .style.display="block";


  send({

    type:"join-host",

    name:name

  });


  showScreen("live");


  setAudioStatus(
    "🎙️ マイク取得成功・低遅延配信中",
    "ok"
  );


  setTimeout(()=>{

    send({

      type:"set-meta",

      meta:{

        name:name,

        title:title,

        image:customImage

      }

    });

  },200);

}


/* =====================================================
   JOIN
===================================================== */

function joinLive(){

  if(!currentLive){

    showToast(
      "現在配信中ではありません"
    );

    return;

  }


  role="viewer";

  audioStarted=false;

  closeViewerPeer();


  $("audioButton")
    .style.display="block";

  $("hostEndButton")
    .style.display="none";

  $("blockListButton")
    .style.display="none";


  setAudioStatus(
    "🔊 配信に接続しています...",
    ""
  );


  const meta=
    currentMeta||{};


  $("liveName")
    .textContent=
      meta.name||
      "配信者";


  if(meta.image){

    $("liveImage").src=
      meta.image;

    $("liveImage").style.display=
      "block";

  }else{

    $("liveImage").style.display=
      "none";

  }


  showScreen("live");


  send({
    type:"join-viewer"
  });

}


/* =====================================================
   OFFER
===================================================== */

async function createOffer(viewerId){

  if(!localStream){
    return;
  }


  const peer=
    new RTCPeerConnection(
      rtcConfig
    );


  viewerPeers.set(
    viewerId,
    peer
  );


  localStream
    .getAudioTracks()
    .forEach(track=>{

      const sender=
        peer.addTrack(
          track,
          localStream
        );


      try{

        const params=
          sender.getParameters();

        if(
          params.encodings &&
          params.encodings.length
        ){

          params.encodings[0]
            .maxBitrate=
            64000;

        }

        sender.setParameters(
          params
        ).catch(()=>{});

      }catch(e){}

    });


  peer.onicecandidate=
    event=>{

      if(event.candidate){

        send({

          type:"ice",

          to:viewerId,

          candidate:
            event.candidate

        });

      }

    };


  try{

    const offer=
      await peer.createOffer({

        offerToReceiveAudio:false,

        offerToReceiveVideo:false

      });


    if(offer.sdp){

      offer.sdp=
        optimizeOpusSDP(
          offer.sdp
        );

    }


    await peer.setLocalDescription(
      offer
    );


    send({

      type:"offer",

      to:viewerId,

      sdp:
        peer.localDescription

    });

  }catch(error){

    console.error(
      "CREATE OFFER ERROR",
      error
    );

  }

}


/* =====================================================
   OPUS
===================================================== */

function optimizeOpusSDP(sdp){

  const lines=
    sdp.split("\\r\\n");

  let opusPayload=null;


  for(
    const line of lines
  ){

    if(
      line.startsWith("a=rtpmap:") &&
      line.toLowerCase()
        .includes("opus/48000")
    ){

      const match=
        line.match(
          /^a=rtpmap:(\\d+)/
        );

      if(match){

        opusPayload=
          match[1];

        break;

      }

    }

  }


  if(!opusPayload){

    return sdp;

  }


  const fmtp=
    "a=fmtp:"+
    opusPayload+
    " minptime=10;useinbandfec=1;stereo=0;usedtx=0";


  let found=false;


  for(
    let i=0;
    i<lines.length;
    i++
  ){

    if(
      lines[i].startsWith(
        "a=fmtp:"+opusPayload
      )
    ){

      lines[i]=fmtp;

      found=true;

      break;

    }

  }


  if(!found){

    const index=
      lines.findIndex(
        x=>
          x.startsWith(
            "a=rtpmap:"+opusPayload
          )
      );

    if(index>=0){

      lines.splice(
        index+1,
        0,
        fmtp
      );

    }

  }


  return lines.join("\\r\\n");

}


/* =====================================================
   VIEWER OFFER
===================================================== */

async function receiveOffer(m){

  closeViewerPeer();


  viewerPeer=
    new RTCPeerConnection(
      rtcConfig
    );


  setAudioStatus(
    "🔊 WebRTC低遅延接続中...",
    ""
  );


  viewerPeer.onicecandidate=
    event=>{

      if(event.candidate){

        send({

          type:"ice",

          candidate:
            event.candidate

        });

      }

    };


  viewerPeer.oniceconnectionstatechange=
    ()=>{

      const state=
        viewerPeer.iceConnectionState;


      if(
        state==="connected"||
        state==="completed"
      ){

        setAudioStatus(
          "🟢 低遅延音声回線に接続",
          "ok"
        );

      }


      if(state==="checking"){

        setAudioStatus(
          "🔵 音声回線を確認中...",
          ""
        );

      }


      if(state==="disconnected"){

        setAudioStatus(
          "🟡 回線が不安定です",
          ""
        );

      }


      if(state==="failed"){

        setAudioStatus(
          "🔴 WebRTC接続失敗",
          "error"
        );

      }

    };


  viewerPeer.ontrack=
    event=>{

      let audio=
        document.getElementById(
          "remoteAudio"
        );


      if(!audio){

        audio=
          document.createElement(
            "audio"
          );

        audio.id="remoteAudio";

        audio.autoplay=true;

        audio.playsInline=true;

        audio.controls=false;

        audio.style.display="none";

        document.body.appendChild(
          audio
        );

      }


      audio.srcObject=
        event.streams[0];


      try{

        if(
          "playoutDelayHint"
          in viewerPeer
        ){

          viewerPeer.playoutDelayHint=0;

        }

      }catch(e){}


      try{

        const receivers=
          viewerPeer.getReceivers();


        receivers.forEach(
          receiver=>{

            if(
              receiver.track &&
              receiver.track.kind==="audio"
            ){

              try{

                if(
                  "playoutDelayHint"
                  in receiver
                ){

                  receiver.playoutDelayHint=0;

                }

              }catch(e){}

            }

          }
        );

      }catch(e){}


      setAudioStatus(
        "🟢 音声を受信しています",
        "ok"
      );


      if(audioStarted){

        audio.play().catch(()=>{});

      }

    };


  try{

    await viewerPeer
      .setRemoteDescription(
        m.sdp
      );


    const answer=
      await viewerPeer.createAnswer();


    if(answer.sdp){

      answer.sdp=
        optimizeOpusSDP(
          answer.sdp
        );

    }


    await viewerPeer
      .setLocalDescription(
        answer
      );


    send({

      type:"answer",

      sdp:
        viewerPeer.localDescription

    });

  }catch(error){

    console.error(error);

    setAudioStatus(
      "🔴 音声接続エラー",
      "error"
    );

  }

}


/* =====================================================
   AUDIO
===================================================== */

async function startAudio(){

  audioStarted=true;


  let audio=
    document.getElementById(
      "remoteAudio"
    );


  if(!audio){

    audio=
      document.createElement(
        "audio"
      );

    audio.id="remoteAudio";

    audio.autoplay=true;

    audio.playsInline=true;

    audio.style.display="none";

    document.body.appendChild(
      audio
    );

  }


  try{

    await audio.play();

    $("audioButton")
      .textContent=
      "🔊 音声再生中";


    setAudioStatus(
      "🟢 低遅延音声再生中",
      "ok"
    );

  }catch(error){

    setAudioStatus(
      "🔴 もう一度「音声を開始」を押してください",
      "error"
    );

  }

}


/* =====================================================
   CLOSE
===================================================== */

function closeViewerPeer(){

  if(viewerPeer){

    try{
      viewerPeer.close();
    }catch(e){}

  }

  viewerPeer=null;


  const audio=
    document.getElementById(
      "remoteAudio"
    );


  if(audio){

    try{

      audio.pause();

      audio.srcObject=null;

    }catch(e){}

  }

}


/* =====================================================
   STOP
===================================================== */

function stopBroadcast(){

  send({
    type:"leave-host"
  });


  if(localStream){

    localStream
      .getTracks()
      .forEach(track=>{
        track.stop();
      });

  }


  localStream=null;


  viewerPeers.forEach(
    peer=>{

      try{
        peer.close();
      }catch(e){}

    }
  );


  viewerPeers.clear();


  role=null;

  currentLive=false;

  currentMeta=null;


  $("hostEndButton")
    .style.display="none";

  $("blockListButton")
    .style.display="none";


  $("status")
    .textContent=
      "● 接続済み";


  showScreen("home");

}


/* =====================================================
   CHAT
===================================================== */

function sendChat(){

  const input=
    $("chatInput");


  const text=
    input.value.trim();


  if(!text){
    return;
  }


  send({

    type:"chat",

    text:text

  });


  input.value="";

}


$("chatInput")
  .addEventListener(
    "keydown",
    event=>{

      if(event.key==="Enter"){

        sendChat();

      }

    }
  );


function addComment(
  userId,
  name,
  text
){

  if(
    blockedUsers.has(userId)
  ){

    return;

  }


  const box=
    $("comments");


  const div=
    document.createElement(
      "div"
    );

  div.className="comment";


  const n=
    document.createElement(
      "span"
    );

  n.className=
    "commentName";

  n.textContent=
    name+"：";


  const t=
    document.createElement(
      "span"
    );

  t.textContent=text;


  div.appendChild(n);

  div.appendChild(t);


  /*
    配信者の場合だけ、
    コメント横にブロックボタン。
  */

  if(role==="host" && userId){

    const b=
      document.createElement(
        "button"
      );

    b.className=
      "commentBlockBtn";

    b.textContent=
      "🚫";

    b.title=
      "このユーザーをブロック";


    b.onclick=()=>{

      blockUser(
        userId,
        name
      );

    };


    div.appendChild(b);

  }


  box.appendChild(div);

  box.scrollTop=
    box.scrollHeight;

}


/* =====================================================
   BLOCK
===================================================== */

function blockUser(
  userId,
  name
){

  if(!userId){

    return;

  }


  if(role!=="host"){

    showToast(
      "配信者だけがブロックできます"
    );

    return;

  }


  if(
    blockedUsers.has(userId)
  ){

    showToast(
      "すでにブロックしています"
    );

    return;

  }


  if(
    !confirm(
      name+
      " をブロックしますか？"
    )
  ){

    return;

  }


  send({

    type:"block-user",

    userId:userId,

    name:name

  });


  blockedUsers.add(userId);

  renderBlockList();

}


/* =====================================================
   BLOCK LIST
===================================================== */

function openBlockList(){

  if(role!=="host"){

    return;

  }


  $("blockModal")
    .classList
    .add("show");


  send({
    type:"get-block-list"
  });

}


function closeBlockList(){

  $("blockModal")
    .classList
    .remove("show");

}


function renderBlockList(){

  const box=
    $("blockUsers");


  box.innerHTML="";


  if(blockedUsers.size===0){

    box.innerHTML=
      '<div class="empty">'+
      'ブロック中のユーザーはいません'+
      '</div>';

    return;

  }


  blockedUsers.forEach(
    userId=>{

      const row=
        document.createElement(
          "div"
        );

      row.className=
        "blockUser";


      const name=
        document.createElement(
          "div"
        );

      name.className=
        "blockUserName";

      name.textContent=
        userNames.get(userId)||
        "ユーザー";


      const button=
        document.createElement(
          "button"
        );

      button.className=
        "btn smallBtn";


      button.textContent=
        "解除";


      button.onclick=()=>{

        send({

          type:"unblock-user",

          userId:userId

        });

      };


      row.appendChild(name);

      row.appendChild(button);

      box.appendChild(row);

    }
  );

}


/* =====================================================
   IMAGE
===================================================== */

$("imageFile")
  .addEventListener(
    "change",
    event=>{

      const file=
        event.target.files[0];


      if(!file){
        return;
      }


      if(
        file.size>
        3*1024*1024
      ){

        alert(
          "画像は3MB以下にしてください"
        );

        return;

      }


      const reader=
        new FileReader();


      reader.onload=()=>{

        customImage=
          reader.result;


        $("preview")
          .innerHTML="";


        const img=
          document.createElement(
            "img"
          );

        img.src=
          customImage;


        $("preview")
          .appendChild(img);

      };


      reader.readAsDataURL(file);

    }
  );


/* =====================================================
   HOST
===================================================== */

function openHost(){

  if(role==="host"){

    showScreen("live");

    return;

  }


  showScreen("setup");

}


/* =====================================================
   GIFTS
===================================================== */

function openGifts(){

  $("giftModal")
    .classList
    .add("show");

}


function closeGifts(){

  $("giftModal")
    .classList
    .remove("show");

}


function sendGift(gift){

  closeGifts();


  send({

    type:"gift",

    gift:gift

  });


  showToast(
    gift+
    " を送りました 🎁"
  );

}


/* =====================================================
   TOAST
===================================================== */

let toastTimer=null;


function showToast(text){

  const toast=
    $("toast");


  toast.textContent=text;


  toast.classList
    .add("show");


  clearTimeout(
    toastTimer
  );


  toastTimer=
    setTimeout(
      ()=>{
        toast.classList
          .remove("show");
      },
      2200
    );

}


/* =====================================================
   START
===================================================== */

connectSocket();

</script>

</div>

</body>
</html>
`;


/* =====================================================
   HTTP
===================================================== */

const server =
  http.createServer(
    (req,res)=>{

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache"
        }
      );

      res.end(HTML);

    }
  );


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server
  });


const clients =
  new Set();


let broadcaster=null;

let liveMeta=null;

const viewers =
  new Map();


/*
  配信者ごとのブロックリスト。

  現段階ではメモリ保存。
  サーバー再起動で消える。

  後でDBを入れて永続化する。
*/

const blockedByHost =
  new Map();


function wsSend(
  ws,
  data
){

  if(
    ws &&
    ws.readyState===
    WebSocket.OPEN
  ){

    ws.send(
      JSON.stringify(data)
    );

  }

}


function broadcast(
  data,
  except=null
){

  clients.forEach(
    client=>{

      if(
        client!==except
      ){

        wsSend(
          client,
          data
        );

      }

    }
  );

}


/* =====================================================
   CONNECTION
===================================================== */

wss.on(
  "connection",
  socket=>{

    clients.add(socket);


    socket.id=
      Math.random()
        .toString(36)
        .slice(2)+
      Date.now()
        .toString(36);


    socket.name="ゲスト";

    socket.role="unknown";


    wsSend(
      socket,
      {
        type:"state",

        live:
          !!broadcaster,

        meta:
          liveMeta,

        viewers:
          viewers.size
      }
    );


    socket.on(
      "message",
      raw=>{

        let m;


        try{

          m=
            JSON.parse(
              raw.toString()
            );

        }catch(e){

          return;

        }


        /* ==========================================
           HELLO
        ========================================== */

        if(m.type==="hello"){

          wsSend(
            socket,
            {
              type:"state",

              live:
                !!broadcaster,

              meta:
                liveMeta,

              viewers:
                viewers.size
            }
          );

          return;

        }


        /* ==========================================
           HOST
        ========================================== */

        if(m.type==="join-host"){

          if(
            broadcaster &&
            broadcaster!==socket
          ){

            wsSend(
              socket,
              {
                type:"error",

                text:
                  "すでに配信中です"
              }
            );

            return;

          }


          socket.role="host";


          socket.name=
            String(
              m.name||
              "ぼたもち"
            ).slice(
              0,
              30
            );


          broadcaster=socket;


          if(
            !blockedByHost.has(
              socket.id
            )
          ){

            blockedByHost.set(
              socket.id,
              new Set()
            );

          }


          wsSend(
            socket,
            {
              type:"host-ready"
            }
          );


          broadcast(
            {
              type:"state",

              live:true,

              meta:
                liveMeta,

              viewers:
                viewers.size
            },

            socket
          );


          return;

        }


        /* ==========================================
           META
        ========================================== */

        if(m.type==="set-meta"){

          if(
            socket!==broadcaster
          ){

            return;

          }


          liveMeta={

            name:
              String(
                m.meta?.name||
                socket.name
              ).slice(
                0,
                30
              ),

            title:
              String(
                m.meta?.title||
                "ライブ配信"
              ).slice(
                0,
                80
              ),

            image:
              typeof m.meta?.image==="string"
                ? m.meta.image.slice(
                    0,
                    900000
                  )
                : ""

          };


          broadcast(
            {
              type:"live-meta",

              meta:
                liveMeta
            }
          );


          return;

        }


        /* ==========================================
           VIEWER
        ========================================== */

        if(m.type==="join-viewer"){

          if(!broadcaster){

            wsSend(
              socket,
              {
                type:"error",

                text:
                  "配信が終了しています"
              }
            );

            return;

          }


          socket.role="viewer";


          viewers.set(
            socket.id,
            socket
          );


          wsSend(
            socket,
            {
              type:"live-meta",

              meta:
                liveMeta
            }
          );


          wsSend(
            socket,
            {
              type:"count",

              n:
                viewers.size
            }
          );


          wsSend(
            broadcaster,
            {
              type:"viewer",

              id:
                socket.id
            }
          );


          wsSend(
            socket,
            {
              type:"viewer-user",

              id:
                socket.id,

              name:
                socket.name
            }
          );


          broadcast(
            {
              type:"count",

              n:
                viewers.size
            }
          );


          return;

        }


        /* ==========================================
           OFFER
        ========================================== */

        if(m.type==="offer"){

          if(
            socket!==broadcaster
          ){

            return;

          }


          const viewer=
            viewers.get(
              m.to
            );


          if(viewer){

            wsSend(
              viewer,
              {
                type:"offer",

                sdp:
                  m.sdp
              }
            );

          }


          return;

        }


        /* ==========================================
           ANSWER
        ========================================== */

        if(m.type==="answer"){

          if(!broadcaster){

            return;

          }


          wsSend(
            broadcaster,
            {
              type:"answer",

              from:
                socket.id,

              sdp:
                m.sdp
            }
          );


          return;

        }


        /* ==========================================
           ICE
        ========================================== */

        if(m.type==="ice"){

          if(
            socket===broadcaster
          ){

            const viewer=
              viewers.get(
                m.to
              );


            if(viewer){

              wsSend(
                viewer,
                {
                  type:"ice",

                  from:"host",

                  candidate:
                    m.candidate
                }
              );

            }

          }else{

            if(broadcaster){

              wsSend(
                broadcaster,
                {
                  type:"ice",

                  from:
                    socket.id,

                  candidate:
                    m.candidate
                }
              );

            }

          }


          return;

        }


        /* ==========================================
           CHAT
        ========================================== */

        if(m.type==="chat"){

          const text=
            String(
              m.text||""
            )
            .trim()
            .slice(
              0,
              200
            );


          if(!text){

            return;

          }


          /*
            配信者がブロックしている
            ユーザーのコメントは
            配信者には送らない。
          */

          if(broadcaster){

            const blocked=
              blockedByHost.get(
                broadcaster.id
              );


            if(
              blocked &&
              blocked.has(
                socket.id
              )
            ){

              return;

            }

          }


          broadcast(
            {
              type:"chat",

              userId:
                socket.id,

              name:
                socket.name,

              text:
                text
            }
          );


          return;

        }


        /* ==========================================
           GIFT
        ========================================== */

        if(m.type==="gift"){

          const gift=
            String(
              m.gift||""
            ).slice(
              0,
              50
            );


          if(broadcaster){

            const blocked=
              blockedByHost.get(
                broadcaster.id
              );


            if(
              blocked &&
              blocked.has(
                socket.id
              )
            ){

              return;

            }

          }


          broadcast(
            {
              type:"gift",

              userId:
                socket.id,

              name:
                socket.name,

              gift:
                gift
            }
          );


          return;

        }


        /* ==========================================
           BLOCK USER
        ========================================== */

        if(m.type==="block-user"){

          if(
            socket!==broadcaster
          ){

            return;

          }


          const userId=
            String(
              m.userId||""
            );


          if(
            !userId ||
            userId===socket.id
          ){

            return;

          }


          if(
            !blockedByHost.has(
              socket.id
            )
          ){

            blockedByHost.set(
              socket.id,
              new Set()
            );

          }


          const blocked=
            blockedByHost.get(
              socket.id
            );


          blocked.add(
            userId
          );


          const target=
            viewers.get(
              userId
            );


          if(target){

            wsSend(
              target,
              {
                type:"blocked",

                userId:
                  userId,

                name:
                  target.name
              }
            );

          }


          wsSend(
            socket,
            {
              type:"blocked",

              userId:
                userId,

              name:
                target?.name||
                m.name||
                "ユーザー"
            }
          );


          return;

        }


        /* ==========================================
           UNBLOCK USER
        ========================================== */

        if(m.type==="unblock-user"){

          if(
            socket!==broadcaster
          ){

            return;

          }


          const userId=
            String(
              m.userId||""
            );


          const blocked=
            blockedByHost.get(
              socket.id
            );


          if(blocked){

            blocked.delete(
              userId
            );

          }


          wsSend(
            socket,
            {
              type:"unblocked",

              userId:
                userId
            }
          );


          return;

        }


        /* ==========================================
           GET BLOCK LIST
        ========================================== */

        if(m.type==="get-block-list"){

          if(
            socket!==broadcaster
          ){

            return;

          }


          const blocked=
            blockedByHost.get(
              socket.id
            );


          wsSend(
            socket,
            {
              type:"block-list",

              users:
                blocked
                  ? Array.from(blocked)
                  : []
            }
          );


          return;

        }


        /* ==========================================
           END HOST
        ========================================== */

        if(m.type==="leave-host"){

          if(
            socket===broadcaster
          ){

            endLive();

          }


          return;

        }

      }
    );


    /* ==============================================
       CLOSE
    ============================================== */

    socket.on(
      "close",
      ()=>{

        clients.delete(socket);


        if(
          socket===broadcaster
        ){

          endLive();

        }


        if(
          viewers.delete(
            socket.id
          )
        ){

          broadcast(
            {
              type:"count",

              n:
                viewers.size
            }
          );

        }

      }
    );

  });


/* =====================================================
   END LIVE
===================================================== */

function endLive(){

  if(!broadcaster){

    return;

  }


  const oldHost=
    broadcaster;


  broadcaster=null;

  liveMeta=null;


  viewers.forEach(
    viewer=>{

      wsSend(
        viewer,
        {
          type:"live-ended"
        }
      );

    }
  );


  viewers.clear();


  blockedByHost.delete(
    oldHost.id
  );


  broadcast(
    {
      type:"state",

      live:false,

      meta:null,

      viewers:0
    }
  );

}


/* =====================================================
   START
===================================================== */

server.listen(
  PORT,
  HOST,
  ()=>{

    console.log(
      "================================"
    );

    console.log(
      " VoiceボタLive"
    );

    console.log(
      " LOW LATENCY AUDIO + BLOCK"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "================================"
    );

  }
);
