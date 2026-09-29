const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

const IMAGE_FILE = path.join(__dirname, "voicebotalive_bg.png");


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
  content="width=device-width,initial-scale=1.0,user-scalable=no,viewport-fit=cover"
>

<meta name="theme-color" content="#03030a">

<title>VoiceボタLive</title>

<style>

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,
body{
  margin:0;
  padding:0;
  width:100%;
  min-height:100%;
  background:#020208;
  color:#fff;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    sans-serif;
}

body{
  overflow-x:hidden;
}

button,
input{
  font-family:inherit;
}

button{
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}

.app{
  width:100%;
  max-width:520px;
  min-height:100vh;
  min-height:100dvh;
  margin:auto;
  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 50% 15%,
      rgba(73,80,255,.16),
      transparent 35%
    ),
    radial-gradient(
      circle at 10% 70%,
      rgba(188,54,255,.12),
      transparent 32%
    ),
    linear-gradient(
      180deg,
      #03030a 0%,
      #080512 48%,
      #020208 100%
    );
}

.app::before{
  content:"";
  position:fixed;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(2,2,8,.40),
      rgba(2,2,8,.86)
    ),
    url("/voicebotalive_bg.png");

  background-size:cover;
  background-position:center;

  opacity:.28;

  pointer-events:none;
  z-index:0;
}

.app::after{
  content:"";
  position:fixed;
  width:320px;
  height:320px;
  left:50%;
  top:8%;
  transform:translateX(-50%);

  background:
    radial-gradient(
      circle,
      rgba(75,105,255,.14),
      transparent 68%
    );

  filter:blur(30px);
  pointer-events:none;
  z-index:0;
}

.app > *{
  position:relative;
  z-index:1;
}


/* =====================================================
   HEADER
===================================================== */

.header{
  height:64px;
  padding:
    0 17px
    env(safe-area-inset-right)
    0 env(safe-area-inset-left);

  display:flex;
  align-items:center;
  justify-content:space-between;

  position:sticky;
  top:0;
  z-index:50;

  background:
    rgba(3,3,10,.76);

  border-bottom:
    1px solid rgba(255,255,255,.08);

  backdrop-filter:blur(22px);
  -webkit-backdrop-filter:blur(22px);
}

.logo{
  font-size:21px;
  font-weight:950;
  letter-spacing:-1px;
}

.logoVoice{
  color:#fff;
}

.logoBota{
  color:#df7cff;
  text-shadow:
    0 0 18px rgba(214,93,255,.55);
}

.logoLive{
  color:#8dbdff;
  text-shadow:
    0 0 18px rgba(80,140,255,.45);
}

.status{
  font-size:10px;
  color:#8d8798;
}


/* =====================================================
   SCREENS
===================================================== */

.screen{
  display:none;

  min-height:
    calc(100vh - 64px);

  min-height:
    calc(100dvh - 64px);

  padding-bottom:95px;
}

.screen.active{
  display:block;
}


/* =====================================================
   HOME
===================================================== */

.home{
  padding-top:8px;
}

.hero{
  position:relative;
  margin:10px 12px 0;

  height:500px;

  border-radius:30px;
  overflow:hidden;

  border:
    1px solid rgba(157,135,255,.30);

  background:
    rgba(3,3,13,.70);

  box-shadow:
    0 25px 80px rgba(0,0,0,.55),
    0 0 55px rgba(71,72,255,.10);
}

.heroBg{
  position:absolute;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(3,4,16,.12),
      rgba(3,2,12,.25) 35%,
      rgba(2,2,9,.94) 100%
    ),
    url("/voicebotalive_bg.png");

  background-size:cover;
  background-position:center;

  transform:scale(1.04);
}

.stars{
  position:absolute;
  inset:0;
  pointer-events:none;
}

.star{
  position:absolute;
  width:4px;
  height:4px;
  border-radius:50%;

  background:#fff;

  box-shadow:
    0 0 9px #9db5ff;

  opacity:.8;

  animation:
    twinkle 2.8s infinite alternate;
}

.star:nth-child(1){
  top:18%;
  left:15%;
}

.star:nth-child(2){
  top:28%;
  left:75%;
  animation-delay:.7s;
}

.star:nth-child(3){
  top:42%;
  left:32%;
  animation-delay:1.1s;
}

.star:nth-child(4){
  top:15%;
  left:57%;
  animation-delay:1.5s;
}

.star:nth-child(5){
  top:48%;
  left:82%;
  animation-delay:2s;
}

@keyframes twinkle{
  from{
    opacity:.25;
    transform:scale(.7);
  }
  to{
    opacity:1;
    transform:scale(1.4);
  }
}

.heroMoon{
  position:absolute;

  width:155px;
  height:155px;

  right:18px;
  top:38px;

  border-radius:50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #fff 0%,
      #e6edff 34%,
      #a9c0ff 60%,
      rgba(112,132,255,.35) 72%,
      transparent 74%
    );

  box-shadow:
    0 0 35px rgba(138,169,255,.65),
    0 0 90px rgba(82,104,255,.35);

  opacity:.95;
}

.heroMoon::before{
  content:"";

  position:absolute;

  width:18px;
  height:18px;

  border-radius:50%;

  left:30px;
  top:48px;

  background:
    rgba(125,145,190,.16);
}

.heroMoon::after{
  content:"";

  position:absolute;

  width:13px;
  height:13px;

  border-radius:50%;

  right:30px;
  top:75px;

  background:
    rgba(100,120,170,.18);
}

.heroBadge{
  position:absolute;

  top:20px;
  left:18px;

  padding:8px 13px;

  border-radius:99px;

  background:
    rgba(6,4,17,.58);

  border:
    1px solid rgba(191,157,255,.40);

  backdrop-filter:blur(12px);

  color:#dca8ff;

  font-size:10px;
  font-weight:900;

  z-index:5;
}

.heroContent{
  position:absolute;

  left:22px;
  right:22px;
  bottom:28px;

  z-index:5;
}

.heroSmall{
  color:#bdafe0;
  font-size:11px;
  font-weight:800;
  margin-bottom:8px;
}

.heroTitle{
  font-size:31px;
  line-height:1.15;
  font-weight:950;
  letter-spacing:-1.5px;

  text-shadow:
    0 4px 22px #000;
}

.heroTitle span{
  color:#b879ff;

  text-shadow:
    0 0 22px rgba(180,100,255,.55);
}

.heroDescription{
  margin-top:10px;

  color:#c5bdd0;

  font-size:12px;
  line-height:1.6;
}

.heroButton{
  margin-top:18px;

  width:100%;
  height:54px;

  border:0;
  border-radius:18px;

  color:#fff;

  font-size:14px;
  font-weight:950;

  background:
    linear-gradient(
      100deg,
      #36bfff,
      #745eff 48%,
      #dc55d2
    );

  box-shadow:
    0 10px 30px rgba(94,86,255,.38),
    0 0 25px rgba(133,75,255,.18);
}

