import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { ExamId, GENERAL_CATEGORIES, Mode, TOPIC_LABEL, TopicId, examById } from "@/lib/exams";
import { itemAge, pickTitle } from "@/lib/client";
import type { NewsItem } from "@/lib/types";
import { CoveredBy, ImportancePill, Skeleton, SourceTag, TOPIC_ICON, Thumb, cx } from "./ui";

interface Props {
  mode: Mode; exam: ExamId | null; focus: TopicId[]; lang: "en" | "hi";
  onOpen: (i: NewsItem) => void; onCoverage: (i: NewsItem) => void;
  onCategory: (id: string) => void;
}

const SOURCES = ["PIB", "Al Jazeera", "CNN", "Reuters", "BBC", "The Hindu", "UN News", "Economic Times", "LiveMint"];
const GENERAL_TOPICS: TopicId[] = ["economy", "banking", "polity", "scitech", "international", "defence", "environment", "sports", "schemes", "reports"];
const SUGGEST: Record<string, string[]> = {
  general: ["Budget", "Climate", "AI", "Elections"],
  ssc: ["Scheme", "Award", "Appointed", "Summit"],
  banking: ["RBI", "SEBI", "Repo rate", "UPI"],
  upsc: ["Supreme Court", "Climate", "ISRO", "Bill"],
  railways: ["Railway", "Vande Bharat", "Metro", "Highway"],
  defence: ["Army", "Navy", "Missile", "Exercise"],
  state: ["Chief Minister", "Scheme", "Assembly", "Census"],
  other: ["Scheme", "Economy", "Summit"],
};

export default function SearchView({ mode, exam, focus, lang, onOpen, onCoverage, onCategory }: Props) {
  const student = mode === "student" && !!exam;
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [topic, setTopic] = useState<TopicId | "">("");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const reqRef = useRef(0);

  const active = !!(q.trim() || source || topic);
  const topics: TopicId[] = student ? (exam === "other" && focus.length ? focus : examById(exam).topics) : GENERAL_TOPICS;

  const run = async (pageNum: number, append: boolean) => {
    const id = ++reqRef.current;
    setLoading(true); setError(false);
    try {
      const p = new URLSearchParams({ page: String(pageNum), limit: "10" });
      if (q.trim()) p.set("q", q.trim());
      if (source) p.set("source", source);
      if (topic) p.set("topic", topic);
      if (student) { p.set("mode", "student"); p.set("exam", exam!); if (focus.length) p.set("focus", focus.join(",")); }
      const res = await fetch(`/api/news?${p}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (id !== reqRef.current) return;
      setItems((prev) => {
        const next: NewsItem[] = data.items || [];
        if (!append) return next;
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...next.filter((n) => !seen.has(n.id))];
      });
      setHasMore(!!data.hasMore); setPage(pageNum);
    } catch { if (id === reqRef.current) setError(true); }
    finally { if (id === reqRef.current) setLoading(false); }
  };

  useEffect(() => {
    if (!active) { reqRef.current++; setItems([]); setLoading(false); return; }
    const t = setTimeout(() => run(1, false), 320);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, source, topic, mode, exam, focus.join(",")]);

  const suggestions = SUGGEST[student ? exam! : "general"] || SUGGEST.general;

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-3 pb-10">
      <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight">Explore</h1>

      <div className="relative mt-4">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 t3 pointer-events-none" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={student ? "Search news, topics, sources" : "Search news and sources"}
          aria-label="Search news" enterKeyHint="search"
          className="w-full rounded-full surface-2 pl-11 pr-10 py-3 text-[16px] placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-shadow"
        />
        {q && <button aria-label="Clear search" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 dark:bg-white/25 text-white flex items-center justify-center focus-ring"><X size={13} /></button>}
      </div>

      <Chips label="Sources">
        <Chip on={!source} onClick={() => setSource("")}>All</Chip>
        {SOURCES.map((s) => <Chip key={s} on={source === s} onClick={() => setSource(source === s ? "" : s)}>{s}</Chip>)}
      </Chips>
      <Chips label="Topics">
        <Chip on={!topic} onClick={() => setTopic("")}>All</Chip>
        {topics.map((t) => <Chip key={t} on={topic === t} onClick={() => setTopic(topic === t ? "" : t)}>{TOPIC_LABEL[t]}</Chip>)}
      </Chips>

      {!active ? (
        <>
          <div className="mt-8">
            <h2 className="text-[19px] font-semibold tracking-[-0.015em] mb-3 px-1">Browse by category</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {GENERAL_CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => onCategory(c.id)} className="card !rounded-[18px] px-4 py-4 flex items-center justify-between press focus-ring transition-shadow hover:shadow-lift text-left">
                  <span className="text-[15px] font-semibold">{c.label}</span><ChevronRight size={16} className="t3" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-[19px] font-semibold tracking-[-0.015em] mb-3 px-1">Try searching</h2>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => <button key={s} onClick={() => setQ(s)} className="card !rounded-full px-4 py-2 text-[14px] font-medium press focus-ring">{s}</button>)}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6" aria-live="polite">
          {loading && !items.length ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] w-full !rounded-[18px]" />)}</div>
          ) : error && !items.length ? (
            <div className="card p-8 text-center"><p className="font-semibold">Search is unavailable right now</p>
              <button onClick={() => run(1, false)} className="mt-4 rounded-full bg-blue-500 text-white px-5 py-2.5 text-[14px] font-semibold press focus-ring">Retry</button></div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center"><p className="font-semibold">No results</p><p className="t2 text-[14px] mt-1">Try a different word, topic or source.</p></div>
          ) : (
            <>
              <ul className="card divide-y hair">
                {items.map((it) => (
                  <li key={it.id}>
                    <button onClick={() => onOpen(it)} className="w-full text-left flex gap-4 p-4 press focus-ring rounded-[22px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-semibold leading-snug tracking-[-0.01em] line-clamp-3">{pickTitle(it, lang)}</span>
                        <span className="mt-2 flex items-center gap-2 flex-wrap">
                          <SourceTag source={it.source} /><span className="t3 text-[11.5px]">{itemAge(it)}</span>
                          {student && <ImportancePill level={it.importance} />}
                        </span>
                        <span className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {it.examTags?.map((e) => <span key={e} className="pill uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">{examById(e).short}</span>)}
                          {!it.examTags?.length && <span className="pill uppercase surface-2 t2">General</span>}
                          <CoveredBy count={it.coverageCount} onClick={() => onCoverage(it)} />
                        </span>
                      </span>
                      <Thumb src={it.imageUrl} className="w-[72px] h-[72px] rounded-[14px]" />
                    </button>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button disabled={loading} onClick={() => run(page + 1, true)} className="mx-auto mt-5 block rounded-full surface-2 px-5 py-2.5 text-[14px] font-semibold press focus-ring disabled:opacity-50">
                  {loading ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Chips({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 -mx-5">
      <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-0.5">{children}</div>
    </div>
  );
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={cx("whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium press focus-ring transition-colors",
        on ? "bg-black text-white dark:bg-white dark:text-black" : "surface-2 t2 hover:text-black dark:hover:text-white")}>
      {children}
    </button>
  );
}
