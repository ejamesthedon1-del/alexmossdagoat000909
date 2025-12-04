let approvals = {};

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { activityId } = req.body;
    
    approvals[activityId] = {
      status: 'denied',
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json({ success: true, approval: approvals[activityId] });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

