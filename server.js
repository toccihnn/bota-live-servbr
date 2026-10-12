"const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/*
 * Voice繝昴ちLive
 * - 髻ｳ螢ｰ WebRTC 驟堺ｿ｡
 * - 驟堺ｿ｡閠��閭梧勹繧定ｦ冶�閠�∈繝ｪ繧｢繝ｫ繧ｿ繧､繝�蜷梧悄
 * - 繧ｳ繝｡繝ｳ繝� / 縺�＞縺ｭ / 繧ｮ繝輔ヨ / 隕冶�閠�焚
 * - 1繝ｫ繝ｼ繝�繝ｻ蜷梧凾驟堺ｿ｡閠�1莠ｺ縺ｮ繧ｷ繝ｳ繝励Ν讒区�
 *
 * 豕ｨ諢�:
 * 繧ｳ繝｡繝ｳ繝医�縺�＞縺ｭ繝ｻ繧ｮ繝輔ヨ縺ｯ縺薙�繧ｵ繝ｼ繝舌�荳翫〒蜍穂ｽ懊☆繧九ョ繝｢讖溯�縺ｧ縺吶�
 * 繧ｮ繝輔ヨ縺ｯ豎ｺ貂医ｒ陦後ｏ縺壹∝ｮ滄圀縺ｮ縺企≡縺ｯ逋ｺ逕溘＠縺ｾ縺帙ｓ縲�
 */

const clients = new Set();
let broadcaster = null;
const viewers = new Set();

let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: "",
  startedAt: null,
  background: "moon",
  backgroundImage: "",
  likes: 0
};

const BACKGROUNDS = {
  moon: "radial-gradient(circle at 50% 28%, rgba(78,101,190,.35), transparent 35%), linear-gradient(145deg,#030510,#101a3b 55%,#26103c)",
  sakura: "radial-gradient(circle at 75% 20%, rgba(255,145,190,.35), transparent 32%), linear-gradient(145deg,#180815,#431b3b 55%,#100d2c)",
  stars: "radial-gradient(circle at 30% 20%, rgba(108,167,255,.35), transparent 30%), radial-gradient(circle at 80% 70%, rgba(176,116,255,.25), transparent 28%), linear-gradient(145deg,#02040e,#0b1740 55%,#180c32)",
  aurora: "radial-gradient(ellipse at 20% 20%, rgba(34,255,196,.28), transparent 35%), radial-gradient(ellipse at 80% 55%, rgba(114,83,255,.32), transparent 38%), linear-gradient(145deg,#020d18,#092c43 55%,#1c103e)",
  rose: "radial-gradient(circle at 50% 30%, rgba(255,93,145,.28), transparent 35%), linear-gradient(145deg,#10040d,#38112b 55%,#140a29)"
};

function json(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data, except = null) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function currentLive() {
  if (!liveInfo.active) return null;
  return {
    id: liveInfo.id,
    name: liveInfo.name,
    title: liveInfo.title,
    startedAt: liveInfo.startedAt,
    background: liveInfo.background,
    backgroundImage: liveInfo.backgroundImage,
    likes: liveInfo.likes,
    viewerCount: viewers.size
  };
}

function liveListMessage() {
  const live = currentLive();
  return { type: "live_list", lives: live ? [live] : [] };
}

function sendLiveListTo(ws) {
  json(ws, liveListMessage());
}

function broadcastLiveList() {
  broadcast(liveListMessage());
}

function sendLiveState(ws) {
  if (!liveInfo.active) {
    json(ws, { type: "live_unavailable" });
    return;
  }
  json(ws, {
    type: "live_state",
    live: currentLive(),
    comments: liveComments.slice(-50)
  });
}

const liveComments = [];
let nextCommentId = 1;

