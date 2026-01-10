// Check for redirect command for a visitor
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { visitorId } = req.query;
      if (!visitorId) {
        return res.status(400).json({ error: 'Visitor ID required' });
      }
      
      console.log('[redirect/get] Checking redirect for visitor:', visitorId);
      
      // FIRST: Check redirect history (most recent, works across function instances)
      if (global.redirectHistory && global.redirectHistory.length > 0) {
        const latestRedirect = global.redirectHistory[global.redirectHistory.length - 1];
        const now = Date.now();
        const redirectAge = now - (latestRedirect.timestampMs || 0);
        
        if (redirectAge < 60000 && latestRedirect.redirect) { // Less than 60 seconds old
          console.log('[redirect/get] ✅✅✅ FOUND RECENT REDIRECT FROM HISTORY ✅✅✅');
          console.log('[redirect/get] Age:', redirectAge, 'ms');
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

