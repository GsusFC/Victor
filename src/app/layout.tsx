import type { Metadata } from "next";
import "./globals.css";
import { WebGPUErrorBoundary } from "@/components/error/ErrorBoundary";

export const metadata: Metadata = {
  title: "Victor - WebGPU Vector Field Animations",
  description: "Interactive vector field animations powered by WebGPU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <WebGPUErrorBoundary>
          {children}
        </WebGPUErrorBoundary>
      </body>
    </html>
  );
}
