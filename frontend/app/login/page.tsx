"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import { api } from "@/lib/api-client";
import type { components } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type TokenResponse = components["schemas"]["Token"];

export default function LoginPage() {
  const router = useRouter();
  const { token, setToken, clearToken } = useToken();
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
      const response = await api<TokenResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(response.access_token);
      setEmail("");
      setPassword("");
      router.push("/clients");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setEmail("");
    setPassword("");
  };

  if (token) {
    return (
      <section className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold">You are logged in</h1>
          <p className="text-sm text-neutral-400">Use the navigation to manage clients or appointments.</p>
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
        <p className="text-sm text-neutral-400">Use your email and password to access protected actions.</p>
      </div>
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
        Need an account? Use the API (or `make backend-shell`) to run `POST /v1/auth/register` once, then log in here.
      </p>
    </section>
  );
}
