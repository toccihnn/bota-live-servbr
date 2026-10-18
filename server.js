const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

let clients = new Set();
let broadcaster = null;
// 1配信につき、各リスナーの最初のいいね通知だけ表示する
let liveLikeNotifiedUsers = new Set();
const fsSocial = require("fs");
const socialPath = require("path").join(__dirname,"voicebota_social.json");
let socialData = {following:{},blocked:{},profiles:{}};
try {const v=JSON.parse(fsSocial.readFileSync(socialPath,"utf8"));socialData={...socialData,...v};}catch(e){}
function limitEmojiText(value, max) {
  const str = String(value == null ? "" : value);
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const parts = new Intl.Segmenter("ja", {granularity:"grapheme"}).segment(str);
    let result = "", count = 0;
    for (const part of parts) {
      if (count++ >= max) break;
      result += part.segment;
    }
    return result;
  }
  return Array.from(str).slice(0, max).join("");
}
function saveSocialData(){try{fsSocial.writeFileSync(socialPath,JSON.stringify(socialData));}catch(e){console.error("social save",e.message);}}
function socialIds(key,id){return Array.isArray(socialData[key][id])?socialData[key][id]:[];}
function blockedEither(a,b){return !!(a&&b&&(socialIds("blocked",a).includes(b)||socialIds("blocked",b).includes(a)));}
function socialState(ws){
 const id=ws.clientId;
 const following=socialIds("following",id).filter(other=>!blockedEither(id,other));
 const followers=Object.keys(socialData.following).filter(other=>socialIds("following",other).includes(id)&&!blockedEither(id,other));
 const ids=[...new Set([...following,...followers,...socialIds("blocked",id)])];
 const profiles={};
 ids.forEach(userId=>{
   const online=[...clients].find(c=>c.clientId===userId);
   const p=(online&&online.profile)||socialData.profiles[userId]||{};
   profiles[userId]={name:p.name||"ユーザー",avatar:p.avatar||""};
 });
 const hidden=Object.keys(socialData.blocked).filter(other=>blockedEither(id,other));
 sendTo(ws,{type:"social_state",following,followers,blocked:socialIds("blocked",id),hidden,profiles});
}
function refreshBlockVisibility(){
 removeBlockedViewer();
 sendLiveList();
 clients.forEach(c=>socialState(c));
}
function removeBlockedViewer(){
 if(!broadcaster)return;
 clients.forEach(c=>{if(c!==broadcaster&&c.liveJoined&&blockedEither(c.clientId,broadcaster.clientId)){
 c.liveJoined=false;sendTo(c,{type:"block_live_exit"});
 sendTo(broadcaster,{type:"viewer_removed",viewerId:c.clientId});
 }});
 sendPresence();
}


let liveInfo = {
  active: false,
  id: null,
  name: "",
  title: ""
};


/* =========================================================
   HTML
========================================================= */

