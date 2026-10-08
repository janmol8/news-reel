import type { NewsItem } from "./types";

export const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
};
export const save = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full / blocked */ }
};

export const pickTitle = (i: NewsItem, lang: "en" | "hi") => (lang === "hi" ? i.title_hi || i.title_en : i.title_en) || "";
export const pickSummary = (i: NewsItem, lang: "en" | "hi") => (lang === "hi" ? i.summary_hi || i.summary_en : i.summary_en) || "";

export function timeAgo(iso?: string, fallback = ""): string {
  if (!iso) return fallback;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return fallback;
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
}
export const itemAge = (i: NewsItem) => timeAgo(i.pubDate, i.time);

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
export const longDate = (d = new Date()) =>
  d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

/** Share via the native sheet, falling back to the clipboard. Returns what happened. */
export async function shareItem(item: NewsItem, lang: "en" | "hi"): Promise<"shared" | "copied" | "failed"> {
  const title = pickTitle(item, lang), text = pickSummary(item, lang);
  try {
    if (navigator.share) { await navigator.share({ title, text, url: item.link }); return "shared"; }
    await navigator.clipboard.writeText(`${title}\n\n${text}\n\nRead more at: ${item.link}`);
    return "copied";
  } catch (e: any) {
    return e?.name === "AbortError" ? "shared" : "failed";
  }
}
