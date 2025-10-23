"use client";

import { useRouter } from "next/navigation";

import { useToken } from "@/lib/useToken";

export function HeaderNav() {
  const router = useRouter();
  const { token, clearToken } = useToken();
  const isAuthenticated = Boolean(token);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <nav className="text-sm opacity-80 flex items-center gap-4">
      <a className="hover:underline" href="/dashboard">Dashboard</a>
      <a className="hover:underline" href="/dashboard/whatsapp-test">WhatsApp Test</a>
      <a className="hover:underline" href="/clients">Clients</a>
      <a className="hover:underline" href="/appointments">Appointments</a>
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
