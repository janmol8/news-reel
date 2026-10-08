import React from "react";
import { Bookmark, Compass, GraduationCap, House, LucideIcon, User } from "lucide-react";
import { Mode } from "@/lib/exams";
import type { Tab } from "@/lib/types";
import { cx } from "./ui";

export default function TabBar({ tab, mode, onTab }: { tab: Tab; mode: Mode; onTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; Icon: LucideIcon }[] = [
    { id: "home", label: "Home", Icon: House },
    { id: "explore", label: "Explore", Icon: Compass },
    ...(mode === "student" ? [{ id: "exams" as Tab, label: "Exams", Icon: GraduationCap }] : []),
    { id: "saved", label: "Saved", Icon: Bookmark },
    { id: "profile", label: "Profile", Icon: User },
  ];
  return (
    <nav aria-label="Main" className="glass border-t hair z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[520px] flex">
        {items.map(({ id, label, Icon }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => onTab(id)} aria-current={on ? "page" : undefined}
              className={cx("flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 press focus-ring rounded-lg transition-colors", on ? "text-blue-500" : "t3 hover:text-black/60 dark:hover:text-white/70")}>
              <Icon size={22} strokeWidth={on ? 2.3 : 1.8} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
