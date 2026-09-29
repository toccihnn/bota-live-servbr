const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

/* =========================================================
   VoiceボタLive
   Moonlight Design + Low Latency WebRTC
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

<meta name="theme-color" content="#050711">

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
  background:#02030a;
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
}

.app{
  width:100%;
  max-width:480px;
  min-height:100vh;
  margin:auto;
  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 80% 4%,
      rgba(68,95,255,.22),
      transparent 28%
    ),
    radial-gradient(
      circle at 10% 70%,
      rgba(155,48,255,.12),
      transparent 30%
    ),
    linear-gradient(
      180deg,
      #050711 0%,
      #080615 48%,
      #020308 100%
    );
}

/* =========================================================
   HEADER
========================================================= */

.header{
  height:62px;

  padding:0 16px;

  display:flex;
  align-items:center;
  justify-content:space-between;

  position:sticky;
  top:0;

  z-index:50;

  background:
    rgba(4,5,12,.88);

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid rgba(150,170,255,.12);
}

.logo{
  font-size:20px;
  font-weight:900;
  letter-spacing:-.5px;

  text-shadow:
    0 0 18px rgba(120,130,255,.45);
}

.logoVoice{
  color:#fff;
}

.logoBota{
  color:#c977ff;
}

.logoLive{
  color:#75cfff;
}

.status{
  font-size:10px;
  color:#75e5a9;
}

/* =========================================================
   SCREENS
========================================================= */

.screen{
  display:none;
  min-height:
    calc(100vh - 62px);

  padding-bottom:88px;
}

.screen.active{
  display:block;
}

/* =========================================================
   COMMON
========================================================= */

.card{
  margin:14px;

  padding:16px;

  border-radius:22px;

  background:
    linear-gradient(
      145deg,
      rgba(19,20,40,.94),
      rgba(9,8,19,.94)
    );

  border:
    1px solid rgba(155,135,255,.14);

  box-shadow:
    0 12px 40px rgba(0,0,0,.28);
}

.cardTitle{
  font-size:17px;
  font-weight:900;
  margin-bottom:14px;
}

.small{
  font-size:11px;
  color:#888ba1;
}

.empty{
  padding:25px 10px;
  text-align:center;
  color:#707387;
  font-size:12px;
}

/* =========================================================
   HOME HERO
========================================================= */

.homeHero{
  margin:14px;

  overflow:hidden;

  border-radius:26px;

  position:relative;

  border:
    1px solid rgba(116,150,255,.25);

  background:#050713;

  box-shadow:
    0 15px 60px rgba(0,0,0,.45);
}

.moonScene{
  height:285px;

  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 78% 25%,
      rgba(255,255,255,.9) 0 5%,
      rgba(132,167,255,.42) 6%,
      transparent 20%
    ),
    radial-gradient(
      circle at 20% 75%,
      rgba(70,100,255,.25),
      transparent 30%
    ),
    linear-gradient(
      180deg,
      #050919,
      #0b0920 50%,
      #020308
    );
}

.moon{
  position:absolute;

  width:112px;
  height:112px;

  right:45px;
  top:35px;

  border-radius:50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #fff,
      #e7edff 43%,
      #aabfff 70%,
      #7489db
    );

  box-shadow:
    0 0 20px rgba(200,215,255,.8),
    0 0 70px rgba(107,135,255,.55);
}

.moon:after{
  content:"";

  position:absolute;

  width:18px;
  height:18px;

  left:25px;
  top:27px;

  border-radius:50%;

  background:
    rgba(150,165,205,.25);

  box-shadow:
    30px 20px 0 rgba(150,165,205,.15),
    20px 50px 0 rgba(150,165,205,.13);
}

.star{
  position:absolute;
  width:3px;
  height:3px;
  border-radius:50%;
  background:#fff;
  box-shadow:0 0 8px #b9d5ff;
}

.s1{left:13%;top:18%}
.s2{left:35%;top:12%}
.s3{left:58%;top:31%}
.s4{left:87%;top:46%}
.s5{left:25%;top:45%}
.s6{left:70%;top:14%}
.s7{left:47%;top:65%}
.s8{left:9%;top:58%}

.flower{
  position:absolute;

  bottom:-12px;

  font-size:92px;

  filter:
    drop-shadow(
      0 0 12px
      rgba(120,130,255,.6)
    );
}

.flower.left{
  left:-12px;
}

.flower.right{
  right:-12px;
  transform:scale(.75);
}

.heroGlow{
  position:absolute;
  left:0;
  right:0;
  bottom:0;

  height:110px;

  background:
    linear-gradient(
      transparent,
      rgba(0,0,0,.95)
    );
}

.heroLogo{
  position:absolute;

  left:20px;
  top:35px;

  z-index:3;

  font-size:30px;
  font-weight:900;

  text-shadow:
    0 0 20px rgba(130,160,255,.75);
}

.heroLogo small{
  display:block;

  margin-top:5px;

  font-size:11px;

  font-weight:500;

  color:#d8d8e8;
}

.heroText{
  padding:18px;
}