.heroButton:active{
  transform:scale(.97);
}


/* =====================================================
   SECTION
===================================================== */

.section{
  margin:18px 13px 0;
}

.sectionHeader{
  display:flex;
  justify-content:space-between;
  align-items:center;

  margin-bottom:11px;
}

.sectionTitle{
  font-size:17px;
  font-weight:950;
}

.sectionMore{
  color:#988ca8;
  font-size:10px;
}


/* =====================================================
   LIVE CARD
===================================================== */

.liveCard{
  position:relative;

  display:flex;
  gap:12px;
  align-items:center;

  padding:11px;

  margin-bottom:9px;

  border-radius:19px;

  background:
    linear-gradient(
      135deg,
      rgba(30,22,48,.90),
      rgba(11,9,20,.94)
    );

  border:
    1px solid rgba(170,126,255,.16);

  box-shadow:
    0 10px 30px rgba(0,0,0,.22);
}

.liveThumb{
  width:96px;
  height:74px;

  flex-shrink:0;

  border-radius:15px;
  overflow:hidden;

  background:#171127;

  position:relative;
}

.liveThumb img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.liveDot{
  position:absolute;
  left:7px;
  top:7px;

  padding:3px 6px;

  border-radius:6px;

  background:#ec396e;

  font-size:8px;
  font-weight:950;
}

.liveInfo{
  min-width:0;
  flex:1;
}

.liveName{
  font-size:13px;
  font-weight:950;

  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.liveTitle{
  color:#9990a5;

  font-size:11px;

  margin-top:5px;

  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.watchBtn{
  flex-shrink:0;

  border:0;
  border-radius:12px;

  padding:10px 13px;

  color:#fff;

  font-size:11px;
  font-weight:950;

  background:
    linear-gradient(
      100deg,
      #596eff,
      #a85dff
    );
}

.empty{
  padding:27px 15px;

  text-align:center;

  color:#777080;

  font-size:12px;

  border-radius:18px;

  border:
    1px solid rgba(255,255,255,.05);

  background:
    rgba(255,255,255,.025);
}


/* =====================================================
   FEATURES
===================================================== */

.featureGrid{
  display:grid;

  grid-template-columns:
    repeat(2,1fr);

  gap:9px;
}

.feature{
  min-height:120px;

  padding:16px;

  border-radius:18px;

  background:
    linear-gradient(
      145deg,
      rgba(24,18,38,.88),
      rgba(9,7,16,.90)
    );

  border:
    1px solid rgba(255,255,255,.06);
}

.featureIcon{
  font-size:24px;
  margin-bottom:10px;
}

.featureTitle{
  font-size:12px;
  font-weight:950;
}

.featureText{
  margin-top:5px;

  color:#83798d;

  font-size:10px;

  line-height:1.55;
}


/* =====================================================
   SETUP
===================================================== */

.card{
  margin:15px 13px;

  padding:18px;

  border-radius:22px;

  background:
    linear-gradient(
      145deg,
      rgba(23,17,35,.93),
      rgba(8,7,15,.94)
    );

  border:
    1px solid rgba(172,126,255,.14);

  box-shadow:
    0 15px 40px rgba(0,0,0,.25);
}

.cardTitle{
  font-size:18px;
  font-weight:950;
  margin-bottom:16px;
}

.label{
  display:block;

  color:#a69cad;

  font-size:11px;

  margin:
    13px 0 6px;
}

.input{
  width:100%;

  padding:14px;

  border-radius:14px;

  border:
    1px solid #3a2b49;

  background:
    rgba(2,2,9,.70);

  color:#fff;

  outline:none;
}

.input:focus{
  border-color:#9a70ff;

  box-shadow:
    0 0 0 3px rgba(145,93,255,.11);
}

.preview{
  width:100%;
  height:190px;

  margin-top:8px;

  border-radius:17px;

  overflow:hidden;

  display:grid;
  place-items:center;

  border:
    1px dashed #57406d;

  background:
    rgba(5,3,12,.7);

  color:#80748d;

  font-size:12px;
}

.preview img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.btn{
  border:0;

  border-radius:15px;

  padding:13px 17px;

  color:#fff;

  font-weight:950;

  background:
    linear-gradient(
      100deg,
      #42bfff,
      #765eff,
      #df54ca
    );

  box-shadow:
    0 8px 22px rgba(106,80,255,.24);
}

.btn:active{
  transform:scale(.97);
}

.btn.dark{
  background:
    rgba(255,255,255,.055);

  border:
    1px solid rgba(255,255,255,.12);

  box-shadow:none;
}


/* =====================================================
   LIVE SCREEN
===================================================== */

.liveScreen{
  min-height:
    calc(100vh - 64px);

  min-height:
    calc(100dvh - 64px);

  padding-bottom:90px;
}

.liveCover{
  height:390px;

  position:relative;

  overflow:hidden;

  background:#080611;
}

.liveCover img{
  width:100%;
  height:100%;

  object-fit:cover;

  opacity:.86;
}

.liveCover::after{
  content:"";

  position:absolute;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.32),
      transparent 35%,
      rgba(0,0,0,.94)
    );
}

.liveTop{
  position:absolute;

  top:15px;
  left:15px;
  right:15px;

  z-index:5;

  display:flex;
  justify-content:space-between;
  align-items:center;
}

.hostInfo{
  display:flex;
  align-items:center;
  gap:9px;
}

.avatar{
  width:43px;
  height:43px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #45c8ff,
      #bb55ff
    );

  border:
    2px solid rgba(255,255,255,.4);

  box-shadow:
    0 0 22px rgba(128,83,255,.45);
}

.hostName{
  font-size:14px;
  font-weight:950;
}

.liveBadge{
  display:inline-block;

  margin-top:3px;

  padding:4px 7px;

  border-radius:6px;

  background:#e93671;

  font-size:8px;
  font-weight:950;
}

.viewerBadge{
  padding:8px 12px;

  border-radius:99px;

  background:
    rgba(0,0,0,.48);

  border:
    1px solid rgba(255,255,255,.14);

  backdrop-filter:blur(9px);

  font-size:11px;
}

.liveTitleOverlay{
  position:absolute;

  left:17px;
  right:17px;
  bottom:20px;

  z-index:5;
}

.liveTitleMain{
  font-size:23px;
  font-weight:950;

  text-shadow:
    0 3px 18px #000;
}

.liveTitleSub{
  margin-top:5px;

  color:#c5bbcf;

  font-size:11px;
}

.audioBox{
  margin:11px 13px 0;

  padding:13px;

  border-radius:18px;

  background:
    rgba(17,12,25,.94);

  border:
    1px solid #34243f;
}

.audioStatus{
  margin-bottom:9px;

  color:#aaa0b0;

  font-size:11px;
}

.audioStatus.ok{
  color:#72e3a4;
}

.audioStatus.error{
  color:#ff7695;
}

