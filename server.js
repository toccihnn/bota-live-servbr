const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const rooms = new Map();

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Bota Live</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#080808;
  color:white;
  font-family:Arial,"Noto Sans JP",sans-serif;
}

header{
  height:58px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 16px;
  background:#111;
  border-bottom:1px solid #292929;
}

.logo{
  font-size:22px;
  font-weight:bold;
}

.logo span{
  color:#ff3b81;
}

.status{
  font-size:13px;
  color:#aaa;
}

main{
  max-width:700px;
  margin:auto;
}

.videoArea{
  position:relative;
  width:100%;
  aspect-ratio:9/16;
  max-height:75vh;
  background:#151515;
  overflow:hidden;
}

video{
  width:100%;
  height:100%;
  object-fit:cover;
  background:#111;
}

.noVideo{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction:column;
  color:#aaa;
  font-size:18px;
}

.liveBadge{
  position:absolute;
  top:15px;
  left:15px;
  background:#ff1744;
  padding:6px 12px;
  border-radius:20px;
  font-weight:bold;
  display:none;
}

.viewerCount{
  position:absolute;
  top:15px;
  right:15px;
  background:#0009;
  padding:6px 12px;
  border-radius:20px;
}

.info{
  padding:14px;
  background:#111;
}

.title{
  font-size:20px;
  font-weight:bold;
}

.room{
  color:#999;
  font-size:13px;
  margin-top:5px;
}

.chat{
  height:190px;
  overflow-y:auto;
  padding:12px;
  background:#0d0d0d;
}

.message{
  margin:7px 0;
  font-size:14px;
}

.name{
  color:#ff72a7;
  font-weight:bold;
}

.controls{
  display:flex;
  gap:8px;
  padding:12px;
  background:#111;
}

button{
  border:0;
  border-radius:10px;
  padding:12px 15px;
  background:#292929;
  color:white;
  font-size:15px;
}

button:active{
  transform:scale(.96);
}

.start{
  background:#ff2876;
}

.gift{
  background:#ff9f00;
}

.inputArea{
  display:flex;
  gap:8px;
  padding:12px;
  background:#111;
}

input{
  flex:1;
  min-width:0;
  padding:12px;
  border-radius:10px;
  border:1px solid #444;
  background:#1d1d1d;
  color:white;
  font-size:15px;
}

#joinScreen{
  position:fixed;
  inset:0;
  background:#080808;
  z-index:20;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}

.joinBox{
  width:100%;
  max-width:400px;
  background:#151515;
  padding:25px;
  border-radius:20px;
}

.joinBox h1{
  text-align:center;
}

.joinBox input{
  width:100%;
  margin:8px 0;
}

.joinBox button{
  width:100%;
  margin-top:10px;
  background:#ff2876;
}

#app{
  display:none;
}

.giftPopup{
  position:fixed;
  left:50%;
  top:40%;
  transform:translate(-50%,-50%);
  font-size:45px;
  font-weight:bold;
  animation:pop 1s ease forwards;
  pointer-events:none;
}

@keyframes pop{
  0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}
  30%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}
  100%{opacity:0;transform:translate(-50%,-80%) scale(1)}
}
</style>
</head>

<body>

<div id="joinScreen">
  <div class="joinBox">
    <h1>💗 Bota Live</h1>
    <p>配信ルームに入ろう</p>

    <input id="nameInput" placeholder="名前">
    <input id="roomInput" placeholder="ルーム名" value="bota">

    <button onclick="joinRoom()">入室する</button>
  </div>
</div>

<div id="app">

<header>
  <div class="logo">Bota <span>Live</span></div>
  <div class="status" id="status">接続中...</div>
</header>

<main>

<div class="videoArea">

  <video id="remoteVideo" autoplay playsinline></video>

  <div class="noVideo" id="noVideo">
    <div style="font-size:50px">📺</div>
    <div>配信を待っています</div>
  </div>

  <div class="liveBadge" id="liveBadge">🔴 LIVE</div>

  <div class="viewerCount">
    👤 <span id="viewerCount">0</span>
  </div>

</div>

<div class="info">
  <div class="title" id="roomTitle">Bota Live</div>
  <div class="room">ルーム：<span id="roomName"></span></div>
</div>

<div class="chat" id="chat"></div>

<div class="inputArea">
  <input id="messageInput" placeholder="コメントを入力">
  <button onclick="sendMessage()">送信</button>
