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

<meta name="theme-color" content="#030510">

<title>VoiceポタLive</title>

<style>

/* =====================================================
   RESET
===================================================== */

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

/* =====================================================
   APP
===================================================== */

.app {
  min-height: 100vh;

  padding-bottom:
    calc(82px + env(safe-area-inset-bottom));
}

/* =====================================================
   HEADER
===================================================== */

.header {

  height: 58px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 18px;

  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  z-index: 100;

  background:
    rgba(3,5,16,.86);

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid rgba(120,140,255,.12);
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

.online {

  display: flex;

  align-items: center;

  gap: 6px;

  font-size: 11px;

  color: #aeb9d8;
}

.online-dot {

  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: #4effb0;

  box-shadow:
    0 0 12px #4effb0;
}

/* =====================================================
   HERO
===================================================== */

.hero {

  position: relative;

  margin-top: 58px;

  width: 100%;

  overflow: hidden;

  background: #030510;

  display: flex;

  flex-direction: column;
}

/* =====================================================
   HERO IMAGE
   ★ ここが今回の重要部分
===================================================== */

.hero-image {

  width: 100%;

  /*
   * 画像の縦横比を維持
   */
  aspect-ratio: 16 / 9;

  background-image:
    url("/home.png");

  background-repeat: no-repeat;

  /*
   * coverではなくcontain
   *
   * 画像を切らずに全部表示する
   */
  background-size: contain;

  background-position: center;

  background-color: #030510;

  position: relative;
}

/* =====================================================
   IMAGE DARK GRADIENT
===================================================== */

.hero-image::after {

  content: "";

  position: absolute;

  inset: 0;

  pointer-events: none;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,0) 45%,
      rgba(3,5,16,.10) 70%,
      rgba(3,5,16,.80) 100%
    );
}

/* =====================================================
   HERO TOP TAG
===================================================== */

.hero-top {

  position: absolute;

  top: 20px;

  left: 18px;
  right: 18px;

  z-index: 10;

  display: flex;

  justify-content:
    space-between;

  pointer-events: none;
}

.tag {

  display: inline-flex;

  align-items: center;

  padding:
    7px 13px;

  border-radius: 999px;

  font-size: 11px;

  font-weight: 700;

  color: #dfe7ff;

  background:
    rgba(10,16,48,.72);

  border:
    1px solid
    rgba(120,150,255,.30);

  backdrop-filter:
    blur(10px);

  box-shadow:
    0 0 20px
    rgba(70,100,255,.12);
}

/* =====================================================
   HERO CONTENT
===================================================== */

.hero-content {

  position: relative;

  z-index: 5;

  width: 100%;

  padding:
    28px
    22px
    30px;

  background:
    linear-gradient(
      180deg,
      rgba(3,5,16,0) 0%,
      #030510 18%
    );
}

.hero-small {

  font-size: 12px;

  font-weight: 700;

  color: #b7c9ff;

  margin-bottom: 7px;

  text-shadow:
    0 0 12px
    rgba(90,130,255,.7);
}

.hero-title {

  margin: 0;

  font-size:
    clamp(28px,8vw,48px);

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
   BUTTONS
===================================================== */

.buttons {

  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 10px;

  margin-top: 20px;

  max-width: 430px;
}

.main-button {

  height: 52px;

  border: 0;

  border-radius: 17px;

  font-size: 14px;

  font-weight: 900;

  color: white;

  cursor: pointer;

  box-shadow:
    0 8px 30px
    rgba(70,90,255,.25);

  transition:
    transform .15s ease,
    opacity .15s ease;
}

.main-button:active {

  transform:
    scale(.96);
}

.start-button {

  background:
    linear-gradient(
      100deg,
      #00c9ff,
      #456cff,
      #c24cff
    );
}

.listen-button {

  background:
    rgba(15,20,55,.78);

  border:
    1px solid
    rgba(130,150,255,.4);

  backdrop-filter:
    blur(12px);
}

/* =====================================================
   SECTION
===================================================== */

.section {

  padding:
    24px 16px 0;
}

.section-head {

  display: flex;

  align-items: center;

  justify-content:
    space-between;

  margin-bottom: 13px;
}

.section-title {

  font-size: 20px;

  font-weight: 900;
}

.section-sub {

  font-size: 10px;

  color: #7580a5;

  letter-spacing: 1px;
}

/* =====================================================
   LIVE LIST
===================================================== */

.live-list {

  display: flex;

  flex-direction: column;

  gap: 10px;
}

.live-card {

  position: relative;

  min-height: 92px;

  display: flex;

  align-items: center;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      120deg,
      rgba(20,28,72,.9),
      rgba(8,12,32,.95)
    );

  border:
    1px solid
    rgba(120,140,255,.12);

  box-shadow:
    0 8px 30px
    rgba(0,0,0,.2);

  cursor: pointer;
}

