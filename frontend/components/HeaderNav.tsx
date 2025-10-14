"use client";

import Link from "next/link";
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
    <nav className="flex items-center gap-4 text-sm opacity-80">
      <Link className="hover:underline" href="/dashboard">Dashboard</Link>
      <Link className="hover:underline" href="/clients">Clients</Link>
      <Link className="hover:underline" href="/appointments">Appointments</Link>
      <Link className="hover:underline" href="/settings">Settings</Link>
      {isAuthenticated ? (
        <button type="button" onClick={handleLogout} className="text-neutral-300 hover:underline focus:outline-none">
          Logout
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <Link className="hover:underline" href="/login">Login</Link>
          <Link className="hover:underline" href="/register">Register</Link>
        </div>
      )}
    </nav>
  );
}

export default HeaderNav;
