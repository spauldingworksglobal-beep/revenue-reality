/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@revenue-reality/domain", "@revenue-reality/revenue-engine", "@revenue-reality/validation"],
};

export default nextConfig;
