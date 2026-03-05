import type { Session } from "@/types";

const SESSIONS_KEY = "tf_sessions";

export function getSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session): void {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function updateSession(id: string, lines: { content: string }[]): void {
  const sessions = getSessions().map((s) =>
    s.id === id ? { ...s, lines } : s
  );
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}
