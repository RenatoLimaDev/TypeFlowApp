import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { CardMode, NoteLine } from "@/types";
import { wrapText } from "@/lib/ruler";
import { sounds } from "@/lib/sound";

interface CardStore {
  mode: CardMode;
  titleText: string;
  noteText: string;
  lineCounter: number;
  allLines: NoteLine[];
  prevGhost: string;
  prevGhostTag: string;
  prevWrapCount: number;
  lastWrapped: string;
  sessionDone: boolean;
  titleHistory: string[];
  noteHistory: string[];

  appendChar: (char: string, cardWidth: number) => void;
  backspace: (cardWidth: number) => void;
  commitTitle: () => void;
  advanceNote: (cardWidth: number) => void;
  finishSession: () => { title: string; lines: NoteLine[] } | null;
  undo: (cardWidth: number) => void;
  reset: () => void;
}

const initialState = {
  mode: "title" as CardMode,
  titleText: "",
  noteText: "",
  lineCounter: 0,
  allLines: [] as NoteLine[],
  prevGhost: "",
  prevGhostTag: "",
  prevWrapCount: 1,
  lastWrapped: "",
  sessionDone: false,
  titleHistory: [] as string[],
  noteHistory: [] as string[],
};

export const useCardStore = create<CardStore>()(
  immer((set, get) => ({
    ...initialState,

    appendChar(char, cardWidth) {
      const maxW = cardWidth - 80;
      set((s) => {
        if (s.mode === "title") {
          s.titleHistory.push(s.titleText);
          s.titleText += char;
        } else {
          s.noteHistory.push(s.noteText);
          s.noteText += char;
          const lines = wrapText(s.noteText, maxW);
          const wc = lines.length;
          if (wc > s.prevWrapCount) {
            s.lineCounter += wc - s.prevWrapCount;
            s.prevGhost = lines[wc - 2] ?? "";
            s.prevGhostTag = `~${s.lineCounter}`;
          }
          s.prevWrapCount = wc;
          s.lastWrapped = lines[wc - 1] ?? "";
        }
      });
      sounds.key();
    },

    backspace(cardWidth) {
      const maxW = cardWidth - 80;
      set((s) => {
        if (s.mode === "title") {
          if (!s.titleText.length) return;
          s.titleHistory.push(s.titleText);
          s.titleText = s.titleText.slice(0, -1);
        } else {
          if (!s.noteText.length) return;
          s.noteHistory.push(s.noteText);
          s.noteText = s.noteText.slice(0, -1);
          const lines = wrapText(s.noteText, maxW);
          const wc = lines.length;
          if (wc < s.prevWrapCount) {
            s.lineCounter = Math.max(0, s.lineCounter - (s.prevWrapCount - wc));
            s.prevGhost = lines[wc - 2] ?? s.prevGhost;
            s.prevGhostTag = `~${s.lineCounter}`;
          }
          s.prevWrapCount = wc;
          s.lastWrapped = lines[wc - 1] ?? "";
        }
      });
      sounds.backspace();
    },

    commitTitle() {
      const { titleText } = get();
      if (!titleText.trim()) return;
      set((s) => {
        s.mode = "note";
        s.prevGhost = s.titleText;
        s.prevGhostTag = "title";
        s.prevWrapCount = 1;
        s.titleHistory = [];
        s.noteHistory = [];
      });
      sounds.commit();
    },

    advanceNote(cardWidth) {
      const { noteText, lastWrapped, lineCounter, allLines } = get();
      const content = noteText.trim();

      // Fix: skip empty lines — pressing enter on blank does nothing
      if (!content) {
        sounds.enter();
        return;
      }

      set((s) => {
        // Fix: detect duplicate topic and append instead of creating new line
        // Extract topic tag from content (e.g. "text #topic" → topic = "topic")
        const tagMatch = content.match(/#(\w+)$/);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : null;

        if (tag) {
          // Find last line with same tag
          const lastIdx = [...s.allLines].map((l, i) => ({ l, i }))
            .filter(({ l }) => l.content.toLowerCase().endsWith(`#${tag}`))
            .pop()?.i ?? -1;

          if (lastIdx !== -1) {
            // Same topic exists — insert after the last line with same tag
            const textOnly = content.replace(/#\w+$/, "").trim();
            const insertLine = { content: `${textOnly} #${tag}` };
            s.allLines.splice(lastIdx + 1, 0, insertLine);
            s.lineCounter++;
            s.prevGhost = lastWrapped || content;
            s.prevGhostTag = `~${s.lineCounter}`;
            s.noteText = "";
            s.prevWrapCount = 1;
            s.noteHistory = [];
            sounds.enter();
            return;
          }
        }

        // Normal: add new line
        s.lineCounter++;
        s.allLines.push({ content });
        s.prevGhost = lastWrapped || content;
        s.prevGhostTag = `~${s.lineCounter}`;
        s.noteText = "";
        s.prevWrapCount = 1;
        s.noteHistory = [];
      });
      sounds.enter();
    },

    finishSession() {
      const { noteText, titleText, allLines } = get();
      const content = noteText.trim();
      const finalLines = content
        ? [...allLines, { content }]
        : [...allLines];

      if (finalLines.length === 0 && !titleText.trim()) return null;

      set((s) => { s.sessionDone = true; });
      sounds.commit();

      return {
        title: titleText.trim() || "Untitled",
        lines: finalLines,
      };
    },

    undo(cardWidth) {
      const maxW = cardWidth - 80;
      set((s) => {
        if (s.mode === "title") {
          if (!s.titleHistory.length) return;
          s.titleText = s.titleHistory.pop()!;
        } else {
          if (!s.noteHistory.length) return;
          s.noteText = s.noteHistory.pop()!;
          const lines = wrapText(s.noteText, maxW);
          s.prevWrapCount = lines.length;
          s.lastWrapped = lines[lines.length - 1] ?? "";
        }
      });
      sounds.backspace();
    },

    reset() {
      set(() => ({ ...initialState }));
    },
  }))
);