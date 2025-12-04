import { setApproval } from './shared-state';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { activityId, type, userId, redirectType } = req.body;
    
    const approval = {
      status: 'approved',
      redirectType: redirectType || 'password',
      timestamp: new Date().toISOString()
    };
    
    setApproval(activityId, approval);
    
    res.status(200).json({ success: true, approval });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

