import { addActivity } from './shared-state';

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
    
    const savedActivity = addActivity(activity);
    
    res.status(200).json({ success: true, activity: savedActivity });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

