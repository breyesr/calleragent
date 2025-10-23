"use client";

import { useState } from "react";
import type { AxiosError } from "axios";

import api from "@/lib/api";

const DEFAULT_PHONE = "+15551234567";
const DEFAULT_MESSAGE = "hello from stub";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function WhatsAppStubTestPage() {
  const [recipient, setRecipient] = useState<string>(DEFAULT_PHONE);
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string>("Idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setTaskId(null);
    setStatusLabel("Queued");

    try {
      const response = await api.post<{ task_id: string; status: string }>("/v1/messaging/whatsapp/send", {
        to: recipient,
        text: message.trim(),
      });

      const newTaskId = response.data.task_id;
      setTaskId(newTaskId);

      await pollTask(newTaskId);
    } catch (err) {
      setError(extractError(err));
      setStatusLabel("Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollTask = async (id: string) => {
    setStatusLabel("Pending");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await api.get(`/v1/tasks/result/${id}`);
        setResult(response.data);

        const state = response.data?.state as string | undefined;
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

      await sleep(1000);
    }

    setStatusLabel("Timeout");
    setError("Timed out waiting for task completion. Please try again.");
  };

  const statusColor = (() => {
    switch (statusLabel) {
      case "Success":
        return "bg-emerald-600 text-white";
      case "Failure":
      case "Error":
        return "bg-red-600 text-white";
      case "Queued":
      case "Pending":
        return "bg-amber-500 text-neutral-900";
      default:
        return "bg-neutral-800 text-neutral-300";
    }
  })();

  return (
    <section className="card space-y-6">
      <header>
        <h1 className="text-xl font-semibold">WhatsApp Stub Test</h1>
        <p className="opacity-80 text-sm">Send a message via the WhatsApp stub endpoint and monitor task progress.</p>
      </header>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium" htmlFor="whatsapp-recipient">
          Recipient
          <input
            id="whatsapp-recipient"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium" htmlFor="whatsapp-message">
          Message
          <textarea
            id="whatsapp-message"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none min-h-[96px]"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={handleSend}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">Status:</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
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
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const axiosErr = err as AxiosError<{ detail?: string }>;
    if (axiosErr.response) {
      if (axiosErr.response.status === 401) {
        return "Session expired. Please log in again to use the WhatsApp stub.";
      }
      const detail = axiosErr.response.data?.detail;
      if (detail) {
        return typeof detail === "string" ? detail : JSON.stringify(detail);
      }
      return axiosErr.response.statusText || "Request failed.";
    }
    return axiosErr.message || "Network error.";
  }

  if (err instanceof Error) return err.message;
  return "Request failed. Please try again.";
}
