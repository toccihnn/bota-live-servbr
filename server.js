const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

const IMAGE_FILE = path.join(
  __dirname,
  "voicebotalive_bg.png"
);

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

<meta name="theme-color" content="#05030c">

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
  min-height:100dvh;
  margin:auto;

  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 80% 5%,
      rgba(100,125,255,.18),
      transparent 30%
    ),
    radial-gradient(
      circle at 15% 60%,
      rgba(160,55,255,.13),
      transparent 35%
    ),
    linear-gradient(
      180deg,
      #05030c 0%,
      #080512 45%,
      #020207 100%
    );
}

/* =====================================================
   BACKGROUND IMAGE
===================================================== */

.app::before{
  content:"";
  position:fixed;
  inset:0;

  background-image:
    linear-gradient(
      180deg,
      rgba(2,2,10,.60),
      rgba(2,2,8,.82)
    ),
    url("/voicebotalive_bg.png");

  background-size:cover;
  background-position:center top;

  opacity:.20;

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
  height:62px;
  padding:
    0 16px
    env(safe-area-inset-right)
    0 env(safe-area-inset-left);

  display:flex;
  align-items:center;
  justify-content:space-between;

  border-bottom:
    1px solid rgba(255,255,255,.10);

  background:
    rgba(3,3,10,.82);

  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);

  position:sticky;
  top:0;
  z-index:50;
}

.logo{
  font-size:21px;
  font-weight:950;
  letter-spacing:-.8px;
  text-shadow:
    0 0 18px rgba(140,100,255,.45);
}

.logo .voice{
  color:#fff;
}

.logo .bota{
  color:#df83ff;
}

.logo .live{
  color:#8ebfff;
}

.status{
  font-size:10px;
  color:#a7a1b1;
}

/* =====================================================
   SCREEN
===================================================== */

.screen{
  display:none;
  min-height:calc(100vh - 62px);
  min-height:calc(100dvh - 62px);
  padding-bottom:90px;
}

.screen.active{
  display:block;
}

/* =====================================================
   CARD
===================================================== */

.card{
  margin:14px;
  padding:16px;

  border-radius:21px;

  background:
    linear-gradient(
      145deg,
      rgba(20,15,34,.90),
      rgba(8,7,17,.91)
    );

  border:
    1px solid rgba(176,123,255,.18);

  box-shadow:
    0 12px 40px rgba(0,0,0,.35);
}

.cardTitle{
  font-size:17px;
  font-weight:950;
  margin-bottom:14px;
}

/* =====================================================
   HOME HERO
===================================================== */

.homeHero{
  margin:12px;

  border-radius:27px;
  overflow:hidden;

  border:
    1px solid rgba(151,123,255,.32);

  background:
    rgba(5,4,14,.82);

  box-shadow:
    0 20px 55px rgba(0,0,0,.45),
    0 0 40px rgba(74,80,255,.10);
}

.moonScene{
  height:340px;

  position:relative;
  overflow:hidden;

  background:
    linear-gradient(
      180deg,
      rgba(4,8,26,.10),
      rgba(3,2,13,.88)
    ),
    url("/voicebotalive_bg.png");

  background-size:cover;
  background-position:
    center top;

  isolation:isolate;
}

.moonScene::after{
  content:"";
  position:absolute;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.10),
      transparent 35%,
      rgba(1,1,8,.90) 100%
    );

  z-index:1;
}

.moonGlow{
  position:absolute;

  width:110px;
  height:110px;

  right:35px;
  top:34px;

  border-radius:50%;

  background:
    radial-gradient(
      circle,
      rgba(235,242,255,.95),
      rgba(166,196,255,.75) 35%,
      rgba(105,130,255,.25) 65%,
      transparent 72%
    );

  filter:blur(1px);

  opacity:.8;

  z-index:0;
}

.flowerGlow{
  position:absolute;

  left:-25px;
  bottom:-35px;

  width:190px;
  height:130px;

  border-radius:50%;

  background:
    radial-gradient(
      ellipse,
      rgba(90,110,255,.40),
      transparent 68%
    );

  filter:blur(15px);

  z-index:1;
}

