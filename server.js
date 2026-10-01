const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(HTML);
});

const wss = new WebSocket.Server({ server });

const clients = new Map();

const liveInfo = {
  active: false,
  id: null,
  name: "配信者",
  title: "音声ライブ配信",
  description: "",
  themeColor: "#3156ff",
  backgroundImage: "",
  avatar: "🎙️",
  startedAt: null,
  likes: 0,
  viewers: 0,
  comments: 0,
  gifts: 0
};

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}

function send(ws, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    ws.send(JSON.stringify(data));
  } catch (e) {
    console.error("send error:", e);
  }
}

function broadcast(data, filter = null) {
  for (const client of clients.values()) {
    if (filter && !filter(client)) continue;
    send(client.ws, data);
  }
}

function getLiveData() {
  return {
    active: liveInfo.active,
    id: liveInfo.id,
    name: liveInfo.name,
    title: liveInfo.title,
    description: liveInfo.description,
    themeColor: liveInfo.themeColor,
    backgroundImage: liveInfo.backgroundImage,
    avatar: liveInfo.avatar,
    startedAt: liveInfo.startedAt,
    likes: liveInfo.likes,
    viewers: liveInfo.viewers,
    comments: liveInfo.comments,
    gifts: liveInfo.gifts
  };
}

function updateViewerCount() {
  if (!liveInfo.active) {
    liveInfo.viewers = 0;
  } else {
    let count = 0;

    for (const client of clients.values()) {
      if (client.role === "viewer" && client.inLive) {
        count++;
      }
    }

    liveInfo.viewers = count;
  }

  broadcast({
    type: "viewer_count",
    count: liveInfo.viewers
  });
}

function broadcastLiveList() {
  broadcast({
    type: "live_list",
    live: liveInfo.active ? getLiveData() : null
  });
}

wss.on("connection", (ws) => {
  const clientId = makeId();

  const client = {
    id: clientId,
    ws,
    role: "none",
    inLive: false,
    blockedUsers: new Set(),
    joinedAt: Date.now()
  };

  clients.set(clientId, client);

  send(ws, {
    type: "connected",
    clientId,
    rtcConfig
  });

  send(ws, {
    type: "live_list",
    live: liveInfo.active ? getLiveData() : null
  });

  ws.on("message", async (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    const me = clients.get(clientId);

    if (!me) return;

    switch (data.type) {

      /* =========================
         配信開始
      ========================= */

      case "start_live": {
        if (liveInfo.active) {
          send(ws, {
            type: "error",
            message: "現在すでに別の配信が行われています。"
          });
          return;
        }

        me.role = "broadcaster";
        me.inLive = true;

        liveInfo.active = true;
        liveInfo.id = clientId;

        liveInfo.name =
          String(data.name || "配信者").slice(0, 30);

        liveInfo.title =
          String(data.title || "音声ライブ配信").slice(0, 80);

        liveInfo.description =
          String(data.description || "").slice(0, 200);

        liveInfo.themeColor =
          /^#[0-9A-Fa-f]{6}$/.test(data.themeColor)
            ? data.themeColor
            : "#3156ff";

        liveInfo.backgroundImage =
          String(data.backgroundImage || "").slice(0, 3000000);

        liveInfo.avatar =
          String(data.avatar || "🎙️").slice(0, 20);

        liveInfo.startedAt = Date.now();

        liveInfo.likes = 0;
        liveInfo.viewers = 0;
        liveInfo.comments = 0;
        liveInfo.gifts = 0;

        send(ws, {
          type: "live_started",
          live: getLiveData()
        });

        broadcastLiveList();

        break;
      }

      /* =========================
         配信終了
      ========================= */

      case "stop_live": {

        if (
          me.role !== "broadcaster" ||
          liveInfo.id !== clientId
        ) {
          return;
        }

        for (const client of clients.values()) {
          if (client.id === clientId) continue;

          if (client.inLive) {
            send(client.ws, {
              type: "live_ended"
            });

            client.inLive = false;

            if (client.role === "viewer") {
              client.role = "none";
            }
          }
        }

        liveInfo.active = false;
        liveInfo.id = null;
        liveInfo.startedAt = null;
        liveInfo.viewers = 0;

        me.role = "none";
        me.inLive = false;

        broadcastLiveList();

        break;
      }

      /* =========================
         配信画面カスタム更新
      ========================= */

      case "update_live": {

        if (
          me.role !== "broadcaster" ||
          liveInfo.id !== clientId
        ) {
          return;
        }

        if (typeof data.name === "string") {
          liveInfo.name = data.name.slice(0, 30);
        }

        if (typeof data.title === "string") {
          liveInfo.title = data.title.slice(0, 80);
        }

        if (typeof data.description === "string") {
          liveInfo.description =
            data.description.slice(0, 200);
        }

        if (
          typeof data.themeColor === "string" &&
          /^#[0-9A-Fa-f]{6}$/.test(data.themeColor)
        ) {
          liveInfo.themeColor = data.themeColor;
        }

        if (typeof data.backgroundImage === "string") {
          liveInfo.backgroundImage =
            data.backgroundImage.slice(0, 3000000);
        }

        if (typeof data.avatar === "string") {
          liveInfo.avatar =
            data.avatar.slice(0, 20);
        }

        broadcast({
          type: "live_updated",
          live: getLiveData()
        });

        broadcastLiveList();

        break;
      }

      /* =========================
         配信参加
      ========================= */

      case "join_live": {

        if (!liveInfo.active) {
          send(ws, {
            type: "error",
            message: "現在配信中のライブはありません。"
          });
          return;
        }

        if (liveInfo.id === clientId) {
          return;
        }

        me.role = "viewer";
        me.inLive = true;

        updateViewerCount();

        const host = clients.get(liveInfo.id);

        if (host) {
          send(host.ws, {
            type: "viewer_joined",
            viewerId: clientId
          });
        }

        send(ws, {
          type: "joined_live",
          live: getLiveData(),
          hostId: liveInfo.id
        });

        break;
      }

      /* =========================
         視聴終了
      ========================= */

      case "viewer_leave": {

        me.inLive = false;
        me.role = "none";

        updateViewerCount();

        if (liveInfo.active && liveInfo.id) {
          const host = clients.get(liveInfo.id);

          if (host) {
            send(host.ws, {
              type: "viewer_left",
              viewerId: clientId
            });
          }
        }

        break;
      }

      /* =========================
         WebRTC OFFER
      ========================= */

      case "offer": {

        const target = clients.get(data.to);

        if (!target) return;

        send(target.ws, {
          type: "offer",
          from: clientId,
          sdp: data.sdp
        });

        break;
      }

      /* =========================
         WebRTC ANSWER
      ========================= */

      case "answer": {

        const target = clients.get(data.to);

        if (!target) return;

        send(target.ws, {
          type: "answer",
          from: clientId,
          sdp: data.sdp
        });

        break;
      }

      /* =========================
         ICE
      ========================= */

      case "ice_candidate": {

        const target = clients.get(data.to);

        if (!target) return;

        send(target.ws, {
          type: "ice_candidate",
          from: clientId,
          candidate: data.candidate
        });

        break;
      }

      /* =========================
         いいね
      ========================= */

      case "like": {

        if (!liveInfo.active || !me.inLive) {
          return;
        }

        const now = Date.now();

        if (
          me.lastLikeAt &&
          now - me.lastLikeAt < 350
        ) {
          return;
        }

        me.lastLikeAt = now;

        liveInfo.likes++;

        broadcast({
          type: "like_update",
          likes: liveInfo.likes,
          from: clientId
        });

        break;
      }

      /* =========================
         コメント
      ========================= */

      case "comment": {

        if (!liveInfo.active || !me.inLive) {
          return;
        }

        const now = Date.now();

        if (
          me.lastCommentAt &&
          now - me.lastCommentAt < 700
        ) {
          send(ws, {
            type: "error",
            message: "コメントを少し間隔をあけて送ってください。"
          });
          return;
        }

        me.lastCommentAt = now;

        const text = String(data.text || "")
          .replace(/[\u0000-\u001F\u007F]/g, "")
          .trim()
          .slice(0, 120);

        if (!text) return;

        liveInfo.comments++;

        const comment = {
          id: makeId(),
          userId: clientId,
          name:
            String(data.name || "ゲスト")
              .slice(0, 30),
          text,
          time: Date.now()
        };

        broadcast(
          {
            type: "new_comment",
            comment
          },
          (target) => {
            return !target.blockedUsers.has(clientId);
          }
        );

        break;
      }

      /* =========================
         ギフト
      ========================= */

      case "gift": {

        if (!liveInfo.active || !me.inLive) {
          return;
        }

        const gifts = {
          rose: {
            icon: "🌹",
            name: "バラ",
            coins: 10
          },
          heart: {
            icon: "💖",
            name: "ハート",
            coins: 50
          },
          star: {
            icon: "⭐",
            name: "スター",
            coins: 100
          },
          present: {
            icon: "🎁",
            name: "プレゼント",
            coins: 500
          }
        };

        const gift = gifts[data.giftId];

        if (!gift) return;

        const now = Date.now();

        if (
          me.lastGiftAt &&
          now - me.lastGiftAt < 800
        ) {
          return;
        }

        me.lastGiftAt = now;

        liveInfo.gifts++;

        const giftData = {
          id: makeId(),
          userId: clientId,
          name:
            String(data.name || "ゲスト")
              .slice(0, 30),
          icon: gift.icon,
          giftName: gift.name,
          coins: gift.coins,
          time: Date.now()
        };

        broadcast(
          {
            type: "gift_received",
            gift: giftData
          },
          (target) => {
            return !target.blockedUsers.has(clientId);
          }
        );

        break;
      }

      /* =========================
         ブロック
      ========================= */

      case "block_user": {

        const targetId = String(data.targetId || "");

        if (!targetId || targetId === clientId) {
          return;
        }

        me.blockedUsers.add(targetId);

        send(ws, {
          type: "block_ok",
          targetId
        });

        break;
      }

      /* =========================
         ブロック解除
      ========================= */

      case "unblock_user": {

        const targetId = String(data.targetId || "");

        me.blockedUsers.delete(targetId);

        send(ws, {
          type: "unblock_ok",
          targetId
        });

        break;
      }

      /* =========================
         Ping
      ========================= */

      case "ping":
        send(ws, {
          type: "pong"
        });
        break;
    }
  });

  ws.on("close", () => {

    const wasBroadcaster =
      liveInfo.active &&
      liveInfo.id === clientId;

    if (wasBroadcaster) {

      for (const other of clients.values()) {

        if (other.id === clientId) continue;

        send(other.ws, {
          type: "live_ended"
        });

        other.inLive = false;

        if (other.role === "viewer") {
          other.role = "none";
        }
      }

      liveInfo.active = false;
      liveInfo.id = null;
      liveInfo.startedAt = null;
      liveInfo.viewers = 0;

      broadcastLiveList();
    }

    clients.delete(clientId);

    updateViewerCount();
  });
});

