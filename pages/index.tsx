import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowLeft, ArrowUp, RefreshCw, Search, Volume2, VolumeX, WifiOff } from "lucide-react";

import { EXAMS, ExamId, GENERAL_CATEGORIES, Mode, TOPIC_LABEL, TopicId, examById } from "@/lib/exams";
import { load, save } from "@/lib/client";
import type { NewsItem, Tab } from "@/lib/types";
import Onboarding, { OnboardingResult } from "@/components/Onboarding";
import NewsCard from "@/components/NewsCard";
import StudentHome from "@/components/StudentHome";
import SearchView from "@/components/SearchView";
import SavedView from "@/components/SavedView";
import ExamsView from "@/components/ExamsView";
import ProfileView from "@/components/ProfileView";
import TabBar from "@/components/TabBar";
import { ArticleSheet, CoverageSheet } from "@/components/Sheets";
import { Segmented, Skeleton, cx } from "@/components/ui";

// Same ten categories as before (+ "For You"). "Saved" moved to its own tab.
const CATEGORIES = [{ id: "all", label: "For You" }, ...GENERAL_CATEGORIES];

type StudentScope = { type: "topic" | "category"; id: string };

export default function SmartReelsApp() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  // ── existing feed state (unchanged) ──
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [showBothLanguages, setShowBothLanguages] = useState(false);
  const [likedNews, setLikedNews] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ── new: experience state ──
  const [mode, setMode] = useState<Mode>("general");
  const [exam, setExam] = useState<ExamId | null>(null);
  const [focus, setFocus] = useState<TopicId[]>([]);
  const [onboarded, setOnboarded] = useState(true);
  const [flow, setFlow] = useState<null | "full" | "exam">(null);
  const [tab, setTab] = useState<Tab>("home");
  const [feedOpen, setFeedOpen] = useState(false);
  const [studentScope, setStudentScope] = useState<StudentScope>({ type: "topic", id: "all" });
  const [saved, setSaved] = useState<NewsItem[]>([]);
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [coverageFor, setCoverageFor] = useState<NewsItem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const cardStartTimeRef = useRef<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const currentCardIdRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const student = mode === "student" && exam !== null;
  const effCategory = student ? (studentScope.type === "category" ? studentScope.id : "all") : selectedCategory;
  const effTopic = student && studentScope.type === "topic" && studentScope.id !== "all" ? studentScope.id : "";
  const showFeed = tab === "home" && (!student || feedOpen);
  const scopeKey = `${student ? `s:${exam}:${focus.join(",")}` : "g"}|${effCategory}|${effTopic}|${nonce}`;

  // Refs so the (stable) fetchNews / interval always see the latest scope without re-creating.
  const scopeRef = useRef({ student, exam, focus, topic: effTopic });
  scopeRef.current = { student, exam, focus, topic: effTopic };
  const weightsRef = useRef(weights); weightsRef.current = weights;
  const newsRef = useRef(news); newsRef.current = news;
  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);
  const keyRef = useRef("");
  const loadedKeyRef = useRef<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ── load persisted preferences once ──
  useEffect(() => {
    setMounted(true);
    try { const w = localStorage.getItem("news_weights"); if (w) setWeights(JSON.parse(w)); } catch { /* ignore corrupt value */ }
    setMode(load<Mode>("nr_mode", "general"));
    setExam(load<ExamId | null>("nr_exam", null));
    setFocus(load<TopicId[]>("nr_focus", []));
    setSaved(load<NewsItem[]>("nr_saved", []));
    setLanguage(load<"en" | "hi">("nr_lang", "en"));
    const done = load<boolean>("nr_onboarded", false);
    setOnboarded(done);
    if (!done) setFlow("full");
    setPrefsReady(true);
  }, []);

  useEffect(() => { if (prefsReady) { save("nr_mode", mode); save("nr_exam", exam); save("nr_focus", focus); save("nr_lang", language); } }, [prefsReady, mode, exam, focus, language]);
  useEffect(() => { if (prefsReady) save("nr_saved", saved.slice(0, 300)); }, [prefsReady, saved]);

  const updateWeight = useCallback((category: string, amount: number) => {
    setWeights((prev) => {
      const next = { ...prev, [category]: (prev[category] || 0) + amount };
      localStorage.setItem("news_weights", JSON.stringify(next));
      return next;
    });
  }, []);

  // ── the news loader: same endpoint, same pagination; only extra optional params for Student mode ──
  const fetchNews = useCallback(
    async (pageNum: number, category: string, currentWeights: any, reset = false, background = false) => {
      const key = keyRef.current;
      try {
        if (!background) { setIsLoading(true); isLoadingRef.current = true; setLoadError(false); }
        const s = scopeRef.current;
        const weightParam = encodeURIComponent(JSON.stringify(currentWeights));
        let url = `/api/news?page=${pageNum}&category=${category}&weights=${weightParam}`;
        if (s.student) {
          url += `&mode=student&exam=${s.exam}`;
          if (s.focus.length) url += `&focus=${s.focus.join(",")}`;
          if (s.topic) url += `&topic=${s.topic}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (keyRef.current !== key) return; // user moved on – ignore stale response
        const incoming: NewsItem[] = data.items || [];

        if (background) {
          // Never yank the list from under the reader – just tell them there's something new.
          const have = new Set(newsRef.current.map((n) => n.id));
          setNewCount(incoming.filter((n) => !have.has(n.id)).length);
          return;
        }
        if (reset) setNews(incoming);
        else setNews((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          return [...prev, ...incoming.filter((n) => !existingIds.has(n.id))];
        });
        setHasMore(!!data.hasMore);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
        if (!background && keyRef.current === key) setLoadError(true);
      } finally {
        if (!background && keyRef.current === key) { setIsLoading(false); isLoadingRef.current = false; }
      }
    }, []
  );

  const resetFeed = useCallback(() => {
    setNews([]); setPage(1); pageRef.current = 1; setHasMore(true); setNewCount(0); setLoadError(false);
    currentCardIdRef.current = null; setActiveCardId(null);
    window.speechSynthesis?.cancel();
    containerRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // (Re)load whenever the visible feed's scope changes – category, topic, mode, exam, or manual refresh.
  useEffect(() => {
    if (!mounted || !prefsReady || !showFeed) return;
    if (loadedKeyRef.current === scopeKey) return;
    loadedKeyRef.current = scopeKey;
    keyRef.current = scopeKey;
    resetFeed();
    fetchNews(1, effCategory, weightsRef.current, true);
  }, [mounted, prefsReady, showFeed, scopeKey, effCategory, fetchNews, resetFeed]);

  // Background check every 30s keeps the server cache warm and surfaces "N new stories".
  useEffect(() => {
    if (!mounted || !showFeed) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      fetchNews(1, effCategory, weightsRef.current, false, true);
    }, 30000);
    return () => clearInterval(id);
  }, [mounted, showFeed, scopeKey, effCategory, fetchNews]);

  useEffect(() => {
    if (news.length > 0 && !currentCardIdRef.current) {
      currentCardIdRef.current = news[0].id;
      setActiveCardId(news[0].id);
      cardStartTimeRef.current[news[0].id] = Date.now();
    }
  }, [news]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (clientHeight === 0) return;

    const activeIndex = Math.round(scrollTop / clientHeight);
    const activeCard = news[activeIndex];

    if (activeCard && activeCard.id !== currentCardIdRef.current) {
      currentCardIdRef.current = activeCard.id;
      setActiveCardId(activeCard.id);
      Object.keys(cardStartTimeRef.current).forEach((id) => {
        if (id !== activeCard.id) {
          const dur = (Date.now() - cardStartTimeRef.current[id]) / 1000;
          if (dur > 15) { const c = news.find((n) => n.id === id); if (c) updateWeight(c.category, 0.5); }
          delete cardStartTimeRef.current[id];
        }
      });
      cardStartTimeRef.current[activeCard.id] = Date.now();
    }

    // Infinite scroll: fetch the next page when ~one card from the end.
    const scrollBottom = scrollHeight - (scrollTop + clientHeight);
    if (scrollBottom < 400 && !isLoadingRef.current && hasMore) {
      const next = pageRef.current + 1;
      pageRef.current = next; setPage(next);
      fetchNews(next, effCategory, weightsRef.current);
    }
  };

  // ── navigation / mode helpers ──
  const goHomeBriefing = () => { setTab("home"); setFeedOpen(false); setStudentScope({ type: "topic", id: "all" }); };
  const changeMode = (m: Mode) => {
    if (m === mode) return;
    if (m === "student" && !exam) { setFlow("exam"); return; }
    setMode(m); setTab("home"); setFeedOpen(false); setStudentScope({ type: "topic", id: "all" });
  };
  const finishOnboarding = (r: OnboardingResult) => {
    setMode(r.mode); if (r.exam) setExam(r.exam); setFocus(r.focus);
    setOnboarded(true); save("nr_onboarded", true); setFlow(null);
    setTab("home"); setFeedOpen(false); setStudentScope({ type: "topic", id: "all" });
  };
  const openTopicFeed = (t: TopicId | "all") => { setStudentScope({ type: "topic", id: t }); setFeedOpen(true); setTab("home"); };
  const openCategory = (id: string) => {
    if (student) { setStudentScope({ type: id === "all" ? "topic" : "category", id }); setFeedOpen(true); }
    else setSelectedCategory(id);
    setTab("home");
  };
  const selectExam = (id: ExamId) => { setExam(id); if (id !== "other") { setFocus([]); goHomeBriefing(); } };
  const refreshFeed = () => { loadedKeyRef.current = null; setNonce((n) => n + 1); };

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);
  const toggleSave = (item: NewsItem) =>
    setSaved((prev) => {
      if (prev.some((s) => s.id === item.id)) { return prev.filter((s) => s.id !== item.id); }
      const { content, ...slim } = item as any;
      notify("Saved");
      return [slim as NewsItem, ...prev];
    });
  const toggleLike = (id: string) => setLikedNews((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (!mounted) return null;

  const def = examById(exam);
  const feedTopics = exam === "other" && focus.length ? focus : def.topics;
  const chips: { id: string; label: string }[] =
    student && studentScope.type === "topic"
      ? [{ id: "all", label: "All" }, ...feedTopics.map((t) => ({ id: t, label: TOPIC_LABEL[t] }))]
      : CATEGORIES;
  const chipSelected = student ? (studentScope.type === "topic" ? studentScope.id : studentScope.id) : selectedCategory;
  const onChip = (id: string) => {
    if (student) setStudentScope(studentScope.type === "topic" ? { type: "topic", id } : { type: id === "all" ? "topic" : "category", id });
    else setSelectedCategory(id);
  };

  const inFeed = tab === "home" && showFeed;
  const scopeTitle = student
    ? studentScope.type === "topic" ? (studentScope.id === "all" ? `${def.label} feed` : TOPIC_LABEL[studentScope.id as TopicId]) : (GENERAL_CATEGORIES.find((c) => c.id === studentScope.id)?.label || "Feed")
    : "";

  return (
    <div className="h-[100dvh] w-full flex flex-col canvas font-sans overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 glass border-b hair z-50 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 h-[52px]">
          <div className="flex items-center gap-2.5 min-w-0">
            {student && inFeed ? (
              <button onClick={() => setFeedOpen(false)} aria-label="Back to briefing" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[15px] font-medium focus-ring rounded-md -ml-1 pr-1">
                <ArrowLeft size={20} /><span className="truncate max-w-[88px]">{scopeTitle}</span>
              </button>
            ) : (
              <>
                <button onClick={refreshFeed} aria-label="Refresh" className="w-8 h-8 rounded-[10px] bg-blue-500 text-white flex items-center justify-center shrink-0 press focus-ring">
                  <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                </button>
                <div className={cx("min-w-0", inFeed && "hidden min-[430px]:block")}>
                  <h1 className="text-[17px] font-semibold tracking-[-0.02em] leading-none">News<span className="text-blue-500">Reel</span></h1>
                  {inFeed && !student && (
                    <p className="text-[10px] t3 leading-none mt-1 whitespace-nowrap">Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {inFeed && (
              <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} aria-label={isAudioEnabled ? "Turn off read aloud" : "Turn on read aloud"} aria-pressed={isAudioEnabled}
                className={cx("icon-btn focus-ring !w-9 !h-9", isAudioEnabled && "!bg-blue-500 text-white hover:!bg-blue-500")}>
                {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            )}
            {tab === "home" && !(student && inFeed) && (
              <button onClick={() => setTab("explore")} aria-label="Search" className="icon-btn focus-ring !w-9 !h-9"><Search size={16} /></button>
            )}
            <Segmented<Mode> size="sm" value={student ? "student" : "general"} onChange={changeMode}
              options={[{ id: "general", label: "General" }, { id: "student", label: "Student" }]} />
          </div>
        </div>

        {/* Category bar (General) / topic chips (Student feed) */}
        {inFeed && (
          <nav aria-label={student ? "Topics" : "Categories"} className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5">
            {chips.map((cat) => {
              const on = chipSelected === cat.id;
              return (
                <button key={cat.id} onClick={() => onChip(cat.id)} aria-pressed={on}
                  className={cx("whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium press focus-ring transition-colors",
                    on ? "bg-black text-white dark:bg-white dark:text-black" : "surface-2 t2 hover:text-black dark:hover:text-white")}>
                  {cat.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 relative">
        {/* Reel feed – stays mounted so scroll position & loaded pages survive tab changes */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          className={cx("absolute inset-0 overflow-y-auto snap-y snap-mandatory no-scrollbar", !showFeed && "invisible pointer-events-none")}
          style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
          aria-hidden={!showFeed}
        >
          {news.length > 0 ? (
            news.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="w-full h-full snap-start flex items-center justify-center p-3 sm:p-4 relative">
                <NewsCard
                  item={item}
                  isLiked={likedNews.has(item.id)} onLike={() => toggleLike(item.id)}
                  isSaved={savedIds.has(item.id)} onSave={() => toggleSave(item)}
                  isAudioEnabled={isAudioEnabled}
                  isActive={showFeed && activeCardId === item.id}
                  lang={language} showBoth={showBothLanguages} student={student}
                  onCoverage={() => setCoverageFor(item)} notify={notify}
                />
              </div>
            ))
          ) : (
            <div className="h-full w-full flex items-center justify-center p-4">
              {loadError ? (
                <div className="card p-8 text-center max-w-[320px]">
                  <WifiOff className="mx-auto t3" size={26} />
                  <p className="font-semibold mt-3">Couldn&apos;t load stories</p>
                  <p className="t2 text-[14px] mt-1">Check your connection and try again.</p>
                  <button onClick={refreshFeed} className="mt-5 rounded-full bg-blue-500 text-white px-5 py-2.5 text-[14px] font-semibold press focus-ring">Retry</button>
                </div>
              ) : isLoading ? (
                <div className="w-full max-w-[420px] h-full max-h-[760px] card !rounded-[28px] overflow-hidden flex flex-col" aria-busy="true" aria-label="Loading stories">
                  <Skeleton className="!rounded-none h-[36%] w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-3 w-32" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-3 w-full mt-4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ) : (
                <div className="card p-8 text-center max-w-[320px]">
                  <p className="font-semibold">No stories here yet</p>
                  <p className="t2 text-[14px] mt-1">Try another category or refresh.</p>
                  <button onClick={refreshFeed} className="mt-5 rounded-full bg-blue-500 text-white px-5 py-2.5 text-[14px] font-semibold press focus-ring">Refresh</button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* "N new stories" pill */}
        <AnimatePresence>
          {showFeed && newCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              onClick={refreshFeed}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 rounded-full bg-blue-500 text-white text-[13px] font-semibold px-4 py-2 shadow-lift press focus-ring"
            >
              <ArrowUp size={14} /> {newCount >= 5 ? "New stories" : `${newCount} new ${newCount === 1 ? "story" : "stories"}`}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Other screens */}
        {!showFeed && (
          <div className="absolute inset-0 overflow-y-auto overscroll-contain">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                {tab === "home" && student && exam && (
                  <StudentHome exam={exam} focus={focus} lang={language}
                    onOpen={setArticle} onCoverage={setCoverageFor} onTopic={(t) => openTopicFeed(t)} onOpenFeed={() => openTopicFeed("all")} />
                )}
                {tab === "explore" && (
                  <SearchView mode={student ? "student" : "general"} exam={exam} focus={focus} lang={language}
                    onOpen={setArticle} onCoverage={setCoverageFor} onCategory={openCategory} />
                )}
                {tab === "exams" && (
                  <ExamsView exam={exam} focus={focus} onSelect={selectExam} onFocus={setFocus} onTopic={(t) => openTopicFeed(t)} />
                )}
                {tab === "saved" && (
                  <SavedView saved={saved} lang={language} student={student} onOpen={setArticle}
                    onRemove={(i) => setSaved((p) => p.filter((s) => s.id !== i.id))} notify={notify} />
                )}
                {tab === "profile" && (
                  <ProfileView
                    mode={student ? "student" : "general"} exam={exam} onMode={changeMode} onChangeExam={() => setFlow("exam")}
                    lang={language} setLang={setLanguage} showBoth={showBothLanguages} setShowBoth={setShowBothLanguages}
                    audio={isAudioEnabled} setAudio={setIsAudioEnabled} theme={theme} setTheme={setTheme}
                    savedCount={saved.length} onClearSaved={() => { setSaved([]); notify("Saved stories cleared"); }}
                    onReset={() => {
                      ["nr_mode", "nr_exam", "nr_focus", "nr_onboarded", "news_weights"].forEach((k) => localStorage.removeItem(k));
                      setWeights({}); setMode("general"); setExam(null); setFocus([]); setOnboarded(false); setFlow("full"); setTab("home"); setFeedOpen(false);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      <TabBar tab={tab} mode={student ? "student" : "general"} onTab={(t) => { if (t === "home" && tab === "home" && student) setFeedOpen(false); setTab(t); }} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
            role="status" className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[95] rounded-full bg-black/85 dark:bg-white/90 text-white dark:text-black text-[13px] font-medium px-4 py-2.5 shadow-lift backdrop-blur">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheets */}
      <AnimatePresence>
        {article && (
          <ArticleSheet key="article" item={article} lang={language} student={student} isSaved={savedIds.has(article.id)}
            onSave={() => toggleSave(article)} onClose={() => setArticle(null)} onCoverage={() => setCoverageFor(article)} notify={notify} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {coverageFor && <CoverageSheet key="coverage" item={coverageFor} onClose={() => setCoverageFor(null)} />}
      </AnimatePresence>

      {/* Onboarding / exam selection */}
      <AnimatePresence>
        {flow && (
          <Onboarding key="onboarding" start={flow} initialExam={exam} initialFocus={focus}
            onDone={finishOnboarding} onCancel={onboarded || flow === "exam" ? () => setFlow(null) : undefined} />
        )}
      </AnimatePresence>
    </div>
  );
}
