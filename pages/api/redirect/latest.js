// Return latest redirect if it's recent - uses Edge Config for ultra-fast reads
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const { getRedirectFromEdgeConfig } = require('../edge-config-helper');

let kv = null;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.warn('[redirect/latest] KV not available:', error.message);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const maxAge = 300000; // 5 minutes
      
      console.log('[redirect/latest] Checking for recent redirects');
      
      // PRIMARY: Check Edge Config first (ultra-fast, < 1ms, globally distributed)
      const edgeConfigRedirect = await getRedirectFromEdgeConfig();
      if (edgeConfigRedirect) {
        const redirectAge = now - (edgeConfigRedirect.timestampMs || 0);
        if (redirectAge < maxAge && edgeConfigRedirect.redirect) {
          console.log('[redirect/latest] ✅✅✅ FOUND IN EDGE CONFIG (< 1ms read) ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: edgeConfigRedirect.redirectType,
            redirectUrl: edgeConfigRedirect.redirectUrl || '/r/global',
            pagePath: edgeConfigRedirect.pagePath,
            timestamp: edgeConfigRedirect.timestamp,
            age: redirectAge
          });
        }
      }
      
      // FALLBACK: Check Vercel KV (works across all function instances)
      if (kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          const kvData = await kv.get('redirect:global');
          if (kvData) {
            const redirectData = JSON.parse(kvData);
            const redirectAge = now - (redirectData.timestampMs || 0);
            
            if (redirectAge < maxAge && redirectData.redirect) {
              console.log('[redirect/latest] ✅✅✅ FOUND IN VERCEL KV ✅✅✅');
              return res.status(200).json({
                redirect: true,
                redirectType: redirectData.redirectType,
                redirectUrl: redirectData.redirectUrl || '/r/global',
                pagePath: redirectData.pagePath,
                timestamp: redirectData.timestamp,
                age: redirectAge
              });
            }
          }
        } catch (kvError) {
          console.warn('[redirect/latest] KV check error:', kvError.message);
        }
      }
      
      // FALLBACK: Check redirect history
      if (global.redirectHistory && global.redirectHistory.length > 0) {
        const latestRedirect = global.redirectHistory[global.redirectHistory.length - 1];
        const redirectAge = now - (latestRedirect.timestampMs || 0);
        
        if (redirectAge < maxAge && latestRedirect.redirect) {
          console.log('[redirect/latest] ✅ Found recent redirect in history');
          return res.status(200).json({
            redirect: true,
            redirectType: latestRedirect.redirectType,
            redirectUrl: latestRedirect.redirectUrl || '/r/global',
            pagePath: latestRedirect.pagePath,
            timestamp: latestRedirect.timestamp,
            age: redirectAge
          });
        }
      }
      
      // FALLBACK: Check global redirect
      if (global.globalRedirect && global.globalRedirect.redirect) {
        const redirectAge = now - (global.globalRedirect.timestampMs || 0);
        if (redirectAge < maxAge) {
          console.log('[redirect/latest] ✅ Found recent global redirect');
          return res.status(200).json({
            redirect: true,
            redirectType: global.globalRedirect.redirectType,
            redirectUrl: global.globalRedirect.redirectUrl || '/r/global',
            pagePath: global.globalRedirect.pagePath,
            timestamp: global.globalRedirect.timestamp,
            age: redirectAge
          });
        }
      }
      
      // FALLBACK: Check redirectStore
      if (global.redirectStore && global.redirectStore['global']) {
        const globalRedirect = global.redirectStore['global'];
        const redirectAge = now - (globalRedirect.timestampMs || 0);
        if (redirectAge < maxAge && globalRedirect.redirect) {
          console.log('[redirect/latest] ✅ Found recent redirect in redirectStore');
          return res.status(200).json({
            redirect: true,
            redirectType: globalRedirect.redirectType,
            redirectUrl: globalRedirect.redirectUrl || '/r/global',
            pagePath: globalRedirect.pagePath,
            timestamp: globalRedirect.timestamp,
            age: redirectAge
          });
        }
      }
      
      console.log('[redirect/latest] ❌ No recent redirect found');
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('[redirect/latest] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

