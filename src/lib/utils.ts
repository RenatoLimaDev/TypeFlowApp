import type { NoteLine, TopicGroup } from "@/types";

export function extractTags(text: string): string[] {
  return (text.match(/#[a-záàâãéèêíïóôõöúçñ\w]+/gi) ?? []).map((t) =>
    t.toLowerCase()
  );
}

export function stripTags(text: string): string {
  return text.replace(/#[a-záàâãéèêíïóôõöúçñ\w]+/gi, "").replace(/\s+/g, " ").trim();
}

export function groupByTopic(lines: NoteLine[]): TopicGroup[] {
  const groups: TopicGroup[] = [];
  let current: TopicGroup | null = null;

  for (const line of lines) {
    const tags = extractTags(line.content);
    const tag = tags.length > 0 ? tags[0] : null;

    if (tag && current?.tag === tag) {
      // Same tag as current group — keep grouping
      current.lines.push(line);
    } else if (tag) {
      // New tag — new group
      current = { tag, lines: [line] };
      groups.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      current = { tag: null, lines: [line] };
      groups.push(current);
    }
  }

  return groups;
}

export function sessionSize(lines: NoteLine[]): string {
  const bytes = lines.reduce((a, n) => a + new Blob([n.content]).size, 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), (m) => `<mark>${m}</mark>`);
}
