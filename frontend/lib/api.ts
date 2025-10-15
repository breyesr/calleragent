"use client";

import axios from "axios";
import createClient from "openapi-fetch";
import type { paths } from "@/lib/types/openapi";

import { clearToken, getToken } from "@/lib/auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

const fetchWithAuth: typeof fetch = async (input, init = {}) => {
  const token = typeof window !== "undefined" ? getToken() : null;
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return response;
};

export const openapi = createClient<paths>({
  baseUrl: API_BASE || undefined,
  fetch: fetchWithAuth,
});

export default axiosInstance;
