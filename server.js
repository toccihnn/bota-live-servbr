const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

/*
=========================================================
 VoiceボタLive
 1ファイル版 v0.2
=========================================================

・音声ライブ配信
・WebRTC
・コメント
・視聴者数
・配信タイトル
・配信画像カスタム
・ギフトUI
・ブロック基礎
・黒 × 月光花デザイン
=========================================================
*/


// ======================================================
// HTML
// ======================================================

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

/* =====================================================
   基本
===================================================== */

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;

  background: #000;

  color: #fff;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    sans-serif;
}

body {
  overflow-x: hidden;
}

button,
input {
  font-family: inherit;
}


/* =====================================================
   アプリ
===================================================== */

.app {

  width: 100%;
  max-width: 480px;

  min-height: 100vh;

  margin: 0 auto;

  background:

    radial-gradient(
      circle at 70% 0%,
      rgba(111,70,180,.35),
      transparent 35%
    ),

    radial-gradient(
      circle at 10% 35%,
      rgba(40,80,150,.18),
      transparent 35%
    ),

    linear-gradient(
      180deg,
      #08070d,
      #020204
    );

  position: relative;

  overflow: hidden;
}


/* =====================================================
   ヘッダー
===================================================== */

.header {

  height: 62px;

  padding:
    0 17px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  border-bottom:
    1px solid rgba(255,255,255,.08);

  background:
    rgba(4,3,8,.88);

  backdrop-filter:
    blur(14px);

  position: sticky;

  top: 0;

  z-index: 50;
}


.logo {

  font-size: 21px;

  font-weight: 900;

  letter-spacing: -.8px;
}

.logo .voice {
  color: #fff;
}

.logo .bota {

  color: #df83ff;

  text-shadow:
    0 0 14px
    rgba(223,131,255,.5);
}

.logo .live {

  color: #8cbdff;

  margin-left: 1px;
}


.status {

  font-size: 11px;

  color: #9e94aa;
}


/* =====================================================
   画面
===================================================== */

.screen {

  display: none;

  min-height:
    calc(100vh - 62px);

  padding-bottom: 90px;
}

.screen.active {
  display: block;
}


/* =====================================================
   ホーム
===================================================== */

.homeHero {

  margin: 14px;

  border-radius: 24px;

  overflow: hidden;

  border:
    1px solid rgba(197,145,255,.22);

  background:

    radial-gradient(
      circle at 70% 20%,
      rgba(115,87,190,.35),
      transparent 30%
    ),

    linear-gradient(
      135deg,
      #080711,
      #21102e
    );

  box-shadow:
    0 20px 60px
    rgba(0,0,0,.5);
}


.moonScene {

  height: 245px;

  position: relative;

  overflow: hidden;

  background:

    radial-gradient(
      circle at 72% 27%,
      rgba(235,242,255,.95) 0 7%,
      rgba(169,196,255,.4) 8%,
      transparent 23%
    ),

    radial-gradient(
      ellipse at 70% 35%,
      rgba(108,127,255,.22),
      transparent 50%
    ),

    linear-gradient(
      180deg,
      #09091b,
      #080512 55%,
      #020204
    );
}


.moon {

  position: absolute;

  width: 90px;
  height: 90px;

  right: 68px;
  top: 38px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #fff,
      #dce7ff 48%,
      #9eafff 100%
    );

  box-shadow:
    0 0 35px
    rgba(183,202,255,.75);
}


.flower {

  position: absolute;

  bottom: -4px;

  font-size: 75px;

  opacity: .85;

  filter:
    drop-shadow(
      0 0 12px
      rgba(164,113,255,.5)
    );
}

.flower.left {
  left: 24px;
}

.flower.right {
  right: 20px;
}


.heroText {

  padding: 16px 18px 20px;
}


.heroTitle {

  font-size: 21px;

  font-weight: 900;

  margin-bottom: 5px;
}


.heroSub {

  color: #aaa1b3;

  font-size: 12px;

  margin-bottom: 16px;
}


/* =====================================================
   ボタン
===================================================== */

.btn {

  border: 0;

  border-radius: 14px;

  padding:
    12px 17px;

  color: white;

  font-weight: 800;

  background:

    linear-gradient(
      90deg,
      #54bfff,
      #835bff,
      #e35bca
    );

  box-shadow:
    0 8px 24px
    rgba(132,91,255,.2);

  cursor: pointer;
}