server.listen(PORT, HOST, () => {
  console.log(
    `VoiceポタLive server running on port ${PORT}`
  );
});


/* =========================================================
   HTML
========================================================= */

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

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
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    sans-serif;
  background: #030511;
  color: #ffffff;
}

body {
  overflow-x: hidden;
}

button,
input,
textarea {
  font-family: inherit;
}

button {
  cursor: pointer;
  border: 0;
}

.hidden {
  display: none !important;
}

/* =========================
   HOME
========================= */

#homeScreen {
  min-height: 100vh;
  padding-bottom: 100px;
  background:
    radial-gradient(
      circle at 50% 5%,
      rgba(58, 75, 180, 0.18),
      transparent 35%
    ),
    #030511;
}

.topLogo {
  padding: 28px 32px 22px;
  font-size: 29px;
  font-weight: 700;
  letter-spacing: -1px;
  color: #ffffff;
}

.topLogo span {
  background:
    linear-gradient(
      90deg,
      #d9f5ff,
      #b7c9ff,
      #d6b4ff
    );
  -webkit-background-clip: text;
  color: transparent;
}

.hero {
  position: relative;
  min-height: 590px;
  padding: 30px 32px 45px;
  overflow: hidden;

  background:
    radial-gradient(
      circle at 75% 25%,
      rgba(43, 102, 255, 0.72),
      transparent 24%
    ),
    radial-gradient(
      circle at 25% 55%,
      rgba(93, 52, 210, 0.5),
      transparent 28%
    ),
    linear-gradient(
      145deg,
      #06143e 0%,
      #090b29 45%,
      #02030c 100%
    );
}

.hero::before {
  content: "";
  position: absolute;
  width: 330px;
  height: 330px;
  border-radius: 50%;
  right: -70px;
  top: 30px;
  background:
    radial-gradient(
      circle,
      rgba(210, 225, 255, 0.9) 0 12%,
      rgba(90, 135, 255, 0.65) 40%,
      rgba(40, 80, 190, 0.2) 65%,
      transparent 72%
    );
  filter: blur(1px);
}

.hero::after {
  content: "✦  ✧   ✦     ✧   ✦";
  position: absolute;
  top: 90px;
  left: 25px;
  width: 100%;
  font-size: 35px;
  letter-spacing: 20px;
  color: rgba(175, 190, 255, 0.6);
}

.heroInner {
  position: relative;
  z-index: 2;
  max-width: 900px;
}

.heroLogo {
  font-size: 40px;
  font-weight: 800;
  margin-top: 20px;
  margin-bottom: 8px;

  text-shadow:
    0 0 25px rgba(94, 133, 255, 0.8);
}

.heroSub {
  font-size: 15px;
  color: #bfc9ec;
  margin-bottom: 65px;
}

.heroCatch {
  font-size: 45px;
  line-height: 1.25;
  font-weight: 800;
  max-width: 700px;
  letter-spacing: -2px;
}

.heroCatch .blue {
  color: #c8d7ff;
}

.heroText {
  margin-top: 28px;
  color: #c9d1eb;
  font-size: 18px;
  line-height: 1.8;
}

.liveSection {
  padding: 45px 28px 20px;
}

.sectionTitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.sectionTitle h2 {
  margin: 0;
  font-size: 29px;
}

