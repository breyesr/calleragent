'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle, XCircle, Link, Globe } from 'lucide-react';
import Button from '@/components/Button';
import Select from '@/components/Select';
import { useToken } from '@/lib/useToken';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CalendarSettings = {
    calendar_id: string;
    timezone: string;
};

type GoogleCalendar = {
    id: string;
    summary: string;
};

export default function CalendarSettingsPage() {
    const { token } = useToken();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
    const [settings, setSettings] = useState<CalendarSettings>({ calendar_id: '', timezone: 'America/Mexico_City' });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/google-callback` : '';
    const isReady = useMemo(() => !!token, [token]);

    useEffect(() => {
        if (!isReady) return;

        async function loadData() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${apiUrl}/v1/calendar/calendars`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setCalendars(data.calendars || []);
                    setIsConnected(true);

                    const currentCredsRes = await fetch(`${apiUrl}/v1/calendar/credentials`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (currentCredsRes.ok) {
                        const credsData = await currentCredsRes.json();
                        setSettings(s => ({ ...s, calendar_id: credsData.calendar_id || (data.calendars[0]?.id || '') }));
                    }

                } else {
                    setIsConnected(false);
                    setCalendars([]);
                }
            } catch (err) {
                console.error("Error loading calendar data:", err);
                setIsConnected(false);
                setError("Error al cargar datos del calendario.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [isReady, token, redirectUri]);

    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiUrl}/v1/calendar/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                router.push(data.auth_url);
            } else {
                setError("No se pudo obtener la URL de Google.");
            }
        } catch (err) {
            setError("Error de red.");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!isConnected) return;
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`${apiUrl}/v1/calendar/connection`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setIsConnected(false);
                setCalendars([]);
                setSettings(s => ({ ...s, calendar_id: '' }));
                setSuccess('Desconexión exitosa. Debes volver a conectar.');
                router.refresh();
            } else {
                const errorData = await res.json();
                setError(errorData.detail || 'Fallo al desconectar.');
            }
        } catch (err) {
            setError('Error de red al intentar desconectar.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected || !settings.calendar_id) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`${apiUrl}/v1/calendar/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ calendar_id: settings.calendar_id, timezone: settings.timezone })
            });

            if (res.ok) {
                setSuccess("Configuración de calendario guardada correctamente.");
            } else {
                const errorData = await res.json();
                setError(errorData.detail || 'Fallo al guardar la configuración.');
            }
        } catch (err) {
            setError('Error de red al intentar guardar.');
        } finally {
            setLoading(false);
        }
    };

    if (!isReady || (loading && !calendars.length && isConnected)) {
        return <div className="p-6 text-neutral-500">Cargando...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-blue-500" /> Configuración de Google Calendar</h1>

            {error && <div className="p-4 bg-red-900/50 text-red-400 rounded-lg">{error}</div>}
            {success && <div className="p-4 bg-green-900/50 text-green-400 rounded-lg">{success}</div>}

            <div className="card space-y-4">
                <h2 className="text-xl font-semibold">Estado de la Conexión</h2>
                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    <p className={`font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {isConnected ? 'Conectado a Google Calendar' : 'Desconectado de Google Calendar'}
                    </p>
                </div>

                {isConnected ? (
                    <Button onClick={handleDisconnect} variant="secondary" loading={loading} disabled={loading}>
                        <Link className="h-4 w-4 mr-2 transform rotate-45" /> Desconectar Cuenta
                    </Button>
                ) : (
                    <Button onClick={handleConnect} loading={loading} disabled={loading}>
                        Conectar Google Calendar
                    </Button>
                )}
            </div>

            {isConnected && (
                <form onSubmit={handleSaveSettings} className="card space-y-6">
                    <h2 className="text-xl font-semibold">Preferencias de Agendamiento</h2>

                    <div>
                        <label htmlFor="calendar-select" className="block text-sm font-medium text-neutral-300 mb-2">
                            Seleccionar Calendario para Agendar
                        </label>
                        <Select
                            id="calendar-select"
                            value={settings.calendar_id}
                            onChange={(e) => setSettings(s => ({ ...s, calendar_id: e.target.value }))}
                            required
                        >
                            <option value="" disabled>Selecciona un calendario...</option>
                            {calendars.map(cal => (
                                <option key={cal.id} value={cal.id}>
                                    {cal.summary}
                                </option>
                            ))}
                        </Select>
                        <p className="text-xs text-neutral-500 mt-1">Aquí se crearán las nuevas citas generadas por el asistente.</p>
                    </div>

                    <div>
                        <label htmlFor="timezone-select" className="block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-1">
                            <Globe className='h-4 w-4' /> Zona Horaria
                        </label>
                        <Select
                            id="timezone-select"
                            value={settings.timezone}
                            onChange={(e) => setSettings(s => ({ ...s, timezone: e.target.value }))}
                            required
                        >
                            <option value="America/Mexico_City">America/Mexico_City (GMT-6)</option>
                            <option value="America/Bogota">America/Bogota (GMT-5)</option>
                            <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (GMT-3)</option>
                            <option value="UTC">UTC</option>
                        </Select>
                        <p className="text-xs text-neutral-500 mt-1">Asegúrate que coincida con tu Google Calendar.</p>
                    </div>

                    <Button type="submit" loading={loading} disabled={!settings.calendar_id || loading}>
                        Guardar Configuración
                    </Button>
                </form>
            )}
        </div>
    );
}
