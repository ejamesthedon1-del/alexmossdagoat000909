// Redirect route - immediately returns 302 redirect with no caching
// This route is called by the client after receiving redirect command via SSE or polling
// Accessible at /api/r/[visitorId]

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { visitorId } = req.query;

  if (!visitorId) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(400).json({ error: 'Visitor ID required' });
  }

  console.log('[redirect/r] Processing redirect for visitor:', visitorId);

  // Check memory store for redirect command
  if (!global.redirectStore || !global.redirectStore[visitorId]) {
    console.log('[redirect/r] No redirect found for visitor:', visitorId);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(404).json({ error: 'Redirect not found' });
  }

  const redirectData = global.redirectStore[visitorId];
  const targetPath = redirectData.pagePath || '/';

  console.log('[redirect/r] Redirecting visitor:', visitorId, 'to:', targetPath);

  // Delete redirect from store after reading (one-time use)
  delete global.redirectStore[visitorId];

  // Return 302 redirect with no caching headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Location', targetPath);
  res.status(302).end();
}

