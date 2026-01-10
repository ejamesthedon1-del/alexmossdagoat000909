# Telegram Bot Troubleshooting Guide

## Quick Diagnostic Steps

### Step 1: Test Your Bot Connection

Visit this URL in your browser (replace with your domain if not local):
```
http://localhost:3000/api/telegram/test
```

This will tell you:
- ✅ If your environment variables are set
- ✅ If the bot can send messages
- ✅ Any specific errors

### Step 2: Check Environment Variables

Make sure your `.env.local` file has:

```env
TELEGRAM_BOT_TOKEN=8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw
TELEGRAM_CHAT_ID=your_chat_id_here
```

**Important:** 
- Restart your Next.js server after changing `.env.local`
- Environment variables are only loaded when the server starts

### Step 3: Get Your Chat ID

1. Open Telegram
2. Search for **@userinfobot**
3. Start a chat - it will show your Chat ID (a number like `123456789`)
4. Copy that number to `TELEGRAM_CHAT_ID` in `.env.local`

### Step 4: Check Server Logs

When you visit your website, check your terminal/console for:

```
[index.js] Sending visitor notification, visitorId: ...
[notify-visitor] Bot token exists: true/false
[notify-visitor] Chat ID exists: true/false
[telegram] Message sent successfully to chat: ...
```

### Step 5: Check Browser Console

Open browser DevTools (F12) and check the Console tab for:
- Any errors
- The notification response

## Common Issues

### Issue 1: "Bot token not configured"
**Solution:** Make sure `TELEGRAM_BOT_TOKEN` is in `.env.local` and restart server

### Issue 2: "Chat ID not configured"  
**Solution:** Get your Chat ID from @userinfobot and add to `.env.local`, then restart

### Issue 3: "Unauthorized" or "Forbidden" error
**Solution:** 
- Check your bot token is correct
- Make sure you've started a chat with your bot first (send `/start`)

### Issue 4: No errors but no messages
**Solution:**
- Check if you've sent `/start` to your bot in Telegram
- Verify the Chat ID is correct
- Check server logs for detailed error messages

### Issue 5: Environment variables not loading
**Solution:**
- Make sure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Restart your Next.js dev server completely
- For production, set environment variables in your hosting platform

## Testing Checklist

- [ ] `.env.local` file exists in project root
- [ ] `TELEGRAM_BOT_TOKEN` is set correctly
- [ ] `TELEGRAM_CHAT_ID` is set correctly  
- [ ] Server restarted after adding env variables
- [ ] Test endpoint works: `/api/telegram/test`
- [ ] Browser console shows notification attempt
- [ ] Server logs show notification attempt
- [ ] You've sent `/start` to your bot in Telegram

## Manual Test

You can manually test by calling the API directly:

```bash
curl -X POST http://localhost:3000/api/telegram/notify-visitor \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test123"}'
```

Or visit: `http://localhost:3000/api/telegram/test`

## Still Not Working?

1. Check server terminal for error messages
2. Check browser console (F12) for errors
3. Visit `/api/telegram/test` to see detailed status
4. Verify bot token works by testing manually:
   ```bash
   curl "https://api.telegram.org/bot8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw/getMe"
   ```

