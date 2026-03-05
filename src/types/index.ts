export interface NoteLine {
  content: string;
}

export interface Session {
  id: string;
  title: string;
  lines: NoteLine[];
  date: string;
  createdAt: number;
}

export interface TopicGroup {
  tag: string | null;
  lines: NoteLine[];
}

export type CardMode = "title" | "note";
export type ExportTheme = "ink" | "night";

export interface CardState {
  mode: CardMode;
  titleText: string;
  noteText: string;
  lineCounter: number;
  allLines: NoteLine[];
  prevGhost: string;
  prevGhostTag: string;
  sessionDone: boolean;
}

export interface AppEvent {
  type: "session-saved";
  payload: Session;
}
