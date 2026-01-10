// SSE endpoint for instant redirect notifications (LISTENER ONLY - never redirects)
// Streams redirect URLs to the browser - client redirects to /r/[visitorId]

import { addRedirectConnection, redirectConnections } from '../connections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { visitorId } = req.query;
    
    if (!visitorId) {
      return res.status(400).json({ error: 'Visitor ID required' });
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');
    
    // Add this connection
    console.log('[redirect/stream] Adding SSE connection for visitor:', visitorId);
    addRedirectConnection(visitorId, res);
    console.log('[redirect/stream] Connection added. Total connections:', redirectConnections.size);
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (error) {
        clearInterval(keepAlive);
      }
    }, 30000);
    
    // Cleanup on close
    req.on('close', () => {
      clearInterval(keepAlive);
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

