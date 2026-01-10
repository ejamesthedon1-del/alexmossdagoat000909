// Global redirect route - redirects ALL users
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[redirect/r/global] Processing global redirect');

  // Check for global redirect in multiple locations
  let redirectData = null;
  
  // Check 1: Module-level from active endpoint
  try {
    const activeModule = require('../redirect/active');
    // Can't directly access module variables, so check global state
  } catch (e) {}
  
  // Check 2: Global redirect history
  if (global.redirectHistory && global.redirectHistory.length > 0) {
    const latest = global.redirectHistory[global.redirectHistory.length - 1];
    const age = Date.now() - (latest.timestampMs || 0);
    if (age < 300000 && latest.redirect) { // 5 minutes
      redirectData = latest;
    }
  }
  
  // Check 3: Global redirect
  if (!redirectData && global.globalRedirect && global.globalRedirect.redirect) {
    const age = Date.now() - (global.globalRedirect.timestampMs || 0);
    if (age < 300000) {
      redirectData = global.globalRedirect;
    }
  }
  
  // Check 4: RedirectStore
  if (!redirectData && global.redirectStore && global.redirectStore['global']) {
    const globalRedirect = global.redirectStore['global'];
    const age = Date.now() - (globalRedirect.timestampMs || 0);
    if (age < 300000 && globalRedirect.redirect) {
      redirectData = globalRedirect;
    }
  }
  
  if (!redirectData) {
    console.log('[redirect/r/global] No global redirect found');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(404).json({ error: 'Redirect not found' });
  }

  const targetPath = redirectData.pagePath || '/';

  console.log('[redirect/r/global] Redirecting ALL users to:', targetPath);

  // Return 302 redirect
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Location', targetPath);
  res.status(302).end();
}