.realtime {
  color: #7885ac;
  letter-spacing: 2px;
  font-size: 13px;
}

.noLive {
  border: 1px solid #151b3b;
  background: #080b20;
  border-radius: 28px;
  padding: 55px 20px;
  text-align: center;
  color: #7984aa;
  font-size: 18px;
}

.liveCard {
  position: relative;
  overflow: hidden;
  border-radius: 25px;
  min-height: 230px;
  padding: 25px;
  background:
    linear-gradient(
      135deg,
      rgba(45, 68, 160, 0.45),
      rgba(10, 12, 36, 0.96)
    );
  border: 1px solid #202956;
  box-shadow:
    0 15px 45px rgba(0,0,0,0.25);
}

.liveCardTitle {
  font-size: 25px;
  font-weight: 800;
  margin-bottom: 10px;
}

.liveCardName {
  color: #aebcf0;
  margin-bottom: 18px;
}

.liveCardDesc {
  color: #a4acce;
  line-height: 1.6;
}

.joinButton {
  margin-top: 25px;
  padding: 15px 25px;
  border-radius: 15px;
  background:
    linear-gradient(
      135deg,
      #3156ff,
      #874cff
    );
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

.features {
  padding: 20px 28px 50px;
}

.features h2 {
  font-size: 28px;
}

.featureGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.feature {
  padding: 28px 20px;
  border-radius: 24px;
  background:
    linear-gradient(
      145deg,
      #11183d,
      #080b20
    );
  border: 1px solid #1d2650;
}

.featureIcon {
  font-size: 35px;
  margin-bottom: 15px;
}

.featureTitle {
  font-size: 17px;
  font-weight: 700;
}

.featureText {
  margin-top: 8px;
  color: #7f8aae;
  line-height: 1.5;
}

/* =========================
   BOTTOM NAV
========================= */

.bottomNav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;

  height: 92px;

  display: grid;
  grid-template-columns:
    1fr
    1fr
    1.2fr
    1fr
    1fr;

  background:
    rgba(3, 5, 17, 0.96);

  border-top: 1px solid #111831;
  backdrop-filter: blur(20px);
}

.navButton {
  position: relative;
  background: transparent;
  color: #677397;
  font-size: 12px;
  padding-top: 12px;
}

.navIcon {
  display: block;
  font-size: 25px;
  margin-bottom: 4px;
}

.navButton.active {
  color: #d3dcff;
}

.liveNavButton {
  margin: -27px auto 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;

  background:
    linear-gradient(
      135deg,
      #3b76ff,
      #8d45ff
    );

  box-shadow:
    0 0 0 7px #060a1c,
    0 0 30px rgba(69, 105, 255, 0.75);

  color: white;
  font-size: 30px;
}

.liveNavText {
  margin-top: 8px;
  color: #687398;
  font-size: 12px;
}

/* =========================
   SETTINGS
========================= */

#settingScreen {
  min-height: 100vh;
  background: #f4f6fa;
  color: #111827;
  padding: 20px;
  padding-bottom: 40px;
}

.settingBox {
  max-width: 650px;
  margin: 0 auto;
}

.settingHeader {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.backButton {
  padding: 10px 15px;
  border-radius: 12px;
  background: #e7eaf0;
  font-size: 16px;
}

.settingHeader h1 {
  margin: 0;
  font-size: 25px;
}

.formCard {
  background: white;
  border-radius: 25px;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.07);
  margin-bottom: 20px;
}

.formLabel {
  display: block;
  font-weight: 700;
  margin: 18px 0 8px;
}

.formLabel:first-child {
  margin-top: 0;
}

.formInput,
.formTextarea {
  width: 100%;
  border: 1px solid #dce0e8;
  border-radius: 14px;
  padding: 14px;
  font-size: 16px;
  outline: none;
}

.formTextarea {
  min-height: 100px;
  resize: vertical;
}

.colorRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

#themeColor {
  width: 70px;
  height: 45px;
  border: 0;
  background: transparent;
}

.avatarChoices {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.avatarChoice {
  width: 55px;
  height: 55px;
  border-radius: 16px;
  background: #eef1f7;
  font-size: 27px;
}

.avatarChoice.selected {
  outline: 3px solid #3156ff;
}

.imagePreview {
  width: 100%;
  min-height: 150px;
  border-radius: 20px;
  background: #eef1f7;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.imagePreview img {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.previewTitle {
  margin-top: 20px;
  font-weight: 800;
}

.miniPreview {
  border-radius: 20px;
  padding: 25px;
  margin-top: 10px;
  color: white;
  min-height: 180px;
  background: #3156ff;
}

.startButton {
  width: 100%;
  padding: 18px;
  border-radius: 17px;
  background:
    linear-gradient(
      135deg,
      #3156ff,
      #794cff
    );
  color: white;
  font-size: 18px;
  font-weight: 800;
}

/* =========================
   LIVE SCREEN
========================= */

#liveScreen {
  min-height: 100vh;
  background: #050711;
  color: white;
  padding-bottom: 95px;
}

.liveTop {
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.liveTop button {
  background: #161b30;
  color: white;
  border-radius: 12px;
  padding: 10px 14px;
}

.liveTitleArea {
  padding: 5px 20px 20px;
}

.liveTitleArea h1 {
  margin: 0;
  font-size: 27px;
}

.liveTitleArea p {
  color: #858eaf;
}

.liveVisual {
  min-height: 270px;
  margin: 0 15px;
  border-radius: 27px;
  padding: 25px;

  background:
    radial-gradient(
      circle at 80% 20%,
      rgba(100,130,255,.55),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      #171e54,
      #070915
    );

  background-size: cover;
  background-position: center;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  overflow: hidden;
}

.liveAvatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
  font-size: 37px;
  margin-bottom: 20px;
}

.liveName {
  font-size: 18px;
  color: #ccd5ff;
}

.liveMainTitle {
  font-size: 28px;
  font-weight: 800;
  margin-top: 5px;
}

.liveDescription {
  color: #aeb6d3;
  margin-top: 8px;
}

.liveStats {
  display: flex;
  gap: 10px;
  padding: 15px;
}

.stat {
  flex: 1;
  background: #0d1123;
  border-radius: 15px;
  padding: 14px;
  text-align: center;
}

.statValue {
  font-size: 20px;
  font-weight: 800;
}

.statLabel {
  color: #6e7898;
  font-size: 12px;
}

.actionRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 0 15px 15px;
}

.actionButton {
  padding: 14px 5px;
  border-radius: 15px;
  background: #11162b;
  color: white;
  font-size: 15px;
}

.likeButton {
  background:
    linear-gradient(
      135deg,
      #ff416c,
      #ff4b2b
    );
}

.giftButton {
  background:
    linear-gradient(
      135deg,
      #ffb300,
      #ff6b00
    );
}

.commentArea {
  margin: 0 15px;
  background: #0b0f21;
  border: 1px solid #171e3b;
  border-radius: 20px;
  overflow: hidden;
}

.commentHeader {
  padding: 15px;
  font-weight: 800;
  border-bottom: 1px solid #171e3b;
}

.comments {
  height: 260px;
  overflow-y: auto;
  padding: 12px;
}

