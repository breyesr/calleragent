"use client";

import { useCallback, useEffect, useState } from "react";

const TOKEN_STORAGE_KEY = "token";
const TOKEN_EVENT = "auth-token";

export function useToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleChange = () => {
      setTokenState(window.localStorage.getItem(TOKEN_STORAGE_KEY));
    };

    window.addEventListener("storage", handleChange);
    window.addEventListener(TOKEN_EVENT, handleChange as EventListener);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(TOKEN_EVENT, handleChange as EventListener);
    };
  }, []);

  const setToken = useCallback((value: string | null) => {
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setTokenState(value);
    window.dispatchEvent(new Event(TOKEN_EVENT));
  }, []);

  const clearToken = useCallback(() => setToken(null), [setToken]);

  return { token, setToken, clearToken };
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

