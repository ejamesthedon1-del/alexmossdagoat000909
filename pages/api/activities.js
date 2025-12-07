// API endpoint to fetch all stored activities
import { getRecentActivities } from './kv-client';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[activities] Fetching recent activities...');
    const activities = await getRecentActivities();
    console.log(`[activities] Retrieved ${activities.length} activities`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache'); // Prevent caching
    res.status(200).json({ success: true, activities, count: activities.length });
  } catch (error) {
    console.error('[activities] Error fetching activities:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

