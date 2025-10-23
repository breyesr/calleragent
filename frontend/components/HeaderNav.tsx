"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getStoredToken } from "@/lib/useToken";

type AuthState = "unknown" | "authenticated" | "guest";

const TOKEN_STORAGE_KEY = "token";
const TOKEN_EVENT = "auth-token";

export function HeaderNav() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("unknown");

  useEffect(() => {
    const syncAuth = () => {
      setAuthState(getStoredToken() ? "authenticated" : "guest");
    };

    if (typeof window !== "undefined") {
      syncAuth();
      window.addEventListener("storage", syncAuth);
      window.addEventListener(TOKEN_EVENT, syncAuth as EventListener);
      return () => {
        window.removeEventListener("storage", syncAuth);
        window.removeEventListener(TOKEN_EVENT, syncAuth as EventListener);
      };
    }

    return undefined;
  }, []);

  const handleLogout = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.dispatchEvent(new Event(TOKEN_EVENT));
    setAuthState("guest");
    router.push("/login");
  }, [router]);

  const showLogout = authState === "authenticated";
  const baseLinkClass = "hover:underline";
  const authLinkClass = "text-neutral-300 hover:underline focus:outline-none";

  return (
    <nav className="text-sm opacity-80 flex items-center gap-4">
      <Link className={baseLinkClass} href="/dashboard">Dashboard</Link>
      <Link className={baseLinkClass} href="/dashboard/whatsapp-test">WhatsApp Test</Link>
      <Link className={baseLinkClass} href="/clients">Clients</Link>
      <Link className={baseLinkClass} href="/appointments">Appointments</Link>
      <Link className={baseLinkClass} href="/settings">Settings</Link>
      <Link
        className={`${authLinkClass} ${showLogout ? "hidden" : ""}`}
        href="/login"
        data-auth="login"
      >
        Login
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className={`${authLinkClass} ${showLogout ? "" : "hidden"}`}
        data-auth="logout"
      >
        Logout
      </button>
    </nav>
  );
}

export default HeaderNav;
