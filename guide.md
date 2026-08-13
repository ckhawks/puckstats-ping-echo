clone the repo, install dependencies, set up the service, and enable it:

```bash
cd ~ && git clone https://github.com/ckhawks/puckstats-ping-echo.git
cd ~/puckstats-ping-echo && npm install

sudo tee /etc/systemd/system/ping-echo.service > /dev/null <<EOF
[Unit]
Description=puckstats ping-echo
After=network.target

[Service]
User=$USER
WorkingDirectory=$HOME/puckstats-ping-echo
Environment=PORT=8060
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now ping-echo
```

```bash
# install caddy (Ubuntu)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o
/usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

```bash
# configure — substitute each box's own hostname
echo 'ping-chi3-vultr-phl.stellaric.pw {
    reverse_proxy localhost:8060
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Allow the web server through the firewall:

```bash
sudo ufw allow 80,443/tcp
sudo ufw deny 8060/tcp
```
