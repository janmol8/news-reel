import React from "react";
import { GraduationCap, Globe, Moon, Sun } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { ExamId, Mode, examById } from "@/lib/exams";
import { Segmented, cx } from "./ui";

interface Props {
  mode: Mode; exam: ExamId | null; onMode: (m: Mode) => void; onChangeExam: () => void;
  lang: "en" | "hi"; setLang: (l: "en" | "hi") => void;
  showBoth: boolean; setShowBoth: (v: boolean) => void;
  audio: boolean; setAudio: (v: boolean) => void;
  theme: string | undefined; setTheme: (t: string) => void;
  savedCount: number; onClearSaved: () => void; onReset: () => void;
}

export default function ProfileView(p: Props) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-3 pb-10">
      <h1 className="text-[34px] font-semibold tracking-[-0.03em] leading-tight">Profile</h1>

      <Group title="Experience">
        <Row label="Mode" icon={p.mode === "student" ? <GraduationCap size={17} /> : <Globe size={17} />}>
          <Segmented<Mode> size="sm" value={p.mode} onChange={p.onMode} options={[{ id: "general", label: "General" }, { id: "student", label: "Student" }]} />
        </Row>
        <button onClick={p.onChangeExam} className="w-full text-left focus-ring rounded-b-[22px]">
          <Row label="Exam" detail={p.exam ? examById(p.exam).label : "Not selected"}><ChevronRight size={16} className="t3" /></Row>
        </button>
      </Group>

      <Group title="Reading">
        <Row label="Language"><Segmented<"en" | "hi"> size="sm" value={p.lang} onChange={p.setLang} options={[{ id: "en", label: "English" }, { id: "hi", label: "हिन्दी" }]} /></Row>
        <Row label="Show both languages"><Toggle on={p.showBoth} onChange={p.setShowBoth} label="Show both languages" /></Row>
        <Row label="Read aloud"><Toggle on={p.audio} onChange={p.setAudio} label="Read aloud" /></Row>
        <Row label="Appearance" icon={p.theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}>
          <Segmented<string> size="sm" value={p.theme === "light" ? "light" : "dark"} onChange={p.setTheme} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }]} />
        </Row>
      </Group>

      <Group title="Data">
        <button onClick={p.onClearSaved} disabled={!p.savedCount} className="w-full text-left focus-ring disabled:opacity-40">
          <Row label="Clear saved stories" detail={`${p.savedCount} saved`} danger />
        </button>
        <button onClick={p.onReset} className="w-full text-left focus-ring rounded-b-[22px]">
          <Row label="Reset personalization" detail="Mode, exam & topic interests" danger />
        </button>
      </Group>

      <p className="t3 text-[12px] leading-relaxed mt-8 px-2 text-center">
        Stories come from PIB (Press Information Bureau), Al Jazeera, CNN, Reuters, BBC, The Hindu, UN News and other publishers. Every story shows its source.
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="eyebrow t3 mb-2 px-3">{title}</h2>
      <div className="card divide-y hair">{children}</div>
    </section>
  );
}
function Row({ label, detail, icon, danger, children }: { label: string; detail?: string; icon?: React.ReactNode; danger?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[54px]">
      <span className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="t2">{icon}</span>}
        <span className="min-w-0">
          <span className={cx("block text-[15px] font-medium", danger && "text-red-600 dark:text-red-400")}>{label}</span>
          {detail && <span className="block text-[12.5px] t2 mt-0.5">{detail}</span>}
        </span>
      </span>
      {children}
    </div>
  );
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx("relative w-[51px] h-[31px] rounded-full transition-colors duration-200 focus-ring", on ? "bg-[#34C759]" : "bg-black/15 dark:bg-white/20")}>
      <span className={cx("absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-200", on && "translate-x-[20px]")} />
    </button>
  );
}
