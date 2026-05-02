import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AgentCourt - AI Agent Arbitration Dashboard",
  description: "The Legal Infrastructure for the AI Agent Economy. Real-time TEE-attested execution monitoring and decentralized dispute resolution on 0G.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
