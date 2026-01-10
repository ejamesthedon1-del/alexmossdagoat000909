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
      
      // Store global redirect - ALL users will be redirected
      if (!global.globalRedirect) {
        global.globalRedirect = {};
      }
      
      global.globalRedirect = {
        redirect: true,
        redirectType,
        pagePath: pagePath,
        redirectUrl: `/r/global`,
        timestamp: new Date().toISOString()
      };
      
      console.log('[redirect/all] ✅ Global redirect stored:', global.globalRedirect);
      
      // Broadcast to all SSE connections
      const { broadcastRedirect } = require('./connections');
      Object.keys(global.redirectStore || {}).forEach(visitorId => {
        broadcastRedirect(visitorId, global.globalRedirect);
      });
      
      res.status(200).json({ success: true, redirect: global.globalRedirect });
    } catch (error) {
      console.error('[redirect/all] Error:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

