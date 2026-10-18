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
#testGiftAnimation .gift-image {mix-blend-mode:normal;clip-path:none;}
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
{id:"toast",name:"乾杯",coins:300,emoji:"🥂",image:"data:image/webp;base64,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",fxImage:"data:image/png;base64,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/OIi0/PTdOdboCqSpIN0klJCEKEuoVoo655A07UQfFF4uF8wwx9DX8ctcBEirEBJj1QSLQLWlTH8UYZUC7KpDqkMdFRGKkGoIdIkvPn0m/4JVX76be985Kc+8EcfetQODb60+OGQTitlq7/On37so5edN0zPLlzr5U9874VXLtJqtwjIWIKs29+6Lp9JX/F7v/vbFx64/wh3vflNUAyhm6Kmb2PjpXPLH/j9D/7VCy8tvyAqjS8Vwguylt5zz713/MtTd9+2tO+OQ+b++5a+8p2PHv1wkGW1urLBc89dfO6pJy78raefWr60te5pt/YgQoIRSeTO2kAIFhkMzgeytIMUJZcvrr03uBStDHg5bibZGF7E3oZC0o1eUGxz733H+NpvePRn165f41f+zW999Sc/+dxZjwbbe/njH33u5bNnlletSyBAZtpYJ7HOjWRPfL3AIsZe1HXvqMOjGgxP2JmnqUnyiIjeViqF0SrupgISGXMII6BlVDR8I9E4CJbpqRYPnH4A3c44cfdtnD1zFiMVeQktnUJlsa7Cl57ZqS7WWfKiqlGzNWzWTzQwkTugzW8E+t680Be5c9vgcOroS9RGKOtERkVsjlQy4m5UAA379i1y27GDSySy3ZmdXprfM7enWBcr2ncYDipyV5DjQCqsFVy+dJWVtc3RB3SCMTxBCGQISB+QwpFKQSqpll94/sKLLz9ftduG+YUFtnvlhd9738c+nPcDoTL4SiF8wFX9a+//4488evDwPHfdfds99z147F8ePDyzNDufmZOnDi0dObp05NF3PvKRJz997sKffOip737qM+cuVYXBVZq0M0W/XyB1QqIUmUlRMhr35Uvry94bBBqpVGwEISfQpRF0552PCFIf6G8XnHnh0vIv/Kt/8b3rV6HVWmRzcxslC/7o9//0B6oyQcgM52rObuXiniMCItTly0DdmKtLlCHgpaqJ7LHRF262I9C8hhyVQWUAUyfOiRKkuj6kIFGCREryYcnszAx7l/aBDBy/8zbE71oyaWIAJTS+IQ8xRmOIGjPFF0lL6Iti+KOarxc1eIu6lBmpeE3cbRQYFcMgpQRaCdrTXd72tje/I52bMYQSplrmwTc/eMdj7//MivCOTitFuRiHFjaQJBlbmyWDfItOZ5q8LGrmT2RZIWL40YQdp26//WRqzOpv/eZv/OigXyxjU4o8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"},
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
