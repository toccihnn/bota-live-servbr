const http = require("http");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}


/* =====================================================
   RANKING
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

const ranking = rankingUsers.map((name, index) => ({
  id: `rank-${index + 1}`,
  name,
  score: 50000 - index * 731,
  viewers: Math.max(1, 1200 - index * 19),
  icon: ["🌙", "⭐", "🌸", "🎙️", "✨"][index % 5]
}));


/* =====================================================
   NEWCOMERS
===================================================== */

const newcomers = [
  {
    id: "new-1",
    name: "新人ぼた",
    title: "はじめまして🌙",
    icon: "🌙",
    live: false
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
    live: false
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
    live: false
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
   LIVE ROOMS
===================================================== */

const rooms = new Map();
const clients = new Set();


/* =====================================================
   UTIL
===================================================== */

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );
}


function send(ws, data) {
  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    ws.send(JSON.stringify(data));
  }
}


function broadcastRoom(
  roomId,
  data,
  except = null
) {
  for (const client of clients) {

    if (
      client.room === roomId &&
      client !== except
    ) {
      send(client, data);
    }

  }
}


function getRoom(roomId) {

  if (!rooms.has(roomId)) {

    rooms.set(
      roomId,
      {
        id: roomId,
        live: false,
        hostId: null,
        hostName: "",
        title: "",
        likes: 0,
        clients: new Set()
      }
    );

  }

  return rooms.get(roomId);
}


/* =====================================================
   PAGE SHELL
===================================================== */

function pageShell(
  title,
  body,
  extraCss = ""
) {

  return `
<!DOCTYPE html>

<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<meta
  name="theme-color"
  content="#030510"
>

<title>${escapeHtml(title)}</title>

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

  color: white;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    "Yu Gothic",
    sans-serif;
}

body {

  padding-bottom: 88px;

}

button,
input {

  font: inherit;

}

button {

  cursor: pointer;

}


/* HEADER */

.top {

  position: fixed;

  z-index: 100;

  top: 0;

  left: 0;

  right: 0;

  height: 58px;

  display: flex;

  align-items: center;

  padding: 0 16px;

  background:
    rgba(3,5,16,.84);

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid
    rgba(130,150,255,.12);

}

.logo {

  font-size: 18px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #fff,
      #9bd8ff,
      #d68cff
    );

  -webkit-background-clip: text;

  color: transparent;

}


/* BOTTOM NAV */

.bottom {

  position: fixed;

  z-index: 300;

  left: 0;

  right: 0;

  bottom: 0;

  height: 78px;

  padding:
    7px
    8px
    calc(
      7px +
      env(safe-area-inset-bottom)
    );

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  background:
    rgba(4,7,20,.96);

  backdrop-filter:
    blur(20px);

  border-top:
    1px solid
    rgba(120,140,255,.12);

}

.nav {

  border: 0;

  background: transparent;

  color: #7480a3;

  font-size: 10px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 3px;

}

.nav b {

  font-size: 20px;

}

.nav.live {

  color: white;

}

.nav.live b {

  width: 48px;

  height: 48px;

  margin-top: -25px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  background:
    linear-gradient(
      145deg,
      #ff4d91,
      #7c45ff
    );

  box-shadow:
    0 0 24px
    rgba(168,70,255,.55);

  border:
    4px solid
    #070a1b;

}


/* SECTIONS */

.section {

  max-width: 1050px;

  margin: auto;

  padding:
    24px
    15px
    0;

}

.head {

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 13px;

}

.title {

  font-size: 20px;

  font-weight: 900;

}

.sub {

  font-size: 10px;

  color: #6f7b9c;

  letter-spacing: 1px;

}


/* HORIZONTAL LIST */

.scroller {

  display: flex;

  gap: 11px;

  overflow-x: auto;

  padding:
    3px
    1px
    12px;

  scrollbar-width: none;

}

.scroller::-webkit-scrollbar {

  display: none;

}


/* CARD */

.card {

  flex:
    0 0
    180px;

  min-height: 170px;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      rgba(25,32,75,.96),
      rgba(8,11,28,.99)
    );

  border:
    1px solid
    rgba(120,140,255,.13);

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.20);

}

.avatar {

  width: 58px;

  height: 58px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  font-size: 26px;

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

.name {

  margin-top: 10px;

  font-weight: 900;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;

}

.muted {

  color: #8f9abb;

  font-size: 10px;

  margin-top: 5px;

  line-height: 1.5;

}

.rank-no {

  font-size: 12px;

  color: #9da9cc;

  font-weight: 900;

}

.rank-no.top {

  color: #ffd76a;

}

.score {

  margin-top: 7px;

  font-size: 10px;

  color: #8f9abd;

}

.view {

  margin-top: 3px;

  font-size: 10px;

  color: #687594;

}


/* BUTTON */

.btn {

  width: 100%;

  height: 45px;

  margin-top: 9px;

  border:
    1px solid
    rgba(120,140,255,.16);

  border-radius: 14px;

  background:
    rgba(15,20,55,.8);

  color: #b8c5e8;

  font-weight: 900;

}


/* BADGE */

.badge {

  display: inline-block;

  margin-top: 8px;

  padding:
    3px
    7px;

  border-radius: 999px;

  font-size: 8px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );

}


/* PAGE */

.page {

  padding-top: 78px;

}


/* EXTRA CSS */

${extraCss}

</style>

</head>

<body>

${body}


<!-- BOTTOM NAV -->

<nav class="bottom">

<button
  class="nav"
  onclick="location.href='/'"
>

<b>⌂</b>

ホーム

</button>


<button
  class="nav"
  onclick="alert('検索は準備中です')"
>

<b>⌕</b>

探す

</button>


<button
  class="nav live"
  onclick="location.href='/live'"
>

<b>🎙</b>

<span>配信</span>

</button>


<button
  class="nav"
  onclick="alert('お知らせは準備中です')"
>

<b>♧</b>

お知らせ

</button>


<button
  class="nav"
  onclick="alert('マイページは準備中です')"
>

<b>♙</b>

マイページ

</button>

</nav>

</body>

</html>
`;
}


