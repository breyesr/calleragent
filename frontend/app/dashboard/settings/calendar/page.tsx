'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Clock, Check, AlertCircle, RefreshCw } from 'lucide-react';

type AppointmentType = {
  id: string;
  name: string;
  duration: number;
  description?: string;
};

type CalendarSettingsForm = {
  schedulingMethod: string;
  timezone: string;
  bufferTime: number;
};

export default function CalendarSettingsPage() {
  const { register, handleSubmit } = useForm<CalendarSettingsForm>({
    defaultValues: {
      schedulingMethod: 'google',
      timezone: 'America/Mexico_City',
      bufferTime: 15,
    }
  });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // INICIO LIMPIO: Sin tipos de cita por defecto
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [newType, setNewType] = useState<Partial<AppointmentType>>({ name: '', duration: 30 });

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('google_access_token')) {
      setGoogleConnected(true);
    }
  }, []);

  const handleGoogleConnect = async () => {
    setLoadingGoogle(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const redirectUri = window.location.origin + '/google-callback';
      const res = await fetch(`${apiUrl}/v1/calendar/auth-url?redirect_uri=${redirectUri}`);
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch (err) {
      console.error(err);
      alert('Error iniciando conexión');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const addAppointmentType = () => {
    if (!newType.name) return;
    setAppointmentTypes([...appointmentTypes, { 
      id: Date.now().toString(), 
      name: newType.name, 
      duration: newType.duration || 30,
      description: newType.description 
    }]);
    setNewType({ name: '', duration: 30, description: '' });
  };

  const removeType = (id: string) => {
    setAppointmentTypes(appointmentTypes.filter(t => t.id !== id));
  };

  const onSaveSettings = (data: CalendarSettingsForm) => {
    console.log('Guardando configuración:', { ...data, appointmentTypes });
    alert('Configuración guardada (Simulado)');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración de Calendario</h1>
        <p className="text-gray-500 dark:text-gray-400">Administra cómo se agendan tus citas y tu disponibilidad.</p>
      </div>

      <form onSubmit={handleSubmit(onSaveSettings)} className="space-y-8">
        
        {/* SECCIÓN 1: Agendamiento y Timezone */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-6">
          
          {/* Método de Agendamiento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Agendamiento de citas
            </label>
            <p className="text-xs text-gray-500 mb-2">Selecciona el motor de agendamiento para tu asistente IA:</p>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <select 
                {...register('schedulingMethod')}
                className="w-full md:w-1/2 p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="google">Automático (Google Calendar)</option>
                <option value="manual">Manual / Sin Sincronización</option>
              </select>

              {/* Lógica de Conexión Google: Discreto si ya está conectado */}
              {!googleConnected ? (
                 <button
                    type="button"
                    onClick={handleGoogleConnect}
                    disabled={loadingGoogle}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
                  >
                    {loadingGoogle ? <RefreshCw className="animate-spin h-4 w-4"/> : null}
                    Conectar Google Calendar
                  </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 cursor-default">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Cuenta conectada
                </div>
              )}
            </div>
          </div>

          {/* Zona Horaria */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Zona Horaria
            </label>
            <select 
              {...register('timezone')}
              className="w-full md:w-1/2 p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
            >
              <option value="America/Mexico_City">(GMT-06:00) America - Mexico City</option>
              <option value="America/Monterrey">(GMT-06:00) America - Monterrey</option>
              <option value="America/Tijuana">(GMT-08:00) America - Tijuana</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        {/* SECCIÓN 2: Configuración Global */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuración global</h2>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Tiempo entre citas (minutos)
            </label>
            <input 
              type="number" 
              {...register('bufferTime')}
              className="w-full md:w-1/3 p-2.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Tiempo de preparación o traslado entre una cita y otra.</p>
          </div>
        </div>

        {/* SECCIÓN 3: Tipos de Cita */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Tipos de Cita / Servicios</h2>
          <p className="text-sm text-gray-500 mb-6">Define los servicios que tu asistente puede ofrecer.</p>

          <div className="space-y-3 mb-6">
            {/* Lista de tipos */}
            {appointmentTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{type.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {type.duration} min</span>
                    {type.description && <span>{type.description}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => removeType(type.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* EMPTY STATE MEJORADO: Texto universal */}
            {appointmentTypes.length === 0 && (
              <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500">
                <p className="mb-2">No has definido ningún servicio.</p>
                <p className="text-sm text-gray-400">
                  Agrega tipos de cita como: "Consulta General", "Visita a Domicilio", 
                  "Revisión de Presupuesto", "Mantenimiento Preventivo", etc.
                </p>
              </div>
            )}
          </div>

          {/* Formulario Agregar */}
          <div className="bg-gray-100 dark:bg-gray-700/30 p-4 rounded border border-dashed border-gray-300 dark:border-gray-600">
            <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Nuevo Servicio</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Nombre del servicio</label>
                <input 
                  value={newType.name}
                  onChange={(e) => setNewType({...newType, name: e.target.value})}
                  placeholder="Ej: Valoración Inicial"
                  className="w-full p-2 rounded text-sm border dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Duración (min)</label>
                <input 
                  type="number"
                  value={newType.duration}
                  onChange={(e) => setNewType({...newType, duration: parseInt(e.target.value)})}
                  className="w-full p-2 rounded text-sm border dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <button 
                type="button" 
                onClick={addAppointmentType}
                disabled={!newType.name}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded text-sm disabled:opacity-50 transition"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 block mb-1">Descripción (Opcional)</label>
              <input 
                value={newType.description || ''}
                onChange={(e) => setNewType({...newType, description: e.target.value})}
                placeholder="Ej: Incluye limpieza y diagnóstico..."
                className="w-full p-2 rounded text-sm border dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 shadow-lg transition"
          >
            Guardar cambios
          </button>
        </div>

      </form>
    </div>
  );
}
