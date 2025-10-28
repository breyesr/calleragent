"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import { api } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type ClientResponse = paths["/v1/clients/{client_id}"]["get"]["responses"][200]["content"]["application/json"];
type ClientUpdateBody = paths["/v1/clients/{client_id}"]["patch"]["requestBody"]["content"]["application/json"];

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const { token } = useToken();
  const isAuthenticated = Boolean(token);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, mounted, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (!Number.isFinite(clientId)) {
      setError("Invalid client id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadClient() {
      setLoading(true);
      setError(null);
      try {
        const data = await api<ClientResponse>(`/v1/clients/${clientId}`);
        if (!cancelled) {
          setName(data.name);
          setPhone(data.phone);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClient();
    return () => {
      cancelled = true;
    };
  }, [clientId, isAuthenticated, mounted]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    setSaving(true);
    try {
      await api<ClientResponse>(`/v1/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() } satisfies ClientUpdateBody),
      });
      setSuccess("Client updated successfully.");
      setTimeout(() => {
        router.push("/clients");
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <section className="card">
        <p className="py-6 text-sm text-neutral-400">Loading…</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="card">
        <p className="py-6 text-sm text-neutral-400">Redirecting…</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="card">
        <p className="py-6 text-sm text-neutral-400">Fetching client details…</p>
      </section>
    );
  }

  return (
    <section className="card space-y-4 max-w-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Edit client</h1>
          <p className="text-sm text-neutral-400">Update contact information for better outreach.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => router.push("/clients")}>
          Back to clients
        </Button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Phone
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </label>
        <Button type="submit" loading={saving} className="w-full md:w-auto">
          Save changes
        </Button>
      </form>
    </section>
  );
}