.heroTitle{
  font-size:20px;
  font-weight:900;
  line-height:1.45;
}

.heroSub{
  margin-top:5px;
  margin-bottom:16px;

  color:#9699ad;
  font-size:12px;
}

/* =========================================================
   BUTTON
========================================================= */

.btn{
  border:0;

  border-radius:14px;

  padding:12px 18px;

  color:#fff;

  font-weight:900;

  background:
    linear-gradient(
      90deg,
      #4d9cff,
      #815cff,
      #d858e8
    );

  box-shadow:
    0 7px 22px rgba(104,81,255,.28);
}

.btn:active{
  transform:scale(.97);
}

.btn.dark{
  background:
    rgba(255,255,255,.055);

  border:
    1px solid rgba(180,170,255,.16);

  box-shadow:none;
}

.btn.red{
  background:
    linear-gradient(
      90deg,
      #b5295a,
      #ef4b79
    );
}

/* =========================================================
   LIVE LIST
========================================================= */

.liveCard{
  display:flex;
  gap:11px;
  align-items:center;

  padding:10px;

  margin-bottom:9px;

  border-radius:16px;

  background:
    rgba(255,255,255,.035);

  border:
    1px solid rgba(255,255,255,.05);
}

.liveThumb{
  width:84px;
  height:66px;

  flex-shrink:0;

  overflow:hidden;

  border-radius:13px;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #11142d,
      #382057
    );
}

.liveThumb img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.liveName{
  font-size:14px;
  font-weight:900;
}

.liveTitle{
  margin-top:4px;
  color:#9295a8;
  font-size:11px;
}

/* =========================================================
   SEARCH
========================================================= */

.searchBox{
  margin:14px;
}

.searchInput{
  width:100%;

  padding:14px 16px;

  border-radius:16px;

  border:
    1px solid rgba(150,140,255,.18);

  outline:none;

  color:#fff;

  background:
    rgba(10,9,19,.9);
}

.searchInput::placeholder{
  color:#676a7d;
}

.categoryRow{
  display:flex;
  gap:8px;

  overflow-x:auto;

  padding:
    0 14px 8px;

  scrollbar-width:none;
}

.categoryRow::-webkit-scrollbar{
  display:none;
}

.category{
  flex-shrink:0;

  padding:9px 14px;

  border-radius:99px;

  border:
    1px solid rgba(150,140,255,.16);

  background:
    rgba(255,255,255,.045);

  color:#a6a8ba;

  font-size:11px;
}

/* =========================================================
   SETUP
========================================================= */

.input{
  width:100%;

  padding:13px;

  margin:6px 0;

  color:#fff;

  background:#07070e;

  border:
    1px solid #342b49;

  border-radius:13px;

  outline:none;
}

.input:focus{
  border-color:#8764ff;
}

.label{
  display:block;

  color:#9295a8;

  font-size:11px;

  margin-top:11px;
}

.preview{
  width:100%;
  height:190px;

  margin-top:9px;

  border-radius:17px;

  overflow:hidden;

  display:grid;
  place-items:center;

  border:
    1px dashed #453b5d;

  background:
    radial-gradient(
      circle at 70% 30%,
      #252550,
      #080810
    );

  color:#6e7084;
}

.preview img{
  width:100%;
  height:100%;
  object-fit:cover;
}

/* =========================================================
   LIVE SCREEN
========================================================= */

.liveScreen{
  min-height:
    calc(100vh - 62px);

  display:flex;
  flex-direction:column;

  padding-bottom:80px;
}

.liveCover{
  height:310px;

  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 75% 22%,
      #4c427c,
      #090914 45%,
      #020207
    );
}

.liveCover img{
  width:100%;
  height:100%;

  object-fit:cover;

  opacity:.78;
}

.liveCover:after{
  content:"";

  position:absolute;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.48),
      transparent 42%,
      rgba(0,0,0,.9)
    );
}

.liveTop{
  position:absolute;

  top:14px;
  left:14px;
  right:14px;

  z-index:5;

  display:flex;
  align-items:center;
  justify-content:space-between;
}

.hostInfo{
  display:flex;
  align-items:center;
  gap:9px;
}

.avatar{
  width:42px;
  height:42px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #4bcfff,
      #a34dff
    );

  border:
    2px solid rgba(255,255,255,.45);

  box-shadow:
    0 0 18px rgba(120,100,255,.4);
}

.hostName{
  font-size:14px;
  font-weight:900;
}

.liveBadge{
  display:inline-block;

  padding:4px 7px;

  margin-top:3px;

  border-radius:7px;

  background:#eb3970;

  font-size:9px;
  font-weight:900;
}

.viewerBadge{
  padding:8px 11px;

  border-radius:99px;

  background:
    rgba(0,0,0,.45);

  border:
    1px solid rgba(255,255,255,.13);

  font-size:11px;
}

.audioBox{
  margin:10px 14px 0;

  padding:12px;

  border-radius:16px;

  background:
    rgba(17,12,27,.95);

  border:
    1px solid #35294b;
}

