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
      try {
        const kv = require('@vercel/kv').kv;
        if (kv) {
          const redirectData = await kv.get(`${REDIRECT_PREFIX}${visitorId}`);
          if (redirectData) {
            // Delete after reading
            await kv.del(`${REDIRECT_PREFIX}${visitorId}`);
            return res.status(200).json(JSON.parse(redirectData));
          }
        }
      } catch (error) {
        // Fallback to memory store
        if (global.redirectStore && global.redirectStore[visitorId]) {
          const redirect = global.redirectStore[visitorId];
          delete global.redirectStore[visitorId];
          return res.status(200).json(redirect);
        }
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

