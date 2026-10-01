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

const clients = new Set();

let broadcaster = null;

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  startedAt: null,
  likes: 0,
  comments: 0,
  gifts: 0,
  viewers: 0
};

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
    return;
  }


  if (
    data.type ===
    "viewer_count"
  ) {

    const e =
      document.getElementById(
        "viewerCount"
      );

    if (e) {
      e.textContent =
        data.viewers || 0;
    }

    return;
  }


  if (
    data.type ===
    "live_start_failed"
  ) {

    isBroadcaster =
      false;

    if (localStream) {

      localStream
        .getTracks()
        .forEach(
          function(track) {
            track.stop();
          }
        );

      localStream = null;
    }

    alert(
      data.reason ||
      "配信を開始できませんでした"
    );

    return;
  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function renderLiveList(lives) {

  const list =
    document.getElementById(
      "liveList"
    );


  if (
    !lives ||
    lives.length === 0
  ) {

    list.innerHTML =
      "<div class='empty'>" +
      "現在配信中のライブはありません" +
      "</div>";

    return;

  }


  let html = "";


  lives.forEach(
    function(live) {

      html +=
        "<div class='live-card' " +
        "data-live-id='" +
        escapeHtml(live.id) +
        "'>";

      html +=
        "<div class='live-avatar'>🎙️</div>";

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
        "<span class='live-badge'>LIVE</span>";

      html +=
        "</div></div>";

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
   START LIVE
===================================================== */

async function startLive() {

  if (isBroadcaster) {

    openPanel();

    return;

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "このブラウザではマイクを使用できません。"
    );

    return;

  }


  const nameInput =
    document.getElementById(
      "liveNameInput"
    );

  const titleInput =
    document.getElementById(
      "liveTitleInput"
    );


  const name =
    nameInput.value.trim();

  const title =
    titleInput.value.trim();


  if (!name) {

    alert(
      "配信者名を入力してください"
    );

    nameInput.focus();

    return;

  }


  if (!title) {

    alert(
      "配信タイトルを入力してください"
    );

    titleInput.focus();

    return;

  }


  try {

    localStream =
      await navigator.mediaDevices
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

  } catch (error) {

    console.error(
      "getUserMedia error:",
      error
    );

    alert(
      "マイクを使用できませんでした。\\n\\n" +
      "ブラウザのマイク許可を確認してください。"
    );

    return;

  }


  isBroadcaster =
    true;


  openPanel();


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


  const panelTitle =
    document.getElementById(
      "panelTitleText"
    );


  if (panelTitle) {

    panelTitle.textContent =
      title;

  }


  setPanelStatus(
    "🔴 配信を開始しています..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "🎙️ マイク配信中";


  sendMessage({

    type:
      "start_live",

    clientId:
      myId,

    name:
      name,

    title:
      title

  });


  setPanelStatus(
    "🔴 配信中です"
  );

}


/* =====================================================
   STOP LIVE
===================================================== */

function stopLive() {

  if (!isBroadcaster) {

    closePanel();

    return;

  }


  sendMessage({

    type:
      "stop_live",

    clientId:
      myId

  });


  closePeerConnections();


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


  setPanelStatus(
    "配信を終了しました"
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "配信終了";


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";

}


/* =====================================================
   LISTEN LIVE
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


  document.getElementById(
    "stopLiveButton"
  ).style.display =
    "none";


  document.getElementById(
    "audioOnButton"
  ).style.display =
    "none";


  setPanelStatus(
    "🎧 配信者へ接続しています..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "接続中...";


  sendMessage({

    type:
      "join_live",

    clientId:
      myId,

    liveId:
      id

  });

}


/* =====================================================
   BROADCASTER CREATE OFFER
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


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    viewerId
  ] = pc;


  const audioTracks =
    localStream.getAudioTracks();


  audioTracks.forEach(
    function(track) {

      const sender =
        pc.addTrack(
          track,
          localStream
        );


      try {

        const params =
          sender.getParameters();


        if (!params.encodings) {

          params.encodings = [
            {}
          ];

        }


        params.encodings[0]
          .maxBitrate =
          64000;


        sender.setParameters(
          params
        ).catch(
          function(error) {

            console.log(
              "setParameters error",
              error
            );

          }
        );

      } catch (error) {

        console.log(
          "sender parameter error",
          error
        );

      }

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

          from:
            myId,

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

        delete peerConnections[
          viewerId
        ];

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

      from:
        myId,

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


/* =====================================================
   VIEWER RECEIVE OFFER
===================================================== */

async function receiveOffer(data) {

  if (isBroadcaster) {
    return;
  }


  closePeerConnections();


  currentBroadcasterId =
    data.from;


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    data.from
  ] = pc;


  pc.ontrack =
    function(event) {

      console.log(
        "Remote audio track received"
      );


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

      }


      audio.autoplay =
        true;

      audio.playsInline =
        true;


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioOnButton"
            ).style.display =
              "none";


            setPanelStatus(
              "🔊 ライブ音声を受信中"
            );


            document.getElementById(
              "audioText"
            ).textContent =
              "🔊 LIVE 音声";

          }
        )
        .catch(
          function(error) {

            console.log(
              "Autoplay blocked",
              error
            );


            document.getElementById(
              "audioOnButton"
            ).style.display =
              "block";


            setPanelStatus(
              "音声をONにしてください"
            );

          }
        );

    };


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        sendMessage({

          type:
            "ice_candidate",

          from:
            myId,

          to:
            data.from,

          candidate:
            event.candidate

        });

      }

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

        setPanelStatus(
          "🔊 ライブ音声を受信中"
        );

      }


      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "disconnected"
      ) {

        setPanelStatus(
          "音声接続が切れました"
        );

      }

    };


  try {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


    const answer =
      await pc.createAnswer();


    await pc.setLocalDescription(
      answer
    );


    sendMessage({

      type:
        "answer",

      from:
        myId,

      to:
        data.from,

      sdp:
        pc.localDescription

    });

  } catch (error) {

    console.error(
      "receive offer error",
      error
    );

  }

}


