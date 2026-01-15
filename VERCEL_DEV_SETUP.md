# Vercel Dev Setup Guide

## Environment Variables in Vercel Dev

When using `vercel dev`, environment variables are **NOT automatically loaded** from `.env.local`. You need to configure them differently.

## Quick Setup Options

### Option 1: Use Next.js Dev Server (Recommended for Local Development)

Instead of `vercel dev`, use the standard Next.js dev server:

```bash
npm run dev
```

This automatically loads `.env.local` and is simpler for local development.

### Option 2: Link Vercel Project and Pull Environment Variables

1. **Link your project to Vercel:**
   ```bash
   vercel link
   ```
   Follow the prompts to select your Vercel project.

2. **Pull environment variables from Vercel:**
   ```bash
   vercel env pull .env.local
   ```
   This downloads environment variables from your Vercel project and creates/updates `.env.local`.

3. **Start Vercel dev:**
   ```bash
   vercel dev
   ```

### Option 3: Set Environment Variables in Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `TELEGRAM_CHAT_ID` = your chat ID
5. Make sure to select **Development** environment
6. Restart `vercel dev`

### Option 4: Pass Environment Variables via Command Line

```bash
vercel dev --env TELEGRAM_BOT_TOKEN=your_token_here --env TELEGRAM_CHAT_ID=your_chat_id_here
```

## Testing Your Setup

### 1. Check Environment Variables

Visit: `http://localhost:3000/api/env-check`

This will show you:
- ✅ If environment variables are loaded
- Which variables are set/missing
- Instructions for fixing issues

### 2. Test Telegram Connection

Visit: `http://localhost:3000/api/telegram/test`

This will:
- Check if environment variables are configured
- Send a test message to your Telegram
- Show detailed error messages if something fails

## Troubleshooting

### Issue: Environment variables not loading in Vercel dev

**Solution:**
1. Check `/api/env-check` to see what's loaded
2. If using `vercel dev`, make sure you've:
   - Linked the project: `vercel link`
   - Pulled env vars: `vercel env pull .env.local`
   - OR set them in Vercel Dashboard
3. Restart `vercel dev` after setting variables
4. Consider using `npm run dev` instead for local development

### Issue: Telegram test works but form submission doesn't

**Check:**
1. Browser console (F12) for API call logs
2. Server logs for `[send-billing]` and `[telegram]` messages
3. Verify the form is actually calling `/api/telegram/send-billing`

### Issue: "Environment variables not configured"

**Solution:**
- For `npm run dev`: Make sure `.env.local` exists in project root
- For `vercel dev`: Run `vercel env pull .env.local` or set in Dashboard
- Restart your dev server after changing environment variables

## Recommended Workflow

**For Local Development:**
```bash
# Use Next.js dev server (simpler, auto-loads .env.local)
npm run dev
```

**For Testing Vercel-Specific Features:**
```bash
# Link and pull env vars first
vercel link
vercel env pull .env.local
# Then use Vercel dev
vercel dev
```

## Environment Variables Required

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID from @userinfobot

## Quick Test Commands

```bash
# Check if env vars are loaded
curl http://localhost:3000/api/env-check

# Test Telegram connection
curl http://localhost:3000/api/telegram/test
```
