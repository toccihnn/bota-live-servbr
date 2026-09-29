const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

/*
  VoiceボタLive - stable integrated version
  - WebRTC audio path kept from the previously working low-latency version
  - Home / TOP50 / 新人ライバー pages
  - Horizontal ranking previews (10 entries)
  - Live screen: gift / like / block / custom image
  - Comments
  - Images use object-fit:contain so they are never cropped
*/

const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// public/home.png
const HERO_IMAGE_URL = "/home.png";

const RANK_IMAGES = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=700&q=85"
];

const HERO_COPY =
  "声でつながる、みんなの居場所。";

const HERO_TITLE =
  "あなたの声が、誰かの夜を照らす。";

const names = [
  "月夜ぼた",
  "蒼い月",
  "花音",
  "夜空りん",
  "ミルキー",
  "星乃こえ",
  "しずく",
  "月灯り",
  "あかね",
  "みお",
  "ルナ",
  "そらね",
  "ゆら",
  "ひなた",
  "ことは",
  "あお",
  "みつき",
  "ほたる",
  "しおん",
  "りつ",
  "ねむ",
  "すず",
  "こはる",
  "あんず",
  "つむぎ",
  "なぎ",
  "ひかり",
  "さくら",
  "ゆめ",
  "かえで",
  "みなと",
  "れん",
  "あいり",
  "ゆき",
  "ましろ",
  "うた",
  "りお",
  "こよみ",
  "かなで",
  "なな",
  "つき",
  "こまち",
  "あおい",
  "すみれ",
  "ちさ",
  "えま",
  "ゆう",
  "りんね",
  "ほのか",
  "せな"
];

const top50 = names.map((name, i) => ({
  rank: i + 1,
  name,
  viewers: Math.max(8, 1680 - i * 27),
  likes: Math.max(30, 9800 - i * 91),
  image: RANK_IMAGES[i % RANK_IMAGES.length],
  live: i < 12,
  room: "月光花の部屋"
}));

const newcomers = Array.from({ length: 30 }, (_, i) => ({
  rank: i + 1,
  name:
    [
      "新人ぼた",
      "はじめまして月",
      "ことり声",
      "新人ルナ",
      "初配信あお",
      "夜ふかし新人",
      "新人かなで",
      "星くず",
      "新人しずく",
      "月見うた"
    ][i % 10] + (i >= 10 ? i + 1 : ""),
  viewers: Math.max(1, 220 - i * 6),
  likes: Math.max(10, 1300 - i * 31),
  image: RANK_IMAGES[(i + 3) % RANK_IMAGES.length],
  live: i < 6,
  room: "新人ライバーの部屋"
}));