.audioButton{
  width:100%;

  padding:13px;

  border:0;

  border-radius:14px;

  color:#fff;

  font-weight:950;

  background:
    linear-gradient(
      90deg,
      #5d7cff,
      #b45cff
    );
}

.comments{
  min-height:130px;
  max-height:270px;

  overflow-y:auto;

  padding:10px 14px;
}

.comment{
  margin:8px 0;

  padding:8px 10px;

  border-radius:12px;

  background:
    rgba(255,255,255,.035);

  font-size:12px;
}

.commentName{
  color:#d28cff;

  font-weight:950;

  margin-right:5px;
}


/* =====================================================
   CHAT
===================================================== */

.chatBar{
  position:fixed;

  bottom:0;
  left:50%;

  transform:translateX(-50%);

  width:100%;
  max-width:520px;

  min-height:74px;

  padding:
    9px
    10px
    calc(9px + env(safe-area-inset-bottom));

  display:flex;
  align-items:center;
  gap:6px;

  background:
    rgba(6,5,12,.97);

  backdrop-filter:blur(20px);

  border-top:
    1px solid #281c34;

  z-index:80;
}

.chatInput{
  flex:1;
  min-width:0;

  padding:12px;

  border-radius:14px;

  border:
    1px solid #3b2b49;

  background:#0c0910;

  color:#fff;

  outline:none;
}

.iconBtn{
  width:43px;
  height:43px;

  flex-shrink:0;

  border-radius:13px;

  border:
    1px solid #392a49;

  background:#15101c;

  color:#fff;

  font-size:17px;
}


/* =====================================================
   BOTTOM NAV
===================================================== */

.nav{
  position:fixed;

  bottom:0;
  left:50%;

  transform:translateX(-50%);

  width:100%;
  max-width:520px;

  height:74px;

  padding:
    3px 6px
    env(safe-area-inset-bottom);

  display:flex;
  align-items:center;
  justify-content:space-around;

  background:
    rgba(7,5,13,.97);

  border-top:
    1px solid rgba(255,255,255,.08);

  backdrop-filter:blur(22px);

  z-index:40;
}

.nav button{
  position:relative;

  width:20%;

  height:68px;

  border:0;

  background:transparent;

  color:#756d80;

  font-size:9px;

  font-weight:800;
}

.nav button span{
  display:block;

  font-size:20px;

  margin-bottom:3px;
}

.nav button.active{
  color:#d98aff;
}

.nav button.active::after{
  content:"";

  position:absolute;

  left:50%;
  bottom:5px;

  width:22px;
  height:3px;

  transform:translateX(-50%);

  border-radius:99px;

  background:
    linear-gradient(
      90deg,
      #58bfff,
      #d866ff
    );

  box-shadow:
    0 0 10px rgba(193,95,255,.65);
}


/* =====================================================
   CENTER LIVE BUTTON
===================================================== */

.navLiveButton{
  position:relative !important;

  margin-top:-29px;

  width:62px !important;
  height:62px !important;

  border-radius:50% !important;

  background:
    linear-gradient(
      145deg,
      #52c8ff,
      #765cff 50%,
      #dc55ce
    ) !important;

  border:
    5px solid #08060e !important;

  box-shadow:
    0 0 25px rgba(105,93,255,.58),
    0 7px 25px rgba(0,0,0,.55);

  color:#fff !important;

  font-size:9px !important;
  font-weight:950;
}

.navLiveButton span{
  font-size:25px !important;
  margin:0 !important;
}

.navLiveButton::after{
  display:none !important;
}


/* =====================================================
   PROFILE
===================================================== */

.profileHero{
  padding:28px 10px;

  text-align:center;
}

.profileAvatar{
  width:92px;
  height:92px;

  margin:0 auto 13px;

  border-radius:50%;

  display:grid;
  place-items:center;

  font-size:39px;

  background:
    linear-gradient(
      135deg,
      #5ccfff,
      #bd55ff
    );

  border:
    3px solid rgba(255,255,255,.25);

  box-shadow:
    0 0 35px rgba(131,79,255,.4);
}

.profileName{
  font-size:22px;
  font-weight:950;
}

.profileSub{
  margin-top:5px;

  color:#958c9d;

  font-size:11px;
}


/* =====================================================
   SEARCH
===================================================== */

.searchBox{
  margin:15px 13px;

  position:relative;
}

.searchInput{
  width:100%;

  padding:15px 17px 15px 44px;

  border-radius:17px;

  border:
    1px solid rgba(166,125,255,.18);

  background:
    rgba(15,10,23,.92);

  color:#fff;

  outline:none;
}

.searchIcon{
  position:absolute;

  left:16px;
  top:50%;

  transform:translateY(-50%);

  color:#9b91a5;

  font-size:18px;
}


/* =====================================================
   NOTIFICATION
===================================================== */

.notice{
  display:flex;

  gap:12px;

  padding:14px;

  margin-bottom:9px;

  border-radius:17px;

  background:
    rgba(255,255,255,.035);

  border:
    1px solid rgba(255,255,255,.055);
}

.noticeIcon{
  width:40px;
  height:40px;

  flex-shrink:0;

  display:grid;
  place-items:center;

  border-radius:13px;

  background:
    linear-gradient(
      135deg,
      #4e91ff,
      #b854ff
    );
}

.noticeTitle{
  font-size:12px;
  font-weight:950;
}

.noticeText{
  margin-top:4px;

  color:#8e8597;

  font-size:10px;
}


/* =====================================================
   GIFTS
===================================================== */

.modal{
  position:fixed;
  inset:0;

  display:none;

  align-items:flex-end;
  justify-content:center;

  background:
    rgba(0,0,0,.75);

  z-index:120;
}

.modal.show{
  display:flex;
}

.sheet{
  width:100%;
  max-width:520px;

  padding:
    20px
    20px
    calc(20px + env(safe-area-inset-bottom));

  border-radius:
    26px 26px 0 0;

  background:
    linear-gradient(
      180deg,
      #181021,
      #0d0913
    );

  border:
    1px solid #443151;
}

.gifts{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:8px;

  margin-top:15px;
}

.gift{
  padding:14px;

  border-radius:15px;

  border:
    1px solid #39294a;

  background:#191221;

  color:#fff;
}

.giftIcon{
  display:block;

  font-size:27px;

  margin-bottom:5px;
}

.small{
  color:#9990a0;

  font-size:11px;
}


/* =====================================================
   TOAST
===================================================== */

.toast{
  position:fixed;

  left:50%;
  bottom:95px;

  transform:translateX(-50%);

  padding:10px 16px;

  border-radius:99px;

  background:#21172c;

  border:
    1px solid #604478;

  font-size:11px;

  display:none;

  z-index:200;
}

.toast.show{
  display:block;
}


/* =====================================================
   MOBILE
===================================================== */

@media(max-width:380px){

  .hero{
    height:460px;
  }

  .heroTitle{
    font-size:27px;
  }

  .heroMoon{
    width:125px;
    height:125px;
  }

  .liveCover{
    height:340px;
  }

}

</style>
</head>


