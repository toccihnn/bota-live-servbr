const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

/* =========================================================
   LIVE DATA
========================================================= */

let liveInfo = {
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

  comments: [],
  gifts: []
};


/* =========================================================
   CLIENTS
========================================================= */

const clients = new Map();


/* =========================================================
   WEBRTC
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


/* =========================================================
   HELPERS
========================================================= */

function send(ws, data) {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    ws.send(
      JSON.stringify(data)
    );
  }

}


function broadcast(data) {

  for (const ws of wss.clients) {

    send(ws, data);

  }

}


function broadcastRoom(data) {

  if (!liveInfo.active) {
    return;
  }

  for (const [id, client] of clients) {

    if (
      client.role === "broadcaster" ||
      client.role === "viewer"
    ) {

      send(
        client.ws,
        data
      );

    }

  }

}


function cleanText(value, max) {

  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, max);

}


function cleanColor(value) {

  if (
    typeof value === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(value)
  ) {

    return value;

  }

  return "#3156ff";

}


function getLiveInfo() {

  return {

    active:
      liveInfo.active,

    id:
      liveInfo.id,

    name:
      liveInfo.name,

    title:
      liveInfo.title,

    description:
      liveInfo.description,

    themeColor:
      liveInfo.themeColor,

    backgroundImage:
      liveInfo.backgroundImage,

    avatar:
      liveInfo.avatar,

    startedAt:
      liveInfo.startedAt,

    likes:
      liveInfo.likes,

    viewers:
      liveInfo.viewers,

    comments:
      liveInfo.comments.slice(-50),

    gifts:
      liveInfo.gifts.slice(-30)

  };

}


/* =========================================================
   START LIVE
========================================================= */

function startLive(id, data) {

  liveInfo = {

    active: true,

    id: id,

    name:
      cleanText(
        data.name,
        50
      ) || "配信者",

    title:
      cleanText(
        data.title,
        100
      ) || "音声ライブ配信",

    description:
      cleanText(
        data.description,
        500
      ),

    themeColor:
      cleanColor(
        data.themeColor
      ),

    backgroundImage:
      typeof data.backgroundImage === "string"
        ? data.backgroundImage.slice(
            0,
            1500000
          )
        : "",

    avatar:
      cleanText(
        data.avatar,
        10
      ) || "🎙️",

    startedAt:
      Date.now(),

    likes: 0,

    viewers: 0,

    comments: [],

    gifts: []

  };

}


/* =========================================================
   STOP LIVE
========================================================= */

function stopLive() {

  liveInfo = {

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

    comments: [],

    gifts: []

  };

  broadcast({

    type:
      "live_ended"

  });

}


/* =========================================================
   HTTP SERVER
========================================================= */