.audioStatus{
  font-size:11px;
  color:#9295a8;
  margin-bottom:8px;
}

.audioStatus.ok{
  color:#70e7a2;
}

.audioStatus.error{
  color:#ff718e;
}

.audioButton{
  width:100%;

  padding:13px;

  border:0;

  border-radius:13px;

  color:#fff;

  font-weight:900;

  background:
    linear-gradient(
      90deg,
      #5078ff,
      #ae58f4
    );
}

/* =========================================================
   COMMENTS
========================================================= */

.comments{
  flex:1;

  min-height:180px;
  max-height:280px;

  overflow-y:auto;

  padding:10px 14px;
}

.comment{
  font-size:13px;
  margin:8px 0;

  animation:
    commentIn .2s ease;
}

@keyframes commentIn{
  from{
    opacity:0;
    transform:translateY(5px);
  }

  to{
    opacity:1;
    transform:translateY(0);
  }
}

.commentName{
  color:#d58cff;
  font-weight:900;
  margin-right:5px;
}

/* =========================================================
   CHAT
========================================================= */

.chatBar{
  position:fixed;

  bottom:68px;

  left:50%;

  transform:translateX(-50%);

  width:100%;
  max-width:480px;

  height:64px;

  padding:9px;

  display:flex;
  gap:6px;
  align-items:center;

  background:
    rgba(6,6,13,.96);

  backdrop-filter:
    blur(16px);

  border-top:
    1px solid rgba(120,110,170,.13);

  z-index:40;
}

.chatInput{
  flex:1;
  min-width:0;

  padding:11px 13px;

  border-radius:14px;

  border:
    1px solid #352b47;

  background:#0a0911;

  color:#fff;

  outline:none;
}

.iconBtn{
  width:42px;
  height:42px;

  flex-shrink:0;

  border-radius:13px;

  border:
    1px solid #3a2e4d;

  background:#15111e;

  color:#fff;

  font-size:17px;
}

/* =========================================================
   NAV
========================================================= */

.nav{
  position:fixed;

  bottom:0;
  left:50%;

  transform:translateX(-50%);

  width:100%;
  max-width:480px;

  height:68px;

  display:flex;

  align-items:center;
  justify-content:space-around;

  background:
    rgba(5,5,11,.97);

  backdrop-filter:
    blur(18px);

  border-top:
    1px solid rgba(130,120,180,.15);

  z-index:30;
}

.nav button{
  width:20%;

  border:0;

  background:transparent;

  color:#77798c;

  font-size:9px;
}

.nav button.active{
  color:#b76aff;
}

.nav button span{
  display:block;

  font-size:20px;

  margin-bottom:3px;
}

.navCenter{
  position:relative;
  top:-15px;

  width:55px !important;
  height:55px;

  border-radius:50% !important;

  background:
    linear-gradient(
      135deg,
      #55cfff,
      #9e50ff
    ) !important;

  color:#fff !important;

  border:
    4px solid #07070d !important;

  box-shadow:
    0 0 25px rgba(126,83,255,.6);
}

.navCenter span{
  font-size:25px !important;
}

/* =========================================================
   PROFILE
========================================================= */

.profileHero{
  margin:14px;

  padding:25px 18px;

  border-radius:24px;

  text-align:center;

  background:
    radial-gradient(
      circle at 50% 0%,
      rgba(113,85,255,.3),
      transparent 50%
    ),
    #0c0b16;

  border:
    1px solid rgba(150,130,255,.14);
}

.profileAvatar{
  width:82px;
  height:82px;

  margin:0 auto 10px;

  border-radius:50%;

  display:grid;
  place-items:center;

  font-size:36px;

  background:
    linear-gradient(
      135deg,
      #54cfff,
      #9b50ff
    );

  border:
    3px solid rgba(255,255,255,.35);
}

.profileName{
  font-size:19px;
  font-weight:900;
}

.profileStats{
  display:flex;
  justify-content:center;
  gap:35px;

  margin-top:18px;
}

.stat strong{
  display:block;
  font-size:17px;
}

.stat span{
  font-size:10px;
  color:#7f8295;
}

/* =========================================================
   MODAL
========================================================= */

.modal{
  position:fixed;

  inset:0;

  display:none;

  align-items:flex-end;
  justify-content:center;

  background:
    rgba(0,0,0,.72);

  z-index:100;
}

.modal.show{
  display:flex;
}

.sheet{
  width:100%;
  max-width:480px;

  padding:20px;

  border-radius:
    25px 25px 0 0;

  background:
    linear-gradient(
      180deg,
      #171020,
      #0b0910
    );

  border:
    1px solid #443253;
}

.gifts{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:9px;

  margin-top:15px;
}

.gift{
  padding:13px 8px;

  border-radius:16px;

  border:
    1px solid #392b4c;

  background:#17121f;

  color:#fff;
}

.gift:active{
  transform:scale(.96);
}

.giftIcon{
  display:block;

  font-size:28px;

  margin-bottom:5px;
}

/* =========================================================
   TOAST
========================================================= */