const HTML = String.raw`
<!DOCTYPE html>
<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0,user-scalable=no"
>

<meta name="theme-color" content="#050510">

<title>voiceボタLive</title>

<style>
/* v39: typography only. No image, layout, or feature changes. */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap');
:root {
  --vb-serif-ja: "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif;
  --vb-serif-en: "Cormorant Garamond", "Noto Serif JP", serif;
  --vb-sans: "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif;
}
/* Main interface remains readable; decorative titles get the elegant serif. */
body { font-family: var(--vb-sans); }
.logo, .hero-title, .section-title, .live-title,
#discoverAllTitle, #moonLiveSetup h1, #moonLiveSetup h2,
#moonLiveSetup .mls-title, .mypage-title, .profile-name {
  font-family: var(--vb-serif-ja);
  font-weight: 600;
}
.hero-title span { font-family: var(--vb-serif-en); }
.section-sub, .hero-small { font-family: var(--vb-serif-en); }
/* Preserve native emoji/Simeji input and comment rendering fixes. */
#commentInput, #commentList .comment-item { font-family: sans-serif !important; }




* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  background: #050510;
  color: white;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    "Apple Color Emoji",
    "Noto Color Emoji",
    "Segoe UI Emoji",
    sans-serif;
}

body {
  overflow-x: hidden;
}

button,
input {
  font-family: inherit;
}

button {
  cursor: pointer;
}

.app {
  min-height: 100vh;
  padding-bottom: 90px;
}


/* =========================
   HEADER
========================= */

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  height: 58px;

  z-index: 1000;

  display: flex;
  align-items: center;

  padding: 0 18px;

  background: rgba(5,5,16,.92);

  backdrop-filter: blur(15px);

  border-bottom:
    1px solid rgba(130,140,255,.15);
}

.logo {
  font-size: 18px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #8fd9ff,
      #d38cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}


/* =========================
   HOME
========================= */

.hero {
  margin-top: 58px;
  width: 100%;
  overflow: hidden;
}

.hero-image-wrap {
  width: 100%;
  max-width: 1000px;
  margin: auto;
  position: relative;
  overflow: hidden;
  background: #050510;
}

.hero-image {
  display: block;
  width: 100%;
  height: auto;
}

.hero-gradient {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;

  height: 55%;

  background:
    linear-gradient(
      0deg,
      #050510,
      rgba(5,5,16,.7),
      transparent
    );
}

.hero-content {
  max-width: 1000px;

  margin:
    -30px auto 0;

  padding:
    0 18px 28px;

  position: relative;
}

.hero-small {
  font-size: 12px;
  color: #b8c7ff;
  font-weight: 800;
}

.hero-title {
  margin: 8px 0 0;

  font-size:
    clamp(28px,8vw,48px);

  line-height: 1.2;

  font-weight: 900;
}

.hero-title span {
  background:
    linear-gradient(
      90deg,
      #fff,
      #9edcff,
      #d38cff
    );

  -webkit-background-clip: text;
  background-clip: text;

  color: transparent;
}

.hero-description {
  margin-top: 12px;

  font-size: 13px;

  line-height: 1.8;

  color: #d2d9ef;
}


/* =========================
   SECTION
========================= */

.section {
  max-width: 1000px;
  margin: auto;
  padding: 20px 15px 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 900;
}

.section-sub {
  font-size: 10px;
  color: #7780a0;
}


/* =========================
   LIVE LIST
========================= */

.live-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty {
  padding: 35px 20px;

  text-align: center;

  color: #78819e;

  background: #0b0f25;

  border:
    1px solid rgba(100,120,200,.12);

  border-radius: 20px;
}

.live-card {
  min-height: 90px;

  display: flex;
  align-items: center;

  padding: 14px;

  border-radius: 20px;

  background:
    linear-gradient(
      120deg,
      #18204c,
      #090d20
    );

  border:
    1px solid rgba(120,140,255,.15);
}

.live-avatar {
  width: 58px;
  height: 58px;

  flex-shrink: 0;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 27px;

  background:
    radial-gradient(
      circle,
      #72d7ff,
      #4259e8 55%,
      #24104b
    );
}

.live-info {
  min-width: 0;
  flex: 1;
  padding-left: 12px;
}

.live-name {
  font-size: 14px;
  font-weight: 900;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.live-title {
  margin-top: 5px;

  font-size: 12px;

  color: #aab3d1;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.live-badge {
  display: inline-block;

  margin-top: 6px;

  padding: 3px 9px;

  border-radius: 999px;

  font-size: 9px;
  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3d70,
      #a82cff
    );
}


/* =========================
   FEATURES
========================= */

.features {
  display: grid;

  grid-template-columns:
    repeat(2,1fr);

  gap: 10px;

  margin-top: 15px;
}

.feature {
  min-height: 110px;

  padding: 17px 14px;

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      #19204b,
      #090d20
    );

  border:
    1px solid rgba(120,140,255,.12);
}

.feature-icon {
  font-size: 25px;
}

.feature-title {
  margin-top: 7px;

  font-size: 13px;
  font-weight: 900;
}

.feature-text {
  margin-top: 5px;

  font-size: 10px;

  line-height: 1.6;

  color: #8f99ba;
}


/* =========================
   LIVE PANEL
========================= */

.live-panel {
  display: none;

  position: fixed;

  inset: 0;

  z-index: 2000;

  background-color: rgba(4,5,17,.98);
  background-image: linear-gradient(rgba(4,5,17,.30), rgba(4,5,17,.58));
  background-size: cover;
  background-position: center;
  background-attachment: fixed;

  overflow-y: auto;

  padding:
    20px 16px 110px;
}

.live-panel.show {
  display: block;
}

.panel-header {
  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-top: 20px;
}

.panel-title {
  max-width: 75%;

  font-size: 21px;

  font-weight: 900;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.panel-live {
  padding: 5px 10px;

  border-radius: 999px;

  font-size: 9px;

  font-weight: 900;

  background:
    linear-gradient(
      90deg,
      #ff3d6b,
      #a82cff
    );
}

.panel-status {
  margin-top: 14px;

  padding: 14px;

  border-radius: 15px;

  background: #101638;

  color: #bed0ff;

  font-size: 13px;
}

.audio-status {
  margin-top: 14px;

  padding: 30px 20px;

  text-align: center;

  border-radius: 22px;

  background:
    linear-gradient(
      145deg,
      #232d69,
      #0b0f2a
    );
}

.audio-icon {
  font-size: 58px;
}

#audioText {
  margin-top: 8px;

  font-size: 14px;

  font-weight: 800;
}

#remoteAudio {
  display: none;
}

.panel-button {
  width: 100%;

  height: 52px;

  margin-top: 11px;

  border: 0;

  border-radius: 16px;

  color: white;

  font-size: 14px;

  font-weight: 900;
}

.start-button {
  background:
    linear-gradient(
      100deg,
      #24cfff,
      #5265ff
    );
}

.stop-button {
  background:
    linear-gradient(
      100deg,
      #ff3c62,
      #a52dff
    );
}

.close-button {
  background: #1b203c;

  border:
    1px solid rgba(140,150,255,.2);
}

.like-button {
  background:
    rgba(255,60,130,.16);

  color: #ff8bb5;
}


/* =========================
   BACKGROUND CUSTOM
========================= */

.background-custom {
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(8,12,32,.88);
  border: 1px solid rgba(120,140,255,.2);
}

.background-custom-title {
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 10px;
}

.background-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.background-option {
  min-height: 54px;
  padding: 7px 3px;
  border: 2px solid rgba(255,255,255,.18);
  border-radius: 12px;
  color: white;
  font-size: 11px;
  font-weight: 800;
}

.background-option:active { transform: scale(.97); }
.background-blue { background: linear-gradient(135deg,#244fc7,#111735); }
.background-purple { background: linear-gradient(135deg,#8d3ed1,#251044); }
.background-pink { background: linear-gradient(135deg,#f05caa,#6c205b); }
.background-image { background: #222944; }
.background-reset {
  width: 100%;
  margin-top: 9px;
  padding: 10px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 11px;
  background: #161c37;
  color: white;
  font-weight: 800;
}

/* =========================
   COMMENTS
========================= */

.comments {
  margin-top: 14px;
}

.comment-list {
  height: 180px;

  overflow-y: auto;

  padding: 10px;

  border-radius: 15px;

  background: #080c20;
}

.comment-item {
  padding: 8px 4px;

  border-bottom:
    1px solid rgba(255,255,255,.06);

  font-size: 13px;
}

.comment-input {
  display: flex;

  gap: 8px;

  margin-top: 8px;
}

.comment-input input {
  min-width: 0;

  flex: 1;

  height: 46px;

  padding: 0 12px;

  border-radius: 13px;

  border:
    1px solid rgba(120,140,255,.2);

  background: #0d1230;

  color: white;

  outline: none;
}

.comment-input button {
  width: 70px;

  border: 0;

  border-radius: 13px;

  background: #526cff;

  color: white;

  font-weight: 900;
}


/* =========================
   BOTTOM NAV
========================= */

.bottom-nav {
  position: fixed;

  left: 0;
  right: 0;
  bottom: 0;

  z-index: 1500;

  height: 78px;

  display: grid;

  grid-template-columns:
    repeat(5,1fr);

  padding:
    5px 6px
    calc(
      5px +
      env(safe-area-inset-bottom)
    );

  background:
    rgba(4,7,20,.97);

  backdrop-filter:
    blur(18px);

  border-top:
    1px solid rgba(120,140,255,.12);
}

.nav-item {
  border: 0;

  background: transparent;

  color: #727c9c;

  font-size: 10px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;
}

.nav-icon {
  font-size: 20px;
}

.nav-live {
  width: 52px;
  height: 52px;

  margin-top: -20px;

  border-radius: 50%;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 24px;

  background:
    linear-gradient(
      145deg,
      #35d8ff,
      #5568ff,
      #c54cff
    );

  border:
    3px solid #070a20;

  box-shadow:
    0 0 25px
    rgba(80,110,255,.65);
}


/* =========================
   DESKTOP
========================= */

@media (min-width:700px) {

  .features {
    grid-template-columns:
      repeat(4,1fr);
  }

}



/* ===== 画像のようなフルスクリーン配信レイアウト ===== */
.live-panel {
  display:none; position:fixed; inset:0; z-index:2000;
  padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
  overflow:hidden; background-color:#050510;
  background-image:linear-gradient(180deg,rgba(3,5,16,.22) 0%,rgba(3,5,16,.04) 42%,rgba(3,5,16,.58) 100%);
  background-size:cover; background-position:center; background-repeat:no-repeat;
}
.live-panel.show {display:block}
.panel-header {position:absolute;top:max(18px,env(safe-area-inset-top));left:18px;right:72px;margin:0;display:flex;align-items:center;gap:10px;z-index:5;min-height:58px}
.panel-title {max-width:calc(100% - 72px);font-size:20px;text-shadow:0 2px 8px #000;}
.panel-live {font-size:12px;padding:7px 13px;flex-shrink:0}
.panel-status {position:absolute;top:88px;left:18px;max-width:72%;margin:0;padding:7px 11px;border-radius:20px;background:rgba(5,8,22,.58);backdrop-filter:blur(8px);font-size:12px;z-index:4}
.audio-status {display:none!important;}
#audioText {margin:0;font-size:12px;text-shadow:0 1px 6px #000;color:rgba(255,255,255,.82);}
.audio-icon {display:none!important}
#remoteAudio {display:none}
#likeButton {position:static;width:66px;height:66px;flex-shrink:0;margin:0;border-radius:50%;padding:0;background:rgba(12,12,25,.72);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:12px;z-index:auto;box-shadow:0 4px 18px #0004}
#likeButton::first-line {font-size:25px}
.action-rail {position:absolute;right:14px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px;z-index:6;align-items:center}
.live-action {width:66px;height:66px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(10,10,24,.72);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px;backdrop-filter:blur(8px)}
.live-action .action-emoji {font-size:25px;line-height:1.1}
.panel-close {position:absolute;right:14px;top:max(18px,env(safe-area-inset-top));width:54px;height:54px;border-radius:50%;border:1px solid #ffffff30;background:#0505109c;color:#fff;font-size:28px;z-index:7}
.background-custom {display:none;position:absolute;right:88px;top:48%;width:min(270px,calc(100vw - 120px));margin:0;padding:12px;background:rgba(7,10,27,.94);backdrop-filter:blur(12px);z-index:10;box-shadow:0 8px 30px #0008}
.background-custom.open {display:block}
.background-custom-title {font-size:13px}
.background-options {grid-template-columns:repeat(2,minmax(0,1fr))}
.background-option {min-height:42px}
.comments {position:absolute;left:14px;right:88px;bottom:calc(94px + env(safe-area-inset-bottom));margin:0;z-index:5;display:flex;flex-direction:column;gap:8px}
.comment-list {height:min(34vh,280px);min-height:100px;overflow-y:auto;overscroll-behavior:contain;padding:0;background:transparent;border-radius:0;scrollbar-width:thin;scrollbar-color:#ffffff66 transparent;mask-image:linear-gradient(to bottom,transparent 0%,#000 8%,#000 100%)}
.comment-item {display:table;max-width:100%;margin:5px 0;padding:9px 12px;border:0;border-radius:18px;background:rgba(3,5,15,.76);color:#fff;font-size:14px;line-height:1.45;overflow-wrap:anywhere;text-shadow:0 1px 2px #000}
.comment-input {position:fixed;left:14px;right:86px;bottom:calc(18px + env(safe-area-inset-bottom));margin:0;gap:8px;z-index:8}
.comment-input input {height:52px;border-radius:28px;padding:0 18px;background:rgba(7,10,25,.88);border:1px solid #ffffff35;font-size:15px}
.comment-input button {width:56px;flex-shrink:0;border-radius:50%;font-size:18px}
#stopButton {position:fixed;left:14px;right:14px;bottom:calc(12px + env(safe-area-inset-bottom));width:auto;height:56px;margin:0;z-index:9;border-radius:28px;display:none}
#livePanel.is-broadcaster .comments {bottom:calc(150px + env(safe-area-inset-bottom))}
#livePanel.is-broadcaster .comment-input {bottom:calc(80px + env(safe-area-inset-bottom));right:14px}
#livePanel.is-broadcaster #stopButton {display:none!important}
#livePanel.is-broadcaster #likeButton {top:40%}
.close-button {display:none}
#audioButton {position:absolute;left:18px;top:130px;width:auto;height:auto;margin:0;padding:8px 12px;border-radius:20px;z-index:7}
/* 配信画面の左上タイトルと、その下の配信ステータスだけを非表示 */
#livePanel #panelTitle,
#livePanel #panelStatus {display:none !important}
@media (max-height:650px) {
 .comments {bottom:calc(78px + env(safe-area-inset-bottom))}
 .comment-list {height:25vh;min-height:72px}
 #livePanel.is-broadcaster .comments {bottom:calc(132px + env(safe-area-inset-bottom))}
 .action-rail {gap:7px;top:50%}
 .live-action,#likeButton {width:56px;height:56px}
}

/* 配信者画面のみ：いいね・ギフトを非表示（視聴者側はそのまま） */
#livePanel.is-broadcaster #likeButton,
#livePanel.is-broadcaster #giftButton { display:none!important; }
#livePanel:not(.is-broadcaster) #backgroundAction { display:none!important; }
#livePanel #audioButton {display:none!important}
#livePanel:not(.is-broadcaster) #audioText {position:absolute;top:174px;left:18px;z-index:8;font-size:11px}

#livePanel.is-broadcaster #editLiveTitleAction{display:flex!important}
#livePanel:not(.is-broadcaster) #editLiveTitleAction{display:none!important}
/* 配信中ヘッダー：タイトル上部、配信者は左、視聴者は右 */
#livePanel .live-top-title{position:absolute;top:max(18px,env(safe-area-inset-top));left:16px;right:72px;z-index:8;color:white;font-size:16px;font-weight:900;line-height:1.4;text-shadow:0 2px 6px #000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
#livePanel .live-host-info{position:absolute;top:max(61px,calc(env(safe-area-inset-top) + 43px));left:14px;z-index:8;display:flex!important;align-items:center;gap:7px;max-width:42%;min-width:0}
#livePanel .live-host-info .presence-avatar{width:37px;height:37px;flex-shrink:0}
#livePanel .live-host-name{background:#05051099;border:0;border-radius:15px;color:white;font-size:12px;font-weight:800;text-shadow:0 1px 3px #000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:7px 8px;min-width:0}
#livePanel .presence-strip{top:max(61px,calc(env(safe-area-inset-top) + 43px));left:auto;right:14px;max-width:48%;justify-content:flex-end;overflow:hidden}
#livePanel .presence-strip .presence-avatar{width:32px;height:32px;flex-shrink:0}
#livePanel .presence-strip .presence-more{padding:5px;font-size:10px;white-space:nowrap}
/* コメント投稿者名をタップしてプロフィールを開く */
.comment-user-link{appearance:none;border:0;background:none;padding:0;color:#a9d9ff;font:inherit;font-weight:900;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
/* 入室者アイコン：配信者・視聴者共通 */
.presence-strip{position:absolute;top:max(78px,env(safe-area-inset-top) + 62px);left:14px;z-index:8;display:flex;align-items:center;gap:5px;max-width:calc(100% - 100px)}
.presence-avatar{width:34px;height:34px;border-radius:50%;border:2px solid #ffffff88;background:linear-gradient(135deg,#557bff,#c36aff);color:white;font-size:15px;font-weight:bold}
.presence-more{border:1px solid #ffffff66;background:#10142dbb;color:white;border-radius:18px;padding:8px;font-size:11px}
.presence-overlay{display:none;position:absolute;inset:0;background:#0009;z-index:20;align-items:center;justify-content:center;padding:24px}
.presence-overlay.open{display:flex}
.presence-dialog{background:#151a36;border:1px solid #ffffff44;border-radius:18px;padding:20px;width:min(100%,360px);max-height:70vh;overflow-y:auto}
.presence-entry{padding:11px;border-bottom:1px solid #ffffff22}
.presence-avatar{background-size:cover;background-position:center;overflow:hidden;cursor:pointer}
.presence-entry{display:flex;align-items:center;gap:10px;cursor:pointer}
.presence-profile{display:none;position:fixed;inset:0;z-index:3600;background:#000a;align-items:center;justify-content:center;padding:20px}
.presence-profile.open{display:flex}
.presence-profile-card{width:min(100%,340px);background:#151a36;border:1px solid #ffffff55;border-radius:20px;padding:22px;text-align:center}
.presence-profile-photo{width:88px;height:88px;border-radius:50%;background:#374075;background-size:cover;background-position:center;margin:8px auto 12px;display:flex;align-items:center;justify-content:center;font-size:38px}


/* マイページ専用。既存画面のレイアウトは変更しない */
#myPageScreen{position:fixed;inset:0;z-index:1500;background:#fff;color:#202020;overflow-y:auto;display:none;padding-bottom:82px;font-size:14px}
#myPageScreen.active{display:block}
.mp-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 4px;gap:10px}
.mp-icon-btn{background:none;border:0;font-size:24px;color:#222;padding:4px}
.mp-name{text-align:center;font-weight:750;font-size:17px;flex:1}
.mp-edit{border:0;border-radius:25px;background:#222;color:white;padding:8px 18px;font-size:12px}
.mp-center{text-align:center;padding:14px 0 4px}
.mp-avatar{display:flex;align-items:center;justify-content:center;border:2px solid #333;border-radius:50%;width:102px;height:102px;margin:0 auto 13px;font-size:44px;color:#666;background:#f9f9f9}
.mp-follow{display:flex;justify-content:center;gap:50px;padding:6px 0 20px;text-align:center}
.mp-follow strong{display:block;font-size:16px}.mp-follow small{color:#999;font-size:11px}
.mp-rank{margin:0 15px 12px;background:#f6f6f6;padding:14px 15px 16px;color:#222}
.mp-rank-top{display:flex;justify-content:space-between;align-items:center;font-weight:bold}
.mp-rank-bar{height:13px;border-radius:20px;border:2px solid #444;background:linear-gradient(90deg,#b7b7b7 0%,#f9c68b 55%,#f18748 100%);margin:22px 14px 12px;position:relative}
.mp-rank-foot{text-align:center;color:#888;font-size:11px}
.mp-item{width:100%;padding:16px 20px;border:0;border-bottom:1px solid #ededed;background:white;color:#333;display:flex;justify-content:space-between;align-items:center;text-align:left;font-size:14px}
.mp-item b{font-weight:500}.mp-muted{color:#777}
.mp-help{text-align:center;color:#aaa;font-size:12px;margin:44px 0}
.mp-bottom{position:fixed;bottom:0;left:0;right:0;height:64px;background:white;border-top:1px solid #eee;display:flex;justify-content:space-around;align-items:center;z-index:1501}
.mp-bottom button{border:0;background:none;color:#222;font-size:25px;padding:8px 22px}
.mp-dialog-backdrop{position:fixed;inset:0;z-index:1502;background:#0008;display:none;align-items:center;justify-content:center;padding:20px}
.mp-dialog-backdrop.active{display:flex}
.mp-dialog{width:min(100%,370px);background:white;color:#222;border-radius:15px;padding:22px}
.mp-dialog input{display:block;width:100%;padding:12px;margin:12px 0;border:1px solid #ccc;border-radius:8px;font-size:16px}
.mp-dialog-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:18px}
.mp-dialog-actions button{border:0;border-radius:8px;padding:10px 16px;background:#eee;color:#222}
.mp-dialog-actions button:last-child{background:#222;color:white}


/* 月光花マイページ専用テーマ：ホーム・配信画面には影響しない */
#myPageScreen{color:#fff;background:#081b3e url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%221800%22%20viewBox%3D%220%200%20800%201800%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22sky%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23030b28%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%2312396e%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23080d2b%22%2F%3E%3C%2FlinearGradient%3E%3CradialGradient%20id%3D%22moon%22%3E%3Cstop%20stop-color%3D%22%23fff%22%2F%3E%3Cstop%20offset%3D%22.8%22%20stop-color%3D%22%23e7edff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23a2baf4%22%2F%3E%3C%2FradialGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22800%22%20height%3D%221800%22%20fill%3D%22url%28%23sky%29%22%2F%3E%3Ccircle%20cx%3D%22485%22%20cy%3D%22275%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22541%22%20cy%3D%22358%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22390%22%20cy%3D%2211%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22494%22%20cy%3D%22280%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22471%22%20cy%3D%22615%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22571%22%20cy%3D%221%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22639%22%20cy%3D%22148%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22376%22%20cy%3D%22166%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22215%22%20cy%3D%2260%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22204%22%20cy%3D%2276%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22703%22%20cy%3D%22345%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22414%22%20cy%3D%2289%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%22521%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2293%22%20cy%3D%22433%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22115%22%20cy%3D%22433%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22552%22%20cy%3D%22320%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22571%22%20cy%3D%22167%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2252%22%20cy%3D%22568%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22519%22%20cy%3D%2285%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22622%22%20cy%3D%22428%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22610%22%20cy%3D%22480%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22623%22%20cy%3D%22393%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2231%22%20cy%3D%2284%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22679%22%20cy%3D%22267%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22371%22%20cy%3D%22394%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22317%22%20cy%3D%22116%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22343%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22380%22%20cy%3D%22523%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22783%22%20cy%3D%22512%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2228%22%20cy%3D%22390%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2233%22%20cy%3D%22531%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22227%22%20cy%3D%22437%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22397%22%20cy%3D%22209%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22105%22%20cy%3D%22563%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22182%22%20cy%3D%2279%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22280%22%20cy%3D%2237%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22283%22%20cy%3D%22510%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22616%22%20cy%3D%2253%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22470%22%20cy%3D%22377%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22347%22%20cy%3D%22288%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22487%22%20cy%3D%22492%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22171%22%20cy%3D%22475%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22372%22%20cy%3D%22186%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22784%22%20cy%3D%22225%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%226%22%20cy%3D%22274%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22183%22%20cy%3D%22247%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22513%22%20cy%3D%2240%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22633%22%20cy%3D%22118%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22559%22%20cy%3D%22515%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2224%22%20cy%3D%22330%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22286%22%20cy%3D%22120%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22539%22%20cy%3D%22514%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22501%22%20cy%3D%22642%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22268%22%20cy%3D%22455%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22166%22%20cy%3D%22459%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22631%22%20cy%3D%2247%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22337%22%20cy%3D%22527%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22712%22%20cy%3D%22455%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22219%22%20cy%3D%22291%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22261%22%20cy%3D%2229%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%223%22%20cy%3D%2227%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22571%22%20cy%3D%22272%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22141%22%20cy%3D%22247%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22445%22%20cy%3D%22483%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22573%22%20cy%3D%22583%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22736%22%20cy%3D%22264%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22427%22%20cy%3D%22441%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2295%22%20cy%3D%22414%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22594%22%20cy%3D%22570%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22377%22%20cy%3D%22394%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22164%22%20cy%3D%2217%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22727%22%20cy%3D%22159%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2238%22%20cy%3D%2274%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22547%22%20cy%3D%22204%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22361%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22319%22%20cy%3D%22277%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22703%22%20cy%3D%22554%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22637%22%20cy%3D%22625%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22217%22%20cy%3D%22547%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22717%22%20cy%3D%22403%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22251%22%20cy%3D%2273%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22364%22%20cy%3D%22331%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22701%22%20cy%3D%22340%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22703%22%20cy%3D%2292%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22319%22%20cy%3D%22318%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22184%22%20cy%3D%22446%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22180%22%20cy%3D%2230%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22499%22%20cy%3D%22637%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22497%22%20cy%3D%22183%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22683%22%20cy%3D%22608%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22467%22%20cy%3D%22244%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2299%22%20cy%3D%22229%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22368%22%20cy%3D%22375%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22206%22%20cy%3D%22442%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22225%22%20cy%3D%22528%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22513%22%20cy%3D%22340%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22512%22%20cy%3D%22475%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22621%22%20cy%3D%22512%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22255%22%20cy%3D%22471%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%22232%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22550%22%20cy%3D%22404%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22689%22%20cy%3D%22450%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%22108%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22584%22%20cy%3D%22319%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22780%22%20cy%3D%2217%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22793%22%20cy%3D%22511%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22647%22%20cy%3D%22314%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22139%22%20cy%3D%22488%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22557%22%20cy%3D%22137%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22506%22%20cy%3D%2247%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22373%22%20cy%3D%22292%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22642%22%20cy%3D%22613%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22398%22%20cy%3D%22621%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22151%22%20cy%3D%22128%22%20r%3D%221%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22656%22%20cy%3D%2233%22%20r%3D%222%22%20fill%3D%22%23eaf1ff%22%20opacity%3D%22.85%22%2F%3E%3Ccircle%20cx%3D%22590%22%20cy%3D%22265%22%20r%3D%22148%22%20fill%3D%22url%28%23moon%29%22%20stroke%3D%22%23d8e5ff%22%20stroke-width%3D%225%22%2F%3E%3Ccircle%20cx%3D%22550%22%20cy%3D%22240%22%20r%3D%2227%22%20fill%3D%22%23cbd9f0%22%20opacity%3D%22.6%22%2F%3E%3Ccircle%20cx%3D%22640%22%20cy%3D%22308%22%20r%3D%2239%22%20fill%3D%22%23b4c8e9%22%20opacity%3D%22.45%22%2F%3E%3Ccircle%20cx%3D%22610%22%20cy%3D%22190%22%20r%3D%2222%22%20fill%3D%22%23b4c8e9%22%20opacity%3D%22.5%22%2F%3E%3Cpath%20d%3D%22M0%20630%20Q160%20550%20300%20625%20T800%20610%20L800%201800%20L0%201800Z%22%20fill%3D%22%2309264d%22%2F%3E%3Cpath%20d%3D%22M0%20685%20Q280%20675%20800%20690%20L800%201800%20L0%201800Z%22%20fill%3D%22%23103f76%22%2F%3E%3Cpath%20d%3D%22M%20347%20680%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20382%20707%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20394%20734%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20229%20761%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20307%20788%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20376%20815%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20348%20842%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20464%20869%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20353%20896%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20369%20923%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20147%20950%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20133%20977%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20170%201004%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20220%201031%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%2072%201058%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20234%201085%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20495%201112%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%2014%201139%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20327%201166%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20272%201193%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20100%201220%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20278%201247%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20176%201274%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20-15%201301%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20275%201328%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%203%201355%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20-27%201382%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20135%201409%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20160%201436%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20127%201463%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20161%201490%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20263%201517%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20154%201544%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20148%201571%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20279%201598%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20-18%201625%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%2064%201652%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M%20333%201679%20q%2090%20-9%20180%200%22%20stroke%3D%22%23b6d6ff%22%20opacity%3D%22.4%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M0%200%20Q100%20145%20300%20210%20M0%20155%20Q160%20205%20230%20370%20M800%200%20Q740%20160%20660%20280%22%20fill%3D%22none%22%20stroke%3D%22%23261d43%22%20stroke-width%3D%2214%22%2F%3E%3Cg%20transform%3D%22translate%2865%20115%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28110%20180%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%2832%20245%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28195%2085%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28250%20175%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28145%20310%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%2818%20395%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28720%20130%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28765%20270%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%28690%20370%29%22%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%280%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%2872%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28144%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28216%29%22%2F%3E%3Cellipse%20cx%3D%220%22%20cy%3D%22-15%22%20rx%3D%228%22%20ry%3D%2218%22%20fill%3D%22%23f9e2ff%22%20stroke%3D%22%23c5a2ed%22%20stroke-width%3D%221%22%20transform%3D%22rotate%28288%29%22%2F%3E%3Ccircle%20r%3D%225%22%20fill%3D%22%23f4bf79%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") center top / cover no-repeat fixed}
#myPageScreen::before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,#08122c16 0%,#11152e12 50%,#10102a30 100%);z-index:0}
#myPageScreen > *{position:relative;z-index:1}
#myPageScreen .mp-head{padding:24px 20px 8px}
#myPageScreen .mp-name{font-size:21px;text-shadow:0 2px 8px #0009}
#myPageScreen .mp-icon-btn{color:white;text-shadow:0 2px 8px #000b;font-size:27px}
#myPageScreen .mp-edit{background:#171733c9;border:1px solid #e6c8ff;border-radius:24px;box-shadow:0 2px 16px #04071d66;color:white;font-weight:650}
#myPageScreen .mp-center{padding:22px 0 12px}
#myPageScreen .mp-avatar{width:134px;height:134px;border:3px solid #e8d8ff;border-radius:50%;background:radial-gradient(circle at 62% 28%,#e2e8ff,#8c83d1 46%,#3d376c 100%);box-shadow:0 0 25px #f3dcff77;font-size:64px;color:white}
#myPageScreen .mp-follow{gap:65px;padding:12px 0 24px;text-shadow:0 1px 8px #000b}
#myPageScreen .mp-follow strong{font-size:21px}
#myPageScreen .mp-follow small{color:#e6e4f7;font-size:12px}
#myPageScreen .mp-rank{border:1px solid #d7c2f8aa;border-radius:16px;background:#2e2e5c99;backdrop-filter:blur(8px);box-shadow:0 6px 24px #080a2955;color:white;padding:20px 16px;margin:0 15px 15px}
#myPageScreen .mp-rank-top{font-size:15px}
#myPageScreen .mp-rank-bar{height:17px;border:2px solid #e4d5ff;background:linear-gradient(90deg,#c4d1f2 0%,#c4d1f2 43%,#ffd3ab 43%,#ff985c 80%,#ef7456 100%);box-shadow:0 0 10px #d1b2ff55}
#myPageScreen .mp-rank-foot{color:#f3e9ff;font-size:12px}
#myPageScreen .mp-item{width:calc(100% - 30px);margin:0 15px;border:1px solid #cdbbe777;border-bottom:0;background:#262850aa;backdrop-filter:blur(8px);color:#fff;padding:19px 18px;font-size:14px}
#myPageScreen .mp-item:first-of-type{border-radius:14px 14px 0 0}
#myPageScreen .mp-item:last-of-type{border-bottom:1px solid #cdbbe777;border-radius:0 0 14px 14px}
#myPageScreen .mp-help{color:#fff;text-shadow:0 1px 5px #000;margin:50px 0}
#myPageScreen .mp-bottom{background:#10132bdf;backdrop-filter:blur(12px);border-top:1px solid #ddc8ff77}
#myPageScreen .mp-bottom button{color:white}
#myPageScreen .mp-bottom button:nth-child(2){border:2px solid #fbd4e8;border-radius:50%;padding:8px 12px;background:linear-gradient(135deg,#ffb576,#e653a1);box-shadow:0 0 15px #f8a8d2}


/* お問い合わせ欄が画面下に隠れないようにする */
#myPageScreen{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important;overscroll-behavior:contain}
#myPageScreen .mp-item:last-of-type{margin-bottom:24px}
/* 月光花マイページ：最新の配置 */
#myPageScreen{padding-bottom:36px}
#myPageScreen .mp-center{position:relative}
#myPageScreen .mp-avatar{background-size:cover;background-position:center;cursor:pointer}
#myPageScreen .mp-camera{position:absolute;top:116px;left:calc(50% + 36px);border:2px solid #dfcaff;background:#28214dcc;color:white;border-radius:50%;width:43px;height:43px;font-size:19px}
#myPageScreen .mp-gender{display:inline-block;margin-top:9px;border:1px solid #e7b1ff;border-radius:20px;background:#8c3a9d88;padding:5px 14px;font-size:13px}
#myPageScreen .mp-item{margin-top:7px;margin-bottom:0;border:1px solid #cdbbe799;border-radius:12px!important;min-height:62px}
#myPageScreen .mp-item:first-of-type{border-radius:12px}
#myPageScreen .mp-bio{margin:9px 15px 0;border:1px solid #cdbbe799;border-radius:12px;background:#262850aa;backdrop-filter:blur(8px);overflow:hidden}
#myPageScreen .mp-bio-head{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;border-bottom:1px solid #cdbbe777}
#myPageScreen .mp-bio-text{white-space:pre-wrap;overflow-wrap:anywhere;padding:14px 16px;min-height:75px;line-height:1.7}
#mpEditDialog .mp-dialog{background:#242345;color:white}
#mpEditDialog .mp-dialog select,#mpEditDialog .mp-dialog textarea{display:block;width:100%;padding:11px;margin:9px 0 13px;border-radius:8px;border:1px solid #ccc;background:white;color:#222;font-size:16px}

/* マイページ：フォロー一覧のタップ表示 */
#myPageScreen .mp-follow-button{border:0;background:transparent;color:inherit;min-width:100px;cursor:pointer;padding:10px 8px;border-radius:12px;font:inherit}
#myPageScreen .mp-follow-button:active{background:#ffffff26}
.mp-follow-dialog{display:none;position:fixed;inset:0;z-index:3500;background:#06091bc9;align-items:center;justify-content:center;padding:18px}
.mp-follow-dialog.active{display:flex}
.mp-follow-panel{width:min(100%,430px);max-height:75vh;overflow-y:auto;background:#1b2048;color:white;border:1px solid #cfb4ff;border-radius:18px;padding:18px;box-shadow:0 14px 40px #0008}
.mp-follow-title{display:flex;align-items:center;justify-content:space-between;font-size:18px;border-bottom:1px solid #ffffff33;padding-bottom:12px}
.mp-follow-title button{font-size:28px;background:transparent;border:0;color:white;cursor:pointer;padding:0 8px}
.mp-follow-contents{padding:28px 4px;text-align:center;color:#e4ddfa}
/* フォロー中・フォロワー一覧のみ：アイコン＋名前 */
.mp-follow-contents:has(.mp-follow-user){padding:12px 0;text-align:left}
.mp-follow-user{display:flex;align-items:center;gap:12px;width:100%;padding:10px 5px;border:0;border-bottom:1px solid #ffffff22;background:transparent;color:white;text-align:left;cursor:pointer;font:inherit}
.mp-follow-user-avatar{display:flex;align-items:center;justify-content:center;flex:0 0 46px;width:46px;height:46px;border-radius:50%;background:#38446d;font-size:22px;overflow:hidden}
.mp-follow-user-avatar img{width:100%;height:100%;object-fit:cover}
.mp-follow-user-name{flex:1;min-width:0;font-size:15px;font-weight:700;overflow-wrap:anywhere}
.mp-follow-user>span:last-child{font-size:24px;color:#b7bde0}

/* ホーム画面の上部ロゴを削除した分の余白調整 */
.hero { margin-top: 0; }

/* リスナー側：背景の上でもタイトルと参加者が読みやすい */
#livePanel:not(.is-broadcaster) .live-top-title{top:max(14px,env(safe-area-inset-top));left:14px;right:78px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-height:3.1em;padding:7px 11px;border-radius:12px;background:rgba(5,8,24,.72);backdrop-filter:blur(6px);font-size:17px;line-height:1.45}
#livePanel:not(.is-broadcaster) .live-host-info{top:max(86px,calc(env(safe-area-inset-top) + 72px));max-width:48%;padding:3px 6px 3px 3px;border-radius:25px;background:rgba(5,8,24,.65)}
#livePanel:not(.is-broadcaster) .presence-strip{top:max(90px,calc(env(safe-area-inset-top) + 76px));right:14px;max-width:43%;gap:4px}
#livePanel:not(.is-broadcaster) .presence-strip .presence-avatar{width:34px;height:34px}
/* 配信者・リスナー双方のコメント投稿者画像 */
#livePanel .comment-item{display:flex;align-items:flex-start;gap:8px;max-width:100%;width:max-content}
#livePanel .comment-user-avatar{width:34px;height:34px;min-width:34px;border-radius:50%;border:1px solid #ffffff88;background:#28345c;background-size:cover;background-position:center;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;cursor:pointer}
#livePanel .comment-content{min-width:0;flex:1;overflow-wrap:anywhere}
#livePanel .comment-user-link{display:inline-block;margin-bottom:3px;text-decoration:none}


/* 配信者・リスナー共通：タイトルとLIVE表示を重ねず横並びにする */
#livePanel .panel-header{position:absolute!important;top:max(15px,env(safe-area-inset-top))!important;left:14px!important;right:72px!important;display:flex!important;align-items:center!important;gap:8px!important;min-height:40px!important;z-index:8!important;pointer-events:none}
#livePanel .panel-header .panel-live{position:static!important;flex-shrink:0!important;margin:0!important;padding:5px 9px!important;font-size:11px!important;line-height:1.3!important}
#livePanel .live-top-title{position:static!important;display:block!important;flex:1!important;min-width:0!important;max-width:none!important;max-height:2.8em!important;overflow:hidden!important;white-space:normal!important;line-height:1.4!important;font-size:17px!important;text-shadow:0 2px 6px #000,0 0 12px #000!important;background:rgba(3,6,20,.62)!important;border-radius:10px!important;padding:6px 9px!important;pointer-events:none!important}
#livePanel .live-host-info{top:max(80px,calc(env(safe-area-inset-top) + 65px))!important}
#livePanel .presence-strip{top:max(80px,calc(env(safe-area-inset-top) + 65px))!important}
#livePanel:not(.is-broadcaster) .live-host-info,#livePanel:not(.is-broadcaster) .presence-strip{top:max(80px,calc(env(safe-area-inset-top) + 65px))!important}


#vbTitleDialog { position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:none;align-items:center;justify-content:center;padding:18px; }
#vbTitleDialog.active {display:flex;}
#vbTitleDialog .vb-title-box {background:#211c31;color:white;width:min(100%,420px);padding:20px;border-radius:15px;box-sizing:border-box;}
#vbTitleDialog input {width:100%;box-sizing:border-box;background:#fff;color:#161616;font-size:17px;border-radius:9px;padding:12px;border:1px solid #999;margin:14px 0;}
#vbTitleDialog .vb-title-actions {display:flex;justify-content:flex-end;gap:10px;}
#vbTitleDialog button {border:0;border-radius:9px;padding:10px 14px;}


/* Simeji: keep the comment editor a standard Android IME-compatible text field.
   No custom webfont is forced here; let Android choose glyph fallback. */
#commentInput {
  font-family: sans-serif !important;
  font-size: 16px !important;
  font-weight: 400 !important;
  font-style: normal !important;
  font-variant: normal !important;
  font-feature-settings: normal !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  -webkit-text-fill-color: currentColor !important;
  -webkit-user-select: text !important;
  user-select: text !important;
  direction: ltr;
}
/* Keep received text independent from display-font effects elsewhere. */
#commentList .comment-item { font-family: sans-serif; font-variant: normal; font-feature-settings: normal; }


/* Sent comments: use the same native Android text renderer as the editor. */
#commentList .comment-simeji-text {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 22px;
  height: auto;
  margin: 2px 0 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  -webkit-text-fill-color: currentColor;
  font-family: sans-serif !important;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: normal;
  resize: none;
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  pointer-events: auto;
}


/* Moonflower broadcast setup screen: isolated from existing pages */
#moonLiveSetup{display:none;position:fixed;inset:0;z-index:2800;overflow-y:auto;overscroll-behavior:contain;background:radial-gradient(ellipse at 84% 9%,#59418b88,transparent 35%),radial-gradient(ellipse at 8% 68%,#392b6d66,transparent 45%),linear-gradient(160deg,#050c29,#13183d 55%,#070d2a);color:#f6f0ff;padding:0 16px 32px;font-family:inherit}
#moonLiveSetup.open{display:block}
#moonLiveSetup .mls-wrap{max-width:650px;margin:auto;position:relative}
#moonLiveSetup .mls-top{display:flex;align-items:center;justify-content:space-between;padding:26px 0 14px;position:relative}
#moonLiveSetup .mls-back{border:1px solid #c3a8fa99;background:#101b40a8;color:white;width:44px;height:44px;border-radius:50%;font-size:26px}
#moonLiveSetup .mls-brand{font-size:12px;color:#c7b2e8;letter-spacing:1px;text-align:center}
#moonLiveSetup h2{margin:3px 0 0;font-size:25px;text-align:center;letter-spacing:4px;font-weight:750;text-shadow:0 0 22px #c9a3ff}
#moonLiveSetup .mls-moon{height:124px;position:relative;margin:3px 0 17px;display:flex;align-items:center;justify-content:center}
#moonLiveSetup .mls-moon:before{content:'☾';font-family:serif;font-size:122px;color:#f4d7ff;text-shadow:0 0 18px #d8a4ff,0 0 54px #a37fff;position:absolute;left:calc(50% - 50px);top:-25px}
#moonLiveSetup .mls-moon:after{content:'✿  ✧  ✿';font-size:24px;letter-spacing:23px;color:#c6a1fa;position:absolute;bottom:0;text-shadow:0 0 14px #9f7bff}
#moonLiveSetup .mls-card{border:1px solid #ac8bf77a;border-radius:23px;background:linear-gradient(125deg,#263269b8,#131936b8);box-shadow:0 8px 26px #0006,inset 0 1px #ffffff25;padding:19px 17px;margin-bottom:18px;backdrop-filter:blur(10px)}
#moonLiveSetup .mls-hero{display:flex;align-items:center;gap:14px}
#moonLiveSetup .mls-mic{width:68px;height:68px;flex:none;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#7453bd,#282e73);border:1px solid #c5a3ff;box-shadow:0 0 18px #b089ff66;font-size:36px}
#moonLiveSetup .mls-hero strong{display:block;font-size:20px;margin-bottom:6px}
#moonLiveSetup .mls-hero small{font-size:12px;color:#c9c9ec;line-height:1.7}
#moonLiveSetup .mls-label{display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:750;margin:0 0 10px}
#moonLiveSetup .mls-label small{font-size:11px;color:#c7bbdf;font-weight:400}
#moonLiveSetup .mls-title{width:100%;height:55px;border:1px solid #ac96e4aa;border-radius:16px;background:#171d46;color:#fff;font-size:16px;padding:0 16px;outline:none}
#moonLiveSetup .mls-title:focus{border-color:#efceff;box-shadow:0 0 0 2px #bd8cff44}
#moonLiveSetup .mls-preview{height:165px;border:1px solid #d0a8f9aa;border-radius:17px;display:flex;align-items:end;justify-content:center;padding:14px;background:linear-gradient(145deg,#263d7b,#17153e);background-position:center;background-size:cover;box-shadow:inset 0 0 35px #0006}
#moonLiveSetup .mls-preview span{background:#090b25a8;border:1px solid #ffffff55;padding:5px 18px;border-radius:25px;font-size:12px}
#moonLiveSetup .mls-bgbuttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}
#moonLiveSetup .mls-bgbuttons button{padding:12px 5px;border:1px solid #b59be18c;border-radius:14px;background:#282653;color:#fff;font-size:13px}
#moonLiveSetup .mls-bgbuttons button:active{transform:scale(.98)}
#moonLiveSetup .mls-note{color:#c2b9d9;font-size:11px;line-height:1.6;margin:10px 2px 0}
#moonLiveSetup .mls-start{width:100%;min-height:62px;border:1px solid #ffe4b9;border-radius:23px;background:linear-gradient(110deg,#6a46b3,#4c3c9d 50%,#8761bc);color:#fff4d8;font-size:20px;font-weight:800;letter-spacing:2px;text-shadow:0 1px 4px #1d1742;box-shadow:0 0 20px #a47cff88,inset 0 0 0 2px #e2bff455;margin:8px 0 16px}
#moonLiveSetup .mls-stars{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:.6;background-image:radial-gradient(#fff 1px,transparent 2px),radial-gradient(#d8aaff 1px,transparent 2px);background-size:73px 97px,109px 83px;background-position:13px 21px,47px 13px}


/* 配信背景全画面プレビュー：配信画面と同じcover/center表示 */
#moonLiveSetup .mls-preview{width:100%;cursor:pointer;color:#fff;font:inherit}
#moonBgFullScreen{display:none;position:fixed;inset:0;z-index:5000;background:#050510;color:#fff;overflow:hidden}
#moonBgFullScreen.open{display:block}
#moonBgFullScreen .moon-bg-viewport{position:absolute;inset:0;background-color:#050510;background-size:cover;background-position:center;background-repeat:no-repeat}
#moonBgFullScreen .moon-bg-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#03051038 0%,#0305100a 42%,#03051094 100%)}
#moonBgFullScreen .moon-bg-top{position:absolute;left:0;right:0;top:0;padding:calc(16px + env(safe-area-inset-top)) 16px 15px;display:flex;align-items:center;gap:15px;background:linear-gradient(#0305149c,transparent)}
#moonBgFullScreen .moon-bg-top button{border:1px solid #ffffff80;border-radius:24px;padding:9px 14px;background:#0b1030bb;color:white;font-size:14px}
#moonBgFullScreen .moon-bg-top strong{font-size:17px}
#moonBgFullScreen .moon-bg-guide{position:absolute;left:12px;right:12px;top:43%;text-align:center;border:1px dashed #ffffffaa;border-radius:12px;padding:9px;background:#03051466;font-size:12px;pointer-events:none}
#moonBgFullScreen .moon-bg-bottom{position:absolute;bottom:0;left:0;right:0;padding:20px 18px calc(24px + env(safe-area-inset-bottom));display:grid;gap:13px;text-align:center;background:linear-gradient(transparent,#030514d9)}
#moonBgFullScreen .moon-bg-bottom span{font-size:12px;color:#e0d9f8}
#moonBgFullScreen .moon-bg-bottom button{border:1px solid #ffe4bc;border-radius:18px;padding:15px;background:linear-gradient(100deg,#5144aa,#8157bb);color:white;font-size:16px;font-weight:700}


/* 配信者アイコンの直下に配信経過時間（秒まで）を表示 */
#livePanel .live-host-info #liveElapsedTime{
 position:absolute;top:42px;left:0;min-width:62px;text-align:center;
 padding:3px 5px;border-radius:9px;background:rgba(5,8,24,.75);
 color:#fff;font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;
 white-space:nowrap;pointer-events:none;text-shadow:0 1px 3px #000;
}

/* ホーム画像・既存レイアウトは変更せず、発見コーナーだけ追加 */
.discovery-sections{padding-bottom:12px}
.discover-section{margin-top:16px}
.discover-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.discover-card{position:relative;min-height:155px;aspect-ratio:1/1;overflow:hidden;border-radius:15px;border:1px solid #ffffff24;background:linear-gradient(135deg,#35467d,#16132e);color:white;padding:0;text-align:left;display:block;width:100%}
.discover-card-photo{position:absolute;inset:0;background-position:center;background-size:cover}
.discover-card-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,#030514d9 100%)}
.discover-card-body{position:absolute;bottom:9px;left:9px;right:9px;display:flex;align-items:center;gap:8px}
.discover-card-avatar{width:34px;height:34px;border-radius:50%;background:#5668a9;border:2px solid #fff8;background-size:cover;background-position:center;display:grid;place-items:center;flex-shrink:0}
.discover-card-name{font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.discover-card-status{font-size:10px;color:#d6ddff}
.discover-live{position:absolute;top:9px;left:9px;border-radius:7px;background:#fb2e74;padding:4px 8px;font-size:11px;font-weight:900}
.discover-more{display:block;margin:15px auto 5px;width:min(100%,300px);height:44px;border-radius:30px;border:1px solid #b8a7fc;background:#1a2042;color:white;font-weight:900}
.discover-empty{grid-column:1/-1;padding:20px 12px;border-radius:14px;background:#12182e;color:#c9d1ed;text-align:center;font-size:13px}
.discover-all-screen{display:none;position:fixed;inset:0;z-index:1800;overflow-y:auto;background:#080e25;padding:16px 14px 95px;color:white}
.discover-all-screen.open{display:block}
.discover-all-header{display:flex;align-items:center;gap:18px;margin-bottom:18px;font-size:20px}
.discover-all-header button{border:0;background:#242d53;color:white;font-size:22px;border-radius:12px;width:43px;height:43px}
@media(min-width:700px){.discover-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}

/* v43: 配信画面の背景にコメントと操作を重ねる。背景画像の設定は変更しない */
#livePanel{overflow:hidden!important;padding:0!important;isolation:isolate}
#livePanel .panel-header{position:absolute;inset:0 0 auto;z-index:9;pointer-events:none}
#livePanel .panel-header .live-top-title{top:max(13px,env(safe-area-inset-top));left:14px;right:68px;font-size:15px}
#livePanel .live-host-info{top:max(51px,calc(env(safe-area-inset-top) + 39px));left:12px;max-width:49%}
#livePanel .presence-strip{top:max(51px,calc(env(safe-area-inset-top) + 39px));right:12px;max-width:46%}
#livePanel .comments{position:absolute!important;left:12px!important;right:82px!important;bottom:calc(90px + env(safe-area-inset-bottom))!important;top:auto!important;margin:0!important;z-index:7}
#livePanel .comment-list{height:min(33vh,275px)!important;min-height:90px!important;overflow-y:auto!important;overscroll-behavior:contain;background:transparent!important;border:0!important;padding:4px!important;scrollbar-width:thin;mask-image:linear-gradient(transparent,#000 12%,#000)}
#livePanel .comment-item{background:rgba(5,6,15,.45);border-radius:13px;margin:3px 0;padding:6px 8px;border-bottom:0;text-shadow:0 1px 2px #000}
#livePanel .comment-input{position:absolute!important;left:12px!important;right:78px!important;bottom:calc(19px + env(safe-area-inset-bottom))!important;top:auto!important;z-index:8;margin:0!important}
#livePanel .comment-input input{background:rgba(8,10,20,.7)!important;border:1px solid #ffffff66!important;color:white!important}
#livePanel .action-rail{position:absolute!important;right:9px!important;top:auto!important;bottom:calc(100px + env(safe-area-inset-bottom))!important;transform:none!important;z-index:8;max-height:53vh;overflow-y:auto;scrollbar-width:none}
#livePanel .action-rail .live-action{flex-shrink:0}
#livePanel .close-button{display:none!important}
#livePanel #likeButton{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#livePanel .floating-like-heart{position:absolute;z-index:100;pointer-events:none;font-size:32px;line-height:1;filter:drop-shadow(0 2px 7px #ff66aabb);animation:float-like-heart 1.2s ease-out forwards;-webkit-animation:float-like-heart 1.2s ease-out forwards}
@keyframes float-like-heart{0%{opacity:0;transform:translateY(12px) scale(.7)}18%{opacity:1}100%{opacity:0;transform:translateY(-140px) scale(1.5)}}
#livePanel.is-broadcaster #likeButton,#livePanel.is-broadcaster #giftButton{display:none!important}

/* Search page only; existing home and live layouts remain unchanged */
#searchPage{display:none;position:fixed;inset:0;z-index:1700;background:#0a1026;color:#fff;overflow-y:auto;padding:18px 14px 95px}
#searchPage.active{display:block}
.search-header{display:flex;align-items:center;gap:14px;margin-bottom:16px;font-size:20px;font-weight:700}
.search-back{background:#242c50;color:#fff;border:0;border-radius:12px;padding:10px 14px;font-size:20px}
#searchKeyword{width:100%;box-sizing:border-box;background:#222c4a;border:1px solid #62709b;color:#fff;border-radius:15px;padding:15px;font-size:16px}
#searchResults{margin-top:18px;display:flex;flex-direction:column;gap:9px}
.search-person{display:flex;align-items:center;gap:13px;width:100%;padding:12px;background:#192440;border:1px solid #ffffff1f;border-radius:15px;color:#fff;text-align:left}
.search-avatar-group{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:60px}
.search-avatar{width:54px;height:54px;border-radius:50%;background:#37446b;background-size:cover;background-position:center;display:grid;place-items:center;font-size:24px}
.search-live-label{font-size:11px;font-weight:800;color:#ff658d;line-height:1.3}
.search-person-info{flex:1;min-width:0}
.search-person-name{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.search-person-bio{font-size:12px;color:#aebbd5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px}
.search-empty{padding:26px 10px;text-align:center;color:#b5c0dc}

/* v51: test gifts only */
#testGiftSheet{display:none;position:fixed;inset:0;z-index:3700;background:#000b;align-items:flex-end;justify-content:center}
#testGiftSheet.open{display:flex}
.test-gift-card{width:min(100%,520px);background:#141831;border:1px solid #a9a2ff66;border-radius:24px 24px 0 0;padding:20px 16px calc(24px + env(safe-area-inset-bottom));color:white}
.test-gift-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}
.test-gift-choice{border:1px solid #ffffff30;background:#252a51;color:white;border-radius:16px;padding:14px 4px;font-size:12px;display:flex;flex-direction:column;gap:7px;align-items:center}
.test-gift-choice span{font-size:34px}
.test-gift-choice small{color:#b9e6ff}
#testGiftAnimation{position:fixed;inset:0;z-index:3300;pointer-events:none;display:none;align-items:center;justify-content:center}
#testGiftAnimation.active{display:flex}
.test-gift-burst{background:#100e2bdc;border:1px solid #ffffff55;box-shadow:0 0 60px #d17aff88;border-radius:24px;padding:26px 34px;text-align:center;color:white;animation:testGiftPop 2.2s ease-out both;max-width:90vw}
.test-gift-burst .gift-emoji{font-size:82px;display:block}
@keyframes testGiftPop{0%{opacity:0;transform:scale(.35)}20%{opacity:1;transform:scale(1.15)}35%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-70px) scale(1.15)}}


/* v52: visual gift catalog based on the supplied reference; test-only currency */
#testGiftSheet{align-items:center;padding:14px;overflow-y:auto;background:rgba(4,3,24,.9)}
#testGiftSheet .test-gift-card{width:min(100%,1000px);max-height:94dvh;overflow-y:auto;border-radius:23px;padding:18px 12px 24px;background:radial-gradient(ellipse at 50% 10%,#262061,#0b092c 75%);border:1px solid #9c69ed80;box-shadow:0 0 50px #763cbb55}
#testGiftSheet .test-gift-heading{font-family:var(--vb-serif-ja);font-size:clamp(20px,5vw,36px);color:#fff1ff;text-shadow:0 0 12px #d456ff,2px 3px 0 #6925b0}
#testGiftSheet .test-gift-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
#testGiftSheet .test-gift-choice{padding:8px 5px 10px;gap:5px;border-radius:17px;border:1px solid #a578ef66;background:linear-gradient(155deg,#252054,#111037);box-shadow:inset 0 0 18px #8a62ff1b}
#testGiftSheet .test-gift-choice img{display:block;width:100%;height:clamp(90px,22vw,165px);object-fit:contain;border-radius:12px}
#testGiftSheet .test-gift-choice strong{font-size:clamp(12px,2.6vw,16px)}
#testGiftSheet .test-gift-choice small{font-size:clamp(11px,2.5vw,15px);width:100%;border-radius:20px;border:1px solid #8565c4;background:#100d2e;padding:5px 2px;color:#fff;font-weight:700}
#testGiftSheet .test-gift-choice:active{transform:scale(.97)}
#testGiftAnimation .gift-image{display:block;width:min(50vw,200px);height:175px;object-fit:contain;margin:0 auto 10px;border-radius:14px}
@media(min-width:640px){#testGiftSheet .test-gift-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}


/* v53: tiered gift effects, no sender name or coin value on animation */
#testGiftAnimation{overflow:hidden;isolation:isolate}
#testGiftAnimation .test-gift-burst{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;gap:8px;background:transparent;border:0;box-shadow:none;padding:0;animation:gift53Entrance var(--gift-duration,2.4s) ease-out both}
#testGiftAnimation .gift-image{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;width:clamp(135px,45vw,290px);height:clamp(135px,45vw,290px);object-fit:contain;filter:drop-shadow(0 0 25px var(--gift-glow,#f5a5ff));animation:gift53Float 1.4s ease-in-out infinite alternate}
#testGiftAnimation .gift-display-name{font-size:clamp(20px,6vw,35px);font-weight:900;color:#fff;text-shadow:0 0 12px var(--gift-glow,#f5a5ff),0 2px 6px #180629}
#testGiftAnimation .gift53-spark{position:absolute;z-index:2;left:var(--x);top:var(--y);font-size:var(--sz);filter:drop-shadow(0 0 7px var(--gift-glow));animation:gift53Spark var(--dur) ease-out both;animation-delay:var(--delay);opacity:0}
#testGiftAnimation .gift53-halo{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at center,var(--gift-glow),transparent 62%);opacity:.28;animation:gift53Halo var(--gift-duration) ease-out both}
#testGiftAnimation.gift53-tier-1 .gift53-halo{opacity:.08}
#testGiftAnimation.gift53-tier-2 .gift53-halo{opacity:.16}
#testGiftAnimation.gift53-tier-4 .gift53-halo{opacity:.42}
#testGiftAnimation.gift53-tier-5 .gift53-halo{opacity:.52}
#testGiftAnimation.gift53-tier-5:before{content:"";position:absolute;inset:-30%;background:conic-gradient(from 0deg,transparent 0deg,#ffd46a55 16deg,transparent 34deg,transparent 70deg,#ff7de955 89deg,transparent 105deg);animation:gift53Rotate 4s linear infinite;z-index:0}
@keyframes gift53Entrance{0%{opacity:0;transform:scale(.25) translateY(80px)}20%{opacity:1;transform:scale(1.16) translateY(0)}34%{transform:scale(1)}78%{opacity:1}100%{opacity:0;transform:scale(1.15) translateY(-35px)}}
@keyframes gift53Float{from{transform:translateY(7px) rotate(-3deg)}to{transform:translateY(-8px) rotate(3deg)}}
@keyframes gift53Spark{0%{opacity:0;transform:translate(0,20px) scale(.2) rotate(0)}20%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.35) rotate(160deg)}}
@keyframes gift53Halo{0%,100%{opacity:0}30%,70%{opacity:.35}}
@keyframes gift53Rotate{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){#testGiftAnimation .gift53-spark,#testGiftAnimation .gift53-halo,#testGiftAnimation .gift-image{animation:none!important}#testGiftAnimation .test-gift-burst{animation:none!important}}

/* v55: ensure the animated gift is composited without a rectangular backing */
#testGiftAnimation .test-gift-burst,
#testGiftAnimation .gift-image,
#testGiftAnimation .gift-display-name {background-color:transparent!important;background-image:none!important;border:0!important;outline:0!important;box-shadow:none!important;}
#testGiftAnimation .gift-image {mix-blend-mode:screen;clip-path:inset(0 round 0);}
#testGiftAnimation .test-gift-burst {isolation:auto!important;}
</style>

</head>


<body>

<div class="app">





<section class="hero">

  <div class="hero-image-wrap">

    <img
      class="hero-image"
      src="/home.png"
      alt="voiceボタLive"
      onerror="this.style.display='none'"
    >

    <div class="hero-gradient"></div>

  </div>


  <div class="hero-content">

    

    <h1 class="hero-title">

      <span>
        あなたの声が、
      </span>

      <br>

      誰かの夜を照らす。

    </h1>

    <div class="hero-description">

      月明かりの下で、話して、聴いて、笑って。<br>
      voiceボタLiveで、あなたの声をもっと近くに。

    </div>

  </div>

</section>


<section
  class="section"
  id="liveSection"
>

  <div class="section-head">

    <div class="section-title">
      🔴 ライブ中
    </div>

    <div class="section-sub">
      REAL TIME
    </div>

  </div>


  <div
    class="live-list"
    id="liveList"
  >

    <div class="empty">
      現在配信中のライブはありません
    </div>

  </div>

</section>


<div id="discoverySections" class="discovery-sections">
  <section class="section discover-section" data-discovery="featured">
    <div class="section-head"><div class="section-title">注目</div></div>
    <div class="discover-grid" id="discoverFeatured"></div>
    <button class="discover-more" onclick="openDiscoveryAll('featured')">もっと見る ❯</button>
  </section>
  <section class="section discover-section" data-discovery="new">
    <div class="section-head"><div class="section-title">NEW</div></div>
    <div class="discover-grid" id="discoverNew"></div>
    <button class="discover-more" onclick="openDiscoveryAll('new')">もっと見る ❯</button>
  </section>
  <section class="section discover-section" data-discovery="debut">
    <div class="section-head"><div class="section-title">デビュー</div></div>
    <div class="discover-grid" id="discoverDebut"></div>
    <button class="discover-more" onclick="openDiscoveryAll('debut')">もっと見る ❯</button>
  </section>
</div>
<div id="discoverAllScreen" class="discover-all-screen">
  <div class="discover-all-header"><button onclick="closeDiscoveryAll()" aria-label="戻る">←</button><strong id="discoverAllTitle"></strong></div>
  <div class="discover-grid" id="discoverAllGrid"></div>
</div>

<section class="section">

  <div class="section-title">
    voiceボタLive
  </div>


  <div class="features">


    <div class="feature">

      <div class="feature-icon">
        🎙️
      </div>

      <div class="feature-title">
        音声配信
      </div>

      <div class="feature-text">
        声でリアルタイムにつながる。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        💬
      </div>

      <div class="feature-title">
        コメント
      </div>

      <div class="feature-text">
        配信者と会話できます。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        ❤️
      </div>

      <div class="feature-title">
        いいね
      </div>

      <div class="feature-text">
        配信を応援できます。
      </div>

    </div>


    <div class="feature">

      <div class="feature-icon">
        🚫
      </div>

      <div class="feature-title">
        ブロック
      </div>

      <div class="feature-text">
        見たくない相手をブロック。
      </div>

    </div>


  </div>

</section>


<div class="live-panel" id="livePanel">
  <div class="panel-header">
    <div class="panel-title" id="panelTitle">voiceボタLive</div>
    <div class="live-top-title" id="liveTopTitle"></div>
    <div class="panel-live">🔴 LIVE</div>
  </div>
  <div class="live-host-info" id="liveHostInfo" style="display:none"><button type="button" class="presence-avatar" id="liveHostAvatar" aria-label="配信者のプロフィール"></button><span id="liveElapsedTime" aria-label="配信時間">00:00:00</span><button type="button" id="liveHostName" class="live-host-name"></button></div>
  <div class="presence-strip" id="presenceStrip" aria-label="現在の視聴者"></div>
  <div class="presence-overlay" id="presenceOverlay" onclick="closePresence()">
    <div class="presence-dialog" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center"><strong id="presenceHeading">参加者一覧</strong><button type="button" onclick="closePresence()" style="color:white;background:transparent;border:0;font-size:24px">×</button></div>
      <div id="presenceList"></div>
    </div>
  </div>
  <div class="presence-profile" id="presenceProfile" onclick="closePresenceProfile()">
    <div class="presence-profile-card" onclick="event.stopPropagation()">
      <button type="button" onclick="closePresenceProfile()" style="float:right;background:transparent;border:0;color:white;font-size:24px">×</button>
      <div id="presenceProfilePhoto" class="presence-profile-photo">👤</div>
      <h3 id="presenceProfileName"></h3>
      <div id="liveProfileCounts" style="display:flex;justify-content:center;gap:32px;margin:15px 0">
        <button type="button" onclick="openLiveProfileFollowList('following')" style="background:transparent;border:0;color:white"><strong id="liveProfileFollowing">0</strong><div style="font-size:12px">フォロー中</div></button>
        <button type="button" onclick="openLiveProfileFollowList('followers')" style="background:transparent;border:0;color:white"><strong id="liveProfileFollowers">0</strong><div style="font-size:12px">フォロワー</div></button>
      </div>
      <div id="liveProfileFollowList" style="display:none;max-height:34vh;overflow-y:auto;text-align:left"></div>
      <div id="presenceProfileGender" style="color:#c7c9dd"></div>
      <p id="presenceProfileBio" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>
      <div id="presenceSocialActions" style="display:flex;gap:10px;justify-content:center;margin-top:14px">
        <button type="button" id="presenceFollowButton" onclick="togglePresenceFollow()" style="padding:11px 15px;border:0;border-radius:20px;background:#536bff;color:white;font-weight:bold">フォロー</button>
        <button type="button" id="presenceBlockButton" onclick="togglePresenceBlock()" style="padding:11px 15px;border:1px solid #f78;background:#4a2335;color:white;border-radius:20px">ブロック</button>
      </div>
      <div id="presenceSocialNotice" style="font-size:12px;margin-top:10px;color:#ffd2df"></div>
    </div>
  </div>
  <button class="panel-close" type="button" onclick="closePanel()" aria-label="閉じる">×</button>
  <div class="panel-status" id="panelStatus">配信準備中</div>

  <div class="background-custom" id="backgroundCustom">
    <div class="background-custom-title">🎨 配信画面の背景</div>
    <div class="background-options">
      <button class="background-option background-blue" type="button" onclick="setLiveBackground('blue')">💙 ブルー</button>
      <button class="background-option background-purple" type="button" onclick="setLiveBackground('purple')">💜 パープル</button>
      <button class="background-option background-pink" type="button" onclick="setLiveBackground('pink')">🌸 ピンク</button>
      <button class="background-option background-image" type="button" onclick="document.getElementById('backgroundFile').click()">🖼️ 画像</button>
    </div>
    <input id="backgroundFile" type="file" accept="image/*" style="display:none" onchange="loadCustomBackground(event)">
    <button class="background-reset" type="button" onclick="resetLiveBackground()">背景をリセット</button>
  </div>

  <div class="audio-status"><div id="audioText">音声接続</div></div>
  <audio id="remoteAudio" autoplay playsinline></audio>
  <button id="audioButton" class="panel-button start-button" type="button" onclick="enableAudio()" style="display:none" aria-hidden="true" tabindex="-1">🔊 音声をONにする</button>
  <div class="action-rail">
    <button id="likeButton" class="live-action" type="button" aria-label="タップでいいね、長押しで連打"><span class="action-emoji">❤️</span><span>いいね</span></button>
    <button id="giftButton" class="live-action" type="button" onclick="showGiftNotice()"><span class="action-emoji">🎁</span><span>ギフト</span></button>
    <button class="live-action" type="button" onclick="shareLive()"><span class="action-emoji">📤</span><span>シェア</span></button>
    <button class="live-action" id="muteAction" type="button" onclick="toggleRemoteAudio()"><span class="action-emoji">🔊</span><span>音声</span></button>
    <button id="backgroundAction" class="live-action" type="button" onclick="toggleBackgroundPanel()"><span class="action-emoji">🎨</span><span>背景</span></button>
    <button id="editLiveTitleAction" class="live-action" type="button" onclick="editLiveTitle()"><span class="action-emoji">✏️</span><span>タイトル</span></button>
  </div>

  <div class="comments">
    <div class="comment-list" id="commentList" aria-label="コメント一覧"></div>
  </div>
  <div class="comment-input">
    <input id="commentInput" type="text" inputmode="text" enterkeyhint="send" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="コメントを入力...">
    <button type="button" onclick="sendComment()" aria-label="コメント送信">➤</button>
  </div>
  <button id="stopButton" class="panel-button stop-button" type="button" onclick="stopLive()" style="display:none">⛔ 配信を終了する</button>
  <button class="panel-button close-button" type="button" onclick="closePanel()">閉じる</button>
</div>



<!-- Moonflower stream setup; original background customization remains unchanged -->
<section id="moonLiveSetup" aria-label="配信設定">
  <div class="mls-stars" aria-hidden="true"></div>
  <div class="mls-wrap">
    <div class="mls-top">
      <button class="mls-back" type="button" onclick="closeMoonLiveSetup()" aria-label="戻る">‹</button>
      <div><div class="mls-brand">VoiceボタLive ✦ 月光花</div><h2>配信設定</h2></div>
      <span style="width:44px;text-align:center;color:#e6d0ff">✧</span>
    </div>
    <div class="mls-moon" aria-hidden="true"></div>
    <div class="mls-card mls-hero"><div class="mls-mic">🎙️</div><div><strong>音声ライブ</strong><small>月明かりの下、あなたの声で<br>みんなとつながろう</small></div></div>
    <div class="mls-card">
      <label class="mls-label" for="moonLiveTitle"><span>☾ 配信タイトル</span><small id="moonLiveTitleCount">0 / 100</small></label>
      <input class="mls-title" id="moonLiveTitle" type="text" maxlength="100" placeholder="例：初見さん大歓迎 🌙" autocomplete="off" oninput="updateMoonLiveTitleCount()">
    </div>
    <div class="mls-card">
      <div class="mls-label"><span>☾ 配信背景</span><small>今までのカスタム機能</small></div>
      <button class="mls-preview" id="moonLiveBgPreview" type="button" onclick="openMoonBgFullPreview()" aria-label="背景を全画面で確認"><span>🔍 全画面で背景を確認</span></button>
      <div class="mls-bgbuttons">
        <button type="button" onclick="setLiveBackground('blue');refreshMoonLiveBackground()">💙 ブルー</button>
        <button type="button" onclick="setLiveBackground('purple');refreshMoonLiveBackground()">💜 パープル</button>
        <button type="button" onclick="setLiveBackground('pink');refreshMoonLiveBackground()">🌸 ピンク</button>
        <button type="button" onclick="document.getElementById('backgroundFile').click()">🖼️ 好きな画像</button>
        <button type="button" onclick="resetLiveBackground();refreshMoonLiveBackground()" style="grid-column:1/-1">↺ 背景をリセット</button>
      </div>
      <p class="mls-note">背景をタップすると、実際の配信画面と同じ表示範囲で確認できます。背景のカスタム機能は今までどおりです。</p>
    </div>
    <button class="mls-start" type="button" onclick="startLive()">🎙 配信を開始する ❯</button>
  </div>
</section>

<!-- 配信背景の独立した全画面確認ページ。既存の背景設定処理は変更しません -->
<section id="moonBgFullScreen" aria-label="背景の全画面プレビュー" role="dialog" aria-modal="true">
  <div id="moonBgViewport" class="moon-bg-viewport">
    <div class="moon-bg-shade"></div>
    <div class="moon-bg-top"><button type="button" onclick="closeMoonBgFullPreview()" aria-label="配信設定に戻る">‹ 戻る</button><strong>背景プレビュー</strong></div>
    <div class="moon-bg-guide">この範囲が配信画面に表示されます</div>
    <div class="moon-bg-bottom"><span>配信時はコメントやアイコンが重なります</span><button type="button" onclick="closeMoonBgFullPreview()">この背景で戻る</button></div>
  </div>
</section>

<!-- 月光花マイページ：既存ホーム・配信画面と独立 -->
<section id="myPageScreen" aria-label="マイページ">
  <div class="mp-head">
    <span class="mp-icon-btn" aria-hidden="true" style="visibility:hidden;pointer-events:none">🏠</span>
    <div class="mp-name">マイページ</div>
    <button class="mp-icon-btn" type="button" onclick="myPageInfo('設定は準備中です')" aria-label="設定">⚙</button>
  </div>
  <div style="text-align:right;padding:0 18px"><button type="button" class="mp-edit" onclick="editMyPage()">✎ 編集する</button></div>
  <div class="mp-center">
    <button type="button" class="mp-avatar" id="mpAvatar" onclick="changeMyPageAvatar()" aria-label="アイコンを変更">🌙</button>
    <button type="button" class="mp-camera" onclick="changeMyPageAvatar()" aria-label="写真を選択">📷</button>
    <div style="font-weight:750;font-size:23px;text-shadow:0 2px 8px #000" id="mpMoonName">月光花</div>
    
    <div class="mp-gender" id="mpGenderLabel">性別：未設定</div>
  </div>
  <div class="mp-follow">
    <button type="button" class="mp-follow-button" onclick="openFollowList('following')"><strong id="mpFollowing">0</strong><small>フォロー中</small></button>
    <button type="button" class="mp-follow-button" onclick="openFollowList('followers')"><strong id="mpFollowers">0</strong><small>フォロワー</small></button>
  </div>
  <button class="mp-item" type="button" onclick="changeMyPageAvatar()"><span>◉ &nbsp; アイコンを変更</span><span>›</span></button>
  <button class="mp-item" type="button" onclick="editMyPage()"><span>✎ &nbsp; プロフィール編集</span><span>›</span></button>
  <button class="mp-item" type="button" onclick="myPageInfo('コインの購入・利用履歴は準備中です')"><span>🟡 &nbsp; もっているコイン</span><span><b id="mpCoinCount">0</b> &nbsp; ›</span></button>
  <div class="mp-bio">
    <div class="mp-bio-head"><span>▤ &nbsp; 自己紹介</span><button type="button" class="mp-edit" onclick="editMyPage()">編集する</button></div>
    <div id="mpBioText" class="mp-bio-text">自己紹介はまだありません。</div>
  </div>
  <button class="mp-item" type="button" onclick="myPageInfo('ファンランキングは準備中です')"><span>☆ &nbsp; ファンランキング</span><span>›</span></button>
  <button class="mp-item" type="button" onclick="myPageInfo('お問い合わせ機能は準備中です')"><span>✉ &nbsp; お問い合わせ・困ったときは</span><span>›</span></button>
  <input id="mpAvatarFile" type="file" accept="image/*" style="display:none" onchange="saveMyPageAvatar(this)">
</section>
<div id="mpFollowDialog" class="mp-follow-dialog" role="dialog" aria-modal="true" aria-labelledby="mpFollowTitle" onclick="closeFollowList()">
  <div class="mp-follow-panel" onclick="event.stopPropagation()">
    <div class="mp-follow-title"><strong id="mpFollowTitle">フォロー中</strong><button type="button" onclick="closeFollowList()" aria-label="閉じる">×</button></div>
    <div id="mpFollowContents" class="mp-follow-contents">まだ表示できるユーザーはいません。</div>
  </div>
</div>
<div id="vbTitleDialog" role="dialog" aria-modal="true" aria-label="配信タイトル編集">
  <div class="vb-title-box">
    <strong>配信タイトルを編集</strong>
    <input id="vbTitleInput" type="text" inputmode="text" autocomplete="off" placeholder="絵文字・Simeji特殊文字も入力できます">
    <div class="vb-title-actions"><button type="button" onclick="closeLiveTitleDialog()">キャンセル</button><button type="button" onclick="saveLiveTitleDialog()">保存する</button></div>
  </div>
</div>
<div class="mp-dialog-backdrop" id="mpEditDialog" onclick="closeMyPageEdit()">
  <div class="mp-dialog" onclick="event.stopPropagation()">
    <strong>プロフィールを編集</strong>
    <label for="mpNameInput" style="display:block;margin-top:14px">表示名</label>
    <input id="mpNameInput" type="text" inputmode="text" placeholder="表示名を入力">
    <label for="mpGenderInput">性別</label>
    <select id="mpGenderInput"><option value="未設定">未設定</option><option value="男性">男性</option><option value="女性">女性</option><option value="その他">その他</option><option value="非公開">非公開</option></select>
    <label for="mpBioInput">自己紹介</label>
    <textarea id="mpBioInput" rows="5" placeholder="自己紹介を入力"></textarea>
    <div class="mp-dialog-actions"><button type="button" onclick="closeMyPageEdit()">キャンセル</button><button type="button" onclick="saveMyPageEdit()">保存する</button></div>
  </div>
</div>

<section id="searchPage" aria-label="ライバーを探す">
 <div class="search-header"><button type="button" class="search-back" onclick="closeSearchPage()" aria-label="戻る">←</button><span>探す</span></div>
 <input id="searchKeyword" type="search" placeholder="ライバー名・キーワードで検索" autocomplete="off" enterkeyhint="search" oninput="scheduleSearchUpdate()" onkeydown="handleSearchKeydown(event)" oncompositionend="scheduleSearchUpdate()">
 <div id="searchResults"></div>
</section>
<nav class="bottom-nav">


  <button
    class="nav-item"
    type="button"
    onclick="goHome()"
  >

    <div class="nav-icon">
      🏠
    </div>

    ホーム

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="openSearchPage()"
  >

    <div class="nav-icon">
      🔍
    </div>

    探す

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="openMoonLiveSetup()"
  >

    <div class="nav-live">
      🎙️
    </div>

    配信

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="showNotice()"
  >

    <div class="nav-icon">
      🔔
    </div>

    お知らせ

  </button>


  <button
    class="nav-item"
    type="button"
    onclick="showProfile()"
  >

    <div class="nav-icon">
      👤
    </div>

    マイページ

  </button>


</nav>


</div>


<script>


/* =========================================================
   VARIABLES
========================================================= */

let socket = null;

let myId = (function(){
  let id = localStorage.getItem("voiceBotaClientId");
  if (!id) { id = "user_" + Math.random().toString(36).substring(2,12); localStorage.setItem("voiceBotaClientId", id); }
  return id;
})();

let connected = false;

let isBroadcaster = false;

let localStream = null;

let peerConnections = {};

let currentUserName = "ユーザー";
let presenceMembers = [];
let broadcasterProfile = null;

let currentLiveId = null;

let currentBroadcasterId = null;


/* =========================================================
   WEBRTC
========================================================= */

const rtcConfig = {

  iceServers: [

    {
      urls:
        "stun:stun.l.google.com:19302"
    },

    {
      urls:
        "stun:stun1.l.google.com:19302"
    }

  ]

};


/* =========================================================
   CONNECT
========================================================= */

function connectSocket() {

  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const url =
    protocol +
    "//" +
    location.host;

  console.log(
    "WebSocket connecting:",
    url
  );

  socket =
    new WebSocket(url);


  socket.onopen =
    function() {

      connected = true;

      console.log(
        "WebSocket connected"
      );

      send({type:"hello",clientId:myId,profile:getMyPublicProfile()});
      if(document.getElementById('searchPage')?.classList.contains('active'))send({type:'search_request'});

    };


  socket.onclose =
    function() {

      connected = false;

      console.log(
        "WebSocket disconnected"
      );

      setTimeout(
        connectSocket,
        2000
      );

    };


  socket.onerror =
    function(error) {

      console.error(
        "WebSocket error",
        error
      );

    };


  socket.onmessage =
    function(event) {

      let data;

      try {

        data =
          JSON.parse(
            event.data
          );

      } catch(error) {

        console.error(
          "JSON error",
          error
        );

        return;

      }

      handleMessage(data);

    };

}


function send(data) {

  if (
    socket &&
    socket.readyState ===
      WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(data)
    );

    return true;

  }

  return false;

}


/* =========================================================
   MESSAGE
========================================================= */

function getMyPublicProfile(){
  return {
    name: localStorage.getItem("voiceBotaProfileName") || currentUserName || "ゲスト",
    avatar: localStorage.getItem("voiceBotaProfileAvatar") || "",
    gender: localStorage.getItem("voiceBotaProfileGender") || "未設定",
    bio: localStorage.getItem("voiceBotaProfileBio") || ""
  };
}
function sendMyProfile(){
  send({type:"profile_update",clientId:myId,profile:getMyPublicProfile()});
}
function paintPresenceAvatar(el,member){
  const photo = member.avatar || "";
  el.textContent = photo ? "" : emojiSafeLimit(member.name || "？",1);
  el.style.backgroundImage = photo && photo.startsWith("data:image/") ? 'url("' + photo + '")' : "";
}
let presenceProfileTarget = null;
let presenceFollowing = [];
let presenceBlocked = [];
let presenceHidden = [];
let presenceFollowers = [];
let socialProfiles = {};
function updatePresenceSocialButtons(){
 const id=presenceProfileTarget;
 const f=document.getElementById("presenceFollowButton"),b=document.getElementById("presenceBlockButton");
 if(!f||!b)return;
 const own=id===myId;
 document.getElementById("presenceSocialActions").style.display=own?"none":"flex";
 f.textContent=presenceFollowing.includes(id)?"フォロー解除":"フォロー";
 b.textContent=presenceBlocked.includes(id)?"ブロック解除":"ブロック";
 f.disabled=presenceBlocked.includes(id);
}
function togglePresenceFollow(){if(presenceProfileTarget&&presenceProfileTarget!==myId)send({type:"social_action",action:"follow",targetId:presenceProfileTarget});}
function togglePresenceBlock(){if(!presenceProfileTarget||presenceProfileTarget===myId)return;
 const blocked=presenceBlocked.includes(presenceProfileTarget);
 if(!blocked&&!confirm("このユーザーをブロックしますか？"))return;
 send({type:"social_action",action:"block",targetId:presenceProfileTarget});
}
function openPresenceProfile(id){
  if (presenceBlocked.includes(id) || (Array.isArray(presenceHidden) && presenceHidden.includes(id))) return;
  const member = presenceMembers.find(function(m){return m.id === id;}) || (broadcasterProfile && broadcasterProfile.id === id ? broadcasterProfile : null) || (socialProfiles[id] ? {id:id,...socialProfiles[id]} : null);
  if(!member || presenceHidden.includes(id))return;
  const profileOverlay=document.getElementById("presenceProfile");
  if(profileOverlay && profileOverlay.parentElement!==document.body)document.body.appendChild(profileOverlay);
  closePresence();
  presenceProfileTarget=id;
  document.getElementById("presenceSocialNotice").textContent="";
  updatePresenceSocialButtons();
  document.getElementById("presenceProfileName").textContent = member.name || "ゲスト";
  document.getElementById("presenceProfileGender").textContent = "性別：" + (member.gender || "未設定");
  document.getElementById("presenceProfileBio").textContent = member.bio || "自己紹介はまだありません。";
  const photo = document.getElementById("presenceProfilePhoto");
  photo.textContent = member.avatar ? "" : "👤";
  photo.style.backgroundImage = member.avatar && member.avatar.startsWith("data:image/") ? 'url("' + member.avatar + '")' : "";
  document.getElementById("liveProfileFollowing").textContent="…";
  document.getElementById("liveProfileFollowers").textContent="…";
  document.getElementById("liveProfileFollowList").style.display="none";
  send({type:"social_profile_request",targetId:id});
  document.getElementById("presenceProfile").classList.add("open");
}
let liveProfileSocial={following:[],followers:[],profiles:{}};
function openLiveProfileFollowList(kind){
 const box=document.getElementById("liveProfileFollowList");
 if(!box)return;
 const ids=liveProfileSocial[kind]||[];
 box.replaceChildren();box.style.display="block";
 const heading=document.createElement("div");heading.style.cssText="display:flex;justify-content:space-between;align-items:center;margin:8px 0 12px";
 const label=document.createElement("strong");label.textContent=(kind==="following"?"フォロー中":"フォロワー")+"（"+ids.length+"人）";
 const back=document.createElement("button");back.textContent="閉じる";back.style.cssText="background:#303b65;color:white;border:0;border-radius:10px;padding:7px";back.onclick=()=>{box.style.display="none"};
 heading.append(label,back);box.appendChild(heading);
 if(!ids.length){const empty=document.createElement("p");empty.textContent="まだユーザーはいません。";box.appendChild(empty);return;}
 ids.forEach(id=>{
   if(presenceHidden.includes(id)||presenceBlocked.includes(id))return;
   const p=liveProfileSocial.profiles[id]||{};
   const button=document.createElement("button");button.type="button";
   button.style.cssText="display:flex;align-items:center;gap:12px;width:100%;padding:9px;border:0;border-bottom:1px solid #ffffff22;background:transparent;color:white;text-align:left";
   const avatar=document.createElement("span");avatar.style.cssText="width:40px;height:40px;border-radius:50%;background:#394875;display:flex;align-items:center;justify-content:center;background-size:cover;background-position:center";
   avatar.textContent=p.avatar?"":"👤";
   if(p.avatar&&p.avatar.startsWith("data:image/"))avatar.style.backgroundImage='url("'+p.avatar+'")';
   const name=document.createElement("span");name.textContent=p.name||"ユーザー";
   button.append(avatar,name);button.onclick=()=>{
     box.style.display="none";
     if(!presenceMembers.some(m=>m.id===id))presenceMembers.push({id,name:p.name||"ユーザー",avatar:p.avatar||"",bio:p.bio||""});
     openPresenceProfile(id);
   };
   box.appendChild(button);
 });
}
function closePresenceProfile(){document.getElementById("presenceProfile").classList.remove("open");}
function renderLiveHeader(){
  const title=document.getElementById("liveTopTitle");
  const hostInfo=document.getElementById("liveHostInfo");
  const hostAvatar=document.getElementById("liveHostAvatar");
  const hostName=document.getElementById("liveHostName");
  if(title)title.textContent=activeLiveTitle || "配信中";
  if(!hostInfo || !hostAvatar || !hostName)return;
  const host=broadcasterProfile;
  hostInfo.style.visibility=host ? "visible" : "hidden";
  if(!host)return;
  paintPresenceAvatar(hostAvatar,host);
  hostName.textContent=host.name || "配信者";
  hostAvatar.onclick=hostName.onclick=function(){openPresenceProfile(host.id);};
}

let liveStartedAt = 0;
function renderLiveElapsedTime(){
 const el=document.getElementById("liveElapsedTime");
 if(!el)return;
 if(!liveStartedAt){el.textContent="00:00:00";return;}
 const seconds=Math.max(0,Math.floor((Date.now()-liveStartedAt)/1000));
 const h=String(Math.floor(seconds/3600)).padStart(2,"0");
 const m=String(Math.floor(seconds%3600/60)).padStart(2,"0");
 const sec=String(seconds%60).padStart(2,"0");
 el.textContent=h+":"+m+":"+sec;
}
setInterval(renderLiveElapsedTime,1000);
let activeLiveTitle="";
function renderPresence() {
  const strip = document.getElementById("presenceStrip");
  const list = document.getElementById("presenceList");
  if (!strip || !list) return;
  strip.replaceChildren();list.replaceChildren();
  document.getElementById("presenceHeading").textContent = "参加者一覧 (" + presenceMembers.length + "人)";
  presenceMembers.slice(0,3).forEach(function(member) {
    const button = document.createElement("button");
    button.className = "presence-avatar";
    paintPresenceAvatar(button,member);
    button.title = member.name;
    button.onclick = function(){openPresenceProfile(member.id);};
    strip.appendChild(button);
  });
  if (presenceMembers.length > 3) {
    const more = document.createElement("button");
    more.className = "presence-more";
    more.textContent = "+" + (presenceMembers.length - 3) + "人";
    more.onclick = openPresence;
    strip.appendChild(more);
  }
  presenceMembers.forEach(function(member) {
    const item = document.createElement("button");
    item.type = "button";item.className = "presence-entry";
    item.style.width = "100%";item.style.color = "white";item.style.background = "transparent";item.style.borderTop = "0";item.style.borderLeft = "0";item.style.borderRight = "0";
    const avatar = document.createElement("span");avatar.className="presence-avatar";
    avatar.style.display="inline-flex";avatar.style.alignItems="center";avatar.style.justifyContent="center";
    paintPresenceAvatar(avatar,member);
    const label=document.createElement("span");label.textContent=member.name || "ゲスト";
    item.append(avatar,label);
    item.onclick=function(){openPresenceProfile(member.id);};
    list.appendChild(item);
  });
}
function openPresence() { document.getElementById("presenceOverlay").classList.add("open"); }
function closePresence() { document.getElementById("presenceOverlay").classList.remove("open"); }

function handleMessage(data) {
  if(data.type==="social_profile_response"){
    if(String(data.targetId)!==String(presenceProfileTarget))return;
    liveProfileSocial={following:Array.isArray(data.following)?data.following:[],followers:Array.isArray(data.followers)?data.followers:[],profiles:data.profiles||{}};
    document.getElementById("liveProfileFollowing").textContent=String(liveProfileSocial.following.length);
    document.getElementById("liveProfileFollowers").textContent=String(liveProfileSocial.followers.length);
    return;
  }

  if(data.type==="social_state"){
    presenceFollowing=Array.isArray(data.following)?data.following:[];
    presenceBlocked=Array.isArray(data.blocked)?data.blocked:[];
    presenceHidden=Array.isArray(data.hidden)?data.hidden:[];
    presenceMembers=presenceMembers.filter(m=>!presenceHidden.includes(m.id));
    if(broadcasterProfile && presenceHidden.includes(broadcasterProfile.id))broadcasterProfile=null;
    if(presenceProfileTarget && presenceHidden.includes(presenceProfileTarget))closePresenceProfile();
    renderPresence();renderLiveHeader();
    presenceFollowers=Array.isArray(data.followers)?data.followers:[];
    socialProfiles=data.profiles&&typeof data.profiles==="object"?data.profiles:{};
    const followingCount=document.getElementById("mpFollowing");
    const followersCount=document.getElementById("mpFollowers");
    if(followingCount)followingCount.textContent=String(presenceFollowing.length);
    if(followersCount)followersCount.textContent=String(presenceFollowers.length);
    updatePresenceSocialButtons();return;
  }
  if(data.type==="social_notice"){
    const el=document.getElementById("presenceSocialNotice");if(el)el.textContent=data.message||"";return;
  }
  if(data.type==="viewer_removed"){
    const pc=peerConnections[data.viewerId];
    if(pc){try{pc.close();}catch(e){} delete peerConnections[data.viewerId];}
    return;
  }
  if(data.type==="block_live_exit"){
    if(!isBroadcaster){closePanel();goHome();}
    return;
  }
  if(data.type==="access_denied"){
    if(!isBroadcaster){closePanel();goHome();}
    return;
  }

  if(data.type==="test_gift") {displayTestGift(data);return;}

  if (data.type === "presence_update") {
    presenceMembers = Array.isArray(data.members) ? data.members.filter(m=>!presenceHidden.includes(m.id)) : [];
    broadcasterProfile = data.broadcasterProfile && !presenceHidden.includes(data.broadcasterProfile.id) ? data.broadcasterProfile : null;
    activeLiveTitle=data.title || activeLiveTitle;
    liveStartedAt=Number(data.startedAt)||0;
    renderLiveElapsedTime();
    renderPresence();
    renderLiveHeader();
    return;
  }


  console.log(
    "SERVER:",
    data
  );


  if (
    data.type ===
    "live_list"
  ) {

    renderLiveList(
      data.lives || []
    );

    return;

  }


  if(data.type==='search_results'){
    searchUsers=Array.isArray(data.users)?data.users:[];
    searchResultsReceived=true;
    if(document.getElementById('searchPage').classList.contains('active'))renderSearchResults();
    return;
  }
  if(data.type==="discovery_list"){
    discoveryData={featured:data.featured||[],new:data.new||[],debut:data.debut||[]};
    renderDiscovery();return;
  }
  if (data.type === "title_update") {
    activeLiveTitle = String(data.title || "配信中");
    renderLiveHeader();
    document.getElementById("panelTitle").textContent = activeLiveTitle;
    return;
  }

  if (data.type === "background_update") {
    if (data.background) applyLiveBackground(data.background);
    return;
  }

  if (
    data.type ===
    "live_started"
  ) {

    setPanelStatus(
      "🔴 配信中です"
    );

    return;

  }


  if (
    data.type ===
    "live_start_failed"
  ) {

    alert(
      data.reason ||
      "配信を開始できませんでした"
    );

    return;

  }


  if (
    data.type ===
    "viewer_joined"
  ) {

    createOffer(
      data.viewerId
    );

    return;

  }


  if (
    data.type ===
    "offer"
  ) {

    receiveOffer(
      data
    );

    return;

  }


  if (
    data.type ===
    "answer"
  ) {

    receiveAnswer(
      data
    );

    return;

  }


  if (
    data.type ===
    "ice"
  ) {

    receiveIce(
      data
    );

    return;

  }


  if (
    data.type ===
    "comment"
  ) {

    addComment(
      data.name,
      data.text,
      data.clientId,
      data.avatar
    );

    return;

  }


  if (data.type === "live_follow_notice") {
    // フォローが成立したときだけサーバーから配信参加者に届く。
    if (!document.getElementById("livePanel")?.classList.contains("show")) return;
    const followerId = String(data.followerId || "");
    if (!followerId) return;
    const followerName = String(data.followerName || "ユーザー");
    const followerAvatar = typeof data.followerAvatar === "string" ? data.followerAvatar : "";
    socialProfiles[followerId] = {name:followerName, avatar:followerAvatar};
    addComment(followerName, "🌸 " + followerName + "さんがライバーをフォローしました！", followerId, followerAvatar);
    return;
  }

  if (
    data.type ===
    "like"
  ) {

    if(data.clientId!==myId)animateMyLike();
    // ハートは毎回飛ばすが、コメント欄の通知は各配信につき1人1回だけ。
    if (data.firstLikeNotice === true) {
      addComment(
        data.name || "ゲスト",
        "❤️ いいねしました",
        data.clientId
      );
    }

    return;

  }


  if (
    data.type ===
    "live_stopped"
  ) {

    setPanelStatus(
      "配信が終了しました"
    );

    document.getElementById(
      "audioText"
    ).textContent =
      "ライブ終了";

    closePeers();

    renderLiveList([]);

    return;

  }


  if (
    data.type ===
    "live_unavailable"
  ) {

    alert(
      "このライブは終了しています"
    );

    return;

  }

}


/* =========================================================
   LIVE LIST
========================================================= */


let discoveryData={featured:[],new:[],debut:[]};
const discoveryTitles={featured:"注目",new:"NEW",debut:"デビュー"};
function discoveryCard(user){
 const button=document.createElement("button");button.className="discover-card";button.type="button";
 const photo=document.createElement("div");photo.className="discover-card-photo";
 const avatar=document.createElement("div");avatar.className="discover-card-avatar";
 if(user.avatar && user.avatar.startsWith("data:image/")){
   photo.style.backgroundImage='url("'+user.avatar+'")';
   avatar.style.backgroundImage='url("'+user.avatar+'")';
 }else avatar.textContent="🎙️";
 const shade=document.createElement("div");shade.className="discover-card-shade";
 const body=document.createElement("div");body.className="discover-card-body";
 const details=document.createElement("div");details.style.minWidth="0";
 const name=document.createElement("div");name.className="discover-card-name";name.textContent=user.name||"ユーザー";
 const status=document.createElement("div");status.className="discover-card-status";status.textContent=user.live?"🔴 配信中":"プロフィールを見る";
 details.append(name,status);body.append(avatar,details);button.append(photo,shade,body);
 if(user.live){const badge=document.createElement("span");badge.className="discover-live";badge.textContent="LIVE";button.appendChild(badge)}
 button.onclick=()=>{
   if(user.live){closeDiscoveryAll();listenLive(user.id);return;}
   if(!socialProfiles[user.id])socialProfiles[user.id]={name:user.name,avatar:user.avatar||""};
   openPresenceProfile(user.id);
 };
 return button;
}
function fillDiscoveryGrid(target,items){
 const el=document.getElementById(target);if(!el)return;el.replaceChildren();
 if(!items.length){const empty=document.createElement("div");empty.className="discover-empty";empty.textContent="表示できるライバーはまだいません";el.appendChild(empty);return;}
 items.forEach(user=>el.appendChild(discoveryCard(user)));
}
function renderDiscovery(){
 fillDiscoveryGrid("discoverFeatured",discoveryData.featured.slice(0,6));
 fillDiscoveryGrid("discoverNew",discoveryData.new.slice(0,6));
 fillDiscoveryGrid("discoverDebut",discoveryData.debut.slice(0,6));
}
function openDiscoveryAll(kind){
 if(!discoveryTitles[kind])return;
 document.getElementById("discoverAllTitle").textContent=discoveryTitles[kind];
 fillDiscoveryGrid("discoverAllGrid",discoveryData[kind]);
 document.getElementById("discoverAllScreen").classList.add("open");
}
function closeDiscoveryAll(){document.getElementById("discoverAllScreen").classList.remove("open")}

function renderLiveList(
  lives
) {

  const list =
    document.getElementById(
      "liveList"
    );


  if (
    !lives ||
    lives.length === 0
  ) {

    list.innerHTML =
      '<div class="empty">' +
      'フォロー中のライバーは現在配信していません' +
      '</div>';

    return;

  }


  let html = "";


  lives.forEach(
    function(live) {

      html +=

        '<div class="live-card" ' +

        'onclick="listenLive(\'' +
        escapeHtml(live.id) +
        '\')">' +

        '<div class="live-avatar">' +
        '🎙️' +
        '</div>' +

        '<div class="live-info">' +

        '<div class="live-name">' +
        escapeHtml(
          live.name
        ) +
        '</div>' +

        '<div class="live-title">' +
        escapeHtml(
          live.title
        ) +
        '</div>' +

        '<span class="live-badge">' +
        'LIVE' +
        '</span>' +

        '</div>' +

        '</div>';

    }
  );


  list.innerHTML =
    html;

}


function escapeHtml(
  value
) {

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
    "&#39;"
  );

}



/* Moonflower stream setup: only the pre-stream navigation is new. */
function openMoonLiveSetup() {
  if (isBroadcaster) { openPanel(); return; }
  const screen = document.getElementById('moonLiveSetup');
  const input = document.getElementById('moonLiveTitle');
  if (!input.value.trim()) input.value = 'VoiceボタLive 配信中';
  updateMoonLiveTitleCount();
  refreshMoonLiveBackground();
  screen.classList.add('open');
}
function closeMoonLiveSetup() {
  document.getElementById('moonLiveSetup').classList.remove('open');
}
function updateMoonLiveTitleCount() {
  const value = document.getElementById('moonLiveTitle').value;
  document.getElementById('moonLiveTitleCount').textContent = Array.from(value).length + ' / 100';
}
function refreshMoonLiveBackground() {
  const preview = document.getElementById('moonLiveBgPreview');
  const livePanel = document.getElementById('livePanel');
  if (!preview || !livePanel) return;
  preview.style.backgroundImage = livePanel.style.backgroundImage || 'linear-gradient(145deg,#263d7b,#17153e)';
}
window.addEventListener('load', function() {
  const livePanel = document.getElementById('livePanel');
  if (livePanel && typeof MutationObserver !== 'undefined') {
    new MutationObserver(refreshMoonLiveBackground).observe(livePanel,{attributes:true,attributeFilter:['style']});
  }
});

/* =========================================================
   START LIVE
========================================================= */


/* 配信背景プレビュー専用ページ。既存の背景選択・同期には干渉しません */
function openMoonBgFullPreview() {
  const panel=document.getElementById('livePanel');
  const viewport=document.getElementById('moonBgViewport');
  const page=document.getElementById('moonBgFullScreen');
  if(!panel||!viewport||!page)return;
  const cs=getComputedStyle(panel);
  viewport.style.backgroundImage=cs.backgroundImage;
  viewport.style.backgroundPosition=cs.backgroundPosition;
  viewport.style.backgroundSize=cs.backgroundSize;
  viewport.style.backgroundRepeat=cs.backgroundRepeat;
  viewport.style.backgroundColor=cs.backgroundColor;
  page.classList.add('open');
}
function closeMoonBgFullPreview(){
  const page=document.getElementById('moonBgFullScreen');
  if(page)page.classList.remove('open');
}
/* 自動再生が端末に制限された場合、視聴画面のタップで音声再生を再試行 */
window.addEventListener('load',function(){
  const panel=document.getElementById('livePanel');
  if(!panel)return;
  panel.addEventListener('pointerup',function(){
    if(isBroadcaster)return;
    const audio=document.getElementById('remoteAudio');
    if(audio&&audio.srcObject&&audio.paused){audio.play().catch(function(){});}
  });
});

async function startLive() {

  console.log(
    "START LIVE CLICK"
  );



  if (!connected) {

    alert(
      "サーバーに接続中です。\n" +
      "少し待ってからもう一度押してください。"
    );

    return;

  }


  if (isBroadcaster) {

    openPanel();

    return;

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "このブラウザではマイクを使用できません。"
    );

    return;

  }


  // 配信者名はマイページの登録名を自動で使用する
  const profileName = String(getMyPublicProfile().name || "").trim();
  const name = profileName && profileName !== "ユーザー" && profileName !== "ゲスト"
    ? profileName : (String(currentUserName || "").trim() || "配信者");


  const title = document.getElementById('moonLiveTitle').value.trim();


  if (
    title === null ||
    title.trim() === ""
  ) {

    return;

  }


  currentUserName =
    emojiSafeLimit(name.trim(),30);


  setPanelStatus(
    "🎤 マイクを確認しています..."
  );


  closeMoonLiveSetup();
  openPanel();


  try {

    localStream =
      await navigator.mediaDevices
        .getUserMedia({

          audio: {

            echoCancellation:
              true,

            noiseSuppression:
              true,

            autoGainControl:
              true,

            // 高音質音声を優先（非対応端末ではブラウザが無視）
            sampleRate:
              { ideal: 48000 },

            channelCount:
              { ideal: 1 },

            sampleSize:
              { ideal: 16 }

          },

          video:
            false

        });


    console.log(
      "MIC OK"
    );


  } catch(error) {

    console.error(
      "MIC ERROR",
      error
    );


    setPanelStatus(
      "マイク許可が必要です"
    );


    alert(
      "マイクを使用できませんでした。\n\n" +
      "ブラウザのマイク許可を確認してください。"
    );


    return;

  }


  activeLiveTitle = title;
  renderLiveHeader();
  isBroadcaster =
    true;
  document.getElementById("livePanel").classList.add("is-broadcaster");
  updateAudioAction();


  document.getElementById(
    "panelTitle"
  ).textContent =
    title;


  document.getElementById(
    "stopButton"
  ).style.display =
    "block";


  document.getElementById(
    "likeButton"
  ).style.display =
    "block";


  document.getElementById(
    "audioText"
  ).textContent =
    "🎙️ マイク配信中";


  setPanelStatus(
    "🔴 配信を開始しています..."
  );


  const sent =
    send({

      type:
        "start_live",

      clientId:
        myId,

      name:
        currentUserName,

      title:
        title,

      background:
        (function() {
          try { return localStorage.getItem("voiceBotaLiveBackground") || ""; }
          catch (e) { return ""; }
        })()

    });


  if (!sent) {

    alert(
      "サーバーとの接続が切れました。"
    );

    return;

  }


  setPanelStatus(
    "🔴 配信中です"
  );

}


/* =========================================================
   STOP LIVE
========================================================= */

function stopLive() {
  stopLikeHold();

  if (!isBroadcaster) {

    closePanel();

    return;

  }


  send({

    type:
      "stop_live"

  });


  if (localStream) {

    localStream
      .getTracks()
      .forEach(
        function(track) {

          track.stop();

        }
      );

  }


  localStream =
    null;


  closePeers();


  isBroadcaster =
    false;
  document.getElementById("livePanel").classList.remove("is-broadcaster");
  updateAudioAction();


  document.getElementById(
    "stopButton"
  ).style.display =
    "none";


  document.getElementById(
    "audioText"
  ).textContent =
    "配信終了";


  setPanelStatus(
    "配信を終了しました"
  );


  renderLiveList([]);


  setTimeout(
    closePanel,
    800
  );

}


/* =========================================================
   LISTEN LIVE
========================================================= */

function listenLive(
  liveId
) {

  if (isBroadcaster) {

    alert(
      "配信中は視聴できません。"
    );

    return;

  }


  currentLiveId =
    liveId;


  openPanel();
  const remoteAudio = document.getElementById('remoteAudio');
  remoteAudio.muted = false;
  remoteAudio.volume = 1;
  remoteAudio.autoplay = true;
  remoteAudio.playsInline = true;
  document.getElementById('audioButton').style.display = 'none';

  document.getElementById(
    "panelTitle"
  ).textContent =
    "LIVE";


  setPanelStatus(
    "🎧 配信者に接続しています..."
  );


  document.getElementById(
    "audioText"
  ).textContent =
    "接続中...";


  send({

    type:
      "join_live",

    clientId:
      myId,

    liveId:
      liveId,
    name: currentUserName,
    profile: getMyPublicProfile()

  });

}


/* =========================================================
   BROADCASTER OFFER
========================================================= */

const pendingIce = Object.create(null);
async function flushPendingIce(id) {
  const pc = peerConnections[id];
  if (!pc || !pc.remoteDescription) return;
  const list = pendingIce[id] || [];
  delete pendingIce[id];
  for (const candidate of list) {
    try { await pc.addIceCandidate(candidate); }
    catch (e) { console.warn('ICE candidate rejected', e); }
  }
}

async function createOffer(
  viewerId
) {

  if (
    !isBroadcaster ||
    !localStream
  ) {

    return;

  }


  if (peerConnections[viewerId]) peerConnections[viewerId].close();
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections[viewerId] = pc;
  pc.oniceconnectionstatechange = function() {
    console.log('配信者ICE:', viewerId, pc.iceConnectionState);
  };


  localStream
    .getTracks()
    .forEach(
      function(track) {

        const sender = pc.addTrack(
          track,
          localStream
        );
        // Opusの音声ビットレートを高めに設定。未対応なら標準設定で続行。
        if (track.kind === 'audio' && sender.getParameters && sender.setParameters) {
          try {
            const params = sender.getParameters();
            if (!params.encodings || !params.encodings.length) params.encodings = [{}];
            params.encodings[0].maxBitrate = 96000;
            Promise.resolve(sender.setParameters(params)).catch(function(err){
              console.warn('音質設定は標準値で続行:', err);
            });
          } catch(err) {
            console.warn('音質設定は標準値で続行:', err);
          }
        }

      }
    );


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send({

          type:
            "ice",

          from:
            myId,

          to:
            viewerId,

          candidate:
            event.candidate

        });

      }

    };


  pc.onconnectionstatechange =
    function() {

      console.log(
        "Broadcaster connection:",
        pc.connectionState
      );

    };


  try {

    const offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    send({

      type:
        "offer",

      from:
        myId,

      to:
        viewerId,

      sdp:
        pc.localDescription

    });


  } catch(error) {

    console.error(
      "CREATE OFFER ERROR",
      error
    );

  }

}


/* =========================================================
   VIEWER OFFER
========================================================= */

async function receiveOffer(
  data
) {

  currentBroadcasterId =
    data.from;


  if (peerConnections[data.from]) peerConnections[data.from].close();
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections[data.from] = pc;
  pc.oniceconnectionstatechange = function() {
    console.log('視聴者ICE:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      setPanelStatus('🎧 音声接続済み');
      const audio = document.getElementById('remoteAudio');
      if (audio && audio.srcObject) audio.play().catch(function(){
        document.getElementById('audioButton').style.display = 'none';
      });
    } else if (pc.iceConnectionState === 'failed') {
      setPanelStatus('音声接続に失敗しました。Wi-Fiと再入室を確認してください');
      document.getElementById('audioButton').style.display = 'none';
    }
  };


  pc.ontrack =
    function(event) {

      console.log(
        "REMOTE AUDIO"
      );


      const audio =
        document.getElementById(
          "remoteAudio"
        );


      if (
        event.streams &&
        event.streams[0]
      ) {

        audio.srcObject =
          event.streams[0];

      }


      audio.play()
        .then(
          function() {

            document.getElementById(
              "audioText"
            ).textContent =
              "🔊 LIVE 音声";


            setPanelStatus(
              "🎧 接続しました"
            );

          }
        )
        .catch(
          function(error) {

            console.log(
              "AUTOPLAY BLOCKED",
              error
            );


            document.getElementById(
              "audioButton"
            ).style.display =
              "block";


            document.getElementById(
              "audioText"
            ).textContent =
              "🔊 音声を再生するには画面をタップしてください";

          }
        );

    };


  pc.onicecandidate =
    function(event) {

      if (
        event.candidate
      ) {

        send({

          type:
            "ice",

          from:
            myId,

          to:
            data.from,

          candidate:
            event.candidate

        });

      }

    };


  try {

    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    await flushPendingIce(data.from);


    const answer =
      await pc.createAnswer();


    await pc.setLocalDescription(
      answer
    );


    send({

      type:
        "answer",

      from:
        myId,

      to:
        data.from,

      sdp:
        pc.localDescription

    });


  } catch(error) {

    console.error(
      "RECEIVE OFFER ERROR",
      error
    );

  }

}


/* =========================================================
   ANSWER
========================================================= */

async function receiveAnswer(
  data
) {

  const pc =
    peerConnections[
      data.from
    ];


  if (!pc) {

    return;

  }


  try {

    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    await flushPendingIce(data.from);

  } catch(error) {

    console.error(
      "ANSWER ERROR",
      error
    );

  }

}


/* =========================================================
   ICE
========================================================= */

async function receiveIce(data) {
  if (!data || !data.from || !data.candidate) return;
  const pc = peerConnections[data.from];
  if (!pc || !pc.remoteDescription) {
    (pendingIce[data.from] ||= []).push(data.candidate);
    return;
  }
  try { await pc.addIceCandidate(data.candidate); }
  catch (e) { console.warn('ICE ERROR', e); }
}

/* =========================================================
   AUDIO
========================================================= */

function enableAudio() {

  const audio =
    document.getElementById(
      "remoteAudio"
    );


  audio.play()
    .then(
      function() {

        document.getElementById(
          "audioButton"
        ).style.display =
          "none";


        document.getElementById(
          "audioText"
        ).textContent =
          "🔊 LIVE 音声";

      }
    )
    .catch(
      function(error) {

        console.error(
          "AUDIO ERROR",
          error
        );

      }
    );

}


/* =========================================================
   LIKE
========================================================= */

function sendLike() {
  if(isBroadcaster || !document.getElementById("livePanel").classList.contains("show")) return;
  send({type:"like",name:currentUserName});
  animateMyLike();
}

/* Android Chrome対応: 長押し連打とハートの視覚効果 */
let likeHoldDelay=null,likeRepeatTimer=null,likePointerId=null,likeLongPress=false;
let likeLastTapAt=0;
function animateMyLike(){
 const panel=document.getElementById("livePanel");
 if(!panel||!panel.classList.contains("show"))return;
 const heart=document.createElement("span");
 heart.className="floating-like-heart";
 heart.textContent=["❤️","💗","💕"][Math.floor(Math.random()*3)];
 heart.style.right=(72+Math.random()*40)+"px";
 heart.style.bottom=(145+Math.random()*40)+"px";
 panel.appendChild(heart);
 setTimeout(()=>heart.remove(),1600);
}
function stopLikeHold(){
 clearTimeout(likeHoldDelay);clearInterval(likeRepeatTimer);
 likeHoldDelay=null;likeRepeatTimer=null;likePointerId=null;
}
function beginLikeHold(e){
 if(isBroadcaster)return;
 if(e.pointerType==="mouse"&&e.button!==0)return;
 e.preventDefault();
 stopLikeHold();likeLongPress=false;likePointerId=e.pointerId;
 const btn=document.getElementById("likeButton");
 if(btn&&btn.setPointerCapture){try{btn.setPointerCapture(e.pointerId)}catch(err){}}
 likeHoldDelay=setTimeout(()=>{
  likeHoldDelay=null;likeLongPress=true;
  sendLike();
  likeRepeatTimer=setInterval(()=>{if(!isBroadcaster)sendLike();else stopLikeHold()},200);
 },350);
}
function endLikeHold(e){
 if(likePointerId===null||(e&&e.pointerId!==likePointerId))return;
 const wasLong=likeLongPress;
 stopLikeHold();
 if(!wasLong){sendLike();likeLastTapAt=Date.now()}
}
function initLikeHold(){
 const btn=document.getElementById("likeButton");if(!btn||btn.dataset.likeBound)return;
 btn.dataset.likeBound="1";
 btn.addEventListener("pointerdown",beginLikeHold,{passive:false});
 btn.addEventListener("pointerup",endLikeHold);
 btn.addEventListener("pointercancel",stopLikeHold);
 btn.addEventListener("lostpointercapture",()=>{if(likePointerId!==null)stopLikeHold()});
 btn.addEventListener("contextmenu",e=>e.preventDefault());
 btn.addEventListener("dragstart",e=>e.preventDefault());
 btn.addEventListener("click",e=>{if(e.detail===0&&Date.now()-likeLastTapAt>300)sendLike()});
 document.addEventListener("pointerup",endLikeHold);
 document.addEventListener("pointercancel",stopLikeHold);
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stopLikeHold()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initLikeHold);
else initLikeHold();

function toggleBackgroundPanel() {
  const panel = document.getElementById("backgroundCustom");
  if (panel) panel.classList.toggle("open");
}

const testGifts=[
{id:"heart",name:"ハート",coins:10,emoji:"❤️",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"star",name:"スター",coins:50,emoji:"⭐",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"rose",name:"バラ",coins:100,emoji:"🌹",image:"data:image/webp;base64,UklGRqgOAABXRUJQVlA4IJwOAACQTQCdASq+AKsAPpE+mUglo6KhL1LbOLASCWQHCGj9vQLPlKRW1Pfcf3flUUG2UPW7uI/NJ+0PrH+mT/M+oB/gOpo3ne1CrqiDp6Pwt/ltcZPG9/+pp3g+0ErUtTQCyQGeNi7zj5GMFyeQGgY5r9+R5x0TS9vxjs9+YJX7yZxRixcuTrkVfjOy3yBnkJRuOF+HbXfrzGeNaLUGMHsq7KKkWjeUWC2MmIY/xglqL3p01OgF79cAjbXUc9qrg1xtpvYJ+9a2k/7jQmRBGNVMaX+YXwJYW9ZG1kZRoMk9jmQcVC5GSlnrEgspN3V3oK6M/gNH8dsCjKuQ3iBRBb76QTTZiU5gTtq/VnhpuC/QZ4RE0sVbeGj8UlDEhi/XKI+Atg2sjdvdDe5BonD5NryaV0lNykmNdNkECkpvrqBAgdlhLwXY7sB8Zhq64LhYuDXtX5Ccn1BpGRZ5jKSVLbL1GN2xxBMzdl9aP/5fwgb/hGBN3eukr+Ta8wGSH0sfhh8+5Z9D/ERmJPeO/qp/ydO5FDOpxZVBT3JABWgbeU0snKT2+pDn91x+fVBHpJKfb29yxoRA8NsLNwHZmp3KvYeIgK2Nt4bzuD90SZqRZg0ri1VOl6hG0fFoeBR2SuZoumcyNXhvtMtly3sGENn1sXO21Gap9n97VVWyUIWCZdxva3IK5KU7TsnXk6bHnGvJKuIgUB4IHn3AE+hTgc16eygyH0BkWjxLElCu02WhUSDTP+DvAjgxycw0KMXWTP1uJiXFCOiZ8jxbAu3Two5ikDmZgmwcbtn7JmvPz27wR3A29MJaHyiqnTf0UUtbAT+wtJB/zAjgNYDgAAD++dLL9mOs7WUd9unlEATnRdITFo9yvc+dEF/dnQ+KA5UbWifpzVtaHvUd/wt8e3yaT7dTLL40ZIBSwyCN+GhxzSOl72UM5CaNbbcsvfJ3KknXWnNqsLLIo1/30Hadi7F7tzEbdEZLt+DL9yHc1J4OLINzUVJa36WCEv2CZQyXJOUxdW2eVDNIARPzcs6rslnN195tGEDZ83UfoJ/r9JU+vIz5sH9H8GK86+t5ssXstc61mAwgLlLwKsEh8p2Osx566dzoSpw/ibDKd7zxcx+YhtGgTpeLJ3sKw9vC22GL8Q83zpQUlSRwCcfLRBK0t/rH0yILS3hFpKqS68y5NoqAQ+MB/SoSKMnB2XRbaXQrPObohhNdNQigPlXH7yWtR6M39Bv6R/Tz7zPH8a1aKlAuJnF1W3YzTI8Om2SeongmaP7hsiKmOgF7UTEGuCVZwg2HazKviqO5EHAK/LpGlT2IB5Vg9sa7SRvhLI23NpUT77sJ4/UMMGm9N3gXRCTatZaxO8DV0+7ycUrjrHdpvICgKjzdjaC92dBnDYJ6r9mW8V74izVMagCDRkXpw+sgNNc9FfxeAHoZ7Evdwh7u0x7qzC//+9B8RH8kci7xILIR2hf0jxuw5kprCI/NryrWTZRE84paPo1Skjx2jUMwXfQf1sn7MeK+xeZ1t6nfWVt+eibV2weZv9dZodE9TXz2H+SqiboVbm1qkuL3nw0OclkOa7blT0iqgUwmon7gfuOtgNA4+cbcn4M44YUfpvrw7/hWp5oFqilBScPE+uDu/YSvKCiMEUuuhOhvrPJIOd9Yg1hSzSw9w5yoBqQEB3l0klqgyTS6quQYYj7VaBUq19qZ3vsK/Vnm/EDUACoQBT/qlR+6ta4LsES8sQCSCyllYeXmyWvzpL/GAWY+jjKSpY5R2J09TRZSx0vK54po+Md3F7skzYjSy5F2Xi6Y/O0DR14ZHP9+bnWrvzaTm238ua7UK9+4Y7bNJWQt4mvjej2NwOgq5R8YO1AKfXtHlgzAUFEVp06ugyhtAP9ICEJ05zzCVtJ/8dwwqSWLRs+l3FgE3NpjW7FGVzjTFAqmnB0nAFMF1YENi4A1MrXlonNo1mq5NS7OOq4lkK7tIQGv+c1OZeQQWjqp4DSpxx8TcDY7QpmdLaOxVHiRSED7p+9Xn+lP/mHI33JbZxhcypVHMvKbo8lA3QxESbqNLBsqex48OARLLwB7kyjInhKj766xdVN9AsulkFGVgaaHm5Z10DfUUD6SRUNCKZ6Qs+r2UBowpO5V8lY9gSP+gC5R6hZZ3cXF2PKEkN/+JI2CoYrC9X/t0QfGTBmOcz68vMdQo7n7it1ozmZLbvI9jbG8NhmyUhY+xU26id+hK/00jH7wbPbeZr/CfwX1HQHi5YGNvq86/T49r1kuGpyVwYBJY5jkd96fsjSBeG7yuneJKGmnOswPUdGYq0+jshuiRPDdL1cHzqLZONKrw7osDBziZQc1He6bh/yOadQCO1DoLhDQluD28MmnH0ijx9zbk3N2/k8yd4PE+oo3TU3jHh6vy57VuV8aX5Io/ZWfMHCmTCGyRXflwtvU1A6Skgog7LuQwM7wruBCojH2Vtg/YTLrmo7OOjSgT458p3DW2n5+vciLepwQiREA80PEOh7I6LWG2RFfz6y2nKczosu8Z8S2trVfLElnW7/DAxdsGyNVgzU9BLvex/cPk8TCgHFTHaZbcqY7kFPjBDq/+nPvGjFYSEe86HOUH/IfW+r10s6iMBmKvib5yuqvrpfOCWEFjjMTsnUUW6DG2nU6QjkWwKmID4Ag3itNbohrIw1idSEX9JDkuuD1LOxn4Xprsvd/7AQEW5oabbi39j5DwoiagLF4/Zh2IaP+DXL75N53f05pMTwbe940GOIHqVBwtIxGyW28JTpOcktP688fMAtkJch5Umw4mzIhkOfmx0O6X/N6ERxPck6hLo5lL03Mbbuyz8p3ovwJXMby3c6wC+hxdaUb9tJ++wiOhUN2v21hCzVbAt3C2cw8Dp5+NtgujsltbT2gsOMfDlyA7+vDTmEC5Rb/nn9FsEUce6xZT73HgQbui1f7yxhV2QKHI0wwprf6L2K5M9ZTG10BBeZe+EY5yTrvmJL9ZWJ8uxW0wwfQRbUcpoEnCPErAWCE/mPQCRdAjvvlf2xqnAW9HlyAT+BDHv33G/velQObSCm2ABgEax0kb8XoG+juE125wNyuskhIEs+I1oYym3IJDtCtjutd+K9RQqfAgAYEN5vK3Gj3YXTEP2VGxr7MOD8TZcstygNKRdGYx/T3aBVjgp9rjbegLfmME5/DSpVXPUJ3lynUVoiFbrhyGgSTmW/eDjbIbsY6QfJ9Vt2CQ6CU92iHMpOUgvK+47XnscfWn2hMS4Ru0JEj1nJ+pIfY+l0jQeFwVzMTl/Dv7WAM3AXB0uFhzQsHjNcauBaa1r4F998dHjIkoT5IU76iMy0qTNVwPD4N/o7YxekjUNYjDj66CDsi39X75yOXznotpgzD6BWylZluYVEGlYy6xk9zBYc0LIy7HcqPRoSb128GKceDhArhh077546KEOteUzkv/F0J4Psh8xLfd1svR3oPY1ahvNoVKGGyrlWke2awm6P3HhU7BAXVwPXOH31pi+RpenfmuCxl+p8AxirgtreWDKcUM6/gse7LbHJSPpepSIVeoq1OETXFb8Y1e0oF8abFk+pOJkQIOhVHHLiPj4rejbvMCKLKHDXqRljLrXCL8/kO7YGEDfZpAi2MmBlsMkhSy+tAXj8aD+dDjetQQqcINTOKhNZDUWfeZ1pZ+XSRfdMm8nYtNZE5OD+h+dC7dwjv/DHQscuBUmLnsSttvL4ddMQU3CwSvNArfdKdhfAlM9GrRUBblU0j0lZlhJttzRxJ6XV5zrMxyozoCphA7xvx0Evy6L9A82dWL8JcZ1xhPh29GPfWjmOTxrNFRd5lHtyX9lkX35Yj4C5cZggg6PJvzOGTeKvWRnHU50r56IZaAFWmFw+Rxepwf9wHo4o8eBTqhZdx1slv6FRyqcB4ifsBcFe6FBgfyNCikv7gUUFMxHaM47XfKjIWhBivQsw1tTP/E00Idj4z8lMXfMjmj4ON9RQdt3Z03LLzmqYzeeHFAowdxcer6zSgh9RTTTTbwhK2YCgxPLjwk9zyIFkBKqC3am6pUoA9kFsgMO5xY9K1oeeSwdaMRqBbMoYqVURAzL/QyRBkr70Aet9g6Q79DVa0eNRth1eBj2yg5zS8iFdEj6F/QR4laXJ5O40aDvE9zTC+mnyg9lHUcAFICBgWSWcg2qQgiQNhThVHvgoIOns9URSLVyxyxM8MfBz2qE65uzsPsScyqCcsuJgFphXjgq2ZkJen7Fzn2zWP5Gr3locrOWgX8rcCrzH0ZLC5eiL7mpQC2eT66HladYZC2NDmey7Q6z18UyUpdwdqA1J7647WrfkzTFyIPP6As6IbUhGRKdDN6pTi6iwyUFe0yZEx/ZczoWhjfcFm4Rgb/0EVsqg8DOmeB6vqzJqw4JFI75izx3ON1WqQP9sNrgcGKJyZzgry1ZuHNuzcFtAAihLPvKCZKFk/dL/f3UnebGaL3mQcbhBeTkBHq76QwTtMvEKSuzO2jjlnNHAHAqh39GsXR4HJN/MG8b8YCwAZH+JzK/OBfpXEk078z6dvCHLkw2mR37G8RIqvurLUfV4Sh0hCbg0s/NFwLkd86USaxu7xkx3a+BjW+C8uN8OXPeu7XWueFlwR5VdF/hQjLP8AZYO04AkDh8wEiiDIXFs1kC617I305wd/7gjUxeTuJgyQHmnJfSegQ6GGUuDyutFW5ticsygOzZwMRJMCDVST7/ZcqkUYp4hcpwQYHmcP5KBn1tm5iZH2PrdeMkzVLWNUqGt0o+80vP3DATFKV1G03IR7iJ6Zd2n97ipG4YFMOLO9SihO5sMPr57z9/ARCFyAexb0DpAPt+V9MtjBYUAeRtMI6O8FeDrCdcU7L1Rp0iTNW2FO2pAlYfkt8f0NVYifKbv/Q3FC2vJtfiZuhiVRUaXmHKPhRqUDD5PONZeIRhyUUferDI6+RIGuxpAGjlGTL90tACbddWtHLanV5H32M054VD3Fa8m6aeis8Fhmn9TlDA/gUlcRF3KXETgAAA==",fxImage:"data:image/png;base64,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"},
{id:"bunny",name:"うさぎちゃん",coins:200,emoji:"🐰",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"toast",name:"乾杯",coins:300,emoji:"🥂",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"bouquet",name:"花束",coins:500,emoji:"💐",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"bear",name:"くまさん",coins:800,emoji:"🧸",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"moon",name:"おやすみ",coins:1000,emoji:"🌙",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"dream",name:"ドリーム",coins:3000,emoji:"🏰",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"kingheart",name:"キングハート",coins:5000,emoji:"💖",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"}
];
function showGiftNotice(){
 if(isBroadcaster || !document.getElementById("livePanel").classList.contains("show"))return;
 const grid=document.getElementById("testGiftChoices");grid.replaceChildren();
 testGifts.forEach(g=>{
  const b=document.createElement("button");b.type="button";b.className="test-gift-choice";
  const icon=document.createElement("img");icon.src=g.image;icon.alt=g.name;icon.loading="lazy";
  const name=document.createElement("strong");name.textContent=g.name;
  const cost=document.createElement("small");cost.textContent="🪙 "+g.coins.toLocaleString("ja-JP")+" コイン";
  b.append(icon,name,cost);b.onclick=()=>sendTestGift(g.id);grid.appendChild(b);
 });
 document.getElementById("testGiftSheet").classList.add("open");
}
function closeTestGiftSheet(){document.getElementById("testGiftSheet").classList.remove("open")}
function sendTestGift(id){
 closeTestGiftSheet();
 if(!send({type:"test_gift",giftId:id}))alert("サーバーに接続できません。もう一度試してください");
}
let testGiftAnimationTimer=null;
function displayTestGift(data){
 const g=testGifts.find(x=>x.id===data.giftId);if(!g)return;
 const layer=document.getElementById("testGiftAnimation");
 if(!document.getElementById("livePanel").classList.contains("show"))return;
 clearTimeout(testGiftAnimationTimer);layer.replaceChildren();
 const tier=g.coins>=5000?5:g.coins>=3000?4:g.coins>=800?3:g.coins>=200?2:1;
 const duration=[0,2100,2700,3500,4400,5500][tier];
 const glows={heart:"#ff659f",star:"#ffdc70",rose:"#ff5f91",bunny:"#ffaddf",toast:"#ffd77e",bouquet:"#ff8dc4",bear:"#f4ac6b",moon:"#ffeaa4",dream:"#c59aff",kingheart:"#ff8de9"};
 layer.className="active gift53-tier-"+tier;
 layer.style.setProperty("--gift-glow",glows[g.id]||"#f5a5ff");
 layer.style.setProperty("--gift-duration",duration+"ms");
 const halo=document.createElement("div");halo.className="gift53-halo";layer.appendChild(halo);
 const burst=document.createElement("div");burst.className="test-gift-burst";
 const icon=document.createElement("img");icon.className="gift-image";icon.src=g.fxImage||g.image;icon.alt=g.name;
 const title=document.createElement("strong");title.className="gift-display-name";title.textContent=g.name;
 burst.append(icon,title);layer.appendChild(burst);
 const particles=[0,9,17,30,48,70][tier];
 const symbols={heart:["❤️","💕","✨"],star:["⭐","🌟","✨"],rose:["🌹","🌸","✨"],bunny:["💕","🐰","✨"],toast:["🥂","✨","⭐"],bouquet:["🌸","🌺","✨"],bear:["💕","🌟","✨"],moon:["🌙","⭐","✨"],dream:["💜","⭐","✨","💎"],kingheart:["💖","👑","💎","✨","🌟"]}[g.id]||["✨"];
 for(let i=0;i<particles;i++){
  const spark=document.createElement("span");spark.className="gift53-spark";
  spark.textContent=symbols[i%symbols.length];
  spark.style.setProperty("--x",(5+Math.random()*90)+"%");
  spark.style.setProperty("--y",(12+Math.random()*76)+"%");
  spark.style.setProperty("--sz",(14+Math.random()*20+tier*2)+"px");
  spark.style.setProperty("--dx",((Math.random()-.5)*190)+"px");
  spark.style.setProperty("--dy",(-35-Math.random()*140)+"px");
  spark.style.setProperty("--dur",(1.2+Math.random()*1.8)+"s");
  spark.style.setProperty("--delay",(Math.random()*(duration/1000-1.3))+"s");
  layer.appendChild(spark);
 }
 testGiftAnimationTimer=setTimeout(()=>{layer.className="";layer.replaceChildren()},duration);
 addComment(data.name||"ゲスト","🎁 "+g.emoji+" "+g.name+"を贈りました（テスト）",data.clientId,data.avatar);
}

async function shareLive() {
  const shareData = { title: "voiceボタLive", text: "voiceボタLiveの配信を見てね！", url: location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(location.href);
      alert("配信ページのURLをコピーしました。");
    } else {
      prompt("このURLをコピーしてください", location.href);
    }
  } catch (e) { if (e && e.name !== "AbortError") console.error("Share failed", e); }
}

function updateAudioAction() {
  const button = document.getElementById("muteAction");
  if (!button) return;
  const icon = button.querySelector(".action-emoji");
  const label = button.querySelector("span:last-child");
  if (isBroadcaster) {
    const track = localStream && localStream.getAudioTracks()[0];
    const muted = !!track && !track.enabled;
    icon.textContent = muted ? "🔇" : "🎙️";
    label.textContent = muted ? "ミュート中" : "マイクON";
    button.setAttribute("aria-pressed", String(muted));
  } else {
    const audio = document.getElementById("remoteAudio");
    icon.textContent = audio.muted ? "🔇" : "🔊";
    label.textContent = audio.muted ? "ミュート中" : "音声";
    button.setAttribute("aria-pressed", String(audio.muted));
  }
}

function toggleRemoteAudio() {
  if (isBroadcaster) {
    const track = localStream && localStream.getAudioTracks()[0];
    if (!track || track.readyState !== "live") {
      alert("マイクが使用できません。配信を開始し直してください。");
      return;
    }
    track.enabled = !track.enabled;
    updateAudioAction();
    return;
  }
  const audio = document.getElementById("remoteAudio");
  audio.muted = !audio.muted;
  updateAudioAction();
}

/* =========================================================
   BACKGROUND CUSTOM
========================================================= */

function applyLiveBackground(background) {
  const panel = document.getElementById('livePanel');
  if (!panel || !background) return;
  panel.style.backgroundImage = background;
  panel.style.backgroundSize = 'cover';
  panel.style.backgroundPosition = 'center center';
  panel.style.backgroundRepeat = 'no-repeat';
}

function publishLiveBackground(background) {
  applyLiveBackground(background);
  try { localStorage.setItem('voiceBotaLiveBackground', background); } catch (e) {}
  // 配信者が背景を変えたら、配信中の視聴者にも反映する
  if (isBroadcaster && connected) {
    send({ type: 'background_update', background: background });
  }
}

function editLiveTitle() {
  if (!isBroadcaster || !connected) return;
  const input = document.getElementById("vbTitleInput");
  input.value = activeLiveTitle || "";
  document.getElementById("vbTitleDialog").classList.add("active");
  input.focus();
}
function closeLiveTitleDialog() {
  document.getElementById("vbTitleDialog").classList.remove("active");
}
function saveLiveTitleDialog() {
  if (!isBroadcaster || !connected) return;
  const title = emojiSafeLimit(document.getElementById("vbTitleInput").value.trim(),100);
  if (!title) {alert("配信タイトルを入力してください");return;}
  if (!send({type:"title_update",title:title})) {alert("サーバーに接続できません");return;}
  activeLiveTitle = title;
  renderLiveHeader();
  document.getElementById("panelTitle").textContent = title;
  closeLiveTitleDialog();
}

function setLiveBackground(kind) {
  const overlay = 'linear-gradient(rgba(4,5,17,.28), rgba(4,5,17,.58)), ';
  const backgrounds = {
    blue: overlay + 'linear-gradient(145deg, #244fc7, #111735)',
    purple: overlay + 'linear-gradient(145deg, #8d3ed1, #251044)',
    pink: overlay + 'linear-gradient(145deg, #f05caa, #6c205b)'
  };
  if (!backgrounds[kind]) return;
  publishLiveBackground(backgrounds[kind]);
}

function loadCustomBackground(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = '';
  if (!file.type.startsWith('image/')) { alert('画像を選択してください'); return; }
  const reader = new FileReader();
  reader.onload = function() {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1080 / img.width, 1920 / img.height);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
      publishLiveBackground('linear-gradient(rgba(4,5,17,.28), rgba(4,5,17,.58)), url("' + dataUrl + '")');
    };
    img.onerror = function(){alert('画像の読み込みに失敗しました');};
    img.src = String(reader.result || '');
  };
  reader.onerror = function(){alert('画像の読み込みに失敗しました');};
  reader.readAsDataURL(file);
}

function resetLiveBackground() {
  const panel = document.getElementById('livePanel');
  const value = 'linear-gradient(rgba(4,5,17,.58), rgba(4,5,17,.82))';
  if (panel) {
    panel.style.backgroundImage = value;
    panel.style.backgroundSize = 'cover';
    panel.style.backgroundPosition = 'center center';
  }
  try { localStorage.removeItem('voiceBotaLiveBackground'); } catch (e) {}
  if (isBroadcaster && connected) {
    send({ type: 'background_update', background: value });
  }
}

function restoreLiveBackground() {
  try {
    const saved = localStorage.getItem('voiceBotaLiveBackground');
    if (saved) applyLiveBackground(saved);
  } catch (e) {}
}

/* =========================================================
   COMMENT
========================================================= */

/* During Simeji IME composition, Enter must not prematurely send a comment. */
let simejiComposing = false;
function setupSimejiInput() {
  const input = document.getElementById("commentInput");
  if (!input || input.dataset.simejiReady) return;
  input.dataset.simejiReady = "1";
  input.addEventListener("compositionstart", () => { simejiComposing = true; });
  input.addEventListener("compositionend", () => { simejiComposing = false; });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing && !simejiComposing) {
      event.preventDefault();
      sendComment();
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupSimejiInput);
} else {
  setupSimejiInput();
}

function sendComment() {
  if (simejiComposing) return;

  const input =
    document.getElementById(
      "commentInput"
    );


  const rawText = input.value.trim();
  const text = (typeof Intl !== "undefined" && Intl.Segmenter)
    ? Array.from(new Intl.Segmenter("ja", {granularity:"grapheme"}).segment(rawText), x => x.segment).slice(0,200).join("")
    : Array.from(rawText).slice(0,200).join("");


  if (!text) {

    return;

  }


  send({

    type:
      "comment",

    name:
      currentUserName,

    text:
      text

  });


  input.value =
    "";

}


function addComment(name, text, clientId, avatar) {
  const list = document.getElementById("commentList");
  if (!list) return;
  const wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 30;
  const item = document.createElement("div");
  item.className = "comment-item";
  if (clientId && typeof clientId === "string") {
    const profile = presenceMembers.find(m => m.id === clientId) ||
      (broadcasterProfile && broadcasterProfile.id === clientId ? broadcasterProfile : null) ||
      socialProfiles[clientId] || {};
    const photo = (typeof avatar === "string" && avatar.startsWith("data:image/") ? avatar : "") || profile.avatar || "";
    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "comment-user-avatar";
    icon.textContent = photo ? "" : emojiSafeLimit(name || "？",1);
    if (photo.startsWith("data:image/")) icon.style.backgroundImage = 'url("' + photo + '")';
    icon.onclick = function(){openPresenceProfile(clientId);};
    const content = document.createElement("div");
    content.className = "comment-content";
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "comment-user-link";
    nameButton.textContent = name || "ゲスト";
    nameButton.onclick = function(){openPresenceProfile(clientId);};
    // Use a native text field for sent comments, matching Simeji's input rendering.
    // Keep the original Unicode string untouched (no HTML conversion).
    const body = document.createElement("textarea");
    body.className = "comment-simeji-text";
    body.readOnly = true;
    body.tabIndex = -1;
    body.rows = 1;
    body.value = String(text == null ? "" : text);
    content.append(nameButton, body);
    requestAnimationFrame(function(){
      body.style.height = "auto";
      body.style.height = Math.max(22, body.scrollHeight) + "px";
    });
    item.append(icon, content);
  } else {
    item.textContent = (name ? name + ": " : "") + (text || "");
  }
  list.appendChild(item);
  if (wasNearBottom) list.scrollTop = list.scrollHeight;
}


/* =========================================================
   CLOSE PEERS
========================================================= */

function closePeers() {

  Object.keys(
    peerConnections
  ).forEach(
    function(key) {

      try {

        peerConnections[key].close();

      } catch(error) {}

    }
  );


  peerConnections = {};
  Object.keys(pendingIce).forEach(function(id){delete pendingIce[id];});

}


/* =========================================================
   PANEL
========================================================= */

function openPanel() {
  updateAudioAction();

  document.getElementById(
    "livePanel"
  ).classList.add(
    "show"
  );

}


function closePanel() {
  stopLikeHold();
  liveStartedAt=0;
  renderLiveElapsedTime();
  activeLiveTitle="";
  closePresence();
  if (!isBroadcaster) {
    send({type:"leave_live"});
    presenceMembers = [];
    renderPresence();
  }

  if (isBroadcaster) {
    stopLive();
    return;
  }

  if (!isBroadcaster) {

    closePeers();

  }


  document.getElementById(
    "livePanel"
  ).classList.remove(
    "show"
  );

}


function setPanelStatus(
  text
) {

  document.getElementById(
    "panelStatus"
  ).textContent =
    text;

}


/* =========================================================
   NAV
========================================================= */

function goHome() {

  const myPage = document.getElementById("myPageScreen");
  if (myPage) myPage.classList.remove("active");
  const editDialog = document.getElementById("mpEditDialog");
  if (editDialog) editDialog.classList.remove("active");

  window.scrollTo({

    top: 0,

    behavior:
      "smooth"

  });

}



let searchUsers=[];
let searchResultsReceived=false;
let searchDebounce=null;
function scheduleSearchUpdate(){
 clearTimeout(searchDebounce);
 renderSearchResults();
 searchDebounce=setTimeout(()=>send({type:'search_request'}),220);
}
function submitSearch(){
 clearTimeout(searchDebounce);
 const input=document.getElementById('searchKeyword');
 if(input){input.blur();}
 send({type:'search_request'});
 renderSearchResults();
}
function handleSearchKeydown(event){
 if(event.key==='Enter' && !event.isComposing && event.keyCode!==229){
  event.preventDefault();
  submitSearch();
 }
}

function openSearchPage(){
 const page=document.getElementById('searchPage');page.classList.add('active');
 document.getElementById('searchKeyword').value='';
 searchResultsReceived=false;
 renderSearchResults();
 send({type:'search_request'});
 document.getElementById('searchKeyword').focus();
}
function closeSearchPage(){document.getElementById('searchPage').classList.remove('active')}
function renderSearchResults(){
 const root=document.getElementById('searchResults');if(!root)return;
 root.replaceChildren();
 const keyword=document.getElementById('searchKeyword').value.trim().toLocaleLowerCase('ja');
 if(!keyword){const p=document.createElement('div');p.className='search-empty';p.textContent='ライバー名・キーワードを入力して検索してください';root.appendChild(p);return;}
 // 1文字から部分一致。全角/半角、ひらがな/カタカナの違いも吸収する。
 const normalizeSearchText=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('ja')
  .replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-96))
  .replace(/[\s\u3000]+/g,'');
 const query=normalizeSearchText(keyword);
 const found=searchUsers.filter(u=>query&&[u.name,u.bio,u.title].some(v=>normalizeSearchText(v).includes(query)))
  .sort((a,b)=>{
   const rank=u=>{const n=normalizeSearchText(u.name);return n===query?0:n.startsWith(query)?1:n.includes(query)?2:3;};
   return rank(a)-rank(b)||Number(b.live)-Number(a.live)||String(a.name).localeCompare(String(b.name),'ja');
  });
 if(!found.length){const p=document.createElement('div');p.className='search-empty';p.textContent=!searchResultsReceived?'ライバー情報を読み込み中…':searchUsers.length===0?'検索対象のユーザーが見つかりません。もう1台でページを開き直してみてください':'該当するライバーはいません';root.appendChild(p);return;}
 found.forEach(u=>{
  const btn=document.createElement('button');btn.type='button';btn.className='search-person';
  const left=document.createElement('div');left.className='search-avatar-group';
  const avatar=document.createElement('div');avatar.className='search-avatar';
  if(u.avatar&&/^data:image\/(jpeg|png|webp);base64,/.test(u.avatar))avatar.style.backgroundImage='url("'+u.avatar+'")';else avatar.textContent='👤';
  left.appendChild(avatar);
  if(u.live){const live=document.createElement('span');live.className='search-live-label';live.textContent='LIVE中';left.appendChild(live);}
  const info=document.createElement('div');info.className='search-person-info';
  const name=document.createElement('div');name.className='search-person-name';name.textContent=u.name||'ユーザー';
  const bio=document.createElement('div');bio.className='search-person-bio';bio.textContent=u.bio||u.title||'';
  info.append(name,bio);btn.append(left,info);
  btn.onclick=()=>{
   socialProfiles[u.id]={name:u.name,avatar:u.avatar||'',bio:u.bio||''};
   openPresenceProfile(u.id);
  };
  root.appendChild(btn);
 });
}

function scrollLive() {

  document.getElementById(
    "liveSection"
  ).scrollIntoView({

    behavior:
      "smooth"

  });

}


function showNotice() {

  alert(
    "お知らせ機能はこれから追加できます。"
  );

}


function saveMyPageBackground(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("画像ファイルを選んでください"); return; }
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = function () {
    const canvas = document.createElement("canvas");
    const maxWidth = 1100;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
    try {
      localStorage.setItem("voiceBotaMyPageBackground", canvas.toDataURL("image/jpeg",.86));
      applyMyPageBackground();
    } catch(error) { alert("画像が大きすぎて保存できませんでした。小さめの画像を選んでください"); }
    URL.revokeObjectURL(objectUrl);
    input.value = "";
  };
  image.onerror = function() { URL.revokeObjectURL(objectUrl); alert("画像を読み込めませんでした"); };
  image.src = objectUrl;
}
function applyMyPageBackground() {
  const url = localStorage.getItem("voiceBotaMyPageBackground");
  if (url) {
    const screen = document.getElementById("myPageScreen");
    screen.style.backgroundImage = "url(" + JSON.stringify(url) + ")";
    screen.style.backgroundSize = "cover";
    screen.style.backgroundPosition = "center top";
    screen.style.backgroundAttachment = "scroll";
  }
}
// フォロー一覧：サーバー連携ができるまでは架空のユーザーを表示しない
function openFollowList(kind) {
  const followers = kind === "followers";
  const ids = followers ? presenceFollowers : presenceFollowing;
  const title = document.getElementById("mpFollowTitle");
  title.textContent = (followers ? "フォロワー" : "フォロー中") + "（" + ids.length + "人）";
  const container = document.getElementById("mpFollowContents");
  container.replaceChildren();
  if (!ids.length) {
    const message = document.createElement("p");
    message.textContent = "まだユーザーはいません。";
    container.appendChild(message);
  } else {
    ids.forEach(function(id) {
      const member = socialProfiles[id] || {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mp-follow-user";
      const avatar = document.createElement("span");
      avatar.className = "mp-follow-user-avatar";
      if (member.avatar) {
        const img = document.createElement("img");
        img.src = member.avatar;
        img.alt = "";
        img.loading = "lazy";
        img.onerror = function(){img.remove();avatar.textContent="👤";};
        avatar.appendChild(img);
      } else {
        avatar.textContent = "👤";
      }
      const name = document.createElement("span");
      name.className = "mp-follow-user-name";
      name.textContent = member.name || "ユーザー";
      const arrow = document.createElement("span");
      arrow.textContent = "›";
      arrow.setAttribute("aria-hidden", "true");
      button.append(avatar, name, arrow);
      button.onclick = function() {
        closeFollowList();
        const existing = presenceMembers.find(m => m.id === id) ||
          (broadcasterProfile && broadcasterProfile.id === id ? broadcasterProfile : null);
        if (!existing) {
          presenceMembers.push({id:id,name:member.name||"ユーザー",avatar:member.avatar||"",gender:"未設定",bio:""});
        }
        openPresenceProfile(id);
      };
      container.appendChild(button);
    });
  }
  const followDialog = document.getElementById("mpFollowDialog");
  // 視聴者のマイページからも一覧が前面に開くようにする
  if (followDialog.parentElement !== document.body) document.body.appendChild(followDialog);
  followDialog.classList.add("active");
}
function closeFollowList() {
  const dialog = document.getElementById("mpFollowDialog");
  if (dialog) dialog.classList.remove("active");
}

function closeBlockManager(){
 const overlay=document.getElementById("vbBlockManagerOverlay");if(overlay)overlay.remove();
}
function openBlockManager(){
 closeBlockManager();
 const overlay=document.createElement("div");overlay.id="vbBlockManagerOverlay";
 overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:#080d23;color:#fff;overflow-y:auto;padding:20px 16px;box-sizing:border-box";
 const header=document.createElement("div");header.style.cssText="display:flex;align-items:center;gap:16px;margin-bottom:24px";
 const back=document.createElement("button");back.type="button";back.textContent="← 戻る";back.style.cssText="border:0;border-radius:18px;background:#303a64;color:white;padding:10px 15px";back.onclick=closeBlockManager;
 const title=document.createElement("h2");title.textContent="ブロック管理";title.style.cssText="margin:0;font-size:21px";header.append(back,title);overlay.appendChild(header);
 const info=document.createElement("p");info.textContent="ブロックしているユーザー";info.style.color="#b6bde3";overlay.appendChild(info);
 if(!presenceBlocked.length){const empty=document.createElement("p");empty.textContent="ブロック中のユーザーはいません";overlay.appendChild(empty);}
 presenceBlocked.forEach(id=>{
  const profile=socialProfiles[id]||{};
  const item=document.createElement("button");item.type="button";item.style.cssText="display:flex;align-items:center;gap:14px;width:100%;border:1px solid #4c527d;border-radius:18px;padding:12px;background:#1b2545;color:white;text-align:left;margin-bottom:10px";
  const avatar=document.createElement("span");avatar.style.cssText="display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;background:#39476e;background-size:cover;background-position:center;overflow:hidden";
  paintPresenceAvatar(avatar,{name:profile.name||"ユーザー",avatar:profile.avatar||""});
  const label=document.createElement("span");label.style.cssText="display:flex;flex-direction:column;gap:5px;flex:1;min-width:0";
  const name=document.createElement("strong");name.textContent=profile.name||"ユーザー";name.style.cssText="overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  const status=document.createElement("small");status.textContent="ブロック中・タップで解除確認";status.style.color="#aeb6d5";label.append(name,status);
  item.append(avatar,label);item.onclick=()=>{
   const shade=document.createElement("div");shade.style.cssText="position:fixed;inset:0;z-index:1000000;background:#000a;display:flex;align-items:center;justify-content:center;padding:18px";
   const dialog=document.createElement("div");dialog.style.cssText="background:#202a4a;border:1px solid #6b699d;border-radius:20px;padding:22px;width:100%;max-width:340px;box-sizing:border-box;color:white";
   const question=document.createElement("h3");question.textContent="ブロックを解除しますか？";
   const desc=document.createElement("p");desc.textContent=(profile.name||"このユーザー")+"のブロックを解除すると、お互いのプロフィールや配信が再び表示されるようになります。";
   const actions=document.createElement("div");actions.style.cssText="display:flex;gap:10px;margin-top:20px";
   const no=document.createElement("button");no.type="button";no.textContent="解除しない";
   const yes=document.createElement("button");yes.type="button";yes.textContent="解除する";
   for(const b of [no,yes])b.style.cssText="flex:1;padding:12px 4px;border:0;border-radius:12px;background:#465275;color:white;font-size:15px";
   yes.style.background="#7756b6";
   no.onclick=()=>shade.remove();yes.onclick=()=>{send({type:"social_action",action:"block",targetId:id});shade.remove();closeBlockManager();};
   actions.append(no,yes);dialog.append(question,desc,actions);shade.appendChild(dialog);overlay.appendChild(shade);
  };overlay.appendChild(item);
 });
 document.body.appendChild(overlay);
}
function showProfile() {
  const page=document.getElementById("myPageScreen");
  if(page&&!document.getElementById("vbBlockManagerButton")){
    const b=document.createElement("button");b.id="vbBlockManagerButton";b.type="button";
    b.className="mp-item";b.textContent="ブロック管理";b.onclick=openBlockManager;
    const help=page.querySelector(".mp-help");
    if(help)page.insertBefore(b,help);else page.appendChild(b);
  }
  // 配信視聴中でもマイページのフォロー人数を最新の受信状態で表示
  document.getElementById("mpFollowing").textContent = String(presenceFollowing.length);
  document.getElementById("mpFollowers").textContent = String(presenceFollowers.length);
  applyMyPageBackground();
  const name = localStorage.getItem("voiceBotaProfileName") ||
    (typeof getMyName === "function" ? getMyName() : "月光花");
  document.getElementById("mpMoonName").textContent = (name || "月光花");
  const gender = localStorage.getItem("voiceBotaProfileGender") || "未設定";
  document.getElementById("mpGenderLabel").textContent = "性別：" + gender;
  document.getElementById("mpBioText").textContent = localStorage.getItem("voiceBotaProfileBio") || "自己紹介はまだありません。";
  const avatar = localStorage.getItem("voiceBotaProfileAvatar");
  const el = document.getElementById("mpAvatar");
  if (avatar) { el.style.backgroundImage = "url(" + JSON.stringify(avatar) + ")"; el.textContent = ""; }
  else { el.style.backgroundImage = ""; el.textContent = "🌙"; }
  document.getElementById("myPageScreen").classList.add("active");
}
function closeMyPage() {
  document.getElementById("myPageScreen").classList.remove("active");
  closeMyPageEdit();
}
function editMyPage() {
  document.getElementById("mpNameInput").value =
    localStorage.getItem("voiceBotaProfileName") || document.getElementById("mpMoonName").textContent.replace(/ 🌙$/, "");
  document.getElementById("mpGenderInput").value = localStorage.getItem("voiceBotaProfileGender") || "未設定";
  document.getElementById("mpBioInput").value = localStorage.getItem("voiceBotaProfileBio") || "";
  document.getElementById("mpEditDialog").classList.add("active");
}
function closeMyPageEdit() {
  document.getElementById("mpEditDialog").classList.remove("active");
}
// Optional browser console check: voiceBotaUnicodeCheck("Simeji文字")
// Reports exact Unicode code points; never modifies the original input.
window.voiceBotaUnicodeCheck = function(value) {
  const text = String(value == null ? "" : value);
  const points = Array.from(text, c => "U+" + c.codePointAt(0).toString(16).toUpperCase());
  console.info("Simeji Unicode", {text, points});
  return {text, points};
};
function emojiSafeLimit(value, max) {
  const str = String(value == null ? "" : value);
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter("ja",{granularity:"grapheme"}).segment(str), item=>item.segment).slice(0,max).join("");
  }
  return Array.from(str).slice(0,max).join("");
}
function saveMyPageEdit() {
  const name = emojiSafeLimit(document.getElementById("mpNameInput").value.trim(), 30);
  if (!name) { alert("表示名を入力してください"); return; }
  localStorage.setItem("voiceBotaProfileName", name);
  localStorage.setItem("voiceBotaProfileGender", document.getElementById("mpGenderInput").value);
  localStorage.setItem("voiceBotaProfileBio", emojiSafeLimit(document.getElementById("mpBioInput").value.trim(),300));
  closeMyPageEdit();
  showProfile();
  sendMyProfile();
}
function changeMyPageAvatar() { document.getElementById("mpAvatarFile").click(); }
function saveMyPageAvatar(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("画像を選択してください"); return; }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = function() {
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext("2d");
    const side = Math.min(img.width, img.height);
    ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,300,300);
    try {
      localStorage.setItem("voiceBotaProfileAvatar",canvas.toDataURL("image/jpeg",0.65));
      showProfile();
      sendMyProfile();
    } catch(e) { alert("画像を保存できませんでした。別の画像をお試しください。"); }
    URL.revokeObjectURL(url);
    input.value = "";
  };
  img.onerror = function() { URL.revokeObjectURL(url); alert("画像を読み込めませんでした"); };
  img.src = url;
}
function myPageInfo(message) { alert(message); }

window.addEventListener(
  "load",
  function() {

    console.log(
      "voiceボタLive loaded"
    );

    restoreLiveBackground();
    connectSocket();

  }
);

</script>


<div id="testGiftSheet" onclick="if(event.target===this)closeTestGiftSheet()" role="dialog" aria-label="テスト用ギフト">
 <div class="test-gift-card">
  <div style="display:flex;justify-content:space-between;align-items:center"><strong class="test-gift-heading">🎁 ギフト一覧</strong><button type="button" onclick="closeTestGiftSheet()" style="background:none;border:0;color:white;font-size:26px">×</button></div>
  <p style="font-size:12px;color:#b9c5e8">応援の気持ちをギフトで届けよう ♡<br>テスト用：表示コインは消費されません。</p>
  <div class="test-gift-grid" id="testGiftChoices"></div>
 </div>
</div>
<div id="testGiftAnimation" aria-live="polite"></div>

</body>
</html>
`;


