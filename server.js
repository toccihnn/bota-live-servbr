const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>Voice Bota Live</title>

<style>
*{box-sizing:border-box}
html,body{
  margin:0;
  padding:0;
  background:#080808;
  color:white;
  font-family:Arial,"Noto Sans JP",sans-serif;
}
body{min-height:100vh}
#app{padding:14px}
.card{
  max-width:700px;
  margin:0 auto;
  padding:20px;
  background:#151515;
  border-radius:20px;
}
h1{text-align:center;margin:5px 0 20px}
.status{
  padding:14px;
  margin:12px 0;
  border-radius:12px;
  background:#222;
  text-align:center;
}
.live{color:#00ff66;font-weight:bold}
.wait{color:#aaa}
button{
  width:100%;
  border:0;
  border-radius:12px;
  padding:16px;
  margin:7px 0;
  font-size:17px;
  font-weight:bold;
}
.hostButton{background:#635bff;color:white}
.viewerButton{background:#2f9e44;color:white}
.audioButton{background:#f59f00;color:black}
.stopButton{background:#d6336c;color:white}
.hidden{display:none!important}
.info{text-align:center;color:#aaa;margin:12px 0}
.voiceBox{
  margin-top:15px;
  padding:30px 15px;
  background:#0d0d0d;
  border-radius:18px;
  text-align:center;
}
.mic{font-size:60px}
#log{
  margin-top:15px;
  padding:10px;
  height:200px;
  overflow-y:auto;
  background:#050505;
  border-radius:10px;
  color:#00ff66;
  font-size:12px;
  white-space:pre-wrap;
}
</style>
</head>

<body>

<div id="app">
<div class="card">

<h1>🎙️ Voice Bota Live</h1>

<div id="roleSelect">

<div class="status">
役割を選んでください
</div>

<button class="hostButton" onclick="startHost()">
🎙️ 配信者として開始
</button>

<button class="viewerButton" onclick="startViewer()">
👂 視聴者として参加
</button>

</div>

<div id="liveArea" class="hidden">

<div id="status" class="status">
接続中...
</div>

<div class="voiceBox">
<div class="mic">🎙️</div>
<div id="voiceText">音声配信</div>
</div>

<div id="info" class="info"></div>

<button
id="audioButton"
class="audioButton hidden"
onclick="enableAudio()">
🔊 音声をONにする
</button>

<button class="stopButton" onclick="stopLive()">
⛔ 終了
</button>

<div id="log"></div>

</div>
</div>
</div>

<audio
id="remoteAudio"
autoplay
playsinline>
</audio>

<script>

let ws = null;
let myId = null;
let myRole = null;

let localStream = null;

let viewerPeer = null;
let viewerId = null;

let viewerConnections = new Map();

let pendingCandidates = [];
let hostPendingCandidates = new Map();

let reconnectTimer = null;
let manuallyStopped = false;
let roomJoined = false;

const room = "bota";

const statusBox =
  document.getElementById("status");

const infoBox =
  document.getElementById("info");

const logBox =
  document.getElementById("log");

const remoteAudio =
  document.getElementById("remoteAudio");


// =====================================================
// LOG
// =====================================================

function log(text){

  console.log(text);

  logBox.textContent +=
    text + "\\n";

  logBox.scrollTop =
    logBox.scrollHeight;
}


// =====================================================
// STATUS
// =====================================================

function setStatus(text,live=false){

  statusBox.textContent = text;

  statusBox.className =
    "status " +
    (live ? "live" : "wait");
}


// =====================================================
// SOCKET URL
// =====================================================

function getSocketURL(){

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  return protocol +
    "//" +
    location.host;
}


// =====================================================
// CONNECT WEBSOCKET
// =====================================================

function connectSocket(){

  return new Promise((resolve,reject)=>{

    if(
      ws &&
      ws.readyState === WebSocket.OPEN
    ){

      resolve();
      return;
    }

    log("WebSocket接続開始");

    ws =
      new WebSocket(
        getSocketURL()
      );

    let settled = false;

    ws.onopen = ()=>{

      log("✅ WebSocket接続OK");

      if(!settled){

        settled = true;
        resolve();

      }

      if(
        myRole &&
        !roomJoined
      ){

        sendJoin();

      }

    };


    ws.onerror = ()=>{

      log("❌ WebSocketエラー");

      if(!settled){

        settled = true;

        reject(
          new Error(
            "WebSocket接続失敗"
          )
        );

      }

    };


    ws.onclose = event=>{

      log("❌ WebSocket切断");

      log(
        "code=" +
        event.code +
        " reason=" +
        (
          event.reason ||
          "なし"
        )
      );

      roomJoined = false;

      if(
        !manuallyStopped &&
        myRole
      ){

        setStatus(
          "接続が切れました。再接続中..."
        );

        scheduleReconnect();

      }

    };


    ws.onmessage =
      async event=>{

        try{

          const msg =
            JSON.parse(
              event.data
            );

          await handleMessage(msg);

        }catch(e){

          log(
            "Message Error: " +
            e.message
          );

        }

      };

  });

}


// =====================================================
// RECONNECT
// =====================================================

function scheduleReconnect(){

  if(reconnectTimer){
    return;
  }

  reconnectTimer =
    setTimeout(
      async ()=>{

        reconnectTimer = null;

        if(
          manuallyStopped ||
          !myRole
        ){

          return;

        }

        try{

          await connectSocket();

        }catch(e){

          log("再接続失敗");

          scheduleReconnect();

        }

      },
      2000
    );
}


// =====================================================
// SEND
// =====================================================

function send(data){

  if(
    ws &&
    ws.readyState === WebSocket.OPEN
  ){

    try{

      ws.send(
        JSON.stringify(data)
      );

    }catch(e){

      log(
        "送信エラー: " +
        e.message
      );

    }

  }

}


// =====================================================
// JOIN
// =====================================================

function sendJoin(){

  send({
    type:"join",
    role:myRole,
    room:room
  });

}


// =====================================================
// HOST START
// =====================================================

async function startHost(){

  manuallyStopped = false;
  myRole = "host";

  document
    .getElementById("roleSelect")
    .classList
    .add("hidden");

  document
    .getElementById("liveArea")
    .classList
    .remove("hidden");

  setStatus(
    "配信者として接続中..."
  );

  try{

    await connectSocket();

    if(!roomJoined){
      sendJoin();
    }

    await startMicrophone();

    setStatus(
      "🎙️ 配信中",
      true
    );

    document.getElementById(
      "voiceText"
    ).textContent =
      "あなたは配信者です";

    send({
      type:"stream-started"
    });

  }catch(e){

    log(
      "配信開始失敗: " +
      e.message
    );

    setStatus(
      "配信開始失敗"
    );

  }

}


// =====================================================
// VIEWER START
// =====================================================

async function startViewer(){

  manuallyStopped = false;
  myRole = "viewer";

  document
    .getElementById("roleSelect")
    .classList
    .add("hidden");

  document
    .getElementById("liveArea")
    .classList
    .remove("hidden");

  setStatus(
    "配信を接続中..."
  );

  document.getElementById(
    "voiceText"
  ).textContent =
    "配信者を待っています";

  try{

    await connectSocket();

    if(!roomJoined){
      sendJoin();
    }

  }catch(e){

    log(
      "接続失敗: " +
      e.message
    );

  }

}


// =====================================================
// MICROPHONE
// =====================================================

async function startMicrophone(){

  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ){

    throw new Error(
      "マイク機能が利用できません"
    );

  }

  localStream =
    await navigator
      .mediaDevices
      .getUserMedia({

        audio:{
          echoCancellation:false,
          noiseSuppression:false,
          autoGainControl:false,
          channelCount:1,
          sampleRate:48000
        },

        video:false

      });

  log(
    "🎙️ マイク取得OK"
  );

  log(
    "⚡ LOW LATENCY AUDIO"
  );

}


// =====================================================
// OPUS SDP
// =====================================================

function optimizeOpusSDP(sdp){

  if(!sdp){
    return sdp;
  }

  const lines =
    sdp.split("\\r\\n");

  let opusPayload = null;

  for(
    const line of lines
  ){

    const match =
      line.match(
        /^a=rtpmap:(\\d+) opus\\/48000\\/2/i
      );

    if(match){

      opusPayload =
        match[1];

      break;

    }

  }

  if(!opusPayload){
    return sdp;
  }

  const fmtp =
    "a=fmtp:" +
    opusPayload +
    " minptime=10;useinbandfec=0;stereo=0;maxaveragebitrate=32000";

  let replaced = false;

  const result =
    lines.map(line=>{

      if(
        line.startsWith(
          "a=fmtp:" +
          opusPayload +
          " "
        )
      ){

        replaced = true;

        return fmtp;

      }

      return line;

    });

  if(!replaced){

    const index =
      result.findIndex(
        line =>
          line.startsWith(
            "a=rtpmap:" +
            opusPayload
          )
      );

    if(index >= 0){

      result.splice(
        index + 1,
        0,
        fmtp
      );

    }

  }

  if(
    !result.some(
      line =>
        line === "a=ptime:10"
    )
  ){

    result.push(
      "a=ptime:10"
    );

  }

  return result.join("\\r\\n");

}


// =====================================================
// HOST PEER
// =====================================================

function createHostPeer(viewer){

  const old =
    viewerConnections.get(viewer);

  if(old){

    try{
      old.close();
    }catch{}

    viewerConnections.delete(viewer);

  }

  const pc =
    new RTCPeerConnection({

      iceServers:[
        {
          urls:
            "stun:stun.l.google.com:19302"
        },
        {
          urls:
            "stun:stun1.l.google.com:19302"
        }
      ],

      bundlePolicy:"max-bundle",
      rtcpMuxPolicy:"require"

    });

  viewerConnections.set(
    viewer,
    pc
  );


  if(localStream){

    const tracks =
      localStream.getAudioTracks();

    for(
      const track of tracks
    ){

      const sender =
        pc.addTrack(
          track,
          localStream
        );

      try{

        const params =
          sender.getParameters();

        if(!params.encodings){

          params.encodings =
            [{}];

        }

        params.encodings[0]
          .maxBitrate = 32000;

        params.encodings[0]
          .priority = "high";

        sender
          .setParameters(params)
          .catch(()=>{});

      }catch{}

    }

  }


  pc.onicecandidate =
    event=>{

      if(event.candidate){

        send({

          type:"signal",

          target:viewer,

          signal:{
            type:"candidate",
            candidate:event.candidate
          }

        });

      }

    };


  pc.onconnectionstatechange =
    ()=>{

      log(
        "視聴者 " +
        viewer +
        " : " +
        pc.connectionState
      );

      if(
        pc.connectionState ===
        "connected"
      ){

        log(
          "🎉 視聴者音声接続成功"
        );

      }

      if(
        pc.connectionState ===
        "failed"
      ){

        log(
          "⚠️ WebRTC接続失敗"
        );

      }

    };


  return pc;

}


// =====================================================
// SEND OFFER
// =====================================================

async function sendOffer(viewer){

  try{

    log(
      "Offer作成: " +
      viewer
    );

    const pc =
      createHostPeer(viewer);

    let offer =
      await pc.createOffer({
        offerToReceiveAudio:false
      });

    offer =
      new RTCSessionDescription({

        type:"offer",

        sdp:
          optimizeOpusSDP(
            offer.sdp
          )

      });

    await pc.setLocalDescription(
      offer
    );

    send({

      type:"signal",

      target:viewer,

      signal:{
        type:"offer",
        sdp:offer.sdp
      }

    });

    log(
      "⚡ 低遅延Offer送信"
    );

  }catch(e){

    log(
      "Offerエラー: " +
      e.message
    );

  }

}


// =====================================================
// VIEWER PEER
// =====================================================

function createViewerPeer(){

  if(viewerPeer){
    return viewerPeer;
  }

  viewerPeer =
    new RTCPeerConnection({

      iceServers:[
        {
          urls:
            "stun:stun.l.google.com:19302"
        },
        {
          urls:
            "stun:stun1.l.google.com:19302"
        }
      ],

      bundlePolicy:"max-bundle",
      rtcpMuxPolicy:"require"

    });


  viewerPeer.onicecandidate =
    event=>{

      if(
        event.candidate &&
        viewerId
      ){

        send({

          type:"signal",

          target:viewerId,

          signal:{
            type:"candidate",
            candidate:event.candidate
          }

        });

      }

    };


  viewerPeer.ontrack =
    event=>{

      log(
        "🔊 音声トラック受信"
      );

      let stream =
        event.streams &&
        event.streams[0];

      if(!stream){

        stream =
          new MediaStream();

        stream.addTrack(
          event.track
        );

      }

      remoteAudio.srcObject =
        stream;

      remoteAudio.autoplay =
        true;

      remoteAudio.playsInline =
        true;

      remoteAudio.volume =
        1;

      remoteAudio.muted =
        false;


      // 受信バッファを可能な限り小さくする
      try{

        const receivers =
          viewerPeer.getReceivers();

        for(
          const receiver of receivers
        ){

          if(
            "playoutDelayHint"
            in receiver
          ){

            receiver.playoutDelayHint =
              0;

          }

          if(
            "jitterBufferTarget"
            in receiver
          ){

            receiver.jitterBufferTarget =
              0;

          }

        }

      }catch{}


      const playPromise =
        remoteAudio.play();

      if(
        playPromise &&
        typeof playPromise.catch ===
          "function"
      ){

        playPromise.catch(
          error=>{

            log(
              "自動再生待機: " +
              error.message
            );

            document
              .getElementById(
                "audioButton"
              )
              .classList
              .remove("hidden");

          }
        );

      }


      setStatus(
        "🔴 配信中",
        true
      );

      document.getElementById(
        "voiceText"
      ).textContent =
        "🎙️ 配信者の音声を受信中";

    };


  viewerPeer
    .onconnectionstatechange =
    ()=>{

      log(
        "配信者接続: " +
        viewerPeer.connectionState
      );

      if(
        viewerPeer.connectionState ===
        "connected"
      ){

        setStatus(
          "🔴 配信中",
          true
        );

        log(
          "🎉 音声接続成功"
        );

      }

      if(
        viewerPeer.connectionState ===
        "disconnected"
      ){

        setStatus(
          "WebRTC接続切断"
        );

      }

      if(
        viewerPeer.connectionState ===
        "failed"
      ){

        setStatus(
          "WebRTC接続失敗"
        );

      }

    };


  return viewerPeer;

}


// =====================================================
// VIEWER SIGNAL
// =====================================================

async function handleViewerSignal(msg){

  const pc =
    createViewerPeer();


  if(
    msg.type === "offer"
  ){

    try{

      await pc.setRemoteDescription({

        type:"offer",
        sdp:msg.sdp

      });

      log(
        "Offer受信"
      );


      for(
        const candidate
        of pendingCandidates
      ){

        try{

          await pc.addIceCandidate(
            candidate
          );

        }catch{}

      }

      pendingCandidates = [];


      let answer =
        await pc.createAnswer();

      answer =
        new RTCSessionDescription({

          type:"answer",

          sdp:
            optimizeOpusSDP(
              answer.sdp
            )

        });


      await pc.setLocalDescription(
        answer
      );


      send({

        type:"signal",

        target:viewerId,

        signal:{
          type:"answer",
          sdp:answer.sdp
        }

      });

      log(
        "⚡ 低遅延Answer送信"
      );

    }catch(e){

      log(
        "Viewer Offer処理エラー: " +
        e.message
      );

    }

    return;
  }


  if(
    msg.type === "candidate"
  ){

    const candidate =
      new RTCIceCandidate(
        msg.candidate
      );

    if(
      pc.remoteDescription
    ){

      try{

        await pc.addIceCandidate(
          candidate
        );

      }catch{

        log(
          "ICE追加エラー"
        );

      }

    }else{

      pendingCandidates.push(
        candidate
      );

    }

  }

}


// =====================================================
// HOST SIGNAL
// =====================================================

async function handleHostSignal(msg){

  const pc =
    viewerConnections.get(
      msg.from
    );

  if(!pc){
    return;
  }


  if(
    msg.signal.type ===
    "answer"
  ){

    try{

      await pc.setRemoteDescription({

        type:"answer",

        sdp:
          msg.signal.sdp

      });

      log(
        "Answer受信: " +
        msg.from
      );


      const pending =
        hostPendingCandidates.get(
          msg.from
        ) || [];


      for(
        const candidate
        of pending
      ){

        try{

          await pc.addIceCandidate(
            candidate
          );

        }catch{}

      }


      hostPendingCandidates.delete(
        msg.from
      );

    }catch(e){

      log(
        "Answer処理エラー: " +
        e.message
      );

    }

    return;
  }


  if(
    msg.signal.type ===
    "candidate"
  ){

    const candidate =
      new RTCIceCandidate(
        msg.signal.candidate
      );

    if(
      pc.remoteDescription
    ){

      try{

        await pc.addIceCandidate(
          candidate
        );

      }catch{

        log(
          "ICE追加エラー"
        );

      }

    }else{

      let list =
        hostPendingCandidates.get(
          msg.from
        );

      if(!list){

        list = [];

        hostPendingCandidates.set(
          msg.from,
          list
        );

      }

      list.push(candidate);

    }

  }

}


// =====================================================
// MESSAGE
// =====================================================

async function handleMessage(msg){

  if(
    msg.type === "welcome"
  ){

    myId =
      msg.id;

    log(
      "ID=" +
      myId
    );

    return;
  }


  if(
    msg.type === "status"
  ){

    log(
      msg.text
    );

    return;
  }


  if(
    msg.type === "join-ok"
  ){

    roomJoined =
      true;

    log(
      "✅ ルーム参加完了"
    );

    return;
  }


  if(
    msg.type === "join-error"
  ){

    log(
      "❌ " +
      msg.text
    );

    setStatus(
      msg.text
    );

    return;
  }


  if(
    msg.type === "room-status"
  ){

    if(
      myRole === "host"
    ){

      infoBox.textContent =
        "👥 視聴者: " +
        msg.viewers +
        "人";

    }else{

      infoBox.textContent =
        msg.live
          ? "🟢 配信中"
          : "⚪ 配信待機中";

    }

    return;
  }


  if(
    msg.type === "viewer-joined"
  ){

    if(
      myRole === "host"
    ){

      log(
        "👤 視聴者参加: " +
        msg.viewerId
      );

      await sendOffer(
        msg.viewerId
      );

    }

    return;
  }


  if(
    msg.type === "signal"
  ){

    if(
      myRole === "host"
    ){

      await handleHostSignal(
        msg
      );

    }else{

      viewerId =
        msg.from;

      await handleViewerSignal(
        msg.signal
      );

    }

    return;
  }


  if(
    msg.type === "stream-started"
  ){

    setStatus(
      "🎙️ 配信中",
      true
    );

    document.getElementById(
      "voiceText"
    ).textContent =
      "配信者が配信中";

    return;
  }


  if(
    msg.type === "stream-stopped"
  ){

    setStatus(
      "配信終了"
    );

    remoteAudio.srcObject =
      null;

    document.getElementById(
      "voiceText"
    ).textContent =
      "配信終了";

    return;
  }


  if(
    msg.type === "host-left"
  ){

    setStatus(
      "配信者が退出しました"
    );

    remoteAudio.srcObject =
      null;

    document.getElementById(
      "voiceText"
    ).textContent =
      "配信終了";

    return;
  }


  if(
    msg.type === "viewer-left"
  ){

    const pc =
      viewerConnections.get(
        msg.viewerId
      );

    if(pc){

      try{
        pc.close();
      }catch{}

      viewerConnections.delete(
        msg.viewerId
      );

    }

    hostPendingCandidates.delete(
      msg.viewerId
    );

  }

}


// =====================================================
// AUDIO ON
// =====================================================

async function enableAudio(){

  try{

    remoteAudio.muted =
      false;

    remoteAudio.volume =
      1;

    await remoteAudio.play();

    document
      .getElementById(
        "audioButton"
      )
      .classList
      .add("hidden");

    log(
      "🔊 音声ON"
    );

  }catch(e){

    log(
      "音声再生エラー: " +
      e.message
    );

  }

}


// =====================================================
// STOP
// =====================================================

function stopLive(){

  manuallyStopped =
    true;

  roomJoined =
    false;


  if(reconnectTimer){

    clearTimeout(
      reconnectTimer
    );

    reconnectTimer =
      null;

  }


  if(localStream){

    for(
      const track
      of localStream.getTracks()
    ){

      track.stop();

    }

    localStream =
      null;

  }


  for(
    const pc
    of viewerConnections.values()
  ){

    try{
      pc.close();
    }catch{}

  }

  viewerConnections.clear();
  hostPendingCandidates.clear();


  if(viewerPeer){

    try{
      viewerPeer.close();
    }catch{}

    viewerPeer =
      null;

  }


  pendingCandidates = [];


  if(
    ws &&
    ws.readyState === WebSocket.OPEN
  ){

    send({
      type:"stream-stopped"
    });

  }


  if(ws){

    try{

      ws.close(
        1000,
        "user stopped"
      );

    }catch{}

    ws = null;

  }


  remoteAudio.srcObject =
    null;

  remoteAudio.muted =
    true;


  document
    .getElementById("liveArea")
    .classList
    .add("hidden");

  document
    .getElementById("roleSelect")
    .classList
    .remove("hidden");

  document
    .getElementById("audioButton")
    .classList
    .add("hidden");


  setStatus(
    "停止しました"
  );

  myRole =
    null;

}


// =====================================================
// USER INTERACTION
// =====================================================

document.addEventListener(
  "click",
  ()=>{

    if(
      myRole === "viewer" &&
      remoteAudio.srcObject &&
      remoteAudio.paused
    ){

      remoteAudio.muted =
        false;

      remoteAudio
        .play()
        .catch(()=>{});

    }

  },
  {
    passive:true
  }
);

</script>
</body>
</html>
`;


// =====================================================
// HTTP SERVER
// =====================================================

const server =
  http.createServer(
    (req,res)=>{

      if(
        req.url === "/health"
      ){

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

      res.end(
        HTML
      );

    }
  );


// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss =
  new WebSocket.Server({

    server,

    perMessageDeflate:false

  });


let nextId = 1;

const clients =
  new Map();


// =====================================================
// SEND
// =====================================================

function send(ws,data){

  if(
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ){

    try{

      ws.send(
        JSON.stringify(data)
      );

    }catch(e){

      console.log(
        "[SEND ERROR]",
        e.message
      );

    }

  }

}


// =====================================================
// CONNECTION
// =====================================================

wss.on(
  "connection",
  ws=>{

    const id =
      String(
        nextId++
      );


    const client = {

      id:id,

      ws:ws,

      role:null,

      room:"bota",

      streaming:false,

      isAlive:true

    };


    clients.set(
      id,
      client
    );


    console.log(
      "[CONNECT]",
      id
    );


    send(
      ws,
      {
        type:"welcome",
        id:id
      }
    );


    ws.on(
      "pong",
      ()=>{

        client.isAlive =
          true;

      }
    );


    // =================================================
    // MESSAGE
    // =================================================

    ws.on(
      "message",
      raw=>{

        let msg;

        try{

          msg =
            JSON.parse(
              raw.toString()
            );

        }catch{

          return;

        }


        // =============================================
        // JOIN
        // =============================================

        if(
          msg.type === "join"
        ){

          client.role =
            msg.role === "host"
              ? "host"
              : "viewer";

          client.room =
            msg.room ||
            "bota";


          console.log(
            "[JOIN]",
            id,
            client.role,
            client.room
          );


          // =========================================
          // HOST
          // =========================================

          if(
            client.role === "host"
          ){

            let existingHost =
              null;


            for(
              const other
              of clients.values()
            ){

              if(
                other.id !== id &&
                other.room === client.room &&
                other.role === "host"
              ){

                existingHost =
                  other;

                break;

              }

            }


            if(existingHost){

              send(
                ws,
                {
                  type:"join-error",

                  text:
                    "このルームには既に配信者がいます"
                }
              );

              return;

            }


            send(
              ws,
              {
                type:"status",

                text:
                  "配信者として接続しました"
              }
            );


            send(
              ws,
              {
                type:"join-ok"
              }
            );


            // 既存視聴者
            for(
              const other
              of clients.values()
            ){

              if(
                other.id !== id &&
                other.room === client.room &&
                other.role === "viewer"
              ){

                send(
                  ws,
                  {
                    type:"viewer-joined",
                    viewerId:other.id
                  }
                );

              }

            }

          }


          // =========================================
          // VIEWER
          // =========================================

          if(
            client.role === "viewer"
          ){

            send(
              ws,
              {
                type:"status",

                text:
                  "視聴者として接続しました"
              }
            );


            send(
              ws,
              {
                type:"join-ok"
              }
            );


            for(
              const other
              of clients.values()
            ){

              if(
                other.room === client.room &&
                other.role === "host"
              ){

                send(
                  other.ws,
                  {
                    type:"viewer-joined",

                    viewerId:
                      client.id
                  }
                );


                if(
                  other.streaming
                ){

                  send(
                    ws,
                    {
                      type:"stream-started"
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


        // =============================================
        // SIGNAL
        // =============================================

        if(
          msg.type === "signal"
        ){

          const target =
            clients.get(
              msg.target
            );


          if(!target){

            console.log(
              "[SIGNAL] target not found",
              msg.target
            );

            return;

          }


          if(
            target.room !==
            client.room
          ){

            return;

          }


          send(
            target.ws,
            {
              type:"signal",

              from:
                client.id,

              signal:
                msg.signal
            }
          );

          return;

        }


        // =============================================
        // STREAM STARTED
        // =============================================

        if(
          msg.type === "stream-started"
        ){

          client.streaming =
            true;


          console.log(
            "[STREAM STARTED]",
            client.id
          );


          for(
            const other
            of clients.values()
          ){

            if(
              other.room === client.room &&
              other.role === "viewer"
            ){

              send(
                other.ws,
                {
                  type:"stream-started"
                }
              );

            }

          }


          updateRoomStatus(
            client.room
          );

          return;

        }


        // =============================================
        // STREAM STOPPED
        // =============================================

        if(
          msg.type === "stream-stopped"
        ){

          client.streaming =
            false;


          console.log(
            "[STREAM STOPPED]",
            client.id
          );


          for(
            const other
            of clients.values()
          ){

            if(
              other.room === client.room &&
              other.role === "viewer"
            ){

              send(
                other.ws,
                {
                  type:"stream-stopped"
                }
              );

            }

          }


          updateRoomStatus(
            client.room
          );

          return;

        }

      }
    );


    // =================================================
    // CLOSE
    // =================================================

    ws.on(
      "close",
      (code,reason)=>{

        console.log(
          "[CLOSE]",
          id,
          "code=",
          code,
          "reason=",
          reason.toString()
        );


        const room =
          client.room;

        const role =
          client.role;


        clients.delete(
          id
        );


        if(
          role === "host"
        ){

          for(
            const other
            of clients.values()
          ){

            if(
              other.room === room &&
              other.role === "viewer"
            ){

              send(
                other.ws,
                {
                  type:"host-left"
                }
              );

            }

          }

        }


        if(
          role === "viewer"
        ){

          for(
            const other
            of clients.values()
          ){

            if(
              other.room === room &&
              other.role === "host"
            ){

              send(
                other.ws,
                {
                  type:"viewer-left",

                  viewerId:id
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
      error=>{

        console.log(
          "[WS ERROR]",
          id,
          error.message
        );

      }
    );

  }
);


// =====================================================
// HEARTBEAT
// =====================================================

const heartbeat =
  setInterval(
    ()=>{

      for(
        const client
        of clients.values()
      ){

        const ws =
          client.ws;


        if(
          client.isAlive === false
        ){

          console.log(
            "[HEARTBEAT TIMEOUT]",
            client.id
          );


          try{
            ws.terminate();
          }catch{}

          continue;

        }


        client.isAlive =
          false;


        try{
          ws.ping();
        }catch{}

      }

    },
    25000
  );


wss.on(
  "close",
  ()=>{
    clearInterval(
      heartbeat
    );
  }
);


// =====================================================
// ROOM STATUS
// =====================================================

function updateRoomStatus(room){

  let host = false;
  let viewers = 0;
  let streaming = false;


  for(
    const client
    of clients.values()
  ){

    if(
      client.room !== room
    ){

      continue;

    }


    if(
      client.role === "host"
    ){

      host = true;

      if(
        client.streaming
      ){

        streaming = true;

      }

    }


    if(
      client.role === "viewer"
    ){

      viewers++;

    }

  }


  for(
    const client
    of clients.values()
  ){

    if(
      client.room === room
    ){

      send(
        client.ws,
        {
          type:"room-status",

          live:
            host &&
            streaming,

          viewers:
            viewers
        }
      );

    }

  }

}


// =====================================================
// SERVER ERROR
// =====================================================

server.on(
  "error",
  error=>{

    console.error(
      "[SERVER ERROR]",
      error
    );

  }
);


// =====================================================
// START
// =====================================================

server.listen(
  PORT,
  HOST,
  ()=>{

    console.log(
      "================================="
    );

    console.log(
      "Voice Bota Live"
    );

    console.log(
      "LOW LATENCY AUDIO MODE"
    );

    console.log(
      "Opus 10ms"
    );

    console.log(
      "Jitter Buffer LOW"
    );

    console.log(
      "WebSocket heartbeat ENABLED"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "HOST:",
      HOST
    );

    console.log(
      "Server started!"
    );

    console.log(
      "================================="
    );

  }
);
