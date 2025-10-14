import { describe, expect, it } from "vitest";

import api, { API_BASE } from "./api";

describe("axios api client", () => {
  it("uses the configured base URL", () => {
    expect(API_BASE).toBe(process.env.NEXT_PUBLIC_API_URL ?? "");
    expect(api.defaults.baseURL).toBe(API_BASE);
  });
});
