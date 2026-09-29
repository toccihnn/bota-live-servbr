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
   TOP 50 RANKING
===================================================== */

const rankingUsers = [
  "月夜ぼた",
  "星空レン",
  "夜桜ミク",
  "蒼空レイ",
  "月乃あかり",
  "白雪ユナ",
  "黒猫ルナ",
  "天音ソラ",
  "星野ナギ",
  "桜音ミオ",
  "夜空カナ",
  "水瀬リオ",
  "月島ハル",
  "青葉ナナ",
  "神楽ユイ",
  "雪村レナ",
  "花音メイ",
  "星川アオ",
  "春風ミナ",
  "雨宮シオン",
  "月城アイ",
  "白石ユウ",
  "天宮コト",
  "星宮リナ",
  "夜凪マオ",
  "桜庭ユキ",
  "水野ソラ",
  "月影ナナ",
  "青空ミオ",
  "花咲レイ",
  "星乃ユメ",
  "白月カナ",
  "夜風リオ",
  "春野アカリ",
  "天音ミナ",
  "雪空ユイ",
  "月森レン",
  "桜井ソラ",
  "星空ミオ",
  "花月ナギ",
  "夜空ユナ",
  "水城レイ",
  "白雪ミオ",
  "月野カナ",
  "星川ユキ",
  "春風ソラ",
  "天宮ナナ",
  "夜桜レナ",
  "花音ユイ",
  "月光アオ"
];

const ranking = rankingUsers.map(function(name, index) {
  return {
    id: "rank-" + (index + 1),
    rank: index + 1,
    name: name,
    score: 50000 - index * 731,
    viewers: Math.max(1, 1200 - index * 19),
    icon: ["🌙", "⭐", "🌸", "🎙️", "✨"][index % 5]
  };
});


/* =====================================================
   NEWCOMER
===================================================== */

const newcomers = [
  {
    id: "new-1",
    name: "新人ぼた",
    title: "はじめまして🌙",
    icon: "🌙",
    live: true
  },
  {
    id: "new-2",
    name: "月音ゆい",
    title: "のんびりお話しします",
    icon: "🌸",
    live: false
  },
  {
    id: "new-3",
    name: "星空れん",
    title: "夜のおしゃべり",
    icon: "⭐",
    live: true
  },
  {
    id: "new-4",
    name: "そら",
    title: "歌ってみる🎙️",
    icon: "🎙️",
    live: false
  },
  {
    id: "new-5",
    name: "みお",
    title: "初配信です",
    icon: "✨",
    live: true
  },
  {
    id: "new-6",
    name: "夜桜",
    title: "まったり雑談",
    icon: "🌸",
    live: false
  }
];


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
  width: 100%;
  min-height: 100%;

  background: #030510;
  color: white;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    "Yu Gothic",
    sans-serif;
}

body {
  overflow-x: hidden;
}

button {
  font-family: inherit;
}

.app {
  min-height: 100vh;
  padding-bottom: 85px;
}


/* =====================================================
   HEADER
===================================================== */

.header {

  height: 58px;

  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  z-index: 100;

  display: flex;
  align-items: center;

  padding: 0 18px;

  background:
    rgba(3,5,16,.82);

  backdrop-filter: blur(18px);

  border-bottom:
    1px solid
    rgba(120,140,255,.10);
}

.logo {

  font-size: 18px;

  font-weight: 900;

  letter-spacing: -.5px;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #9bd8ff,
      #c98cff
    );

  -webkit-background-clip: text;

  background-clip: text;

  color: transparent;
}


/* =====================================================
   HERO
===================================================== */

.hero {

  position: relative;

  margin-top: 58px;

  width: 100%;

  min-height: 510px;

  overflow: hidden;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,0) 35%,
      rgba(3,5,16,.35) 62%,
      #030510 100%
    ),
    url("/home.png");

  background-size: cover;

  background-position: center top;

  display: flex;

  align-items: flex-end;
}

.hero::after {

  content: "";

  position: absolute;

  inset: 0;

  pointer-events: none;

  background:
    linear-gradient(
      90deg,
      rgba(2,4,15,.05),
      rgba(2,4,15,0) 70%
    ),
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(3,5,16,0) 48%
    );
}

.hero-content {

  position: relative;

  z-index: 5;

  width: 100%;

  padding:
    40px
    20px
    30px;
}

