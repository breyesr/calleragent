"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Lock } from "lucide-react";

import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { api } from "@/lib/api-client";
import { useToken } from "@/lib/useToken";
import type { paths } from "@/lib/api-types";

// Tipos básicos
type Client = { id: number; name: string; phone: string };
type Appointment = { id: number; client_id: number; starts_at: string; ends_at: string; notes?: string };
type GoogleEvent = { id: string; summary: string; start: any; end: any; description?: string };

const toIsoString = (value: string) => new Date(value).toISOString();
const toDateTimeLocal = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AppointmentsPage() {
  const { token } = useToken();
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form States
  const [createClientId, setCreateClientId] = useState("");
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createEndsAt, setCreateEndsAt] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit States
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // 1. Cargar Datos Iniciales (Clientes y Citas Locales)
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      setLoading(true);
      try {
        const [clientsData, apptsData] = await Promise.all([
          api<Client[]>("/v1/clients"),
          api<Appointment[]>("/v1/appointments")
        ]);
        setClients(clientsData);
        setAppointments(apptsData);
      } catch (err) {
        console.error(err);
        setError("Error cargando datos locales.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token, refreshKey]);

  // 2. Cargar Eventos de Google (Vía Backend Seguro)
  useEffect(() => {
    if (!token) return;

    async function loadGoogle() {
      setGoogleLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/v1/calendar/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setGoogleEvents(data.events || []);
        } else {
          console.log("Google Calendar no conectado o error de sync");
          setGoogleEvents([]);
        }
      } catch (err) {
        console.error("Error fetching google events", err);
      } finally {
        setGoogleLoading(false);
      }
    }
    loadGoogle();
  }, [token, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createClientId || !createStartsAt || !createEndsAt) return alert("Completa los campos");

    setCreating(true);
    try {
      await api("/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          client_id: Number(createClientId),
          starts_at: toIsoString(createStartsAt),
          ends_at: toIsoString(createEndsAt),
          notes: createNotes
        })
      });
      setCreateClientId("");
      setCreateStartsAt("");
      setCreateEndsAt("");
      setCreateNotes("");
      setRefreshKey((k) => k + 1);
      alert("Cita creada y sincronizada.");
    } catch (err) {
      alert("Error creando cita: " + err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar cita?")) return;
    try {
      await api(`/v1/appointments/${id}`, { method: "DELETE" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert("Error eliminando: " + err);
    }
  };

  const openEdit = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setEditStartsAt(toDateTimeLocal(appt.starts_at));
    setEditEndsAt(toDateTimeLocal(appt.ends_at));
    setEditNotes(appt.notes || "");
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setEditing(true);
    try {
      await api(`/v1/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          starts_at: toIsoString(editStartsAt),
          ends_at: toIsoString(editEndsAt),
          notes: editNotes
        })
      });
      setEditOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert("Error actualizando: " + err);
    } finally {
      setEditing(false);
    }
  };

  const unifiedList = useMemo(() => {
    const list: any[] = [];
    appointments.forEach((a) => {
      const client = clients.find((c) => c.id === a.client_id);
      list.push({
        id: a.id,
        source: "local" as const,
        title: client ? client.name : `Cliente #${a.client_id}`,
        subtitle: client?.phone,
        start: a.starts_at,
        end: a.ends_at,
        notes: a.notes,
        raw: a
      });
    });
    googleEvents.forEach((g) => {
      const start = g.start.dateTime || g.start.date;
      const end = g.end.dateTime || g.end.date;
      list.push({
        id: g.id,
        source: "google" as const,
        title: g.summary || "(Sin título)",
        subtitle: "Google Calendar",
        start,
        end,
        notes: g.description,
        raw: g
      });
    });
    return list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [appointments, googleEvents, clients]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <p className="text-neutral-400 text-sm">Visualiza tus citas locales y eventos de Google.</p>
        </div>
        {googleLoading && <span className="text-xs text-blue-400 animate-pulse">Sincronizando Google...</span>}
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-left text-sm text-neutral-300">
          <thead className="bg-neutral-900 border-b border-neutral-800 text-xs uppercase font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Evento / Cliente</th>
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Fin</th>
              <th className="px-4 py-3">Notas</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {unifiedList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No hay citas programadas.
                </td>
              </tr>
            ) : (
              unifiedList.map((item) => (
                <tr key={item.id} className={item.source === "google" ? "bg-blue-950/10" : "hover:bg-neutral-800/30"}>
                  <td className="px-4 py-3">
                    {item.source === "google" ? (
                      <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded text-xs border border-blue-400/20">
                        <CalendarIcon className="w-3 h-3" /> Google
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">Local</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {item.title}
                    <div className="text-xs text-neutral-500 font-normal">{item.subtitle}</div>
                  </td>
                  <td className="px-4 py-3">{new Date(item.start).toLocaleString()}</td>
                  <td className="px-4 py-3">{new Date(item.end).toLocaleString()}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-neutral-400" title={item.notes}>
                    {item.notes || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.source === "local" ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(item.raw)} className="text-neutral-400 hover:text-white transition">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 transition">
                          Borrar
                        </button>
                      </div>
                    ) : (
                      <Lock className="w-4 h-4 text-neutral-600 ml-auto" title="Gestionar en Google Calendar" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Nueva Cita</h2>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3 items-end">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Cliente</label>
            <Select value={createClientId} onChange={(e) => setCreateClientId(e.target.value)} required className="w-full bg-neutral-950 border-neutral-700">
              <option value="">Seleccionar...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Inicio</label>
            <Input
              type="datetime-local"
              value={createStartsAt}
              onChange={(e) => setCreateStartsAt(e.target.value)}
              required
              className="bg-neutral-950 border-neutral-700"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Fin</label>
            <Input
              type="datetime-local"
              value={createEndsAt}
              onChange={(e) => setCreateEndsAt(e.target.value)}
              required
              className="bg-neutral-950 border-neutral-700"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-neutral-400 mb-1">Notas</label>
            <Input
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="Detalles..."
              className="bg-neutral-950 border-neutral-700"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" loading={creating} disabled={!token} className="bg-blue-600 hover:bg-blue-500 text-white">
              Agendar Cita
            </Button>
          </div>
        </form>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Cita">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            type="datetime-local"
            value={editStartsAt}
            onChange={(e) => setEditStartsAt(e.target.value)}
            required
          />
          <Input
            type="datetime-local"
            value={editEndsAt}
            onChange={(e) => setEditEndsAt(e.target.value)}
            required
          />
          <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={editing}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