const HTML = `<!doctype html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<title>VoiceボタLive</title>

<style>

* {
  box-sizing: border-box;
}

:root {
  --bg: #050713;
  --panel: #0d1125;
  --panel2: #121938;
  --line: #282d55;
  --text: #fff;
  --muted: #9da6c9;
  --blue: #4fc8ff;
  --violet: #8d67ff;
  --pink: #f14cff;
  --danger: #ff426d;
  --green: #63f7ae;
}

html,
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Arial, "Noto Sans JP", sans-serif;
}

body {
  min-height: 100vh;
  overflow-x: hidden;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.hidden {
  display: none !important;
}

#app {
  min-height: 100vh;
  padding-bottom: 92px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 62px;
  padding: 0 16px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  background: rgba(5, 7, 19, 0.92);
  backdrop-filter: blur(18px);

  border-bottom: 1px solid rgba(255,255,255,.07);
}

.brand {
  font-size: 21px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #fff,
      #5bd6ff,
      #cf74ff
    );

  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.online {
  font-size: 11px;
  color: #8fffc0;

  display: flex;
  gap: 6px;
  align-items: center;
}

.online i {
  width: 7px;
  height: 7px;
  border-radius: 50%;

  background: #5dffab;

  box-shadow:
    0 0 12px #5dffab;
}

.page {
  max-width: 760px;
  margin: auto;
  padding: 12px 12px 30px;
}

.hero {
  position: relative;
  overflow: hidden;

  border-radius: 28px;
  min-height: 560px;

  background: #070914;

  border: 1px solid #2a2e58;

  box-shadow:
    0 20px 70px rgba(52,60,170,.22);
}

.hero-img-wrap {
  position: absolute;
  inset: 0;

  background: #02030a;

  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-img {
  width: 100%;
  height: 100%;

  object-fit: contain;
  object-position: center center;

  display: block;

  opacity: 1;
}

.hero-shade {
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.08) 15%,
      rgba(2,4,15,.25) 45%,
      rgba(2,3,10,.96) 100%
    );
}

.hero-content {
  position: relative;
  z-index: 2;

  min-height: 560px;

  padding: 32px 22px 25px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pill {
  align-self: flex-start;

  padding: 7px 11px;

  border: 1px solid rgba(130,205,255,.35);

  border-radius: 999px;

  background: rgba(10,20,50,.58);

  font-size: 11px;
}

.hero h1 {
  font-size: 42px;
  line-height: 1.05;

  margin: 14px 0 8px;

  letter-spacing: -1.5px;
}

.hero .sub {
  font-size: 14px;
  color: #d8dcf3;
  letter-spacing: 1px;
}

.hero .copy {
  font-size: 27px;
  line-height: 1.4;

  font-weight: 900;

  margin-top: 16px;
}

.hero .desc {
  color: #c2c7dc;

  font-size: 12px;
  line-height: 1.8;

  margin-top: 10px;
}

.primary,
.secondary {
  width: 100%;

  border-radius: 17px;

  padding: 15px;

  margin-top: 14px;

  font-weight: 900;
}

.primary {
  border: 0;

  color: #fff;

  background:
    linear-gradient(
      90deg,
      #13caff,
      #7564ff,
      #df4cff
    );

  box-shadow:
    0 12px 30px rgba(109,73,255,.3);
}

.secondary {
  color: #eee;

  border: 1px solid #41466e;

  background: rgba(10,13,30,.75);
}

.section {
  margin-top: 22px;
}

.section-head {
  display: flex;

  justify-content: space-between;
  align-items: center;

  margin: 0 4px 10px;
}

.section-title {
  font-size: 20px;
  font-weight: 900;
}

.more {
  font-size: 12px;
  color: #b28cff;

  background: none;
  border: 0;
}

.scroller {
  display: flex;

  gap: 10px;

  overflow-x: auto;

  padding: 2px 2px 10px;

  scroll-snap-type: x proximity;
}

.scroller::-webkit-scrollbar {
  display: none;
}

.rank-card {
  flex: 0 0 112px;

  scroll-snap-align: start;

  border-radius: 17px;

  overflow: hidden;

  background:
    linear-gradient(
      145deg,
      #151b3c,
      #0c1024
    );

  border: 1px solid #272d55;

  position: relative;
}

.rank-img {
  width: 100%;
  height: 128px;

  display: block;

  object-fit: contain;

  background: #05060d;
}

.rank-body {
  padding: 8px;
}

.rank-no {
  font-size: 10px;
  color: #aeb5d2;
}

.rank-name {
  font-size: 12px;
  font-weight: 900;

  margin-top: 2px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-meta {
  font-size: 9px;

  color: #9199ba;

  margin-top: 4px;
}

.live-pill {
  position: absolute;

  top: 7px;
  left: 7px;

  background: #f02c7d;
  color: #fff;

  padding: 4px 7px;

  border-radius: 999px;

  font-size: 8px;

  font-weight: 900;
}

.features {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 10px;

  margin-top: 18px;
}

.feature {
  padding: 15px;

  border-radius: 18px;

  background: #0d1127;

  border: 1px solid #24294e;
}

.feature b {
  font-size: 13px;
}

.feature p {
  font-size: 10px;

  color: #8f98ba;

  line-height: 1.6;

  margin: 6px 0 0;
}

.bottom-nav {
  position: fixed;

  z-index: 100;

  left: 0;
  right: 0;
  bottom: 0;

  height: 78px;

  display: grid;

  grid-template-columns:
    repeat(5, 1fr);

  align-items: center;

  background:
    rgba(5,7,19,.95);

  backdrop-filter: blur(18px);

  border-top:
    1px solid rgba(255,255,255,.08);

  padding-bottom:
    env(safe-area-inset-bottom);
}

.nav-item {
  background: none;

  border: 0;

  color: #7f88ad;

  font-size: 10px;

  font-weight: 700;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 4px;
}

.nav-item.active {
  color: #bd8cff;
}

.nav-icon {
  font-size: 21px;
}

.nav-center {
  width: 54px;
  height: 54px;

  margin-top: -26px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  background:
    linear-gradient(
      145deg,
      #30d2ff,
      #7766ff,
      #e34cff
    );

  border: 3px solid #111632;

  box-shadow:
    0 0 28px rgba(111,91,255,.65);

  font-size: 24px;

  color: #fff;
}

.page-view {
  padding-top: 4px;
}

.back {
  border: 0;

  background: none;

  color: #b18bff;

  padding: 8px 0;

  font-weight: 900;
}

.list-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 10px;
}

.list-card {
  border:
    1px solid #282d55;

  border-radius: 18px;

  overflow: hidden;

  background: #0d1127;
}

.list-card img {
  width: 100%;
  height: 160px;

  object-fit: contain;

  background: #05060d;

  display: block;
}

.list-card .lb {
  padding: 10px;
}

.list-card .nm {
  font-weight: 900;
}

.list-card .sm {
  font-size: 10px;

  color: #9099b8;

  margin-top: 4px;
}

.live-screen {
  position: fixed;

  inset: 0;

  z-index: 200;

  background: #02030a;

  color: #fff;

  overflow: auto;

  padding-bottom: 28px;
}

.live-top {
  height: 58px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 0 14px;

  position: sticky;

  top: 0;

  z-index: 3;

  background:
    rgba(0,0,0,.72);

  backdrop-filter: blur(14px);
}

.live-title {
  font-weight: 900;
}

.live-dot {
  color: #ff4d91;

  font-size: 11px;

  font-weight: 900;
}

.live-media {
  width: 100%;

  height:
    min(68vh,620px);

  background: #000;

  display: flex;

  align-items: center;

  justify-content: center;

  border-bottom:
    1px solid #1d2140;
}

.live-media img {
  width: 100%;
  height: 100%;

  object-fit: contain;

  display: block;
}

.live-info {
  padding: 13px 14px;
}

.host-name {
  font-size: 19px;
  font-weight: 900;
}

.viewers {
  font-size: 11px;

  color: #9da6c9;

  margin-top: 3px;
}

.tagline {
  color: #c7cbe0;

  font-size: 12px;

  line-height: 1.7;

  margin-top: 10px;
}

.actions {
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;

  margin-top: 13px;
}

.action {
  border: 0;

  border-radius: 14px;

  padding: 12px 6px;

  font-weight: 900;

  color: #fff;

  background: #151a38;
}

.action.gift {
  background:
    linear-gradient(
      90deg,
      #ff3d9b,
      #ff5c5c
    );
}

.action.like {
  background:
    linear-gradient(
      90deg,
      #ff425f,
      #ff78a5
    );
}

.action.block {
  background: #2a0e1a;
}

.count {
  font-size: 10px;

  opacity: .85;

  margin-left: 3px;
}

.custom-panel {
  margin-top: 12px;

  padding: 12px;

  border-radius: 16px;

  background: #0d1128;

  border:
    1px solid #252a4d;
}

.custom-panel h3 {
  font-size: 13px;

  margin: 0 0 8px;
}

.custom-row {
  display: flex;

  gap: 7px;
}

.custom-row input {
  min-width: 0;

  flex: 1;

  border:
    1px solid #343a63;

  background: #070914;

  color: #fff;

  border-radius: 11px;

  padding: 10px;

  font-size: 11px;
}

.small-btn {
  border: 0;

  border-radius: 11px;

  padding: 0 12px;

  background: #7564ff;

  color: #fff;

  font-weight: 900;
}

.stop-live {
  width: 100%;

  border: 0;

  border-radius: 14px;

  padding: 14px;

  margin-top: 12px;

  background:
    linear-gradient(
      90deg,
      #ff477c,
      #a845ff
    );

  color: #fff;

  font-weight: 900;
}

.audio-on {
  width: 100%;

  border: 0;

  border-radius: 14px;

  padding: 14px;

  margin-top: 10px;

  background: #ffbf3e;

  color: #1c1200;

  font-weight: 900;
}

.gift-panel {
  position: fixed;

  left: 10px;
  right: 10px;

  bottom: 88px;

  z-index: 220;

  padding: 12px;

  border-radius: 20px;

  background:
    rgba(12,15,34,.98);

  border:
    1px solid #3a3f6b;

  box-shadow:
    0 20px 60px rgba(0,0,0,.5);
}

.gift-grid {
  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  gap: 8px;
}
                👥 ${x.viewers}
                ·
                ♥ ${x.likes}
                ${
                  x.live
                    ? " · 🔴 LIVE"
                    : ""
                }
              </div>

            </div>

          </article>

        `)
        .join("");
}