.hero-small {

  font-size: 12px;

  font-weight: 700;

  color: #b7c9ff;

  margin-bottom: 8px;

  text-shadow:
    0 0 12px
    rgba(90,130,255,.7);
}

.hero-title {

  margin: 0;

  font-size:
    clamp(28px, 8vw, 48px);

  line-height: 1.15;

  font-weight: 900;

  letter-spacing: -1px;

  text-shadow:
    0 3px 20px
    rgba(0,0,0,.8);
}

.hero-title span {

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #9bdcff,
      #d68cff
    );

  -webkit-background-clip: text;

  background-clip: text;

  color: transparent;
}

.hero-description {

  margin-top: 12px;

  max-width: 390px;

  font-size: 13px;

  line-height: 1.8;

  color: #d9def1;

  text-shadow:
    0 2px 12px #000;
}


/* =====================================================
   SECTION
===================================================== */

.section {

  padding:
    28px
    15px
    0;
}

.section-head {

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 14px;
}

.section-title {

  font-size: 20px;

  font-weight: 900;
}

.section-sub {

  font-size: 10px;

  color: #687394;

  letter-spacing: 1px;
}


/* =====================================================
   RANKING
===================================================== */

.ranking-list {

  display: flex;

  flex-direction: column;

  gap: 8px;
}

.ranking-card {

  min-height: 72px;

  display: flex;

  align-items: center;

  padding: 10px 12px;

  border-radius: 17px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.92),
      rgba(8,12,32,.96)
    );

  border:
    1px solid
    rgba(120,140,255,.11);

  box-shadow:
    0 7px 22px
    rgba(0,0,0,.18);

  cursor: pointer;

  transition:
    transform .15s ease;
}

.ranking-card:active {

  transform:
    scale(.98);
}

.rank-number {

  width: 38px;

  flex-shrink: 0;

  text-align: center;

  font-size: 16px;

  font-weight: 900;

  color: #8894b8;
}

.rank-number.top {

  font-size: 20px;

  color: #ffd76a;

  text-shadow:
    0 0 12px
    rgba(255,210,80,.5);
}

.rank-avatar {

  width: 48px;

  height: 48px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 22px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 18px
    rgba(80,130,255,.28);
}

.rank-info {

  min-width: 0;

  flex: 1;

  padding-left: 11px;
}

.rank-name {

  font-size: 14px;

  font-weight: 800;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.rank-score {

  margin-top: 4px;

  font-size: 11px;

  color: #8f9abd;
}

.rank-viewers {

  font-size: 10px;

  color: #697595;

  text-align: right;

  margin-left: 6px;
}


/* =====================================================
   NEWCOMER
===================================================== */

.newcomer-list {

  display: flex;

  gap: 11px;

  overflow-x: auto;

  padding:
    3px
    1px
    12px;

  scrollbar-width: none;
}

.newcomer-list::-webkit-scrollbar {

  display: none;
}

.newcomer-card {

  flex: 0 0 145px;

  min-height: 174px;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.95),
      rgba(8,11,28,.98)
    );

  border:
    1px solid
    rgba(120,140,255,.13);

  cursor: pointer;
}

.new-avatar-wrap {

  position: relative;

  width: 58px;

  height: 58px;

  margin-bottom: 10px;
}

.new-avatar {

  width: 58px;

  height: 58px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 26px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );
}

.live-dot {

  position: absolute;

  right: -1px;

  bottom: -1px;

  width: 15px;

  height: 15px;

  border-radius: 50%;

  background: #ff3d6e;

  border:
    3px solid #11162e;

  box-shadow:
    0 0 9px
    rgba(255,60,110,.8);
}

.new-name {

  font-size: 13px;

  font-weight: 900;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.new-title {

  margin-top: 5px;

  font-size: 10px;

  line-height: 1.5;

  color: #8f9abb;

  height: 30px;

  overflow: hidden;
}

.new-badge {

  display: inline-block;

  margin-top: 8px;

  padding: 3px 7px;

  border-radius: 999px;

  font-size: 8px;

  font-weight: 900;

  color: white;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );
}


/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {

  position: fixed;

  left: 0;
  right: 0;
  bottom: 0;

  height: 76px;

  z-index: 200;

  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  padding:
    7px
    8px
    calc(
      7px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.94);

  backdrop-filter: blur(20px);

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
}

.nav-icon {

  font-size: 20px;

  line-height: 1;
}

