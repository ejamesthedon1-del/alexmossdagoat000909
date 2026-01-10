// Check for redirect command for a visitor
import { getApproval } from '../kv-client';

const REDIRECT_PREFIX = 'redirect:';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { visitorId } = req.query;
      if (!visitorId) {
        return res.status(400).json({ error: 'Visitor ID required' });
      }
      
      // Check for redirect command
      // First check memory store (faster, always available)
      if (global.redirectStore && global.redirectStore[visitorId]) {
        const redirect = global.redirectStore[visitorId];
        delete global.redirectStore[visitorId];
        return res.status(200).json(redirect);
      }
      
      // Then check KV if available
      try {
        const kv = require('@vercel/kv').kv;
        if (kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
          const redirectData = await kv.get(`${REDIRECT_PREFIX}${visitorId}`);
          if (redirectData) {
            // Delete after reading
            await kv.del(`${REDIRECT_PREFIX}${visitorId}`);
            return res.status(200).json(JSON.parse(redirectData));
          }
        }
      } catch (error) {
        // Suppress "missing env vars" error - it's expected when KV isn't configured
        if (!error.message.includes('Missing required environment variables')) {
          console.warn('[redirect] KV check failed:', error.message);
        }
        // Already checked memory store above, so just continue
      }
      
      res.status(200).json({ redirect: false });
    } catch (error) {
      console.error('Error getting redirect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

