// Global redirect route - redirects ALL users (uses Edge Config for ultra-fast reads)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const { getRedirectFromEdgeConfig } = require('./edge-config-helper');

let kv = null;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.warn('[redirect/r/global] KV not available:', error.message);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[redirect/r/global] Processing global redirect');

  // PRIMARY: Check Edge Config first (ultra-fast, < 1ms, globally distributed)
  let redirectData = null;
  
  const edgeConfigRedirect = await getRedirectFromEdgeConfig();
  if (edgeConfigRedirect) {
    const age = Date.now() - (edgeConfigRedirect.timestampMs || 0);
    if (age < 300000 && edgeConfigRedirect.redirect) { // Less than 5 minutes old
      redirectData = edgeConfigRedirect;
      console.log('[redirect/r/global] ✅✅✅ FOUND IN EDGE CONFIG (< 1ms read) ✅✅✅');
    }
  }
  
  // FALLBACK: Check Vercel KV (works across all function instances)
  if (!redirectData && kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const kvData = await kv.get('redirect:global');
      if (kvData) {
        redirectData = JSON.parse(kvData);
        const age = Date.now() - (redirectData.timestampMs || 0);
        if (age < 300000 && redirectData.redirect) { // Less than 5 minutes old
          console.log('[redirect/r/global] ✅✅✅ FOUND IN VERCEL KV ✅✅✅');
        } else {
          redirectData = null; // Too old
        }
      }
    } catch (kvError) {
      console.warn('[redirect/r/global] KV check error:', kvError.message);
    }
  }
  
  // FALLBACK: Check global redirect history
  if (!redirectData && global.redirectHistory && global.redirectHistory.length > 0) {
    const latest = global.redirectHistory[global.redirectHistory.length - 1];
    const age = Date.now() - (latest.timestampMs || 0);
    if (age < 300000 && latest.redirect) {
      redirectData = latest;
      console.log('[redirect/r/global] ✅ Found in history');
    }
  }
  
  // FALLBACK: Check global redirect
  if (!redirectData && global.globalRedirect && global.globalRedirect.redirect) {
    const age = Date.now() - (global.globalRedirect.timestampMs || 0);
    if (age < 300000) {
      redirectData = global.globalRedirect;
      console.log('[redirect/r/global] ✅ Found in global');
    }
  }
  
  // FALLBACK: Check RedirectStore
  if (!redirectData && global.redirectStore && global.redirectStore['global']) {
    const globalRedirect = global.redirectStore['global'];
    const age = Date.now() - (globalRedirect.timestampMs || 0);
    if (age < 300000 && globalRedirect.redirect) {
      redirectData = globalRedirect;
      console.log('[redirect/r/global] ✅ Found in redirectStore');
    }
  }
  
  if (!redirectData) {
    console.log('[redirect/r/global] ❌ No global redirect found');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(404).json({ error: 'Redirect not found' });
  }

  const targetPath = redirectData.pagePath || '/';

  console.log('[redirect/r/global] ✅ Redirecting ALL users to:', targetPath);

  // Return 302 redirect
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Location', targetPath);
  res.status(302).end();
}