.comment {
  padding: 9px 4px;
  border-bottom: 1px solid rgba(255,255,255,.04);
}

.commentUser {
  color: #aab9ff;
  font-weight: 700;
  font-size: 13px;
}

.commentText {
  margin-top: 3px;
  line-height: 1.5;
  word-break: break-word;
}

.commentActions {
  margin-top: 4px;
}

.blockSmall {
  background: transparent;
  color: #687398;
  font-size: 11px;
  padding: 2px 0;
}

.commentForm {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid #171e3b;
}

.commentInput {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  border-radius: 13px;
  padding: 12px;
  background: #151a30;
  color: white;
}

.commentSend {
  width: 70px;
  border-radius: 13px;
  background: #3156ff;
  color: white;
  font-weight: 700;
}

/* =========================
   HOST CONTROLS
========================= */

.hostControls {
  margin: 15px;
  padding: 18px;
  background: #0b0f21;
  border-radius: 20px;
}

.hostControls h3 {
  margin-top: 0;
}

.controlRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.controlButton {
  padding: 14px;
  border-radius: 13px;
  background: #171c31;
  color: white;
}

.danger {
  background: #b52642;
}

/* =========================
   GIFT POPUP
========================= */

.giftPanel {
  position: fixed;
  left: 15px;
  right: 15px;
  bottom: 105px;
  z-index: 2000;

  background: #11162a;
  border: 1px solid #252d52;
  border-radius: 25px;
  padding: 18px;

  box-shadow: 0 20px 60px rgba(0,0,0,.45);
}

.giftGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.giftItem {
  background: #1a2039;
  color: white;
  border-radius: 15px;
  padding: 12px 5px;
  text-align: center;
}

.giftIcon {
  font-size: 28px;
}

.giftName {
  font-size: 11px;
  margin-top: 5px;
}

.giftCoins {
  font-size: 10px;
  color: #8792b5;
}

/* =========================
   TOAST
========================= */

#toast {
  position: fixed;
  left: 50%;
  bottom: 110px;
  transform: translateX(-50%);
  z-index: 3000;

  background: rgba(20,24,40,.95);
  color: white;
  padding: 12px 18px;
  border-radius: 15px;

  opacity: 0;
  pointer-events: none;
  transition: .25s;

  max-width: 90%;
  text-align: center;
}

#toast.show {
  opacity: 1;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 600px) {

  .hero {
    min-height: 570px;
  }

  .heroLogo {
    font-size: 34px;
  }

  .heroCatch {
    font-size: 36px;
  }

  .heroText {
    font-size: 16px;
  }

  .featureGrid {
    grid-template-columns: 1fr 1fr;
  }

  .liveMainTitle {
    font-size: 24px;
  }
}

</style>
</head>

<body>

<!-- =====================================================
     HOME
===================================================== -->

<div id="homeScreen">

  <div class="topLogo">
    🎙️ <span>VoiceポタLive</span>
  </div>

  <section class="hero">

    <div class="heroInner">

      <div class="heroLogo">
        VoiceポタLive
      </div>

      <div class="heroSub">
        声でつながる、みんなの居場所。
      </div>

      <div class="heroCatch">
        <span class="blue">あなたの声が、</span><br>
        誰かの夜を照らす。
      </div>

      <div class="heroText">
        月明かりの下で、話して、聴いて、笑って。<br>
        VoiceポタLiveで、あなたの声をもっと近くに。
      </div>

    </div>

  </section>

  <section class="liveSection">

    <div class="sectionTitle">
      <h2>🔴 ライブ中</h2>
      <span class="realtime">REAL TIME</span>
    </div>

    <div id="homeLiveList"></div>

  </section>

  <section class="features">

    <h2>VoiceポタLive</h2>

    <div class="featureGrid">

      <div class="feature">
        <div class="featureIcon">🎙️</div>
        <div class="featureTitle">
          高音質の音声配信
        </div>
        <div class="featureText">
          声だけだから気軽に楽しめます。
        </div>
      </div>

      <div class="feature">
        <div class="featureIcon">⚡</div>
        <div class="featureTitle">
          低遅延でリアルタイム
        </div>
        <div class="featureText">
          配信者とリスナーが近くでつながります。
        </div>
      </div>

      <div class="feature">
        <div class="featureIcon">💬</div>
        <div class="featureTitle">
          コメントで交流
        </div>
        <div class="featureText">
          話しながらコメントで盛り上がれます。
        </div>
      </div>

      <div class="feature">
        <div class="featureIcon">🎁</div>
        <div class="featureTitle">
          ギフトで応援
        </div>
        <div class="featureText">
          配信者にギフトを送って応援できます。
        </div>
      </div>

    </div>

  </section>

</div>


<!-- =====================================================
     SETTINGS
===================================================== -->

<div id="settingScreen" class="hidden">

  <div class="settingBox">

    <div class="settingHeader">

      <button
        class="backButton"
        onclick="showHome()"
      >
        ← 戻る
      </button>

      <h1>配信設定</h1>

    </div>

    <div class="formCard">

      <label class="formLabel">
        配信者名
      </label>

      <input
        id="hostName"
        class="formInput"
        value="配信者"
        maxlength="30"
        placeholder="配信者名"
      >

      <label class="formLabel">
        配信タイトル
      </label>

      <input
        id="streamTitle"
        class="formInput"
        value="音声ライブ配信"
        maxlength="80"
        placeholder="配信タイトル"
      >

      <label class="formLabel">
        配信説明
      </label>

      <textarea
        id="streamDescription"
        class="formTextarea"
        maxlength="200"
        placeholder="配信について書いてください"
      ></textarea>

      <label class="formLabel">
        テーマカラー
      </label>

      <div class="colorRow">

        <input
          id="themeColor"
          type="color"
          value="#3156ff"
        >

        <span id="colorText">
          #3156ff
        </span>

      </div>

      <label class="formLabel">
        アイコン
      </label>

      <div class="avatarChoices">

        <button
          class="avatarChoice selected"
          data-avatar="🎙️"
        >
          🎙️
        </button>

        <button
          class="avatarChoice"
          data-avatar="😊"
        >
          😊
        </button>

        <button
          class="avatarChoice"
          data-avatar="🌙"
        >
          🌙
        </button>

        <button
          class="avatarChoice"
          data-avatar="✨"
        >
          ✨
        </button>

        <button
          class="avatarChoice"
          data-avatar="🎧"
        >
          🎧
        </button>

        <button
          class="avatarChoice"
          data-avatar="🐱"
        >
          🐱
        </button>

      </div>

      <label class="formLabel">
        配信背景画像
      </label>

      <input
        id="backgroundImage"
        type="file"
        accept="image/*"
        class="formInput"
      >

      <div
        id="imagePreview"
        class="imagePreview"
      >
        背景画像なし
      </div>

    </div>

    <div class="formCard">

      <div class="previewTitle">
        配信画面プレビュー
      </div>

      <div
        id="miniPreview"
        class="miniPreview"
      >

        <div id="previewAvatar">
          🎙️
        </div>

        <div
          id="previewName"
          style="font-weight:700;margin-top:15px"
        >
          配信者
        </div>

        <div
          id="previewTitleText"
          style="font-size:25px;font-weight:800;margin-top:5px"
        >
          音声ライブ配信
        </div>

        <div
          id="previewDescription"
          style="margin-top:8px;opacity:.8"
        ></div>

      </div>

    </div>

    <button
      class="startButton"
      onclick="startLive()"
    >
      🎙️ 配信を開始する
    </button>

  </div>

