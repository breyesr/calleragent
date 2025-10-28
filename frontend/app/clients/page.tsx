"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api-client";
import Button from "@/components/Button";
import Input from "@/components/Input";
import type { paths } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type CreateClientBody = paths["/v1/clients"]["post"]["requestBody"]["content"]["application/json"];
type CreateClientResponse = paths["/v1/clients"]["post"]["responses"][201]["content"]["application/json"];
type ClientsResponse = paths["/v1/clients"]["get"]["responses"][200]["content"]["application/json"];
type Client = ClientsResponse[number];

const SEARCH_DEBOUNCE_MS = 300;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { token } = useToken();
  const isAuthenticated = Boolean(token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const searchParam = debouncedQuery ? `?${new URLSearchParams({ q: debouncedQuery }).toString()}` : "";
        const data = await api<ClientsResponse>(`/v1/clients${searchParam}`);
        if (!cancelled) {
          setClients(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setClients([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, refreshKey]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formName.trim() || !formPhone.trim()) {
      setFormError("Name and phone are required.");
      return;
    }

    if (!isAuthenticated) {
      setFormError("Please log in to create clients.");
      return;
    }

    setSubmitting(true);
    try {
      await api<CreateClientResponse>("/v1/clients", {
        method: "POST",
        body: JSON.stringify({ name: formName.trim(), phone: formPhone.trim() } satisfies CreateClientBody),
      });
      setFormSuccess("Client added successfully.");
      setFormName("");
      setFormPhone("");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const tableContent = useMemo(() => {
    if (loading) {
      return <p className="py-6 text-sm text-neutral-400">Loading clients…</p>;
    }

    if (error) {
      return <p className="py-6 text-sm text-red-400">{error}</p>;
    }

    if (clients.length === 0) {
      return <p className="py-6 text-sm text-neutral-400">No clients found.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-neutral-900">
                <td className="px-3 py-2 text-neutral-400">{client.id}</td>
                <td className="px-3 py-2">{client.name}</td>
                <td className="px-3 py-2">{client.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [clients, error, loading]);

  if (!mounted) {
    return (
      <section className="space-y-6">
        <div className="card">
          <p className="py-6 text-sm text-neutral-400">Loading…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Clients</h1>
            <p className="text-sm text-neutral-400">Manage the contacts your agents will assist.</p>
          </div>
          <Input
            placeholder="Search clients…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="md:w-64"
            aria-label="Search clients"
          />
        </div>
        {tableContent}
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Add client</h2>
          <p className="text-sm text-neutral-400">New clients appear instantly in the list above.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Name
              <Input value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Jane Doe" required />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Phone
              <Input
                value={formPhone}
                onChange={(event) => setFormPhone(event.target.value)}
                placeholder="+1 (555) 555-1234"
                required
              />
            </label>
          </div>

          {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
          {formSuccess ? <p className="text-sm text-emerald-400">{formSuccess}</p> : null}

          <Button type="submit" loading={submitting} className="w-full md:w-auto" disabled={!isAuthenticated}>
            {isAuthenticated ? "Add client" : "Login required"}
          </Button>
        </form>
      </div>
      {!isAuthenticated ? (
        <p className="text-xs text-neutral-500">Sign in to add or update clients.</p>
      ) : null}
    </section>
  );
}
