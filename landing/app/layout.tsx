import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hearless — Приложение для глухих и слабослышащих",
  description:
    "Hearless помогает глухим и слабослышащим людям распознавать звуки, речь и жестовый язык с помощью ИИ.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