.btn:active {
  transform: scale(.97);
}


.btn.dark {

  background:
    #17121f;

  border:
    1px solid #392a48;

  box-shadow: none;
}


.btn.red {

  background:
    linear-gradient(
      90deg,
      #a72d5f,
      #ef4c77
    );
}


/* =====================================================
   カード
===================================================== */

.card {

  margin:
    12px 14px;

  padding: 15px;

  border-radius: 19px;

  border:
    1px solid rgba(255,255,255,.08);

  background:
    rgba(15,11,22,.9);
}


.cardTitle {

  font-size: 17px;

  font-weight: 900;

  margin-bottom: 12px;
}


/* =====================================================
   ライブカード
===================================================== */

.liveCard {

  display: flex;

  gap: 12px;

  align-items: center;

  padding: 10px;

  border-radius: 15px;

  background:
    rgba(255,255,255,.035);

  margin-bottom: 8px;
}


.liveThumb {

  width: 82px;
  height: 65px;

  flex-shrink: 0;

  border-radius: 12px;

  display: grid;

  place-items: center;

  overflow: hidden;

  background:
    linear-gradient(
      135deg,
      #17132d,
      #40215a
    );
}


.liveThumb img {

  width: 100%;
  height: 100%;

  object-fit: cover;
}


.liveName {

  font-weight: 800;

  font-size: 14px;
}


.liveTitle {

  color: #aaa0b0;

  font-size: 12px;

  margin-top: 4px;
}


/* =====================================================
   入力
===================================================== */

.input {

  width: 100%;

  padding: 13px;

  margin:
    6px 0;

  color: white;

  background:
    #09070d;

  border:
    1px solid #3b2b4a;

  border-radius: 13px;

  outline: none;
}


.input:focus {

  border-color:
    #a46cff;

  box-shadow:
    0 0 0 2px
    rgba(164,108,255,.12);
}


.label {

  display: block;

  color: #aaa1ae;

  font-size: 12px;

  margin-top: 10px;
}


/* =====================================================
   画像プレビュー
===================================================== */

.preview {

  width: 100%;

  height: 190px;

  margin-top: 8px;

  border-radius: 16px;

  overflow: hidden;

  display: grid;

  place-items: center;

  border:
    1px dashed #513b65;

  background:
    #0a0710;

  color: #71677b;

  font-size: 13px;
}


.preview img {

  width: 100%;
  height: 100%;

  object-fit: cover;
}


/* =====================================================
   LIVE画面
===================================================== */

.liveScreen {

  min-height:
    calc(100vh - 62px);

  display: flex;

  flex-direction: column;

  padding-bottom: 72px;
}


.liveCover {

  height: 315px;

  position: relative;

  overflow: hidden;

  background:
    #08070d;
}


.liveCover img {

  width: 100%;
  height: 100%;

  object-fit: cover;

  opacity: .75;
}


.liveCover::after {

  content: "";

  position: absolute;

  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.55),
      transparent 40%,
      rgba(0,0,0,.8)
    );

  pointer-events: none;
}


.liveTop {

  position: absolute;

  top: 14px;

  left: 14px;
  right: 14px;

  z-index: 5;

  display: flex;

  align-items: center;

  justify-content: space-between;
}


.hostInfo {

  display: flex;

  align-items: center;

  gap: 9px;
}


.avatar {

  width: 40px;
  height: 40px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  background:
    linear-gradient(
      135deg,
      #55c9ff,
      #b64cff
    );

  border:
    2px solid
    rgba(255,255,255,.45);
}


.hostName {

  font-size: 14px;

  font-weight: 900;
}


.liveBadge {

  display: inline-block;

  padding:
    4px 7px;

  border-radius: 7px;

  background:
    #e93671;

  font-size: 9px;

  font-weight: 900;

  margin-top: 3px;
}


.viewerBadge {

  padding:
    8px 10px;

  border-radius: 99px;

  background:
    rgba(0,0,0,.5);

  border:
    1px solid
    rgba(255,255,255,.14);

  font-size: 11px;
}


/* =====================================================
   コメント
===================================================== */

.comments {

  flex: 1;

  min-height: 150px;

  max-height: 250px;

  overflow-y: auto;

  padding:
    12px 14px;
}


