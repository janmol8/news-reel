// Lightweight, dependency-free "intelligence" layer that sits ABOVE the existing
// RSS pipeline in pages/api/news.ts. It never fetches anything and never throws
// for bad input – every function degrades to a neutral result.
//
//   raw items → clusterEvents (dedupe) → annotate (topics, exam scores) → rank
import { ALL_TOPICS, ExamId, Importance, TopicId } from "./exams";

export interface RawItem {
  id: string;
  rawTitle: string;
  link: string;
  pubDate: Date;
  content: string;
  source: string;
  sourceCategory: string;
  imageUrl?: string | null;
  [k: string]: any;
}

// ───────────────────────── Source priority ─────────────────────────
const SOURCE_PRIORITY: Record<string, number> = {
  "PIB India": 95, Reuters: 85, "BBC News": 82, "Al Jazeera": 80, CNN: 78, "The Hindu": 78,
  "UN News": 75, "Economic Times": 70, LiveMint: 70, "Business Standard": 70, "NASA Science": 70,
  Moneycontrol: 66, "White House": 60, TechCrunch: 60, Forbes: 58, Fortune: 58,
};
export const priorityOf = (source: string) => SOURCE_PRIORITY[source] ?? 50;

// How "exam-worthy" a source's typical output is (multiplier on relevance).
const SOURCE_EXAM_FACTOR: Record<string, number> = {
  "PIB India": 1.15, "The Hindu": 1.05, "White House": 0.8, "NASA Science": 0.9,
  Forbes: 0.75, Fortune: 0.75, TechCrunch: 0.55, TMZ: 0.2,
  ESPN: 0.6, "Sky Sports": 0.6, "FOX Sports": 0.6, "Sporting News": 0.6, CNN: 0.95,
};
const examFactor = (source: string) => SOURCE_EXAM_FACTOR[source] ?? 1;

// ───────────────────────── Topic detection ─────────────────────────
const re = (...parts: string[]) => `\\b(?:${parts.join("|")})\\b`;

