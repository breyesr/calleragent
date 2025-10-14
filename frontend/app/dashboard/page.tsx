"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import Button from "@/components/Button";
import RequireAuth from "@/components/RequireAuth";
import ApiStatus from "@/components/ApiStatus";
import api from "@/lib/api";
import type { components } from "@/lib/api-types";
import { clearToken } from "@/lib/auth";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const router = useRouter();
  const [user, setUser] = useState<components["schemas"]["UserOut"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    api
      .get<components["schemas"]["UserOut"]>("/v1/auth/me")
      .then((response) => {
        if (active) setUser(response.data);
      })
      .catch((err) => {
        if (!active) return;
        if (axios.isAxiosError(err) && err.response?.data) {
          const detail = (err.response.data as Record<string, unknown>).detail;
          setError(typeof detail === "string" ? detail : "Unable to load profile.");
        } else {
          setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <section className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <ApiStatus />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {user ? (
          <div className="space-y-2">
            <p className="text-sm text-neutral-300">Signed in as</p>
            <p className="text-lg font-semibold">{user.email}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Loading account…</p>
        )}
        <Button type="button" variant="secondary" onClick={handleLogout} className="w-full md:w-auto">
          Log out
        </Button>
      </div>
    </section>
  );
}