.toast{
  position:fixed;

  left:50%;

  bottom:88px;

  transform:translateX(-50%);

  padding:10px 16px;

  border-radius:99px;

  background:
    #20162b;

  border:
    1px solid #65447d;

  font-size:12px;

  display:none;

  z-index:200;
}

.toast.show{
  display:block;
}

/* =========================================================
   LIVE HEART
========================================================= */

.heartFloat{
  position:fixed;

  right:18px;
  bottom:145px;

  font-size:28px;

  pointer-events:none;

  animation:
    heartUp 1.2s ease forwards;

  z-index:150;
}

@keyframes heartUp{

  0%{
    opacity:1;
    transform:
      translateY(0)
      scale(.7);
  }

  100%{
    opacity:0;
    transform:
      translateY(-130px)
      translateX(-30px)
      scale(1.25);
  }

}

</style>

</head>

<body>

<div class="app">

<!-- =====================================================
     HEADER
===================================================== -->

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

<section id="home" class="screen active">

  <div class="homeHero">

    <div class="moonScene">

      <div class="star s1"></div>
      <div class="star s2"></div>
      <div class="star s3"></div>
      <div class="star s4"></div>
      <div class="star s5"></div>
      <div class="star s6"></div>
      <div class="star s7"></div>
      <div class="star s8"></div>

      <div class="moon"></div>

      <div class="heroLogo">
        🎙️ VoiceボタLive
        <small>
          声でつながる、みんなの居場所。
        </small>
      </div>

      <div class="flower left">🪻</div>
      <div class="flower right">🪻</div>

      <div class="heroGlow"></div>

    </div>

    <div class="heroText">

      <div class="heroTitle">
        夜に咲く、<br>
        君の声が、誰かの光になる。
      </div>

      <div class="heroSub">
        月光花の夜に、声でつながろう。
      </div>

      <button
        class="btn"
        onclick="openHost()"
      >
        🎙️ 配信をはじめる
      </button>

    </div>

  </div>


  <div class="card">

    <div class="cardTitle">
      🔴 ライブ中
    </div>

    <div id="liveList">

      <div class="empty">
        配信を確認しています...
      </div>

    </div>

  </div>

</section>


<!-- =====================================================
     SEARCH
===================================================== -->

<section id="search" class="screen">

  <div class="searchBox">

    <input
      class="searchInput"
      placeholder="🔎 配信者やタイトルを検索"
      id="searchInput"
      oninput="filterLives()"
    >

  </div>

  <div class="categoryRow">

    <button class="category">
      🌙 雑談
    </button>

    <button class="category">
      🎵 音楽
    </button>

    <button class="category">
      🎮 ゲーム
    </button>

    <button class="category">
      💬 おしゃべり
    </button>

    <button class="category">
      🌸 癒し
    </button>

  </div>

  <div class="card">

    <div class="cardTitle">
      ✨ おすすめライブ
    </div>

    <div id="searchLiveList"></div>

  </div>

</section>


<!-- =====================================================
     SETUP
===================================================== -->

<section id="setup" class="screen">

  <div class="card">

    <div class="cardTitle">
      🎙️ 配信準備
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

    <div
      id="preview"
      class="preview"
    >
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
      class="iconBtn"
      onclick="sendHeart()"
    >
      ❤️
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
     NOTIFICATION
===================================================== -->

<section id="notice" class="screen">

  <div class="card">

    <div class="cardTitle">
      🔔 お知らせ
    </div>

    <div class="empty">
      新しいお知らせはありません
    </div>

  </div>

</section>


<!-- =====================================================
     PROFILE
===================================================== -->

<section id="profile" class="screen">

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

    <div class="small">
      VoiceボタLive
    </div>

    <div class="profileStats">

      <div class="stat">
        <strong>0</strong>
        <span>フォロー</span>
      </div>

      <div class="stat">
        <strong>0</strong>
        <span>フォロワー</span>
      </div>

      <div class="stat">
        <strong>0</strong>
        <span>配信</span>
      </div>

    </div>

  </div>


  <div class="card">

    <div class="cardTitle">
      ⚙️ 設定
    </div>

    <button
      class="btn dark"
      style="width:100%;margin-bottom:8px"
    >
      プロフィール編集
    </button>

    <button
      class="btn dark"
      style="width:100%"
    >
      VoiceボタLiveについて
    </button>

  </div>

</section>


<!-- =====================================================
     NAV
===================================================== -->

<nav class="nav">

  <button
    id="navHome"
    class="active"
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
    class="navCenter"
    onclick="openHost()"
  >
    <span>🎙️</span>
    配信
  </button>

  <button
    id="navNotice"
    onclick="showScreen('notice')"
  >
    <span>♧</span>
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

      <b>
        🎁 ギフト
      </b>

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
        <span class="giftIcon">
          🌙
        </span>
        月光花
      </button>

      <button
        class="gift"
        onclick="sendGift('💜 ハート')"
      >
        <span class="giftIcon">
          💜
        </span>
        ハート
      </button>

      <button
        class="gift"
        onclick="sendGift('✨ 星の雫')"
      >
        <span class="giftIcon">
          ✨
        </span>
        星の雫
      </button>

      <button
        class="gift"
        onclick="sendGift('🌸 月夜桜')"
      >
        <span class="giftIcon">
          🌸
        </span>
        月夜桜
      </button>

      <button
        class="gift"
        onclick="sendGift('⭐ 流れ星')"
      >
        <span class="giftIcon">
          ⭐
        </span>
        流れ星
      </button>

      <button
        class="gift"
        onclick="sendGift('💎 青い宝石')"
      >
        <span class="giftIcon">
          💎
        </span>
        青い宝石
      </button>

    </div>

  </div>

