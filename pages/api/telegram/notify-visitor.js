// Notify Telegram when visitor arrives on site
import { notifyVisitor } from '../telegram';

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
      
      if (!botToken) {
        console.error('[notify-visitor] TELEGRAM_BOT_TOKEN not set in environment variables');
        return res.status(500).json({ 
          error: 'TELEGRAM_BOT_TOKEN not configured',
          details: 'Please set TELEGRAM_BOT_TOKEN in .env.local'
        });
      }
      
      if (!chatId) {
        console.error('[notify-visitor] TELEGRAM_CHAT_ID not set in environment variables');
        return res.status(500).json({ 
          error: 'TELEGRAM_CHAT_ID not configured',
          details: 'Please set TELEGRAM_CHAT_ID in .env.local'
        });
      }
      
      const result = await notifyVisitor(visitorId);
      
      if (result) {
        console.log('[notify-visitor] Telegram notification sent successfully');
        res.status(200).json({ success: true, messageId: result.message_id });
      } else {
        console.error('[notify-visitor] Failed to send Telegram notification');
        res.status(500).json({ error: 'Failed to send notification', result });
      }
    } catch (error) {
      console.error('[notify-visitor] Error:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

