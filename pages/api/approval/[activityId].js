import { getApproval } from '../shared-state';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { activityId } = req.query;
    const approval = getApproval(activityId) || { status: 'pending' };
    res.status(200).json(approval);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