/* =========================================================
   HTTP SERVER
========================================================= */

const server =
  http.createServer(
    function(req, res) {

      const url =
        req.url.split("?")[0];


      if (
        url === "/" ||
        url === "/index.html"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8",

            "Cache-Control":
              "no-cache"
          }
        );

        res.end(
          HTML
        );

        return;

      }


      if (
        url === "/home.png"
      ) {

        const fs =
          require("fs");

        const path =
          require("path");

        const file =
          path.join(
            __dirname,
            "public",
            "home.png"
          );


        if (
          fs.existsSync(file)
        ) {

          res.writeHead(
            200,
            {
              "Content-Type":
                "image/png"
            }
          );

          fs.createReadStream(
            file
          ).pipe(res);

          return;

        }


        res.writeHead(
          404
        );

        res.end(
          "home.png not found"
        );

        return;

      }


      if (
        url === "/health"
      ) {

        res.writeHead(
          200,
          {
            "Content-Type":
              "application/json"
          }
        );

        res.end(
          JSON.stringify({

            status:
              "ok",

            live:
              liveInfo.active

          })
        );

        return;

      }


      res.writeHead(
        404
      );

      res.end(
        "Not Found"
      );

    }
  );


/* =========================================================
   WEBSOCKET SERVER
========================================================= */