function resetLive() {
  broadcaster = null;
  viewers.clear();
  liveComments.length = 0;
  liveInfo = {
    active: false,
    id: null,
    name: "",
    title: "",
    startedAt: null,
    background: "moon",
    backgroundImage: "",
    likes: 0
  };
}

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#030510">
<title>Voice繝昴ちLive</title>
<style>
:root{color-scheme:dark;--bg:#030510;--line:rgba(154,174,255,.18);--muted:#aab5d5;--cyan:#62dcff;--pink:#ff6bb5}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%;background:var(--bg);color:#fff;font-family:system-ui,-apple-system,"Noto Sans JP","Yu Gothic",sans-serif}
body{overflow-x:hidden}button,input{font:inherit}button{cursor:pointer;color:white}
.app{min-height:100vh;padding-bottom:84px}
.header{height:58px;position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:0 17px;background:rgba(3,5,16,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.logo{font-weight:950;font-size:18px;background:linear-gradient(90deg,#fff,#8bd8ff,#d08cff);color:transparent;background-clip:text}
.online{font-size:11px;color:#b8c6e7;display:flex;gap:7px;align-items:center}.dot{width:7px;height:7px;border-radius:50%;background:#48ffad;box-shadow:0 0 12px #48ffad}
.hero{max-width:1050px;margin:auto;padding:18px}
.hero-art{min-height:245px;position:relative;overflow:hidden;border-radius:26px;border:1px solid var(--line);background:radial-gradient(circle at 50% 30%,#253b79 0,transparent 34%),linear-gradient(145deg,#030510,#111b40 60%,#321443);display:flex;align-items:center;justify-content:center;text-align:center}
.hero-art:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,#fff8 0 1px,transparent 2px),radial-gradient(circle at 72% 40%,#fff9 0 1px,transparent 2px),radial-gradient(circle at 45% 75%,#9fdcffb0 0 1px,transparent 2px);background-size:90px 80px,130px 110px,170px 130px;opacity:.6}
.moon{font-size:64px;filter:drop-shadow(0 0 24px #7caeff);position:relative}.hero-copy{position:relative;padding:20px}.hero-copy h1{font-size:clamp(26px,6vw,42px);margin:5px 0 12px;line-height:1.3}.gradient-text{background:linear-gradient(90deg,#fff,#a6e6ff,#d99cff);background-clip:text;color:transparent}.hero-copy p{color:#d0d8f1;line-height:1.8;font-size:13px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.btn{border:0;border-radius:15px;padding:14px 12px;font-weight:850;background:linear-gradient(100deg,#13c9ef,#5868ff,#bd4cff);box-shadow:0 7px 25px #5068ff30}.btn.secondary{background:#121936;border:1px solid var(--line);box-shadow:none}.section{max-width:1050px;margin:auto;padding:12px 18px 18px}.section-head{display:flex;justify-content:space-between;align-items:center;margin:10px 0 14px}.section-head h2{font-size:19px;margin:0}.small-label{font-size:10px;letter-spacing:1px;color:#8490b4}.live-list{display:grid;gap:10px}.empty{padding:28px;text-align:center;border:1px solid var(--line);border-radius:18px;color:#8d9abc;background:#0b1025}
.live-card{width:100%;text-align:left;display:flex;gap:12px;align-items:center;padding:14px;border-radius:18px;background:linear-gradient(120deg,#151e49,#090d21);border:1px solid var(--line)}.avatar{width:56px;height:56px;display:grid;place-items:center;border-radius:50%;font-size:25px;flex-shrink:0;background:radial-gradient(circle,#70dfff,#4657df 60%,#180f3c);box-shadow:0 0 20px #597dff40}.live-info{flex:1;min-width:0}.live-name{font-weight:900}.live-title{font-size:12px;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.live-badge{display:inline-block;font-size:10px;font-weight:900;margin-top:7px;background:linear-gradient(90deg,#ff3e72,#9d35ff);border-radius:99px;padding:4px 8px}.viewer-count{font-size:12px;color:#c8d4ff;white-space:nowrap}
.features{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.feature{padding:16px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,#141b40,#080b1c)}.feature strong{display:block;margin:7px 0}.feature span{font-size:11px;color:#9ca9cd;line-height:1.6}
.nav{position:fixed;z-index:25;bottom:0;left:0;right:0;height:calc(72px + env(safe-area-inset-bottom));padding:7px 6px calc(7px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,1fr);background:#050817f2;backdrop-filter:blur(18px);border-top:1px solid var(--line)}.nav button{border:0;background:transparent;color:#8590b1;font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}.nav button span{font-size:20px}.nav .nav-live{color:#fff}
.live-screen{display:none;position:fixed;inset:0;z-index:100;background:#030510;overflow:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);isolation:isolate}.live-screen.show{display:flex;flex-direction:column}.live-bg{position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 50% 30%,#263d78,transparent 40%),linear-gradient(145deg,#030510,#111a3a 60%,#28103a);background-size:cover;background-position:center;transition:background .25s}.live-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,3,12,.58),rgba(2,4,15,.12) 35%,rgba(2,4,15,.72) 70%,#030510 100%)}.live-top{display:flex;align-items:flex-start;gap:10px;padding:14px 15px;position:relative;z-index:2}.icon-btn{width:40px;height:40px;border-radius:50%;border:1px solid #ffffff30;background:#090d24b8;font-size:20px}.live-person{flex:1;min-width:0}.live-person strong{display:block;font-size:14px}.live-person small{display:block;color:#d0d8f2;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.live-pill{border-radius:99px;background:#ff315f;padding:7px 10px;font-size:11px;font-weight:950;letter-spacing:.5px;box-shadow:0 0 16px #ff315f70}.live-viewers{margin-top:7px;text-align:right;font-size:11px;color:#e5e9ff}
.live-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:180px;position:relative;padding:12px}.orb{width:170px;height:170px;border-radius:50%;display:grid;place-items:center;position:relative;background:radial-gradient(circle at 35% 30%,#d4f7ff,#5b8bff 30%,#5433a9 70%,#120a2c);box-shadow:0 0 35px #6a83ff75,inset 0 0 28px #fff5;animation:float 3s ease-in-out infinite}.orb:before,.orb:after{content:"";position:absolute;inset:-15px;border:1px solid #a9caff80;border-radius:50%;animation:ring 3s ease-out infinite}.orb:after{inset:-30px;animation-delay:1.5s}.orb span{font-size:64px;filter:drop-shadow(0 0 12px #fff9)}@keyframes ring{0%{transform:scale(.8);opacity:.8}100%{transform:scale(1.3);opacity:0}}@keyframes float{50%{transform:translateY(-7px)}}.wave{height:35px;display:flex;align-items:center;gap:4px;margin-top:26px}.wave i{display:block;width:4px;height:12px;border-radius:5px;background:linear-gradient(#a9f4ff,#9a7dff);animation:wave .75s ease-in-out infinite alternate}.wave i:nth-child(2n){animation-delay:.2s}.wave i:nth-child(3n){animation-delay:.4s}@keyframes wave{to{height:30px}}.live-caption{margin-top:12px;color:#dce5ff;font-size:12px;text-align:center}
.live-bottom{position:relative;z-index:2;padding:10px 14px 14px;max-height:54%;display:flex;flex-direction:column;gap:10px}.live-meta{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#c9d5f7}.live-meta strong{color:#fff}.comments{height:clamp(90px,19vh,180px);overflow-y:auto;mask-image:linear-gradient(transparent 0,#000 12%);padding:12px 2px 0;display:flex;flex-direction:column;gap:9px}.comment{font-size:13px;line-height:1.45;color:#f3f5ff;text-shadow:0 1px 4px #000}.comment b{color:#9eeaff;margin-right:6px}.comment .gift-comment{color:#ffb5dd}.comment-form{display:flex;gap:7px}.comment-form input{flex:1;min-width:0;border:1px solid #ffffff2b;border-radius:99px;padding:12px 14px;background:#090d24c9;color:#fff;outline:none}.comment-form button{border:0;border-radius:99px;padding:0 16px;background:linear-gradient(100deg,#4a78ff,#a64dff);font-weight:850}.live-controls{display:flex;gap:8px;align-items:center}.control-btn{flex:1;min-width:0;border:1px solid #ffffff2b;border-radius:14px;background:#101632d9;padding:12px 5px;font-size:12px;font-weight:800}.control-btn.liked{background:#652044;border-color:#ff6bb5}.control-btn.gift{background:linear-gradient(100deg,#b43b82,#6338d7);border:0}.control-btn.stop{background:#5a172b;border-color:#ff4f79}
.background-tools{display:none;gap:7px;overflow-x:auto;padding:2px 0 5px}.background-tools.show{display:flex}.bg-choice{white-space:nowrap;border:1px solid #ffffff30;border-radius:99px;background:#11172e;padding:9px 12px;font-size:12px}.bg-choice.active{border-color:#9fdfff;background:#24335f}.upload-label{white-space:nowrap;border:1px dashed #c7d5ff80;border-radius:99px;padding:9px 12px;font-size:12px;background:#10152b}.gift-panel{display:none;position:absolute;z-index:10;bottom:calc(90px + env(safe-area-inset-bottom));left:12px;right:12px;padding:14px;border:1px solid #ffffff30;border-radius:20px;background:#0b1025f5;box-shadow:0 10px 40px #0008}.gift-panel.show{display:block}.gift-panel h3{margin:0 0 12px;font-size:15px}.gift-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.gift-option{border:1px solid #ffffff20;border-radius:13px;background:#151c3a;padding:10px 2px;font-size:12px}.gift-option span{display:block;font-size:25px;margin-bottom:5px}.gift-hint{font-size:10px;color:#aab5d5;margin-top:10px}
.hidden{display:none!important}
@media(min-width:700px){.hero{padding-top:25px}.hero-art{min-height:300px}.hero-copy{max-width:720px}.live-list{grid-template-columns:repeat(2,minmax(0,1fr))}.features{grid-template-columns:repeat(4,1fr)}.live-bottom{width:min(700px,100%);margin:0 auto}.live-top{width:min(700px,100%);margin:0 auto}.live-center{min-height:230px}}
@media(max-height:700px){.orb{width:120px;height:120px}.orb span{font-size:48px}.live-center{min-height:135px}.live-bottom{max-height:58%;gap:7px}.comments{height:90px}}

/* 菫ｮ豁｣�夐�菫｡邨ゆｺ��繧ｿ繝ｳ縺ｯ陦ｨ遉ｺ縺帙★縲∝承荳翫�ﾃ励°繧臥ｵゆｺ�☆繧� */
#stopButton,
#livePanel.is-broadcaster #stopButton,
#liveScreen.is-broadcaster #stopButton {
  display: none !important;
}

</style>
</head>
<body>
<div class="app" id="app">
<header class="header"><div class="logo">Voice繝昴ちLive</div><div class="online"><i class="dot"></i>繧ｪ繝ｳ繝ｩ繧､繝ｳ</div></header>
<section class="hero">
  <div class="hero-art"><div class="hero-copy"><div class="moon">嫌</div><h1><span class="gradient-text">縺ゅ↑縺溘�螢ｰ縺後�</span><br>隱ｰ縺九�螟懊ｒ辣ｧ繧峨☆縲�</h1><p>螢ｰ縺ｧ縺､縺ｪ縺後ｋ縲√∩繧薙↑縺ｮ螻��ｴ謇縲�<br>譛域�縺九ｊ縺ｮ荳九〒縲∬ｩｱ縺励※縲∬�縺�※縲∫ｬ代▲縺ｦ縲�</p></div></div>
  <div class="actions"><button class="btn" onclick="startLive()">児�� 驟堺ｿ｡繧偵�縺倥ａ繧�</button><button class="btn secondary" onclick="scrollLive()">而 繝ｩ繧､繝悶ｒ閨ｴ縺�※縺ｿ繧�</button></div>
</section>
<section class="section" id="liveSection"><div class="section-head"><h2>閥 繝ｩ繧､繝紋ｸｭ</h2><span class="small-label">REAL TIME</span></div><div class="live-list" id="liveList"><div class="empty">驟堺ｿ｡繧堤｢ｺ隱阪＠縺ｦ縺�∪縺�...</div></div></section>
<section class="section"><div class="section-head"><h2>Voice繝昴ちLive</h2></div><div class="features">
<div class="feature">児��<strong>鬮倬浹雉ｪ縺ｮ髻ｳ螢ｰ驟堺ｿ｡</strong><span>繧ｯ繝ｪ繧｢縺ｪ螢ｰ縺ｧ縲√ｂ縺｣縺ｨ霑代￥縺ｫ縲�</span></div><div class="feature">笞｡<strong>繝ｪ繧｢繝ｫ繧ｿ繧､繝�</strong><span>莉翫％縺ｮ迸ｬ髢薙ｒ縲∽ｸ邱偵↓縲�</span></div><div class="feature">氏<strong>繧ｮ繝輔ヨ縺ｧ蠢懈抄</strong><span>繧ｮ繝輔ヨ貍泌�縺ｧ驟堺ｿ｡繧堤屁繧贋ｸ翫￡繧医≧縲�</span></div><div class="feature">町<strong>繧ｳ繝｡繝ｳ繝�</strong><span>閨ｴ縺阪↑縺後ｉ縺ｿ繧薙↑縺ｧ莨夊ｩｱ縲�</span></div>
</div></section>
</div>
<nav class="nav" id="nav"><button onclick="goHome()"><span>竚�</span>繝帙�繝�</button><button onclick="scrollLive()"><span>竚�</span>謗｢縺�</button><button class="nav-live" onclick="startLive()"><span>児��</span>驟堺ｿ｡</button><button onclick="showNotice()"><span>笙ｧ</span>縺顔衍繧峨○</button><button onclick="showProfile()"><span>笙�</span>繝槭う繝壹�繧ｸ</button></nav>

<div class="live-screen" id="liveScreen">
  <div class="live-bg" id="liveBg"></div>
  <div class="live-top">
    <button class="icon-btn" onclick="closeLiveScreen()" aria-label="髢峨§繧�">窶ｹ</button>
    <div class="live-person"><strong id="liveName">Voice驟堺ｿ｡閠�</strong><small id="liveTitle">髻ｳ螢ｰ繝ｩ繧､繝夜�菫｡荳ｭ</small><div class="live-viewers" id="viewerCount">則 0莠ｺ縺瑚ｦ冶�荳ｭ</div></div>
    <div><div class="live-pill" id="livePill">笳� LIVE</div><div class="live-viewers" id="liveDuration">00:00</div></div>
  </div>
  <div class="live-center"><div class="orb"><span>児��</span></div><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="live-caption" id="audioText">螢ｰ縺ｧ縺､縺ｪ縺後ｋ縲√∩繧薙↑縺ｮ螻��ｴ謇縲�</div></div>
  <div class="live-bottom">
    <div class="live-meta"><span id="liveMetaTitle"><strong>嫌 LIVE</strong>縲驟堺ｿ｡繧呈･ｽ縺励ｂ縺�</span><span id="likeCount">笙｡ 0</span></div>
    <div class="background-tools" id="backgroundTools">
      <button class="bg-choice active" data-bg="moon" onclick="chooseBackground('moon')">嫌 譛亥�闃ｱ</button>
      <button class="bg-choice" data-bg="sakura" onclick="chooseBackground('sakura')">減 譯�</button>
      <button class="bg-choice" data-bg="stars" onclick="chooseBackground('stars')">血 譏溽ｩｺ</button>
      <button class="bg-choice" data-bg="aurora" onclick="chooseBackground('aurora')">決 繧ｪ繝ｼ繝ｭ繝ｩ</button>
      <button class="bg-choice" data-bg="rose" onclick="chooseBackground('rose')">･ 鮟定又阮�</button>
      <label class="upload-label">名�� 逕ｻ蜒上ｒ驕ｸ縺ｶ<input id="backgroundUpload" type="file" accept="image/*" hidden onchange="uploadBackground(event)"></label>
      <button class="bg-choice" onclick="resetBackground()">繝ｪ繧ｻ繝�ヨ</button>
    </div>
    <div class="comments" id="comments" aria-live="polite"></div>
    <form class="comment-form" id="commentForm"><input id="commentInput" maxlength="180" placeholder="繧ｳ繝｡繝ｳ繝医ｒ蜈･蜉�..." autocomplete="off"><button type="submit">騾∽ｿ｡</button></form>
    <div class="live-controls">
      <button class="control-btn" id="likeButton" onclick="sendLike()">笙｡ 縺�＞縺ｭ</button>
      <button class="control-btn gift" onclick="toggleGiftPanel()">氏 繧ｮ繝輔ヨ</button>
      <button class="control-btn" id="audioButton" onclick="enableAudio()">矧 髻ｳ螢ｰON</button>
      <button class="control-btn stop hidden" id="stopButton" onclick="stopLive()">驟堺ｿ｡邨ゆｺ�</button>
    </div>
  </div>
  <div class="gift-panel" id="giftPanel"><h3>氏 繧ｮ繝輔ヨ繧帝√ｋ</h3><div class="gift-grid">
    <button class="gift-option" onclick="sendGift('繝上�繝�','苧')"><span>苧</span>繝上�繝�</button>
    <button class="gift-option" onclick="sendGift('譛�','嫌')"><span>嫌</span>譛�</button>
    <button class="gift-option" onclick="sendGift('闃ｱ譚�','註')"><span>註</span>闃ｱ譚�</button>
    <button class="gift-option" onclick="sendGift('譏�','検')"><span>検</span>譏�</button>
  </div><div class="gift-hint">窶ｻ繝�Δ繧ｮ繝輔ヨ縺ｧ縺吶よｱｺ貂医�隱ｲ驥代�逋ｺ逕溘＠縺ｾ縺帙ｓ縲�</div></div>
  <audio id="remoteAudio" autoplay playsinline></audio>
</div>

<script>
"use strict";
const myId = "client_" + Math.random().toString(36).slice(2);
let socket = null, socketReady = false, reconnectTimer = null;
let isBroadcaster = false, localStream = null, currentLiveId = null;
let peerConnections = Object.create(null), pendingCandidates = Object.create(null);
let liveStartedAt = null, durationTimer = null, currentBackground = "moon";
let uploadedBackgroundUrl = "", isListening = false, currentLiveData = null;
const rtcConfig = { iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}] };
const bgCss = {
 moon:"radial-gradient(circle at 50% 28%, rgba(78,101,190,.35), transparent 35%),linear-gradient(145deg,#030510,#101a3b 55%,#26103c)",
 sakura:"radial-gradient(circle at 75% 20%, rgba(255,145,190,.35), transparent 32%),linear-gradient(145deg,#180815,#431b3b 55%,#100d2c)",
 stars:"radial-gradient(circle at 30% 20%, rgba(108,167,255,.35), transparent 30%),radial-gradient(circle at 80% 70%, rgba(176,116,255,.25), transparent 28%),linear-gradient(145deg,#02040e,#0b1740 55%,#180c32)",
 aurora:"radial-gradient(ellipse at 20% 20%, rgba(34,255,196,.28), transparent 35%),radial-gradient(ellipse at 80% 55%, rgba(114,83,255,.32), transparent 38%),linear-gradient(145deg,#020d18,#092c43 55%,#1c103e)",
 rose:"radial-gradient(circle at 50% 30%, rgba(255,93,145,.28), transparent 35%),linear-gradient(145deg,#10040d,#38112b 55%,#140a29)"
};

function connectSocket(){
  if(socket && (socket.readyState===WebSocket.OPEN || socket.readyState===WebSocket.CONNECTING)) return;
  const protocol = location.protocol==="https:" ? "wss:" : "ws:";
  socket = new WebSocket(protocol+"//"+location.host);
  socket.onopen=()=>{socketReady=true;send({type:"hello",clientId:myId});};
  socket.onmessage=(event)=>{try{handleMessage(JSON.parse(event.data));}catch(e){console.error("message error",e);}};
  socket.onclose=()=>{socketReady=false;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connectSocket,1800);};
  socket.onerror=(e)=>console.warn("WebSocket error",e);
}
function send(data){if(socket && socket.readyState===WebSocket.OPEN) socket.send(JSON.stringify(data));}
function handleMessage(data){
  if(data.type==="live_list" || data.type==="live_started" || data.type==="live_stopped"){renderLiveList(data.lives||[]);if(data.type==="live_stopped" && !isBroadcaster && isListening){setStatus("驟堺ｿ｡縺檎ｵゆｺ�＠縺ｾ縺励◆");document.getElementById("audioText").textContent="驟堺ｿ｡閠�′繝ｩ繧､繝悶ｒ邨ゆｺ�＠縺ｾ縺励◆";stopDuration();}return;}
  if(data.type==="live_state"){applyLiveState(data.live);(data.comments||[]).forEach(addComment);return;}
  if(data.type==="viewer_joined"){if(isBroadcaster)createOfferForViewer(data.viewerId);return;}
  if(data.type==="offer"){receiveOffer(data);return;}
  if(data.type==="answer"){receiveAnswer(data);return;}
  if(data.type==="ice_candidate"){receiveIceCandidate(data);return;}
  if(data.type==="viewer_left"){closePeer(data.viewerId);return;}
  if(data.type==="viewer_count"){updateViewerCount(data.count);return;}
  if(data.type==="background_update"){applyBackground(data.background,data.backgroundImage);return;}
  if(data.type==="comment"){addComment(data.comment);return;}
  if(data.type==="like_update"){updateLikes(data.likes);return;}
  if(data.type==="gift"){addComment({name:data.name||"繝ｪ繧ｹ繝翫�",text:(data.emoji||"氏")+" "+(data.giftName||"繧ｮ繝輔ヨ")+"繧帝√ｊ縺ｾ縺励◆��",kind:"gift"});return;}
  if(data.type==="live_unavailable"){setStatus("縺薙�繝ｩ繧､繝悶�邨ゆｺ�＠縺溘°縲∬ｦ冶�縺ｧ縺阪∪縺帙ｓ");if(!isBroadcaster)document.getElementById("audioText").textContent="驟堺ｿ｡縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ";return;}
  if(data.type==="error"){alert(data.message||"繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆");}
}
function renderLiveList(lives){
 const list=document.getElementById("liveList");
 if(!lives.length){list.innerHTML='<div class="empty">迴ｾ蝨ｨ驟堺ｿ｡荳ｭ縺ｮ繝ｩ繧､繝悶�縺ゅｊ縺ｾ縺帙ｓ</div>';return;}
 list.innerHTML="";
 lives.forEach(live=>{
  const button=document.createElement("button");button.className="live-card";button.type="button";
  const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent="児��";
  const info=document.createElement("div");info.className="live-info";
  const name=document.createElement("div");name.className="live-name";name.textContent=live.name||"Voice驟堺ｿ｡閠�";
  const title=document.createElement("div");title.className="live-title";title.textContent=live.title||"髻ｳ螢ｰ繝ｩ繧､繝夜�菫｡荳ｭ";
  const badge=document.createElement("span");badge.className="live-badge";badge.textContent="笳� LIVE";
  info.append(name,title,badge);
  const count=document.createElement("div");count.className="viewer-count";count.textContent="則 "+(live.viewerCount||0);
  button.append(avatar,info,count);button.onclick=()=>listenLive(live.id);list.append(button);
 });
}
async function startLive(){
 if(isBroadcaster){openLiveScreen();return;}
 if(!socketReady){alert("繧ｵ繝ｼ繝舌�縺ｫ謗･邯壻ｸｭ縺ｧ縺吶ょｰ代＠蠕�▲縺ｦ縺九ｉ繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺�縺輔＞縲�");return;}
 const name=prompt("驟堺ｿ｡閠�錐繧貞�蜉帙＠縺ｦ縺上□縺輔＞","縺ｼ縺溘ｂ縺｡");if(!name||!name.trim())return;
 const title=prompt("驟堺ｿ｡繧ｿ繧､繝医Ν繧貞�蜉帙＠縺ｦ縺上□縺輔＞","Voice繝昴ちLive 驟堺ｿ｡荳ｭ");if(!title||!title.trim())return;
 try{localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});}
 catch(e){alert("繝槭う繧ｯ繧剃ｽｿ縺医∪縺帙ｓ縲ゅヶ繝ｩ繧ｦ繧ｶ縺ｮ繝槭う繧ｯ險ｱ蜿ｯ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲�");console.error(e);return;}
 isBroadcaster=true;currentLiveId=myId;currentBackground="moon";uploadedBackgroundUrl="";
 openLiveScreen();document.getElementById("stopButton").classList.remove("hidden");document.getElementById("backgroundTools").classList.add("show");document.getElementById("audioButton").classList.add("hidden");
 setIdentity(name.trim(),title.trim());setStatus("閥 驟堺ｿ｡荳ｭ");document.getElementById("audioText").textContent="縺ゅ↑縺溘�螢ｰ繧帝�菫｡荳ｭ縺ｧ縺�";applyBackground(currentBackground,"");
 send({type:"start_live",clientId:myId,name:name.trim(),title:title.trim(),background:currentBackground,backgroundImage:""});
}
function stopLive(){
 if(!isBroadcaster){closeLiveScreen();return;}
 send({type:"stop_live",clientId:myId});
 Object.keys(peerConnections).forEach(closePeer);
 if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
 isBroadcaster=false;isListening=false;currentLiveId=null;setStatus("驟堺ｿ｡繧堤ｵゆｺ�＠縺ｾ縺励◆");document.getElementById("audioText").textContent="驟堺ｿ｡邨ゆｺ�";document.getElementById("stopButton").classList.add("hidden");document.getElementById("backgroundTools").classList.remove("show");stopDuration();closeLiveScreen();
}
function listenLive(id){
 if(isBroadcaster){alert("驟堺ｿ｡荳ｭ縺ｯ蛻･縺ｮ繝ｩ繧､繝悶ｒ隕冶�縺ｧ縺阪∪縺帙ｓ縲�");return;}
 if(!socketReady){alert("繧ｵ繝ｼ繝舌�縺ｫ謗･邯壻ｸｭ縺ｧ縺吶�");return;}
 currentLiveId=id;isListening=true;openLiveScreen();setStatus("驟堺ｿ｡閠�∈謗･邯壹＠縺ｦ縺�∪縺�...");document.getElementById("stopButton").classList.add("hidden");document.getElementById("backgroundTools").classList.remove("show");document.getElementById("audioButton").classList.remove("hidden");document.getElementById("audioText").textContent="驟堺ｿ｡閠�∈謗･邯壹＠縺ｦ縺�∪縺�";
 send({type:"join_live",clientId:myId,liveId:id});
}
function openLiveScreen(){document.getElementById("liveScreen").classList.add("show");document.getElementById("nav").classList.add("hidden");document.getElementById("app").classList.add("hidden");document.body.style.overflow="hidden";document.getElementById("commentInput").placeholder=isBroadcaster?"繧ｳ繝｡繝ｳ繝医ｒ遒ｺ隱阪�騾∽ｿ｡...":"繧ｳ繝｡繝ｳ繝医ｒ蜈･蜉�...";}
function closeLiveScreen(){if(isBroadcaster){stopLive();return;}document.getElementById("liveScreen").classList.remove("show");document.getElementById("nav").classList.remove("hidden");document.getElementById("app").classList.remove("hidden");document.body.style.overflow="";document.getElementById("giftPanel").classList.remove("show");if(isListening){Object.keys(peerConnections).forEach(closePeer);isListening=false;send({type:"leave_live",clientId:myId});}}
function setStatus(text){document.getElementById("livePill").textContent=text.includes("驟堺ｿ｡荳ｭ")?"笳� LIVE":"笳� 謗･邯�";document.getElementById("liveMetaTitle").textContent=text;}
function setIdentity(name,title){document.getElementById("liveName").textContent=name;document.getElementById("liveTitle").textContent=title;}
function applyLiveState(live){if(!live)return;currentLiveData=live;currentLiveId=live.id;setIdentity(live.name,live.title);updateViewerCount(live.viewerCount||0);updateLikes(live.likes||0);applyBackground(live.background||"moon",live.backgroundImage||"");setStatus("笳� LIVE 驟堺ｿ｡荳ｭ");startDuration(live.startedAt);}
function applyBackground(bg,image){currentBackground=bg||"moon";const el=document.getElementById("liveBg");if(image){el.style.backgroundImage="linear-gradient(180deg,rgba(1,3,12,.42),rgba(2,4,15,.2) 35%,rgba(2,4,15,.7) 70%,#030510 100%),url('"+image+"')";el.style.backgroundSize="cover";el.style.backgroundPosition="center";}else{el.style.backgroundImage=bgCss[currentBackground]||bgCss.moon;document.querySelectorAll(".bg-choice[data-bg]").forEach(b=>b.classList.toggle("active",b.dataset.bg===currentBackground));}}
function chooseBackground(bg){if(!isBroadcaster)return;currentBackground=bg;uploadedBackgroundUrl="";applyBackground(bg,"");send({type:"update_background",clientId:myId,background:bg,backgroundImage:""});}
function uploadBackground(event){const file=event.target.files&&event.target.files[0];if(!file)return;if(!file.type.startsWith("image/")){alert("逕ｻ蜒上ヵ繧｡繧､繝ｫ繧帝∈繧薙〒縺上□縺輔＞");return;}if(file.size>2*1024*1024){alert("逕ｻ蜒上�2MB莉･荳九↓縺励※縺上□縺輔＞");event.target.value="";return;}const reader=new FileReader();reader.onload=()=>{uploadedBackgroundUrl=String(reader.result);applyBackground("custom",uploadedBackgroundUrl);send({type:"update_background",clientId:myId,background:"custom",backgroundImage:uploadedBackgroundUrl});};reader.readAsDataURL(file);event.target.value="";}
function resetBackground(){chooseBackground("moon");}
function updateViewerCount(count){document.getElementById("viewerCount").textContent="則 "+count+"莠ｺ縺瑚ｦ冶�荳ｭ";document.querySelectorAll(".live-card").forEach(card=>{const el=card.querySelector(".viewer-count");if(el)el.textContent="則 "+count;});}
function updateLikes(count){document.getElementById("likeCount").textContent="笙･ "+count;}
function addComment(comment){const list=document.getElementById("comments");if(!comment)return;const row=document.createElement("div");row.className="comment";const name=document.createElement("b");name.textContent=comment.name||"繝ｪ繧ｹ繝翫�";const text=document.createElement("span");text.textContent=comment.text||"";if(comment.kind==="gift")text.className="gift-comment";row.append(name,text);list.append(row);while(list.children.length>70)list.removeChild(list.firstChild);list.scrollTop=list.scrollHeight;}
document.getElementById("commentForm").addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("commentInput");const text=input.value.trim();if(!text)return;if(!isBroadcaster&&!isListening){alert("繝ｩ繧､繝悶↓蜿ょ刈縺励※縺九ｉ繧ｳ繝｡繝ｳ繝医〒縺阪∪縺�");return;}send({type:"comment",clientId:myId,text});input.value="";});
function sendLike(){if(!isBroadcaster&&!isListening){alert("繝ｩ繧､繝悶↓蜿ょ刈縺励※縺九ｉ縺�＞縺ｭ縺ｧ縺阪∪縺�");return;}send({type:"like",clientId:myId});const b=document.getElementById("likeButton");b.classList.add("liked");b.textContent="笙･ 縺ゅｊ縺後→縺�";setTimeout(()=>{b.classList.remove("liked");b.textContent="笙｡ 縺�＞縺ｭ";},700);}
function toggleGiftPanel(){if(!isBroadcaster&&!isListening){alert("繝ｩ繧､繝悶↓蜿ょ刈縺励※縺九ｉ繧ｮ繝輔ヨ繧帝√ｌ縺ｾ縺�");return;}document.getElementById("giftPanel").classList.toggle("show");}
function sendGift(giftName,emoji){send({type:"gift",clientId:myId,giftName,emoji});document.getElementById("giftPanel").classList.remove("show");}
async function enableAudio(){const audio=document.getElementById("remoteAudio");audio.muted=false;audio.volume=1;try{await audio.play();document.getElementById("audioButton").textContent="矧 髻ｳ螢ｰON";document.getElementById("audioText").textContent="矧 繝ｩ繧､繝夜浹螢ｰ繧貞�逕滉ｸｭ";}catch(e){alert("髻ｳ螢ｰ繧貞�逕溘〒縺阪∪縺帙ｓ縲ゅｂ縺�ｸ蠎ｦ繧ｿ繝��縺励※縺上□縺輔＞縲�");}}
function startDuration(startedAt){stopDuration();liveStartedAt=startedAt||Date.now();const update=()=>{const s=Math.max(0,Math.floor((Date.now()-liveStartedAt)/1000));document.getElementById("liveDuration").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");};update();durationTimer=setInterval(update,1000);}
function stopDuration(){if(durationTimer)clearInterval(durationTimer);durationTimer=null;}
function scrollLive(){document.getElementById("liveSection").scrollIntoView({behavior:"smooth"});}
function goHome(){window.scrollTo({top:0,behavior:"smooth"});}
function showNotice(){alert("縺顔衍繧峨○讖溯�縺ｯ貅門ｙ荳ｭ縺ｧ縺吶�");}
function showProfile(){alert("繝槭う繝壹�繧ｸ讖溯�縺ｯ貅門ｙ荳ｭ縺ｧ縺吶�");}
function closePeer(id){const pc=peerConnections[id];if(pc){try{pc.close();}catch(e){}delete peerConnections[id];}delete pendingCandidates[id];}
async function createOfferForViewer(viewerId){if(!isBroadcaster||!localStream)return;closePeer(viewerId);const pc=new RTCPeerConnection(rtcConfig);peerConnections[viewerId]=pc;pendingCandidates[viewerId]=[];localStream.getTracks().forEach(track=>pc.addTrack(track,localStream));pc.onicecandidate=e=>{if(e.candidate)send({type:"ice_candidate",from:myId,to:viewerId,candidate:e.candidate});};pc.onconnectionstatechange=()=>console.log("broadcaster peer",viewerId,pc.connectionState);try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);send({type:"offer",from:myId,to:viewerId,sdp:pc.localDescription});}catch(e){console.error("offer error",e);}}
async function receiveOffer(data){if(isBroadcaster)return;const id=data.from;closePeer(id);const pc=new RTCPeerConnection(rtcConfig);peerConnections[id]=pc;pendingCandidates[id]=[];pc.ontrack=async e=>{const audio=document.getElementById("remoteAudio");if(e.streams&&e.streams[0])audio.srcObject=e.streams[0];audio.muted=false;audio.volume=1;try{await audio.play();document.getElementById("audioText").textContent="矧 繝ｩ繧､繝夜浹螢ｰ繧貞女菫｡荳ｭ";}catch(err){document.getElementById("audioText").textContent="髻ｳ螢ｰ繧定�縺上↓縺ｯ縲碁浹螢ｰON縲阪ｒ謚ｼ縺励※縺上□縺輔＞";}setStatus("笳� LIVE 驟堺ｿ｡荳ｭ");};pc.onicecandidate=e=>{if(e.candidate)send({type:"ice_candidate",from:myId,to:id,candidate:e.candidate});};try{await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));const queued=pendingCandidates[id]||[];for(const c of queued){try{await pc.addIceCandidate(new RTCIceCandidate(c));}catch(e){console.warn("queued ICE",e);}}pendingCandidates[id]=[];const answer=await pc.createAnswer();await pc.setLocalDescription(answer);send({type:"answer",from:myId,to:id,sdp:pc.localDescription});}catch(e){console.error("answer error",e);}}
async function receiveAnswer(data){const pc=peerConnections[data.from];if(!pc)return;try{await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));const queued=pendingCandidates[data.from]||[];for(const c of queued){try{await pc.addIceCandidate(new RTCIceCandidate(c));}catch(e){console.warn("queued ICE",e);}}pendingCandidates[data.from]=[];}catch(e){console.error("remote description error",e);}}
async function receiveIceCandidate(data){const id=data.from;const pc=peerConnections[id];if(!pc)return;if(!pc.remoteDescription){(pendingCandidates[id]||(pendingCandidates[id]=[])).push(data.candidate);return;}try{await pc.addIceCandidate(new RTCIceCandidate(data.candidate));}catch(e){console.warn("ICE error",e);}}
connectSocket();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(HTML);
    return;
  }
  if (url === "/home.png") {
    const imagePath = path.join(PUBLIC_DIR, "home.png");
    if (fs.existsSync(imagePath)) {
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
      fs.createReadStream(imagePath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("public/home.png 縺後≠繧翫∪縺帙ｓ");
    }
    return;
  }
  if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "ok", live: liveInfo.active, viewers: viewers.size }));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  clients.add(ws);
  ws.clientId = "client_" + Math.random().toString(36).slice(2);
  sendLiveListTo(ws);

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }
    if (data.type === "hello") {
      if (data.clientId) ws.clientId = data.clientId;
      sendLiveListTo(ws);
      return;
    }

    if (data.type === "start_live") {
      if (broadcaster && broadcaster !== ws && broadcaster.readyState === WebSocket.OPEN && liveInfo.active) {
        json(ws, { type: "error", message: "縺吶〒縺ｫ蛻･縺ｮ驟堺ｿ｡閠�′驟堺ｿ｡荳ｭ縺ｧ縺吶�" });
        return;
      }
      broadcaster = ws;
      viewers.clear();
      liveComments.length = 0;
      liveInfo = {
        active: true,
        id: ws.clientId,
        name: String(data.name || "Voice驟堺ｿ｡閠�").slice(0, 40),
        title: String(data.title || "髻ｳ螢ｰ繝ｩ繧､繝夜�菫｡荳ｭ").slice(0, 100),
        startedAt: Date.now(),
        background: BACKGROUNDS[data.background] ? data.background : "moon",
        backgroundImage: "",
        likes: 0
      };
      broadcast({ type: "live_started", lives: getLiveListSafe() });
      return;
    }

    if (data.type === "stop_live") {
      if (broadcaster === ws) {
        broadcast({ type: "live_stopped", lives: [] });
        for (const client of clients) {
          client.joinedLive = false;
          client.broadcasterId = null;
        }
        resetLive();
      }
      return;
    }

    if (data.type === "join_live") {
      if (!liveInfo.active || !broadcaster || broadcaster.readyState !== WebSocket.OPEN || data.liveId !== liveInfo.id) {
        json(ws, { type: "live_unavailable" });
        return;
      }
      if (ws !== broadcaster) {
        viewers.add(ws);
        ws.joinedLive = true;
        ws.broadcasterId = broadcaster.clientId;
        json(ws, { type: "live_state", live: currentLive(), comments: liveComments.slice(-50) });
        json(broadcaster, { type: "viewer_joined", viewerId: ws.clientId });
        broadcastViewerCount();
      }
      return;
    }

    if (data.type === "leave_live") {
      if (viewers.delete(ws)) {
        ws.joinedLive = false;
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) json(broadcaster, { type: "viewer_left", viewerId: ws.clientId });
        broadcastViewerCount();
      }
      return;
    }

    if (data.type === "update_background") {
      if (ws !== broadcaster || !liveInfo.active) return;
      const bg = String(data.background || "moon");
      const image = typeof data.backgroundImage === "string" ? data.backgroundImage : "";
      // Keep uploaded data URLs small enough to relay safely.
      if (image.length > 2800000) {
        json(ws, { type: "error", message: "逕ｻ蜒上′螟ｧ縺阪☆縺弱∪縺吶�2MB莉･荳九�逕ｻ蜒上ｒ驕ｸ繧薙〒縺上□縺輔＞縲�" });
        return;
      }
      liveInfo.background = BACKGROUNDS[bg] ? bg : (bg === "custom" && image ? "custom" : "moon");
      liveInfo.backgroundImage = bg === "custom" ? image : "";
      broadcast({ type: "background_update", background: liveInfo.background, backgroundImage: liveInfo.backgroundImage });
      broadcastLiveList();
      return;
    }

    if (data.type === "comment") {
      if (!liveInfo.active || (ws !== broadcaster && !viewers.has(ws))) return;
      const text = String(data.text || "").trim().slice(0, 180);
      if (!text) return;
      const comment = {
        id: nextCommentId++,
        name: ws === broadcaster ? liveInfo.name : String(data.name || "繝ｪ繧ｹ繝翫�").slice(0, 30),
        text,
        kind: "comment",
        time: Date.now()
      };
      liveComments.push(comment);
      if (liveComments.length > 100) liveComments.shift();
      broadcast({ type: "comment", comment });
      return;
    }

    if (data.type === "like") {
      if (!liveInfo.active || (ws !== broadcaster && !viewers.has(ws))) return;
      liveInfo.likes += 1;
      broadcast({ type: "like_update", likes: liveInfo.likes });
      return;
    }

    if (data.type === "gift") {
      if (!liveInfo.active || (ws !== broadcaster && !viewers.has(ws))) return;
      const allowed = new Set(["繝上�繝�", "譛�", "闃ｱ譚�", "譏�"]);
      const giftName = allowed.has(String(data.giftName)) ? String(data.giftName) : "繧ｮ繝輔ヨ";
      const emojiMap = { "繝上�繝�": "苧", "譛�": "嫌", "闃ｱ譚�": "註", "譏�": "検" };
      const gift = {
        name: ws === broadcaster ? liveInfo.name : String(data.name || "繝ｪ繧ｹ繝翫�").slice(0, 30),
        giftName,
        emoji: emojiMap[giftName]
      };
      broadcast({ type: "gift", ...gift });
      return;
    }

    if (["offer", "answer", "ice_candidate"].includes(data.type)) {
      relaySignaling(ws, data);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    if (viewers.delete(ws)) {
      if (broadcaster && broadcaster.readyState === WebSocket.OPEN) json(broadcaster, { type: "viewer_left", viewerId: ws.clientId });
      broadcastViewerCount();
    }
    if (broadcaster === ws) {
      broadcast({ type: "live_stopped", lives: [] });
      for (const client of clients) {
        client.joinedLive = false;
        client.broadcasterId = null;
      }
      resetLive();
    }
  });
});

function getLiveListSafe() {
  const live = currentLive();
  return live ? [live] : [];
}
function broadcastViewerCount() {
  const count = viewers.size;
  broadcast({ type: "viewer_count", count });
  broadcastLiveList();
}
function relaySignaling(sender, data) {
  if (!data.to) return;
  for (const client of clients) {
    if (client.clientId === data.to && client.readyState === WebSocket.OPEN) {
      // Do not permit unrelated clients to signal peers outside this live.
      const senderAllowed = sender === broadcaster || viewers.has(sender);
      const targetAllowed = client === broadcaster || viewers.has(client);
      if (senderAllowed && targetAllowed) json(client, data);
      return;
    }
  }
}

server.listen(PORT, HOST, () => {
  console.log("=================================");
  console.log("Voice繝昴ちLive server started");
  console.log("HOST:", HOST);
  console.log("PORT:", PORT);
  console.log("=================================");
});"
