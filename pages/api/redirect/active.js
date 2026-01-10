// Simple active redirect endpoint - SIMPLIFIED for Vercel stateless functions
// Since Vercel functions are stateless, we check ALL possible storage locations
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Module-level state (only works within same function instance, but better than nothing)
let activeRedirect = null;
let redirectSetTime = 0;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const maxAge = 300000; // 5 minutes - very long window for reliability
      
      console.log('[redirect/active] Checking for active redirect');
      
      // Check 1: Module-level variable (works if same function instance)
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
      
      // Check 2: Global redirect history (if available)
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
      
      // Check 3: Global redirect (if available)
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
      
      // Check 4: RedirectStore global (if available)
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
    // Set redirect - store in ALL possible locations
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
      
      // Store in module-level variable
      activeRedirect = redirectData;
      redirectSetTime = now;
      
      // Store in global state
      if (!global.globalRedirect) global.globalRedirect = {};
      if (!global.redirectStore) global.redirectStore = {};
      if (!global.redirectHistory) global.redirectHistory = [];
      
      global.globalRedirect = redirectData;
      global.redirectStore['global'] = redirectData;
      global.redirectHistory.push(redirectData);
      if (global.redirectHistory.length > 10) {
        global.redirectHistory.shift();
      }
      
      console.log('[redirect/active] ✅✅✅ REDIRECT SET IN ALL LOCATIONS ✅✅✅');
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

