import "./../styles/globals.css";
import type { ReactNode } from "react";

import dynamic from "next/dynamic";

const HeaderNav = dynamic(() => import("@/components/HeaderNav"), { ssr: false });

export const metadata = { title: "AgentCaller", description: "Appointments automation" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-800">
          <div className="container flex items-center justify-between">
            <strong>AgentCaller</strong>
            <HeaderNav />
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
