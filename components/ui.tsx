import React, { useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import {
  BookOpen, Banknote, Leaf, Cpu, Shield, Trophy, Globe, FileText, Landmark, Scale, TrainFront,
  Users, Award, CalendarDays, Library, Briefcase, Layers, LucideIcon,
} from "lucide-react";
import { IMPORTANCE_META, Importance, SOURCE_META, TOPIC_LABEL, TopicId, sourceLabel } from "@/lib/exams";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** 🔥 MUST READ / ⭐ IMPORTANT / 📌 GOOD TO KNOW – deliberately tiny and quiet. */
export function ImportancePill({ level, onDark }: { level?: Importance; onDark?: boolean }) {
  if (!level) return null;
  const m = IMPORTANCE_META[level];
  const tone = onDark
    ? "bg-white/20 text-white backdrop-blur-md"
    : level === "must"
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : level === "important"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-black/[0.06] text-black/60 dark:bg-white/10 dark:text-white/60";
  return (
    <span className={cx("pill uppercase", tone)}>
      <span aria-hidden>{m.emoji}</span>{m.label}
    </span>
  );
}

/** Source label that never hides where a story came from. PIB gets its full name. */
export function SourceTag({ source, full, onDark, className }: { source: string; full?: boolean; onDark?: boolean; className?: string }) {
  const meta = SOURCE_META[source];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider", onDark ? "text-white" : "", className)}>
      {sourceLabel(source)}
      {meta?.official && (
        <span className={cx("pill !px-1.5 !py-[2px] normal-case tracking-normal", onDark ? "bg-white/25 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>Official</span>
      )}
      {full && meta?.full && <span className={cx("normal-case tracking-normal font-medium", onDark ? "text-white/80" : "t2")}>{meta.full}</span>}
    </span>
  );
}

export function CoveredBy({ count, onClick, onDark }: { count?: number; onClick?: () => void; onDark?: boolean }) {
  if (!count || count < 2) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cx("pill press focus-ring", onDark ? "bg-black/45 text-white backdrop-blur-md" : "surface-2 text-black/70 dark:text-white/70")}
    >
      <Layers size={11} /> Covered by {count} sources
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md", className }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; size?: "sm" | "md"; className?: string;
}) {
  return (
    <div role="tablist" className={cx("relative inline-flex rounded-full p-[3px] surface-2", className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id} role="tab" aria-selected={active} onClick={() => onChange(o.id)}
            className={cx("relative rounded-full font-semibold transition-colors focus-ring", size === "sm" ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]",
              active ? "text-black dark:text-white" : "t2")}
          >
            {active && (
              <motion.span layoutId={`seg-${options.map((x) => x.id).join("")}`} className="absolute inset-0 rounded-full bg-white dark:bg-[#3A3A3C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const TOPIC_ICON: Record<TopicId, LucideIcon> = {
  schemes: FileText, appointments: Briefcase, awards: Award, economy: Landmark, banking: Banknote,
  scitech: Cpu, defence: Shield, sports: Trophy, international: Globe, reports: Library,
  polity: Scale, environment: Leaf, days: CalendarDays, infrastructure: TrainFront, social: Users, books: BookOpen,
};
export const topicLabel = (t: TopicId) => TOPIC_LABEL[t];

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-xl", className)} />;
}

export function Thumb({ src, className }: { src?: string; className?: string }) {
  const [ok, setOk] = React.useState(true);
  return (
    <div className={cx("overflow-hidden surface-2 shrink-0", className)}>
      {ok && src ? <img src={src} alt="" loading="lazy" onError={() => setOk(false)} className="w-full h-full object-cover" /> : null}
    </div>
  );
}

/** Bottom sheet with spring motion, drag-to-dismiss from the grabber, Esc and backdrop-to-close. */
export function Sheet({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  const controls = useDragControls();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="absolute bottom-0 left-1/2 w-full max-w-[560px] max-h-[92dvh] flex flex-col rounded-t-[28px] surface shadow-lift"
        style={{ x: "-50%" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 34, stiffness: 340 }}
        drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
      >
        <div className="pt-2.5 pb-1 flex justify-center cursor-grab touch-none shrink-0" onPointerDown={(e) => controls.start(e)}>
          <span className="w-9 h-[5px] rounded-full bg-black/15 dark:bg-white/20" />
        </div>
        <div className="overflow-y-auto no-scrollbar flex-1 overscroll-contain">{children}</div>
      </motion.div>
    </div>
  );
}
