/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all domains for now, or restrict to supabase project domain
      },
    ],
  },
};

export default nextConfig;
