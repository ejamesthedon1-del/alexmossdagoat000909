import { setApproval } from './kv-client';
import { broadcastToSSE } from './broadcast';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      
      console.log(`[approve] Received approval request for activity ${activityId}, redirectType: ${redirectType}`);
      
      if (!activityId) {
        return res.status(400).json({ error: 'activityId is required' });
      }
      
      const approval = {
        status: 'approved',
        redirectType: redirectType || 'password',
        timestamp: new Date().toISOString()
      };
      
      console.log(`[approve] Broadcasting approval for activity ${activityId}:`, approval);
      
      // Broadcast immediately to SSE (fastest path)
      broadcastToSSE({
        type: 'approval',
        activityId,
        data: approval
      });
      
      console.log(`[approve] Broadcast complete for activity ${activityId}`);
      
      // Store approval in KV in parallel (don't wait)
      setApproval(activityId, approval).catch(err => {
        console.error('[approve] Error storing approval in KV (non-blocking):', err);
      });
      
      console.log(`[approve] Approval sent successfully for activity ${activityId}, redirectType: ${approval.redirectType}`);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json({ success: true, approval });
    } catch (error) {
      console.error('[approve] Error in approve handler:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }
}

