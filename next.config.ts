/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_AUTH_URL: "https://6hb2lovzx6.execute-api.us-east-1.amazonaws.com/Prod/auth",
    NEXT_COMMENTS_URL: "https://6hb2lovzx6.execute-api.us-east-1.amazonaws.com/Prod/fetch-comments",
    NEXT_RAZORPAY_SRC: "https://checkout.razorpay.com/v1/payment-button.js",
    NEXT_RAZORPAY_BUTTON_ID: "pl_Q5KpbAz1ebleF7",
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