.comment {

  font-size: 13px;

  margin:
    7px 0;

  text-shadow:
    0 1px 3px #000;
}


.commentName {

  color: #d28cff;

  font-weight: 800;

  margin-right: 5px;
}


/* =====================================================
   チャット
===================================================== */

.chatBar {

  position: fixed;

  bottom: 0;

  left: 50%;

  transform:
    translateX(-50%);

  width: 100%;

  max-width: 480px;

  height: 70px;

  padding:
    10px;

  display: flex;

  gap: 6px;

  align-items: center;

  background:
    rgba(8,6,12,.96);

  backdrop-filter:
    blur(15px);

  border-top:
    1px solid #281c34;

  z-index: 40;
}


.chatInput {

  flex: 1;

  min-width: 0;

  padding:
    12px;

  border-radius: 14px;

  border:
    1px solid #3b2b49;

  background:
    #0c0910;

  color: white;

  outline: none;
}


.iconBtn {

  width: 45px;

  height: 45px;

  border-radius: 13px;

  border:
    1px solid #392a49;

  background:
    #15101c;

  color: white;

  font-size: 19px;
}


/* =====================================================
   ナビ
===================================================== */

.nav {

  position: fixed;

  bottom: 0;

  left: 50%;

  transform:
    translateX(-50%);

  width: 100%;

  max-width: 480px;

  height: 68px;

  background:
    rgba(8,6,12,.96);

  border-top:
    1px solid #281c35;

  display: flex;

  align-items: center;

  justify-content: space-around;

  z-index: 30;
}


.nav button {

  border: 0;

  background: transparent;

  color: #817689;

  font-size: 10px;

  min-width: 70px;
}


.nav button span {

  display: block;

  font-size: 21px;

  margin-bottom: 3px;
}


/* =====================================================
   モーダル
===================================================== */

.modal {

  position: fixed;

  inset: 0;

  display: none;

  align-items: flex-end;

  justify-content: center;

  background:
    rgba(0,0,0,.7);

  z-index: 100;
}


.modal.show {
  display: flex;
}


.sheet {

  width: 100%;

  max-width: 480px;

  padding: 20px;

  border-radius:
    25px 25px 0 0;

  background:
    #120d19;

  border:
    1px solid #443151;
}


.gifts {

  display: grid;

  grid-template-columns:
    repeat(3,1fr);

  gap: 8px;

  margin-top: 15px;
}


.gift {

  padding: 13px;

  border-radius: 15px;

  border:
    1px solid #39294a;

  background:
    #191221;

  color: white;
}


.giftIcon {

  font-size: 27px;

  display: block;

  margin-bottom: 5px;
}


/* =====================================================
   トースト
===================================================== */

.toast {

  position: fixed;

  left: 50%;

  bottom: 88px;

  transform:
    translateX(-50%);

  padding:
    10px 15px;

  border-radius: 99px;

  background:
    #21172c;

  border:
    1px solid #604478;

  font-size: 12px;

  display: none;

  z-index: 200;
}

.toast.show {
  display: block;
}


/* =====================================================
   小画面
===================================================== */

.small {

  font-size: 11px;

  color: #9990a0;
}


.empty {

  padding:
    25px 10px;

  text-align: center;

  color: #77707f;

  font-size: 12px;
}

</style>

</head>


<body>


<div class="app">


<!-- ===================================================
     HEADER
=================================================== -->

<header class="header">

  <div class="logo">

    <span class="voice">Voice</span><span class="bota">ボタ</span><span class="live">Live</span>

  </div>

  <div
    id="status"
    class="status"
  >
    ● 接続中
  </div>

</header>


<!-- ===================================================
     HOME
=================================================== -->

<section
  id="home"
  class="screen active"
>

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
        月光のような夜に、声でつながろう。
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
        現在配信中のライブはありません
      </div>

    </div>

  </div>


</section>


<!-- ===================================================
     配信設定
=================================================== -->

<section
  id="setup"
  class="screen"
>

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
      配信中に表示する画像
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


<!-- ===================================================
     PROFILE
=================================================== -->

<section
  id="profile"
  class="screen"
