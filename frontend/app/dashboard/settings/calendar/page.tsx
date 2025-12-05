'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Check, RefreshCw, Calendar as CalIcon, LogOut, AlertTriangle, Globe } from 'lucide-react';
import { useToken } from '@/lib/useToken';
import Button from '@/components/Button';
import Select from '@/components/Select';
import Input from '@/components/Input';

type AppointmentType = { id: string; name: string; duration: number; description?: string; };
type CalendarOption = { id: string; summary: string; primary: boolean; };
type SettingsForm = { schedulingMethod: string; selectedCalendarId: string; timezone: string; bufferTime: number; };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CalendarSettingsPage() {
  const { token } = useToken();
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [newType, setNewType] = useState<Partial<AppointmentType>>({ name: '', duration: 30 });

  const { register, handleSubmit, setValue } = useForm<SettingsForm>({
    defaultValues: { timezone: 'America/Mexico_City', schedulingMethod: 'google', bufferTime: 15 }
  });

  useEffect(() => {
    if (!token) return;
    const init = async () => {
        setLoading(true);
        try {
            const calRes = await fetch(`${API_URL}/v1/calendar/calendars`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (calRes.ok) {
                const calData = await calRes.json();
                setCalendars(calData.calendars || []);
                setIsConnected(true);

                const credsRes = await fetch(`${API_URL}/v1/calendar/credentials`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (credsRes.ok) {
                    const creds = await credsRes.json();
                    if (creds.calendar_id) setValue('selectedCalendarId', creds.calendar_id);
                }
            } else {
                setIsConnected(false);
            }
        } catch (e) { console.error(e); setIsConnected(false); }
        finally { setLoading(false); }
    };
    init();
  }, [token, setValue]);

  const onConnect = async () => {
    setLoadingAction(true);
    try {
        const redirect = window.location.origin + '/google-callback';
        const res = await fetch(`${API_URL}/v1/calendar/auth-url?redirect_uri=${redirect}`);
        const data = await res.json();
        if (data.auth_url) window.location.href = data.auth_url;
    } catch (e) { alert("Error de conexión"); }
    finally { setLoadingAction(false); }
  };

  const onDisconnect = async () => {
    if (!confirm("¿Confirmas desconectar? Se borrarán las credenciales y se detendrá la sincronización.")) return;
    setLoadingAction(true);
    try {
        const res = await fetch(`${API_URL}/v1/calendar/connection`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            setIsConnected(false);
            setCalendars([]);
            setValue('selectedCalendarId', '');
            alert("Desconectado correctamente.");
        } else {
            const err = await res.json();
            alert("Error al desconectar: " + (err.detail || "Desconocido"));
        }
    } catch (e) { alert("Error de red al desconectar"); }
    finally { setLoadingAction(false); }
  };

  const onSave = async (data: SettingsForm) => {
    if (!isConnected) return;
    try {
        await fetch(`${API_URL}/v1/calendar/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ calendar_id: data.selectedCalendarId, timezone: data.timezone })
        });
        alert("Configuración guardada.");
    } catch (e) { alert("Error guardando"); }
  };

  const addAppointmentType = () => {
    if (!newType.name) return;
    setAppointmentTypes([...appointmentTypes, { id: Date.now().toString(), name: newType.name!, duration: newType.duration || 30, description: newType.description }]);
    setNewType({ name: '', duration: 30, description: '' });
  };
  const removeType = (id: string) => setAppointmentTypes(appointmentTypes.filter(t => t.id !== id));

  if (loading && !calendars.length && !isConnected) return <div className="p-10 text-neutral-400">Cargando...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-white">Configuración de Calendario</h1>

        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-6">
            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Estado de Conexión</label>
                <div className="flex items-center justify-between p-4 bg-neutral-950 rounded border border-neutral-800">
                    <div className="flex items-center gap-3">
                        {isConnected ? <Check className="text-green-500"/> : <AlertTriangle className="text-yellow-500"/>}
                        <div>
                            <p className="text-white font-medium">{isConnected ? "Cuenta Conectada" : "Sin conexión"}</p>
                            <p className="text-xs text-neutral-500">{isConnected ? "Sincronización activa" : "Conecta tu cuenta para agendar"}</p>
                        </div>
                    </div>
                    {!isConnected && (
                        <Button onClick={onConnect} loading={loadingAction} className="bg-blue-600 hover:bg-blue-500 text-white">
                            <RefreshCw className="w-4 h-4 mr-2"/> Conectar Google
                        </Button>
                    )}
                </div>
            </div>

            {isConnected && (
                <form onSubmit={handleSubmit(onSave)} className="space-y-6 pt-4 border-t border-neutral-800">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Calendario Destino</label>
                            <Select {...register('selectedCalendarId')} className="bg-neutral-950 border-neutral-700 w-full text-white">
                                {calendars.map(c => (
                                    <option key={c.id} value={c.id}>{c.summary} {c.primary ? '(Principal)' : ''}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4"/> Zona Horaria
                            </label>
                            <Select {...register('timezone')} className="bg-neutral-950 border-neutral-700 w-full text-white">
                                <option value="America/Mexico_City">CDMX (GMT-6)</option>
                                <option value="UTC">UTC</option>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">Guardar Preferencias</Button>
                    </div>
                </form>
            )}
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-4">
            <h3 className="text-lg font-medium text-white">Tipos de Servicio</h3>
            <div className="space-y-2">
                {appointmentTypes.map(type => (
                    <div key={type.id} className="flex justify-between items-center p-3 bg-neutral-950 rounded border border-neutral-800">
                        <span className="text-white">{type.name} ({type.duration} min)</span>
                        <button onClick={() => removeType(type.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
                {appointmentTypes.length === 0 && <p className="text-neutral-500 text-sm italic">No hay servicios configurados.</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
                <Input placeholder="Nombre (ej: Consulta)" value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} className="bg-neutral-950 border-neutral-700"/>
                <Input type="number" placeholder="Minutos" value={newType.duration} onChange={e => setNewType({...newType, duration: parseInt(e.target.value)})} className="bg-neutral-950 border-neutral-700"/>
                <Button onClick={addAppointmentType} disabled={!newType.name} variant="secondary"><Plus className="w-4 h-4"/> Agregar</Button>
            </div>
        </div>

        {isConnected && (
            <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-lg flex justify-between items-center">
                <div>
                    <h3 className="text-red-500 font-medium flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5"/> Zona de Peligro
                    </h3>
                    <p className="text-sm text-red-400/70 mt-1">Desvincular tu cuenta detendrá la sincronización de citas.</p>
                </div>
                <button
                    onClick={onDisconnect}
                    disabled={loadingAction}
                    className="px-4 py-2 border border-red-800 text-red-500 hover:bg-red-900/20 rounded transition text-sm font-medium flex items-center gap-2"
                >
                    {loadingAction ? "Desconectando..." : <><LogOut className="w-4 h-4"/> Desconectar Cuenta</>}
                </button>
            </div>
        )}
    </div>
  );
}