</div>

<div class="controls">
  <button class="start" id="startButton" onclick="startLive()">
    🎥 配信開始
  </button>

  <button onclick="toggleCamera()">
    📷 カメラ
  </button>

  <button onclick="toggleMic()">
    🎤 マイク
  </button>

  <button class="gift" onclick="sendGift()">
    🎁 ギフト
  </button>
</div>

</main>
</div>

<script>

let socket;
let localStream = null;
let room = "";
let userName = "";
let isHost = false;

const peers = {};

function $(id){
  return document.getElementById(id);
}

function joinRoom(){

  userName = $("nameInput").value.trim() || "匿名";
  room = $("roomInput").value.trim() || "bota";

  $("joinScreen").style.display = "none";
  $("app").style.display = "block";

  $("roomName").textContent = room;

  connectSocket();
}

function connectSocket(){

  const protocol =
    location.protocol === "https:" ? "wss:" : "ws:";

  socket = new WebSocket(
    protocol + "//" + location.host
  );

  socket.onopen = function(){

    $("status").textContent = "オンライン";

    socket.send(JSON.stringify({
      type:"join",
      room:room,
      name:userName
    }));
  };

  socket.onmessage = async function(event){

    const data = JSON.parse(event.data);

    if(data.type === "joined"){

      isHost = data.host;

      if(isHost){
        $("status").textContent = "配信者";
      }else{
        $("status").textContent = "視聴中";
      }

      updateViewers(data.count);
    }

    if(data.type === "viewerCount"){
      updateViewers(data.count);
    }

    if(data.type === "chat"){
      addMessage(data.name,data.message);
    }

    if(data.type === "gift"){
      showGift(data.name);
    }

    if(data.type === "offer"){
      await receiveOffer(data);
    }

    if(data.type === "answer"){
      await receiveAnswer(data);
    }

    if(data.type === "candidate"){
      await receiveCandidate(data);
    }

    if(data.type === "live"){
      $("liveBadge").style.display =
        data.active ? "block" : "none";

      $("noVideo").style.display =
        data.active ? "none" : "flex";
    }
  };

  socket.onclose = function(){
    $("status").textContent = "切断されました";
  };
}

function updateViewers(count){
  $("viewerCount").textContent = count;
}

async function startLive(){

  if(localStream){
    return;
  }

  try{

    localStream =
      await navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true
      });

    $("remoteVideo").srcObject = localStream;

    $("noVideo").style.display = "none";
    $("liveBadge").style.display = "block";

    $("startButton").textContent = "🔴 配信中";

    socket.send(JSON.stringify({
      type:"live",
      room:room,
      active:true
    }));

  }catch(error){

    alert(
      "カメラとマイクを許可してください。"
    );

    console.error(error);
  }
}

function toggleCamera(){

  if(!localStream){
    alert("先に「配信開始」を押してください");
    return;
  }

  const track =
    localStream.getVideoTracks()[0];

  track.enabled = !track.enabled;
}

function toggleMic(){

  if(!localStream){
    alert("先に「配信開始」を押してください");
    return;
  }

  const track =
    localStream.getAudioTracks()[0];

  track.enabled = !track.enabled;
}

function sendMessage(){

  const input = $("messageInput");
  const message = input.value.trim();

  if(!message || !socket){
    return;
  }

  socket.send(JSON.stringify({
    type:"chat",
    room:room,
    name:userName,
    message:message
  }));

  input.value = "";
}

$("messageInput").addEventListener(
  "keydown",
  function(e){
    if(e.key === "Enter"){
      sendMessage();
    }
  }
);

function addMessage(name,message){

  const div = document.createElement("div");

  div.className = "message";

  div.innerHTML =
    '<span class="name">' +
    escapeHtml(name) +
    '</span>：' +
    escapeHtml(message);

  $("chat").appendChild(div);

  $("chat").scrollTop =
    $("chat").scrollHeight;
}

function sendGift(){

  if(!socket){
    return;
  }

  socket.send(JSON.stringify({
    type:"gift",
    room:room,
    name:userName
  }));
}

function showGift(name){

  const div =
    document.createElement("div");

  div.className = "giftPopup";

  div.textContent =
    "🎁 " + name + " のギフト！";

  document.body.appendChild(div);

  setTimeout(function(){
    div.remove();
  },1000);
}