</div>


<!-- =====================================================
     LIVE
===================================================== -->

<div id="liveScreen" class="hidden">

  <div class="liveTop">

    <button onclick="leaveLive()">
      ← 戻る
    </button>

    <strong id="liveModeText">
      ライブ
    </strong>

  </div>

  <div class="liveTitleArea">

    <h1 id="livePageTitle">
      音声ライブ配信
    </h1>

    <p id="livePageDescription">
      配信中です
    </p>

  </div>

  <div
    id="liveVisual"
    class="liveVisual"
  >

    <div
      id="liveAvatar"
      class="liveAvatar"
    >
      🎙️
    </div>

    <div
      id="liveName"
      class="liveName"
    >
      配信者
    </div>

    <div
      id="liveMainTitle"
      class="liveMainTitle"
    >
      音声ライブ配信
    </div>

    <div
      id="liveDescription"
      class="liveDescription"
    ></div>

  </div>

  <div class="liveStats">

    <div class="stat">
      <div
        id="viewerCount"
        class="statValue"
      >
        0
      </div>
      <div class="statLabel">
        視聴者
      </div>
    </div>

    <div class="stat">
      <div
        id="likeCount"
        class="statValue"
      >
        0
      </div>
      <div class="statLabel">
        いいね
      </div>
    </div>

    <div class="stat">
      <div
        id="giftCount"
        class="statValue"
      >
        0
      </div>
      <div class="statLabel">
        ギフト
      </div>
    </div>

  </div>

  <div class="actionRow">

    <button
      class="actionButton likeButton"
      onclick="sendLike()"
    >
      ❤️ いいね
    </button>

    <button
      class="actionButton giftButton"
      onclick="toggleGiftPanel()"
    >
      🎁 ギフト
    </button>

    <button
      class="actionButton"
      onclick="blockStreamer()"
    >
      🚫 ブロック
    </button>

  </div>

  <div
    id="hostControls"
    class="hostControls hidden"
  >

    <h3>
      🎙️ 配信者コントロール
    </h3>

    <div class="controlRow">

      <button
        id="micButton"
        class="controlButton"
        onclick="toggleMic()"
      >
        🎙️ マイクON
      </button>

      <button
        class="controlButton"
        onclick="showSettingFromLive()"
      >
        🎨 配信カスタム
      </button>

      <button
        class="controlButton danger"
        onclick="stopLive()"
      >
        ⏹ 配信終了
      </button>

    </div>

  </div>

  <div class="commentArea">

    <div class="commentHeader">
      💬 コメント
    </div>

    <div
      id="comments"
      class="comments"
    ></div>

    <div class="commentForm">

      <input
        id="commentInput"
        class="commentInput"
        maxlength="120"
        placeholder="コメントを書く..."
        onkeydown="if(event.key==='Enter')sendComment()"
      >

      <button
        class="commentSend"
        onclick="sendComment()"
      >
        送信
      </button>

    </div>

  </div>

</div>


<!-- =====================================================
     GIFT PANEL
===================================================== -->

<div
  id="giftPanel"
  class="giftPanel hidden"
>

  <div
    style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:15px;
    "
  >

    <strong>
      🎁 ギフト
    </strong>

    <button
      onclick="toggleGiftPanel()"
      style="
        background:transparent;
        color:white;
        font-size:20px;
      "
    >
      ×
    </button>

  </div>

  <div class="giftGrid">

    <button
      class="giftItem"
      onclick="sendGift('rose')"
    >
      <div class="giftIcon">🌹</div>
      <div class="giftName">バラ</div>
      <div class="giftCoins">10コイン</div>
    </button>

    <button
      class="giftItem"
      onclick="sendGift('heart')"
    >
      <div class="giftIcon">💖</div>
      <div class="giftName">ハート</div>
      <div class="giftCoins">50コイン</div>
    </button>

    <button
      class="giftItem"
      onclick="sendGift('star')"
    >
      <div class="giftIcon">⭐</div>
      <div class="giftName">スター</div>
      <div class="giftCoins">100コイン</div>
    </button>

    <button
      class="giftItem"
      onclick="sendGift('present')"
    >
      <div class="giftIcon">🎁</div>
      <div class="giftName">プレゼント</div>
      <div class="giftCoins">500コイン</div>
    </button>

  </div>

  <div
    style="
      margin-top:12px;
      font-size:11px;
      color:#7f89aa;
      text-align:center;
    "
  >
    ※現在はテスト用ギフトです
  </div>

</div>


<div id="toast"></div>


<script>

let socket = null;

let myId = null;

let isBroadcaster = false;

let currentLive = null;

let localStream = null;

let peerConnections = {};

let pendingIceCandidates = {};

let viewerPeer = null;

let currentHostId = null;

let selectedAvatar = "🎙️";

let backgroundImageData = "";

let micEnabled = true;

let blockedUsers = new Set();

let currentScreen = "home";

const remoteAudio = new Audio();

remoteAudio.autoplay = true;


/* =========================================================
   WebSocket
========================================================= */

function connectSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  socket = new WebSocket(
    protocol + "//" + location.host
  );

  socket.onopen = () => {

    console.log("WebSocket connected");

    showToast("接続しました");

  };

  socket.onmessage = async (event) => {

    let data;

    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    await handleMessage(data);
  };

  socket.onclose = () => {

    console.log("WebSocket closed");

    setTimeout(() => {

      if (!socket ||
          socket.readyState === WebSocket.CLOSED) {

        connectSocket();
      }

    }, 2000);

  };

  socket.onerror = () => {
    console.log("WebSocket error");
  };
}


function sendMessage(data) {

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {
    socket.send(JSON.stringify(data));
  }
}


/* =========================================================
   Message
========================================================= */

async function handleMessage(data) {

  switch (data.type) {

    case "connected":

      myId = data.clientId;

      break;


    case "live_list":

      renderHomeLive(data.live);

      break;


    case "live_started":

      currentLive = data.live;

      renderLive();

      break;


    case "live_updated":

      currentLive = data.live;

      renderLive();

      break;


    case "joined_live":

      currentLive = data.live;

      currentHostId = data.hostId;

      renderLive();

      await createViewerPeer();

      break;


    case "viewer_joined":

      if (isBroadcaster) {

        await createBroadcasterPeer(
          data.viewerId
        );

      }

      break;


    case "viewer_left":

      closePeer(data.viewerId);

      break;


    case "offer":

      await receiveOffer(data);

      break;


    case "answer":

      await receiveAnswer(data);

      break;


    case "ice_candidate":

      await receiveIceCandidate(data);

      break;


    case "viewer_count":

      document.getElementById(
        "viewerCount"
      ).textContent = data.count;

      break;


    case "like_update":

      document.getElementById(
        "likeCount"
      ).textContent = data.likes;

      createFloatingLike();

      break;


    case "new_comment":

      addComment(data.comment);

      break;


    case "gift_received":

      document.getElementById(
        "giftCount"
      ).textContent = currentLive
        ? currentLive.gifts + 1
        : "1";

      if (currentLive) {
        currentLive.gifts++;
      }

      showGiftEffect(data.gift);

      break;


    case "block_ok":

      blockedUsers.add(data.targetId);

      showToast("ユーザーをブロックしました");

      break;


    case "live_ended":

      showToast("配信が終了しました");

      cleanupViewer();

      showHome();

      break;


    case "error":

      showToast(data.message);

      break;


    case "pong":

      break;
  }
}


