// Check for redirect command for a visitor - uses Edge Config for ultra-fast reads
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const { getRedirectFromEdgeConfig } = require('../edge-config-helper');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { visitorId } = req.query;
      if (!visitorId) {
        return res.status(400).json({ error: 'Visitor ID required' });
      }
      
      console.log('[redirect/get] Checking redirect for visitor:', visitorId);
      
      // PRIMARY: Check Edge Config first (ultra-fast, < 1ms, globally distributed)
      const edgeConfigRedirect = await getRedirectFromEdgeConfig();
      if (edgeConfigRedirect) {
        const now = Date.now();
        const redirectAge = now - (edgeConfigRedirect.timestampMs || 0);
        if (redirectAge < 300000 && edgeConfigRedirect.redirect) { // Less than 5 minutes old
          console.log('[redirect/get] ✅✅✅ FOUND IN EDGE CONFIG (< 1ms read) ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: edgeConfigRedirect.redirectType,
            redirectUrl: edgeConfigRedirect.redirectUrl || '/r/global',
            pagePath: edgeConfigRedirect.pagePath
          });
        }
      }
      
      // FALLBACK: Check Vercel KV (works across all function instances)
      let kv = null;
      try {
        kv = require('@vercel/kv').kv;
      } catch (error) {
        // KV not available, continue with fallbacks
      }
      
      if (kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          const kvData = await kv.get('redirect:global');
          if (kvData) {
            const redirectData = JSON.parse(kvData);
            const now = Date.now();
            const redirectAge = now - (redirectData.timestampMs || 0);
            
            if (redirectAge < 300000 && redirectData.redirect) { // Less than 5 minutes old
              console.log('[redirect/get] ✅✅✅ FOUND IN VERCEL KV ✅✅✅');
              return res.status(200).json({
                redirect: true,
                redirectType: redirectData.redirectType,
                redirectUrl: redirectData.redirectUrl || '/r/global',
                pagePath: redirectData.pagePath
              });
            }
          }
        } catch (kvError) {
          console.warn('[redirect/get] KV check error:', kvError.message);
        }
      }
      
      // FALLBACK: Check redirect history
      if (global.redirectHistory && global.redirectHistory.length > 0) {
        const latestRedirect = global.redirectHistory[global.redirectHistory.length - 1];
        const now = Date.now();
        const redirectAge = now - (latestRedirect.timestampMs || 0);
        
        if (redirectAge < 300000 && latestRedirect.redirect) { // Less than 5 minutes old
          console.log('[redirect/get] ✅✅✅ FOUND RECENT REDIRECT FROM HISTORY ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: latestRedirect.redirectType,
            redirectUrl: latestRedirect.redirectUrl || '/r/global',
            pagePath: latestRedirect.pagePath
          });
        }
      }
      
      // SECOND: Check global redirect stored in redirectStore
      if (global.redirectStore && global.redirectStore['global']) {
        const globalRedirect = global.redirectStore['global'];
        const now = Date.now();
        const redirectAge = now - (globalRedirect.timestampMs || 0);
        
        if (redirectAge < 60000 && globalRedirect.redirect) {
          console.log('[redirect/get] ✅✅✅ GLOBAL REDIRECT FOUND (from redirectStore) ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: globalRedirect.redirectType,
            redirectUrl: globalRedirect.redirectUrl || '/r/global',
            pagePath: globalRedirect.pagePath
          });
        }
      }
      
      // THIRD: Check global redirect (direct)
      if (global.globalRedirect && global.globalRedirect.redirect) {
        const now = Date.now();
        const redirectAge = now - (global.globalRedirect.timestampMs || 0);
        
        if (redirectAge < 60000) {
          console.log('[redirect/get] ✅✅✅ GLOBAL REDIRECT FOUND (direct) ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: global.globalRedirect.redirectType,
            redirectUrl: global.globalRedirect.redirectUrl || '/r/global',
            pagePath: global.globalRedirect.pagePath
          });
        }
      }
      
      // FOURTH: Check latest redirect endpoint internally (fallback)
      try {
        // Import and call latest redirect check
        const latestModule = require('./latest');
        // We can't easily call it internally, so we'll rely on client-side fallback
      } catch (error) {
        // Ignore
      }
      
      // FIFTH: Check visitor-specific redirect
      if (global.redirectStore && global.redirectStore[visitorId]) {
        const redirect = global.redirectStore[visitorId];
        console.log('[redirect/get] ✅ Found visitor-specific redirect');
        return res.status(200).json({
          redirect: true,
          redirectType: redirect.redirectType,
          redirectUrl: redirect.redirectUrl || `/r/${visitorId}`,
          pagePath: redirect.pagePath
        });
      }
      
      console.log('[redirect/get] ❌ No redirect found');
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('Error getting redirect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