>

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


  <div class="card">

    <div class="cardTitle">
      🛡️ 安全・コミュニティ
    </div>

    <div class="small">

      ブロック・通報<br>
      ファミリー<br>
      カラオケ<br>
      ギフト<br>
      報酬・出金

      <br><br>

      今後順次実装します。

    </div>

  </div>

</section>


<!-- ===================================================
     LIVE
=================================================== -->

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
      id="hostEndButton"
      class="iconBtn"
      onclick="stopBroadcast()"
      style="display:none"
    >
      ×
    </button>

  </div>

</section>


<!-- ===================================================
     NAV
=================================================== -->

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


<!-- ===================================================
     GIFT MODAL
=================================================== -->

<div
  id="giftModal"
  class="modal"
>

  <div class="sheet">

    <div
      style="
      display:flex;
      justify-content:space-between;
      align-items:center;
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

        <span class="giftIcon">
          🌙
        </span>

        月光花

      </button>


      <button
        class="gift"
        onclick="sendGift('💜 ハート')"
      >

        <span class="giftIcon">
          💜
        </span>

        ハート

      </button>


      <button
        class="gift"
        onclick="sendGift('✨ 星の雫')"
      >

        <span class="giftIcon">
          ✨
        </span>

        星の雫

      </button>


    </div>

  </div>

</div>


<!-- ===================================================
     TOAST
=================================================== -->

<div
  id="toast"
  class="toast"
></div>


<!-- ===================================================
     JAVASCRIPT
=================================================== -->

<script>


// =====================================================
// グローバル
// =====================================================

let socket = null;

let role = null;

let localStream = null;

let customImage = "";

let viewerPeers = new Map();

let viewerPeer = null;

let currentLive = false;


// WebRTC
const rtcConfig = {

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

};


// =====================================================
// DOM
// =====================================================

function $(id) {

  return document.getElementById(id);

}


// =====================================================
// 画面切り替え
// =====================================================

function showScreen(id) {

  document
    .querySelectorAll(".screen")
    .forEach(
      screen => {

        screen.classList.remove(
          "active"
        );

      }
    );


  const target =
    $(id);

  if (target) {

    target.classList.add(
      "active"
    );

  }

}


// =====================================================
// 配信準備
// =====================================================

function openHost() {

  if (
    role === "host"
  ) {

    showScreen("live");

    return;

  }

  showScreen("setup");

}


// =====================================================
// WebSocket
// =====================================================

function connectSocket() {

  if (
    socket &&
    (
      socket.readyState ===
      WebSocket.OPEN ||
      socket.readyState ===
      WebSocket.CONNECTING
    )
  ) {

    return;

  }


  const protocol =
    location.protocol ===
    "https:"
      ? "wss"
      : "ws";


  socket =
    new WebSocket(
      protocol +
      "://" +
      location.host
    );


  socket.onopen = () => {

    $("status").textContent =
      "● 接続済み";

  };


  socket.onclose = () => {

    $("status").textContent =
      "● 切断";

  };


  socket.onerror = () => {

    $("status").textContent =
      "● 接続エラー";

  };


  socket.onmessage =
    event => {

      try {

        const message =
          JSON.parse(
            event.data
          );

        handleMessage(
          message
        );

      }

      catch (error) {

        console.error(
          error
        );

      }

    };

}


// =====================================================
// 送信
// =====================================================

function send(data) {

  if (
    socket &&
    socket.readyState ===
    WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

  }

}


// =====================================================
// WebSocket受信
// =====================================================