const TOPIC_SRC: Record<TopicId, string> = {
  schemes: re("yojana", "schemes?", "abhiyan", "pradhan mantri", "pm-?[a-z]+", "cabinet (?:approves?|approved|decision\\w*|nod)", "union cabinet",
    "beneficiar\\w+", "subsid\\w+", "flagship", "national mission", "launch(?:es|ed)? (?:scheme|portal|app|mission|initiative|campaign|programme|program)",
    "initiative", "programme"),
  appointments: re("appoint\\w*", "takes? charge", "assum\\w+ charge", "takes? over as", "sworn in", "new (?:chief|governor|chairman|chairperson|ambassador|director|secretary|president|head|cds|cji)",
    "named (?:as )?(?:the )?new \\w+", "elected as", "chief justice", "cabinet secretary", "resigns?", "nominated"),
  awards: re("awards?", "awarded", "prize", "honou?rs?", "honou?red", "bharat ratna", "padma \\w+", "nobel", "jnanpith", "sahitya akademi", "laureates?", "booker", "felicitat\\w+", "lifetime achievement"),
  economy: re("gdp", "inflation", "cpi", "wpi", "fiscal deficit", "trade deficit", "current account", "exports?", "imports?", "forex", "foreign exchange", "gst", "tax(?:es|ation)?",
    "budget", "economic survey", "iip", "fdi", "per capita", "economy", "economic growth", "disinvestment", "msp", "tariffs?"),
  banking: re("rbi", "reserve bank", "repo rate", "reverse repo", "monetary policy", "mpc", "banks?", "banking", "sebi", "nabard", "npas?", "upi", "npci", "digital payments?",
    "fintech", "nbfcs?", "ibc", "irdai", "insurance", "mutual funds?", "sidbi", "exim bank", "payments? banks?", "crr", "slr", "cbdc", "forex reserves?", "credit", "loans?", "interest rates?"),
  scitech: re("isro", "satellites?", "rockets?", "space(?:craft)?", "orbit", "lunar", "moon", "mars", "nasa", "esa", "chandrayaan", "gaganyaan", "aditya-?l1", "quantum", "semiconductors?",
    "artificial intelligence", "ai", "machine learning", "supercomputers?", "5g", "6g", "cyber\\w*", "telescope", "biotech\\w*", "genome", "nuclear (?:power|energy|reactor)", "fusion", "robot\\w*", "technology", "scientists?", "vaccines?", "csir", "dst", "research"),
  defence: re("army", "navy", "naval", "air force", "iaf", "drdo", "missiles?", "defen[cs]e", "military", "joint exercise", "military exercise", "naval exercise", "border", "lac", "loc", "soldiers?", "fighter jets?", "submarines?",
    "ordnance", "cds", "agniveer", "brahmos", "coast guard", "bsf", "crpf", "warships?", "troops", "airstrikes?", "armed forces", "tejas", "rafale"),
  sports: re("olympics?", "olympic\\w*", "paralympic\\w*", "asian games", "commonwealth games", "world cup", "grand slam", "champion\\w*", "trophy", "(?:gold|silver|bronze) medals?", "khelo india",
    "world record", "national games", "wimbledon", "us open", "french open", "australian open", "fifa", "icc", "bcci", "ioc", "arjuna award", "dhyan chand", "asia cup", "t20 world cup"),
  international: re("united nations", "un", "summit", "g20", "g7", "brics", "quad", "sco", "asean", "nato", "imf", "world bank", "wto", "treat(?:y|ies)", "bilateral", "diplomat\\w*",
    "foreign (?:ministry|minister|secretary|policy)", "sanctions?", "ceasefire", "security council", "mou", "state visit", "official visit", "embassy", "geopolitic\\w*", "peace (?:deal|talks|agreement)"),
  reports: re("index", "ranking", "ranked", "ranks", "tops", "report(?: released| launched)?", "survey", "hdi", "sdg", "annual report", "white paper", "status report", "global \\w+ report", "tracker", "scorecard"),
  polity: re("constitution(?:al)?", "supreme court", "high court", "parliament(?:ary)?", "lok sabha", "rajya sabha", "bills?", "amendments?", "election commission", "president of india", "governors?",
    "judg(?:e)?ments?", "verdicts?", "delimitation", "ordinances?", "speaker", "cag", "niti aayog", "finance commission", "law commission", "uniform civil code", "tribunal", "panchayat\\w*", "rti", "fundamental rights?", "federal\\w*"),
  environment: re("climate", "emissions?", "carbon", "biodiversity", "wildlife", "tigers?", "forests?", "pollution", "cop\\d+", "renewable\\w*", "solar", "wetlands?", "ramsar", "national parks?",
    "sanctuary", "endangered", "species", "unfccc", "net[- ]zero", "green hydrogen", "ozone", "glaciers?", "environment\\w*", "conservation", "air quality"),
  days: `(?:\\b(?:world|international|national)\\s+[a-z ]{2,30}\\s+day\\b|\\bdiwas\\b|\\bjayanti\\b|\\bobserved (?:as|on)\\b)`,
  infrastructure: re("railways?", "rail", "trains?", "vande bharat", "metro", "highways?", "expressways?", "airports?", "ports?", "bridges?", "tunnels?", "bullet train", "freight corridor",
    "indian railways", "irctc", "national highway", "waterways?", "logistics", "gati shakti", "udan", "sagarmala", "infrastructure", "railway board"),
  social: re("education", "nep", "nutrition", "women", "children", "tribal", "social justice", "scholarships?", "poverty", "employment", "skill\\w*", "ayushman", "literacy", "census", "welfare",
    "health(?:care)?", "hospitals?", "rural", "farmers?", "agricultur\\w+"),
  books: re("books?", "authors?", "memoir", "novels?", "autobiograph\\w+", "biograph\\w+", "literary", "literature", "poet"),
};

