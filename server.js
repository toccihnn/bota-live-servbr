const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const clients = new Map();
const rooms = new Map();

let nextId = 1;
let totalLikes = 0;

const ranks = [
  { name: "新人ライバー1", viewers: 128 },
  { name: "新人ライバー2", viewers: 96 },
  { name: "新人ライバー3", viewers: 74 },
  { name: "新人ライバー4", viewers: 51 },
  { name: "新人ライバー5", viewers: 38 },
  { name: "新人ライバー6", viewers: 31 },
  { name: "新人ライバー7", viewers: 27 },
  { name: "新人ライバー8", viewers: 21 },
  { name: "新人ライバー9", viewers: 18 },
  { name: "新人ライバー10", viewers: 12 }
];

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch {}
  }
}

function broadcast(room, data, except) {
  for (const c of clients.values()) {
    if (c.room === room && c.id !== except) {
      send(c.ws, data);
    }
  }
}

function roomUsers(room) {
  return [...clients.values()].filter(c => c.room === room);
}

function host(room) {
  return roomUsers(room).find(c => c.role === "host");
}

function viewers(room) {
  return roomUsers(room).filter(c => c.role === "viewer").length;
}

function status(room) {
  const h = host(room);

  broadcast(room, {
    type: "room-status",
    live: !!(h && h.streaming),
    viewers: viewers(room)
  });
}

