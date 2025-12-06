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
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await api<{ id: number; email: string }>("/v1/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setSuccessMessage("Account created successfully! You can now log in.");
        setEmail("");
        setPassword("");
        setIsRegisterMode(false);
      } else {
        const response = await api<TokenResponse>("/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setToken(response.access_token);
        setEmail("");
        setPassword("");
        router.push("/clients");
      }
    } catch (err) {
      console.error("Registration/Login error:", err);
      const errorMessage = err instanceof Error ? err.message : typeof err === "object" ? JSON.stringify(err) : String(err);
      setError(errorMessage);
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
        <h1 className="text-xl font-semibold">{isRegisterMode ? "Create account" : "Sign in"}</h1>
        <p className="text-sm text-neutral-400">
          {isRegisterMode
            ? "Create a new account to get started."
            : "Use your email and password to access protected actions."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Email
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete={isRegisterMode ? "email" : "email"}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Password
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete={isRegisterMode ? "new-password" : "current-password"}
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {successMessage ? <p className="text-sm text-green-400">{successMessage}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          {isRegisterMode ? "Create account" : "Log in"}
        </Button>
      </form>
      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(!isRegisterMode);
            setError(null);
            setSuccessMessage(null);
          }}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isRegisterMode ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>
      </div>
    </section>
  );
}
