// Set redirect for ALL users - simple global redirect
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { redirectType, pagePath } = req.body;
      console.log('[redirect/all] 🚀 SETTING GLOBAL REDIRECT:', { redirectType, pagePath });
      
      if (!redirectType || !pagePath) {
        return res.status(400).json({ error: 'Redirect type and page path required' });
      }
      
      // Store global redirect with timestamp - ALL users will be redirected
      const now = Date.now();
      const redirectData = {
        redirect: true,
        redirectType,
        pagePath: pagePath,
        redirectUrl: `/r/global`,
        timestamp: new Date().toISOString(),
        timestampMs: now // Store milliseconds for easy comparison
      };
      
      // Initialize stores if needed
      if (!global.globalRedirect) {
        global.globalRedirect = {};
      }
      if (!global.redirectStore) {
        global.redirectStore = {};
      }
      if (!global.redirectHistory) {
        global.redirectHistory = [];
      }
      
      // Store redirect in multiple places for reliability
      global.globalRedirect = redirectData;
      global.redirectStore['global'] = redirectData;
      
      // Store in timestamped history array (keep last 10 redirects)
      global.redirectHistory.push(redirectData);
      if (global.redirectHistory.length > 10) {
        global.redirectHistory.shift(); // Remove oldest
      }
      
      console.log('[redirect/all] ✅✅✅ GLOBAL REDIRECT STORED ✅✅✅');
      console.log('[redirect/all] Redirect data:', JSON.stringify(redirectData, null, 2));
      console.log('[redirect/all] Timestamp (ms):', now);
      console.log('[redirect/all] Page path:', pagePath);
      console.log('[redirect/all] Redirect type:', redirectType);
      console.log('[redirect/all] History count:', global.redirectHistory.length);
      
      // Broadcast to all SSE connections
      try {
        const { broadcastRedirect } = require('./connections');
        Object.keys(global.redirectStore || {}).forEach(visitorId => {
          broadcastRedirect(visitorId, global.globalRedirect);
        });
      } catch (error) {
        console.warn('[redirect/all] SSE broadcast failed (non-critical):', error.message);
      }
      
      res.status(200).json({ 
        success: true, 
        redirect: redirectData,
        timestamp: now,
        message: 'Global redirect set - all users will redirect'
      });
    } catch (error) {
      console.error('[redirect/all] Error:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

