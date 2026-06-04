// Tiny WebSocket echo server for the puckstats.io /performance connection test.
// One file, one dependency (ws). Deploy one per VPS/region.
//
//   PORT=8060 node server.js                          # plain ws:// (dev)
//   PORT=8060 SSL_CERT_PATH=... SSL_KEY_PATH=... node server.js   # wss:// (prod)
//
// The page is served over https, so production MUST be wss:// — either give
// this process Let's Encrypt cert paths directly, or run it plain behind a
// TLS-terminating proxy (Caddy/nginx). See README.md.

import fs from "fs";
import https from "https";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT || 8060);
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;

let wss;
if (certPath && keyPath) {
  const server = https.createServer({
    cert: fs.readFileSync(certPath, "utf8"),
    key: fs.readFileSync(keyPath, "utf8"),
  });
  wss = new WebSocketServer({ server });
  server.listen(port, () =>
    console.log(`ping-echo listening (wss) on :${port}`)
  );
} else {
  wss = new WebSocketServer({ port }, () =>
    console.log(`ping-echo listening (ws) on :${port}`)
  );
}

wss.on("connection", (client) => {
  client.on("error", () => client.terminate());
  client.on("message", (message) => {
    // Pure echo of the test ping — nothing else, as fast as possible.
    let msg;
    try {
      msg = JSON.parse(message.toString());
    } catch {
      return;
    }
    if (msg.type === "connection_test_ping") {
      client.send(
        JSON.stringify({ type: "connection_test_pong", seq: msg.seq, t: msg.t })
      );
    }
  });
});

// Drop idle/half-open sockets so a fleet of these never leaks connections.
const HEARTBEAT_MS = 30_000;
setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, HEARTBEAT_MS);
wss.on("connection", (client) => {
  client.isAlive = true;
  client.on("pong", () => {
    client.isAlive = true;
  });
});
