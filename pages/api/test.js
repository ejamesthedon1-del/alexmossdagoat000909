import { getActivities } from './shared-state';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const activities = getActivities();
    res.status(200).json({
      status: 'ok',
      message: 'Server is running',
      activityCount: activities.length,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