const TOPIC_RE = {} as Record<TopicId, RegExp>;
for (const t of ALL_TOPICS) TOPIC_RE[t] = new RegExp(TOPIC_SRC[t], "gi");

const count = (re: RegExp, s: string) => (s ? (s.match(re) || []).length : 0);

/** Returns topics sorted by strength, strongest first (max 4). */
export function detectTopics(item: Pick<RawItem, "rawTitle" | "content" | "source" | "sourceCategory">): TopicId[] {
  return detectTopicsDetailed(item).topics;
}

/** `weak` = topics inferred only from the feed/source (not from the text) – they count for much less. */
export function detectTopicsDetailed(item: Pick<RawItem, "rawTitle" | "content" | "source" | "sourceCategory">): { topics: TopicId[]; weak: TopicId[] } {
  const title = item.rawTitle || "";
  const body = (item.content || "").slice(0, 700);
  const scored: [TopicId, number][] = [];
  for (const t of ALL_TOPICS) {
    const th = count(TOPIC_RE[t], title);
    const bh = count(TOPIC_RE[t], body);
    // Generic words ("initiative", "report", "research") alone in the body should not count.
    const s = th * 3 + Math.min(bh, 3);
    if (th > 0 || bh >= 2) scored.push([t, s]);
  }
  // Source-derived hints (weak – only if nothing else matched for that topic).
  const weak: TopicId[] = [];
  const hint = (t: TopicId, s: number) => { if (!scored.find(([x]) => x === t)) { scored.push([t, s]); weak.push(t); } };
  if (item.sourceCategory === "world") hint("international", 2);
  if (item.source === "UN News") hint("international", 3);
  if (item.sourceCategory === "science") hint("scitech", 2);
  if (item.source === "PIB India" && scored.length === 0) hint("schemes", 1);
  const topics = scored.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  return { topics, weak: weak.filter((t) => topics.includes(t)) };
}

// ───────────────────────── Exam relevance ─────────────────────────
type W = Partial<Record<TopicId, number>>;
const EXAM_WEIGHTS: Record<Exclude<ExamId, "other">, W> = {
  ssc: { schemes: 1, appointments: 0.9, awards: 0.9, sports: 0.8, scitech: 0.8, defence: 0.7, days: 0.8, reports: 0.8, economy: 0.7, international: 0.6, books: 0.7, banking: 0.4, polity: 0.5, environment: 0.6, infrastructure: 0.6, social: 0.5 },
  banking: { banking: 1, economy: 1, reports: 0.7, schemes: 0.6, appointments: 0.7, international: 0.45, awards: 0.4, days: 0.4, scitech: 0.3, polity: 0.3, environment: 0.3, infrastructure: 0.35, social: 0.3, defence: 0.2, sports: 0.2 },
  upsc: { polity: 1, international: 1, environment: 1, economy: 0.9, scitech: 0.9, schemes: 0.8, reports: 0.8, social: 0.8, defence: 0.6, infrastructure: 0.5, banking: 0.5, appointments: 0.4, awards: 0.3, days: 0.3, sports: 0.15 },
  railways: { infrastructure: 1, schemes: 0.7, appointments: 0.7, sports: 0.7, scitech: 0.6, awards: 0.6, economy: 0.6, days: 0.6, reports: 0.6, defence: 0.5, environment: 0.5, international: 0.4, polity: 0.4, social: 0.4, banking: 0.3 },
  defence: { defence: 1, international: 0.9, appointments: 0.8, scitech: 0.7, infrastructure: 0.5, reports: 0.5, polity: 0.4, awards: 0.4, schemes: 0.4, economy: 0.4, sports: 0.3, environment: 0.3, days: 0.3 },
  state: { schemes: 1, appointments: 0.8, polity: 0.8, social: 0.8, awards: 0.7, sports: 0.7, days: 0.7, infrastructure: 0.7, economy: 0.6, environment: 0.6, reports: 0.6, scitech: 0.5, books: 0.5, defence: 0.4, international: 0.4, banking: 0.4 },
};

