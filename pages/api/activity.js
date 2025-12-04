// Store activities in memory (use database in production)
let activities = [];
let approvals = {};

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { type, userId, additionalData } = req.body;
    
    const activity = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      userId,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    activities.unshift(activity);
    activities = activities.slice(0, 100);
    
    res.status(200).json({ success: true, activity });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