/* =====================================================
   HOME
===================================================== */

function homePage() {

  const body = `

<header class="top">

<div class="logo">
VoiceポタLive
</div>

</header>


<main>


<section class="hero">

<div
  class="hero-bg"
  style="
    background-image:url('/home.png')
  "
></div>


<img
  class="hero-img"
  src="/home.png"
  alt="VoiceポタLive"
>


<div class="hero-overlay"></div>


<div class="hero-copy">

<div class="hero-small">

声でつながる、みんなの居場所。

</div>


<h1>

あなたの声が、

<br>

<span>
誰かの夜を照らす。
</span>

</h1>


<p>

月明かりの下で、話して、聴いて、笑って。

<br>

VoiceポタLiveで、あなたの声をもっと近くに。

</p>

</div>

</section>



<!-- RANKING -->

<section class="section">

<div class="head">

<div class="title">
🏆 人気トップ50
</div>

<div class="sub">
横にスワイプ
</div>

</div>


<div
  class="scroller"
  id="ranking"
></div>


<button
  class="btn"
  onclick="location.href='/ranking'"
>

トップ50をすべて見る

</button>

</section>



<!-- NEWCOMER -->

<section class="section">

<div class="head">

<div class="title">
🌱 新人ライバー
</div>

<div class="sub">
人気順
</div>

</div>


<div
  class="scroller"
  id="newcomers"
></div>


<button
  class="btn"
  onclick="location.href='/newcomers'"
>

新人ライバーをすべて見る

</button>

</section>


</main>


<script>

const ranking =
${JSON.stringify(
  ranking.map(
    (u, i) => ({
      ...u,
      rank: i + 1
    })
  )
)};


const newcomers =
${JSON.stringify(
  newcomers.map(
    (u, i) => ({
      ...u,
      rank: i + 1
    })
  )
)};


function safe(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[c])
    );

}


function rankingCard(user) {

  return \`

<div
  class="card"
  onclick="
    location.href =
    '/live?name=' +
    encodeURIComponent(
      '\${safe(user.name)}'
    )
  "
>

<div
  class="
    rank-no
    \${user.rank <= 3 ? "top" : ""}
  "
>

\${user.rank}位

</div>


<div class="avatar">

\${user.icon}

</div>


<div class="name">

\${safe(user.name)}

</div>


<div class="score">

応援ポイント

\${Number(
  user.score
).toLocaleString()}

</div>


<div class="view">

👁

\${Number(
  user.viewers
).toLocaleString()}

</div>

</div>

\`;

}


function newcomerCard(user) {

  return \`

<div
  class="card"
  onclick="
    location.href =
    '/live?name=' +
    encodeURIComponent(
      '\${safe(user.name)}'
    )
  "
>

<div class="avatar">

\${user.icon}

</div>


<div class="name">

\${safe(user.name)}

</div>


<div class="muted">

\${safe(user.title)}

</div>


<span class="badge">

\${user.live ? "LIVE" : "新人"}

</span>

</div>

\`;

}


document.getElementById(
  "ranking"
).innerHTML =
ranking
  .slice(0, 10)
  .map(rankingCard)
  .join("");


document.getElementById(
  "newcomers"
).innerHTML =
newcomers
  .slice(0, 10)
  .map(newcomerCard)
  .join("");

</script>

`;


  const extraCss = `

.hero {

  position: relative;

  margin-top: 58px;

  height:
    min(
      78vh,
      680px
    );

  min-height: 520px;

  overflow: hidden;

  background:
    #02030b;

  display: flex;

  align-items: flex-end;

}


.hero-bg {

  position: absolute;

  inset: -25px;

  background-size: cover;

  background-position: center;

  filter:
    blur(24px)
    brightness(.55);

  transform:
    scale(1.08);

}


.hero-img {

  position: absolute;

  inset: 0;

  width: 100%;

  height: 100%;

  object-fit: contain;

  object-position: center top;

  z-index: 2;

}


.hero-overlay {

  position: absolute;

  z-index: 3;

  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.02) 30%,
      rgba(3,5,16,.08) 50%,
      #030510 100%
    );

}


.hero-copy {

  position: relative;

  z-index: 4;

  width: 100%;

  padding:
    20px
    18px
    25px;

  text-shadow:
    0 2px 15px #000;

}


.hero-small {

  font-size: 12px;

  color: #c5d2ff;

  font-weight: 800;

  margin-bottom: 7px;

}


.hero-copy h1 {

  margin: 0;

  font-size:
    clamp(
      28px,
      8vw,
      46px
    );

  line-height: 1.14;

  letter-spacing: -1px;

}


.hero-copy h1 span {

  background:
    linear-gradient(
      90deg,
      #fff,
      #9bdcff,
      #d68cff
    );

  -webkit-background-clip: text;

  color: transparent;

}


.hero-copy p {

  margin:
    10px 0 0;

  color: #d8def2;

  font-size: 12px;

  line-height: 1.7;

  max-width: 390px;

}

`;

  return pageShell(
    "VoiceポタLive",
    body,
    extraCss
  );
}


