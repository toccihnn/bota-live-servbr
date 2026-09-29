const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/* =========================================================
   VoiceポタLive
   - WebRTC音声配信
   - 配信開始 / 終了
   - 視聴
   - WebSocketシグナリング
   - 人気ランキング
   - 新人ライバー
   - ギフト
   - いいね
   - ブロック
   - 配信画像カスタム
   - 横スクロール
   - TOP50ページ
   ========================================================= */

const liveRooms = new Map();
const sockets = new Map();

/* =========================================================
   データ
   ========================================================= */

const ranking = [
  {
    id: "live001",
    name: "月夜ほたる",
    viewers: 1280,
    likes: 9320,
    category: "歌・雑談",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live002",
    name: "夜空ミナ",
    viewers: 980,
    likes: 7210,
    category: "雑談",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live003",
    name: "青月レイ",
    viewers: 860,
    likes: 6800,
    category: "歌枠",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live004",
    name: "星乃ルナ",
    viewers: 740,
    likes: 5910,
    category: "弾き語り",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live005",
    name: "黒猫ミク",
    viewers: 650,
    likes: 5300,
    category: "雑談",
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live006",
    name: "月白カナ",
    viewers: 590,
    likes: 4700,
    category: "歌・雑談",
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live007",
    name: "雨音しずく",
    viewers: 510,
    likes: 4200,
    category: "癒し",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live008",
    name: "蒼井ソラ",
    viewers: 480,
    likes: 3900,
    category: "雑談",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live009",
    name: "夜凪アオ",
    viewers: 430,
    likes: 3500,
    category: "歌枠",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "live010",
    name: "白月ユイ",
    viewers: 390,
    likes: 3200,
    category: "雑談",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85"
  }
];

const newcomers = [
  {
    id: "new001",
    name: "新人ほしこ",
    viewers: 180,
    likes: 920,
    category: "新人・雑談",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new002",
    name: "新人あかり",
    viewers: 155,
    likes: 810,
    category: "新人・歌",
    image:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new003",
    name: "新人ゆら",
    viewers: 132,
    likes: 730,
    category: "新人・雑談",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new004",
    name: "新人ナギ",
    viewers: 118,
    likes: 690,
    category: "新人・歌",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new005",
    name: "新人ミオ",
    viewers: 106,
    likes: 630,
    category: "新人・雑談",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new006",
    name: "新人ルイ",
    viewers: 94,
    likes: 580,
    category: "新人・歌",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new007",
    name: "新人さくら",
    viewers: 86,
    likes: 520,
    category: "新人・雑談",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new008",
    name: "新人レン",
    viewers: 80,
    likes: 480,
    category: "新人・歌",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new009",
    name: "新人ひなた",
    viewers: 75,
    likes: 430,
    category: "新人・雑談",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "new010",
    name: "新人そら",
    viewers: 70,
    likes: 400,
    category: "新人・歌",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85"
  }
];

/* =========================================================
   50人生成
   ========================================================= */

function makeExtraPeople(base, prefix, count) {
  const result = [...base];

  while (result.length < count) {
    const n = result.length + 1;

    result.push({
      id: prefix + String(n).padStart(3, "0"),
      name:
        prefix === "live"
          ? "ライバー" + n
          : "新人ライバー" + n,
      viewers: Math.max(10, 350 - n * 5),
      likes: Math.max(50, 3000 - n * 40),
      category: prefix === "live" ? "雑談・歌" : "新人・雑談",
      image:
        "https://images.unsplash.com/photo-" +
        [
          "1516280440614-37939bbacd81",
          "1516589178581-6cd7833ae3b2",
          "1493225457124-a3eb161ffa5f",
          "1524368535928-5b5e00ddc76b",
          "1514525253161-7a46d19cd819",
          "1534528741775-53994a69daeb"
        ][n % 6] +
        "?auto=format&fit=crop&w=900&q=85"
    });
  }

  return result;
}

const allRanking = makeExtraPeople(ranking, "live", 50);
const allNewcomers = makeExtraPeople(newcomers, "new", 50);

/* =========================================================
   HTML
   ========================================================= */

const HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<title>VoiceポタLive</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  background: #050509;
  color: #fff;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    sans-serif;
}

body {
  padding-bottom: 78px;
}

button {
  font: inherit;
}

img {
  display: block;
  max-width: 100%;
}