const wss =
  new WebSocket.Server({
    server: server
  });


function sendTo(
  ws,
  data
) {

  if (
    ws &&
    ws.readyState ===
      WebSocket.OPEN
  ) {

    ws.send(
      JSON.stringify(data)
    );

  }

}


function broadcast(
  data
) {

  const message =
    JSON.stringify(data);


  clients.forEach(
    function(client) {

      if (
        client.readyState === WebSocket.OPEN &&
        !(data.clientId && blockedEither(client.clientId,data.clientId)) &&
        !(liveInfo.active && broadcaster && ["comment","like","background_update","title_update"].includes(data.type) && blockedEither(client.clientId,broadcaster.clientId))
      ) {

        client.send(
          message
        );

      }

    }
  );

}


function getLiveList(viewerId) {

  if (
    !liveInfo.active ||
    !viewerId ||
    blockedEither(viewerId,liveInfo.id) ||
    !socialIds("following",viewerId).includes(liveInfo.id)
  ) {

    return [];

  }


  return [

    {

      id:
        liveInfo.id,

      name:
        liveInfo.name,

      title:
        liveInfo.title,

      background:
        liveInfo.background || ""

    }

  ];

}


function cleanProfile(p){
  if(!p || typeof p !== "object")return {};
  const avatar=typeof p.avatar === "string" && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(p.avatar) && p.avatar.length < 190000 ? p.avatar : "";
  return {name:limitEmojiText(p.name||"ゲスト",30),avatar:avatar,gender:String(p.gender||"未設定").slice(0,20),bio:String(p.bio||"").slice(0,500)};
}

