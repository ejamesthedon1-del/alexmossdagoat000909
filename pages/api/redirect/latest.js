// Return latest redirect if it's recent (less than 60 seconds old)
// This works across stateless function invocations by checking timestamp
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const maxAge = 60000; // 60 seconds
      
      console.log('[redirect/latest] Checking for recent redirects');
      console.log('[redirect/latest] Current time (ms):', now);
      
      // Check redirect history first (most reliable)
      if (global.redirectHistory && global.redirectHistory.length > 0) {
        // Get most recent redirect
        const latestRedirect = global.redirectHistory[global.redirectHistory.length - 1];
        const redirectAge = now - (latestRedirect.timestampMs || 0);
        
        console.log('[redirect/latest] Latest redirect age (ms):', redirectAge);
        
        if (redirectAge < maxAge && latestRedirect.redirect) {
          console.log('[redirect/latest] ✅ Found recent redirect:', latestRedirect.pagePath);
          return res.status(200).json({
            redirect: true,
            redirectType: latestRedirect.redirectType,
            redirectUrl: latestRedirect.redirectUrl || '/r/global',
            pagePath: latestRedirect.pagePath,
            timestamp: latestRedirect.timestamp,
            age: redirectAge
          });
        } else {
          console.log('[redirect/latest] Latest redirect too old:', redirectAge, 'ms');
        }
      }
      
      // Fallback: Check global redirect
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
      
      // Fallback: Check redirectStore
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