.app {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

.header {
  height: 58px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #08080e;
  border-bottom: 1px solid #1d1d29;
  position: sticky;
  top: 0;
  z-index: 50;
}

.logo {
  font-size: 20px;
  font-weight: 800;
}

.logo span {
  color: #7c5cff;
}

.page {
  padding: 0 14px 24px;
}

.hero {
  margin-top: 14px;
  border-radius: 18px;
  overflow: hidden;
  background: #0c0c14;
}

.hero-image {
  width: 100%;
  height: auto;
  max-height: 560px;
  object-fit: contain;
  background: #000;
}

.hero-copy {
  padding: 16px;
}

.hero-small {
  color: #9f9fb0;
  font-size: 13px;
}

.hero-title {
  font-size: 25px;
  line-height: 1.3;
  font-weight: 800;
  margin: 8px 0;
}

.hero-text {
  color: #bdbdcc;
  line-height: 1.7;
  font-size: 14px;
}

.section {
  margin-top: 25px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 800;
}

.more {
  color: #8d79ff;
  font-size: 13px;
  border: 0;
  background: transparent;
  padding: 8px;
}

.horizontal {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 3px 1px 12px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.horizontal::-webkit-scrollbar {
  display: none;
}

.card {
  flex: 0 0 138px;
  scroll-snap-align: start;
  background: #101018;
  border: 1px solid #20202d;
  border-radius: 15px;
  overflow: hidden;
}

.card-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 0.82;
  background: #08080d;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.live-dot {
  position: absolute;
  left: 7px;
  top: 7px;
  padding: 4px 7px;
  border-radius: 20px;
  background: #ff315f;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.card-body {
  padding: 9px;
}

.card-name {
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  color: #9292a3;
  font-size: 11px;
  margin-top: 4px;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 70px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: rgba(8,8,14,.96);
  border-top: 1px solid #252532;
  z-index: 100;
  backdrop-filter: blur(15px);
}

.nav-item {
  border: 0;
  background: transparent;
  color: #858594;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10px;
}

.nav-icon {
  font-size: 22px;
}

.nav-live {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  margin-top: -17px;
  background: linear-gradient(135deg,#725cff,#d64cff);
  color: #fff;
  border: 5px solid #08080e;
  font-size: 24px;
}

.list-page {
  padding: 16px 14px 30px;
}

.list-title {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 16px;
}

.list {
  display: grid;
  gap: 12px;
}

.list-card {
  display: flex;
  gap: 12px;
  background: #101018;
  border: 1px solid #20202d;
  border-radius: 15px;
  padding: 8px;
  align-items: center;
}

.list-rank {
  width: 30px;
  text-align: center;
  font-size: 15px;
  font-weight: 900;
  color: #a99aff;
}

.list-image {
  width: 76px;
  height: 76px;
  border-radius: 12px;
  object-fit: cover;
  background: #000;
}

.list-info {
  flex: 1;
  min-width: 0;
}

.list-name {
  font-weight: 800;
  font-size: 15px;
}

.list-meta {
  color: #9292a3;
  font-size: 12px;
  margin-top: 5px;
}

.open-live {
  border: 0;
  background: #6d57ff;
  color: #fff;
  border-radius: 10px;
  padding: 9px 11px;
  font-weight: 800;
  font-size: 11px;
}

/* =====================================================
   配信画面
   ===================================================== */

.live-page {
  min-height: calc(100vh - 58px);
  background: #050509;
}

.live-header {
  height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-bottom: 1px solid #20202a;
}

.back-btn {
  width: 38px;
  height: 38px;
  border: 0;
  background: #15151e;
  color: #fff;
  border-radius: 50%;
  font-size: 20px;
}

.live-name {
  flex: 1;
  font-weight: 800;
}

.live-status {
  color: #ff4c73;
  font-size: 12px;
  font-weight: 800;
}

.live-visual {
  width: 100%;
  background: #000;
  position: relative;
}

.live-image {
  width: 100%;
  height: auto;
  max-height: 70vh;
  object-fit: contain;
  background: #000;
}

.live-video {
  width: 100%;
  height: auto;
  min-height: 280px;
  max-height: 70vh;
  object-fit: contain;
  background: #000;
}

.live-overlay {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  pointer-events: none;
}

.live-info {
  pointer-events: auto;
  background: rgba(0,0,0,.55);
  border-radius: 13px;
  padding: 10px 12px;
}

.live-info-title {
  font-weight: 900;
}

.live-info-sub {
  color: #ddd;
  font-size: 12px;
  margin-top: 3px;
}

.live-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
}

.circle-action {
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: rgba(20,20,30,.88);
  color: #fff;
  font-size: 21px;
}

.like-active {
  background: #ff3571;
}

.live-content {
  padding: 13px;
}

.live-message {
  color: #aaaabd;
  font-size: 13px;
  line-height: 1.6;
}

.live-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 9px;
  margin-top: 14px;
}

.action-button {
  border: 1px solid #292938;
  border-radius: 12px;
  padding: 12px 6px;
  color: #fff;
  background: #11111a;
  font-weight: 800;
}

