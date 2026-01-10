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
      console.log('[redirect/get] global.globalRedirect exists:', !!global.globalRedirect);
      console.log('[redirect/get] global.redirectStore exists:', !!global.redirectStore);
      
      // FIRST: Check global redirect stored in redirectStore
      if (global.redirectStore && global.redirectStore['global']) {
        const globalRedirect = global.redirectStore['global'];
        console.log('[redirect/get] ✅✅✅ GLOBAL REDIRECT FOUND (from redirectStore) ✅✅✅');
        console.log('[redirect/get] Redirect data:', JSON.stringify(globalRedirect, null, 2));
        return res.status(200).json({
          redirect: true,
          redirectType: globalRedirect.redirectType,
          redirectUrl: globalRedirect.redirectUrl || '/r/global',
          pagePath: globalRedirect.pagePath
        });
      }
      
      // SECOND: Check global redirect (direct)
      if (global.globalRedirect && global.globalRedirect.redirect) {
        console.log('[redirect/get] ✅✅✅ GLOBAL REDIRECT FOUND (direct) ✅✅✅');
        return res.status(200).json({
          redirect: true,
          redirectType: global.globalRedirect.redirectType,
          redirectUrl: global.globalRedirect.redirectUrl || '/r/global',
          pagePath: global.globalRedirect.pagePath
        });
      }
      
      // THIRD: Check visitor-specific redirect
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

