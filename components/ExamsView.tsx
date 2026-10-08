import React from "react";
import { ChevronRight } from "lucide-react";
import { ExamId, TOPIC_LABEL, TopicId, examById } from "@/lib/exams";
import { ExamPicker, FocusPicker } from "./ExamPicker";
import { TOPIC_ICON } from "./ui";

export default function ExamsView({ exam, focus, onSelect, onFocus, onTopic }: {
  exam: ExamId | null; focus: TopicId[];
  onSelect: (id: ExamId) => void; onFocus: (f: TopicId[]) => void; onTopic: (t: TopicId) => void;
}) {
  const def = examById(exam);
  const topics = exam === "other" && focus.length ? focus : def.topics;
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-3 pb-10">
      <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight">Exams</h1>
      <p className="t2 text-[14px] mt-0.5 mb-6">Your briefing adapts to the exam you pick.</p>
      <ExamPicker selected={exam} onSelect={onSelect} />

      {exam === "other" && (
        <div className="mt-8">
          <h2 className="text-[19px] font-semibold tracking-[-0.015em] mb-3 px-1">Your focus topics</h2>
          <FocusPicker value={focus} onChange={onFocus} />
        </div>
      )}

      {exam && (
        <div className="mt-9">
          <h2 className="text-[19px] font-semibold tracking-[-0.015em] px-1">Exam topics</h2>
          <p className="t2 text-[13px] mt-0.5 mb-3 px-1">What {def.label} aspirants should revise</p>
          <ul className="card divide-y hair">
            {topics.map((t) => {
              const Icon = TOPIC_ICON[t];
              return (
                <li key={t}>
                  <button onClick={() => onTopic(t)} className="w-full flex items-center gap-3 px-4 py-3.5 press focus-ring rounded-[22px] text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <span className="w-8 h-8 rounded-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Icon size={16} /></span>
                    <span className="flex-1 text-[15px] font-medium">{TOPIC_LABEL[t]}</span>
                    <ChevronRight size={16} className="t3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
