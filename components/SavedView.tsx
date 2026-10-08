import React, { useMemo, useState } from "react";
import { Bookmark, Copy, Trash2 } from "lucide-react";
import { TOPIC_LABEL, TopicId } from "@/lib/exams";
import { itemAge, pickTitle } from "@/lib/client";
import type { NewsItem } from "@/lib/types";
import { ImportancePill, Segmented, SourceTag, Thumb } from "./ui";

type View = "all" | "must" | "topics";

export default function SavedView({ saved, lang, student, onOpen, onRemove, notify }: {
  saved: NewsItem[]; lang: "en" | "hi"; student: boolean;
  onOpen: (i: NewsItem) => void; onRemove: (i: NewsItem) => void; notify: (m: string) => void;
}) {
  const [view, setView] = useState<View>("all");

  const must = saved.filter((i) => i.importance === "must");
  const groups = useMemo(() => {
    const m = new Map<string, NewsItem[]>();
    for (const i of saved) {
      const key = i.topics?.[0] ? TOPIC_LABEL[i.topics[0] as TopicId] : "Other";
      m.set(key, [...(m.get(key) || []), i]);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [saved]);

  const copyNotes = async () => {
    const text = groups.map(([g, list]) =>
      `${g.toUpperCase()}\n` + list.map((i) => `• ${pickTitle(i, lang)}${i.why ? `\n  Why it matters: ${i.why}` : ""}`).join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(text); notify("Revision notes copied"); } catch { notify("Couldn't copy"); }
  };

  const Row = ({ it }: { it: NewsItem }) => (
    <li className="flex items-center gap-3 p-4">
      <button onClick={() => onOpen(it)} className="flex-1 min-w-0 flex items-center gap-4 text-left press focus-ring rounded-lg">
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold leading-snug tracking-[-0.01em] line-clamp-3">{pickTitle(it, lang)}</span>
          {student && it.why && view === "topics" && <span className="block text-[13px] t2 leading-snug mt-1.5 line-clamp-2">{it.why}</span>}
          <span className="mt-2 flex items-center gap-2 flex-wrap"><SourceTag source={it.source} /><span className="t3 text-[11.5px]">{itemAge(it)}</span>{student && <ImportancePill level={it.importance} />}</span>
        </span>
        <Thumb src={it.imageUrl} className="w-[60px] h-[60px] rounded-[14px]" />
      </button>
      <button aria-label="Remove bookmark" onClick={() => onRemove(it)} className="icon-btn focus-ring !w-9 !h-9 t2 shrink-0"><Trash2 size={15} /></button>
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-3 pb-10">
      <div className="flex items-end justify-between">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight">Saved</h1>
        {saved.length > 0 && student && (
          <button onClick={copyNotes} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 dark:text-blue-400 pb-2 focus-ring rounded"><Copy size={14} /> Copy notes</button>
        )}
      </div>
      <p className="t2 text-[14px] mt-0.5">{student ? "Your revision material." : "Stories you bookmarked."}</p>

      {saved.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <Bookmark className="mx-auto t3" size={28} />
          <p className="font-semibold mt-3">Nothing saved yet</p>
          <p className="t2 text-[14px] mt-1 max-w-xs mx-auto">Tap the bookmark on any story to keep it here{student ? " as revision material" : ""}.</p>
        </div>
      ) : (
        <>
          {student && (
            <div className="mt-5">
              <Segmented<View> value={view} onChange={setView} size="sm" options={[
                { id: "all", label: `All ${saved.length}` }, { id: "must", label: `Must read ${must.length}` }, { id: "topics", label: "By topic" }]} />
            </div>
          )}
          {view === "topics" && student ? (
            <div className="mt-6 space-y-7">
              {groups.map(([g, list]) => (
                <section key={g}>
                  <h2 className="eyebrow t3 mb-2 px-1">{g} · {list.length}</h2>
                  <ul className="card divide-y hair">{list.map((it) => <Row key={it.id} it={it} />)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="card divide-y hair mt-5">
              {(view === "must" ? must : saved).map((it) => <Row key={it.id} it={it} />)}
              {view === "must" && must.length === 0 && <li className="p-6 text-center t2 text-[14px]">No saved Must-read stories yet.</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