/* =====================================================
   RANKING / NEWCOMER PAGE
===================================================== */

function listPage(
  title,
  items,
  isNew = false
) {

  const cards =
    items
      .map(
        (user, index) => {

          if (isNew) {

            return `

<div
  class="card"
  onclick="
    location.href =
    '/live?name=' +
    encodeURIComponent(
      '${escapeHtml(user.name)}'
    )
  "
>

<div class="avatar">

${user.icon}

</div>


<div class="name">

${escapeHtml(
  user.name
)}

</div>


<div class="muted">

${escapeHtml(
  user.title
)}

</div>


<span class="badge">

新人

</span>

</div>

`;

          }


          return `

<div
  class="card"
  onclick="
    location.href =
    '/live?name=' +
    encodeURIComponent(
      '${escapeHtml(user.name)}'
    )
  "
>

<div
  class="
    rank-no
    ${index < 3 ? "top" : ""}
  "
>

${index + 1}位

</div>


<div class="avatar">

${user.icon}

</div>


<div class="name">

${escapeHtml(
  user.name
)}

</div>


<div class="score">

応援ポイント

${user.score.toLocaleString()}

</div>


<div class="view">

👁

${user.viewers.toLocaleString()}

</div>

</div>

`;

        }
      )
      .join("");


  const body = `

<header class="top">

<div class="logo">
VoiceポタLive
</div>


<button
  class="back"
  onclick="location.href='/'"
>

← 戻る

</button>

</header>


<main class="page">

<section class="section">

<div class="head">

<div class="title">

${title}

</div>


<div class="sub">

${
  isNew
    ? "新人・人気順"
    : "TOP 50"
}

</div>

</div>


<div
  style="
    display:grid;
    grid-template-columns:
      repeat(
        auto-fill,
        minmax(180px,1fr)
      );
    gap:11px;
  "
>

${cards}

</div>

</section>

</main>

`;


  return pageShell(
    title,
    body
  );
}


/* =====================================================
   LIVE PAGE
===================================================== */

