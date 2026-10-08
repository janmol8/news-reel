import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, ChevronRight, Heart, Share2 } from "lucide-react";
import { examById, GENERAL_CATEGORIES, TOPIC_LABEL } from "@/lib/exams";
import { itemAge, pickSummary, pickTitle, shareItem } from "@/lib/client";
import type { NewsItem } from "@/lib/types";
import { CoveredBy, ImportancePill, SourceTag, cx } from "./ui";

interface Props {
  item: NewsItem;
  isLiked: boolean;
  onLike: () => void;
  isSaved: boolean;
  onSave: () => void;
  isAudioEnabled: boolean;
  isActive: boolean;
  lang: "en" | "hi";
  showBoth: boolean;
  student: boolean;
  onCoverage: () => void;
  notify: (msg: string) => void;
}

const catLabel = (c?: string) => GENERAL_CATEGORIES.find((x) => x.id === c)?.label;

export default function NewsCard({ item, isLiked, onLike, isSaved, onSave, isAudioEnabled, isActive, lang, showBoth, student, onCoverage, notify }: Props) {
  const [showHeart, setShowHeart] = useState(false);
  const [viewLang, setViewLang] = useState(lang);
  const [imgOk, setImgOk] = useState(true);
  const lastTapRef = useRef(0);

  useEffect(() => { setViewLang(lang); }, [lang]);

  const summary = pickSummary(item, viewLang);
  const title = pickTitle(item, viewLang);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    lastTapRef.current = now;
  };

  // Audio narration – unchanged behaviour from the original card.
  const speak = useCallback(() => {
    if (!summary || !isAudioEnabled || !isActive) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(summary);
    utt.lang = viewLang === "hi" ? "hi-IN" : "en-US";
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  }, [summary, isAudioEnabled, isActive, viewLang]);

  useEffect(() => {
    if (isActive && isAudioEnabled) { const t = setTimeout(speak, 1000); return () => clearTimeout(t); }
    window.speechSynthesis?.cancel();
  }, [isActive, isAudioEnabled, speak]);

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const eyebrow = [
    student && item.topics?.[0] ? TOPIC_LABEL[item.topics[0]] : catLabel(item.sourceCategory || item.category),
    itemAge(item),
  ].filter(Boolean).join("  ·  ");

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={handleDoubleTap}
      className="relative w-full max-w-[420px] h-full max-h-[760px] card !rounded-[28px] overflow-hidden flex flex-col select-none cursor-pointer"
    >
      <AnimatePresence>
        {showHeart && (
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <Heart size={96} fill="#FF3B30" className="text-[#FF3B30] drop-shadow-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image */}
      <div className="relative shrink-0 overflow-hidden surface-2" style={{ height: student ? "31%" : "36%" }}>
        {imgOk && (
          <motion.img
            src={item.imageUrl} alt="" onError={() => setImgOk(false)} className="w-full h-full object-cover"
            initial={{ scale: 1 }} animate={isActive ? { scale: 1.07, transition: { duration: 14, ease: "linear" } } : { scale: 1 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
        <div className="absolute top-3.5 left-3.5 flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full max-w-[75%]">
          <span className="text-[13px] leading-none" aria-hidden>{item.country}</span>
          <SourceTag source={item.source} onDark className="truncate" />
        </div>
        <div className="absolute bottom-3 left-3.5"><CoveredBy count={item.coverageCount} onClick={onCoverage} onDark /></div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-5 pt-4 pb-4 min-h-0 gap-3">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <span className="eyebrow t3 truncate">{eyebrow}</span>
          {student && <ImportancePill level={item.importance} />}
        </div>

        <h2 className="font-semibold leading-[1.22] tracking-[-0.015em] shrink-0 line-clamp-4" style={{ fontSize: "clamp(18px, 4.8vw, 21px)" }}>
          {title}
        </h2>

        {student && item.examTags && item.examTags.length > 0 && (
          <div className="flex gap-1.5 shrink-0">
            {item.examTags.map((e) => (
              <span key={e} className="pill uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">{examById(e).short}</span>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar [mask-image:linear-gradient(to_bottom,black_88%,transparent)]" onClick={(e) => e.stopPropagation()}>
          <p className="text-[15px] leading-[1.55] t2 text-black/70 dark:text-white/75">{summary}</p>
          <button
            onClick={() => setViewLang(viewLang === "en" ? "hi" : "en")}
            className="mt-2 text-[12px] font-semibold text-blue-600 dark:text-blue-400 focus-ring rounded"
          >
            {viewLang === "en" ? "Translate to Hindi" : "Show in English"}
          </button>
          {showBoth && (
            <div className="mt-3 rounded-2xl surface-2 p-3">
              <p className="eyebrow t3 mb-1">{viewLang === "en" ? "Hindi" : "English"}</p>
              <p className="text-[13px] leading-snug t2">{viewLang === "en" ? item.summary_hi : item.summary_en}</p>
            </div>
          )}
        </div>

        {student && item.why && (
          <div className="shrink-0 rounded-2xl bg-blue-500/[0.07] dark:bg-blue-400/10 px-3.5 py-3">
            <p className="eyebrow text-blue-600 dark:text-blue-400 mb-1">Why it matters</p>
            <p className="text-[13px] leading-snug text-black/75 dark:text-white/80">{item.why}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between shrink-0 pt-1">
          <div className="flex gap-2">
            <button aria-label="Like" aria-pressed={isLiked} onClick={stop(onLike)} className={cx("icon-btn focus-ring", isLiked && "!bg-[#FF3B30] text-white hover:!bg-[#FF3B30]")}>
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button aria-label="Share" className="icon-btn focus-ring" onClick={stop(async () => {
              const r = await shareItem(item, viewLang);
              if (r === "copied") notify("Copied to clipboard");
              if (r === "failed") notify("Couldn't share");
            })}>
              <Share2 size={18} />
            </button>
            <button aria-label={isSaved ? "Remove bookmark" : "Save"} aria-pressed={isSaved} onClick={stop(onSave)} className={cx("icon-btn focus-ring", isSaved && "!bg-blue-500 text-white hover:!bg-blue-500")}>
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
          <button
            onClick={stop(() => window.open(item.link, "_blank", "noopener"))}
            className="inline-flex items-center gap-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white pl-4 pr-3 py-2.5 text-[13px] font-semibold press focus-ring transition-colors"
          >
            Full story <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
