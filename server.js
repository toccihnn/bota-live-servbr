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
#myPageScreen{color:#fff;background:linear-gradient(180deg,#08132b33,#11133477),url("data:image/jpeg;base64,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") center top/cover fixed; font-family:system-ui,"Noto Sans JP",sans-serif}
#myPageScreen::before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,#08122c55 0%,#11152e55 50%,#10102a88 100%);z-index:0}
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
    <div style="font-weight:750;font-size:23px;text-shadow:0 2px 8px #000" id="mpMoonName">月光花 🌙</div>
    <div style="opacity:.85;font-size:12px;margin-top:3px" id="mpUserId">VoiceボタLive</div>
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
  document.getElementById("mpMoonName").textContent = (name || "月光花") + " 🌙";
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
