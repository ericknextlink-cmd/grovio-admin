import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Grovio - Grocery Store Management",
  description: "Comprehensive grocery store management solution with advanced admin dashboard",
  keywords: ["grocery", "admin", "dashboard", "inventory", "management"],
  authors: [{ name: "Grovio Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster position="top-left" richColors />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