function sendPresence() {
  if (!liveInfo.active || !broadcaster) return;
  const members = [];
  // 参加者アイコンは視聴者だけ表示する（配信者は除外）
  clients.forEach(function(client) {
    if (client !== broadcaster && client.liveJoined && client.readyState === WebSocket.OPEN) {
      const profile=client.profile || {};
      members.push({id:client.clientId,name:profile.name || client.liveName || "ゲスト",avatar:profile.avatar || "",gender:profile.gender || "未設定",bio:profile.bio || "",broadcaster:false});
    }
  });
  const hostProfile = broadcaster.profile || {};
  const host = {id:broadcaster.clientId,name:liveInfo.name || hostProfile.name || "配信者",avatar:hostProfile.avatar || "",gender:hostProfile.gender || "未設定",bio:hostProfile.bio || "",broadcaster:true};
  clients.forEach(function(recipient){
    if(recipient.readyState!==WebSocket.OPEN)return;
    const visibleMembers=members.filter(m=>!blockedEither(recipient.clientId,m.id));
    const visibleHost=blockedEither(recipient.clientId,host.id)?null:host;
    sendTo(recipient,{type:"presence_update",members:visibleMembers,broadcasterProfile:visibleHost,title:visibleHost?liveInfo.title:"",startedAt:visibleHost?liveInfo.startedAt:null});
  });
}

