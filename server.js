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
   LIVE STATE
===================================================== */

let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  startedAt: null
};

const clients = new Set();

/* =====================================================
   HTML
===================================================== */

const HTML = `<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<meta
  name="theme-color"
  content="#030510"
>

<title>VoiceポタLive</title>

<style>

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
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
    "Noto Sans JP",
    "Yu Gothic",
    sans-serif;
}

body {
  padding-bottom: 90px;
}

button,
input {
  font: inherit;
}

/* =====================================================
   HEADER
===================================================== */

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  height: 58px;

  z-index: 1000;

  display: flex;
  align-items: center;

  padding: 0 18px;

  background:
    rgba(3,5,16,.92);

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid rgba(120,140,255,.14);
}

.logo {
  font-size: 19px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #8bd8ff,
      #d08cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}

/* =====================================================
   HERO
===================================================== */

.hero {
  margin-top: 58px;
  background: #030510;
}

.hero-image-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.hero-image {
  display: block;
  width: 100%;
  height: auto;
}

.hero-gradient {
  position: absolute;

  left: 0;
  right: 0;
  bottom: 0;

  height: 55%;

  background:
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,.85) 20%,
      rgba(3,5,16,.1) 75%,
      transparent 100%
    );

  pointer-events: none;
}

.hero-content {
  margin-top: -28px;

  position: relative;
  z-index: 2;

  padding:
    0
    18px
    26px;

  background:
    linear-gradient(
      180deg,
      transparent,
      #030510 30px
    );
}

.hero-small {
  font-size: 13px;
  font-weight: 800;
  color: #b7caff;
}

.hero-title {
  font-size: 42px;
  line-height: 1.12;
  margin: 12px 0 24px;
}

.hero-title span {
  color: #dce8ff;
}

.hero-description {
  font-size: 15px;
  line-height: 1.9;
  color: #c8d0e6;
}

/* =====================================================
   LIVE
===================================================== */

.section {
  padding: 0 18px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin:
    12px
    0
    16px;
}

.section-title h2 {
  font-size: 27px;
  margin: 0;
}

.realtime {
  font-size: 12px;
  color: #6e7b9e;
  letter-spacing: 2px;
}

.live-list {
  min-height: 110px;

  border:
    1px solid
    rgba(100,120,255,.15);

  border-radius: 26px;

  background: #080c20;

  padding: 18px;
}

.empty {
  text-align: center;

  color: #7885a8;

  padding:
    28px
    8px;
}

.live-card {
  display: flex;

  align-items: center;

  gap: 14px;

  padding: 14px;

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      #101638,
      #090d20
    );

  cursor: pointer;
}

.live-avatar {
  width: 56px;
  height: 56px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  background:
    linear-gradient(
      145deg,
      #39d9ff,
      #5467ff,
      #be4cff
    );

  font-size: 25px;
}

.live-info {
  min-width: 0;
}

.live-name {
  font-size: 16px;
  font-weight: 800;
}

.live-title {
  font-size: 13px;
  color: #aeb8d3;

  margin-top: 4px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-badge {
  display: inline-block;

  margin-top: 7px;

  padding:
    3px
    8px;

  border-radius: 8px;

  background: #e53935;

  font-size: 10px;
  font-weight: 900;
}

/* =====================================================
   FEATURES
===================================================== */

.features {
  display: grid;

  grid-template-columns:
    1fr
    1fr;

  gap: 14px;

  margin-top: 18px;
}

.feature {
  padding: 20px;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      #11183d,
      #090d22
    );

  border:
    1px solid
    rgba(100,120,255,.13);
}

.feature-icon {
  font-size: 30px;
}

.feature h3 {
  font-size: 16px;
  margin: 10px 0 0;
}

.feature p {
  font-size: 12px;

  color: #8e9abb;

  line-height: 1.6;
}

/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {
  position: fixed;

  bottom: 0;
  left: 0;
  right: 0;

  height: 78px;

  z-index: 2000;

  display: grid;

  grid-template-columns:
    1fr
    1fr
    1fr
    1fr
    1fr;

  padding:
    7px
    7px
    calc(
      7px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.97);

  backdrop-filter:
    blur(20px);

  border-top:
    1px solid
    rgba(120,140,255,.12);
}

.nav-item {
  border: 0;

  background: transparent;

  color: #697496;

  font-size: 10px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;

  cursor: pointer;
}

.nav-item.active {
  color: #bcd2ff;
}

.nav-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-live {
  width: 54px;
  height: 54px;

  margin-top: -22px;

  border-radius: 50%;

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 25px;

  background:
    linear-gradient(
      145deg,
      #39d9ff,
      #5467ff,
      #be4cff
    );

  border:
    3px solid
    #080b20;

  box-shadow:
    0 0 28px
    rgba(80,110,255,.7);
}

/* =====================================================
   LIVE PANEL
===================================================== */

.overlay {
  position: fixed;

  inset: 0;

  z-index: 3000;

  background:
    rgba(0,0,0,.65);

  display: none;

  align-items: flex-end;
}

.sheet {
  width: 100%;

  background: #0a0e25;

  border-radius:
    28px
    28px
    0
    0;

  padding:
    22px
    18px
    calc(
      25px +
      env(safe-area-inset-bottom)
    );

  border-top:
    1px solid
    rgba(140,160,255,.2);

  box-shadow:
    0 -10px 50px
    rgba(0,0,0,.4);
}

.sheet h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.status {
  color: #9fafd4;

  font-size: 13px;

  min-height: 22px;

  margin:
    8px
    0
    16px;
}

.field {
  width: 100%;

  padding: 15px;

  border-radius: 15px;

  border:
    1px solid
    #27305a;

  background: #050819;

  color: #fff;

  outline: none;

  margin-bottom: 12px;
}

.primary,
.secondary {
  width: 100%;

  padding: 15px;

  border: 0;

  border-radius: 16px;

  font-weight: 900;

  margin-top: 8px;
}

.primary {
  background:
    linear-gradient(
      90deg,
      #39d9ff,
      #7b5cff,
      #be4cff
    );

  color: #fff;
}

.secondary {
  background: #171d3b;
  color: #bfc8e2;
}

.danger {
  background: #c9344c;
  color: #fff;
}

/* =====================================================
   TOAST
===================================================== */

.toast {
  position: fixed;

  left: 50%;

  bottom: 92px;

  transform:
    translateX(-50%);

  z-index: 4000;

  background: #111831;

  color: #fff;

  padding:
    12px
    18px;

  border-radius: 14px;

  border:
    1px solid
    rgba(130,150,255,.3);

  display: none;

  white-space: nowrap;

  box-shadow:
    0 8px 30px
    rgba(0,0,0,.35);
}

@media (min-width:700px) {

  .hero-image-wrap,
  .hero-content,
  .section {
    max-width: 1000px;

    margin-left: auto;
    margin-right: auto;
  }

  .features {
    grid-template-columns:
      repeat(4,1fr);
  }

}

</style>

</head>

<body>

<!-- =====================================================
     HEADER
===================================================== -->

<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


<!-- =====================================================
     HERO
===================================================== -->

<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="VoiceポタLive"
    >

    <div class="hero-gradient"></div>

  </div>


  <div class="hero-content">

    <div class="hero-small">
      声でつながる、みんなの居場所。
    </div>

    <h1 class="hero-title">

      <span>
        あなたの声が、
      </span>

      <br>

      誰かの夜を照らす。

    </h1>

    <div class="hero-description">

      月明かりの下で、話して、聴いて、笑って。<br>

      VoiceポタLiveで、あなたの声をもっと近くに。

    </div>

  </div>

</section>


<!-- =====================================================
     LIVE LIST
===================================================== -->

<section class="section">

  <div class="section-title">

    <h2>
      🔴 ライブ中
    </h2>

    <div class="realtime">
      REAL TIME
    </div>

  </div>


  <div
    id="liveList"
    class="live-list"
  >

    <div class="empty">
      現在配信中のライブはありません
    </div>

  </div>


  <h2 style="margin-top:34px">
    VoiceポタLive
  </h2>


  <div class="features">

    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <h3>
        高音質の音声配信
      </h3>

      <p>
        声だけで気軽にライブを楽しめます。
      </p>

    </div>


    <div class="feature">

      <div class="feature-icon">
        ⚡
      </div>

      <h3>
        低遅延でリアルタイム
      </h3>

      <p>
        配信者とリスナーをリアルタイムにつなぎます。
      </p>

    </div>


    <div class="feature">

      <div class="feature-icon">
        💬
      </div>

      <h3>
        みんなの居場所
      </h3>

      <p>
        話して、聴いて、笑える場所を目指します。
      </p>

    </div>


    <div class="feature">

      <div class="feature-icon">
        🌙
      </div>

      <h3>
        夜の音声ライブ
      </h3>

      <p>
        いつでも声でつながれます。
      </p>

    </div>

  </div>

</section>


<!-- =====================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    type="button"
    class="nav-item active"
    onclick="homeAction()"
  >

    <div class="nav-icon">
      ⌂
    </div>

    <div>
      ホーム
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="searchAction()"
  >

    <div class="nav-icon">
      ⌕
    </div>

    <div>
      探す
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="startLive()"
  >

    <div class="nav-live">
      🎙️
    </div>

    <div>
      配信
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="alert('お知らせは準備中です')"
  >

    <div class="nav-icon">
      ♧
    </div>

    <div>
      お知らせ
    </div>

  </button>


  <button
    type="button"
    class="nav-item"
    onclick="alert('マイページは準備中です')"
  >

    <div class="nav-icon">
      ♙
    </div>

    <div>
      マイページ
    </div>

  </button>

</nav>


<!-- =====================================================
     TOAST
===================================================== -->

<div
  id="toast"
  class="toast"
></div>


<!-- =====================================================
     LIVE PANEL
===================================================== -->

<div
  id="liveOverlay"
  class="overlay"
>

  <div class="sheet">

    <h2>
      🎙️ 配信する
    </h2>


    <div
      id="panelStatus"
      class="status"
    >
      配信ボタンが反応しました。
    </div>


    <input
      id="nameInput"
      class="field"
      maxlength="30"
      placeholder="配信者名"
      value="ぼたもち"
    >


    <input
      id="titleInput"
      class="field"
      maxlength="60"
      placeholder="配信タイトル"
      value="VoiceポタLive 配信中"
    >


    <button
      id="startMicButton"
      type="button"
      class="primary"
      onclick="requestMicrophoneAndStart()"
    >

      🎙️ マイクを許可して配信開始

    </button>


    <button
      id="stopLiveButton"
      type="button"
      class="primary danger"
      style="display:none"
      onclick="stopLive()"
    >

      ⏹ 配信を終了する

    </button>


    <button
      type="button"
      class="secondary"
      onclick="closePanel()"
    >

      閉じる

    </button>

  </div>

</div>


<audio
  id="remoteAudio"
  autoplay
  playsinline
></audio>


<script>

(function() {

  "use strict";


  /* =====================================================
     GLOBAL
  ===================================================== */

  var ws = null;

  var myId =
    "client-" +
    Math.random()
      .toString(36)
      .slice(2) +
    Date.now();

  var pendingMessages = [];

  var connected = false;

  var isBroadcaster = false;

  var localStream = null;

  var viewerPeer = null;

  var broadcasterPeer = null;

  var currentLiveId = null;

  var reconnectTimer = null;


  var iceServers = [

    {
      urls:
        "stun:stun.l.google.com:19302"
    },

    {
      urls:
        "stun:stun1.l.google.com:19302"
    }

  ];


  /* =====================================================
     HOME
  ===================================================== */

  window.homeAction =
    function() {

      window.scrollTo(
        {
          top: 0,
          behavior: "smooth"
        }
      );

    };


  /* =====================================================
     SEARCH
  ===================================================== */

  window.searchAction =
    function() {

      document
        .getElementById(
          "liveList"
        )
        .scrollIntoView(
          {
            behavior: "smooth"
          }
        );

    };


  /* =====================================================
     TOAST
  ===================================================== */

  function showToast(message) {

    var el =
      document.getElementById(
        "toast"
      );

    el.textContent =
      message;

    el.style.display =
      "block";

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        function() {

          el.style.display =
            "none";

        },
        2200
      );

  }


  /* =====================================================
     PANEL STATUS
  ===================================================== */

  function setPanelStatus(message) {

    document
      .getElementById(
        "panelStatus"
      )
      .textContent =
      message;

  }


  /* =====================================================
     OPEN PANEL
  ===================================================== */

  window.openPanel =
    function() {

      document
        .getElementById(
          "liveOverlay"
        )
        .style.display =
        "flex";

    };


  /* =====================================================
     CLOSE PANEL
  ===================================================== */

  window.closePanel =
    function() {

      if (!isBroadcaster) {

        document
          .getElementById(
            "liveOverlay"
          )
          .style.display =
          "none";

      }

    };


  /* =====================================================
     SEND MESSAGE
  ===================================================== */

  function sendMessage(data) {

    if (
      ws &&
      ws.readyState === 1
    ) {

      ws.send(
        JSON.stringify(data)
      );

    }

    else {

      pendingMessages.push(
        data
      );

      showToast(
        "サーバーへ接続中です…"
      );

    }

  }


  /* =====================================================
     WEBSOCKET
  ===================================================== */

  function connectSocket() {

    var protocol =
      location.protocol === "https:"
        ? "wss://"
        : "ws://";


    try {

      ws =
        new WebSocket(
          protocol +
          location.host
        );

    }

    catch (error) {

      setTimeout(
        connectSocket,
        3000
      );

      return;

    }


    ws.onopen =
      function() {

        connected =
          true;

        showToast(
          "サーバーに接続しました"
        );


        while (
          pendingMessages.length
        ) {

          ws.send(
            JSON.stringify(
              pendingMessages.shift()
            )
          );

        }


        sendMessage(
          {
            type:
              "get_live_list",

            clientId:
              myId
          }
        );

      };


    ws.onmessage =
      function(event) {

        var data;

        try {

          data =
            JSON.parse(
              event.data
            );

        }

        catch (error) {

          return;

        }


        handleMessage(
          data
        );

      };


    ws.onclose =
      function() {

        connected =
          false;


        if (!isBroadcaster) {

          setPanelStatus(
            "サーバーとの接続が切れました。再接続中…"
          );

        }


        clearTimeout(
          reconnectTimer
        );


        reconnectTimer =
          setTimeout(
            connectSocket,
            3000
          );

      };


    ws.onerror =
      function() {

        connected =
          false;

      };

  }


  /* =====================================================
     ESCAPE HTML
  ===================================================== */

  function escapeHtml(value) {

    return String(
      value == null
        ? ""
        : value
    )

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


  /* =====================================================
     LIVE LIST
  ===================================================== */

  function renderLiveList(lives) {

    var list =
      document.getElementById(
        "liveList"
      );


    if (
      !lives ||
      !lives.length
    ) {

      list.innerHTML =
        "<div class='empty'>" +
        "現在配信中のライブはありません" +
        "</div>";

      return;

    }


    var html =
      "";


    lives.forEach(
      function(live) {

        html +=
          "<div " +
          "class='live-card' " +
          "data-live-id='" +
          escapeHtml(
            live.id
          ) +
          "'>";


        html +=
          "<div class='live-avatar'>" +
          "🎙️" +
          "</div>";


        html +=
          "<div class='live-info'>";


        html +=
          "<div class='live-name'>" +
          escapeHtml(
            live.name ||
            "Voice配信者"
          ) +
          "</div>";


        html +=
          "<div class='live-title'>" +
          escapeHtml(
            live.title ||
            "音声ライブ配信中"
          ) +
          "</div>";


        html +=
          "<span class='live-badge'>" +
          "LIVE" +
          "</span>";


        html +=
          "</div>";


        html +=
          "</div>";

      }
    );


    list.innerHTML =
      html;


    Array.prototype.forEach.call(

      list.querySelectorAll(
        ".live-card"
      ),

      function(card) {

        card.addEventListener(
          "click",

          function() {

            listenLive(
              card.getAttribute(
                "data-live-id"
              )
            );

          }
        );

      }

    );

  }


  /* =====================================================
     配信ボタン
===================================================== */

  window.startLive =
    function() {

      /*
       * ここで必ず反応を表示
       */

      showToast(
        "🎙️ 配信ボタンが反応しました"
      );


      /*
       * 配信画面を開く
       */

      openPanel();


      /*
       * すでに配信中なら終了
       */

      if (isBroadcaster) {

        setPanelStatus(
          "🔴 すでに配信中です"
        );

        return;

      }


      setPanelStatus(
        "配信準備OK。名前とタイトルを確認してください。"
      );

    };


  /* =====================================================
     マイク許可 → 配信開始
===================================================== */

  window.requestMicrophoneAndStart =
    async function() {

      var name =
        document
          .getElementById(
            "nameInput"
          )
          .value
          .trim();


      var title =
        document
          .getElementById(
            "titleInput"
          )
          .value
          .trim();


      if (!name) {

        alert(
          "配信者名を入力してください"
        );

        return;

      }


      if (!title) {

        alert(
          "配信タイトルを入力してください"
        );

        return;

      }


      /*
       * マイク機能確認
       */

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {

        alert(
          "このブラウザではマイクを使用できません。HTTPSのページを開いてください。"
        );

        return;

      }


      setPanelStatus(
        "🎙️ マイクの許可を確認しています…"
      );


      showToast(
        "マイクの許可を押してください"
      );


      /*
       * マイク取得
       */

      try {

        localStream =
          await navigator
            .mediaDevices
            .getUserMedia(
              {
                audio:
                  {
                    echoCancellation:
                      true,

                    noiseSuppression:
                      true,

                    autoGainControl:
                      true
                  },

                video:
                  false
              }
            );

      }

      catch (error) {

        console.error(
          "getUserMedia error",
          error
        );


        setPanelStatus(
          "マイクを使用できませんでした。"
        );


        alert(
          "マイクの許可が必要です。Androidのブラウザ設定で、このサイトのマイクを許可してください。"
        );


        return;

      }


      /*
       * 配信開始
       */

      isBroadcaster =
        true;


      setPanelStatus(
        "🔴 配信を開始しています…"
      );


      document
        .getElementById(
          "startMicButton"
        )
        .style.display =
        "none";


      document
        .getElementById(
          "stopLiveButton"
        )
        .style.display =
        "block";


      showToast(
        "🔴 配信を開始しました"
      );


      sendMessage(
        {
          type:
            "start_live",

          clientId:
            myId,

          name:
            name,

          title:
            title
        }
      );

    };


  /* =====================================================
     配信停止
===================================================== */

  window.stopLive =
    function() {

      sendMessage(
        {
          type:
            "stop_live",

          clientId:
            myId
        }
      );


      closeAllPeers();


      if (localStream) {

        localStream
          .getTracks()
          .forEach(
            function(track) {

              track.stop();

            }
          );

      }


      localStream =
        null;


      isBroadcaster =
        false;


      document
        .getElementById(
          "startMicButton"
        )
        .style.display =
        "block";


      document
        .getElementById(
          "stopLiveButton"
        )
        .style.display =
        "none";


      setPanelStatus(
        "配信を終了しました。"
      );


      showToast(
        "配信を終了しました"
      );


      setTimeout(
        function() {

          document
            .getElementById(
              "liveOverlay"
            )
            .style.display =
            "none";

        },
        700
      );

    };


  /* =====================================================
     LIVE視聴
===================================================== */

  function listenLive(id) {

    if (isBroadcaster) {

      alert(
        "配信中は別のライブを視聴できません。"
      );

      return;

    }


    currentLiveId =
      id;


    openPanel();


    document
      .getElementById(
        "startMicButton"
      )
      .style.display =
      "none";


    document
      .getElementById(
        "stopLiveButton"
      )
      .style.display =
      "none";


    setPanelStatus(
      "🎧 配信者へ接続しています…"
    );


    sendMessage(
      {
        type:
          "join_live",

        clientId:
          myId,

        liveId:
          id
      }
    );

  }


  /* =====================================================
     SERVER MESSAGE
===================================================== */

  function handleMessage(data) {

    if (
      data.type ===
      "live_list"
    ) {

      renderLiveList(
        data.lives ||
        []
      );

      return;

    }


    if (
      data.type ===
      "server_error"
    ) {

      alert(
        data.message ||
        "サーバーエラー"
      );

      return;

    }


    if (
      data.type ===
      "live_started"
    ) {

      renderLiveList(
        data.lives ||
        []
      );


      setPanelStatus(
        "🔴 配信中です"
      );


      return;

    }


    if (
      data.type ===
      "live_stopped"
    ) {

      renderLiveList(
        []
      );


      if (!isBroadcaster) {

        setPanelStatus(
          "配信が終了しました"
        );


        closeAllPeers();

      }


      return;

    }


    if (
      data.type ===
      "viewer_joined"
    ) {

      createOfferForViewer(
        data.viewerId
      );

      return;

    }


    if (
      data.type ===
      "offer"
    ) {

      receiveOffer(
        data
      );

      return;

    }


    if (
      data.type ===
      "answer"
    ) {

      receiveAnswer(
        data
      );

      return;

    }


    if (
      data.type ===
      "ice_candidate"
    ) {

      receiveIceCandidate(
        data
      );

      return;

    }


    if (
      data.type ===
      "live_unavailable"
    ) {

      setPanelStatus(
        "このライブは終了しています"
      );

      return;

    }


    if (
      data.type ===
      "viewer_left"
    ) {

      if (viewerPeer) {

        viewerPeer.close();

        viewerPeer =
          null;

      }

    }

  }


  /* =====================================================
     BROADCASTER OFFER
===================================================== */

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
        {
          iceServers:
            iceServers
        }
      );


    window._viewerPeers =
      window._viewerPeers ||
      {};


    window._viewerPeers[
      viewerId
    ] =
      pc;


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

        if (
          event.candidate
        ) {

          sendMessage(
            {
              type:
                "ice_candidate",

              to:
                viewerId,

              from:
                myId,

              candidate:
                event.candidate
            }
          );

        }

      };


    var offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    sendMessage(
      {
        type:
          "offer",

        to:
          viewerId,

        from:
          myId,

        offer:
          offer
      }
    );

  }


  /* =====================================================
     VIEWER RECEIVE OFFER
===================================================== */

  async function receiveOffer(
    data
  ) {

    if (isBroadcaster) {

      return;

    }


    if (broadcasterPeer) {

      broadcasterPeer.close();

    }


    broadcasterPeer =
      new RTCPeerConnection(
        {
          iceServers:
            iceServers
        }
      );


    broadcasterPeer.onicecandidate =
      function(event) {

        if (
          event.candidate
        ) {

          sendMessage(
            {
              type:
                "ice_candidate",

              to:
                data.from,

              from:
                myId,

              candidate:
                event.candidate
            }
          );

        }

      };


    broadcasterPeer.ontrack =
      function(event) {

        var audio =
          document.getElementById(
            "remoteAudio"
          );


        if (
          event.streams &&
          event.streams[0]
        ) {

          audio.srcObject =
            event.streams[0];

        }


        audio
          .play()
          .then(
            function() {

              setPanelStatus(
                "🔊 配信を聴いています"
              );

            }
          )
          .catch(
            function() {

              setPanelStatus(
                "🔊 画面をタップして音声を再生してください"
              );

            }
          );

      };


    await broadcasterPeer
      .setRemoteDescription(
        new RTCSessionDescription(
          data.offer
        )
      );


    var answer =
      await broadcasterPeer
        .createAnswer();


    await broadcasterPeer
      .setLocalDescription(
        answer
      );


    sendMessage(
      {
        type:
          "answer",

        to:
          data.from,

        from:
          myId,

        answer:
          answer
      }
    );

  }


  /* =====================================================
     RECEIVE ANSWER
===================================================== */

  async function receiveAnswer(
    data
  ) {

    if (
      !window._viewerPeers ||
      !window._viewerPeers[
        data.from
      ]
    ) {

      return;

    }


    await window
      ._viewerPeers[
        data.from
      ]
      .setRemoteDescription(
        new RTCSessionDescription(
          data.answer
        )
      );

  }


  /* =====================================================
     ICE
===================================================== */

  async function receiveIceCandidate(
    data
  ) {

    try {

      if (
        isBroadcaster &&
        window._viewerPeers &&
        window._viewerPeers[
          data.from
        ]
      ) {

        await window
          ._viewerPeers[
            data.from
          ]
          .addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );

      }


      if (
        !isBroadcaster &&
        broadcasterPeer
      ) {

        await broadcasterPeer
          .addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );

      }

    }

    catch (error) {

      console.log(
        "ICE error",
        error
      );

    }

  }


  /* =====================================================
     CLOSE PEERS
===================================================== */

  function closeAllPeers() {

    if (broadcasterPeer) {

      broadcasterPeer.close();

      broadcasterPeer =
        null;

    }


    if (
      window._viewerPeers
    ) {

      Object
        .keys(
          window._viewerPeers
        )
        .forEach(
          function(id) {

            window
              ._viewerPeers[id]
              .close();

          }
        );


      window._viewerPeers =
        {};

    }


    document
      .getElementById(
        "remoteAudio"
      )
      .srcObject =
      null;

  }


  /* =====================================================
     PAGE LOAD
===================================================== */

  window.addEventListener(
    "load",

    function() {

      connectSocket();


      setPanelStatus(
        "準備完了。下の🎙️配信を押してください。"
      );

    }

  );

})();

</script>

</body>

</html>`;


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(
    function(req, res) {

      /* HEALTH */

      if (
        req.url ===
        "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "application/json; charset=utf-8"
          }
        );


        res.end(
          JSON.stringify(
            {
              ok:
                true,

              service:
                "VoiceポタLive",

              live:
                liveInfo.active
            }
          )
        );


        return;

      }


      /* HOME IMAGE */

      if (
        req.url ===
        "/home.png"
      ) {

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
                "image/png",

              "Cache-Control":
                "public,max-age=3600"
            }
          );


          fs
            .createReadStream(
              file
            )
            .pipe(res);


          return;

        }


        res.writeHead(
          404
        );

        res.end(
          "home.png not found"
        );

        return;

      }


      /* MAIN PAGE */

      if (
        req.url === "/" ||
        req.url === "/index.html"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8",

            "Cache-Control":
              "no-store"
          }
        );


        res.end(
          HTML
        );


        return;

      }


      res.writeHead(
        404,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );


      res.end(
        "Not Found"
      );

    }
  );


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server(
    {
      server:
        server
    }
  );


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
        liveInfo.startedAt
    }

  ];

}


