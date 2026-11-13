import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Movie Memory", template: "%s · Movie Memory" },
  description: "Tell us your favorite movie. Get a fun fact about it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