const server = http.createServer(
  (req, res) => {

    if (
      req.url === "/health"
    ) {

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


/* =========================================================
   WEBSOCKET
========================================================= */

const wss =
  new WebSocket.Server({
    server
  });


wss.on(
  "connection",
  (ws) => {

    const id =
      Date.now().toString(36) +
      Math.random()
        .toString(36)
        .slice(2, 9);


    clients.set(
      id,
      {
        ws: ws,
        role: "unknown",
        blocked: new Set()
      }
    );


    send(
      ws,
      {
        type:
          "connected",

        id:
          id,

        live:
          getLiveInfo()
      }
    );


    ws.on(
      "message",
      async raw => {

        let data;

        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch (error) {

          send(
            ws,
            {
              type:
                "error",

              message:
                "通信データを読み込めませんでした。"
            }
          );

          return;

        }


        const client =
          clients.get(id);


        if (!client) {
          return;
        }


        try {

          /* =========================================
             START LIVE
          ========================================= */

          if (
            data.type ===
            "start_live"
          ) {

            if (
              liveInfo.active &&
              liveInfo.id !== id
            ) {

              send(
                ws,
                {
                  type:
                    "error",

                  message:
                    "現在ほかの配信者が配信中です。"
                }
              );

              return;

            }


            client.role =
              "broadcaster";


            startLive(
              id,
              data
            );


            broadcast(
              {
                type:
                  "live_list",

                live:
                  getLiveInfo()
              }
            );


            send(
              ws,
              {
                type:
                  "live_started",

                live:
                  getLiveInfo()
              }
            );


            return;

          }


          /* =========================================
             STOP LIVE
          ========================================= */

          if (
            data.type ===
            "stop_live"
          ) {

            if (
              liveInfo.id !== id
            ) {
              return;
            }


            stopLive();

            return;

          }


          /* =========================================
             UPDATE LIVE
          ========================================= */

          if (
            data.type ===
            "update_live"
          ) {

            if (
              liveInfo.id !== id ||
              !liveInfo.active
            ) {
              return;
            }


            if (
              typeof data.name ===
              "string"
            ) {

              liveInfo.name =
                cleanText(
                  data.name,
                  50
                ) ||
                liveInfo.name;

            }


            if (
              typeof data.title ===
              "string"
            ) {

              liveInfo.title =
                cleanText(
                  data.title,
                  100
                ) ||
                "音声ライブ配信";

            }


            if (
              typeof data.description ===
              "string"
            ) {

              liveInfo.description =
                cleanText(
                  data.description,
                  500
                );

            }


            if (
              typeof data.themeColor ===
              "string"
            ) {

              liveInfo.themeColor =
                cleanColor(
                  data.themeColor
                );

            }


            if (
              typeof data.backgroundImage ===
              "string"
            ) {

              liveInfo.backgroundImage =
                data.backgroundImage.slice(
                  0,
                  1500000
                );

            }


            broadcastRoom(
              {
                type:
                  "live_updated",

                live:
                  getLiveInfo()
              }
            );


            return;

          }


          /* =========================================
             JOIN LIVE
          ========================================= */

          if (
            data.type ===
            "join_live"
          ) {

            if (
              !liveInfo.active
            ) {

              send(
                ws,
                {
                  type:
                    "live_not_found"
                }
              );

              return;

            }


            if (
              liveInfo.id === id
            ) {

              return;

            }


            client.role =
              "viewer";


            client.blocked =
              new Set();


            liveInfo.viewers++;


            send(
              ws,
              {
                type:
                  "live_joined",

                live:
                  getLiveInfo(),

                broadcasterId:
                  liveInfo.id
              }
            );


            broadcastRoom(
              {
                type:
                  "viewer_count",

                viewers:
                  liveInfo.viewers
              }
            );


            const broadcaster =
              clients.get(
                liveInfo.id
              );


            if (broadcaster) {

              send(
                broadcaster.ws,
                {
                  type:
                    "viewer_joined",

                  viewerId:
                    id
                }
              );

            }


            return;

          }


          /* =========================================
             LEAVE LIVE
          ========================================= */

          if (
            data.type ===
            "viewer_leave"
          ) {

            if (
              client.role ===
              "viewer"
            ) {

              client.role =
                "unknown";


              if (
                liveInfo.viewers > 0
              ) {

                liveInfo.viewers--;

              }


              broadcastRoom(
                {
                  type:
                    "viewer_count",

                  viewers:
                    liveInfo.viewers
                }
              );


              const broadcaster =
                clients.get(
                  liveInfo.id
                );


              if (broadcaster) {

                send(
                  broadcaster.ws,
                  {
                    type:
                      "viewer_left",

                    viewerId:
                      id
                  }
                );

              }

            }


            return;

          }


          /* =========================================
             LIKE
          ========================================= */

          if (
            data.type ===
            "like"
          ) {

            if (
              !liveInfo.active
            ) {
              return;
            }


            if (
              client.role !==
              "viewer"
            ) {
              return;
            }


            if (
              client.blocked.has(
                liveInfo.id
              )
            ) {
              return;
            }


            liveInfo.likes++;


            broadcastRoom(
              {
                type:
                  "like_update",

                likes:
                  liveInfo.likes,

                userId:
                  id
              }
            );


            return;

          }


          /* =========================================
             COMMENT
          ========================================= */

          if (
            data.type ===
            "comment"
          ) {

            if (
              !liveInfo.active
            ) {
              return;
            }


            if (
              client.role !==
              "viewer" &&
              client.role !==
              "broadcaster"
            ) {
              return;
            }


            if (
              client.blocked.has(
                liveInfo.id
              )
            ) {
              return;
            }


            const text =
              cleanText(
                data.text,
                120
              );


            if (!text) {
              return;
            }


            const comment = {

              id:
                Date.now().toString(36) +
                Math.random()
                  .toString(36)
                  .slice(2, 7),

              userId:
                id,

              userName:
                cleanText(
                  data.userName,
                  30
                ) ||
                (
                  client.role ===
                  "broadcaster"
                    ? liveInfo.name
                    : "視聴者"
                ),

              text:
                text,

              time:
                Date.now()

            };


            liveInfo.comments.push(
              comment
            );


            if (
              liveInfo.comments.length >
              100
            ) {

              liveInfo.comments =
                liveInfo.comments.slice(
                  -100
                );

            }


            broadcastRoom(
              {
                type:
                  "new_comment",

                comment:
                  comment
              }
            );


            return;

          }


          /* =========================================
             GIFT
          ========================================= */

          if (
            data.type ===
            "gift"
          ) {

            if (
              !liveInfo.active
            ) {
              return;
            }


            if (
              client.role !==
              "viewer"
            ) {
              return;
            }


            if (
              client.blocked.has(
                liveInfo.id
              )
            ) {
              return;
            }


            const giftName =
              cleanText(
                data.giftName,
                30
              ) ||
              "ギフト";


            const giftIcon =
              cleanText(
                data.giftIcon,
                10
              ) ||
              "🎁";


            const gift = {

              id:
                Date.now().toString(36) +
                Math.random()
                  .toString(36)
                  .slice(2, 7),

              userId:
                id,

              userName:
                cleanText(
                  data.userName,
                  30
                ) ||
                "視聴者",

              giftName:
                giftName,

              giftIcon:
                giftIcon,

              time:
                Date.now()

            };


            liveInfo.gifts.push(
              gift
            );


            if (
              liveInfo.gifts.length >
              100
            ) {

              liveInfo.gifts =
                liveInfo.gifts.slice(
                  -100
                );

            }


            broadcastRoom(
              {
                type:
                  "new_gift",

                gift:
                  gift
              }
            );


            return;

          }


          /* =========================================
             BLOCK
          ========================================= */

          if (
            data.type ===
            "block"
          ) {

            const targetId =
              data.targetId ||
              liveInfo.id;


            if (!targetId) {
              return;
            }


            client.blocked.add(
              targetId
            );


            send(
              ws,
              {
                type:
                  "blocked",

                targetId:
                  targetId
              }
            );


            return;

          }


          /* =========================================
             UNBLOCK
          ========================================= */

          if (
            data.type ===
            "unblock"
          ) {

            const targetId =
              data.targetId;


            if (!targetId) {
              return;
            }


            client.blocked.delete(
              targetId
            );


            send(
              ws,
              {
                type:
                  "unblocked",

                targetId:
                  targetId
              }
            );


            return;

          }


          /* =========================================
             WEBRTC OFFER
          ========================================= */

          if (
            data.type ===
            "offer"
          ) {

            const target =
              clients.get(
                data.to
              );


            if (!target) {
              return;
            }


            send(
              target.ws,
              {
                type:
                  "offer",

                from:
                  id,

                sdp:
                  data.sdp
              }
            );


            return;

          }


          /* =========================================
             WEBRTC ANSWER
          ========================================= */

          if (
            data.type ===
            "answer"
          ) {

            const target =
              clients.get(
                data.to
              );


            if (!target) {
              return;
            }


            send(
              target.ws,
              {
                type:
                  "answer",

                from:
                  id,

                sdp:
                  data.sdp
              }
            );


            return;

          }


          /* =========================================
             ICE
          ========================================= */

          if (
            data.type ===
            "ice_candidate"
          ) {

            const target =
              clients.get(
                data.to
              );


            if (!target) {
              return;
            }


            send(
              target.ws,
              {
                type:
                  "ice_candidate",

                from:
                  id,

                candidate:
                  data.candidate
              }
            );


            return;

          }

        } catch (error) {

          console.error(
            "MESSAGE ERROR:",
            error
          );

        }

      }
    );


    ws.on(
      "close",
      () => {

        const client =
          clients.get(id);


        if (!client) {
          return;
        }


        if (
          liveInfo.active &&
          liveInfo.id === id
        ) {

          stopLive();

        }


        if (
          client.role ===
          "viewer"
        ) {

          if (
            liveInfo.viewers > 0
          ) {

            liveInfo.viewers--;

          }


          broadcastRoom(
            {
              type:
                "viewer_count",

              viewers:
                liveInfo.viewers
            }
          );


          const broadcaster =
            clients.get(
              liveInfo.id
            );


          if (broadcaster) {

            send(
              broadcaster.ws,
              {
                type:
                  "viewer_left",

                viewerId:
                  id
              }
            );

          }

        }


        clients.delete(id);

      }
    );


    ws.on(
      "error",
      error => {

        console.error(
          "WebSocket error:",
          error
        );

      }
    );

  }
);


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
  content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"
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
  min-height: 100%;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f5f6fa;
  color: #222;
}

body {
  overflow-x: hidden;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
  border: 0;
}

.hidden {
  display: none !important;
}

.header {
  height: 64px;
  padding: 0 16px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 50;
}

.logo {
  font-size: 20px;
  font-weight: 800;
}

.container {
  width: min(720px,100%);
  margin: auto;
  padding: 18px 14px 50px;
}

.card {
  background: #fff;
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 15px;
  box-shadow:
    0 5px 20px rgba(0,0,0,.05);
}

.title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 10px;
}

.sub {
  color: #777;
  line-height: 1.6;
  font-size: 14px;
}

.main {
  width: 100%;
  padding: 15px;
  border-radius: 15px;
  background: #3156ff;
  color: white;
  font-weight: 800;
  font-size: 16px;
}

.secondary {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  background: #eef0f5;
  color: #222;
  font-weight: 700;
}

.danger {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  background: #ff4661;
  color: #fff;
  font-weight: 800;
}

label {
  display: block;
  margin: 15px 0 7px;
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  border: 1px solid #dfe2e8;
  border-radius: 13px;
  padding: 12px;
  background: white;
  outline: none;
}

textarea {
  min-height: 90px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #3156ff;
}

.color {
  height: 48px;
  width: 80px;
  padding: 3px;
}

.preview {
  min-height: 280px;
  border-radius: 22px;
  padding: 25px 18px;
  color: white;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #3156ff;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

.preview:before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.28);
}

