"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import api from "@/lib/api";
import type { components } from "@/lib/api-types";
import { clearToken, getToken } from "@/lib/auth";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let active = true;

    api
      .get<components["schemas"]["UserOut"]>("/v1/auth/me")
      .then(() => {
        if (active) {
          setChecking(false);
        }
      })
      .catch((error) => {
        if (!active) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearToken();
        }
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <section className="card">
        <p className="text-sm text-neutral-400">Verifying session…</p>
      </section>
    );
  }

  return <>{children}</>;
}
