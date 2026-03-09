import path from 'path';

const fsAliasAbsolute = path.join(process.cwd(), 'src/lib/fs-browser-fallback.js');
const fsAliasRelative = './src/lib/fs-browser-fallback.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'openapi-format-playground.vercel.app' }],
        destination: 'https://playground.openapi-format.com/:path*',
        permanent: true,
      },
    ];
  },
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      fs: fsAliasAbsolute,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      fs: fsAliasRelative,
    },
  },
};

export default nextConfig;
