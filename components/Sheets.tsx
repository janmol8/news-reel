import React from "react";
import { ArrowUpRight, Bookmark, Layers, Share2 } from "lucide-react";
import { examById, TOPIC_LABEL } from "@/lib/exams";
import { itemAge, pickSummary, pickTitle, shareItem, timeAgo } from "@/lib/client";
import type { NewsItem } from "@/lib/types";
import { CoveredBy, ImportancePill, Sheet, SourceTag, cx } from "./ui";

interface ArticleProps {
  item: NewsItem; lang: "en" | "hi"; isSaved: boolean; student: boolean;
  onSave: () => void; onClose: () => void; onCoverage: () => void; notify: (m: string) => void;
}

export function ArticleSheet({ item, lang, isSaved, student, onSave, onClose, onCoverage, notify }: ArticleProps) {
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <Sheet onClose={onClose} label={pickTitle(item, lang)}>
      <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {imgOk && item.imageUrl && (
          <div className="px-4 pt-1">
            <img src={item.imageUrl} alt="" onError={() => setImgOk(false)} className="w-full aspect-[16/10] object-cover rounded-[20px] surface-2" />
          </div>
        )}
        <div className="px-6 pt-5">
          <div className="flex items-center gap-2 flex-wrap">
            <SourceTag source={item.source} full />
            <span className="t3 text-[12px]">· {itemAge(item)}</span>
          </div>
          <h2 className="text-[24px] leading-[1.18] font-semibold tracking-[-0.02em] mt-2.5">{pickTitle(item, lang)}</h2>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {student && <ImportancePill level={item.importance} />}
            {item.topics?.slice(0, 2).map((t) => <span key={t} className="pill surface-2 t2">{TOPIC_LABEL[t]}</span>)}
            {student && item.examTags?.map((e) => <span key={e} className="pill uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">{examById(e).short}</span>)}
          </div>

          <p className="text-[16px] leading-[1.6] mt-5 text-black/75 dark:text-white/80">{pickSummary(item, lang)}</p>

          {student && item.why && (
            <div className="mt-5 rounded-2xl bg-blue-500/[0.07] dark:bg-blue-400/10 px-4 py-3.5">
              <p className="eyebrow text-blue-600 dark:text-blue-400 mb-1">Why it matters</p>
              <p className="text-[14px] leading-snug text-black/75 dark:text-white/80">{item.why}</p>
            </div>
          )}

          {(item.coverageCount || 0) > 1 && (
            <div className="mt-4"><CoveredBy count={item.coverageCount} onClick={onCoverage} /></div>
          )}

          <div className="flex items-center gap-2.5 mt-7">
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-[15px] font-semibold press focus-ring transition-colors">
              Read full story <ArrowUpRight size={16} />
            </a>
            <button aria-label="Share" className="icon-btn focus-ring !w-12 !h-12" onClick={async () => {
              const r = await shareItem(item, lang);
              if (r === "copied") notify("Copied to clipboard");
              if (r === "failed") notify("Couldn't share");
            }}><Share2 size={18} /></button>
            <button aria-label={isSaved ? "Remove bookmark" : "Save"} aria-pressed={isSaved} onClick={onSave}
              className={cx("icon-btn focus-ring !w-12 !h-12", isSaved && "!bg-blue-500 text-white hover:!bg-blue-500")}>
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/** Clean source-comparison view for a story that several outlets reported. */
export function CoverageSheet({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const list = item.coverage || [];
  return (
    <Sheet onClose={onClose} label="Source comparison">
      <div className="px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="eyebrow t3 flex items-center gap-1.5"><Layers size={12} /> Covered by {list.length} sources</p>
        <h2 className="text-[20px] leading-[1.25] font-semibold tracking-[-0.015em] mt-2">{item.title_en}</h2>
        <p className="t2 text-[13px] mt-1.5">Each outlet&apos;s own headline, linked to the original report.</p>

        <ul className="mt-5 divide-y hair border-t hair">
          {list.map((c, i) => (
            <li key={c.source}>
              <a href={c.link} target="_blank" rel="noopener noreferrer" className="block py-4 group focus-ring rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <SourceTag source={c.source} full />
                    {i === 0 && <span className="pill surface-2 t2">Lead</span>}
                  </span>
                  <span className="t3 text-[12px] shrink-0">{timeAgo(c.pubDate)}</span>
                </div>
                <p className="text-[15px] font-medium leading-snug mt-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.title}</p>
                {c.snippet && <p className="text-[13px] t2 leading-snug mt-1 line-clamp-2">{c.snippet}</p>}
                <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400 mt-2">
                  Read on {c.source === "PIB India" ? "PIB" : c.source} <ArrowUpRight size={12} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
