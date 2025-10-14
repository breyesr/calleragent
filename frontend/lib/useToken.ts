"use client";

import { useCallback, useEffect, useState } from "react";

import { clearToken as clearStoredToken, getToken as getStoredToken, setToken as setStoredToken, subscribeTokenChange } from "@/lib/auth";

export function useToken() {
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());

  useEffect(() => {
    const unsubscribe = subscribeTokenChange(() => {
      setTokenState(getStoredToken());
    });
    return unsubscribe;
  }, []);

  const setToken = useCallback((value: string | null) => {
    if (value) {
      setStoredToken(value);
    } else {
      clearStoredToken();
    }
  }, []);

  const clearToken = useCallback(() => {
    clearStoredToken();
  }, []);

  return { token, setToken, clearToken };
}

export { getStoredToken };