.preview > * {
  position: relative;
  z-index: 2;
}

.avatar {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: rgba(255,255,255,.92);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: 12px;
}

.previewTitle {
  font-size: 24px;
  font-weight: 900;
}

.previewName {
  margin-top: 6px;
  opacity: .9;
}

.previewDescription {
  margin-top: 12px;
  white-space: pre-wrap;
  max-width: 90%;
}

.status {
  padding: 11px;
  background: #f0f2f7;
  border-radius: 12px;
  text-align: center;
  margin: 10px 0;
}

.liveCard {
  border-radius: 20px;
  overflow: hidden;
  color: white;
  background-size: cover;
  background-position: center;
  margin-bottom: 14px;
}

.liveOverlay {
  min-height: 210px;
  padding: 18px;
  background: rgba(0,0,0,.35);
}

.liveBadge {
  display: inline-block;
  padding: 5px 9px;
  background: #ff3152;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 900;
}

.liveCardTitle {
  font-size: 23px;
  font-weight: 900;
  margin-top: 18px;
}

.liveCardName {
  margin-top: 6px;
}

.liveCardDescription {
  margin-top: 8px;
  opacity: .9;
}

.actionGrid {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 8px;
  margin-top: 12px;
}

.action {
  min-height: 52px;
  border-radius: 14px;
  font-weight: 800;
  background: #f0f2f7;
}

.likeAction {
  background: #ffe9ef;
}

.giftAction {
  background: #fff1d7;
}

.blockAction {
  background: #eeeeee;
}

.count {
  font-weight: 900;
}

.commentBox {
  margin-top: 18px;
}

.commentTitle {
  font-weight: 900;
  margin-bottom: 9px;
}

.commentList {
  max-height: 230px;
  overflow-y: auto;
  padding: 4px;
  background: #fafafa;
  border-radius: 14px;
}

.comment {
  padding: 9px;
  border-bottom: 1px solid #eee;
}

.comment:last-child {
  border-bottom: 0;
}

.commentUser {
  font-weight: 800;
  font-size: 13px;
}

.commentText {
  margin-top: 3px;
  word-break: break-word;
}

.commentForm {
  display: flex;
  gap: 7px;
  margin-top: 8px;
}

.commentForm input {
  flex: 1;
}

.commentForm button {
  width: 65px;
  border-radius: 12px;
  background: #3156ff;
  color: white;
  font-weight: 800;
}

.giftPanel {
  margin-top: 12px;
  padding: 12px;
  border-radius: 15px;
  background: #fff8ed;
}

.giftGrid {
  display: grid;
  grid-template-columns:
    repeat(4,1fr);
  gap: 8px;
}

.giftButton {
  min-height: 70px;
  border-radius: 13px;
  background: white;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
}

.giftIcon {
  font-size: 28px;
}

.giftName {
  font-size: 11px;
  font-weight: 800;
}

.giftHistory {
  margin-top: 10px;
  font-size: 13px;
  color: #666;
}

.giftNotice {
  padding: 10px;
  border-radius: 12px;
  background: #fff0c9;
  margin-top: 10px;
  font-weight: 800;
}

.likeAnimation {
  position: fixed;
  right: 25px;
  bottom: 110px;
  z-index: 100;
  font-size: 38px;
  animation: floatLike 1s ease-out forwards;
  pointer-events: none;
}

@keyframes floatLike {
  0% {
    opacity: 0;
    transform:
      translateY(20px)
      scale(.7);
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translateY(-130px)
      scale(1.3);
  }
}

.giftAnimation {
  position: fixed;
  left: 50%;
  top: 42%;
  transform: translate(-50%,-50%);
  z-index: 100;
  text-align: center;
  animation: giftPop 1.5s ease-out forwards;
  pointer-events: none;
}

.giftAnimationIcon {
  font-size: 75px;
}

.giftAnimationText {
  margin-top: 5px;
  background: rgba(0,0,0,.75);
  color: white;
  padding: 8px 15px;
  border-radius: 15px;
  font-weight: 900;
}

@keyframes giftPop {
  0% {
    opacity: 0;
    transform:
      translate(-50%,-50%)
      scale(.5);
  }

  20% {
    opacity: 1;
    transform:
      translate(-50%,-50%)
      scale(1.1);
  }

  75% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translate(-50%,-65%)
      scale(1);
  }
}

.viewerCount {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(0,0,0,.25);
  margin-top: 10px;
}

.fileInput {
  padding: 9px;
  background: #f5f6f8;
}

.audioBox {
  margin-top: 12px;
}

audio {
  width: 100%;
}

.editBox {
  margin-top: 15px;
}

.small {
  font-size: 13px;
  color: #777;
  line-height: 1.6;
}

.mic {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: #3156ff;
  color: white;
  font-size: 36px;
  display: block;
  margin: 20px auto;
}

.mic.muted {
  background: #555;
}

.topButton {
  padding: 9px 12px;
  border-radius: 11px;
  background: #eef0f5;
  font-weight: 700;
}

.blocked {
  opacity: .45;
}

@media(max-width:420px) {

  .actionGrid {
    grid-template-columns:
      1fr 1fr 1fr;
  }

  .giftGrid {
    grid-template-columns:
      repeat(4,1fr);
  }

  .giftButton {
    min-height: 62px;
  }

}

</style>

</head>


<body>


<!-- =====================================================
     HOME
====================================================== -->

<div
  id="homePage"