.nav-item.active {

  color: #bcd2ff;
}

.nav-item.active .nav-icon {

  filter:
    drop-shadow(
      0 0 8px #5e8cff
    );
}


/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 500px) {

  .hero {

    min-height: 520px;

    background-size:
      auto 520px;

    background-position:
      57% top;
  }

  .hero-content {

    padding:
      30px
      18px
      25px;
  }

  .hero-title {

    font-size: 30px;
  }

  .hero-description {

    font-size: 12px;
  }
}


/* =====================================================
   DESKTOP
===================================================== */

@media (min-width: 700px) {

  .hero {

    min-height: 680px;
  }

  .hero-content {

    max-width: 650px;

    padding:
      60px
      50px
      45px;
  }

  .section {

    max-width: 1000px;

    margin:
      auto;
  }
}

</style>

</head>


<body>

<div class="app">


<!-- =================================================
     HEADER
================================================= -->

<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


<!-- =================================================
     HERO
================================================= -->

<section class="hero">

  <div class="hero-content">

    <div class="hero-small">
      声でつながる、みんなの居場所。
    </div>

    <h1 class="hero-title">
      <span>あなたの声が、</span><br>
      誰かの夜を照らす。
    </h1>

    <div class="hero-description">
      月明かりの下で、話して、聴いて、笑って。<br>
      VoiceポタLiveで、あなたの声をもっと近くに。
    </div>

  </div>

</section>


<!-- =================================================
     TOP 50
===================================================== -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🏆 トップランキング
    </div>

    <div class="section-sub">
      TOP 50
    </div>

  </div>

  <div
    class="ranking-list"
    id="rankingList"
  ></div>

</section>


<!-- =================================================
     NEWCOMER
===================================================== -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <div class="section-sub">
      NEW
    </div>

  </div>

  <div
    class="newcomer-list"
    id="newcomerList"
  ></div>

</section>


<!-- =================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">

  <button
    class="nav-item active"
    onclick="goHome()"
  >
    <div class="nav-icon">⌂</div>
    ホーム
  </button>

  <button
    class="nav-item"
    onclick="searchLive()"
  >
    <div class="nav-icon">⌕</div>
    探す
  </button>

  <button
    class="nav-item"
    onclick="showNotice()"
  >
    <div class="nav-icon">♧</div>
    お知らせ
  </button>

  <button
    class="nav-item"
    onclick="showProfile()"
  >
    <div class="nav-icon">♙</div>
    マイページ
  </button>

</nav>


</div>


<script>

/* =====================================================
   RANKING
===================================================== */

function renderRanking(list) {

  const box =
    document.getElementById("rankingList");

  if (!Array.isArray(list)) {
    box.innerHTML =
      '<div style="padding:20px;color:#8995b8;">ランキングを読み込めませんでした。</div>';

    return;
  }

  box.innerHTML =
    list.map(function(user) {

      const topClass =
        user.rank <= 3
          ? "top"
          : "";

      return (
        '<div class="ranking-card" onclick="openUser(\\'' +
        escapeHtml(user.id) +
        '\\')">' +

          '<div class="rank-number ' +
          topClass +
          '">' +
            user.rank +
          '</div>' +

          '<div class="rank-avatar">' +
            escapeHtml(user.icon) +
          '</div>' +

          '<div class="rank-info">' +

            '<div class="rank-name">' +
              escapeHtml(user.name) +
            '</div>' +

            '<div class="rank-score">' +
              '応援ポイント ' +
              Number(user.score).toLocaleString() +
            '</div>' +

          '</div>' +

          '<div class="rank-viewers">' +
            '👁 ' +
            Number(user.viewers).toLocaleString() +
          '</div>' +

        '</div>'
      );

    }).join("");

}


/* =====================================================
   NEWCOMER
===================================================== */

function renderNewcomers(list) {

  const box =
    document.getElementById("newcomerList");

  if (!Array.isArray(list)) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML =
    list.map(function(user) {

      const liveDot =
        user.live
          ? '<div class="live-dot"></div>'
          : "";

      const badge =
        user.live
          ? '<span class="new-badge">LIVE</span>'
          : '<span class="new-badge" style="background:rgba(80,90,130,.7)">新人</span>';

      return (
        '<div class="newcomer-card" onclick="openUser(\\'' +
        escapeHtml(user.id) +
        '\\')">' +

          '<div class="new-avatar-wrap">' +

            '<div class="new-avatar">' +
              escapeHtml(user.icon) +
            '</div>' +

            liveDot +

          '</div>' +

          '<div class="new-name">' +
            escapeHtml(user.name) +
          '</div>' +

          '<div class="new-title">' +
            escapeHtml(user.title) +
          '</div>' +

          badge +

        '</div>'
      );

    }).join("");

}