/* =====================================================
   RECEIVE ANSWER
===================================================== */

async function receiveAnswer(data) {

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

  } catch (error) {

    console.error(
      "answer error",
      error
    );

  }

}


/* =====================================================
   ICE
===================================================== */

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


  try {

    /*
     * remoteDescription設定後にICEを追加
     */

    if (!pc.remoteDescription) {

      pc._pendingIce =
        pc._pendingIce || [];

      pc._pendingIce.push(
        data.candidate
      );

      return;
    }


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


/* =====================================================
   ENABLE AUDIO
===================================================== */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  audio.muted =
    false;

  audio.volume =
    1.0;


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioOnButton"
        ).style.display =
          "none";


        setPanelStatus(
          "🔊 ライブ音声を受信中"
        );


        document.getElementById(
          "audioText"
        ).textContent =
          "🔊 LIVE 音声";

      }
    )
    .catch(
      function(error) {

        console.error(
          "audio play error",
          error
        );

      }
    );

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  sendMessage({

    type:
      "like",

    clientId:
      myId

  });

}


/* =====================================================
   GIFT
===================================================== */

function toggleGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (panel) {

    panel.classList.toggle(
      "show"
    );

  }

}


function sendGift(
  giftId
) {

  sendMessage({

    type:
      "gift",

    clientId:
      myId,

    giftId:
      giftId,

    name:
      getMyName()

  });


  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (panel) {

    panel.classList.remove(
      "show"
    );

  }

}


/* =====================================================
   COMMENT
===================================================== */

function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );


  if (!input) {
    return;
  }


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  sendMessage({

    type:
      "comment",

    clientId:
      myId,

    text:
      text,

    name:
      getMyName()

  });


  input.value =
    "";

}


function getMyName() {

  const input =
    document.getElementById(
      "liveNameInput"
    );


  return (
    input &&
    input.value.trim()
  ) ||
  "ゲスト";

}


/* =====================================================
   COMMENT DISPLAY
===================================================== */

