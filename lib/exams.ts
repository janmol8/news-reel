// Shared (client + server) definitions for the Student / Exam layer.
// Pure data only – no dependencies – so it is safe to import anywhere.

export type Mode = "general" | "student";

export type ExamId = "ssc" | "banking" | "upsc" | "railways" | "defence" | "state" | "other";

export type TopicId =
  | "schemes" | "appointments" | "awards" | "economy" | "banking" | "scitech"
  | "defence" | "sports" | "international" | "reports" | "polity"
  | "environment" | "days" | "infrastructure" | "social" | "books";

export type Importance = "must" | "important" | "good";

export const TOPIC_LABEL: Record<TopicId, string> = {
  schemes: "Government Schemes",
  appointments: "Appointments",
  awards: "Awards",
  economy: "Economy",
  banking: "Banking & Finance",
  scitech: "Science & Tech",
  defence: "Defence",
  sports: "Sports",
  international: "International",
  reports: "Reports & Indexes",
  polity: "Polity & Governance",
  environment: "Environment",
  days: "Important Days",
  infrastructure: "Infrastructure",
  social: "Social Sector",
  books: "Books & Authors",
};

export const ALL_TOPICS = Object.keys(TOPIC_LABEL) as TopicId[];

export interface ExamDef {
  id: ExamId;
  label: string;
  short: string;
  blurb: string;
  /** Topics shown in "Quick revision", in priority order. */
  topics: TopicId[];
}

export const EXAMS: ExamDef[] = [
  {
    id: "ssc", label: "SSC", short: "SSC",
    blurb: "Current affairs relevant to SSC examinations",
    topics: ["schemes", "appointments", "awards", "economy", "scitech", "defence", "sports", "international", "reports", "days", "books"],
  },
  {
    id: "banking", label: "Banking", short: "Banking",
    blurb: "Banking, RBI, economy and financial awareness",
    topics: ["banking", "economy", "reports", "schemes", "appointments", "international", "awards", "days"],
  },
  {
    id: "upsc", label: "UPSC", short: "UPSC",
    blurb: "Polity, economy, international relations, environment, science & technology and governance",
    topics: ["polity", "economy", "international", "environment", "scitech", "schemes", "social", "reports", "defence"],
  },
  {
    id: "railways", label: "Railways", short: "Railways",
    blurb: "Government, infrastructure, transport and national affairs",
    topics: ["infrastructure", "schemes", "appointments", "scitech", "sports", "economy", "defence", "days"],
  },
  {
    id: "defence", label: "Defence", short: "Defence",
    blurb: "Defence, security, international relations and strategic affairs",
    topics: ["defence", "international", "scitech", "appointments", "infrastructure", "polity", "reports"],
  },
  {
    id: "state", label: "State Government", short: "State PSC",
    blurb: "State-specific + national current affairs",
    topics: ["schemes", "appointments", "polity", "social", "infrastructure", "sports", "awards", "economy"],
  },
  {
    id: "other", label: "Other Government Exams", short: "Custom",
    blurb: "Choose the topics you want to focus on",
    topics: ["schemes", "appointments", "awards", "economy", "scitech", "international", "polity", "sports"],
  },
];

export const examById = (id: string | null | undefined): ExamDef =>
  EXAMS.find((e) => e.id === id) || EXAMS[0];

export const IMPORTANCE_META: Record<Importance, { emoji: string; label: string }> = {
  must: { emoji: "🔥", label: "Must read" },
  important: { emoji: "⭐", label: "Important" },
  good: { emoji: "📌", label: "Good to know" },
};

/** The ten General-news categories (unchanged from the original app). */
export const GENERAL_CATEGORIES = [
  { id: "politics", label: "Politics" },
  { id: "world", label: "World" },
  { id: "economy", label: "Economy" },
  { id: "business", label: "Business" },
  { id: "tech", label: "Tech" },
  { id: "entertainment", label: "Entertainment" },
  { id: "science", label: "Science" },
  { id: "health", label: "Health" },
  { id: "leaders", label: "Leaders" },
  { id: "sports", label: "Sports" },
];

/** Display metadata for sources. Unknown sources fall back to their own name. */
export const SOURCE_META: Record<string, { label: string; full?: string; official?: boolean }> = {
  "PIB India": { label: "PIB", full: "Press Information Bureau", official: true },
  "Al Jazeera": { label: "AL JAZEERA" },
  "CNN": { label: "CNN" },
};
export const sourceLabel = (s: string) => SOURCE_META[s]?.label || s;
