import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

let wss: WebSocketServer;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws/events" });

  wss.on("connection", (ws) => {
    console.log(`[ws] Client connected. Total: ${wss.clients.size}`);
    ws.on("close", () => {
      console.log(`[ws] Client disconnected. Total: ${wss.clients.size}`);
    });
  });
}

export function broadcast(data: object) {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
