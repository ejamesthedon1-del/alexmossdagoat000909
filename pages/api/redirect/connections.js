// Shared redirect SSE connections store
// This module maintains the connection map across API routes

export const redirectConnections = new Map();

export function addRedirectConnection(visitorId, res) {
  if (!redirectConnections.has(visitorId)) {
    redirectConnections.set(visitorId, new Set());
  }
  redirectConnections.get(visitorId).add(res);
  
  // Remove connection when client disconnects
  res.on('close', () => {
    const connections = redirectConnections.get(visitorId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        redirectConnections.delete(visitorId);
      }
    }
  });
}

export function broadcastRedirect(visitorId, redirectData) {
  console.log('[broadcastRedirect] Broadcasting redirect for visitor:', visitorId);
  console.log('[broadcastRedirect] Active connections:', Array.from(redirectConnections.keys()));
  
  const connections = redirectConnections.get(visitorId);
  if (connections) {
    console.log('[broadcastRedirect] Found', connections.size, 'connection(s) for visitor', visitorId);
    const message = `data: ${JSON.stringify(redirectData)}\n\n`;
    connections.forEach(res => {
      try {
        console.log('[broadcastRedirect] Sending redirect message to connection');
        res.write(message);
        res.end();
      } catch (error) {
        console.error('[broadcastRedirect] Error sending to connection:', error);
        connections.delete(res);
      }
    });
    redirectConnections.delete(visitorId);
    console.log('[broadcastRedirect] Redirect broadcast complete');
  } else {
    console.warn('[broadcastRedirect] No active connections found for visitor:', visitorId);
    console.log('[broadcastRedirect] Available visitor IDs:', Array.from(redirectConnections.keys()));
  }
}

