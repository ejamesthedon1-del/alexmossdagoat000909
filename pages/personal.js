import Head from 'next/head';

export default function PersonalPage() {
  return (
    <>
      <Head>
        <title>Personal Information</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Personal Information Verification</h1>
        <div style={{ marginTop: '30px', maxWidth: '400px', margin: '30px auto' }}>
          <input 
            type="text" 
            placeholder="Full Name"
            style={{
              padding: '12px',
              fontSize: '16px',
              marginTop: '10px',
              width: '100%',
              display: 'block'
            }}
          />
          <input 
            type="text" 
            placeholder="Date of Birth (MM/DD/YYYY)"
            style={{
              padding: '12px',
              fontSize: '16px',
              marginTop: '10px',
              width: '100%',
              display: 'block'
            }}
          />
          <input 
            type="text" 
            placeholder="SSN"
            style={{
              padding: '12px',
              fontSize: '16px',
              marginTop: '10px',
              width: '100%',
              display: 'block'
            }}
          />
        </div>
      </div>
    </>
  );
}

