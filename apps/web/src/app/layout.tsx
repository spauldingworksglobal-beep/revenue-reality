import type { Metadata } from "next";
import { LifeRealityProvider } from "@/lib/life-store";
import { NowProvider } from "@/lib/now-store";
import { NextProvider } from "@/lib/next-store";
import { UltimatelyProvider } from "@/lib/ultimately-store";
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
          <NowProvider>
            <NextProvider>
              <UltimatelyProvider>{children}</UltimatelyProvider>
            </NextProvider>
          </NowProvider>
        </LifeRealityProvider>
      </body>
    </html>
  );
}