<body>

<div class="app">


<header class="header">

  <div class="logo">
    <span class="logoVoice">Voice</span><span class="logoBota">ボタ</span><span class="logoLive">Live</span>
  </div>

  <div id="status" class="status">
    ● 接続中
  </div>

</header>


<!-- =====================================================
     HOME
===================================================== -->

<section id="home" class="screen active home">

  <div class="hero">

    <div class="heroBg"></div>

    <div class="stars">

      <div class="star"></div>
      <div class="star"></div>
      <div class="star"></div>
      <div class="star"></div>
      <div class="star"></div>

    </div>

    <div class="heroMoon"></div>

    <div class="heroBadge">
      🌙 月光花 × Voice
    </div>

    <div class="heroContent">

      <div class="heroSmall">
        声でつながる、夜のライブ空間
      </div>

      <div class="heroTitle">
        あなたの声が、<br>
        <span>誰かの光</span>になる。
      </div>

      <div class="heroDescription">
        月明かりの下で、話して、聴いて、笑って。<br>
        VoiceボタLiveでは声でみんなとつながれる。
      </div>

      <button
        class="heroButton"
        onclick="openHost()"
      >
        🎙️　配信をはじめる
      </button>

    </div>

  </div>


  <div class="section">

    <div class="sectionHeader">

      <div class="sectionTitle">
        🔴 ライブ中
      </div>

      <div class="sectionMore">
        LIVE
      </div>

    </div>

    <div id="liveList">

      <div class="empty">
        配信を確認しています...
      </div>

    </div>

  </div>


  <div class="section">

    <div class="sectionHeader">

      <div class="sectionTitle">
        ✨ VoiceボタLive
      </div>

    </div>

    <div class="featureGrid">

      <div class="feature">
        <div class="featureIcon">🎙️</div>
        <div class="featureTitle">声でつながる</div>
        <div class="featureText">
          声を中心にしたリアルタイムライブ。
        </div>
      </div>

      <div class="feature">
        <div class="featureIcon">⚡</div>
        <div class="featureTitle">低遅延</div>
        <div class="featureText">
          WebRTCでリアルタイム音声。
        </div>
      </div>

      <div class="feature">
        <div class="featureIcon">🎁</div>
        <div class="featureTitle">ギフト</div>
        <div class="featureText">
          配信者へ気持ちを届けよう。
        </div>
      </div>

      <div class="feature">
        <div class="featureIcon">💬</div>
        <div class="featureTitle">コメント</div>
        <div class="featureText">
          みんなでライブを楽しめる。
        </div>
      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     SEARCH
===================================================== -->

<section id="search" class="screen">

  <div class="searchBox">

    <div class="searchIcon">
      🔍
    </div>

    <input
      class="searchInput"
      placeholder="配信者やライブを検索"
    >

  </div>

  <div class="section">

    <div class="sectionTitle">
      🌙 おすすめ
    </div>

    <div style="margin-top:12px">

      <div class="empty">
        配信を検索できます
      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     SETUP
===================================================== -->

<section id="setup" class="screen">

  <div class="card">

    <div class="cardTitle">
      🎙️ 配信を準備する
    </div>

    <label class="label">
      配信者名
    </label>

    <input
      id="hostName"
      class="input"
      value="ぼたもち"
      maxlength="30"
    >

    <label class="label">
      配信タイトル
    </label>

    <input
      id="liveTitle"
      class="input"
      value="月光の夜に雑談しよ🌙"
      maxlength="80"
    >

    <label class="label">
      配信画像
    </label>

    <input
      id="imageFile"
      class="input"
      type="file"
      accept="image/*"
    >

    <div id="preview" class="preview">
      🌙 月光花の画像を設定
    </div>

    <br>

    <button
      class="btn"
      onclick="startBroadcast()"
    >
      🎙️ 配信開始
    </button>

    <button
      class="btn dark"
      onclick="showScreen('home')"
      style="margin-left:5px"
    >
      戻る
    </button>

  </div>

</section>


<!-- =====================================================
     LIVE
===================================================== -->

<section
  id="live"
  class="screen"
  style="padding:0"
>

  <div class="liveScreen">

    <div class="liveCover">

      <img
        id="liveImage"
        style="display:none"
      >

      <div class="liveTop">

        <div class="hostInfo">

          <div class="avatar">
            🎙️
          </div>

          <div>

            <div
              id="liveName"
              class="hostName"
            >
              配信者
            </div>

            <div class="liveBadge">
              LIVE
            </div>

          </div>

        </div>

        <div class="viewerBadge">
          👥
          <span id="viewerCount">0</span>
        </div>

      </div>

      <div class="liveTitleOverlay">

        <div
          id="liveTitleDisplay"
          class="liveTitleMain"
        >
          ライブ配信
        </div>

        <div class="liveTitleSub">
          🌙 VoiceボタLive
        </div>

      </div>

    </div>


    <div class="audioBox">

      <div
        id="audioStatus"
        class="audioStatus"
      >
        🔊 音声接続を待っています
      </div>

      <button
        id="audioButton"
        class="audioButton"
        onclick="startAudio()"
      >
        🔊 音声を開始
      </button>

    </div>


    <div
      id="comments"
      class="comments"
    ></div>

  </div>


  <div class="chatBar">

    <input
      id="chatInput"
      class="chatInput"
      placeholder="コメントを入力..."
      maxlength="200"
    >

    <button
      class="iconBtn"
      onclick="sendChat()"
    >
      ➤
    </button>

    <button
      class="iconBtn"
      onclick="openGifts()"
    >
      🎁
    </button>

    <button
      id="hostEndButton"
      class="iconBtn"
      onclick="stopBroadcast()"
      style="display:none"
    >
      ×
    </button>

  </div>

</section>


<!-- =====================================================
     NOTICE
===================================================== -->

<section id="notice" class="screen">

  <div class="card">

    <div class="cardTitle">
      🔔 お知らせ
    </div>

    <div class="notice">

      <div class="noticeIcon">
        🌙
      </div>

      <div>

        <div class="noticeTitle">
          VoiceボタLiveへようこそ
        </div>

        <div class="noticeText">
          声でつながる、新しいライブ空間。
        </div>

      </div>

    </div>


    <div class="notice">

      <div class="noticeIcon">
        ⚡
      </div>

      <div>

        <div class="noticeTitle">
          低遅延音声
        </div>

        <div class="noticeText">
          WebRTCによるリアルタイム音声を使用しています。
        </div>

      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     PROFILE
===================================================== -->

<section id="profile" class="screen">

  <div class="card">

    <div class="profileHero">

      <div class="profileAvatar">
        🎙️
      </div>

      <div
        id="profileName"
        class="profileName"
      >
        ぼたもち
      </div>

      <div class="profileSub">
        VoiceボタLive
      </div>

    </div>

  </div>


  <div class="card">

    <div class="cardTitle">
      🌙 VoiceボタLive
    </div>

    <div class="small">
      声でつながる、みんなの居場所。
    </div>

  </div>

