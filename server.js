const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

// RenderのWeb Service用HTTPサーバー
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end("Bota Live Server is running!");
});

// WebSocketサーバー
const wss = new WebSocket.Server({ server });

// 配信ルーム
const rooms = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(roomId, data) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const client of room.clients) {
    send(client, data);
  }
}

wss.on("connection", (ws) => {
  let roomId = null;
  let userId = Math.random().toString(36).slice(2);

  send(ws, {
    type: "connected",
    userId
  });

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // ルーム参加
    if (message.type === "join") {
      roomId = String(message.roomId || "");

      if (!roomId) {
        send(ws, {
          type: "error",
          message: "roomIdが必要です"
        });
        return;
      }

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          clients: new Set(),
          likes: 0
        });
      }

      const room = rooms.get(roomId);
      room.clients.add(ws);

      broadcast(roomId, {
        type: "presence",
        count: room.clients.size
      });

      return;
    }

    if (!roomId || !rooms.has(roomId)) {
      return;
    }

    // WebRTCシグナリング
    if (
      message.type === "offer" ||
      message.type === "answer" ||
      message.type === "ice-candidate"
    ) {
      const room = rooms.get(roomId);

      for (const client of room.clients) {
        if (client !== ws) {
          send(client, {
            type: message.type,
            from: userId,
            data: message.data
          });
        }
      }

      return;
    }

    // コメント
    if (message.type === "comment") {
      broadcast(roomId, {
        type: "comment",
        userId,
        nickname: String(message.nickname || "ゲスト").slice(0, 30),
        text: String(message.text || "").slice(0, 300),
        at: Date.now()
      });

      return;
    }

    // いいね
    if (message.type === "like") {
      const room = rooms.get(roomId);

      room.likes += 1;

      broadcast(roomId, {
        type: "likes",
        count: room.likes
      });

      return;
    }

    // ギフト
    if (message.type === "gift") {
      broadcast(roomId, {
        type: "gift",
        nickname: String(message.nickname || "ゲスト").slice(0, 30),
        gift: String(message.gift || "ハート").slice(0, 30),
        amount: Math.max(
          0,
          Math.min(Number(message.amount) || 0, 100000)
        )
      });

      return;
    }
  });

  ws.on("close", () => {
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);

    room.clients.delete(ws);

    if (room.clients.size === 0) {
      rooms.delete(roomId);
    } else {
      broadcast(roomId, {
        type: "presence",
        count: room.clients.size
      });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Bota Live Server running on port ${PORT}`);
});
