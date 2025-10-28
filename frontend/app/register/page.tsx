"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import { api } from "@/lib/api-client";
import type { components } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type TokenResponse = components["schemas"]["Token"];

export default function RegisterPage() {
  const router = useRouter();
  const { setToken } = useToken();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError("Email and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setLoading(true);
    try {
      await api("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const loginResponse = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        router.push("/login?registered=1");
        return;
      }

      const token = (await loginResponse.json()) as TokenResponse;
      setToken(token.access_token);
      router.push("/clients");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card space-y-4 max-w-md">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="text-sm text-neutral-400">Register to manage your clients, appointments, and WhatsApp flows.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Email
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Password
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Confirm password
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
      <p className="text-xs text-neutral-500">
        Already have an account?{" "}
        <a className="hover:underline" href="/login">
          Sign in
        </a>
        .
      </p>
    </section>
  );
}
