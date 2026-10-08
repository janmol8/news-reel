import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, Globe, GraduationCap, Newspaper } from "lucide-react";
import { ExamId, Mode, TopicId } from "@/lib/exams";
import { ExamPicker, FocusPicker } from "./ExamPicker";
import { cx } from "./ui";

export interface OnboardingResult { mode: Mode; exam: ExamId | null; focus: TopicId[]; }
type Step = "mode" | "exam" | "focus";

interface Props {
  /** "full" = first launch; "exam" = jump straight to exam selection (switching to Student). */
  start: "full" | "exam";
  initialExam?: ExamId | null;
  initialFocus?: TopicId[];
  onDone: (r: OnboardingResult) => void;
  onCancel?: () => void;
}

const slide = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export default function Onboarding({ start, initialExam = null, initialFocus = [], onDone, onCancel }: Props) {
  const [step, setStep] = useState<Step>(start === "exam" ? "exam" : "mode");
  const [exam, setExam] = useState<ExamId | null>(initialExam);
  const [focus, setFocus] = useState<TopicId[]>(initialFocus);

  const back = () => {
    if (step === "focus") setStep("exam");
    else if (step === "exam" && start === "full") setStep("mode");
    else onCancel?.();
  };

  const pickExam = (id: ExamId) => {
    setExam(id);
    if (id === "other") setStep("focus");
    else onDone({ mode: "student", exam: id, focus: [] });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] canvas overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      {/* one quiet glow – no gradient clutter */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60 dark:opacity-40"
        style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(10,132,255,0.16), transparent 70%)" }} />

      <div className="relative mx-auto w-full max-w-3xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 min-h-full flex flex-col">
        <div className="h-10 flex items-center justify-between">
          {step !== "mode" || onCancel ? (
            <button onClick={back} className="inline-flex items-center gap-0.5 text-[15px] text-blue-600 dark:text-blue-400 font-medium focus-ring rounded-md -ml-1 pr-2">
              <ChevronLeft size={20} />{step === "mode" ? "Close" : "Back"}
            </button>
          ) : <span />}
          <div className="flex gap-1.5" aria-hidden>
            {(["mode", "exam"] as const).map((s) => (
              <span key={s} className={cx("h-1.5 rounded-full transition-all duration-300", (step === s || (s === "exam" && step === "focus")) ? "w-5 bg-blue-500" : "w-1.5 bg-black/15 dark:bg-white/20")} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "mode" && (
            <motion.section key="mode" {...slide} className="flex-1 flex flex-col justify-center py-8">
              <div className="w-12 h-12 rounded-[15px] bg-blue-500 text-white flex items-center justify-center shadow-card mb-5">
                <Newspaper size={24} />
              </div>
              <h1 className="text-[34px] sm:text-[52px] leading-[1.06] font-semibold tracking-[-0.03em]">What do you want to explore?</h1>
              <p className="t2 text-[17px] mt-3">You can switch any time.</p>

              <div className="grid gap-4 sm:grid-cols-2 mt-7">
                <ModeCard
                  eyebrow="General" title="Stay informed about the world." icon={<Globe size={22} />}
                  detail="Politics · World · Economy · Tech · Sports and more"
                  onClick={() => onDone({ mode: "general", exam: exam, focus })}
                />
                <ModeCard
                  eyebrow="Student" title="Get the news that matters for your exam." icon={<GraduationCap size={22} />}
                  detail="SSC · Banking · UPSC · Railways · Defence"
                  onClick={() => setStep("exam")} accent
                />
              </div>
            </motion.section>
          )}

          {step === "exam" && (
            <motion.section key="exam" {...slide} className="flex-1 py-6">
              <h1 className="text-[32px] sm:text-[44px] leading-[1.08] font-semibold tracking-[-0.03em]">Which exam are you<br className="hidden sm:block" /> preparing for?</h1>
              <p className="t2 text-[16px] mt-2 mb-7">We&apos;ll tune your daily briefing to it.</p>
              <ExamPicker selected={exam} onSelect={pickExam} />
            </motion.section>
          )}

          {step === "focus" && (
            <motion.section key="focus" {...slide} className="flex-1 py-6">
              <h1 className="text-[32px] sm:text-[44px] leading-[1.08] font-semibold tracking-[-0.03em]">What should we<br className="hidden sm:block" /> focus on?</h1>
              <p className="t2 text-[16px] mt-2 mb-7">Pick the topics your exam covers. Choose at least two.</p>
              <FocusPicker value={focus} onChange={setFocus} />
              <div className="mt-9">
                <button
                  disabled={focus.length < 2}
                  onClick={() => onDone({ mode: "student", exam: "other", focus })}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-500 text-white font-semibold text-[15px] px-6 py-3 press focus-ring disabled:opacity-35 disabled:pointer-events-none"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ModeCard({ eyebrow, title, detail, icon, onClick, accent }: {
  eyebrow: string; title: string; detail: string; icon: React.ReactNode; onClick: () => void; accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left card p-6 sm:p-7 min-h-[176px] sm:min-h-[270px] flex flex-col press focus-ring transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className={cx("w-12 h-12 rounded-[15px] flex items-center justify-center",
        accent ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
        {icon}
      </span>
      <span className="mt-auto pt-5 sm:pt-8 block">
        <span className="eyebrow t3 block">{eyebrow}</span>
        <span className="block text-[24px] sm:text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] mt-1.5">{title}</span>
        <span className="block text-[13px] t2 mt-3">{detail}</span>
      </span>
    </button>
  );
}
