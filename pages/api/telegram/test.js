// Test Telegram bot connection
import { sendTelegramMessage } from '../telegram';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      const status = {
        botTokenConfigured: !!botToken,
        chatIdConfigured: !!chatId,
        botTokenPreview: botToken ? `${botToken.substring(0, 10)}...` : 'NOT SET',
        chatIdPreview: chatId || 'NOT SET'
      };
      
      if (!botToken || !chatId) {
        return res.status(200).json({
          success: false,
          status,
          error: 'Environment variables not configured',
          instructions: [
            'For Next.js dev (npm run dev): Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env.local',
            'For Vercel dev: Run "vercel env pull .env.local" or set in Vercel Dashboard',
            'Then restart your dev server'
          ],
          troubleshooting: {
            usingVercelDev: 'If using "vercel dev", environment variables must be set in Vercel Dashboard or pulled with "vercel env pull"',
            usingNextDev: 'If using "npm run dev", .env.local is automatically loaded'
          }
        });
      }
      
      // Try to send a test message
      const testMessage = '🧪 Test message from your bot!\n\nIf you receive this, your bot is working correctly.';
      const result = await sendTelegramMessage(testMessage);
      
      if (result) {
        return res.status(200).json({
          success: true,
          status,
          message: 'Test message sent successfully!',
          messageId: result.message_id
        });
      } else {
        return res.status(200).json({
          success: false,
          status,
          error: 'Failed to send test message',
          instructions: 'Check your bot token and chat ID are correct'
        });
      }
    } catch (error) {
      console.error('[telegram-test] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

