<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>音声ライブ配信</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f7f3f8;
  color:#333;
}

button,
input,
textarea,
select{
  font-size:16px;
}

.app{
  max-width:600px;
  margin:0 auto;
  min-height:100vh;
  background:#fff;
}

.header{
  padding:18px;
  text-align:center;
  font-size:22px;
  font-weight:bold;
  border-bottom:1px solid #eee;
}

.screen{
  padding:18px;
}

.card{
  border:1px solid #eee;
  border-radius:18px;
  padding:18px;
  margin-bottom:18px;
  background:#fff;
  box-shadow:0 3px 12px rgba(0,0,0,.06);
}

h2{
  margin-top:0;
  font-size:20px;
}

label{
  display:block;
  margin-top:14px;
  margin-bottom:6px;
  font-weight:bold;
}

input,
textarea,
select{
  width:100%;
  padding:12px;
  border:1px solid #ddd;
  border-radius:10px;
  outline:none;
  background:#fff;
}

textarea{
  min-height:90px;
  resize:vertical;
}

.color-row{
  display:flex;
  gap:10px;
  align-items:center;
}

.color-row input[type="color"]{
  width:70px;
  height:45px;
  padding:3px;
}

.preview{
  position:relative;
  min-height:360px;
  border-radius:22px;
  overflow:hidden;
  padding:20px;
  color:#fff;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  background:#8e6ba8;
  transition:.2s;
}

.preview-overlay{
  position:absolute;
  inset:0;
  background:linear-gradient(
    to bottom,
    rgba(0,0,0,.45),
    rgba(0,0,0,.1),
    rgba(0,0,0,.6)
  );
}

.preview-content{
  position:relative;
  z-index:2;
}

.live{
  display:inline-block;
  padding:6px 12px;
  background:#e53935;
  border-radius:20px;
  font-size:13px;
  font-weight:bold;
}

.title{
  margin-top:18px;
  font-size:25px;
  font-weight:bold;
  word-break:break-word;
}

.description{
  margin-top:10px;
  font-size:15px;
  line-height:1.6;
  white-space:pre-wrap;
}

.host{
  margin-top:12px;
  font-size:14px;
}

.bottom{
  position:relative;
  z-index:2;
  display:flex;
  justify-content:center;
  gap:10px;
}

.control{
  width:58px;
  height:58px;
  border-radius:50%;
  border:0;
  color:#fff;
  background:rgba(0,0,0,.55);
  cursor:pointer;
}

.main-button{
  width:100%;
  border:0;
  border-radius:14px;
  padding:15px;
  margin-top:15px;
  background:#8e6ba8;
  color:#fff;
  font-weight:bold;
  cursor:pointer;
}

.end-button{
  background:#e53935;
}

.secondary{
  background:#eee;
  color:#333;
}

.status{
  margin-top:12px;
  text-align:center;
  font-size:14px;
  color:#666;
}

.hidden{
  display:none;
}

.image-preview{
  width:100%;
  max-height:180px;
  object-fit:cover;
  border-radius:12px;
  margin-top:10px;
}

.notice{
  padding:12px;
  border-radius:10px;
  background:#f5f5f5;
  font-size:13px;
  line-height:1.5;
}
</style>
</head>

<body>