.heroBadge{
  position:absolute;

  top:16px;
  left:16px;

  z-index:5;

  padding:7px 11px;

  border-radius:99px;

  background:
    rgba(5,3,16,.62);

  border:
    1px solid rgba(183,151,255,.38);

  backdrop-filter:blur(10px);

  font-size:10px;
  font-weight:900;

  color:#dca7ff;
}

.heroCopy{
  position:absolute;

  left:18px;
  right:18px;
  bottom:17px;

  z-index:5;
}

.heroTitle{
  font-size:25px;
  line-height:1.2;
  font-weight:950;

  text-shadow:
    0 3px 18px #000;
}

.heroSub{
  color:#d0c9dc;
  font-size:12px;
  margin-top:7px;

  text-shadow:
    0 2px 10px #000;
}

.heroText{
  padding:16px;
}

/* =====================================================
   BUTTON
===================================================== */

.btn{
  border:0;
  border-radius:15px;

  padding:12px 17px;

  color:#fff;
  font-weight:900;

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
    1px solid rgba(255,255,255,.13);

  box-shadow:none;
}

.btn.red{
  background:
    linear-gradient(
      100deg,
      #a72958,
      #ef4f78
    );
}

/* =====================================================
   INPUT
===================================================== */

.input{
  width:100%;

  padding:13px;

  margin:6px 0;

  color:#fff;

  background:
    rgba(2,2,9,.72);

  border:
    1px solid #403254;

  border-radius:14px;

  outline:none;
}

.input:focus{
  border-color:#9b70ff;

  box-shadow:
    0 0 0 3px rgba(145,93,255,.12);
}

.label{
  display:block;

  color:#aaa1b3;

  font-size:12px;

  margin-top:10px;
}

/* =====================================================
   PREVIEW
===================================================== */

.preview{
  width:100%;
  height:190px;

  margin-top:8px;

  border-radius:17px;

  overflow:hidden;

  display:grid;
  place-items:center;

  border:
    1px dashed #59426e;

  background:
    rgba(5,3,12,.7);

  color:#82768f;
}

.preview img{
  width:100%;
  height:100%;
  object-fit:cover;
}

/* =====================================================
   LIVE LIST
===================================================== */

.liveCard{
  display:flex;
  gap:12px;
  align-items:center;

  padding:10px;

  border-radius:17px;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.055),
      rgba(100,70,160,.05)
    );

  border:
    1px solid rgba(255,255,255,.055);

  margin-bottom:9px;
}

.liveThumb{
  width:88px;
  height:68px;

  flex-shrink:0;

  border-radius:13px;

  overflow:hidden;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #16132e,
      #482260
    );
}

.liveThumb img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.liveName{
  font-weight:900;
  font-size:14px;
}

.liveTitle{
  color:#aaa0b0;
  font-size:12px;
  margin-top:4px;
}

.empty{
  padding:22px;

  text-align:center;

  color:#777080;

  font-size:12px;
}

/* =====================================================
   LIVE SCREEN
===================================================== */

.liveScreen{
  min-height:calc(100vh - 62px);
  min-height:calc(100dvh - 62px);

  display:flex;
  flex-direction:column;

  padding-bottom:82px;
}

.liveCover{
  height:330px;

  position:relative;
  overflow:hidden;

  background:
    linear-gradient(
      180deg,
      #070616,
      #10091c
    );
}

.liveCover img{
  width:100%;
  height:100%;

  object-fit:cover;

  opacity:.82;
}

.liveCover::after{
  content:"";

  position:absolute;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.40),
      transparent 35%,
      rgba(0,0,0,.94)
    );

  pointer-events:none;
}

.liveTop{
  position:absolute;

  top:14px;
  left:14px;
  right:14px;

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
  width:42px;
  height:42px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #4fc9ff,
      #b84dff
    );

  border:
    2px solid rgba(255,255,255,.48);

  box-shadow:
    0 0 18px rgba(137,82,255,.35);
}