export const EXAM_IDS: Exclude<ExamId, "other">[] = ["ssc", "banking", "upsc", "railways", "defence", "state"];

function weightsFor(exam: ExamId, focus: TopicId[] = []): W {
  if (exam !== "other") return EXAM_WEIGHTS[exam];
  if (focus.length) {
    const w: W = {};
    for (const t of ALL_TOPICS) w[t] = focus.includes(t) ? 1 : 0.3;
    return w;
  }
  const w: W = {};
  for (const t of ALL_TOPICS) w[t] = 0.6;
  Object.assign(w, { schemes: 0.9, appointments: 0.8, economy: 0.8, awards: 0.7, polity: 0.7 });
  return w;
}

// Consumer-tech / celebrity / market-chatter headlines are rarely exam material.
const NOISE_RE = /\b(iphone|android|samsung|apple|google|microsoft|tesla|netflix|amazon|meta|openai|earnings|stocks?|shares|ipo|funding|raises \$\d+|startup|smartphone|trailer|box office|celebrity|gossip|spotted|transfer|rumou?rs?)\b/i;
const INDIA_RE = /\b(india\w*|new delhi|union government|centre|govt of india|government of india|lok sabha|rajya sabha|modi|isro|rbi|sebi|niti aayog)\b/i;
const STATE_RE = /\b(chief minister|state government|state cabinet|assembly|andhra|arunachal|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|jammu|ladakh)\b/i;

export interface AnnotateCtx { coverageCount: number; }

export function relevanceFor(
  exam: ExamId, topics: TopicId[], item: Pick<RawItem, "rawTitle" | "content" | "source">,
  ctx: AnnotateCtx, focus: TopicId[] = [], weak: TopicId[] = [],
): number {
  const w = weightsFor(exam, focus);
  const ws = topics.map((t) => (w[t] ?? 0.2) * (weak.includes(t) ? 0.45 : 1)).sort((a, b) => b - a);
  let score = (ws[0] ?? 0.1) * 72 + (ws[1] ?? 0) * 10 + (ws[2] ?? 0) * 4;
  score *= examFactor(item.source);
  if (item.source !== "PIB India" && NOISE_RE.test(item.rawTitle || "")) score *= 0.6;
  if (item.source === "PIB India" && ws.length) score += 14;
  score += Math.min(8, Math.max(0, ctx.coverageCount - 1) * 3);
  const text = `${item.rawTitle} ${(item.content || "").slice(0, 400)}`;
  if (INDIA_RE.test(text)) score += exam === "upsc" || exam === "defence" ? 4 : 6;
  if (exam === "state" && STATE_RE.test(text)) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function importanceOf(relevance: number): Importance | undefined {
  if (relevance >= 80) return "must";
  if (relevance >= 60) return "important";
  if (relevance >= 40) return "good";
  return undefined;
}

// ───────────────────────── "Why it matters" ─────────────────────────
// Rule-based and deliberately generic: it explains why the TOPIC matters for the
// exam. It never states facts about the specific article.
const WHY: Record<TopicId, string> = {
  schemes: "Government schemes, their objectives and beneficiaries are staple current-affairs questions.",
  appointments: "Who holds which post is regularly asked in current-affairs and static-GK sections.",
  awards: "Awards, winners and the institutions behind them appear in most exam papers.",
  economy: "Economic indicators and policy shape questions on growth, inflation, trade and budgets.",
  banking: "Banking regulation and financial-sector developments are core to banking awareness.",
  scitech: "Science & technology missions, institutions and breakthroughs feature in GK and prelims.",
  defence: "Defence exercises, systems and strategic developments are asked in GK and security papers.",
  sports: "Major tournaments, winners and records are a regular scoring area in current affairs.",
  international: "Global bodies, bilateral ties and major world events are examined under international affairs.",
  reports: "Index and report rankings – who publishes them and where India stands – are frequently asked.",
  polity: "Constitutional provisions, court rulings and parliamentary developments are core polity topics.",
  environment: "Climate, biodiversity and conservation developments link directly to ecology questions.",
  days: "Important days and their themes are quick, high-yield current-affairs facts.",
  infrastructure: "Transport and infrastructure projects are relevant to national-affairs and railway-exam GK.",
  social: "Social-sector policy, education and health initiatives matter for governance and social-issue questions.",
  books: "Books, authors and releases are a recurring item in current-affairs sections.",
};
const EXAM_WHY: Partial<Record<ExamId, Partial<Record<TopicId, string>>>> = {
  banking: {
    banking: "Important for monetary policy, banking awareness and the Indian economy.",
    economy: "Core input for economy and financial-awareness sections of banking exams.",
  },
  upsc: {
    polity: "Relevant to Polity & Governance – constitutional and institutional questions in GS.",
    international: "Relevant to International Relations – bilateral and multilateral developments in GS.",
    environment: "Relevant to Environment & Ecology in both prelims and mains.",
    economy: "Relevant to the Indian economy and development themes in GS.",
  },
  defence: {
    defence: "Directly relevant to defence, security and strategic-affairs questions.",
    international: "Shapes strategic affairs and India's security environment.",
  },
  railways: { infrastructure: "Relevant to transport, infrastructure and national-affairs GK for railway exams." },
  ssc: { schemes: "Relevant government initiative and current-affairs topic for competitive exams." },
};

export function whyItMatters(exam: ExamId, topics: TopicId[], source: string, focus: TopicId[] = []): string | undefined {
  if (!topics.length) return undefined;
  const w = weightsFor(exam, focus);
  const best = [...topics].sort((a, b) => (w[b] ?? 0.2) - (w[a] ?? 0.2))[0];
  const text = EXAM_WHY[exam]?.[best] || WHY[best];
  return source === "PIB India" ? `${text} From an official PIB release.` : text;
}

// ───────────────────────── Duplicate / event detection ─────────────────────────
const STOP = new Set(("the and for with from after before over under into about amid says say said new news live updates update latest how why what when who will would could may might can has have had not " +
  "its this that these those than then more most less here there their they them says over amid today year years week days day").split(" "));

const stem = (t: string) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t);