/* =========================================================
   HOME
========================================================= */

function showHome() {

  currentScreen = "home";

  document.getElementById(
    "homeScreen"
  ).classList.remove("hidden");

  document.getElementById(
    "settingScreen"
  ).classList.add("hidden");

  document.getElementById(
    "liveScreen"
  ).classList.add("hidden");

  document.getElementById(
    "giftPanel"
  ).classList.add("hidden");
}


function renderHomeLive(live) {

  const area =
    document.getElementById("homeLiveList");

  if (!live || !live.active) {

    area.innerHTML = `
      <div class="noLive">
        現在配信中のライブはありません
      </div>
    `;

    return;
  }

  const background =
    live.backgroundImage
      ? `background-image:
          linear-gradient(
            rgba(5,7,17,.25),
            rgba(5,7,17,.85)
          ),
          url('${live.backgroundImage}')`
      : "";

  area.innerHTML = `

    <div
      class="liveCard"
      style="
        border-color:${live.themeColor};
        ${background}
      "
    >

      <div class="liveCardTitle">
        🔴 ${escapeHtml(live.title)}
      </div>

      <div class="liveCardName">
        ${escapeHtml(live.avatar)}
        ${escapeHtml(live.name)}
      </div>

      <div class="liveCardDesc">
        ${escapeHtml(live.description || "配信中です")}
      </div>

      <button
        class="joinButton"
        onclick="joinLive()"
      >
        🎧 配信を聴く
      </button>

    </div>
  `;
}


function joinLive() {

  if (!currentLive || !currentLive.active) {

    showToast(
      "現在配信中のライブはありません"
    );

    return;
  }

  sendMessage({
    type: "join_live"
  });
}


/* =========================================================
   SETTING
========================================================= */

function showSettings() {

  document.getElementById(
    "homeScreen"
  ).classList.add("hidden");

  document.getElementById(
    "settingScreen"
  ).classList.remove("hidden");

  document.getElementById(
    "liveScreen"
  ).classList.add("hidden");

  currentScreen = "settings";
}


function showSettingFromLive() {

  if (!isBroadcaster) return;

  showSettings();

  document.getElementById(
    "hostName"
  ).value =
    currentLive?.name || "配信者";

  document.getElementById(
    "streamTitle"
  ).value =
    currentLive?.title || "音声ライブ配信";

  document.getElementById(
    "streamDescription"
  ).value =
    currentLive?.description || "";

  document.getElementById(
    "themeColor"
  ).value =
    currentLive?.themeColor || "#3156ff";

  selectedAvatar =
    currentLive?.avatar || "🎙️";

  updatePreview();
}


function setupSettings() {

  const inputs = [
    "hostName",
    "streamTitle",
    "streamDescription",
    "themeColor"
  ];

  inputs.forEach(id => {

    document.getElementById(id)
      .addEventListener(
        "input",
        updatePreview
      );

  });

  document.getElementById(
    "themeColor"
  ).addEventListener(
    "input",
    () => {

      document.getElementById(
        "colorText"
      ).textContent =
        document.getElementById(
          "themeColor"
        ).value;

    }
  );


  document.getElementById(
    "backgroundImage"
  ).addEventListener(
    "change",
    handleBackgroundImage
  );


  document.querySelectorAll(
    ".avatarChoice"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document.querySelectorAll(
          ".avatarChoice"
        ).forEach(x =>
          x.classList.remove("selected")
        );

        button.classList.add("selected");

        selectedAvatar =
          button.dataset.avatar;

        updatePreview();

      }
    );

  });

}


function handleBackgroundImage(event) {

  const file =
    event.target.files?.[0];

  if (!file) return;

  if (file.size > 2.5 * 1024 * 1024) {

    showToast(
      "画像は2.5MB以下にしてください"
    );

    event.target.value = "";

    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {

    backgroundImageData =
      reader.result;

    document.getElementById(
      "imagePreview"
    ).innerHTML =
      `<img src="${backgroundImageData}">`;

    updatePreview();

  };

  reader.readAsDataURL(file);
}


function updatePreview() {

  const name =
    document.getElementById(
      "hostName"
    ).value || "配信者";

  const title =
    document.getElementById(
      "streamTitle"
    ).value || "音声ライブ配信";

  const description =
    document.getElementById(
      "streamDescription"
    ).value || "";

  const color =
    document.getElementById(
      "themeColor"
    ).value;

  document.getElementById(
    "colorText"
  ).textContent = color;

  document.getElementById(
    "previewAvatar"
  ).textContent =
    selectedAvatar;

  document.getElementById(
    "previewName"
  ).textContent =
    name;

  document.getElementById(
    "previewTitleText"
  ).textContent =
    title;

  document.getElementById(
    "previewDescription"
  ).textContent =
    description;

  const preview =
    document.getElementById(
      "miniPreview"
    );

  preview.style.background =
    backgroundImageData
      ? `linear-gradient(
          rgba(0,0,0,.25),
          rgba(0,0,0,.65)
        ),
        url('${backgroundImageData}')`
      : color;

  preview.style.backgroundSize =
    "cover";

  preview.style.backgroundPosition =
    "center";
}


/* =========================================================
   START LIVE
========================================================= */

async function startLive() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showToast(
      "このブラウザではマイクを使用できません"
    );

    return;
  }

  try {

    showToast(
      "マイクの使用を許可してください"
    );

    localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        video: false
      });

    isBroadcaster = true;

    const name =
      document.getElementById(
        "hostName"
      ).value.trim() || "配信者";

    const title =
      document.getElementById(
        "streamTitle"
      ).value.trim() || "音声ライブ配信";

    const description =
      document.getElementById(
        "streamDescription"
      ).value.trim();

    const themeColor =
      document.getElementById(
        "themeColor"
      ).value;

    sendMessage({
      type: "start_live",
      name,
      title,
      description,
      themeColor,
      backgroundImage:
        backgroundImageData,
      avatar: selectedAvatar
    });

  } catch (error) {

    console.error(error);

    showToast(
      "マイクを使用できませんでした"
    );

  }
}


/* =========================================================
   RENDER LIVE
========================================================= */

