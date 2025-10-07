import "./../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "AgentCaller", description: "Appointments automation" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-800">
          <div className="container flex items-center justify-between">
            <strong>AgentCaller</strong>
            <nav className="text-sm opacity-80">
              <a className="mr-4" href="/dashboard">Dashboard</a>
              <a className="mr-4" href="/clients">Clients</a>
              <a className="mr-4" href="/appointments">Appointments</a>
              <a className="mr-4" href="/settings">Settings</a>
              <a className="mr-0" href="/login">Login</a>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
