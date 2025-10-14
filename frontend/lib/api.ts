export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const parseJson = async () => {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  };

  if (!response.ok) {
    const payload = await parseJson();
    const detail = payload && typeof payload === "object" && "detail" in (payload as Record<string, unknown>) ? (payload as Record<string, unknown>).detail : null;
    const message = detail ? String(detail) : `API error ${response.status}`;
    throw new Error(message);
  }

  const data = await parseJson();
  if (data === null) {
    throw new Error("Invalid JSON payload received from API");
  }
  return data;
}
