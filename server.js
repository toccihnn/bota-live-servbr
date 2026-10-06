<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VoiceボタLive</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: sans-serif;
  background: #f7f3f8;
  color: #333;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  background: #fff;
}

/* =========================
   HEADER
========================= */

header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #eee;
  background: #fff;
}

header h1 {
  margin: 0;
  font-size: 22px;
}

/* =========================
   HOME
========================= */

#homeScreen {
  padding: 20px;
}

.homeImage {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 18px;
  margin-bottom: 20px;
}

.homeTitle {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 25px;
}

.startButton {
  width: 100%;
  border: none;
  border-radius: 15px;
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  background: #ff6fa8;
  color: white;
  cursor: pointer;
}

/* =========================
   STREAM SETUP
========================= */

#setupScreen {
  display: none;
  padding: 20px;
}

#setupScreen h2 {
  margin-top: 0;
}

.inputBox {
  width: 100%;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 16px;
  margin-bottom: 15px;
}

.selectBox {
  width: 100%;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 16px;
  margin-bottom: 15px;
}

.imageUpload {
  width: 100%;
  padding: 15px;
  border: 2px dashed #ddd;
  border-radius: 12px;
  margin-bottom: 15px;
  background: #fafafa;
}

.previewBox {
  width: 100%;
  height: 160px;
  border-radius: 15px;
  background: #eee;
  background-size: cover;
  background-position: center;
  margin-bottom: 20px;
}

.buttonRow {
  display: flex;
  gap: 10px;
}

.backButton,
.liveButton {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
}

.backButton {
  background: #eee;
}

.liveButton {
  background: #ff6fa8;
  color: white;
  font-weight: bold;
}

/* =========================
   LIVE SCREEN
========================= */

#liveScreen {
  display: none;
  min-height: calc(100vh - 60px);
  position: relative;
  overflow: hidden;
}

.liveBackground {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    #ff9ac2,
    #b58cff
  );
  background-size: cover;
  background-position: center;
  z-index: 0;
}

.liveOverlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.22);
  z-index: 1;
}

.liveContent {
  position: relative;
  z-index: 2;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  padding: 15px;
  color: white;
}

/* =========================
   LIVE TOP
========================= */

.liveTop {
  display: flex;
  align-items: center;
  gap: 10px;
}

.liveAvatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6fa8;
  font-weight: bold;
}

.liveInfo {
  flex: 1;
}

.liveTitle {
  font-weight: bold;
  font-size: 17px;
}

.liveStatus {
  font-size: 13px;
  opacity: .9;
}

.stopButton {
  border: none;
  background: rgba(0,0,0,.5);
  color: white;
  padding: 9px 12px;
  border-radius: 10px;
}

/* =========================
   COMMENTS
========================= */

.comments {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 120px;
}

.comment {
  display: inline-block;
  width: fit-content;
  max-width: 85%;
  background: rgba(0,0,0,.45);
  padding: 8px 12px;
  border-radius: 15px;
  margin-top: 7px;
}

/* =========================
   LIVE BOTTOM
========================= */

.liveBottom {
  position: absolute;
  left: 15px;
  right: 15px;
  bottom: 15px;
}

.commentArea {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.commentInput {
  flex: 1;
  border: none;
  padding: 13px;
  border-radius: 20px;
  outline: none;
}

.sendComment {
  border: none;
  border-radius: 20px;
  padding: 0 16px;
  background: #ff6fa8;
  color: white;
}

.actionButtons {
  display: flex;
  gap: 8px;
}

.actionButton {
  flex: 1;
  border: none;
  padding: 12px;
  border-radius: 15px;
  background: rgba(0,0,0,.5);
  color: white;
  font-size: 15px;
}

.likeButton {
  background: rgba(255,105,160,.8);
}

/* =========================
   GIFT PANEL
========================= */

#giftPanel {
  display: none;
  position: absolute;
  left: 15px;
  right: 15px;
  bottom: 110px;
  background: rgba(255,255,255,.97);
  color: #333;
  border-radius: 18px;
  padding: 15px;
  z-index: 10;
}

.giftTitle {
  font-weight: bold;
  margin-bottom: 10px;
}

.giftList {
  display: flex;
  gap: 10px;
}

.gift {
  flex: 1;
  border: none;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 12px 5px;
  cursor: pointer;
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 600px) {

  header h1 {
    font-size: 20px;
  }

  .homeImage {
    height: 190px;
  }

  .liveContent {
    padding: 12px;
  }
}
</style>
</head>

<body>

<div class="app">

<header>
  <h1>VoiceボタLive</h1>
</header>

<!-- =========================
     HOME
========================= -->

