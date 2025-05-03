/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_COMMENTS_URL: "https://6hb2lovzx6.execute-api.us-east-1.amazonaws.com/Prod/fetch-comments",
    NEXT_AUTH_URL: ""
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      },
    ],
  },
}

module.exports = nextConfig