function openPage(type) {

  if (type === "home") {

    document
      .getElementById("homePage")
      .classList.remove("hidden");

    document
      .getElementById("listPage")
      .classList.add("hidden");

    return;
  }


  if (
    type === "top50" ||
    type === "newcomers"
  ) {

    renderList(type);

  }

}


function openLive() {

  liveScreen
    .classList.remove("hidden");

  document.body.style.overflow =
    "hidden";

}


function closeLive() {

  liveScreen
    .classList.add("hidden");

  document.body.style.overflow =
    "";

}


function startHost() {

  manuallyStopped = false;

  myRole = "host";

  likeCount = 0;

  document
    .getElementById("likeCount")
    .textContent = "0";

  openLive();

  setLiveStatus(
    "マイクを準備しています..."
  );

  startConnection();
}


function startViewer() {

  manuallyStopped = false;

  myRole = "viewer";

  likeCount = 0;

  document
    .getElementById("likeCount")
    .textContent = "0";

  openLive();

  setLiveStatus(
    "配信者を探しています..."
  );

  startConnection();
}


function startConnection() {

  if (ws) {

    try {
      ws.close();
    } catch (e) {}

    ws = null;
  }


  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";


  const url =
    protocol +
    "//" +
    location.host;


  ws = new WebSocket(url);


  ws.onopen = () => {

    log("WebSocket接続成功");

    send({
      type: "join",
      room,
      role: myRole
    });

  };


  ws.onmessage = async event => {

    try {

      const msg =
        JSON.parse(event.data);

      await handleMessage(msg);

    } catch (e) {

      log(
        "メッセージ処理エラー: " +
        e.message
      );

    }

  };


  ws.onerror = () => {

    setLiveStatus(
      "接続エラー"
    );

    log(
      "WebSocketエラー"
    );

  };


  ws.onclose = () => {

    roomJoined = false;

    log(
      "WebSocket切断"
    );


    if (
      !manuallyStopped &&
      liveScreen &&
      !liveScreen.classList.contains(
        "hidden"
      )
    ) {

      setLiveStatus(
        "再接続しています..."
      );


      if (reconnectTimer) {

        clearTimeout(
          reconnectTimer
        );

      }


      reconnectTimer =
        setTimeout(() => {

          if (!manuallyStopped) {

            startConnection();

          }

        }, 1500);

    }

  };

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


async function createHostStream() {

  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });


    log(
      "マイク取得成功"
    );


    return true;

  } catch (e) {

    log(
      "マイク取得エラー: " +
      e.message
    );


    setLiveStatus(
      "マイクへのアクセスを許可してください"
    );


    return false;

  }

}


function optimizeOpusSDP(sdp) {

  if (!sdp)
    return sdp;


  return sdp
    .split("\r\n")
    .map(line => {

      if (
        line.startsWith(
          "a=fmtp:"
        ) &&
        line.includes(
          "useinbandfec"
        )
      ) {

        if (
          !line.includes(
            "maxaveragebitrate"
          )
        ) {

          line +=
            ";maxaveragebitrate=64000";

        }

      }

      return line;

    })
    .join("\r\n");

}


async function sendOffer(
  targetViewerId
) {

  if (
    myRole !== "host"
  ) {
    return;
  }


  if (!localStream) {

    const ok =
      await createHostStream();

    if (!ok)
      return;

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
      ]
    });


  viewerConnections.set(
    targetViewerId,
    pc
  );


  hostPendingCandidates.set(
    targetViewerId,
    []
  );


  for (
    const track of
    localStream.getTracks()
  ) {

    pc.addTrack(
      track,
      localStream
    );

  }


  pc.onicecandidate = event => {

    if (
      event.candidate
    ) {

      send({

        type: "signal",

        target:
          targetViewerId,

        signal: {

          type: "candidate",

          candidate:
            event.candidate

        }

      });

    }

  };


  pc.onconnectionstatechange =
    () => {

      log(
        "視聴者接続状態: " +
        pc.connectionState
      );

    };


  let offer =
    await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    });


  offer = {

    type: "offer",

    sdp:
      optimizeOpusSDP(
        offer.sdp
      )

  };


  await pc.setLocalDescription(
    offer
  );


  send({

    type: "signal",

    target:
      targetViewerId,

    signal: offer

  });


  log(
    "Offer送信: " +
    targetViewerId
  );

}