<section id="homeScreen">

  <!-- ホーム画像 -->
  <img
    class="homeImage"
    src="2149"
    onerror="this.style.display='none'"
    alt=""
  >

  <div class="homeTitle">
    VoiceボタLive
  </div>

  <button
    class="startButton"
    onclick="openSetup()"
  >
    🎙 配信する
  </button>

</section>


<!-- =========================
     SETUP
========================= -->

<section id="setupScreen">

  <h2>配信設定</h2>

  <input
    id="streamTitle"
    class="inputBox"
    type="text"
    placeholder="配信タイトルを入力"
  >

  <select
    id="backgroundSelect"
    class="selectBox"
    onchange="changeBackground()"
  >
    <option value="pink">
      🌸 ピンク
    </option>

    <option value="purple">
      💜 パープル
    </option>

    <option value="blue">
      💙 ブルー
    </option>

    <option value="night">
      🌙 ナイト
    </option>

    <option value="black">
      🖤 ブラック
    </option>

    <option value="white">
      🤍 ホワイト
    </option>
  </select>


  <!--
     背景画像アップロード
  -->

  <div class="imageUpload">

    <strong>
      📷 配信背景を自分の画像にする
    </strong>

    <br><br>

    <input
      id="backgroundImage"
      type="file"
      accept="image/*"
      onchange="previewBackground(event)"
    >

  </div>


  <div
    id="previewBox"
    class="previewBox"
  ></div>


  <div class="buttonRow">

    <button
      class="backButton"
      onclick="backHome()"
    >
      戻る
    </button>

    <button
      class="liveButton"
      onclick="startLive()"
    >
      🔴 配信開始
    </button>

  </div>

</section>


<!-- =========================
     LIVE
========================= -->

<section id="liveScreen">

  <div
    id="liveBackground"
    class="liveBackground"
  ></div>

  <div class="liveOverlay"></div>

  <div class="liveContent">

    <div class="liveTop">

      <div class="liveAvatar">
        🎙
      </div>

      <div class="liveInfo">

        <div
          id="liveTitle"
          class="liveTitle"
        >
          LIVE
        </div>

        <div class="liveStatus">
          🔴 LIVE 配信中
        </div>

      </div>

      <button
        class="stopButton"
        onclick="stopLive()"
      >
        終了
      </button>

    </div>


    <div
      id="comments"
      class="comments"
    >

      <div class="comment">
        🔊 ライブ音声を受信中
      </div>

    </div>


    <div class="liveBottom">

      <div class="commentArea">

        <input
          id="commentInput"
          class="commentInput"
          type="text"
          placeholder="コメントする..."
        >

        <button
          class="sendComment"
          onclick="sendComment()"
        >
          送信
        </button>

      </div>


      <div class="actionButtons">

        <button
          class="actionButton likeButton"
          onclick="sendLike()"
        >
          ❤️ いいね
        </button>

        <button
          class="actionButton"
          onclick="toggleGiftPanel()"
        >
          🎁 ギフト
        </button>

        <button
          class="actionButton"
          onclick="blockUser()"
        >
          🚫 ブロック
        </button>

      </div>

    </div>

  </div>


  <!-- =========================
       GIFT
  ========================= -->

  <div
    id="giftPanel"
  >

    <div class="giftTitle">
      🎁 ギフトを送る
    </div>

    <div class="giftList">

      <button
        class="gift"
        onclick="sendGift('ハート')"
      >
        ❤️<br>
        ハート
      </button>

      <button
        class="gift"
        onclick="sendGift('星')"
      >
        ⭐<br>
        星
      </button>

      <button
        class="gift"
        onclick="sendGift('花')"
      >
        🌸<br>
        花
      </button>

    </div>

  </div>

</section>

</div>


<script>

/* =====================================================
   BACKGROUND SETTINGS
===================================================== */

let selectedBackground =
  "linear-gradient(135deg, #ff9ac2, #b58cff)";

let uploadedBackground =
  "";


/* =====================================================
   HOME → SETUP
===================================================== */

function openSetup() {

  document.getElementById(
    "homeScreen"
  ).style.display = "none";

  document.getElementById(
    "setupScreen"
  ).style.display = "block";

}


/* =====================================================
   SETUP → HOME
===================================================== */

function backHome() {

  document.getElementById(
    "setupScreen"
  ).style.display = "none";

  document.getElementById(
    "homeScreen"
  ).style.display = "block";

}


/* =====================================================
   BACKGROUND SELECT
===================================================== */

