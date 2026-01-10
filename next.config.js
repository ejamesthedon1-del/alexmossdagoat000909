/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/r/:visitorId',
        destination: '/api/r/:visitorId',
      },
    ];
  },
};

module.exports = nextConfig;

