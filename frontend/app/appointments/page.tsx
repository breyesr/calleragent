"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { api } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";
import { useToken } from "@/lib/useToken";

// --- TIPOS EXISTENTES ---
type ClientsResponse = paths["/v1/clients"]["get"]["responses"][200]["content"]["application/json"];
type Client = ClientsResponse[number];
type AppointmentsResponse = paths["/v1/appointments"]["get"]["responses"][200]["content"]["application/json"];
type Appointment = AppointmentsResponse[number];
type AppointmentCreateBody = paths["/v1/appointments"]["post"]["requestBody"]["content"]["application/json"];
type AppointmentCreateResponse = paths["/v1/appointments"]["post"]["responses"][201]["content"]["application/json"];
type AppointmentUpdateBody = paths["/v1/appointments/{appointment_id}"]["patch"]["requestBody"]["content"]["application/json"];
type AppointmentUpdateResponse = paths["/v1/appointments/{appointment_id}"]["patch"]["responses"][200]["content"]["application/json"];

// --- NUEVOS TIPOS PARA GOOGLE ---
type GoogleEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
};

// Tipo unificado para la tabla
type UnifiedEvent = {
  id: string | number;
  source: "local" | "google";
  title: string; // Nombre del cliente o Título del evento
  subtitle?: string; // Teléfono o detalle extra
  startsAt: string;
  endsAt: string;
  notes?: string;
  raw: Appointment | GoogleEvent; // Objeto original para acciones
};

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
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // Estado Local
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  
  // Estado Google
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [googleRefreshKey, setGoogleRefreshKey] = useState(0);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  
  const [refreshKey, setRefreshKey] = useState(0);

  // Form States (Create)
  const [createClientId, setCreateClientId] = useState("");
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createEndsAt, setCreateEndsAt] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form States (Edit)
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  const { token } = useToken();
  const isAuthenticated = Boolean(token);

  // 1. Cargar Clientes
  useEffect(() => {
    let cancelled = false;
    async function loadClients() {
      try {
        const data = await api<ClientsResponse>("/v1/clients");
        if (!cancelled) setClients(data);
      } catch (err) {
        if (!cancelled) setClientsError(err instanceof Error ? err.message : String(err));
      }
    }
    loadClients();
    return () => { cancelled = true; };
  }, []);

  // 2. Cargar Citas Locales
  useEffect(() => {
    let cancelled = false;
    async function loadAppointments() {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      try {
        const data = await api<AppointmentsResponse>("/v1/appointments");
        if (!cancelled) setAppointments(data);
      } catch (err) {
        if (!cancelled) {
          setAppointmentsError(err instanceof Error ? err.message : String(err));
          setAppointments([]);
        }
      } finally {
        if (!cancelled) setAppointmentsLoading(false);
      }
    }
    loadAppointments();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // 2b. Cargar selección de calendario para Google
  useEffect(() => {
    const stored = localStorage.getItem("selected_calendar_id");
    if (stored) setSelectedCalendarId(stored);
  }, []);

  // 3. Cargar Eventos de Google (Si está conectado)
  useEffect(() => {
    const googleToken = localStorage.getItem("google_access_token");
    if (!googleToken) {
      setHasGoogleToken(false);
      setGoogleEvents([]);
      return;
    }
    setHasGoogleToken(true);

    let cancelled = false;
    async function loadGoogleEvents() {
      setGoogleLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(
          `${apiUrl}/v1/calendar/events?access_token=${googleToken}&calendar_id=${selectedCalendarId || "primary"}`
        );
        
        if (res.status === 401) {
          localStorage.removeItem("google_access_token"); // Token expirado
          setHasGoogleToken(false);
          setGoogleEvents([]);
          setGoogleError("Tu sesión de Google expiró. Conecta nuevamente.");
          return;
        }

        const data = await res.json();
        if (!cancelled && data.events) {
          setGoogleEvents(data.events);
          setGoogleError(null);
        }
      } catch (err) {
        console.error("Error loading google events", err);
        if (!cancelled) setGoogleError("No se pudieron cargar eventos de Google.");
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    }
    loadGoogleEvents();
    return () => { cancelled = true; };
  }, [refreshKey, googleRefreshKey, selectedCalendarId]);

  // --- ACTIONS HANDLERS ---
  
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

    if (!createClientId) return setCreateError("Client is required.");
    if (!createStartsAt || !createEndsAt) return setCreateError("Start and end times are required.");

    let startIso: string, endIso: string;
    try {
      startIso = toIsoString(createStartsAt);
      endIso = toIsoString(createEndsAt);
    } catch {
      return setCreateError("Please provide valid dates.");
    }

    if (endIso <= startIso) return setCreateError("End time must be after the start time.");
    if (!isAuthenticated) return setCreateError("Please log in to schedule appointments.");

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
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    if (!isAuthenticated) return alert("Please log in to delete appointments.");
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await api<void>(`/v1/appointments/${appointment.id}`, { method: "DELETE" });
      setRefreshKey((v) => v + 1);
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
    if (!selectedAppointment || !isAuthenticated) return;

    setEditError(null);
    setEditSuccess(null);

    let startIso: string, endIso: string;
    try {
      startIso = toIsoString(editStartsAt);
      endIso = toIsoString(editEndsAt);
    } catch {
      return setEditError("Invalid dates.");
    }
    if (endIso <= startIso) return setEditError("End time must be after start.");

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
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditing(false);
    }
  };

  // --- UNIFIED LIST LOGIC ---
  const unifiedAppointments = useMemo(() => {
    const list: UnifiedEvent[] = [];
    const clientLookup = new Map(clients.map((c) => [c.id, c]));

    // 1. Map Local Appointments
    appointments.forEach((appt) => {
      const client = clientLookup.get(appt.client_id);
      list.push({
        id: appt.id,
        source: "local",
        title: client ? client.name : `Client #${appt.client_id}`,
        subtitle: client?.phone,
        startsAt: appt.starts_at,
        endsAt: appt.ends_at,
        notes: appt.notes || undefined,
        raw: appt,
      });
    });

    // 2. Map Google Events
    googleEvents.forEach((evt) => {
      // Google a veces devuelve 'date' (todo el día) o 'dateTime'
      const start = evt.start.dateTime || evt.start.date || "";
      const end = evt.end.dateTime || evt.end.date || "";
      
      list.push({
        id: evt.id,
        source: "google",
        title: evt.summary || "(No Title)",
        subtitle: "Google Event",
        startsAt: start,
        endsAt: end,
        notes: evt.description,
        raw: evt, // Guardamos el evento original
      });
    });

    // 3. Sort by Date
    return list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [appointments, googleEvents, clients]);

  // --- RENDER TABLE ---
  const appointmentRows = useMemo(() => {
    if (appointmentsLoading) return <p className="py-6 text-sm text-neutral-400">Loading appointments…</p>;
    if (appointmentsError) return <p className="py-6 text-sm text-red-400">{appointmentsError}</p>;
    if (unifiedAppointments.length === 0) return <p className="py-6 text-sm text-neutral-400">No appointments scheduled.</p>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Cliente / Evento</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Notas</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {unifiedAppointments.map((item) => (
              <tr
                key={`${item.source}-${item.id}`}
                className={`border-b border-neutral-900 ${item.source === "google" ? "bg-blue-900/10" : ""}`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {item.source === "google" ? (
                      <span className="flex items-center gap-1 text-blue-400 text-xs" title="Evento de Google">
                        <Lock className="w-3 h-3" /> Google Calendar
                      </span>
                    ) : null}
                    <div>
                      <p className={item.source === "google" ? "font-medium text-blue-200" : ""}>{item.title}</p>
                      {item.subtitle ? <p className="text-xs text-neutral-500">{item.subtitle}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">{new Date(item.startsAt).toLocaleString()}</td>
                <td className="px-3 py-2">{new Date(item.endsAt).toLocaleString()}</td>
                <td className="px-3 py-2 max-w-xs truncate">
                  {item.notes ? (
                    <span className="text-neutral-200" title={item.notes}>
                      {item.notes}
                    </span>
                  ) : (
                    <span className="text-neutral-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.source === "local" && isAuthenticated ? (
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => openEditModal(item.raw as Appointment)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => handleDelete(item.raw as Appointment)}>
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className="flex items-center justify-end gap-1 text-xs text-neutral-600">
                      <Lock className="w-3 h-3" /> Externo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [unifiedAppointments, appointmentsLoading, appointmentsError, isAuthenticated]);

  return (
    <section className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Appointments</h1>
            <p className="text-sm text-neutral-400">Upcoming schedules across all clients & calendars.</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {googleError ? <span className="text-red-400">{googleError}</span> : null}
            {googleLoading ? <span className="text-blue-400 animate-pulse">Syncing Google Calendar...</span> : null}
            {hasGoogleToken ? (
              <button
                type="button"
                className="rounded border border-neutral-700 px-3 py-1 text-neutral-200 hover:border-neutral-500"
                onClick={() => setGoogleRefreshKey((v) => v + 1)}
              >
                Refrescar Google
              </button>
            ) : null}
          </div>
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