.live-avatar {

  width: 58px;
  height: 58px;

  flex-shrink: 0;

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

  box-shadow:
    0 0 22px
    rgba(80,130,255,.35);
}

.live-info {

  min-width: 0;

  flex: 1;

  padding-left: 12px;
}

.live-name {

  font-weight: 800;

  font-size: 14px;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.live-title {

  margin-top: 5px;

  color: #aab4d5;

  font-size: 12px;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}

.live-badge {

  display: inline-block;

  margin-top: 6px;

  padding:
    3px 8px;

  border-radius: 999px;

  font-size: 9px;

  font-weight: 900;

  color: white;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );
}

.empty {

  padding:
    35px 20px;

  text-align: center;

  border-radius: 20px;

  color: #737d9e;

  background:
    rgba(10,14,35,.7);

  border:
    1px solid
    rgba(100,120,200,.1);
}

/* =====================================================
   FEATURES
===================================================== */

.features {

  display: grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 10px;

  margin-top: 18px;
}

.feature {

  padding:
    18px 14px;

  min-height: 115px;

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.9),
      rgba(8,11,28,.95)
    );

  border:
    1px solid
    rgba(120,140,255,.12);
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
    repeat(5,1fr);

  padding:
    7px
    8px
    calc(
      7px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.94);

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

.nav-live {

  width: 50px;
  height: 50px;

  margin-top: -20px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 24px;

  color: white;

  background:
    linear-gradient(
      145deg,
      #39d9ff,
      #5467ff,
      #be4cff
    );

  border:
    3px solid #080b20;

  box-shadow:
    0 0 28px
    rgba(80,110,255,.7);
}

/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 500px) {

  .hero {

    margin-top: 58px;
  }

  /*
   * ★ 画像全体を表示
   *
   * coverにはしない
   */
  .hero-image {

    aspect-ratio: 16 / 9;

    background-size:
      contain;

    background-position:
      center;

    background-repeat:
      no-repeat;
  }

  .hero-top {

    top: 14px;

    left: 12px;
    right: 12px;
  }

  .tag {

    padding:
      6px 10px;

    font-size: 10px;
  }

  .hero-content {

    padding:
      24px
      18px
      26px;
  }

  .hero-title {

    font-size: 30px;
  }

  .hero-description {

    font-size: 12px;
  }

  .buttons {

    grid-template-columns:
      1fr;
  }

  .main-button {

    height: 50px;
  }

  .section {

    padding-left: 14px;

    padding-right: 14px;
  }

}

/* =====================================================
   TABLET / PC
===================================================== */

