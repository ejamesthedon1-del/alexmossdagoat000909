// Simple redirect check endpoint - returns global redirect if available
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('[redirect/check] Checking for global redirect');
      console.log('[redirect/check] global.globalRedirect exists:', !!global.globalRedirect);
      
      // Check global redirect
      if (global.globalRedirect && global.globalRedirect.redirect) {
        console.log('[redirect/check] ✅ GLOBAL REDIRECT FOUND:', global.globalRedirect);
        return res.status(200).json({
          redirect: true,
          redirectType: global.globalRedirect.redirectType,
          redirectUrl: global.globalRedirect.redirectUrl || '/r/global',
          pagePath: global.globalRedirect.pagePath
        });
      }
      
      console.log('[redirect/check] No global redirect found');
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('[redirect/check] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