function html() {
return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1,maximum-scale=1">
<title>VoiceボタLive</title>

<style>
*{box-sizing:border-box}
body{
 margin:0;
 font-family:Arial,sans-serif;
 background:#faf7fb;
 color:#333;
}
header{
 background:linear-gradient(135deg,#ff7eb3,#ff4f91);
 color:white;
 padding:18px;
 text-align:center;
 position:sticky;
 top:0;
 z-index:10;
}
.logo{
 font-size:25px;
 font-weight:bold;
}
.wrap{
 max-width:900px;
 margin:auto;
 padding:15px;
}
.hero{
 background:linear-gradient(135deg,#ffd1e2,#fff);
 border-radius:22px;
 padding:25px;
 text-align:center;
 margin-bottom:18px;
 box-shadow:0 5px 20px #0001;
}
.hero h1{
 margin:5px 0 10px;
 color:#ff4f91;
}
button{
 border:0;
 border-radius:25px;
 padding:12px 20px;
 font-size:15px;
 cursor:pointer;
}
.primary{
 background:#ff4f91;
 color:white;
}
.secondary{
 background:white;
 border:1px solid #ddd;
}
.tabs{
 display:flex;
 gap:8px;
 overflow-x:auto;
 margin-bottom:15px;
}
.tab{
 white-space:nowrap;
 background:white;
}
.section{
 background:white;
 border-radius:18px;
 padding:15px;
 margin-bottom:18px;
 box-shadow:0 3px 15px #0000000d;
}
.section h2{
 margin-top:0;
}
.rank{
 display:flex;
 align-items:center;
 gap:12px;
 padding:10px 0;
 border-bottom:1px solid #eee;
}
.rank:last-child{
 border-bottom:0;
}
.ranknum{
 width:35px;
 height:35px;
 border-radius:50%;
 background:#ffe0ec;
 display:flex;
 align-items:center;
 justify-content:center;
 font-weight:bold;
}
.avatar{
 width:48px;
 height:48px;
 border-radius:50%;
 background:linear-gradient(135deg,#ff9fc5,#ffc9dc);
 display:flex;
 align-items:center;
 justify-content:center;
 font-size:22px;
}
.rankinfo{
 flex:1;
}
.live{
 color:#ff4f91;
 font-size:13px;
}
#live{
 display:none;
}
.livebox{
 background:#222;
 color:white;
 border-radius:20px;
 padding:18px;
 min-height:350px;
 position:relative;
 overflow:hidden;
}
.liveTitle{
 font-size:20px;
 margin-bottom:10px;
}
.liveStatus{
 display:inline-block;
 background:#ff4f91;
 padding:5px 10px;
 border-radius:15px;
 font-size:12px;
}
.audio{
 width:100%;
 margin:25px 0;
}
.comments{
 height:160px;
 overflow:auto;
 background:#1118;
 border-radius:12px;
 padding:10px;
}
.comment{
 margin:5px 0;
}
.controls{
 display:flex;
 flex-wrap:wrap;
 gap:8px;
 margin-top:12px;
}
.gift{
 background:#ffd54f;
}
.like{
 background:#ff6b9d;
 color:white;
}
input{
 width:100%;
 padding:12px;
 border:1px solid #ddd;
 border-radius:12px;
 margin-bottom:8px;
}
.hostPanel{
 display:none;
 background:#fff5f9;
 border-radius:15px;
 padding:15px;
 margin-top:15px;
}
.small{
 color:#777;
 font-size:13px;
}
.coin{
 color:#ff4f91;
 font-weight:bold;
}
@media(min-width:700px){
 .ranklist{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:0 20px;
 }
}
</style>
</head>

<body>

<header>
 <div class="logo">🎙️ VoiceボタLive</div>
 <div class="small" style="color:white">
  声でつながるライブ配信
 </div>
</header>

<div class="wrap">

<section id="home">

 <div class="hero">
  <div style="font-size:55px">🎙️</div>
  <h1>VoiceボタLive</h1>
  <p>声だけで、もっと近くに。</p>

  <button class="primary" onclick="showLive()">
   🎤 ライブを見る
  </button>

  <button class="secondary" onclick="showHost()">
   🎙️ 配信する
  </button>
 </div>

 <div class="tabs">
  <button class="tab" onclick="scrollToId('ranking')">
   🏆 TOP50
  </button>
  <button class="tab" onclick="scrollToId('new')">
   🌱 新人ライバー
  </button>
  <button class="tab" onclick="showHost()">
   🎙️ 配信する
  </button>
 </div>

 <section class="section" id="ranking">
  <h2>🏆 TOP50</h2>
  <div id="rankList" class="ranklist"></div>
 </section>

 <section class="section" id="new">
  <h2>🌱 新人ライバー</h2>
  <div class="rank">
   <div class="avatar">🎧</div>
   <div class="rankinfo">
    <b>新人ライバー</b>
    <div class="small">初配信をチェックしよう</div>
   </div>
   <button class="primary" onclick="showLive()">見る</button>
  </div>
 </section>

</section>

<section id="live">

 <div class="livebox">

  <div class="liveTitle">
   🎙️ VoiceボタLive
  </div>

  <span class="liveStatus" id="liveStatus">
   配信待機中
  </span>

  <p id="hostName">配信者</p>

  <audio id="remoteAudio"
         class="audio"
         autoplay
         controls>
  </audio>

  <div class="comments" id="comments"></div>

  <div class="controls">

   <button class="like"
           onclick="like()">
    ❤️ <span id="likeCount">0</span>
   </button>

   <button class="gift"
           onclick="gift('🌹 バラ')">
    🌹
   </button>

   <button class="gift"
           onclick="gift('🎁 ギフト')">
    🎁
   </button>

   <button class="secondary"
           onclick="leaveLive()">
    ← 戻る
   </button>

  </div>

  <div style="margin-top:10px">
   <input id="commentInput"
          placeholder="コメントを入力">
   <button class="primary"
           onclick="comment()">
    コメント
   </button>
  </div>

 </div>

</section>

<section id="host" class="section" style="display:none">

 <h2>🎙️ 配信する</h2>

 <input id="hostNameInput"
        placeholder="配信者名">

 <button class="primary"
         onclick="startHost()">
  配信開始
 </button>

 <button class="secondary"
         onclick="stopHost()">
  配信終了
 </button>

 <div class="hostPanel" id="hostPanel">

  <b>🔴 配信中</b>

  <p>
   視聴者：
   <span id="viewerCount">0</span>人
  </p>

  <p>
   いいね：
   <span id="hostLikes">0</span>
  </p>

  <p class="coin">
   💰 コイン機能は後から追加できます
  </p>

 </div>

 <p class="small">
  ※ブラウザからマイクの使用許可を求められたら
  「許可」を選択してください。
 </p>

</section>

</div>

<script>

let ws;
let myId = null;
let role = null;
let room = "bota";
let localStream = null;
let peer = null;
let hostId = null;

const ice = {
 iceServers:[
  {urls:"stun:stun.l.google.com:19302"},
  {urls:"stun:stun1.l.google.com:19302"}
 ]
};

function connect(){
 ws = new WebSocket(
  location.protocol==="https:"
   ? "wss://"+location.host
   : "ws://"+location.host
 );

 ws.onopen=()=>{
  ws.send(JSON.stringify({
   type:"join",
   role:role || "viewer",
   room
  }));
 };

 ws.onmessage=e=>{
  const m=JSON.parse(e.data);
  handle(m);
 };

 ws.onclose=()=>{
  setTimeout(connect,2000);
 };
}

function send(x){
 if(ws &&
    ws.readyState===WebSocket.OPEN){
  ws.send(JSON.stringify(x));
 }
}

function handle(m){

 if(m.type==="welcome"){
  myId=m.id;
 }

 if(m.type==="join-error"){
  alert(m.text);
  return;
 }

 if(m.type==="room-status"){
  document.getElementById("viewerCount")
   .textContent=m.viewers;

  document.getElementById("liveStatus")
   .textContent=m.live
    ? "🔴 LIVE"
    : "配信待機中";
 }

 if(m.type==="stream-started"){
  document.getElementById("liveStatus")
   .textContent="🔴 LIVE";
 }

 if(m.type==="stream-stopped"){
  document.getElementById("liveStatus")
   .textContent="配信終了";
 }

 if(m.type==="viewer-joined"){
  if(role==="host"){
   hostSendOffer(m.viewerId);
  }
 }

 if(m.type==="viewer-left"){
  if(peer) peer.close();
 }

 if(m.type==="host-left"){
  document.getElementById("liveStatus")
   .textContent="配信者が退出しました";
 }

 if(m.type==="signal"){
  handleSignal(m);
 }

 if(m.type==="comment"){
  addComment(m.name,m.text);
 }

 if(m.type==="like-count"){
  document.getElementById("likeCount")
   .textContent=m.count;

  document.getElementById("hostLikes")
   .textContent=m.count;
 }

 if(m.type==="gift"){
  addComment("🎁 ギフト",m.gift);
 }
}

async function hostSendOffer(viewerId){

 if(!localStream)return;

 const pc=new RTCPeerConnection(ice);

 localStream.getTracks().forEach(track=>{
  pc.addTrack(track,localStream);
 });

 pc.onicecandidate=e=>{
  if(e.candidate){
   send({
    type:"signal",
    target:viewerId,
    signal:{
     candidate:e.candidate
    }
   });
  }
 };

 peer=pc;

 const offer=await pc.createOffer({
  offerToReceiveAudio:false
 });

 await pc.setLocalDescription(offer);

 send({
  type:"signal",
  target:viewerId,
  signal:{
   description:pc.localDescription
  }
 });
}

async function handleSignal(m){

 const s=m.signal;

 if(role==="viewer"){

  if(!peer){
   peer=new RTCPeerConnection(ice);

   peer.ontrack=e=>{
    document.getElementById("remoteAudio")
     .srcObject=e.streams[0];
   };

   peer.onicecandidate=e=>{
    if(e.candidate){
     send({
      type:"signal",
      target:m.from,
      signal:{
       candidate:e.candidate
      }
     });
    }
   };
  }

  if(s.description){

   await peer.setRemoteDescription(
    s.description
   );

   if(s.description.type==="offer"){

    const answer=
     await peer.createAnswer();

    await peer.setLocalDescription(
     answer
    );

    send({
     type:"signal",
     target:m.from,
     signal:{
      description:peer.localDescription
     }
    });
   }
  }

  if(s.candidate){
   try{
    await peer.addIceCandidate(
     s.candidate
    );
   }catch{}
  }
 }

 if(role==="host"){

  if(s.description){

   await peer.setRemoteDescription(
    s.description
   );

  }

  if(s.candidate){
   try{
    await peer.addIceCandidate(
     s.candidate
    );
   }catch{}
  }
 }
}

async function startHost(){

 const name=
  document.getElementById("hostNameInput")
   .value.trim() || "配信者";

 role="host";

 document.getElementById("hostName")
  .textContent=name;

 try{

  localStream=
   await navigator.mediaDevices
    .getUserMedia({
     audio:{
      echoCancellation:true,
      noiseSuppression:true,
      autoGainControl:true
     },
     video:false
    });

  document.getElementById("hostPanel")
   .style.display="block";

  document.getElementById("liveStatus")
   .textContent="🔴 LIVE";

  send({
   type:"stream-started"
  });

 }catch(e){

  alert(
   "マイクを使用できませんでした。\\n"+
   e.message
  );

 }
}

function stopHost(){

 if(localStream){

  localStream.getTracks()
   .forEach(t=>t.stop());

  localStream=null;
 }

 if(peer){
  peer.close();
  peer=null;
 }

 send({
  type:"stream-stopped"
 });

 document.getElementById("hostPanel")
  .style.display="none";

 document.getElementById("liveStatus")
  .textContent="配信終了";
}

function showLive(){

 document.getElementById("home")
  .style.display="none";

 document.getElementById("host")
  .style.display="none";

 document.getElementById("live")
  .style.display="block";

 role="viewer";

 if(ws)ws.close();
 connect();
}

function showHost(){

 document.getElementById("home")
  .style.display="none";

 document.getElementById("live")
  .style.display="none";

 document.getElementById("host")
  .style.display="block";

 role="host";

 if(ws)ws.close();
 connect();
}

function leaveLive(){

 if(peer){
  peer.close();
  peer=null;
 }

 document.getElementById("live")
  .style.display="none";

 document.getElementById("home")
  .style.display="block";

 if(ws)ws.close();
}

function like(){
 send({type:"like"});
}

function gift(name){
 send({
  type:"gift",
  gift:name
 });
}

function comment(){

 const input=
  document.getElementById("commentInput");

 const text=input.value.trim();

 if(!text)return;

 send({
  type:"comment",
  text
 });

 input.value="";
}

function addComment(name,text){

 const box=
  document.getElementById("comments");

 const div=
  document.createElement("div");

 div.className="comment";

 div.innerHTML=
  "<b>"+escapeHtml(name)+
  "：</b>"+
  escapeHtml(text);

 box.appendChild(div);

 box.scrollTop=box.scrollHeight;
}

function escapeHtml(s){
 return String(s)
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;");
}

function scrollToId(id){
 document.getElementById(id)
  .scrollIntoView({
   behavior:"smooth"
  });
}

function renderRanks(){

 const box=
  document.getElementById("rankList");

 box.innerHTML="";

 ranks.forEach((r,i)=>{

  const div=
   document.createElement("div");

  div.className="rank";

  div.innerHTML=`
   <div class="ranknum">${i+1}</div>
   <div class="avatar">🎙️</div>
   <div class="rankinfo">
    <b>${r.name}</b>
    <div class="small">
     👀 ${r.viewers}人
     <span class="live">● LIVE</span>
    </div>
   </div>
   <button class="primary"
           onclick="showLive()">
    見る
   </button>
  `;

  box.appendChild(div);
 });
}

renderRanks();
connect();

</script>

</body>
</html>`;
}

const server=http.createServer((req,res)=>{

 if(req.url==="/health"){
  res.writeHead(200,{
   "Content-Type":"application/json"
  });

  res.end(JSON.stringify({
   ok:true,
   app:"VoiceボタLive"
  }));

  return;
 }

 res.writeHead(200,{
  "Content-Type":"text/html; charset=utf-8",
  "Cache-Control":"no-cache"
 });

 res.end(html());
});

const wss=new WebSocket.Server({
 server,
 perMessageDeflate:false
});

wss.on("connection",ws=>{

 const id=String(nextId++);

 const client={
  id,
  ws,
  role:null,
  room:"bota",
  streaming:false
 };

 clients.set(id,client);

 send(ws,{
  type:"welcome",
  id
 });

 ws.on("message",raw=>{

  let m;

  try{
   m=JSON.parse(raw.toString());
  }catch{
   return;
  }

  if(m.type==="join"){

   const newRole=
    m.role==="host"
     ? "host"
     : "viewer";

   const newRoom=
    m.room || "bota";

   if(newRole==="host"){

    const h=host(newRoom);

    if(h && h.id!==id){

     send(ws,{
      type:"join-error",
      text:"このルームには既に配信者がいます"
     });

     return;
    }
   }

   client.role=newRole;
   client.room=newRoom;

   send(ws,{
    type:"join-ok"
   });

   if(newRole==="viewer"){

    const h=host(newRoom);

    if(h){

     send(h.ws,{
      type:"viewer-joined",
      viewerId:id
     });

     if(h.streaming){
      send(ws,{
       type:"stream-started"
      });
     }
    }
   }

   if(newRole==="host"){

    for(const c of clients.values()){

     if(
      c.room===newRoom &&
      c.role==="viewer"
     ){
      send(ws,{
       type:"viewer-joined",
       viewerId:c.id
      });
     }
    }
   }

   status(newRoom);
   return;
  }

  if(m.type==="signal"){

   const target=clients.get(
    String(m.target)
   );

   if(
    !target ||
    target.room!==client.room
   )return;

   send(target.ws,{
    type:"signal",
    from:id,
    signal:m.signal
   });

   return;
  }

  if(m.type==="stream-started"){

   if(client.role!=="host")return;

   client.streaming=true;

   broadcast(client.room,{
    type:"stream-started"
   });

   status(client.room);
   return;
  }

  if(m.type==="stream-stopped"){

   if(client.role!=="host")return;

   client.streaming=false;

   broadcast(client.room,{
    type:"stream-stopped"
   });

   status(client.room);
   return;
  }

  if(m.type==="like"){

   totalLikes++;

   broadcast(client.room,{
    type:"like-count",
    count:totalLikes
   });

   return;
  }

  if(m.type==="gift"){

   const gift=
    String(m.gift || "🎁 ギフト")
     .slice(0,50);

   broadcast(client.room,{
    type:"gift",
    gift
   });

   return;
  }

  if(m.type==="comment"){

   const text=
    String(m.text || "")
     .trim()
     .slice(0,120);

   if(!text)return;

   broadcast(client.room,{
    type:"comment",
    name:
     client.role==="host"
      ? "配信者"
      : "視聴者",
    text
   });

   return;
  }
 });

 ws.on("close",()=>{

  const room=client.room;
  const role=client.role;

  clients.delete(id);

  if(role==="host"){

   for(const c of clients.values()){

    if(
     c.room===room &&
     c.role==="viewer"
    ){
     send(c.ws,{
      type:"host-left"
     });
    }
   }
  }

  if(role==="viewer"){

   const h=host(room);

   if(h){
    send(h.ws,{
     type:"viewer-left",
     viewerId:id
    });
   }
  }

  status(room);
 });

 ws.on("error",()=>{});
});

setInterval(()=>{

 for(const c of clients.values()){

  if(c.ws.readyState===WebSocket.OPEN){
   try{
    c.ws.ping();
   }catch{}
  }
 }

},25000);

server.listen(
 PORT,
 HOST,
 ()=>{
  console.log("");
  console.log("================================");
  console.log("🎙️ VoiceボタLive");
  console.log("音声ライブ配信サーバー");
  console.log("PORT:",PORT);
  console.log("================================");
 }
);
