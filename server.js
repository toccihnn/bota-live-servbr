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
#testGiftAnimation .gift-image {mix-blend-mode:normal!important;clip-path:none!important;filter:none!important;isolation:isolate!important;}
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
{id:"rose",name:"バラ",coins:100,emoji:"🌹",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"bunny",name:"うさぎちゃん",coins:200,emoji:"🐰",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"toast",name:"乾杯",coins:300,emoji:"🥂",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"bouquet",name:"花束",coins:500,emoji:"💐",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"bear",name:"くまさん",coins:800,emoji:"🧸",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"moon",name:"おやすみ",coins:1000,emoji:"🌙",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"dream",name:"ドリーム",coins:3000,emoji:"🏰",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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"},
{id:"kingheart",name:"キングハート",coins:5000,emoji:"💖",image:"data:image/webp;base64,UklGRlIXAABXRUJQVlA4IEYXAADQZQCdASq+AKsAPpE8mUglo6KhK/SdALASCWgAuzocVX6I5ofWLjZ95/c+B+PHbF9J+4a8z3nQemP/X+kr1JvoO9Lr/ev/LkT0svlTjr6jfqPuT7IufMecgL+0+FBAH9f/P3+x/5no//Ja2jQA/SvrDf7XlO+wvYX6X7ZELoRBhZpngFogG7o3iyqzFhR3OewFvTDKicYe7LeHIR06ZF+TMKCvNYozrqqbQOC4vL47FZxEuLk5dAkGPx2KC99PF6VHybD4sUR1gv3VzdItzZi2N/3+fmxQMGeypMH2l1AVlsczQmYzl03P8/REZBtd4er//AkXHi2dq92izs+h6ga4IIa7/LxQxVxnw09Gi7IHW5Jo1BPbSjyjh5hmgXOxay8TiFvbd/IWno29MeHUY+ngmkUTShsTFRnvCM4PsAptTUiYpVIrR0nLlo3DFSjPhUr6PBcN94QwEgmDopnkTQIOb+r7BDiYTgM7hVakcpPfuhrXtl5dN3G6nqS+/gKwF0NgFHso1mO+qT8kwD/N8+3+XJ9NL3svePCkxhyiOlXiSzDgKwEZ5P8A/b7JyJBcbXGbJ0euYZz2TEIbqv0gQebucwhBkHc3caeHJ57XT9f23yHi5fRNV/kTnGWs7lckJSiIls4DFVl1Qrs5cp2CMAcPCIsE+QG/+KuWMT4BraYUTMjCD8XvGXQGs7iD3gDWnTubXUj6rKbk0U0T2IaBhKehZjlompKlkcP3LNp9uAJoiDNFxe50s0fjL2y0BcywNHN9AOvy0R0O2NnhDS9QVDdNmbBsdK2cTUJxNyTUHjsO2F4h1aXE0iK4bYFXUdsORUb2TMj3SCnVtD8UYZA/41QDVfoPjXYGcis0vi+lB3ZJ8rK/pW40iFxvGY+x0dchcTW6JCT744w2Z8z6r6Ycgax+0DhObu00xC0dsFT4R+hA/aSb/yO8KKlo/g+b5S33mDQ9Ps0RHoywWzLSSIvo7aXwxcOJWj31Ve+NTkthZS5kLSVyXtyDdTNhoq7Ry6TGcmUiRfOKseN4W4G9SgdiMFNhJm3NL8a6fD+N0o0vu41n8kU03jzH6innBu8q37vcsriYg8tiXy6MAP78A5auM59aODkvUyVUFdvqeLS70wKjDTtdFfkVXbz7KocGwAhUEXhS6fflqeP7BgTLdPH42I8EbW7bP+Lnr5Sdxl3ziuHUV1lynTyemzjVXiOiY1KE/DoRTOAFb7TA+/tvE5MtR4EXeSZMuTDtQTE8IoCabDjQux8Hs2lXFCEluIhMULmZtussBkEZO8YhWxFtDPflgLqH43RJy9z/GGR6HgnWWn7G3ZsyO/tuZ7Ye6bLPPM2IruQ/u13lHAU5M4xOL6+2IQE3Fl2f+2irsx0cv9gM6BKWpijnYFZbUf0V6hgR/sCwFOzUNcTswmCyOyUFSmnZx3DRmws21aOM1ufsXx8vzE3svAsUmZY58JDFcWc5vNe1cXZ+vJ70Qfc0gEkzU4iAVW2As4cOvz7IZ2fFWOx8RO9WSDMjVKDRB4pN3099y5nVpmwUhb7Kuo+Rltwbun6Oe2UnmtdgrnfpcUaCBxy9UD92Ktn8PRegBANgdqkjry5jukE4jwculcDKK2bnjtmtyHf/WzwTHvfrVIz9MT6+jJhmFxuZtwoXbiZET4WHUm+8S+RodEsDYV1sOr5WtOx+2IkK6jJyIP6ZvNaFWnlt4vrcI+PPDmOMzht+ydzzNvvHUPsTve3kcRXrq4b8FgA6F9WYYRf5zYw5en4AVLCvA1yA915JHCBj43kaN1UTzpPG2qw937TuhxxoA4tUcBJBO3x+HQrntFKSAFSIzFzlltAkytfcTtcfpe/m91f+rwqaPQU4buYeVm95W1aL/haRGIISDD/KJ7M5XqDOKSn9vJ9MZ2wDPFYHeHn1iTDjq+EV6b6jJH/gYpMzLdKNCM0Bdo8zLjJqi57cxaZXqxsPoyY4cabDvpuYDf3aFB7w9xEwrfCgE0TLKGlj1E0x+1l/BbI0anDgEROjxrFLO+4JWfr7EnhJLhjs3ZEWyomlJoRj9KTGqgCaTJBGlh5F6O+3tjo57rSaHos7a13e4XfDGwjMfjEmDYGS2Gx7bi93um5wtScWcBYK5+32NsX+p+9Kqn1T6uvLBzmjngAHgQLR1Xw+tnvLgZfQg17oQMwlo+rTHE7aKb6w9aL4U6HM6/Gnwj2RWtGj/n3raZSLZ4GcrfqXj90XyFXXR+hLySrtXIe2h6vYwQh+EtYFPaURJRvsv/Y/lnjUmajLz9ZFmUIV+UyNzXrhWGez4Yb2+rIzJyne62kx6hDihxJctjrEBm2gwxfkYXa5fBg0qF3w9gSX3KU/7tUI+wnGbLaLb0oCn2jVMYAwhUYZ/H/D2ZErIOX1ulo+Ba9wQm9D4pUc1sCE4sDltYv6KzV6ji68t7xYLK/BCzaP5nK5MUTzZ27uqVryMB3fSWH312JWRHuwdkDOab6UiitMc7co+NWqeGzLsZRiUfncarEaGAdXUeuhH7hxhFJf2Mx1dVPmH2hKTrgGIaFUEcVydKA9+3PvU6Ao12/63EEJcteWf7ohGq1ylKZMVtLoDsPctkIndeKDtntLfFO61HaOGGquEDhf5o4ydey3zOF3zF9rf/L31332oBvoTA9i9rBO5j59pJMurZ3JxwBfBKiSN7NmuRmgrtziGoFvFcNCzv+G/2DOVMRVuUvUVp/wSo/4ywU1BtUQa+DI318lmJesilkFfk0PZxZBo1RulV/vXQH3EFGoxx5sqkUF6mpC6vFKAprim4W6YeSC7M4/nYfK3vvSV4U7ATeVahkqe+227E7wDcbi3BcoKPezRa3/1nRIO7ybH+LfJSwkxFR6uKRHjBmjkIoAIIemZnGg4zPLwlPvWYo8EzXA8pGp5+DwuWbEAzU/zOh+LSfMQUtsTeR8BWD5jHodhap3LM0owPYaAh1Re+OVVBa2/sdqwX43KQVZw0mlahf7KIajwqIexDqRNEtNnPFsp5kJqJOq/cD+Aph/qKkd3wgAvs6VkOOnp97qd6HD4jNXEQ77r3lsdmq4I/WaFRW1Am8oIWvu+yX/OOJWTW7W9mOaDV6JZqk7kUrF74a9gScLeIJ3idAQlfZgXW+F0OdE98jzh17vfFz/9l20v9Ljh2o4nn5At2wh2oByTQUsL7RPdyCpeKnE2i7ZLMXqSlq2hnPL7gBSFwws8QKcMAZLkEOOlySKv83QUDjo9khoDKqspTfk8kJU+YT4sHLIGm1qMnDFu85DUEoQz0VnXC3SKeGgIYsIqTgGSG/hZn7P93Ma0qztH1myt4JOmLPq0qR7VBOSNNekSFjNbbYuTEj/KTmfJ1MKPFdQTj9cs7IP9sOmO4qHHIo5txc68ARK9NBFEB0lDe/p6J+iwgWxEe0A2JzAZvfaGm6QiLXJMmKMQcHoasIYwPaJnIMN69klqCW7YMCrfQJWztcP8Kr3bUIh7IKFqitn9UoSnJ4dOZtvWB/eS2+DOc36n9lvyPoyygXa5tvDHah9wUfb/7zD6Jrw5zR87/uODQn0i9Sg5flRt9vIbZ2qV6yetMzESePER9A/iwdDqbjX1H4sn4c7wpMaAck5MlLa8yjSCjZfoQbkYysMPFrSLWP4s15nM3Z4vd7T9k+SC6kl3qLubuFUtM8Hq53gtOC5QSiXLD6RsseeUK8rCvOI1aN+Y5F4ieKCY+luzQ4jzWWwvotawIcBtVymqdCRHEtLNuAe+GMdqeDhku2TJvg7Yjf24koNrYTKFW5Jp7RZ0CdCky7d+RhF6MQFmYiMjcfCxzescw5QDKkBUhrKP1IPApXsHgkyD5u8j/faVOJzNC1WmQqBMEeasXuwdMjKE0wE/NpWlxFRDiUrSR6o7Q3Bjpf5rHyFDv/PoPWdwNZCFk5AMehYZXtH+BBIhw5JB0+CRaYhUV7vRvQVgYQlyfGaC7MIcKOy+Uqhsg+A7R8Op83d2rgVHSY3RFFFdqyCcIqxcs9Mfn5WK/lU51uUUKxNYmQ9HgSy5S7HnFTiYUuTfgaYOuUceMx4WLqk35D7uNjcafJngZ7yTmwIVkYEau/EArsvwxeptniViKlz0ULzuwPBXNlQXzF0vlVeYByHkJ4sVPw7oPupiW3Bs+V3m2mPAczD75Dk0O8I8GhTIlJB5+iloUGKwVDckLQL2koFOq0eaGPHU8+nAmv6LjR2XhZGEEkoXXrcIzAYL03ZIa14LJh/gcNSQzyoOXVNoBE86OmEF2OKAsY3Rq8RRLJfbm9vG/HZstERgOMtOw85MFEFCkBt06yu1h/XCjg5B+eHObRjJZ2B00A6gKYFsLDNv1+/EMZeEptCylWCSaLUdZGWGAPJY++R75mfUdIiUQhmgF+E0c2Tow7f4Eqn1iIjnaS1xWspXlyqxNCF2dRgSmrOSXdKCUWLPNDayiidrPhYkILuWKIMQR8iBHkvhXbCb50Pxc5+msZPPcC0+9hO43B9uBOrlG+MMCkpWzi73YkeBVWJOGGraC0fcmu2eRPoweBIIGZ8p8xqDDzdGQuxjwAVxRcof/ZbNYribt3mYOn8WDf+m3pz1qvL3lsJSYwA/GfJx7P23D4bSG8JDzCUW3vLpkSK8F4wDhnMd4NugZauQ+eFxOSVu0cQqeqTnfnPFf5PIshFegtqym/iQvcl2ZrTyNp51Yn8lsZO96wPir4hcnM6NQG5DErwZUdkXGYIu6K0ZnkomwMfqeh8+mgxpDShEfu7oot3zMXpkTvklInwk7V/PDJyVs2zTFBdmgRSb9dTjNbL/02IlPtauUa/S0p+jYycbGu6/VyTPriJJRKFKKHYk3pbEGC7Vl7oUJ3Ob1pJmIOBNfahG4iKjQFx4UWxCX+fexMQgrmzI+o6sHiNJuVDblWcJvC4SnJASQmsbjDVs7tdYhAWHD7db4YDdujNdB7hAmy4gqZY0p7pG54d+4kKZsI9T0DCHglSfM6wwDjVz7/JlMGhUoing0UBNgYV8/win54hPHbc7LMmYMshLd870m3dOdKzErZHxnF5MOPmuNKUmHUlAOJsbCYoAgX1+Lk2UZCWySqba0JZlK0LJJVXNWwHo2VULtcHEmlcaEnWgX//uQrd5GiJg2I3S+A/1iDbnlhs4uXweBbFUfPBiTplbBq48oi8c23CEvBpB4s2BgzG8x7DRWzA51NWVfIbBArA8ZJnrf5kpY+uDs89PHV8nLy0rTMZ61qP5yFFbIx6OO+3W+iuUMOLWSx6dmk9KtoqP60E1ll1XT2YSE1mw+hRCrVlKt9XAfiy351P/fd8cJcTJUaHoIfYv2hS2fX+eG4Q4DcSibe1poNgM14bkRae4uij7UOd7x3qZrI0aHx3vnvhDajmVZl2z9N/2hvL9fjrFc2b4t32OceVj+ru+GHypSPWs5yx2aTH1OE7H+/pliFmnfLjLN8oNR7ry6aOVyp1wQIAUYuQ3+beKMWU97IqjscioWKIrhnLPNZWvPUp7uzYl4a/DpCz/Mv+yCgHhwdcHZSbAxz+m99vZ9gdveW2OGGr6mhhE/LuMqZsAygdeDeznPDfMxwywbYLW+EXl4fStiE0cqvndwLM1nbqnzIGu8WFKoxtUbFQscy7IsE94GK/+nNmUdp6c7cwwkKSxbuJUqaJ7JMOhEdNm8Xwn36JZUvNzLDO2y/eDepREmf+9tiUXUDXkFshOeOI8jomtRhAyBUhldBTgKintAQcmeAIIoFiXf05DlQrpA3wcT5w5LzAqGwHDSMsTaplGx4VxSsFo9MRwGTFU4vvELLUdkopVIh4OxzEowRG2s5I9HZMR9P/fM5M/qA+1vnSYy3ALl7O/HyPxNS5wiYGewq7CGhJbmI7KI/yvN9f+0u/qLKa4ahBc4GjdoCivwfcz7D03CgkShPTvyZ7AVLTF6mlUk5EGMzjEzTqMa19dJb8j92RzsKO5HTVkCkxY/cDZSc9hR4TVybzTGjUgJNphIZw5Jj9JJ7onK/x9KjzyQsYet6UfAiZvrQ0UOufgkX5EEMkOTb43GImBF1gMMQre3Tx+hmA0FlFkx67akZzzNOSGyWCUunTyJwXDKdTXFN867ixPQDCzI5cH7sk/pDaPGaqIpo7ycZHg15WTV02liVtzu2hizecRRs2kRC1n5/XPR0BZgi+rxCWbjlBx93wW3saMj3sDIvbt0nBAUE+qaKjOTjMeMACpJt0+y2xV4XXld43GFrSra/ODrnZOFEZfAtpUArGaALCxzH9oKa03NrekI38zQLAer4b5+TXZzu/2ON0WkdJxzfxUABphm3Ig06GZNDpwLK0Mf8qf1pmFuQZdpfll9nYz6ybaKorQYWcK7WKqEfiOx2LqZ+njHszAPm1WSW7OtB7llxemmwwrYeE9ZcPYl0Ig4o8VLmmhQvy0iMh6EH4B3XPcI3ZZjUdJID4ZKsymqzRmwhui0p+FwsFTRIguV1NYTi/IYhYdVdWD1UJ/KIElBSTv0nquXCa5AUcV30Pqwolg8GAmpT8Yrr1iTmFdahVf9aoiUbAuZpik/hlYUypLya0aAz4NkBVqqMJkbFkLUqFGvAdOEzvKh0zvoIht73UV4T8UiEU5K0Mt3O/5+mSM7HRvM7yDeLM/BOUXzZ5Zmlmot+zcJOWKB+q98LZukIbBYOYw9+UaK6bVXQ+miepAEn9JkniFPPLkW4Ggg0pijaMkSaOWyID5J4XOOYKZAzdpgoHtfvS0zgpM1RFTTWkp22+MkE6jnruA+5BY6Uix23C4gtLgtjCoh+y7oF5VhhIFZF5BufdRXqIklwW4CO9IsZI2K69tgsMP0ZwlSsPZtOBSk/R7iuWwbXrO1iPNuGpKCOT2KEz8+uRIicyP3X92Dizr62tNnPN5dFMSrsn7lXBSUVw6MiwiAwFU73UgTgotd2fFpc13eEBdbGv+h1M4qAVTBZH8FGPdaFa+s4N3LS8rqnbbdjn+EQIw3OZ+4Y6gPq6e3Pjuf4nI2UxhugoEPH6h9XSv1a44lNreLrV7n93K2OlNnTXAn056HT6+/ooQTcPJeN1MfdnUMWkfN4/5luqheGxELq0W0e6C9b55dVvYeZrV+SpxXKgQgAT8nH0u+u8qLNKQYML5O7BL2US91aTdFzkOoapSgHavsnHS8LpiAcON6Og3WMMKPEzfUUYd52rOIBRSV8IuctgN+DOROvSPpBVlA+DUoH03/sLjDxf/pn6b+KgI50VMNWQiaxZbb0gLuscMfmO+XYqNLJ/ZAR9MZK9YP8j14OspjnjZZMx0nVop3DGWIWM7KHWhA4Fy3spfiW1Jm0xoLA5YbH55vTm0l/A/tZlYrbHwNJDOVM2ZEppzChbRUQHvDAYpwX/ZHY20b3wf4JO7OvRVFpooubbSVoohTxzmdryAb1Fm+ritg85FsyT7/f+/of1gR5zQVoYlkSYT8i4tmVaLWAJ1oFkQjl5akbvmvxxi8Xfma+GhL3gypuwWgVXchwSJo/NHRFqdl21Pp2YpPrApSPq6BHOO8lkwRUtPOvL7XWufoPc0aDoZ1qOObbOXn9pn4oVSoxqkfXUFhQLf2LgV0J3C8JNZG1P2MvbZ2wpiYwnpWeVYQCkKjbuIWtUmEQtRDS+eVC/v2Hnpc+e/eepZ5kLLwcUKfrdTvpXzsI2bceCz/6GCqh4e0hTRPktZRNDn61oNQQ4pZGVKEd9KVtfYa/RsdmN5PLL2dLo1Ztv5EzWo/phzNvj+tFk64xS+2ILeChnqZlpKXjC6l59EFHN0qImb+sylNerv5OWxwTRg9YHsGQkPQ0xI0JalFJHi8v7rSAdGRoA3VzrjdziUylbimvoDYOKoUUC4HAHUtvcczzM1lfGCmoxzZDJhjla2HyZWFR/1ntF2gyFcEdlJa3v6x7tWp2mFux2VJ4akK/Qf1sd5YSR2eBrz5Z0ARIAxZy+D4K8529n995vQY+CU1KegKPSHuK8SFkAAAA=",fxImage:"data:image/png;base64,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"}
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
