// Notify Telegram when visitor arrives on site
import { notifyVisitor } from '../telegram';

// In-memory cache to prevent duplicate notifications (lasts for server restart)
// In production, you might want to use Redis or a database for this
const notifiedVisitors = new Map();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { visitorId } = req.body;
      
      // Check environment variables
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      console.log('[notify-visitor] Bot token exists:', !!botToken);
      console.log('[notify-visitor] Chat ID exists:', !!chatId);
      console.log('[notify-visitor] Visitor ID:', visitorId);
      
      // Don't fail if Telegram is not configured - just log and continue
      if (!botToken || !chatId) {
        console.warn('[notify-visitor] Telegram not configured - skipping notification');
        return res.status(200).json({ 
          success: false,
          warning: 'Telegram not configured',
          message: 'Page will still work, but Telegram notifications are disabled. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment variables.'
        });
      }
      
      // Server-side deduplication: Check if we've notified this visitor recently
      const lastNotificationTime = notifiedVisitors.get(visitorId);
      const now = Date.now();
      
      if (lastNotificationTime && (now - lastNotificationTime) < NOTIFICATION_COOLDOWN) {
        console.log('[notify-visitor] Visitor already notified recently, skipping duplicate');
        return res.status(200).json({ 
          success: false,
          warning: 'Duplicate notification prevented',
          message: 'This visitor was already notified in the last 5 minutes.'
        });
      }
      
      // Try to send notification, but don't fail if it doesn't work
      try {
        const result = await notifyVisitor(visitorId);
        
        if (result) {
          // Mark this visitor as notified
          notifiedVisitors.set(visitorId, now);
          console.log('[notify-visitor] Telegram notification sent successfully');
          return res.status(200).json({ success: true, messageId: result.message_id });
        } else {
          console.warn('[notify-visitor] Failed to send Telegram notification, but continuing');
          return res.status(200).json({ 
            success: false,
            warning: 'Telegram notification failed',
            message: 'Page will still work, but Telegram notification was not sent. Check bot token and chat ID.'
          });
        }
      } catch (telegramError) {
        console.error('[notify-visitor] Telegram error (non-blocking):', telegramError);
        // Still return success so page can load
        return res.status(200).json({ 
          success: false,
          warning: 'Telegram notification error',
          error: telegramError.message,
          message: 'Page will still work, but Telegram notification failed.'
        });
      }
    } catch (error) {
      console.error('[notify-visitor] Unexpected error:', error);
      // Return 200 so page can still load even if notification fails
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

