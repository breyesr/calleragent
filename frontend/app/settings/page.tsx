"use client";

import { useCallback, useState } from "react";
import axios from "axios";

import Button from "@/components/Button";
import { getStoredToken } from "@/lib/useToken";

type StartResponse = { auth_url: string };

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    const token = getStoredToken();
    if (!token) {
      setError("No se pudo iniciar la conexión con Google Calendar.");
      return;
    }

    setLoading(true);
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
      const response = await axios.get<StartResponse>(
        `${apiBase}/v1/integrations/google/calendar/oauth/start`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const authUrl = response.data?.auth_url;
      if (!authUrl) {
        throw new Error("Sin URL de autorización");
      }
      window.location.href = authUrl;
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar la conexión con Google Calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="card space-y-5">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Configuración</h1>
        <p className="opacity-80">Gestiona tus ajustes de cuenta e integraciones.</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 shadow-sm space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Integraciones</h2>
          <p className="text-sm text-neutral-400">Conecta tu Google Calendar para sincronizar tus eventos.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={handleConnect} loading={loading} className="w-full sm:w-auto">
            Conectar Google Calendar
          </Button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
