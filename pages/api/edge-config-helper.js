// Helper for Edge Config operations
// Edge Config provides ultra-fast reads (< 1ms) but writes must go through REST API

let edgeConfigGet = null;
try {
  const edgeConfig = require('@vercel/edge-config');
  edgeConfigGet = edgeConfig.get;
} catch (error) {
  console.warn('[edge-config-helper] Edge Config not available:', error.message);
}

/**
 * Read redirect data from Edge Config (ultra-fast, < 1ms)
 */
async function getRedirectFromEdgeConfig() {
  if (!edgeConfigGet || !process.env.EDGE_CONFIG) {
    return null;
  }

  try {
    // Edge Config get() function - reads from EDGE_CONFIG connection string
    const redirectData = await edgeConfigGet('redirect_global');
    if (redirectData) {
      // Edge Config returns strings for JSON values, so parse if needed
      const parsed = typeof redirectData === 'string' ? JSON.parse(redirectData) : redirectData;
      // Validate it has required fields
      if (parsed && parsed.redirect && parsed.timestampMs) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[edge-config-helper] Edge Config read error:', error.message);
  }
  return null;
}

/**
 * Write redirect data to Edge Config via REST API
 * Note: This requires VERCEL_TOKEN and EDGE_CONFIG_ID environment variables
 */
async function setRedirectToEdgeConfig(redirectData) {
  // Edge Config writes must go through REST API
  // We'll use KV as primary write storage and Edge Config for reads
  // OR we can use the REST API if credentials are available
  
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const vercelToken = process.env.VERCEL_TOKEN;
  
  if (!edgeConfigId || !vercelToken) {
    console.warn('[edge-config-helper] Edge Config write credentials not available');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'upsert',
              key: 'redirect_global',
              value: JSON.stringify(redirectData),
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[edge-config-helper] Edge Config write failed:', errorText);
      return false;
    }

    console.log('[edge-config-helper] ✅✅✅ STORED IN EDGE CONFIG ✅✅✅');
    return true;
  } catch (error) {
    console.error('[edge-config-helper] Edge Config write error:', error.message);
    return false;
  }
}

// Export for CommonJS require()
module.exports = {
  getRedirectFromEdgeConfig,
  setRedirectToEdgeConfig
};