</div>


<div
  id="toast"
  class="toast"
></div>


<script>

/* =========================================================
   GLOBAL
========================================================= */

let socket = null;

let role = null;

let localStream = null;

let viewerPeer = null;

let viewerPeers = new Map();

let customImage = "";

let currentLive = false;

let currentMeta = null;

let audioStarted = false;


/* =========================================================
   WEBRTC
========================================================= */

const rtcConfig = {

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


/* =========================================================
   BASIC
========================================================= */

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

  const map={
    home:"navHome",
    search:"navSearch",
    notice:"navNotice",
    profile:"navProfile"
  };

  if(map[id]){
    $(map[id])
      .classList
      .add("active");
  }

  window.scrollTo(0,0);

}


function setAudioStatus(
  text,
  type
){

  const el=$("audioStatus");

  el.textContent=text;

  el.className="audioStatus";

  if(type){
    el.classList.add(type);
  }

}


/* =========================================================
   WEBSOCKET
========================================================= */

function connectSocket(){

  if(
    socket &&
    (
      socket.readyState===
      WebSocket.OPEN ||
      socket.readyState===
      WebSocket.CONNECTING
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

  socket.binaryType=
    "arraybuffer";


  socket.onopen=()=>{

    $("status")
      .textContent=
      "● 接続済み";

    send({
      type:"hello"
    });

  };


  socket.onerror=()=>{

    $("status")
      .textContent=
      "● 接続エラー";

  };


  socket.onclose=()=>{

    $("status")
      .textContent=
      "● 切断";

    setTimeout(
      connectSocket,
      1500
    );

  };


  socket.onmessage=
    event=>{

      try{

        const message=
          JSON.parse(
            event.data
          );

        handleMessage(message);

      }catch(error){

        console.error(error);

      }

    };

}


function send(data){

  if(
    socket &&
    socket.readyState===
    WebSocket.OPEN
  ){

    socket.send(
      JSON.stringify(data)
    );

  }

}


/* =========================================================
   MESSAGE
========================================================= */

function handleMessage(m){

  if(m.type==="state"){

    currentLive=
      !!m.live;

    currentMeta=
      m.meta || null;

    updateLiveList();

    return;

  }


  if(m.type==="host-ready"){

    $("status")
      .textContent=
      "● LIVE";

    setAudioStatus(
      "🎙️ 配信中・低遅延音声送信中",
      "ok"
    );

    return;

  }


  if(m.type==="live-meta"){

    currentMeta=
      m.meta || null;

    currentLive=true;

    updateLiveList();

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
        .setRemoteDescription(
          m.sdp
        )
        .catch(console.error);

    }

    return;

  }


  if(m.type==="ice"){

    let peer=null;

    if(role==="host"){

      peer=
        viewerPeers.get(
          m.from
        );

    }else{

      peer=
        viewerPeer;

    }

    if(
      peer &&
      m.candidate
    ){

      peer
        .addIceCandidate(
          m.candidate
        )
        .catch(()=>{});

    }

    return;

  }


  if(m.type==="count"){

    $("viewerCount")
      .textContent=
      m.n;

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
      "🎁 "+
      m.gift
    );

    return;

  }


  if(m.type==="heart"){

    createHeart();

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

    return;

  }

}


/* =========================================================
   LIVE LIST
========================================================= */

function createLiveCard(
  meta
){

  const card=
    document.createElement(
      "div"
    );

  card.className=
    "liveCard";


  const thumb=
    document.createElement(
      "div"
    );

  thumb.className=
    "liveThumb";


  if(meta.image){

    const img=
      document.createElement(
        "img"
      );

    img.src=
      meta.image;

    thumb.appendChild(img);

  }else{

    thumb.textContent="🌙";

  }


  const info=
    document.createElement(
      "div"
    );

  info.style.flex="1";


  const name=
    document.createElement(
      "div"
    );

  name.className=
    "liveName";

  name.textContent=
    "🔴 "+
    (
      meta.name ||
      "配信者"
    );


  const title=
    document.createElement(
      "div"
    );

  title.className=
    "liveTitle";

  title.textContent=
    meta.title ||
    "ライブ配信";


  info.appendChild(name);
  info.appendChild(title);


  const button=
    document.createElement(
      "button"
    );

  button.className=
    "btn";

  button.textContent=
    "見る";

  button.onclick=()=>{
    joinLive();
  };


  card.appendChild(thumb);
  card.appendChild(info);
  card.appendChild(button);

  return card;

}


