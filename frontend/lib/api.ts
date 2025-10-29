"use client";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const TOKEN_STORAGE_KEY = "token";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response: import("axios").AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    if (status === 401 && typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // ignore storage errors during sign-out fallback
      }
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
