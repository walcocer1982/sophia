import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocenteIA - Sistema Estable",
  description: "Sistema estable con Next.js y TypeScript",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