</section>


<!-- =====================================================
     NAV
===================================================== -->

<nav class="nav">

  <button
    id="navHome"
    onclick="showScreen('home')"
  >
    <span>⌂</span>
    ホーム
  </button>

  <button
    id="navSearch"
    onclick="showScreen('search')"
  >
    <span>⌕</span>
    探す
  </button>

  <button
    class="navLiveButton"
    id="navLive"
    onclick="openHost()"
  >
    <span>🎙️</span>
  </button>

  <button
    id="navNotice"
    onclick="showScreen('notice')"
  >
    <span>♡</span>
    お知らせ
  </button>

  <button
    id="navProfile"
    onclick="showScreen('profile')"
  >
    <span>♙</span>
    マイページ
  </button>

</nav>


<!-- =====================================================
     GIFTS
===================================================== -->

<div
  id="giftModal"
  class="modal"
>

  <div class="sheet">

    <div
      style="
      display:flex;
      justify-content:space-between;
      align-items:center
      "
    >

      <b>🎁 ギフト</b>

      <button
        class="btn dark"
        onclick="closeGifts()"
      >
        閉じる
      </button>

    </div>

    <div class="gifts">

      <button
        class="gift"
        onclick="sendGift('🌙 月光花')"
      >
        <span class="giftIcon">🌙</span>
        月光花
      </button>

      <button
        class="gift"
        onclick="sendGift('💜 ハート')"
      >
        <span class="giftIcon">💜</span>
        ハート
      </button>

      <button
        class="gift"
        onclick="sendGift('✨ 星の雫')"
      >
        <span class="giftIcon">✨</span>
        星の雫
      </button>

    </div>

  </div>

</div>


<div id="toast" class="toast"></div>


<script>

/* =====================================================
   GLOBAL
===================================================== */

let socket=null;

let role=null;

let localStream=null;

let viewerPeer=null;

let viewerPeers=new Map();

let customImage="";

let currentLive=false;

let currentMeta=null;

let audioStarted=false;


/* =====================================================
   WEBRTC
===================================================== */

const rtcConfig={

  bundlePolicy:"max-bundle",

  rtcpMuxPolicy:"require",

  iceCandidatePoolSize:10,

  iceServers:[
    {
      urls:"stun:stun.l.google.com:19302"
    },
    {
      urls:"stun:stun1.l.google.com:19302"
    }
  ]

};


/* =====================================================
   BASIC
===================================================== */

function $(id){
  return document.getElementById(id);
}


function showScreen(id){

  document
    .querySelectorAll(".screen")
    .forEach(x=>{
      x.classList.remove("active");
    });

  const el=$(id);

  if(el){
    el.classList.add("active");
  }


  document
    .querySelectorAll(".nav button")
    .forEach(x=>{
      x.classList.remove("active");
    });


  if(id==="home"){
    $("navHome").classList.add("active");
  }

  if(id==="search"){
    $("navSearch").classList.add("active");
  }

  if(id==="notice"){
    $("navNotice").classList.add("active");
  }

  if(id==="profile"){
    $("navProfile").classList.add("active");
  }

}


function setAudioStatus(text,type){

  const el=$("audioStatus");

  if(!el){
    return;
  }

  el.textContent=text;

  el.className="audioStatus";

  if(type){
    el.classList.add(type);
  }

}


/* =====================================================
   WEBSOCKET
===================================================== */

function connectSocket(){

  if(
    socket &&
    (
      socket.readyState===WebSocket.OPEN ||
      socket.readyState===WebSocket.CONNECTING
    )
  ){
    return;
  }


  const protocol=
    location.protocol==="https:"
      ? "wss"
      : "ws";


  socket=
    new WebSocket(
      protocol+
      "://"+
      location.host
    );


  socket.binaryType="arraybuffer";


  socket.onopen=()=>{

    $("status").textContent=
      "● 接続済み";

    send({
      type:"hello"
    });

  };


  socket.onerror=()=>{

    $("status").textContent=
      "● 接続エラー";

  };


  socket.onclose=()=>{

    $("status").textContent=
      "● 切断";

    setTimeout(
      connectSocket,
      1500
    );

  };


  socket.onmessage=(event)=>{

    try{

      const message=
        JSON.parse(event.data);

      handleMessage(message);

    }catch(error){

      console.error(error);

    }

  };

}


function send(data){

  if(
    socket &&
    socket.readyState===WebSocket.OPEN
  ){

    socket.send(
      JSON.stringify(data)
    );

  }

}


/* =====================================================
   SERVER MESSAGE
===================================================== */