>

  <div class="header">

    <div class="logo">
      🎙️ VoiceポタLive
    </div>

    <button
      class="topButton"
      onclick="showPage('settingPage')"
    >
      配信する
    </button>

  </div>


  <div class="container">

    <div class="card">

      <div class="title">
        声でつながる
      </div>

      <div class="sub">
        音声だけで気軽に配信できるライブアプリです。
      </div>

      <br>

      <button
        class="main"
        onclick="showPage('settingPage')"
      >
        🎙️ 配信を始める
      </button>

    </div>


    <div class="card">

      <div class="title">
        🔴 配信中
      </div>

      <div
        id="liveList"
      >

        <div class="status">
          現在配信中のライブはありません
        </div>

      </div>

    </div>

  </div>

</div>


<!-- =====================================================
     SETTING
====================================================== -->

<div
  id="settingPage"
  class="hidden"
>

  <div class="header">

    <button
      class="topButton"
      onclick="showPage('homePage')"
    >
      ← 戻る
    </button>

    <div class="logo">
      配信設定
    </div>

    <div></div>

  </div>


  <div class="container">

    <div class="card">

      <div class="title">
        🎨 配信画面カスタム
      </div>


      <label>
        配信者名
      </label>

      <input
        id="hostName"
        maxlength="50"
        value="配信者"
        placeholder="配信者名"
        oninput="updatePreview()"
      >


      <label>
        配信タイトル
      </label>

      <input
        id="streamTitle"
        maxlength="100"
        value="音声ライブ配信"
        placeholder="配信タイトル"
        oninput="updatePreview()"
      >


      <label>
        配信説明
      </label>

      <textarea
        id="streamDescription"
        maxlength="500"
        placeholder="配信内容"
        oninput="updatePreview()"
      ></textarea>


      <label>
        背景カラー
      </label>

      <input
        id="themeColor"
        class="color"
        type="color"
        value="#3156ff"
        onchange="updatePreview()"
      >


      <label>
        背景画像
      </label>

      <input
        id="backgroundImage"
        class="fileInput"
        type="file"
        accept="image/*"
        onchange="loadBackgroundImage(event)"
      >

      <div class="small">
        スマホの写真を配信背景にできます。
      </div>

    </div>


    <div class="card">

      <div class="title">
        プレビュー
      </div>

      <div
        id="preview"
        class="preview"
      >

        <div
          id="previewAvatar"
          class="avatar"
        >
          🎙️
        </div>

        <div
          id="previewTitle"
          class="previewTitle"
        >
          音声ライブ配信
        </div>

        <div
          id="previewName"
          class="previewName"
        >
          配信者
        </div>

        <div
          id="previewDescription"
          class="previewDescription"
        ></div>

      </div>

    </div>


    <div class="card">

      <button
        class="main"
        onclick="startLive()"
      >
        🔴 配信開始
      </button>

      <div
        id="settingStatus"
        class="status"
      >
        配信開始ボタンを押してください
      </div>

    </div>

  </div>

</div>


<!-- =====================================================
     BROADCASTER LIVE
====================================================== -->

<div
  id="livePage"
  class="hidden"
>

  <div class="header">

    <div class="logo">
      🔴 配信中
    </div>

    <button
      class="topButton"
      onclick="stopLive()"
    >
      配信終了
    </button>

  </div>


  <div class="container">

    <div
      id="broadcasterScreen"
      class="preview"
    >

      <div
        id="broadcasterAvatar"
        class="avatar"
      >
        🎙️
      </div>

      <div
        id="broadcasterTitle"
        class="previewTitle"
      >
        音声ライブ配信
      </div>

      <div
        id="broadcasterName"
        class="previewName"
      >
        配信者
      </div>

      <div
        id="broadcasterDescription"
        class="previewDescription"
      ></div>

      <div
        id="broadcasterViewerCount"
        class="viewerCount"
      >
        👥 0人
      </div>

    </div>


    <div class="card">

      <div
        id="liveStatus"
        class="status"
      >
        🔴 配信中
      </div>

      <button
        id="micButton"
        class="mic"
        onclick="toggleMute()"
      >
        🎙️
      </button>

      <div
        class="small"
        style="text-align:center"
      >
        マイクON/OFF
      </div>

    </div>


    <div class="card">

      <div class="title">
        💬 コメント
      </div>

      <div
        id="broadcasterComments"
        class="commentList"
      ></div>

    </div>


    <div class="card">

      <div class="title">
        🎁 受け取ったギフト
      </div>

      <div
        id="broadcasterGifts"
        class="giftHistory"
      >
        まだギフトはありません
      </div>

    </div>


    <div class="card">

      <div class="title">
        ❤️ いいね
      </div>

      <div
        id="broadcasterLikes"
        style="font-size:35px;font-weight:900"
      >
        0
      </div>

    </div>


    <div class="card">

      <div class="title">
        ✏️ 配信画面を変更
      </div>

      <label>
        タイトル
      </label>

      <input
        id="editTitle"
        maxlength="100"
      >


      <label>
        説明
      </label>

      <textarea
        id="editDescription"
        maxlength="500"
      ></textarea>


      <label>
        背景カラー
      </label>

      <input
        id="editColor"
        class="color"
        type="color"
      >


      <button
        class="secondary"
        style="margin-top:12px"
        onclick="updateLive()"
      >
        保存して反映
      </button>

    </div>


    <button
      class="danger"
      onclick="stopLive()"
    >
      ⛔ 配信を終了する
    </button>

  </div>

</div>


<!-- =====================================================
     VIEWER
====================================================== -->

<div
  id="viewerPage"
  class="hidden"