function updateLiveList(){

  const list=
    $("liveList");

  const searchList=
    $("searchLiveList");

  list.innerHTML="";
  searchList.innerHTML="";


  if(!currentLive){

    list.innerHTML=
      '<div class="empty">'+
      '現在配信中のライブはありません'+
      '</div>';

    searchList.innerHTML=
      '<div class="empty">'+
      '現在配信中のライブはありません'+
      '</div>';

    return;

  }


  const meta=
    currentMeta || {};


  list.appendChild(
    createLiveCard(meta)
  );


  searchList.appendChild(
    createLiveCard(meta)
  );

}


function filterLives(){

  const value=
    (
      $("searchInput").value ||
      ""
    )
    .toLowerCase()
    .trim();

  const list=
    $("searchLiveList");

  list.innerHTML="";


  if(!currentLive){

    list.innerHTML=
      '<div class="empty">'+
      '配信中のライブはありません'+
      '</div>';

    return;

  }


  const meta=
    currentMeta || {};

  const text=
    (
      meta.name+
      " "+
      meta.title
    )
    .toLowerCase();


  if(
    value &&
    !text.includes(value)
  ){

    list.innerHTML=
      '<div class="empty">'+
      '該当する配信がありません'+
      '</div>';

    return;

  }


  list.appendChild(
    createLiveCard(meta)
  );

}


/* =========================================================
   BROADCAST
========================================================= */

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


  $("profileName")
    .textContent=
    name;

  $("liveName")
    .textContent=
    name;

  $("hostEndButton")
    .style.display=
    "block";


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


/* =========================================================
   JOIN LIVE
========================================================= */

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


  $("audioButton")
    .style.display=
    "block";


  $("audioButton")
    .textContent=
    "🔊 音声を開始";


  setAudioStatus(
    "🔊 配信に接続しています...",
    ""
  );


  const meta=
    currentMeta || {};


  $("liveName")
    .textContent=
    meta.name ||
    "配信者";


  if(meta.image){

    $("liveImage")
      .src=
      meta.image;

    $("liveImage")
      .style.display=
      "block";

  }else{

    $("liveImage")
      .style.display=
      "none";

  }


  showScreen("live");


  send({
    type:"join-viewer"
  });

}


/* =========================================================
   HOST OFFER
========================================================= */

