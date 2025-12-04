// API endpoint to fetch all stored activities
import { getRecentActivities } from './kv-client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const activities = await getRecentActivities();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

