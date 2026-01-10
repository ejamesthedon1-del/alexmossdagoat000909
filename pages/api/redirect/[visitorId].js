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
      
      // Check memory store - return redirect URL (not pagePath)
      if (global.redirectStore && global.redirectStore[visitorId]) {
        const redirect = global.redirectStore[visitorId];
        console.log('[redirect/get] Found redirect in memory:', redirect);
        // Return redirect URL pointing to /r/[visitorId] route (rewritten to /api/r/[visitorId])
        const response = {
          redirect: true,
          redirectType: redirect.redirectType,
          redirectUrl: redirect.redirectUrl || `/r/${visitorId}`,
          pagePath: redirect.pagePath
        };
        // Don't delete here - let /r/[visitorId] delete it
        return res.status(200).json(response);
      }
      
      console.log('[redirect/get] No redirect found for visitor:', visitorId);
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('Error getting redirect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

