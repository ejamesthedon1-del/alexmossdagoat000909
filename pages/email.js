import Head from 'next/head';

export default function EmailPage() {
  return (
    <>
      <Head>
        <title>Email Verification</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Verify Your Email</h1>
        <p>Please enter your email address</p>
        <input 
          type="email" 
          placeholder="your@email.com"
          style={{
            padding: '12px',
            fontSize: '16px',
            marginTop: '20px',
            width: '300px',
            maxWidth: '100%'
          }}
        />
      </div>
    </>
  );
}

