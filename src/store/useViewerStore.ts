import { create } from "zustand";
import { getSessions, deleteSession, updateSession } from "@/lib/storage";
import type { Session } from "@/types";

interface ViewerStore {
  sessions: Session[];
  searchQuery: string;
  drillIndex: number | null;
  selectedRow: number;

  // Actions
  load: () => void;
  setSearch: (q: string) => void;
  openDrill: (index: number) => void;
  closeDrill: () => void;
  removeSession: (id: string) => void;
  editLines: (sessionId: string, lines: { content: string }[]) => void;
  navigateRows: (dir: "up" | "down") => void;
  resetSelection: () => void;
}

export const useViewerStore = create<ViewerStore>((set, get) => ({
  sessions: [],
  searchQuery: "",
  drillIndex: null,
  selectedRow: -1,

  load() {
    set({ sessions: getSessions() });
  },

  setSearch(q) {
    set({ searchQuery: q, selectedRow: -1 });
  },

  openDrill(index) {
    set({ drillIndex: index, selectedRow: -1 });
  },

  closeDrill() {
    set({ drillIndex: null });
  },

  removeSession(id) {
    deleteSession(id);
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      drillIndex: null,
    }));
  },

  editLines(sessionId, lines) {
    updateSession(sessionId, lines);
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId ? { ...sess, lines } : sess
      ),
    }));
  },

  navigateRows(dir) {
    const { sessions, searchQuery, selectedRow } = get();
    const q = searchQuery.trim().toLowerCase();
    const filtered = [...sessions]
      .reverse()
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.lines.some((l) => l.content.toLowerCase().includes(q))
      );

    const max = filtered.length - 1;
    const next =
      dir === "down"
        ? Math.min(selectedRow + 1, max)
        : Math.max(selectedRow - 1, 0);

    set({ selectedRow: next });
  },

  resetSelection() {
    set({ selectedRow: -1 });
  },
}));
