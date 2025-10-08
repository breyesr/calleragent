import type { paths } from "./api-types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ApiPath = keyof paths & string;

function resolveHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization") && typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return headers;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function api<T>(path: ApiPath | string, init: RequestInit = {}): Promise<T> {
  const headers = resolveHeaders(init);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const detail = payload && typeof payload === "object" && payload !== null && "detail" in payload ? String((payload as { detail: unknown }).detail) : null;
    throw new Error(detail || `API error ${response.status}`);
  }

  return payload as T;
}

