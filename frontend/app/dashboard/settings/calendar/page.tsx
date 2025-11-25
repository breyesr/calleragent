'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Clock, Check, RefreshCw, Calendar as CalIcon, LogOut, AlertTriangle } from 'lucide-react';
import { useToken } from '@/lib/useToken';

// Tipos
type AppointmentType = { id: string; name: string; duration: number; description?: string; };
type CalendarOption = { id: string; summary: string; primary: boolean; };
type CalendarSettingsForm = { schedulingMethod: string; selectedCalendarId: string; timezone: string; bufferTime: number; };

export default function CalendarSettingsPage() {
  const { token } = useToken();
  const { register, handleSubmit, setValue, watch } = useForm<CalendarSettingsForm>({
    defaultValues: { schedulingMethod: 'google', selectedCalendarId: 'primary', timezone: 'America/Mexico_City', bufferTime: 15 }
  });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [newType, setNewType] = useState<Partial<AppointmentType>>({ name: '', duration: 30 });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    setLoadingCalendars(true);
    try {
      const res = await fetch(`${apiUrl}/v1/calendar/calendars`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars || []);
        setGoogleConnected(true);
        const savedId = localStorage.getItem('selected_calendar_id');
        if (savedId) setValue('selectedCalendarId', savedId);
      } else {
        setGoogleConnected(false);
      }
    } catch (e) { console.error(e); } finally { setLoadingCalendars(false); }
  };

  const handleGoogleConnect = async () => {
    setLoadingGoogle(true);
    try {
      const redirectUri = window.location.origin + '/google-callback';
      const res = await fetch(`${apiUrl}/v1/calendar/auth-url?redirect_uri=${redirectUri}`);
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch (err) { alert('Error conexión'); } finally { setLoadingGoogle(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Desvincular cuenta de Google? Se dejarán de sincronizar citas.")) return;
    try {
      await fetch(`${apiUrl}/v1/calendar/connection`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setGoogleConnected(false);
      setCalendars([]);
      localStorage.removeItem('selected_calendar_id');
      alert("Cuenta desconectada correctamente.");
    } catch (e) { alert("Error al desconectar: " + e); }
  };

  const onSaveSettings = async (data: CalendarSettingsForm) => {
    if (googleConnected) {
      await fetch(`${apiUrl}/v1/calendar/settings?calendar_id=${data.selectedCalendarId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    localStorage.setItem('selected_calendar_id', data.selectedCalendarId);
    alert('Configuración guardada.');
  };

  const addAppointmentType = () => {
    if (!newType.name) return;
    setAppointmentTypes([...appointmentTypes, { id: Date.now().toString(), name: newType.name, duration: newType.duration || 30, description: newType.description }]);
    setNewType({ name: '', duration: 30, description: '' });
  };
  const removeType = (id: string) => setAppointmentTypes(appointmentTypes.filter(t => t.id !== id));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración de Calendario</h1>

      <form onSubmit={handleSubmit(onSaveSettings)} className="space-y-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Agendamiento</label>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <select {...register('schedulingMethod')} className="w-full md:w-1/2 p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
                <option value="google">Automático (Google Calendar)</option>
                <option value="manual">Manual</option>
              </select>
              {!googleConnected ? (
                 <button type="button" onClick={handleGoogleConnect} disabled={loadingGoogle} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition">
                    {loadingGoogle ? <RefreshCw className="animate-spin h-4 w-4"/> : null} Conectar Google Calendar
                  </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 border border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4" /> Conectado
                </div>
              )}
            </div>
          </div>

          {googleConnected && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Calendario para agendar</label>
              <div className="flex items-center gap-2 w-full md:w-1/2">
                <CalIcon className="text-gray-400 h-5 w-5" />
                <select {...register('selectedCalendarId')} disabled={loadingCalendars} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
                  <option value="primary">Principal (Primary)</option>
                  {calendars.map(cal => <option key={cal.id} value={cal.id}>{cal.summary} {cal.primary ? '(Principal)' : ''}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">Las citas nuevas se crearán en este calendario.</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Zona Horaria</label>
            <select {...register('timezone')} className="w-full md:w-1/2 p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
              <option value="America/Mexico_City">Mexico City</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuración global</h2>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Tiempo entre citas (minutos)</label>
            <input type="number" {...register('bufferTime')} className="w-full md:w-1/3 p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-white outline-none"/>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Tipos de Cita</h2>
          <div className="space-y-3 mb-6 mt-4">
            {appointmentTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                <div><h3 className="font-medium text-gray-900 dark:text-white">{type.name}</h3></div>
                <button type="button" onClick={() => removeType(type.id)}><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            ))}
            {appointmentTypes.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No has definido ningún servicio.</div>}
          </div>
          <div className="bg-gray-100 dark:bg-gray-700/30 p-4 rounded border border-dashed border-gray-300 dark:border-gray-600 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2"><input value={newType.name} onChange={(e) => setNewType({...newType, name: e.target.value})} placeholder="Ej: Consulta" className="w-full p-2 rounded text-sm border dark:bg-gray-800 dark:border-gray-600 text-white"/></div>
              <div><input type="number" value={newType.duration} onChange={(e) => setNewType({...newType, duration: parseInt(e.target.value)})} className="w-full p-2 rounded text-sm border dark:bg-gray-800 dark:border-gray-600 text-white"/></div>
              <button type="button" onClick={addAppointmentType} disabled={!newType.name} className="bg-purple-600 text-white p-2 rounded text-sm w-full"><Plus className="inline w-4 h-4"/> Agregar</button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 shadow-lg transition">Guardar Cambios</button>
        </div>
      </form>

      {googleConnected && (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
           <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
             <AlertTriangle className="h-5 w-5"/> Zona de Peligro
           </h3>
           <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
             <div>
               <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Desconectar cuenta de Google</p>
               <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tu asistente dejará de sincronizar citas y no podrá ver tu disponibilidad. Las citas existentes se mantendrán.</p>
             </div>
             <button onClick={handleDisconnect} className="px-4 py-2 bg-white dark:bg-transparent border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition whitespace-nowrap flex items-center gap-2 shadow-sm">
               <LogOut className="h-4 w-4"/> Desconectar Cuenta
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
