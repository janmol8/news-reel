import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, ChevronRight, Landmark, LucideIcon, MapPin, Scale, Shield, Sparkles, TrainFront } from "lucide-react";
import { ALL_TOPICS, EXAMS, ExamId, TOPIC_LABEL, TopicId } from "@/lib/exams";
import { cx, TOPIC_ICON } from "./ui";

const EXAM_ICON: Record<ExamId, LucideIcon> = {
  ssc: BookOpen, banking: Landmark, upsc: Scale, railways: TrainFront, defence: Shield, state: MapPin, other: Sparkles,
};

export function ExamPicker({ selected, onSelect }: { selected: ExamId | null; onSelect: (id: ExamId) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {EXAMS.map((e, i) => {
        const Icon = EXAM_ICON[e.id];
        const active = selected === e.id;
        return (
          <motion.button
            key={e.id}
            onClick={() => onSelect(e.id)}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i, duration: 0.35, ease: "easeOut" }}
            className={cx(
              "group text-left card p-4 flex items-center gap-4 press focus-ring transition-shadow hover:shadow-lift",
              e.id === "other" && "sm:col-span-2",
              active && "ring-2 ring-blue-500",
            )}
          >
            <span className={cx("w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors",
              active ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
              <Icon size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[16px] font-semibold tracking-tight leading-tight">{e.label}</span>
              <span className="block text-[13px] t2 leading-snug mt-0.5">{e.blurb}</span>
            </span>
            {active ? <Check size={18} className="text-blue-500 shrink-0" /> : <ChevronRight size={18} className="t3 shrink-0 transition-transform group-hover:translate-x-0.5" />}
          </motion.button>
        );
      })}
    </div>
  );
}

/** For "Other government exams": choose the topics that should drive the feed. */
export function FocusPicker({ value, onChange }: { value: TopicId[]; onChange: (v: TopicId[]) => void }) {
  const toggle = (t: TopicId) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_TOPICS.map((t) => {
        const Icon = TOPIC_ICON[t];
        const on = value.includes(t);
        return (
          <button
            key={t} onClick={() => toggle(t)} aria-pressed={on}
            className={cx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium press focus-ring transition-colors",
              on ? "bg-blue-500 text-white" : "card !rounded-full t2 hover:text-black dark:hover:text-white")}
          >
            <Icon size={14} />{TOPIC_LABEL[t]}
          </button>
        );
      })}
    </div>
  );
}