function addComment(
  comment
) {

  const list =
    document.getElementById(
      "commentList"
    );


  if (!list) {
    return;
  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "comment-row";


  const user =
    document.createElement(
      "div"
    );

  user.className =
    "comment-user";

  user.textContent =
    comment.name ||
    "ゲスト";


  const text =
    document.createElement(
      "div"
    );

  text.className =
    "comment-text";

  text.textContent =
    comment.text ||
    "";


  const block =
    document.createElement(
      "button"
    );

  block.className =
    "comment-block";

  block.textContent =
    "🚫 ブロック";


  block.onclick =
    function() {

      blockUser(
        comment.userId
      );

    };


  row.appendChild(
    user
  );

  row.appendChild(
    text
  );

  row.appendChild(
    block
  );


  list.appendChild(
    row
  );


  while (
    list.children.length >
    100
  ) {

    list.removeChild(
      list.firstChild
    );

  }


  list.scrollTop =
    list.scrollHeight;

}


/* =====================================================
   BLOCK
===================================================== */

function blockUser(
  userId
) {

  if (
    !userId ||
    userId === myId
  ) {

    return;

  }


  sendMessage({

    type:
      "block_user",

    clientId:
      myId,

    targetId:
      userId

  });

}


function blockCurrentUser() {

  if (isBroadcaster) {

    alert(
      "配信者はコメント欄のユーザーからブロックできます。"
    );

    return;

  }


  if (
    !currentBroadcasterId
  ) {

    return;

  }


  blockUser(
    currentBroadcasterId
  );


  closePanel();

}


/* =====================================================
   LIKE ANIMATION
===================================================== */

function showLike() {

  const el =
    document.createElement(
      "div"
    );


  el.className =
    "like-pop";


  el.textContent =
    "❤️";


  document.body.appendChild(
    el
  );


  setTimeout(
    function() {

      el.remove();

    },
    1800
  );

}


/* =====================================================
   RESET SOCIAL UI
===================================================== */

function resetSocialUI() {

  const ids = [
    "viewerCount",
    "likeCount",
    "giftCount"
  ];


  ids.forEach(
    function(id) {

      const e =
        document.getElementById(
          id
        );

      if (e) {
        e.textContent =
          "0";
      }

    }
  );


  const list =
    document.getElementById(
      "commentList"
    );


  if (list) {
    list.innerHTML =
      "";
  }

}


/* =====================================================
   CLOSE PEERS
===================================================== */

function closePeerConnections() {

  Object.keys(
    peerConnections
  ).forEach(
    function(id) {

      try {

        peerConnections[
          id
        ].close();

      } catch (error) {}

    }
  );


  peerConnections = {};

}


/* =====================================================
   PANEL
===================================================== */

function openPanel() {

  document
    .getElementById(
      "livePanel"
    )
    .classList.add(
      "show"
    );


  resetSocialUI();

}


function closePanel() {

  if (
    !isBroadcaster
  ) {

    closePeerConnections();

  }


  document
    .getElementById(
      "livePanel"
    )
    .classList.remove(
      "show"
    );

}


function setPanelStatus(
  text
) {

  document.getElementById(
    "panelStatus"
  ).textContent =
    text;

}


/* =====================================================
   SCROLL
===================================================== */

function scrollLive() {

  document
    .getElementById(
      "liveSection"
    )
    .scrollIntoView({
      behavior:
        "smooth"
    });

}


/* =====================================================
   NAV
===================================================== */

function goHome() {

  window.scrollTo({

    top:
      0,

    behavior:
      "smooth"

  });

}


function showNotice() {

  alert(
    "お知らせはまだありません。"
  );

}


function showProfile() {

  alert(
    "マイページ機能を準備中です。"
  );

}


/* =====================================================
   ESCAPE
===================================================== */

function escapeHtml(
  value
) {

  return String(
    value
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
   START
===================================================== */

connectSocket();


/* =====================================================
   TITLE INPUT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    const titleInput =
      document.getElementById(
        "liveTitleInput"
      );


    if (titleInput) {

      titleInput.addEventListener(
        "input",
        updateTitlePreview
      );

    }


    updateTitlePreview();

  }
);

</script>

</body>
</html>
`;


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(
    function(req, res) {

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
              "no-cache, no-store"
          }
        );


        res.end(
          HTML
        );

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
          fs.existsSync(
            imagePath
          )
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
          ).pipe(
            res
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
          "home.png がありません"
        );

        return;
      }


      /* HEALTH */

      if (
        url === "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "application/json"
          }
        );


        res.end(
          JSON.stringify({
            status:
              "ok",

            live:
              liveInfo.active
          })
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

    }
  );


/* =====================================================
   WEBSOCKET SERVER
===================================================== */

const wss =
  new WebSocket.Server({
    server
  });


wss.on(
  "connection",
  function(ws) {

    clients.add(
      ws
    );


    ws.clientId =
      "client_" +
      Math.random()
        .toString(36)
        .substring(2);


    ws.joinedLive =
      false;

    ws.blockedUsers =
      new Set();


    console.log(
      "WebSocket connected:",
      ws.clientId
    );


    sendLiveListTo(
      ws
    );


    ws.on(
      "message",
      function(message) {

        let data;


        try {

          data =
            JSON.parse(
              message.toString()
            );

        } catch (error) {

          console.log(
            "Invalid JSON"
          );

          return;

        }


        /* =============================================
           HELLO
        ============================================= */

        if (
          data.type ===
          "hello"
        ) {

          if (
            data.clientId
          ) {

            ws.clientId =
              data.clientId;

          }

          return;
        }


        /* =============================================
           START LIVE
        ============================================= */

        if (
          data.type ===
          "start_live"
        ) {

          if (
            broadcaster &&
            broadcaster !== ws &&
            broadcaster.readyState ===
              WebSocket.OPEN
          ) {

            ws.send(
              JSON.stringify({

                type:
                  "live_start_failed",

                reason:
                  "現在ほかの配信者が配信中です"

              })
            );

            return;

          }


          broadcaster =
            ws;


          liveInfo = {

            active:
              true,

            id:
              ws.clientId,

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
              Date.now(),

            likes:
              0,

            comments:
              0,

            gifts:
              0,

            viewers:
              0

          };


          ws.isBroadcaster =
            true;


          console.log(
            "LIVE START:",
            liveInfo.name
          );


          broadcastLiveList();

          return;
        }


        /* =============================================
           STOP LIVE
        ============================================= */

        if (
          data.type ===
          "stop_live"
        ) {

          if (
            broadcaster ===
            ws
          ) {

            stopLiveServer();
            stopLiveServer();

          }

          return;
        }


        /* =============================================
           JOIN LIVE
        ============================================= */

        if (
          data.type ===
          "join_live"
        ) {

          if (
            !liveInfo.active ||
            !broadcaster
          ) {

            ws.send(
              JSON.stringify({

                type:
                  "join_failed",

                reason:
                  "現在配信中のライブがありません"

              })
            );

            return;
          }


          ws.joinedLive =
            true;


          ws.currentLiveId =
            liveInfo.id;


          if (
            ws !== broadcaster
          ) {

            liveInfo.viewers++;

          }


          ws.send(
            JSON.stringify({

              type:
                "live_joined",

              live:
                liveInfo

            })
          );


          broadcastLiveList();


          /* =========================================
             配信者へ視聴者参加通知
          ========================================= */

          if (
            broadcaster &&
            broadcaster.readyState ===
              WebSocket.OPEN
          ) {

            broadcaster.send(
              JSON.stringify({

                type:
                  "viewer_joined",

                clientId:
                  ws.clientId

              })
            );

          }


          return;
        }


        /* =============================================
           LEAVE LIVE
        ============================================= */

        if (
          data.type ===
          "leave_live"
        ) {

          if (
            ws.joinedLive
          ) {

            ws.joinedLive =
              false;


            if (
              ws !== broadcaster &&
              liveInfo.viewers > 0
            ) {

              liveInfo.viewers--;

            }


            ws.currentLiveId =
              null;


            broadcastLiveList();

          }


          return;
        }


        /* =============================================
           WEBRTC OFFER
        ============================================= */

        if (
          data.type ===
          "offer"
        ) {

          const target =
            findClient(
              data.targetId
            );


          if (
            target &&
            target.readyState ===
              WebSocket.OPEN
          ) {

            target.send(
              JSON.stringify({

                type:
                  "offer",

                from:
                  ws.clientId,

                offer:
                  data.offer

              })
            );

          }


          return;
        }


        /* =============================================
           WEBRTC ANSWER
        ============================================= */

        if (
          data.type ===
          "answer"
        ) {

          const target =
            findClient(
              data.targetId
            );


          if (
            target &&
            target.readyState ===
              WebSocket.OPEN
          ) {

            target.send(
              JSON.stringify({

                type:
                  "answer",

                from:
                  ws.clientId,

                answer:
                  data.answer

              })
            );

          }


          return;
        }


        /* =============================================
           WEBRTC ICE
        ============================================= */

        if (
          data.type ===
          "ice"
        ) {

          const target =
            findClient(
              data.targetId
            );


          if (
            target &&
            target.readyState ===
              WebSocket.OPEN
          ) {

            target.send(
              JSON.stringify({

                type:
                  "ice",

                from:
                  ws.clientId,

                candidate:
                  data.candidate

              })
            );

          }


          return;
        }


        /* =============================================
           LIKE
        ============================================= */

        if (
          data.type ===
          "like"
        ) {

          if (
            !liveInfo.active
          ) {

            return;

          }


          liveInfo.likes++;


          broadcastToLive({

            type:
              "like",

            count:
              liveInfo.likes,

            from:
              ws.clientId

          });


          return;
        }


        /* =============================================
           COMMENT
        ============================================= */

        if (
          data.type ===
          "comment"
        ) {

          if (
            !liveInfo.active
          ) {

            return;

          }


          const text =
            String(
              data.text ||
              ""
            )
            .trim()
            .slice(
              0,
              200
            );


          if (
            !text
          ) {

            return;

          }


          liveInfo.comments++;


          const comment = {

            type:
              "comment",

            userId:
              ws.clientId,

            name:
              String(
                data.name ||
                "ゲスト"
              ).slice(
                0,
                30
              ),

            text:
              text,

            commentCount:
              liveInfo.comments

          };


          broadcastToLive(
            comment
          );


          return;
        }


        /* =============================================
           GIFT
        ============================================= */

        if (
          data.type ===
          "gift"
        ) {

          if (
            !liveInfo.active
          ) {

            return;

          }


          const giftNames = {

            heart:
              "❤️ ハート",

            star:
              "⭐ スター",

            rose:
              "🌹 バラ",

            crown:
              "👑 王冠",

            diamond:
              "💎 ダイヤ"

          };


          const giftId =
            String(
              data.giftId ||
              "heart"
            );


          const giftName =
            giftNames[
              giftId
            ] ||
            "🎁 ギフト";


          liveInfo.gifts++;


          broadcastToLive({

            type:
              "gift",

            userId:
              ws.clientId,

            name:
              String(
                data.name ||
                "ゲスト"
              ).slice(
                0,
                30
              ),

            giftId:
              giftId,

            giftName:
              giftName,

            giftCount:
              liveInfo.gifts

          });


          return;
        }


        /* =============================================
           BLOCK USER
        ============================================= */

        if (
          data.type ===
          "block_user"
        ) {

          const targetId =
            String(
              data.targetId ||
              ""
            );


          if (
            !targetId ||
            targetId ===
              ws.clientId
          ) {

            return;

          }


          ws.blockedUsers.add(
            targetId
          );


          ws.send(
            JSON.stringify({

              type:
                "user_blocked",

              targetId:
                targetId

            })
          );


          return;
        }


        /* =============================================
           PING
        ============================================= */

        if (
          data.type ===
          "ping"
        ) {

          ws.send(
            JSON.stringify({

              type:
                "pong",

              time:
                Date.now()

            })
          );


          return;
        }

      }
    );


    /* ===============================================
       DISCONNECT
    =============================================== */

    ws.on(
      "close",
      function() {

        console.log(
          "WebSocket disconnected:",
          ws.clientId
        );


        if (
          ws === broadcaster
        ) {

          stopLiveServer();

        } else if (
          ws.joinedLive
        ) {

          if (
            liveInfo.viewers > 0
          ) {

            liveInfo.viewers--;

          }


          broadcastLiveList();

        }


        clients.delete(
          ws
        );

      }
    );


    /* ===============================================
       ERROR
    =============================================== */

    ws.on(
      "error",
      function(error) {

        console.log(
          "WebSocket error:",
          error.message
        );

      }
    );

  });


/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  function() {

    console.log(
      "===================================="
    );

    console.log(
      "VoiceポタLive 起動"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "http://localhost:" +
      PORT
    );

    console.log(
      "===================================="
    );

  }
);            