.hostName{
  font-size:14px;
  font-weight:950;
}

.liveBadge{
  display:inline-block;

  padding:4px 7px;

  border-radius:7px;

  background:#e93671;

  font-size:9px;

  font-weight:950;

  margin-top:3px;
}

.viewerBadge{
  padding:8px 11px;

  border-radius:99px;

  background:
    rgba(0,0,0,.50);

  border:
    1px solid rgba(255,255,255,.16);

  backdrop-filter:blur(8px);

  font-size:11px;
}

/* =====================================================
   LIVE TITLE
===================================================== */

.liveTitleOverlay{
  position:absolute;

  left:15px;
  right:15px;
  bottom:15px;

  z-index:5;
}

.liveTitleMain{
  font-size:20px;
  font-weight:950;

  text-shadow:
    0 2px 12px #000;
}

.liveTitleSub{
  color:#c7bed0;
  font-size:11px;
  margin-top:5px;
}

/* =====================================================
   AUDIO
===================================================== */

.audioBox{
  margin:10px 14px 0;

  padding:13px;

  border-radius:17px;

  background:
    rgba(16,11,24,.91);

  border:
    1px solid #35243f;
}

.audioStatus{
  font-size:12px;
  color:#aaa;

  margin-bottom:9px;
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

/* =====================================================
   COMMENTS
===================================================== */

.comments{
  flex:1;

  min-height:150px;
  max-height:280px;

  overflow-y:auto;

  padding:10px 14px;
}

.comment{
  font-size:13px;

  margin:8px 0;

  padding:7px 10px;

  border-radius:12px;

  background:
    rgba(255,255,255,.035);
}

.commentName{
  color:#d28cff;

  font-weight:900;

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
  max-width:480px;

  min-height:72px;

  padding:
    9px
    10px
    calc(9px + env(safe-area-inset-bottom));

  display:flex;

  gap:6px;
  align-items:center;

  background:
    rgba(7,5,12,.96);

  backdrop-filter:blur(18px);

  border-top:
    1px solid #281c34;

  z-index:70;
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

  font-size:18px;
}

/* =====================================================
   NAV
===================================================== */

.nav{
  position:fixed;

  bottom:0;
  left:50%;

  transform:translateX(-50%);

  width:100%;
  max-width:480px;

  height:68px;

  background:
    rgba(8,6,12,.97);

  border-top:
    1px solid #281c35;

  display:flex;

  align-items:center;
  justify-content:space-around;

  z-index:30;
}

.nav button{
  border:0;

  background:transparent;

  color:#817689;

  font-size:10px;

  min-width:70px;
}

.nav button.active{
  color:#d78aff;
}

.nav button span{
  display:block;

  font-size:21px;

  margin-bottom:3px;
}

/* =====================================================
   MODAL
===================================================== */

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

  padding:
    20px
    20px
    calc(20px + env(safe-area-inset-bottom));

  border-radius:
    25px 25px 0 0;

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
  padding:13px;

  border-radius:15px;

  border:
    1px solid #39294a;

  background:#191221;

  color:#fff;
}

.gift:active{
  transform:scale(.96);
}

.giftIcon{
  font-size:27px;

  display:block;

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
  bottom:90px;

  transform:translateX(-50%);

  padding:10px 15px;

  border-radius:99px;

  background:#21172c;

  border:
    1px solid #604478;

  font-size:12px;

  display:none;

  z-index:200;
}

.toast.show{
  display:block;
}

/* =====================================================
   PROFILE
===================================================== */

.profileHero{
  padding:25px 10px;

  text-align:center;
}

.profileAvatar{
  width:86px;
  height:86px;

  margin:0 auto 12px;

  border-radius:50%;

  display:grid;
  place-items:center;

  font-size:38px;

  background:
    linear-gradient(
      135deg,
      #5ccfff,
      #bd55ff
    );

  border:
    3px solid rgba(255,255,255,.25);

  box-shadow:
    0 0 30px rgba(131,79,255,.35);
}

