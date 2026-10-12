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
#myPageScreen{color:#fff;background:linear-gradient(180deg,#08132b33,#11133477),url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAgwBBADASIAAhEBAxEB/8QAHAAAAwEBAQEBAQAAAAAAAAAAAgMEAAUBBgcI/8QAKxAAAgEFAAIDAQEBAQEAAwADAAECAxESITEEYRNBUSIyFHGBUpGhQsHx/8QAGwEBAQEBAQEBAQAAAAAAAAAAAAIDAQQFBgf/xAAdEQEBAQEBAQEBAQEAAAAAAAAAARECEjEDQRMh/9oADAMBAAIRAxEAPwD8FyRskTZM2TPtWhrkA5AOQLkZ2g2wGzNgNk2qeSYqT3sKT1sVJmdoXLgqXRsuCpdJ0JfAH0N8AfRoy6GuALoa4VKzFHpVHhLHpTHhpKKqbK4PVyGD2VwZpKlbCXCumznwlsrpvhrKL4MphIhjIoi3Y0lS6MJFEJ8OfGe+lEZOxrKL4yHRkQxkOUzWVKxSDUiNSDUjSUU5I2SJsmbJjWZrkA5AOQLkNGkxUnvYUnrYqTM67ANgNmbAbMq0gH0xjE1bxINIyQaRnR7BbKYrQmK2UwjojFPYx2UwVwIrZRCIweKISiGohqJqktxBcShxAcdARyWiea2VzX4TTWykVHVX8siqLZ0Kq/lohqrYZ1FPhJPpZU4R1AgmTFSe9hyYmTA8bAbM2A2UkeSNkhWTNkwGuQDkA5AuRINyFSls0pCXID1yFSkaUtCXIJMcgHIByBcgPbo10Bdmuyg7JGyQrJmyYDGwGzNgNlxys2A2ZsBs0iKGb0Tyex0nomm9nUly4Kl0bLgqXQAlwVLo2XBUulJAYxgMYximbGMYDWZrMOyNZABZmsw7I1kB4YxgMYxgMYxgBMYwGMYwA2ZrMOyNZAKszWYdkayDR4YxgMYxiRjGMBjGMSMYxvsDWZrMOyNZGagWZrMOyNZABZmsw7I1kFAszWYdkayAVZmsw7I1kSAszWYdkayA8MYwH3+a/DZr8JPkNm/w+ba+sqyRslYmyNkzO0OyPMkKyZsmTaoTYDZmwGzO0C+APob4A+kaAfAH0N8AfRoxjGLlZmxe9DYsnixsXrRpKKovZRCRDGWyiMtGsqV8JbKIT9nPjPZRGei5R0YTX6Uxno5cZlMKj/TaVLpQqL7KY1NHMhPY+NT9Zco6Uaiv0dGomjlqo79HRqezaVLpqog1UVjnKpvoaqMuUX5r8Nmvwk+Q2bO6zVOQDkJc/YDkND5SFSb/AEDJmuK7BXRroC7NdmVaRvsxjEVYoobFa0DFb0NitEUHGOyiK0DGOyiMdHcU0Y7KIoGMdlEY6GDxRCUQ1ENROpJcQXEocQHHQEk1okqLZdURJURSKgqr+XYiqLZ0Kq00RVFvQZ1DU+yGp9l1T7Ian2EJZksulUyaXQFyYqT2FJ62KkykmOQDkA5AuQDHIByEuYDkSGOQLkLcgXIAnIByAcgXIJE5AOQDkC5AHdGugLs12UDujXQF2a7Aa2A2ZsBsuOUTYDZmwGzSIoJcFS6NlwVLp1IJcFS6NlwVLoC3wB9DfAH0pIbM1mHZGsgFWZrMOyNZFMwWZrMOyNZAemMYDGMYDWZrMOyNZAKszWYdkayACzNZh2RrIBVmazDsjWQAWZrMOyNZABZmsw7I1kAqzNZh2RrINAWZrMOyNZABZmsw7I1kSPDGMANmazDsjWRIFINIyQaQApBpGSDSM1F4s2LG4o2KAVizYsbijYoKKxZsWOxPMUAlxBcShxAcSQDQDQ5oBoBdmazDsjWQH0qqBqaIVUYamfLtfWVqfsNSI1MNSMrRQpBqROpBKRNqjbo10BdmuzO0evgD6G+APo0ZoBoc0A0NAPgD6G+APolSO6PboXdmuzSUUqQakTqQSkaypWxkOjP2QxkNUzSUdCM0PjU9nOjU9jY1PZUqXTjUVx0aia6cuNR3Gxqa6ayjpxqK/R0aitpnLjVaY6NTXS5Wbpxqb6NVRWOXGo76Y6NTXTSUdBVPYamiFVPYamVorz9hqSI1MNSGh6kEpE6kEpAMXQ1wBdDXAPYoaloGK3obFEqexjsohEGK2URiAUY7KIxAiimMdE4p6o7HRiaMdjVEYPVEJRDUQ1HRSSLCpoosKmgJJokqLbLprRJUQRXPqcZFU+y2pxkU/sMqgq8Zz6v+2dCrxnPq/wCmUVNN6JJsomySb2GdKkxUnvYUnrYqTAFyAcgXLYDkATkA5AuQDkEmOQLkLcgXIAnIByAcgXIoFc8ugLs12Ad0a6AuzXZTmjujXQF2e3YNe39nl0BdmuzRA3wB9DfAH0AHwB9DfAH0pLx8AfQ3wB9AW0A0OaAaKYl2ZrMOyNZAKszWYdkayKNBZmsw7I1kDXlmazDsjWRSQWZrMOyNZABZmsw7I1kSAszWYdkayACzNZh2RrINdKszWYdkayBoLM1mHZGsggqzNZh2RrIALM1mHZGsgoFmazDsjWQCrM1mHZGsiQFmazDsjWQApBpGSDSJaBSDSMkGkB4ohKIaiGomKi1ENRHKIaiBNizYspxRsUSohw9AOJY4gOIEjiC4lDiC4gSuILiUOIDiApoBoc0A0UL1INSJ1LYSkfFtfWURlsapEikOjIztFMXvQ2LJ4sbF60Rao1dDXAF0NcM7R7Zmsw7I1kNCmgGhzQDQ0A+APob4AxKkF0a6Bu7nl2aShmSNkhWTNkzWVKpSDUyNSDUjSUVqe+jYz9kMZDVPRcqV8ansbGprpz1NjYzZco6EansbGprpz4z2NjP2aSs3QVT2NjU1058ZsbGbNJR0I1PY2M1Y58Zu42M/ZWi9T2NjIhjP2OUtHdFcZDVIkUh0ZFh0elEeE0elUeANgtlMVoTBFEFolQox2UwQEVsohEBkIlEVoCKKYx0VinsUNitAxW9DYoYCMYxKS5cFS6NlwVLoE9RrZBUe2WVHpkFR9CKlqv8Ak59V7ei6q9M51X/TDJHVZDUe3YrqvRDU6yipaj0ySoyioySb2GZMuCZdGy4Kl0BL4A+hvgD6B42A2ZsBsJZ8AfQ3wB9A8fAH0N8AfSgJjGA8szyzDsjWRTLXhjGBobM1mHZGsjR0FmazDsjWQANANDmgGikltANDmgGgBaAaHNANFMSbM1mMt6NYBNmazGWR5ZFI0OLNixuKNigaVizYsbijYop0GLNixuKNigFYs2LG4o2KJCbM1mHZGsgAszWYdkayBpVmazDsjWQNKszWYdkayCgWZrMOyNZAKszWYdkayCgWZrMOyNZAKszWYdkayJAWZrMOyNZAZINIyQaRLR5FDYrQMVvQ2K0AKiOjE0Y7HRiYqCohqI5RDUQEYs2LKcUbFEqIcQHEscQHECSURLiVuIqUQJZREuJW4ipRAnaAaHNANFAUw0xKYaZ8WvpHp7GxZPFjosyopi96GxZPFjosVooj0ZHgqI2PDOhi6GuALoa4cANANDmgGgEtANDmgGgJ5cFS6OkJl0DNgNmbAbLiTckbJCsmbJmkFCkGpWJ1IJSLlSrUtjoyIYyHKWjSUVqQ2MiGMhykVKlcpDoyIYyHKejSUVxkNUiSMh0ZGkqVcZbKIy0Qxlsoiy5RZF7KIPRJB7KYMQUw6Vw4SU+llPhYfBbK4IngiuC0FHQWyuCJ4IrgtFwNit7KYrQmKKILR0ZINIyQaQAvgD6G+AMJBKWiabGTZNOQCqsliQ1ZbZRUloiqy/olFT1ZaZzq0tsrqy0c+q/6DOkVOENR7ZXUeiKo9sOVJIlmVTJZhnU8uCZdGy4Kl0oJfAH0N8AfQPHwB9DfAH0JZoBoc0A0AmzNZh2RrI7jmlWZrMOyNZDDQWZrMOyNZFYnQWZrMOyNZDDXlmazDsjWRWGl4s2LG4o2KGGlYs2LG4o2KNWRGLNgNxRsUBO4guJQ4guJozIxNiNxRsUAnFnmLKcUbFFJTYs2LKcUe4gT4s2LKsDYAT4s2LKsDYAS4s2LKcUbFBSTFmxZVieYoCZxAcSxxAcSRM4guJQ4gOICcWbFjsTzFAJszWYdkayAVZmsw7I1kAqzNZh2RrIBVmazDsjWRKgWZrMOyNZAZINIyQaRyqexQ2KBit6GxRnQyKGxWtAxW9DYq4rQSiOjHRoxGqJnQOLNixuKNiiGhLiC4lDiA4gSSiJcStxFSiUJJLWxUlsokhUlvYE8lrYqSKJLQqS3sJSpBpGSDSPi19QUejoCY9HRMqHR6OgKj0bAVoogNjwVAbHhnQaQaRkg0jgBoBoc0A0AiS1sVJFEkKkt7AnktbFSRRJCZIBD4A+jGLfS4kJjGNASYaYlMNM5EnJhpiUw0zSUPi96GxZPFjYvWi5UqIvehsWTxY1PWi5RVBpsojLRDGWyiL0XKlVF7KIPRJB7KYs1lFcGV03ohg9ldNlQWQ6WU+EdMsp8NBdTK4cJKZXDgUph0rhwkh0rhw0goj0bHgqPRseANujXQF2a7AKTFSewpPWxUmEk1HokqS6OqS6R1GAqrL+SGpL+mUVJOxFVl/RKKVUlohqSV2UVJaZDVlvYZ1NN6ZJUZRNkk3sOUmXCWRTLhNLoZ0mS1sVJFEkKkt7KCGgGhzQDQC2gGhzQDQSW0A0OaAaAXZmsw7I1ka4y0qzNZh2RrIYaCzNZh2RrIrE68szWYdkayGGvLM1mHZHtvRWGgxZsWNxRsUdw0GLNixuKPcUHE+LNiynFGxQEmLNiVYo2BozSYP8ATYP9K8F+mwX6BNg/02D/AErwX6bBfpSUipu4Spv8LFTXQlTVgJPj9G+P0XYejfH6Aj+P0b4/Rdh6N8foDn/H6N8fouw9Gw9BSB03+Aum7nQdNW2gXTVwIXABwZc6foBwJELgA4MudP0A4ASOHoBxLHABxAjcQHEscAHECZxBcShxsA4gKaAaHNANALszWYdkayJUCzNZh2RrIDJBpGSDSFU9ih0UBFb0NijKhkVsdFARW9DYoVobEbHgqPRseGdBLoa4AuhrhDQDQDQ5oBoBMuE0ulMuE8ulBMuE0ulMuE8ugJlwVLo2XBUuhJSiEohqIaifFx9IKiOjE0YjlEYNFbHRQEVvQ2KM8Xp0UNitaAih0Uc8u69SDSMkGkc8u68aAaHNANHPJqeURLiVuIqUSscSyiJcStxFSiMEklrYqSKJIVJb2dCmgGhzQDQAroa4AuhrhpiXq6GuALoa4Aa6GuALoa4XEnRe9DYsnixsXrRcFEXsog9EkHspgxBRHpVHhLHpTHhrBVTZXTeiGD2V02VBdTe0XU2rHOp9RfTejSC6myum9ENN7K6bLlF1NldN6uQ03srg9GkoqjIapEikOjIJOyRskKyZsmAUpaJ5yClK6J5y2HKCb0SVJdHTkR1GGdJqMjqS6OqS6STewgioySbKJskm9gJlwlkUy4TS6GZEkJkrlEkKkt7AmlES4lbiKlE7HKnaAaHNANGkZ0loBoc0A0MNA+AvoT4A+jDQmMYrGesYxhhrGMYvDXiQaRkg0hhrJBpGSDSGI0CiEohqIaiMNJUQ8RyiGoGiUygw1AoUA1BARqnvgap/dixU10JU1YCJUPsNUEixUA1QAhXjoNePo6CobDXj2/Stdxzl4wa8Y6S8cNeONMcteMGvGOkvHDXjjTHL/wCb2b/m9nV/5/TN/wA/pjXMcr/m/wDDf83/AIdT/nX4/wD9G/51+P8A/ROu5XIfjAPxvR2H44D8YaY5EvHXoTLx9nYlQ0Jl44McyVBfiFSoI6joMVKh0OY5cqeuCpU3fZ1JU1+CZU1fgMrnSp+hTgzoSp64KlD0DEThrgqUS6UPQlx2BI4guOyhxBcQJXEFxKHEBxACzNZh2RrIAUg0jJBpEqaPRseCo9Gx4A2I2PBUBseGbY+L3obFk8WNi9aAddGugLs12SobYDZmwGwAkxUnvYUnrYqTAXJiZMOT1sVJgKlwTLo2XBUuhJqiEohqIaifFx9QKiOjE0YjVHQweKI6MTRiOUdHcc16o7GxiaMR0YnMNCosNRHKKDUSfK9TYs2LKsTYoeTUbjoTKJdKHoU4b4Rikco6J5ROhKHonnDYwQyjoS4lkoiZR2QJXEFxKHEFxAnszWYdkayNElpBpGSDSA9XQ1wBdDXC4kyPRseCo9Gx4VA2PSmPCaPSmPCoGx6VR4Sx6Ux4aQVU2VweiGD2VwZUFkGV02QweyuDNIL4S4V05aOfB7K4SOSi+DKYyIYSKIvRpKLFLY6MiGMhylo0SfkjZIVkzZMD1yEykaUhLkHK8m9ElRlE2SVHsMqnmSyKpcJZdCU010mlHZdKOieUdgRuOhMol0oinDfAzQSgxTgzoOCFSh6AhcdCZRLpQ9CXGzEcqSUdCXEscdCZRNYzqSS1sVJFElYVJb2aYz0t8AfQ3wB9O4aB8AfQ3wB9KxnojGMMc1l0NcAXRi4Vhr1INIyQaQw0KjsbGJoxHKOhidBGI5RdglHY6MPRzDSlBjY0/Q6MPQ2MEdUQqOw145TGi7lMfH0BFHxtjY+MXx8b7HR8bXAOcvGGx8U6UfGGrxvQHPXi+hsfFOlHxtjV4vonWuOTHxPQ6PiejqR8X0Oj4noaY4q8P0GvD3ex2l4noNeH6GmON/yP8N/yP8O1/wAq/Df8q/BpjiPxQP8Al9Hdfiegf+T0TpjgvxfQmXi9PoJeJ3QmXi+hpjhS8US/FO6/GFS8Y0McKXja4TS8fZ3p+P8A/CafjbBjjS8dW4TS8fZ25ePonl47Bjjzpv8ACaVPfDsSp2XCadJAxzJ0/RPKGzqSp6J501fgZOe4a4KlAulETKIETiC4lDiA4gTOILiUOIDiAFmazDsjWRKni6GuALoa4CHphpiUw0zNsepBqROpBKQDskbJCsmbJkqNctAOQDkC5AeuQqUjSkJcgNJipPewpPWxUmAD4A+hvgD6Eugoh4scohqB8zHuBGA6MGEoq46MPQwLjAfGn+hwpoojDRzy0KjT2UQp+g401fZRGnoeQhQY2NP0OjBDVBHPKkvxm+Ms+M3xjyIJU/QqUDoSgrCpQ9Gd5UhnT1wmlT9HTlT0TzgjO8jmTp+ieUNnUlTJpwX4dsHPcRMol0oiXHZnYJHEFxKHGwDiUE4s2LG4o2KA8SDSMkGkUl7FDYrWgYrehsUBoLZTFaExWyiC0aQMgtlEVoTFbKILRrAyPSqPCWPSmPBBTBlMHojg9lMXo0grgymEuEMZbKIysdg6MJbKIz1058J76URnouC1S2OjIhjIapF6lVkjZImyZsmNDmwGzX0A2VrN5Jk8kNbAaGhE0TyhsraAcCUYicAHT9FzggHAGOe6bBdPfDoOCsC6a7YpFjnSoaFSoK51JUBUqAZ2OTOkyeVN3OtOnbViedNXLhXMnTdrpElSDvo61SGuElSCvo0jKubKOhMkXTgSTXS5EWpZLQqSKJIVJb2aSM7SXwB9GPgt9KxOiMYwxzXqQaRkg0i8c16ojoxNGKGqIw0UY7HRgzQjsqpwViqQuNN3KYU3YbGmrlMaasZ1pCYULspj46twZTou6LaXj6O2uSJoeNYqh42iqn42yuHjejO1pIgh4uyuHjaLIeL6K4eLrhOqxzYeKUQ8X0dKHi+iiHiejmmOVDxH+D4eI/w60PE9FEPEOa0xx4+H6Gx8T0diPiehsfEOaY4y8P0GvE9HaXieg14nonV44f8Ay+jf8vo7n/L6N/y+hpjgPxH+APw2fQPxPQD8Rfg0xwJeL6Ey8Tuj6CXiehMvF9DTHzk/F9E8/FPop+KTz8UajHz8/G1wkqeMfQVPG9ElTxtsaY4E/HJJ0Nnen4/oknQ9F6nHDnQX4SToK52qlB2eiSdAaY486bJZ0nc7E6StwknTR3U45cqbtonlT2dKcCedNfR3THPcdCZRLnATKCK1OInEFxKHEBxOaYQ0A0OaAaJ0xjGMNMEuGMYhqO6NdAXZrsBmSNkhWTNkwGuQDkA5AuQBOQDloByBcgPGwGzNgNgZsBszYDYH0aiOjHRoxHKJ8/HuDGJRGGjRjsohDmhgGECmMH9oKFNfhTCn6O+WhMabvtFMKb+x0KSv9lMad1aw8ieNBDY0CqNAbGg7DypD8T/DfE/w6HxL8N8S/B5HOlQFSoI6kqDsKlQMrypyJ0nuy0TypO/DsSpK3CedJbM7yOROm7Ek6bvc7FSkiWpTRNg5Mqb+kIlDZ05UyacEZ2CBw1wVKJdKIlxJEeLNiynFGxQC1HYSiGohqJSS1EdGJox2NUQPFEdGJoxGqJpB7FDYrWgYrehsUawex6OiJj0bHggoix0WTxY1PRpBTGQ5SI1IdGR2CyM9lEJ82c+MiiEtFwXxmOjIhjMcpaOalUpBqROpbDUhocuhLgC6GuF6zA0C4jUg1HQ0whRf4b4pFEYehqpnXcRuj6QL8cuVHf2GqD/AY5v/ADm+D0jpfB/6b4P/AEpFjmS8cTLx9nYl4+hMvHDOxxKlJ3eiSdJqT0dydJYvRJUpLei4zriVKeuENSm760dyrTVuENSn3RpGVcepB2I5xOvVgrcOdVjt6N5GFrnzXSaUdl046J5LZpIztTNANDmgGi8ToEg0jJBpDDWURsY6NGOx0Y3KxGghB34Vwg7cNTp8uiuENcGGgp03cup03+Gp01daLqVNNE1rAU6CbLIeNpDKVD+joUvG0jOtInp+NZp2Lqfj6HU/H2XUvG0tEWrkT0/Gsy6l4uuFNLxeasX0/F0Z2tJENPxd8K6fi6Wi+n4u1osp+LrhGqxz4eL6KIeL6OlDxfRRDxPQ0xzYeJ6KIeL6OlHxPRRDxSdaY5EfE9Do+L6OpHxV+IdHxRruOOvF9BLxPR2F4voL/lX4TruOR/zf+G/5v/Dr/wDMb/mGmOJLxvQp+Mdx+MKl4w0xxJ+N6J5eOdyXjk8/G9DTHCn42iSfjH0E/GI6nj7Y1zHBqePZENTx9n0FSh25DUoXY0xw6lBJENSirs7tSi7MhqUL3K1OOHUpPeiGpSdzt1KaS4Q1KfdDTHFqU+6IalN3O5UppIhqU+6K1GOTODtoknB34dadNW4STgrjTHNnB/hPKGzqShomnBbsXqcc5w1wVKJdKHoTKI0xE4guOyhxAcSNMIaAaHNANDTAtANDmgGjroTGMB62A2ZsBsAmwGzNgNgZsBszYDYGbAbM2A2B4YxgProLZTFaExWyiC0eN7BwWyuEdCYR2VwWgGU4bK4Q1wGENorpw9HcU9p093sVwp64anTWrorp01rQwKjTbHRpuxRGmh0aaS0isaI/hN8KOh8LN8LA50qTEuk/w6zpL8EypL8IsU5c6KJJ0Vds7E6LxuSTo7M7Bx6lNklSk9nYnSX4SVKaMrBxZ03snlTbfDrzp+iaVNXMrBypU3bgmVN34dSVNNCZU0Rg5uD/AE2D/SzBHmC/RglUGGoFCgGoIYJ1T/EGoFCphqn6GBCiGojsPQagXAtRCUQ1ENRNYFJBpGSDSLS9TDTEphpgOjIapEikOjIoWRkujVIkUh0ZaApi9lEHokg9lMXoKPj0ojwmj0pjwB6DUQI9KIxL0eqIag/wOMSiMDuuYWqSDVBD4Um5FEaAZ4kVJ/iGxpP0Vxor8HKkvwGIvgR78K/C/wCFm+FnYVy50F+E86FtnYnQ0TToP8LjKuPUoWTIqlFXO5UouzIqlDbL5ZdOD5FNnO8iGjueRT9HO8mmrHo5YVxKsP54c+tH+jsVo6Zz6sd3sbSMenMqR0ySSOhVjoklG9zSR5+kbjsBx2UOIDiaYkmMRygEo7HRgMC6cHfhXCm7cNTgrldOnrhTkDCDuWU6T1o1KCyWjo0qSstGdaQFLx02dCl4/wDK0FSof0joUvH0jK1rICl421o6FLxtLYyl439I6NHxtLRna1kKpeLtHRo+LZcHUfG3w6NLxbxRla1kTUvG2XU/G0tFVPxtoup+LoztaSJafjFdPxeaLIeNcrh42idVIkh461pFEPG1wsh43ooj4+hrSRFHxtjY+MjoR8YbHxrIjV4568VBrxVc6CosNURpiD4Ub4EdD4Gb4GSY57oIB0d3Ok6DAdBgxzZePZCn450pU2KlT2DHJqUHYknQZ2qkdWsSTj6BjkVKTsQ1KTbZ2aiWyKoldjTHIqUmlwgqUndux2qiWyGoldjTHGqw/nhz6sds7FWKszn1Yf09DUY5FWGuENSG2dapFWZDVirjTHKqU9Mhq03c7FWCsQ1KauaeixyZ03ZuxJUpu/DrTp6bJKlNXud9M7HMnTZPKGzpShonnBFek450oaJ5wOhOHdE8o7HoxC4a4KlBl0oa4JcUTpiSUdCnErcV9CZRGmJ2gGhzQDQ1GFPgD6G+APo0wD4A+hvgD6Vpjx8AfQ3wB9GmAfAH0N8AfTrr18AfQ3wB9AExjFJfZx6VR4Sx6VQPG9iimtlcET00VwWkBXTjvRdTi7E1OK0X0o6NMUbTi7l1ODx4JpR3supxVhg9hD0URho0I7KIQ9F40KUGGqZQqYapoYI5U/QqVP0dBwQqVP0RYpy6lNkk6bvc7E6asS1KRnYONUpsjnTfTtTpfdiOpTRlYONUpeiWdN9OzUpLeiSpTV+Gdg5EqbtwU6bvw6kqd1wTKnvhlg5/wr8N8K/EdD4TfCMHOVD7DVFFioMNUBgjVJ34EqT/AAuVJfgSpK3Bgi+M3xlnxmwR2CHBmxK5UxMomkCmgGhzQDRaSzGMAxMNMSmGmUGx6Ux4TR6Ux4A+PSmPCaPSqPAo6C2VwRPTRXBasA2C2VwjoTTiWQjoaChDZXThoCnDZXTgNHkYMohTYUIIphT4aOYCNP0OjT9Dowv9DVAGEYP9Ng/0qwR7gjsZ1A4XRNUgdRwRNVgi4zrkVYaZz6sHdnbqwVno59WG2ac/WPTh+RDZzfJh6O15EDm+RHRvwwriVoaejl1o/wBHcrR/lnLrQ/p6PTzGPTlVYuxJKGzqVYKzI5QNZHn6QOIDiWOAGHo0xJGDvwbTgx2A2nTGDynTeW0W06elo9p09rRbTpJrhNcj2hQVi+hQNQoaSL6FB3sZ1rB+P450vH8fZvH8d2Ol4/j70ea16OYPx/HsdHx/G3wPx/GujpeP42zO1rIGl421o6NLxtIZS8f+kdGl438rRla1kIp+Ok0XU/H0hlLx/wCi6nQ0jO1pIVT8Yrp+MrDIU9ldOk7ErkTxoodGjYeqO+DVRC5E6gw1AoVMNQROrxPie4spxRsUNMIxZsWNxRsUdMTuIDiUOIDigYnlB2J5Q2VyeiacgYkqQ6SVIbLpy0SVJAxDUp90Q1Kd2dCo9MhqSs3oz0xzai07ENRdOhUV0yGotuw0xz6i07ENRbZ0KiVmQ1FvQ1OObUi7Mhqx2dSrFWIakVcaY5tSOmRzgdOpBEtSGx6rljmThpklSB0qkNcJJx3weqzsc6cHuyJpQOnKmrE86aL9JxzZwe9E0qezpyhonlTV9D0YglDRPOPo6E4+ieUNndcxA4iZRLpREyivsaYilES4lkoiZRO6nE0lrYqSKJIVJb2hphDQDQ5oBorXcKfAX0J8AfRrmAfAH0N8AfTVDGMYBZjGKS+0gyuD0QweyuDPDK9yym9l1N6Rz6bdy6m9K5pKOhS/0joUv8o59L/SOhS/yjsF1LqOhS4jn0uo6FLiNIKYLZXBaJ4LZXTWrGrQaiEohqOg1EBDiA4FjiA4oiwQSjomnDujoziTyirmdg5dSnq6RJUp7ejrVIKzaJKlNXdjKwcmdN/gidPukdOdP0TTpozsHKdJ/gLp74dF09cAdNdsybFOf8JvhOh8LN8LMrBEqAaoIsVANUBgg+FG+E6HwM3wsYOa6f3YB098Oi6euAOmulYlzpR0Tyhvh0Jw9E847GCOURLiWSiJlHZqJ2gGhzQDQAroa4AuhrgBwWymPBMVsoitAOgtlcETwRXBasS0NpxeRdTi7E9OKuXU4/yAynH+i6nF2J6cVcupR0UHU47K6ceCaceFdOOgGwiUwQuCKYx0IGwQ2yAgtjraLgG3o1mMsjWRcZVNNWRNNbK5rRPJbNYyqCutkFc6VcgrrRfP1h05PkLZzfIVkdTyFs5vkK56OfjCuRXjvhz68dM6tdbIK8Vs3jGuXOPokmtnQmtEk47NIzqPFmwKsUbE01hhEYbKIU3+DIQX4UQp+hpjylTdzoUqf8rQNKkrrR0KVJWRPVXzB+NSZ1PGpNvgvxqStw6vjUkvo8/VejmD8agdTxqCuK8egzq+NQ2ZdVtzDKNJ3WjqUaX8rQFGkslo6VGktaPN1W/MFSpu6OhSpvFaAo01fh0aVNYoyq5Awp7K6dPVzU6auVwpq1yK1kDGHodGISiOjEY1ZINIyQaQweW9HtmHZGsisCzGMMHj4A+jHwB9GMwSehUnvYUnrYqTsMCpPRPJjpPRNN/hyxoTN6JKkujqkukdRkWBVWSsQ1JK7Kaknsgqy2KpNU4yCo9llR6ZDUbuRRLUemQ1HssqPWiGo3clSepwjn0rnwkn0COa6TSiXSjonktnNZYilHRPOHo6Eok8obGmOdOn3RPKnvh0pQ0TzplanHNnT9E8qZ05UyaUENMc6UNE8490dCcO6J5wL1njmzjonlE6E490TyirjXMQSiTyjsunEnktndTiWS1tCpIokhUl+ndMSyX6KkiiSFSW9nYqkNANDmgGi4zpT4A+hvgD6diK8fAH0N8AfTSM69fAH0N8AfS3X1kGV03ohg9ldNnzZXuXU3suptaOfTey2k9Gko6tBuxfQ6c2hzpfQezWDp0ntHRpP+Ucuk/6udGlLSNIL4PZXB6IYPZXBmrRXAb9IVAb9IA3wB9DfAH07YFSWiea3oqmtE8lszsEslonnEulHRPNbMrBBOJPOHo6EoaJ5Q2Z2CH4zfGV4L9PcF+kWKRqm7hKn92K1TV7hqmrEWCNUd7DVEqVH/0NUdbOYI3T+7Aum7nQdPXAXTXbDBzZ0/QiUNnSlT1wnnBfheJc2pDV7Ek4HUqR1wjqQ2xg5046JJrZ0KkdEk47AnktbFSRRJCpLewAXQ1wBdGLgDILZTFaEwRRFaAogtldNE8EV01olooprZfTWiOmtl1NaApprZXTRPTRXTWihTTLKfCOHSuHAKoMpg9EkHsoi9CCiL3obFk8Xsano0ga5AuQtyBcioyryctE02HOV0yeUtmsZUmo9MgqPeiyo/5Iajd2Xyw6c+rxnPq/6Z0KvGc+r/pno5YVzqq0znVV/TOpVWmc6qv6ZvGNRTXSaUdl0o6JpLZpGdSuLDjH0OcQoQQ1OAhDfCuENcBhDZXTiNMHRg7rR06NP+eE9Gn/AEtHTowWJPVVzD/Gp+jq+NTf4S+PBWOp40Dz9V6OYs8aH6dLx4tk3jwR0fHh9GPVbcxXQhov8eDuIoQVjoUIGHVb8xTTWyuCJ4LZXTWia0kOj0pjwnj0ojwhcihMNMSmGmXijEw0xKYaYwFdGugLs12XgNyAcgXIByGAnLQDkC5AOQxmzkJlI0pCnIYBlImmw5vRPKXdnLGhVSWiSctsdUkR1JbM7AqrLRDUkrsoqSdiGrLZNUmm9MkmyioySb2Z0TVCOfSyfCOfSVESWiaa2VzWieS2BNKIlxK3EVKOzLXMTOOhMoei6URMofVhpjnygJlT9HSlD0JlBfhWpxy5wf0TSp7OpOHomnBb0NMc2pDXCSpDZ1Jw0R1IbZWs8c6cdEk47OjUjrhHOOxpiGS0TyjsulEmmul6jEUlommtlk0TTQ0xNJaEyRRJauKkt7NImkvgD6G+APppGdKfAH0N8AfTs+or18AfQ3wB9NIzrx8AfQ3wF9LdfSReymDI4PZTBnzZX0cW03vpdTasjn03tFtN62XKY6dKSyR0aT0jk0n/AEjo0pfyjWVbrUpf0jo0n/JyaT2joUpfyaSjp0ZLK5bCWjmUZb2XQlpFxK6MhqkSRkOjI0gfdGugLs12UCkxUnvYUnrYqTM6Fy4TS6Uy4TS6TQpoBoc0A0ZUKxZsWNxRsUTVFqIaiOUQ1EzoWohqI5RDUQEOIDiWOIDiBBOOuEs47OhOOiSpEnEVzqkdENSLTOpVjohqRV2MZ1zai0Q1E7nQqLTIai3opxNMT9sdMT9sDxdDXAF0NcJXDolUSWJVELiun1FtP6IafUXU/ol2K6ZZTI6ZZDgaRZTZXTZDTeyuDDq6D4UxkQxkURkBYpbHRkQxkNU9dKiKrUg1MjUg1P2aRnVTmgHMndQB1PZpE0yU/YmUwXITKRrGVDUl0kqSGzloknLZrGdT1XZMiqPZVVf8kVR7ZpGVR1OEdQsqcI6nTeVnYlkhMkUSQqS3sazsJSDSMlsNI7ekzkyK4V0lrhPFbK6S0Z3ppOVfjrR0vHX6c/x0dLx1szvTScul46Ol462c/wAf/wDp0vH00ZXprOXTo/6OlQ/yjm0eo6VHiM7Wki+m9l9N8OdTey6m9bMrWsi6DKYS0QwkUReiJGq2MhykSKQ2Mi5BWpBqRGphqR2RzVeSPckTZM2TNJDT8jZismbJjGemOQLkLcgXIY4JyAcgXIByKwZyEykaUhTkMATk7E02Omyab3oWL0io9ElRlFRklRmdhqeoySbKKjJJvZFipU00STWy6a0STRnY0lSzViacdl0o6J5RuzOxxG4gOBY4gYGdgicAHT/UXOCAcApC4AOH6XOADgBz5U3YTKm7nUlTTQmVNXDlcmdN20Szps7E6asS1Ka+gzrkVKeiKpB3OxVgkiGpTIkK5VWOuEFSL2depDTIasdvRrIzrm1I9JJrZ0aiI5rYkdtRVFokmt6LprXokmjSRnakktbFSRRJCpLYkLU8lrYqS2USQqS3s0kZ2kvgD6G+APpciK9fAH0N8AfTSRnQmMY1Q7celUeEselMeHxpX2cVU3tXLqb0c+m9l1N62aSmL6T2jo0v8o5lL/R0KL0jWVx06ctoupS1o5dKWy6nJ2NJR06U1fpdTkrHJpydy6nJ4m8S6MZbKIyOfCXsojPRpBWpBqRGpBqRQa5AOQDkC5GdHrkKlI0pCXImg7o10Bf2a7MqCXQ1wBdDXCaocUNitaBit6GxRnQaQaRkg0gAaAaHNANASVFoiqdOhUSsQ1FtlYioav8AlnPq/wCmdCr/AJZz6vWMZVFV/wAnPqvbLqr0zn1X/RInm9E8nsdJk03sAkw0xKYaZK4phIshI50HsrhLgaRfTkrl1OSxOXTl/RdTk7EkX05FdNnPpy2Vweg0jowlsohL2c+EmURloOr1LY6M/ZDGTHKTsBcpBqZGpB5eyoirM1+HvyEfyGzf4aRnVTmBn7EufsByNImnykJlIBz10VKRrGVacieT2FJ6J5S2axnSqktEk5bHVJEk5bNIyKqMkm9lE2STeytLCpMVJ72FJ62KkxrOwSYaYlMNMm9KnKiDK6bIab2VwejO9NJy6NKWzoUpaRyaT2dClL+emV6azl1aM9rezqUZ/wAo4dGTyR1KE9LZnemk5dqlP+ls6FKejj0pO6OhSn/PTlrsjr06iRbTmrHGpz30vp1HYi1cjowmv0pjPRzIz2UQmy5FOjGY6M0c+NT2OjNmsgtyDUiNSDUhIy1YpBqRGphqRpIaoyRskKyZsmdxwy/s10BdmuxgJsBszYDZWAZcFS6NlwVLowIlwll0qlwml05Y5qaaJprZZNaJpdM7DUU0yacS6cfsnktk2KlQTjdE8onQnDRPKOzOxpKhcAHT/UXOCAdMxsWg+P0b4/Rd8a/DfH6M7Bzvif4b4n+HQ+JfhviX4Qpz3QQDoHSdAB0AOZKgKlQR1JUBUqHQVxqlPT0Q1KbudypTSXCGpT3wMq49ensgr03Y7Vensgr09FSFcWtD+Tn1Yu7OxVhpnPqw29FyMq5NSLsyGpG0jqVY6IKkVdnZE2oKiJJrZdUWmSTWzSRnammvonmt6K5LRNJbEhaRLgqXR0uCpdNJGdoHwB9DfAH0uR2vHwB9DfAH00kZ0NmazDsjWR1DqwWymCExWyiC0fDj7R9PpZDhHDpZDhrBbRZbQeyCi9FlF7NpUr6ctl1KV0cunL+i6nJ2NJR0qc1+ldOascmE3exXCo7I1lS6kZodGprpzo1PY6NT2ayi9TDU0Qqf4GpnNFbmgHMndQBzZzRS5AOQlz9gOZFqj8jzJCsjZMztFMZDVIkUh0ZEaK4vehsWTxY2L1oaKIvehsWTxY2L1o4GNgNmbAbAVUf8siqPZVVf86Iqj2aIqLyHsgrvRZ5D2QeRwMqgqv8AlnOqv+i6q9M59V/0Skio9aJm9jqj0TN7A9lI0ZbEyZos5VSr4S3cohM58Z7KIz0RWkro057K4T105cJcLKc9ILldOnPZXTkcynMqhPQaSulGa+2URno5sZ7KIVGRhrpRmNjNHPjUY6M2MNWqfsNSI1MNSNeYzqpT9hqasRqQakaSM6oyPMkTZM2TNYU1yugHIByBcjSMq9nLRNJhyeieUtls8BN6JJy2OnIkm9gwM3okqS6NnLXSWpI7ejzS5SuJlLZpSEykZ3o8GZI9zX6S5M2b/Sb0qcroVPZRCpw5kZlMKj/TK9NJy69OpzZdTqpJbOHTqO5dTqaWzP0uR3qVVXR0aNWOPT52jWeXTo0qzstnPTSR36Vfa6dGjXdls+fpV1dHRpV9HJ0Y7lOqtbLqdVY9ODSrPLpdTqvRpKY7UazumPjW0cuFZfpRCsrIvkrqRqL7ZRGaOXCpvpTCo/tno5Z1ep7GxkQxn7GqR2RFVRlsapaJVIbGRpIiqEw0xKYaZOOGroS4CuhrgwBZmsw7I1kFEOIDiUOIDiBJKImUSxx0JlEkQzjonlE6Eoa4TyhsCCcGTTpnTlDQidNfhykc2VNiZU3c6kqaaEypq5nWsc90vsF03c6DpqwLp/djCwiBUnfgSpP8LlSX4EqStwzsaRF8KN8KOh8JvgZyrc1+PoF+P7Oo/H9gvx9mdHJnQRPKhs7E6BPOg/w65XGq09PRz6tJ5Ph3qtJYvpz6tPb0GdcPyIO/DneRA7nkU98Od5FNW4VI5a4PkR2c3yIHa8iC/Dm+RBNGkjO1xa8d8OfXjo61eOzn146LkZ2udUWiGonc6NRaZBUWzSRnakmtE01ssktaJpLZWI0iXBUujZcFS6MNC+APob4A+lYnS7M1mHZGshhpVmazDsjWRqnXbihsVrQMVvQ2KPhR9kcelMeE0elMeGkFEGV03pEMHsrgy5UuhCWyiE+bOfCfsohPRco6MJr9KIz0cyE2UQqO3TaVLpRqK/R0aqt05cajTHRqO3S5Req3/oarP7Oeq29hqsc0XfJ7N8nsh+T2b5PY0W/IbNEfyGzZFqlqn7DUiNTDyZnaLIvZRGWiGMiiMtE6LIvZRGWiGMtlEWNFUXvQ2LJ4sbF60VoY2A2ZsBsBVR/yyKo9lVV/zoiqPZoiovIeyDyHos8h7IPI4GdQ+R0grvRZXe/RBXJQlqvRI3ZlFVvEkkwPckbJCsme5MVMqiMh0ZEalsdGRnWsq+nLZVTmc2EtlcJ/z0KldKnUVyunNW2zkwqO6uyuFR2sGkrpRnsohP2c+E+bKIy0dw1ep76OjMhjIcpaO4arjIapEilsdGRpIVSpBqROpXCUjSRnTbo10BdmuzsKNsBszYDZpGdDN6J5PY6T0TTf4W5hc3oknK1x1SXSSctgwmoySct9HVJdI6kumF6aeQTmrE8p7NORPOfszvTvkbmv0B1CdzAdR/qIvSpyv+Vfo2FVfbOT8rv0dTqu3TO9LnLsQ8jZXDyHo4cK5XDyNWM/RI71LyNrZ0KXkO3T52l5B0KXkfyjnpcj6Kh5Grl9DyHc+foeRovoeRsqV3H0NLyNnQpV3itnz9Kur9OjSr6NZXMdmnU2tl1OosUcOnVbktltOppbN+WddeFTfSuFRW6cmFTa2VwqaWz0cs66MZbKIyIYS9lEHo1kRVsXu5TB6IYyKYM0kZ1VHo2PBMB0eE4DihsVrQKWxsUMAqIaiGohKJmohxAcSxxAcQJHDXBUoei6URLjskQygKlT9HQcEKlT9AcyVNiZU3fh1JU1YVKnvgrsc50LgOgdJ0PsB0GZVpHN+FHvwr8Rf8LN8LIsIiVD70GqC/CxUA1Q+zOxpEC8f2EvH0Xrx3f7DXj2/TOrc1+PoF+OdR+Pf9AdB+zKjkToL8J5UNnYnQ/9J50GdK4lan/L0cytSak+H0FaksWcytT/AKegyr5/yabvw5Xk03bh9B5MNvRyvJpr8NpGVr57yab/AA5fkx0d/wAqBxfKjZmkjO1xPIjs53kR1w6/kR2c3yFouRna5NRaIai2dCotMhqrZpIztSy4TS6VS4Sy6ViNIlwVLo6XBUuncNLaAaHNANFYnS2gGhzQDQw0JjGCdfQpBpGSDSPjvuvV0NcAXQ1wB0GURlZEiYal9HYlXGRRCpYhUg1Ut9mkHRjW2NVZnNVZDY1lb6LS6Srhquc1V/oNVxo6Crhquc1Vw1XJ0Xqt/wChqtrZz1W3sNVhovVQNVCFVPYaqGWtFqnvo6M/ZDGfscpOw0WwlvpXCWjnQeyunLg1S6LKIPRJB/pTFjRVF70NiyeLGxetCOUxcBmEuAzNYzqefCGfS6fCGfS4mofI6Q1y7yOkNcuMq5vkdIa5d5HSGuGbn1f8skfSur/lkj+wAbAbM2A2RitNjIcpL7JFLY2MjmGq4vZRCXshjLZRF6JxUroU57Kqczmwn7Kqc9dGNJXRhPfSuElY5tORXTnoSO6vi9lEZaIYSKYM0kNVxe9DYsni7jYvWi5EHR6NjwVHo2PDSQEYxi5EvHwB9DfAH00kCpvRPMdNk02K5IRN6ZJNlFRklR/ZlWkiarLWyGpLbKKknZ2IaktmXVJCKk9Es576HUnpkdSfTz9VpI9lNfomU/bFSmxMqm+nnta4qdRX6FCovZz3UChU9mdpjqQrldOu7HFhX/orhXXoarHbpeR/SOhS8jR87S8jZ0KXkfyhruPoPG8h2On4/kHzXj+R+HT8fyFc05+u19BR8j+0dOjXdkz52jXWSOnR8j+Ub8s679Kp/S2dClVWKODSqvJcOhSqaSuejhlXYpz/AKWy+nPSORTntF1OekejlnXUpy2iuD0c6nLZZCXD0RlV9NldN6IabK6bNIzquPSqPCWBVEihsUNitaAih0URQSiEohxjoNRIqg4s8xHYo2JlRM4AODLnBAOn6GqQuADg/wALnT9AOA0c9030F098Og6euAumu2J1TnfH6Nh6LsPRvj9DRB8T/DfE/wAOh8S/DfEvwi1cRKh9hqgWKg2GqH2Z2tIjVJ34EqT/AAuVJfgSpK3DOrc502A6b+0dF09cAdNGVHJqU2STpu52Z0uuxHOnsRyuJ5FN/hy/Jh6PoPJp+jleTTVuGsZ18/5UDkeTDp9B5MOnH8qJrGHT5/yonF8uOz6Dy49OL5UfRpGdcLyUcryVo7HkrZyvJWjWRFrl1V/LOdVX9NHTq/5OfVW2aSM7UMyea2VTWieaGME0uCpdHS4Jl0YBfAH0N8AfTQBZmswrI1kAFmazDsjWQS+lt6NZjLejyyPhv0ADGMB6mGpCWwXI7Eqc1+HuaI82b5DSC5VEEqitpnPU3cJVPZzUr1WCVbWyBVt7aDVb2houVYNVvo56rbDVb2iNHSVRBqorHOVTfQ1Udho6MZ+x0ans50ZsdGZnrR0oz2URkc+E+FEJaGjoU5K5dTl/Jy6ctl1OTsNUugyuD0Qwe7ldNjRTHpVHhLHpVHhpHKJcBmEuAzNYzpM+Ek+lc+Ek+lxNc+utkFc6XkdIK60XGVcuutkFfh0q/SCutBm50+EM+l1T7IZ9ARLgqXRsuCpdGJ16mGmJTDTGGnxeymL0RweymL0TipVMGV02Qwe7ldNjGkq6myuD1chpvZXBnZHdWQZXB6IYPZXTZchqmPSmPCaPSmPC5HT49Gx4Kj0bHhpICMYxciQy4Kl0bLgqXTSQJqcJanSqfCSZnVyJ6j02Q1Xt2LKj0yGo93Mq0kR1X/LOdVe2XVXpnOq/6Z5uqSJastENSSuU1JaZBVl/Wzz9VpIXOZPKezTlonnP2ee1rg5VEaNQllUf20eRm/0ztMXRqq5TGqrdOTGo79KIVGNVjr0qzvw6FKq8Ujh0qqysdClWVjumO749RI6fj1Evs+eoVL7udPx6r9G3Ka+g8eojpePU9nz9Co/06Xj1Hc9HLOvofHmv06Pj1PZw/Hqezo+PNno5ZV3KE9F9CVzj0JnQoT2j0cs3XpS/rp0KT0jk0pf0joUpfyj0RlXSpPZbS4c+l0tpM0jOrYdLIcI6ZZTIoogtlMVoTBFMFoiglEdGJoxHKJnVBUQlEYohKOjOheLPMSrFGxM9UkdMB0/Rc4IBwGiN0/QDp+i5wQDp+idUkw9Gw9F2Ho2Ho5oh+P0b4/Rd8fo3x+ibVxIqbuEqbLFTVwvjVuGdrSJfjNgyz4zYL9OLRSp+hUoO50JQVhUoejOjm1Ia4Qzjs69SGmQVIbvYRyuP5MTl+TH0dryY7OX5KNYzr57yo+ji+Wts+g8uOmcXyomkYdPn/LRxfLR3PLXTi+Xo1n1nXD8pHI8pfp2vKRyPK4ejmMLXIqrT2c+qv6OnVX8s51VbZrIztQzRNNbLJommhiE0uCpdHS4Jl0YAaAaHNANALszWYdkayAVZmsw7I1kEvrJLWxUkUSQqS3s+Fj7xUuC5dGS4Kl0YFsByQUuE8pGqNNc0DmhLkA5MGqM0bNEnyM3yMJ1SqgamiFVGGqgNWKYamvohU2GpkVMdGNT2NjNHPU2NjNmdaR0YyVyiE9I58J82UQlohUdGEtllNnOg9orhLgax0ab2rl1N6OfTe0XU3ooXU3suptWOdTey+m9AUx6VR4Sx6VR4axymxNI0TSNYzpE+Ek+lc+Ek+lxNQ11sgr8OlX7cgrrRcZVya62QeRw6NfpDXWv/AIUzrnT4yKqW1OMhqhnU0uCpdHTEy6dweGXTGGBsejY8FR6NjwYpRDpXDhJDpZTGCqmWQ4Rw6WU+CRpKqh0sp8JKfSunw1kaSqYdKo8JYlUCpEnxQ2K1oCKHRRpINZmsw7I1ka4EyWtipIokhMkMCJ8JJ9LKhHPpHXxciOr/AJZz6vWdCrxnPq/6Z5umkiCtw5tb/TOlW/yzm1v9M8vfxciCrxnOqv8Apl1V6ejnVX/TPH20kS1paZJKWx1WWmSSezCtAzkCpATkApGdFOe+jqc/ZDnsbCVxB06cv6LqclY5MJbLqcniaQdjx56Ol48/ZxfHm7dOl483c15TY7vjTOp4019HD8aZ1PFns9HDOx3PHmdTxpnD8aT+jqeNM9nKbHa8eWjpePLfTj+PLXTpeO9no5Z2OxRkrrZ0aT/lHJpP+kdClLSNowsdSk9o6NF6Ry6Ts0zo0n/KNIysdCn9F1PiIYfRdT+iKKoLZXBE9NFcFozobBbKYrQmKKILRlaqCUdjYx0aMdjVHRna0gFEJRDUQ1Ei0T4s2LKcUeYoztE2LPcH+FOBsBavEuD/AE8wf6WYL9N8ZnaYl+M2DLMF+mwX6ctaRMoMNQKFANQRna0kSuHoBxLHEBxJ1xNKImUSxxEyiNHPrLZB5K0dKstkHkrRURXJ8lHI8lfp2vJX6cjytGkZ1w/M4zh+Z9nc8z7OH5n2bcsunB8z7OH5Z3PM+zh+Wejl5+nG8rhyPLOv5XDkeWaxlXLqf5Zz6vWdCp/lnPq9ZpGVST4ST6Vz4ST6UkmXBUujZcFS6ADQDQ5oBoBdmazDsjWQAWZrMOyNZEj62XBUujZcFS6fHx94iXCaXSmXCaYwBJ60TSex02TSe9BhrxyFSkaUtCXIGictAuQtyBcthOnZI9yE5GyYNUKQakTqQalsiuxbGQ1SJIyHRkZ1rFkHsrpvSIYPZXTelchUX03tFtN6OfTe0XU3o41nxfSe0dGk/wCUcuk/6R0aT0ixfTey6m1a5z6bd0XU3oCuL2UwZHB7KYs1jlU5I2SFZM2RpGdezeiSch05aJJy2aRNS13sirvRVXf9EVZ3RcZVz6/SGu9Fld7IK7KZ1DW/yyGZdW/wyGYZ1PMTLo6YmXTXB4YxvsYGx6NjwXHo2PBij4dLKZJDpXTGCun9FtPiI6fUW0+I7ISqILZXTRPBbK6a0i5GkqmCKYITEogtFyKOj0bHgqPRseGkgKzNZh2RrI1wDJa2KktlEkKkt7GESTRJUVmXVFokqL/9GHTfmIKq/lnPrL+jpVV/Njn1Vs83TSRy/IRzvIWjqeQtnN8hHm7+Lkcquc2vxnS8g5vkcPF20kQz4Qz6XT4yGp1mFCJvQq+wpvQq+zOht9jYP9J77HQdhBZTey6m1Y51N7Lqb0aR10/HejpeOzl0GdHx2a8u2Ot4zOr4z2cfxmdXxmejhnY7HjM6vjPejj+K9HV8Zns5TY6/jvXTpeO9nL8d2R0vHez0csrHX8d3R0fHezl+O7Kx0vHezWMLHTo/7R0qPEc2j/pHSo/5RrGdjoUv9Ivpf5Rz6XUdCl/lEVmrgtlcET00V01pGdFMEUxWhMPooitHmtVDYrY2K1oGK3obFGdrSMohqISiGokWgMWe4sbijKKuZ2kLwNgNUdHuKFreQvA2A7FGxRnaYVizYsbijYo5aQGLNixuKNijO1pCXEBxKHEFxJ1xNJaJprZZNaJp/Y0c/wAjpza50q/Tm+QbRFczyWcbzHs6/ks4vmPZpGdcbzHo4fmM7XmPRwvMNuWXXxxfLfTheW9na8x9OH5b2eiPPXJ8p6OR5Z1PK4cjymaxlUFT/LOfV6zoVP8AJz6vWaRlUsuE0ymXCaZSSH9i30Y/sW+gC0A0OaAaAXZmsw7I1kAqzNZh2RrIkfVyYqT3sKT1sVJnyX29Km9E8nsdJk02DSZvRNJjpPRNN7DAuTFSe9hSetipMAHwB9DfAH0keroS4AuhrgBR6NjwVHo2PDlXDY9KYcJo9KYf5M60iimWQ4R0yuHCCLKfUXQ+iGn1F0OINYupvey2m9LZz6b2W03o7FOhCXCynLhzoS2Vwlw0g6EZjoz9kMZsapaOyOWrVNGlNEqmzxz9mkjO02dRWJ51FvYEqjt6J5zNYi15UlpkNSe3sdVnrpDUltmkZ2p6sl9kVSW2UVJOxDUlsRlU1R6ZJUZRNklR7NIilSYqT3sKT1sVJlpZdDXAF0NcAOPSmPCWPSmPCZBRDpZDhHDpZDhcjsV0+otp8RFT+i6n9HZGimHSynwjh0rp8NZHdWQKY8JoFMeGkgfHo2PBUejY8NJAxdDXAF0NcKqoBoBoc0A0Z1rE9REk10uqIkqIjtvEFVaZzqq/pnTqrRz6q/pnj7aRy/JWzleStHY8lbOV5K0eXv4qORWX8s5lZf0zrVv8s5lZf0zxfo1jl1lohl06FZfyyKa2YVxLMT9sdMT9szo32h0BP2h0CI0VQ6XU/ohh0up/RpB0KB0qHTm0DpUDfmox0/G+zqeN9nL8b7Op432enmmOp4yOr4yOb4y0dTxkb81lY6njnS8c5tA6VBcPTzWdjq+Oro6XjrZz/HWjp+Ot9NZWFi6iv6R06K/k59Ff0jp0V/JpKzsdCgtF9BbI6C0X0Ok2pxXTTuXU1okprZbTSsZ2uYdBbKoRFQW0VwjowtTINRGxiaMRyiZWtZGUQ1EJR0Gok2qwtRDUfoNRCUTO0wrFnuLG4o2KItaYDFnmLHYo2KM7TCsWbFjcUbFDWpdmazDsjWQ0BLgqXRsuCZdMwmb0STZRNklR9NIyqDyHZnN8hnQ8h7Ob5D0axNcvy5aOL5UvZ1PKl7OL5cts9HLKuR5kjh+ZLbOt5ktPZw/MkXzGNcjy5ezi+XL2dTypezi+XLZ6OYyrl+WzlVzpeWzlV3q5tGdRVPshn0uqfZDPpcZVPMll0qmSy6ElNANDmgGgEtANDmgGgBszWYdkayAVZmsw7I1kB9DJipPewpPWxUmfHfX0E3onmx0nomm9g0qXCWXSmXCaXQgqXBUujZcFS6AqzNZh2RrIkLSDSMkGkB4ojoxNGI1RFXGjHZRBOwMFsohHRlWkFTWyyEdCYR4VwWiCGwWyuC/SeC2VwWg1iinqRbTeiKDKIO1jsUsg9lcJkMWOjI0g6CnoNVCFTDUzSRlasdRW6C6i/SR1HwX8m+msjO1XKprpLOqhU6j/AEnlUf6dibR1KurXJKlRATqP9JZ1HfppGVr2pUW9kk5q7sapUdiSpN3EcrSkTzaClInnLZpEULYDZmwGy0vV0NcAXQ1wB0elMeE0elMeFSCiHSynwjh0shw0kFcOldMjp9LKYkVqqmWQ4R0yyHDSQ1XBlMGRweymDNZGiuLHReieLGxf4aSB66GuALoa4cqoz4A+hvgD6ZVrC5okqIumtElREdt4gqrTOdVX9M6dVaOfVX9M8XbSOX5K2cryVo7HkrZyvJWjzdqji+QjneQrI6nkLZzfIWjx/o1jl1FrRDUTudCotMhqLZ564jmrCbbKJoVbZnQFtjoK4FtjYL9IjRRTTuXU1ojprey6mlbRpBb460dPx0c/x1o6VBWL5ruOl4yOr4y2c3xlo6vjI9PNMdPxkdTxkc3xkdTxkb81lY6fjLR1fGRzfGR1fGR6OazsdHx4nR8dbI/HR0vHjvhtKwsXePHXDpeOiPx0dLxo7LlZ2LqEf5L6Ed8JaEdF9CP9HLU4qpx/oupx0ienFXLqcdaMrTDILZXCOhMI7K4LRjamQaiNjHRoxHKJlauQKiGohqISiRavA4s2LG4o2KM7TA2ZrMOyNZE2tMeWZrMOyNZGdpgLM1mHZGshrpb4A+hvgD6NHk3omkx0nommzkcpFV/yc+rL+iqtLTOfVltmsZ1J5Mlc5fkzLPJkcvyZu3TXlNc7y59OL5UzpeVM4vlz6ejllXJ8qfTi+VM6Xlz6cXyp9N+YxrleYzkeQzpeXL2cjyJbuenmMq5fkvZza+0X+U9nOrPR2M6jqEc+lk+Ec+lxlU8kJkiiSFSW9hKZoBoc0A0AuzNZh2RrIBVmazDsjWQAWZrMOyNZAdWTFSe9hSetipM+S+oCXBMujZcFS6AqXBUhsuCpdAQ0A0OaAaARizYsbijYokCo7CUQ1ENRA8jEcohRiOjE5Vx5CGyiMdGjHZRGGuGdaR5CHNFMI6NGKuURho4t7CJRFaBitlEY6A0VYojwBINHIGJ2Y2MhJ7c0gcpew1MmctAOdkXHLVLqJCpVFfpO6jt0TKo2zSM7VEq2ieVZ3YudYmnWVyoi06VRW6TyqK4mVV2J5VN9NYztMlNE86i2BOp7ETqbJjMUp+xLlsFyEykaQMyVzzJCsmbJiJOi96GxZPFjYvWjSCiL2UwZHB7KYHeRbTZXB6Iab2VwZpBZBldN6IYPZXTZUUugyuD0QweyuDNYK4Mpg9EcHspgzTSK4sdFk8WNT1o7q4rTDTEphp6OWtYa2A2ZsBsztax5J6JpsdJ6JpvejzdVvE1Z6OfVe2y6q9M51V3kebqtIg8g5tfh0vI6c2vw83VXHHrnN8jh0q/2c2v9nm6rSOfPjIan2XVPshqdZ5K6kqITbZRNaFW2ZUD9odAT9odA45FEOl0OIhh0thxBrHRoHS8c5vjnSofRtzVOr4yOr4y2c3xlo6vjLZ6OaOp4yOr4y/Tm+Mjq+Mj0c1hY6fjROp4yIPGR1fGSPRzWdjoeNE6vjI5/jROr40TXWVizx4P8Ol48dkvjxR0vHiNZ2LPHj/J0KEd8JaES+hH+ibWWKqcf6LqcXZE9OOy6lGyM7TD4x4UQWgIIphExtMEojYx0aMdjlEztMCohKIxRCUTO1WF4s2I3FGxRlaYCzPbMKyPbIa1BZmsw7I1kNC3wB9DfAH0keSYqT3sKT1sVJ2AXN6JKkujqkuklSV2XIipq8yCvPQ+vPZBXno0kZ1J5VS5yPKmizyahyPKqG/MRa53l1Di+XUX6X+VUf6cXyqj+2ejmM7XP8uZxfLmdLy5+zi+XPp6JHmrm+TLb2cryXov8mRy/JkzSRnUNd7IK70WV3sgrmyKllwml0olwml0IpMlrYqSKJIVJb2HSHEFxKHEBxATizYsbijYoOYVizYsbijYoGFYs2LG4o2KBg3wB9DfAH0+S+mB8AfQ3wB9AW0A0OaAaAncQXEocQHEBOLNiynFHuKJCYxGqGg1HY6MQFxhsohB/aChBFMYaFXC409lEYO20MhTX4URpmVaQqMNlEIP8ChBfhRCBxYFBjYwY6MBqggEqISQ5xBcTkCrHg6URUtGkC2A2FLhPORcZWtOeieU9mnLRPORpGdrTn3ZPKWzSk7E8pFxFopz10nlPZpS0Tzn00jO17KfsS5bBctCZS2TA1yBchbkC5GkDFIJSJ8thKQiT4vehsWTxY2L1o0gqiyiD0SRe9lMWd5FcGVweiGD2VwZpBbCWyuD0c+D2VwkVFLoS2V05aOfB7K6cuGsF0WiiMtEMJFEWNIti9lMZaIYyKIy0NXFSkGpE6kGpC1tFLkA5AOQLkZWtI9lImm1sOT0Tzl08/VbwirLRDUkrlFSWnZkNSWzzdVpEnkS2c7yHos8h7Od5EtHl6q4g8h2ZzfIdkdDyGc3yGefqtI59YjrFlbhHWMK6mmJ+2OmJ+2ZUaPRseCo9Gx4cch8Ol0Pohh0up/Qax0PH4dKh3/6c2hz/AOHSod/+lc1Ts+MdTxunL8fn/wAOp43T0c0dfxl+HX8U5finX8Vfh6Oaix1vFR1/FVjl+Kjr+Kt6PRzWdjpeNFnU8aJB4yOr4yRrrKxf48dHS8eOyPx0dLx47Gs7FtJf0joUo6JaUdrR0KS0iLWeKaUd6LqcdbJ6cVcupR0Z2uYbCJTBC4IpjHRlaYOKsNitaBit6GxRnaY8SDSMkGkZWqwNmazDsjWRnaYVZmsw7I1kNdLfAH0N8AfRo8kxUnvYUnrYqTKHkpaJ5PYUnonnLuwAqVNENSpsZUnpkNSps2kRSfIns5vkVFYf5E3c53kT102kZ1F5VT2cfyqiX3cq8mq3fZyPKqP9NuYwtR+VUTucbyqhd5VTXTjeVU9np5jO1z/JnvbOX5MizyZnL8mdum8jKud5EtnO8h6LPIlc5vkS0aSM6lnwjqdK58JKhSKikv0VJFEkKkt7CKQ0A0OaAaDpWLNixuKPcQJ8WbFlOKPcQrE+LNiynFHuIMTYP9Ng/wBK8F+mwX6DHOMYx8t9AD4A+hvgL6B40A0OaAaJCsWbFjcUbFACohKIaiGokqhcIbKIxdjRjsojDQawMKb1cohTYcKa0UQp8JI0IMohB/aChBfhTGAaQuNPfCiFP0HCC/CmNPXCXSFT9BqBQqYapq/AEOmA6foudP0A6ZTlRyhonnDZ0Jw0TzhsM6gnHRJNbOjUiRzjsqJqGSsTyVi2pHRFU1I0jNLN6JJsoqMkm9lRmXN6J5vY6T0TSe9GsRQNgNmbAbOpeX9mv7F3ZrsBiYaYlMNM0SbF70NiyeLGxetAUReymD1sjg9lMXorlSyEtldOWjnweyunLhpBZCWyunLRz4PZXTlw11S+DKYSIYSKYMaLoMpjIhjLZRB6KtVFsZbHRkRqQ6MjO1pFqkGpIjUg1InrpfMUuYDnvonN/oDmYddPRzDpVFbRNOp3YM5+yaczHrpvHlSaIasv66Oqy/khqT/o8/XTWEV57IK8/wCWOrz/AKIK89aMLVpqstM59WX9FVWX8nPqv+jK0T1XpkknYoqt4kkn089CH9i30Y/sW+mVGfQ4APocDqlEOl1P6IYdLqf0B0PH4dLx+nNoHS8fpUi9dfxeHY8U4/i8Ox4ppIa63idO54hw/E6dvxeHp5Ta7PinY8U4/i9Ox4p6OfjO11vGR1fGWzm+MtHV8ZbLYdOp460dLx1s5/jo6XjrYZ10qXUdClxHPpdR0KXETUraf0XU/ohp/RdDhn0KY9KY8Jof6KY8MKo2PRseCo9Gx4ZUEuhrgC6GuGY10a6AuzXYGbAbM2A2UDchMpbNKQlyAKUieU9mnLRPOYkdteVKmmrklSpt7NUqaJKlTb2aSM7Q1azxZzqtZ3GVa6tw59WssmbcxNpfk13dnL8mu7DfJr7OV5NfR6OYztT+VUT+zkeTVX6VeVV9nH8qpvprzGVqXyans5Hk1CzyahyPKn7PRzGdqbyJo5fky0VeRU3059eV0bRlUNR6ZFVe2VVHoiqvbL5Z1NLhLLpTLhNLoQTJa2KkiiSFSW9gIszW9B2RrIl3AKISiGohqIMJUWGoeh2C/A1AKxMoMNUyhU/QSpoGJ8H+mwf6WYI3xjVY+YujXQF2a7PmvWIxjACYxiR4kGkZINIDyKGxWtAxW9DYolcexjsoitAxWyiMdBpDacdlVOOhUIldNaJIOEdlUIaApw2iynD0GkeQpu/CuFPV7GhTV72K4U1bhLpEad3wdGnrhRGmrjo00lwCF03+AOnvh0XTVgXTXbFOVzJ0nbhNOn6OvKnq1iedJbDOuROnrhDVg7nZnT6Q1aeyomuRVj/PDn1YvI7FWP8AJz6sP6ejSM3LqLWukFRbOjUWmQ1FvhUZ1FNE81srmiaS2axFIlwVLo2XBUunUgMYwBJhpiUw0zRJsXvQ2LJ4sbF60BRF70NiyeLHRZUUrgUweiODKYvRpBbBlMZEMZbKIs7ql0JbK4PRz4PZXCWhoug9lEZaIYyKIPR21UWxkOUiNSHRkZ2tIqyR7kiXJnuTMuum/MOcwHP2JcmA5nn66enmGSnomnNfoE6ndk8qmzLrpcarUVukVWewqlTRFVm79PP100gak07kFWe7Dqs3j0hqSdzO1YKktENSW3YoqSdiGpL+iLQmb/CabHSZNN7MqFvgt9DfAH0yoy6MX0LXRi+jqlFMshwjplkOAX+Pw6XjdOb4/Do+N02kc11vFOx4vTj+KdjxTSQ12vEO14rOH4r2drxGa8ptdzxWdfxX+HE8VnY8V3PRyztd3xno6vjPZx/GZ1fGey0V16L/AKR06L0jk0HtHTovSDOupSltHRoy0cmk9o6FGWial0qcuFdOWjnU5FkJaM+hfGWyiEvZz4T2URk7GFUvUg1IjUg1IyoqUg1IjUg1IzFLkA5CXIByAplIS5bAc9dFSkUGSnoRKp+MCc3+k8p76Ac6qta5LOor6F1KjJJ1d9NJE2ir13cgr12eV6+yGvX0ayM7XvkeQc3yPIdjeR5CT6c3yPI/TXmIteeT5By/J8jQXk+QcryfIPRzGdofJrv9OX5Fcb5Fc5Xk19GvMZWl+TUu+nL8mSaHV6jv0grzbXT08xnakry2R1prF7GV5ty6R1paOxypqj0ySoyib0SVHsuM6RLgqXRsuCpdCC3wB9DfAH0AbM1mHZHtkS1xlEJRDUdBqIMeKI2MdGjHY5RCsLUGGoP/AMHKAagDySoBqHocoeg1Az1WPz/JGyQrJmyZ5Wmn5I2SFZM2TBpl0a6AuzXZNWcmGmJTDTIobHo6AmPR0CFRRApjwmgVR4GsUU0V01wnporprSJIrpraLqa0R01tF1NaQaRRTiV04aQEIbRZTiS60YbKI03bgcILVyiMNASqm7mlTf4XRpo0qaKdrmOndcJKtPb0dp00vojq01d6YZ1xatN48OfVpvJneq0li+nPq09vRUZ18/5EGjneRA7nkU98Od5EEzSMq4daDuR11ZHV8iJzfIR2Ic2onYkkul1VaJJK7ZpEVHJCZIokhUlvZaS3wB9DfAH0AjGMUkxdDXAF0NcAZHo6PBMejY8KUpgyiD0SQeymL0BTB7K4PRDB7K4M0ciqD2VweiGD2VwYaRXF7KIPWySD2UxehauKYy2NUiRSHRkZ2tIdkjZIVkzZMx6reGSloTKYLk0hMpHn6rWPJz6TykrmnLRPORhWkBOeiSpPbDnLRJUkzOtYXOWiSpLo6ctEk5bIqtIqPTJKjKKjJJvZFNJlwTLo2XBUukYaU0A0OaAaGGtbY2CBsNgiZDRwWyuCJ4IrgtGkhq3x1dHS8dbOf460dLx1s7zyenU8bh1PH6cvxvs6njdPRzy56dzxeHX8VnF8V/h1/FuzXnlN6dvxpKx1/FkcPxZHX8aR6OeWd6d3xpHU8aa6cPxpP9Op48vZflN6duhVZfQqvM49CqsS+hVQ8sr07dOpzZdTqK3Th06jbLqdTmzK8p12qdRFcKuunFp1SuFR26Z3k11oV2PjXuciNfZTCujC8q11I1V+jlVX6clVX+jo1nbpneTXR+Y3zs5/zo3zonyvXRdf6AdcjddAOuuDy5quVd/oqVd/rJZVxUq6E5c1RPyHaxJPyN9Ezr6sST8j6NJy5qmp5OiKr5BPU8jRFU8nuy5ym06r5Ons51Xyf6Yur5Ono51Xyd9NZyztM8jyTm+R5N10DyPIs+nO8jyTeRFo63kaZzK3kbbYVXyP5ezmV/I/ps1kZ2vatd2Zzatfb0FVr6ZzqtfbNZGdBUn7IKlT6uMqVO7IKk9mkjKvKkyOpPbGTnojqSZToJyJpsOT0TylsFeSYqT3sKT1sVJhmxjGAy6GuALoa4SuDih0UBFb0Nig1MirDYrWgYrehsUSQUVsaloCK2OiguPUvQaWjJBpEuvy3JGyQrL0bL0ednpuSNkhWXo2TDunKSsbJClI2TJrWKlINSJ1IOMtkUVxkNUiRSHRkQqK4S2Vwlo58JbK4SDWL6T3supP+Uc+m9otpP8AlXJI6VJ7R0aT0jmUntHQpPSDSOhTT0X01pXI6a2i6mtIl1TTRZCOhMI8K4LQAwgw3EdGHoNxKdqVw9EdWG2dOUNElWO2GdcqtD+Xo5laH9M7laP8s5daH9MrlnXD8mBy/JgzueTBX2cvyYGkZ1w/IRzfIjrh2PIjs5vkLR2M3JrL+SGfWdGstMhmts0iKikhMkUSQqS3stJDQDQ5oBoAbM1mHZGsikvV0NcAXQ1wBkejY8FR6NjwpRsejoCY9HR4BVAog9EkHspg9GjkVReyiD0SQeymLDWLIMog9EkGUxejO1UURe9DYsni92GxetGdrTkV0a6AuzXZj1W8DJ3Eyf6HJ6FSZ5+q1hVR6uSTZRNkk3sitITN6JJsomySb2Z1rKTN6JKjKJskm9kVOky4Sy6Uy4Ty6RTSWgGhzQDWzuGkYs2LG4o9xGGgUR0YmjEdGJMhr2EXcrpw0Lpx+yunHRpIafQj/PC/x47JqEdcLqEdmvPLP06Pjo6fjrZB46Oj46PRzyenV8Z6Or4zOR4zOp4z2a88ovTseM7HU8aezj0Ho6FCTTPTzyzvTu0KisX0Kmzi0KjsX0KjuV5Rendp1VdbLqVVW6cGnVd+l1Oq/wBHlF6d2HkbsVQ8h8OHDyFwrh5Gumd5d124eTYoh5OunDh5OyiHkmd5NdyHkooj5Gjhx8jZRHyfZheVa7a8lBryPZx15P8A4GvJ9md5Ndj/AKDf9Jyv+n0b/p9EeVa6T8kB+Sc1+SA/JHg11JeToml5RBLytE8/Jt9icp1fPytXJKnk3uRVPK1ckqeV3ZpOTVdXytPZDU8nbJank6eyGr5O+lzlNqur5WunOq+Rt7EVfJVunPq+Vtmk5Z2n1vJ09nOq+Tti6vk6Zzqvk7NZEWm1PIbTuQ1fI/oXV8jRDU8jbNJGdp1XyNM59Wttg1PITXokqVkzWRytUqa6STqK/TVKn4ySpP6TNJGdezn3ZPKWzSnonlIl165CpSNKQmUgM5AOQDkC5Bm9ujXQF2a7AoTDTEp+w0yVw+L3obFk8XsdFhqpi96GxZPF7GxetEkUxex0WTxexsXrQXD0w0xKYaZLr8lyRskKyZsmZs9NyRskKyZsmDT1IJSJ1IJSIqpVCkEpWJ1IJSMq0lVwlvpRGWiGMiiL0SSrIPZXCWjnwlsrhLQayulSltHQpP8AlHJpPaOhSl/JJK6vjs6Xjy2cfx5a6dLx5WDSV2PHkdHx5bOR48vZ0vHeyVa6VN72XU2rHPpvdy6m9bBqqDDbFQYTYdZ8JKv+it8JK3+g5Udbhza/+mdGtw51f/TK5Z/1yvJ6cvyDqeT05fkc/wDhpGVcjyv9HNr8/wDh0vK/0c3yOHYzrmVFpkNRbZ0ai0yGots05Z1FJCZIokhUlvZaUzQDQ5oBoAbM1mHZGsikskGkZINIDyKGxWtAxW9DYopQ49Gx4Kj0bHgDof6KI8J4f6KI8DkPi9lMGSQeyiLDSKovZTB62SReyiPBVyqUw0xKYaZlWkpt0a6AuzXZlY1lBLgmXRsuCpdM7GkqeXCaa2VzWieS2ZWNNRVESVFsuqLRJNbIsd1JJaJ5xLpR0TSRGGo5REuOytxFSiMNTOIDgWOIDiT5NSqDDUChQDUEPLmkKDuNjBjow9DlT9Gk4c0unTdyuENbRoQV7ldOmrXaNJyaKnDaLqUNIVShvhbTirG3PLl6U0I/yX0Iu5LQiX0I7N+eWd6W+OrI6XjtXIKCsiyg9m05RenSpS2tnQpVEkjkwkWU56RpOWd6dinU2W06yS6ceFQohVZflPqOzDyLldOvo4sK+yuFfQ8nqO1DySiHkuxw4+Rsoj5Psi8s5Xch5Pspj5H/AMODDyCmHk+zO8tJXdj5I1eT7OEvJ9jo+SZXlWu2vK10NeUcVeT7DXk+zO8mu3/1L9N/1L9Zxf8Aqf6b/qf6T5XrrvyvYL8rXTjvyvYP/V7Hk11Z+X7J5+V7ObPyvZPPy/ZM5RrpVPL10jqeVt7IKnla6SVPK300nJq6r5WrkFTydvZNU8nXSGr5WypE2qqvk+7kNTyNiZ+Rq5DV8nbNZGdp9TyekFTydsTU8jtmQ1PJ2VInT513ZojqVxc6/okqV/6NJHNOlUTXSedVCZ1X9E8qjuUgUp+xMpAuYmUgPZSEykaUtCXID1yFSkaUhLkAxy0A5AOQLkSCyR7khOTNkwKVIJS0TqQakSK4yHKRGpDoy0BWpbHRkQxkxqnolrq5TsxsZ+yGMhqnroNWKYamiFTYamSrX5ddGugLs12S8+jujXQF2a7Bpt0e3F3Zr+yKuU9SDUidSCUjOtJVUZDVLRKpbGxloglWQlvpVTkc+EtlcJa6GkrpUpbLqctI5NOTuXU56JdldehPaOpRksUcOjP+kdOhPS2Gkrs0Jq62dSjJYo4dGX9I6lCeuolWuxTqIupVFY49Oey2nU/kGunGYbmiGM3+huYaqnNE1SauC566TVJ7AGvPdzn+RNYj68/6IPIloqMqi8mRy/JkXeTI5fkyZpGVQeQ9nN8h6L/IZzvIejsZ1BU4yGp1l0+MhqdZpGdTS4Kl0bLgqXS0lNANDmgGgBszWYdkayKSyQaRkg0gBSDSMkGkUoUejY8Fx6MjwBsejY8FR6NjwORTF7KIPRLF72UReg0iiL2UxeiOD3sphpCuSqIvehsWTxY2L1oyrSU0xjHLGspbQDQ5oBrZnY0lTzRNKJdKOieS2Z2NfSKUdE84d0dCcCeUVczsNc+UGJlTdzoSghMoEYa57gA6foudNAOmMNQ/Cb4f/Cz4TfCV5PSRUd7CVEqVENUR5NTxpv6Q6NPRRGmvwbGmjWco0mNNlEKb1odGkmyiNNfhpOTQ06e1orp03o0ILWiuEFZaNueGd6FTjZotprQmENlMFZHo55Z3o6npl1N2iRxRTHSNJyi9K4S2V05qxzoy2OjUZpOWd6dOE19sqhVSXTkxqDo1X+l+U+nVjXGxr/8Apy410NjXX6h5PTqryPsdHyNHIj5G+obHyLkXkldqPkjY+TrpxY+TsbHybGd5aSu3HyvoavK9nDXkjY+SZ3lWuyvKvxhryv04q8rYa8kysNdn/qX6zf8AUv1nF/6mb/qf6T5VrrvyvYL8r2cf/rYL8pjya6s/L9k8/K9nNn5Xsnn5ZM5TroT8rRJPyt3uRz8nXSOflf0aTk1dU8kkn5OyWfk66S1PJ2ckTapqeT3ZJU8nZLPydEk/JLkZ2qaldkk64upX0SVK/wDRciNUTq+yaVVCpVXYnlUdzSQ0+VQVKaEyqexTmyXTZSEuQLloTKQBuWgHIByBcgPWwGzNgNgZsBszYDZIK6NdAXZr+wDUg1InUglIkVqQamRqQan7AsUg1MjUw83+ku6vUw1NEKqP9DVQGrlUX6Gqit05yqO4Sq/+Er18GYxg84TGMBjGMRWsokw0xKYaZlWkpsX+DYsnixsXrRGGqovZRCRDGWyiLGO66VKe9l1OWjk05O5dTnojFSutSntHRpVFZI4lKbujoUp6QxpK7VKe0dGlNWWzh0pu62dGlPS2U7K7cKq0WQqrHpw4VXkV06r/AELldmFZfobrL9OZGs/0N1X+ku6udZfomVVEsqrEyqv9BptSomukNSp3ZqlR2eyGpUdxE2l+RPdyCvP+R1ebuQV566aRlamqy0zn1ZbZVVl/Jz6r2yozT1Hpkk2UTZJN7NYypUuCpdGy4Kl0twqzNZh2RrIDwxjFAl0NcAXQ1wD1dDXAF0NcANdDXAF0NcAdF70NiyeLGxetAPi96HRZPFjosCmL2UQeiSD2Uxeg0lURe9DYsnix0WGkpy6GuAINcMrFSvLM1mHZHtvRnY0lIlETKBXibBHLHdQSh6EygdFwQqVP0Z2GufKjoS6J0nRYmVH0zuK1C6P/AIC6KuXOj6YLo+mMNQfCjfAdD4Gb4Gvo5InUSoBqgixUG/phqgaSGpI0F0bGhz7Ko0GNjQf6XIjU8abuOjTdiiNPfBqppI1kNKjD0URi7GjDZRCBtE2gjBplEFoygGkaRnaKKKIsSkGmXHLTYsbGRPc2TNIztWRmNjURDn7N8jLTroKog1U105qqb6GqnsGukqqsGqqt05qqv9CVV/pFVrqKvsNeR7OWvI2EvI0Z012F5DuGvIbOSvIGKvoysaOovI2GvJOOvIDXkmdjuuq/JAfknNfke0A/I9jDXTflAPyfo5b8kB+SMNdGXk+xMvJZBLyBMvJ2Mc1bLyCaXkO5LLyFbpPLyNjBVLyNE8/IZLLyCeVd36aM9UTrE0qzuxcqysTyrA06VVfomVRXJ5VPYmVRthw+U/Yly2A566KlIBrlcByAcgXIkG2A2ZsBsAnwB9DfAH0Dx8AfQ3wB9AB8AfQ3wB9JAPgL6E+APoHt0a6AuzXYDMke5CcmbJgUZ+w1MjUg1IkVqoGp7IVU9hqp7As+Q3yEmb/DzN/gXr5kxjEsGMYwGMYxFdlYxjGdaSiXRiFroa4cw0+LHRZPFjYvWhhqynLaK4S0c+EtlcGTi5XSpSLqc1ZHJpzd0XU5/wA9GNJXVp1PZdSq66cOnUd+2LqdR2TuSSu1CuyiFc5EK5RCug0ldeNZW6Gqyt05KrP9CVZ/pLuunLyNCZeQRy8gTLyNg1ROs7bJJ1rAzrK1rklSsriItFUqJoiqT3006j3cmnPuzSM7QVJ6Iqj2OnPRNN/ZUKTN6J5sdJ6J5vZrGVKfBb6G+APpbgTGMACQaRkgkihl0NcAXQ1wDxdDXAF0NcANdDXAF0NcA9XRiFroa4A+LHRZPFjYvWgKIPZRB6JIPZTFglUReymL0RweymPAuU6PRseCo9HR4csXKYkGkZINIzsaShcQXC5Qo74GoXFjuo8H+m+NleC/T3BGdhrnumwXB/h0HTQDpL8OYrUHxy/DfE//AMTofEvw3xL8GGuf8CN8COh8JvhZ2ROoFSd+BKiy5Ul+BKkrcNJHNRKm7hKmyxU1+BqnrhcidSqDDUGUKn9hqCLkNIUA1FjlANRVjSJtKSDSMkElouM7Xl0a6Buzy7Ljlo7o10Bdmb100jO0zJGyRPk7mzZadUZr8NmiT5Gb5GDVeaN8i9kebN8jIqtXqquBqorHPVTfQlUf6Z01cqzQarnN+fdg1XTOWNNdD5jfM/05/wAx78xnYaudf6uwHXf6yN10B84w1c6/0A61yN10A64w1XKsKlXJZeQhUq6GGqXVX6xMqqJZVmJdVjDVEqqFSqK/SeVR2EyqO4Z6odRCZTQqVS32KlUYNMcwHIS5gOQWbkeZIVkzZMBl0a6AuzXZIJdDXAF0NcA8szWYdkayABoBoc0A0AloBoc0A0SESWtipIokhUlvYCXwB9DfAH0D1sBszYDYB5I2SFZM2TJDMkbMTkzZMCrI2RLkbIOa5VmazDsjWRKHhjGAxjGJGMYwGXQ1wBdDXDLGuij0bHgqPRseDDT4vZTB6I4PZTHgwlVwf4UwlzZDCWyiEtDGkrpQqLWymFQ5kZ7KITf6QrXTjW2NjWZzVWQ6NZWBroquw1XfDmqv9Bqun0L1e630A67ZG66AdcHo+VV3Eyqu4uVVfomVVFI0yc9ElSXs0psTKTuDQSfsVJ72FJ62Kk9lxFLkxUnvYUnrYqTNIyoHwB9DfAH06hjGMBjGMUCMYwBGMYAk9hpiUw0wGJhpiUw0wHxe9DYsnixsXrQFUXvQ2LJ4vY2L1oNFUWUweiOD2UwApj0pgTR6UwJa6ogNjwVAdEO6bFDUtAxWxsUS7pagGoehyiGog1L8ZsGV4L9Ngv0GpMGe4MqwX6bBfoNSYM2DK8F+mwX6Uak+M2D/AErwX6bBA1LizYsqwNiinNJxZsWNxRsUHNBZnlmMsjyyNtQF8AfQ3wB9GjxsBszYDYlSzYDZmwGzSUeOQLkA5AOReszHIBzEuQDkNFORsyXJmyIFeaN8hHm/w2b/AACvNfh7miPNmzZK9WfIjfIiLP2bP2DVrqKwLqLhG6j4C6juS6rcwHMncwHNgOdT2A5k7mA5sClzQqU0JlU9inNgpspCXIBz0KlIMxuQLkLcgXID26NdAXZrskMTDTEphpgEuhrgC6MRK4NINIyQaX/6DSPFENRCUQ1ElOEOD/AHBljiA4gxNKOhLiVuIqUQ6llETKJW4ipRAikv0VJFEkKkt7KSRLgqXRsuCpdAzYDZmwGyQV0a6AuzXYBZI2SFZM2TARZmsw7I1kSzKszWYdkayACzNZh2RrIkeGMYDLoa4AuhrhzHderoa4Auhrgw0yPR0eCY9Gx4MJT4vehsWTxY2L1oY0lVxkOUiNSHRkYL1SpbHRkQxkNU9dBq7NGzRHm/w2b/AAK1W5oBzRO5gOowapcgHIS5+wHMpOmuQqUjSkJcvwGtJ3FSe9hSehUnsuOV4+APob4A+mkZ14+APob4A+nUBMYwGMYxQIxjAYxjAEYxgCXQ1wBdDXAGphpiUw0wKYvehsWTxY2L0GiqLKYMjg9lMGBZFlMGRwZTBku6ugyiD0SQZTF6Bp0elMeE0elMeEr02PRseCo9Gx4DXqQaRkg0gaCzNZh2RrIGgszWYdkayKNKszWYdkayBoXwB9DfAH0pGvHwB9DfAH0GvHwB9DfAH0rXXjYDZmwGxo9kxUnvYUnrYqTEqXjkKlI0pCXI0lHrkKlI0pCXIvWZjkA5CXIByGhzkA5+xLkA5HRRkjZImyZsmBTkjZImyZsmS5qnJGyRNkzZMGqXJAOQlz9gORLVQ5AOQlzAcgHOQDkJcwHIBjlcByAcgXLYHrYDZmwGwzE2A2ZsBsBl0a6AuzXZIYuhrgC6MQDIobFa0BFDoolcMihsVrQMVvQ2KDSCUQlENRDUSVYS4guJQ4gOIMIlES4lbiKlEIRSRNNbLJomkgJZImmtlc1onmikppcFS6OlwTLoCXwB9DfAH0ketgNmbAbAK6NdAXZrsAbM1mHZGsiWbyzNZh2RrIALM1mHZGsgAszWYdkayAWkGkZINIAUg0tGSDSA9XQ1wBdDXCWg10YvoWujFwByYaYlMNMzUYmGmJTDTAbdGugLs12SoWSNkhWTNkwGNgNmbAbO4aJv2A2ZsBsY5omwGzNgNm7BnwB9DfAH0Dx8AfQ3wB9KGMYwGMYwSxjGAxjGAO6NdAXZrsBiYaYlMNMByYaYlMNMB8XvQ2LJ4sbF60FKosoi9EkHspjwOxVCWyunLRz4PZXTlwlpq+DKYyIYSKIsGrYspjIhjIoiwatjIapEikOjIGqVINSJ1IJSDqjJGyQrJmyYDckbJCsmbJgG5AOQDkC5AMcgHIByBcigxyAcgHIFyAJyAcgHIFyJHrkKlI0pCXIA3IVKWzSkJciol65CpSNKQlyNIPHIVKRpSEuR2MxOQDkA5AuRcBOQDkA5AuQSZkjZIVkzZMBuSNkhWTNkwDyRskKyZsmAeSNkhWTNkyVDbBb2ZsBsD1sFvZmwGwPWwW9mbAbAY2A2ZsBsD0xjACuhrgC6GuEtBxQ2K1oGK3obFAFBbKYrQmK2UxWia7BwWyiK0JitlEFoyrSCSDSMkGkddC+APob4A+gLlwVLo2XBUulJTz4ST6Vz4ST6BNLhLLpTLhNLoSRLhNLpTLhNLoHkmKk97Ck9bFSY0etgNmbAbGjXRroC7NdkajFFmazDsjWR1ADGMANmazDsjWQHpjGAIxjAEuhrgC6GuAZINIyQaRLRkg0jJBpAZINIyQaRmp4uhrgC6GuAeGMYlTGMZ8AB8AfRj+xb6a4y14+APob4C+jDXhjGLQ8fAH0N8AfQBMYxQ9fAH0N8AfQMYxgljGMANmazDsjWQHpjGAy6GuALoa4B6uhrgC6GuAFHo6ImPRseBSiLHRdieLGxetAVwZTGRDGWyiEiXdWxZTGWiGMtlEZaBq2MtlEJ82c+MiiM9A10YzQ2M0c9TGxn7Bq9TDU0QqbDU2GqzJGyRNkzZMCnJGyRNkzZMClyAchLkA5AUOQDkJcmC5MoNcgHIS5MFyYDXIByEuQDkSHOQDkJcgHIBrkKlI0paEuWyol65CpSNKQlyNINJipPewm9CpM7GbxsBszYDZcBNgNmbAbCRXRroC7Ndge3RroC7NdgHdGugLs12B7dGugLs12Sp7dGugLs12BjGMAJjGAExjADZmsw7I1kBkg0jJBpEtHkUOigIrehsUA2I6AmPR0Sa7FEejY8FR6NjwyrSHJhpiUw0zrr1sBszYDYGm9E8mOk9E0nvRSSpvRJNlE2STewEzeieTHSeiaT3oJKm9E8nsdJk03sAZMVJ72FJ62KkzLR42A2ZsBsaGNgNmbAbJ1WLro10Bdmuy2ZhjGAxjGKZiMYwGszWYdkayKGSDSMkGkBkg0jJBpEtGSDSMkGkBkg0jJBpGKnlmazDsjWQAWZrMOyNZGgBoBoc0A0AtoBoc0A0ciQPgD6G+APppAJjGOs3j4A+hvgD6BjGMUkJjGAGzNZh2RrIALM1mHZGsgPLM1mHZGsiR5Zmsw7I1kB5Zmsw7I1kAKQaRkg0gBSDSMkGkAUejY8FR6NjwB8XvQ2LJ4sbF60UK4yHKRGpDoy0BWpbHRn7IYzf2NU9dMsa6vjMbGasc+M2NjUGGrVNBqaIVNhqYxC5TDU0Qqp7DVT2MFXyG+Qj+Q3yF4LXNAOZO6nsB1PYwVOp7AdQndQBzYwUuYDn7EufsBzGChyAchLn7Achgc5AOQDkC5DATkA5AOQLkUPWwGzNgNgC+APob4A+lAHwB9DfAH0Dx8AfQ3wB9KGMYwAmMYDGMYATGMGjGMYAbM1mHZGsiQqzNZh2RrIALM1mHZGsgAszWYdkayAyQaRkg0gMkGkZINIAo9Gx4Kj0bHhLQ+L3obFk8WNi9aAbkjZIVkzZMkNcgHIByBctgeylomkw5S0TylslQZyJpsOTJ5SAXORNNhzZPOWztqQSdxUnvYUnrYqTM7QuTFSe9hSf6KkydMetgNmbAbGmCbAbM2A2RpjpmMY2ZiMYwGXQ1wBdDXCmYUg0jJBpACkGkZINIoCkGkZINIDJBpGSDSJaCSDSMkGkBkg0jJBpGSniiEohqIaiAjFmxY3FGxRYS4guJQ4gOICGgGhzQDRyJJaAaHNANGsCnwB9DfAH0MwmMYDGMYpJdmazDsjWQHlmazDsjWQHlmazDsjWQAKISiGohqJISohKIaiGogLUQlENRDUQFYs2LG4o2KAWohKIxRCUQASDSMkGkB4uhrgC6GuFBqYaYlMNMB6kGpWJ1IJSGO6rUg1MjUg1IYasUg1IjUg1I5jqzJGzJcmbJjBVmbMlyZsmXgqzNkiXJmyYwUZHmSJsmbJjA7M2SE5mzGBmR5khWTNkxgZkeZIVkzZMYCujXQF2a7JHr4A+hvgD6B6+APob4A+lAWgGhzQDQAtANDmgGiguzNZh2RrIBVmazDsjWQCrM1mHZHtkAuzNZjLI8sg0DizYsbijYoBWLNixuKNiiQrFmxY3FGxQCsWbFjcUbFABizYsbijYoBdmazDsjWQGSDSMkGkB4uhrgK6EuEtBphpiUw0wGOQDkA5AuRIa5CpS2aUhLkB7KWuk8pbCk9E8pbJU0paJ5PYUnonlLYHkpCZSNKQpy2RakEmKk97Cb0KkzO0DJipPewpPWxUmTq8etgNmbAbOaYJsBszYDZzTHXMYxq8+CXQ1wBdDXAYFLYaRkg0i46yQaRkg0jSAFEJRDUQ1E6BUQ1EJRDUQBUQlENRDUSVBUQ1HYSiGogepBpGSDSAyQaWjJBpAJxZsWNxRsUAtoBoc0A0AqS0KkiiSFSW9lJTyWtipIokhUlvYCGgGhzQDRTMD4A+hvgD6BrM1mHZGsgkFmazDsjWQGSDSMkGkApRCUQ1ENRAFRCUQ1ENRJUWohKIaiGogJUQ1EcohqIE2LNiynFGxQCsTYsbijYoBWLNix2J5igF2ZrMOyNZGiXhjGAO6NdAXZrsBqkGpE6kEpANUg1InUglI7goyRskKyZsmMD8kbJCsmbJjA3JGyQrJmyYwHkjZIVkzZMYGXRroC7NdjAd0a6AuzXZ1Q7o10BdmuwGGMYlo8szyzDsjWQA4s2LG4o2KJAYs2LG4o2KAmxZsWU4o2KCMRYs2LKcUZxVgYmxZsWOcVc8xRSsKxZsWNxRsUDCsWbFjcUbFEqwrFmxY3FGxQMKxZsWU4o2KBhGLNiynFGxQMTYs2LKcUbFAxNizYspxRsUDCMWbFjcUbFAwGLNixuKNigYXZmsw7I1kDAGMYGPGwGzNgNk6vHjkvoTKSNKQpy2c0wUpaJpsOT0Tylsm1WAk7ipP9Ck9bFSZnaYXJim9hSf6KkzlqsBLgqXRkuCpdM7TC3wB9DfAH0nTHj4A+hvgD6c0wJjGOavHUXQ1wBdDXD0PPg10NcAXRi4DHqQaRkg0i4h4ojoxNGI1RNIPFEJRGKISidC1ENRHKHoNQASohKIxRCUSVBUQlENRDUQBUQlENRDUQASDSMkGkAFmazDsjWQCmgGhzQDQCJLWxUkUSQqS3spKeS1sVJFEkKkt7AVLgqXRsuCpdKZhfAH0N8AfQCMYwS8SDSMkGkAKQaRkg0gMkGkZINID1RCUQ1HQaiSoKiEohqIajoBaiGojlENRARizYspxRsUBNizYspxRsUBO4guJQ4gOICGgGhzQDRoktoBoc0A0AsxjAYxjAHdGugLs12aYG3RroC7NdjA26NdAXZrsYCMYwwYxjDB7dGugLs12MDDGMSpl0NcAXQ1wAkg0jJbDSJaPFEJRDUQ1EBaiEohqIajokBizYsbijYoBGLNixuKNig7idxBcShxAcQYVizY+xuKPMUUvCcfZsfYzFGxQCsWbFjcUe4kqwvFmxY7FGUNgwvFmxZSoqxsUDCMWbFlOKNigYmxZsWU4o2KBibFmxZTijYoGJsWbFlOKNigYmxZsWNxRsUDE7iC4lDiA4gwhoBoc0A0DCZcFS6NlwVLphqsIlwVLo2XBUxphEmKk97Dk/0TJk2qwuTFSewpPWxUmZ2mAlwTLo2XBUunLVYB8Fvob4A+mdpjx8AfQ3wB9J0wLQDQ5oBoaYXZmsw7I1kRq8dBINIyQaR63meRQ2K0DFb0NigCUR0YmjEaomzLHkYlEYuxox2URgDC4wY2NMdGCGxgrHdXhCpsNQKFANQX4NMSqmGqZQoINQR0xHiz3FlOJ5igYVizYsbijYopJdmazDsjWQAvgD6G+APoxLx8AfQ3wB9GAZcFS6NlwVLpWMypcFS6NlwVLowLfAH0N8AfTRIHwB9DfAH0AjGMSPUg0jJBpAZINIyQaRIJINIyQaQHsUNitaBit6GxRKmUR0Y6NGI1RABRCURiiEohoDE2LG4o2KAW4guJQ4gOJTMhoBoc0A0AiS1sVJFEkKkt7LiSmgGhzQDRcCWgWmNaAaOYkJjGGDGMYrARjGGAjGMdUIxjAYxjAYxjAZdDXAF0NcJUyQaRkg0gPYobFa0DFb0Niia0aKGxWtAxW9DYozo9SDSMkGkSoOLNixuKNigEYs2LG4o2KCiXEFxKHEBxAQ4guJQ4gOIUTizYsbijYoBaiEohqIaiFFqISiGohqICVEJRDUQ1EGAxZsWNxR7iDCcWbFlOKNihpibFmxZTijYoaYkxZsWU4o2KGqxNgA4ljiA4nNMRuIDiWOKAcSdMSSiJcSxxX0JlEa7iOa0TSWy6cSeS2RarEslommtlclrRPJbItMTyWiaa2VzWieS2ctMTyWtipIokhUlvZnaYmaAaHNANE6rCWgGhzQDRzTCbM1mHZGsjmmFWZrMOyNZHNMLxZsWNxRsUTqsVLoa4AujEet5DIobFa0BFDooA4x2URWgIIphE2jmChHZVCOrgU4bLKcQ7jyMNlEIP8ChBfhRGCsRruEqDDUChQ9BqC+kNMTfEjfEij4n+G+JmpiRw9AOJY4AOIMR4s1imUbCZIpkU+APob4A+geNgNmbAbLxImwGzNgNnccZsBszYDZWIBLgqXRsuCpdGBb4A+hvgD6EhMYwGMYxIJdDXAF0NcANdDXAF0YiQyKGxWtARQ6KAKKGxWtAxW9DYolQoobFa0DFb0NigPUg0jKwaQaPLM1mHZGsgAaAaHNANFMyWgGhzQDQCJLWxUkUSQqS3suJIaAaHNANFwTtANDmgGi8SXZmsw7I1kMAWZrMOyNZFYPLM1mHZGshg8szWYdkayIU8MYwGMYwGMYwHqQaRkg0iVMkGkZINID2KGxWtAxW9DYomtBRQ2K1oGK3obFGdHqQaRkg0iVBSDSMkGkAqzNZh2RrIKA0A0OaAaAW0A0OaAaCi7M1mHZGsgPLM1mHZGsgp4ohKIaiGogCohKLDUQ1HQaYWosJRDUQ1EGAxZsWNxRsDLTyRiz3FlGKNihp5T4s8xZTijYoavEjiA4sscQHEaYlcHYTKDLpRQlwVydMRuDsJlFl0oITKCGmIZx0TyjsunH0TziRarEMkTziXTiTTRFpiGaJpR2XTiTTRy0xJJa2KkiiSsKkt7M7TE8lrYqSKJIVJb2RqsKaAaHNANDTC7M1mHZGsidMBZmsw7I9t6GmBxZ5ixuKNiidVjyPRseCo9Gx4e/Xgw6PSmPCWPSqA0xRBbK6aJ6aKoLSRekiinHZdTjompxV0X04/zoa0kFCBXCGr2AhDZXCGiNXjxQDUPQ5QuGoDTE2ADiWOIDidjliOUdE8o7LpRJ5LZpGdiWS0TzWyqa0Ty6VEVNLgqXR0uCZdNYzoJMVJ7Ck9bFSZomvWwGzNgNhnRNgNmbAbO448fAH0J8AfRg8fAH0N8AfTqWMYwGMYwBLoa4AuhrgBR6NjwVHo2PCMUbHo2PBUejY8OYGx6NjwVHo2PCcUOPRseCo9Gx4MDF0NcAXQ1wYDMYwwetgNmbAbKwC+APob4A+ncAy4Kl0bLgqXSpElvgD6G+APppIFtANDmgGhiS7M1mHZGshgCzNZh2RrIrB5Zmsw7I1kMGszyzDsjWR1QLM1mHZGsgFWZ7ZhWRrIDyzNZh2RrIDJBpGSDSM1MkGkZINIAo9Gx4Kj0bHhNdg49HR4Jj0bHhnWkMXQ1wBdDXCVvV0NcAXQ1wD0xjEjx8AfQ3wB9AXZmsw7I1kFAszWYdkayAFINIyQaQVGSDSMkGkGkZINLRkg0iK5I8UdhKIxRCUTOtJAqOwlEYohKJWkhGLPcGU4o8xQ1pImxNiyrFHmKItMTOIDiWOADiZ2mI3ETKBdKIlw2LVeUbjoTKLLpREyiZ2nlz5InnEunEmmidXiCSJ5x2XTiTzRzTygmuk04l049J5LZOnlDNaJ5R2XTiTySuNMSyWhUkUSQqS3s4kpoBoc0A0AuzNZh2RrIJCkGkZINIALM1mHZGsjNSWPRseCo9Gx4e3Xjw+PSqBLHpVAaYqp9RdT+iGn9FtPiK0kX0/oup8RFT6i2n9DWkiymtlcETwRXBaJ1eDihsVrQMVvQ2KGmBaAaHNANFxyxLUWiWa2WzWiSa2axnYknwkn0sqcI59KjGkyeiaT2Omyab2axlQyYqT3sKT1sVJmia8bAbM2A2GVFdGugLs12a4PWwGzNgt7GD18AfQ3wB9ISxjGAIxjAEuhrgC6GuAGuhrgC6GuDFGR6NjwVHo2PBgOPRseCo9Gx4Tijkw0xKYaYwOTDTEphpjAd0a6AuzXYwHdGugL+zX9lYPWwGzNgNjBmwGzNgNlyJePgt9DfAH00kGMYwxJdmazDsjWQwBZmsw7I1kVg8szWYdkayGDyzNZh2RrIhQLM1mHZGsgAszWYdkayACzNZh2RrIDJBpGSDSM6oKQaRkg0gDQa4AujFwmuwxdDXAF0NcIrTka6GuALoa4QsZjGAIxjEgTGMANmazDsjWQU8szWYdkayAFINIyQaQVGSDSMlsNINI9ihqWgUtjYoirkeJBpGSDSM60keqISiGo6DUSdJC1EJRGKISiNaSFYs2LHYmxRFruEuIDiUOOgHEztMTSiJlG5ZKImUfQtbTlJKOiecS6UdE8lsztPKGS0Tzj6LpRViaSI1PlBUj0kmtnQqR0SVI9GmIpokmtl1RasSVETpiSSJ5LZVNaJ5LY0wiSEyRRJCZItiQ+APoxi30DGMYJZdDXAF0NcA9XQ1wBdDXDNTnx6OjwTHo2PD1a8mKYMpgyOD2UwZzTFtN7RdT4jn0273Lqb0XqpF9J/wBI6FL/ACjmUntHRpPSGtJF9NlcHohpvdyuDOarFcXvQ2LJ4sbF60NME2A2ZsBsqJsDN6JKjKJvRJNlxnYnm9Ek2UVGSVHtm8ZWETZNN7HTZPN7NIzsKk/oVJ72FJ62KkzaMLHrYDZmwGzSM7HpjGOOsYxgBszWYdkayNElWZrMOyNZAeWZrMOyNZGYFINIyQaQHq6GuALoa4FDXQ1wBdDXAGroa4AuhrhIamGmJTDTAYmGmJTDTOYCv7Nf2LuzXYwHdGugLs12VgNsBszYDYwE+APob4A+mqXj4A+hvgD6ARjGKA2ZrMOyNZABZmsw7I1kFPbM1mHZGsgAszWYdkayACzNZh2RrIALM1mHZGsiVAszWYdkayAyQaRkg0jNoFINIyQaQGSDSMkGkZqGg1wBdDXAPV0NcAXQ1wlT1dDXAF0NcA8szWYdkayJU8szWYdkayA8szWYdkayJUBRCUQ1ENRAWohKIaiGokqgVEOMdhKIaiGsZRCUQ1HQaiRUyBUdjox0aMRqiZ1pI8UQ1EJRDUTlXIFRCURiiEokVpIVizYjcUbFEVpCXEFxKHEBxMq1ieSFSRRJCpLexXEs1ommvwrmtE8/szoimtEk1stmtEs0cXUk+ElQrnwkqBnUlTpJPpXU6ST/ANBFTy4TSKZcJphnSZk0ulMyaXS8coHwB9DfAH0YzoTGMMVrLoa4Auhrgw16uhrgC6GuDDUCYaYlMNMrWOKYspgyOD2UwGmLYMrg9Ihg9ldNl6qR0qctoupS0cunLZdTk7DWkjpU57RZTkrHLpyLIS0kNVi9SVx0ZKxDGXscpDTDXIFyFuQLkaRNjyUiabQc3cnlI0jOwuo9XJJsom9Ek3s3jKwmb0Tyex03cmk9msZ2Fy4Ll0ZLgqXTWMLHhjGNIzsLszWYdkayOIBZmsw7I1kB5Zmsw7I1kaJBZmsw7I1kB6YxjMZdDXAF0YuAZdDXAF0NcCnq6GuALoa4Aa6GuALoa4SPV0NcAXQ1wAro10Bdmuy8Dbo10BdmuxgO6NdAXZrsrB7dGugLs12MBGMY6ljGMBjGMUMYxgCMYwUIxjADZmsw7I1kB5Zmsw7I1kAFmazDsjWRKgWZrMOyNZAFZnlmMsjyyM2jJBpGSDSFHq6GuALoa4Zqeroa4AuhrgBJBpGSDSJUFINIyQaQGSDSMkGkSotINIyQaQAKISiGohqJKi1EJRDUQ1EBaiGojlENRJVCVENRHKIaiGsKjFjVDQxQ3wbGJFVIUohqI5RDUTKtJAqISiMUfoJRFXIFRYSiMUQsdEVpIRizYsdieYoiuwlxBcShxAcTKtInktE00VzWieYriOZNNbLJommZ0SVP8siqfZbU/wAsiqfZxdRz4SVCyfCOoGVSVOkk+ldTpJU6E1PN6JpjpvpNN7DOlTFS6NmJl03xylvgD6G+APp3GdCYxhidEuhrgC6GuDDXq6GuALoa4MNcxdGIWuhrhlph8WOiyeLGxetDTFcGV03ohg9ldNla7IvpyK6ctHPhLZXCQ1ci6EtlcHo58HsrhLR1eK4yHKWiNSHRkDD8jzJC8mbJm0pYGTEyYcnrYqTNJWdhUiWfSmXCeXTWVlYnkhMlu5RJWFSW9mkrOwhoBoc0A0axlYTZmsw7I1kaRnYCzNZh2RrIpFgLM1mHZGsgzsBZmsw7I1kaGAszWYy3o1vQMDZmsw7I1kDApBpGSDSBhaQaRkg0jMwKQaRkg0gYFINIyQaQMemMYGCMYwdYxjAeXRroC7NdmjmDujXQF2a7Bg7o10BdmuwYIxjAwRjGL0xl0NcAXQ1waY8XQ1wBdDXCdMemMYaYxjGGqwd0a6AuzXY0wRjGMjGXQ1wBdDXAY8XQ1wBdDXCVY9XQ1wBdDXAY9XQ1wBdGIlWDSDSMkGkDGSDSMlsNIleMkGkZINIGPFEJRDUQ1HROtMCohKIaiGonNdwKiEohqIaic1WFqIaiOUQ1A5phaiGoehygGoGeqkJUQ1Edh6DUBrSQtQDURyh6DUSdVCVENRHKIaiNawtRCUQ1ENRMCAxZsWNxRsUGkC1oBoc0A0TVFSWtipLZRJCpLezKhEuE0yqRLMnF6mqEc+llQjqdGGpqn2Q1PsuqcZFU6xjlqGpwiqfZbU+yKp1jGdqWfCSp0snwjqFYm1NMml0pmSy6MZWlS4Kl0bLgqXTXEAaAaHNANDAuzNZh2R7b0MHiQaRkg0hgBRCUQ1ENRGDhroa4Auhrh5NXh0ejY8FR6NjwaYoj0pjwlj0qjwrXZFMH+ldN6IYPZXTY1ci2DKIPRJB7KYvRqvFUXvQ2LJ4sbF60DDTGMVKWBaYDQ5oBrZpKzsSyiJcStxFSjs1lZWJZR0KcdlTiKlE05rOxK4guJQ4guJ6YysTYs2LG4o2KNIzsLx9nmLHYo2JSLCcWbFjcUe4oM7CcWbFjcUbFGhhdmazDsjWQMBZmsxlvRregYWohKIaiGogwpINIyQaRmYBRCUQ1ENRBhaiEohqIaiDC7M1mHZGsgYCzNZjLI8sggqzNZh2RrIADGMaLwJjGBjGMYGMYxgYO6NdAXZrs5pht0a6AuzXY0w26NdAXZrsnTB3RroC7NdjTDbo10BdmuxqsHdGugLs12NMMMYxwxl0NcAXQ1wGPV0NcAXQ1wlWPV0NcAXQ1wGDXQ1wBdDXCVYauhrgC6MXAYKKGxWtAxW9DYrRKsaKGpa0DFb0Nig7gVEdGJoxGqJhrTHiiOjHRoxGqI0wuMRyjoJRHRiTq8LjEaoa4Go7HRiNMKUA1D0OUQ1FGeqkJUA1AcohqCGtJCVFhqA5Q9BqJOphKiGojlENROa1idRCURiiEokkJszWYdkayDSAaAaHNANE1RElrYqS2USQqSMqJpcJplUuEsysc1NUI6hZUI6h3DUlT7Ian2XVPshqfZzHLUdT7IqnWWVOMiqdGM7Uk0STWy6a0STRWItTSWiaS2VzWieaO4ztTNANDmgGjTHSMWbFjsTYjApRCURiiEojAtR2EojFEJR0MC1EJRGKISiMHzK6GuALoa4fNbHR6NjwVHo2PAKI9KI8Jo9KY8NFKIdK4cJIdK4cAoh0qhwkh0rhxmukhsFspitCY9KYL9GtJBKISiGo6DURK7hDhcBwf0VuCBcPRpKYlcWA4FjiA4HeayvKCUH+CZU2dCUFYVKB6OazvKNw9AOJY4AYHolZXlHhoBxLHEBw9GkrO8pcTYsqxPMUayosJxZsWMxRsUXKzsJxNiNxPMUd1OE4mxGYo2KGmAszyzGWR5ZE6jAKIaiEohqI0wtR2EohqIaiRphaiEohqIaiNMCohqISiGok6YRizYsdieYoaYS4guJQ4gOJWmENANDmgGhpgHwB9DfAH0vU4B8AfQ3wB9GmPbo10Bdmuxpg7o10Bdmuxpht0a6AuzXY0wd0a6AuzXY0w26NdAXZrsarDbo9uhd2a7GmG3RroC7NdjVm3RroC7NdjQ26NdAXZrsyDbo10BdmuwHJhpiUw0woS6MXBa6MXAGLoa4AuhrhJhsejI8FR6NjwGHR6MjwVHo2PDNUhkVsbFa0DFDYoNJDIobFa0DFb0NirnLXZBKI6MdGjEaomdrSQSiNjE0YjVHRy0wMYjlF2CUdjoxRFpgFBhqI5RDUURrXCVENRHKIaihphKiGohqISihqi8WbFjcUbFDQuzNZh2RrIlRbQDQ5oBoBT4A+hvgD6FaTLgqXRsuCpdBpEuE0ymXCaZOGpqhHPpZUI59GGpai1ohqJ3Z0KiViGotjGeoaiJKi2y6otEk1sY5qGaJpx2XTiTSRWMkcoiXErcRUoncEbiC4lDiA4lYzJxNiNxRsUMC1EJRDUQ1EYFqISj9BqIaiMAqISiGohqJWNHxUejY8FR6Njw+U2Nj0bHgqPR0eAOj0qjwlj0qgaKUU1srgiemiuC0BRBbK4LRPTRXBasd1rIdCJTFC4IphEa0kaMRyg7BRgh0YCUwjB/pvjK8F+nvxmkpiFwAcGXOC/AHA7zXLyglB/gpwdzoSgKlT9Ho5rO8oXD0KlTZ0JQQqUPRvKzvKNwuA4O5Y4AOJpKyvKXD0A4ljiBiaysbEuADiyxxAcTSVlYQ4guJQ4gOJ3U4Q4guJQ4gOI0wqzNZh2RrInU4BRCUQ1ENROaYFRCUQ1ENROa5gVEJRDUQ1E5pgVEJRDUQ1HROmEuILiUOILiNMSuILiUOIDiVpieS1sVJFEkKkt7O6YTJa2KkiiSFSW9la5hL4A+hvgD6Ncx4+APob4A+jTHt0a6AuzXY0wd0a6AuzXY0w26NdAXZrsaYbdGugLs12NVht0a6AuzXY0wd0a6AuzXY1w26NdAXZrsaG3RroC7NdnA5MNMSmGmAxMNMSmGmFHJhpiUw0wGx6NjwVHo2PCWmGx6NjwVHo2PAYfHo2PBUejo8M1yHR6NjwVHo6IXIbBbKYrQmBRBaMrXZBwWymKExWymC0Z2tJDIobFa0BFfg6KOWmCUR0YmjEcomdruBUQ1EJRDUSdXjxINIyQaQ0x5b0e2YdkayGuAszWYdkeWQ0A+APobAfSlAfAH0N8AfQFS4Kl0dLgmXQnQS4Kl0bLgqXQanmSy6VTJZdKw0mfCSfSufCSfRhqWoiSot2Lqi0STQxlqKpHpJOOzoTWiScdjDUMkTyiXSjomkiscRyiJcStxFSiMEriC4lDiA4l4zT4s2LG4o2KGBaiEohqIaiMC1EJRDUQ1EYASDSNbYaRWNHwcejY8FR6Njw+Q2HHpTHhNHpVHgDILZXBE8EVwWrFKh1NO6LqS0SU1suprQaRTTWy6mtElNbLqa0iVxRCOyqEdCqceFdOIaQUIFEYaNCOyiERphKiHh6HKIaihpiTD0A4ljiBgkacliJw1wVKHoulES47N+WdiJw9CpRLpREyij0csLEbiA4lDiA4no5Z2JnEFxKHEBxLiKQ4guJQ4gOOjSM6Q0A0OaAaCC2gGhzQDQCbM1mHZGsiUhSDSMkGkB5FDYrWgYrehsUSl6kGkZINIDJBpGSDSJHjQDQ5oBoBEloVJFEkJkv0rRPLgqQ6QmXRoRLgqXRsuCpdK1JL4A+hvgD6NHrYDZmwGwNdGugLs12Ad0a6AuzXYDbo10BdmuwDujXQF2a7AbdGugLs12A26NdAXZrsBt0a6AuzXYDEw0xKYaYDEw0xKYaYDEw0xKYaZKjl0NcAQa4AyPRseCo9Gx4So2PRseCo9Gx4A+BVHhLApjwVcPj0dHgmPRseGVaQ+BTHhNApjwmkPj0pjwmj0pjwzrSHRQ6K1oCK3obFaucqzIoaloGK3obFGdDF9DFwWujFwKeroa4AuhrgGMYwGfAH0N8AfQBbAbM2A2Ul7JipPewpPWxUmBpMVJ72FJ62KkykhkxMmHJ62KkwFSEy6NlwVLp3HNIlwml0plwml0Yanmiaa2VzWieS2VidSTTJpRLpR0TTQw1FJaJ5R2XTiTSRWJ1HKIlxK3EVKIw1I4gOJQ4guJWJ1Niz3FjMUbFDDSrM8sxlkeWQxGvF0YuC10YuDDRGMYYvXwa6GuALoa4fIek6PSmPCaPSmPAHQ6VwJIdLKZSoppraLqa0SU1tF1NaDSLKK0W0VslorRZQWyVxZTWyumieCKoLQaRRBbKYrQmCKILRGtMEkGkZINIGFNANDmgGjbksTSWtipIokhUlvZ6OWdieS1sVJFElYVJb2ejlhYla0KkiiSFSW9no5Z2FNaAaHNAMuMKQ+APoxgPppGdLfAH0N8AfQgD4A+hvgD6AJjGJSy6GuALoa4AUejY8FR6NjwlJy6GuALoa4B6uhrgC6GuEjPgD6G+APoGkxUnvYUnrYqTI0Km9E8nsdJk83s7oXLgmXRsuCpdK1JEuCpdGy4Kl0aBfAH0N8AfTQYxjAYxjAYxjAEYxgMYxgCMYwBGMYDLoa4AuhrgHq6GuALoa4Aa6GuALoa4SoyPRseCo9Gx4A2PRseCo9Gx4So2PRseCo9Gx4BTAbHgqA2PDlXFEP9FEP8k8P9FEOGdXFC+iimTr6KKZNdh8elMeE0elMeGdaQ+PR0f8iY9HR/ycqzo9HR4Jj0dHhnQxdDXAF0NcChGMYAro10BdmuwM2A2ZsBsDNgNmbAbKS9kxUnvYUnrYqTA0mKk97Ck9CpPZSQyYqT3sJvQqTAGTEyYcnrYqTNcZaVITLo2XBUujDSpcJpFMuE0ulYnSJITJFEkKkt7GGpZImmtlclonktlYnU8lrYqSKJIVJb2MNTyX6hUkUSQqS3srE6Q0A0OaAa2dxzSnwB9DfAH0YnXt0a6AuzXYw026NdAX9muMVr4iPRseCo9Gx4fDfQNj0pjwmj0qjwCimtlcFsnpoqpr6KVFFNbLqa1skprZbTWg1i2H0XU/ohp/RbT4jmKi6mWU+EdMrhwY1iqDKIPRJB7KYvROKPTDTEphpjAbYDZmwGzXmJpchMujZcFS6ejmMqXLgmXRsuCpdN+Yjqky4Jl0dLgmXT0cx5+qCXBcujJcFy6aotKfAH0N8AfQzteNgNmbAbKZBbAbM2A2Bro10BdmuyUiTDTEphpgNi96GxZPFjYvWiRQpBqROpBKQD1INSJ1IJSJSc5AOQDkC5AG5CpSNKWhLkAMmKk97Ck9bFSYC5MVJhSetipMBb4LfQ3wB9A8fAH0N8AfShjGMBjGMANmazDsjWQHpjGAGzNZh2RrID0xjAazNZh2RrIDJBpGSDSAFINIyQaQGSDSMkGkFPIobFa0DFb0NigCih0UBFb0NiiVGxHREx6OgA6PSmPCaPSmPDMh0P8ARRHhPD/RRHgaw5dKKZOulFMirPj0qgSx6VQM6HR6NjwVHo2PDlUbHo6PBMejo8M6GphpiUw0wo66NdAXZrsD26NdAXZrsDNgNmbAbAzYDZmwGy4lmwGzNgNlwBJipPewm9bFSZyRm0mKk9hSetipM0kAyYqT3sKT1sVJluaXLgqXRsuCpdBpUuCpdGy4Kl07idIlwVMbLgqXRhpEkJkiiSFSW9l45alktbFSRRJCmt7GM7U8lrYqSZRJCpLZWFpEuC5dGy4Jl0YztLfAH0N8AfSsTrxsBszYDYw0V0a6AuzXZWOenycUNitaBit6GxR+dfXFBbKYrQmK2UwWgH00VwWyemiqmvopUUU07ltNaJaa2W01oNYqollEjoltAvFRbTZXB6IYPZXBjGkUxeyiD0SQeymL0TizlINSJ1IJSGBzkA5AOQLka8xFeuQqUjSkJcj0cxnQyYqT2FJ62KkzfmMOqGTFSe9hSetipM9PMefqtJipPewpPW2Kkwi165CpSNKQlyDO0bkKlI0pCXIpx62A2ZsBsA3IByAcgXIlJt0a6AuzXYD1INSJ1IJSJFKkGpEakGpAVKQakRqQakSlS5AOQlyAcgGOWgHIByBcgPXIVKRpS0JcgCkxUnvYUnrYqTA8fAH0N8AfQBszWYdkayKAWZrMOyNZADizYsbijYoBWLNixuKNigFYs2LG4o2KAGzNZh2RrIDyzNZh2RrIDyzNZh2RrIAFEJRDUQ1EAVEJRDUQ1EDxINIyQaQUyQaRkg0gPYobFa0DFb0NiiVCih0UBFb0NigHRQ6KFxQ6KM67DYjoCY9HRDSKIDY8FQGx4RVnx6VQJo9KYGdDo9Gx4Kj0bHhyqNj0dHgmPRseGdDEw0xKYaYUddGugLs12ATYDZm9AtgetgNmbAbAzYDZmwGy4l5JipPewpPWxUmXAMmKk97Ck9bFSZcjNpMVJ72FJ62KkzSQaTFSe9hSetipM4y0MmKk97Ck9bFSYNaT0Kk97Ck9bFSZridDJipPewpPWxUmMc0EuCZdGy4Kl0vC0iXBUujZcFS6MZ2ly4Jl0dLgmXSsLSZcEy6NlwVLoxnaVLguXRkuCpdKxGhbAbM2A2MNE2A2ZsBsvGfpw4xHKOg1DfBsYI/KSv0mAhDZRGGjRhsojDRpKY0I7KoR0KhHZXCOhKSGU4u5XCPBMI7K6a0aStJD6a2iuC0T01srgtFKh0elMeE0elMeBrFKe9DYsni9jYvWhIky6PboXdmuy5AbYDZmwGzWRFeyerCpPewpPWxUmayM6GTFSe9hSehUmenll1QyYqT3sJvWxUmaR5uqGTFN7Ck9bFSZoi142A2ZsBsM7QtgNmbAbCdZsBszYDYNE2A2ZsBslmO/s10LuzXYDske5ITkzZMzwU5I2SJsmbJjBXkj3ImyZ5kycFWR5kibJmyYwNcgHIByBcilDbAbM2A2BnwB9DfAH0kazNZh2RrIDyzNZh2RrIarA4s2LG4o9xRzXcLxZsWNxRsUTqsKxZsWNxR7ihpheLNixuKNiitThWLNixuKNijumAxZsWNxRsUNMLUQlENRDURphaiEohqIaiNMLUQlENRDUTmmBUdhKIaiGok6rAqOwlENRDURpgVEdGJoxGqJWuPIobFa0DFb0NihoKKHRQEVvQ2KIUbEdETHo6AD49GR4Kj0bHhytYfHpTHhNHpTHhlXTY9Gx4Kj0bHgqjY9Gx4Kj0bHhnQa6GuALoa4FCujXQF2ZN3AN8AfQ3wB9KSFsBszYDYGbAbM2A2diXkmKk97Ck9bFSezSAZPQqT3sKT1sVJ7KiKGTFSe9sKT1sVJmsZ1pMVJ72FJ62Kkw40mKk97Ck9bFSYAyYqT3sKT1sVJlJ1pMVJ72FJ62KkwaGTFSe9hSetipM0RQy4KkNlwVLoRSZcEy6OlwTLp2Ry0qXBUujZcFS6aSM7SpcFS6OlwTLpWItKYt9DfAH0YzteNgNmbAbKw0pU3fgaptbKlTQapqx+Mlfq8JjT9DowY2NP0NjT0aSmFwplMIMKFNfZRCnoSkjyEOaKIRdjRh/RRCHo0laSDhHhRFaBgrMohHRsmDit3GxWtApbGxVw1g0g0jJBpFyJeGMY1kAPgD6G+APppIihkxUnvYcmJk9mkjOhkxMn+hyf6KkzaPN1QyYqT3sKT1sVJmkefqhkxUnvYUnrYqTNGdrxsBszYDYZ2hbAbM2A2E6zYDZmwGwaJsBszYDZIK6NdAXZrsD26NdAXZrsYHZI2SFZM2TGBuSNkhWTNkycDckbJCsmbJjAeSNkhWTNkyVGXRroC7PbsD1dDXAF0NcJGSDSMkGkHY8UQlENRDUTLW2FqIaj9BKIaiNMBizYsbijYonVYVizYsbijYoaYVizYsbijYorU4VizYsbijYoaYDFmxY3FGxQ0wtRCUQ1ENRGmBUQlENRDURphaiGo/QSiGojTAqISiGo/QaiTqsLUQ1EJRDURpgVEJRDUQ1ErWTxINIyQaQ0exQ2K1oGK3obFHVDj0bHgqPR0eAMj0bHgqPRseHK1hselMeE0elMeGddNj0bHgqPRseHKo2PRseCo9Gx4RQS6MXBa6MXDimN9mMB62A2ZsBspLPgD6G+APoAyYqT3sOTEyZ2JDJipPewpPWxUns0gGT0Kk97Ck9bFSeyoitJipPewpPWxUmaxlQyYqT3sKT1sVJgaTFSe9hSetipMDxsBszYDZTHQSYqT3sKT1sVJg1pMVJ72FJ62KkzR2tJipPewpPWxUmEUuXBcujJcFS6ayMrS5cEy6NlwVLppIztKlwVLo2XBUul4i0qXBUujZcFS6MZ2hfAH0N8AfSsNdheOEvHVjoLx9hLx9H4SdP2flBGk/wAGxpMsjSV+DVSX4aTo8pVRQ2NEfGi/xjlROyr8kxhsohTf2FGC+0Uxho0lMBGHodGISiOjAqUx5GI6MTRjsao6NJTC8WbFjcUe4ouV2gaAaHNAPppKiky4Kl0dLgqXTXmsqVLgmXR0uCZdPRzWVKkxUnvYcmJkzaVh2GTFSe9hSetipPZpK8/QZMTJ7Dk9bFSe7HYivGwG9mbAbNIzoWwGzNgNnGbNgNmbAbAJsBszYDZI10a6AuzXYB3RroC7Ndkj26NdAXZrsA7o10BdmuyQV/Zr+xd2a7AbdGugLs12KoxMNMSmGmZ0MXQ1wBdDXBVQ1dDXAF0NcMq0g4obFa0DFb0NihVx6kGkZINIzrSBxZsWNxRsUcdKxZsWNxRsUAuzNZh2RrIpJVmazDsjWQHlmazDsjWRoMkGloyQaQApBpGSDSMVPFEJRDUQ1EDxINIyQaQApBpGSDSAWkGkZINIpiFINIyQaQHq6GuALoa4aBkejY8FR6NjwBsejY8FR6Njw5XYbHo6AmPR0DOtIogNjwVAbHhCzF0NcAXQ1wA10NcAXQ1wkHdGuhd2a7A9fAH0N8AfSgD4A+hvgD6AMmKk97Ck9bFSZccrSehUnvYUnrYqT2aRnS5MVJ72FJ62KkxE1pMTJhyetipM1jP+lyYqT3sOT/RMnsR2tJ6FSe9hSetipMuIoZMVJ72wpPWxUmdQ0mKk97Ck9bFSYHrYDZmwGy4ULYDZmwGzSMqCXBUujZcFS6IzoJcFS6NlwVLppGVKlwVLo2XBUulxJL4A+hvgD6XGdA+APob4A+nUvvfg/wDDfAdH4P8A09+A/nU6f0Hy5ypO/EGqT9Fyop/QSpL8NJ055RKm78CVNlip+glT9GsqcTxg78GxgNjTHRgi5TCIwGqIxQ2NjFGkpgFHYSiGohqJcphWLNixuKNii5U0loBoc0A0aSs6mkJl0dITLprzWVKlwml0plwmn09HNZUqT0Kk97CkxUmbSsOy5PQqT3sKT1sVJmkrDouTEyew5PWxUnuxrGdeNgNmbAbNIzoXwB9DfAH04zA+APob4A+gePgD6G+APpI9fAH0N8AfQPbo10BdmuyR7dGugLs12ATaueXQLbueXZIO6NdAXZrsBiYaYlMNMVQl0NcAXQ1wzoKPRseCo9Gx4KqGx6NjwVHo2PDKtOTY9Gx4Lj0ZHgq4YuhrgC6GuGdaQ0xjHHWMYwGMYxSQmMYAjGMaAl0NcAXQ1wD1dDXAF0NcMVGroa4AuhrgHq6GuALoa4B6YxgCMYxTFl0NcAXQ1wA10NcAXQ1w0DI9Gx4Kj0bHgBx6NjwVHo2PDldh8ejY8FR6NjwzrTk+PRseCo9Gx4QscejY8FR6NjwAl0NcAXQ1wkFdGugLs12B6+APob4A+lDx8AfQ3wB9ATLgqXRsuCpdLjlBJ6FSe9hSetipPZpGdLlwVLo2XBUuiJpUmKk97Ck9bFSZrGdDJiZPYcnrYqT3YR2hkxUnvYUnrYqTNIzrSYqT3sKT1sVJhLxsBszYDYAtgNmbAbLjlZsBszYDZpGdC+APob4A+iM6XLgqXRsuCpdNIyBLgqXRsuCpdLiS3wB9DfAH00jOltANDmgGgl+s/Gz342vos+Nfh78a/D+ayv6HiH4/R78b/Cz40/o3xr8NJTEWBsWVYGxRrK4QoBqI5RDUUaShKjYJRDUQ1E1lSXZmsw7I1kaSjxoBoc0A0XKmky4Kl0bLgqXS5WdKlwml0plwml02lR0TN6J5MdNk03s05rz9FyeiaT2Onwnk9nonTHoEmKk97Ck9bFSezWdPP0BsBszYDZc6ZWAfBb6G+APppOmdgXwB9DfBb6NZ48fAH0N8AfRpjx8AfQ3wB9GmPHwB9DfAH0aYxjGGmBMYw0wJjGJ1TGMY5oIxjHNUJdGLgtdDXDmhkejY8FR6Njw5SGx6NjwVHo2PDKtOTY9Gx4Kj0bHhC4cmGmJTDTDSCXQ1wBdDXCXXpjGAExjFJYxjAZdDXAF0NcA8XQ1wBdDXADXQ1wBdDXCVGphpiUw0wCXQ1wBdDXAPV0NcAXQ1wD0xjFJEYxhAxfQa4AuhrhrrLDI9Gx4Kj0bHg0wcejY8FR6Njwi1ph8ejY8FR6Njwi0w+PRseCo9Gx4c12QcejY8FR6NjwauQS6GuALoa4TruPTGMNMePgD6G+APo0wD4A+hvgD6NMLlwXLoyXBUulyosJlwTLo2XBUulys7CpcFS6OlwTLpcpYRLgqXRsuCpmkrOwqQmT2Mk/0TJ7scjtDJipPewpPWxUmaRnWkxUnvYUnrYqTCXjYDZmwGwM2A2ZsBs0TQvgD6G+APoZUD4A+hvgD6XE0D4A+hvgD6aRlQy4Kl0bLgqXS4kpoBoc0A0aRnS2gGhzQDQS/bnEFxKHEBxP5jK/o+EOILiUOIDiaSmFNANDmgGjWVkXZmsw7I1kaSjwxjGsqXt0a6AuzXZpKPWwGzNgNlSpryTFN7Ck9bFSZpKzpM3rRNN7HTfSaT2bSo6Lm9E03sdJk0nsuV5+gTeieT2Ok9E8ns1nTLoqXBUujpcEy6azp5+i3wB9DfAX0udJsA1oBoc0A0aTpnYW0A0OaAaNNZ4S4guJQ4gOI1zCHEFxKHEBxGmFOLBcWUOIDiNMJxZsWNxRsUNMIxZsWNxRsUNMIxZsWNxRsUTrhWLNixuKNihoDFmxY3FGxRGqCohKIaiGojR4kGkZINIoj2KGxWtAxW9DYozrTll0NcAXQ1whcNXQ1wBdDXA0j1dDXAF0NcJdeGMYDGMYpLGMYAjGMAS6GuALoa4B6uhrgC6GuEqGuhrgC6GuAeroa4AuhrgHq6GuALoa4B6uhrgC6GuFJZINIyQaQGSDSMkGkd1zHsUNitaBit6GxQ0xoodFARW9DYoi1phsejY8Fx6Mjwztdw2PR0eCo9Gx4NJDV0YuC10NcGtJBroa4AuhrhOmPTGMNMA+APob4A+jXMDLgqXRsuCpdGmFS4Kl0bLguXSpU2Ey4KmNlwVLppKzsJlwTLo6XBMulylhMuCZdHS4Jl00lZ2ES4Kl/obLgqXS4ilS4Kl0bLgqXTSM6VLgqXRsuCpdCS3wB9DfAX0Bb4A+hvgD6aJrx8AfQ3wB9DKvHwB9DfAH0uJoHwB9DfAH00jOvHwB9DfAH0uM6B8AfQ3wB9LiKW0A0OaAaOpfujkA5AuQDkfzOR/R9G2A2ZsBs0kNZsBszegGy5E6NyAcgHIFyNJDTMkbJCsmbI1kZaa5AZiXIByZpIac5AOQlyAci4m02UkJlIFyEyky4ztaciaT2HKWieUi4yoZSJ5vYU3onlLZpGdeSYqT3sKT1sVJlysqz4LfQ3wF9NJWfUBZmt6Dsj23oqdMLCMWbFjcUe4mk6Z2JcWbFlWJsUXOk4lcQHEscQHD0aToxLgbAqwNgPSMR4GwKsDYD0Yiwf6bB/pXgjYL9J9GIsH+mwf6V4L9Ngv0ejEWD/AE2D/Sz4zfGPRiPB/p7gyrBfp7gv0ejE2LNiyrE2BOrxMohqI7D0GojTE6iGojlENRJ0wtR2EohqIaiNMLUQlENRDURqwqISiGohqI0LszWYdkayI1s8szWYdkayGgLM1mHZGsivSMDizYsbijYo76MLszWYy3o1vRz0Y8SDSMkGkPRgUg0jJBpE+lYFINIyQaQ9GBSDSMkGkPRjJBpGSDSHowKQaRkg0ifTnkCiGo/QSiGoj0eWUQlENRDUR6VOQxWxsVrQKQ2K0PTSciihsVrQMVvQ2K0TeiciihsVrQMVvQ2KMr00nIoobFa0DFb0NiifS/D1INIyQaQ9Hlkg0jJBpE+leQGMYejy8fAH0N8AfSvSfJcuCpdGy4Kl0ejyGXBMujZcFS6VOi8kS4Kl0bLgqXTWdMryRLgqXR0uCZdNJ0zvJMuCZdHS4Jl00nTO8kS4Ll0bLgmXS5UWFS4Kl0bLgqXTSVnYVLgqXRsuCpdL1FhT+wH0N8AfRrOwL4A+hvgD6aa7QPgD6G+APo1nXj4A+hvgD6XKmx4+APob4A+mkrOx4+APob4A+l6iwD4A+hvgD6NZ2PHwB9DfAH0anH7O5oBzRO5gObP53I/oOqnU9gOp7J3U9gOp7NJDVTqIB1ETuYDmy5E6pcgHP2JyAczSRzVTkA5+xOQDkayI1Q5AOQlzAcjSRzTpTQpzQmUxUps4m0+UhLlsFy0JlIuM7RSmJctgOYqUi45ROQqUjSkKctmkZ16+C30Y+APpyVlXlmazDsj23ouVnQqISiGohqOjk6RYQoMNQ9FCgg1D8RpOmdiT4z342V4I8+NFTpOI8PRvj9F2Ho3x+jWdGOf8fo3x+i340b40PaMQfH6N8fou+P0b4/Q9mIPhN8JZ8Hpm+H0yfRiD4/Rvj9Fvx+mb4/THoxF8fo3x+i34v/TfF/6PRiL4P/D34P8Aws+H0zfD6Y9GIvj9G+P0XfH6Nh6K1eI/j9G+P0XYejYehpiT43+G+Jlvx+jfH6I0xMqbCVNlCh6YapjTEagw1AoVP0Gqfoa4lxZsWU4/+mxQ0IxdjYsqwNgTraJ8WbFlOKNihonxZsWUYo2KJ9VWE4s2LKMUbFD1TCMPRsCrE2I9UxMosNQY5Q9BqI9GJ1FhqD/Byig1Ej0rE6gw1B/g5RDUR6MTqDDUH+DlENRHoxOoMNQf4OUQ1EejE6iGoDlD0Goo56d8kqIeI5R2EonPTvkCiEohqIaiPSpyFRsEohqIaiPTSchUR0Y6NFDlEm9OzktRHRiaMRqiZ3ppOXsUNitaBit6GxRPtXl4kGkZINIejy1mazCsj2yI9K8MYxh6PAXwW+jHwW+l+k+C5cFS6NlwVLo9HgqXBcujJcFy6VOi8lS4Jl0bLgqXTSdM7yRLgqXR0uCZdNZ0yvJMuCZdGy4Kl00nTO8kS4Kl0dLgmRvKwsJlwTLo6XBMumkrOwiXBUujZcFS6XqLAS4Kl0bLgqXRrOwL4A+hvgD6aamvHwB9DfAH07rKx4+APob4A+lSqsePgD6G+APpcrOwD4A+hvgD6XqLHj4A+hvgD6NZ2PGwGzNgNjU4/T/m/wDTfN7ZH8xvmPws5fuNWfIeZok+Q3yGk5PSt1NAOoTup7Ac2XIz1Y5r7Acyd1AHNmkhqxzQDmTuoA5v/wBKkTqlzAc/YnP2A5mkhprmgHMnc/oBzZeOWqJS0JcgXPQmUhjO0bkA5aAcgXIYm1ro8ugL+zXYxlaJdDXAF0NcLZvYobFaBit6GxQGUR0Y6NGI1RCQxiNUdBqI6MQJ1TDVMoVNBKmjTWWJfjfo3xsr+NG+NDTEnw+kb4fSLPhN8JWpxB8fo3x+i7D0bD0NMc/D0bD0XfH6N8fo5piHD0bD0XfH6N8fo7pjn/H6N8fou+P0b4/Q0xDh6Nh6Lvj9G+P0c0xDh6Nh6Lvj9G+P0d0xHh6Nh6LsPRsPQ0xJ8P8A4b4f/Cz4TfCNMR/Gb4yvBfpsF+jTE3xmwZX8aNgv0nVyJPjNgyzBHmC/TmrkS4GwKsUbEnXZEuLNiyrA2A1pInwNgU4o2KHpWEYGwKcUbFD07ibFmxZTgjYIn05hGLPcWUYI2KHowlQDUByiGok+l4lUQ1AcohqI9GJ1ENQHKIaiPRhKgGoDlENRQ9GJ1ENQ0OUEGoon0TlOohqI5RCUTnppOSlEJRDUQ1Em9OzktRCUQ1ENRM720nLJBqISiGo6OXppOXiQaRkthpGd6azkSQaWjJBpE+jyyQaRkg0h6PLy3o1vQyyNZE+leS2gGhzQDQ9HkL4A+hvgD6V6PJUuCpdGy4Kl0ejyVLgqXR0uCZdNJ0m8lS4Kl0bLgqXTWdMryRLguXRkuC5dN+emfXKeXBUx0uCZdPRz083XKeXBMujpiZdNOay6hEuCpdGy4Kl035rz9QiXBUujpcEy6XKiwt8AfQ3wB9NJWdgHwB9DfAH07qMePgD6G+APo0x4+APob4A+lamwD4A+hvgD6NZ2AfAH0N8AfStRY8bAbM2A2NZ2CbAbM2A2Vpj7j5F+nnyr9Is/Z78j/T8lOX6r0u+Q3yEeb/DZv8NJyelvyI2a/CTN/hs3+HJDVWSNkibM2ZpIaoyPMkTZM2RUidPcwHP2Jc3+gORpIac5IBz2JcgHJl4WnOYDkJcgHJjGdpzkA5AOQLkMRaYmGmJTDTGM7TYvehsWTxY2L1o4HR6Ux4TR6VR4AcFspihMVsogtBJsUNitaBit6GxQHqQaRkg0jmuYCzNZh2RrIaYHFmxY3FGxRWpwjFmxY3FGxQ0wrFmxY3FGxQ0wrFmxY3FGxQ0wjFmxY3FGxQ0wrFmxY3FGxQ0wGBsBuKNihphXxs3xsdc1xphOLNixuKNihphWLNixuKNihphWLNixuKNiidXIXizYsZij3FDWkhOLNixuKNiidJC7ejW9B2RrIa0kLxZsWNxRsUZ+l4GzNZh2RrIejAWZrMOyNZE+jHlmazDsjWQ9GPLM1mHZGsiPVVjJBpGSDSHqmBSDSMkGkPVMCkGkZINIeqYFINLRkg0ifTSclpBpGSDSHppOQpBpGSDSIvTs5CkGkZdCSIvTScvUg0tGS2GkcvTWcskGkZINIzvTSciSDSMkGkR6PLJBpGSDSHo8hszWYdkayJ9VXktoBoc0A0PVPJLQDQ5oBor0eSZcFS6NlwVLp30eS5cEy6NlwXLppOk3kmXBUujpcFS6aTpneU8uE8ulMuEsv9Ho56Y9clS4Kl0bLgqXT0c9PP1ynkJl0dMTI35rzdQmXBMujZcFS6ejmvP1CpcFS6NlwVLpcqLCmgGhzQDRpKzsJaAaHNANDUYW0A0OaAaGmAfAH0N8AfS9TYW+C30N8AfRrOwD4A+hvgD6VqLCnwB9DfAH0azsA+APob4A+laY+nyNkS5GyPzuP0Wq1IJSJ1IJSO4afmbJCcmbJlSGnZmyQnJmyZpOTT3IFyFuQLkTIaY5IByAcgXLZpIaY5AOQDkC5bLxlonIByAcgXIYaZkjZIVkzZMYnTUw0/YlMNMY4fF70NiyeLGxetEYnVUWUweiOD2UwYw1VApg/wBI4PeymLJxCuMhqkSKQ6MhgpUg1InUglIYKMkbJCsmbJjA3JGyQrJmyYwMujXQF/Zr+xgO6NdAX9mv7GA7o10BdmuxgO6NdAXZrsnAd0a6AuzXYwNujXQF2a7LB3RroC7NdgNujXQF2a7AO6NdAXZrsD26NdAXZrsKg7o10BdmuwuDujXQF2a7IqoO6NdAXZrszq4O6NdAXZrs5VDujXQF2a7M6DujXQF2a7DXTbo10BdmuwaYmGmJTDTDhiYaYlMNMBiYaYlMNMlRiYaYlMNMBiYaYlMNMlUMTDTEphphcMTDTEphp6IrWUS6GuALoa4Z1pKNdDXAF0NcIsXKZHo2PBUejo8M7Gkpi6GuALoa4Ti9GuhrgC6GuDDXlmazDsjWQw0toBoc0A0Mc0qS1sVJFEkKkt7Ejmky4Jl0dLgmXTSRzSpcFy6MlwVLpchaRLhPLpRLhPLppIztLlwml0plwml025Y9fCpcJ5dKJcJpdPVy83X0qXBUhsuCpdNuaw6hEuC5dGS4Kl09PNebqFvgD6G+APpUqLC2gGhzQDRpKiwtoBoc0A0d1GFtANDmgGhphLQDQ5oBrZWosIktbFSRRJfYqS3sazsTyWtipLZRJCpLexpYXLgmXR0uCZdGs7AvgD6G+APo0x2F0NcAXQ1w+Tj7OjTCTFJhpjDTDGMVIa9ujXQF2a7NJDRXR5dAXZrs5Ia9bAbM3oBsuRzWbAbM2A2VjPRNgNmbAbGGiujXQF2a7O4nTEw0xKYaZzDVEZDVIkUh0ZHMRqyMlcohP2c+MiiM9HMNXRlsojPXTnxnvpRGejmO6vjNDVNHOVT2OjU9jBaphqaIVU9hqoMF+fs2fsh+T2b5PZzHNWZr8Nmvwkzf4bN/h3HVnyG+Qj+Q3yDBZ8hvkI/kN8gw1bmvw2a/CT5DfIcwV5r8Nmvwk+Q3yE4Lc1+GzX4SfIb5BgtujXRJ8sv03yy/TgrzX4bNfhJm/wANm/wCzJGyRNmbMCnJGyRNmbMCnJGyRNkzZMKinJGyRPkzZMLijJGyRNkzZEV2KckbJE2ZszOtIfkjZImyNkcqlWa/DZr8JM2bN/hnRXmvw2a/CT5H6N8j9B3Vea/DZr8JM2bNg1Xn7DUyNTDz9harP2GpkakGp+wLFINSI1MPP2SpYpBqRGphqfsCpSDUiNSDUmSqLFINSI1INSC4pUglInUglIiuyqVINS0TqVwlIzrSVVGQ5SJFLY2Mjti5VMXvQ2LJ4u7GxetGdjSU6L3obFk8WNi9aJxenLoa4AuhrhzDRGMYYaz4A+hvgD6MNDLgqXRsuCpdOyI0qXBMujpcEzNJDU8xMujpiZdLkLSpvRNJ7HTZNN7NJGdoJvRPJ7HTeiab2XyjouTuKk97DkxMmejl5+vpcmKk9hyYmTNOaz6gHwB9DfAH09HNefqAfAH0N8AfSpU2F2ZrMOyNZGkrOwqzNZh2RrI7qMIcQXEocQHEaYQ4guJQ4gOJWosSSiJcX9FbiKlEaixNJa2KkiiSFSW9jXLCZLWxUkUSWhTWxrOwhoBoc0A0NMdSzNZh2RrI+fj6mvLM9swrI1kMNemMYrEsYxhIAfAH0N8AfTY162A2ZsBs65rNgNmbAbKQJsBszYDYGujXQF2a7CTEw0xKYaYDlIJSJ1IJSOYlSpbHRn7IYyHKWjmC2M0OjURz4zdxsansnELlWYSrMgVbYarDy5q5V2GqzOeq29hqt/4MNdH5jfMc/wCdG+dDyL/mf6b5n+sg+dG+dDF6u+b2zfN7ZF8//hvn/wDBhq/5jfN6I/m9o3ze0MTqz537N8//AKR/N7Rvm9oY4v8Ak9m+T2Q5+zZ+ycaOh8ns3yeyH5PZvk9jB0FUQaqKxzlU30NVH+jBd8iN8i/SL5PZvk9jBf8AIb5CP5DZsjBbmvw9zX4R/IbN/gwW5o2a/CTNmzYxerM1+G+REebNmxjuq80e/ISfIzfI/ZOL1T8hs17JPkfs3yMY7qvNGzRHmzZszxWqs0bNEebN8j9DD0q+RezfIvZH8j9G+R+hhqv5fbN8r/WS/L7Rvl9o5h6VqfsNVPxkObDUycVq5VPYaqfjIVN/Qan7B6XKoGqhCqjDUycXq5VA1PZCpsNTGGr1MNSI1MPP2ThKsUrBqZGpBqWhjSVYpBqZGpMNTZOKnS1TX6NjMhjMcpuw8tJ0pjLY1SJYydxsZGfl2dLIyHKRJGWxsZHPLSdK09jYsnixqbtoz8r9KE9jYsni3cam7aHk9H3RroXd/prseT0Y+APob4A+jyegy4Kl0bLgqXTTyei5vRNJ7HSeiab2PLnoqb0Tyex0nonm9lzlHoub0Tyex0nomm9mk5c9FTeieb2Ok9E03s1kZWlyehUnvYUnrYqTNJGdoZMVJ72FJ62KkyomvWwGzNgNmsZV4Yxi9RjyzPLMOyNZHdcwFmazDsjWRWpwDQDQ5oBrY0wlxBcShxAcStRYlktbFSRRJWFSW9jUWJ5LW0KktlEkKkt7GuWJ5LWxUldlEloVJb2NZ2ENaAaHNANDTHSUQlEYohKJ5sevS7M1mHZGsjuGgszWYdkayO4oDQDQ5oBoYFPgD6G+APpbPQPgD6G+APoNA+APob4A+lDx8AfQ3wB9AExjBLy6NdAXZrsA7o9v7F39mv7KxJ6kGpE6kEpDA9SDUyNSDUicZrM1+GzX4SZv8Nm/wYLc1+GzX4SZv8Nm/wAGC3Nfhs1+Emb/AA2b/BgrzX4bNfhJm/w2b/Bjmq81+GzX4SZv8Nm/wYatzX4bNfhJmzZv8GOq81+Hua/CPN/h7mxgt+Q3yEfyG+QnFrlU9hqaIVU9hqoMdWKoGqnshVT2GqgwVqfsNSI1MNT9jBUp+w1MjUg1InBUp+w1IjUg1IYKc0bNE2TNkxjmq80bJE2TNkzmGqskeZInyZ5kzmNdPyRskTZM2TOYaoyR5kibJmyM8Vp7mA5+xLnYByGGqczZkuTNkxhqnJGyRNkz3JjDVakGpEakw1InFaqz9hqZGpBqQw1YpbHRkQxmxylojFasUg1IjUg1MYatUglInUglInHZVamGpIjUg1IY0lXKaDUkRqTDUtE45OlSkrjoyRDGY6MmMXOlsZbHRkRxkOjI55dnS2L2UQlohjLZRGWh5aTpZFq5RGWiGMtlEW7GflXqqovY2L0TxY2L1oeT1T09hpiUw0x5PVG2A2rmbAbHk9V7JiZMOT1sVJmnk9FTetE82Om9E03s75PVBKWiabDk2TzkVOWfouctE8nsObJpS2aTk9NKWiabDk9E85bOyOWvHITKRpSEuRpIztetgNmb0A2TFVro10BdmuzWM69ujXQF2a7GuYYuhrgC6GuDTHpjGK1OBszWYdkayGmFNANDmgGitTYRJa2KkiiSFSW9ndZ2JZLWxUlsokhMkNcsTy4Kl0dITLo1nYW+APob4A+jTHYszWYdkayIavLM1mHZGsgAszWYdkayKCmgGhzQDQE7QDQ5oBooJaAaHNANAKfAH0Yxb6EgfAH0N8AfQAfAH0N8AfSksYxgBMYwZtdGv7F3ZrsBmSNkhWTNkykn5I2SFZM2TAfkjZImyZsmSKckbJE2TNkwKckbJE2TNkyhR8jN8jEfIjfIgKskbJE2TNkyRTkjZImyZsmBZkbMlyZsmSasU/YamRqQakDVSkGpEakGpEqWKQakRqQakBUpBqROpbCUiQ9SDUidSCUgKFIJSJ1IJSDQ7JGyQrJmyYDckbJCsmbJh3TXIByAcgXIGmOQLkA5AORlitMcgHIByBchhp2SNkhWTNkycNNyRskKyZ7kxhpykEpE6kEpFuqlIJSJ1IJSAqjIapEqkNjJmWKVJhpiU/8A9hpjA9SDUidSCUjilKkGpE6kEpAWKQSkTqWwlIjGmqIyGqRIpDoy0cw1XGWyiMtEMJFEXo5jXVkXsojLRDGWymDGGq4vZRB6JIPZTFjFaqi96GxZPFjYvWhhqlMNMSmGmMNG2A2ZsBsYa9ctCZS2aUhLkVIa8lInk9hSeieUtlyGgnLRJOQ6ctEk5bO4nQTkTyew5smnL2MNeTmTyls05aJ5T301Q9chUpGlIS5AMcgHIByBcgGZI2SFZM2TAZdGugLs12UHJhpiUw0wG3RroC7NdlMzbo10BdmuwPWwGzNgNhNeSYqT3sKT1sVJhnS5MVJ72FJ62Kkw5S5MVJ72FJ62KkwzoZMVJ72FJ62KkytdfQWZrMOyNZEtHlmazDsjWQHjQDQ5oBooLaAaHNANATtANDmgGigloBoc0A0BO0A0OaAaCSWgGhzQDQC2gGhzQDRSQPgD6G+APoAPgD6G+APoZsYxgAujXQF2a7KS9ujXQF2a7AO6NdAXZrskHdGugLs12Ad0a6AuzXZQO6NdAXZrsBt0a6AuzXZIO6NdAXZrsBiYaYlMNMkMTDTEphpgMTDTEphpkqOTDTEphpgOTDTEphpkhqkGpE6kEpAUZI2SFZM2TDQ66NdAXZrsA7o10Bdmv7CNMcgHIByBcgaY5AOQDkC2xitHdGugLs12cNHdGugLs12cw0xMNMSmGmMNEuhrgC6GuEtRroa4AuhrgDI9Gx4Kj0bHhzFGR6MjwVHo2PBgYuhrgC6GuGShroa4AuhrgBroa4Auhrh3HdMj0bHgqPR0eDDRR6Ux4TR6Ux4RjTT49KY8Jo9KY8GGnx6VQJo9KYjFaogNjwVEbHgw01dDXAF0JcGGs2A2ZsBsYa03onk9jpPRNN7LkNLnLRJOWx05dJJy2aSGlzloknLY6ctElRjE6XOfdk85bNOTsTynsYa8nInk9hSeieUtnXROQqUjSkJcgGOQDkA5AuQDskbJCsmbJgOUg1InUglIoPUg1InUglICjJGyQrM2TKZn5I2SFZmyAa5AOQDkC5BFeuQqUjSkJcthFeSkTSYcmTzkHAuQqUtmlITKQZ17KQlyBchMpE66+zMYxTQRjGA1mazDsjWRQU0A0OaAaAS0A0OaAaKCWgGhzQDQCWgGhzQDQSnaAaHNANAJaAaHNANFJJaAaHNANAJaAaHNANBmB8AfQ3wB9A8fAH0N8AfSksYxgBMYwGMYwGMYxoljGMBjGMB7dGugLs12AwxjGWBiYaYlMNMYGJhpiUw0yca6YmGmJTDTOYacmGmJTDTOYaYmGmJTDTGGmJhpiUw0xho7o10BdmuzmGiv7Nf2LuzXZOK0d0a6AuzXYw17dGugLs12MQxjGGDLoa4AuhrhONHq6GuALoa4MBJBpGSDSIxTyKGxWtAxW9DYoYCihsVrQMVvQ2KJxTRQ2K1oGK3obFDB6kGkZINIYp4ohKIaiGojBlEJRDjHQaidaBUR0Y6NGI1RAGMdlEUDGOyiMdGahRiURWgIopjHQBRjsoigYrZRGJLZ6ojoxNGI5RA8szWYdkayACXBMujpcEy6AiXCefSif+SefWXHKmm9Mkmyib6SVHtmkZppy0STlsdUl0kqS2WgE5aJJz2MqT0yOpID2UhLlsFyEyn7CtG5AOQlyAcmDTnJAOQlz9gOQXqvI2SJcjZA1UpBqSI1JhqdykaoUg1JEakGpsGqsg1IjUg1P2UnVOSNkibJmyYNUuQDkJcgHIlFHKYpz30By0JlIIo5VNdJ5zX6BObJ5T2SkyU9CJzV+i5TdtMRKpsA5TQqU/YmVT2KlN3JS/RrM1mHZGsjRo9szWYdke2QC7M1mHZGsih40A0OaAaAS4guJQ4gOJQmcQXEocQHECdxAcShxAcQlK4gOJQ4guIE7QDQ5oBopJElrYqSKJIVJb2AhoBoc0A0GZLQDQ5oBoBbQDQ5oBopJdmazDsjWQAGMYDGMYATGMaJYxjAe3RroC7NdgHdGugLs12Ad0a6AuzXZzA26NdAXZrsYGJhpiUw0ycNMTDTEphpjDTlIJSJ1IJSIx3T1INSJ1IJSGGqMkbJCsmbJjDT8kbJCsmbJjDTLo10BdmuycVo7o10Bdmuxhr26NdAXZrsY6O6PboXdnt3cYDXQ1wBdDXCcaDXQ1wBdGLgwMihsVrQMVvQ2KJxQoobFa0DFb0NijmAoobFa0DFb0NijmKCojoxNGI1ROYAUR0YmjEcojFAjEcohKI6MRgTGLHKOglHY6MSGhSgxsYP8HRh6GxgvwBcae+FEKb/AAOEF+FEYaM1FRp7KIwdtoZCn6Hxp64AEaeymEH+Bwp+iiMNEtioxHKIahvg2MQJsWbFlOJ44qwEcoiXEslETKIENRElRbZdUWmSVFtlxyoJ8ZDPpdPjIan2aRn/AFDWeyOs9FVZ7I6z0WhNN6JJy2OnIknLYASkTylsKUtE8pd2HNeuSAcxLkA5A07JGyRNkzZBWn5I2SJsmbJhzVSkGpEakGpFOaqUg1IjUw1P2HNVZI2RLmbMpOq80bNEnyejfJ6BqpzQDmTuYDm/sl2mymrCpTEymKlU30Io5T0TzmgZzf0yeUyUjlPRPKavpgTmyeU9gMlIS5AOeuipSJS/XVEJRGKISiU2JUQlEYohKICsWbFjcUbFGiSsWbFjcUbFATuILiUOIDiUEOILiUOIDiAiURLiVuIqUQlPKIlxK3EVKOwJpLWxUkUSQqS3spKeS1sVJFEkKkt7AQ0A0OaAaDMtoBoc0A0AloBoc0A0El2ZrMOyNZAKszWYdkayKSBoBrY5oBrYg8fAH0N8AfTZITGMB5dGugLs12RjmjujXQF2a7GGjujXQF2a7Kw026NdAXZrsYaO6NdAXZrsnDTkw0xKYaYx3RJhpiUw0ycVpiYaYlMNMYaYmGmJTDTGGjujXQF2a7GGm3RroC7NdjFaO6NdAXZrsYaO6NdAXZrsnDRLoa4Auhrgw0xdCXAF0NcJxemR6NjwVHo6BzDTYobFa0BFfg6KOYqUyKGxWtAxW9DYo5jSUUYjoxNGI1RJxx4ojoxNGI5RGDRjYdGJoxGqJONAxiOUQlHY6MPQwKjDZRCD/A4QX2Uxp6JsVCY09lEKb/BkKa/B8aejKxpCY03cojSY6NNXKY0/RVUTCn6KY0nbiHQpIpjT1wypE8abb4OjTdiiNPfB0aSsTrWJVTd9IJU30sVJdswlT1wa6jdMBwZc4IBwGpc6cNcJZx2dOpD0SThsaObVTSIqvWdOsv54cytps0lcrnVzm1zpVzm1zXWVQ+R0grssrveyCuyYmpqkv52Q1JbZRUk7ENSW2aRnSpS10nlLYU2Tykdd0UpCXLYDkKlLYNPcgHP2JcgHJh3VGSNkibJmyYNVKQakRqQakU5qrJGzJcmbJg1ZmbMmyZ5kykKckbJE2TNkA9zAcxLkA5EpHKYmU/YLkJlIA5T10nnPZpS0TykTUtKQmUjSkJcjKjOVwHIFyAcjo/dvjNg/0rwX6bBfpo2S4mxZTij3FAS4s2LKsTzFGiU7iC4lDiA4gIcQXEocQHEoIcQXEocQHECaURLiVuIqUQkiS1sVJFEkKkt7AlktbFSRRJCpLeykp5LWxUkUSQqS3sBDQDQ5oBoMyXEFxKHEBxAnxZsWNxRsUEkYs2LHYnmKAncQXEocQHEpJTQDQ5oBoBLQDQ5oBo2SB8AfQ3wB9A9fAH0N8AfSsZ6xjGGGvbo10BdmuzuGiMYww1jGMcw0d0a6AuzXZzDTbo10Bdnt2TitNTDTEphpjDTEw0xKYaYw0d0a6AuzXYw026NdAXZrsYrTbo10Bdmuxho7o10BdmuycNOTDTEphpjDTY9Gx4Kj0bHhOK02PRseCo9Gx4Md06C2Ux4JgiiC0RipRxWymKEx6UQWhjSU2KGxWtAxWxsVonFigtlMUJitlMEMBKI6MTRiOUScW8jHZRGIMVsohE5jr2MN8KIx0aMbsohDmibFxoR5oojDRox2UQhzRFi40aZTCm/wKEFq6KYQIqgwp8KYU39oKEFq6KYQMqQuNPfBsafodGHobGCMdbE/GbBlmC/TzBDRHhrgmpAuwFTiNS59SLsQ1I/0dSpH+SGpHY0cvyFs5tdHU8hXZzfJWjWVyuVXObX5/wDDpVzm1+f/AAuVk5dbjOZWf9M6FZ/yzmVv9MuJqOo1sgqPbLKr0Q1HtmkZ1POWiWctjakukk3s6nXjkKlI0pCXIGmOQDkA5AuQNMyRskKyZsmDTlINSJ1IJSKNPUg1IjUmGpA1TkjZImzNmUKXIFyFuQLkAxyAchLmA5kpG5CpSNKQmUvwD1yFSkaUtCXImpaTFSe9hSetipMyoB8AfQ3wB9Oj+jfj9G+P0XfH6PPjRo9OIfjN8ZZ8ZsEDEmLAcSxwAw9FIxK4gOJY4gOIMSOILiUOIDiUlM4guJQ4gOIE0oiXErcRUolJSyiJlErcRUogSSWieUdl0o6J5LZTFNKIlxK3EVKIEriC4lDiA4gT4s2LG4o2KAVizYsbijYokJcQXEocQHECdxAcShxBcSo7UriC4lDiA4msZ1O1oVJFEkKkt7EcpDQDQ5oBo1jOltANDmgGgkJjGAExjFDGMYAjGMAK6GuALoa4B4uhrgC6GuAGYxgMuhrgC6GuEj1dDXAF0NcA9MYxKhGMYAjGMHdEuhrgC6GuA0yPRseCo9Gx4Rjsp8B0eCY9HR4MaSnQKY8Jo9KY8Jx2U2PSmPCePSmPBi5TI9KY8Jo9KY/5Jwh8ejY8FR6OgMXDo9KY8Jo9KY8OWJh0VspghMPopgjOxpDoLZTFaEwKYrRyrhsFsrgtE8EVwWiK0hsFsrhHSEwjwrgtGVXDYRKIrQEEUxjoyrSPYxHRiaMRyiZ1bYs8xY7FGxRnRK464T1I7LrE1WIggqr+Tn1f9HTqr+WjnVVtlwczyPo5fkfR1fJ6cnyeFxlXL8pnI8p3Op5RyPJf6axnXM8h2ZzvIff0v8h7ObXeiozc7yHuxBXeizyHsgrvVjSIqeb0STZRNkk3s6kEmKk97Ck9bFSYHjYDZmwGwDyRskKyZsmA/JGyQrJmyYD8kbJCsmbJgMujXQF2a7KDWwG9mbAbAJsBszYDZKQtgNmbAbAF8AfQ3wB9JC2gGhzQDQC7M1mHZGsiR/T7gA4MucF9gOBo9mJMPQDgWOKAcUDEjiC4lDjoBx+ik4kcWC47KHHQDiDEso7AcShxBcSmKVxBcShxAcQJJREuJZKImUSkp5REyiVuIqUQI5REuJW4ipRKYpHEBxKHEBxAmcQXEocQHECfFmxY3FGxQCsWbFjsTYkhDiC4lDiC4gJlES4lbiKlEuO1LKIlxK3EVKJpGdSyiJcStxFSiI5UrQDQ5oBo0jOktANDmgGjqS7M1mHZGsgFWZrMZb0a3ooLszWYdkayACzNZh2RrIALM1mHZGsgPLM1mHZGsgPLM1mHZGsgPF0NcAXQ1wkeLoa4AuhrgHq6GuALoa4Sp6YxgMuhrgC6GuBOjXQ1wBdDXAaKPRseC49GR4VhKfHo6PBMejonMaSnR6Ux4TR6Ux4ThKbHpVHhLHpTHgxpKfDpRB6JIPZTF6JxcURe9DYsnixsXrQxcVQKIPRLB7KIcRyxyLIsog9EkHspizOxpFdNlcHohpvZXB6M6uLIMrg9EMHsrgzOtIugyuD0QweyuDMquK4dK4cI6fSuHDKtIogOjwTAdHhnVjMY30Z0KfCeoxzZNVYglrPTOdVe2XVXpnOrPbNIOf5L2cryXo6XkvZyvJei4yrleUzj+UdXymcjyX+mkZ1zPJezleS+nS8l7OV5L6VGaCo+kNR7K6j07ENR7ZpEUib0STZRNkk3s6kqXBUujZcFS6At8AfQ3wB9AIxjAYxjAEYxgMYxih4+APob4A+gePgD6G+APpKXj4A+hvgD6ANmazDsjWRIVZmsw7I1kAOLNixuKNiiR/UzQDQ5oBo7r24S0A0OaAaGmESWtipIokhTW9mmoTNANDmgGjuhLQDQ5oBoRFTOIDiUOOgHE0iKRKIlxK3EVKOw5U8o6EyiVuOhUohnUTjoTKJdKIlxKdRuOhMol0oiXHYEriA4ljiA4kiXE2JTijYoCbE2JTijYoCdxBcShx0A4gTSjoS4lbjoVKJ2OVLKOhLiVuOhUomkZVHKOhLjsrlHQqUdiFSyiJcStxFSiaRnSHEBx2UOOgXFHWeE4+zYv9G4o2KBhOLNixuKNii9MIxZsWNxRsUd0wrFmxY3FGxRKisWbFjcUbFALszWYdkayCQWZrMOyNZAeWZrMOyNZBTwxjAEYxgll0NcAXQ1wD1dDXAF0NcKBJBpGSDSA0ejY8FR6NjwKPj0bHgqPRseANj0dETHo2PCVKIsdFk8WNi9aAqi96GxZPFjoslpFUWOiyeLGxetAUReymD0RweymL0RVxXBlMJaIYy2UQejOtIuhLZXB6OfB7K4SIq4uhLZXB6OfB7K4S0jOtI6EJcK6ctHPpy2VU5GVVF8JFcJaOdCRZCRnWsWxlscpEikNjIyq1OSNkhWTNkzOjyUiabGSZNOQCar0zn1ZbZVVlpnPqvb0Bz/ACZbOV5MtHQ8mWzleTLRpEVyvJZyvJejpeS9nK8l6NYzrnV3/LOTX/0zpV3/ACzlVntmkZ1DU4yKp9l1TjIan2aRFSzJZdKpksunEkvgD6w3wB9AVZnlmHZGsgkFmazDsjWQAWZrMOyNZAeWZrMOyNZABZmsw7I1kADQDQ5oBoBbQDQ5oBokJszWYdkayACzNZh2RrIKeWZrMOyNZACkGkZINIkf0+5AOQDkC5Ea9+CcgHIByBctjTHrYDZm/sBs01gBi30N8AfRo8fAH0N8BfTWJoGtWAaHNANbNIzpbiC47KHEBxDlTSjoS4lbjoVKIZ1LKIlxK3EVKOynUjjoTKJdKIlxAmcQXEocQHEkT4s2LG4o2KAXZmsw7I1kApoBoc0A0BNJa2KkiiS0Kkt7OxykzWiaS2VzWieS2aRlSZLWxUlu5RJaEyWxCp5REuJW4ipRNIzqdxBcShxAcTrmE4s2LG4o2KBhWLNixuKNijmmEYs2LG4o2KGmFYs2LG4o2KLcIxZsWNxRsUAuzNZjLI8sgkqzNZh2RrIBVmazDsjWQU8MYwBGMYJZdDXAF0NcA9XQ1wBdDXCga6GuALoa4AcUNitaBit6GxQU9j0bHgqPRseANj0bHgqPRseEqPi96GxZPFjYvWgKIvehsWTxY2L1olooi96GxZPFjYvWgKovehsWTxY2L1oiriuDKYSIYy2UQZnWkXwZTCRDCRTBkVcXwltFcHo58HsrhLRnWkXU5FdORz4PZVCWjKqjoQlxFdOSOZCTLIS1YzrWL1LY6MiGMhyloyq1WSNkhOTPcmZ0eylomm+hylonnLuwJ6r0zn1ZbZXVl/LOdVl/TAi8l7OV5L0dLyXs5XkvRpEVy/JezleSzpeS9nK8lmsZVzvJ6c2udHyenOrmkRXOqcZFPpdU4yGp00nxFTS4TS6Uy4TS6cSBoBoc0A0AmzNZh2RrIJBZmsw7I1kAFmazDsjWQHlmazDsjWQCrM1mHZGsgAaAaHNANALaAaHNANEhNmazDsjWQAWZrMOyNZBQUg0jJBpACkGkZINIkf0T8hs0R5v8Nm/wx19BTmvw2a/CT5DZv8GinI8yRNkbJlSuU3JGyQrJmyZrKypl0a6AuzXZcTTDGMaRnS7M1mHZGsiklNaAaHNANATyQmSKJIVJb2UzJktbFSRRJCpLewJmgGhzQDRIW0A0OaAaAB8AfQ3wB9AGXBUujZcFS6AEuCpdGy4Kl0pylS4Kl0bLgqXQyIaAaHNANFJJaAaHNANALaAaHNANGiS7M1mHZGsgFWZrMOyNZABZmsw7I1kAqzNZh2RrIoKszWYdkayABoBoc0A0EhaAaHNANAJszWYdkayKCrM1mHZGsgAszWYdkayKS9XQ1wBdDXAPV0NcAXQ1wA10NcAXQ1wBkejY8FR6NjwpRi6GuALoa4A1BrgC+g1wlRkejY8FR6NjwByDXAF9BrhLsNi9josni9jov8C+VMXvQ2L0TxexsXrRFdiiL2UQeiSD2UxZnWkVQeymD0RxeymBFVFdNlcHoipvZVB6M60iunIrpy0c6nLZZCWkZ1rF8WUwkQwkUwZlWsXRkOUiOMh0ZGVIpyRsxWTNkzOtI03rRNNjpPRPN7JhSKr/AJuc6q/6ZdVemc+q/wCjSM6i8lnK8l6Ol5LOV5LKRXN8g5fk9Op5H0cvyemsR/XK8jpD5HC7yOkPkcKiKgqEdTpZUI6nTSfGVSyX6JkiiSFSW9nXSGgGhzQDQCbM1mHZGsiUgszWYdkayA8szWYdkayACzNZh2RrIALM1mHZGsgoDQDQ5oBoBLQDQ5oBokJszWYdkayACzNZh2RrIkCkGkZINIAUg0jJBpGan7X8zN8zOf8AMb5jHXudJVFfoSqKxzlU30NVHw7osUw1NEKmw1P6KlcqtSDUidSCUi5WdPUg1InUglI9ERVCYaYlMNMuM6IxjFpA+APob4A+gLlwVLo2XBUulMypcFS6NlwVLoCpcFS6NlwVLpIF8AfQ3wB9A8bAbM2A2BmwGzNgNgeSYqT3sKT1sVJlOVpMVJ72FJ62KkwyoHwB9DfAH0pIHwB9DfAH06MYxi0hMYwGMYwC7M1mHZGsgAszWYdkayKANANDWkC0AtoBoc0A0El2ZrMOyNZALfAH0N8AfShjGMANmazDsjWRSQpBpGSDSAFINIyQaQBJBpGSDSA0ejY8Fx6MjwpQ49Gx4Lj0ZHgDF0NcAXQ1wlQ10NcAXQ1wBq+g1wBfQa4SQ6P+hseCo/6Gx4GkNj0bHgqPRseEV2Gx6OgJj0dAzrSKIFUCWBVHhFVFEHspg9EkHsogzOtIsgymDI4P9KYszrWLIFMGRwZTB8Mq1iumx1yemxyZlSKLo10BdmuzOtIz4T1GOb0T1XvRMKmqPRDUe3YsqPRBUfTSM659f7ObXOlX+zm+QVPqOnLrf5Zza/8ApnSrf5f/AKc2v/pmsR/XLr9/+kNcur9/+kNcqM6hnwkn0rnwkn/o1jOkSWiaa2VzWieS2HSXwB9DfAH0DGMYlIbM1mHZGsgPTGMANmazDsjWQHhjGCgtANDmgGgFtANDmgGiQtoBoc0A0AuzNZjLejW9EjxINIyQaQC0g0jW2GkZqfo6rsNVzmqv9Bqtc8cr3OnGpvo1VFbpy41N6Y6NR26XKOjGY2M0c6NT2OjM1lcq9T30bGRDGXscpaNJWdVxkNUiRSHRkaxFPUg1LROpBKRpGdUZI2SFZM2TNoimuQDkA5AuRpGdaTFSe9hSetipMnHQyYqT3sKT1sVJjBpMVJ72FJ62KkxjN42A2ZsBsYM2A2ZsBsYBbAbM2A2MGbAbM2A2ViXkmKk97Ck9bFSYwetgNmbAbNUibAbM2A2B6YxiMSxjGGATGMMGMYwwCYxisSExjDB4+APob4A+l4PXwB9DfAH0YBMYxQXZmsw7I1kAFmazDsjWRSWSDSMkGkBl0NcFroa4UGLoa4LXQ1wA10NcAXQ1wkNXRiFroxfQBINcAX0GuEtDV0NcAXQ1wBq6GuALoa4SoyPRseCo9Gx4A2PR0BMejoEVrDoDoCYDoGdaQ6BTHhNApjwikOh/opgTQ/0UwM60iiBVElgVQM60iiBVHhLAqjwyq4dAd+CYDvwyq4aYxiK0jyXCaXSmXCaXRCpqpDU+y6qQ1PsuM659fv8A9ObXOlX7/wDTm1y4iuXW/wAs5lbrOnW/yzmVus0iK59XjOfV6zoVeM59X/TLjOoanCOoWVOEdQ0jOkTEy6OmJl0l0t8AfQ3wB9AxjGCWMYwGMYxKhGMYD18AfQ3wB9AxjGAExjEqKs7nlmHZGsgPLGt6DsjWRioCiEohqIaiAtRCURiiEokmPoo1FcdGomjlxqO46NR2PBK9joxqexsamunPjNjYzZrKOjGeyiE9HPhMojLRpK5V0Z/0URkc+EuFEJaNZWVXRkNUiSMh0ZHo5+JqlSDUidSCUjSM6oyRskKyZsmbRFNcgHIByBcjSM6NyFSkaUhTlsrHWchUpGlIS5DAUmKk97Ck9bFSYxm9bAbM2A2MAtgNmbAbGDNgNmbAbGDNgNmbAbKxLNgNmbAbGDNgNmbAbOpFdGugLs12B7dGugLs12ViWMYwwYxjDBjGMMHl0a6AuzXZWJHdGugLs12MGMYxWATGMMAmMYkLsz2zuFZHtkBjGMUl4kGkZINIDxdDXAF0NcKHq6MX0LXRi+gGLoa4AuhrhINdGL6FroxAEvoNcAQa4S0NXQ1wBdDXAGR6NjwVHo2PCVDj0bHgqPRseAPj0bHgqPRseEVrDY9HQFR6NgZ1pFEB0BMB0CKQ+H+iiPCeH+iiPDOtOT49Ko8JY9KY8M60imBTB6JIPZRF6MqvlVAog9EkGUwejKrhqYaYlMNMitI03omk9jpPRNJ7EKTVeiGo9ldV6Iqj2XGdQ+Q7M5vkPRf5D2c7yHdFxFc2txo5tZ/0dCs9M5lZ/wBGkRUPkdsQV3ot8h7OfXfEXGdST/yR1Cyf+SOoXGdImJl0dITLpx0t8AfQ3wB9AExjBLGMYAjGMSpjGMBjGMBjGMANmazDsjWRKgWZrMOyPbIAVEJRDUQ1ExUFRDUQlENRAFRCUQ1ENR0S0wMZbHKWiNSHRlo8EaLIyVyiMjnxkUQlo0gvjLZRGRDGWyiD0VHaug9lEZaIYS2URbsenllVsZbGqRIpbHRlo25KqUglKyJ1INS+zflnVOSNkhWTNkzWMqa5AOQDkC5GsZ162A2ZsBstDNgNmbAbAFsBszYDYGbAbM2A2B4+C30N8AfQl4+APob4A+gKfAH0N8AfQAfAH0N8AfQPHwB9DfAH0pL18AfQ3wB9AxjGKSExjAYxjAYxjAYxjACYxgMYxikhMYwGMYxSQmMYDGMYAl0NcAXQ1wDxdDXAF0NcANdDXAF0NcA9XQ1wBdDXADXQ1wBdDXAGroa4AuhrhKoNdDXAF0NcC4ZHo2PBUejY8M3YOP8AodATH/Q2IaRTF70NiyeLHRf4ZV2KIsdFk8WNi9aM60iqL3obFk8WOizlVFMHspi9EkHsoi9GdaRVF7KIPRJF72UwZnWkVQdymD0SRe9lEWZVfKqL3obF6J4sbF60TVGp7DTEphpmVdePhPUY5vpPUew0pVSWiGctlNSWmQVJf0GdS+RLZzfIZZ5D2c3yJa6axFQ1npnMrS/pltaWmc2s/wCjSIqSv0grvRZXeyCu9WLRUs3okmyibJJvYZUEmKk97Ck9bFSZToHwB9DfAH0DGMYkYxjAYxjAEYxgMYxgCMY32BrM1mHZGsiVBSDSMkGkAKQaRkg0iKqCSDSMkGkZVpGSDSMkGkSOXF70NiyeLGxetHijRVF70NiyeLHRZpBXF7KIPWySD2Uwei47VUHsoi9bJYPZRHh6OWVVRexsWTxex0WbclVJhp6Exeg09G/LOm3RroC7Ndm0ZUd0a6AuzXZpGdetgNmbAbLQBi30N8AfQAfAH0N8AfQPHwB9DfAH0Dx8AfQ3wB9CQPgD6G+APoC2gGhzQDQAPgD6G+APoAtANDmgGikk2ZrMOyNZABZmsw7I1kUkqzNZh2RrIALM1mHZGsgAszWYdkayACzNZh2RrIADGMAFnc8sw7I1kUlnwB9DfAH0DGMYpLGMYDGMYAjGMBl0NcAXQ1wD1dDXAF0NcANdDXAF0NcANMNMSmGmA5MNMSmGmSqKEw0xKYaYXDYvehsWTxY2L1ozdh8XsdFk8Xuw2L1oNIoi96GxZPFjosyrsURY6LJ4sbF60Z1pFUXvQ2LJ4sdF/hyqimL3obFk8WNi9aM60iqL2URetkkXvZTBmdaRVB3KYPWySD2URejKr5VxkNUtEqkNjLRNUpyRskKyZsmZ0G2T1JbCctE9SWzjWlVJaIZy2U1JdIKkv6DOpfIls5vkPRZ5D2c3yJa6axFReRLZzvIZZXls5vkS0aRFTVX/ACc+tLZVVl/Jz6r/AKZaCJsmmOm+k02GVLkxUnvYUnrYqTKdYxjACYxiQRjGAxjGAIxjAeJBpGSDSAFINIyQaQAWZrMOyNZEqZINIyQaQApBpGSDSIqoyQaRkg0jKtI9Qa4AuhrhI5EUNitaBit6GxR5IoUejI8FR6Njw0goj0pjwlj0pjw2iVMGUwetkcHspiy4KovehsWTxY2L1o9UTVEXvQ2LJ4sbF60aRnRroa4AuhrhpEV6YxjWM6B8AfQ3wB9LQB8AfQ3wB9AB8AfQ3wB9CXj4A+hvgD6B4+APob4A+gePgD6G+APoHj4A+hvgD6UktoBoc0A0ALQDQ5oBoBNmazDsjWQAWZrMOyNZFJKszWYdkayACzNZh2RrIALM1mHZGsgFWZrMOyNZAKszWYdkayACzNZh2RrIpJVmazDsjWQAGMYpITGMBjGMUkRjGAIxjAZdDXAF0NcANdDXAF0NcJU9XQ1wBdDXAGp7DTEphpktDkw0xKYaYDkw0xKYaZNIpi96GxeieLGxetGVaQ6L3obF6sTxY2L0K7FUXvQ2L0TxexsXrRnWkURe9DYsnixsXrRFVFUWUQeiSL3spi9EVpFEXspg9EcXvZTF6M6uKovZRB6JIveymPDOtIpjIapaJFIdGWjOtFMWaTExZpMzo0paJpMOT0TzkdCqktENSSuUVJaIakv6Al8iW+nN8h6LPIezm+RLXS4moa8v66QV5a6U15b6Q15fyaRFS1JfyQ1JbZRUk7ENSWy0FzZNJjpMmk9hlQNgNmbAbDr0xjAYxjAEYxgMuhrgC6GuAe2ZrMOyNZACkGkZINIAUg0jJBpACkGkZINIKeWZrMOyNZACkGkZINIiqeGMYzoYmGmJTDTIUjUQlENRDUTxRoFRDUdhKIaiaT4CihsVrQEVvQ6K0bRI49KY8Jo9KY8LgfHo2PBUejY8PVEU2PRseC49GR4aRFEuhrgC6GuGkRXpjGNYzoHwB9DfAH0tDx8AfQ3wB9AB8AfQ3wB9CXj4A+hvgD6B6+APob4A+gePgD6G+APoHj4A+hvgD6Ul4+APob4A+gePgD6G+APoA2ZrMOyNZABZmsw7I1kUkqzNZh2RrIALM1mHZGsgFWZrMOyNZABZmsw7I1kAqzNZh2RrIADG+zFJePgD6G+APoAmMYpLx8AfQ3wB9AIxjFJZdDXAF0NcABdDXAF0NcA9XQ1wBdDXAPV0NcAXQ1wlT1dDXAF0NcANdDXAF0NcJaDXQ1wBdDXADXRiFroa4TSHphpiUw0zKtIfF70Ni9WJ4sbF6FdiiL3obF6J4vY2L1ozrSKIvehsWTxY2L1oiqiiL2UxetkcHspi9EVpFEXspi9bI4PZTF6M6uKovZRF62SQeymPDOtIoi96GxeieLGp60Z1odFmkxMZGlIzo0paJpvocnonnI6EVZa2Q1JbKKknZkNWWwJaz/lnMry2y2tL+Wc2s9suJqOvL+ukFeWimvLZDXlo0jOpKjJJsomySb2WmlTZNJ7HTZPJ7DKhbAbM2A2HRmMYDLoa4AuhrgHq6GuALoa4B4uhrgC6GuAZINIyQaQApBpGSDSAyQaRkg0gBSDSMkGkFAszWYdkayA8MYxFUxjGM6PLo10Dd3PLshSnE2LKsTzFHijfCVEJRGKISiaQx4kGkZINI1hXsVu42K1oCK2OijSMqOPR0eCojY/5PVGdNXRi4LXQ1wuMqamGmJTDTNYmjujXQF2a7NYzr1sBszYDZaBNgNmbAbAzYDZmwGwCbAbM2A2B6YxgAfAH0N8AfQPHwB9DfAH0D18AfQ3wB9A8fAH0N8AfSkiMYwAmMYJYxjAYxjFATGMBjGMAJjGA8fAH0N8AfSkvHwH/APyCfAf/APIDPgD6G+APpSQ2ZrMOyNZABZmsw7I1kUl4YxgCMYwGXQ1wBdDXAPV0NcAXQ1wlQ10NcAXQ1wD1dDXAF0NcM2g10NcAXQ1wA10NcAXQ1wVQ10YvoWujF9GVDEGuAL6DXBVQyPRseCo9Gx4Z1rD4vehsXoni9jYvWhSKIvZTF6I4vZTF6Mq0iiL2UwZJB7KIGdaxXFjosnix0X+GVaRQmGmJTDTJrQbYDZmwGzKj2b0SVJdHTlokqS2AmrLRDUkrsoqSdiGrLewI6stMgqy2yqtLXTn1XtlxnUlV/wAs51Z7Lqr/AJZz6z/o0jOpaj0STZRUZJN7LSVJim9hSetipMBb6YxgljGMAS6GuALoa4SPV0NcAXQ1wD1dDXAF0NcKHq6GuALoxAepBpGSDSChJBpGSDSAFINIyQaRQCzNZh2RrIBb4A+jGLfSKp4+AvoT4A+mdHjYDZmwGyB9DgzYP9K/jRsF+ngj24jxNiyrBHmKNIYVibFjcUbFGsZ0CQaRkg0jTllRroa4Auhrh6uWdGuhrgC6GuGkZUy6NdAXZrs0iaO6NdA3Z5dmsZ0bYDZmwGy0M2A2ZsBsAmwGzNgNgE2A2ZsBsAro10BdmuwPbo10BdmuwPbo10BdmuwPHwB9DfAH0DGMYpITGMBjGMEsYxgMYxihjGMANmazDsjWQAvgD6G+APoGMYxSQPgD6G+AvoAWZrMOyNZFJKszWYdkayACzNZh2RrIpILM1mHZGsgPLM1mHZGsgMkGkZINIAUg0jJBpEqCkGkZINIDJBpGSDSM2gUg0jJBpAZINIyQaRyqeLoxfQtdGIzoYvoNcAX0GuCqgo9Gx4Kj0bHhnWsNj0bHgqPRseCkNj0qjwlj0qjwyrSHR6OiJj0dHhnWvKqL/BsWTxY2L1oyrSHphpiUw0ya0G2A2ZsBszo8m9ElSXR05aJKktnAmrLRDUkrsoqSdiGpL+tgQ1+2Ia70WV3/AEQ1+Fxn0jqv+Wc6s9l1V/yzn1X/AEaRnU1ThHPpXPhJPpaSZcFS6NlwVLoC3wB9DfAH0JMMYwGXQ1wBdDXCR6uhrgC6GuAeroa4AuhrhQNdDXAF0NcAZHo2PBUejY8CjF0NcAXQ1wBpjGKHr4A+hvgD6B4+APob4A+kVQZMVJ72FJ62KkzOgGwGzNgNkD710/QDplzggHTR86PbiNwAdP0XOCAcDSGIsWbFlWJ5ijXn6zsIxNixuKNij0cs7AJBpGSDSPRGdemMY0iKxjGNIijbAbM2A2axnWbAbM2A2WgTYDZmwGwM2A2ZsBsAmwGzNgNgFdGugLs12HcEYxgYExjEmBMYwMYxjFM8CYxg5jGMYGMYxgYxjGKGszWYdkayAVZmsw7I1kUkFmazDsjWQCrM1mHZGsiklWZrMOyNZAKszWYdkayKCrM1mHZGsgAszWYdkayCXlmazDsjWQGszyzDsjWQUFINIyQaQApBpGSDSJApBpGSDSAyQaRkg0iWjJBpGSDSAFINIyQaRmoKQaRkg0gPV0NcAXQ1wkgo9Gx4Kj0bHgaw2PRseCo9Gx4ZdKg49KY8Jo9KY8M60hsejoiY9Gx4RV8qIsdFk8WNi9aMq0h10e39i7s12cUa5CpSNKQlyA03okqS6NnLRLUlszCastENSS2UVJOxDUl/QE1V6Zz6r/pl1V6Zzqr/AKZcTUtR6ZDUe2WVHohqPbNIzqaZLLpVLhLLp1JEuCpdGy4Kl0AXwB9DfAH0JEYxgCXQ1wBdDXAPF0NcAXQ1wA0w0xKYaYDY9Gx4Kj0bHgBx6NjwVHo2PAoxdDXAF0NcAaYxjv8AB62A2ZsBszo9kxUnvYUnrYqTFqgyYqT3sKT1sVJmdo8chUpGlIS5Eap+tODAcGXOHoBwPBHvxG4AODLnT9AOBpDELpgODLnBfYDga8/WdiHBnmLLJUxMo+j0cs7CcWbFjcUbFHojCk2ZrMOyNZGkZ0BjGNIivHwB9DfAH01jOgfAH0N8AfS0AfAH0N8AfQPHwB9DfAH0ATGMBjGMGuBMYwMYxjEmBszWYdkayBgLM1mHZGsimWAszWYdkayBgLM1mMt6Nb0DC7M1mMt6Nb0DAYs2LG4o2KKZlYs2LG4o2KAXZmsw7I1kUkFmazDsjWQCsWeYsbijYopJNmazDsj2yAVizYsbijYooIxZsWNxRsUArFmxY3FGxQSDFmxY3FGxQCsWbFjsUeYoKCohKIaiGogKS2Gka2w0iQKQaRkg0gMkGkZJcCSRLR4kGkZINIAUg0jJBpGagpBpGSDSA8XQ1wBdDXCXYNdDXAF0NcDSGR6NjwVHo2PDHpUNj0bHgqPRseEVpD4vehsWTxY1PRFXD0w0xKYaZlWkOyRskKyZsmcUJyFSkaUhLkB5KRNNhyZPORmFVZaIaklcoqSZDVlsBNWWmQVJbZTUk7MhqSdy4mkVGSTZRNklTppGdTzJZdKpcJZdOpBLgqXRsuCpdAF8AfQ3wB9CWMYwBGMYDLoa4AuhrgHq6GuALoa4AUejoiY9Gx4A+L3obFk8WNi9aCjUw0xKYaYDbo10BdmuzoY5AOQDkC5GdHrkKlI0pCXIztU9chUpGlITKRnaBcgHIFy2A5Eap+74+gHEscQHE8kfSRuIDiWOIDiaQSOHoVKJdKIlwNYzqaURLjsrcRUo7NOWVSuILiUOOgHE9MrCwhoBoc0A0aSs7C2gGhzQDRrKysJaAaHNANGkrOwD4A+hvgD6XpgHwB9DfAH0aYB8AfQ3wB9GmPXwB9DfAH0aYGzNZh2RrInVYCzNZh2RrIaY8szWYdkayGmPLM1mHZGshpgcWbFjcUbFFanCsWbFjcUbFDTAYGwHYmwGpwnA2I7A2A0wvFmxY7FGxRWpwnFmxY7FGxQ0wnE2A3FGx9mmpwjFmxZTgjYo7pibFmxY7FHmKK1GEYs2LG4o2KGmEYs2LG4o2KBhWLPcWMxRsUDC8WbH2NxRsUE4Vj7NiNxRsUDA2Z5Zh2RrIKBZmsw7I1kB5Zmsw7I1kSpkg7aMkEloAEg0jJBpEqZINIyQaQC0g0jJBpEqeLoa4AuhrgHq6GuALoa4Yqeroa4AuhrgDV9BrgC+g1wmrh0XvQ2LJ4sbF60RWkNTDTEphpk12HqQalonUglIitIockA5CXMByMsaabKQlyVwXPQmUxhr2c/ZPOSuaU9E8592MToak0R1JbaDqT0yScncYaCoyOpLo6b6STlsrGZFRkk2UTZJN7uMCpcFTGy4KmasyH9i30Y/sW+gePgD6G+APoGMYwGMYxIIxjAEuhrgC6GuAGujF9C10YuAOTDTEphphRyYaYlMNMA7o10BdmuzlqhOQDkA5AuWzO0eOQqUjSkJcjK1TxyFSkaUhLkZ2jOQDkC5AORGj+jLM1mHZGsjzx9IpoBoc0A0aQKktbFSRRJaFSW9msZ1PJa2KktlEkKkt7NIyqeS1sVJFEkKkt7NZUWEyWtipIoktCpLezSVnYU0A0OaAaNZWVhLQDQ5oBo0lZ2EtANDmgGi9MJaAaHNANDTC2gGhzQDQ0wmzNZh2RrIaYCzNZh2RrInVYFINIyQaQ0wtINIyQaQ13AKISiGohqI1zC1EJRDUQ1ErU4VizYsbij3EaYXibAdijzFDU4DA2A3FGxQ0wvFmwZRgjYIrU4nwZsGUYI2KGmJ8WeYspxRsUaajE2LNixuKNihphGLNix2J5ii9ThGLNixuKNihphGLNix2KPMUaGEYs2LHYGxBhOLNixuKNigjCMWbFjcUbFAwuzNZh2RrIOAszWYdkayA8szWYdkayJUCzNZh2RrID1dDXAF0NcJU8XQ1wBdDXADMYxKmXQ1wBdDXAMkGkZINIxU9XQ1wBdDXAPV0NcAXQ1wmrg10NcBXQlwitJ8MujXQF2a7OV2GZI9yE5M2RnVw1yAcxLn7AcxitMlNCZTQqU/YmU2Mc0c566Tyns0p6J5y6MTrTl0nnLZpT0Tzn3Yw0qcu7J5yDm+k0pbO4AmyaT2Ok9E83sYFS4Kl0bLgqXTrMt8AfQ3wB9A8fAH0N8AfQMYxgMYxiQK6GuALoa4B6uhrgC6GuAGujF9C10YvoBi6GuALoa4FDTDTEphpgG2A2ZsBsytU9chMpGlIS5Gdo9chUpGlIS5GVqnjkKlI0pCXIztHrkKlI0pCXIjR/TWSNkhWTNkydfUMbAbM2A2NBNgNmbAbNJUUMuCZdGy4Kl01lRSJcFS6OlwTLppKwsLfAH0N8AfTSVnYU+APob4A+lyosePgD6G+APppKzsA+APox8AfTX0YW+APox8AfR6MC+APob4C+kejyCzNZh2RrIejyCzNZh2Rreh6V5rJBpGS2GkPR5oUg0jJBpeh6VjJBpGS2Gl6HowCiGohKIaid0wtR2GohKIaiNMLxZ5ixuKNihrPAYs2LG4o2KGnkGLNixuKNijTUYVizYsbijYoaYVizYsbijYo7KnCMWbFjcUbFFymEuOwXEocQHE7KzwhxBcShxAcTSUwnFmxY3FGxRepwmzNZh2RrIaYVZmsw7I1kE4CzNZh2RrIGFW9Gt6DsjWQMBb0a3oOyNZAwqzNZh2RrIl14YxgMuhrgC6GuEqeLoa4AuhrgHi6GuALoa4SoSQaRkg0gBSDSMkGkRWgUg0jJBpGdApBpGSDSONHpjGA9bAbM2A2ZqG5AOQDkC5AeOQqUtmlITKQHspCXLYMpCZSAKU/YmUkC5aEyn7Jw0M5d2TzkFKRPKQxx45CZSNKQlyNENJipPewpPWxUmAMuCpdGy4Kl0kLfAH0N8AfQPHwB9DfAH0DGMYDGMYkYxjAEuhrgC6GuAGuhrgC6GuAGuhrgC6GuGanpjGA8fAX0J8AfSbVBkxUnvYUnrYqTM7QMmKk97Ck9bFSZnVFyYqT3sKT1sVJmdAPgD6G+APpI/o5TDU0Qqp7DVQw19RVkjZImzNkxoe5AOQDkC5GkqaNyFSls0paFOWzSVnXkmKk97Ck9bFSZrKixpMVJ72FJ62KkzSVnY9bAbM2A2XKixmwGzNgNmkrOxnwB9DfAX0ejAvgD6G+APo9GMYxjnpp5DZmsxlka3oenfIEg0jJBpHPSvIUg0jJBpD0eWSDSMkGkd9I8skGkZINL0PR5CkGkzJBpGnowtINIyQaQ0wFmazDsjWQ1njyzNZh2RrIaY1meWYyyPLI01OAszWYdkayGuYCzNZh2R7ZCVzC7M1mHZGsjSVzCmgGhzQDR2VnhdmazDsjWRpKYVZmsw7I1kVqcKszWYdkayGmFWZrMZZHlkaowqzNZh2RrIGFWZrMOyNZAwqzNZh2RrIGFWZrMOyNZEpAYxgMYxiVPEg0jJBpAZINIyQaRKmSDSMkGkBkg0jJBpeiK0eKISiGohqOjOgMWbFjcUbFHGgWgGhzQDQC5cFS6NlwVLpmoEmKk97Ck9bFSYCpvRPJjpMmm9geSlonk9hSeieUtgaUtE8pbCk9E8pbKxlryTFSe9hSetipM5hoZMVJ72FJ62Kk2ddePgD6G+APoC2gGhzQDRIW0A0OaAaAW0A0OaAaATZmsw7I1kAqzNZh2RrIkemMYAl0NcAXRi4AS6GuALoa4Aa6GuALoa4ZqemMYAHwB9DfAX0xtUVLgqXRsuCpdM7QmYmXR0hMunKoqXBUujZcFS6RQt8AfQ3wB9JH7wphqp7IVU9hqoeXX1FufsNTI1MPP2NFWR5kifJnmTLlTYa5AOQDkC5Fys7HrkKlLZpSEuRrOiwxy0JlLZpS0Jctmk6Z2GOWgHIFyAcjX0jBZI2SFZM2THowy6NdAXZrsekzkRjGHppOWszWYdkayHt2chSDSMkGkPbScgUQlENRDUSPbnkKjsJRDUQ1E77PJaiGohqISiV7PIEg0jJBpD2eQWZ7ZhWRrImdJvL0xjGk6ReWMYxXp28vbo10BdmuzvpnYbdGugLs12aekYO6NdAXZrsejDbo10BdmuzsrmMYxjSVzAmMYSs8CYxjSUwJjGLlZYExjGkpgbM1mHZGshqcAYxhpgTGMVqcC0A0OaAaO6YB8AfQ3wB9GmBszWYdkayGmFpBpGSDSI0wKQaRkg0hpjJBpGSDSItaY9ihsVoGK3obFEWmMo7HRjo0YjVEjSR4ohKIxRCURrSQrFmxY3FGxROu4S4guJQ4gOOhpiWS1sVJFEkKkt7JUlkiaa2VzWieaAmlwmmVS4SzKSnmSy6VTJZdATLgmXRsuCpdCQS4Kl0bLguXQFtANDmgGgkloBoc0A0AtxBcShxAcQonFmxY3FGxQE7iC4lDiA4kqIcQXEocQHEBOLNixuKNiiQmzNZh2RrIDJBpGSDSI1TJBpGSDSGgUg0jJBpEWmAszWYdkayItMLfAH0Y+C30itCZcFS6NlwVLpnQqXBUhsuCpdJSQ0A0OaAaAS0A0OaAaJH68pBKROpBqR4dfUVqX2EpE6kGpDRTkrGyQrJmyZUqrDXIByAcgXI0lZ2PXIVKRpSFOWzs6LBOQqUjSkKctmk6Z2PXIByAcgXI09Iw7JGyQrJmyZ30YamGmJTDVznpU5GkGkZINIemk5aMXcbGOjRiNUdEe3ZyBRDUdDlD0GonPbSckKDDUChQX4EqaJ9u+SFBhqA9QQapo77PKbFmxZTij3FHfZ5JxNixuKNijvtzyTZmsxlvR5ZFTpN5A+C30N8BfTSdM7yzYDZmwGyvSLB5I2SFZM2R30zsNyRskKyZsmaek4bkjZIVkz3Jj0YdkjZIVkzZM0lRh2SPMhWTNkzSUwy6NdAX9mv7Oys8Ff2eXQF2a7NJXMHdGugLs9uy5UYK6PboXdnt2XK5j26PLoC7NdndTg7o1wLs12NMYxjFanHj4A+hvgD6NMePgD6G+APo0xjGMNMEYxidMEuhrgC6GuDTBxQ2K1oGK3obFEWtMMihsVrQMVvQ2KItMMihsVrQMVvQ2K0RrsjKISiGohqI1pIDFmxY3FGxROuYTKLEuJW4ipR2NMSSWieUS6UdE010pxFJE01ssmiaSAkmiSa2XVFqxJNFJSSRNNbK5rRPJbAnktbFSRRJCpLewkhoBoc0A0AjFmxY3FGxQSRizYjcUe4gT4s2LKcUbFBSbFmxZTijYoCRxAcSxxAcSVJXEBxLHABxAkcQXEocQHEkJxZsWNxRsUAlRDUQ1EJRMNU8SDSMkGkNApBpGSDSItaYVZmsw7I1kRaYQ0A0OaAaO0JlwVLo2XBUumdCZLWxUkUSQqS3slJDQDQ5oBoBGLNixuKNiiR+mLoa4AujEfPfWGkGkZINID1cMYxWgHwB9DfAH0aBkxUnvYUnrYqTKlZ2Bk7ipPewpPWxUmaSs7HrYDZmwGzT0YNdDXAF0YuD0YOPR0eCo9Gx4TelTkyKGxiBBbK4Q1wzvTScvIxY6MGaEd8K6dPmiL21nJcabbHRpu3CiNNfg6NNJcM720nKZU98DVN9sWKmglT1we1eUqo73YNUf8AwqVENUdD2eUHx+jfH6Lvj9G+P0VO13lA6YDgy50/QDgaTtneUco6EuJY4iZR2XO2V5StAMplEnl00nbO8lS4Jl0bLgqXS505YFsBszYDZpOmdj3JHuQnJmyZ2VFh2SPMkKyZsmaSosPyRskKyZsmJUYfkjZIVkzZM0lMNyRskKyZsmdlZ4bkjZIVkzZM0lcw7JGyQnJmyZcqcNyR7kJyZsmaSmG5I9yQnJnuTErPDMkbJCsmbJmkpg8kbJCsmbJjUYbkjZIVkzZMaYK6NdAXZrsaY9ujXQF2a7GmCXQ1wBdDXBpgo9Gx4Kj0bHg0w2PRseC49GR4Tq8Pj0dHgmPR0eDTFMejI8FR6Njwz1ocuhrgC6GuHB6YxiFPHwB9DfAH0BEyaa2VzWieS2UlNOJJNbLprRJUQEklommiua0TyRSUU10mlHZdKJPJbAklES4lbiKlEpKdxBcdlDiA4gS4s2LKcUbFBKdRDUR2HoNQAnwf6bB/pXgv02C/QpJg/wBNg/0rwX6bBfoETgA4MucEA4EmI3DXBUol0oiXEGI3EBxLHEBxJqkeLNixzjs8xRlQrFmxY3FGxJqZAqIaiGohKJnWkhWLNixuKNiiGhbQDQ5oBoBUlrYqSKJIVJb2SkiXBUhsuCpdAQwGhzQDQCbM1mHZGsgFWZrMOyNZE4l+lqIaiOUfQagfNfWJUQ1Ecoeg1ABGLNix2J5iiNCJLWxUkUSQqS3saJZLWxUkUSWhUlvZcpYnktbFSRRJCpLezSVnYUYxjvox4kGkZINIejDIxuyiEdAQRTCJF6bc8jpw2VwhoGnDZXTj6Mr01nLyFPa0V06bGU6a0V06S/DG9tJyVCk78LKdL0NhSX4Vwo6Rne2s5SRobGx8e34WR8cbHx9HPavKH4PSN8B0v+f0zfB6Z32Y5zoegHROk6D9gOgyp2q8uXKk/wAEypnWnSSXCSdNJ6RpO2d5c2dP8RPKGzpyhrhPOBc7ZXlzpx0STWzo1Ikc4mk7Z3lJLhNLpVPhLLptOmdhUmKb2FJ/oqTNZ0yseNgNmbAbNJU2G5I2SFZM2TNJWdhykGpE6kEpHZUYZkjZIVkzZM0lMOyR5kheTPMmdlZ4bkj3ITkzZM0lMNyRskKyZsy5UYdkjzIVmbJlymH5I2SJsmbJnZWeK8kbJE2RsjSUw7JGyQnI2Y1OHZI2SE5myGmGZL9Zsl+sTkzZMa5ijJGyQnJmyY0w9SQSkidSCUhpiqMkOUlYjUh0ZDXcUxe9DYsnixsXrROu4qi1cojLRDGWyiL0NdxXGQ1SJFIdGRlorUg1InUglIaKMkbJCsmbJnVGNgNmbAbA8kxMmHJ62KkyklSJZlMuE0ugTyWiaa2VzWieS2UlPJaJprZXNaJ5LYCJREuJY4iZRKSncQXEocQXEBWLNixuKNigkKiEohqIajoBKiGojlENQCkmLNiyrE2IEbiA4ljigHEleJHEVKJdKIlx2DEbjoTKJdKIlx2RXErh6AcSxxAcDOiXFmxZTijYomqkKxZsWNxRsUZVpIXZmsw7I1kSFNANDmgGgJ5ITJFEkKkt7JSnktbFSRRJCpLewEvgD6G+APoAmMYBdmazDsjWR3Ev1xU98DVP7sWKmuhfGrcPnWPrI/jNgV/Ge4IzsEbgA4MudMBwIxSBxdhMosulD0JcVcYIJQ0TyidCUNcJ5x2WlDKIlx2WSiJlECfF3PMWOxRsUXaiQtR2NjE0YjoxItXIOnF3KqcAKcNorpwMeq05htODuXU6ehdOntF1KCstHn6rfmDpUndHQpU3ZaBpU1daOhSprFEXptICnRVy2nQvY9p0HdWL6dF2WjO9LkIj4+x0fHt9lkfHGxoO32Z+l4h+B/hvhf4dL4Y/jN8K/Gc9GObKgKlQR1JUH+CpUC50qxyJ0vRJOk78R2Z0tcJZ0lfhpOmdjk1KeiGrB3OzUgrcIKkFcvnplY49aDuR146OpXhsjrwWPD0c9M7HLmiSotl1RaJKiNeemXURy4Ty6UT4Ty6ejnp5+oU+AvoT4A+mkqLHl0e39gXZ5dmkrOw26NdAXZrsqV2m3RroC7NdmkrOvbo10Bdmuy5SiyRskLyZ5kzSVnRZGyE5M2TErh2ZsxOTNkzSUPyRskTZM2TOSpVZGyJcmbJmkopyRskTZM2TL1KnJGyRNkzZMaKMzZicmbJndSepBKROpBKQ0UqQakTqQSkNFEZDVIkUh0ZDRVGWxqkSKQ6MjgsjIapEilsdGQFalsdGRDGQ5SJUuUg1IjUg1ICpSDUidSCUiVHOQDkA5AuQBSYqT3sKT0Kkwl5N6J5sdJ6JpvYCpcEy6NlwVLpSSpcFS6NlwVLoC3wB9DfAH0pJdmazDsjWQC0g0jJBpF6YyQaRkg0jumBSDSMkGkNVhdmazCsjWRzTCmgGhzQDRzXcKktbFSRRJCpLezmmJmgGhzQDRNrpLQDQ5oBoztC7M1mHZGsjKuwFmazDsjWRFaQDQDQ5oBohwuXBUujZcFS6AqXBUujZcFS6HaRLgqXRsuCpdDIl8AfQ3wB9KSExjAYxjAfu/wAfo3x+i74/Rvj9HhsfWQ/H6N8fou+P0b4/RnYIZU/QqUHc6EoIVKHonFOdOn6ESp7OnKnonlTV+HMHLlB20iedM6kqeiadNfhxLlyg/wAFSg7nRlT9CZQAgwf6bBleC/TYL9FpIljEaohqOx0YejO1pI1OOy6nDQmlBZF1OOkY9VpzDaUXc6FKGuE9KH9cOhSjpHn6rfmKKMbyR06MNLRJRhtaOpQisUYXptIopQd9oup09C6cFcupQ0Z3ppI9hAohTf2g4QQ+MNGXqqxN8bN8bLMF+mwX6PVMQzpv6QiUDpSgTzgvwqdKscyrD+eENSGzsVIadyCrDfDWdM7HJrw/rhBXj9HY8iF2c+vBWL56ZWORXj6IK8dHUrx2QV464ejnpnY5NZEdZWRdXWyOstGvPTLqOfNE00VzWieaPRz08/USNANDmgGjeVFhdmazDsjWRpKzsBZmsw7I1kXKmgszWYyyPLI0lZUL4A+hvgD6XKUD4A+hvgD6aSs68bAbM2A2JXHuSNkhWTNkzSUNyRskKyZsmclSbkjZIVkzZM0lDckbJCsmbJlak3JGyQrJmyY0NyRskKyZsmVqVCkGpE6kEpDQ9SDUidSCUhoqjIapEikOjIaKIyGqRIpDoy0WKoyHKWiNSHRloCqMhqkSKQ6MiVLIyGqRIpDoyAepBqROpBKRKjskbJCsmbJgE2A2ZsBsJeSYqT3sKT1sVJgDJipPewm9dFSZSQyYqT3sKT1sVJgeNgNmbAbKSK6NdAXZrsAkw0xKYaY1phyYaYlMNMaYO6NdAXZrsarDbo10Bdmuxpj1sBszYDZGmM2A2ZsBsaYFsBszYDZNqWfAH0N8AfTO0YxjHK7AmMYitI8fAH0N8AfSHC5cFS6NlwVLoCpcFS6NlwVLodpEuCpdGy4Kl0MipcFS6NlwVLpSWbAbM2A2AV0a6AuzXYH9LYM2DK8D3BGF5fU1H8ZsGWYI8wRF5NQyp+hUqb/DoSghUoeiLy11z503+E0qezqSp60iadP0Z3k1zJwf0ieUH+HTlT0TzpojEOZOD/CeUHc6cqeieVNXGCHFgOBY4AOJyriXEbCIeG+DqcTOtI8hHZXCOkJhHZXBaMOmsVUltHRpL+UQ0ltHRpL+UefppFtFbTOnRX8o59FbR06K/lGFaxbSW0dGkv5RDSW0dGkv5Mq0h0YFMIOwmEimL0Zr17Zmsw7I8sgaVLhNMqlwlmIlLU+yGp0uqfZFU6acjnVyHyOF1ch8jhSHLrkNcurkNc1jKuXXWyOutF1dbI660enmsa59RE76VVUTtbPRzWVSyQqS2USQqS3s25rOgszWYdkayPRzWVBZmsw7I1kXEV40A0OaAaNIiktANDmgGi4ikSWtipIokhUlvZpGdKlwVLo2XBUuhwL4A+hvgD6BjGMXEvLo10BdmuzSA7o10Bdmuy0mGMYDLoa4AuhrgS8XQ1wBdDXADXQ1wBdDXCga6GuALoa4AyPRseCo9Gx4Emx6NjwVHo2PAGx6NjwVHo2PAo+L3obFk8WNi9aAauhrgC6GuGLQV0a6AuzXYHr4A+hvgDL0LkxUnvYcmJkxoXJim9hSetipMal45CpSNKQlyGgnIByAcgXIrUmZI2SFZM2TGhikGpE6kEpDVKVINSI1INT9jRTkjZImzNmTqlWZsyXM2Y0PcgHIS5AOROihyAchLkA5DQxyAcgHIFyI0FkjZIVkzZDQzI8yQrJmyZnqjckbJCsmbJnNDXIByAcgXIgetgNmbAbA8kxUnvYUnrYqTKSXJipPewpPWxUmAuTFSe9hSetipM5qXjYDZmwGxoNyAcgHIFyGuY/rPFmxY7FGxRreXv0rFnmLHYmxRleTUrjcBw9FjigHEm8tNROGuCpQ9F0oiZQ9Gd5NcydP0Tzp9OnOGiecEY4py5wf0TSgdSUOk04Ldkcwc5w1wVKJdKHoS47M6uJlEJRGKISiZVpGgtlMPoTFbKYLRh01iun1F1PiIafUXQ4jz9NIupM6FL/KOZSe9nQpOyMK1jq057RfTnpHIpy2XU566Z1pK6UZDoyRDGfNjVPXTJOrs1+GzX4R/Ib5AafKeiec1+gTm/0nlU30RYqk1YiqTVw6lTRDVnvRpAuvMgrz/kdXnsg8iei4ipqr/lnOqy2yyrL+TnVXtmkZJKj0yKo9ldR60Q1OmvNY1PUJ30oqE76ejmsqS0A0OaAaNuazpNme2dwrI1kejms69szWYdkayN4ivGgGhzQDRpGdKktbFSRRJaFSW9lxFTyWtipIokhUlvZcZ1PJa2KkiiSFSW9nXCGgGhzQDWwF2ZrMOyNZFxJVmazDsjWRpAFmazDsjWRaXlmazDsjWQHlmazDsjWQSFINIyQaQGSDSMkGkUMkGkZINIDyKGxWtAxW9DYoJFFDYrWgYrehsUAUUNitaBit6GxQUKKGxWtAxW9DYrQBpBpGSDSMWgLM1mHZGsgAlwVLo2XBUunNCpcJpdKZcJpdGhc3onkx0nomm9jUlyYqT3sKT1sVJjR45CpSNKQlyK1JzkC5C3IFyGh2SNkibJmyY1SvJHuSJczZjRVmbMlyZsmTqlWZsyXJnuTGihyAchLnoByJ0UOQDkJcgHI5oc5gZ+xLkA5HNFTkA5+xLkA5M5ooyRskTZM2TM9UryRskTZM2TGh+SNkhWRsgDcgHLQDkC5AaTFSe9hN6FSZSQyYqT3sKT1sVJgLk9CpPewpPWxUmZakLkA5AuWwHIaCcgHIFyActjVY/sNdDXAF0NcPdY9eiMYxnYaGzNb0MsjWRFi9TyiKlHZW4iZRM7DUUkTzj0unEmmjKx2IJonlHZdOJPJbM7FxDKOieUdl0o6JpLZlYRPb0azDsjWRnY1jyKGxQMVvQ2KPNY1lUQZXTeiGD2VwejK8tJV1OSuXUpaOXTl/RdTloxvLTXSpzV0rldOorLZyYVHcrhUdjK8murGov0aqit05aqb6OjU10nyvV3yr/wDI3yr/API5/wAr/wDyN8r/APyHk1ZKqrdJ51Y/pPKq7PZNKq79Hk1ROorWuSVKi/RdSp7JJ1Hfo8miqzX6Q1am+hVKmukVSdnoTly1qs01059WW2OqTvEjqSNJyztJnLRJOW2OqS6STls1kRaXJ3FSe9hSetipM0kZ2gfAH0N8AfT08saxjGPRyzol0NcAXQ1w9ERXlmazDsjWRpGdIaAaHNANGsRSJLWxUkUSQqS3s0jOkSiJcStxFSickQlcQXEocQHEuQJxZsWNxRsUUkjFmxY3FGxQAYmwG4o2KNklYs2LG4o2KADFmxY3FGxQSWohKIaiGogLUQlENRDUQBUQlENRDUQBUR0YmjEaogAojoxNGI1RA9UR0Y6NGI1ROUj2KGxX4DFb0NijOtI9SDSMkGkRVAaAaHNANEUJlwVLo2XBUundUTN6J5sdNk03saFTeieTHSeiab2VqSpvRPJjpMmm9jQMmKk97Ck9bFSZepZyBchbkC5DQzJGyQrJmyY0MzNmJyZsmND8kbJE2TNkzLVKckbJE2TNkxopcgHIS5AORGqUOQDkJcgHIaKHIByEuQDkToocgHLYlyAchoqyRskTZM2TOaKckbJE2TNkxoqzNmJyZsmS0NcgXIW5AuQDHIBy0A5AuR3WWBkxUnvYUnrYqTGmBkxUnvYUnrYqTJtMDJipPewpPWxUmZ2mPGwGzNgNkaY/sdMNMSmGmfZsbacmGmJTDTM7DTDGMRYvQvgt9GPgD6Z2GkzWiaaLJrRNMysaRHNE01ssmiafTOxpEslommt6K5rRPJbMrCENANDmgGjOxrHiQaRkg0jK8uyij0qjwlj0pjwzvK5T4vZTB/pHB72UxZheWuq4yKIzIlIJTf6Z3k1f8iNmvZJ8jN8jI8q1c6it0B1Fy5G6r/QXUd+jyaolUVusVKor9JpVH+iZVXfo8mqJVFbpNOov0TOo/wBJ5VHfo8mjnU7snnUX0wJzZPKpsTktDOXdk8pbCk9E8pGs5Z2hnImmw5S0TylsSJtBJ3FSe9hSetipPZpIztetgNmbAbNuUUy6NdAXZrs35Z0xMNMSmGmeiM6bdGugL+zXZpEVjGMaxFLaAaHNANGkZ0loBoc0A0VIhO4guJQ4guJpIEYs2LG4o2KJSVizYsbijYoBWLNixuKNijZJWLNixuKNigFYs2LG4o2KCQqISiGohqIC1EJRDUQ1EAVEJRDUQ1EBaiOjE0Y7GqIHiiOjE0Y7GqIHsUNitApbGxRykepBpGSCSM60gomkaJpEVT1sBszYDZFASYmTDk9bFSZGqJmyaY6ZNNjQmbJpMdMmm9l6kqb0TyY6TJpv8GgZMVJ72FJ62KkzupeNgNmbAbO6PXIByAcgXIaGZI2SFZM2TGg8kbJCsmbJmWqNyRskKyZsmNB5I2SFZM2TJ1RjYDZmwGxo9cgHIByBciNDHIByAcgXIaHZI2SFZM2TJ0MUg1InUglIaH3RroC7NdltB3RroC7NdgG2A2ZsBsjXMBLgqXRsuCpdGmFS4Kl0bLguXSbTCnwB9DfAH0ztMLaAaHNANEaY/r5SCUtE6kGpH6KxOqVIJSJ1INSM7DVKkEpE6kGpGVipRuQLkA5AOWzOxpKKb0TTex0nomm9mVi5S5vViaT2Ok9E03szsaSly4KkNlwVLplhKU0A0OaAa2MaShUQ1EJRDUTO8uShUR0YmjEao6Mry0lexQ2K1oFLY2KM7wrWXRi4AuhLhneDTGwGzNgNkeV6zYDZmwGx5NBJ+xTewpPWxUmT4NDN6JpsdJ6JpvY8GlyYmTDk9bFSZXk0qXCWXSmXCaXR5c0mXBMujpcFS6VOU2ky4Kl0bLgqXTScs7QtgN7M3oBs1kRaK6NdAXZrs0kZ2mJhpiUw09G8iLRJhpiUw0zWRnabdGugLs12aSItevgD6G+APppIi0NmazDsjWReI0qzNZh2RrIYaXZnlmHZGsisZgszWYdkayGALM1mHZGsiwqzNZh2RrIDyzNZh2RrIAUg0jJBpACkGkZINIlTJBpGSDSA9ihsVrQMVvQ2KA9j0bHgqPRseAMXQ1wBdDXDlUNdDXAF0NcM6NdGugLs12RWjSYqT3sKT1sVJmdHspaJpsOT0TzkSFzkTTYybJpSACb0TTY6T0TTey9SVLhLLpTLhNLp3R5JipPewpPWxUmVoB8AfQ3wB9GgHwB9DfAH0nRm0C2ZsBsaCujXQF2a7I0e3RroC7NdjQd0a6AuzXZxT18BfQnwB9A8fAH0N8AfSQNmazDsjWQC7M8sw7I9t6JckeJBpGSDSDSQKQaRkg0iNVheLNixuKNihphbiC4lDiC4nb075SuILiUOOgHEzvR5TSjoS4lbiKlEm9O+UjiwHFljiA4md6d8oXBgOJY4IBwX4R6V5r+qlNfoakRqQamfq7Hh1ZkGpIjUg1P2Z2Grcke5EuRsmZWLlUuQDmhOVgHJmdjSU2U/YmU7guehMpmVi5XspCZS2aUhLkZWNJXrYDezNgtszwleJbDSMkGkMaSvUg1FmgvRRCCaOXlMoYxY6MNBqG+DYw9EXlpKWqbDUChQDUF+HLwvU3xs2D/Sz40b40Z3g1G4AODLnBAOBh5VqJx0JlFl0oehThvg8moHF2Eyiy6UPQlx2d8GoXF2Eyiy6URLjseTULi7CZRZdKAmUbHPJqGS0TyjsunH0TyWx5NRzWieUdl0o6J5LZc5TalmtE01ssmtE0+s0nLO1O+APox8Fvp2RFrx8AfQ3wB9NJGdo7o9uhd2a7NpEWmJhpiUw0zWRnacmGmJTDTNJEWiMYxpIztYxjF4nWMYww0Fnc8sw7I1kVgCzNZh2RrI7gCzNZh2RrIkKszWYdkayA8MYwBGMYAl0NcAXQ1wlQ10NcAXQ1wAo9Gx4Lj0bHgBroa4AuhrgBroa4AuhrhyqGmGmJTDTMqDbAbM2A2TWjyTFSe9hSetipMzoXJiZMOT1sVJkhM2TTY6ZNN7ATLgqXRsuCpdGpIlwVLo2XBUujQqXBUujZcFS6VoW+APob4A+jQD4A+hvgD6ToB8AfQ3wF9GgDGMRoxjGGjGMYtTWZrMOyNZALxZsWNxR7iSE4s2LG4o9wAQohqHocohqJK5Eygw1AoUA1T9HGkidQYagUKmGqfox1WJlTdwlTZWqavcNU1bg12RD8b/AA8+P0W/Gr8N8S/CL008oHS9AOk/w6Hxq3AHTRnenfLmypMTKk/w6zpL8EypK5F6V5c+VHQl0TpOi+IS6O+Gd6PKF0fQDo74i90X+Auj/wCk+nfL+glINSI1INSP3FfFlWKYamRqQan7Mq0lWZo9zRHmzZsy6JVbmgHMndRgOZ5+mkp7mrCnMTKfsVKbuZWLlUOQDkJcwHIzsaSnJ7uGmJTDTGO6ZEdFfgmH+iunHQw0VOLuV04aTsLhDZXTgrDzSUcYX4hsaT1oOnDZXCndcHitJSI0nfg6NN24iiNNDlTVuHLHZUfxP8N8T/DofEvw3xL8M7Fyua6CsA6B0nQYDoMx8muXKk/wU6T/AA6zpL8EypL8Hk1yJ0nvRPKk78OxKlrhPOit2Q8muTOgvwnlQ2deVB2J50H+Dya5cqb/AAnlB3OtKmrc/wD4TSpK48mubUp64SVIO7sjrTpq3CSpBb0PJrlzg7E8oejoTh3RPOKuPJagnHRJNbOjUWiOpEeWdqOS1sVJbKJIVJb2bSItJfAH0N8AfTSRnaExjFyItEuhrgC6GuGkiLRphpiUw0zWRFpiYaYlMNM0kZ2jujXQF2a7O44IxjDDWMYxWGsYxhhoTGMTjjGMYYBMYxGKEYxhgy6GuALoa4dUNdDXAF0NcANdGLgtdDXDFRq6GuALoa4Aa6GuALoa4dqhmMYzozQDQ5oBoiqIktbFSWyiSFSW9mdE0oinHZXKImUTmtEklonktl0o6J5R2NEco3EyiXSiJcdk6jEbjoTKDLpQEuOxpiSURLiWOOhMola4llHQlxLHETKJ3RNJa2KkiiSsKkt7JSQ0A0OaAaAWY32YoYxjAepBpGSDSGDxRCUdWDUQ1G4wJUQ8WOUQ1A7YuEKDDVP0UKmGqfoixpEqojY0dcRRGjsbGiyKSI1Sf4OjRf4VRpK/BypL8M61kRKi/wAHRou3C2NFfg1UV+EXpU5QLxw146L14+w14+jK9NZy5v8Azezf8/8A4dT/AJ/Rv+dfhjelzlyn4wD8b0dh+OA/GMr0ucuPLxhMvG2dqXja4Kl4xN6V5cZ+OA/GOw/G9APxjO9Hlx34wD8Y7D8YB+Nsj074r9LUw1NEKmw1U9n9Cr8zKsUw1URCphqp7Mq0lV/J7N8nsh+T2bN/pl0SrfkVugOqr9JXUf6LdTe2YdNJVTqfoDmTuoA5smxcqpzuC5bJ1O4SkZ2NJVUXcog9EkHspgMNUQWyuCJ4IrprSGGq6aLKcG1cTSW1o6FKCsaY7KKlTdy6nT0Lp09ovpU9cHlcpcaZRGlb6HQpIphT9GdjsqRUX+BKi/xFypL8CVJW4Z2NJUDoKwDoI6TofYDoO5Hl3XMl46FSoI6kqDFSoMeTXJnQRNKgrnYlQ0TToMeTXJnRf0TTos7EqWuMnnSWx5c1yJ0vRJOlvh2Z0tfZJOmPLuuROkySdJ3OxOkrElSmh5c1yKlN2+iGpB34dmrDRDUhvg8lrlTjrhJUizp1I+iOcNseWdrnSWieUdl049J5pNlyItRSiJcStxFSiaSM7SbM1mHZGsi5EWvDGMXIztZdDXAF0NcNpE2vV0NcAXQ1w0kZ2vTGMMc0RjGGGsYxisNYxjDDQ2ZrMZZHlkTiyrM1mHZGsjmALM1mMt6Nb0Tig2ZrMOyPbIYPEg0jJBpEKCkGkZINIAkg0jJBpGKnqiEohqOg1EAVEJRDUQ1E7VBUQlENRDUdGdCMWbFlWKNgZ1SRwAdP0XOn6AcCKYgdNgOnvaOi6euAOmu2MtaOZKgKlQX4dSVBipUGNHLlQFSoLp1JUGKlQJ13HJlSf5oTKk/w6zpL8FSpL8GmOVKk7cJ5U3fh1p00vonlTS+mVrJzJU/xCJQ2dKUNE84IaIJQ0TyidCUPRPKOy0o5REuJY46EyiBM4gOJQ4guJQWohKIaiGogLUR0YmjEdGJeDyMRqhrgcYjoxO4FRgxsafodGn6HRp+irFwhUm3wbGnrhTGmrjo01bhlY0iRUn+Do0mVxpK42NJX4Y1rIlj4++FEPHVvoqj45RDx9GVaSIY+NsbHxi+PjDl4+jy9dN5yhj41/obHxi+PjDo+MZXppOXK/wCY3/Mdj/mN/wAxhelzlx34wD8Y7T8X6AfjGd6aTlxpeLYU/GX4dx+L6FS8Xd7EXpXlxZeN6Ey8bZ2peNoVLxjO9O+XGfj6Afj+jsPxvQD8Yn2vwuz9m+T2Q/J7N8ns/o9r8au+T2b5PZDn7Nn7M7Rd8ns2fsh+T2b5H+mdarfkN8hH8hvkMqaryPMkTZGyZni9Vphx6TRlspjwYapp9K6fCWn0rp8KwlU0ls6NGLsR0o7R0aMdIY1lU0YvJHUowdiOjBXR1KMf5RpSHUo7R0KUP5WielD+uHQpRVkZ1pBwg78K4U9cNCCuVwgrCrJUH9BqBQoBqCMqJHABwZc4IBwRzHdRSp+hUoO50JQQmUEMNc6dN/hPKB0pQ0Tzgvwry7rmVKeuEk6e3o604KxJOCuPJrl1Ker2JKlPd7HWnTViSpT3w7Y5rlVYPHhDUjs69SKsyCrBX4Z2GuXVjrhDUi73OtUjohqw2Tjjl1Ya4Q1Iu51qkdENSH9cGDmzhoknHZ05x0SThsqIqCURMol0oiZRNIzqJxBcShxAcTWMqXZmsw7ejyyNIzoLM1mHZGsjWOWvTGMaRnaIxjHMcEYxhgIxjFYNZmsw7I1kMAWZrMOyPbejPFAxZsWNxRsUcAYmwG4o2KJxRKiGoDlENRGCdRYaiOUA1EnGhKiGojlENRGBUYjVDQajsdGJFik8Ysco6CUdjoxM7AmMWNUdBxh6HRhrgrQpQY2NP0OjBDVTMqROqbvwJU/uxYqa6EqatwzrVH8J7/zosjQ2NXjmVdc3/m9m/wCb/wAOp/zr8N/zL8Itcxx3432A/F2dp+MA/F9EWmOHLxX+CZeIz6CXiehMvF9HNMcKXi6Jp+L6PoJ+LrhNLxdjTHDn42uElTxj6Cp43okqeNvhScfP1PG0ST8Y+gqeNrhHU8azYMcWdAkqUNnaqUHZkk6BcQ5E6TsTypvLh15U7LhNKmkzQQOmA6bLnT9AOCOSJSKDDUChQDUDSQIVP0NjT9DowGxgjXHITGm78KY0mh0aSKY01+HMaQiFN34URp64OjTRRGmrcFXImjSd+FEKT/CiFJfhRGkrcM6uRLChsphQX4PhQf4PjQMeq15hEKGyiFBFEKD0UQoNK55+q9PMTR8fZRHx0uFUPHdyiHj6PH1W8iSPj72OXj6LI+OOj4+jz9VpIg+A3wf+HS+A8+AwtXI5r8cF+OdR+OC6GzO1pI5UvHQqVBHUlQYqVDZlauRypePcTLx1c7EqGhMvHsZ2rkct0P8AwB0PvR0nQAdB3J13Hx3yezfJ7Ifk9m+T2f0y1+FdD5F+mz9kPyezfJ7M7RfmjzNfhJ8h7mcqtV/Iv09y9kcZjlL2Z01SpBomjIojwYrVEOlcOEkOllPgw1TSWzoUo/zwlpR/pHQpR/lFYSqfGWjpePEj8eJ0vHjvgxpKr8eB0vHjsl8eOjpePFCtYppx3ovpxeianHZdSjozrSHxiUwQEUURjoVYkg0jJBpGdANANDmgGjuI0iS1sVJFEkJkh5NIlwll0qlwml038mppommtlk1ommtjyakmiSotsumtEk0TYa59SPbENSOzqVYrEhqRVzKw1zqsNEFSOzr1IqxDUirk4ty6sNEM4u516kNEFSH9cGDmVIPZJODvw61SCs2kSTp70jkRXNnB/giUNnSnTJ5wX0i4zqBw0KlEulDQlxVzWMqmcQXEocbAOJrGdIszWYdkayNIytKszWYdkaxpGdrwxjF4tl0NcBXQlwYPV0NcAXQ1wrBkg0jJBpDAKQaRkg0jLFAUQlENRDURgSohqI5RDUCcUSohqI5RDUBgQofgagUKmGqfojGidQYagUKAaghgnUGGoFCgGqa+ibFERg7jYw9Dow9DY09GdgRGn6HRp+h0afobGCsZ1oRGm7lEabsOjSTZTGndcMq7EsaGyiFBfhRCg/wohQfszrVJHxt8Gx8Y6EfGGx8bXDKjmrxh0fFOlHxdDV43oxtXjj/8vo3/AC+juf8AL6N/y+jK13Hz8vE9CpeJ6PopeJ6Ey8T0NMfOT8R/hPPxH+H0k/E9E8/EX4dcx8zU8XT0SVPF9H01Txe6JKni7ejVzHzNTxtMgqeLs+mq+LogqeNsOY+cqeN0hqeLs+mq+LohqeNt6LjB8/U8bRJPxvR9BU8bRJU8bZrBxpePcTLx9nYl4+hMvHKkS5yoINUEWKgw1QNJBFGghsaBVGgNjQNcTCYUncohSf4UQpLWiiNJW4MaxPGhsphQQ+FB/hRGhoyraRPGk78KIUnoohSWroojSX4Z9NZCY0dlEKK0MhReiiFF2PN1WvMIjTdyiNN/g6NJX4UQpq1rHm6r0cwqMN8KIU2lwZCn6Hwp6PH1W8hSgxsYeh0YDYwVjz9VpInwf6bB/pXgv09wRhauRE4gOJY4AOJna0kRSpO3BUqbLpCZdMrVyIZREygy6URLjsztaSI3EBxLHEBxI0x+PfIb5CP5DZs/pmvwK5VPYamiFVPYamNFinvo2MiGMhyk7ESO6rjIdGRGpDoyLkNWQ6Vw4SU+llPh3ynVFOP9F1OL0T04q6LacdaHk1TSj/SOlRj/ACiKjH+lo6lFfyrHbGsqvx464dLx0R+Ojo+PH0RY0lW0I6L6Edol8eOjoUFs5VRXTX9ItpL+SWkv62W01/JnW0Oj0pjwmj0pjw40NujXQF2eXYDHIByAcgXLZciLWchMpGlIU5bNJGdrSlonm9hSeieUtmvlGvJvRNN9HSeiab2d8mlS4TT6US4Ty/0T1FypaiJJrdi6a0STRh1GkqKpEjnHZ0Zx0SzjvhjY651SGiSpE6c46JZw2Z2Dmzg/wnnT3w6UqehE6fouIrlSpOxPKm78OtKmrcJ5Ulf7NIzrlypOxPKm7nWnT1wnlSVyoiufKn6FODOhKnrgmUDWM6gcQHEscAHE0jKpHEFxKHEBxNIzpFmazDsjWRTjy3o1mHZGsgPF0NcAXQ1w0BroxcFroxfQBpBpGSDSM3YBRHRiaMRqiGkeKI6MdGjEaokkDGI1Q1wNR2OjENIUoBqHocohqBKyFBhqBQoBqn+IBKp+g1TKFANQ/DOx2ERg7jlD0NjAbGCsZ2LhMae+DYw9DowQ6NP0RVwunT3wrhB22jU6a/CunDXDKtICFN3KqdPXBlOmvwqp0lbhh2QuHj/ZVDx9D4ePu5XDx3Yw6aRHHx9lEfG9FkPG9FEfG0Y1bnLxvQS8b0dZeN6CXjGdHGfi+gf+X0dx+L6B/wCX0d0fPVPF1wkn4u+H0tTxfRJU8Xb0NHzNTxXbSIaniu/D6ip4qtwhqeLvhpEvmKvia4c6r4v9PR9ZV8XXDm1fF/p6NIPl6/jWkR1vF1w+kreL/RHW8a6LkZV8zPxekk/F+j6Kfikk/F6jSRnXz8vGFS8bfDtS8b0Jl45vIhx/gN8B0v8AnN8Bcg58aCHRoFUaD/GNjQf4dx2Jo098KIUnbg6FJN8KI09cGNITGm7lEabsOjSXsojTViOmnJEae+FEIP8ABkKfofGno8/T08lRhsphB24FGCvtFEYaPP225LjD0OUdBKOx0Y6PF235BGI6MTRiOUTzdNI8SDSMkGkebppHhjGMbFRpNCpPewpPWxUmZWNYGb0TSex0mTzezOxegkxUnvYUnrYqTsZ2O6BsBszYDZzFa/ClUDVQhU2Gpn9I1+BWKe+jYzIYyHKWhosi9lEZEMJFMGayI1ZB7K4cIab2V02aSGraa2i+nFtIho7sdOiv5NPKdU0v9I6NJaRDSX9HRpLSHk1ZRW0dOjF2RDRjtHTorSJsaSraSu1o6FJaRDSVmkdGktIysayraf0XQ4iGn9F1PiIraLodRRB6JYPZRDhlWsUxkOUiRSGxlo41U5I8clYnyZ5kA1yQDn7EuYDmbyMLTZSEykC5uwmUr8ZrIztFKSEuWwXLQmUj0eU6NyEykaUhTkd8mgk7iZMOT1sVJmXUVKVLgmQ6XBMunn6jSVNJfomSKJL7FSW9mNjXUs46JJw2dGUVYTKBnYOfKAqVPZ0HDQqVP0ciK5kqbsJlTafDqSp3QmVPfDSM65k6TtxE0qe+HXlTVuE8qSv9lRFcuVJ2+ieVN34daVPXCedJXNIzrlyp+hMoM6MoITKCNoyrnOImUS6UPQlx2XGdSOILiUONgHEpwqzNZh2RrIDwxjGgJdDXAF0NcAZHo2PBUejY8M3YfHo6PBMejoBpDYobFfgEUOiiSGRiOjE0YjVENI8UR0Y6NGI1RJWBRHRjo0YjVEAFEJRDUQ1EWOwKiOjE0Y7HKOjOxceRjsphG4EVsohEwq4OnD0V04a4DTiVU46Mq0g6UC2lT/ngFOGy6lBWMOiCp03e5dCGlo1OnzRdTpppHn6aQuFJ5LRXCk/wdCktaK4Uljwyq0saCGxoLXCqNAbGgzOiF+OrfQD8dHVfj+wX47uRo4s/GJp+Od2Xj6J5+Md0fPVPH/CGp42z6Kp43fohqeNvhtEvna/jq5DX8bXD6Ov42+EFfx3Y1g+aq+N/LOdV8bfD6Wt42no59Xxtm0jKvnanjaIqnjH0VTxiGp4+7GsjOuDLxyaXj7O5Px9E0vH2bSIcZ+PoF0LM6j8cB0NmsggVPfEEqTLFS9MJU9cGOxNGn6HRp+h0afobGCsMaQqMPQ5R0GobGxiYdNeQxh6HKOglHY6MTz9fXo5+FqI2MTRjsconn7bcvEg0tGSDS0eLtvyy6GuALoa4ebppBXRroC7Ndnm6aQbkC5AOQDkRYqDlIS5bBcrITKfszsaQUp6J5VEDOb3Zk0qhnY7psp6J5VPYMpu2iaUzOw091EA5k7n7QDm/1DFa/C1INSI1INSP30fhqsi9lEJaIYyKIPSNYzquDK4PRDB7K6bNIVbT+i6n9ENP6LofR6eWdX0v9I6FL/KOfS6joUv8o7Ih06HP/hdQIaHC6gaSOx0qBdQ6Q0C6h0mx6Oa6dN7RdTatc59N7RbTetmdjSV0KcuFcJaOdB7LIS0YWN+avhJXKIyOfGe+lEZ6M7GkqtTX6GpkakGpsiR3VOaNmvwkzf4bN/hpIae5gOQnMBzN+Yi02UxLnsBz10VKbPTzGdo5SEykaUhTkVjPRuWhMpGlIU5DDROQqUjSkJcjPqKlFJipPYTehUmebqNJQvgD6G+APplXYBoBoc0A0Z1pCnEBwuUqIShch1DKHoVKHo6DghUqfoDnSpiZU2vo6kqa+xM6fo1jHpyJ0mTSp74didP0TTpL8ZrGdcqdFbJ5UdnUlRJ50Xs0jOuTKn6J50zpzp+hE6fo0jKua4a4KlEulD0JlEpCJxBcShxAcQFvgD6G+APoBJhpiUw0wGxe9DYvRPFjYvWg7FEXspg9EkHsogGkVRZRB6JIvZTF6CYoi9lEHoki9lMXoNYqi96GxZPFjYvWiVGroa4AuhrgDV0NcAXQ1wmrhsejY/5FR6Nj/kzq+To9Ko8JY9Ko8I6XD4LZdTWtkdNbRdTSSR5+mkWUl/SOjSX8kNJbR0KS/kx6XFdCOi+hHZLQjovoR/o8/TSKKcf6Lqcf5RPTjsupR1ow6BxgNUPQcYjoxM6EYs8xKsUbFEwQzg/wnlDZ0pQ0IlBfhcg5NSnpkNSDvw7FWCsQ1IK5XMS49eDuQV6bsdqvTVyCvT0ejmDh16ZDXpOx3K9JXsQ16euGvMRXBqU9PRDUpu97HcqU1ZuxDUp7ej0cxnXIqU2SVKbvc7M6a6STpq5rIVypQYpwZ0JU/QqUEaSMqhxNiynFGxR2x2EqNglENRDUTOxpHiQaRkg0jz9RpyJINIyQaR5+o9PIl0NcAXQ1wy7a8sYxjw9vRyO6PboC7Ndnm6jSGNgNmbAbPP1GkeuQmUjSkKciLGmhnLRPKWwpPRPKWzOw1py0STlvoc56sSVJ+x5Tr2U9E86i+mBOb/Secx5NNlUSX2KlUV+snlUdhUqjb+h5V6fjEZDVIkUh0ZH7WPxdVxeyiEuEMZbKYPhrGdXQZXTZDB7uV02aQroU3supvSOdTfC+m9bPTyyrpUpf0jo0npHJpPaOhSl/KNZEutSltHQpPSOTSltHQpS/nppIOpSnsvpy4cinJ3LqU3YmxrK69OpsupzVunGpzd+l1OpoysayutGorlEaiscmM3cojUZjY2ldWNRXHRqK2mcuNR3HRqOxlY0ldFVv/Q1W1s56rBqsckd1Z8iPc0R/Iz35GXIapcwHMS5+wHJno5iLTnMBzQlyAcnc9HMZ2nOWgXJAOQDkVjLWctAOSBcgHIYazkC5AOQDkZdRconIByAcvsFyPP1Gko8kbJCsmeZHmrSGphJoUmGmZ1rBroa4LXRi4Q6HFnmI7FGxQErhsBwK3EFxNYx6c6dP0Typ74dOUNE84K+kaxnXNnTZJOm73OxOmrEs6aNIzrk1KeuElSnvh1qlPXCSpTV+GkZVy509XsSTg7nWqU9cJKlPeikOdKNieUdl049JpoCeXBUujpcEyAXdGugbu55dgNUg1InUglIOxdCRRGejnwnsojJ2C4ujJXKIT5s58ZFEZaDkdKMlkURlo58J8KIy0GsWqWx0ZEMZMcpOxKlilsdGRDGQ5S0BTGWxqkSKQ6MiauKoyHKWiNS2OjLRnVxbCWyuD0c+D2VwlaxHS4vpvZdTernOpvhfTejz9NI6VB6L6HTm+O9F9B7Mel8utQei+h2xzaD1YvoPfo8/S46VN72XU2sTn03u5dTejCuqo9KY8JY9KY8M6CMYxMAS4TS6Uy4TS6aQTVPshqfZdU+yGp9mvMSjqfZDU+y6p9kNT7PRzBBUWnYhqLZ0aiWyGqtmvMTXPqx1YiqLb0dCotMhqLZ6OYyqGaJJrZdURJURrIVJJaJ5rZVNaJ5LZrIypDQDQ5oBoWOwJvsxjKxpB3R7dC7+zXZh1GnJ6kGpE6kEpHn6j08qFIJSJ1IJSPN225OujXQF2a7PF235NujXQF2a7Meo0j18AfQ3wB9PP1GkBJipPewpPWxUmRYaVN6JJsoqMkqMzvJpVSX8kNSSuUVJa0Q1JbNPKdBUkrElSSuMqT0SVJO48GvJy9k8pK5pS0Tyn7HlPp+RxkNUiRSHRkfrI/JLIsphIhjIpgzSDowlwrg/5OfTZXTlw35qK6NOSuXU5aOXTlsupy0ejmsq6dKSuXU5a0cinPZfTn/PTfUunTqbsXUqmunHp1HfbLqdTQ0diFcrp13Y4sK+yunXJtXHahX4Vwruy2cWnX2VU65na0juQ8hlMfI0cSNfZRHyEYY1ldqNcaq7OXGuv0dGutDGkrpqsGq36c9VlfbQarCQ1ep/QamiFTf0w1M0kNWZmzRJmbNm8iLVGRskS5GyZrIztPcgHIS5AORo4bKQpz30By0JlIBkpCnPfQHLQmU99MOnYc5gOoTuYDm7Hn7axXmvw3yEfyG+Q8tbSrlMNTRCqjDUzOtZV8XsdEhVVodGqzOQ1UpBqROpXCUi5DVF0eXQN2a7NJGHQZLWxUlcokhUlvZcjOpZLRPOJdKOieS2bRFc+pDRJUh6OnOOiWpHZcZ1zKkdENSP9HUqR1shqR6EOfNElRbLqi6SVEBJLhLLpVMlkUFSYqT3sOTEyYDMkbJCsmbJkipS2OjP2QxkOUtAdBS2OjIhjIcpFNHQhNFEZo5sZ7Hxm7bYHTjNDVNHPjU30bGp7Cl8ZodGaOfGbuNjP2Bap+xsZ+yGM99HKWia0lXQmrlEamjmRm7lEJszrSV0ac99Kqc9HMhMspz0iOlyupSn/XToUpKyOPSntHQpT0tnn6aSuxSn/S3o6FKSsjjUp/0jo0p6WzDqNJXYoz/pbOhSlpHHoz2joUp6Wzz9RrK7VOaui6nNWOPSqb2y6nU0ZWDpKQ2M/ZDGY5T10ysF2a/D3NEnyejZ+hIabKproqU0KlMTKozSQ15Un3ZJOau1c1So7MkqTdy+YWtUqKzIKk1sZUm7ENSbuejmM7QVJaaIastjqs3ZkNSTubcxy0ub0yOctjpy0R1JbPRzGdpU3oknLY6ctEk5bLkYvJS0TyYUnonlLZpI49chMpbNKQpy2LFa9cgXIW5AuRnYafkbJE2TNkzLqNeapUg1JEakw1I83UenmrFINSRGphqRh3GvNVqQSkTqQakePuPRzT0w0xKYaZ5+o1lYxjHm6jSUEuCZjpcEzJw1NUI6hZUI6gw1FU+yKp1ltT7IanWVIm1JUeiKo/60V1XpkNR3bNJGdpEpaJ5S2HN9JpS2d8p1+TRkNUiRSHRkfoY/MrIsphIhjIpgzSDoU58K6ctHMpz4WQnpGnNRXRhPZVTn7ObCWyqE9dPRzWVdOFRX6V06munJpzd+lcKmum+pdeFVfpXCqsVs4cKry6Vwqv8ARo7UfIKI+Ro4sfI2UR8jRFq47cPI2VU/IOHDyN2KoeRqxFrSO3DyNlkPIOFDyOFUK+juEruQrL9KI1lbpw41nfpTCs7dGNJXZjWV+jVVX6cmNV/o6NViR3XVjWaf2MjWf2c6NYdGtq5pIatUw1NEKmw1M3kRaqzRvkI82b5DWRnapc0A5k7mA5sLUyqJITKork8qjsJlUbYD5VFYnlVV+iZ1HZk8qjuYdOxY6q/RUqq/SSVV2Euq/wBPN20i/wCVfpvlX6c/5X+m+V/p5quV0Y13cbGucuNdDY+QjOtJXUhXZTGvrhx4VyiFdfpyR3XVjVV/sojNWOTGo2+lEajsayGulGaGqasc+M2NjNlyIqjJGyQrJmyZpIzopMTJht6FSZ2IpNQjqFc+ElQuM6mqcIan2XVOENT7CEFb/wD2R1vv/wALK33/AOkdb7/8Ainwkn0rnwkqFCeTFSe9hyYmTA8ujXQF2a7JDVINS0TqQSkBdGQ6MiNSHRkU0WxkOjIhjIcpaAtU99Gxn7IYyHKWgpdGfsbGasc9TY2MwLo1Bsait056m7jY1PZNJXRhU30ojPXTmRnsohN/pnVyujCe+ldOorI5MJu+2V06n6yOlyuzTqbWy6lPS2cWlN36XU56Rh00ldylU2tnQpVFZHBpVHkjoUqjstmXUayu9QqezoUKiv04VCq7J3L6FT2YdRpK7lOqrrZdTrLHpwqdV5dLadV62Y2NXYjXY2Nd/py410OjXIsHT/6Df9BzfnN84kZ6ulX0Tz8h/pLLyVYmlXey5DVE/I6ST8jYmfkasSTr9NOYWnT8jpJPyNiZ+RokqeR09HMZ2jqV2kSTri51ySpX/o15jlptSs7Ek61ugzrIkqVrux6OYztNlUTJ5VUJlUdieVR3LkQbOpomlUVwJz9k8qmzSQOlNCZTQqU/YqVTfRY5p7mgHMndQB1GZ2OaozR7miP5DfIZdRrzVaqIP5FY56qO4SqPh5+o9HNXxn7GxqKxz4zY2M2efuNeavU99GxmQxmOU2ePuPTzV0Z7HRkiGMmOjI8/UayrMkbJCcmbJnn6jSV7JipPewpPWxUmRhpU3okmyibJJvYw1HX6QV3osrvZB5HC5E2oqjViGo9llR6IKj3cuRnanqPRJNlE2STezXyjX5NGQ1SJFIdGR9WPzyuL2UQlwhjLZRGWjWC+EtlEJnPjN/pRGejaVljpQmiiM9HLjPZRCb/TSUx04VVfpRGov05MajuURquxp6MdSNcbGucuNdXGxrnfRjsR8h3KY+QcSPkbKIeQhq3ch5DKI19HEj5BTHyNDR24eRsqh5Bw4eQVw8jR2DtQr7K4eR9HDh5BXTr6Lg7EK7/SmFfRx4VymFdCO660a42Nd2OXGuhsa5rDXTVd3DVc5qr7DVdMqJ1d83/pvm9sj+Y3zGsNVuuwHXbI3XAdc0tQplXYqVdksq/RUq6M7RRKvomnXEzrr9Jp10zDpcUSrsU65LKuKlXPP00iz5z35/8A05vzm+cxrWV0l5DGR8i6ORGvZjo+QZ1pK68fIdyiPkHFjX2UQ8hfoiddyHkMoj5Gvs4ka5THyFY0hrsR8h3+yiPkaOLHyNlEfI0XE11VXYarnNVf6DVc0jOrnU10F1FcjdRguo7lJPlPRPOa2BKo/pk8pgapPXSOpPbDnPXSSpPYSXVlohqSKKknYhqS2Aio9Ek2UTZJN7uNRhUmKk97Ck9bFSY0wJjGJ08sujFwWuhrg13DovehsWTxY2L1oa75OT2NiyeLGxetDTyoUg1InUglIrVYsU0MUkRqQeTGmLFINTI1MPP2StfGY6M1+nPjN3GxqewOnCpvo+E1o5sam/oohN/pFaSutTrbRdSrNx6zi0qyuXU62ukVpK7VCvr7LaNd5I4dGvosoeRsw6i5X0FOvuxdT8i1rNnz9PyNoup+Rqx5uo0lfQ0/J2V0/J9nz8PJK4eToixeu9HyRy8k4S8kbHyiLHNdh+UA/J9nKflAvyhI7rqy8n2Ty8rZz5eVonn5PsuRzV8/K0SVPJTI5+VpskqeV9msibVdTySSfk7JZ+Tokn5JpIztWT8n2SVPJ2S1PJ0ST8k9PLlqufkaJ5eRsll5CsTy8jZrGdq2VfRNOuxE66/Sede5SVLqr9Eyqr/6Syqv/wCCXVf6BXKpZdEyqb6Tyqa6JdRt9KqVbqa6A6i5cjdR2tcF1N9M6Kvk10B1V7JHUf6C6jvtmdjSVaqwaraOeq29hqsZWNZXRjWdxsazObGsujY1tHm6jXmunGqr9KI1F1s5MKjve5RCo7dPN1Ho5rrRqIojUVjkwqb6URqM83XLedOiphqaIVUf6Gqn0efrlpOlUmrCpPYl1n+3FSqv9J8q9GVJEdSe2HUnq1ySpIeT0XVkrHPqz29lFWX89OfVm7sqcpvSerLRDUlsoqSdmQ1Jf0aTlneipyJ5PYcmTSls08sPT8kTDTEphpn0I+KojIcpEakOjI0gtjNDoz9kMZDlJ2LlcxfGaHKojnxmxsZ+zSdGOgpjY1NHPjUY2NT2d9GL41FcbGomjmqo7jY1ND0Y6Maw6NZ3Oaqy/R0aqsaa460K7KY19HIhX/8ACiNdL7O6OvTrlcK+jiwr7K6dc0g7EK5XTr6OLCvsrhXLg7EK7/SiFc48a+ymFdCI12I1xsa7OXGuhsa5rDXT+d3DVf6Oaq6/UGq6f2ionXR+c3znM/6D3/oNIavl5GhL8j/4Ry8gTKvs7a6vl5GiefkMll5CsTy8jZnaKZ12iedd/oiddE069zPpcWSr6Ey8j0Ry8gTLyFf6PP00i5+R6Bdd3IHXAfkejKuyuoq+w15FzlLyA15GjOtJXWj5Dv8AZTCucSNffUUR8hCJ124+T7KI+QcOPkbKI+SaQ13IeSUQ8nRwoeRsph5Oulx2u2vJDXkHIXkewl5JpEV1/wDoX6e/9COV/wBPo3/T6KSvlX0Kl5BHLyBMvI2BVKprpNKqhMqrt1E06nsJNqVNPZJUmDKoxMp72wPJy0ST/wBDZMVIjXcKfAH0N8AfTmmBszWYdke29E608hUQ1EJRDURp5CohqISiGoj0vy8SDSMkGkNPLwxjFanDLr9NdfrAuzy7O65hykEpE6kEpHXFakGpkakGpgdCNS32OjUX6c6M2NjP2RSV1adVa2WU6qsjhwqvLpXTqv8ASK0ldyn5GyuHkPRw4eRsqp+Rrpn1Fyu/T8nZXT8n2fP0/JK6fkqx5+o0lfQQ8qxTDyfZ8/DyfZTHyiLFa768oP8A6vZwv+r2EvL9kWGu7/1ewH5Rx35fsH/q9iQ11peWJl5V/s5cvK9iZeX7LkNdGflaJJ+V7I5+VrpHU8nZrIm1dPyr/ZNPytkE/K0Tz8m32aSM7V0vJ0Tz8n/6Ry8knl5GzaOWrXX0LfkET8gTKvsuM7VTrv8ARUq5LKv0VKui1LJV2KlXJZVxUq4FjqJLomVTfSaVTXRUqjbKqVbqa6A6i5ckdR2sA5u5nRU62tAOtvrJXW/8BdZX6LCVYqwara2c9VlfYare0ZWNJXQjX2NjXOXGurjY1zzdRrzXVhVV+lMaqt040arv0ohVet6PP1Ho5rsQrv8AdD4Vzkw8izKIV1+mPXK506qrL9CVZW7/AP05SrNvoarP9PP1y1nTpusrdAdZWOe6zuA6zuR4X6Vzr/8ApNOuxM66JpV98Hlz0bVrPEhqVtsKpW0Q1K27FzlN6apNfTJKk1uxqlTXSSpN3ezScs708nLpPKWzSk7E85mvlGvy1MNMSmGmel8s5MNMSmGmA9SDUidSDUikqlINSJ1LYSkBWpBqZGpBqRoLlINTI1MPP2BdGaGxmrHPU2NjU9lyi+FT2URqezmRnsohUf2zSUdWFZ6KYVjkxrIphWWi5UutCtwojWOXCsh8KysaSjrwrv8ASiNc48a+ymFdCVm60a42NdnLjXQ2Nc0lHUVVW6wlVVus5qqu/QlVf6i9F/zs3zs5/wAxvmQ0XSripVyWVdCpV0VaKJV2KlXJZVxUq6M7RRKvonnXf6Tzrr9J5V9kWuxW6q/RMqqv0klVdhTqv9M7WkXOqrdBdVfpC6r/AEF1Xfpiteq4ar/RzVX+g1XTA6kaqv0bGqv05Kqv9HRqv9Ig7EfIKI+Ro4kfI2Ux8hW+jSDrR8h3KI+Ro4sfI2UR8hWOwdmPk/Q2Pk6OLHydjY+SaQdb/o9m/wCj2cv/AKTf9P8A4aal0n5DSBfkbOe6+ugvyL/aGi91l+ipVVfpD83s8dT2LUYplUX6KlMn+R2seOd/sztMOcgGxSlsNMi9NZy8PbGW2NjHRnemk5BGI1Q1wOMVfg5ROe1z86SoMNQKFANQQ9tJ+adU2GqZQqaDUEROl/5pMGbFlOJsUaTo/wA6mcQXEocbAOOip051wS+APox8FvppOnnvD1sC+zNgNl65Ybkj3JCsjzIazsVqaDVT8IVNhqZNUvjPZRCql9nMVRp6CVVr7M6OvCu/0phXZx4VyiFdfpFjSV3IeSUR8nRw4+Rsoh5OjOxpK7sfJGx8k4S8kdHyTPHddxeT7CXknFXkhLybHMNdp+SC/J9nJfk+wX5Iw11H5PsTLyjmy8kS/JGGuhLyb7uTz8ogl5Wiefk2ZrGToS8gnn5JHLyfZNLyNmkFsvIEy8gjl5AmXkbLiVrr/V2A67ZG66QDr/RcFjqewHUX6SOqwHUdzqcWuordAdREjqMB1HcGKXU9gOZO6gDqeyg51PYDqeydzAc/0Bzqb6A5k7qbAdT2RRZn7N8nsh+T2b5PZHQ6SqoJVVbpzVVf6Eqr/TCxpK60a42NdnLjXQ2NdfplY1ldaPkNIbHyPZx419jo+QY3ltOnZXkBryfZx15PsNeSZXlrOnVfkewH5H/pzX5OgH5P5cnyenQlX0JlX0Ry8j2Jl5Gx5PSqdcmnXYiddE8q9zs5R7MlPu2TzqK+mLnU9iJVPwucnoyU19CXLYDnroqUjXyz1+cLoa4AuhrhTwPF0NcAXQ1wA0w0xKYaZSTEw0xKYaYDVINSJ1IJSNBQpBKROpBKQFakGpkakGpHJRcpK46MyGMhqnrppKL4VEURno5kZ7KYVH+lypdKNRXKI1FY5MajuURquxpKOrGoimNRWOTGo79KI1XYSs3TjUV+jY1FY5kajT6OjU100lHSVRcuEqmunPVR30wlUf6Xovz9mz9kPyezfJ7GiuVRWEyqK/SaVTXRUqjbO2iqVRJCZVETyqOwqVRtkWhspoVKYmVT2Kc3ci12HSmrCpTQmU/YqU3cztaQ91PYDqE7mA5slazNfh7miPN/hs3+AdCNTfR0aitpnLjUaY6NR2Ig6UaiuOjUVtM5cajvobGprppB1I1xsa7OXGuNjXOwdNVw1XdrHNVb60Gq6Lg6Xzs3zs5/zI3zI7qXQ+VfpvlX6c/5X+//ANN8r/Rou+b/ANN83sj+b2jfMLXcXZr9Pcl9Ecag6MjO13FKYaJoy2Ux4YXp6OeTYodGIEFsrhAzvTWcvIQ3+j4QYcKa/CiFMy9vVz+ZaoobGjofGjcdGix7az803xs8+P0XfH6PPjX4J0r/ADRumA6Zc6a/AHBfZpOj/NC4a4KlFl0oa4JlCxc6ZdcIJRFOJXKNhMomk6efrhLLguXRsxMum+vPYFsBszYDY1lYbkjZInyZ5kztSrUw1NEKmw1MijoRqIdGorHMjVdxkamunbCV0o1x0a7OVGuNjXM7GkrrKuw15DZy15Aarq30Z4a6y8nYS8k5C8gNeT//AMGO66r8kB+Ts5r8kB+T7GOa6MvIdhUvIbI5eQJl5GxjurpeRoTLyCOXkL0Jl5GxHFcq7EyrksvIQqVc0gsdRWBdRcI3Uf6C6jvtlxKnNfhs1+EnyGzf4XBXkeZImyZsmdVh7kA5AOTBcgYJyBchbkC5bKZjlIU576A5aEykAcp7Az9iXIByJoe5oB1PZO5gObM6LVU9h/IrdOcqm+hqoyLCV0FW/A1X0QKsvsJVvaMrGkroquw1X/8ATmqv9BqumTeVzp1Pn2EvIbRyl5CQa8gzvLSdOn85vnOb85vnI8u6sdcB17kbrgOv9DyardRW6JlUVyeVR26JlVu/oTlPpRKoKlNfomU/YpzZrOT0ocgMhOQDkMc18WYxjuPExjGGAjGMdUJMNMSmGmASYaYlMNMAkw0xKYaYDEw0xKYaZST1INSsTqQSkBWpbHRn7IYyHKRrouUtjoyIYyHRkNF8ZbKIT9nOhPmymMtF6lapex0Z+yGMhyloaLMg1MjUg1IrRXkjZImyZsmNDXIByEuQDkNDZSEuSuC5aEykNBSkhLlsFyYmUidUZKQlyBctCZSOaHuQDkJcgHIgVZI2SJsmbJgWKQakRqQakUpYpBqZGpBqQFqmGqnshU2GplJXKoGpohVT2GqnsC35PZvk9kPyezfJ7O6LVP2w1U9kKmw1MaK1LY6MiGMhyk2ibSRZB7KIyuQxlsoi2Z2tJFkOl1LiIaf0XU+Kxj109HHKuCbdiuEdE1JXfDo0oXSMOunr45Mpwf2V06bsrmp01fZXTpq3Dz3p7OOAxpu5RCk7DY0lcpjTVuGd6evjhGqbM6T/AAuVNPiM6Xplzpv4/wCIZU/Qlw3w6MoCZQRpOmd4c6pDRLOJ0qkNcJKkN8N+a83fCGcbLhLOOzoTjokqR2z0c14++EM1ommtlk1ommumseTqJZcEy6OmJkaR5+oFsBszYDZ1nXuSPckJyZsmEVQp+w1MjUg1P2SpaphqaIVNhqp7AtVRfoaqK3Tn5u+mEqj/AEzxprofMb5iP5vaN83tHMNWOordBdRXI3UdgXUd9s6lW62gXWJXWAdbYD3U9gOZO6gDmyhQ5oBzJ3MBzYFWR5kibJmyZo7FCkGpE6kEpBcOTDTEphplO49ujXQF2a7BgZcFy6MlwVLocsBJipPYUnrYqTDOwMpCZS2aUhMpCuUTkA5CXIByM6in5K5sibJnmRyu6rzRvkJPk9HmbM67q5T9hqaIVP3YNT9ozxpqxVF+hKordOcpu/Q1Uf6MNW/L7N8vsk+Y3ykK9KnVdgHVYh1V+oF1VcHpS5+wHMndT2A5svE6pcgHIS5AOTGGqMkbJE2TNkxhr5oxjFY87GMYYMYxiFMYxgCMYwBGMYA7o10BdmuykmJhpiUw0wHqQakTqQakd0VxkNUiRSHRkNFcXsojLRDGWyiLK1K2MhqkSKQ6MhorUg1InUglIrQ+6NdAXZrsaPWwGzNgNjQEmJkw5PWxUmNC5O4qT3sKT1sVJk6oMmKk97Ck9bFSY0etgNmbAbOhl0a6AuzXYDVINSJ1IJSKUepBqROpBqQFCkGpE6kEpFJPyRsxOTNkwH5I2SFZGzI0UKQakTqQSkNFcWrlEZaIYy2UReibWkium97LqdrI59J7uXU3pGdrTmOjQ4XUCHx+F1A83XT2ccr/AB464dLx4kfjo6Xjx3w83XT2ccqKUXc6FKH88J6UP64dClHSML09/HBkY80URho0Yq5RCOjO9PZxwXGHozh6KIxNKJU6b3hHKGiecN8OhKKtwnlFXNeemd4Q1I64Q1I2kdOrFOJFUjt2PXzXl74c2pF2ZDUj/R1Kkf5Iakds9HNeLvhzZokqIuqLRJUXT08vm9xJLhNLpTIml00jzdQmT0Kk97CkxUmdY15dGugLs12Gde3R7f2LuzXZKjske5ITkzZMB+SPchOTNkxhp+SNkibJnuTOYaqcgHITkwHJkKUOQDkJyYDkwHOQDkJcgHIoOyRskKyZsmA1MNMSmGmaOw6PRsf8io9Gx/yF8vV0NcAXQ1wprjyzNZh2RrIGFS4Kl0bLgqXQ5YVLhNLpTLhNLoZ2Ezeieb2OmTzezlZ0qTFSe9hSetipMis6zkC5C3IFyOVGmZI9yE5M2TM6aoyNmTZM8yYxrq3JGyRNkzZMYapyRskTZM2TJxWn5I2SFZM2TGGmZHmSF5Gy9FYnTMkbJC8vRsvQw0d0a6AuzXYw18/Zmsw7I1kQzBZmsw7I1kAFmazDsjWQHpjGAxjGCmMYwGMYwB3RroC7NdgOTDTEphpkpPi96GxZPFjYvWgKIvZRB6JIPZTFl6KovehsWTxY2L1oaKIvehsWTxY2L1oaHXRroC7NdjR62A2ZsBsaAkxUnvYUnrYqTGhcncVJ72FJ62KkzigyYqT3sKT1sVJgetgNmbAbCTLo10BdmuwGJhpiUw0zQMTDTEphpgHdHt/Yu7NdlBt0a6AuzXYDbo10Bdmuwo5MNMSmGmBTF7KYvSuRweymL0jKq5XU+oup/RDT6i6n9GVejl0KB0qP0c2gdKj9Hmr0fn9dTxzpUPo5vjnSofR5+30fzdOl06NJaIaS2joUl/J5a+hxVNNbKUtCaaKFwzr28V7ZntmFZHtkd5b2kSWiaS3osmtE0/s35Z2oqhFU6XVPshn1np4eT9Kiq8Zz6n+2dCr/AJZz6v8Apns4eD9KhqcZHU6WVOMiqdPTHze00+EdT/RZPhHU/wBGkeTtPLgqXRsuCpdNXmpb4A+hvgD6EV7dGugLs12SPbo10BdmuwDujXQF2a7JDMkbJCsmbJgMbAbM2A2ATYDezNgNgFdGugLs12FDujXQF2a7AcmGmJTDTKXFEejY/wCRUBsf8hfJq+g1wBfQa4U2GYxgFy4Kl0bLgqXQ5U8+ElTpXPhJU6GdTTJZdKpksiWVKkxUnvYcmJkwzoGwGzNgNkpa6NdAXZrsD26NdAXZrslRt0e3Qu7NdgNyRshOTNkyRRkbITkzZMBl0a6AuzXYB3RroC7NdgNujXQF2a7A5JjGM0sYxgMYxgMYxgMYxgpjGMBjGMBjGMASYaYlMNMlJsXvQ2LJ4sbF60BVF70NiyeLGxetHNFcZDVIkUh0ZDRVGQ1SJVIbGQ0UZI2SFZM2TGg3IByAcgXIaPXIVKRpSEuQ0aTFSe9hSetipMtQZMVJ72FJ62KkwPWwGzNgNhJl0a6AuzXYDEw0xKYaZoCTDTEphpgNujXQF2a7KDbo10BdmuwGJhpiUw0woxMNMSmGmBXApg9IjgymL0jKq5+rab2i6m9XOfT6i6m9Iyr08ul470dKg7tHL8d6OjQZ5q3/AD+u34z4dLx5bWzkeNLXTo0JbR5+n0fzdilLaOjSlpHJpPaOhSl/KPLXs4ro0pFNyGnJ3RQpa6Z17eKrjI0pE8ZmlI7y3tHOWiebVwpS0TzlvpvyztJqytEiqS6UVJfyyGpLbPTw8v6X/ierL+SGpIoqS0yKrLZ7OHz/ANKmqNWbIqr2VVH/ADoiqPZ6Y8PaeTJpvo6TJpvZpHk7KlwTLo2XBcumrz0p8AfQ3wB9DOvHwB9DfAH0kYxjACYxiR5dGugLs12AbYDZmwGwCbAbM2A2AV0a6AuzXYUbdGugLs12A+L3obFk8WNi9aKXFEXvQ2L1YnixsXoLilMNMSmGmU2HdGugLs12BpMVJ72FJ62Kkw5SpvRJUZRNkk3sMqTN6J5/Y6T0TTeyWdImJl0dLgmXQzpL4A+hvgD6SkJjGA8ujXQN3c8uyVDujXQF2a7AbdGugLs12SDujXQF2a7AYYxgPbo10BdmuwG3RroC7Ndgcy6NdAXZrsJEYxgPbo10BdmuzMHdGugLs12AwxjAYxjACYxiVMYxgCTDTEphphJiYaYlMNMB8XvQ2LJ4sbF60SKYyHRkRqQ6MgLVINSI1INSCleSNkibI2TApcgHIS5+wHIA3IVKRpS0JcgDchUpGlIS5FD1sBszYDYGujXQF2a7KB3RroC7NdgMTDTEphpmiRLoa4AuhrgHq6GuALoa4UPTGMBl0NcAXQ1wKeroxcFroxcAfDpTF6JIPZRF6MqqLKb2W0+I59Nu5bTejKtOXUoy306FJ6RyaT/pHRoy0YdR7OOnWoT2tnUoy0mcOjL+kdOjPXo8/Uezjp2ac9ovpT0canN3LqdR2MLy9nPbrwqq5RGordOTGo79KI1XYzvL0c9r/m9m+Yj+Y3zFTlv/AKf8VyqK3SeVRXEyquxPOo/01nLO/oOpVVrElSogalRkk6ruevmPL328qS0RVZq42pPXSGpN3PRzHj77BOWuks5bGTlolnLZ6Y8PXRc3rRNMdJ6JpvZpHn6oZMVJ72FJ62Kky2FePgD6G+APoZV6+APob4A+h16+APob4A+gePgD6G+APpKnr4A+hvgD6B4+APob4A+gG2A2ZsBsDXRroC7NdkqNujXQF2a7AoTDTEphplKlURlsapEikOjJhpKpUg1InUglIL07JGyQrJmyYNE5CpSNKQlyKcteTlomk0HJ6J5y2Gdpc3onkx0mTTe9Es6XJiZMOT1sVJhlS2LfQ3wB9JdCYxgMYxiRjGMBjGMFMYxgCMYwGMYwBGMYDlmMYlL26NdAXZrsA7o10BdmuzMEYxgMYxgMYxgPbo10BdmuyVMYxgPbo10BdmuwkxMNMSmGmA9SDUidSDUiRUpBqROpBKQFKkGpEakw1IKVKfsNSI1INSAdkeZImyZsmA1y0A5AOQLkATkA5AOQLkUDbAbM2A2AV0a6AuzXZQJdDXAF0NcA8XQ1wBdDXDRL1dDXAF0NcA9XQ1wBdDXCh6uhrgC6GuAAuhrgC6GuBQ10NcAXQ1wBkHspg9EkHsoi9GVVFkJbK4PRz4PZXCWjOtI6FKauXU5aRyacncupTdiOo046dinNa/S2lUVk7nHpVHcupz9nm6j2cdOxT8j/APZXCvo4sK+yuFfhF5ejnt2Y1+bY2Nd+zlxrobGuZ3l6Oe3U+c3znN+c3/QVOVX9F8vIshMvII35AmXkbNZyi/oqnX+ieddiJ10TSr7sb8xj32OVQnnUX6DOoTTns9HMePvsU5d2Tyls0p6J5zNYx6r1yFSkaUhTkax5+qzYDZmwGymdE+APob4A+hnXj4A+hvgD6HXr4A+hvgD6B6+APob4A+kqePgD6G+APoHj4A+hvgD6B62A2ZsBsAro10BdmuyVCTDTEphpgMTDTEphplJlPUg1InUglINJVCkEpE6kEpBWqMkbJE2Zswaa5CZSNKQpy2UWs5CpSNKQlyDO0MmKk97Ck9bFSZLlLkxUnvYUnrYqTDOgfAH0N8AfSXXj4A+hvgD6Ab4A+hvgD6SMYxgMYxgoRjGAxjGAIxjAYxjAcy6NdAXZrsxSO6NdAXZrsA7o10BdmuwCMYwGMYxIxjGA8ujXQF2a7AO6NdAXZrsD26NdAXZrskNujXQF2a7AYmGmJTDTAapBqROpBqQD8kbJCsmbJhSnJGyRNkzZMBuSNkhWTNkwHuQDkA5AuQBtgNmbAbCR39nl0BdmuwDujXQF2a7LgYuhrgC6GuGkHq6GuALoa4WPV0NcAXQ1wA10NcAXQ1woemMYAjGMSMuhrgC6GuANT2OiyeLGxetEqUReymD0RweymL0DVlOe+lUJ6ObCTuV0566Y2NpXRpz2W06iSOTCdvsphUZnY1ldaNZ3Q+NbRy4VlcojWVlwy8vRO3TjX4NVd/hy410NjX5seWs7dL5l+m+Zfpzfmf6efM/07OT2vdfQDrtkbrr0A665c0nLntVKqv0TKqrkkqr/AEU6rt01kY3pTKaFSn7Eyn7FSmzSRnejHMDIS5MByNYytOcgXIW5AuRcZ2vbo10BdmuzrFjGMBjGMAJjGAB8AfQ3wB9A8fAH0N8AfQPHwB9DfAH0ketgNmbAbA10a6AuzXZKnt0a6AuzXYDE9hp+xKYaYUapBqROpBKQDskbJCsmbJlK03JGyQrJmyYNG5AuQtyBcgnRuQqUjSkJcg5rSYqT3sKT1sVJhAHwB9DfAH0AHwB9DfAH0JevgD6G+APoGMYxKgmMYDGMYkYxjAYxjAEYxgCMYwHKujXQF2a7MR7dGugLs12Ad0a6AuzXYDbo10BdmuwDujXQF2a7JB3RroC7NdgYxjAe3RroC7NdgYxjEj26NdAXZrsBt0a6AuzXYB3RroC7NdgNujXQF2a7Ch3RroC7NdgHdGugLs12Ay/s8ugLs12Ad0a6AuzXYSO6NdAXZrsAl0NcAXQ1wuD1dDXAF0NcNIDXQ1wBdDXCwa6GuALoa4B6uhrgC6GuFAzGMBjGMSCMYwBLoa4AuhrhKjovehsX7J4sbF60BXGWx0ZWJFLY2MibFSroTKIzOfGRRGTsRY0lWxn7GxqeznqbGxnrpzy7O3QVRXsGqit056qO/QlVY8tJ2v8Ak9m+T2Q/J7N8nsTl32r+RW6C6i/SR1H+gOo79NJye1bqIB1PZO6gDmzsiL0pcwHNCXP2A5GkjO9HZI2SFZM2TOxy0y6NdAXZrs0jO0d0a6AuzXYSIxjAYxjAePgD6G+APoHr4A+hvgD6B4+APob4A+gA+APob4A+kjx8AfQ3wB9A9bAbM2A2Spro10BdmuwDujXQF2a7Cjbo10BdmuwDujXQF2a7KTo7o10BdmuwaNsBszYDYRomwGzNgNg0L4A+hvgD6HQPgD6G+APoHj4A+hvgD6EvHwB9DfAH0DGMYlTGMYATGMSMYxgMYxgCMYwGMYwHJMYx5xjGMBjGMB7dGugLs12Ad0a6AuzXYBGMYATGMBjGMAJjGJGMYwGMYwGMYwHt0a6AuzXYDbo10BdmuwDujXQF2a7AIxjAYxjAHdGugLs12AxdDXAF0NcKgNdDXAF0NcNYDXQ1wBdDXBAa6GuALoa4aweroa4AuhrgS9MYwBGMYKYxjAEuhrgC6GuEqGmGmJTDTApi96GxZPFjYvWgo+MhqkSKQ6MgKFIJSJ1IJSJFeSNkS5M9yYFOZsiXJmyZTTVGSPMkTZM9yYNOyRskTZM2TKZqMjzJCsmbJgPujy6AuzXZok5MNMSmGmAwxjBLGMYA7o10BdmuyhjGMB4+APob4A+kgHwB9DfAH0Dx8AfQ3wB9JAPgD6G+APoAPgD6G+APpI9ujXQF2a7A9ujXQF2a7AbdGugLs12Ad0a6AuzXZQO6NdAXZrsD26NdAXZrsDx8AfQ3wB9A8fAH0N8AfQl4+APob4A+gePgD6G+APoHr4A+hvgD6BjGMSBMYwAmMYKYxjAYxjEgjGMBjGMB/9k=") center top/cover fixed; font-family:system-ui,"Noto Sans JP",sans-serif}
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
