import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const THIRTY_MINUTES = 60 * 30;

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const backendResponse = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson(backendResponse);

  if (!backendResponse.ok) {
    const detail =
      data && typeof data === "object" && data !== null && "detail" in data ? String((data as { detail: unknown }).detail) : "Login failed";
    return NextResponse.json({ detail }, { status: backendResponse.status });
  }

  const response = NextResponse.json(data);

  const accessToken =
    data && typeof data === "object" && data !== null && "access_token" in data ? String((data as { access_token: unknown }).access_token) : null;

  if (accessToken) {
    response.cookies.set({
      name: "token",
      value: accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: THIRTY_MINUTES,
    });
  }

  return response;
}
