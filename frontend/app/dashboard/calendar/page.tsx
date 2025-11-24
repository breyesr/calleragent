'use client';

import { useEffect, useState } from 'react';

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      setConnected(true);
      fetchEvents(token);
    }
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const redirectUri = window.location.origin + '/google-callback';

      const res = await fetch(`${apiUrl}/v1/calendar/auth-url?redirect_uri=${redirectUri}`);
      const data = await res.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        alert('Error: No se pudo obtener la URL de autorización.');
      }
    } catch (err) {
      console.error(err);
      alert('Error iniciando conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/v1/calendar/events?access_token=${token}`);

      if (res.status === 401) {
        localStorage.removeItem('google_access_token');
        setConnected(false);
        return;
      }

      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Tu Calendario</h1>
        {!connected && (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Cargando...' : 'Conectar Google Calendar'}
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!connected ? (
          <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
            No has conectado tu cuenta. Haz click arriba para sincronizar.
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">
            No se encontraron eventos próximos (o cargando...)
          </div>
        ) : (
          events.map((evt: any) => (
            <div key={evt.id} className="p-4 bg-white border rounded shadow-sm hover:shadow-md transition">
              <h3 className="font-semibold text-white mb-1">{evt.summary || '(Sin título)'}</h3>
              <p className="text-sm text-gray-500">
                {evt.start?.dateTime
                  ? new Date(evt.start.dateTime).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Todo el día'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
