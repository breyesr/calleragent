"use client";

const TOKEN_KEY = "access_token";
const TOKEN_EVENT = "auth-token";

const isBrowser = typeof window !== "undefined";

function emitChange() {
  if (!isBrowser) return;
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function setToken(token: string) {
  if (!isBrowser) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  emitChange();
}

export function getToken(): string | null {
  if (!isBrowser) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (!isBrowser) return;
  window.localStorage.removeItem(TOKEN_KEY);
  emitChange();
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

export function subscribeTokenChange(handler: () => void) {
  if (!isBrowser) return () => {};
  const listener = () => handler();
  window.addEventListener(TOKEN_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(TOKEN_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
