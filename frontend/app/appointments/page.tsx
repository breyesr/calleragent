"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { api } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

type ClientsResponse = paths["/v1/clients"]["get"]["responses"][200]["content"]["application/json"];
type Client = ClientsResponse[number];
type AppointmentsResponse = paths["/v1/appointments"]["get"]["responses"][200]["content"]["application/json"];
type Appointment = AppointmentsResponse[number];
type AppointmentCreateBody = paths["/v1/appointments"]["post"]["requestBody"]["content"]["application/json"];
type AppointmentCreateResponse = paths["/v1/appointments"]["post"]["responses"][201]["content"]["application/json"];
type AppointmentUpdateBody = paths["/v1/appointments/{appointment_id}"]["patch"]["requestBody"]["content"]["application/json"];
type AppointmentUpdateResponse = paths["/v1/appointments/{appointment_id}"]["patch"]["responses"][200]["content"]["application/json"];

const toDateTimeLocal = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoString = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date.toISOString();
};

export default function AppointmentsPage() {
  const router = useRouter();
  const { token } = useToken();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  if (!mounted) {
    return <p>Loading…</p>;
  }

  if (!token) {
    return <p>Redirecting…</p>;
  }

  return <AppointmentsInner isAuthenticated={Boolean(token)} />;
}

