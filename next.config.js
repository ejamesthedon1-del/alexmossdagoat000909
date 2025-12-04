/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/link',
        destination: '/link.html',
      },
    ];
  },
}

module.exports = nextConfig
