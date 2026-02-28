import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loopzi — Build Consistency, Daily",
  description:
    "A free habit tracker that makes daily check-ins fast and streak tracking motivating.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
