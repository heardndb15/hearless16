import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "../components/Providers";

export const metadata: Metadata = {
  title: "Hearless — AI-платформа для глухих и слабослышащих",
  description:
    "Hearless переводит речь в текст, распознаёт звуки, учит жестовому языку с помощью ИИ. Первая AI-платформа в Казахстане и Центральной Азии.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
