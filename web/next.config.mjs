/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  // Use standalone output for optimal Railway deployment
  output: 'standalone',
  // Custom build ID for cache busting
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors (hackathon mode)
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // Proxy API requests to backend server running on port 8081
    const apiPort = process.env.API_PORT || '8081';
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${apiPort}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

export default nextConfig;
