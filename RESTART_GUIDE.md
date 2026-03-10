# Walletrix — Restart Guide

Everything you need to do after closing all terminals and starting a fresh session.

---

## Step 1 — Verify DNS is set to Google

Your ISP's DNS blocks the Neon DB hostname. After a reboot or network change, check that Google DNS is still active.

```sh
networksetup -getdnsservers Wi-Fi
```

Expected output: `8.8.8.8` and `8.8.4.4`

If it shows something else (or "There aren't any DNS Servers"), fix it:

```sh
sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4
```

---

## Step 2 — Start the Backend (Terminal 1)

```sh
cd ~/Desktop/Repositories/Walletrix/backend
npm run dev
```

- Runs on **http://localhost:3001**
- nodemon auto-restarts on file changes
- Wait for: `Server running on port 3001`

---

## Step 3 — Start the Frontend (Terminal 2)

```sh
cd ~/Desktop/Repositories/Walletrix/frontend
npm run dev
```

- Runs on **http://localhost:3000**
- Wait for: `Ready in ...ms`

---

## Step 4 — Start a Tunnel (Terminal 3)

> **Why:** Telegram needs a public HTTPS URL to send webhook events to your local backend. You have three options — pick whichever is available.

> **Note:** The URL **changes every time** you restart a tunnel. You must re-register the webhook (Step 5) each session.

### Option A — Serveo (no install needed)

```sh
ssh -R 80:localhost:3001 -o ServerAliveInterval=30 -o ServerAliveCountMax=6 serveo.net
```

- Wait for: `Forwarding HTTP traffic from https://XXXXXXXX.serveousercontent.com`
- **Copy the full URL** for Step 5
- Keepalive flags prevent idle SSH drops (30s ping interval)
- If it stalls, try `-R 8080:localhost:3001` or just retry

> ⚠️ **Known issue (March 2026):** Serveo's SSL certificate has been expiring intermittently. If Telegram stops responding to bot commands, check the webhook with `getWebhookInfo` — if `last_error_message` says `SSL error: certificate verify failed`, switch to ngrok or Cloudflare instead.

### Option B — ngrok

```sh
ngrok http 3001
```

- Wait for the `Forwarding` line showing `https://XXXX.ngrok-free.dev`
- **Copy that URL** for Step 5
- ngrok has a TUI dashboard — keep it in its own terminal tab (don't background it with `&`)
- Local inspect dashboard: http://127.0.0.1:4040

> **Tip:** If you need to run ngrok headless (e.g. in a script), use:
> ```sh
> ngrok http 3001 --log /tmp/ngrok.log --log-level info
> ```
> Then get the URL with:
> ```sh
> curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])"
> ```

### Option C — Cloudflare Tunnel (cloudflared)

```sh
cloudflared tunnel --url http://localhost:3001
```

- Wait for: `Your quick Tunnel has been created! Visit it at: https://XXXX.trycloudflare.com`
- **Copy that URL** for Step 5
- No account needed for quick tunnels (but no uptime guarantee)
- Uses QUIC protocol — generally fast and stable

### Which tunnel should I use?

| Tunnel | Install needed? | Reliability | Speed | Notes |
|---|---|---|---|---|
| **Serveo** | No (SSH) | Occasional outages | Good | Simplest — just SSH |
| **ngrok** | Yes (`brew install ngrok`) | Very reliable | Fast | Free tier: 1 tunnel, URL changes each restart |
| **Cloudflare** | Yes (`brew install cloudflared`) | Reliable | Fast | No signup for quick tunnels |

---

## Step 5 — Register the Telegram Webhook

Replace `<TUNNEL_URL>` with the URL from Step 4 (no trailing slash).

```sh
cd ~/Desktop/Repositories/Walletrix/backend
node scripts/registerWebhook.js <TUNNEL_URL>
```

Examples:
```sh
# Serveo
node scripts/registerWebhook.js https://45d93648a32265b6-43-239-68-2.serveousercontent.com

# ngrok
node scripts/registerWebhook.js https://arcform-unappealably-amber.ngrok-free.dev

# Cloudflare
node scripts/registerWebhook.js https://scout-duke-translations-consumer.trycloudflare.com
```

Expected output: `✅ Webhook registered successfully`

### Verify the webhook is set:
```sh
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```
_(Bot token is in `backend/.env` as `TELEGRAM_BOT_TOKEN`)_

---

## Step 6 — Verify Everything Works

1. Open **http://localhost:3000** in the browser
2. Log in with your Clerk account
3. Open the Walletrix Telegram bot in Telegram
4. Send `/balance` — should reply with your bot wallet balance
5. Send a transfer: `send 0.001 ETH to 0xYourAddress` — should show a confirmation prompt

---

## Important Notes

### Bot Wallet (Sepolia testnet)
The Telegram bot executes transactions from its own EOA wallet. It needs Sepolia ETH to send anything.

- **Address:** `0x6B11BB9a8aB1CE65513C9aC219c07EE2C89dd3Ec`
- **Faucet:** https://sepoliafaucet.com

### Intent Parsing (No Gemini quota needed)
The bot uses **regex-based parsing** for common commands — no Gemini API quota is consumed for:
- `send X ETH/USDC/... to 0x...`
- `transfer X TOKEN to 0x...`
- `balance` / `what is my balance` / `how much ETH do I have`

Gemini AI is only attempted for ambiguous messages, and silently skipped if quota is 0.

### Supported Telegram Commands
| Command | Description |
|---|---|
| `/start CODE` | Link your Walletrix account (use Settings → Telegram Bot to get a code) |
| `/balance` | Check bot wallet balance |
| `/help` | List all commands |
| `/unlink` | Unlink your Telegram account |
| `send X ETH to 0x...` | Initiate a transfer (requires confirmation) |

---

## Quick Reference — All Terminals at a Glance

| Terminal | Command |
|---|---|
| 1 — Backend | `cd backend && npm run dev` |
| 2 — Frontend | `cd frontend && npm run dev` |
| 3 — Tunnel (pick one) | `ssh -R 80:localhost:3001 -o ServerAliveInterval=30 -o ServerAliveCountMax=6 serveo.net` |
| | `ngrok http 3001` |
| | `cloudflared tunnel --url http://localhost:3001` |

After getting the tunnel URL:
```sh
# Run once per session (in any terminal):
cd backend && node scripts/registerWebhook.js <TUNNEL_URL>
```