function renderLive() {

  if (!currentLive) return;

  document.getElementById(
    "homeScreen"
  ).classList.add("hidden");

  document.getElementById(
    "settingScreen"
  ).classList.add("hidden");

  document.getElementById(
    "liveScreen"
  ).classList.remove("hidden");

  currentScreen = "live";

  const live =
    currentLive;

  document.getElementById(
    "livePageTitle"
  ).textContent =
    live.title;

  document.getElementById(
    "livePageDescription"
  ).textContent =
    live.description || "配信中です";

  document.getElementById(
    "liveAvatar"
  ).textContent =
    live.avatar || "🎙️";

  document.getElementById(
    "liveName"
  ).textContent =
    live.name;

  document.getElementById(
    "liveMainTitle"
  ).textContent =
    live.title;

  document.getElementById(
    "liveDescription"
  ).textContent =
    live.description || "";

  document.getElementById(
    "viewerCount"
  ).textContent =
    live.viewers || 0;

  document.getElementById(
    "likeCount"
  ).textContent =
    live.likes || 0;

  document.getElementById(
    "giftCount"
  ).textContent =
    live.gifts || 0;

  const visual =
    document.getElementById(
      "liveVisual"
    );

  if (live.backgroundImage) {

    visual.style.backgroundImage =
      `
      linear-gradient(
        rgba(5,7,17,.20),
        rgba(5,7,17,.75)
      ),
      url('${live.backgroundImage}')
      `;

  } else {

    visual.style.backgroundImage =
      `
      radial-gradient(
        circle at 80% 20%,
        rgba(100,130,255,.55),
        transparent 30%
      ),
      linear-gradient(
        135deg,
        ${live.themeColor},
        #070915
      )
      `;

  }

  document.getElementById(
    "liveModeText"
  ).textContent =
    isBroadcaster
      ? "🎙️ 配信中"
      : "🎧 視聴中";

  if (isBroadcaster) {

    document.getElementById(
      "hostControls"
    ).classList.remove("hidden");

  } else {

    document.getElementById(
      "hostControls"
    ).classList.add("hidden");

  }
}


/* =========================================================
   WEBRTC BROADCASTER
========================================================= */

async function createBroadcasterPeer(viewerId) {

  if (!localStream) return;

  closePeer(viewerId);

  const pc =
    new RTCPeerConnection(
      currentRtcConfig()
    );

  peerConnections[viewerId] = pc;

  localStream
    .getTracks()
    .forEach(track => {

      pc.addTrack(
        track,
        localStream
      );

    });

  pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        sendMessage({
          type: "ice_candidate",
          to: viewerId,
          candidate:
            event.candidate
        });

      }

    };

  pc.onconnectionstatechange =
    () => {

      console.log(
        "Host connection:",
        viewerId,
        pc.connectionState
      );

      if (
        ["failed", "closed", "disconnected"]
          .includes(pc.connectionState)
      ) {

        setTimeout(() => {

          if (
            peerConnections[viewerId] === pc
          ) {
            closePeer(viewerId);
          }

        }, 3000);

      }

    };

  const offer =
    await pc.createOffer();

  await pc.setLocalDescription(
    offer
  );

  sendMessage({
    type: "offer",
    to: viewerId,
    sdp: pc.localDescription
  });
}


/* =========================================================
   WEBRTC VIEWER
========================================================= */

async function createViewerPeer() {

  if (!currentHostId) return;

  if (viewerPeer) {

    try {
      viewerPeer.close();
    } catch (e) {}

  }

  viewerPeer =
    new RTCPeerConnection(
      currentRtcConfig()
    );

  viewerPeer.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        sendMessage({
          type: "ice_candidate",
          to: currentHostId,
          candidate:
            event.candidate
        });

      }

    };

  viewerPeer.ontrack =
    event => {

      if (
        event.streams &&
        event.streams[0]
      ) {

        remoteAudio.srcObject =
          event.streams[0];

        remoteAudio.play()
          .catch(() => {});

      }

    };

  viewerPeer.onconnectionstatechange =
    () => {

      console.log(
        "Viewer connection:",
        viewerPeer.connectionState
      );

    };
}


/* =========================================================
   OFFER
========================================================= */

async function receiveOffer(data) {

  if (!viewerPeer) {

    currentHostId =
      data.from;

    await createViewerPeer();

  }

  try {

    await viewerPeer.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

    await flushViewerIce();

    const answer =
      await viewerPeer.createAnswer();

    await viewerPeer.setLocalDescription(
      answer
    );

    sendMessage({
      type: "answer",
      to: data.from,
      sdp: viewerPeer.localDescription
    });

  } catch (error) {

    console.error(
      "offer error",
      error
    );

  }
}


/* =========================================================
   ANSWER
========================================================= */

async function receiveAnswer(data) {

  const pc =
    peerConnections[data.from];

  if (!pc) return;

  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

    await flushPeerIce(
      data.from
    );

  } catch (error) {

    console.error(
      "answer error",
      error
    );

  }
}


/* =========================================================
   ICE QUEUE
========================================================= */

function queuePeerIce(
  peerId,
  candidate
) {

  if (
    !pendingIceCandidates[peerId]
  ) {

    pendingIceCandidates[peerId] = [];

  }

  pendingIceCandidates[
    peerId
  ].push(candidate);
}


async function flushPeerIce(
  peerId
) {

  const pc =
    peerConnections[peerId];

  if (
    !pc ||
    !pc.remoteDescription
  ) {
    return;
  }

  const list =
    pendingIceCandidates[peerId] || [];

  for (
    const candidate of list
  ) {

    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch (error) {

      console.error(
        "ICE flush error",
        error
      );

    }

  }

  delete pendingIceCandidates[
    peerId
  ];
}


async function receiveIceCandidate(
  data
) {

  if (isBroadcaster) {

    const pc =
      peerConnections[data.from];

    if (!pc) {

      queuePeerIce(
        data.from,
        data.candidate
      );

      return;
    }

    if (!pc.remoteDescription) {

      queuePeerIce(
        data.from,
        data.candidate
      );

      return;
    }

    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          data.candidate
        )
      );

    } catch (error) {

      console.error(
        "ICE error",
        error
      );

    }

    return;
  }

  if (!viewerPeer) {

    queuePeerIce(
      "viewer",
      data.candidate
    );

    return;
  }

  if (
    !viewerPeer.remoteDescription
  ) {

    queuePeerIce(
      "viewer",
      data.candidate
    );

    return;
  }

  try {

    await viewerPeer.addIceCandidate(
      new RTCIceCandidate(
        data.candidate
      )
    );

  } catch (error) {

    console.error(
      "Viewer ICE error",
      error
    );

  }
}


async function flushViewerIce() {

  if (
    !viewerPeer ||
    !viewerPeer.remoteDescription
  ) {
    return;
  }

  const list =
    pendingIceCandidates.viewer || [];

  for (
    const candidate of list
  ) {

    try {

      await viewerPeer.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch (error) {

      console.error(
        "Viewer ICE flush error",
        error
      );

    }

  }

  delete pendingIceCandidates.viewer;
}


function currentRtcConfig() {

  return {
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
}


/* =========================================================
   LIKE
========================================================= */

function sendLike() {

  if (!currentLive) return;

  sendMessage({
    type: "like"
  });

}


/* =========================================================
   GIFT
========================================================= */

function toggleGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );

  panel.classList.toggle(
    "hidden"
  );

}


function sendGift(giftId) {

  sendMessage({
    type: "gift",
    giftId,
    name: getMyName()
  });

  document.getElementById(
    "giftPanel"
  ).classList.add("hidden");

}