.profileName{
  font-size:21px;
  font-weight:950;
}

.profileSub{
  color:#958c9d;
  font-size:12px;
  margin-top:5px;
}

/* =====================================================
   HOME FEATURE
===================================================== */

.features{
  display:grid;

  grid-template-columns:
    repeat(2,1fr);

  gap:9px;

  margin-top:14px;
}

.feature{
  padding:14px;

  border-radius:16px;

  background:
    rgba(255,255,255,.035);

  border:
    1px solid rgba(255,255,255,.055);
}

.featureIcon{
  font-size:22px;
  margin-bottom:7px;
}

.featureTitle{
  font-size:12px;
  font-weight:900;
}

.featureText{
  margin-top:4px;

  font-size:10px;

  color:#918899;

  line-height:1.5;
}

/* =====================================================
   MOBILE
===================================================== */

@media(max-width:380px){

  .heroTitle{
    font-size:21px;
  }

  .moonScene{
    height:300px;
  }

  .liveCover{
    height:300px;
  }

  .iconBtn{
    width:40px;
    height:40px;
  }

}

</style>
</head>

<body>

<div class="app">

<header class="header">

  <div class="logo">
    <span class="voice">Voice</span><span class="bota">ボタ</span><span class="live">Live</span>
  </div>

  <div id="status" class="status">
    ● 接続中
  </div>

</header>


<!-- ===================================================
     HOME
=================================================== -->

<section id="home" class="screen active">

  <div class="homeHero">

    <div class="moonScene">

      <div class="heroBadge">
        🌙 月光花 × Voice
      </div>

      <div class="moonGlow"></div>

      <div class="flowerGlow"></div>

      <div class="heroCopy">

        <div class="heroTitle">
          声でつながる、<br>
          みんなの居場所。
        </div>

        <div class="heroSub">
          月光の夜に、あなたの声が誰かの光になる。
        </div>

      </div>

    </div>

    <div class="heroText">

      <button
        class="btn"
        onclick="openHost()"
      >
        🎙️ 配信する
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


  <div class="card">

    <div class="cardTitle">
      ✨ VoiceボタLive
    </div>

    <div class="features">

      <div class="feature">

        <div class="featureIcon">
          🎙️
        </div>

        <div class="featureTitle">
          声でつながる
        </div>

        <div class="featureText">
          声を中心にしたリアルタイムライブ。
        </div>

      </div>


      <div class="feature">

        <div class="featureIcon">
          ⚡
        </div>

        <div class="featureTitle">
          低遅延
        </div>

        <div class="featureText">
          WebRTCによるリアルタイム音声。
        </div>

      </div>


      <div class="feature">

        <div class="featureIcon">
          🎁
        </div>

        <div class="featureTitle">
          ギフト
        </div>

        <div class="featureText">
          配信者へ気持ちを届けられる。
        </div>

      </div>


      <div class="feature">

        <div class="featureIcon">
          💬
        </div>

        <div class="featureTitle">
          コメント
        </div>

        <div class="featureText">
          みんなでライブを楽しめる。
        </div>

      </div>

    </div>

  </div>

</section>


<!-- ===================================================
     SETUP
=================================================== -->

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


<!-- ===================================================
     LIVE
=================================================== -->

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


<!-- ===================================================
     PROFILE
=================================================== -->

<section
  id="profile"
  class="screen"
>

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


<!-- ===================================================
     NAV
=================================================== -->

<nav class="nav">

  <button
    id="navHome"
    onclick="showScreen('home')"
  >
    <span>⌂</span>
    ホーム
  </button>

  <button
    id="navLive"
    onclick="openHost()"
  >
    <span>🎙️</span>
    配信
  </button>

  <button
    id="navProfile"
    onclick="showScreen('profile')"
  >
    <span>♙</span>
    マイページ
  </button>

</nav>


<!-- ===================================================
     GIFTS
=================================================== -->

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

    </div>

  </div>

