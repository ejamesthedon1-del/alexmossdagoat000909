let approvals = {};

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { activityId, type, userId, redirectType } = req.body;
    
    approvals[activityId] = {
      status: 'approved',
      redirectType: redirectType || 'password',
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json({ success: true, approval: approvals[activityId] });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