function livePage() {

  const body = `

<header class="top">

<div class="logo">
VoiceポタLive
</div>


<button
  class="back"
  onclick="location.href='/'"
>

← ホーム

</button>

</header>


<main class="live-page">


<section class="live-head">

<div>

<div
  class="live-status"
  id="status"
>

待機中

</div>


<h1 id="roomTitle">
配信ルーム
</h1>


<div
  id="hostName"
  class="muted"
>

配信者

</div>

</div>


<button
  id="blockBtn"
  class="mini danger"
>

🚫 ブロック

</button>

</section>



<!-- AUDIO -->

<div class="audio-panel">

<div
  class="orb"
  id="orb"
>

🎙️

</div>


<div class="live-info">

<b id="viewerCount">

視聴者 0

</b>


<span id="likeCount">

♡ 0

</span>

</div>


<audio
  id="remoteAudio"
  autoplay
  playsinline
  controls
></audio>

</div>



<!-- CHAT -->

<div
  class="chat"
  id="chat"
>

<div class="system">

ここにコメント・ギフト通知が表示されます

</div>

</div>



<!-- START / STOP -->

<section class="controls">

<button
  id="startBtn"
  class="primary"
>

🔴 配信開始

</button>


<button
  id="stopBtn"
  class="secondary"
  disabled
>

■ 配信終了

</button>

</section>



<!-- CUSTOM -->

<section class="custom">

<h2>
配信画面カスタム
</h2>


<input
  id="titleInput"
  maxlength="40"
  placeholder="配信タイトル"
>


<input
  id="nameInput"
  maxlength="20"
  placeholder="配信者名"
>


<button
  class="secondary"
  onclick="applyCustom()"
>

タイトルを変更

</button>

</section>



<!-- ACTIONS -->

<section class="actions">

<button
  onclick="sendLike()"
>

❤️ いいね

</button>


<button
  onclick="
    sendGift('🌙 月光')
  "
>

🌙 月光

</button>


<button
  onclick="
    sendGift('🌸 桜')
  "
>

🌸 桜

</button>


<button
  onclick="
    sendGift('⭐ 星')
  "
>

⭐ 星

</button>


<button
  onclick="toggleMute()"
>

🔇 ミュート

</button>

</section>


</main>


<script>

const protocol =
  location.protocol === "https:"
    ? "wss://"
    : "ws://";


const ws =
  new WebSocket(
    protocol +
    location.host
  );


const params =
  new URLSearchParams(
    location.search
  );


const room =
  params.get("room") ||
  "main";


let name =
  params.get("name") ||
  "月夜ぼた";


let host = false;

let localStream = null;

let peers = new Map();

let muted = false;

let blocked = false;


const remoteAudio =
  document.getElementById(
    "remoteAudio"
  );


/* =====================================================
   CONNECT
===================================================== */

ws.onopen = () => {

  ws.send(
    JSON.stringify({
      type: "join_live",
      room,
      name
    })
  );

};


/* =====================================================
   MESSAGE
===================================================== */

ws.onmessage =
  async event => {

    try {

      const data =
        JSON.parse(
          event.data
        );


      /* ROOM */

      if (
        data.type ===
        "room_state"
      ) {

        host =
          data.hostId ===
          data.clientId;


        updateState(data);


        if (
          host
        ) {

          document.getElementById(
            "startBtn"
          ).style.display =
            "inline-block";

        }
        else {

          document.getElementById(
            "startBtn"
          ).style.display =
            "none";

        }

      }


      /* NEW VIEWER */

      if (
        data.type ===
        "peer_joined"
      ) {

        if (
          host &&
          localStream
        ) {

          await makeOffer(
            data.peerId
          );

        }

      }


      /* OFFER */

      if (
        data.type ===
        "offer" &&
        !host
      ) {

        await acceptOffer(
          data.from,
          data.sdp
        );

      }


      /* ANSWER */

      if (
        data.type ===
        "answer" &&
        host
      ) {

        await acceptAnswer(
          data.from,
          data.sdp
        );

      }


      /* ICE */

      if (
        data.type ===
        "ice"
      ) {

        const peer =
          peers.get(
            data.from
          );


        if (
          peer &&
          data.candidate
        ) {

          try {

            await peer.addIceCandidate(
              data.candidate
            );

          }
          catch (error) {

            console.log(
              "ICE error",
              error
            );

          }

        }

      }


      /* LIVE START */

      if (
        data.type ===
        "live_started"
      ) {

        document.getElementById(
          "status"
        ).textContent =
          "🔴 LIVE";


        if (
          data.title
        ) {

          document.getElementById(
            "roomTitle"
          ).textContent =
            data.title;

        }


        if (
          data.hostName
        ) {

          document.getElementById(
            "hostName"
          ).textContent =
            data.hostName;

        }


        addMessage(
          "🔴 配信が始まりました"
        );

      }


      /* LIVE STOP */

      if (
        data.type ===
        "live_stopped"
      ) {

        document.getElementById(
          "status"
        ).textContent =
          "終了";


        remoteAudio.srcObject =
          null;


        addMessage(
          "配信が終了しました"
        );

      }


      /* LIKE */

      if (
        data.type ===
        "like"
      ) {

        document.getElementById(
          "likeCount"
        ).textContent =
          "♡ " +
          data.likes;

      }


      /* GIFT */

      if (
        data.type ===
        "gift"
      ) {

        addMessage(
          "🎁 " +
          data.name +
          " が " +
          data.gift +
          " を送りました"
        );

      }

    }
    catch (error) {

      console.log(
        "message error",
        error
      );

    }

  };


/* =====================================================
   START LIVE
===================================================== */

async function startLive() {

  try {

    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },

          video: false
        }
      );


    host = true;


    const title =
      document.getElementById(
        "titleInput"
      ).value ||
      "月明かりでお話ししよう";


    const hostName =
      document.getElementById(
        "nameInput"
      ).value ||
      name;


    ws.send(
      JSON.stringify({
        type: "start_live",
        room,
        title,
        name: hostName
      })
    );


    document.getElementById(
      "startBtn"
    ).disabled =
      true;


    document.getElementById(
      "stopBtn"
    ).disabled =
      false;


    document.getElementById(
      "status"
    ).textContent =
      "🔴 LIVE";


    document.getElementById(
      "roomTitle"
    ).textContent =
      title;


    document.getElementById(
      "hostName"
    ).textContent =
      hostName;

  }
  catch (error) {

    alert(
      "マイクの使用を許可してください。\\n\\n" +
      error.message
    );

  }

}


/* =====================================================
   STOP
===================================================== */

function stopLive() {

  if (!host) {
    return;
  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

  }


  for (
    const peer
    of peers.values()
  ) {

    peer.close();

  }


  peers.clear();


  ws.send(
    JSON.stringify({
      type: "stop_live",
      room
    })
  );


  document.getElementById(
    "startBtn"
  ).disabled =
    false;


  document.getElementById(
    "stopBtn"
  ).disabled =
    true;

}


/* =====================================================
   CREATE OFFER
===================================================== */

async function makeOffer(
  peerId
) {

  const pc =
    makePeer(
      peerId
    );


  localStream
    .getTracks()
    .forEach(
      track =>
        pc.addTrack(
          track,
          localStream
        )
    );


  const offer =
    await pc.createOffer();


  await pc.setLocalDescription(
    offer
  );


  ws.send(
    JSON.stringify({
      type: "offer",
      room,
      to: peerId,
      sdp:
        pc.localDescription
    })
  );

}


/* =====================================================
   ACCEPT OFFER
===================================================== */

async function acceptOffer(
  from,
  sdp
) {

  const pc =
    makePeer(from);


  await pc.setRemoteDescription(
    sdp
  );


  const answer =
    await pc.createAnswer();


  await pc.setLocalDescription(
    answer
  );


  ws.send(
    JSON.stringify({
      type: "answer",
      room,
      to: from,
      sdp:
        pc.localDescription
    })
  );

}


/* =====================================================
   ACCEPT ANSWER
===================================================== */

async function acceptAnswer(
  from,
  sdp
) {

  const pc =
    peers.get(
      from
    );


  if (pc) {

    await pc.setRemoteDescription(
      sdp
    );

  }

}


/* =====================================================
   PEER
===================================================== */

function makePeer(
  id
) {

  if (
    peers.has(id)
  ) {

    return peers.get(id);

  }


  const pc =
    new RTCPeerConnection(
      {
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
      }
    );


  peers.set(
    id,
    pc
  );


  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        ws.send(
          JSON.stringify({
            type: "ice",
            room,
            to: id,
            candidate:
              event.candidate
          })
        );

      }

    };


  pc.ontrack =
    event => {

      remoteAudio.srcObject =
        event.streams[0];


      remoteAudio
        .play()
        .catch(
          () => {}
        );

    };


  pc.onconnectionstatechange =
    () => {

      if (
        [
          "failed",
          "closed",
          "disconnected"
        ].includes(
          pc.connectionState
        )
      ) {

        pc.close();

        peers.delete(
          id
        );

      }

    };


  return pc;

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  ws.send(
    JSON.stringify({
      type: "like",
      room
    })
  );

}


/* =====================================================
   GIFT
===================================================== */

function sendGift(
  gift
) {

  ws.send(
    JSON.stringify({
      type: "gift",
      room,
      name,
      gift
    })
  );

}


/* =====================================================
   CUSTOM
===================================================== */

function applyCustom() {

  const title =
    document.getElementById(
      "titleInput"
    ).value ||
    "配信ルーム";


  const hostName =
    document.getElementById(
      "nameInput"
    ).value ||
    name;


  ws.send(
    JSON.stringify({
      type: "update_room",
      room,
      title,
      name: hostName
    })
  );

}


/* =====================================================
   MUTE
===================================================== */

function toggleMute() {

  if (
    !localStream
  ) {

    return;

  }


  muted =
    !muted;


  localStream
    .getAudioTracks()
    .forEach(
      track => {
        track.enabled =
          !muted;
      }
    );

}


/* =====================================================
   BLOCK
===================================================== */

document.getElementById(
  "blockBtn"
).onclick = () => {

  blocked =
    !blocked;


  document.getElementById(
    "blockBtn"
  ).textContent =
    blocked
      ? "✅ ブロック解除"
      : "🚫 ブロック";


  document.getElementById(
    "chat"
  ).style.display =
    blocked
      ? "none"
      : "block";

};


/* =====================================================
   STATE
===================================================== */

function updateState(
  data
) {

  document.getElementById(
    "viewerCount"
  ).textContent =
    "視聴者 " +
    data.viewers;


  if (
    data.likes != null
  ) {

    document.getElementById(
      "likeCount"
    ).textContent =
      "♡ " +
      data.likes;

  }


  if (
    data.live
  ) {

    document.getElementById(
      "status"
    ).textContent =
      "🔴 LIVE";

  }


  if (
    data.title
  ) {

    document.getElementById(
      "roomTitle"
    ).textContent =
      data.title;

  }


  if (
    data.hostName
  ) {

    document.getElementById(
      "hostName"
    ).textContent =
      data.hostName;

  }

}


/* =====================================================
   MESSAGE
===================================================== */

function addMessage(
  text
) {

  const element =
    document.createElement(
      "div"
    );


  element.className =
    "msg";


  element.textContent =
    text;


  document.getElementById(
    "chat"
  ).appendChild(
    element
  );


  const chat =
    document.getElementById(
      "chat"
    );


  chat.scrollTop =
    chat.scrollHeight;

}


/* =====================================================
   BEFORE UNLOAD
===================================================== */

window.addEventListener(
  "beforeunload",
  () => {

    if (host) {

      try {

        ws.send(
          JSON.stringify({
            type: "stop_live",
            room
          })
        );

      }
      catch {}

    }

  }
);


/* =====================================================
   BUTTONS
===================================================== */

document.getElementById(
  "startBtn"
).onclick =
  startLive;


document.getElementById(
  "stopBtn"
).onclick =
  stopLive;

</script>

`;


  const extraCss = `

.live-page {

  padding:
    78px
    15px
    110px;

  max-width:
    720px;

  margin: auto;

}


.live-head {

  display: flex;

  justify-content:
    space-between;

  align-items:
    center;

  gap: 10px;

}


.live-status {

  font-size: 11px;

  color: #ff5b86;

  font-weight: 900;

}


.live-head h1 {

  font-size: 24px;

  margin:
    5px 0;

}


.mini {

  border: 0;

  border-radius: 12px;

  padding:
    9px
    12px;

  background:
    #222945;

  color:
    #cbd4ef;

}


.danger {

  color:
    #ff8aa8;

}


.audio-panel {

  margin-top: 16px;

  border:
    1px solid
    rgba(120,140,255,.15);

  border-radius: 24px;

  min-height: 250px;

  background:
    radial-gradient(
      circle at 50% 30%,
      rgba(75,100,255,.24),
      rgba(9,12,32,.98) 60%
    );

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

}


.orb {

  width: 105px;

  height: 105px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  font-size: 48px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  box-shadow:
    0 0 40px
    rgba(75,110,255,.45);

}


.live-info {

  display: flex;

  gap: 20px;

  margin-top: 15px;

  color:
    #aebbe0;

  font-size: 12px;

}


audio {

  width: 90%;

  margin-top: 15px;

}


.chat {

  height: 180px;

  overflow: auto;

  margin-top: 12px;

  padding: 12px;

  border-radius: 18px;

  background:
    #080c20;

  border:
    1px solid
    rgba(120,140,255,.1);

}


.system,
.msg {

  font-size: 12px;

  color:
    #9ba7c8;

  padding:
    5px;

}


.controls {

  display: flex;

  gap: 8px;

  margin-top: 10px;

}


.controls button {

  flex: 1;

  min-height: 46px;

  border: 0;

  border-radius: 14px;

  font-weight: 900;

}


.primary {

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );

  color: white;

}


.secondary {

  background:
    #18203e;

  color:
    #cbd7ff;

}


.custom {

  margin-top: 18px;

  padding: 15px;

  border-radius: 18px;

  background:
    #0b1028;

  border:
    1px solid
    rgba(120,140,255,.1);

}


.custom h2 {

  font-size: 15px;

  margin:
    0 0 10px;

}


.custom input {

  width: 100%;

  height: 45px;

  margin: 4px 0;

  border-radius: 12px;

  border:
    1px solid
    #252d50;

  background:
    #050817;

  color: white;

  padding:
    0 12px;

}


.custom button {

  width: 100%;

  min-height: 45px;

  border: 0;

  border-radius: 12px;

  margin-top: 5px;

}


.actions {

  display: grid;

  grid-template-columns:
    repeat(3,1fr);

  gap: 8px;

  margin-top: 12px;

}


.actions button {

  min-height: 46px;

  border-radius: 14px;

  background:
    #111936;

  color:
    #e4e9ff;

  border:
    1px solid
    rgba(120,140,255,.12);

  font-weight: 900;

}

`;

  return pageShell(
    "配信 | VoiceポタLive",
    body,
    extraCss
  );
}


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(
    (req, res) => {

      const url =
        new URL(
          req.url,
          "http://localhost"
        );


      /* HOME */

      if (
        url.pathname === "/"
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

        return res.end(
          homePage()
        );

      }


      /* RANKING */

      if (
        url.pathname ===
        "/ranking"
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

        return res.end(
          listPage(
            "🏆 人気トップ50",
            ranking,
            false
          )
        );

      }


      /* NEWCOMERS */

      if (
        url.pathname ===
        "/newcomers"
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

        return res.end(
          listPage(
            "🌱 新人ライバー",
            newcomers,
            true
          )
        );

      }


      /* LIVE */

      if (
        url.pathname ===
        "/live"
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

        return res.end(
          livePage()
        );

      }


      /* IMAGE */

      if (
        url.pathname ===
        "/home.png"
      ) {

        const imagePath =
          path.join(
            PUBLIC_DIR,
            "home.png"
          );


        if (
          !fs.existsSync(
            imagePath
          )
        ) {

          res.writeHead(
            404,
            {
              "Content-Type":
                "text/plain; charset=utf-8"
            }
          );

          return res.end(
            "home.png がありません"
          );

        }


        res.writeHead(
          200,
          {
            "Content-Type":
              "image/png",

            "Cache-Control":
              "public,max-age=3600"
          }
        );


        return fs
          .createReadStream(
            imagePath
          )
          .pipe(res);

      }


      /* LIVE API */

      if (
        url.pathname ===
        "/api/live"
      ) {

        const list =
          [
            ...rooms.values()
          ]
            .filter(
              room =>
                room.live
            )
            .map(
              room => ({
                room:
                  room.id,

                title:
                  room.title,

                name:
                  room.hostName,

                viewers:
                  room.clients.size,

                likes:
                  room.likes
              })
            );


        res.writeHead(
          200,
          {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store"
          }
        );


        return res.end(
          JSON.stringify(
            list
          )
        );

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
  new WebSocket.Server({
    server
  });


function cleanupClient(
  ws
) {

  clients.delete(
    ws
  );


  if (!ws.room) {
    return;
  }


  const room =
    rooms.get(
      ws.room
    );


  if (!room) {
    return;
  }


  room.clients.delete(
    ws
  );


  /* HOST DISCONNECTED */

  if (
    room.hostId ===
    ws.id
  ) {

    room.live =
      false;

    room.hostId =
      null;


    broadcastRoom(
      room.id,
      {
        type:
          "live_stopped"
      }
    );

  }


  broadcastRoom(
    room.id,
    {
      type:
        "room_state",

      live:
        room.live,

      hostId:
        room.hostId,

      hostName:
        room.hostName,

      title:
        room.title,

      viewers:
        Math.max(
          0,
          room.clients.size - 1
        ),

      likes:
        room.likes
    }
  );

}


/* =====================================================
   CONNECTION
===================================================== */

wss.on(
  "connection",
  ws => {

    ws.id =
      Math.random()
        .toString(36)
        .slice(2);


    ws.room =
      null;


    clients.add(
      ws
    );


    console.log(
      "WebSocket connected:",
      ws.id
    );


    ws.on(
      "message",
      raw => {

        let data;


        try {

          data =
            JSON.parse(
              raw
            );

        }
        catch {

          return;

        }


        const room =
          getRoom(
            data.room ||
            "main"
          );


        /* JOIN */

        if (
          data.type ===
          "join_live"
        ) {

          if (
            ws.room &&
            ws.room !==
            room.id
          ) {

            cleanupClient(
              ws
            );

          }


          ws.room =
            room.id;


          room.clients.add(
            ws
          );


          send(
            ws,
            {
              type:
                "room_state",

              clientId:
                ws.id,

              live:
                room.live,

              hostId:
                room.hostId,

              hostName:
                room.hostName,

              title:
                room.title,

              viewers:
                Math.max(
                  0,
                  room.clients.size - 1
                ),

              likes:
                room.likes
            }
          );


          /* TELL HOST ABOUT NEW VIEWER */

          broadcastRoom(
            room.id,
            {
              type:
                "peer_joined",

              peerId:
                ws.id
            },
            ws
          );


          broadcastRoom(
            room.id,
            {
              type:
                "room_state",

              live:
                room.live,

              hostId:
                room.hostId,

              hostName:
                room.hostName,

              title:
                room.title,

              viewers:
                Math.max(
                  0,
                  room.clients.size - 1
                ),

              likes:
                room.likes
            }
          );


          return;

        }


        /* START LIVE */

        if (
          data.type ===
          "start_live"
        ) {

          room.live =
            true;


          room.hostId =
            ws.id;


          room.hostName =
            String(
              data.name ||
              "月夜ぼた"
            ).slice(
              0,
              20
            );


          room.title =
            String(
              data.title ||
              "月明かりでお話ししよう"
            ).slice(
              0,
              40
            );


          broadcastRoom(
            room.id,
            {
              type:
                "live_started",

              hostId:
                room.hostId,

              hostName:
                room.hostName,

              title:
                room.title
            }
          );


          /* EXISTING VIEWERS */

          for (
            const client
            of room.clients
          ) {

            if (
              client !== ws
            ) {

              send(
                ws,
                {
                  type:
                    "peer_joined",

                  peerId:
                    client.id
                }
              );

            }

          }


          broadcastRoom(
            room.id,
            {
              type:
                "room_state",

              live:
                true,

              hostId:
                room.hostId,

              hostName:
                room.hostName,

              title:
                room.title,

              viewers:
                Math.max(
                  0,
                  room.clients.size - 1
                ),

              likes:
                room.likes
            }
          );


          console.log(
            "LIVE START:",
            ws.id
          );


          return;

        }


        /* STOP LIVE */

        if (
          data.type ===
          "stop_live" &&
          room.hostId ===
          ws.id
        ) {

          room.live =
            false;

          room.hostId =
            null;


          broadcastRoom(
            room.id,
            {
              type:
                "live_stopped"
            }
          );


          console.log(
            "LIVE STOP:",
            ws.id
          );


          return;

        }


        /* WEBRTC OFFER / ANSWER / ICE */

        if (
          data.type ===
            "offer" ||
          data.type ===
            "answer" ||
          data.type ===
            "ice"
        ) {

          for (
            const client
            of room.clients
          ) {

            if (
              client.id ===
              data.to
            ) {

              send(
                client,
                {
                  ...data,

                  from:
                    ws.id
                }
              );


              break;

            }

          }


          return;

        }


        /* LIKE */

        if (
          data.type ===
          "like"
        ) {

          room.likes++;


          broadcastRoom(
            room.id,
            {
              type:
                "like",

              likes:
                room.likes
            }
          );


          return;

        }


        /* GIFT */

        if (
          data.type ===
          "gift"
        ) {

          broadcastRoom(
            room.id,
            {
              type:
                "gift",

              name:
                String(
                  data.name ||
                  "ゲスト"
                ).slice(
                  0,
                  20
                ),

              gift:
                String(
                  data.gift ||
                  "ギフト"
                ).slice(
                  0,
                  30
                )
            }
          );


          return;

        }


        /* CUSTOM */

        if (
          data.type ===
            "update_room" &&
          room.hostId ===
            ws.id
        ) {

          room.title =
            String(
              data.title ||
              room.title
            ).slice(
              0,
              40
            );


          room.hostName =
            String(
              data.name ||
              room.hostName
            ).slice(
              0,
              20
            );


          broadcastRoom(
            room.id,
            {
              type:
                "room_state",

              live:
                room.live,

              hostId:
                room.hostId,

              hostName:
                room.hostName,

              title:
                room.title,

              viewers:
                Math.max(
                  0,
                  room.clients.size - 1
                ),

              likes:
                room.likes
            }
          );


          return;

        }

      }
    );


    ws.on(
      "close",
      () => {

        console.log(
          "WebSocket disconnected:",
          ws.id
        );


        cleanupClient(
          ws
        );

      }
    );


    ws.on(
      "error",
      error => {

        console.log(
          "WebSocket error:",
          error.message
        );

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
  () => {

    console.log(
      `VoiceポタLive server listening on ${HOST}:${PORT}`
    );

  }
);