async function createViewerPeer() {

  if (
    viewerPeer
  ) {

    try {
      viewerPeer.close();
    } catch (e) {}

  }


  pendingCandidates = [];


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
      ]
    });


  viewerPeer = pc;


  pc.ontrack = event => {

    if (
      event.streams &&
      event.streams[0]
    ) {

      remoteAudio.srcObject =
        event.streams[0];

      remoteAudio.muted = true;


      document
        .getElementById(
          "audioButton"
        )
        .classList.remove(
          "hidden"
        );


      setLiveStatus(
        "🔴 配信中 / 音声ONを押してください"
      );

    }

  };


  pc.onicecandidate =
    event => {

      if (
        event.candidate &&
        viewerId
      ) {

        send({

          type: "signal",

          target:
            viewerId,

          signal: {

            type: "candidate",

            candidate:
              event.candidate

          }

        });

      }

    };


  pc.onconnectionstatechange =
    () => {

      log(
        "配信接続状態: " +
        pc.connectionState
      );


      if (
        pc.connectionState ===
          "connected"
      ) {

        setLiveStatus(
          "🔴 配信中"
        );

      }


      if (
        pc.connectionState ===
          "failed"
      ) {

        setLiveStatus(
          "音声接続に失敗しました"
        );

      }

    };


  return pc;

}


async function handleViewerSignal(
  msg
) {

  if (
    msg.type === "offer"
  ) {

    const pc =
      await createViewerPeer();


    try {

      await pc.setRemoteDescription({
        type: "offer",
        sdp: msg.sdp
      });


      for (
        const c of
        pendingCandidates
      ) {

        try {

          await pc.addIceCandidate(
            c
          );

        } catch (e) {}

      }


      pendingCandidates = [];


      let answer =
        await pc.createAnswer();


      answer = {

        type: "answer",

        sdp:
          optimizeOpusSDP(
            answer.sdp
          )

      };


      await pc.setLocalDescription(
        answer
      );


      send({

        type: "signal",

        target:
          viewerId,

        signal: answer

      });


    } catch (e) {

      log(
        "Offer処理エラー: " +
        e.message
      );

    }


    return;

  }


  if (
    msg.type ===
    "candidate"
  ) {

    const c =
      new RTCIceCandidate(
        msg.candidate
      );


    if (
      viewerPeer &&
      viewerPeer.remoteDescription
    ) {

      try {

        await viewerPeer
          .addIceCandidate(
            c
          );

      } catch (e) {}

    } else {

      pendingCandidates.push(
        c
      );

    }

  }

}


async function handleHostSignal(
  msg
) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc)
    return;


  if (
    msg.signal.type ===
    "answer"
  ) {

    await pc.setRemoteDescription({

      type: "answer",

      sdp:
        msg.signal.sdp

    });


    const list =
      hostPendingCandidates.get(
        msg.from
      ) || [];


    for (
      const c of list
    ) {

      try {

        await pc.addIceCandidate(
          c
        );

      } catch (e) {}

    }


    hostPendingCandidates.delete(
      msg.from
    );


    return;

  }


  if (
    msg.signal.type ===
    "candidate"
  ) {

    const c =
      new RTCIceCandidate(
        msg.signal.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          c
        );

      } catch (e) {}

    } else {

      if (
        !hostPendingCandidates.has(
          msg.from
        )
      ) {

        hostPendingCandidates.set(
          msg.from,
          []
        );

      }


      hostPendingCandidates
        .get(msg.from)
        .push(c);

    }

  }

}


async function handleMessage(
  msg
) {

  if (
    msg.type ===
    "welcome"
  ) {

    myId = msg.id;

    return;

  }


  if (
    msg.type ===
    "join-ok"
  ) {

    roomJoined = true;

    return;

  }


  if (
    msg.type ===
    "room-status"
  ) {

    document
      .getElementById(
        "liveViewers"
      )
      .textContent =
        "視聴者 " +
        msg.viewers +
        "人";


    if (
      myRole === "viewer" &&
      !msg.live
    ) {

      setLiveStatus(
        "配信者を待っています..."
      );

    }


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

    setLiveStatus(
      "🔴 配信中"
    );

    return;

  }


  if (
    msg.type ===
      "stream-stopped" ||
    msg.type ===
      "host-left"
  ) {

    setLiveStatus(
      "配信終了"
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

      try {
        pc.close();
      } catch (e) {}


      viewerConnections.delete(
        msg.viewerId
      );

    }


    hostPendingCandidates.delete(
      msg.viewerId
    );


    return;

  }


  if (
    msg.type ===
    "live-meta"
  ) {

    if (
      myRole === "viewer" &&
      msg.image
    ) {

      liveImage.src =
        msg.image;

    }


    return;

  }


  if (
    msg.type ===
    "like-count"
  ) {

    document
      .getElementById(
        "likeCount"
      )
      .textContent =
        msg.count;


    return;

  }


  if (
    msg.type ===
    "gift"
  ) {

    log(
      "🎁 " +
      msg.gift +
      " が届きました"
    );


    return;

  }


  if (
    msg.type ===
    "comment"
  ) {

    addComment(
      msg.name ||
        "ライバー",

      String(
        msg.text || ""
      )
    );


    return;

  }


  if (
    msg.type ===
    "blocked"
  ) {

    setLiveStatus(
      "この配信者をブロックしました"
    );


    return;

  }

}


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
      .classList.add(
        "hidden"
      );


    setLiveStatus(
      "🔴 配信中 / 音声ON"
    );


  } catch (e) {

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}


function sendLike() {

  send({
    type: "like"
  });

}


function toggleGifts() {

  document
    .getElementById(
      "giftPanel"
    )
    .classList.toggle(
      "hidden"
    );

}


function sendGift(
  icon,
  name
) {

  send({

    type: "gift",

    gift:
      icon +
      " " +
      name

  });


  document
    .getElementById(
      "giftPanel"
    )
    .classList.add(
      "hidden"
    );


  log(
    "🎁 " +
    name +
    " を送信"
  );

}


function sendBlock() {

  if (
    confirm(
      "この配信者をブロックしますか？"
    )
  ) {

    send({
      type: "block"
    });

  }

}


function toggleCustom() {

  document
    .getElementById(
      "customPanel"
    )
    .classList.toggle(
      "hidden"
    );

}


function applyCustomImage() {

  const url =
    document
      .getElementById(
        "customUrl"
      )
      .value
      .trim();


  if (!url)
    return;


  liveImage.src =
    url;


  if (
    myRole === "host"
  ) {

    send({

      type: "live-meta",

      image: url

    });

  }

}


