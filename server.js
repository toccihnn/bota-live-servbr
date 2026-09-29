const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT) || 10000;
const HOST = '0.0.0.0';

const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}


/* =====================================================
   人気ランキング TOP50
===================================================== */

const rankingNames = [
  '月夜ぼた',
  '星空レン',
  '夜桜ミク',
  '蒼空レイ',
  '月乃あかり',
  '白雪ユナ',
  '黒猫ルナ',
  '天音ソラ',
  '星野ナギ',
  '桜音ミオ',
  '夜空カナ',
  '水瀬リオ',
  '月島ハル',
  '青葉ナナ',
  '神楽ユイ',
  '雪村レナ',
  '花音メイ',
  '星川アオ',
  '春風ミナ',
  '雨宮シオン',
  '月城アイ',
  '白石ユウ',
  '天宮コト',
  '星宮リナ',
  '夜凪マオ',
  '桜庭ユキ',
  '水野ソラ',
  '月影ナナ',
  '青空ミオ',
  '花咲レイ',
  '星乃ユメ',
  '白月カナ',
  '夜風リオ',
  '春野アカリ',
  '天音ミナ',
  '雪空ユイ',
  '月森レン',
  '桜井ソラ',
  '星空ミオ',
  '花月ナギ',
  '夜空ユナ',
  '水城レイ',
  '白雪ミオ',
  '月野カナ',
  '星川ユキ',
  '春風ソラ',
  '天宮ナナ',
  '夜桜レナ',
  '花音ユイ',
  '月光アオ'
];

const rankingIcons = [
  '🌙',
  '⭐',
  '🌸',
  '🎙️',
  '✨'
];

const ranking = rankingNames.map((name, index) => {

  return {
    id: 'rank-' + (index + 1),

    rank: index + 1,

    name: name,

    score:
      50000 -
      index * 731,

    viewers:
      Math.max(
        1,
        1200 -
        index * 19
      ),

    icon:
      rankingIcons[
        index %
        rankingIcons.length
      ]
  };

});


/* =====================================================
   新人ライバー
   人気順
===================================================== */

const newcomers = [

  {
    id: 'new-1',
    name: '新人ぼた',
    title: 'はじめまして🌙',
    icon: '🌙',
    live: true,
    popularity: 100
  },

  {
    id: 'new-2',
    name: '月音ゆい',
    title: 'のんびりお話しします',
    icon: '🌸',
    live: false,
    popularity: 92
  },

  {
    id: 'new-3',
    name: '星空れん',
    title: '夜のおしゃべり',
    icon: '⭐',
    live: true,
    popularity: 88
  },

  {
    id: 'new-4',
    name: 'そら',
    title: '歌ってみる🎙️',
    icon: '🎙️',
    live: false,
    popularity: 84
  },

  {
    id: 'new-5',
    name: 'みお',
    title: '初配信です',
    icon: '✨',
    live: true,
    popularity: 79
  },

  {
    id: 'new-6',
    name: '夜桜',
    title: 'まったり雑談',
    icon: '🌸',
    live: false,
    popularity: 74
  },

  {
    id: 'new-7',
    name: '月乃そら',
    title: 'ゆっくり話します',
    icon: '🌙',
    live: false,
    popularity: 70
  },

  {
    id: 'new-8',
    name: '星野ゆい',
    title: '夜更かし雑談',
    icon: '⭐',
    live: true,
    popularity: 67
  },

  {
    id: 'new-9',
    name: '花音りお',
    title: '歌とおしゃべり',
    icon: '🌸',
    live: false,
    popularity: 63
  },

  {
    id: 'new-10',
    name: '青空ナギ',
    title: '初見さん歓迎',
    icon: '✨',
    live: true,
    popularity: 59
  },

  {
    id: 'new-11',
    name: '雪乃ミナ',
    title: 'まったり配信',
    icon: '❄️',
    live: false,
    popularity: 55
  },

  {
    id: 'new-12',
    name: '天音レイ',
    title: '声で癒します',
    icon: '🎙️',
    live: true,
    popularity: 51
  }

].sort(function(a, b) {

  return b.popularity -
    a.popularity;

});


/* =====================================================
   ギフト
===================================================== */

const gifts = {

  star: {
    name: 'スター',
    icon: '⭐',
    points: 10
  },

  flower: {
    name: '月光花',
    icon: '🌸',
    points: 30
  },

  heart: {
    name: 'ハート',
    icon: '💖',
    points: 50
  },

  moon: {
    name: '月のかけら',
    icon: '🌙',
    points: 100
  }

};


/* =====================================================
   CLIENT / LIVE ROOM
===================================================== */

const clients =
  new Map();

const liveRooms =
  new Map();


function uid(prefix) {

  return (
    prefix +
    '-' +
    Math.random()
      .toString(36)
      .slice(2, 10) +
    Date.now()
      .toString(36)
      .slice(-4)
  );

}


function safeName(name) {

  const value =
    String(
      name || ''
    ).trim();

  return (
    value.slice(0, 24) ||
    'ゲスト'
  );

}


