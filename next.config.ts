import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Add serverComponentsExternalPackages for OpenTelemetry
  // to potentially resolve module resolution issues in Vercel build
  serverComponentsExternalPackages: [
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-jaeger',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
  ],
};

export default nextConfig;
