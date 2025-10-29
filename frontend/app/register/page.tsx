"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import { useToken } from "@/lib/useToken";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const { setToken } = useToken();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const registerResponse = await fetch(`${API_BASE}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() ? name.trim() : undefined,
        }),
      });

      if (!registerResponse.ok) {
        const payload = (await registerResponse.json().catch(() => null)) as { detail?: string } | null;
        const detail = payload?.detail ?? "Registration failed.";
        setError(detail);
        setSubmitting(false);
        return;
      }

      const loginResponse = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        setError("Account created. Please sign in manually.");
        setSubmitting(false);
        router.replace("/login");
        return;
      }

      const loginData = (await loginResponse.json()) as { access_token?: string };
      if (!loginData.access_token) {
        setError("Login failed after registration.");
        setSubmitting(false);
        router.replace("/login");
        return;
      }

      setToken(loginData.access_token);
      router.replace("/clients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setSubmitting(false);
    }
  };

  return (
    <section className="card space-y-4 max-w-md">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="text-sm text-neutral-400">Register to manage clients and appointments.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Name <span className="text-neutral-500 text-xs">(optional)</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Email
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Password
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button type="submit" loading={submitting} className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-xs text-neutral-500">
        Already have an account?{" "}
        <Link className="hover:underline" href="/login">
          Login
        </Link>
        .
      </p>
    </section>
  );
}
