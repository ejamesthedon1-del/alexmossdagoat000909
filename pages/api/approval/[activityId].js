import { getApproval } from '../kv-client';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { activityId } = req.query;
      if (!activityId) {
        return res.status(400).json({ error: 'Activity ID required' });
      }
      
      const approval = await getApproval(activityId);
      res.status(200).json(approval || { status: 'pending' });
    } catch (error) {
      console.error('Error getting approval:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

