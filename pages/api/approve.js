import { setApproval } from './kv-client';
import { broadcastToSSE } from './broadcast';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { activityId, type, userId, redirectType } = req.body;
    
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
    
    res.status(200).json({ success: true, approval });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

