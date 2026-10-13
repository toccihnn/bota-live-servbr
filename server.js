const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

let clients = new Set();
let broadcaster = null;
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
 const ids=[...new Set([...following,...followers])];
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
 c.liveJoined=false;sendTo(c,{type:"access_denied",reason:"この配信は視聴できません"});
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
  <div class="live-host-info" id="liveHostInfo" style="display:none"><button type="button" class="presence-avatar" id="liveHostAvatar" aria-label="配信者のプロフィール"></button><button type="button" id="liveHostName" class="live-host-name"></button></div>
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
    <button id="likeButton" class="live-action" type="button" onclick="sendLike()"><span class="action-emoji">❤️</span><span>いいね</span></button>
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
    onclick="scrollLive()"
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
  document.getElementById("presenceProfile").classList.add("open");
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
  if(data.type==="access_denied"){
    alert("この配信は視聴できません");
    if(typeof closePanel==="function")closePanel();return;
  }

  if (data.type === "presence_update") {
    presenceMembers = Array.isArray(data.members) ? data.members.filter(m=>!presenceHidden.includes(m.id)) : [];
    broadcasterProfile = data.broadcasterProfile && !presenceHidden.includes(data.broadcasterProfile.id) ? data.broadcasterProfile : null;
    activeLiveTitle=data.title || activeLiveTitle;
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


  if (
    data.type ===
    "like"
  ) {

    addComment(
      data.name || "ゲスト",
      "❤️ いいねしました",
      data.clientId
    );

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
      '現在配信中のライブはありません' +
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
              true

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

        pc.addTrack(
          track,
          localStream
        );

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

  send({

    type:
      "like",

    name:
      currentUserName

  });

}


function toggleBackgroundPanel() {
  const panel = document.getElementById("backgroundCustom");
  if (panel) panel.classList.toggle("open");
}

function showGiftNotice() {
  alert("ギフト機能はこれから追加できます。");
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

function openBlockManager(){
  if(!presenceBlocked.length){alert("ブロック中のユーザーはいません");return;}
  const names=presenceBlocked.map((id,i)=>String(i+1)+". "+((socialProfiles[id]||{}).name||"ユーザー"));
  const selected=prompt("解除する番号を入力してください\n"+names.join("\n"));
  if(selected===null)return;
  const n=Number(selected);
  if(!Number.isInteger(n)||n<1||n>presenceBlocked.length)return;
  if(confirm("ブロックを解除しますか？"))send({type:"social_action",action:"block",targetId:presenceBlocked[n-1]});
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
    !liveInfo.active || (viewerId && blockedEither(viewerId,liveInfo.id))
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
    sendTo(recipient,{type:"presence_update",members:visibleMembers,broadcasterProfile:visibleHost,title:visibleHost?liveInfo.title:""});
  });
}

function sendLiveList() {

  clients.forEach(function(recipient){
    sendTo(recipient,{type:"live_list",lives:getLiveList(recipient.clientId)});
  });

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
            if(ws.clientId){socialData.profiles[ws.clientId]={name:ws.profile.name||"ユーザー",avatar:ws.profile.avatar||""};saveSocialData();}
          }
          socialState(ws);
          sendTo(ws,{type:"live_list",lives:getLiveList(ws.clientId)});
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
          socialData[key][id]=values.includes(target)?values.filter(x=>x!==target):[...values,target];
          if(action==="block"&&socialIds("blocked",id).includes(target)){
            socialData.following[id]=socialIds("following",id).filter(x=>x!==target);
            socialData.following[target]=socialIds("following",target).filter(x=>x!==id);
          }
          saveSocialData();
          if(action==="block"){
            clients.forEach(other=>{
              if(other.clientId===target && other.liveJoined){
                other.liveJoined=false;
                sendTo(other,{type:"access_denied",reason:"この配信は視聴できません"});
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
            socialData.profiles[ws.clientId]={name:ws.profile.name||"ユーザー",avatar:ws.profile.avatar||""};
            saveSocialData();
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


          broadcaster =
            ws;


          ws.isBroadcaster =
            true;


          liveInfo = {

            active:
              true,

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
           LIKE
        ===================== */

        if (
          data.type ===
          "like"
        ) {

          broadcast({

            type:
              "like",

            clientId: ws.clientId,
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
