'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Procesando autenticación con Google...');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('Error: No se recibió código de autorización.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = window.location.origin + '/google-callback';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        const res = await fetch(`${apiUrl}/v1/calendar/callback?code=${code}&redirect_uri=${redirectUri}`);

        if (!res.ok) throw new Error('Falló el intercambio de token');

        const data = await res.json();

        if (data.access_token) {
          localStorage.setItem('google_access_token', data.access_token);
          setStatus('¡Conexión exitosa! Redirigiendo...');
          setTimeout(() => router.push('/dashboard/settings/calendar'), 1500);
        }
      } catch (error) {
        console.error(error);
        setStatus('Error conectando. Revisa la consola/logs.');
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 shadow-md text-center">
        <h2 className="text-xl font-bold mb-4">Integración Google Calendar</h2>
        <p className="text-gray-600 animate-pulse">{status}</p>
      </div>
    </div>
  );
}