function send(ws, data) {

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


function findClient(id) {

  for (
    const entry of
    clients.entries()
  ) {

    if (
      entry[1].id === id
    ) {

      return entry[0];

    }

  }

  return null;

}


/* =====================================================
   LIVE LIST
===================================================== */

function liveList() {

  const result = [];

  liveRooms.forEach(
    function(room) {

      result.push({

        id: room.id,

        broadcasterId:
          room.broadcasterId,

        name:
          room.name,

        title:
          room.title,

        avatar:
          room.avatar,

        viewers:
          room.viewers.size,

        likes:
          room.likes,

        gifts:
          room.giftPoints,

        startedAt:
          room.startedAt

      });

    }
  );

  return result;

}


/* =====================================================
   HOME DATA
===================================================== */

function homeData() {

  return {

    type:
      'home_data',

    ranking:
      ranking,

    newcomers:
      newcomers,

    live:
      liveList()

  };

}


/* =====================================================
   ROOM STATS
===================================================== */

function roomStats(room) {

  return {

    type:
      'live_stats',

    viewers:
      room.viewers.size,

    likes:
      room.likes,

    gifts:
      room.giftPoints

  };

}


/* =====================================================
   ROOM BROADCAST
===================================================== */

function roomBroadcast(
  roomId,
  data,
  exceptWs
) {

  const room =
    liveRooms.get(roomId);

  if (!room) {
    return;
  }


  room.viewers.forEach(
    function(clientId) {

      const target =
        findClient(clientId);

      if (
        !target ||
        target === exceptWs
      ) {

        return;

      }


      const state =
        clients.get(target);


      if (
        state &&
        state.blocked &&
        data.senderId &&
        state.blocked.has(
          data.senderId
        )
      ) {

        return;

      }


      send(
        target,
        data
      );

    }
  );


  if (
    room.broadcasterId
  ) {

    const broadcaster =
      findClient(
        room.broadcasterId
      );

    if (
      broadcaster &&
      broadcaster !== exceptWs
    ) {

      const state =
        clients.get(
          broadcaster
        );

      if (
        !state ||
        !data.senderId ||
        !state.blocked.has(
          data.senderId
        )
      ) {

        send(
          broadcaster,
          data
        );

      }

    }

  }

}


/* =====================================================
   HTML
===================================================== */

const HTML = String.raw`

<!DOCTYPE html>

<html lang="ja">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<meta
  name="theme-color"
  content="#030510"
>

<title>VoiceポタLive</title>


<style>

/* =====================================================
   BASE
===================================================== */

* {

  box-sizing:
    border-box;

  -webkit-tap-highlight-color:
    transparent;

}


html,
body {

  margin:
    0;

  padding:
    0;

  width:
    100%;

  min-height:
    100%;

  background:
    #030510;

  color:
    white;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Noto Sans JP",
    "Yu Gothic",
    sans-serif;

}


body {

  overflow-x:
    hidden;

}


button,
input {

  font:
    inherit;

}


button {

  cursor:
    pointer;

}


/* =====================================================
   APP
===================================================== */

.app {

  min-height:
    100vh;

  padding-bottom:
    86px;

}


/* =====================================================
   HEADER
===================================================== */

.header {

  height:
    58px;

  position:
    fixed;

  top:
    0;

  left:
    0;

  right:
    0;

  z-index:
    100;

  display:
    flex;

  align-items:
    center;

  padding:
    0 18px;

  background:
    rgba(
      3,
      5,
      16,
      .84
    );

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid
    rgba(
      120,
      140,
      255,
      .12
    );

}


.logo {

  font-size:
    18px;

  font-weight:
    900;

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #9bd8ff,
      #c98cff
    );

  -webkit-background-clip:
    text;

  color:
    transparent;

}


/* =====================================================
   PAGE
===================================================== */

.page {

  display:
    none;

  padding-top:
    58px;

}


.page.active {

  display:
    block;

}


/* =====================================================
   HERO
   ★ 画像を切らない
===================================================== */

.hero {

  position:
    relative;

  width:
    100%;

  overflow:
    hidden;

  background:
    #030510;

}


.hero-image {

  display:
    block;

  width:
    100%;

  height:
    auto;

  max-width:
    100%;

  object-fit:
    contain;

}


.hero::after {

  content:
    "";

  position:
    absolute;

  inset:
    0;

  pointer-events:
    none;

  background:
    linear-gradient(
      0deg,
      #030510 0%,
      rgba(
        3,
        5,
        16,
        .08
      ) 48%,
      rgba(
        3,
        5,
        16,
        0
      ) 100%
    );

}


.hero-content {

  position:
    absolute;

  z-index:
    2;

  left:
    0;

  right:
    0;

  bottom:
    0;

  padding:
    90px 20px 28px;

}


.hero-small {

  font-size:
    12px;

  font-weight:
    800;

  color:
    #b7c9ff;

  text-shadow:
    0 0 12px #000;

  margin-bottom:
    8px;

}


.hero-title {

  margin:
    0;

  font-size:
    clamp(
      27px,
      8vw,
      48px
    );

  line-height:
    1.15;

  font-weight:
    900;

  text-shadow:
    0 3px 20px #000;

}


.hero-title span {

  background:
    linear-gradient(
      90deg,
      #ffffff,
      #9bdcff,
      #d68cff
    );

  -webkit-background-clip:
    text;

  color:
    transparent;

}


.hero-description {

  margin-top:
    12px;

  max-width:
    390px;

  font-size:
    12px;

  line-height:
    1.8;

  color:
    #e2e6f5;

  text-shadow:
    0 2px 12px #000;

}


/* =====================================================
   SECTION
===================================================== */

.section {

  padding:
    26px 15px 0;

}


.section-head {

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  margin-bottom:
    14px;

}


.section-title {

  font-size:
    20px;

  font-weight:
    900;

}


.section-sub {

  font-size:
    10px;

  color:
    #687394;

  letter-spacing:
    1px;

}


/* =====================================================
   横スクロール
===================================================== */

.horizontal {

  display:
    flex;

  gap:
    11px;

  overflow-x:
    auto;

  padding:
    3px 1px 10px;

  scrollbar-width:
    none;

}


.horizontal::-webkit-scrollbar {

  display:
    none;

}


/* =====================================================
   RANKING CARD
===================================================== */

.rank-card {

  flex:
    0 0 180px;

  min-height:
    190px;

  padding:
    15px;

  border-radius:
    20px;

  background:
    linear-gradient(
      145deg,
      rgba(
        25,
        32,
        75,
        .97
      ),
      rgba(
        8,
        11,
        28,
        .98
      )
    );

  border:
    1px solid
    rgba(
      120,
      140,
      255,
      .13
    );

}


.rank-top {

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

}


.rank-number {

  font-size:
    20px;

  font-weight:
    900;

  color:
    #8894b8;

}


.rank-number.top {

  color:
    #ffd76a;

  text-shadow:
    0 0 12px
    rgba(
      255,
      210,
      80,
      .5
    );

}


.rank-avatar {

  width:
    64px;

  height:
    64px;

  margin:
    10px auto;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    50%;

  font-size:
    30px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

}


.rank-name {

  font-size:
    14px;

  font-weight:
    900;

  text-align:
    center;

  white-space:
    nowrap;

  overflow:
    hidden;

  text-overflow:
    ellipsis;

}


.rank-score {

  text-align:
    center;

  margin-top:
    5px;

  font-size:
    10px;

  color:
    #8f9abd;

}


.rank-viewers {

  text-align:
    center;

  margin-top:
    5px;

  font-size:
    10px;

  color:
    #697595;

}


/* =====================================================
   NEW CARD
===================================================== */

.new-card {

  flex:
    0 0 155px;

  min-height:
    184px;

  padding:
    14px;

  border-radius:
    20px;

  background:
    linear-gradient(
      145deg,
      rgba(
        25,
        32,
        75,
        .95
      ),
      rgba(
        8,
        11,
        28,
        .98
      )
    );

  border:
    1px solid
    rgba(
      120,
      140,
      255,
      .13
    );

}


.new-avatar-wrap {

  position:
    relative;

  width:
    62px;

  height:
    62px;

  margin:
    0 auto 10px;

}


.new-avatar {

  width:
    62px;

  height:
    62px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    50%;

  font-size:
    28px;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

}


.live-dot {

  position:
    absolute;

  right:
    -1px;

  bottom:
    -1px;

  width:
    15px;

  height:
    15px;

  border-radius:
    50%;

  background:
    #ff3d6e;

  border:
    3px solid
    #11162e;

}


.new-name {

  font-size:
    14px;

  font-weight:
    900;

  text-align:
    center;

  white-space:
    nowrap;

  overflow:
    hidden;

  text-overflow:
    ellipsis;

}


.new-title {

  margin-top:
    5px;

  font-size:
    10px;

  line-height:
    1.5;

  color:
    #8f9abb;

  height:
    30px;

  overflow:
    hidden;

  text-align:
    center;

}


.badge {

  display:
    block;

  width:
    max-content;

  margin:
    8px auto 0;

  padding:
    4px 8px;

  border-radius:
    999px;

  font-size:
    8px;

  font-weight:
    900;

  background:
    linear-gradient(
      90deg,
      #ff3e72,
      #a52fff
    );

}


/* =====================================================
   MORE
===================================================== */

.more-button {

  width:
    100%;

  height:
    45px;

  margin-top:
    3px;

  border-radius:
    14px;

  border:
    1px solid
    rgba(
      120,
      140,
      255,
      .16
    );

  background:
    rgba(
      15,
      20,
      55,
      .75
    );

  color:
    #aebbe0;

  font-size:
    12px;

  font-weight:
    800;

}


/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {

  position:
    fixed;

  left:
    0;

  right:
    0;

  bottom:
    0;

  height:
    76px;

  z-index:
    200;

  display:
    grid;

  grid-template-columns:
    repeat(5, 1fr);

  padding:
    7px
    8px
    calc(
      7px +
      env(
        safe-area-inset-bottom
      )
    );

  background:
    rgba(
      4,
      7,
      20,
      .95
    );

  backdrop-filter:
    blur(20px);

  border-top:
    1px solid
    rgba(
      120,
      140,
      255,
      .12
    );

}


.nav-item {

  border:
    0;

  background:
    transparent;

  color:
    #697496;

  font-size:
    9px;

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  gap:
    4px;

}


.nav-icon {

  font-size:
    19px;

}


.live-nav {

  width:
    52px;

  height:
    52px;

  margin-top:
    -27px;

  border-radius:
    50%;

  border:
    4px solid
    #0a0e24;

  background:
    linear-gradient(
      145deg,
      #ff4c8a,
      #8d35ff
    );

  color:
    white;

  font-size:
    22px;

  box-shadow:
    0 0 25px
    rgba(
      173,
      63,
      255,
      .55
    );

}


/* =====================================================
   FULL LIST PAGE
===================================================== */

.list-page {

  padding:
    78px 15px 30px;

}


.back {

  border:
    0;

  background:
    transparent;

  color:
    #aebbe0;

  padding:
    5px 0 18px;

  font-size:
    13px;

}


.full-list {

  display:
    grid;

  gap:
    9px;

}


.full-card {

  display:
    flex;

  align-items:
    center;

  gap:
    11px;

  padding:
    12px;

  border-radius:
    17px;

  background:
    linear-gradient(
      120deg,
      rgba(
        20,
        28,
        72,
        .92
      ),
      rgba(
        8,
        12,
        32,
        .96
      )
    );

  border:
    1px solid
    rgba(
      120,
      140,
      255,
      .11
    );

}


.full-rank {

  width:
    30px;

  text-align:
    center;

  font-weight:
    900;

  color:
    #8894b8;

}


.full-avatar {

  width:
    50px;

  height:
    50px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    50%;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  font-size:
    24px;

}


.full-info {

  min-width:
    0;

  flex:
    1;

}


.full-name {

  font-weight:
    900;

  font-size:
    14px;

}


.full-meta {

  font-size:
    10px;

  color:
    #8f9abd;

  margin-top:
    4px;

}


.full-action {

  border:
    1px solid
    rgba(
      140,
      160,
      255,
      .18
    );

  border-radius:
    12px;

  background:
    #111936;

  color:
    #cbd7ff;

  padding:
    8px 10px;

  font-size:
    10px;

}


/* =====================================================
   LIVE PAGE
===================================================== */

.live-page {

  min-height:
    100vh;

  padding-top:
    58px;

  background:
    radial-gradient(
      circle at 50% 0%,
      #18275c 0%,
      #070a1d 38%,
      #030510 75%
    );

}


.live-top {

  display:
    flex;

  align-items:
    center;

  gap:
    10px;

  padding:
    12px 14px;

}


.back-live {

  border:
    0;

  background:
    transparent;

  color:
    white;

  font-size:
    28px;

}


.live-avatar {

  width:
    48px;

  height:
    48px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  background:
    radial-gradient(
      circle,
      #75d8ff,
      #3555e8 55%,
      #160d46
    );

  font-size:
    24px;

}


.live-title-wrap {

  min-width:
    0;

  flex:
    1;

}


.live-name {

  font-size:
    14px;

  font-weight:
    900;

}


.live-title {

  font-size:
    11px;

  color:
    #aebbe0;

  white-space:
    nowrap;

  overflow:
    hidden;

  text-overflow:
    ellipsis;

}


.live-status {

  font-size:
    9px;

  padding:
    5px 8px;

  border-radius:
    999px;

  background:
    #ff356d;

}


/* =====================================================
   VOICE STAGE
===================================================== */

.live-stage {

  position:
    relative;

  min-height:
    380px;

  margin:
    0 12px;

  border-radius:
    24px;

  overflow:
    hidden;

  background:
    radial-gradient(
      circle at 50% 35%,
      #293f8f 0,
      #0a1030 48%,
      #030510 100%
    );

  border:
    1px solid
    rgba(
      130,
      150,
      255,
      .12
    );

}


.voice-orb {

  position:
    absolute;

  left:
    50%;

  top:
    42%;

  transform:
    translate(
      -50%,
      -50%
    );

  width:
    150px;

  height:
    150px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  font-size:
    64px;

  background:
    radial-gradient(
      circle,
      #9de8ff 0,
      #5276ff 45%,
      #3b1c8d 70%,
      rgba(
        0,
        0,
        0,
        0
      ) 72%
    );

  box-shadow:
    0 0 65px
    rgba(
      94,
      140,
      255,
      .5
    );

  animation:
    pulse 2.2s
    ease-in-out
    infinite;

}


.voice-waves {

  position:
    absolute;

  left:
    50%;

  top:
    42%;

  transform:
    translate(
      -50%,
      -50%
    );

  width:
    270px;

  height:
    270px;

  border:
    1px solid
    rgba(
      130,
      180,
      255,
      .18
    );

  border-radius:
    50%;

  animation:
    wave 2.2s
    ease-out
    infinite;

}


@keyframes pulse {

  50% {

    transform:
      translate(
        -50%,
        -50%
      )
      scale(
        1.08
      );

  }

}


@keyframes wave {

  0% {

    transform:
      translate(
        -50%,
        -50%
      )
      scale(
        .55
      );

    opacity:
      .8;

  }

  100% {

    transform:
      translate(
        -50%,
        -50%
      )
      scale(
        1.25
      );

    opacity:
      0;

  }

}


/* =====================================================
   LIVE OVERLAY
===================================================== */

.live-overlay {

  position:
    absolute;

  left:
    0;

  right:
    0;

  bottom:
    0;

  padding:
    80px 15px 15px;

  background:
    linear-gradient(
      0deg,
      rgba(
        0,
        0,
        0,
        .8
      ),
      transparent
    );

}


.live-counters {

  display:
    flex;

  gap:
    12px;

  font-size:
    11px;

  color:
    #dce4ff;

}


/* =====================================================
   CHAT
===================================================== */

.chat {

  height:
    155px;

  overflow-y:
    auto;

  padding:
    12px 15px;

}


.chat-row {

  margin:
    6px 0;

  font-size:
    12px;

  line-height:
    1.45;

}


.chat-name {

  font-weight:
    900;

  color:
    #9fd7ff;

}


.chat-text {

  color:
    #e9edff;

}


/* =====================================================
   COMMENT
===================================================== */

.comment-box {

  display:
    flex;

  gap:
    7px;

  padding:
    0 12px 8px;

}


.comment-box input {

  min-width:
    0;

  flex:
    1;

  border:
    1px solid
    rgba(
      140,
      160,
      255,
      .15
    );

  border-radius:
    15px;

  background:
    #0e1431;

  color:
    white;

  padding:
    11px 12px;

  outline:
    none;

}


.comment-box button {

  border:
    0;

  border-radius:
    15px;

  background:
    #5674ff;

  color:
    white;

  padding:
    0 14px;

}


/* =====================================================
   CONTROLS
===================================================== */

.live-controls {

  display:
    grid;

  grid-template-columns:
    repeat(
      4,
      1fr
    );

  gap:
    8px;

  padding:
    8px 12px 20px;

}


.control {

  border:
    1px solid
    rgba(
      140,
      160,
      255,
      .15
    );

  border-radius:
    16px;

  background:
    #0e1431;

  color:
    white;

  padding:
    11px 4px;

  font-size:
    10px;

}


.control.like {

  background:
    linear-gradient(
      145deg,
      #54205e,
      #1a1740
    );

}


/* =====================================================
   GIFTS
===================================================== */

.gift-panel {

  position:
    fixed;

  left:
    12px;

  right:
    12px;

  bottom:
    92px;

  z-index:
    300;

  padding:
    14px;

  border-radius:
    20px;

  background:
    rgba(
      10,
      14,
      37,
      .97
    );

  border:
    1px solid
    rgba(
      140,
      160,
      255,
      .2
    );

  display:
    none;

}


.gift-panel.open {

  display:
    block;

}


.gift-grid {

  display:
    grid;

  grid-template-columns:
    repeat(
      4,
      1fr
    );

  gap:
    8px;

}


.gift {

  border:
    1px solid
    rgba(
      140,
      160,
      255,
      .14
    );

  background:
    #111936;

  color:
    white;

  border-radius:
    14px;

  padding:
    10px 4px;

  font-size:
    11px;

}


.gift-icon {

  display:
    block;

  font-size:
    24px;

  margin-bottom:
    4px;

}


/* =====================================================
   CUSTOM MODAL
===================================================== */

.modal {

  position:
    fixed;

  inset:
    0;

  z-index:
    400;

  background:
    rgba(
      0,
      0,
      0,
      .68
    );

  display:
    none;

  align-items:
    flex-end;

}


.modal.open {

  display:
    flex;

}


.modal-card {

  width:
    100%;

  padding:
    20px;

  border-radius:
    24px 24px 0 0;

  background:
    #0b1028;

}


.modal-title {

  font-size:
    17px;

  font-weight:
    900;

  margin-bottom:
    12px;

}


.theme-grid {

  display:
    grid;

  grid-template-columns:
    repeat(
      3,
      1fr
    );

  gap:
    8px;

}


.theme-btn {

  height:
    70px;

  border-radius:
    15px;

  border:
    1px solid
    rgba(
      150,
      170,
      255,
      .15
    );

  color:
    white;

}


.theme-btn[data-theme="blue"] {

  background:
    linear-gradient(
      145deg,
      #193c86,
      #090e28
    );

}


.theme-btn[data-theme="pink"] {

  background:
    linear-gradient(
      145deg,
      #7d245b,
      #1d102f
    );

}


.theme-btn[data-theme="moon"] {

  background:
    linear-gradient(
      145deg,
      #48338d,
      #080b22
    );

}


/* =====================================================
   TOAST
===================================================== */

.toast {

  position:
    fixed;

  left:
    50%;

  bottom:
    90px;

  transform:
    translateX(
      -50%
    );

  z-index:
    500;

  background:
    rgba(
      8,
      12,
      30,
      .96
    );

  border:
    1px solid
    rgba(
      150,
      170,
      255,
      .2
    );

  padding:
    10px 15px;

  border-radius:
    999px;

  font-size:
    11px;

  display:
    none;

}


.toast.show {

  display:
    block;

}


/* =====================================================
   DESKTOP
===================================================== */

@media (
  min-width: 700px
) {

  .hero-content {

    padding-left:
      50px;

    padding-right:
      50px;

  }

  .section {

    max-width:
      1000px;

    margin:
      auto;

  }

  .live-stage {

    max-width:
      700px;

    margin:
      auto;

  }

}

</style>

</head>


<body>


<div class="app">


<header class="header">

  <div class="logo">
    VoiceポタLive
  </div>

</header>


<!-- =================================================
     HOME
================================================= -->

<main
  id="homePage"
  class="page active"
>


<section class="hero">


  <!--
    ★ background-imageではなくimg
    → 元画像全体を表示
    → 上下左右を切らない
  -->

  <img
    class="hero-image"
    src="/home.png"
    alt="VoiceポタLive"
  >


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

      VoiceポタLiveで、あなたの声をもっと近くに。

    </div>

  </div>

</section>


<!-- =================================================
     人気
================================================= -->

<section class="section">


  <div class="section-head">

    <div class="section-title">
      🏆 人気ライバー
    </div>

    <div class="section-sub">
      TOP 50
    </div>

  </div>


  <div
    id="rankingList"
    class="horizontal"
  ></div>


  <button
    class="more-button"
    onclick="showRankingPage()"
  >

    人気トップ50をすべて見る

  </button>


</section>


<!-- =================================================
     新人
================================================= -->

<section class="section">


  <div class="section-head">

    <div class="section-title">
      🌱 新人ライバー
    </div>

    <div class="section-sub">
      人気順
    </div>

  </div>


  <div
    id="newcomerList"
    class="horizontal"
  ></div>


  <button
    class="more-button"
    onclick="showNewcomerPage()"
  >

    新人ライバーをすべて見る

  </button>


</section>


<!-- =================================================
     LIVE一覧
================================================= -->

<section class="section">


  <div class="section-head">

    <div class="section-title">
      🔴 配信中
    </div>

    <div class="section-sub">
      LIVE
    </div>

  </div>


  <div
    id="liveList"
    class="horizontal"
  ></div>


</section>


</main>


<!-- =================================================
     RANKING PAGE
================================================= -->

<section
  id="rankingPage"
  class="page"
  style="
    padding:
      78px 15px 30px;
  "
>


<button
  class="back"
  onclick="goHome()"
>

  ← ホームへ戻る

</button>


<div class="section-head">

  <div class="section-title">
    🏆 人気トップ50
  </div>

  <div class="section-sub">
    人気順
  </div>

</div>


<div
  id="rankingFull"
  class="full-list"
></div>


</section>


<!-- =================================================
     NEWCOMER PAGE
================================================= -->

<section
  id="newcomerPage"
  class="page"
  style="
    padding:
      78px 15px 30px;
  "
>


<button
  class="back"
  onclick="goHome()"
>

  ← ホームへ戻る

</button>


<div class="section-head">

  <div class="section-title">
    🌱 新人ライバー
  </div>

  <div class="section-sub">
    人気順
  </div>

</div>


<div
  id="newcomerFull"
  class="full-list"
></div>


</section>


<!-- =================================================
     LIVE PAGE
================================================= -->

<section
  id="livePage"
  class="page live-page"
>


<div class="live-top">


<button
  class="back-live"
  onclick="leaveLive()"
>

  ‹

</button>


<div
  id="liveAvatar"
  class="live-avatar"
>

  🌙

</div>


<div class="live-title-wrap">

  <div
    id="liveName"
    class="live-name"
  >
    配信
  </div>


  <div
    id="liveTitle"
    class="live-title"
  >
    VoiceポタLive
  </div>

</div>


<div class="live-status">
  LIVE
</div>


</div>


<div
  class="live-stage"
  id="liveStage"
>


<div class="voice-waves"></div>


<div
  id="voiceOrb"
  class="voice-orb"
>

  🎙️

</div>


<div class="live-overlay">


<div class="live-counters">

  <span>
    👁
    <b id="viewerCount">
      0
    </b>
  </span>


  <span>
    ♥
    <b id="likeCount">
      0
    </b>
  </span>


  <span>
    🎁
    <b id="giftCount">
      0
    </b>
  </span>

</div>


</div>


</div>


<div
  id="chat"
  class="chat"
></div>


<div class="comment-box">


<input
  id="commentInput"
  maxlength="120"
  placeholder="コメントする…"
>


<button
  onclick="sendComment()"
>

  送信

</button>


</div>


<div class="live-controls">


<button
  class="control like"
  onclick="sendLike()"
>

  ♥ いいね

</button>


<button
  class="control"
  onclick="toggleGift()"
>

  🎁 ギフト

</button>


<button
  class="control"
  onclick="openLiveSettings()"
>

  🎨 カスタム

</button>


<button
  class="control"
  onclick="blockCurrent()"
>

  🚫 ブロック

</button>


</div>


</section>


<!-- =================================================
     PROFILE
================================================= -->

<section
  id="profilePage"
  class="page"
  style="
    padding:
      78px 15px 30px;
  "
>


<div class="section-title">

  👤 マイページ

</div>


<div
  class="section"
  style="
    padding-left:0;
    padding-right:0;
  "
>


<div class="full-card">


<div class="full-avatar">
  🌙
</div>


<div class="full-info">

<div class="full-name">
  ぼた
</div>


<div class="full-meta">
  VoiceポタLive
</div>


</div>


</div>


<button
  class="more-button"
  onclick="startLive()"
>

  🎙️ 配信する

</button>


</div>


</section>


<!-- =================================================
     GIFT
================================================= -->

<div
  id="giftPanel"
  class="gift-panel"
>


<div class="modal-title">
  🎁 ギフトを送る
</div>


<div
  id="giftGrid"
  class="gift-grid"
></div>


</div>


<!-- =================================================
     CUSTOM
================================================= -->

<div
  id="settingsModal"
  class="modal"
  onclick="closeSettings(event)"
>


<div class="modal-card">


<div class="modal-title">
  🎨 配信画面カスタム
</div>


<div class="theme-grid">


<button
  class="theme-btn"
  data-theme="blue"
  onclick="setTheme('blue')"
>

  🌌 ブルー

</button>


<button
  class="theme-btn"
  data-theme="pink"
  onclick="setTheme('pink')"
>

  🌸 ピンク

</button>


<button
  class="theme-btn"
  data-theme="moon"
  onclick="setTheme('moon')"
>

  🌙 月夜

</button>


</div>


<button
  class="more-button"
  onclick="closeSettings()"
>

  閉じる

</button>


</div>

</div>


<div
  id="toast"
  class="toast"
></div>


</div>


<!-- =================================================
     BOTTOM NAV
================================================= -->

<nav class="bottom-nav">


<button
  class="nav-item"
  onclick="goHome()"
>

  <div class="nav-icon">
    ⌂
  </div>

  ホーム

</button>


<button
  class="nav-item"
  onclick="showSearch()"
>

  <div class="nav-icon">
    ⌕
  </div>

  探す

</button>


<button
  class="nav-item"
  onclick="startLive()"
>

  <div class="live-nav">
    🎙️
  </div>

  <span
    style="
      margin-top:-5px;
    "
  >
    配信する
  </span>

</button>


<button
  class="nav-item"
  onclick="showNotice()"
>

  <div class="nav-icon">
    ♧
  </div>

  お知らせ

</button>


<button
  class="nav-item"
  onclick="showProfile()"
>

  <div class="nav-icon">
    ♙
  </div>

  マイページ

</button>


</nav>


<script>

/* =====================================================
   CLIENT STATE
===================================================== */

var socket =
  null;

var myId =
  '';

var myName =
  'ぼた';

var currentRoom =
  null;

var currentLive =
  null;

var isBroadcaster =
  false;

var peers =
  {};

var blockedUsers =
  JSON.parse(
    localStorage.getItem(
      'bota_blocked'
    ) || '[]'
  );

var lastLikeAt =
  0;

var state = {

  ranking: [],

  newcomers: [],

  live: []

};


/* =====================================================
   ESCAPE
===================================================== */

function esc(value) {

  return String(
    value == null
      ? ''
      : value
  )

  .replace(
    /&/g,
    '&amp;'
  )

  .replace(
    /</g,
    '&lt;'
  )

  .replace(
    />/g,
    '&gt;'
  )

  .replace(
    /"/g,
    '&quot;'
  )

  .replace(
    /'/g,
    '&#039;'
  );

}


/* =====================================================
   SOCKET CONNECT
===================================================== */

function connectSocket() {

  var protocol =
    location.protocol ===
    'https:'
      ? 'wss:'
      : 'ws:';


  socket =
    new WebSocket(
      protocol +
      '//' +
      location.host
    );


  socket.onopen =
    function() {

      send({
        type:
          'home_request'
      });

    };


  socket.onmessage =
    function(event) {

      var data;

      try {

        data =
          JSON.parse(
            event.data
          );

      } catch (e) {

        return;

      }


      /* =========================
         WELCOME
      ========================= */

      if (
        data.type ===
        'welcome'
      ) {

        myId =
          data.id;

        return;

      }


      /* =========================
         HOME
      ========================= */

      if (
        data.type ===
        'home_data'
      ) {

        state =
          data;

        renderHome();

        return;

      }


      /* =========================
         LIVE START
      ========================= */

      if (
        data.type ===
        'live_started'
      ) {

        currentRoom =
          data.roomId;

        currentLive =
          data.live;

        isBroadcaster =
          true;

        showLivePage();

        startMicrophone();

        toast(
          '配信を開始しました'
        );

        return;

      }


      /* =========================
         ROOM INFO
      ========================= */

      if (
        data.type ===
        'room_info'
      ) {

        currentRoom =
          data.roomId;

        currentLive =
          data.live;

        isBroadcaster =
          false;

        showLivePage();

        setLiveInfo(
          data.live
        );

        return;

      }


      /* =========================
         VIEWER JOIN
      ========================= */

      if (
        data.type ===
        'viewer_joined'
      ) {

        if (
          isBroadcaster
        ) {

          createBroadcasterPeer(
            data.viewerId
          );

        }

        return;

      }


      /* =========================
         SIGNAL
      ========================= */

      if (
        data.type ===
        'signal'
      ) {

        handleSignal(
          data
        );

        return;

      }


      /* =========================
         CHAT
      ========================= */

      if (
        data.type ===
        'chat'
      ) {

        if (
          blockedUsers.indexOf(
            data.senderId
          ) === -1
        ) {

          addChat(
            data.name,
            data.text,
            data.senderId
          );

        }

        return;

      }


      /* =========================
         STATS
      ========================= */

      if (
        data.type ===
        'live_stats'
      ) {

        document
          .getElementById(
            'viewerCount'
          )
          .textContent =
            data.viewers;


        document
          .getElementById(
            'likeCount'
          )
          .textContent =
            data.likes;


        document
          .getElementById(
            'giftCount'
          )
          .textContent =
            data.gifts;


        return;

      }


      /* =========================
         GIFT
      ========================= */

      if (
        data.type ===
        'gift'
      ) {

        if (
          blockedUsers.indexOf(
            data.senderId
          ) === -1
        ) {

          addChat(
            '🎁 ' +
            data.name,
            data.giftIcon +
            ' ' +
            data.giftName,
            data.senderId
          );

          toast(
            data.giftIcon +
            ' ' +
            data.giftName +
            ' が届きました！'
          );

        }

        return;

      }


      /* =========================
         BLOCK
      ========================= */

      if (
        data.type ===
        'blocked'
      ) {

        if (
          blockedUsers.indexOf(
            data.targetId
          ) === -1
        ) {

          blockedUsers.push(
            data.targetId
          );

        }


        localStorage.setItem(
          'bota_blocked',
          JSON.stringify(
            blockedUsers
          )
        );

        toast(
          'ブロックしました'
        );

        return;

      }


      /* =========================
         LIVE END
      ========================= */

      if (
        data.type ===
        'live_ended'
      ) {

        cleanupPeers();

        currentRoom =
          null;

        currentLive =
          null;

        isBroadcaster =
          false;

        stopMicrophone();

        goHome();

        toast(
          '配信が終了しました'
        );

        return;

      }


      /* =========================
         ERROR
      ========================= */

      if (
        data.type ===
        'error'
      ) {

        toast(
          data.message ||
          'エラーが発生しました'
        );

      }

    };


  socket.onclose =
    function() {

      setTimeout(
        connectSocket,
        1500
      );

    };

}


function send(data) {

  if (
    socket &&
    socket.readyState ===
    WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(
        data
      )
    );

  }

}


/* =====================================================
   HOME RENDER
===================================================== */

function renderHome() {


  /* =========================
     RANKING 10
  ========================= */

  var rankingBox =
    document.getElementById(
      'rankingList'
    );


  rankingBox.innerHTML =
    state.ranking
      .slice(0, 10)
      .map(
        function(user) {

          return (

            '<div ' +
            'class="rank-card" ' +
            'onclick="openUser(\\'' +
            esc(user.id) +
            '\\')">' +

            '<div class="rank-top">' +

            '<div class="rank-number ' +
            (
              user.rank <= 3
                ? 'top'
                : ''
            ) +
            '">' +

            user.rank +

            '</div>' +

            '<div>' +
            '👁 ' +
            Number(
              user.viewers
            ).toLocaleString() +
            '</div>' +

            '</div>' +

            '<div class="rank-avatar">' +
            esc(user.icon) +
            '</div>' +

            '<div class="rank-name">' +
            esc(user.name) +
            '</div>' +

            '<div class="rank-score">' +
            '応援ポイント ' +
            Number(
              user.score
            ).toLocaleString() +
            '</div>' +

            '</div>'

          );

        }
      )
      .join('');


  /* =========================
     NEWCOMERS
  ========================= */

  var newcomerBox =
    document.getElementById(
      'newcomerList'
    );


  newcomerBox.innerHTML =
    state.newcomers
      .slice(0, 10)
      .map(
        function(user) {

          return (

            '<div ' +
            'class="new-card" ' +
            'onclick="openUser(\\'' +
            esc(user.id) +
            '\\')">' +

            '<div class="new-avatar-wrap">' +

            '<div class="new-avatar">' +
            esc(user.icon) +
            '</div>' +

            (
              user.live
                ? '<div class="live-dot"></div>'
                : ''
            ) +

            '</div>' +

            '<div class="new-name">' +
            esc(user.name) +
            '</div>' +

            '<div class="new-title">' +
            esc(user.title) +
            '</div>' +

            '<span class="badge">' +

            (
              user.live
                ? 'LIVE'
                : '新人'
            ) +

            '</span>' +

            '</div>'

          );

        }
      )
      .join('');


  /* =========================
     LIVE
  ========================= */

  var liveBox =
    document.getElementById(
      'liveList'
    );


  if (
    !state.live.length
  ) {

    liveBox.innerHTML =
      '<div class="empty">' +
      '現在配信中のライバーはいません' +
      '</div>';

  } else {

    liveBox.innerHTML =
      state.live
        .map(
          function(user) {

            return (

              '<div ' +
              'class="new-card" ' +
              'onclick="joinLive(\\'' +
              esc(user.id) +
              '\\')">' +

              '<div class="new-avatar-wrap">' +

              '<div class="new-avatar">' +
              esc(
                user.avatar ||
                '🎙️'
              ) +
              '</div>' +

              '<div class="live-dot"></div>' +

              '</div>' +

              '<div class="new-name">' +
              esc(user.name) +
              '</div>' +

              '<div class="new-title">' +
              esc(user.title) +
              '</div>' +

              '<span class="badge">' +
              'LIVE ' +
              Number(
                user.viewers
              ) +
              '</span>' +

              '</div>'

            );

          }
        )
        .join('');

  }


  /* =========================
     FULL RANKING
  ========================= */

  document.getElementById(
    'rankingFull'
  ).innerHTML =
    state.ranking
      .map(
        function(user) {

          return (

            '<div class="full-card">' +

            '<div class="full-rank">' +
            user.rank +
            '</div>' +

            '<div class="full-avatar">' +
            esc(user.icon) +
            '</div>' +

            '<div class="full-info">' +

            '<div class="full-name">' +
            esc(user.name) +
            '</div>' +

            '<div class="full-meta">' +
            '応援 ' +
            Number(
              user.score
            ).toLocaleString() +
            '　👁 ' +
            Number(
              user.viewers
            ).toLocaleString() +
            '</div>' +

            '</div>' +

            '<button ' +
            'class="full-action" ' +
            'onclick="openUser(\\'' +
            esc(user.id) +
            '\\')">' +
            '見る' +
            '</button>' +

            '</div>'

          );

        }
      )
      .join('');


  /* =========================
     FULL NEWCOMERS
  ========================= */

  document.getElementById(
    'newcomerFull'
  ).innerHTML =
    state.newcomers
      .map(
        function(user) {

          return (

            '<div class="full-card">' +

            '<div class="full-avatar">' +
            esc(user.icon) +
            '</div>' +

            '<div class="full-info">' +

            '<div class="full-name">' +
            esc(user.name) +
            '</div>' +

            '<div class="full-meta">' +
            esc(user.title) +
            '　人気 ' +
            user.popularity +
            '</div>' +

            '</div>' +

            '<button ' +
            'class="full-action" ' +
            'onclick="openUser(\\'' +
            esc(user.id) +
            '\\')">' +
            '見る' +
            '</button>' +

            '</div>'

          );

        }
      )
      .join('');

}


/* =====================================================
   PAGE
===================================================== */

function hidePages() {

  document
    .querySelectorAll(
      '.page'
    )
    .forEach(
      function(page) {

        page.classList.remove(
          'active'
        );

      }
    );

}


function goHome() {

  hidePages();

  document
    .getElementById(
      'homePage'
    )
    .classList.add(
      'active'
    );

  window.scrollTo(
    0,
    0
  );

}


function showRankingPage() {

  hidePages();

  document
    .getElementById(
      'rankingPage'
    )
    .classList.add(
      'active'
    );

  window.scrollTo(
    0,
    0
  );

}


function showNewcomerPage() {

  hidePages();

  document
    .getElementById(
      'newcomerPage'
    )
    .classList.add(
      'active'
    );

  window.scrollTo(
    0,
    0
  );

}


function showProfile() {

  hidePages();

  document
    .getElementById(
      'profilePage'
    )
    .classList.add(
      'active'
    );

}


/* =====================================================
   USER
===================================================== */

function openUser(id) {

  var live =
    state.live.find(
      function(room) {

        return (
          room.broadcasterId ===
          id ||
          room.id ===
          id
        );

      }
    );


  if (live) {

    joinLive(
      live.id
    );

  } else {

    toast(
      'このライバーは現在配信していません'
    );

  }

}


/* =====================================================
   LIVE JOIN
===================================================== */

function joinLive(roomId) {

  var room =
    state.live.find(
      function(item) {

        return (
          item.id ===
          roomId
        );

      }
    );


  if (!room) {

    toast(
      '配信が見つかりません'
    );

    return;

  }


  send({

    type:
      'join_live',

    roomId:
      roomId

  });

}


/* =====================================================
   START LIVE
===================================================== */

function startLive() {

  send({

    type:
      'start_live',

    name:
      myName,

    title:
      '月明かりの雑談🌙',

    avatar:
      '🌙'

  });

}


/* =====================================================
   SHOW LIVE
===================================================== */

function showLivePage() {

  hidePages();

  document
    .getElementById(
      'livePage'
    )
    .classList.add(
      'active'
    );

  window.scrollTo(
    0,
    0
  );


  if (
    currentLive
  ) {

    setLiveInfo(
      currentLive
    );

  }

}


function setLiveInfo(
  live
) {

  document
    .getElementById(
      'liveName'
    )
    .textContent =
      live.name ||
      '配信者';


  document
    .getElementById(
      'liveTitle'
    )
    .textContent =
      live.title ||
      'VoiceポタLive';


  document
    .getElementById(
      'liveAvatar'
    )
    .textContent =
      live.avatar ||
      '🎙️';

}


/* =====================================================
   MICROPHONE
===================================================== */

async function startMicrophone() {

  if (
    window.__localStream
  ) {

    return;

  }


  try {

    window.__localStream =
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


  } catch (error) {

    toast(
      'マイクを使用できません'
    );

  }

}


function stopMicrophone() {

  if (
    window.__localStream
  ) {

    window.__localStream
      .getTracks()
      .forEach(
        function(track) {

          track.stop();

        }
      );

    window.__localStream =
      null;

  }

}


/* =====================================================
   LEAVE LIVE
===================================================== */

function leaveLive() {

  if (
    !currentRoom
  ) {

    goHome();

    return;

  }


  if (
    isBroadcaster
  ) {

    if (
      confirm(
        '配信を終了しますか？'
      )
    ) {

      send({

        type:
          'end_live',

        roomId:
          currentRoom

      });

    }

    return;

  }


  send({

    type:
      'leave_live',

    roomId:
      currentRoom

  });


  cleanupPeers();

  currentRoom =
    null;

  currentLive =
    null;

  isBroadcaster =
    false;

  goHome();

}


/* =====================================================
   WEBRTC
===================================================== */

var rtcConfig = {

  iceServers: [

    {
      urls:
        'stun:stun.l.google.com:19302'
    },

    {
      urls:
        'stun:stun1.l.google.com:19302'
    }

  ]

};


/* =====================================================
   BROADCASTER
===================================================== */

async function createBroadcasterPeer(
  viewerId
) {

  if (
    !currentRoom ||
    !isBroadcaster
  ) {

    return;

  }


  try {

    await startMicrophone();


    var pc =
      new RTCPeerConnection(
        rtcConfig
      );


    peers[
      viewerId
    ] =
      pc;


    window.__localStream
      .getTracks()
      .forEach(
        function(track) {

          pc.addTrack(
            track,
            window.__localStream
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
              'signal',

            to:
              viewerId,

            data: {

              type:
                'ice',

              candidate:
                event.candidate

            }

          });

        }

      };


    pc.onconnectionstatechange =
      function() {

        if (
          pc.connectionState ===
          'failed' ||
          pc.connectionState ===
          'closed'
        ) {

          try {

            pc.close();

          } catch (e) {}

          delete peers[
            viewerId
          ];

        }

      };


    var offer =
      await pc.createOffer();


    await pc.setLocalDescription(
      offer
    );


    send({

      type:
        'signal',

      to:
        viewerId,

      data: {

        type:
          'offer',

        sdp:
          pc.localDescription

      }

    });


  } catch (error) {

    toast(
      '音声配信を開始できません'
    );

  }

}


/* =====================================================
   SIGNAL
===================================================== */

async function handleSignal(
  message
) {

  var data =
    message.data;


  if (!data) {

    return;

  }


  /* =========================
     VIEWER OFFER
  ========================= */

  if (
    data.type ===
    'offer' &&
    !isBroadcaster
  ) {

    try {

      var pc =
        new RTCPeerConnection(
          rtcConfig
        );


      peers[
        message.from
      ] =
        pc;


      pc.ontrack =
        function(event) {

          var stream =
            event.streams &&
            event.streams[0];


          if (!stream) {

            return;

          }


          var audio =
            document.getElementById(
              'liveAudio'
            );


          if (!audio) {

            audio =
              document.createElement(
                'audio'
              );

            audio.id =
              'liveAudio';

            audio.autoplay =
              true;

            audio.playsInline =
              true;

            document.body
              .appendChild(
                audio
              );

          }


          audio.srcObject =
            stream;


          audio.play()
            .catch(
              function() {}
            );

        };


      pc.onicecandidate =
        function(event) {

          if (
            event.candidate
          ) {

            send({

              type:
                'signal',

              to:
                message.from,

              data: {

                type:
                  'ice',

                candidate:
                  event.candidate

              }

            });

          }

        };


      await pc.setRemoteDescription(
        new RTCSessionDescription(
          data.sdp
        )
      );


      var answer =
        await pc.createAnswer();


      await pc.setLocalDescription(
        answer
      );


      send({

        type:
          'signal',

        to:
          message.from,

        data: {

          type:
            'answer',

          sdp:
            pc.localDescription

        }

      });


    } catch (error) {

      toast(
        '音声接続エラー'
      );

    }


    return;

  }


  /* =========================
     ANSWER / ICE
  ========================= */

  var pc =
    peers[
      message.from
    ];


  if (!pc) {

    return;

  }


  if (
    data.type ===
    'answer'
  ) {

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.sdp
      )
    );

  }


  else if (
    data.type ===
    'ice' &&
    data.candidate
  ) {

    try {

      await pc.addIceCandidate(
        new RTCIceCandidate(
          data.candidate
        )
      );

    } catch (e) {}

  }

}


/* =====================================================
   CLEANUP
===================================================== */

function cleanupPeers() {

  Object.keys(
    peers
  ).forEach(
    function(id) {

      try {

        peers[id].close();

      } catch (e) {}

    }
  );


  peers =
    {};

}


/* =====================================================
   CHAT
===================================================== */

function addChat(
  name,
  text,
  senderId
) {

  var box =
    document.getElementById(
      'chat'
    );


  var row =
    document.createElement(
      'div'
    );


  row.className =
    'chat-row';


  row.innerHTML =

    '<span ' +
    'class="chat-name">' +

    esc(name) +

    '</span> ' +

    '<span ' +
    'class="chat-text">' +

    esc(text) +

    '</span>';


  if (
    senderId &&
    senderId !== myId
  ) {

    row.onclick =
      function() {

        if (
          confirm(
            name +
            ' さんをブロックしますか？'
          )
        ) {

          blockUser(
            senderId
          );

        }

      };

  }


  box.appendChild(
    row
  );


  box.scrollTop =
    box.scrollHeight;

}


/* =====================================================
   COMMENT
===================================================== */

function sendComment() {

  var input =
    document.getElementById(
      'commentInput'
    );


  var text =
    input.value.trim();


  if (
    !text ||
    !currentRoom
  ) {

    return;

  }


  send({

    type:
      'chat',

    roomId:
      currentRoom,

    text:
      text,

    name:
      myName

  });


  input.value =
    '';

}


/* =====================================================
   LIKE
===================================================== */

function sendLike() {

  var now =
    Date.now();


  if (
    now -
    lastLikeAt <
    250
  ) {

    return;

  }


  lastLikeAt =
    now;


  send({

    type:
      'like',

    roomId:
      currentRoom

  });

}


/* =====================================================
   GIFTS
===================================================== */

function toggleGift() {

  var panel =
    document.getElementById(
      'giftPanel'
    );


  panel.classList.toggle(
    'open'
  );


  renderGifts();

}


function renderGifts() {

  var items = [

    [
      'star',
      '⭐',
      'スター'
    ],

    [
      'flower',
      '🌸',
      '月光花'
    ],

    [
      'heart',
      '💖',
      'ハート'
    ],

    [
      'moon',
      '🌙',
      '月のかけら'
    ]

  ];


  document
    .getElementById(
      'giftGrid'
    )
    .innerHTML =

    items
      .map(
        function(item) {

          return (

            '<button ' +
            'class="gift" ' +
            'onclick="sendGift(\\'' +
            item[0] +
            '\\')">' +

            '<span ' +
            'class="gift-icon">' +

            item[1] +

            '</span>' +

            item[2] +

            '</button>'

          );

        }
      )
      .join('');

}


function sendGift(
  key
) {

  if (
    !currentRoom
  ) {

    return;

  }


  send({

    type:
      'gift',

    roomId:
      currentRoom,

    gift:
      key

  });


  document
    .getElementById(
      'giftPanel'
    )
    .classList.remove(
      'open'
    );

}


/* =====================================================
   BLOCK
===================================================== */

function blockUser(
  id
) {

  if (
    !id ||
    id === myId
  ) {

    return;

  }


  if (
    blockedUsers.indexOf(
      id
    ) === -1
  ) {

    blockedUsers.push(
      id
    );

  }


  localStorage.setItem(
    'bota_blocked',
    JSON.stringify(
      blockedUsers
    )
  );


  send({

    type:
      'block',

    targetId:
      id

  });


  toast(
    'ブロックしました'
  );

}


function blockCurrent() {

  if (
    !currentLive ||
    !currentLive.broadcasterId
  ) {

    return;

  }


  blockUser(
    currentLive.broadcasterId
  );


  setTimeout(
    function() {

      leaveLive();

    },
    500
  );

}


/* =====================================================
   CUSTOM LIVE
===================================================== */

function openLiveSettings() {

  document
    .getElementById(
      'settingsModal'
    )
    .classList.add(
      'open'
    );

}


function closeSettings(
  event
) {

  if (
    !event ||
    event.target.id ===
      'settingsModal'
  ) {

    document
      .getElementById(
        'settingsModal'
      )
      .classList.remove(
        'open'
      );

  }

}


function setTheme(
  theme
) {

  var stage =
    document.querySelector(
      '.live-stage'
    );


  if (
    theme ===
    'pink'
  ) {

    stage.style.background =
      'radial-gradient(circle at 50% 35%,#8b316d 0,#28102e 48%,#030510 100%)';

  }


  else if (
    theme ===
    'moon'
  ) {

    stage.style.background =
      'radial-gradient(circle at 50% 35%,#51439b 0,#15102e 48%,#030510 100%)';

  }


  else {

    stage.style.background =
      'radial-gradient(circle at 50% 35%,#293f8f 0,#0a1030 48%,#030510 100%)';

  }


  document
    .getElementById(
      'settingsModal'
    )
    .classList.remove(
      'open'
    );

}


/* =====================================================
   OTHER
===================================================== */

function showSearch() {

  toast(
    '配信検索を準備中です'
  );

}


function showNotice() {

  toast(
    'お知らせはまだありません'
  );

}


function toast(
  text
) {

  var box =
    document.getElementById(
      'toast'
    );


  box.textContent =
    text;


  box.classList.add(
    'show'
  );


  clearTimeout(
    window.__toastTimer
  );


  window.__toastTimer =
    setTimeout(
      function() {

        box.classList.remove(
          'show'
        );

      },
      1800
    );

}


/* =====================================================
   ENTER COMMENT
===================================================== */

document
  .getElementById(
    'commentInput'
  )
  .addEventListener(
    'keydown',
    function(event) {

      if (
        event.key ===
        'Enter'
      ) {

        sendComment();

      }

    }
  );


/* =====================================================
   BEFORE UNLOAD
===================================================== */

window.addEventListener(
  'beforeunload',
  function() {

    if (
      isBroadcaster &&
      currentRoom
    ) {

      send({

        type:
          'end_live',

        roomId:
          currentRoom

      });

    }

  }
);


/* =====================================================
   START
===================================================== */

connectSocket();

</script>

</body>

</html>

`;


/* =====================================================
   HTTP SERVER
===================================================== */

const server =
  http.createServer(
    function(req, res) {

      const url =
        new URL(
          req.url,
          'http://' +
          (
            req.headers.host ||
            'localhost'
          )
        );


      /* =========================
         HOME
      ========================= */

      if (
        url.pathname === '/' ||
        url.pathname === '/index.html'
      ) {

        res.writeHead(
          200,
          {

            'Content-Type':
              'text/html; charset=utf-8',

            'Cache-Control':
              'no-cache, no-store, must-revalidate'

          }
        );


        res.end(
          HTML
        );


        return;

      }


      /* =========================
         HOME IMAGE
      ========================= */

      if (
        url.pathname ===
        '/home.png'
      ) {

        const imagePath =
          path.join(
            PUBLIC_DIR,
            'home.png'
          );


        if (
          !fs.existsSync(
            imagePath
          )
        ) {

          res.writeHead(
            404,
            {

              'Content-Type':
                'text/plain; charset=utf-8'

            }
          );


          res.end(
            'public/home.png がありません'
          );


          return;

        }


        res.writeHead(
          200,
          {

            'Content-Type':
              'image/png',

            'Cache-Control':
              'public, max-age=3600'

          }
        );


        fs
          .createReadStream(
            imagePath
          )
          .pipe(
            res
          );


        return;

      }


      /* =========================
         NOT FOUND
      ========================= */

      res.writeHead(
        404,
        {

          'Content-Type':
            'text/plain; charset=utf-8'

        }
      );


      res.end(
        'Not Found'
      );

    }
  );


/* =====================================================
   WEBSOCKET
===================================================== */

const wss =
  new WebSocket.Server({
    server:
      server
  });


wss.on(
  'connection',
  function(ws) {

    const id =
      uid('user');


    clients.set(
      ws,
      {

        id:
          id,

        name:
          'ゲスト',

        role:
          'idle',

        roomId:
          null,

        blocked:
          new Set(),

        lastLike:
          0

      }
    );


    send(
      ws,
      {

        type:
          'welcome',

        id:
          id

      }
    );


    ws.on(
      'message',
      function(raw) {

        let data;


        try {

          data =
            JSON.parse(
              raw.toString()
            );

        } catch (error) {

          send(
            ws,
            {

              type:
                'error',

              message:
                '不正なメッセージです'

            }
          );

          return;

        }


        const state =
          clients.get(
            ws
          );


        if (!state) {

          return;

        }


        /* =========================
           HOME
        ========================= */

        if (
          data.type ===
          'home_request'
        ) {

          send(
            ws,
            homeData()
          );

          return;

        }


        /* =========================
           START LIVE
        ========================= */

        if (
          data.type ===
          'start_live'
        ) {

          if (
            state.role ===
            'broadcaster'
          ) {

            return;

          }


          const roomId =
            uid('room');


          const room = {

            id:
              roomId,

            broadcasterId:
              state.id,

            name:
              safeName(
                data.name
              ),

            title:
              String(
                data.title ||
                'VoiceポタLive'
              ).slice(
                0,
                60
              ),

            avatar:
              String(
                data.avatar ||
                '🎙️'
              ).slice(
                0,
                4
              ),

            viewers:
              new Set(),

            likes:
              0,

            giftPoints:
              0,

            startedAt:
              Date.now()

          };


          state.name =
            room.name;

          state.role =
            'broadcaster';

          state.roomId =
            roomId;


          liveRooms.set(
            roomId,
            room
          );


          send(
            ws,
            {

              type:
                'live_started',

              roomId:
                roomId,

              live: {

                id:
                  roomId,

                broadcasterId:
                  room.broadcasterId,

                name:
                  room.name,

                title:
                  room.title,

                avatar:
                  room.avatar,

                viewers:
                  0,

                likes:
                  0,

                gifts:
                  0

              }

            }
          );


          broadcastHome();


          console.log(
            'LIVE START:',
            roomId
          );


          return;

        }


        /* =========================
           JOIN LIVE
        ========================= */

        if (
          data.type ===
          'join_live'
        ) {

          const room =
            liveRooms.get(
              data.roomId
            );


          if (!room) {

            send(
              ws,
              {

                type:
                  'error',

                message:
                  '配信は終了しています'

              }
            );

            return;

          }


          state.name =
            safeName(
              data.name ||
              state.name
            );

          state.role =
            'viewer';

          state.roomId =
            room.id;


          room.viewers.add(
            state.id
          );


          send(
            ws,
            {

              type:
                'room_info',

              roomId:
                room.id,

              live: {

                id:
                  room.id,

                broadcasterId:
                  room.broadcasterId,

                name:
                  room.name,

                title:
                  room.title,

                avatar:
                  room.avatar,

                viewers:
                  room.viewers.size,

                likes:
                  room.likes,

                gifts:
                  room.giftPoints

              }

            }
          );


          const broadcaster =
            findClient(
              room.broadcasterId
            );


          if (
            broadcaster
          ) {

            send(
              broadcaster,
              {

                type:
                  'viewer_joined',

                viewerId:
                  state.id

              }
            );

          }


          roomBroadcast(
            room.id,
            roomStats(
              room
            )
          );


          return;

        }


        /* =========================
           LEAVE
        ========================= */

        if (
          data.type ===
          'leave_live'
        ) {

          leaveRoom(
            ws
          );

          return;

        }


        /* =========================
           END
        ========================= */

        if (
          data.type ===
          'end_live'
        ) {

          if (
            state.role !==
              'broadcaster' ||
            state.roomId !==
              data.roomId
          ) {

            return;

          }


          endRoom(
            data.roomId
          );


          return;

        }


        /* =========================
           SIGNAL
        ========================= */

        if (
          data.type ===
          'signal'
        ) {

          const target =
            findClient(
              data.to
            );


          if (!target) {

            return;

          }


          send(
            target,
            {

              type:
                'signal',

              from:
                state.id,

              data:
                data.data

            }
          );


          return;

        }


        /* =========================
           CHAT
        ========================= */

        if (
          data.type ===
          'chat'
        ) {

          const room =
            liveRooms.get(
              state.roomId
            );


          if (
            !room ||
            !data.text
          ) {

            return;

          }


          const text =
            String(
              data.text
            )
            .trim()
            .slice(
              0,
              120
            );


          if (!text) {

            return;

          }


          roomBroadcast(
            room.id,
            {

              type:
                'chat',

              senderId:
                state.id,

              name:
                safeName(
                  state.name
                ),

              text:
                text

            }
          );


          return;

        }


        /* =========================
           LIKE
        ========================= */

        if (
          data.type ===
          'like'
        ) {

          const room =
            liveRooms.get(
              state.roomId
            );


          if (!room) {

            return;

          }


          const now =
            Date.now();


          if (
            now -
            state.lastLike <
            250
          ) {

            return;

          }


          state.lastLike =
            now;


          room.likes +=
            1;


          roomBroadcast(
            room.id,
            roomStats(
              room
            )
          );


          return;

        }


        /* =========================
           GIFT
        ========================= */

        if (
          data.type ===
          'gift'
        ) {

          const room =
            liveRooms.get(
              state.roomId
            );


          const gift =
            gifts[
              data.gift
            ];


          if (
            !room ||
            !gift
          ) {

            return;

          }


          room.giftPoints +=
            gift.points;


          roomBroadcast(
            room.id,
            {

              type:
                'gift',

              senderId:
                state.id,

              name:
                safeName(
                  state.name
                ),

              giftName:
                gift.name,

              giftIcon:
                gift.icon,

              points:
                gift.points

            }
          );


          roomBroadcast(
            room.id,
            roomStats(
              room
            )
          );


          return;

        }


        /* =========================
           BLOCK
        ========================= */

        if (
          data.type ===
          'block'
        ) {

          if (
            data.targetId &&
            data.targetId !==
              state.id
          ) {

            state.blocked.add(
              String(
                data.targetId
              )
            );


            send(
              ws,
              {

                type:
                  'blocked',

                targetId:
                  String(
                    data.targetId
                  )

              }
            );

          }


          return;

        }


        /* =========================
           UNBLOCK
        ========================= */

        if (
          data.type ===
          'unblock'
        ) {

          state.blocked.delete(
            String(
              data.targetId ||
              ''
            )
          );


          return;

        }

      }
    );


    ws.on(
      'close',
      function() {

        const state =
          clients.get(
            ws
          );


        if (
          state
        ) {

          if (
            state.role ===
              'broadcaster' &&
            state.roomId
          ) {

            endRoom(
              state.roomId
            );

          } else {

            leaveRoom(
              ws
            );

          }

        }


        clients.delete(
          ws
        );

      }
    );


    ws.on(
      'error',
      function() {}
    );

  }
);


/* =====================================================
   LEAVE ROOM
===================================================== */

function leaveRoom(
  ws
) {

  const state =
    clients.get(
      ws
    );


  if (
    !state ||
    !state.roomId
  ) {

    return;

  }


  const room =
    liveRooms.get(
      state.roomId
    );


  if (room) {

    room.viewers.delete(
      state.id
    );


    const broadcaster =
      findClient(
        room.broadcasterId
      );


    if (
      broadcaster
    ) {

      send(
        broadcaster,
        {

          type:
            'viewer_left',

          viewerId:
            state.id

        }
      );

    }


    roomBroadcast(
      room.id,
      roomStats(
        room
      )
    );

  }


  state.roomId =
    null;

  state.role =
    'idle';

}


/* =====================================================
   END ROOM
===================================================== */

function endRoom(
  roomId
) {

  const room =
    liveRooms.get(
      roomId
    );


  if (!room) {

    return;

  }


  room.viewers.forEach(
    function(clientId) {

      const viewer =
        findClient(
          clientId
        );


      if (viewer) {

        const state =
          clients.get(
            viewer
          );


        if (state) {

          state.roomId =
            null;

          state.role =
            'idle';

        }


        send(
          viewer,
          {

            type:
              'live_ended',

            roomId:
              roomId

          }
        );

      }

    }
  );


  const broadcaster =
    findClient(
      room.broadcasterId
    );


  if (
    broadcaster
  ) {

    const state =
      clients.get(
        broadcaster
      );


    if (state) {

      state.roomId =
        null;

      state.role =
        'idle';

    }


    send(
      broadcaster,
      {

        type:
          'live_ended',

        roomId:
          roomId

      }
    );

  }


  liveRooms.delete(
    roomId
  );


  broadcastHome();


  console.log(
    'LIVE END:',
    roomId
  );

}


/* =====================================================
   BROADCAST HOME
===================================================== */

function broadcastHome() {

  const data =
    homeData();


  clients.forEach(
    function(_, ws) {

      send(
        ws,
        data
      );

    }
  );

}


/* =====================================================
   SERVER START
===================================================== */

server.listen(
  PORT,
  HOST,
  function() {

    console.log(
      '================================='
    );

    console.log(
      'VoiceポタLive server started'
    );

    console.log(
      'PORT:',
      PORT
    );

    console.log(
      'HOST:',
      HOST
    );

    console.log(
      '================================='
    );

  }
);
