const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

let clients = new Set();
let broadcaster = null;

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

/* 入室者アイコン：配信者・視聴者共通 */
.presence-strip{position:absolute;top:max(78px,env(safe-area-inset-top) + 62px);left:14px;z-index:8;display:flex;align-items:center;gap:5px;max-width:calc(100% - 100px)}
.presence-avatar{width:34px;height:34px;border-radius:50%;border:2px solid #ffffff88;background:linear-gradient(135deg,#557bff,#c36aff);color:white;font-size:15px;font-weight:bold}
.presence-more{border:1px solid #ffffff66;background:#10142dbb;color:white;border-radius:18px;padding:8px;font-size:11px}
.presence-overlay{display:none;position:absolute;inset:0;background:#0009;z-index:20;align-items:center;justify-content:center;padding:24px}
.presence-overlay.open{display:flex}
.presence-dialog{background:#151a36;border:1px solid #ffffff44;border-radius:18px;padding:20px;width:min(100%,360px);max-height:70vh;overflow-y:auto}
.presence-entry{padding:11px;border-bottom:1px solid #ffffff22}

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
#myPageScreen{color:#fff;background:radial-gradient(circle at 75% 16%,#fff 0%,#d4e2ff 5%,#7393cb 7%,transparent 12%),radial-gradient(ellipse at 70% 70%,#375582 0%,transparent 50%),linear-gradient(180deg,#050b27 0%,#102453 48%,#263962 70%,#080f2a 100%);background-size:cover;background-attachment:local;font-family:system-ui,"Noto Sans JP",sans-serif}
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
</style>

</head>


<body>

<div class="app">


<header class="header">

  <div class="logo">
    voiceボタLive
  </div>

</header>


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

    <div class="hero-small">
      声でつながる、みんなの居場所。
    </div>

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
    <div class="panel-live">🔴 LIVE</div>
  </div>
  <div class="presence-strip" id="presenceStrip" aria-label="現在の参加者"></div>
  <div class="presence-overlay" id="presenceOverlay" onclick="closePresence()">
    <div class="presence-dialog" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center"><strong id="presenceHeading">参加者一覧</strong><button type="button" onclick="closePresence()" style="color:white;background:transparent;border:0;font-size:24px">×</button></div>
      <div id="presenceList"></div>
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
  <button id="audioButton" class="panel-button start-button" type="button" onclick="enableAudio()" style="display:none">🔊 音声をONにする</button>
  <div class="action-rail">
    <button id="likeButton" class="live-action" type="button" onclick="sendLike()"><span class="action-emoji">❤️</span><span>いいね</span></button>
    <button id="giftButton" class="live-action" type="button" onclick="showGiftNotice()"><span class="action-emoji">🎁</span><span>ギフト</span></button>
    <button class="live-action" type="button" onclick="shareLive()"><span class="action-emoji">📤</span><span>シェア</span></button>
    <button class="live-action" id="muteAction" type="button" onclick="toggleRemoteAudio()"><span class="action-emoji">🔊</span><span>音声</span></button>
    <button id="backgroundAction" class="live-action" type="button" onclick="toggleBackgroundPanel()"><span class="action-emoji">🎨</span><span>背景</span></button>
  </div>

  <div class="comments">
    <div class="comment-list" id="commentList" aria-label="コメント一覧"></div>
  </div>
  <div class="comment-input">
    <input id="commentInput" maxlength="200" placeholder="コメントを入力...">
    <button type="button" onclick="sendComment()" aria-label="コメント送信">➤</button>
  </div>
  <button id="stopButton" class="panel-button stop-button" type="button" onclick="stopLive()" style="display:none">⛔ 配信を終了する</button>
  <button class="panel-button close-button" type="button" onclick="closePanel()">閉じる</button>
</div>


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
  <div class="mp-follow"><div><strong id="mpFollowers">0</strong><small>フォロワー</small></div><div><strong id="mpFollowing">0</strong><small>フォロー中</small></div></div>
  <button class="mp-item" type="button" onclick="changeMyPageAvatar()"><span>◉ &nbsp; アイコンを変更</span><span>›</span></button>
  <button class="mp-item" type="button" onclick="editMyPage()"><span>✎ &nbsp; プロフィール編集</span><span>›</span></button>
  <button class="mp-item" type="button" onclick="myPageInfo('コインの購入・利用履歴は準備中です')"><span>🟡 &nbsp; もっているコイン</span><span><b id="mpCoinCount">0</b> &nbsp; ›</span></button>
  <div class="mp-bio">
    <div class="mp-bio-head"><span>▤ &nbsp; 自己紹介</span><button type="button" class="mp-edit" onclick="editMyPage()">編集する</button></div>
    <div id="mpBioText" class="mp-bio-text">自己紹介はまだありません。</div>
  </div>
  <button class="mp-item" type="button" onclick="myPageInfo('ファンランキングは準備中です')"><span>☆ &nbsp; ファンランキング</span><span>›</span></button>
  <button class="mp-item" type="button" onclick="myPageInfo('お問い合わせ機能は準備中です')"><span>ⓘ &nbsp; 困ったときは</span><span>›</span></button>
  <input id="mpAvatarFile" type="file" accept="image/*" style="display:none" onchange="saveMyPageAvatar(this)">
</section>
<div class="mp-dialog-backdrop" id="mpEditDialog" onclick="closeMyPageEdit()">
  <div class="mp-dialog" onclick="event.stopPropagation()">
    <strong>プロフィールを編集</strong>
    <label for="mpNameInput" style="display:block;margin-top:14px">表示名</label>
    <input id="mpNameInput" maxlength="24" placeholder="表示名を入力">
    <label for="mpGenderInput">性別</label>
    <select id="mpGenderInput"><option value="未設定">未設定</option><option value="男性">男性</option><option value="女性">女性</option><option value="その他">その他</option><option value="非公開">非公開</option></select>
    <label for="mpBioInput">自己紹介</label>
    <textarea id="mpBioInput" maxlength="300" rows="5" placeholder="自己紹介を入力"></textarea>
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
    onclick="startLive()"
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

let myId =
  "user_" +
  Math.random()
    .toString(36)
    .substring(2,12);

let connected = false;

let isBroadcaster = false;

let localStream = null;

let peerConnections = {};

let currentUserName = "ユーザー";
let presenceMembers = [];

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

      send({

        type: "hello",

        clientId: myId

      });

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

function renderPresence() {
  const strip = document.getElementById("presenceStrip");
  const list = document.getElementById("presenceList");
  if (!strip || !list) return;
  strip.replaceChildren();
  list.replaceChildren();
  document.getElementById("presenceHeading").textContent = "参加者一覧 (" + presenceMembers.length + "人)";
  presenceMembers.slice(0,3).forEach(function(member) {
    const button = document.createElement("button");
    button.className = "presence-avatar";
    button.textContent = (member.name || "？").slice(0,1);
    button.title = member.name;
    button.onclick = openPresence;
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
    const item = document.createElement("div");
    item.className = "presence-entry";
    item.textContent = (member.broadcaster ? "🎙️ " : "👤 ") + member.name + (member.broadcaster ? "（配信者）" : "");
    list.appendChild(item);
  });
}
function openPresence() { document.getElementById("presenceOverlay").classList.add("open"); }
function closePresence() { document.getElementById("presenceOverlay").classList.remove("open"); }

function handleMessage(data) {
  if (data.type === "presence_update") {
    presenceMembers = Array.isArray(data.members) ? data.members : [];
    renderPresence();
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
      data.text
    );

    return;

  }


  if (
    data.type ===
    "like"
  ) {

    addComment(
      "システム",
      "❤️ " +
      data.name +
      " さんがいいねしました"
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


/* =========================================================
   START LIVE
========================================================= */

async function startLive() {

  console.log(
    "START LIVE CLICK"
  );


  alert(
    "配信ボタンを押しました"
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


  const name =
    prompt(
      "配信者名を入力してください",
      "ぼたもち"
    );


  if (
    name === null ||
    name.trim() === ""
  ) {

    return;

  }


  const title =
    prompt(
      "配信タイトルを入力してください",
      "voiceボタLive 配信中"
    );


  if (
    title === null ||
    title.trim() === ""
  ) {

    return;

  }


  currentUserName =
    name.trim();


  setPanelStatus(
    "🎤 マイクを確認しています..."
  );


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


  isBroadcaster =
    true;
  document.getElementById("livePanel").classList.add("is-broadcaster");


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
    name: currentUserName

  });

}


/* =========================================================
   BROADCASTER OFFER
========================================================= */

async function createOffer(
  viewerId
) {

  if (
    !isBroadcaster ||
    !localStream
  ) {

    return;

  }


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    viewerId
  ] = pc;


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


  const pc =
    new RTCPeerConnection(
      rtcConfig
    );


  peerConnections[
    data.from
  ] = pc;


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
              "🔊 音声ボタンを押してください";

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

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );


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

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

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

async function receiveIce(
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

    await pc.addIceCandidate(
      data.candidate
    );

  } catch(error) {

    console.error(
      "ICE ERROR",
      error
    );

  }

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

function toggleRemoteAudio() {
  const audio = document.getElementById("remoteAudio");
  audio.muted = !audio.muted;
  const button = document.getElementById("muteAction");
  if (button) {
    button.querySelector(".action-emoji").textContent = audio.muted ? "🔇" : "🔊";
    button.querySelector("span:last-child").textContent = audio.muted ? "ミュート中" : "音声";
  }
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
  if (!file.type.startsWith('image/')) {
    alert('画像ファイルを選択してください');
    event.target.value = '';
    return;
  }
  // 大きすぎる画像の送信・保存を避ける
  if (file.size > 5 * 1024 * 1024) {
    alert('画像は5MB以下のものを選んでください');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function() {
    const imageData = String(reader.result || '');
    const value = 'linear-gradient(rgba(4,5,17,.28), rgba(4,5,17,.58)), url("' + imageData + '")';
    publishLiveBackground(value);
  };
  reader.onerror = function() {
    alert('画像を読み込めませんでした。別の画像を選んでください。');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
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


function addComment(
  name,
  text
) {

  const list =
    document.getElementById(
      "commentList"
    );


  const wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 30;

  const item =
    document.createElement(
      "div"
    );


  item.className =
    "comment-item";


  item.textContent =
    name +
    ": " +
    text;


  list.appendChild(
    item
  );


  if (wasNearBottom) {
    list.scrollTop = list.scrollHeight;
  }

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


  peerConnections =
    {};

}


/* =========================================================
   PANEL
========================================================= */

function openPanel() {

  document.getElementById(
    "livePanel"
  ).classList.add(
    "show"
  );

}


function closePanel() {
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


function showProfile() {
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
function saveMyPageEdit() {
  const name = document.getElementById("mpNameInput").value.trim();
  if (!name) { alert("表示名を入力してください"); return; }
  localStorage.setItem("voiceBotaProfileName", name);
  localStorage.setItem("voiceBotaProfileGender", document.getElementById("mpGenderInput").value);
  localStorage.setItem("voiceBotaProfileBio", document.getElementById("mpBioInput").value.trim());
  closeMyPageEdit();
  showProfile();
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
      localStorage.setItem("voiceBotaProfileAvatar",canvas.toDataURL("image/jpeg",0.78));
      showProfile();
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
        client.readyState ===
          WebSocket.OPEN
      ) {

        client.send(
          message
        );

      }

    }
  );

}


function getLiveList() {

  if (
    !liveInfo.active
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


function sendPresence() {
  if (!liveInfo.active || !broadcaster) return;
  const members = [];
  clients.forEach(function(client) {
    if (client !== broadcaster && client.liveJoined && client.readyState === WebSocket.OPEN) {
      members.push({id:client.clientId,name:client.liveName || "ゲスト",broadcaster:false});
    }
  });
  broadcast({type:"presence_update",members:members});
}

function sendLiveList() {

  broadcast({

    type:
      "live_list",

    lives:
      getLiveList()

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
          getLiveList()

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


          ws.liveJoined = true;
          ws.liveName = String(data.name || "ゲスト").trim().slice(0,30) || "ゲスト";
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


          if (
            target
          ) {

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

          broadcast({

            type:
              "comment",

            name:
              String(
                data.name ||
                "ユーザー"
              ).substring(
                0,
                30
              ),

            text:
              String(
                data.text ||
                ""
              ).substring(
                0,
                200
              )

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

            name:
              String(
                data.name ||
                "ユーザー"
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