function AppointmentsInner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [createClientId, setCreateClientId] = useState("");
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createEndsAt, setCreateEndsAt] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadClients() {
      try {
        const data = await api<ClientsResponse>("/v1/clients");
        if (!cancelled) {
          setClients(data);
        }
      } catch (err) {
        if (!cancelled) {
          setClientsError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    loadClients();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAppointments() {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      try {
        const data = await api<AppointmentsResponse>("/v1/appointments");
        if (!cancelled) {
          setAppointments(data);
        }
      } catch (err) {
        if (!cancelled) {
          setAppointmentsError(err instanceof Error ? err.message : String(err));
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setAppointmentsLoading(false);
        }
      }
    }
    loadAppointments();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const resetCreateForm = () => {
    setCreateClientId("");
    setCreateStartsAt("");
    setCreateEndsAt("");
    setCreateNotes("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!createClientId) {
      setCreateError("Client is required.");
      return;
    }
    if (!createStartsAt || !createEndsAt) {
      setCreateError("Start and end times are required.");
      return;
    }

    let startIso: string;
    let endIso: string;
    try {
      startIso = toIsoString(createStartsAt);
      endIso = toIsoString(createEndsAt);
    } catch {
      setCreateError("Please provide valid dates.");
      return;
    }

    if (endIso <= startIso) {
      setCreateError("End time must be after the start time.");
      return;
    }

    if (!isAuthenticated) {
      setCreateError("Please log in to schedule appointments.");
      return;
    }

    setCreating(true);
    try {
      await api<AppointmentCreateResponse>("/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          client_id: Number(createClientId),
          starts_at: startIso,
          ends_at: endIso,
          notes: createNotes.trim() ? createNotes.trim() : null,
        } satisfies AppointmentCreateBody),
      });
      setCreateSuccess("Appointment scheduled.");
      resetCreateForm();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    if (!isAuthenticated) {
      alert("Please log in to delete appointments.");
      return;
    }
    const confirmed = window.confirm("Delete this appointment?");
    if (!confirmed) return;
    try {
      await api<void>(`/v1/appointments/${appointment.id}`, { method: "DELETE" });
      setRefreshKey((value) => value + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const openEditModal = (appointment: Appointment) => {
    if (!isAuthenticated) return;
    setSelectedAppointment(appointment);
    setEditStartsAt(toDateTimeLocal(appointment.starts_at));
    setEditEndsAt(toDateTimeLocal(appointment.ends_at));
    setEditNotes(appointment.notes ?? "");
    setEditError(null);
    setEditSuccess(null);
    setEditOpen(true);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAppointment) return;
    if (!isAuthenticated) {
      setEditError("Please log in to update appointments.");
      return;
    }

    setEditError(null);
    setEditSuccess(null);

    if (!editStartsAt || !editEndsAt) {
      setEditError("Start and end times are required.");
      return;
    }

    let startIso: string;
    let endIso: string;
    try {
      startIso = toIsoString(editStartsAt);
      endIso = toIsoString(editEndsAt);
    } catch {
      setEditError("Please provide valid dates.");
      return;
    }

    if (endIso <= startIso) {
      setEditError("End time must be after the start time.");
      return;
    }

    setEditing(true);
    try {
      await api<AppointmentUpdateResponse>(`/v1/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          starts_at: startIso,
          ends_at: endIso,
          notes: editNotes.trim() ? editNotes.trim() : null,
        } satisfies AppointmentUpdateBody),
      });
      setEditSuccess("Appointment updated.");
      setEditOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditing(false);
    }
  };

  const appointmentRows = useMemo(() => {
    if (appointmentsLoading) {
      return <p className="py-6 text-sm text-neutral-400">Loading appointments…</p>;
    }
    if (appointmentsError) {
      return <p className="py-6 text-sm text-red-400">{appointmentsError}</p>;
    }
    if (appointments.length === 0) {
      return <p className="py-6 text-sm text-neutral-400">No appointments scheduled.</p>;
    }
    const lookup = new Map(clients.map((client) => [client.id, client]));
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Starts</th>
              <th className="px-3 py-2">Ends</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => {
              const client = lookup.get(appointment.client_id);
              return (
                <tr key={appointment.id} className="border-b border-neutral-900">
                  <td className="px-3 py-2 text-neutral-400">{appointment.id}</td>
                  <td className="px-3 py-2">
                    {client ? (
                      <div>
                        <p>{client.name}</p>
                        <p className="text-xs text-neutral-500">{client.phone}</p>
                      </div>
                    ) : (
                      `Client #${appointment.client_id}`
                    )}
                  </td>
                  <td className="px-3 py-2">{new Date(appointment.starts_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{new Date(appointment.ends_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {appointment.notes ? <span className="text-neutral-200">{appointment.notes}</span> : <span className="text-neutral-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isAuthenticated ? (
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => openEditModal(appointment)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => handleDelete(appointment)}>
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">Read only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [appointments, appointmentsError, appointmentsLoading, clients, isAuthenticated]);

  return (
    <section className="space-y-6">
      <div className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Appointments</h1>
          <p className="text-sm text-neutral-400">Upcoming schedules across all clients.</p>
        </div>
        {appointmentRows}
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Schedule appointment</h2>
          <p className="text-sm text-neutral-400">Pick a client, timeframe, and optional notes.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-neutral-300 md:col-span-1">
              Client
              <Select value={createClientId} onChange={(event) => setCreateClientId(event.target.value)} required>
                <option value="">Select client…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.phone})
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Starts at
              <Input type="datetime-local" value={createStartsAt} onChange={(event) => setCreateStartsAt(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Ends at
              <Input type="datetime-local" value={createEndsAt} onChange={(event) => setCreateEndsAt(event.target.value)} required />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-neutral-300">
            Notes
            <Input value={createNotes} onChange={(event) => setCreateNotes(event.target.value)} placeholder="Optional notes…" />
          </label>

          {clientsError ? <p className="text-sm text-red-400">{clientsError}</p> : null}
          {createError ? <p className="text-sm text-red-400">{createError}</p> : null}
          {createSuccess ? <p className="text-sm text-emerald-400">{createSuccess}</p> : null}

          <Button type="submit" loading={creating} className="w-full md:w-auto" disabled={!isAuthenticated || clients.length === 0}>
            {isAuthenticated ? "Create appointment" : "Login required"}
          </Button>
        </form>
      </div>

      {!isAuthenticated ? <p className="text-xs text-neutral-500">Sign in to schedule, edit, or delete appointments.</p> : null}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit appointment">
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Starts at
              <Input type="datetime-local" value={editStartsAt} onChange={(event) => setEditStartsAt(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Ends at
              <Input type="datetime-local" value={editEndsAt} onChange={(event) => setEditEndsAt(event.target.value)} required />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-neutral-300">
            Notes
            <Input value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Optional notes…" />
          </label>
          {editError ? <p className="text-sm text-red-400">{editError}</p> : null}
          {editSuccess ? <p className="text-sm text-emerald-400">{editSuccess}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={editing} disabled={!isAuthenticated}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
