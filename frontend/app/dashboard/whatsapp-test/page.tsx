"use client";

import { useCallback, useMemo, useState } from "react";
import type { AxiosError } from "axios";

import api from "@/lib/api";
import { getStoredToken } from "@/lib/useToken";

const DEFAULT_PHONE = "+15551234567";
const DEFAULT_MESSAGE = "hello from stub";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

type StatusLabel = "Idle" | "Queued" | "Polling" | "Success" | "Failure" | "Error" | "Timeout";

const STATUS_CLASSES: Record<StatusLabel, string> = {
  Idle: "bg-neutral-800 text-neutral-300",
  Queued: "bg-amber-500 text-neutral-900",
  Polling: "bg-blue-600 text-white",
  Success: "bg-emerald-600 text-white",
  Failure: "bg-red-600 text-white",
  Error: "bg-red-600 text-white",
  Timeout: "bg-amber-700 text-neutral-100",
};

type TaskResponse = {
  task_id: string;
  status: string;
};

type TaskResult = {
  state?: string;
  result?: {
    provider?: string;
    status?: string;
    to?: string;
    message?: string;
  } | null;
};

function extractError(err: unknown): string {
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const axiosErr = err as AxiosError<{ detail?: string }>;
    const detail = axiosErr.response?.data?.detail;
    if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail);
    if (axiosErr.response) return axiosErr.response.statusText || `Request failed (${axiosErr.response.status})`;
    return axiosErr.message || "Network error";
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

export default function WhatsAppStubTestPage() {
  const [recipient, setRecipient] = useState(DEFAULT_PHONE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [statusLabel, setStatusLabel] = useState<StatusLabel>("Idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendDisabled = useMemo(() => submitting || !recipient.trim() || !message.trim(), [message, recipient, submitting]);

  const pollTask = useCallback(async (id: string, token: string) => {
    setStatusLabel("Polling");
    setResult(null);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await api.get<TaskResult>(`${API_BASE}/v1/tasks/result/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResult(response.data);

        const state = response.data?.state;
        if (state === "SUCCESS") {
          setStatusLabel("Success");
          return;
        }
        if (state === "FAILURE") {
          setStatusLabel("Failure");
          return;
        }
      } catch (err) {
        setError(extractError(err));
        setStatusLabel("Error");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setStatusLabel("Timeout");
    setError("Timed out waiting for task completion. Please try again.");
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setResult(null);
      setTaskId(null);

      if (!API_BASE) {
        setError("NEXT_PUBLIC_API_BASE_URL is not configured.");
        return;
      }

      const token = getStoredToken();
      if (!token) {
        setError("Please log in to use the WhatsApp stub.");
        return;
      }

      setSubmitting(true);
      setStatusLabel("Queued");

      try {
        const response = await api.post<TaskResponse>(
          `${API_BASE}/v1/messaging/whatsapp/send`,
          { to: recipient.trim(), text: message.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const id = response.data.task_id;
        setTaskId(id);
        await pollTask(id, token);
      } catch (err) {
        setError(extractError(err));
        setStatusLabel("Error");
      } finally {
        setSubmitting(false);
      }
    },
    [message, pollTask, recipient]
  );

  const statusClass = STATUS_CLASSES[statusLabel];

  return (
    <section className="card space-y-6">
      <header>
        <h1 className="text-xl font-semibold">WhatsApp Stub Test</h1>
        <p className="opacity-80 text-sm">Send a stub message and monitor the Celery pipeline locally.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          To
          <input
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="+15551234567"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Message
          <textarea
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none min-h-[96px]"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
          disabled={sendDisabled}
        >
          {submitting ? "Sending..." : "Send"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">Status:</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
        {taskId ? <span className="text-xs opacity-70">Task ID: {taskId}</span> : null}
      </div>

      {error ? <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      {result ? (
        <pre className="overflow-x-auto rounded-md border border-neutral-700 bg-neutral-950 p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
