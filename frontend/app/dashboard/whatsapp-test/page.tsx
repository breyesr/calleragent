"use client";

import { useState } from "react";
import type { AxiosError } from "axios";

import api from "@/lib/api";

type TaskState = "idle" | "queued" | "pending" | "success" | "failure";

const DEFAULT_PHONE = "+15551234567";
const DEFAULT_MESSAGE = "hello from stub";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function WhatsAppStubTestPage() {
  const [to, setTo] = useState<string>(DEFAULT_PHONE);
  const [text, setText] = useState<string>(DEFAULT_MESSAGE);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskState>("idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setError(null);
    setResult(null);
    setTaskId(null);
    setStatus("idle");
    setIsSending(true);

    try {
      const response = await api.post<{ task_id: string; status: string }>("/v1/messaging/whatsapp/send", {
        to,
        text,
      });

      setTaskId(response.data.task_id);
      setStatus("queued");

      await pollStatus(response.data.task_id);
    } catch (err) {
      const message = extractError(err);
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const pollStatus = async (id: string) => {
    setStatus("pending");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const res = await api.get(`/v1/tasks/result/${id}`);
        setResult(res.data);

        const state = res.data?.state as string | undefined;
        if (state === "SUCCESS") {
          setStatus("success");
          return;
        }
        if (state === "FAILURE") {
          setStatus("failure");
          return;
        }
      } catch (err) {
        setError(extractError(err));
        setStatus("failure");
        return;
      }

      await sleep(1000);
    }

    setStatus("failure");
    setError("Timed out waiting for task completion. Please try again.");
  };

  const statusLabel = (() => {
    switch (status) {
      case "queued":
        return "Queued";
      case "pending":
        return "Pending";
      case "success":
        return "Success";
      case "failure":
        return "Failure";
      default:
        return "Idle";
    }
  })();

  return (
    <section className="card space-y-6">
      <header>
        <h1 className="text-xl font-semibold">WhatsApp Stub Test</h1>
        <p className="opacity-80 text-sm">
          Send a message through the backend WhatsApp stub. Requires an active session (JWT).
        </p>
      </header>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="whatsapp-to">Recipient</label>
          <input
            id="whatsapp-to"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="whatsapp-text">Message</label>
          <textarea
            id="whatsapp-text"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none min-h-[96px]"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">Status:</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "success"
              ? "bg-emerald-600 text-white"
              : status === "failure"
                ? "bg-red-600 text-white"
                : status === "pending" || status === "queued"
                  ? "bg-amber-500 text-neutral-900"
                  : "bg-neutral-800 text-neutral-300"
          }`}
        >
          {statusLabel}
        </span>
        {taskId ? <span className="text-xs opacity-70">Task ID: {taskId}</span> : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <pre className="overflow-x-auto rounded-md border border-neutral-700 bg-neutral-950 p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}

function extractError(err: unknown): string {
  if (typeof window !== "undefined" && err instanceof Error) {
    // Axios attaches isAxiosError
    const axiosErr = err as AxiosError<{ detail?: string }>;
    if (axiosErr.response) {
      if (axiosErr.response.status === 401) {
        return "Session expired. Please log in again to use the WhatsApp stub.";
      }
      const detail = axiosErr.response.data?.detail;
      if (typeof detail === "string") {
        return detail;
      }
    } else if (axiosErr.message) {
      return axiosErr.message;
    }
  }
  return "Request failed. Please try again.";
}