function handleMessage(m) {


  // -----------------------------------------------
  // 配信者準備完了
  // -----------------------------------------------

  if (
    m.type ===
    "host-ready"
  ) {

    $("status").textContent =
      "● LIVE";

  }


  // -----------------------------------------------
  // 視聴者が入った
  // -----------------------------------------------

  if (
    m.type ===
    "viewer"
  ) {

    if (
      role === "host"
    ) {

      createOffer(
        m.id
      );

    }

  }


  // -----------------------------------------------
  // Offer
  // -----------------------------------------------

  if (
    m.type ===
    "offer"
  ) {

    receiveOffer(
      m
    );

  }


  // -----------------------------------------------
  // Answer
  // -----------------------------------------------

  if (
    m.type ===
    "answer"
  ) {

    const peer =
      viewerPeers.get(
        m.from
      );


    if (
      peer
    ) {

      peer
        .setRemoteDescription(
          m.sdp
        )
        .catch(
          console.error
        );

    }

  }


  // -----------------------------------------------
  // ICE
  // -----------------------------------------------

  if (
    m.type ===
    "ice"
  ) {

    let peer = null;


    if (
      role === "host"
    ) {

      peer =
        viewerPeers.get(
          m.from
        );

    }

    else {

      peer =
        viewerPeer;

    }


    if (
      peer &&
      m.candidate
    ) {

      peer
        .addIceCandidate(
          m.candidate
        )
        .catch(
          () => {}
        );

    }

  }


  // -----------------------------------------------
  // 配信情報
  // -----------------------------------------------

  if (
    m.type ===
    "meta"
  ) {

    currentLive = true;


    $("liveName")
      .textContent =
      m.data.name ||
      "配信者";


    if (
      m.data.image
    ) {

      $("liveImage").src =
        m.data.image;

      $("liveImage").style.display =
        "block";

    }

    else {

      $("liveImage").style.display =
        "none";

    }


    showScreen(
      "live"
    );

  }


  // -----------------------------------------------
  // コメント
  // -----------------------------------------------

  if (
    m.type ===
    "chat"
  ) {

    addComment(
      m.name,
      m.text
    );

  }


  // -----------------------------------------------
  // 視聴者数
  // -----------------------------------------------

  if (
    m.type ===
    "count"
  ) {

    $("viewerCount")
      .textContent =
      m.n;

  }


  // -----------------------------------------------
  // 配信終了
  // -----------------------------------------------

  if (
    m.type ===
    "live" &&
    m.on === false
  ) {

    currentLive = false;


    if (
      role !== "host"
    ) {

      showScreen(
        "home"
      );

      showToast(
        "配信が終了しました"
      );

    }

  }


  // -----------------------------------------------
  // エラー
  // -----------------------------------------------

  if (
    m.type ===
    "error"
  ) {

    alert(
      m.text ||
      "エラーが発生しました"
    );

  }


  // -----------------------------------------------
  // ブロック
  // -----------------------------------------------

  if (
    m.type ===
    "blocked"
  ) {

    alert(
      "配信者によってブロックされました"
    );

    showScreen(
      "home"
    );

  }

}


// =====================================================
// 配信開始
// =====================================================

async function startBroadcast() {


  if (
    role === "host"
  ) {

    showScreen(
      "live"
    );

    return;

  }


  // -----------------------------------------------
  // マイク
  // -----------------------------------------------

  try {

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

  }

  catch (error) {

    console.error(
      error
    );

    alert(
      "マイクを使用できませんでした。\\n\\nブラウザのマイク許可を確認してください。"
    );

    return;

  }


  role =
    "host";


  connectSocket();


  const name =
    (
      $("hostName")
        .value ||
      "ぼたもち"
    )
    .trim();


  const title =
    (
      $("liveTitle")
        .value ||
      "月光の夜に雑談しよ🌙"
    )
    .trim();


  $("profileName")
    .textContent =
    name;


  $("liveName")
    .textContent =
    name;


  $("hostEndButton")
    .style.display =
    "block";


  send({

    type:
      "join",

    role:
      "host",

    name:
      name

  });


  // 少し待ってから配信情報
  setTimeout(
    () => {

      send({

        type:
          "meta",

        title:
          title,

        name:
          name,

        image:
          customImage

      });

    },
    200
  );


  showScreen(
    "live"
  );


  $("status").textContent =
    "● LIVE";

}


// =====================================================
// Offer作成
// =====================================================

async function createOffer(
  viewerId
) {

  if (
    !localStream
  ) {

    return;

  }


  const peer =
    new RTCPeerConnection(
      rtcConfig
    );


  viewerPeers.set(
    viewerId,
    peer
  );


  localStream
    .getTracks()
    .forEach(
      track => {

        peer.addTrack(
          track,
          localStream
        );

      }
    );


  peer.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        send({

          type:
            "ice",

          to:
            viewerId,

          candidate:
            event.candidate

        });

      }

    };


  peer.onconnectionstatechange =
    () => {

      if (
        [
          "failed",
          "closed",
          "disconnected"
        ]
        .includes(
          peer.connectionState
        )
      ) {

        peer.close();

        viewerPeers.delete(
          viewerId
        );

      }

    };


  try {

    const offer =
      await peer
        .createOffer({

          offerToReceiveAudio:
            false,

          offerToReceiveVideo:
            false

        });


    await peer
      .setLocalDescription(
        offer
      );


    send({

      type:
        "offer",

      to:
        viewerId,

      sdp:
        peer.localDescription

    });

  }

  catch (error) {

    console.error(
      "offer error",
      error
    );

  }

}


