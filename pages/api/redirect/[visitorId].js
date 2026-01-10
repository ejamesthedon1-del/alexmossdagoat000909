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
      
      // FIRST: Check global redirect (for ALL users)
      if (global.globalRedirect && global.globalRedirect.redirect) {
        console.log('[redirect/get] ✅ GLOBAL REDIRECT FOUND - redirecting ALL users');
        const response = {
          redirect: true,
          redirectType: global.globalRedirect.redirectType,
          redirectUrl: global.globalRedirect.redirectUrl || '/r/global',
          pagePath: global.globalRedirect.pagePath
        };
        return res.status(200).json(response);
      }
      
      // SECOND: Check visitor-specific redirect
      if (global.redirectStore && global.redirectStore[visitorId]) {
        const redirect = global.redirectStore[visitorId];
        console.log('[redirect/get] ✅ Found visitor-specific redirect');
        const response = {
          redirect: true,
          redirectType: redirect.redirectType,
          redirectUrl: redirect.redirectUrl || `/r/${visitorId}`,
          pagePath: redirect.pagePath
        };
        return res.status(200).json(response);
      }
      
      console.log('[redirect/get] No redirect found');
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('Error getting redirect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

