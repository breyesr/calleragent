"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/Button";
import Select from "@/components/Select";
import { api } from "@/lib/api-client";
import type { components } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type CalendarEvent = components["schemas"]["Event"];
type EventsResponse = components["schemas"]["EventsResponse"];

type GoogleStatus = {
  connected: boolean;
  account_email: string | null;
  last_synced_at: string | null;
  provider: "google" | "stub";
};

type GoogleStartResponse = {
  authorization_url: string;
  state: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const STATUS_BADGES: Record<string, string> = {
  connected: "bg-emerald-500/20 text-emerald-300",
  stub: "bg-neutral-800 text-neutral-300",
};

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Request failed";
}

export default function SettingsPage() {
  const router = useRouter();
  const { token } = useToken();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  if (!mounted) {
    return <p>Loading…</p>;
  }

  if (!token) {
    return <p>Redirecting…</p>;
  }

  return <SettingsInner />;
}

function SettingsInner() {
  const [maxResults, setMaxResults] = useState("5");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [previewSync, setPreviewSync] = useState<string | null>(null);

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const googleResult = searchParams?.get("google");

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const data = await api<GoogleStatus>("/v1/integrations/google/status");
      setGoogleStatus(data);
    } catch (err) {
      setStatusError(extractError(err));
      setGoogleStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const params = new URLSearchParams({ max_results: maxResults });
      const data = await api<EventsResponse>(`/v1/calendar/events?${params.toString()}`);
      setEvents(data.items);
      setPreviewSync(new Date().toISOString());
    } catch (err) {
      setEvents([]);
      setEventsError(extractError(err));
    } finally {
      setLoadingEvents(false);
    }
  }, [maxResults]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleConnect = useCallback(async () => {
    setConnectError(null);
    setConnecting(true);
    try {
      const data = await api<GoogleStartResponse>("/v1/integrations/google/start", { method: "POST" });
      window.location.href = data.authorization_url;
    } catch (err) {
      setConnectError(extractError(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const eventsPreview = useMemo(() => {
    if (loadingEvents) {
      return <p className="text-sm text-neutral-400">Loading calendar preview…</p>;
    }
    if (eventsError) {
      return (
        <p className="text-sm text-red-400">
          Couldn&apos;t load events. {eventsError}. Verify the backend is reachable and you&apos;re authenticated.
        </p>
      );
    }
    if (events.length === 0) {
      return <p className="text-sm text-neutral-400">No events returned from the endpoint.</p>;
    }
    return (
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-md border border-neutral-800 bg-neutral-900/40 p-3">
            <p className="font-medium">{event.summary}</p>
            <p className="text-xs text-neutral-400">
              {new Date(event.start).toLocaleString()} → {new Date(event.end).toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">{event.location}</p>
          </li>
        ))}
      </ul>
    );
  }, [events, eventsError, loadingEvents]);

  const connectionStatus = useMemo(() => {
    if (googleStatus?.connected && googleStatus.provider === "google") {
      return { label: "Connected via Google", className: STATUS_BADGES.connected };
    }
    return { label: "Using stub", className: STATUS_BADGES.stub };
  }, [googleStatus]);

  const providerText = googleStatus?.provider === "google" ? "Google Calendar" : "Stubbed calendar";

  return (
    <section className="space-y-6">
      <div className="card space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-blue-400">Google Calendar</p>
          <h1 className="text-2xl font-semibold text-neutral-50">Integrate your Google Calendar</h1>
          <p className="text-sm text-neutral-400">Connect to sync appointments and let WhatsApp reminders stay aligned with your real availability.</p>
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
          <p className="text-sm text-neutral-300">Connect your Google Workspace or personal calendar. After consent, we securely store encrypted tokens so only this account can access your data.</p>
          {connectError ? <p className="text-sm text-red-400">{connectError}</p> : null}
          <Button type="button" className="w-full max-w-xs" variant="secondary" onClick={handleConnect} disabled={statusLoading || connecting} loading={connecting}>
            Connect with Google
          </Button>
          {googleResult === "success" ? <p className="text-xs text-emerald-400">Google Calendar connected. Upcoming previews will use Google data when available.</p> : null}
          {googleResult === "error" ? <p className="text-xs text-red-400">Unable to finish the OAuth handshake. Please try again.</p> : null}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-400">Integration details</p>
            <h2 className="text-lg font-semibold">Status overview</h2>
            <p className="text-sm text-neutral-400">
              We attempt to load events from Google first and gracefully fall back to the deterministic stub ({" "}
              <span className="font-mono text-neutral-300">docs/calendar_stub.md</span>) if something fails.
            </p>
            {statusError ? <p className="text-sm text-red-400">{statusError}</p> : null}
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-100">Status</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${connectionStatus.className}`}>{connectionStatus.label}</span>
            </div>
            <dl className="mt-1 space-y-1 text-xs text-neutral-400">
              <div className="flex items-center justify-between gap-3">
                <dt>Provider</dt>
                <dd className="text-neutral-200">{providerText}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Account</dt>
                <dd className="text-neutral-200">{googleStatus?.account_email ?? "Not connected"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Endpoint</dt>
                <dd className="text-neutral-200">{API_BASE}/v1/calendar/events</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Google last sync</dt>
                <dd className="text-neutral-200">
                  {googleStatus?.last_synced_at ? new Date(googleStatus.last_synced_at).toLocaleString() : "Pending"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Preview fetched</dt>
                <dd className="text-neutral-200">{previewSync ? new Date(previewSync).toLocaleString() : "Never"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Preview upcoming events</h2>
            <p className="text-sm text-neutral-400">This preview uses whichever provider is currently available ({providerText}).</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="max-results">
              Preview range
            </label>
            <Select id="max-results" value={maxResults} onChange={(event) => setMaxResults(event.target.value)} className="md:w-36">
              <option value="3">Next 3 events</option>
              <option value="5">Next 5 events</option>
              <option value="10">Next 10 events</option>
            </Select>
            <Button type="button" variant="secondary" onClick={fetchEvents} loading={loadingEvents}>
              Refresh preview
            </Button>
          </div>
        </div>
        {eventsPreview}
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-400">
          <li>Load this page over HTTPS + a public callback URL so Google can reach <code>/v1/integrations/google/callback</code>.</li>
          <li>Add your Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.) to the backend environment.</li>
          <li>After connecting, events served by <code>/v1/calendar/events</code> will originate from Google, and we will fall back to the stub automatically.</li>
          <li>WhatsApp automations can later read these synced events to send reminders.</li>
        </ul>
      </div>
    </section>
  );
}
