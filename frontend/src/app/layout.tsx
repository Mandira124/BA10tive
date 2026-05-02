import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attentive - Learn by Watching",
  description: "Turn YouTube videos into interactive learning experiences with attention-check quizzes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
