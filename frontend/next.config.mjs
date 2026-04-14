/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'hopeinternational.uk'
          }
        ],
        destination: 'https://www.hopeinternational.uk/:path*',
        permanent: true
      }
    ];
  }
};

export default nextConfig;