<div class="app">

  <div class="header">
    🎤 音声ライブ
  </div>

  <!-- カスタム設定画面 -->
  <div class="screen" id="settingScreen">

    <div class="card">

      <h2>🎨 配信画面をカスタム</h2>

      <label>配信者名</label>
      <input
        id="hostName"
        type="text"
        placeholder="配信者名を入力"
        value="配信者"
      >

      <label>配信タイトル</label>
      <input
        id="streamTitle"
        type="text"
        placeholder="例：のんびり雑談しよう"
        maxlength="50"
      >

      <label>配信説明</label>
      <textarea
        id="streamDescription"
        placeholder="配信内容を入力してください"
      ></textarea>

      <label>背景色</label>

      <div class="color-row">
        <input
          id="backgroundColor"
          type="color"
          value="#8e6ba8"
        >

        <span id="colorText">#8e6ba8</span>
      </div>

      <label>背景画像</label>

      <input
        id="backgroundImage"
        type="file"
        accept="image/*"
      >

      <img
        id="imagePreview"
        class="image-preview hidden"
      >

      <div class="notice">
        配信タイトル・説明・背景色・背景画像を設定してから
        「配信画面を確認」を押してください。
      </div>

      <button
        class="main-button"
        onclick="updatePreview()"
      >
        👀 配信画面を確認
      </button>

      <button
        class="main-button"
        onclick="startStream()"
      >
        🔴 配信開始
      </button>

      <div
        id="status"
        class="status"
      >
        配信待機中
      </div>

    </div>

    <!-- プレビュー -->
    <div class="card">

      <h2>配信画面プレビュー</h2>

      <div
        id="preview"
        class="preview"
      >

        <div class="preview-overlay"></div>

        <div class="preview-content">

          <span class="live">
            LIVE
          </span>

          <div
            id="previewTitle"
            class="title"
          >
            配信タイトル
          </div>

          <div
            id="previewDescription"
            class="description"
          >
            ここに配信説明が表示されます。
          </div>

          <div
            id="previewHost"
            class="host"
          >
            👤 配信者
          </div>

        </div>

        <div class="bottom">

          <button
            class="control"
            onclick="toggleMic()"
            id="micButton"
          >
            🎤
          </button>

          <button
            class="control"
            onclick="toggleMute()"
            id="muteButton"
          >
            🔊
          </button>

        </div>

      </div>

    </div>

  </div>


  <!-- 配信中画面 -->
  <div
    class="screen hidden"
    id="liveScreen"
  >

    <div class="card">

      <div
        id="livePreview"
        class="preview"
      >

        <div class="preview-overlay"></div>

        <div class="preview-content">

          <span class="live">
            🔴 LIVE配信中
          </span>

          <div
            id="liveTitle"
            class="title"
          >
          </div>

          <div
            id="liveDescription"
            class="description"
          >
          </div>

          <div
            id="liveHost"
            class="host"
          >
          </div>

        </div>

        <div class="bottom">

          <button
            class="control"
            onclick="toggleMic()"
            id="liveMicButton"
          >
            🎤
          </button>

          <button
            class="control"
            onclick="toggleMute()"
            id="liveMuteButton"
          >
            🔊
          </button>

        </div>

      </div>

      <div
        id="liveStatus"
        class="status"
      >
        配信中です
      </div>

      <button
        class="main-button end-button"
        onclick="endStream()"
      >
        ⏹ 配信終了
      </button>

    </div>

  </div>

</div>


<script>

let audioStream = null;
let audioTrack = null;
let isMicOn = true;
let isMuted = false;
let backgroundImageData = "";


/* =========================
   カスタム設定
========================= */

const titleInput =
  document.getElementById("streamTitle");

const descriptionInput =
  document.getElementById("streamDescription");

const hostInput =
  document.getElementById("hostName");

const backgroundColor =
  document.getElementById("backgroundColor");

const backgroundImage =
  document.getElementById("backgroundImage");


/* =========================
   背景画像
========================= */

