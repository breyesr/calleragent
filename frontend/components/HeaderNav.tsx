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

export function HeaderNav() {
  const router = useRouter();
  const { token, clearToken } = useToken();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  if (!mounted) {
    return <nav aria-hidden="true" className="h-6" />;
  }

  const isAuthenticated = Boolean(token);

  return (
    <nav className="flex items-center gap-4 text-sm opacity-80">
      {BASE_LINKS.map((link) => (
        <a key={link.href} className="hover:underline" href={link.href}>
          {link.label}
        </a>
      ))}
      {isAuthenticated ? (
        <a className="hover:underline" href="/dashboard/whatsapp-test">
          WhatsApp Test
        </a>
      ) : null}
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