// =====================================================
// Viewer Offer受信
// =====================================================

async function receiveOffer(
  m
) {


  if (
    viewerPeer
  ) {

    viewerPeer.close();

  }


  viewerPeer =
    new RTCPeerConnection(
      rtcConfig
    );


  viewerPeer.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        send({

          type:
            "ice",

          candidate:
            event.candidate

        });

      }

    };


  viewerPeer.ontrack =
    event => {

      let audio =
        $("remoteAudio");


      if (
        !audio
      ) {

        audio =
          document.createElement(
            "audio"
          );

        audio.id =
          "remoteAudio";

        audio.autoplay =
          true;

        audio.playsInline =
          true;

        audio.controls =
          false;

        audio.style.display =
          "none";

        document.body
          .appendChild(
            audio
          );

      }


      audio.srcObject =
        event.streams[0];


      audio.muted =
        false;


      const playPromise =
        audio.play();


      if (
        playPromise
      ) {

        playPromise
          .catch(
            () => {

              // Android Chrome等で
              // ユーザー操作が必要な場合
              showToast(
                "画面をタップすると音声が再生されます"
              );

              document.body
                .addEventListener(
                  "click",
                  () => {

                    audio
                      .play()
                      .catch(
                        () => {}
                      );

                  },
                  {
                    once:
                      true
                  }
                );

            }
          );

      }

    };


  viewerPeer.onconnectionstatechange =
    () => {

      if (
        viewerPeer
          .connectionState ===
        "connected"
      ) {

        showToast(
          "音声に接続しました"
        );

      }

    };


  try {

    await viewerPeer
      .setRemoteDescription(
        m.sdp
      );


    const answer =
      await viewerPeer
        .createAnswer();


    await viewerPeer
      .setLocalDescription(
        answer
      );


    send({

      type:
        "answer",

      sdp:
        viewerPeer.localDescription

    });

  }

  catch (error) {

    console.error(
      "answer error",
      error
    );

  }

}


// =====================================================
// 配信終了
// =====================================================

function stopBroadcast() {


  if (
    role !== "host"
  ) {

    showScreen(
      "home"
    );

    return;

  }


  send({

    type:
      "leave"

  });


  if (
    localStream
  ) {

    localStream
      .getTracks()
      .forEach(
        track => {

          track.stop();

        }
      );

    localStream =
      null;

  }


  viewerPeers.forEach(
    peer => {

      peer.close();

    }
  );


  viewerPeers.clear();


  role =
    null;


  currentLive =
    false;


  $("hostEndButton")
    .style.display =
    "none";


  $("status")
    .textContent =
    "● 接続済み";


  showScreen(
    "home"
  );

}


// =====================================================
// コメント送信
// =====================================================

function sendChat() {

  const input =
    $("chatInput");


  const text =
    input.value.trim();


  if (
    !text
  ) {

    return;

  }


  send({

    type:
      "chat",

    text:
      text

  });


  input.value =
    "";

}


// Enter
$("chatInput")
  .addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        sendChat();

      }

    }
  );


// =====================================================
// コメント表示
// =====================================================

function addComment(
  name,
  text
) {

  const box =
    $("comments");


  const div =
    document.createElement(
      "div"
    );


  div.className =
    "comment";


  const nameSpan =
    document.createElement(
      "span"
    );


  nameSpan.className =
    "commentName";


  nameSpan.textContent =
    name +
    "：";


  const textSpan =
    document.createElement(
      "span"
    );


  textSpan.textContent =
    text;


  div.appendChild(
    nameSpan
  );


  div.appendChild(
    textSpan
  );


  box.appendChild(
    div
  );


  box.scrollTop =
    box.scrollHeight;

}


// =====================================================
// 画像選択
// =====================================================