function resetCustomImage() {

  liveImage.src =
    defaultLiveImage;


  if (
    myRole === "host"
  ) {

    send({

      type: "live-meta",

      image:
        defaultLiveImage

    });

  }

}


function stopLive() {

  manuallyStopped =
    true;

  roomJoined =
    false;


  if (reconnectTimer) {

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      null;

  }


  if (localStream) {

    for (
      const t of
      localStream.getTracks()
    ) {

      t.stop();

    }

    localStream =
      null;

  }


  for (
    const pc of
    viewerConnections.values()
  ) {

    try {

      pc.close();

    } catch (e) {}

  }


  viewerConnections.clear();


  hostPendingCandidates.clear();


  if (viewerPeer) {

    try {

      viewerPeer.close();

    } catch (e) {}

    viewerPeer =
      null;

  }


  pendingCandidates =
    [];


  if (
    ws &&
    ws.readyState ===
    WebSocket.OPEN
  ) {

    send({
      type:
        "stream-stopped"
    });

  }


  if (ws) {

    try {

      ws.close(
        1000,
        "user stopped"
      );

    } catch (e) {}

    ws = null;

  }


  remoteAudio.srcObject =
    null;

  remoteAudio.muted =
    true;


  myRole =
    null;

  viewerId =
    null;


  document
    .getElementById(
      "giftPanel"
    )
    .classList.add(
      "hidden"
    );


  liveScreen
    .classList.add(
      "hidden"
    );


  document.body.style.overflow =
    "";


  setLiveStatus(
    "停止しました"
  );

}


remoteAudio.autoplay =
  true;

remoteAudio.playsInline =
  true;

remoteAudio.volume =
  1;


document.addEventListener(
  "click",
  () => {

    if (
      myRole === "viewer" &&
      remoteAudio.srcObject &&
      remoteAudio.paused
    ) {

      remoteAudio.muted =
        false;


      remoteAudio
        .play()
        .then(
          () =>
            document
              .getElementById(
                "audioButton"
              )
              .classList.add(
                "hidden"
              )
        )
        .catch(
          () => {}
        );

    }

  },
  {
    passive: true
  }
);

</script>

</body>

