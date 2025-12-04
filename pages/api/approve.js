import { setApproval } from './kv-client';
import { broadcastToSSE } from './broadcast';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { activityId, type, userId, redirectType } = req.body;
      
      if (!activityId) {
        return res.status(400).json({ error: 'activityId is required' });
      }
      
      const approval = {
        status: 'approved',
        redirectType: redirectType || 'password',
        timestamp: new Date().toISOString()
      };
      
      // Store approval in KV (this will publish to KV pub/sub channel)
      await setApproval(activityId, approval);
      
      // Also broadcast to monitoring panel SSE connections
      broadcastToSSE({
        type: 'approval',
        activityId,
        data: approval
      });
      
      console.log(`Approval sent for activity ${activityId}, redirectType: ${approval.redirectType}`);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json({ success: true, approval });
    } catch (error) {
      console.error('Error in approve handler:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }
}

