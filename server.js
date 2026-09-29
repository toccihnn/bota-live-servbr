const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

/* =====================================================
   VoiceボタLive
   ALL-IN-ONE LIVE APP
   =====================================================

   FEATURES

   - Low latency WebRTC audio
   - Profile
   - Follow
   - Comments
   - Join notifications
   - Viewer list
   - Gifts
   - Points
   - Ranking
   - Notifications
   - Live history
   - Mute
   - Live title edit
   - Live image
   - Live list

   NOTE:
   This version stores data in memory.
   Restarting the server resets temporary data.
===================================================== */


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

<title>VoiceボタLive</title>

<style>

*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
  width:100%;
  min-height:100%;
  background:#000;
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
input,
textarea{
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

  background:
    radial-gradient(
      circle at 70% 0%,
      rgba(120,70,190,.35),
      transparent 35%
    ),
    linear-gradient(
      180deg,
      #08070d,
      #020204
    );

  position:relative;
  overflow:hidden;
}

.header{
  height:62px;
  padding:0 15px;

  display:flex;
  align-items:center;
  justify-content:space-between;

  border-bottom:
    1px solid rgba(255,255,255,.08);

  background:
    rgba(5,4,9,.96);

  position:sticky;
  top:0;
  z-index:50;
}

.logo{
  font-size:20px;
  font-weight:900;
}

.logo .bota{
  color:#dc82ff;
}

.logo .live{
  color:#8dbfff;
}

.status{
  font-size:10px;
  color:#aaa;
}

.screen{
  display:none;
  min-height:calc(100vh - 62px);
  padding-bottom:82px;
}

.screen.active{
  display:block;
}

.card{
  margin:14px;
  padding:16px;
  border-radius:20px;

  background:
    rgba(17,12,23,.94);

  border:
    1px solid rgba(255,255,255,.08);
}

.cardTitle{
  font-size:17px;
  font-weight:900;
  margin-bottom:14px;
}

.sectionTitle{
  padding:14px 14px 8px;
  font-size:15px;
  font-weight:900;
}


/* =====================================================
   HOME
===================================================== */

.homeHero{
  margin:14px;
  border-radius:24px;
  overflow:hidden;

  border:
    1px solid rgba(190,130,255,.25);

  background:#090711;
}

.moonScene{
  height:230px;
  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 72% 27%,
      rgba(235,242,255,.95) 0 7%,
      rgba(169,196,255,.4) 8%,
      transparent 23%
    ),
    linear-gradient(
      180deg,
      #09091b,
      #080512 55%,
      #020204
    );
}

.moon{
  position:absolute;

  width:90px;
  height:90px;

  right:68px;
  top:38px;

  border-radius:50%;

  background:
    radial-gradient(
      circle at 35% 30%,
      #fff,
      #dce7ff 48%,
      #9eafff
    );

  box-shadow:
    0 0 35px rgba(183,202,255,.75);
}

.flower{
  position:absolute;
  bottom:-4px;
  font-size:75px;
  opacity:.85;
}

.flower.left{
  left:20px;
}

.flower.right{
  right:20px;
}

.heroText{
  padding:17px;
}

.heroTitle{
  font-size:21px;
  font-weight:900;
  margin-bottom:6px;
}

.heroSub{
  color:#aaa1b3;
  font-size:12px;
  margin-bottom:15px;
}


/* =====================================================
   BUTTONS
===================================================== */

.btn{
  border:0;
  border-radius:14px;
  padding:11px 15px;

  color:#fff;
  font-weight:800;

  background:
    linear-gradient(
      90deg,
      #54bfff,
      #835bff,
      #e35bca
    );
}

.btn.dark{
  background:#17121f;
  border:
    1px solid #392a48;
}

.btn.red{
  background:
    linear-gradient(
      90deg,
      #9f2b55,
      #ec4e77
    );
}

.btn.green{
  background:
    linear-gradient(
      90deg,
      #22a66f,
      #48d59b
    );
}

.btn.smallBtn{
  padding:8px 11px;
  border-radius:10px;
  font-size:11px;
}


/* =====================================================
   INPUT
===================================================== */

.input,
.textarea{
  width:100%;
  padding:13px;
  margin:6px 0;

  color:#fff;
  background:#09070d;

  border:
    1px solid #3b2b4a;

  border-radius:13px;
  outline:none;
}

.textarea{
  min-height:90px;
  resize:none;
}

.label{
  display:block;
  color:#aaa1ae;
  font-size:12px;
  margin-top:10px;
}


/* =====================================================
   PREVIEW
===================================================== */

.preview{
  width:100%;
  height:180px;

  margin-top:8px;

  border-radius:16px;
  overflow:hidden;

  display:grid;
  place-items:center;

  border:
    1px dashed #513b65;

  background:#0a0710;
  color:#71677b;
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
  gap:10px;
  align-items:center;

  padding:10px;
  border-radius:15px;

  background:
    rgba(255,255,255,.035);

  margin-bottom:8px;
}

.liveThumb{
  width:82px;
  height:65px;

  flex-shrink:0;

  border-radius:12px;
  overflow:hidden;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #17132d,
      #40215a
    );
}

.liveThumb img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.liveName{
  font-weight:800;
  font-size:14px;
}

.liveTitle{
  color:#aaa0b0;
  font-size:12px;
  margin-top:4px;
}

.liveViewers{
  color:#8e8496;
  font-size:10px;
  margin-top:5px;
}

.empty{
  padding:20px;
  text-align:center;
  color:#777;
  font-size:12px;
}


/* =====================================================
   PROFILE
===================================================== */

