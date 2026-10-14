const COLORS = ["#5B8DEF", "#22A06B", "#F5A524", "#E5484D", "#8B5CF6", "#0EA5E9", "#EC4899", "#14B8A6"];

export function initials(first: string, last = "") {
  const start = first.trim().charAt(0);
  const end = last.trim().charAt(0);
  return `${start}${end}`.toUpperCase() || "?";
}

export function colorFrom(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length] ?? COLORS[0];
}

export function formatWhen(iso: string | null) {
  if (!iso) return "Nunca";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Nunca";
  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${day} · ${time}`;
}

export function personAvatar(first: string, last: string, seed: string) {
  return { initials: initials(first, last), color: colorFrom(seed) };
}
