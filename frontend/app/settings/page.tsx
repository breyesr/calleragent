"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Select from "@/components/Select";
import { api } from "@/lib/api-client";
import type { components } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type CalendarEvent = components["schemas"]["Event"];
type EventsResponse = components["schemas"]["EventsResponse"];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const params = new URLSearchParams({ max_results: maxResults });
      const data = await api<EventsResponse>(`/v1/calendar/events?${params.toString()}`);
      setEvents(data.items);
      setLastSync(new Date().toISOString());
    } catch (err) {
      setEvents([]);
      setEventsError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingEvents(false);
    }
  }, [maxResults]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
      return <p className="text-sm text-neutral-400">No events returned from the stub endpoint.</p>;
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
    const connected = events.length > 0;
    return {
      label: connected ? "Connected (stub)" : "Not connected",
      className: connected ? "bg-emerald-400/10 text-emerald-300" : "bg-neutral-800 text-neutral-200",
    };
  }, [events]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-neutral-900 bg-neutral-950/60 p-4 text-sm text-neutral-400">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Home / Settings / <span className="text-neutral-200">Google Calendar</span>
        </p>
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Google Calendar integration</h1>
          <p>Connect Google Calendar to let AgentCaller sync appointments and reminders.</p>
        </div>
        <Button type="button" className="w-full max-w-xs" variant="secondary">
          Connect with Google
        </Button>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-400">Integration details</p>
            <h2 className="text-lg font-semibold">Status overview</h2>
            <p className="text-sm text-neutral-400">
              We&apos;re currently using the deterministic calendar stub documented in <span className="font-mono text-neutral-300">docs/calendar_stub.md</span>. Replace
              this connection with OAuth once Google API credentials are ready.
            </p>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-100">Status</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${connectionStatus.className}`}>{connectionStatus.label}</span>
            </div>
            <dl className="mt-3 space-y-1 text-xs text-neutral-400">
              <div className="flex items-center justify-between gap-3">
                <dt>API base</dt>
                <dd className="text-neutral-200">{API_BASE}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Endpoint</dt>
                <dd className="text-neutral-200">/v1/calendar/events</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Last sync</dt>
                <dd className="text-neutral-200">{lastSync ? new Date(lastSync).toLocaleString() : "Never"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Preview upcoming events</h2>
            <p className="text-sm text-neutral-400">Fetch a limited set of events to confirm credentials and response format.</p>
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
        <h2 className="text-lg font-semibold">Next steps for Google Calendar OAuth</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-400">
          <li>Create a Google Cloud project with Calendar API enabled and download OAuth credentials.</li>
          <li>Add a backend endpoint that exchanges the OAuth code for tokens and stores refresh tokens per operator.</li>
          <li>Replace the stub fetch in this page with an authenticated request once real data is available.</li>
          <li>Extend the WhatsApp workflow to send reminders based on synced events.</li>
        </ul>
      </div>
    </section>
  );
}