export function titleTokens(title: string): Set<string> {
  return new Set(
    (title || "").toLowerCase()
      .replace(/per cent/g, "percent").replace(/(\d)\.(\d)/g, "$1$2").replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => (t.length > 2 || /^\d{2}$/.test(t)) && !STOP.has(t)).map(stem),
  );
}

function similar(a: Set<string>, b: Set<string>, shared: number): boolean {
  if (shared < 3) return false;
  const union = a.size + b.size - shared;
  const jaccard = shared / union;
  const overlap = shared / Math.min(a.size, b.size);
  return jaccard >= 0.5 || (shared >= 4 && (jaccard >= 0.4 || overlap >= 0.8));
}

export interface CoverageEntry { source: string; title: string; link: string; pubDate: string; snippet: string; }

const HOURS48 = 48 * 3600 * 1000;

/**
 * Collapses near-identical headlines about the same event. The highest-priority
 * source leads; the others are attached as `coverage`. Conservative on purpose:
 * differing headlines stay separate, so distinct reporting / analysis is kept.
 * `altCategories` records the other feed-categories a clustered story appeared in,
 * so it still shows up under each of them.
 */
export function clusterEvents<T extends RawItem>(items: T[]): (T & { coverage: CoverageEntry[]; coverageCount: number; altCategories: string[] })[] {
  const sorted = [...items].sort((a, b) =>
    priorityOf(b.source) + (b.imageUrl ? 3 : 0) - (priorityOf(a.source) + (a.imageUrl ? 3 : 0)) ||
    b.pubDate.getTime() - a.pubDate.getTime());

  type Lead = { item: T; toks: Set<string>; members: T[] };
  const leads: Lead[] = [];
  const index = new Map<string, number[]>();

  for (const it of sorted) {
    const toks = titleTokens(it.rawTitle);
    let best = -1, bestShared = 0;
    if (toks.size >= 3) {
      const hits = new Map<number, number>();
      toks.forEach((t) => (index.get(t) || []).forEach((li) => hits.set(li, (hits.get(li) || 0) + 1)));
      hits.forEach((shared, li) => {
        const lead = leads[li];
        if (Math.abs(lead.item.pubDate.getTime() - it.pubDate.getTime()) > HOURS48) return;
        if (similar(lead.toks, toks, shared) && shared > bestShared) { best = li; bestShared = shared; }
      });
    }
    if (best >= 0) leads[best].members.push(it);
    else {
      leads.push({ item: it, toks, members: [] });
      toks.forEach((t) => { const a = index.get(t) || []; a.push(leads.length - 1); index.set(t, a); });
    }
  }

  const snippet = (s: string) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  const out = leads.map(({ item, members }) => {
    const all = [item, ...members];
    const seen = new Set<string>();
    const coverage: CoverageEntry[] = [];
    for (const m of all) {
      if (seen.has(m.source)) continue;
      seen.add(m.source);
      coverage.push({ source: m.source, title: m.rawTitle, link: m.link, pubDate: m.pubDate.toISOString(), snippet: snippet(m.content) });
    }
    const altCategories = Array.from(new Set(all.map((m) => m.sourceCategory))).filter((c) => c !== item.sourceCategory);
    return { ...item, coverage: coverage.length > 1 ? coverage : [], coverageCount: coverage.length, altCategories };
  });
  return out.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

// ───────────────────────── Diversity (no single source dominates) ─────────────────────────
export function diversify<T extends { source: string }>(items: T[], maxPerWindow = 2, window = 6): T[] {
  if (new Set(items.map((i) => i.source)).size < 2) return items;
  const remaining = [...items];
  const out: T[] = [];
  while (remaining.length) {
    const recent = out.slice(-window);
    let pick = remaining.findIndex((c) => recent.filter((r) => r.source === c.source).length < maxPerWindow);
    if (pick < 0) pick = 0;
    out.push(remaining.splice(pick, 1)[0]);
  }
  return out;
}

// ───────────────────────── Annotation entry point ─────────────────────────
export interface Annotated {
  topics: TopicId[];
  examTags: ExamId[];
  extraCategories: string[];
  weakTopics: TopicId[];
  _scores: Record<string, number>;
}

const HEALTH_RE = /\b(health\w*|hospitals?|ayushman|medical|disease\w*|vaccin\w+|aiims|nutrition)\b/i;

/** Computes topics + per-exam relevance for the six fixed exams once, at ingest time. */
export function annotate(item: RawItem & { coverageCount?: number }): Annotated {
  const { topics, weak } = detectTopicsDetailed(item);
  const ctx = { coverageCount: item.coverageCount || 1 };
  const _scores: Record<string, number> = {};
  for (const e of EXAM_IDS) _scores[e] = relevanceFor(e, topics, item, ctx, [], weak);
  const examTags = (EXAM_IDS.filter((e) => _scores[e] >= 55).sort((a, b) => _scores[b] - _scores[a]).slice(0, 3)) as ExamId[];

  // PIB is an official, multi-subject source – let its releases also appear in the matching General categories.
  const extraCategories: string[] = [];
  if (item.source === "PIB India") {
    if (topics.includes("economy") || topics.includes("banking")) extraCategories.push("economy");
    if (topics.includes("scitech")) extraCategories.push("science", "tech");
    if (topics.includes("sports")) extraCategories.push("sports");
    if (HEALTH_RE.test(`${item.rawTitle} ${(item.content || "").slice(0, 300)}`)) extraCategories.push("health");
  }
  return { topics, examTags, extraCategories, weakTopics: weak, _scores };
}

/** Ranking used by the Student feed: relevance first, with a gentle freshness boost. */
export function studentRank(relevance: number, pubDate: Date, now = Date.now()): number {
  const ageH = Math.max(0, (now - pubDate.getTime()) / 3600000);
  return relevance + Math.max(0, 24 - ageH * 0.6);
}