function escapeHtml(text){

  return text
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function createPeer(id){

  const pc =
    new RTCPeerConnection({
      iceServers:[
        {
          urls:"stun:stun.l.google.com:19302"
        }
      ]
    });

  peers[id] = pc;

  if(localStream){

    localStream
      .getTracks()
      .forEach(track=>{
        pc.addTrack(track,localStream);
      });
  }

  pc.onicecandidate =
    function(event){

      if(event.candidate){

        socket.send(JSON.stringify({
          type:"candidate",
          target:id,
          candidate:event.candidate
        }));
      }
    };

  pc.ontrack =
    function(event){

      $("remoteVideo").srcObject =
        event.streams[0];

      $("noVideo").style.display = "none";
    };

  return pc;
}

async function receiveOffer(data){

  const pc =
    await createPeer(data.from);

  await pc.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );

  const answer =
    await pc.createAnswer();

  await pc.setLocalDescription(answer);

  socket.send(JSON.stringify({
    type:"answer",
    target:data.from,
    answer:answer
  }));
}

async function receiveAnswer(data){

  const pc = peers[data.from];

  if(!pc){
    return;
  }

  await pc.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );
}

async function receiveCandidate(data){

  const pc = peers[data.from];

  if(!pc){
    return;
  }

  try{
    await pc.addIceCandidate(
      new RTCIceCandidate(data.candidate)
    );
  }catch(error){
    console.error(error);
  }
}

</script>

</body>
</html>`;

const server = http.createServer((req, res) => {

  if(req.url === "/" || req.url === "/index.html"){

    res.writeHead(200,{
      "Content-Type":"text/html; charset=utf-8"
    });

    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const wss = new WebSocket.Server({
  server
});

function send(ws,data){

  if(ws.readyState === WebSocket.OPEN){

    ws.send(JSON.stringify(data));
  }
}

wss.on("connection",(ws)=>{

  ws.id =
    Math.random().toString(36).slice(2);

  ws.room = null;
  ws.name = "匿名";

  ws.on("message",(raw)=>{

    try{

      const data =
        JSON.parse(raw.toString());

      if(data.type === "join"){

        ws.room = data.room;
        ws.name = data.name || "匿名";

        if(!rooms.has(ws.room)){
          rooms.set(ws.room,new Set());
        }

        const roomUsers =
          rooms.get(ws.room);

        roomUsers.add(ws);

        const isHost =
          roomUsers.size === 1;

        send(ws,{
          type:"joined",
          host:isHost,
          count:roomUsers.size
        });

        broadcastRoom(ws.room,{
          type:"viewerCount",
          count:roomUsers.size
        });
      }

      else if(data.type === "chat"){

        broadcastRoom(ws.room,{
          type:"chat",
          name:ws.name,
          message:data.message
        });
      }

      else if(data.type === "gift"){

        broadcastRoom(ws.room,{
          type:"gift",
          name:ws.name
        });
      }

      else if(data.type === "live"){

        broadcastRoom(ws.room,{
          type:"live",
          active:!!data.active
        });
      }

      else if(data.type === "offer"){

        sendToTarget(data.target,{
          type:"offer",
          from:ws.id,
          offer:data.offer
        });
      }

      else if(data.type === "answer"){

        sendToTarget(data.target,{
          type:"answer",
          from:ws.id,
          answer:data.answer
        });
      }

      else if(data.type === "candidate"){

        sendToTarget(data.target,{
          type:"candidate",
          from:ws.id,
          candidate:data.candidate
        });
      }

    }catch(error){

      console.error(error);
    }
  });

  ws.on("close",()=>{

    if(ws.room && rooms.has(ws.room)){

      const roomUsers =
        rooms.get(ws.room);

      roomUsers.delete(ws);

      if(roomUsers.size === 0){

        rooms.delete(ws.room);

      }else{

        broadcastRoom(ws.room,{
          type:"viewerCount",
          count:roomUsers.size
        });
      }
    }
  });
});

function broadcastRoom(room,data){

  const users = rooms.get(room);

  if(!users){
    return;
  }

  users.forEach(user=>{
    send(user,data);
  });
}

function sendToTarget(id,data){

  wss.clients.forEach(client=>{

    if(client.id === id){
      send(client,data);
    }
  });
}

server.listen(PORT,HOST,()=>{

  console.log(
    "Bota Live Server running on port " + PORT
  );

});
