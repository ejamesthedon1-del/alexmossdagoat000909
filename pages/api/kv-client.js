// Vercel KV client wrapper
// Only stores metadata (activity IDs, status) - NEVER credentials

let kv;
try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.warn('Vercel KV not available, using in-memory fallback');
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
const ACTIVITY_META_PREFIX = 'activity-meta:';

// Store activity metadata (NOT credentials) with 5 minute TTL
export async function publishActivity(activity) {
  try {
    // Only store metadata, never credentials
    const metadata = {
      id: activity.id,
      type: activity.type,
      timestamp: activity.timestamp,
      // userId is stored but password is NEVER stored
      userId: activity.userId,
      hasPassword: activity.hasPassword || false
    };
    
    if (kv) {
      // Store metadata with 5 minute TTL
      await kv.setex(
        `${ACTIVITY_META_PREFIX}${activity.id}`,
        300, // 5 minutes
        JSON.stringify(metadata)
      );
      
      // Publish to channel for real-time subscribers
      await kv.publish(ACTIVITY_CHANNEL, JSON.stringify({
        type: 'activity',
        data: activity // Full activity for SSE (exists only in memory)
      }));
    } else {
      // Fallback: store in memory
      memoryStore.activities.unshift(activity);
      memoryStore.activities = memoryStore.activities.slice(0, 100);
      
      // Notify subscribers
      memoryStore.subscribers.forEach(callback => {
        callback({
          type: 'activity',
          data: activity
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error publishing activity:', error);
    // Fallback to memory on error
    memoryStore.activities.unshift(activity);
    memoryStore.activities = memoryStore.activities.slice(0, 100);
    return true;
  }
}

// Store approval decision (activity ID + status only)
export async function setApproval(activityId, approval) {
  try {
    const approvalData = {
      status: approval.status,
      redirectType: approval.redirectType || null,
      timestamp: approval.timestamp
    };
    
    if (kv) {
      // Store approval with 10 minute TTL
      await kv.setex(
        `${APPROVAL_PREFIX}${activityId}`,
        600, // 10 minutes
        JSON.stringify(approvalData)
      );
      
      // Publish approval event
      await kv.publish(ACTIVITY_CHANNEL, JSON.stringify({
        type: 'approval',
        activityId,
        data: approvalData
      }));
    } else {
      // Fallback: store in memory
      memoryStore.approvals[activityId] = approvalData;
      
      // Notify subscribers
      memoryStore.subscribers.forEach(callback => {
        callback({
          type: 'approval',
          activityId,
          data: approvalData
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error setting approval:', error);
    // Fallback to memory on error
    memoryStore.approvals[activityId] = approvalData;
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

// Get recent activity metadata (for initial load)
export async function getRecentActivities() {
  try {
    if (kv) {
      // Get last 50 activity IDs from a list
      const keys = await kv.keys(`${ACTIVITY_META_PREFIX}*`);
      const activities = [];
      
      for (const key of keys.slice(0, 50)) {
        const data = await kv.get(key);
        if (data) {
          activities.push(JSON.parse(data));
        }
      }
      
      // Sort by timestamp descending
      return activities.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    } else {
      // Fallback: return from memory
      return memoryStore.activities.slice(0, 50);
    }
  } catch (error) {
    console.error('Error getting recent activities:', error);
    // Fallback to memory on error
    return memoryStore.activities.slice(0, 50);
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

