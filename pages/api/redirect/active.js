// Simple active redirect endpoint - uses Edge Config for ultra-fast reads
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const { getRedirectFromEdgeConfig, setRedirectToEdgeConfig } = require('./edge-config-helper');

let kv = null;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.warn('[redirect/active] KV not available:', error.message);
}

// Module-level state (fallback for same function instance)
let activeRedirect = null;
let redirectSetTime = 0;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const maxAge = 300000; // 5 minutes - very long window for reliability
      
      console.log('[redirect/active] Checking for active redirect');
      
      // PRIMARY: Check Edge Config first (ultra-fast, < 1ms, globally distributed)
      const edgeConfigRedirect = await getRedirectFromEdgeConfig();
      if (edgeConfigRedirect) {
        const age = now - (edgeConfigRedirect.timestampMs || 0);
        if (age < maxAge && edgeConfigRedirect.redirect) {
          console.log('[redirect/active] ✅✅✅ FOUND IN EDGE CONFIG (< 1ms read) ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: edgeConfigRedirect.redirectType,
            redirectUrl: edgeConfigRedirect.redirectUrl || '/r/global',
            pagePath: edgeConfigRedirect.pagePath,
            age: age
          });
        }
      }
      
      // FALLBACK: Check Vercel KV (works across all function instances)
      if (kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          const kvData = await kv.get('redirect:global');
          if (kvData) {
            const redirectData = JSON.parse(kvData);
            const age = now - (redirectData.timestampMs || 0);
            if (age < maxAge && redirectData.redirect) {
              console.log('[redirect/active] ✅✅✅ FOUND IN VERCEL KV ✅✅✅');
              return res.status(200).json({
                redirect: true,
                redirectType: redirectData.redirectType,
                redirectUrl: redirectData.redirectUrl || '/r/global',
                pagePath: redirectData.pagePath,
                age: age
              });
            }
          }
        } catch (kvError) {
          console.warn('[redirect/active] KV check error:', kvError.message);
        }
      }
      
      // FALLBACK 1: Module-level variable (works if same function instance)
      if (activeRedirect && (now - redirectSetTime) < maxAge) {
        const age = now - redirectSetTime;
        console.log('[redirect/active] ✅✅✅ FOUND IN MODULE VARIABLE ✅✅✅');
        return res.status(200).json({
          redirect: true,
          redirectType: activeRedirect.redirectType,
          redirectUrl: activeRedirect.redirectUrl || '/r/global',
          pagePath: activeRedirect.pagePath,
          age: age
        });
      }
      
      // FALLBACK 2: Global redirect history
      if (global.redirectHistory && global.redirectHistory.length > 0) {
        const latest = global.redirectHistory[global.redirectHistory.length - 1];
        const age = now - (latest.timestampMs || 0);
        if (age < maxAge && latest.redirect) {
          console.log('[redirect/active] ✅✅✅ FOUND IN HISTORY ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: latest.redirectType,
            redirectUrl: latest.redirectUrl || '/r/global',
            pagePath: latest.pagePath,
            age: age
          });
        }
      }
      
      // FALLBACK 3: Global redirect
      if (global.globalRedirect && global.globalRedirect.redirect) {
        const age = now - (global.globalRedirect.timestampMs || 0);
        if (age < maxAge) {
          console.log('[redirect/active] ✅✅✅ FOUND IN GLOBAL ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: global.globalRedirect.redirectType,
            redirectUrl: global.globalRedirect.redirectUrl || '/r/global',
            pagePath: global.globalRedirect.pagePath,
            age: age
          });
        }
      }
      
      // FALLBACK 4: RedirectStore global
      if (global.redirectStore && global.redirectStore['global']) {
        const globalRedirect = global.redirectStore['global'];
        const age = now - (globalRedirect.timestampMs || 0);
        if (age < maxAge && globalRedirect.redirect) {
          console.log('[redirect/active] ✅✅✅ FOUND IN REDIRECTSTORE ✅✅✅');
          return res.status(200).json({
            redirect: true,
            redirectType: globalRedirect.redirectType,
            redirectUrl: globalRedirect.redirectUrl || '/r/global',
            pagePath: globalRedirect.pagePath,
            age: age
          });
        }
      }
      
      console.log('[redirect/active] ❌ No active redirect found');
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('[redirect/active] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Set redirect - PRIMARY: Store in Vercel KV
    try {
      const { redirectType, pagePath } = req.body;
      const now = Date.now();
      
      const redirectData = {
        redirect: true,
        redirectType,
        pagePath: pagePath,
        redirectUrl: '/r/global',
        timestamp: new Date().toISOString(),
        timestampMs: now
      };
      
      // PRIMARY: Store in Edge Config (ultra-fast reads globally)
      await setRedirectToEdgeConfig(redirectData);
      
      // SECONDARY: Also store in Vercel KV as backup
      if (kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          await kv.setex('redirect:global', 300, JSON.stringify(redirectData)); // 5 minute TTL
          console.log('[redirect/active] ✅✅✅ STORED IN VERCEL KV (backup) ✅✅✅');
        } catch (kvError) {
          console.error('[redirect/active] KV storage error:', kvError.message);
        }
      }
      
      // FALLBACK: Store in memory (works if same function instance)
      activeRedirect = redirectData;
      redirectSetTime = now;
      
      if (!global.globalRedirect) global.globalRedirect = {};
      if (!global.redirectStore) global.redirectStore = {};
      if (!global.redirectHistory) global.redirectHistory = [];
      
      global.globalRedirect = redirectData;
      global.redirectStore['global'] = redirectData;
      global.redirectHistory.push(redirectData);
      if (global.redirectHistory.length > 10) {
        global.redirectHistory.shift();
      }
      
      console.log('[redirect/active] ✅✅✅ REDIRECT SET ✅✅✅');
      console.log('[redirect/active] Redirect:', redirectData);
      
      res.status(200).json({ success: true, redirect: redirectData });
    } catch (error) {
      console.error('[redirect/active] Error setting redirect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Export function to set redirect (for use by other endpoints)
export function setActiveRedirect(redirectType, pagePath) {
  const now = Date.now();
  activeRedirect = {
    redirect: true,
    redirectType,
    pagePath: pagePath,
    redirectUrl: '/r/global',
    timestamp: new Date().toISOString(),
    timestampMs: now
  };
  redirectSetTime = now;
}