function handleMessage(m){

  if(m.type==="state"){

    currentLive=!!m.live;

    currentMeta=m.meta||null;

    updateLiveList();

    return;

  }


  if(m.type==="host-ready"){

    $("status").textContent="● LIVE";

    setAudioStatus(
      "🎙️ 配信中・低遅延音声送信中",
      "ok"
    );

    return;

  }


  if(m.type==="live-meta"){

    currentMeta=m.meta||null;

    currentLive=true;

    updateLiveList();

    if(role!=="host"){
      updateLiveInfo();
    }

    return;

  }


  if(m.type==="viewer"){

    if(role==="host"){
      createOffer(m.id);
    }

    return;

  }


  if(m.type==="offer"){

    receiveOffer(m);

    return;

  }


  if(m.type==="answer"){

    const peer=
      viewerPeers.get(m.from);

    if(peer){

      peer
        .setRemoteDescription(m.sdp)
        .catch(console.error);

    }

    return;

  }


  if(m.type==="ice"){

    let peer=null;

    if(role==="host"){
      peer=viewerPeers.get(m.from);
    }else{
      peer=viewerPeer;
    }

    if(peer && m.candidate){

      peer
        .addIceCandidate(m.candidate)
        .catch(()=>{});

    }

    return;

  }


  if(m.type==="count"){

    $("viewerCount").textContent=m.n;

    return;

  }


  if(m.type==="chat"){

    addComment(
      m.name,
      m.text
    );

    return;

  }


  if(m.type==="gift"){

    addComment(
      m.name,
      "🎁 "+m.gift
    );

    return;

  }


  if(m.type==="live-ended"){

    currentLive=false;

    currentMeta=null;

    updateLiveList();

    if(role!=="host"){

      closeViewerPeer();

      showScreen("home");

      setAudioStatus(
        "配信が終了しました",
        "error"
      );

    }

    return;

  }


  if(m.type==="error"){

    alert(
      m.text ||
      "エラーが発生しました"
    );

  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function updateLiveList(){

  const list=$("liveList");

  if(!list){
    return;
  }

  list.innerHTML="";


  if(!currentLive){

    list.innerHTML=
      '<div class="empty">'+
      '現在配信中のライブはありません'+
      '</div>';

    return;

  }


  const meta=currentMeta||{};


  const card=
    document.createElement("div");

  card.className="liveCard";


  const thumb=
    document.createElement("div");

  thumb.className="liveThumb";


  const img=
    document.createElement("img");

  img.src=
    meta.image ||
    "/voicebotalive_bg.png";

  thumb.appendChild(img);


  const dot=
    document.createElement("div");

  dot.className="liveDot";

  dot.textContent="LIVE";

  thumb.appendChild(dot);


  const info=
    document.createElement("div");

  info.className="liveInfo";


  const name=
    document.createElement("div");

  name.className="liveName";

  name.textContent=
    meta.name ||
    "配信者";


  const title=
    document.createElement("div");

  title.className="liveTitle";

  title.textContent=
    meta.title ||
    "ライブ配信";


  info.appendChild(name);

  info.appendChild(title);


  const button=
    document.createElement("button");

  button.className="watchBtn";

  button.textContent="見る";

  button.onclick=joinLive;


  card.appendChild(thumb);

  card.appendChild(info);

  card.appendChild(button);

  list.appendChild(card);

}


/* =====================================================
   LIVE INFO
===================================================== */

function updateLiveInfo(){

  const meta=currentMeta||{};


  $("liveName").textContent=
    meta.name ||
    "配信者";


  $("liveTitleDisplay").textContent=
    meta.title ||
    "ライブ配信";


  $("liveImage").src=
    meta.image ||
    "/voicebotalive_bg.png";

  $("liveImage").style.display="block";

}


/* =====================================================
   BROADCAST
===================================================== */

async function startBroadcast(){

  if(role==="host"){
    showScreen("live");
    return;
  }


  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ){

    alert(
      "このブラウザではマイクを利用できません。HTTPSで開いてください。"
    );

    return;

  }


  try{

    localStream=
      await navigator.mediaDevices
        .getUserMedia({

          audio:{
            echoCancellation:false,
            noiseSuppression:false,
            autoGainControl:false,
            channelCount:1,
            sampleRate:48000,
            sampleSize:16,
            latency:0
          },

          video:false

        });

  }catch(error){

    console.error(error);

    alert(
      "マイクを取得できませんでした。\\n\\nブラウザのマイク許可を確認してください。"
    );

    return;

  }


  role="host";


  const name=
    (
      $("hostName").value ||
      "ぼたもち"
    ).trim();


  const title=
    (
      $("liveTitle").value ||
      "月光の夜に雑談しよ🌙"
    ).trim();


  $("profileName").textContent=name;

  $("liveName").textContent=name;

  $("liveTitleDisplay").textContent=title;

  $("hostEndButton").style.display="block";


  send({
    type:"join-host",
    name:name
  });


  showScreen("live");


  setAudioStatus(
    "🎙️ マイク取得成功・低遅延配信中",
    "ok"
  );


  setTimeout(()=>{

    send({

      type:"set-meta",

      meta:{
        name:name,
        title:title,
        image:customImage
      }

    });

  },100);

}


/* =====================================================
   JOIN LIVE
===================================================== */

function joinLive(){

  if(!currentLive){

    showToast(
      "現在配信中ではありません"
    );

    return;

  }


  role="viewer";

  audioStarted=false;

  closeViewerPeer();


  $("audioButton").style.display="block";


  setAudioStatus(
    "🔊 配信に接続しています...",
    ""
  );


  updateLiveInfo();

  $("comments").innerHTML="";

  showScreen("live");


  send({
    type:"join-viewer"
  });

}


/* =====================================================
   HOST OFFER
===================================================== */

async function createOffer(viewerId){

  if(!localStream){
    return;
  }


  const peer=
    new RTCPeerConnection(
      rtcConfig
    );


  viewerPeers.set(
    viewerId,
    peer
  );


  localStream
    .getAudioTracks()
    .forEach(track=>{

      const sender=
        peer.addTrack(
          track,
          localStream
        );


      try{

        const params=
          sender.getParameters();

        if(
          params.encodings &&
          params.encodings.length
        ){

          params.encodings[0].maxBitrate=
            48000;

        }

        sender
          .setParameters(params)
          .catch(()=>{});

      }catch(e){}

    });


  peer.onicecandidate=
    event=>{

      if(event.candidate){

        send({

          type:"ice",

          to:viewerId,

          candidate:event.candidate

        });

      }

    };


  peer.onconnectionstatechange=
    ()=>{

      console.log(
        "HOST PEER",
        viewerId,
        peer.connectionState
      );

      if(
        peer.connectionState==="failed" ||
        peer.connectionState==="closed"
      ){

        viewerPeers.delete(viewerId);

      }

    };


  try{

    const offer=
      await peer.createOffer({
        offerToReceiveAudio:false,
        offerToReceiveVideo:false
      });


    offer.sdp=
      optimizeOpusSDP(
        offer.sdp
      );


    await peer.setLocalDescription(
      offer
    );


    send({

      type:"offer",

      to:viewerId,

      sdp:peer.localDescription

    });

  }catch(error){

    console.error(
      "CREATE OFFER ERROR",
      error
    );

  }

}


/* =====================================================
   OPUS
===================================================== */

function optimizeOpusSDP(sdp){

  if(!sdp){
    return sdp;
  }


  const lines=
    sdp.split("\\r\\n");


  let opusPayload=null;


  for(
    let i=0;
    i<lines.length;
    i++
  ){

    if(
      lines[i].startsWith("a=rtpmap:") &&
      lines[i]
        .toLowerCase()
        .includes("opus/48000")
    ){

      const match=
        lines[i]
          .match(/^a=rtpmap:(\\d+)/);

      if(match){

        opusPayload=match[1];

        break;

      }

    }

  }


  if(!opusPayload){
    return sdp;
  }


  const fmtp=
    "a=fmtp:"+
    opusPayload+
    " minptime=10;maxptime=10;useinbandfec=1;stereo=0;usedtx=0";


  let found=false;


  for(
    let i=0;
    i<lines.length;
    i++
  ){

    if(
      lines[i].startsWith(
        "a=fmtp:"+opusPayload
      )
    ){

      lines[i]=fmtp;

      found=true;

      break;

    }

  }


  if(!found){

    const index=
      lines.findIndex(
        line=>
          line.startsWith(
            "a=rtpmap:"+opusPayload
          )
      );

    if(index>=0){

      lines.splice(
        index+1,
        0,
        fmtp
      );

    }

  }


  return lines.join("\\r\\n");

}


/* =====================================================
   VIEWER
===================================================== */

async function receiveOffer(m){

  closeViewerPeer();


  viewerPeer=
    new RTCPeerConnection(
      rtcConfig
    );


  setAudioStatus(
    "🔊 WebRTC低遅延接続中...",
    ""
  );


  viewerPeer.onicecandidate=
    event=>{

      if(event.candidate){

        send({

          type:"ice",

          candidate:event.candidate

        });

      }

    };


  viewerPeer.oniceconnectionstatechange=
    ()=>{

      const state=
        viewerPeer.iceConnectionState;


      if(
        state==="connected" ||
        state==="completed"
      ){

        setAudioStatus(
          "🟢 低遅延音声回線に接続",
          "ok"
        );

      }


      if(state==="checking"){

        setAudioStatus(
          "🔵 音声回線を確認中...",
          ""
        );

      }


      if(state==="disconnected"){

        setAudioStatus(
          "🟡 回線が不安定です",
          ""
        );

      }


      if(state==="failed"){

        setAudioStatus(
          "🔴 WebRTC接続失敗",
          "error"
        );

      }

    };


  viewerPeer.ontrack=
    event=>{

      let audio=
        document.getElementById(
          "remoteAudio"
        );


      if(!audio){

        audio=
          document.createElement("audio");

        audio.id="remoteAudio";

        audio.autoplay=true;

        audio.playsInline=true;

        audio.controls=false;

        audio.style.position="fixed";
        audio.style.width="1px";
        audio.style.height="1px";
        audio.style.opacity="0.01";
        audio.style.pointerEvents="none";
        audio.style.left="-10px";
        audio.style.top="-10px";

        document.body.appendChild(audio);

      }


      const stream=
        event.streams &&
        event.streams[0]
          ? event.streams[0]
          : new MediaStream([
              event.track
            ]);


      audio.srcObject=stream;


      try{

        const receiver=
          viewerPeer
            .getReceivers()
            .find(
              r=>
                r.track &&
                r.track.kind==="audio"
            );


        if(receiver){

          if(
            "playoutDelayHint" in receiver
          ){

            try{
              receiver.playoutDelayHint=0;
            }catch(e){}

          }

          if(
            "jitterBufferTarget" in receiver
          ){

            try{
              receiver.jitterBufferTarget=0;
            }catch(e){}

          }

        }

      }catch(e){}


      setAudioStatus(
        "🟢 音声を受信しています",
        "ok"
      );


      if(audioStarted){

        audio
          .play()
          .catch(console.log);

      }

    };


  try{

    await viewerPeer.setRemoteDescription(
      m.sdp
    );


    const answer=
      await viewerPeer.createAnswer();


    answer.sdp=
      optimizeOpusSDP(
        answer.sdp
      );


    await viewerPeer.setLocalDescription(
      answer
    );


    send({

      type:"answer",

      sdp:
        viewerPeer.localDescription

    });

  }catch(error){

    console.error(
      "VIEWER ERROR",
      error
    );


    setAudioStatus(
      "🔴 音声接続エラー",
      "error"
    );

  }

}


/* =====================================================
   AUDIO START
===================================================== */

async function startAudio(){

  audioStarted=true;


  let audio=
    document.getElementById(
      "remoteAudio"
    );


  if(!audio){

    audio=
      document.createElement("audio");

    audio.id="remoteAudio";

    audio.autoplay=true;

    audio.playsInline=true;

    audio.controls=false;

    audio.style.position="fixed";
    audio.style.width="1px";
    audio.style.height="1px";
    audio.style.opacity="0.01";
    audio.style.pointerEvents="none";
    audio.style.left="-10px";
    audio.style.top="-10px";

    document.body.appendChild(audio);

  }


  try{

    await audio.play();


    $("audioButton").textContent=
      "🔊 音声再生中";


    setAudioStatus(
      "🟢 低遅延音声再生中",
      "ok"
    );

  }catch(error){

    console.error(
      "AUDIO START ERROR",
      error
    );


    setAudioStatus(
      "🔴 もう一度「音声を開始」を押してください",
      "error"
    );

  }

}


/* =====================================================
   CLOSE VIEWER
===================================================== */

function closeViewerPeer(){

  if(viewerPeer){

    try{
      viewerPeer.close();
    }catch(e){}

  }


  viewerPeer=null;


  const audio=
    document.getElementById(
      "remoteAudio"
    );


  if(audio){

    try{

      audio.pause();

      audio.srcObject=null;

    }catch(e){}

  }

}


/* =====================================================
   STOP
===================================================== */

function stopBroadcast(){

  send({
    type:"leave-host"
  });


  if(localStream){

    localStream
      .getTracks()
      .forEach(
        track=>track.stop()
      );

  }


  localStream=null;


  viewerPeers.forEach(
    peer=>{

      try{
        peer.close();
      }catch(e){}

    }
  );


  viewerPeers.clear();


  role=null;

  currentLive=false;

  currentMeta=null;


  $("hostEndButton").style.display="none";

  $("status").textContent=
    "● 接続済み";


  showScreen("home");

}


/* =====================================================
   CHAT
===================================================== */

function sendChat(){

  const input=
    $("chatInput");


  const text=
    input.value.trim();


  if(!text){
    return;
  }


  send({

    type:"chat",

    text:text

  });


  input.value="";

}


$("chatInput")
  .addEventListener(
    "keydown",
    event=>{

      if(event.key==="Enter"){
        sendChat();
      }

    }
  );


function addComment(
  name,
  text
){

  const box=
    $("comments");


  const div=
    document.createElement("div");

  div.className="comment";


  const n=
    document.createElement("span");

  n.className="commentName";

  n.textContent=
    name+"：";


  const t=
    document.createElement("span");

  t.textContent=text;


  div.appendChild(n);

  div.appendChild(t);

  box.appendChild(div);


  box.scrollTop=
    box.scrollHeight;

}


/* =====================================================
   IMAGE
===================================================== */

$("imageFile")
  .addEventListener(
    "change",
    event=>{

      const file=
        event.target.files[0];


      if(!file){
        return;
      }


      if(
        file.size >
        3*1024*1024
      ){

        alert(
          "画像は3MB以下にしてください"
        );

        return;

      }


      const reader=
        new FileReader();


      reader.onload=()=>{

        customImage=
          reader.result;


        $("preview").innerHTML="";


        const img=
          document.createElement("img");

        img.src=customImage;

        $("preview").appendChild(img);

      };


      reader.readAsDataURL(file);

    }
  );


/* =====================================================
   HOST
===================================================== */

function openHost(){

  if(role==="host"){

    showScreen("live");

    return;

  }


  showScreen("setup");

}


/* =====================================================
   GIFTS
===================================================== */

function openGifts(){

  $("giftModal")
    .classList
    .add("show");

}


function closeGifts(){

  $("giftModal")
    .classList
    .remove("show");

}


function sendGift(gift){

  closeGifts();


  send({

    type:"gift",

    gift:gift

  });


  showToast(
    gift+
    " を送りました 🎁"
  );

}


/* =====================================================
   TOAST
===================================================== */

let toastTimer=null;


function showToast(text){

  const toast=
    $("toast");


  toast.textContent=text;


  toast.classList.add("show");


  clearTimeout(toastTimer);


  toastTimer=
    setTimeout(
      ()=>{
        toast.classList.remove("show");
      },
      2200
    );

}


/* =====================================================
   START
===================================================== */

showScreen("home");

connectSocket();

</script>

</div>

</body>
</html>
`;


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(
    (req,res)=>{

      if(
        req.url ===
        "/voicebotalive_bg.png"
      ){

        fs.readFile(
          IMAGE_FILE,
          (error,data)=>{

            if(error){

              res.writeHead(
                404,
                {
                  "Content-Type":
                    "text/plain; charset=utf-8"
                }
              );

              res.end(
                "Image not found"
              );

              return;

            }


            res.writeHead(
              200,
              {
                "Content-Type":
                  "image/png",

                "Cache-Control":
                  "public, max-age=3600"
              }
            );


            res.end(data);

          }
        );

        return;

      }


      if(
        req.url ===
        "/favicon.ico"
      ){

        res.writeHead(204);

        res.end();

        return;

      }


      res.writeHead(
        200,
        {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache, no-store, must-revalidate",

          "Pragma":
            "no-cache",

          "Expires":
            "0"
        }
      );


      res.end(HTML);

    }
  );


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server
  });


const clients=new Set();

let broadcaster=null;

let liveMeta=null;

const viewers=new Map();


/* =====================================================
   WS SEND
===================================================== */

function wsSend(ws,data){

  if(
    ws &&
    ws.readyState===
    WebSocket.OPEN
  ){

    try{

      ws.send(
        JSON.stringify(data)
      );

    }catch(error){

      console.error(
        "WS SEND ERROR",
        error
      );

    }

  }

}


function broadcast(data,except=null){

  clients.forEach(
    client=>{

      if(client!==except){

        wsSend(
          client,
          data
        );

      }

    }
  );

}


/* =====================================================
   CONNECTION
===================================================== */

wss.on(
  "connection",
  socket=>{

    clients.add(socket);


    socket.id=
      Math.random()
        .toString(36)
        .slice(2)+
      Date.now()
        .toString(36);


    socket.name="ゲスト";

    socket.role="unknown";


    wsSend(
      socket,
      {
        type:"state",

        live:!!broadcaster,

        meta:liveMeta,

        viewers:viewers.size
      }
    );


    socket.on(
      "message",
      raw=>{

        let m;


        try{

          m=
            JSON.parse(
              raw.toString()
            );

        }catch(e){

          return;

        }


        if(m.type==="hello"){

          wsSend(
            socket,
            {
              type:"state",

              live:!!broadcaster,

              meta:liveMeta,

              viewers:viewers.size
            }
          );

          return;

        }


        /* HOST */

        if(m.type==="join-host"){

          if(
            broadcaster &&
            broadcaster!==socket
          ){

            wsSend(
              socket,
              {
                type:"error",
                text:"すでに配信中です"
              }
            );

            return;

          }


          socket.role="host";


          socket.name=
            String(
              m.name ||
              "ぼたもち"
            ).slice(0,30);


          broadcaster=socket;


          wsSend(
            socket,
            {
              type:"host-ready"
            }
          );


          broadcast(
            {
              type:"state",
              live:true,
              meta:liveMeta,
              viewers:viewers.size
            },
            socket
          );


          return;

        }


        /* META */

        if(m.type==="set-meta"){

          if(socket!==broadcaster){
            return;
          }


          liveMeta={

            name:
              String(
                m.meta?.name ||
                socket.name
              ).slice(0,30),

            title:
              String(
                m.meta?.title ||
                "ライブ配信"
              ).slice(0,80),

            image:
              typeof m.meta?.image===
              "string"
                ? m.meta.image.slice(0,900000)
                : ""

          };


          broadcast(
            {
              type:"live-meta",
              meta:liveMeta
            }
          );


          return;

        }


        /* VIEWER */

        if(m.type==="join-viewer"){

          if(!broadcaster){

            wsSend(
              socket,
              {
                type:"error",
                text:"配信が終了しています"
              }
            );

            return;

          }


          socket.role="viewer";


          viewers.set(
            socket.id,
            socket
          );


          wsSend(
            socket,
            {
              type:"live-meta",
              meta:liveMeta
            }
          );


          wsSend(
            socket,
            {
              type:"count",
              n:viewers.size
            }
          );


          wsSend(
            broadcaster,
            {
              type:"viewer",
              id:socket.id
            }
          );


          broadcast(
            {
              type:"count",
              n:viewers.size
            }
          );


          return;

        }


        /* OFFER */

        if(m.type==="offer"){

          if(socket!==broadcaster){
            return;
          }


          const viewer=
            viewers.get(m.to);


          if(viewer){

            wsSend(
              viewer,
              {
                type:"offer",
                sdp:m.sdp
              }
            );

          }


          return;

        }


        /* ANSWER */

        if(m.type==="answer"){

          if(!broadcaster){
            return;
          }


          wsSend(
            broadcaster,
            {
              type:"answer",
              from:socket.id,
              sdp:m.sdp
            }
          );


          return;

        }


        /* ICE */

        if(m.type==="ice"){

          if(socket===broadcaster){

            const viewer=
              viewers.get(m.to);


            if(viewer){

              wsSend(
                viewer,
                {
                  type:"ice",
                  from:"host",
                  candidate:m.candidate
                }
              );

            }

          }else{

            if(broadcaster){

              wsSend(
                broadcaster,
                {
                  type:"ice",
                  from:socket.id,
                  candidate:m.candidate
                }
              );

            }

          }


          return;

        }


        /* CHAT */

        if(m.type==="chat"){

          const text=
            String(
              m.text || ""
            )
            .trim()
            .slice(0,200);


          if(!text){
            return;
          }


          broadcast(
            {
              type:"chat",
              name:socket.name,
              text:text
            }
          );


          return;

        }


        /* GIFT */

        if(m.type==="gift"){

          const gift=
            String(
              m.gift || ""
            ).slice(0,50);


          broadcast(
            {
              type:"gift",
              name:socket.name,
              gift:gift
            }
          );


          return;

        }


        /* END */

        if(m.type==="leave-host"){

          if(socket===broadcaster){

            endLive();

          }

          return;

        }

      }
    );


    socket.on(
      "close",
      ()=>{

        clients.delete(socket);


        if(socket===broadcaster){

          endLive();

          return;

        }


        if(
          viewers.delete(socket.id)
        ){

          broadcast(
            {
              type:"count",
              n:viewers.size
            }
          );

        }

      }
    );

  }
);


/* =====================================================
   END LIVE
===================================================== */

function endLive(){

  if(!broadcaster){
    return;
  }


  broadcaster=null;

  liveMeta=null;


  viewers.forEach(
    viewer=>{

      wsSend(
        viewer,
        {
          type:"live-ended"
        }
      );

    }
  );


  viewers.clear();


  broadcast(
    {
      type:"state",

      live:false,

      meta:null,

      viewers:0

    }
  );

}


/* =====================================================
   START
===================================================== */

server.listen(
  PORT,
  HOST,
  ()=>{

    console.log(
      "================================"
    );

    console.log(
      " VoiceボタLive"
    );

    console.log(
      " MOONLIGHT UI + LOW LATENCY"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "BACKGROUND:",
      IMAGE_FILE
    );

    console.log(
      "================================"
    );

  }
);
