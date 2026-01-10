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

  // Check for global redirect
  if (!global.globalRedirect || !global.globalRedirect.redirect) {
    console.log('[redirect/r/global] No global redirect found');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(404).json({ error: 'Redirect not found' });
  }

  const targetPath = global.globalRedirect.pagePath || '/';

  console.log('[redirect/r/global] Redirecting ALL users to:', targetPath);

  // Return 302 redirect
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Location', targetPath);
  res.status(302).end();
}