function showGiftEffect(gift) {

  showToast(
    `${gift.icon} ${gift.name}さんから${gift.giftName}！`
  );

}


/* =========================================================
   COMMENT
========================================================= */

function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );

  const text =
    input.value.trim();

  if (!text) return;

  sendMessage({
    type: "comment",
    text,
    name: getMyName()
  });

  input.value = "";
}


function addComment(comment) {

  if (
    blockedUsers.has(
      comment.userId
    )
  ) {
    return;
  }

  const area =
    document.getElementById(
      "comments"
    );

  const div =
    document.createElement("div");

  div.className =
    "comment";

  div.innerHTML = `

    <div class="commentUser">
      ${escapeHtml(comment.name)}
    </div>

    <div class="commentText">
      ${escapeHtml(comment.text)}
    </div>

    <div class="commentActions">

      <button
        class="blockSmall"
        onclick="blockUser('${comment.userId}')"
      >
        🚫 このユーザーをブロック
      </button>

    </div>

  `;

  area.appendChild(div);

  while (
    area.children.length > 100
  ) {

    area.removeChild(
      area.firstChild
    );

  }

  area.scrollTop =
    area.scrollHeight;
}


/* =========================================================
   BLOCK
========================================================= */

function blockUser(userId) {

  if (!userId || userId === myId) {
    return;
  }

  blockedUsers.add(userId);

  sendMessage({
    type: "block_user",
    targetId: userId
  });

  showToast(
    "このユーザーをブロックしました"
  );
}


function blockStreamer() {

  if (!currentHostId) {
    return;
  }

  const ok =
    confirm(
      "この配信者をブロックして退出しますか？"
    );

  if (!ok) return;

  blockUser(
    currentHostId
  );

  leaveLive();
}


/* =========================================================
   MIC
========================================================= */

function toggleMic() {

  if (!localStream) return;

  const tracks =
    localStream.getAudioTracks();

  if (!tracks.length) return;

  micEnabled =
    !micEnabled;

  tracks.forEach(
    track => {
      track.enabled =
        micEnabled;
    }
  );

  document.getElementById(
    "micButton"
  ).textContent =
    micEnabled
      ? "🎙️ マイクON"
      : "🔇 マイクOFF";

}


/* =========================================================
   LEAVE / STOP
========================================================= */

function leaveLive() {

  if (isBroadcaster) {

    stopLive();

    return;
  }

  sendMessage({
    type: "viewer_leave"
  });

  cleanupViewer();

  showHome();
}


function stopLive() {

  if (!isBroadcaster) return;

  sendMessage({
    type: "stop_live"
  });

  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

    localStream = null;

  }

  Object.keys(
    peerConnections
  ).forEach(
    id => closePeer(id)
  );

  isBroadcaster = false;

  currentLive = null;

  showHome();

}


function cleanupViewer() {

  if (viewerPeer) {

    try {
      viewerPeer.close();
    } catch (e) {}

    viewerPeer = null;

  }

  remoteAudio.srcObject =
    null;

  currentHostId = null;

}


function closePeer(peerId) {

  const pc =
    peerConnections[peerId];

  if (pc) {

    try {
      pc.close();
    } catch (e) {}

  }

  delete peerConnections[
    peerId
  ];

  delete pendingIceCandidates[
    peerId
  ];
}


/* =========================================================
   LIVE CUSTOM UPDATE
========================================================= */

function saveLiveCustom() {

  if (!isBroadcaster) return;

  const name =
    document.getElementById(
      "hostName"
    ).value.trim() || "配信者";

  const title =
    document.getElementById(
      "streamTitle"
    ).value.trim() ||
    "音声ライブ配信";

  const description =
    document.getElementById(
      "streamDescription"
    ).value.trim();

  const themeColor =
    document.getElementById(
      "themeColor"
    ).value;

  sendMessage({
    type: "update_live",
    name,
    title,
    description,
    themeColor,
    backgroundImage:
      backgroundImageData ||
      currentLive?.backgroundImage ||
      "",
    avatar: selectedAvatar
  });

  showToast(
    "配信画面を更新しました"
  );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 2200);
}


/* =========================================================
   FLOAT LIKE
========================================================= */

function createFloatingLike() {

  const el =
    document.createElement("div");

  el.textContent =
    "❤️";

  el.style.position =
    "fixed";

  el.style.right =
    (20 + Math.random() * 50) + "px";

  el.style.bottom =
    "100px";

  el.style.fontSize =
    "28px";

  el.style.zIndex =
    "4000";

  el.style.transition =
    "2s";

  document.body.appendChild(el);

  setTimeout(() => {

    el.style.transform =
      "translateY(-250px)";

    el.style.opacity =
      "0";

  }, 50);

  setTimeout(() => {

    el.remove();

  }, 2200);
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   USER NAME
========================================================= */

function getMyName() {

  if (isBroadcaster) {

    return (
      document.getElementById(
        "hostName"
      )?.value.trim() ||
      "配信者"
    );

  }

  let name =
    localStorage.getItem(
      "voicepota_name"
    );

  if (!name) {

    name =
      "ゲスト" +
      Math.floor(
        1000 +
        Math.random() * 9000
      );

    localStorage.setItem(
      "voicepota_name",
      name
    );

  }

  return name;
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSettings();

    connectSocket();

    setInterval(() => {

      if (
        socket &&
        socket.readyState ===
          WebSocket.OPEN
      ) {

        sendMessage({
          type: "ping"
        });

      }

    }, 20000);

  }
);


/* =========================================================
   配信ボタン
========================================================= */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".liveNavButton"
      );

    if (!button) return;

    showSettings();

  }
);


/* =========================================================
   画面外クリックでギフトを閉じる
========================================================= */

document.addEventListener(
  "click",
  event => {

    const panel =
      document.getElementById(
        "giftPanel"
      );

    if (
      panel.classList.contains(
        "hidden"
      )
    ) {
      return;
    }

    if (
      !event.target.closest(
        ".giftPanel"
      ) &&
      !event.target.closest(
        ".giftButton"
      )
    ) {

      panel.classList.add(
        "hidden"
      );

    }

  }
);

</script>


<!-- =====================================================
     NAVIGATION
===================================================== -->

<div class="bottomNav">

  <button
    class="navButton active"
    onclick="showHome()"
  >
    <span class="navIcon">⌂</span>
    ホーム
  </button>

  <button
    class="navButton"
    onclick="showToast('探す機能は準備中です')"
  >
    <span class="navIcon">⌕</span>
    探す
  </button>

  <button
    class="navButton"
  >

    <button
      class="liveNavButton"
      onclick="showSettings()"
    >
      🎙️
    </button>

    <div class="liveNavText">
      配信
    </div>

  </button>

  <button
    class="navButton"
    onclick="showToast('お知らせ機能は準備中です')"
  >
    <span class="navIcon">♧</span>
    お知らせ
  </button>

  <button
    class="navButton"
    onclick="showToast('マイページは準備中です')"
  >
    <span class="navIcon">♙</span>
    マイページ
  </button>

</div>

</body>
</html>`;