function getSearchUsers(viewerId){
 const availableProfiles={...socialData.profiles};
 clients.forEach(c=>{if(c.clientId&&c.profile&&c.profile.name){
  availableProfiles[c.clientId]={...(availableProfiles[c.clientId]||{}),...c.profile};
 }});
 return Object.entries(availableProfiles).filter(([id,p])=>id!==viewerId&&!blockedEither(viewerId,id)&&p&&p.name).map(([id,p])=>({
  id,name:p.name||'ユーザー',avatar:p.avatar||'',bio:p.bio||'',
  live:!!(liveInfo.active&&liveInfo.id===id),
  title:liveInfo.active&&liveInfo.id===id?liveInfo.title||'':''
 })).sort((a,b)=>Number(b.live)-Number(a.live)||a.name.localeCompare(b.name,'ja'));
}
function sendSearchUsers(ws){sendTo(ws,{type:'search_results',users:getSearchUsers(ws.clientId)});}
function getDiscoveryList(viewerId){
 const now=Date.now(),week=7*86400000,month=30*86400000;
 const users=Object.entries(socialData.profiles).filter(([id,p])=>liveInfo.active&&liveInfo.id===id&&id!==viewerId&&!blockedEither(viewerId,id)&&p&&p.name)
 .map(([id,p])=>({id,name:p.name||"ユーザー",avatar:p.avatar||"",live:!!(liveInfo.active&&liveInfo.id===id),
 createdAt:Number(p.createdAt)||0,firstLiveAt:Number(p.firstLiveAt)||0,
 followers:Object.keys(socialData.following).filter(other=>socialIds("following",other).includes(id)&&!blockedEither(id,other)).length}));
 const strip=arr=>arr.map(({id,name,avatar,live})=>({id,name,avatar,live}));
 return {featured:strip(users.slice().sort((a,b)=>Number(b.live)-Number(a.live)||b.followers-a.followers)),
 new:strip(users.filter(u=>u.createdAt&&now-u.createdAt<=month).sort((a,b)=>b.createdAt-a.createdAt)),
 debut:strip(users.filter(u=>u.firstLiveAt&&now-u.firstLiveAt<=week).sort((a,b)=>b.firstLiveAt-a.firstLiveAt))};
}
function sendDiscoveryLists(){
 clients.forEach(ws=>{if(ws.readyState===WebSocket.OPEN)sendTo(ws,{type:"discovery_list",...getDiscoveryList(ws.clientId)})});
}
function sendLiveList() {

  clients.forEach(function(recipient){
    sendTo(recipient,{type:"live_list",lives:getLiveList(recipient.clientId)});
  });
  sendDiscoveryLists();
  clients.forEach(ws=>{if(ws.readyState===WebSocket.OPEN)sendSearchUsers(ws);});

}


