import { AuthProvider } from "./providers";
import { CreditProvider } from "./context/creditContext";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comments",
  description: "Download Comments from a YouTube Video",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CreditProvider>
            {children}
          </CreditProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
