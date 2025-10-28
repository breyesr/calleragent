"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useToken } from "@/lib/useToken";

export function HeaderNav() {
  const router = useRouter();
  const { token, clearToken } = useToken();
  const isAuthenticated = Boolean(token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <nav aria-hidden="true" className="h-6" />;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
      // ignore network errors during logout; local token will still be cleared
    }
    clearToken();
    router.push("/login");
  };

  return (
    <nav className="text-sm opacity-80 flex items-center gap-4">
      <a className="hover:underline" href="/dashboard">Dashboard</a>
      <a className="hover:underline" href="/clients">Clients</a>
      <a className="hover:underline" href="/appointments">Appointments</a>
      {isAuthenticated ? (
        <a className="hover:underline" href="/dashboard/whatsapp-test">
          WhatsApp Test
        </a>
      ) : null}
      <a className="hover:underline" href="/settings">Settings</a>
      {isAuthenticated ? (
        <button type="button" onClick={handleLogout} className="text-neutral-300 hover:underline focus:outline-none">
          Logout
        </button>
      ) : (
        <a className="hover:underline" href="/login">
          Login
        </a>
      )}
    </nav>
  );
}

export default HeaderNav;
