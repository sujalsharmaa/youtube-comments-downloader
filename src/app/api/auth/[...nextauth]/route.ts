// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import axios from "axios";

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      // ✅ You don't need to handle credits here anymore
      return true;
    },
    async jwt({ token, account, user }) {
      // 🔥 When user logs in, fetch credits from your backend
      if (account && user) {
        try {
          const res = await axios.post(
            process.env.AUTH_URL as string,
            {
              name: user.name,
              email: user.email,
            }
          );

          // 🪄 Add credits into token
          if (res?.data?.credits !== undefined) {
            token.credits = res.data.credits;
          }
        } catch (error) {
          console.error("Error fetching credits:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // ✅ Expose credits inside session
      if (token?.credits !== undefined) {
        session.user.credits = token.credits;
      }
      return session;
    },
  },
  secret: process.env.SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