>

  <div class="header">

    <button
      class="topButton"
      onclick="leaveLive()"
    >
      ← 戻る
    </button>

    <div class="logo">
      🔴 LIVE
    </div>

    <div></div>

  </div>


  <div class="container">

    <div
      id="viewerScreen"
      class="preview"
    >

      <div
        id="viewerAvatar"
        class="avatar"
      >
        🎙️
      </div>

      <div
        id="viewerTitle"
        class="previewTitle"
      >
        音声ライブ配信
      </div>

      <div
        id="viewerName"
        class="previewName"
      >
        配信者
      </div>

      <div
        id="viewerDescription"
        class="previewDescription"
      ></div>

      <div
        id="viewerCount"
        class="viewerCount"
      >
        👥 0人
      </div>

    </div>


    <div class="card">

      <div
        id="viewerStatus"
        class="status"
      >
        接続中...
      </div>


      <div class="audioBox">

        <audio
          id="remoteAudio"
          controls
          autoplay
          playsinline
        ></audio>

      </div>

    </div>


    <div class="card">

      <div class="actionGrid">

        <button
          class="action likeAction"
          onclick="sendLike()"
        >
          ❤️ いいね
          <span
            id="likeCount"
            class="count"
          >
            0
          </span>
        </button>


        <button
          class="action giftAction"
          onclick="toggleGiftPanel()"
        >
          🎁 ギフト
        </button>


        <button
          class="action blockAction"
          onclick="blockStreamer()"
        >
          🚫 ブロック
        </button>

      </div>


      <div
        id="giftPanel"
        class="giftPanel hidden"
      >

        <div
          class="giftGrid"
        >

          <button
            class="giftButton"
            onclick="sendGift('🌸','花')"
          >
            <span class="giftIcon">
              🌸
            </span>
            <span class="giftName">
              花
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('⭐','星')"
          >
            <span class="giftIcon">
              ⭐
            </span>
            <span class="giftName">
              星
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('❤️','ハート')"
          >
            <span class="giftIcon">
              ❤️
            </span>
            <span class="giftName">
              ハート
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('🎁','プレゼント')"
          >
            <span class="giftIcon">
              🎁
            </span>
            <span class="giftName">
              プレゼント
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('💎','ダイヤ')"
          >
            <span class="giftIcon">
              💎
            </span>
            <span class="giftName">
              ダイヤ
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('👑','王冠')"
          >
            <span class="giftIcon">
              👑
            </span>
            <span class="giftName">
              王冠
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('🎉','お祝い')"
          >
            <span class="giftIcon">
              🎉
            </span>
            <span class="giftName">
              お祝い
            </span>
          </button>


          <button
            class="giftButton"
            onclick="sendGift('🚀','ロケット')"
          >
            <span class="giftIcon">
              🚀
            </span>
            <span class="giftName">
              ロケット
            </span>
          </button>

        </div>

      </div>

    </div>


    <div class="card">

      <div class="commentBox">

        <div class="commentTitle">
          💬 コメント
        </div>


        <div
          id="commentList"
          class="commentList"
        ></div>


        <form
          class="commentForm"
          onsubmit="sendComment(event)"
        >

          <input
            id="commentInput"
            maxlength="120"
            placeholder="コメントを入力"
          >

          <button
            type="submit"
          >
            送信
          </button>

        </form>

      </div>

    </div>


    <div
      id="giftNotice"
      class="giftNotice hidden"
    ></div>


    <div class="card">

      <button
        class="secondary"
        onclick="enableAudio()"
      >
        🔊 音声をONにする
      </button>

    </div>

  </div>

</div>


<script>

/* =========================================================
   VARIABLES
========================================================= */

let socket = null;

let myId = null;

let isBroadcaster = false;

let localStream = null;

let isMuted = false;

let currentLive = null;

let currentBackgroundImage = "";

let reconnectTimer = null;

let peerConnections = {};

let pendingIceCandidates = {};

let blockedStreamer = false;

let lastGiftTime = 0;


/* =========================================================
   SOCKET
========================================================= */

function getSocketUrl() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return (
    protocol +
    "//" +
    location.host
  );

}


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


  socket =
    new WebSocket(
      getSocketUrl()
    );


  socket.onopen =
    function() {

      console.log(
        "WebSocket connected"
      );

    };


  socket.onmessage =
    async function(event) {

      let data;

      try {

        data =
          JSON.parse(
            event.data
          );

      } catch (error) {

        return;

      }


      await handleMessage(
        data
      );

    };


  socket.onclose =
    function() {

      console.log(
        "WebSocket closed"
      );


      reconnectTimer =
        setTimeout(
          function() {

            connectSocket();

          },
          2000
        );

    };


  socket.onerror =
    function(error) {

      console.error(
        "WebSocket error",
        error
      );

    };

}


function sendMessage(data) {

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

    return true;

  }

  return false;

}


/* =========================================================
   MESSAGE
========================================================= */

async function handleMessage(data) {

  switch (
    data.type
  ) {


    case "connected":

      myId =
        data.id;

      renderLiveList(
        data.live
      );

      break;


    case "live_list":

      renderLiveList(
        data.live
      );

      break;


    case "live_started":

      currentLive =
        data.live;

      isBroadcaster =
        true;

      renderBroadcaster(
        data.live
      );

      showPage(
        "livePage"
      );

      break;


    case "live_updated":

      currentLive =
        data.live;


      if (
        isBroadcaster
      ) {

        renderBroadcaster(
          data.live
        );

      } else {

        renderViewer(
          data.live
        );

      }


      renderLiveList(
        data.live
      );

      break;


    case "live_ended":

      currentLive =
        null;


      renderLiveList(
        null
      );


      if (
        !isBroadcaster
      ) {

        document.getElementById(
          "viewerStatus"
        ).textContent =
          "配信が終了しました";


        setTimeout(
          function() {

            leaveLive();

          },
          1200
        );

      }

      break;


    case "live_joined":

      currentLive =
        data.live;

      blockedStreamer =
        false;


      renderViewer(
        data.live
      );


      showPage(
        "viewerPage"
      );


      document.getElementById(
        "viewerStatus"
      ).textContent =
        "接続しています...";


      break;


    case "live_not_found":

      alert(
        "現在配信中のライブはありません"
      );

      break;


    case "viewer_count":

      updateViewerCount(
        data.viewers
      );

      break;


    case "viewer_joined":

      if (
        isBroadcaster
      ) {

        await createOffer(
          data.viewerId
        );

      }

      break;


    case "viewer_left":

      closePeer(
        data.viewerId
      );

      break;


    case "offer":

      await handleOffer(
        data
      );

      break;


    case "answer":

      await handleAnswer(
        data
      );

      break;


    case "ice_candidate":

      await receiveIceCandidate(
        data
      );

      break;


    case "like_update":

      updateLikeCount(
        data.likes
      );


      showLikeAnimation();

      break;


    case "new_comment":

      addComment(
        data.comment
      );

      break;


    case "new_gift":

      addGift(
        data.gift
      );

      showGiftAnimation(
        data.gift
      );

      break;


    case "blocked":

      blockedStreamer =
        true;

      alert(
        "この配信者をブロックしました。"
      );

      leaveLive();

      break;


    case "unblocked":

      blockedStreamer =
        false;

      break;


    case "error":

      console.error(
        data.message
      );

      alert(
        data.message
      );

      break;

  }

}


/* =========================================================
   PAGE
========================================================= */

function showPage(
  page
) {

  const pages = [
    "homePage",
    "settingPage",
    "livePage",
    "viewerPage"
  ];


  pages.forEach(
    function(id) {

      document
        .getElementById(id)
        .classList.add(
          "hidden"
        );

    }
  );


  document
    .getElementById(page)
    .classList.remove(
      "hidden"
    );

}


/* =========================================================
   PREVIEW
========================================================= */