/* =========================================================
   WEBSOCKET CONNECTION
========================================================= */

wss.on(
  "connection",
  function(ws) {

    clients.add(
      ws
    );


    ws.clientId =
      "server_" +
      Math.random()
        .toString(36)
        .substring(2,12);


    ws.isBroadcaster =
      false;
    ws.liveJoined = false;
    ws.liveName = "ゲスト";
    ws.profile = {};


    console.log(
      "CLIENT CONNECT:",
      ws.clientId
    );


    sendTo(
      ws,
      {

        type:
          "live_list",

        lives:
          getLiveList(ws.clientId)

      }
    );


    ws.on(
      "message",
      function(raw) {

        let data;


        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch(error) {

          return;

        }


        /* =====================
           HELLO
        ===================== */

        if (
          data.type ===
          "hello"
        ) {

          if (
            data.clientId
          ) {

            ws.clientId =
              data.clientId;

          }

          if(data.profile && typeof data.profile === "object") {
            ws.profile=cleanProfile(data.profile);
            if(ws.clientId){socialData.profiles[ws.clientId]={...socialData.profiles[ws.clientId],name:ws.profile.name||"ユーザー",avatar:ws.profile.avatar||"",bio:ws.profile.bio||"",createdAt:socialData.profiles[ws.clientId]?.createdAt||Date.now()};saveSocialData();}
          }
          socialState(ws);
          sendTo(ws,{type:"live_list",lives:getLiveList(ws.clientId)});
          sendDiscoveryLists();
          // v48: refresh everyone when a second device connects/updates its profile.
          clients.forEach(other=>{if(other.readyState===WebSocket.OPEN && other.clientId && !other.clientId.startsWith("server_"))sendSearchUsers(other);});
          return;

        }

        if(data.type==='search_request'){
          sendSearchUsers(ws);
          return;
        }
        if(data.type === "social_profile_request"){
          const viewer=ws.clientId,target=String(data.targetId||"");
          if(!viewer||!target||target.length>120||blockedEither(viewer,target))return;
          const following=socialIds("following",target).filter(id=>!blockedEither(viewer,id)&&!blockedEither(target,id));
          const followers=Object.keys(socialData.following).filter(id=>socialIds("following",id).includes(target)&&!blockedEither(viewer,id)&&!blockedEither(target,id));
          const profiles={};
          for(const id of [...new Set([...following,...followers])]){
            const online=[...clients].find(c=>c.clientId===id);
            const p=(online&&online.profile)||socialData.profiles[id]||{};
            profiles[id]={name:p.name||"ユーザー",avatar:p.avatar||""};
          }
          sendTo(ws,{type:"social_profile_response",targetId:target,following,followers,profiles});
          return;
        }
        if(data.type === "social_action"){
          const id=ws.clientId,target=String(data.targetId||"");
          if(!id||!target||id===target||target.length>120)return;
          const action=data.action;
          if(action!=="follow"&&action!=="block")return;
          if(action==="follow"&&blockedEither(id,target)){
            sendTo(ws,{type:"social_notice",message:"フォローできませんでした"});return;
          }
          const key=action==="follow"?"following":"blocked";
          const values=socialIds(key,id);
          const isNewFollow=action==="follow" && !values.includes(target);
          socialData[key][id]=values.includes(target)?values.filter(x=>x!==target):[...values,target];
          if(action==="block"&&socialIds("blocked",id).includes(target)){
            socialData.following[id]=socialIds("following",id).filter(x=>x!==target);
            socialData.following[target]=socialIds("following",target).filter(x=>x!==id);
          }
          saveSocialData();
          sendDiscoveryLists();
          // フォロー・解除・ブロック直後にホームのライブ一覧も更新する
          sendLiveList();
          // ライブ参加者が新しくフォローされたら、配信中のコメント欄に通知する。
          // フォロー解除やブロック関係の通知は送らない。
          if(isNewFollow && liveInfo.active && broadcaster){
            // 視聴者が現在のライバーをフォローした場合のみ通知する。
            // ライバー自身のフォロー、視聴者同士のフォローは通知しない。
            const viewerFollowedHost = target===broadcaster.clientId &&
              id!==broadcaster.clientId && ws.liveJoined;
            if(viewerFollowedHost && !blockedEither(id,target)){
              const p=ws.profile || socialData.profiles[id] || {};
              const notice={type:"live_follow_notice",followerId:id,
                followerName:limitEmojiText(p.name || "ユーザー",40),
                followerAvatar:typeof p.avatar==="string" ? p.avatar : ""};
              clients.forEach(other=>{
                if(other.readyState===WebSocket.OPEN &&
                  (other===broadcaster || other.liveJoined) &&
                  !blockedEither(other.clientId,id) &&
                  !blockedEither(other.clientId,target) &&
                  !blockedEither(other.clientId,broadcaster.clientId))sendTo(other,notice);
              });
            }
          }
          if(action==="block"){
            clients.forEach(other=>{
              if(other.clientId===target && other.liveJoined && broadcaster && (broadcaster.clientId===id || broadcaster.clientId===target)){
                other.liveJoined=false;
                sendTo(other,{type:"block_live_exit"});
                if(broadcaster)sendTo(broadcaster,{type:"viewer_removed",viewerId:other.clientId});
              }
            });
            refreshBlockVisibility();
          }
          else {socialState(ws);clients.forEach(other=>{if(other.clientId===target)socialState(other);});}
          sendTo(ws,{type:"social_notice",message:action==="follow"?"フォロー設定を更新しました":"設定を更新しました"});
          return;
        }
        if(data.type === "profile_update"){
          ws.profile=cleanProfile(data.profile);
          if(ws.clientId){
            socialData.profiles[ws.clientId]={...socialData.profiles[ws.clientId],name:ws.profile.name||"ユーザー",avatar:ws.profile.avatar||"",bio:ws.profile.bio||"",createdAt:socialData.profiles[ws.clientId]?.createdAt||Date.now()};
            saveSocialData();
            sendDiscoveryLists();
            clients.forEach(other=>{if(other.readyState===WebSocket.OPEN)sendSearchUsers(other);});
            clients.forEach(other=>{if(other.clientId!==ws.clientId && (socialIds("following",other.clientId).includes(ws.clientId)||socialIds("following",ws.clientId).includes(other.clientId)))socialState(other);});
          }
          if(ws.liveJoined)sendPresence();
          return;
        }


        /* =====================
           START LIVE
        ===================== */

        if (
          data.type ===
          "start_live"
        ) {

          if (
            broadcaster &&
            broadcaster !== ws &&
            broadcaster.readyState ===
              WebSocket.OPEN
          ) {

            sendTo(
              ws,
              {

                type:
                  "live_start_failed",

                reason:
                  "現在ほかの配信者が配信中です"

              }
            );

            return;

          }


          // 新しい配信では全員が再び1回目のいいね通知を出せる
          liveLikeNotifiedUsers.clear();

          broadcaster =
            ws;


          ws.isBroadcaster =
            true;


          liveInfo = {

            active:
              true,

            startedAt: Date.now(),

            id:
              ws.clientId,

            name:
              data.name ||
              "Voice配信者",

            title:
              data.title ||
              "音声ライブ配信中",

            background:
              data.background ||
              'linear-gradient(rgba(4,5,17,.58), rgba(4,5,17,.82))'

          };
          if(ws.clientId){
            const p=socialData.profiles[ws.clientId]||{};
            socialData.profiles[ws.clientId]={...p,name:ws.profile?.name||liveInfo.name,avatar:ws.profile?.avatar||p.avatar||"",createdAt:p.createdAt||Date.now(),firstLiveAt:p.firstLiveAt||Date.now()};
            saveSocialData();
          }

          console.log(
            "LIVE START:",
            liveInfo.name,
            liveInfo.title
          );


          sendTo(
            ws,
            {

              type:
                "live_started"

            }
          );


          sendLiveList();
          sendPresence();


          return;

        }


        /* =====================
           STOP LIVE
        ===================== */

        if (
          data.type ===
          "stop_live"
        ) {

          if (
            broadcaster ===
            ws
          ) {

            broadcaster =
              null;


            ws.isBroadcaster =
              false;


            liveInfo = {

              active:
                false,

              id:
                null,

              name:
                "",

              title:
                ""

            };


            broadcast({

              type:
                "live_stopped"

            });


            sendLiveList();


            console.log(
              "LIVE STOP"
            );

          }


          return;

        }


        /* =====================
           JOIN LIVE
        ===================== */

        if (
          data.type ===
          "join_live"
        ) {

          if (
            !liveInfo.active ||
            !broadcaster ||
            broadcaster.readyState !==
              WebSocket.OPEN
          ) {

            sendTo(
              ws,
              {

                type:
                  "live_unavailable"

              }
            );

            return;

          }


          if(blockedEither(ws.clientId,broadcaster.clientId)){
            sendTo(ws,{type:"access_denied",reason:"この配信は視聴できません"});return;
          }
          ws.liveJoined = true;
          ws.profile = cleanProfile(data.profile || ws.profile);
          ws.liveName = limitEmojiText(String(data.name || "ゲスト").trim(),30) || "ゲスト";
          sendPresence();
          sendTo(
            ws,
            {
              type: "background_update",
              background: liveInfo.background || 'linear-gradient(rgba(4,5,17,.58), rgba(4,5,17,.82))'
            }
          );

          sendTo(
            broadcaster,
            {

              type:
                "viewer_joined",

              viewerId:
                ws.clientId

            }
          );


          console.log(
            "VIEWER JOIN:",
            ws.clientId
          );


          return;

        }


        if (data.type === "leave_live") {
          ws.liveJoined = false;
          sendPresence();
          return;
        }

        /* =====================
           WEBRTC SIGNALING
        ===================== */

        if (
          data.type ===
            "offer" ||
          data.type ===
            "answer" ||
          data.type ===
            "ice"
        ) {

          let target =
            null;


          clients.forEach(
            function(client) {

              if (
                client.clientId ===
                data.to
              ) {

                target =
                  client;

              }

            }
          );


          if (target && !blockedEither(ws.clientId,target.clientId) && (ws===broadcaster || target===broadcaster)) {

            sendTo(
              target,
              data
            );

          }


          return;

        }


        /* =====================
           BACKGROUND UPDATE
        ===================== */

        if (data.type === "title_update") {
          if (ws === broadcaster && liveInfo.active && typeof data.title === "string") {
            const title = limitEmojiText(data.title.trim(),100);
            if (title) {
              liveInfo.title = title;
              broadcast({type:"title_update",title:title});
              sendLiveList();
              sendPresence();
            }
          }
          return;
        }

        if (data.type === "background_update") {
          if (ws === broadcaster && typeof data.background === "string") {
            // 背景設定は長さを制限して保存・配信
            const background = data.background.substring(0, 7500000);
            liveInfo.background = background;
            broadcast({ type: "background_update", background: background });
          }
          return;
        }


        /* =====================
           COMMENT
        ===================== */

        if (
          data.type ===
          "comment"
        ) {
          if(!liveInfo.active || (ws!==broadcaster && (!ws.liveJoined || blockedEither(ws.clientId,broadcaster.clientId))))return;

          broadcast({

            type:
              "comment",

            clientId: ws.clientId,
            avatar: (ws.profile && typeof ws.profile.avatar === "string") ? ws.profile.avatar : "",
            name: limitEmojiText(ws === broadcaster ? (liveInfo.name || "配信者") : (((ws.profile && ws.profile.name && ws.profile.name !== "ゲスト" && ws.profile.name !== "ユーザー" && ws.profile.name !== "視聴者") ? ws.profile.name : "") || (ws.liveName && ws.liveName !== "ゲスト" ? ws.liveName : "") || data.name || "ゲスト"),30),

            text:
              limitEmojiText(data.text || "", 200)

          });


          return;

        }


        /* =====================
           TEST GIFT: no currency or billing
        ===================== */
        if(data.type==="test_gift"){
          if(!liveInfo.active || ws===broadcaster || !ws.liveJoined || blockedEither(ws.clientId,broadcaster.clientId))return;
          const giftIds=["heart","star","rose","bunny","toast","bouquet","bear","moon","dream","kingheart"];
          if(!giftIds.includes(data.giftId))return;
          const now=Date.now();
          if(ws.lastTestGiftAt && now-ws.lastTestGiftAt<700)return;
          ws.lastTestGiftAt=now;
          const profile=ws.profile||{};
          broadcast({type:"test_gift",giftId:data.giftId,clientId:ws.clientId,
            name:limitEmojiText(profile.name||ws.liveName||"ゲスト",30),
            avatar:typeof profile.avatar==="string"?profile.avatar:""});
          return;
        }

        /* =====================
           LIKE
        ===================== */

        if (
          data.type ===
          "like"
        ) {
          // サーバー側で判定するので、連打や再接続でも通知が増えない
          const firstLikeNotice = !liveLikeNotifiedUsers.has(ws.clientId);
          if (firstLikeNotice) liveLikeNotifiedUsers.add(ws.clientId);

          broadcast({

            type:
              "like",

            clientId: ws.clientId,
            firstLikeNotice: firstLikeNotice,
            name:
              String(
                ((ws.profile && ws.profile.name && ws.profile.name !== "ゲスト") ? ws.profile.name : "") ||
                (ws.liveName && ws.liveName !== "ゲスト" ? ws.liveName : "") ||
                data.name ||
                "ゲスト"
              ).substring(
                0,
                30
              )

          });


          return;

        }


        /* =====================
           BLOCK
        ===================== */

        if (
          data.type ===
          "block"
        ) {

          console.log(
            "BLOCK:",
            ws.clientId,
            data.target
          );

          return;

        }

      }
    );


    ws.on(
      "close",
      function() {

        clients.delete(
          ws
        );
        sendPresence();


        if (
          broadcaster ===
          ws
        ) {

          broadcaster =
            null;


          liveInfo = {

            active:
              false,

            id:
              null,

            name:
              "",

            title:
              ""

          };


          broadcast({

            type:
              "live_stopped"

          });


          sendLiveList();

        }


        console.log(
          "CLIENT DISCONNECT:",
          ws.clientId
        );

      }
    );


    ws.on(
      "error",
      function(error) {

        console.error(
          "WS ERROR:",
          error
        );

      }
    );

  }
);


/* =========================================================
   START SERVER
========================================================= */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      "================================"
    );

    console.log(
      "voiceボタLive START"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "================================"
    );

  }
);