.gift-button {
  background: linear-gradient(135deg,#ff8b45,#ff3e8d);
  border: 0;
}

.block-button {
  color: #ff738d;
}

.host-panel {
  margin-top: 14px;
  padding: 14px;
  border-radius: 15px;
  background: #101018;
  border: 1px solid #252532;
}

.host-title {
  font-weight: 900;
  margin-bottom: 10px;
}

.host-controls {
  display: grid;
  gap: 9px;
}

.control-button {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 13px;
  background: #20202c;
  color: #fff;
  font-weight: 800;
}

.control-button.primary {
  background: #6d57ff;
}

.control-button.danger {
  background: #d82f54;
}

.custom-input {
  width: 100%;
  border: 1px solid #30303d;
  border-radius: 11px;
  background: #08080e;
  color: #fff;
  padding: 12px;
}

.hidden {
  display: none !important;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 86px;
  transform: translateX(-50%);
  background: rgba(25,25,35,.96);
  border: 1px solid #39394a;
  color: #fff;
  padding: 11px 16px;
  border-radius: 30px;
  z-index: 300;
  font-size: 13px;
}

.gift-panel {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 78px;
  background: #101018;
  border: 1px solid #353547;
  border-radius: 18px;
  padding: 14px;
  z-index: 200;
  box-shadow: 0 10px 40px rgba(0,0,0,.5);
}

.gift-title {
  font-weight: 900;
  margin-bottom: 10px;
}

.gift-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 8px;
}

.gift-item {
  border: 1px solid #2b2b3a;
  background: #171720;
  color: #fff;
  border-radius: 12px;
  padding: 10px 5px;
}

.gift-emoji {
  font-size: 25px;
}

.gift-name {
  font-size: 10px;
  margin-top: 3px;
}

.close-gift {
  margin-top: 10px;
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 10px;
  background: #292938;
  color: #fff;
}

.empty {
  text-align: center;
  color: #888899;
  padding: 40px 10px;
}

</style>
</head>

<body>

<div class="app" id="app"></div>
<div id="toast" class="toast hidden"></div>

<div class="bottom-nav" id="bottomNav">
  <button class="nav-item" onclick="goHome()">
    <span class="nav-icon">⌂</span>
    ホーム
  </button>

  <button class="nav-item" onclick="showPage('ranking')">
    <span class="nav-icon">⌕</span>
    探す
  </button>

  <button class="nav-item nav-live" onclick="startBroadcast()">
    ＋
  </button>

  <button class="nav-item" onclick="showToast('お知らせ機能')">
    <span class="nav-icon">♧</span>
    お知らせ
  </button>

  <button class="nav-item" onclick="showToast('マイページ')">
    <span class="nav-icon">♙</span>
    マイページ
  </button>
</div>

<script>

/* =========================================================
   共通
   ========================================================= */

const state = {
  ws: null,
  wsReady: false,
  socketId: null,

  liveId: null,
  isHost: false,
  localStream: null,

  peers: {},
  blocked: {},

  liked: false,
  likes: 0,

  currentImage: "",

  reconnectTimer: null
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(text) {
  const el = document.getElementById("toast");

  el.textContent = text;
  el.classList.remove("hidden");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 1800);
}

function wsSend(data) {
  if (!state.ws) return;

  if (state.ws.readyState !== WebSocket.OPEN) return;

  state.ws.send(JSON.stringify(data));
}

function connectWS() {
  if (
    state.ws &&
    (
      state.ws.readyState === WebSocket.OPEN ||
      state.ws.readyState === WebSocket.CONNECTING
    )
  ) {
    return;
  }

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  state.ws = new WebSocket(
    protocol + "//" + location.host
  );

  state.ws.onopen = () => {
    state.wsReady = true;

    if (state.liveId) {
      joinLiveSocket();
    }
  };

  state.ws.onmessage = async event => {
    try {
      const data = JSON.parse(event.data);
      await handleSocketMessage(data);
    } catch (error) {
      console.error(error);
    }
  };

  state.ws.onclose = () => {
    state.wsReady = false;

    clearTimeout(state.reconnectTimer);

    state.reconnectTimer = setTimeout(() => {
      connectWS();
    }, 1500);
  };

  state.ws.onerror = () => {
    state.wsReady = false;
  };
}

connectWS();

/* =========================================================
   ホーム
   ========================================================= */

async function getHomeData() {
  const response = await fetch("/api/home");
  return response.json();
}