.profileHeader{
  display:flex;
  align-items:center;
  gap:13px;
}

.profileAvatar{
  width:62px;
  height:62px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #55c9ff,
      #b64cff
    );

  font-size:28px;

  border:
    2px solid rgba(255,255,255,.3);
}

.profileName{
  font-size:18px;
  font-weight:900;
}

.profilePoints{
  color:#aaa;
  font-size:11px;
  margin-top:4px;
}

.statGrid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px;
  margin-top:15px;
}

.stat{
  padding:12px 5px;
  text-align:center;
  border-radius:13px;
  background:#0d0a12;
  border:1px solid #2b2035;
}

.statValue{
  font-size:18px;
  font-weight:900;
}

.statLabel{
  color:#8e8595;
  font-size:10px;
  margin-top:4px;
}


/* =====================================================
   FOLLOW
===================================================== */

.followRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;

  padding:10px;

  border-radius:14px;

  background:#0d0a12;

  margin-bottom:7px;
}

.followName{
  font-size:13px;
  font-weight:800;
}


/* =====================================================
   LIVE
===================================================== */

.liveScreen{
  min-height:calc(100vh - 62px);

  display:flex;
  flex-direction:column;

  padding-bottom:75px;
}

.liveCover{
  height:280px;

  position:relative;
  overflow:hidden;

  background:
    radial-gradient(
      circle at 70% 25%,
      #3d2c61,
      #08070d 50%
    );
}

.liveCover img{
  width:100%;
  height:100%;
  object-fit:cover;
  opacity:.75;
}

.liveCover::after{
  content:"";
  position:absolute;
  inset:0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.58),
      transparent 40%,
      rgba(0,0,0,.9)
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
  width:40px;
  height:40px;

  border-radius:50%;

  display:grid;
  place-items:center;

  background:
    linear-gradient(
      135deg,
      #55c9ff,
      #b64cff
    );

  border:
    2px solid rgba(255,255,255,.45);
}

.hostName{
  font-size:14px;
  font-weight:900;
}

.liveBadge{
  display:inline-block;

  padding:4px 7px;
  border-radius:7px;

  background:#e93671;

  font-size:9px;
  font-weight:900;

  margin-top:3px;
}

.viewerBadge{
  padding:8px 10px;
  border-radius:99px;

  background:
    rgba(0,0,0,.5);

  border:
    1px solid rgba(255,255,255,.14);

  font-size:11px;
}

.liveTitleOverlay{
  position:absolute;
  left:15px;
  right:15px;
  bottom:15px;
  z-index:5;

  font-size:18px;
  font-weight:900;
}

.liveActions{
  display:flex;
  gap:7px;
  padding:10px 14px 0;
}

.actionButton{
  flex:1;
  border:0;
  border-radius:12px;
  padding:10px 5px;
  background:#17121f;
  color:#fff;
  border:1px solid #392a48;
  font-size:11px;
  font-weight:800;
}


/* =====================================================
   AUDIO
===================================================== */

.audioBox{
  margin:10px 14px 0;

  padding:13px;

  border-radius:16px;

  background:#100c16;

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
  border-radius:13px;

  color:#fff;
  font-weight:900;

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

  min-height:130px;
  max-height:250px;

  overflow-y:auto;

  padding:10px 14px;
}

.comment{
  font-size:13px;
  margin:7px 0;
}

.commentName{
  color:#d28cff;
  font-weight:800;
  margin-right:5px;
}

.systemComment{
  color:#8b8191;
  font-size:11px;
  margin:8px 0;
}

.giftComment{
  color:#ffd86b;
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

  height:70px;

  padding:10px;

  display:flex;
  gap:6px;
  align-items:center;

  background:
    rgba(8,6,12,.98);

  border-top:
    1px solid #281c34;

  z-index:40;
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
    rgba(8,6,12,.98);

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

  max-height:82vh;
  overflow-y:auto;

  padding:20px;

  border-radius:
    25px 25px 0 0;

  background:#120d19;

  border:
    1px solid #443151;
}

