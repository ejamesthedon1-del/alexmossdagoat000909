// SSE endpoint for user waiting for approval
// Streams approval/denial events for a specific activity

import { getApproval } from '../kv-client';

let kv;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  kv = null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { activityId } = req.query;

  if (!activityId) {
    return res.status(400).json({ error: 'Activity ID required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Check for existing approval
  const existingApproval = await getApproval(activityId);
  if (existingApproval) {
    res.write(`data: ${JSON.stringify({ type: 'approval', data: existingApproval })}\n\n`);
    res.end();
    return;
  }
  
  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');
  
  let subscriber = null;
  let unsubscribeMemory = null;
  
  // Subscribe to approval events for this activity
  if (kv) {
    try {
      subscriber = kv.duplicate();
      await subscriber.subscribe('activities', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'approval' && data.activityId === activityId) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            res.end();
            subscriber.unsubscribe('activities');
          }
        } catch (error) {
          console.error('Error parsing pub/sub message:', error);
        }
      });
    } catch (error) {
      console.error('Error subscribing to KV:', error);
    }
  } else {
    // Fallback: use memory subscription
    const { subscribeMemoryEvents } = require('../kv-client');
    unsubscribeMemory = subscribeMemoryEvents((data) => {
      try {
        if (data.type === 'approval' && data.activityId === activityId) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          res.end();
          if (unsubscribeMemory) unsubscribeMemory();
        }
      } catch (error) {
        console.error('Error writing SSE message:', error);
      }
    });
  }
  
  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeat);
      if (subscriber) subscriber.unsubscribe('activities');
      if (unsubscribeMemory) unsubscribeMemory();
      res.end();
    }
  }, 30000);
  
  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    if (subscriber) subscriber.unsubscribe('activities');
    if (unsubscribeMemory) unsubscribeMemory();
    res.end();
  });
}