function updatePreview() {

  const name =
    document.getElementById(
      "hostName"
    ).value ||
    "配信者";


  const title =
    document.getElementById(
      "streamTitle"
    ).value ||
    "音声ライブ配信";


  const description =
    document.getElementById(
      "streamDescription"
    ).value ||
    "";


  const color =
    document.getElementById(
      "themeColor"
    ).value ||
    "#3156ff";


  document.getElementById(
    "previewName"
  ).textContent =
    name;


  document.getElementById(
    "previewTitle"
  ).textContent =
    title;


  document.getElementById(
    "previewDescription"
  ).textContent =
    description;


  const preview =
    document.getElementById(
      "preview"
    );


  preview.style.backgroundColor =
    color;


  if (
    currentBackgroundImage
  ) {

    preview.style.backgroundImage =
      "url('" +
      currentBackgroundImage +
      "')";

  } else {

    preview.style.backgroundImage =
      "none";

  }

}


/* =========================================================
   IMAGE
========================================================= */

function loadBackgroundImage(
  event
) {

  const file =
    event.target.files &&
    event.target.files[0];


  if (!file) {
    return;
  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    alert(
      "画像ファイルを選択してください"
    );

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function() {

      currentBackgroundImage =
        reader.result;


      updatePreview();

    };


  reader.readAsDataURL(
    file
  );

}


/* =========================================================
   START LIVE
========================================================= */

async function startLive() {

  const status =
    document.getElementById(
      "settingStatus"
    );


  status.textContent =
    "🎤 マイクの許可を確認しています...";


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    status.textContent =
      "このブラウザではマイクを使用できません。";

    return;

  }


  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          },

          video: false

        });


    isBroadcaster =
      true;


    const name =
      document.getElementById(
        "hostName"
      ).value.trim() ||
      "配信者";


    const title =
      document.getElementById(
        "streamTitle"
      ).value.trim() ||
      "音声ライブ配信";


    const description =
      document.getElementById(
        "streamDescription"
      ).value.trim();


    const color =
      document.getElementById(
        "themeColor"
      ).value ||
      "#3156ff";


    status.textContent =
      "🔴 配信を開始しています...";


    sendMessage({

      type:
        "start_live",

      name:
        name,

      title:
        title,

      description:
        description,

      themeColor:
        color,

      backgroundImage:
        currentBackgroundImage,

      avatar:
        "🎙️"

    });


  } catch (error) {

    console.error(
      "getUserMedia error",
      error
    );


    isBroadcaster =
      false;


    status.textContent =
      "マイクを使用できませんでした。ブラウザのマイク許可を確認してください。";

  }

}


/* =========================================================
   RENDER BROADCASTER
========================================================= */

function renderBroadcaster(
  live
) {

  if (!live) {
    return;
  }


  const screen =
    document.getElementById(
      "broadcasterScreen"
    );


  screen.style.backgroundColor =
    live.themeColor ||
    "#3156ff";


  if (
    live.backgroundImage
  ) {

    screen.style.backgroundImage =
      "url('" +
      live.backgroundImage +
      "')";

  } else {

    screen.style.backgroundImage =
      "none";

  }


  document.getElementById(
    "broadcasterAvatar"
  ).textContent =
    live.avatar ||
    "🎙️";


  document.getElementById(
    "broadcasterTitle"
  ).textContent =
    live.title;


  document.getElementById(
    "broadcasterName"
  ).textContent =
    live.name;


  document.getElementById(
    "broadcasterDescription"
  ).textContent =
    live.description ||
    "";


  document.getElementById(
    "broadcasterViewerCount"
  ).textContent =
    "👥 " +
    (live.viewers || 0) +
    "人";


  document.getElementById(
    "broadcasterLikes"
  ).textContent =
    live.likes || 0;


  document.getElementById(
    "editTitle"
  ).value =
    live.title ||
    "";


  document.getElementById(
    "editDescription"
  ).value =
    live.description ||
    "";


  document.getElementById(
    "editColor"
  ).value =
    live.themeColor ||
    "#3156ff";


  renderComments(
    live.comments || []
  );


  renderGifts(
    live.gifts || []
  );

}


/* =========================================================
   RENDER VIEWER
========================================================= */

function renderViewer(
  live
) {

  if (!live) {
    return;
  }


  const screen =
    document.getElementById(
      "viewerScreen"
    );


  screen.style.backgroundColor =
    live.themeColor ||
    "#3156ff";


  if (
    live.backgroundImage
  ) {

    screen.style.backgroundImage =
      "url('" +
      live.backgroundImage +
      "')";

  } else {

    screen.style.backgroundImage =
      "none";

  }


  document.getElementById(
    "viewerAvatar"
  ).textContent =
    live.avatar ||
    "🎙️";


  document.getElementById(
    "viewerTitle"
  ).textContent =
    live.title;


  document.getElementById(
    "viewerName"
  ).textContent =
    live.name;


  document.getElementById(
    "viewerDescription"
  ).textContent =
    live.description ||
    "";


  document.getElementById(
    "viewerCount"
  ).textContent =
    "👥 " +
    (live.viewers || 0) +
    "人";


  updateLikeCount(
    live.likes || 0
  );


  renderComments(
    live.comments || []
  );


  renderGifts(
    live.gifts || []
  );

}


/* =========================================================
   LIVE LIST
========================================================= */

function renderLiveList(
  live
) {

  const list =
    document.getElementById(
      "liveList"
    );


  if (
    !live ||
    !live.active
  ) {

    list.innerHTML =
      '<div class="status">' +
      '現在配信中のライブはありません' +
      '</div>';

    return;

  }


  let bg;


  if (
    live.backgroundImage
  ) {

    bg =
      "background-image:url('" +
      live.backgroundImage +
      "');";

  } else {

    bg =
      "background-color:" +
      (
        live.themeColor ||
        "#3156ff"
      ) +
      ";";

  }


  list.innerHTML =

    '<div class="liveCard" style="' +
    bg +
    '">' +

      '<div class="liveOverlay">' +

        '<span class="liveBadge">' +
        '🔴 LIVE' +
        '</span>' +

        '<div class="liveCardTitle">' +
        escapeHtml(
          live.title
        ) +
        '</div>' +

        '<div class="liveCardName">' +
        escapeHtml(
          live.name
        ) +
        '</div>' +

        '<div class="liveCardDescription">' +
        escapeHtml(
          live.description || ""
        ) +
        '</div>' +

        '<div style="margin-top:10px">' +
        '👥 ' +
        (live.viewers || 0) +
        '人　❤️ ' +
        (live.likes || 0) +
        '</div>' +

        '<button ' +
        'class="main" ' +
        'style="margin-top:18px;background:#fff;color:#222" ' +
        'onclick="joinLive()">' +
        '👂 この配信を聴く' +
        '</button>' +

      '</div>' +

    '</div>';

}


