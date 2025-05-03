// app/api/auth/[...nextauth]/authOptions.ts
import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
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
    async signIn() {
      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        try {
          const res = await axios.post(
            process.env.AUTH_URL as string,
            {
              name: user.name,
              email: user.email,
            }
          );

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
      if (token?.credits !== undefined) {
        session.user.credits = token.credits;
      }
      return session;
    },
  },
  secret: process.env.SECRET,
};