</div>


<div
  id="toast"
  class="toast"
></div>


<script>

/* =====================================================
   GLOBAL
===================================================== */

let socket = null;

let role = null;

let localStream = null;

let viewerPeer = null;

let viewerPeers = new Map();

let customImage = "";

let currentLive = false;

let currentMeta = null;

let audioStarted = false;


/* =====================================================
   WEBRTC
===================================================== */

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

  if(id==="profile"){
    $("navProfile").classList.add("active");
  }

  if(id==="live"){
    $("navLive").classList.add("active");
  }

}


function setAudioStatus(text,type){

  const el=$("audioStatus");

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


  const protocol =
    location.protocol==="https:"
      ? "wss"
      : "ws";


  socket =
    new WebSocket(
      protocol +
      "://" +
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
    socket.readyState===
    WebSocket.OPEN
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

    currentLive=
      !!m.live;

    currentMeta=
      m.meta || null;

    updateLiveList();

    return;

  }


  if(m.type==="host-ready"){

    $("status").textContent=
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
        viewerPeers.get(m.from);

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

    $("viewerCount").textContent=
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
      "🎁 " + m.gift
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

    return;

  }

}


/* =====================================================
   LIVE LIST
===================================================== */

function updateLiveList(){

  const list=$("liveList");

  list.innerHTML="";


  if(!currentLive){

    list.innerHTML=
      '<div class="empty">' +
      '現在配信中のライブはありません' +
      '</div>';

    return;

  }


  const meta=
    currentMeta || {};


  const card=
    document.createElement("div");

  card.className="liveCard";


  const thumb=
    document.createElement("div");

  thumb.className="liveThumb";


  if(meta.image){

    const img=
      document.createElement("img");

    img.src=meta.image;

    thumb.appendChild(img);

  }else{

    const img=
      document.createElement("img");

    img.src="/voicebotalive_bg.png";

    thumb.appendChild(img);

  }


  const info=
    document.createElement("div");

  info.style.flex="1";


  const name=
    document.createElement("div");

  name.className="liveName";

  name.textContent=
    "🔴 " +
    (
      meta.name ||
      "配信者"
    );


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

  button.className="btn";

  button.textContent="見る";

  button.onclick=()=>{
    joinLive();
  };


  card.appendChild(thumb);

  card.appendChild(info);

  card.appendChild(button);

  list.appendChild(card);

}


/* =====================================================
   LIVE INFO
===================================================== */

function updateLiveInfo(){

  const meta=
    currentMeta || {};


  $("liveName").textContent=
    meta.name ||
    "配信者";


  $("liveTitleDisplay").textContent=
    meta.title ||
    "ライブ配信";


  if(meta.image){

    $("liveImage").src=
      meta.image;

    $("liveImage").style.display=
      "block";

  }else{

    $("liveImage").src=
      "/voicebotalive_bg.png";

    $("liveImage").style.display=
      "block";

  }

}


/* =====================================================
   BROADCAST
===================================================== */

