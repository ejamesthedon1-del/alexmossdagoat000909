// Debug endpoint to check redirect store status
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { visitorId } = req.query;
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        memoryStoreKeys: global.redirectStore ? Object.keys(global.redirectStore) : [],
        memoryStoreSize: global.redirectStore ? Object.keys(global.redirectStore).length : 0
      };
      
      if (visitorId) {
        debugInfo.visitorId = visitorId;
        debugInfo.foundInMemory = !!(global.redirectStore && global.redirectStore[visitorId]);
        if (debugInfo.foundInMemory) {
          debugInfo.redirectData = global.redirectStore[visitorId];
        }
      }
      
      res.status(200).json(debugInfo);
    } catch (error) {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

