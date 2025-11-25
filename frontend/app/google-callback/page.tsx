'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToken } from '@/lib/useToken';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useToken();
  const [status, setStatus] = useState('Verificando sesión...');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return setStatus('Falta código');
    if (!token) return setStatus('Inicia sesión para continuar...');

    const exchange = async () => {
      setStatus('Vinculando cuenta...');
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const redirectUri = window.location.origin + '/google-callback';

        const res = await fetch(`${apiUrl}/v1/calendar/callback?code=${code}&redirect_uri=${redirectUri}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Error en servidor');
        }

        setStatus('¡Éxito! Redirigiendo...');
        setTimeout(() => router.push('/dashboard/settings/calendar'), 1000);
      } catch (e) {
        setStatus(`Error: ${e}`);
      }
    };
    exchange();
  }, [searchParams, router, token]);

  return <div className="flex h-screen items-center justify-center text-white">{status}</div>;
}
