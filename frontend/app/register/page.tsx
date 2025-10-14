"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

import Button from "@/components/Button";
import Input from "@/components/Input";
import api from "@/lib/api";
import type { components } from "@/lib/api-types";

type UserOut = components["schemas"]["UserOut"];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await api.post<UserOut>("/v1/auth/register", { email, password });
      router.push("/login?registered=1");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = (err.response.data as Record<string, unknown>).detail;
        setError(typeof detail === "string" ? detail : "Unable to register.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to register.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card space-y-4 max-w-md">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="text-sm text-neutral-400">Register to access AgentCaller dashboards.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Email
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Password
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Register
        </Button>
      </form>
      <p className="text-xs text-neutral-500">
        Already have an account? <Link className="underline" href="/login">Log in</Link>.
      </p>
    </section>
  );
}
