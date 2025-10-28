"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useToken } from "@/lib/useToken";

const BASE_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/appointments", label: "Appointments" },
  { href: "/settings", label: "Settings" },
];

const AUTHENTICATED_LINKS = [{ href: "/dashboard/whatsapp-test", label: "WhatsApp Test" }];

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
      {BASE_LINKS.map((link) => (
        <a key={link.href} className="hover:underline" href={link.href}>
          {link.label}
        </a>
      ))}
      {isAuthenticated
        ? AUTHENTICATED_LINKS.map((link) => (
            <a key={link.href} className="hover:underline" href={link.href}>
              {link.label}
            </a>
          ))
        : null}
      {isAuthenticated ? (
        <button type="button" onClick={handleLogout} className="text-neutral-300 hover:underline focus:outline-none">
          Logout
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <a className="hover:underline" href="/login">
            Login
          </a>
          <a className="hover:underline" href="/register">
            Create account
          </a>
        </div>
      )}
    </nav>
  );
}

export default HeaderNav;
