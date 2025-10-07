import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { API_BASE, api } from "./api";

const originalFetch = global.fetch;

beforeAll(() => {
  Object.defineProperty(global, "fetch", {
    writable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("api helper", () => {
  it("requests JSON and returns parsed payload", async () => {
    const payload = { message: "ok" };
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    const result = await api<typeof payload>("/status");

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/status`, expect.objectContaining({ method: undefined }));
    const options = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(options.cache).toBe("no-store");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(result).toEqual(payload);
  });

  it("throws on non-ok responses", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(api("/boom")).rejects.toThrowError("API error 500");
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});