/* =====================================================
   USER
===================================================== */

function openUser(id) {

  alert(
    "配信者ページを開きます\\n\\n" +
    id
  );

}


/* =====================================================
   NAV
===================================================== */

function goHome() {

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

function searchLive() {

  alert(
    "配信検索を準備中です。"
  );

}

function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}

function showProfile() {

  alert(
    "マイページを準備中です。"
  );

}


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}


/* =====================================================
   WEBSOCKET
===================================================== */

let socket = null;

let reconnectTimer = null;


function connectSocket() {

  if (
    socket &&
    (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )
  ) {
    return;
  }

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const socketUrl =
    protocol +
    "//" +
    location.host;

  try {

    socket =
      new WebSocket(socketUrl);

  } catch (error) {

    console.log(
      "WebSocket error",
      error
    );

    scheduleReconnect();

    return;
  }


  socket.onopen = function() {

    console.log(
      "VoiceポタLive WebSocket connected"
    );

  };


  socket.onmessage = function(event) {

    try {

      const data =
        JSON.parse(event.data);

      if (
        data.type === "home_data"
      ) {

        renderRanking(
          data.ranking || []
        );

        renderNewcomers(
          data.newcomers || []
        );

      }

    } catch (error) {

      console.log(
        "message error",
        error
      );

    }

  };


  socket.onerror = function(error) {

    console.log(
      "WebSocket error",
      error
    );

  };


  socket.onclose = function() {

    console.log(
      "WebSocket disconnected"
    );

    scheduleReconnect();

  };

}


function scheduleReconnect() {

  if (reconnectTimer) {
    return;
  }

  reconnectTimer =
    setTimeout(function() {

      reconnectTimer = null;

      connectSocket();

    }, 2000);

}


/* =====================================================
   START
===================================================== */

connectSocket();

</script>

</body>
</html>
`;


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(function(req, res) {

    const url =
      req.url.split("?")[0];


    /* HOME */

    if (
      url === "/" ||
      url === "/index.html"
    ) {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache, no-store, must-revalidate"
        }
      );

      res.end(HTML);

      return;
    }


    /* HOME IMAGE */

    if (
      url === "/home.png"
    ) {

      const imagePath =
        path.join(
          PUBLIC_DIR,
          "home.png"
        );


      if (
        fs.existsSync(imagePath)
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "image/png",

            "Cache-Control":
              "public, max-age=3600"
          }
        );

        fs.createReadStream(
          imagePath
        ).pipe(res);

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
        "home.png がありません"
      );

      return;
    }


    /* NOT FOUND */

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

  });


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server: server
  });

const clients =
  new Set();


wss.on(
  "connection",
  function(ws) {

    clients.add(ws);

    console.log(
      "WebSocket client connected"
    );


    /* =================================================
       HOME DATA
    ================================================= */

    ws.send(
      JSON.stringify({
        type: "home_data",
        ranking: ranking,
        newcomers: newcomers
      })
    );


    /* =================================================
       CLOSE
    ================================================= */

    ws.on(
      "close",
      function() {

        clients.delete(ws);

        console.log(
          "WebSocket client disconnected"
        );

      }
    );


    /* =================================================
       ERROR
    ================================================= */

    ws.on(
      "error",
      function(error) {

        console.log(
          "WebSocket client error",
          error
        );

        clients.delete(ws);

      }
    );

  }
);


/* =====================================================
   START SERVER
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "========================================"
    );

    console.log(
      "VoiceポタLive server started"
    );

    console.log(
      "Host: " + HOST
    );

    console.log(
      "Port: " + PORT
    );

    console.log(
      "Ranking users: " +
      ranking.length
    );

    console.log(
      "Newcomers: " +
      newcomers.length
    );

    console.log(
      "========================================"
    );

  }
);


/* =====================================================
   SERVER ERROR
===================================================== */

server.on(
  "error",
  function(error) {

    console.error(
      "SERVER ERROR:",
      error
    );

  }
);