async function createOffer(
  viewerId
){

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

          params.encodings[0]
            .maxBitrate=
            48000;

        }


        sender
          .setParameters(
            params
          )
          .catch(()=>{});

      }catch(e){}

    });


  peer.onicecandidate=
    event=>{

      if(event.candidate){

        send({

          type:"ice",

          to:viewerId,

          candidate:
            event.candidate

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


    await peer
      .setLocalDescription(
        offer
      );


    send({

      type:"offer",

      to:viewerId,

      sdp:
        peer.localDescription

    });

  }catch(error){

    console.error(
      "CREATE OFFER ERROR",
      error
    );

  }

}


/* =========================================================
   OPUS
========================================================= */

function optimizeOpusSDP(
  sdp
){

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
      lines[i]
        .startsWith("a=rtpmap:") &&
      lines[i]
        .toLowerCase()
        .includes("opus/48000")
    ){

      const match=
        lines[i]
          .match(
            /^a=rtpmap:(\\d+)/
          );

      if(match){

        opusPayload=
          match[1];

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
    " minptime=10;"+
    "maxptime=10;"+
    "useinbandfec=1;"+
    "stereo=0;"+
    "usedtx=0";


  let index=-1;


  for(
    let i=0;
    i<lines.length;
    i++
  ){

    if(
      lines[i]
        .startsWith(
          "a=fmtp:"+opusPayload
        )
    ){

      index=i;
      break;

    }

  }


  if(index>=0){

    lines[index]=fmtp;

  }else{

    const rtp=
      lines.findIndex(
        line=>
          line.startsWith(
            "a=rtpmap:"+opusPayload
          )
      );

    if(rtp>=0){

      lines.splice(
        rtp+1,
        0,
        fmtp
      );

    }

  }


  return lines.join("\\r\\n");

}


/* =========================================================
   VIEWER
========================================================= */

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

          candidate:
            event.candidate

        });

      }

    };


  viewerPeer.oniceconnectionstatechange=
    ()=>{

      const state=
        viewerPeer
          .iceConnectionState;


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
          document.createElement(
            "audio"
          );

        audio.id=
          "remoteAudio";

        audio.autoplay=true;

        audio.playsInline=true;

        audio.controls=false;

        audio.style.position=
          "fixed";

        audio.style.width=
          "1px";

        audio.style.height=
          "1px";

        audio.style.opacity=
          "0.01";

        audio.style.pointerEvents=
          "none";

        audio.style.left=
          "-10px";

        audio.style.top=
          "-10px";

        document.body
          .appendChild(audio);

      }


      const stream=
        event.streams &&
        event.streams[0]
          ? event.streams[0]
          : new MediaStream([
              event.track
            ]);


      audio.srcObject=
        stream;


      try{

        const receiver=
          viewerPeer
            .getReceivers()
            .find(
              r=>
                r.track &&
                r.track.kind===
                "audio"
            );


        if(receiver){

          if(
            "playoutDelayHint"
            in receiver
          ){

            receiver
              .playoutDelayHint=0;

          }

          if(
            "jitterBufferTarget"
            in receiver
          ){

            try{

              receiver
                .jitterBufferTarget=0;

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
          .catch(()=>{});

      }

    };


  try{

    await viewerPeer
      .setRemoteDescription(
        m.sdp
      );


    const answer=
      await viewerPeer
        .createAnswer();


    answer.sdp=
      optimizeOpusSDP(
        answer.sdp
      );


    await viewerPeer
      .setLocalDescription(
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


/* =========================================================
   AUDIO
========================================================= */

async function startAudio(){

  audioStarted=true;


  let audio=
    document.getElementById(
      "remoteAudio"
    );


  if(!audio){

    audio=
      document.createElement(
        "audio"
      );

    audio.id=
      "remoteAudio";

    audio.autoplay=true;

    audio.playsInline=true;

    audio.style.position=
      "fixed";

    audio.style.width=
      "1px";

    audio.style.height=
      "1px";

    audio.style.opacity=
      "0.01";

    audio.style.left=
      "-10px";

    audio.style.top=
      "-10px";

    document.body
      .appendChild(audio);

  }


  try{

    await audio.play();


    $("audioButton")
      .textContent=
      "🔊 音声再生中";


    setAudioStatus(
      "🟢 低遅延音声再生中",
      "ok"
    );

  }catch(error){

    setAudioStatus(
      "🔴 もう一度「音声を開始」を押してください",
      "error"
    );

  }

}


/* =========================================================
   CLOSE VIEWER
========================================================= */

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


/* =========================================================
   STOP
========================================================= */

function stopBroadcast(){

  send({
    type:"leave-host"
  });


  if(localStream){

    localStream
      .getTracks()
      .forEach(
        track=>{
          track.stop();
        }
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


  $("hostEndButton")
    .style.display=
    "none";


  $("status")
    .textContent=
    "● 接続済み";


  showScreen("home");

}


/* =========================================================
   CHAT
========================================================= */

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

      if(
        event.key==="Enter"
      ){

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
    document.createElement(
      "div"
    );

  div.className=
    "comment";


  const n=
    document.createElement(
      "span"
    );

  n.className=
    "commentName";

  n.textContent=
    name+
    "：";


  const t=
    document.createElement(
      "span"
    );

  t.textContent=
    text;


  div.appendChild(n);
  div.appendChild(t);

  box.appendChild(div);


  box.scrollTop=
    box.scrollHeight;

}


/* =========================================================
   HEART
========================================================= */

function sendHeart(){

  send({
    type:"heart"
  });

  createHeart();

}


function createHeart(){

  const heart=
    document.createElement(
      "div"
    );

  heart.className=
    "heartFloat";

  heart.textContent=
    "💜";

  document.body
    .appendChild(heart);


  setTimeout(
    ()=>{
      heart.remove();
    },
    1300
  );

}


/* =========================================================
   IMAGE
========================================================= */

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


        $("preview")
          .innerHTML="";


        const img=
          document.createElement(
            "img"
          );

        img.src=
          customImage;


        $("preview")
          .appendChild(img);

      };


      reader.readAsDataURL(
        file
      );

    }
  );


/* =========================================================
   HOST
========================================================= */

function openHost(){

  if(role==="host"){

    showScreen("live");

    return;

  }

  showScreen("setup");

}


/* =========================================================
   GIFTS
========================================================= */

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


/* =========================================================
   TOAST
========================================================= */

let toastTimer=null;


function showToast(text){

  const toast=
    $("toast");


  toast.textContent=
    text;


  toast.classList
    .add("show");


  clearTimeout(
    toastTimer
  );


  toastTimer=
    setTimeout(
      ()=>{
        toast.classList
          .remove("show");
      },
      2200
    );

}


/* =========================================================
   START
========================================================= */

connectSocket();

</script>

</div>

</body>
</html>
`;


/* =========================================================
   HTTP SERVER
========================================================= */

const server =
  http.createServer(
    (req,res)=>{

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


/* =========================================================
   WEBSOCKET
========================================================= */

const wss =
  new WebSocket.Server({
    server
  });


const clients =
  new Set();


let broadcaster=null;

let liveMeta=null;

const viewers =
  new Map();


function wsSend(
  ws,
  data
){

  if(
    ws &&
    ws.readyState===
    WebSocket.OPEN
  ){

    ws.send(
      JSON.stringify(data)
    );

  }

}


function broadcast(
  data,
  except=null
){

  clients.forEach(
    client=>{

      if(
        client!==except
      ){

        wsSend(
          client,
          data
        );

      }

    }
  );

}


/* =========================================================
   CONNECTION
========================================================= */

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


    socket.name=
      "ゲスト";

    socket.role=
      "unknown";


    wsSend(
      socket,
      {
        type:"state",

        live:
          !!broadcaster,

        meta:
          liveMeta,

        viewers:
          viewers.size
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


        /* HELLO */

        if(
          m.type==="hello"
        ){

          wsSend(
            socket,
            {
              type:"state",

              live:
                !!broadcaster,

              meta:
                liveMeta,

              viewers:
                viewers.size
            }
          );

          return;

        }


        /* HOST */

        if(
          m.type==="join-host"
        ){

          if(
            broadcaster &&
            broadcaster!==socket
          ){

            wsSend(
              socket,
              {
                type:"error",

                text:
                  "すでに配信中です"
              }
            );

            return;

          }


          socket.role=
            "host";


          socket.name=
            String(
              m.name ||
              "ぼたもち"
            ).slice(
              0,
              30
            );


          broadcaster=
            socket;


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

              meta:
                liveMeta,

              viewers:
                viewers.size
            },

            socket
          );


          return;

        }


        /* META */

        if(
          m.type==="set-meta"
        ){

          if(
            socket!==broadcaster
          ){

            return;

          }


          liveMeta={

            name:
              String(
                m.meta?.name ||
                socket.name
              ).slice(
                0,
                30
              ),

            title:
              String(
                m.meta?.title ||
                "ライブ配信"
              ).slice(
                0,
                80
              ),

            image:
              typeof m.meta?.image===
              "string"
                ? m.meta.image.slice(
                    0,
                    900000
                  )
                : ""

          };


          broadcast(
            {
              type:"live-meta",

              meta:
                liveMeta
            }
          );


          return;

        }


        /* VIEWER */

        if(
          m.type==="join-viewer"
        ){

          if(!broadcaster){

            wsSend(
              socket,
              {
                type:"error",

                text:
                  "配信が終了しています"
              }
            );

            return;

          }


          socket.role=
            "viewer";


          viewers.set(
            socket.id,
            socket
          );


          wsSend(
            socket,
            {
              type:"live-meta",

              meta:
                liveMeta
            }
          );


          wsSend(
            socket,
            {
              type:"count",

              n:
                viewers.size
            }
          );


          wsSend(
            broadcaster,
            {
              type:"viewer",

              id:
                socket.id
            }
          );


          broadcast(
            {
              type:"count",

              n:
                viewers.size
            }
          );


          return;

        }


        /* OFFER */

        if(
          m.type==="offer"
        ){

          if(
            socket!==broadcaster
          ){

            return;

          }


          const viewer=
            viewers.get(
              m.to
            );


          if(viewer){

            wsSend(
              viewer,
              {
                type:"offer",

                sdp:
                  m.sdp
              }
            );

          }


          return;

        }


        /* ANSWER */

        if(
          m.type==="answer"
        ){

          if(!broadcaster){

            return;

          }


          wsSend(
            broadcaster,
            {
              type:"answer",

              from:
                socket.id,

              sdp:
                m.sdp
            }
          );


          return;

        }


        /* ICE */

        if(
          m.type==="ice"
        ){

          if(
            socket===broadcaster
          ){

            const viewer=
              viewers.get(
                m.to
              );


            if(viewer){

              wsSend(
                viewer,
                {
                  type:"ice",

                  from:"host",

                  candidate:
                    m.candidate
                }
              );

            }

          }else{

            if(broadcaster){

              wsSend(
                broadcaster,
                {
                  type:"ice",

                  from:
                    socket.id,

                  candidate:
                    m.candidate
                }
              );

            }

          }


          return;

        }


        /* CHAT */

        if(
          m.type==="chat"
        ){

          const text=
            String(
              m.text || ""
            )
            .trim()
            .slice(
              0,
              200
            );


          if(!text){
            return;
          }


          broadcast(
            {
              type:"chat",

              name:
                socket.name,

              text:
                text

            }
          );


          return;

        }


        /* GIFT */

        if(
          m.type==="gift"
        ){

          const gift=
            String(
              m.gift || ""
            ).slice(
              0,
              50
            );


          broadcast(
            {
              type:"gift",

              name:
                socket.name,

              gift:
                gift

            }
          );


          return;

        }


        /* HEART */

        if(
          m.type==="heart"
        ){

          broadcast(
            {
              type:"heart"
            }
          );

          return;

        }


        /* END */

        if(
          m.type==="leave-host"
        ){

          if(
            socket===broadcaster
          ){

            endLive();

          }


          return;

        }

      }
    );


    /* CLOSE */

    socket.on(
      "close",
      ()=>{

        clients.delete(
          socket
        );


        if(
          socket===broadcaster
        ){

          endLive();

        }


        if(
          viewers.delete(
            socket.id
          )
        ){

          broadcast(
            {
              type:"count",

              n:
                viewers.size
            }
          );

        }

      }
    );

  });


/* =========================================================
   END LIVE
========================================================= */

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


/* =========================================================
   START
========================================================= */

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
      " Moonlight Design"
    );

    console.log(
      " LOW LATENCY AUDIO"
    );

    console.log(
      " PORT:",
      PORT
    );

    console.log(
      "================================"
    );

  }
);
