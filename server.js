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
{id:"heart",name:"ハート",coins:10,emoji:"❤️",image:"data:image/webp;base64,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"},
{id:"star",name:"スター",coins:50,emoji:"⭐",image:"data:image/webp;base64,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"},
{id:"rose",name:"バラ",coins:100,emoji:"🌹",image:"data:image/webp;base64,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"},
{id:"bunny",name:"うさぎちゃん",coins:200,emoji:"🐰",image:"data:image/webp;base64,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"},
{id:"toast",name:"乾杯",coins:300,emoji:"🥂",image:"data:image/webp;base64,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"},
{id:"bouquet",name:"花束",coins:500,emoji:"💐",image:"data:image/webp;base64,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"},
{id:"bear",name:"くまさん",coins:800,emoji:"🧸",image:"data:image/webp;base64,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"},
{id:"moon",name:"おやすみ",coins:1000,emoji:"🌙",image:"data:image/webp;base64,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"},
{id:"dream",name:"ドリーム",coins:3000,emoji:"🏰",image:"data:image/webp;base64,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"},
{id:"kingheart",name:"キングハート",coins:5000,emoji:"💖",image:"data:image/webp;base64,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"}
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
 const burst=document.createElement("div");burst.className="test-gift-burst";
 const icon=document.createElement("img");icon.className="gift-image";icon.src=g.image;icon.alt=g.name;
 const title=document.createElement("strong");title.textContent=(data.name||"ゲスト")+"さんから "+g.name+"！";
 const hint=document.createElement("div");hint.style.fontSize="12px";hint.style.marginTop="6px";hint.textContent="🎁 テストギフト（無料）";
 burst.append(icon,title,hint);layer.appendChild(burst);layer.classList.add("active");
 testGiftAnimationTimer=setTimeout(()=>{layer.classList.remove("active");layer.replaceChildren()},2200);
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
