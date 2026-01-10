// Custom App component to serve static HTML files
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

