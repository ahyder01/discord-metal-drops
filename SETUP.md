# Discord Metal Drops — Setup Guide

## 1. YouTube Data API Key

1. Go to https://console.cloud.google.com/
2. Create a new project (or use an existing one)
3. Enable **YouTube Data API v3**:
   - APIs & Services → Library → search "YouTube Data API v3" → Enable
4. Create credentials:
   - APIs & Services → Credentials → Create Credentials → API Key
5. Copy the key — this is your `YOUTUBE_API_KEY`

> **Quota note:** The free tier gives 10,000 units/day. Each search costs 100 units.
> This bot uses 7 searches/day = 700 units. You're well within the free limit.

---

## 2. Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name (e.g. "Metal Drops")
3. Go to **Bot** in the left sidebar → click **Add Bot**
4. Under **Token**, click **Reset Token** → copy it — this is your `DISCORD_BOT_TOKEN`
5. Under **Privileged Gateway Intents**, enable **Message Content Intent**
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`
7. Copy the generated URL and open it in your browser to invite the bot to your server

---

## 3. Discord Channel ID

1. In Discord, go to **User Settings → Advanced** and enable **Developer Mode**
2. Right-click the channel you want the bot to post in → **Copy Channel ID**
3. This is your `DISCORD_CHANNEL_ID`

---

## 4. Configure & Run

```bash
cd C:\Users\adam8\discord-metal-drops

# Copy the example env file and fill it in
cp .env.example .env

# Install dependencies
npm install

# Start the bot (runs indefinitely)
npm start
```

To test immediately without waiting for 9 AM, either:
- Set `SCAN_ON_START=true` in your `.env` and restart, or
- Type `!scan` in the configured Discord channel

---

## Customising the schedule

Edit `CRON_SCHEDULE` in `.env`. Format: `minute hour day month weekday`

| Time | Cron |
|------|------|
| 9 AM UTC (default) | `0 9 * * *` |
| 6 AM EST (11 AM UTC) | `0 11 * * *` |
| 9 AM EST (2 PM UTC) | `0 14 * * *` |
| Twice daily (9 AM + 6 PM UTC) | `0 9,18 * * *` |

---

## Adding/removing genres

Edit the `GENRES` array in `src/youtube.js`. Each entry is:

```js
{ term: 'search string', label: 'Display Name' }
```