/* =========================================================
   JOIN
========================================================= */

function joinLive() {

  if (
    !currentLive ||
    !currentLive.active
  ) {

    alert(
      "現在配信中のライブがありません"
    );

    return;

  }


  sendMessage({

    type:
      "join_live"

  });

}


/* =========================================================
   LEAVE
========================================================= */

function leaveLive() {

  sendMessage({

    type:
      "viewer_leave"

  });


  const audio =
    document.getElementById(
      "remoteAudio"
    );


  if (audio) {

    audio.srcObject =
      null;

  }


  Object.keys(
    peerConnections
  ).forEach(
    function(id) {

      closePeer(id);

    }
  );


  blockedStreamer =
    false;


  showPage(
    "homePage"
  );

}


/* =========================================================
   VIEWER COUNT
========================================================= */

function updateViewerCount(
  count
) {

  document.getElementById(
    "viewerCount"
  ).textContent =
    "👥 " +
    count +
    "人";


  document.getElementById(
    "broadcasterViewerCount"
  ).textContent =
    "👥 " +
    count +
    "人";

}


/* =========================================================
   LIKE
========================================================= */

function sendLike() {

  if (
    blockedStreamer
  ) {

    return;

  }


  sendMessage({

    type:
      "like"

  });

}


function updateLikeCount(
  count
) {

  document.getElementById(
    "likeCount"
  ).textContent =
    count;


  document.getElementById(
    "broadcasterLikes"
  ).textContent =
    count;

}


function showLikeAnimation() {

  const el =
    document.createElement(
      "div"
    );


  el.className =
    "likeAnimation";


  el.textContent =
    "❤️";


  document.body.appendChild(
    el
  );


  setTimeout(
    function() {

      el.remove();

    },
    1000
  );

}


/* =========================================================
   COMMENTS
========================================================= */

function sendComment(
  event
) {

  event.preventDefault();


  if (
    blockedStreamer
  ) {

    return;

  }


  const input =
    document.getElementById(
      "commentInput"
    );


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  sendMessage({

    type:
      "comment",

    text:
      text,

    userName:
      "視聴者"

  });


  input.value =
    "";

}


function addComment(
  comment
) {

  const lists = [

    document.getElementById(
      "commentList"
    ),

    document.getElementById(
      "broadcasterComments"
    )

  ];


  lists.forEach(
    function(list) {

      if (!list) {
        return;
      }


      const div =
        document.createElement(
          "div"
        );


      div.className =
        "comment";


      div.innerHTML =

        '<div class="commentUser">' +
        escapeHtml(
          comment.userName
        ) +
        '</div>' +

        '<div class="commentText">' +
        escapeHtml(
          comment.text
        ) +
        '</div>';


      list.appendChild(
        div
      );


      list.scrollTop =
        list.scrollHeight;

    }
  );

}


function renderComments(
  comments
) {

  const lists = [

    document.getElementById(
      "commentList"
    ),

    document.getElementById(
      "broadcasterComments"
    )

  ];


  lists.forEach(
    function(list) {

      if (!list) {
        return;
      }


      list.innerHTML =
        "";


      comments.forEach(
        function(comment) {

          const div =
            document.createElement(
              "div"
            );


          div.className =
            "comment";


          div.innerHTML =

            '<div class="commentUser">' +
            escapeHtml(
              comment.userName
            ) +
            '</div>' +

            '<div class="commentText">' +
            escapeHtml(
              comment.text
            ) +
            '</div>';


          list.appendChild(
            div
          );

        }
      );


      list.scrollTop =
        list.scrollHeight;

    }
  );

}


/* =========================================================
   GIFTS
========================================================= */

function toggleGiftPanel() {

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

  if (
    blockedStreamer
  ) {

    return;

  }


  const now =
    Date.now();


  if (
    now - lastGiftTime <
    400
  ) {

    return;

  }


  lastGiftTime =
    now;


  sendMessage({

    type:
      "gift",

    giftIcon:
      icon,

    giftName:
      name,

    userName:
      "視聴者"

  });

}


function addGift(
  gift
) {

  const history =
    document.getElementById(
      "broadcasterGifts"
    );


  if (!history) {
    return;
  }


  if (
    history.textContent ===
    "まだギフトはありません"
  ) {

    history.textContent =
      "";

  }


  const row =
    document.createElement(
      "div"
    );


  row.style.padding =
    "6px 0";


  row.textContent =
    gift.giftIcon +
    " " +
    gift.userName +
    " → " +
    gift.giftName;


  history.appendChild(
    row
  );

}


function renderGifts(
  gifts
) {

  const history =
    document.getElementById(
      "broadcasterGifts"
    );


  if (!history) {
    return;
  }


  if (
    !gifts ||
    gifts.length === 0
  ) {

    history.textContent =
      "まだギフトはありません";

    return;

  }


  history.innerHTML =
    "";


  gifts.forEach(
    function(gift) {

      const row =
        document.createElement(
          "div"
        );


      row.style.padding =
        "6px 0";


      row.textContent =
        gift.giftIcon +
        " " +
        gift.userName +
        " → " +
        gift.giftName;


      history.appendChild(
        row
      );

    }
  );

}


function showGiftAnimation(
  gift
) {

  const box =
    document.createElement(
      "div"
    );


  box.className =
    "giftAnimation";


  box.innerHTML =

    '<div class="giftAnimationIcon">' +
    escapeHtml(
      gift.giftIcon
    ) +
    '</div>' +

    '<div class="giftAnimationText">' +
    escapeHtml(
      gift.userName
    ) +
    " さんから " +
    escapeHtml(
      gift.giftName
    ) +
    '</div>';


  document.body.appendChild(
    box
  );


  setTimeout(
    function() {

      box.remove();

    },
    1500
  );

}


/* =========================================================
   BLOCK
========================================================= */

function blockStreamer() {

  if (
    !currentLive ||
    !currentLive.id
  ) {

    return;

  }


  if (
    !confirm(
      "この配信者をブロックしますか？"
    )
  ) {

    return;

  }


  sendMessage({

    type:
      "block",

    targetId:
      currentLive.id

  });

}


/* =========================================================
   AUDIO
========================================================= */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  if (!audio) {
    return;
  }


  audio.muted =
    false;

  audio.volume =
    1;


  audio.play()
    .then(
      function() {

        document.getElementById(
          "viewerStatus"
        ).textContent =
          "🔊 ライブ音声を再生中";

      }
    )
    .catch(
      function(error) {

        console.error(
          "audio play error",
          error
        );

        document.getElementById(
          "viewerStatus"
        ).textContent =
          "音声ボタンをもう一度押してください";

      }
    );

}


/* =========================================================
   UPDATE LIVE
========================================================= */

