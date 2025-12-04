import Head from 'next/head';

export default function OTPPage() {
  return (
    <>
      <Head>
        <title>OTP Verification</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Enter OTP Code</h1>
        <p>Please enter the 6-digit code sent to your device</p>
        <input 
          type="text" 
          placeholder="000000" 
          maxLength="6"
          style={{
            padding: '12px',
            fontSize: '18px',
            textAlign: 'center',
            letterSpacing: '8px',
            marginTop: '20px',
            width: '200px'
          }}
        />
      </div>
    </>
  );
}