</html>`;
  const pc =
    createViewerPeer();


  if (
    msg.type === "offer"
  ) {

    try {

      await pc.setRemoteDescription({

        type: "offer",

        sdp:
          msg.sdp

      });


      for (
        const c of
        pendingCandidates
      ) {

        try {

          await pc.addIceCandidate(
            c
          );

        } catch (e) {}

      }


      pendingCandidates = [];


      let answer =
        await pc.createAnswer();


      answer = {

        type: "answer",

        sdp:
          optimizeOpusSDP(
            answer.sdp
          )

      };


      await pc.setLocalDescription(
        answer
      );


      send({

        type: "signal",

        target:
          viewerId,

        signal:
          answer

      });


    } catch (e) {

      log(
        "Viewer Offer処理エラー: " +
        e.message
      );

    }


    return;

  }


  if (
    msg.type ===
    "candidate"
  ) {

    const candidate =
      new RTCIceCandidate(
        msg.candidate
      );


    if (
      pc.remoteDescription
    ) {

      try {

        await pc.addIceCandidate(
          candidate
        );

      } catch (e) {

        log(
          "ICE追加エラー: " +
          e.message
        );

      }

    } else {

      pendingCandidates.push(
        candidate
      );

    }

  }

}


async function handleHostSignal(
  msg
) {

  const pc =
    viewerConnections.get(
      msg.from
    );


  if (!pc)
    return;


  const signal =
    msg.signal;


  if (
    signal.type ===
    "answer"
  ) {

    try {

      await pc.setRemoteDescription({

        type:
          "answer",

        sdp:
          signal.sdp

      });


      const pending =
        hostPendingCandidates.get(
          msg.from
        ) || [];


      for (
        const c of pending
      ) {

        try {

          await pc.addIceCandidate(
            c
          );

        } catch (e) {}

      }


      hostPendingCandidates.delete(
        msg.from
      );


    } catch (e) {

      log(
        "Answer処理エラー: " +
        e.message
      );

    }


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

        await pc.addIceCandidate(
          candidate
        );

      } catch (e) {

        log(
          "Host ICE追加エラー: " +
          e.message
        );

      }

    } else {

      if (
        !hostPendingCandidates.has(
          msg.from
        )
      ) {

        hostPendingCandidates.set(
          msg.from,
          []
        );

      }


      hostPendingCandidates
        .get(msg.from)
        .push(candidate);

    }

  }

}


async function handleMessage(
  msg
) {

  if (
    msg.type ===
    "welcome"
  ) {

    myId =
      msg.id;

    log(
      "ID: " +
      myId
    );

    return;

  }


  if (
    msg.type ===
    "join-ok"
  ) {

    roomJoined =
      true;


    log(
      "ルーム参加OK"
    );


    return;

  }


  if (
    msg.type ===
    "room-status"
  ) {

    const viewers =
      Number(
        msg.viewers || 0
      );


    document
      .getElementById(
        "liveViewers"
      )
      .textContent =
        "視聴者 " +
        viewers +
        "人";


    if (
      myRole ===
      "viewer"
    ) {

      if (
        msg.live
      ) {

        setLiveStatus(
          "🔴 配信中 / 接続待機"
        );

      } else {

        setLiveStatus(
          "配信者を待っています..."
        );

      }

    }


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
        "視聴者参加: " +
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

    setLiveStatus(
      "🔴 配信中"
    );


    return;

  }


  if (
    msg.type ===
    "stream-stopped"
  ) {

    setLiveStatus(
      "配信終了"
    );


    if (
      myRole ===
      "viewer"
    ) {

      remoteAudio.srcObject =
        null;

    }


    return;

  }


  if (
    msg.type ===
    "host-left"
  ) {

    setLiveStatus(
      "配信者が退出しました"
    );


    remoteAudio.srcObject =
      null;


    if (viewerPeer) {

      try {

        viewerPeer.close();

      } catch (e) {}

      viewerPeer =
        null;

    }


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

      try {

        pc.close();

      } catch (e) {}

      viewerConnections.delete(
        msg.viewerId
      );

    }


    hostPendingCandidates.delete(
      msg.viewerId
    );


    return;

  }


  if (
    msg.type ===
    "live-meta"
  ) {

    if (
      myRole ===
      "viewer" &&
      msg.image
    ) {

      liveImage.src =
        msg.image;

    }


    return;

  }


  if (
    msg.type ===
    "like-count"
  ) {

    likeCount =
      Number(
        msg.count || 0
      );


    document
      .getElementById(
        "likeCount"
      )
      .textContent =
        likeCount;


    return;

  }


  if (
    msg.type ===
    "gift"
  ) {

    log(
      "🎁 " +
      String(
        msg.gift || ""
      ) +
      " が届きました"
    );


    return;

  }


  if (
    msg.type ===
    "comment"
  ) {

    addComment(

      msg.name ||
        "ライバー",

      String(
        msg.text || ""
      )

    );


    return;

  }


  if (
    msg.type ===
    "blocked"
  ) {

    setLiveStatus(
      "この配信者をブロックしました"
    );


    return;

  }

}


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
      .classList.add(
        "hidden"
      );


    setLiveStatus(
      "🔴 配信中 / 音声ON"
    );


  } catch (e) {

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}


function sendLike() {

  send({

    type:
      "like"

  });

}


function toggleGifts() {

  document
    .getElementById(
      "giftPanel"
    )
    .classList.toggle(
      "hidden"
    );

}


function sendGift(
  icon,
  name
) {

  send({

    type:
      "gift",

    gift:
      icon +
      " " +
      name

  });


  document
    .getElementById(
      "giftPanel"
    )
    .classList.add(
      "hidden"
    );


  log(
    "🎁 " +
    name +
    " を送信"
  );

}


function sendBlock() {

  if (
    !confirm(
      "この配信者をブロックしますか？"
    )
  ) {

    return;

  }


  send({

    type:
      "block"

  });


  setLiveStatus(
    "ブロック処理中..."
  );

}


function toggleCustom() {

  document
    .getElementById(
      "customPanel"
    )
    .classList.toggle(
      "hidden"
    );

}


function applyCustomImage() {

  const input =
    document
      .getElementById(
        "customUrl"
      );


  const url =
    input.value.trim();


  if (!url) {

    alert(
      "画像URLを入力してください"
    );

    return;

  }


  liveImage.src =
    url;


  if (
    myRole ===
    "host"
  ) {

    send({

      type:
        "live-meta",

      image:
        url

    });

  }


  log(
    "配信画像を変更しました"
  );

}


function resetCustomImage() {

  liveImage.src =
    defaultLiveImage;


  if (
    myRole ===
    "host"
  ) {

    send({

      type:
        "live-meta",

      image:
        defaultLiveImage

    });

  }


  log(
    "配信画像を初期画像に戻しました"
  );

}


function stopLive() {

  manuallyStopped =
    true;


  roomJoined =
    false;


  if (
    reconnectTimer
  ) {

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      null;

  }


  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    try {

      send({

        type:
          "stream-stopped"

      });

    } catch (e) {}

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => {

          try {

            track.stop();

          } catch (e) {}

        }
      );


    localStream =
      null;

  }


  for (
    const pc of
    viewerConnections.values()
  ) {

    try {

      pc.close();

    } catch (e) {}

  }


  viewerConnections.clear();


  hostPendingCandidates.clear();


  if (viewerPeer) {

    try {

      viewerPeer.close();

    } catch (e) {}

    viewerPeer =
      null;

  }


  pendingCandidates =
    [];


  remoteAudio.srcObject =
    null;


  remoteAudio.muted =
    true;


  if (ws) {

    try {

      ws.close();

    } catch (e) {}

    ws =
      null;

  }


  myRole =
    null;

  viewerId =
    null;


  liveScreen
    .classList.add(
      "hidden"
    );


  document.body.style.overflow =
    "";


  document
    .getElementById(
      "giftPanel"
    )
    .classList.add(
      "hidden"
    );


  setLiveStatus(
    "停止しました"
  );

}


remoteAudio.autoplay =
  true;

remoteAudio.playsInline =
  true;

remoteAudio.volume =
  1;


document.addEventListener(
  "click",
  () => {

    if (
      myRole ===
      "viewer" &&
      remoteAudio.srcObject &&
      remoteAudio.paused
    ) {

      remoteAudio
        .play()
        .then(
          () => {

            document
              .getElementById(
                "audioButton"
              )
              .classList.add(
                "hidden"
              );

          }
        )
        .catch(
          () => {}
        );

    }

  },
  {
    passive:
      true
  }
);

</script>
) {

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


function broadcastRoom(
  roomName,
  data,
  exceptWs = null
) {

  for (
    const client of
    clients.values()
  ) {

    if (
      client.room ===
        roomName &&
      client.ws !==
        exceptWs
    ) {

      send(
        client.ws,
        data
      );

    }

  }

}


function getRoomClients(
  roomName
) {

  const list = [];

  for (
    const client of
    clients.values()
  ) {

    if (
      client.room ===
      roomName
    ) {

      list.push(client);

    }

  }

  return list;

}


function getHost(
  roomName
) {

  for (
    const client of
    clients.values()
  ) {

    if (
      client.room ===
        roomName &&
      client.role ===
        "host"
    ) {

      return client;

    }

  }

  return null;

}


function countViewers(
  roomName
) {

  let count = 0;

  for (
    const client of
    clients.values()
  ) {

    if (
      client.room ===
        roomName &&
      client.role ===
        "viewer"
    ) {

      count++;

    }

  }

  return count;

}


function sendRoomStatus(
  roomName
) {

  const host =
    getHost(roomName);


  const viewers =
    countViewers(roomName);


  broadcastRoom(
    roomName,
    {

      type:
        "room-status",

      live:
        !!host,

      viewers

    }
  );

}


wss.on(
  "connection",
  ws => {

    const id =
      String(
        nextId++
      );


    const client = {

      id,

      ws,

      room:
        null,

      role:
        null,

      blocked:
        false

    };


    clients.set(
      id,
      client
    );


    send(
      ws,
      {

        type:
          "welcome",

        id

      }
    );


    ws.on(
      "message",
      raw => {

        let msg;

        try {

          msg =
            JSON.parse(
              raw.toString()
            );

        } catch (e) {

          return;

        }


        handleServerMessage(
          client,
          msg
        );

      }
    );


    ws.on(
      "close",
      () => {

        handleClientClose(
          client
        );

      }
    );


    ws.on(
      "error",
      () => {

        handleClientClose(
          client
        );

      }
    );

  }
);


function handleServerMessage(
  client,
  msg
) {

  if (
    !msg ||
    typeof msg.type !==
      "string"
  ) {

    return;

  }


  if (
    msg.type ===
    "join"
  ) {

    const roomName =
      String(
        msg.room ||
        "bota"
      );


    const role =
      msg.role ===
      "host"
        ? "host"
        : "viewer";


    if (
      client.room
    ) {

      return;

    }


    if (
      role ===
      "host"
    ) {

      const oldHost =
        getHost(
          roomName
        );


      if (
        oldHost
      ) {

        send(
          client.ws,
          {

            type:
              "join-error",

            message:
              "すでに配信中です"

          }
        );

        return;

      }

    }


    client.room =
      roomName;

    client.role =
      role;


    send(
      client.ws,
      {

        type:
          "join-ok",

        room:
          roomName,

        role

      }
    );


    sendRoomStatus(
      roomName
    );


    if (
      role ===
      "viewer"
    ) {

      const host =
        getHost(
          roomName
        );


      if (
        host
      ) {

        send(
          host.ws,
          {

            type:
              "viewer-joined",

            viewerId:
              client.id

          }
        );

      }

    }


    return;

  }


  if (
    msg.type ===
    "signal"
  ) {

    const target =
      String(
        msg.target ||
        ""
      );


    const targetClient =
      clients.get(
        target
      );


    if (
      !targetClient
    ) {

      return;

    }


    if (
      !targetClient.room ||
      targetClient.room !==
        client.room
    ) {

      return;

    }


    send(
      targetClient.ws,
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


  if (
    msg.type ===
    "stream-started"
  ) {

    if (
      client.role !==
      "host"
    ) {

      return;

    }


    broadcastRoom(
      client.room,
      {

        type:
          "stream-started"

      },
      client.ws
    );


    sendRoomStatus(
      client.room
    );


    return;

  }


  if (
    msg.type ===
    "stream-stopped"
  ) {

    if (
      client.role !==
      "host"
    ) {

      return;

    }


    broadcastRoom(
      client.room,
      {

        type:
          "stream-stopped"

      },
      client.ws
    );


    sendRoomStatus(
      client.room
    );


    return;

  }


  if (
    msg.type ===
    "live-meta"
  ) {

    if (
      client.role !==
      "host"
    ) {

      return;

    }


    const image =
      typeof msg.image ===
      "string"
        ? msg.image
        : "";


    if (!image)
      return;


    broadcastRoom(
      client.room,
      {

        type:
          "live-meta",

        image

      },
      client.ws
    );


    return;

  }


  if (
    msg.type ===
    "like"
  ) {

    likeCount++;


    broadcastRoom(
      client.room,
      {

        type:
          "like-count",

        count:
          likeCount

      }
    );


    return;

  }


  if (
    msg.type ===
    "gift"
  ) {

    const gift =
      String(
        msg.gift ||
        ""
      ).slice(
        0,
        100
      );


    if (!gift)
      return;


    broadcastRoom(
      client.room,
      {

        type:
          "gift",

        gift,

        from:
          client.id

      }
    );


    return;

  }


  if (
    msg.type ===
    "comment"
  ) {

    const text =
      String(
        msg.text ||
        ""
      )
      .trim()
      .slice(
        0,
        120
      );


    if (!text)
      return;


    broadcastRoom(
      client.room,
      {

        type:
          "comment",

        name:
          client.role ===
          "host"
            ? "ライバー"
            : "視聴者",

        text

      }
    );


    return;

  }


  if (
    msg.type ===
    "block"
  ) {

    client.blocked =
      true;


    send(
      client.ws,
      {

        type:
          "blocked"

      }
    );


    return;

  }

}


function handleClientClose(
  client
) {

  if (
    !clients.has(
      client.id
    )
  ) {

    return;

  }


  const roomName =
    client.room;


  const wasHost =
    client.role ===
    "host";


  clients.delete(
    client.id
  );


  if (!roomName)
    return;


  if (
    wasHost
  ) {

    broadcastRoom(
      roomName,
      {

        type:
          "host-left"

      }
    );

  } else {

    const host =
      getHost(
        roomName
      );


    if (
      host
    ) {

      send(
        host.ws,
        {

          type:
            "viewer-left",

          viewerId:
            client.id

        }
      );

    }

  }


  sendRoomStatus(
    roomName
  );

}


setInterval(
  () => {

    for (
      const client of
      clients.values()
    ) {

      if (
        client.ws.readyState !==
        WebSocket.OPEN
      ) {

        continue;

      }


      try {

        client.ws.ping();

      } catch (e) {}

    }

  },
  30000
);


server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================"
    );

    console.log(
      " VoiceボタLive"
    );

    console.log(
      " Server started"
    );

    console.log(
      " PORT: " +
      PORT
    );

    console.log(
      " HOST: " +
      HOST
    );

    console.log(
      "================================"
    );

  }
);


process.on(
  "SIGINT",
  () => {

    console.log(
      "Server shutting down..."
    );


    for (
      const client of
      clients.values()
    ) {

      try {

        client.ws.close();

      } catch (e) {}

    }


    server.close(
      () => {

        process.exit(
          0
        );

      }
    );

  }
);


process.on(
  "SIGTERM",
  () => {

    console.log(
      "Server terminating..."
    );


    for (
      const client of
      clients.values()
    ) {

      try {

        client.ws.close();

      } catch (e) {}

    }


    server.close(
      () => {

        process.exit(
          0
        );

      }
    );

  }
);
) {

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    try {

      ws.send(
        JSON.stringify(data)
      );

    } catch (e) {

      console.log(
        "[SEND ERROR]",
        e.message
      );

    }

  }

}


function broadcastRoom(
  room,
  data,
  exceptId = null
) {

  for (
    const c of
    clients.values()
  ) {

    if (
      c.room === room &&
      c.id !== exceptId
    ) {

      send(
        c.ws,
        data
      );

    }

  }

}


function updateRoomStatus(
  room
) {

  let host =
    false;

  let streaming =
    false;

  let viewers =
    0;


  for (
    const c of
    clients.values()
  ) {

    if (
      c.room !== room
    ) {

      continue;

    }


    if (
      c.role ===
      "host"
    ) {

      host = true;

      if (
        c.streaming
      ) {

        streaming =
          true;

      }

    }


    if (
      c.role ===
      "viewer"
    ) {

      viewers++;

    }

  }


  for (
    const c of
    clients.values()
  ) {

    if (
      c.room ===
      room
    ) {

      send(
        c.ws,
        {
          type:
            "room-status",

          live:
            host &&
            streaming,

          viewers
        }
      );

    }

  }

}


wss.on(
  "connection",
  ws => {

    const id =
      String(nextId++);


    const client = {

      id,

      ws,

      role: null,

      room: "bota",

      streaming: false,

      isAlive: true,

      blocked: false

    };


    clients.set(
      id,
      client
    );


    send(
      ws,
      {
        type:
          "welcome",

        id
      }
    );


    ws.on(
      "pong",
      () => {

        client.isAlive =
          true;

      }
    );


    ws.on(
      "message",
      raw => {

        let msg;


        try {

          msg =
            JSON.parse(
              raw.toString()
            );

        } catch (e) {

          return;

        }


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


          if (
            client.role ===
            "host"
          ) {

            for (
              const other of
              clients.values()
            ) {

              if (
                other.id !== id &&
                other.room ===
                  client.room &&
                other.role ===
                  "host"
              ) {

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

            }

          }


          send(
            ws,
            {
              type:
                "join-ok"
            }
          );


          if (
            client.role ===
            "host"
          ) {

            for (
              const other of
              clients.values()
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

          } else {

            for (
              const other of
              clients.values()
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
                      id
                  }
                );


                if (
                  other.streaming
                ) {

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


        if (
          msg.type ===
          "signal"
        ) {

          const target =
            clients.get(
              msg.target
            );


          if (
            !target ||
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


        if (
          msg.type ===
            "stream-started" &&
          client.role ===
            "host"
        ) {

          client.streaming =
            true;


          console.log(
            "[LIVE START]",
            id
          );


          broadcastRoom(
            client.room,
            {
              type:
                "stream-started"
            }
          );


          updateRoomStatus(
            client.room
          );


          return;

        }


        if (
          msg.type ===
            "stream-stopped" &&
          client.role ===
            "host"
        ) {

          client.streaming =
            false;


          console.log(
            "[LIVE STOP]",
            id
          );


          broadcastRoom(
            client.room,
            {
              type:
                "stream-stopped"
            }
          );


          updateRoomStatus(
            client.room
          );


          return;

        }


        if (
          msg.type ===
          "live-meta"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "live-meta",

              image:
                msg.image
            },
            client.id
          );


          return;

        }


        if (
          msg.type ===
          "like"
        ) {

          likeCount++;


          broadcastRoom(
            client.room,
            {
              type:
                "like-count",

              count:
                likeCount
            }
          );


          return;

        }


        if (
          msg.type ===
          "gift"
        ) {

          broadcastRoom(
            client.room,
            {
              type:
                "gift",

              gift:
                String(
                  msg.gift ||
                  "🎁 ギフト"
                )
            },
            client.id
          );


          return;

        }


        if (
          msg.type ===
          "comment"
        ) {

          const text =
            String(
              msg.text || ""
            )
              .trim()
              .slice(
                0,
                120
              );


          if (!text)
            return;


          const name =
            client.role ===
            "host"
              ? "配信者"
              : "視聴者";


          broadcastRoom(
            client.room,
            {
              type:
                "comment",

              name,

              text
            }
          );


          return;

        }


        if (
          msg.type ===
          "block"
        ) {

          client.blocked =
            true;


          send(
            ws,
            {
              type:
                "blocked"
            }
          );


          return;

        }

      }
    );


    ws.on(
      "close",
      () => {

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

          for (
            const other of
            clients.values()
          ) {

            if (
              other.room ===
                room &&
              other.role ===
                "viewer"
            ) {

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


        if (
          role ===
          "viewer"
        ) {

          for (
            const other of
            clients.values()
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


    ws.on(
      "error",
      e => {

        console.log(
          "[WS ERROR]",
          id,
          e.message
        );

      }
    );

  }
);


const heartbeat =
  setInterval(
    () => {

      for (
        const c of
        clients.values()
      ) {

        if (
          c.isAlive ===
          false
        ) {

          try {

            c.ws.terminate();

          } catch (e) {}

          continue;

        }


        c.isAlive =
          false;


        try {

          c.ws.ping();

        } catch (e) {}

      }

    },
    25000
  );


wss.on(
  "close",
  () => {

    clearInterval(
      heartbeat
    );

  }
);


server.on(
  "error",
  e => {

    console.error(
      "[SERVER ERROR]",
      e
    );

  }
);


server.listen(
  PORT,
  HOST,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "VoiceボタLive integrated server"
    );

    console.log(
      "LOW LATENCY AUDIO + RANKING + GIFTS"
    );

    console.log(
      "LISTENING ON",
      PORT
    );

    console.log(
      "================================="
    );

  }
);