function updateLive() {

  if (
    !isBroadcaster ||
    !currentLive
  ) {

    return;

  }


  const title =
    document.getElementById(
      "editTitle"
    ).value.trim();


  const description =
    document.getElementById(
      "editDescription"
    ).value.trim();


  const color =
    document.getElementById(
      "editColor"
    ).value;


  sendMessage({

    type:
      "update_live",

    title:
      title ||
      "音声ライブ配信",

    description:
      description,

    themeColor:
      color

  });

}


/* =========================================================
   MUTE
========================================================= */

function toggleMute() {

  if (!localStream) {
    return;
  }


  const tracks =
    localStream.getAudioTracks();


  if (
    tracks.length === 0
  ) {

    return;

  }


  isMuted =
    !isMuted;


  tracks.forEach(
    function(track) {

      track.enabled =
        !isMuted;

    }
  );


  const button =
    document.getElementById(
      "micButton"
    );


  if (isMuted) {

    button.textContent =
      "🔇";

    button.classList.add(
      "muted"
    );


    document.getElementById(
      "liveStatus"
    ).textContent =
      "🔇 ミュート中";

  } else {

    button.textContent =
      "🎙️";

    button.classList.remove(
      "muted"
    );


    document.getElementById(
      "liveStatus"
    ).textContent =
      "🔴 配信中";

  }

}


/* =========================================================
   WEBRTC BROADCASTER
========================================================= */

async function createOffer(
  viewerId
) {

  if (
    !localStream ||
    !isBroadcaster
  ) {

    return;

  }


  closePeer(
    viewerId
  );


  const pc =
    new RTCPeerConnection(
      {
        ...rtcConfig
      }
    );


  peerConnections[
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

        sendMessage({

          type:
            "ice_candidate",

          to:
            viewerId,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    function() {

      console.log(
        "Broadcaster:",
        viewerId,
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "failed" ||
        pc.connectionState ===
        "closed"
      ) {

        closePeer(
          viewerId
        );

      }

    };


  try {

    const offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    sendMessage({

      type:
        "offer",

      to:
        viewerId,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.error(
      "offer error",
      error
    );

  }

}


/* =========================================================
   WEBRTC VIEWER OFFER
========================================================= */

async function handleOffer(
  data
) {

  if (
    isBroadcaster
  ) {

    return;

  }


  closePeer(
    data.from
  );


  const pc =
    new RTCPeerConnection(
      {
        ...rtcConfig
      }
    );


  peerConnections[
    data.from
  ] =
    pc;


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        sendMessage({

          type:
            "ice_candidate",

          to:
            data.from,

          candidate:
            event.candidate

        });

      }

    };


  pc.ontrack =
    function(event) {

      const audio =
        document.getElementById(
          "remoteAudio"
        );


      if (
        event.streams &&
        event.streams[0]
      ) {

        audio.srcObject =
          event.streams[0];

      } else {

        const stream =
          new MediaStream();


        stream.addTrack(
          event.track
        );


        audio.srcObject =
          stream;

      }


      audio.play()
        .then(
          function() {

            document.getElementById(
              "viewerStatus"
            ).textContent =
              "🔊 ライブ音声を再生中";

          }
        )
        .catch(
          function() {

            document.getElementById(
              "viewerStatus"
            ).textContent =
              "🔊 音声をONにしてください";

          }
        );

    };


  pc.onconnectionstatechange =
    function() {

      console.log(
        "Viewer:",
        pc.connectionState
      );


      if (
        pc.connectionState ===
        "connected"
      ) {

        document.getElementById(
          "viewerStatus"
        ).textContent =
          "🔴 接続しました";

      }


      if (
        pc.connectionState ===
        "failed"
      ) {

        document.getElementById(
          "viewerStatus"
        ).textContent =
          "接続に失敗しました";

      }

    };


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


    await flushIceCandidates(
      data.from
    );


    const answer =
      await pc.createAnswer();


    await pc.setLocalDescription(
      answer
    );


    sendMessage({

      type:
        "answer",

      to:
        data.from,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.error(
      "handle offer error",
      error
    );

  }

}


/* =========================================================
   ANSWER
========================================================= */

async function handleAnswer(
  data
) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) {
    return;
  }


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


    await flushIceCandidates(
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

function queueIceCandidate(
  peerId,
  candidate
) {

  if (
    !pendingIceCandidates[
      peerId
    ]
  ) {

    pendingIceCandidates[
      peerId
    ] =
      [];

  }


  pendingIceCandidates[
    peerId
  ].push(
    candidate
  );

}


async function flushIceCandidates(
  peerId
) {

  const pc =
    peerConnections[
      peerId
    ];


  if (
    !pc ||
    !pc.remoteDescription
  ) {

    return;

  }


  const list =
    pendingIceCandidates[
      peerId
    ] || [];


  for (
    const candidate
    of list
  ) {

    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          candidate
        )
      );

    } catch (error) {

      console.error(
        "ICE queue error",
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

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) {

    return;

  }


  if (
    !pc.remoteDescription
  ) {

    queueIceCandidate(
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

}


/* =========================================================
   CLOSE PEER
========================================================= */

function closePeer(
  peerId
) {

  const pc =
    peerConnections[
      peerId
    ];


  if (pc) {

    try {

      pc.close();

    } catch (error) {}

  }


  delete peerConnections[
    peerId
  ];


  delete pendingIceCandidates[
    peerId
  ];

}


/* =========================================================
   STOP LIVE
========================================================= */

function stopLive() {

  if (!isBroadcaster) {
    return;
  }


  if (
    !confirm(
      "配信を終了しますか？"
    )
  ) {

    return;

  }


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        function(track) {

          try {

            track.stop();

          } catch (error) {}

        }
      );


    localStream =
      null;

  }


  Object.keys(
    peerConnections
  ).forEach(
    function(id) {

      closePeer(id);

    }
  );


  sendMessage({

    type:
      "stop_live"

  });


  isBroadcaster =
    false;


  isMuted =
    false;


  currentLive =
    null;


  showPage(
    "homePage"
  );

}


/* =========================================================
   ESCAPE
========================================================= */

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


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    connectSocket();

    updatePreview();

  }
);


/* =========================================================
   BEFORE UNLOAD
========================================================= */

window.addEventListener(
  "beforeunload",
  function() {

    if (
      isBroadcaster
    ) {

      sendMessage({

        type:
          "stop_live"

      });

    }


    if (localStream) {

      localStream
        .getTracks()
        .forEach(
          function(track) {

            try {

              track.stop();

            } catch (error) {}

          }
        );

    }

  }
);

</script>

</body>

</html>
`;


/* =========================================================
   SERVER START
========================================================= */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "Server running on port " +
      PORT
    );

  }
);
