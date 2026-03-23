import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { CardMode, NoteLine } from "@/types";
import { wrapText, measureText } from "@/lib/ruler";
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
  pasteText: (text: string, cardWidth: number) => void;
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
      set((s) => {
        if (s.mode === "title") {
          if (s.titleText.length >= 72) return;
          s.titleHistory.push(s.titleText);
          s.titleText += char;
        } else {
          const test = s.noteText + char;
          if (wrapText(test, cardWidth).length > 1) {
            // Auto-advance: commit current line, start new with the typed char
            if (s.noteText.trim()) {
              s.lineCounter++;
              s.allLines.push({ content: s.noteText.trim() });
              s.prevGhost = s.noteText;
              s.prevGhostTag = `~${s.lineCounter}`;
            }
            // Carry the leading #tag prefix to the new line
            const tagPrefix = s.noteText.match(/^(#\w+\s+)/)?.[1] ?? "";
            s.noteText = tagPrefix + char;
            s.noteHistory = [];
            s.prevWrapCount = 1;
            s.lastWrapped = char;
          } else {
            s.noteHistory.push(s.noteText);
            s.noteText = test;
            s.prevWrapCount = 1;
            s.lastWrapped = test;
          }
        }
      });
      sounds.key();
    },

    pasteText(text, cardWidth) {
      set((s) => {
        if (s.mode === "title") {
          s.titleHistory.push(s.titleText);
          s.titleText = (s.titleText + text).slice(0, 72);
          return;
        }

        // Split combined text into tagged sections.
        // "#tag content more content #tag2 other" →
        // [{tag: null, content: "..."}, {tag: "tag", content: "..."}, ...]
        const raw = s.noteText + text;
        const parts = raw.split(/(#\w+)/);
        const segments: Array<{ tag: string | null; content: string }> = [];
        if (parts[0]) segments.push({ tag: null, content: parts[0] });
        for (let i = 1; i < parts.length; i += 2) {
          const tag = parts[i].slice(1).toLowerCase();
          const content = (parts[i + 1] ?? "").replace(/^\s+/, "");
          segments.push({ tag, content });
        }

        for (let si = 0; si < segments.length; si++) {
          const { tag, content } = segments[si];
          const prefix = tag ? `#${tag} ` : "";
          // Wrap the content for this section with its available width
          const availW = tag ? Math.max(cardWidth - measureText(prefix), cardWidth * 0.5) : cardWidth;
          const wrappedLines = wrapText(content, availW);
          const isLastSeg = si === segments.length - 1;

          const linesToCommit = isLastSeg ? wrappedLines.slice(0, -1) : wrappedLines;
          for (const chunk of linesToCommit) {
            const c = chunk.trim();
            if (!c) continue;
            s.lineCounter++;
            s.allLines.push({ content: prefix + c });
            s.prevGhost = prefix + c;
            s.prevGhostTag = `~${s.lineCounter}`;
          }

          if (isLastSeg) {
            s.noteText = prefix + (wrappedLines[wrappedLines.length - 1] ?? "");
          }
        }

        s.noteHistory = [];
        s.lastWrapped = s.noteText;
        s.prevWrapCount = 1;
      });
      sounds.key();
    },

    backspace(_cardWidth) {
      set((s) => {
        if (s.mode === "title") {
          if (!s.titleText.length) return;
          s.titleHistory.push(s.titleText);
          s.titleText = s.titleText.slice(0, -1);
        } else {
          if (!s.noteText.length) return;
          s.noteHistory.push(s.noteText);
          s.noteText = s.noteText.slice(0, -1);
          s.lastWrapped = s.noteText;
        }
      });
      sounds.backspace();
    },

    commitTitle() {
      const { titleText } = get();
      if (!titleText.trim()) return;
      set((s) => {
        s.mode = "note";
        s.prevGhost = "";
        s.prevGhostTag = "";
        s.prevWrapCount = 1;
        s.titleHistory = [];
        s.noteHistory = [];
      });
      sounds.commit();
    },

    advanceNote(_cardWidth) {
      const { noteText, lastWrapped } = get();
      const content = noteText.trim();

      // Fix: skip empty lines — pressing enter on blank does nothing
      if (!content) {
        sounds.enter();
        return;
      }

      set((s) => {
        // Fix: detect duplicate topic and append instead of creating new line
        // Extract topic tag from content (e.g. "text #topic" → topic = "topic")
        const tagMatch = content.match(/^#(\w+)\s+/) ?? content.match(/#(\w+)$/);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : null;

        if (tag) {
          // Find last line with same tag
          const lastIdx = [...s.allLines].map((l, i) => ({ l, i }))
            .filter(({ l }) => {
              const c = l.content.toLowerCase();
              return c.startsWith(`#${tag} `) || c.endsWith(`#${tag}`);
            })
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

    undo(_cardWidth) {
      set((s) => {
        if (s.mode === "title") {
          if (!s.titleHistory.length) return;
          s.titleText = s.titleHistory.pop()!;
        } else {
          if (!s.noteHistory.length) return;
          s.noteText = s.noteHistory.pop()!;
          s.lastWrapped = s.noteText;
        }
      });
      sounds.backspace();
    },

    reset() {
      set(() => ({ ...initialState }));
    },
  }))
);