"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

import Button from "@/components/Button";
import Input from "@/components/Input";
import api from "@/lib/api";
import type { components } from "@/lib/api-types";
import { clearToken, getToken, setToken } from "@/lib/auth";

type TokenResponse = components["schemas"]["Token"];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [existingToken, setExistingToken] = useState<string | null>(null);

  useEffect(() => {
    setExistingToken(getToken());
  }, []);

  useEffect(() => {
    if (searchParams?.get("registered")) {
      setNotice("Registration successful. Please sign in.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (existingToken) {
      router.replace("/dashboard");
    }
  }, [existingToken, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<TokenResponse>("/v1/auth/login", { email, password });
      setToken(response.data.access_token);
      setEmail("");
      setPassword("");
      router.push("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = (err.response.data as Record<string, unknown>).detail;
        setError(typeof detail === "string" ? detail : "Unable to log in.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setExistingToken(null);
  };

  if (existingToken) {
    return (
      <section className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold">You are logged in</h1>
          <p className="text-sm text-neutral-400">Redirecting you to the dashboard…</p>
        </div>
        <Button type="button" variant="secondary" onClick={handleLogout} className="w-full md:w-auto">
          Log out
        </Button>
      </section>
    );
  }

  return (
    <section className="card space-y-4 max-w-md">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-400">Use your email and password to access AgentCaller.</p>
      </div>
      {notice ? <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p> : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Email
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Password
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Log in
        </Button>
      </form>
      <p className="text-xs text-neutral-500">
        Need an account? <Link className="underline" href="/register">Register here</Link>.
      </p>
    </section>
  );
}