/* =====================================================
   SEND
===================================================== */

function send(
  ws,
  data
) {

  if (
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


/* =====================================================
   BROADCAST
===================================================== */

function broadcast(
  data
) {

  const message =
    JSON.stringify(
      data
    );


  clients.forEach(
    function(client) {

      if (
        client.readyState ===
        WebSocket.OPEN
      ) {

        client.send(
          message
        );

      }

    }
  );

}


/* =====================================================
   RELAY SIGNAL
===================================================== */

function relay(
  data
) {

  clients.forEach(
    function(client) {

      if (
        client.clientId ===
        data.to
      ) {

        send(
          client,
          data
        );

      }

    }
  );

}


/* =====================================================
   STOP LIVE SERVER
===================================================== */

function stopLiveServer() {

  broadcaster =
    null;


  liveInfo = {

    active:
      false,

    id:
      null,

    name:
      "",

    title:
      "",

    startedAt:
      null

  };


  broadcast(
    {
      type:
        "live_stopped",

      lives:
        []
    }
  );


  console.log(
    "LIVE STOP"
  );

}


/* =====================================================
   WEBSOCKET CONNECTION
===================================================== */

wss.on(
  "connection",

  function(ws) {

    clients.add(
      ws
    );


    ws.clientId =
      null;


    ws.joinedLive =
      false;


    send(
      ws,

      {
        type:
          "live_list",

        lives:
          getLiveList()
      }
    );


    /* MESSAGE */

    ws.on(
      "message",

      function(raw) {

        let data;


        try {

          data =
            JSON.parse(
              raw.toString()
            );

        }

        catch (error) {

          return;

        }


        if (
          data.clientId
        ) {

          ws.clientId =
            data.clientId;

        }


        /* GET LIVE LIST */

        if (
          data.type ===
          "get_live_list"
        ) {

          send(
            ws,

            {
              type:
                "live_list",

              lives:
                getLiveList()
            }
          );


          return;

        }


        /* START LIVE */

        if (
          data.type ===
          "start_live"
        ) {

          if (
            broadcaster &&
            broadcaster !== ws
          ) {

            send(
              ws,

              {
                type:
                  "server_error",

                message:
                  "現在ほかの配信者が配信中です。"
              }
            );


            return;

          }


          broadcaster =
            ws;


          liveInfo = {

            active:
              true,

            id:
              ws.clientId ||
              "live-" +
              Date.now(),

            name:
              String(
                data.name ||
                "Voice配信者"
              ).slice(
                0,
                30
              ),

            title:
              String(
                data.title ||
                "音声ライブ配信中"
              ).slice(
                0,
                60
              ),

            startedAt:
              Date.now()

          };


          console.log(
            "LIVE START:",
            liveInfo.name,
            liveInfo.title
          );


          broadcast(
            {
              type:
                "live_started",

              lives:
                getLiveList()
            }
          );


          return;

        }


        /* STOP LIVE */

        if (
          data.type ===
          "stop_live"
        ) {

          if (
            ws ===
            broadcaster
          ) {

            stopLiveServer();

          }


          return;

        }


        /* JOIN LIVE */

        if (
          data.type ===
          "join_live"
        ) {

          if (
            !liveInfo.active ||
            !broadcaster
          ) {

            send(
              ws,

              {
                type:
                  "live_unavailable"
              }
            );


            return;

          }


          ws.joinedLive =
            true;


          send(
            broadcaster,

            {
              type:
                "viewer_joined",

              viewerId:
                ws.clientId
            }
          );


          return;

        }


        /* WEBRTC SIGNALING */

        if (
          data.type ===
            "offer" ||

          data.type ===
            "answer" ||

          data.type ===
            "ice_candidate"
        ) {

          relay(
            data
          );


          return;

        }

      }
    );


    /* DISCONNECT */

    ws.on(
      "close",

      function() {

        clients.delete(
          ws
        );


        if (
          ws ===
          broadcaster
        ) {

          stopLiveServer();

        }

        else if (
          ws.joinedLive &&
          broadcaster
        ) {

          send(
            broadcaster,

            {
              type:
                "viewer_left",

              viewerId:
                ws.clientId
            }
          );

        }

      }
    );

  }
);


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
