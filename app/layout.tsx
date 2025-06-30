import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SupabaseProvider } from '@/contexts/SupabaseContext'
import { AuthProvider } from '@/contexts/AuthContext'
import PendingSharesNotification from '@/components/PendingSharesNotification'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import PostHogProvider from '@/components/PostHogProvider'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClickMemory",
  description: "Store and manage your text snippets with ease",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <PostHogProvider>
            <SupabaseProvider>
              <AuthProvider>
                <PendingSharesNotification />
                {children}
              </AuthProvider>
            </SupabaseProvider>
          </PostHogProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