$("imageFile")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target.files[0];


      if (
        !file
      ) {

        return;

      }


      if (
        file.size >
        3 * 1024 * 1024
      ) {

        alert(
          "画像は3MB以下にしてください。"
        );

        event.target.value =
          "";

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        () => {

          customImage =
            reader.result;


          $("preview")
            .innerHTML =
            "";


          const image =
            document
              .createElement(
                "img"
              );


          image.src =
            customImage;


          $("preview")
            .appendChild(
              image
            );

        };


      reader.readAsDataURL(
        file
      );

    }
  );


// =====================================================
// ギフト
// =====================================================

function openGifts() {

  $("giftModal")
    .classList.add(
      "show"
    );

}


function closeGifts() {

  $("giftModal")
    .classList.remove(
      "show"
    );

}


function sendGift(
  gift
) {

  closeGifts();


  send({

    type:
      "gift",

    gift:
      gift

  });


  showToast(
    gift +
    " を送りました 🎁"
  );

}


// =====================================================
// トースト
// =====================================================

let toastTimer =
  null;


function showToast(
  text
) {

  const toast =
    $("toast");


  toast.textContent =
    text;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


// =====================================================
// 初期接続
// =====================================================

connectSocket();

</script>

</body>

</html>

`;


// ======================================================
// HTTP SERVER
// ======================================================

const server =
  http.createServer(
    (req, res) => {

      if (
        req.url === "/" ||
        req.url.startsWith("/")
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8",

            "Cache-Control":
              "no-cache"
          }
        );

        res.end(
          HTML
        );

        return;

      }

      res.writeHead(
        404
      );

      res.end(
        "Not Found"
      );

    }
  );


// ======================================================
// WebSocket
// ======================================================

const wss =
  new WebSocket.Server({
    server
  });


let broadcaster =
  null;


const viewers =
  new Map();


const clients =
  new Set();


function send(
  socket,
  data
) {

  if (
    socket &&
    socket.readyState ===
    WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(
        data
      )
    );

  }

}


function broadcast(
  data,
  except = null
) {

  clients.forEach(
    client => {

      if (
        client !==
        except
      ) {

        send(
          client,
          data
        );

      }

    }
  );

}


// ======================================================
// 接続
// ======================================================

wss.on(
  "connection",
  socket => {


    clients.add(
      socket
    );


    socket.id =
      Math.random()
        .toString(36)
        .substring(2) +
      Date.now()
        .toString(36);


    socket.role =
      "unknown";


    socket.name =
      "ゲスト";


    send(
      socket,
      {

        type:
          "state",

        live:
          !!broadcaster,

        viewers:
          viewers.size

      }
    );


    // ==================================================
    // MESSAGE
    // ==================================================

    socket.on(
      "message",
      raw => {

        let message;


        try {

          message =
            JSON.parse(
              raw.toString()
            );

        }

        catch {

          return;

        }


        // ==============================================
        // JOIN
        // ==============================================

        if (
          message.type ===
          "join"
        ) {


          socket.role =
            message.role ===
            "host"
              ? "host"
              : "viewer";


          socket.name =
            String(
              message.name ||
              "ゲスト"
            ).substring(
              0,
              30
            );


          // --------------------------------------------
          // HOST
          // --------------------------------------------

          if (
            socket.role ===
            "host"
          ) {


            if (
              broadcaster &&
              broadcaster !==
              socket
            ) {

              send(
                socket,
                {

                  type:
                    "error",

                  text:
                    "すでに配信中の配信者がいます。"

                }
              );

              return;

            }


            broadcaster =
              socket;


            send(
              socket,
              {

                type:
                  "host-ready"

              }
            );


            broadcast(
              {

                type:
                  "live",

                on:
                  true

              },

              socket
            );


            return;

          }


          // --------------------------------------------
          // VIEWER
          // --------------------------------------------

          viewers.set(
            socket.id,
            socket
          );


          send(
            socket,
            {

              type:
                "live",

              on:
                !!broadcaster,

              viewers:
                viewers.size

            }
          );


          if (
            broadcaster
          ) {

            send(
              broadcaster,
              {

                type:
                  "viewer",

                id:
                  socket.id

              }
            );

          }


          broadcast(
            {

              type:
                "count",

              n:
                viewers.size

            }
          );


          return;

        }


        // ==============================================
        // OFFER
        // ==============================================

        if (
          message.type ===
          "offer"
        ) {

          if (
            socket !==
            broadcaster
          ) {

            return;

          }


          const viewer =
            viewers.get(
              message.to
            );


          if (
            viewer
          ) {

            send(
              viewer,
              {

                type:
                  "offer",

                sdp:
                  message.sdp

              }
            );

          }


          return;

        }


        // ==============================================
        // ANSWER
        // ==============================================

        if (
          message.type ===
          "answer"
        ) {

          if (
            !broadcaster
          ) {

            return;

          }


          send(
            broadcaster,
            {

              type:
                "answer",

              from:
                socket.id,

              sdp:
                message.sdp

            }
          );


          return;

        }


        // ==============================================
        // ICE
        // ==============================================

        if (
          message.type ===
          "ice"
        ) {


          if (
            socket ===
            broadcaster
          ) {


            const viewer =
              viewers.get(
                message.to
              );


            if (
              viewer
            ) {

              send(
                viewer,
                {

                  type:
                    "ice",

                  from:
                    "host",

                  candidate:
                    message.candidate

                }
              );

            }


          }

          else {


            if (
              broadcaster
            ) {

              send(
                broadcaster,
                {

                  type:
                    "ice",

                  from:
                    socket.id,

                  candidate:
                    message.candidate

                }
              );

            }

          }


          return;

        }


        // ==============================================
        // META
        // ==============================================

        if (
          message.type ===
          "meta"
        ) {


          if (
            socket !==
            broadcaster
          ) {

            return;

          }


          const data = {

            title:
              String(
                message.title ||
                "雑談"
              ).substring(
                0,
                80
              ),

            name:
              socket.name,

            image:
              typeof message.image ===
              "string"
                ? message.image.substring(
                    0,
                    900000
                  )
                : ""

          };


          broadcast(
            {

              type:
                "meta",

              data:
                data

            }
          );


          return;

        }


        // ==============================================
        // CHAT
        // ==============================================

        if (
          message.type ===
          "chat"
        ) {


          const text =
            String(
              message.text ||
              ""
            )
            .trim()
            .substring(
              0,
              200
            );


          if (
            !text
          ) {

            return;

          }


          broadcast(
            {

              type:
                "chat",

              name:
                socket.name,

              text:
                text,

              time:
                Date.now()

            }
          );


          return;

        }


        // ==============================================
        // GIFT
        // ==============================================

        if (
          message.type ===
          "gift"
        ) {


          const gift =
            String(
              message.gift ||
              ""
            )
            .substring(
              0,
              50
            );


          broadcast(
            {

              type:
                "chat",

              name:
                socket.name,

              text:
                "🎁 " +
                gift

            }
          );


          return;

        }


        // ==============================================
        // BLOCK
        // ==============================================

        if (
          message.type ===
          "block"
        ) {


          if (
            socket !==
            broadcaster
          ) {

            return;

          }


          const target =
            [...viewers.values()]
              .find(
                viewer =>
                  viewer.name ===
                  message.target
              );


          if (
            target
          ) {

            send(
              target,
              {

                type:
                  "blocked"

              }
            );

          }


          return;

        }


        // ==============================================
        // LEAVE
        // ==============================================

        if (
          message.type ===
          "leave"
        ) {

          socket.close();

        }

      }
    );


    // ==================================================
    // CLOSE
    // ==================================================

    socket.on(
      "close",
      () => {


        clients.delete(
          socket
        );


        // ----------------------------------------------
        // 配信者終了
        // ----------------------------------------------

        if (
          socket ===
          broadcaster
        ) {

          broadcaster =
            null;


          broadcast(
            {

              type:
                "live",

              on:
                false

            }
          );

        }


        // ----------------------------------------------
        // 視聴者終了
        // ----------------------------------------------

        if (
          viewers.delete(
            socket.id
          )
        ) {


          if (
            broadcaster
          ) {

            send(
              broadcaster,
              {

                type:
                  "viewer-left",

                id:
                  socket.id

              }
            );

          }


          broadcast(
            {

              type:
                "count",

              n:
                viewers.size

            }
          );

        }

      }
    );

  }
);


// ======================================================
// START
// ======================================================

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "===================================="
    );

    console.log(
      " VoiceボタLive START"
    );

    console.log(
      " PORT:",
      PORT
    );

    console.log(
      "===================================="
    );

  }
);
