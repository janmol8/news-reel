import type { ExamId, Importance, TopicId } from "./exams";

export interface CoverageEntry {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
}

/** Same shape the API already returned, plus optional fields from the unified source layer. */
export interface NewsItem {
  readonly id: string;
  readonly title_en: string;
  readonly title_hi: string;
  readonly summary_en: string;
  readonly summary_hi: string;
  readonly category: string;
  readonly time: string;
  readonly source: string;
  readonly imageUrl: string;
  readonly link: string;
  readonly verified: boolean;
  readonly country: string;
  // ── added (all optional so older cached items still render) ──
  readonly pubDate?: string;
  readonly sourceCategory?: string;
  readonly topics?: TopicId[];
  readonly examTags?: ExamId[];
  readonly coverage?: CoverageEntry[];
  readonly coverageCount?: number;
  readonly relevance?: number;
  readonly importance?: Importance;
  readonly why?: string;
}

export type Tab = "home" | "explore" | "exams" | "saved" | "profile";
