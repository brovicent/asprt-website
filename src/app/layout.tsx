import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "ASPRT - Premium Downloads",
  description: "Your premium movie and series download platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex-1 flex flex-col w-full">
            {children}
          </div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