async function startBroadcast(){

  if(role==="host"){
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
    .textContent=name;


  $("liveName")
    .textContent=name;


  $("liveTitleDisplay")
    .textContent=title;


  $("hostEndButton")
    .style.display="block";


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


  $("audioButton")
    .style.display="block";


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

          params.encodings[0]
            .maxBitrate=48000;

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

      if(
        peer.connectionState==="failed" ||
        peer.connectionState==="closed"
      ){

        viewerPeers.delete(
          viewerId
        );

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


/* =====================================================
   OPUS LOW LATENCY
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
      lines[i]
        .startsWith("a=rtpmap:")
      &&
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
    "a=fmtp:" +
    opusPayload +
    " minptime=10;maxptime=10;useinbandfec=1;stereo=0;usedtx=0";


  let found=false;


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
   VIEWER RECEIVE
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

          candidate:
            event.candidate

        });

      }

    };


  viewerPeer.oniceconnectionstatechange=
    ()=>{

      const state=
        viewerPeer.iceConnectionState;


      console.log(
        "VIEWER ICE:",
        state
      );


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

      console.log(
        "REMOTE TRACK:",
        event.track.kind
      );


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

        audio.style.width="1px";

        audio.style.height="1px";

        audio.style.opacity="0.01";

        audio.style.pointerEvents="none";

        audio.style.left="-10px";

        audio.style.top="-10px";


        document.body.appendChild(
          audio
        );

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
                r.track.kind==="audio"
            );


        if(receiver){

          if(
            "playoutDelayHint"
            in receiver
          ){

            try{

              receiver
                .playoutDelayHint=0;

            }catch(e){}

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
          .catch(error=>{
            console.log(
              "AUDIO PLAY",
              error
            );
          });

      }

    };


  try{

    await viewerPeer
      .setRemoteDescription(
        m.sdp
      );


    try{

      const transceivers=
        viewerPeer
          .getTransceivers();


      transceivers.forEach(
        transceiver=>{

          if(
            transceiver.receiver &&
            transceiver.receiver.track &&
            transceiver.receiver.track.kind===
            "audio"
          ){

            const capabilities=
              RTCRtpReceiver
                .getCapabilities(
                  "audio"
                );


            if(
              capabilities &&
              capabilities.codecs
            ){

              const opus=
                capabilities.codecs.filter(
                  codec=>
                    codec.mimeType &&
                    codec.mimeType
                      .toLowerCase()
                      ===
                    "audio/opus"
                );


              if(opus.length){

                try{

                  transceiver
                    .setCodecPreferences(
                      opus
                    );

                }catch(e){}

              }

            }

          }

        }
      );

    }catch(e){}


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
      document.createElement(
        "audio"
      );


    audio.id=
      "remoteAudio";


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


    document.body.appendChild(
      audio
    );

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
   STOP BROADCAST
===================================================== */

function stopBroadcast(){

  send({
    type:"leave-host"
  });


  if(localStream){

    localStream
      .getTracks()
      .forEach(track=>{
        track.stop();
      });

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
    .style.display="none";


  $("status")
    .textContent=
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

  div.className="comment";


  const n=
    document.createElement(
      "span"
    );

  n.className="commentName";

  n.textContent=
    name + "：";


  const t=
    document.createElement(
      "span"
    );

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
    gift +
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

      /*
        VoiceボタLive背景画像
      */

      if(
        req.url ===
        "/voicebotalive_bg.png"
      ){

        fs.readFile(
          IMAGE_FILE,
          (error,data)=>{

            if(error){

              console.error(
                "IMAGE ERROR:",
                error
              );

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


      /*
        faviconなど
      */

      if(
        req.url ===
        "/favicon.ico"
      ){

        res.writeHead(
          204
        );

        res.end();

        return;

      }


      /*
        アプリ本体
      */

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


const clients =
  new Set();


let broadcaster=null;

let liveMeta=null;


const viewers =
  new Map();


/* =====================================================
   WS SEND
===================================================== */

function wsSend(
  ws,
  data
){

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


/* =====================================================
   BROADCAST
===================================================== */

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
        .slice(2) +
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


        /* =================================================
           HELLO
        ================================================= */

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


        /* =================================================
           HOST
        ================================================= */

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


        /* =================================================
           META
        ================================================= */

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


        /* =================================================
           VIEWER
        ================================================= */

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


        /* =================================================
           OFFER
        ================================================= */

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


        /* =================================================
           ANSWER
        ================================================= */

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


        /* =================================================
           ICE
        ================================================= */

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


        /* =================================================
           CHAT
        ================================================= */

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


        /* =================================================
           GIFT
        ================================================= */

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


        /* =================================================
           END HOST
        ================================================= */

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


    /* =====================================================
       CLOSE
    ===================================================== */

    socket.on(
      "close",
      ()=>{

        clients.delete(socket);


        if(
          socket===broadcaster
        ){

          endLive();

          return;

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
      " DESIGN + LOW LATENCY AUDIO"
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