function changeBackground() {

  const value =
    document.getElementById(
      "backgroundSelect"
    ).value;


  if (value === "pink") {

    selectedBackground =
      "linear-gradient(135deg, #ff9ac2, #ff6fa8)";

  }

  else if (value === "purple") {

    selectedBackground =
      "linear-gradient(135deg, #c084fc, #7c3aed)";

  }

  else if (value === "blue") {

    selectedBackground =
      "linear-gradient(135deg, #60a5fa, #2563eb)";

  }

  else if (value === "night") {

    selectedBackground =
      "linear-gradient(135deg, #111827, #312e81)";

  }

  else if (value === "black") {

    selectedBackground =
      "#111";

  }

  else if (value === "white") {

    selectedBackground =
      "#f8fafc";

  }


  uploadedBackground = "";

  document.getElementById(
    "previewBox"
  ).style.backgroundImage =
    "none";

  document.getElementById(
    "previewBox"
  ).style.background =
    selectedBackground;

}


/* =====================================================
   UPLOAD BACKGROUND IMAGE
===================================================== */

function previewBackground(event) {

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      uploadedBackground =
        e.target.result;


      document.getElementById(
        "previewBox"
      ).style.backgroundImage =
        "url('" +
        uploadedBackground +
        "')";


      document.getElementById(
        "previewBox"
      ).style.backgroundSize =
        "cover";


      document.getElementById(
        "previewBox"
      ).style.backgroundPosition =
        "center";

    };


  reader.readAsDataURL(file);

}


/* =====================================================
   START LIVE
===================================================== */

function startLive() {

  const title =
    document.getElementById(
      "streamTitle"
    ).value.trim();


  document.getElementById(
    "setupScreen"
  ).style.display = "none";


  document.getElementById(
    "liveScreen"
  ).style.display = "block";


  document.getElementById(
    "liveTitle"
  ).textContent =
    title || "VoiceボタLive";


  const background =
    document.getElementById(
      "liveBackground"
    );


  if (uploadedBackground) {

    background.style.backgroundImage =
      "url('" +
      uploadedBackground +
      "')";

    background.style.backgroundSize =
      "cover";

    background.style.backgroundPosition =
      "center";

  }

  else {

    background.style.background =
      selectedBackground;

    background.style.backgroundImage =
      "none";

  }


  /* マイク許可 */

  requestMicrophone();

}


/* =====================================================
   MICROPHONE
===================================================== */

async function requestMicrophone() {

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });


    console.log(
      "マイク許可OK",
      stream
    );


    addComment(
      "🎙 マイクが有効になりました"
    );

  }

  catch(error) {

    console.error(
      "microphone error",
      error
    );


    addComment(
      "⚠️ マイクの使用が許可されていません"
    );

  }

}


/* =====================================================
   STOP LIVE
===================================================== */

function stopLive() {

  document.getElementById(
    "liveScreen"
  ).style.display = "none";


  document.getElementById(
    "homeScreen"
  ).style.display = "block";


  document.getElementById(
    "comments"
  ).innerHTML =
    '<div class="comment">🔊 ライブ音声を受信中</div>';

}


/* =====================================================
   COMMENT
===================================================== */

function sendComment() {

  const input =
    document.getElementById(
      "commentInput"
    );


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  addComment(
    "💬 あなた：" + text
  );


  input.value = "";

}


/* =====================================================
   ADD COMMENT
===================================================== */

function addComment(text) {

  const comments =
    document.getElementById(
      "comments"
    );


  const div =
    document.createElement(
      "div"
    );


  div.className =
    "comment";


  div.textContent =
    text;


  comments.appendChild(div);


  comments.scrollTop =
    comments.scrollHeight;

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  addComment(
    "❤️ いいね！"
  );

}


/* =====================================================
   GIFT PANEL
===================================================== */

function toggleGiftPanel() {

  const panel =
    document.getElementById(
      "giftPanel"
    );


  if (
    panel.style.display === "block"
  ) {

    panel.style.display =
      "none";

  }

  else {

    panel.style.display =
      "block";

  }

}


/* =====================================================
   GIFT
===================================================== */

function sendGift(giftName) {

  addComment(
    "🎁 ギフト「" +
    giftName +
    "」を送りました！"
  );


  document.getElementById(
    "giftPanel"
  ).style.display =
    "none";

}


/* =====================================================
   BLOCK
===================================================== */

function blockUser() {

  const result =
    confirm(
      "このユーザーをブロックしますか？"
    );


  if (result) {

    addComment(
      "🚫 ユーザーをブロックしました"
    );

  }

}


/* =====================================================
   ENTER COMMENT
===================================================== */

document.getElementById(
  "commentInput"
).addEventListener(
  "keydown",
  function(event) {

    if (event.key === "Enter") {

      sendComment();

    }

  }
);

</script>

</body>
</html>
