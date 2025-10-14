"use client";

import { useEffect, useState } from "react";

import api from "@/lib/api";

export function ApiStatus() {
  const [status, setStatus] = useState<"unknown" | "up" | "down">("unknown");

  useEffect(() => {
    let active = true;

    api
      .get("/healthz")
      .then(() => {
        if (active) setStatus("up");
      })
      .catch(() => {
        if (active) setStatus("down");
      });

    return () => {
      active = false;
    };
  }, []);

  const colour = status === "up" ? "text-emerald-300" : status === "down" ? "text-red-400" : "text-neutral-400";
  const label = status === "up" ? "API: up" : status === "down" ? "API: down" : "API: checking";

  return <span className={`text-xs font-medium ${colour}`}>{label}</span>;
}

export default ApiStatus;
