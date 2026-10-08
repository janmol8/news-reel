import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, WifiOff } from "lucide-react";
import { examById, ExamId, TOPIC_LABEL, TopicId } from "@/lib/exams";
import { greeting, itemAge, load, longDate, pickTitle, save } from "@/lib/client";
import type { NewsItem } from "@/lib/types";
import { CoveredBy, ImportancePill, Skeleton, SourceTag, TOPIC_ICON, Thumb, cx } from "./ui";

interface Props {
  exam: ExamId; focus: TopicId[]; lang: "en" | "hi";
  onOpen: (i: NewsItem) => void;
  onCoverage: (i: NewsItem) => void;
  onTopic: (t: TopicId) => void;
  onOpenFeed: () => void;
}

const fade = (i = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as any } });

export default function StudentHome({ exam, focus, lang, onOpen, onCoverage, onTopic, onOpenFeed }: Props) {
  const def = examById(exam);
  const cacheKey = `nr_brief_${exam}_${focus.join("-")}`;
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const fetchBrief = useCallback(async (isCancelled: () => boolean) => {
    try {
      const f = focus.length ? `&focus=${focus.join(",")}` : "";
      const res = await fetch(`/api/news?mode=student&exam=${exam}&page=1&limit=10${f}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (isCancelled()) return;
      const list: NewsItem[] = data.items || [];
      if (list.length) {
        setItems(list); setFailed(false);
        save(cacheKey, { t: Date.now(), items: list.map(({ ...i }) => { delete (i as any).content; return i; }) });
      } else if (!items.length) setFailed(true);
    } catch {
      if (!isCancelled()) setFailed(true);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, focus.join(","), cacheKey]);

  useEffect(() => {
    let cancelled = false;
    // Stale-while-revalidate: paint yesterday's/last briefing instantly, then refresh.
    const cached = load<{ t: number; items: NewsItem[] } | null>(cacheKey, null);
    if (cached?.items?.length) { setItems(cached.items); setLoading(false); } else { setItems([]); setLoading(true); }
    setFailed(false);
    fetchBrief(() => cancelled);
    return () => { cancelled = true; };
  }, [cacheKey, fetchBrief, tick]);

  const hero = items[0];
  const important = items.slice(1, 5);
  const fyx = items.slice(5, 10);
  const topics = (def.id === "other" && focus.length ? focus : def.topics).slice(0, 9);

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-3 pb-10">
      <motion.header {...fade(0)} className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow t3">{greeting()}</p>
          <h1 className="text-[32px] sm:text-[38px] leading-[1.06] font-semibold tracking-[-0.03em] mt-1">
            Your {def.id === "other" ? "Current Affairs" : `${def.label} Current Affairs`}
          </h1>
          <p className="t2 text-[15px] mt-1.5">{longDate()}</p>
        </div>
        <button aria-label="Refresh briefing" onClick={() => { setLoading(true); setTick((t) => t + 1); }} className="icon-btn focus-ring mt-1 shrink-0">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </motion.header>

      {loading && !items.length ? <BriefSkeleton /> : failed && !items.length ? (
        <div className="card mt-8 p-8 text-center">
          <WifiOff className="mx-auto t3" size={26} />
          <p className="font-semibold mt-3">Couldn&apos;t load your briefing</p>
          <p className="t2 text-[14px] mt-1">Check your connection and try again.</p>
          <button onClick={() => { setLoading(true); setTick((t) => t + 1); }} className="mt-5 rounded-full bg-blue-500 text-white px-5 py-2.5 text-[14px] font-semibold press focus-ring">Retry</button>
        </div>
      ) : (
        <>
          {/* TOP EXAM NEWS */}
          {hero && (
            <motion.section {...fade(1)} className="mt-7">
              <p className="eyebrow t3 mb-3 flex items-center gap-1.5">🔥 Top exam news</p>
              <article onClick={() => onOpen(hero)} className="card overflow-hidden cursor-pointer press group transition-shadow hover:shadow-lift">
                <div className="relative aspect-[16/10] surface-2 overflow-hidden">
                  <img src={hero.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between">
                    <ImportancePill level={hero.importance || "must"} onDark />
                    <CoveredBy count={hero.coverageCount} onClick={() => onCoverage(hero)} onDark />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h2 className="text-white text-[23px] leading-[1.18] font-semibold tracking-[-0.02em] line-clamp-3">{pickTitle(hero, lang)}</h2>
                    <p className="mt-2 flex items-center gap-1.5 text-white/85 text-[12px]">
                      <SourceTag source={hero.source} full onDark /> <span>· {itemAge(hero)}</span>
                    </p>
                  </div>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {hero.examTags?.map((e) => <span key={e} className="pill uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">{examById(e).short}</span>)}
                    {hero.topics?.slice(0, 1).map((t) => <span key={t} className="pill surface-2 t2">{TOPIC_LABEL[t]}</span>)}
                  </div>
                  {hero.why && (
                    <div>
                      <p className="eyebrow text-blue-600 dark:text-blue-400 mb-1">Why it matters</p>
                      <p className="text-[14px] leading-snug text-black/75 dark:text-white/80">{hero.why}</p>
                    </div>
                  )}
                </div>
              </article>
            </motion.section>
          )}

          {/* MOST IMPORTANT TODAY */}
          {important.length > 0 && (
            <motion.section {...fade(2)} className="mt-9">
              <SectionTitle title="Most important today" sub="What you should actually know" />
              <ul className="card divide-y hair">
                {important.map((it, i) => (
                  <li key={it.id}>
                    <button onClick={() => onOpen(it)} className="w-full text-left flex items-center gap-4 p-4 press focus-ring rounded-[22px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                      <span className="w-5 text-[20px] font-semibold t3 tabular-nums shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15.5px] font-semibold leading-snug tracking-[-0.01em] line-clamp-2">{pickTitle(it, lang)}</span>
                        <span className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <SourceTag source={it.source} />
                          <span className="t3 text-[11.5px]">{itemAge(it)}</span>
                          <ImportancePill level={it.importance} />
                        </span>
                      </span>
                      <Thumb src={it.imageUrl} className="w-[60px] h-[60px] rounded-[14px]" />
                    </button>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          {/* QUICK REVISION */}
          <motion.section {...fade(3)} className="mt-9">
            <SectionTitle title="Quick revision" sub="Jump into a topic" />
            <div className="grid grid-cols-3 gap-2.5">
              {topics.map((t) => {
                const Icon = TOPIC_ICON[t];
                return (
                  <button key={t} onClick={() => onTopic(t)} className="card !rounded-[18px] p-3.5 text-left press focus-ring transition-shadow hover:shadow-lift">
                    <span className="w-8 h-8 rounded-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Icon size={16} /></span>
                    <span className="block text-[12.5px] font-semibold leading-tight mt-3">{TOPIC_LABEL[t]}</span>
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* FOR YOUR EXAM */}
          {fyx.length > 0 && (
            <motion.section {...fade(4)} className="mt-9">
              <SectionTitle title="For your exam" sub={`${fyx.length} stories you should not miss today`} />
              <ul className="card divide-y hair">
                {fyx.map((it, i) => (
                  <li key={it.id}>
                    <button onClick={() => onOpen(it)} className="w-full text-left p-4 press focus-ring rounded-[22px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                      <span className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold leading-snug tracking-[-0.01em]">{pickTitle(it, lang)}</span>
                          {it.why && <span className="block text-[13px] t2 leading-snug mt-1.5 line-clamp-2">{it.why}</span>}
                          <span className="mt-2 flex items-center gap-2 flex-wrap">
                            <SourceTag source={it.source} />
                            <span className="t3 text-[11.5px]">{itemAge(it)}</span>
                            <ImportancePill level={it.importance} />
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          <motion.div {...fade(5)} className="mt-9">
            <button onClick={onOpenFeed} className={cx("w-full card !rounded-full py-4 px-6 flex items-center justify-between press focus-ring transition-shadow hover:shadow-lift")}>
              <span className="text-[15px] font-semibold">Swipe through your full exam feed</span>
              <ArrowRight size={18} className="text-blue-500" />
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3 px-1">
      <h2 className="text-[21px] font-semibold tracking-[-0.02em] leading-tight">{title}</h2>
      {sub && <p className="t2 text-[13px] mt-0.5">{sub}</p>}
    </div>
  );
}

function BriefSkeleton() {
  return (
    <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading your briefing">
      <Skeleton className="w-full aspect-[16/12] !rounded-[22px]" />
      <Skeleton className="h-5 w-48" />
      <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full !rounded-[18px]" />)}</div>
    </div>
  );
}