@media (min-width: 700px) {

  .hero-image {

    aspect-ratio:
      16 / 9;

    max-height:
      700px;
  }

  .hero-content {

    max-width:
      900px;

    width: 100%;

    margin:
      0 auto;

    padding:
      50px
      40px
      45px;
  }

  .features {

    grid-template-columns:
      repeat(4,1fr);
  }

  .section {

    max-width:
      1000px;

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

  <div class="online">

    <span class="online-dot"></span>

    オンライン

  </div>

</header>


<!-- =================================================
     HERO
================================================= -->

<section class="hero">

  <!-- 画像部分 -->

  <div class="hero-image">

    <div class="hero-top">

      <div class="tag">
        🌙 月光花 × Voice
      </div>

      <div class="tag">
        LIVE
      </div>

    </div>

  </div>


  <!-- 文字・ボタン -->

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


    <div class="buttons">

      <button
        class="main-button start-button"
        onclick="startLive()"
      >
        🎙️ 配信をはじめる
      </button>


      <button
        class="main-button listen-button"
        onclick="scrollLive()"
      >
        🎧 ライブを聴いてみる
      </button>

    </div>

  </div>

</section>


<!-- =================================================
     LIVE
===================================================== -->

<section
  class="section"
  id="liveSection"
>

  <div class="section-head">

    <div class="section-title">
      🔴 ライブ中
    </div>

    <div class="section-sub">
      REAL TIME
    </div>

  </div>


  <div
    class="live-list"
    id="liveList"
  >

    <div class="empty">
      現在配信中のライブはありません
    </div>

  </div>

</section>


<!-- =================================================
     FEATURES
===================================================== -->

<section class="section">

  <div class="section-head">

    <div class="section-title">
      VoiceポタLive
    </div>

  </div>


  <div class="features">


    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <div class="feature-title">
        高音質の音声配信
      </div>

      <div class="feature-text">
        クリアな声で、もっと近くに。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        ⚡
      </div>

      <div class="feature-title">
        低遅延でリアルタイム
      </div>

      <div class="feature-text">
        今この瞬間を、一緒に。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        🎁
      </div>

      <div class="feature-title">
        投げ銭で応援
      </div>

      <div class="feature-text">
        あなたの応援が配信者の力に。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        👥
      </div>

      <div class="feature-title">
        みんなで楽しめる
      </div>

      <div class="feature-text">
        好きな声でつながる場所。
      </div>

    </div>


  </div>

</section>


<!-- =================================================
     BOTTOM NAV
===================================================== -->

<nav class="bottom-nav">


  <button
    class="nav-item active"
    onclick="goHome()"
  >

    <div class="nav-icon">
      ⌂
    </div>

    ホーム

  </button>


  <button
    class="nav-item"
    onclick="searchLive()"
  >

    <div class="nav-icon">
      ⌕
    </div>

    探す

  </button>


  <button
    class="nav-item"
    onclick="startLive()"
  >

    <div class="nav-live">
      🎙️
    </div>

    配信

  </button>


  <button
    class="nav-item"
    onclick="showNotice()"
  >

    <div class="nav-icon">
      ♧
    </div>

    お知らせ

  </button>


  <button
    class="nav-item"
    onclick="showProfile()"
  >

    <div class="nav-icon">
      ♙
    </div>

    マイページ

  </button>


</nav>

</div>


<script>

/* =====================================================
   LIVE SECTION
===================================================== */

function scrollLive() {

  const section =
    document.getElementById(
      "liveSection"
    );

  if (!section) return;

  section.scrollIntoView({
    behavior: "smooth"
  });

}


/* =====================================================
   START LIVE
===================================================== */

function startLive() {

  const name =
    prompt(
      "配信者名を入力してください"
    );

  if (!name) return;

  alert(
    "「" +
    name +
    "」として配信画面を準備します。"
  );

}


/* =====================================================
   SEARCH
===================================================== */

function searchLive() {

  alert(
    "配信検索機能を準備中です。"
  );

}


/* =====================================================
   NOTICE
===================================================== */

function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}


/* =====================================================
   PROFILE
===================================================== */

function showProfile() {

  alert(
    "マイページを準備中です。"
  );

}


/* =====================================================
   HOME
===================================================== */

function goHome() {

  window.scrollTo({

    top: 0,

    behavior: "smooth"

  });

}


/* =====================================================
   WEBSOCKET
===================================================== */

let socket = null;

let reconnectTimer = null;


function connectSocket() {

  try {

    const protocol =
      location.protocol === "https:"
        ? "wss:"
        : "ws:";


    socket =
      new WebSocket(
        protocol +
        "//" +
        location.host
      );


    socket.onopen = () => {

      console.log(
        "WebSocket connected"
      );

      if (reconnectTimer) {

        clearTimeout(
          reconnectTimer
        );

        reconnectTimer = null;

      }

    };


    socket.onmessage = event => {

      try {

        const data =
          JSON.parse(
            event.data
          );


        if (
          data.type ===
          "live_list"
        ) {

          renderLiveList(
            data.lives || []
          );

        }

      } catch (error) {

        console.log(
          "message error",
          error
        );

      }

    };


    socket.onerror = error => {

      console.log(
        "WebSocket error",
        error
      );

    };


    socket.onclose = () => {

      console.log(
        "WebSocket disconnected"
      );


      if (!reconnectTimer) {

        reconnectTimer =
          setTimeout(
            () => {

              reconnectTimer = null;

              connectSocket();

            },
            2000
          );

      }

    };

  } catch (error) {

    console.log(
      "WebSocket connection error",
      error
    );

  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function renderLiveList(
  lives
) {

  const list =
    document.getElementById(
      "liveList"
    );


  if (!list) return;


  if (!lives.length) {

    list.innerHTML = `

      <div class="empty">

        現在配信中のライブはありません

      </div>

    `;

    return;

  }


  list.innerHTML =
    lives
      .map(
        live => `

          <div
            class="live-card"
            onclick="listenLive('${escapeHtml(
              live.id || ""
            )}')"
          >

            <div class="live-avatar">
              🎙️
            </div>


            <div class="live-info">

              <div class="live-name">

                ${escapeHtml(
                  live.name ||
                  "Voice配信者"
                )}

              </div>


              <div class="live-title">

                ${escapeHtml(
                  live.title ||
                  "音声ライブ配信中"
                )}

              </div>


              <span class="live-badge">
                LIVE
              </span>

            </div>

          </div>

        `
      )
      .join("");

}


/* =====================================================
   LISTEN LIVE
===================================================== */

function listenLive(id) {

  alert(
    "ライブ「" +
    id +
    "」へ接続します。"
  );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

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
  http.createServer(
    (req, res) => {

      /* ================================================
         HOME
      ================================================ */

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
              "no-cache, no-store, must-revalidate",

            "Pragma":
              "no-cache",

            "Expires":
              "0"
          }
        );

        res.end(HTML);

        return;
      }


      /* ================================================
         HOME.PNG
      ================================================ */

      if (
        req.url === "/home.png"
      ) {

        const imagePath =
          path.join(
            PUBLIC_DIR,
            "home.png"
          );


        if (
          fs.existsSync(
            imagePath
          )
        ) {

          res.writeHead(
            200,
            {
              "Content-Type":
                "image/png",

              /*
               * キャッシュ
