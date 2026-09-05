import type { Metadata } from "next";
import { LifeRealityProvider } from "@/lib/life-store";
import { NowProvider } from "@/lib/now-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revenue Reality",
  description: "Life Reality — Spaulding Works / Works Tools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">
        <LifeRealityProvider>
          <NowProvider>{children}</NowProvider>
        </LifeRealityProvider>
      </body>
    </html>
  );
}
