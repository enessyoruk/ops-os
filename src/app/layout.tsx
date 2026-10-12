import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "./providers";

export const metadata: Metadata = {
  title: "Venola | Yeni Nesil İşletim Sistemi",
  description: "Modüler, ölçeklenebilir işletme yönetim platformu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
