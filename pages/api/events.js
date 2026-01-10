// SSE endpoint for monitoring panel
// Streams activities in real-time to connected clients

import { getRecentActivities, subscribeMemoryEvents } from './kv-client';
import { addSSEConnection, broadcastToSSE } from './broadcast';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');
  
  // Add this connection to SSE connections
  addSSEConnection(res);
  
  // Send recent activities on connect
  try {
    const recentActivities = await getRecentActivities();
    recentActivities.forEach(activity => {
      res.write(`data: ${JSON.stringify({ type: 'activity', data: activity })}\n\n`);
    });
  } catch (error) {
    console.error('Error sending recent activities:', error);
  }
  
  // Subscribe to memory events
  const unsubscribeMemory = subscribeMemoryEvents((data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error writing SSE message:', error);
    }
  });
  
  // Keep connection alive with heartbeat (more frequent to detect disconnections faster)
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeat);
      if (unsubscribeMemory) unsubscribeMemory();
      res.end();
    }
  }, 15000); // Every 15 seconds (faster detection)
  
  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    if (unsubscribeMemory) unsubscribeMemory();
    res.end();
  });
}

