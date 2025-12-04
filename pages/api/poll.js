import { getActivities } from './shared-state';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const since = req.query.since || '0';
    const activities = getActivities();
    
    if (since === '0') {
      res.status(200).json(activities);
    } else {
      const newActivities = activities.filter(a => {
        const aTime = parseInt(a.id.match(/^\d+/)?.[0] || '0');
        const sinceTime = parseInt(since.match(/^\d+/)?.[0] || '0');
        return aTime > sinceTime || a.id > since;
      });
      res.status(200).json(newActivities);
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