function renderHome(data) {
  const app = document.getElementById("app");

  app.innerHTML = \`
    <div class="header">
      <div class="logo">
        Voice<span>ポタLive</span>
      </div>
    </div>

    <main class="page">

      <section class="hero">
        <img
          class="hero-image"
          src="\${escapeHtml(data.hero)}"
          alt=""
        >

        <div class="hero-copy">
          <div class="hero-small">
            声でつながる、みんなの居場所。
          </div>

          <div class="hero-title">
            あなたの声が、<br>
            誰かの夜を照らす。
          </div>

          <div class="hero-text">
            月明かりの下で、話して、聞いて、笑って。<br>
            VoiceポタLiveで、あなたの声をもっと近くに。
          </div>
        </div>
      </section>

      <section class="section">

        <div class="section-head">
          <div class="section-title">
            🏆 人気トップ50
          </div>

          <button
            class="more"
            onclick="showPage('ranking')"
          >
            TOP 50
          </button>
        </div>

        <div class="horizontal">
          \${data.ranking.slice(0,10).map((item,index) =>
            renderCard(item,index)
          ).join("")}
        </div>

      </section>

      <section class="section">

        <div class="section-head">
          <div class="section-title">
            🌱 新人ライバー
          </div>

          <button
            class="more"
            onclick="showPage('newcomers')"
          >
            もっと見る
          </button>
        </div>

        <div class="horizontal">
          \${data.newcomers.slice(0,10).map((item,index) =>
            renderCard(item,index)
          ).join("")}
        </div>

      </section>

    </main>
  \`;
}

function renderCard(item,index) {
  return \`
    <article
      class="card"
      onclick="openLive('\${escapeHtml(item.id)}')"
    >
      <div class="card-image-wrap">

        <img
          class="card-image"
          src="\${escapeHtml(item.image)}"
          alt=""
          loading="lazy"
        >

        <div class="live-dot">
          LIVE
        </div>

      </div>

      <div class="card-body">

        <div class="card-name">
          \${escapeHtml(item.name)}
        </div>

        <div class="card-meta">
          👁 \${Number(item.viewers).toLocaleString()}
          ・ ❤️ \${Number(item.likes).toLocaleString()}
        </div>

      </div>
    </article>
  \`;
}

async function goHome() {
  try {
    const data = await getHomeData();

    state.liveId = null;
    state.isHost = false;

    document.getElementById("bottomNav")
      .classList.remove("hidden");

    renderHome(data);

  } catch (error) {
    console.error(error);
    showToast("ホームの読み込みに失敗しました");
  }
}

/* =========================================================
   ランキングページ
   ========================================================= */

async function showPage(type) {

  if (type === "ranking") {
    const response = await fetch("/api/ranking");
    const data = await response.json();

    renderListPage(
      "🏆 人気トップ50",
      data
    );

    return;
  }

  if (type === "newcomers") {
    const response = await fetch("/api/newcomers");
    const data = await response.json();

    renderListPage(
      "🌱 新人ライバー",
      data
    );

    return;
  }
}

function renderListPage(title,data) {

  document.getElementById("app").innerHTML = \`
    <div class="header">
      <div class="logo">
        Voice<span>ポタLive</span>
      </div>
    </div>

    <main class="list-page">

      <div class="list-title">
        \${escapeHtml(title)}
      </div>

      <div class="list">

        \${data.map((item,index) => \`
          <div class="list-card">

            <div class="list-rank">
              \${index + 1}
            </div>

            <img
              class="list-image"
              src="\${escapeHtml(item.image)}"
              alt=""
            >

            <div class="list-info">

              <div class="list-name">
                \${escapeHtml(item.name)}
              </div>

              <div class="list-meta">
                \${escapeHtml(item.category)}
              </div>

              <div class="list-meta">
                👁 \${Number(item.viewers).toLocaleString()}
                ・ ❤️ \${Number(item.likes).toLocaleString()}
              </div>

            </div>

            <button
              class="open-live"
              onclick="openLive('\${escapeHtml(item.id)}')"
            >
              配信を見る
            </button>

          </div>
        \`).join("")}

      </div>

    </main>
  \`;
}

/* =========================================================
   配信を見る
   ========================================================= */

function openLive(id) {

  state.liveId = id;
  state.isHost = false;
  state.currentImage = "";

  document.getElementById("bottomNav")
    .classList.add("hidden");

  renderLivePage();

  connectWS();

  setTimeout(() => {
    joinLiveSocket();
  }, 100);
}

function joinLiveSocket() {

  if (!state.liveId) return;

  wsSend({
    type: "join",
    liveId: state.liveId,
    role: "viewer"
  });
}

function renderLivePage() {

  const app = document.getElementById("app");

  app.innerHTML = \`
    <div class="live-page">

      <div class="live-header">

        <button
          class="back-btn"
          onclick="goHome()"
        >
          ←
        </button>

        <div class="live-name">
          VoiceポタLive
        </div>

        <div class="live-status">
          ● LIVE
        </div>

      </div>

      <div class="live-visual">

        <img
          id="liveImage"
          class="live-image"
          src=""
          alt=""
        >

        <video
          id="remoteVideo"
          class="live-video hidden"
          autoplay
          playsinline
          controls="false"
        ></video>

        <div class="live-overlay">

          <div class="live-info">

            <div
              class="live-info-title"
              id="liveTitle"
            >
              配信に接続中...
            </div>

            <div
              class="live-info-sub"
              id="viewerCount"
            >
              接続しています
            </div>

          </div>

          <div class="live-actions">

            <button
              id="likeCircle"
              class="circle-action"
              onclick="likeLive()"
            >
              ♥
            </button>

            <button
              class="circle-action"
              onclick="openGiftPanel()"
            >
              🎁
            </button>

          </div>

        </div>

      </div>

      <div class="live-content">

        <div class="live-message">
          声でつながる、みんなの居場所。
        </div>

        <div class="live-buttons">

          <button
            class="action-button gift-button"
            onclick="openGiftPanel()"
          >
            🎁 ギフト
          </button>

          <button
            class="action-button"
            onclick="likeLive()"
          >
            ❤️ いいね
          </button>

          <button
            class="action-button block-button"
            onclick="blockLive()"
          >
            🚫 ブロック
          </button>

        </div>

      </div>

      <div
        id="giftPanel"
        class="gift-panel hidden"
      >

        <div class="gift-title">
          🎁 ギフトを送る
        </div>

        <div class="gift-grid">

          <button class="gift-item" onclick="sendGift('🌹','バラ')">
            <div class="gift-emoji">🌹</div>
            <div class="gift-name">バラ</div>
          </button>

          <button class="gift-item" onclick="sendGift('❤️','ハート')">
            <div class="gift-emoji">❤️</div>
            <div class="gift-name">ハート</div>
          </button>

          <button class="gift-item" onclick="sendGift('⭐','スター')">
            <div class="gift-emoji">⭐</div>
            <div class="gift-name">スター</div>
          </button>

          <button class="gift-item" onclick="sendGift('💎','ダイヤ')">
            <div class="gift-emoji">💎</div>
            <div class="gift-name">ダイヤ</div>
          </button>

        </div>

        <button
          class="close-gift"
          onclick="closeGiftPanel()"
        >
          閉じる
        </button>

      </div>

    </div>
  \`;

  document.getElementById("liveImage").style.display = "none";
}

/* =========================================================
   いいね
   ========================================================= */

function likeLive() {

  if (state.liked) {
    showToast("いいね済みです");
    return;
  }

  state.liked = true;

  const btn = document.getElementById("likeCircle");

  if (btn) {
    btn.classList.add("like-active");
  }

  wsSend({
    type: "like",
    liveId: state.liveId
  });

  showToast("❤️ いいね！");
}

/* =========================================================
   ブロック
   ========================================================= */

function blockLive() {

  if (!state.liveId) return;

  state.blocked[state.liveId] = true;

  wsSend({
    type: "block",
    liveId: state.liveId
  });

  showToast("この配信をブロックしました");

  setTimeout(() => {
    goHome();
  }, 700);
}

/* =========================================================
   ギフト
   ========================================================= */

function openGiftPanel() {
  const panel = document.getElementById("giftPanel");

  if (panel) {
    panel.classList.remove("hidden");
  }
}

function closeGiftPanel() {
  const panel = document.getElementById("giftPanel");

  if (panel) {
    panel.classList.add("hidden");
  }
}

function sendGift(emoji,name) {

  wsSend({
    type: "gift",
    liveId: state.liveId,
    gift: {
      emoji,
      name
    }
  });

  closeGiftPanel();

  showToast(emoji + " " + name + "を送りました！");
}

/* =========================================================
   配信開始
   ========================================================= */

async function startBroadcast() {

  document.getElementById("bottomNav")
    .classList.add("hidden");

  state.liveId =
    "user-" +
    Math.random()
      .toString(36)
      .slice(2,10);

  state.isHost = true;

  renderHostPage();

  try {

    state.localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

    showToast("マイクを取得しました");

    connectWS();

    wsSend({
      type: "host_start",
      liveId: state.liveId,
      name: "ぼたもち",
      image:
        "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85"
    });

  } catch (error) {

    console.error(error);

    showToast(
      "マイクを使用できません。ブラウザのマイク許可を確認してください。"
    );
  }
}

function renderHostPage() {

  document.getElementById("app").innerHTML = \`
    <div class="live-page">

      <div class="live-header">

        <button
          class="back-btn"
          onclick="endBroadcast()"
        >
          ×
        </button>

        <div class="live-name">
          あなたの配信
        </div>

        <div class="live-status">
          ● LIVE
        </div>

      </div>

      <div class="live-visual">

        <img
          id="hostImage"
          class="live-image"
          src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85"
          alt=""
        >

        <div class="live-overlay">

          <div class="live-info">

            <div class="live-info-title">
              あなたの配信
            </div>

            <div
              id="hostViewerCount"
              class="live-info-sub"
            >
              視聴者 0人
            </div>

          </div>

        </div>

      </div>

      <div class="live-content">

        <div class="live-message">
          声でつながる、みんなの居場所。
        </div>

        <div class="live-buttons">

          <button
            class="action-button gift-button"
            onclick="showToast('ギフトを受け取りました')"
          >
            🎁 ギフト
          </button>

          <button
            class="action-button"
            onclick="showToast('いいねを受け取りました')"
          >
            ❤️ いいね
          </button>

          <button
            class="action-button"
            onclick="showToast('ブロック管理')"
          >
            🚫 ブロック
          </button>

        </div>

        <div class="host-panel">

          <div class="host-title">
            🎨 配信画面カスタム
          </div>

          <div class="host-controls">

            <input
              id="customImageUrl"
              class="custom-input"
              type="url"
              placeholder="画像URLを入力"
            >

            <button
              class="control-button primary"
              onclick="changeBroadcastImage()"
            >
              画像を変更
            </button>

            <button
              class="control-button"
              onclick="resetBroadcastImage()"
            >
              初期画像に戻す
            </button>

            <button
              class="control-button danger"
              onclick="endBroadcast()"
            >
              配信を終了する
            </button>

          </div>

        </div>

      </div>

    </div>
  \`;
}

/* =========================================================
   配信画像変更
   ========================================================= */

function changeBroadcastImage() {

  const input =
    document.getElementById("customImageUrl");

  if (!input) return;

  const url = input.value.trim();

  if (!url) {
    showToast("画像URLを入力してください");
    return;
  }

  const image =
    document.getElementById("hostImage");

  if (!image) return;

  image.src = url;

  state.currentImage = url;

  wsSend({
    type: "image",
    liveId: state.liveId,
    image: url
  });

  showToast("配信画像を変更しました");
}

function resetBroadcastImage() {

  const url =
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85";

  const image =
    document.getElementById("hostImage");

  if (image) {
    image.src = url;
  }

  state.currentImage = url;

  wsSend({
    type: "image",
    liveId: state.liveId,
    image: url
  });

  showToast("初期画像に戻しました");
}

/* =========================================================
   配信終了
   ========================================================= */

function endBroadcast() {

  wsSend({
    type: "host_end",
    liveId: state.liveId
  });

  Object.keys(state.peers).forEach(id => {

    try {
      state.peers[id].close();
    } catch (_) {}

  });

  state.peers = {};

  if (state.localStream) {

    state.localStream
      .getTracks()
      .forEach(track => track.stop());

    state.localStream = null;
  }

  state.liveId = null;
  state.isHost = false;

  showToast("配信を終了しました");

  setTimeout(() => {
    goHome();
  }, 500);
}

/* =========================================================
   WebRTC
   ========================================================= */

const rtcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "stun:stun1.l.google.com:19302"
    }
  ]
};

async function createHostPeer(viewerId) {

  if (!state.localStream) return;

  if (state.peers[viewerId]) {

    try {
      state.peers[viewerId].close();
    } catch (_) {}

  }

  const pc =
    new RTCPeerConnection(rtcConfig);

  state.peers[viewerId] = pc;

  state.localStream
    .getTracks()
    .forEach(track => {
      pc.addTrack(
        track,
        state.localStream
      );
    });

  pc.onicecandidate = event => {

    if (!event.candidate) return;

    wsSend({
      type: "ice",
      target: viewerId,
      candidate: event.candidate
    });
  };

  pc.onconnectionstatechange = () => {

    const status =
      pc.connectionState;

    console.log(
      "Host peer:",
      viewerId,
      status
    );

    if (
      status === "failed" ||
      status === "closed" ||
      status === "disconnected"
    ) {

      try {
        pc.close();
      } catch (_) {}

      delete state.peers[viewerId];
    }
  };

  const offer =
    await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    });

  await pc.setLocalDescription(offer);

  wsSend({
    type: "offer",
    target: viewerId,
    offer: pc.localDescription
  });
}

async function handleOffer(data) {

  if (state.isHost) return;

  const pc =
    new RTCPeerConnection(rtcConfig);

  state.peers[data.from] = pc;

  pc.onicecandidate = event => {

    if (!event.candidate) return;

    wsSend({
      type: "ice",
      target: data.from,
      candidate: event.candidate
    });
  };

  pc.ontrack = event => {

    const video =
      document.getElementById("remoteVideo");

    if (!video) return;

    if (event.streams && event.streams[0]) {

      video.srcObject =
        event.streams[0];

      video.classList.remove("hidden");

      video.play()
        .catch(() => {});

      const image =
        document.getElementById("liveImage");

      if (image) {
        image.style.display = "none";
      }
    }
  };

  pc.onconnectionstatechange = () => {

    console.log(
      "Viewer peer:",
      pc.connectionState
    );

    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "closed"
    ) {

      try {
        pc.close();
      } catch (_) {}

    }
  };

  await pc.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );

  const answer =
    await pc.createAnswer();

  await pc.setLocalDescription(answer);

  wsSend({
    type: "answer",
    target: data.from,
    answer: pc.localDescription
  });
}

async function handleAnswer(data) {

  const pc =
    state.peers[data.from];

  if (!pc) return;

  await pc.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );
}

async function handleIce(data) {

  const pc =
    state.peers[data.from];

  if (!pc) return;

  try {

    await pc.addIceCandidate(
      new RTCIceCandidate(data.candidate)
    );

  } catch (error) {

    console.error(
      "ICE error",
      error
    );
  }
}

/* =========================================================
   WebSocket受信
   ========================================================= */

async function handleSocketMessage(data) {

  if (data.type === "hello") {

    state.socketId =
      data.socketId;

    return;
  }

  if (data.type === "host_viewer_joined") {

    if (!state.isHost) return;

    await createHostPeer(
      data.viewerId
    );

    const count =
      document.getElementById(
        "hostViewerCount"
      );

    if (count) {
      count.textContent =
        "視聴者 " +
        Number(data.viewerCount || 0) +
        "人";
    }

    return;
  }

  if (data.type === "offer") {

    await handleOffer(data);

    return;
  }

  if (data.type === "answer") {

    await handleAnswer(data);

    return;
  }

  if (data.type === "ice") {

    await handleIce(data);

    return;
  }

  if (data.type === "live_info") {

    const title =
      document.getElementById(
        "liveTitle"
      );

    if (title) {
      title.textContent =
        data.name || "配信中";
    }

    const count =
      document.getElementById(
        "viewerCount"
      );

    if (count) {
      count.textContent =
        "👁 " +
        Number(data.viewers || 0) +
        "人が視聴中";
    }

    const image =
      document.getElementById(
        "liveImage"
      );

    if (image && data.image) {

      image.src =
        data.image;

      image.style.display =
        "block";

      state.currentImage =
        data.image;
    }

    return;
  }

  if (data.type === "image") {

    const image =
      document.getElementById(
        "liveImage"
      );

    if (image && data.image) {

      image.src =
        data.image;

      image.style.display =
        "block";

      state.currentImage =
        data.image;
    }

    return;
  }

  if (data.type === "like") {

    showToast(
      "❤️ いいね！"
    );

    return;
  }

  if (data.type === "gift") {

    showToast(
      String(data.gift?.emoji || "🎁") +
      " ギフトが届きました！"
    );

    return;
  }

  if (data.type === "live_ended") {

    showToast(
      "配信が終了しました"
    );

    setTimeout(() => {
      goHome();
    }, 800);

    return;
  }
}

/* =========================================================
   初期表示
   ========================================================= */

goHome();

</script>

</body>
</html>
`;

/* =========================================================
   HTTP
   ========================================================= */

server.on("request", (req,res) => {

  const url =
    new URL(
      req.url,
      "http://" + req.headers.host
    );

  if (url.pathname === "/api/home") {

    res.writeHead(200, {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control":
        "no-store"
    });

    res.end(
      JSON.stringify({
        hero:
          "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=90",

        ranking:
          allRanking,

        newcomers:
          allNewcomers
      })
    );

    return;
  }

  if (url.pathname === "/api/ranking") {

    res.writeHead(200, {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control":
        "no-store"
    });

    res.end(
      JSON.stringify(allRanking)
    );

    return;
  }

  if (url.pathname === "/api/newcomers") {

    res.writeHead(200, {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control":
        "no-store"
    });

    res.end(
      JSON.stringify(allNewcomers)
    );

    return;
  }

  if (url.pathname === "/health") {

    res.writeHead(200, {
      "Content-Type":
        "text/plain; charset=utf-8"
    });

    res.end("OK");

    return;
  }

  res.writeHead(200, {
    "Content-Type":
      "text/html; charset=utf-8",
    "Cache-Control":
      "no-store"
  });

  res.end(HTML);
});

/* =========================================================
   WebSocket
   ========================================================= */

wss.on("connection", ws => {

  const socketId =
    Math.random()
      .toString(36)
      .slice(2,12);

  sockets.set(socketId, {
    ws,
    liveId: null,
    role: null
  });

  send(ws, {
    type: "hello",
    socketId
  });

  ws.on("message", raw => {

    let data;

    try {
      data =
        JSON.parse(
          raw.toString()
        );
    } catch (error) {

      return;
    }

    handleServerMessage(
      socketId,
      data
    );
  });

  ws.on("close", () => {

    const client =
      sockets.get(socketId);

    if (client) {

      if (client.liveId) {

        const room =
          liveRooms.get(
            client.liveId
          );

        if (room) {

          if (client.role === "host") {

            room.host =
              null;

            room.viewers.forEach(
              viewerId => {

                const viewer =
                  sockets.get(
                    viewerId
                  );

                if (viewer) {

                  send(
                    viewer.ws,
                    {
                      type:
                        "live_ended"
                    }
                  );

                  viewer.liveId =
                    null;
                }
              }
            );

            liveRooms.delete(
              client.liveId
            );

          } else {

            room.viewers.delete(
              socketId
            );

            if (room.host) {

              const host =
                sockets.get(
                  room.host
                );

              if (host) {

                send(
                  host.ws,
                  {
                    type:
                      "viewer_left",
                    viewerId:
                      socketId,
                    viewerCount:
                      room.viewers.size
                  }
                );
              }
            }
          }
        }
      }

      sockets.delete(
        socketId
      );
    }
  });

  ws.on("error", () => {});
});

/* =========================================================
   WSメッセージ処理
   ========================================================= */

function handleServerMessage(
  socketId,
  data
) {

  const client =
    sockets.get(socketId);

  if (!client) return;

  if (data.type === "host_start") {

    const liveId =
      String(data.liveId);

    let room =
      liveRooms.get(liveId);

    if (!room) {

      room = {
        host: socketId,
        name:
          data.name || "ライバー",
        image:
          data.image || "",
        viewers:
          new Set(),
        likes: 0
      };

      liveRooms.set(
        liveId,
        room
      );

    } else {

      room.host =
        socketId;

      room.name =
        data.name ||
        room.name;

      room.image =
        data.image ||
        room.image;
    }

    client.liveId =
      liveId;

    client.role =
      "host";

    return;
  }

  if (data.type === "host_end") {

    const liveId =
      data.liveId;

    const room =
      liveRooms.get(liveId);

    if (!room) return;

    if (room.host !== socketId) {
      return;
    }

    room.viewers.forEach(
      viewerId => {

        const viewer =
          sockets.get(
            viewerId
          );

        if (viewer) {

          send(
            viewer.ws,
            {
              type:
                "live_ended"
            }
          );

          viewer.liveId =
            null;

          viewer.role =
            null;
        }
      }
    );

    liveRooms.delete(
      liveId
    );

    return;
  }

  if (data.type === "join") {

    const liveId =
      String(data.liveId);

    const room =
      liveRooms.get(liveId);

    client.liveId =
      liveId;

    client.role =
      "viewer";

    if (!room) {

      send(
        client.ws,
        {
          type:
            "live_info",
          name:
            "配信を準備中です",
          image: "",
          viewers: 0
        }
      );

      return;
    }

    room.viewers.add(
      socketId
    );

    send(
      client.ws,
      {
        type:
          "live_info",
        name:
          room.name,
        image:
          room.image,
        viewers:
          room.viewers.size
      }
    );

    if (room.host) {

      const host =
        sockets.get(
          room.host
        );

      if (host) {

        send(
          host.ws,
          {
            type:
              "host_viewer_joined",
            viewerId:
              socketId,
            viewerCount:
              room.viewers.size
          }
        );
      }
    }

    return;
  }

  if (data.type === "offer") {

    sendToSocket(
      data.target,
      {
        type:
          "offer",
        from:
          socketId,
        offer:
          data.offer
      }
    );

    return;
  }

  if (data.type === "answer") {

    sendToSocket(
      data.target,
      {
        type:
          "answer",
        from:
          socketId,
        answer:
          data.answer
      }
    );

    return;
  }

  if (data.type === "ice") {

    sendToSocket(
      data.target,
      {
        type:
          "ice",
        from:
          socketId,
        candidate:
          data.candidate
      }
    );

    return;
  }

  if (data.type === "like") {

    const room =
      liveRooms.get(
        data.liveId
      );

    if (!room) return;

    room.likes++;

    broadcastRoom(
      data.liveId,
      {
        type:
          "like"
      },
      socketId
    );

    return;
  }

  if (data.type === "gift") {

    broadcastRoom(
      data.liveId,
      {
        type:
          "gift",
        gift:
          data.gift
      },
      socketId
    );

    return;
  }

  if (data.type === "block") {

    return;
  }

  if (data.type === "image") {

    const room =
      liveRooms.get(
        data.liveId
      );

    if (!room) return;

    if (room.host !== socketId) {
      return;
    }

    room.image =
      String(data.image || "");

    broadcastRoom(
      data.liveId,
      {
        type:
          "image",
        image:
          room.image
      }
    );

    return;
  }
}

/* =========================================================
   ヘルパー
   ========================================================= */

function send(ws,data) {

  if (!ws) return;

  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  try {

    ws.send(
      JSON.stringify(data)
    );

  } catch (_) {}
}

function sendToSocket(
  socketId,
  data
) {

  const client =
    sockets.get(
      socketId
    );

  if (!client) return;

  send(
    client.ws,
    data
  );
}

function broadcastRoom(
  liveId,
  data,
  exceptId
) {

  const room =
    liveRooms.get(
      liveId
    );

  if (!room) return;

  if (room.host) {

    if (room.host !== exceptId) {

      const host =
        sockets.get(
          room.host
        );

      if (host) {
        send(
          host.ws,
          data
        );
      }
    }
  }

  room.viewers.forEach(
    viewerId => {

      if (
        viewerId === exceptId
      ) {
        return;
      }

      const viewer =
        sockets.get(
          viewerId
        );

      if (viewer) {

        send(
          viewer.ws,
          data
        );
      }
    }
  );
}

/* =========================================================
   起動
   ========================================================= */

server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "VoiceポタLive server listening on " +
      HOST +
      ":" +
      PORT
    );

  }
);

server.on("error", error => {

  console.error(
    "SERVER ERROR:",
    error
  );

});

process.on(
  "uncaughtException",
  error => {

    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );

  }
);

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "UNHANDLED REJECTION:",
      error
    );

  }
);
