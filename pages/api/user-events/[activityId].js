// SSE endpoint for user waiting for approval
// Streams approval/denial events for a specific activity

import { getApproval, subscribeMemoryEvents } from '../kv-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { activityId } = req.query;

  if (!activityId) {
    return res.status(400).json({ error: 'Activity ID required' });
  }

  console.log(`[user-events] 🔌 New SSE connection for activity ${activityId}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Send initial connection message first
  res.write('data: {"type":"connected"}\n\n');
  console.log(`[user-events] ✅ Sent connected message to activity ${activityId}`);
  
  // Check for existing approval (in case approval happened before SSE connection)
  const existingApproval = await getApproval(activityId);
  if (existingApproval) {
    console.log(`[user-events] 📦 Found existing approval for activity ${activityId}:`, existingApproval);
    res.write(`data: ${JSON.stringify({ type: 'approval', data: existingApproval })}\n\n`);
    res.end();
    return;
  }
  
  console.log(`[user-events] 👂 No existing approval for activity ${activityId}, subscribing for updates...`);
  
  // Subscribe to memory events for this activity
  console.log(`[user-events] 💾 Using memory subscription for activity ${activityId}`);
  const unsubscribeMemory = subscribeMemoryEvents((data) => {
    try {
      console.log(`[user-events] 📨 Received memory event for activity ${activityId}:`, data);
      console.log(`[user-events] Event type: ${data.type}, Event activityId: ${data.activityId}`);
      
      if (data.type === 'approval' && data.activityId === activityId) {
        console.log(`[user-events] ✅ MATCH! Sending approval to user for activity ${activityId}`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        console.log(`[user-events] 📤 Approval sent to user, closing connection`);
        res.end();
        if (unsubscribeMemory) unsubscribeMemory();
      } else {
        console.log(`[user-events] ⏭️ Skipping - not matching (expected activity: ${activityId})`);
      }
    } catch (error) {
      console.error('[user-events] ❌ Error writing SSE message:', error);
    }
  });
  console.log(`[user-events] ✅ Subscribed to memory events for activity ${activityId}`);
  
  // Keep connection alive with heartbeat (more frequent)
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
    console.log(`[user-events] 🔌 Client disconnected for activity ${activityId}`);
    clearInterval(heartbeat);
    if (unsubscribeMemory) unsubscribeMemory();
    res.end();
  });
}

