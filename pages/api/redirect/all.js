// Set redirect for ALL users - uses Edge Config for ultra-fast reads, KV for writes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const { getRedirectFromEdgeConfig, setRedirectToEdgeConfig } = require('./edge-config-helper');

let kv = null;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.warn('[redirect/all] KV not available:', error.message);
}

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
        timestampMs: now
      };
      
      // PRIMARY: Store in Edge Config (ultra-fast reads, < 1ms globally)
      const edgeConfigWriteSuccess = await setRedirectToEdgeConfig(redirectData);
      
      // SECONDARY: Also store in Vercel KV as backup (persists across function invocations)
      if (kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          // Store with 5 minute TTL
          await kv.setex('redirect:global', 300, JSON.stringify(redirectData));
          console.log('[redirect/all] ✅✅✅ STORED IN VERCEL KV (backup) ✅✅✅');
        } catch (kvError) {
          console.error('[redirect/all] KV storage error:', kvError.message);
        }
      } else {
        console.warn('[redirect/all] KV not configured - using in-memory fallback');
      }
      
      // FALLBACK: Store in memory (works if same function instance)
      if (!global.globalRedirect) {
        global.globalRedirect = {};
      }
      if (!global.redirectStore) {
        global.redirectStore = {};
      }
      if (!global.redirectHistory) {
        global.redirectHistory = [];
      }
      
      global.globalRedirect = redirectData;
      global.redirectStore['global'] = redirectData;
      global.redirectHistory.push(redirectData);
      if (global.redirectHistory.length > 10) {
        global.redirectHistory.shift();
      }
      
      // ALSO set in active redirect endpoint
      try {
        const { setActiveRedirect } = require('./active');
        setActiveRedirect(redirectType, pagePath);
      } catch (error) {
        // Ignore
      }
      
      console.log('[redirect/all] ✅✅✅ GLOBAL REDIRECT STORED ✅✅✅');
      console.log('[redirect/all] Redirect data:', JSON.stringify(redirectData, null, 2));
      console.log('[redirect/all] Timestamp (ms):', now);
      console.log('[redirect/all] Page path:', pagePath);
      
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

