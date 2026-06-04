# puckstats-ping-echo

Tiny WebSocket echo server for the puckstats.io `/performance` connection test.
Deploy one per VPS/region; the page lets players pick a target and measures
ping / jitter / late-or-lost replies against it.

One file, one dependency (`ws`). The protocol is a pure echo:

```
→ {"type":"connection_test_ping","seq":1,"t":123.4}
← {"type":"connection_test_pong","seq":1,"t":123.4}
```

## Deploy (per VPS) — the easy way (Caddy in front)

The page is served over **https**, so the browser requires **wss://**. Easiest
path: run this server plain on localhost and let Caddy terminate TLS (it gets
and renews Let's Encrypt certs automatically).

1. **DNS**: add an A record, e.g. `ping-chi1.puckstats.io → <VPS IP>`.
   ⚠ **DNS-only — do NOT proxy it through Cloudflare (orange cloud).** A proxy
   would make the test measure the route to Cloudflare's nearest edge instead
   of to this box, which defeats the purpose.
2. **Run the echo server**:
   ```bash
   npm install
   PORT=8060 node server.js
   ```
3. **Caddy** (one-liner, or the Caddyfile below):
   ```bash
   caddy reverse-proxy --from ping-chi1.puckstats.io --to localhost:8060
   ```

`Caddyfile` version:

```
ping-chi1.puckstats.io {
    reverse_proxy localhost:8060
}
```

## Deploy — without Caddy (direct TLS)

If the box already has Let's Encrypt certs (like the main socket server),
point the process at them and skip the proxy:

```bash
PORT=8060 \
SSL_CERT_PATH=/etc/letsencrypt/live/ping-chi1.puckstats.io/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/ping-chi1.puckstats.io/privkey.pem \
node server.js
```

## Keep it running (systemd)

`/etc/systemd/system/ping-echo.service`:

```ini
[Unit]
Description=puckstats ping-echo
After=network.target

[Service]
WorkingDirectory=/opt/puckstats-ping-echo
Environment=PORT=8060
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
User=nobody

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now ping-echo
```

## Wiring up the frontend

Add the new target's `wss://` URL to `TARGETS` in
`nextjs/app/performance/ConnectionTest.tsx` (puckstats repo). Targets whose
URL is empty are hidden, so it's safe to list locations before they exist.
