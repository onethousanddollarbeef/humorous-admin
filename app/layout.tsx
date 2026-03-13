import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Humor Admin",
  description: "Superadmin-only area for user/profile and image management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