.gifts{
  display:grid;
  grid-template-columns:repeat(3,1fr);

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
   NOTIFICATION
===================================================== */

.notification{
  padding:11px;

  border-radius:13px;

  background:#0d0a12;

  border:1px solid #2d2138;

  margin-bottom:7px;

  font-size:12px;
}

.notificationTime{
  color:#777;
  font-size:9px;
  margin-top:4px;
}


/* =====================================================
   RANKING
===================================================== */

.rankItem{
  display:flex;
  align-items:center;
  gap:10px;

  padding:11px;

  margin-bottom:7px;

  border-radius:14px;

  background:#0d0a12;

  border:1px solid #2b2035;
}

.rankNumber{
  width:30px;
  font-size:18px;
  font-weight:900;
  text-align:center;
}

.rankName{
  flex:1;
  font-weight:800;
}

.rankPoints{
  color:#d8a1ff;
  font-size:12px;
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

  white-space:nowrap;
}

.toast.show{
  display:block;
}


/* =====================================================
   GIFT EFFECT
===================================================== */

.giftEffect{
  position:fixed;
  left:50%;
  top:45%;

  transform:
    translate(-50%,-50%)
    scale(.5);

  opacity:0;

  z-index:300;

  font-size:70px;

  pointer-events:none;
}

.giftEffect.show{
  animation:
    giftPop
    1.15s
    ease-out
    forwards;
}

@keyframes giftPop{

  0%{
    opacity:0;
    transform:
      translate(-50%,-50%)
      scale(.3);
  }

  25%{
    opacity:1;
    transform:
      translate(-50%,-50%)
      scale(1.25);
  }

  65%{
    opacity:1;
    transform:
      translate(-50%,-50%)
      scale(1);
  }

  100%{
    opacity:0;
    transform:
      translate(-50%,-65%)
      scale(.8);
  }

}


/* =====================================================
   FOLLOW BUTTON
===================================================== */

.followButton{
  border:0;

  padding:7px 11px;

  border-radius:10px;

  background:
    linear-gradient(
      90deg,
      #9d5cff,
      #e45ac8
    );

  color:#fff;

  font-size:10px;
  font-weight:900;
}

.followButton.following{
  background:#211a2b;
  border:1px solid #523c61;
}


/* =====================================================
   HOST PANEL
===================================================== */

.hostPanel{
  margin:10px 14px 0;
  padding:12px;

  border-radius:15px;

  background:#100c16;
  border:1px solid #35243f;
}

.hostPanelTitle{
  font-size:12px;
  font-weight:900;
  margin-bottom:8px;
}

.hostPanelRow{
  display:flex;
  gap:6px;
}

.hostPanelRow .input{
  margin:0;
}


/* =====================================================
   SCROLL
===================================================== */

::-webkit-scrollbar{
  width:4px;
}

::-webkit-scrollbar-thumb{
  background:#4b3857;
  border-radius:10px;
}

</style>
</head>


<body>

<div class="app">


<!-- ===================================================
     HEADER
=================================================== -->

<header class="header">

  <div class="logo">
    Voice<span class="bota">ボタ</span><span class="live">Live</span>
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

      <div class="moon"></div>

      <div class="flower left">🪻</div>
      <div class="flower right">🪻</div>

    </div>

    <div class="heroText">

      <div class="heroTitle">
        声でつながる、みんなの居場所。
      </div>

      <div class="heroSub">
        月光の夜に、声でつながろう。
      </div>

      <button class="btn" onclick="openHost()">
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
      🏆 ランキング
    </div>

    <div id="homeRanking"></div>

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


      <div
        id="liveTitleOverlay"
        class="liveTitleOverlay"
      >
        ライブ配信
      </div>

    </div>


    <div class="liveActions">

      <button
        id="followButton"
        class="actionButton"
        onclick="toggleFollow()"
      >
        ❤️ フォロー
      </button>

      <button
        class="actionButton"
        onclick="openViewers()"
      >
        👥 視聴者
      </button>

      <button
        class="actionButton"
        onclick="openGifts()"
      >
        🎁 ギフト
      </button>

    </div>


    <div
      id="hostPanel"
      class="hostPanel"
      style="display:none"
    >

      <div class="hostPanelTitle">
        🎙️ 配信者コントロール
      </div>

      <div class="hostPanelRow">

        <input
          id="editLiveTitle"
          class="input"
          placeholder="配信タイトル"
        >

        <button
          class="btn smallBtn"
          onclick="updateLiveTitle()"
        >
          変更
        </button>

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

<section id="profile" class="screen">

  <div class="card">

    <div class="cardTitle">
      👤 マイページ
    </div>

    <div class="profileHeader">

      <div class="profileAvatar">
        🎙️
      </div>

      <div style="flex:1">

        <div
          id="profileName"
          class="profileName"
        >
          ぼたもち
        </div>

        <div
          id="profilePoints"
          class="profilePoints"
        >
          ⭐ 0ポイント
        </div>

      </div>

      <button
        class="btn smallBtn"
        onclick="openProfileEdit()"
      >
        編集
      </button>

    </div>


    <div class="statGrid">

      <div class="stat">
        <div
          id="followingCount"
          class="statValue"
        >
          0
        </div>
        <div class="statLabel">
          フォロー
        </div>
      </div>

      <div class="stat">
        <div
          id="followerCount"
          class="statValue"
        >
          0
        </div>
        <div class="statLabel">
          フォロワー
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

  </div>


  <div class="card">

    <div class="cardTitle">
      ❤️ フォロー中
    </div>

    <div id="followingList"></div>

  </div>


  <div class="card">

    <div class="cardTitle">
      🔔 通知
    </div>

    <div id="notificationList"></div>

  </div>


  <div class="card">

    <div class="cardTitle">
      📜 配信履歴
    </div>

    <div id="historyList"></div>

  </div>

</section>


<!-- ===================================================
     NAV
=================================================== -->

<nav class="nav">

  <button onclick="showScreen('home')">
    <span>⌂</span>
    ホーム
  </button>

  <button onclick="openHost()">
    <span>🎙️</span>
    配信
  </button>

  <button onclick="showScreen('profile')">
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
        onclick="sendGift('🌙 月光花',10)"
      >
        <span class="giftIcon">🌙</span>
        月光花
        <div class="small">
          10pt
        </div>
      </button>

      <button
        class="gift"
        onclick="sendGift('💜 ハート',20)"
      >
        <span class="giftIcon">💜</span>
        ハート
        <div class="small">
          20pt
        </div>
      </button>

      <button
        class="gift"
        onclick="sendGift('✨ 星の雫',50)"
      >
        <span class="giftIcon">✨</span>
        星の雫
        <div class="small">
          50pt
        </div>
      </button>

      <button
        class="gift"
        onclick="sendGift('🌈 虹',100)"
      >
        <span class="giftIcon">🌈</span>
        虹
        <div class="small">
          100pt
        </div>
      </button>

      <button
        class="gift"
        onclick="sendGift('🌸 桜',200)"
      >
        <span class="giftIcon">🌸</span>
        桜
        <div class="small">
          200pt
        </div>
      </button>

      <button
        class="gift"
        onclick="sendGift('👑 王冠',500)"
      >
        <span class="giftIcon">👑</span>
        王冠
        <div class="small">
          500pt
        </div>
      </button>

    </div>

  </div>

</div>


<!-- ===================================================
     VIEWERS
=================================================== -->

<div
  id="viewerModal"
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

      <b>👥 視聴者</b>

      <button
        class="btn dark"
        onclick="closeViewers()"
      >
        閉じる
      </button>

    </div>

    <div
      id="viewerList"
      style="margin-top:15px"
    ></div>

  </div>

</div>


<!-- ===================================================
     PROFILE EDIT
=================================================== -->

<div
  id="profileModal"
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

      <b>👤 プロフィール編集</b>

      <button
        class="btn dark"
        onclick="closeProfileEdit()"
      >
        閉じる
      </button>

    </div>

    <label class="label">
      ニックネーム
    </label>

    <input
      id="profileEditName"
      class="input"
      maxlength="30"
    >

    <button
      class="btn"
      style="margin-top:10px"
      onclick="saveProfile()"
    >
      保存
    </button>

  </div>

</div>


<!-- ===================================================
     GIFT EFFECT
=================================================== -->

<div
  id="giftEffect"
  class="giftEffect"
>
  🎁
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

let myUserId = null;

let myProfile = {
  name:"ぼたもち"
};

let following = new Set();

let mutedUsers = new Set();

let notifications = [];

let history = [];

let currentViewers = [];

let currentHostId = null;


/* =====================================================
   WEBRTC
   ※ 現在の低遅延設定を維持
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

  if(id==="profile"){
    requestProfileData();
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

  if(m.type==="hello-ok"){

    myUserId=m.id;

    myProfile=
      m.profile || {
        name:"ぼたもち"
      };

    following=
      new Set(
        m.following || []
      );

    updateProfileUI();

    return;

  }


  if(m.type==="state"){

    currentLive=
      !!m.live;

    currentMeta=
      m.meta || null;

    currentHostId=
      m.hostId || null;

    updateLiveList();

    if(m.ranking){
      renderRanking(
        "homeRanking",
        m.ranking
      );
    }

    return;

  }


  if(m.type==="profile"){

    myProfile=
      m.profile ||
      myProfile;

    following=
      new Set(
        m.following || []
      );

    updateProfileUI();

    return;

  }


  if(m.type==="profile-data"){

    myProfile=
      m.profile ||
      myProfile;

    following=
      new Set(
        m.following || []
      );

    notifications=
      m.notifications || [];

    history=
      m.history || [];

    updateProfileUI();

    renderNotifications();

    renderHistory();

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

    currentHostId=
      m.hostId ||
      currentHostId;

    updateLiveList();

    applyLiveMeta();

    return;

  }


  if(m.type==="viewer"){

    if(role==="host"){

      createOffer(m.id);

    }

    return;

  }


  if(m.type==="viewer-list"){

    currentViewers=
      m.viewers || [];

    renderViewerList();

    $("viewerCount").textContent=
      currentViewers.length;

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

    if(
      mutedUsers.has(m.userId)
    ){
      return;
    }

    addComment(
      m.name,
      m.text
    );

    return;

  }


  if(m.type==="system"){

    addSystemComment(
      m.text
    );

    return;

  }


  if(m.type==="gift"){

    if(
      !mutedUsers.has(m.userId)
    ){

      addGiftComment(
        m.name,
        m.gift
      );

      showGiftEffect(
        m.giftIcon ||
        "🎁"
      );

    }

    return;

  }


  if(m.type==="notification"){

    notifications.unshift(m.item);

    if(
      notifications.length>50
    ){

      notifications=
        notifications.slice(0,50);

    }

    renderNotifications();

    showToast(
      m.item.text
    );

    return;

  }


  if(m.type==="follow-update"){

    if(m.following){

      following.add(
        m.hostId
      );

    }else{

      following.delete(
        m.hostId
      );

    }

    updateProfileUI();

    updateFollowButton();

    return;

  }


  if(m.type==="ranking"){

    renderRanking(
      "homeRanking",
      m.ranking
    );

    return;

  }


  if(m.type==="live-ended"){

    currentLive=false;
    currentMeta=null;
    currentHostId=null;

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
   PROFILE
===================================================== */

function requestProfileData(){

  send({
    type:"get-profile-data"
  });

}


function updateProfileUI(){

  if(!$("profileName")){
    return;
  }

  const name=
    myProfile.name ||
    "ぼたもち";

  $("profileName")
    .textContent=name;

  $("profileEditName")
    .value=name;

  $("profilePoints")
    .textContent=
      "⭐ " +
      Number(
        myProfile.points || 0
      ).toLocaleString() +
      "ポイント";

  $("followingCount")
    .textContent=
      following.size;

  $("followerCount")
    .textContent=
      Number(
        myProfile.followers || 0
      );

  $("giftCount")
    .textContent=
      Number(
        myProfile.giftsSent || 0
      );

  renderFollowing();

}


function openProfileEdit(){

  $("profileEditName")
    .value=
      myProfile.name ||
      "ぼたもち";

  $("profileModal")
    .classList
    .add("show");

}


function closeProfileEdit(){

  $("profileModal")
    .classList
    .remove("show");

}


function saveProfile(){

  const name=
    $("profileEditName")
      .value
      .trim();

  if(!name){
    return;
  }

  send({

    type:"update-profile",

    name:name

  });

  closeProfileEdit();

  showToast(
    "プロフィールを更新しました"
  );

}


function renderFollowing(){

  const box=
    $("followingList");

  if(!box){
    return;
  }

  box.innerHTML="";

  if(!following.size){

    box.innerHTML=
      '<div class="empty">' +
      'まだフォローしていません' +
      '</div>';

    return;

  }

  following.forEach(
    hostId=>{

      const row=
        document.createElement("div");

      row.className="followRow";

      row.innerHTML=
        '<div>' +
        '<div class="followName">' +
        '🎙️ ' +
        escapeHtml(hostId) +
        '</div>' +
        '</div>' +
        '<button class="btn dark smallBtn">' +
        'フォロー中' +
        '</button>';

      box.appendChild(row);

    }
  );

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

    thumb.textContent="🌙";

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


  const viewers=
    document.createElement("div");

  viewers.className="liveViewers";

  viewers.textContent=
    "👥 " +
    (
      meta.viewers ||
      0
    ) +
    "人";


  info.appendChild(name);
  info.appendChild(title);
  info.appendChild(viewers);


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

            /*
              現在の低遅延設定を維持
            */

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

  $("hostEndButton")
    .style.display="block";

  $("hostPanel")
    .style.display="block";

  $("editLiveTitle")
    .value=title;


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

  $("hostPanel")
    .style.display="none";


  setAudioStatus(
    "🔊 配信に接続しています...",
    ""
  );


  applyLiveMeta();


  showScreen("live");


  send({
    type:"join-viewer"
  });

}


function applyLiveMeta(){

  const meta=
    currentMeta || {};


  $("liveName")
    .textContent=
      meta.name ||
      "配信者";


  $("liveTitleOverlay")
    .textContent=
      meta.title ||
      "ライブ配信";


  if(
    $("editLiveTitle")
  ){

    $("editLiveTitle")
      .value=
        meta.title ||
        "";

  }


  if(meta.image){

    $("liveImage").src=
      meta.image;

    $("liveImage")
      .style.display="block";

  }else{

    $("liveImage")
      .style.display="none";

  }

  updateFollowButton();

}


/* =====================================================
   FOLLOW
===================================================== */

function toggleFollow(){

  if(!currentHostId){

    showToast(
      "配信者情報を取得中です"
    );

    return;

  }

  send({

    type:"toggle-follow",

    hostId:
      currentHostId

  });

}


function updateFollowButton(){

  const btn=
    $("followButton");

  if(!btn){
    return;
  }

  if(
    currentHostId &&
    following.has(currentHostId)
  ){

    btn.textContent=
      "💜 フォロー中";

    btn.classList.add(
      "following"
    );

  }else{

    btn.textContent=
      "❤️ フォロー";

    btn.classList.remove(
      "following"
    );

  }

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

        sender.setParameters(
          params
        ).catch(()=>{});

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

    const line=lines[i];


    if(
      line.startsWith("a=rtpmap:")
      &&
      line
        .toLowerCase()
        .includes("opus/48000")
    ){

      const match=
        line.match(
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


  let fmtpIndex=-1;


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

      fmtpIndex=i;

      break;

    }

  }


  if(fmtpIndex>=0){

    lines[fmtpIndex]=fmtp;

  }else{

    const rtpIndex=
      lines.findIndex(
        line=>
          line.startsWith(
            "a=rtpmap:"+opusPayload
          )
      );


    if(rtpIndex>=0){

      lines.splice(
        rtpIndex+1,
        0,
        fmtp
      );

    }

  }


  return lines.join("\\r\\n");

}


/* =====================================================
   VIEWER RECEIVE OFFER
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
   VIEWERS
===================================================== */

function openViewers(){

  send({
    type:"get-viewers"
  });

  $("viewerModal")
    .classList
    .add("show");

}


function closeViewers(){

  $("viewerModal")
    .classList
    .remove("show");

}


function renderViewerList(){

  const box=
    $("viewerList");

  box.innerHTML="";

  if(!currentViewers.length){

    box.innerHTML=
      '<div class="empty">' +
      'まだ視聴者はいません' +
      '</div>';

    return;

  }


  currentViewers.forEach(
    viewer=>{

      const row=
        document.createElement("div");

      row.className="followRow";


      const info=
        document.createElement("div");

      info.innerHTML=
        '<div class="followName">' +
        '👤 ' +
        escapeHtml(
          viewer.name
        ) +
        '</div>';


      const button=
        document.createElement("button");

      button.className=
        "btn dark smallBtn";

      button.textContent=
        mutedUsers.has(viewer.id)
          ? "ミュート解除"
          : "ミュート";


      button.onclick=()=>{

        if(
          mutedUsers.has(viewer.id)
        ){

          mutedUsers.delete(
            viewer.id
          );

        }else{

          mutedUsers.add(
            viewer.id
          );

        }

        renderViewerList();

      };


      row.appendChild(info);
      row.appendChild(button);

      box.appendChild(row);

    }
  );

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

  currentHostId=null;


  $("hostEndButton")
    .style.display="none";

  $("hostPanel")
    .style.display="none";


  $("status")
    .textContent=
      "● 接続済み";


  showScreen("home");

}


/* =====================================================
   CHANGE LIVE TITLE
===================================================== */

function updateLiveTitle(){

  if(role!=="host"){
    return;
  }

  const title=
    $("editLiveTitle")
      .value
      .trim();

  if(!title){
    return;
  }

  send({

    type:"update-live-title",

    title:title

  });

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


function addSystemComment(text){

  const box=
    $("comments");


  const div=
    document.createElement(
      "div"
    );

  div.className=
    "systemComment";

  div.textContent=
    text;


  box.appendChild(div);

  box.scrollTop=
    box.scrollHeight;

}


function addGiftComment(
  name,
  gift
){

  const box=
    $("comments");


  const div=
    document.createElement(
      "div"
    );

  div.className=
    "comment giftComment";


  div.textContent=
    "🎁 " +
    name +
    " が " +
    gift +
    " を送りました";


  box.appendChild(div);

  box.scrollTop=
    box.scrollHeight;

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


function sendGift(
  gift,
  points
){

  closeGifts();


  send({

    type:"gift",

    gift:gift,

    points:points

  });


  showToast(
    gift +
    " を送りました 🎁"
  );

}


function showGiftEffect(icon){

  const effect=
    $("giftEffect");

  effect.textContent=
    icon || "🎁";

  effect.classList.remove(
    "show"
  );

  void effect.offsetWidth;

  effect.classList.add(
    "show"
  );

}


/* =====================================================
   NOTIFICATIONS
===================================================== */

function renderNotifications(){

  const box=
    $("notificationList");

  if(!box){
    return;
  }

  box.innerHTML="";

  if(!notifications.length){

    box.innerHTML=
      '<div class="empty">' +
      '通知はありません' +
      '</div>';

    return;

  }


  notifications
    .slice(0,30)
    .forEach(item=>{

      const div=
        document.createElement(
          "div"
        );

      div.className=
        "notification";

      div.innerHTML=
        '<div>' +
        escapeHtml(
          item.text ||
          ""
        ) +
        '</div>' +
        '<div class="notificationTime">' +
        escapeHtml(
          item.time ||
          ""
        ) +
        '</div>';

      box.appendChild(div);

    });

}


/* =====================================================
   HISTORY
===================================================== */

function renderHistory(){

  const box=
    $("historyList");

  if(!box){
    return;
  }

  box.innerHTML="";

  if(!history.length){

    box.innerHTML=
      '<div class="empty">' +
      'まだ配信履歴がありません' +
      '</div>';

    return;

  }


  history
    .slice(0,20)
    .forEach(item=>{

      const div=
        document.createElement(
          "div"
        );

      div.className=
        "notification";

      div.innerHTML=
        '<div style="font-weight:800">' +
        escapeHtml(
          item.title ||
          "ライブ配信"
        ) +
        '</div>' +

        '<div class="small">' +
        escapeHtml(
          item.host ||
          ""
        ) +
        '</div>' +

        '<div class="notificationTime">' +
        escapeHtml(
          item.date ||
          ""
        ) +
        '</div>';

      box.appendChild(div);

    });

}


/* =====================================================
   RANKING
===================================================== */

function renderRanking(
  targetId,
  ranking
){

  const box=
    $(targetId);

  if(!box){
    return;
  }

  box.innerHTML="";

  if(!ranking || !ranking.length){

    box.innerHTML=
      '<div class="empty">' +
      'ランキングデータがありません' +
      '</div>';

    return;

  }


  ranking
    .slice(0,10)
    .forEach(
      (item,index)=>{

        const row=
          document.createElement(
            "div"
          );

        row.className=
          "rankItem";


        const num=
          document.createElement(
            "div"
          );

        num.className=
          "rankNumber";

        num.textContent=
          String(index+1);


        const name=
          document.createElement(
            "div"
          );

        name.className=
          "rankName";

        name.textContent=
          "👤 " +
          (
            item.name ||
            "ユーザー"
          );


        const points=
          document.createElement(
            "div"
          );

        points.className=
          "rankPoints";

        points.textContent=
          "⭐ " +
          Number(
            item.points || 0
          ).toLocaleString();


        row.appendChild(num);
        row.appendChild(name);
        row.appendChild(points);

        box.appendChild(row);

      }
    );

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
   ESCAPE
===================================================== */

function escapeHtml(value){

  return String(
    value || ""
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

let liveStartedAt=null;

let liveViewerPeak=0;

let liveGiftPoints=0;

const viewers =
  new Map();


/* =====================================================
   USERS
===================================================== */

const users =
  new Map();


/*
  user:

  {
    id,
    name,
    points,
    followers,
    following,
    giftsSent,
    giftsReceived,
    notifications,
    history
  }
*/


function createUser(socket){

  const id=
    "user_" +
    Math.random()
      .toString(36)
      .slice(2,10) +
    Date.now()
      .toString(36);


  const user={

    id:id,

    name:"ぼたもち",

    points:0,

    followers:0,

    following:new Set(),

    giftsSent:0,

    giftsReceived:0,

    notifications:[],

    history:[]

  };


  users.set(
    id,
    user
  );


  socket.userId=id;

  socket.name=
    user.name;

  return user;

}


function getUser(socket){

  if(!socket){
    return null;
  }

  return users.get(
    socket.userId
  ) || null;

}


/* =====================================================
   HELPERS
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


function nowText(){

  return new Date()
    .toLocaleString(
      "ja-JP",
      {
        timeZone:"Asia/Tokyo"
      }
    );

}


function makeNotification(
  text
){

  return {

    text:text,

    time:nowText()

  };

}


function getRanking(){

  return Array.from(
    users.values()
  )
  .map(
    user=>({

      id:user.id,

      name:user.name,

      points:
        Number(
          user.points || 0
        )

    })
  )
  .sort(
    (a,b)=>
      b.points-a.points
  )
  .slice(
    0,
    10
  );

}


function sendRanking(){

  broadcast({

    type:"ranking",

    ranking:
      getRanking()

  });

}


function sendProfile(
  socket
){

  const user=
    getUser(socket);

  if(!user){
    return;
  }


  wsSend(
    socket,
    {

      type:"profile",

      profile:{

        id:user.id,

        name:user.name,

        points:user.points,

        followers:user.followers,

        giftsSent:user.giftsSent,

        giftsReceived:
          user.giftsReceived

      },

      following:
        Array.from(
          user.following
        )

    }
  );

}


function sendProfileData(
  socket
){

  const user=
    getUser(socket);

  if(!user){
    return;
  }


  wsSend(
    socket,
    {

      type:"profile-data",

      profile:{

        id:user.id,

        name:user.name,

        points:user.points,

        followers:user.followers,

        giftsSent:user.giftsSent,

        giftsReceived:
          user.giftsReceived

      },

      following:
        Array.from(
          user.following
        ),

      notifications:
        user.notifications
          .slice(0,50),

      history:
        user.history
          .slice(0,30)

    }
  );

}


/* =====================================================
   LIVE META
===================================================== */

function makeLiveMeta(){

  if(!liveMeta){
    return null;
  }


  return {

    name:
      liveMeta.name,

    title:
      liveMeta.title,

    image:
      liveMeta.image,

    viewers:
      viewers.size

  };

}


function sendLiveState(
  socket
){

  wsSend(
    socket,
    {

      type:"state",

      live:
        !!broadcaster,

      meta:
        makeLiveMeta(),

      hostId:
        broadcaster
          ? broadcaster.userId
          : null,

      viewers:
        viewers.size,

      ranking:
        getRanking()

    }
  );

}


/* =====================================================
   VIEWER LIST
===================================================== */

function getViewerList(){

  return Array.from(
    viewers.values()
  )
  .map(
    socket=>({

      id:
        socket.userId,

      name:
        socket.name ||

        "ゲスト"

    })
  );

}


function sendViewerList(){

  const list=
    getViewerList();


  if(broadcaster){

    wsSend(
      broadcaster,
      {

        type:"viewer-list",

        viewers:list

      }
    );

  }


  viewers.forEach(
    viewer=>{

      wsSend(
        viewer,
        {

          type:"viewer-list",

          viewers:list

        }
      );

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


    socket.name="ゲスト";

    socket.role="unknown";


    const user=
      createUser(socket);


    /*
      Initial state
    */

    wsSend(
      socket,
      {

        type:"hello-ok",

        id:
          user.id,

        profile:{

          id:user.id,

          name:user.name,

          points:user.points,

          followers:user.followers,

          giftsSent:user.giftsSent

        },

        following:
          Array.from(
            user.following
          )

      }
    );


    sendLiveState(
      socket
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


        const user=
          getUser(socket);


        if(!user){
          return;
        }


        /* =================================================
           HELLO
        ================================================= */

        if(
          m.type==="hello"
        ){

          sendLiveState(
            socket
          );

          sendProfile(
            socket
          );

          return;

        }


        /* =================================================
           GET PROFILE
        ================================================= */

        if(
          m.type==="get-profile-data"
        ){

          sendProfileData(
            socket
          );

          return;

        }


        /* =================================================
           UPDATE PROFILE
        ================================================= */

        if(
          m.type==="update-profile"
        ){

          const name=
            String(
              m.name || ""
            )
            .trim()
            .slice(
              0,
              30
            );


          if(!name){
            return;
          }


          user.name=name;

          socket.name=name;


          sendProfile(
            socket
          );


          /*
            If currently host,
            update live name too.
          */

          if(
            socket===broadcaster &&
            liveMeta
          ){

            liveMeta.name=
              name;


            broadcast({

              type:"live-meta",

              meta:
                makeLiveMeta(),

              hostId:
                broadcaster.userId

            });

          }


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


          socket.role="host";


          const hostName=
            String(
              m.name ||
              user.name ||
              "ぼたもち"
            )
            .trim()
            .slice(
              0,
              30
            );


          user.name=
            hostName;

          socket.name=
            hostName;


          broadcaster=socket;

          liveStartedAt=
            Date.now();

          liveViewerPeak=0;

          liveGiftPoints=0;


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
                makeLiveMeta(),

              hostId:
                socket.userId,

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
              )
              .slice(
                0,
                30
              ),

            title:
              String(
                m.meta?.title ||
                "ライブ配信"
              )
              .slice(
                0,
                80
              ),

            image:
              typeof m.meta?.image==="string"
                ? m.meta.image.slice(
                    0,
                    900000
                  )
                : ""

          };


          broadcast({

            type:"live-meta",

            meta:
              makeLiveMeta(),

            hostId:
              broadcaster.userId

          });


          return;

        }


        /* =================================================
           UPDATE LIVE TITLE
        ================================================= */

        if(
          m.type==="update-live-title"
        ){

          if(
            socket!==broadcaster
          ){

            return;

          }


          const title=
            String(
              m.title || ""
            )
            .trim()
            .slice(
              0,
              80
            );


          if(!title){
            return;
          }


          if(liveMeta){

            liveMeta.title=
              title;

          }


          broadcast({

            type:"live-meta",

            meta:
              makeLiveMeta(),

            hostId:
              broadcaster.userId

          });


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


          socket.role="viewer";


          /*
            Avoid duplicate entry
          */

          viewers.set(
            socket.id,
            socket
          );


          liveViewerPeak=
            Math.max(
              liveViewerPeak,
              viewers.size
            );


          wsSend(
            socket,
            {

              type:"live-meta",

              meta:
                makeLiveMeta(),

              hostId:
                broadcaster.userId

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


          /*
            Join notification
          */

          broadcast({

            type:"system",

            text:
              "👋 " +
              socket.name +
              " さんが入室しました"

          });


          broadcast({

            type:"count",

            n:
              viewers.size

          });


          sendViewerList();


          return;

        }


        /* =================================================
           GET VIEWERS
        ================================================= */

        if(
          m.type==="get-viewers"
        ){

          wsSend(
            socket,
            {

              type:"viewer-list",

              viewers:
                getViewerList()

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


          broadcast({

            type:"chat",

            userId:
              socket.userId,

            name:
              socket.name,

            text:
              text

          });


          return;

        }


        /* =================================================
           GIFT
        ================================================= */

        if(
          m.type==="gift"
        ){

          if(
            !broadcaster
          ){

            return;

          }


          const gift=
            String(
              m.gift || ""
            )
            .slice(
              0,
              50
            );


          const points=
            Math.max(
              1,
              Math.min(
                5000,
                Number(
                  m.points || 1
                )
              )
            );


          const icons={

            "🌙 月光花":"🌙",

            "💜 ハート":"💜",

            "✨ 星の雫":"✨",

            "🌈 虹":"🌈",

            "🌸 桜":"🌸",

            "👑 王冠":"👑"

          };


          /*
            Sender points
          */

          user.points +=
            points;


          user.giftsSent +=
            1;


          /*
            Host receives points
          */

          const hostUser=
            getUser(
              broadcaster
            );


          if(hostUser){

            hostUser.points +=
              points;

            hostUser.giftsReceived +=
              points;

          }


          liveGiftPoints +=
            points;


          broadcast({

            type:"gift",

            userId:
              socket.userId,

            name:
              socket.name,

            gift:
              gift,

            points:
              points,

            giftIcon:
              icons[gift] ||
              "🎁"

          });


          /*
            Host notification
          */

          if(hostUser){

            const item=
              makeNotification(
                "🎁 " +
                socket.name +
                " さんから " +
                gift +
                " を受け取りました"
              );


            hostUser.notifications
              .unshift(
                item
              );


            wsSend(
              broadcaster,
              {

                type:"notification",

                item:item

              }
            );

          }


          sendProfile(
            socket
          );


          sendProfile(
            broadcaster
          );


          sendRanking();


          return;

        }


        /* =================================================
           FOLLOW
        ================================================= */

        if(
          m.type==="toggle-follow"
        ){

          const hostId=
            String(
              m.hostId || ""
            );


          if(!hostId){
            return;
          }


          const hostUser=
            users.get(
              hostId
            );


          if(!hostUser){

            return;

          }


          /*
            Cannot follow yourself
          */

          if(
            hostId===
            socket.userId
          ){

            return;

          }


          let isFollowing=
            false;


          if(
            user.following.has(
              hostId
            )
          ){

            user.following.delete(
              hostId
            );


            hostUser.followers=
              Math.max(
                0,
                hostUser.followers-1
              );


            isFollowing=false;

          }else{

            user.following.add(
              hostId
            );


            hostUser.followers +=
              1;


            isFollowing=true;


            const item=
              makeNotification(
                "❤️ " +
                socket.name +
                " さんがあなたをフォローしました"
              );


            hostUser.notifications
              .unshift(
                item
              );


            /*
              Notify host if online
            */

            for(
              const c of clients
            ){

              if(
                c.userId===
                hostId
              ){

                wsSend(
                  c,
                  {

                    type:"notification",

                    item:item

                  }
                );

              }

            }

          }


          wsSend(
            socket,
            {

              type:"follow-update",

              following:
                isFollowing,

              hostId:
                hostId

            }
          );


          sendProfile(
            socket
          );


          return;

        }


        /* =================================================
           LEAVE HOST
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


    /* ===================================================
       CLOSE
    =================================================== */

    socket.on(
      "close",
      ()=>{

        clients.delete(socket);


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

          broadcast({

            type:"count",

            n:
              viewers.size

          });


          broadcast({

            type:"system",

            text:
              "👋 " +
              socket.name +
              " さんが退室しました"

          });


          sendViewerList();

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


  const host=
    broadcaster;


  const hostUser=
    getUser(
      host
    );


  /*
    Save history
  */

  if(hostUser){

    const duration=
      liveStartedAt
        ? Math.max(
            0,
            Math.floor(
              (
                Date.now() -
                liveStartedAt
              ) / 1000
            )
          )
        : 0;


    const minutes=
      Math.floor(
        duration / 60
      );


    const seconds=
      duration % 60;


    const historyItem={

      host:
        hostUser.name,

      title:
        liveMeta?.title ||
        "ライブ配信",

      date:
        nowText(),

      viewers:
        liveViewerPeak,

      giftPoints:
        liveGiftPoints,

      duration:
        minutes +
        "分 " +
        seconds +
        "秒"

    };


    hostUser.history
      .unshift(
        historyItem
      );


    if(
      hostUser.history.length>50
    ){

      hostUser.history=
        hostUser.history.slice(
          0,
          50
        );

    }

  }


  broadcaster=null;

  liveMeta=null;

  liveStartedAt=null;

  liveViewerPeak=0;

  liveGiftPoints=0;


  /*
    Tell viewers
  */

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


  /*
    Global state
  */

  broadcast({

    type:"state",

    live:false,

    meta:null,

    hostId:null,

    viewers:0,

    ranking:
      getRanking()

  });


  sendRanking();

}


/* =====================================================
   START SERVER
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
      " ALL-IN-ONE LIVE APP"
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
