"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";

import Button from "@/components/Button";
import { getStoredToken } from "@/lib/useToken";

type StartResponse = { auth_url: string };
type StatusResponse = { connected: boolean; email?: string };

export default function Page() {
  const searchParams = useSearchParams();
  const showConnectedToast = useMemo(() => searchParams?.get("google") === "connected", [searchParams]);

  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  const apiBase = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, ""), []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatusLoading(false);
      return;
    }

    (async () => {
      try {
        const response = await axios.get<StatusResponse>(`${apiBase}/v1/integrations/google/calendar/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.connected && response.data.email) {
          setConnectedEmail(response.data.email);
        } else {
          setConnectedEmail(null);
        }
      } catch (err) {
        console.error(err);
        setStatusError("No se pudo consultar el estado de Google Calendar.");
      } finally {
        setStatusLoading(false);
      }
    })();
  }, [apiBase]);

  const handleConnect = useCallback(async () => {
    setError(null);
    const token = getStoredToken();
    if (!token) {
      setError("No se pudo iniciar la conexión con Google Calendar.");
      return;
    }

    setLoading(true);
    try {
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
  }, [apiBase]);

  const handleDisconnect = useCallback(() => {
    console.log("TODO: desconectar Google Calendar");
  }, []);

  const connected = Boolean(connectedEmail);

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
          {showConnectedToast ? (
            <p className="text-sm text-emerald-400">Google Calendar conectado correctamente.</p>
          ) : null}
        </div>
        <div className="space-y-2 text-sm text-neutral-300">
          {statusLoading ? (
            <p className="text-neutral-400">Consultando estado...</p>
          ) : connected ? (
            <p>Conectado como {connectedEmail}</p>
          ) : (
            <p>No conectado</p>
          )}
          {statusError ? <p className="text-red-400">{statusError}</p> : null}
        </div>
        {!connected ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={handleConnect} loading={loading} className="w-full sm:w-auto">
              Conectar Google Calendar
            </Button>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={handleDisconnect} variant="secondary" className="w-full sm:w-auto">
              Desconectar Google Calendar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