backgroundImage.addEventListener(
  "change",
  function(event){

    const file =
      event.target.files[0];

    if(!file){
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      function(e){

        backgroundImageData =
          e.target.result;

        const imagePreview =
          document.getElementById(
            "imagePreview"
          );

        imagePreview.src =
          backgroundImageData;

        imagePreview.classList.remove(
          "hidden"
        );

        updatePreview();
      };

    reader.readAsDataURL(file);
  }
);


/* =========================
   プレビュー更新
========================= */

function updatePreview(){

  const title =
    titleInput.value.trim()
    || "配信タイトル";

  const description =
    descriptionInput.value.trim()
    || "ここに配信説明が表示されます。";

  const host =
    hostInput.value.trim()
    || "配信者";

  const color =
    backgroundColor.value;


  document.getElementById(
    "previewTitle"
  ).textContent = title;

  document.getElementById(
    "previewDescription"
  ).textContent = description;

  document.getElementById(
    "previewHost"
  ).textContent =
    "👤 " + host;


  const preview =
    document.getElementById(
      "preview"
    );

  preview.style.backgroundColor =
    color;

  if(backgroundImageData){

    preview.style.backgroundImage =
      "url('" +
      backgroundImageData +
      "')";

    preview.style.backgroundSize =
      "cover";

    preview.style.backgroundPosition =
      "center";

  }else{

    preview.style.backgroundImage =
      "none";

  }


  document.getElementById(
    "colorText"
  ).textContent = color;
}


/* =========================
   マイク許可
========================= */

async function requestMicrophone(){

  try{

    audioStream =
      await navigator.mediaDevices
        .getUserMedia({
          audio:true
        });

    audioTrack =
      audioStream.getAudioTracks()[0];

    isMicOn = true;

    updateMicButton();

    return true;

  }catch(error){

    console.error(error);

    alert(
      "マイクの使用を許可してください。"
    );

    return false;
  }
}


/* =========================
   配信開始
========================= */

async function startStream(){

  updatePreview();

  const title =
    titleInput.value.trim();

  if(!title){

    alert(
      "配信タイトルを入力してください。"
    );

    titleInput.focus();

    return;
  }


  const microphoneOK =
    await requestMicrophone();

  if(!microphoneOK){
    return;
  }


  document.getElementById(
    "liveTitle"
  ).textContent =
    title;

  document.getElementById(
    "liveDescription"
  ).textContent =
    descriptionInput.value.trim();

  document.getElementById(
    "liveHost"
  ).textContent =
    "👤 " +
    (
      hostInput.value.trim()
      || "配信者"
    );


  const livePreview =
    document.getElementById(
      "livePreview"
    );

  livePreview.style.backgroundColor =
    backgroundColor.value;


  if(backgroundImageData){

    livePreview.style.backgroundImage =
      "url('" +
      backgroundImageData +
      "')";

    livePreview.style.backgroundSize =
      "cover";

    livePreview.style.backgroundPosition =
      "center";

  }


  document.getElementById(
    "settingScreen"
  ).classList.add(
    "hidden"
  );

  document.getElementById(
    "liveScreen"
  ).classList.remove(
    "hidden"
  );


  document.getElementById(
    "status"
  ).textContent =
    "🔴 配信中";


  document.getElementById(
    "liveStatus"
  ).textContent =
    "🔴 配信中です";

}


/* =========================
   配信終了
========================= */

function endStream(){

  if(audioStream){

    audioStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

    audioStream = null;
    audioTrack = null;
  }


  document.getElementById(
    "liveScreen"
  ).classList.add(
    "hidden"
  );

  document.getElementById(
    "settingScreen"
  ).classList.remove(
    "hidden"
  );


  document.getElementById(
    "status"
  ).textContent =
    "配信終了";

}


/* =========================
   マイクON/OFF
========================= */

function toggleMic(){

  if(!audioTrack){

    requestMicrophone();

    return;
  }


  isMicOn =
    !isMicOn;

  audioTrack.enabled =
    isMicOn;

  updateMicButton();
}


function updateMicButton(){

  const text =
    isMicOn
    ? "🎤"
    : "🔇";


  document.getElementById(
    "micButton"
  ).textContent =
    text;


  document.getElementById(
    "liveMicButton"
  ).textContent =
    text;
}


/* =========================
   ミュート表示
========================= */

function toggleMute(){

  isMuted =
    !isMuted;


  const text =
    isMuted
    ? "🔇"
    : "🔊";


  document.getElementById(
    "muteButton"
  ).textContent =
    text;


  document.getElementById(
    "liveMuteButton"
  ).textContent =
    text;
}


/* =========================
   色変更
========================= */

backgroundColor.addEventListener(
  "input",
  function(){

    updatePreview();

  }
);


/* =========================
   初期表示
========================= */

updatePreview();

</script>

</body>
</html>
