import type { NextApiRequest, NextApiResponse } from 'next';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ALL_TOPICS, EXAMS, ExamId, TOPIC_LABEL, TopicId } from '../../lib/exams';
import {
  annotate, clusterEvents, diversify, importanceOf, relevanceFor, studentRank, whyItMatters,
} from '../../lib/newsIntel';

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['enclosure', 'enclosure'],
      ['media:content', 'media:content'],
      ['image', 'image'],
      ['description', 'description'],
      ['content:encoded', 'contentEncoded']
    ],
  }
});

const RSS_SOURCES = [
  { name: "PIB India", url: "https://pib.gov.in/Rssmain.aspx?ModId=6&Lang=1", category: "politics", verified: true, country: "🇮🇳" },
  { name: "White House", url: "https://www.whitehouse.gov/feed/", category: "politics", verified: true, country: "🇺🇸" },
  { name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", category: "politics", verified: true, country: "🇺🇳" },
  { name: "Reuters", url: "https://www.reutersagency.com/feed/?best-types=world-news&post_type=best", category: "world", verified: true, country: "🌍" },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world", verified: true, country: "🇬🇧" },
  { name: "Economic Times", url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/13733806.cms", category: "economy", verified: true, country: "🇮🇳" },
  { name: "LiveMint", url: "https://www.livemint.com/rss/economy", category: "economy", verified: true, country: "🇮🇳" },
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/business.xml", category: "business", verified: true, country: "🇮🇳" },
  { name: "Business Standard", url: "https://www.business-standard.com/rss/latest-news-1.rss", category: "business", verified: true, country: "🇮🇳" },
  { name: "Forbes Business", url: "https://www.forbes.com/business/feed/", category: "business", verified: true, country: "🇺🇸" },
  { name: "Fortune", url: "https://fortune.com/feed/", category: "business", verified: true, country: "🇺🇸" },
  { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss", category: "leaders", verified: true, country: "🇮🇳" },
  { name: "ESPN", url: "https://www.espn.com/espn/rss/news", category: "sports", verified: true, country: "🌍" },
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040", category: "sports", verified: true, country: "🇬🇧" },
  { name: "FOX Sports", url: "https://api.foxsports.com/v2/content/optimized-rss?partnerKey=MBto Fox Sports", category: "sports", verified: true, country: "🇺🇸" },
  { name: "Sporting News", url: "https://www.sportingnews.com/rss", category: "sports", verified: true, country: "🇺🇸" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech", verified: true, country: "🇺🇸" },
  { name: "TMZ", url: "https://www.tmz.com/rss.xml", category: "entertainment", verified: true, country: "🇺🇸" },
  { name: "NASA Science", url: "https://www.nasa.gov/news-release/feed/", category: "science", verified: true, country: "🇺🇸" },
  { name: "UN Health", url: "https://news.un.org/feed/subscribe/en/news/topic/health/rss.xml", category: "health", verified: true, country: "🇺🇳" },
  // ── Added sources (official public RSS feeds) ──
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world", verified: true, country: "🇶🇦" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition_world.rss", category: "world", verified: true, country: "🇺🇸" },
  { name: "CNN", url: "http://rss.cnn.com/rss/cnn_allpolitics.rss", category: "politics", verified: true, country: "🇺🇸" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition_technology.rss", category: "tech", verified: true, country: "🇺🇸" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition_space.rss", category: "science", verified: true, country: "🇺🇸" }
];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const INTEL_CACHE = new Map<string, any>();
let RAW_RSS_CACHE: any[] = [];
let LAST_FETCH_TIME = 0;
// Last successful result per feed – a feed that fails keeps serving its previous items
// instead of vanishing, and never affects any other feed.
const SOURCE_CACHE = new Map<string, any[]>();
let SOURCE_HEALTH: Record<string, boolean> = {};
const safeDate = (v: any) => { const d = new Date(v || Date.now()); return isNaN(d.getTime()) ? new Date() : d; };
const CACHE_TTL_MS = 60000;

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { 
      signal: controller.signal, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' } 
    });
    clearTimeout(id);
    return response;
  } catch (e) { clearTimeout(id); return null; }
}

async function quickScrape(url: string) {
  try {
    const response = await fetchWithTimeout(url, 3500);
    if (!response) return null;
    const html = await response.text();
    
    const metaMatch = html.match(/<meta[^>]+(?:property|name)="(?:og|twitter):image"[^>]+content="([^">]+)"/i) ||
                      html.match(/<meta[^>]+content="([^">]+)"[^>]+(?:property|name)="(?:og|twitter):image"/i);
    const img = metaMatch ? metaMatch[1] : null;

    let textContent = "";
    const paragraphs = html.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (paragraphs) {
      textContent = paragraphs
        .map(p => p.replace(/<[^>]*>/g, '').trim())
        .filter(t => t.length > 80)
        .slice(0, 12)
        .join(' ');
    } else {
      const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/si);
      if (bodyMatch) {
        textContent = bodyMatch[1]
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 2500);
      }
    }

    const UTILITY_BLOCKLIST = [
      "login", "subscribe", "email", "logout", "sign in", "password", 
      "terms of service", "privacy policy", "cookies", "advertising",
      "follow us", "newsletter", "copyright", "rights reserved",
      "outdated browser", "upgrade your browser", "top gainers", "top losers",
      "unlisted shares", "pre-ipo", "crypto market", "financial advisor",
      "investment", "stock market live", "news app", "download"
    ];

    const sentences = textContent.split('. ');
    const filteredText = sentences
      .filter(s => !UTILITY_BLOCKLIST.some(word => s.toLowerCase().includes(word)))
      .join('. ');
    
    return { img, text: filteredText };
  } catch (e) { return null; }
}

function cleanText(text: string) {
  if (!text) return "";
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/\.\.\.+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

async function batchProcessIntel(items: any[]) {
  const uncached = items.filter(item => !INTEL_CACHE.has(item.link));
  
  if (uncached.length > 0) {
    await Promise.all(uncached.map(async (item) => {
      const scraped = await quickScrape(item.link);
      if (scraped) {
        if (!item.imageUrl) item.imageUrl = scraped.img;
        if (!item.content || item.content.length < 150) item.content = scraped.text;
      }
      
      INTEL_CACHE.set(item.link, {
        title_en: cleanText(item.rawTitle),
        title_hi: cleanText(item.rawTitle),
        summary_en: cleanText(item.content ? item.content.slice(0, 450) : "Journalistic analysis is active. This news reel covers the critical developments. Please view the full story for extensive context and complete coverage."),
        summary_hi: cleanText("पत्रकारिता विश्लेषण सक्रिय है। यह न्यूज़ रील महत्वपूर्ण घटनाक्रमों को कवर करती है। विस्तृत संदर्भ के लिए मूल लेख देखें।"),
        category: item.sourceCategory,
        imageUrl: item.imageUrl,
        isFallback: true
      });
    }));

    try {
      const itemsToEnrich = uncached.slice(0, 5);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const batchPrompt = `Task: Professional News Summarizer (Batch Processing).
      Role: You are a professional news summarizer. Your task is to generate short, clear, and factual summaries.

      Strict Rules:
      - Only summarize the news content provided.
      - Do NOT add opinions, assumptions, or external information.
      - Do NOT include any promotional phrases like "like, share, subscribe".
      - Do NOT add commentary or storytelling tone.
      - Keep the tone neutral, factual, and journalistic.
      - Focus only on key facts: who, what, when, where, why (if available).
      - Limit the summary to UNDER 60 words per item.
      - Make it suitable for a short video/news reel voiceover.
      - NO trailing dots (...) or truncation. End with a definitive full stop.
      - Output: Clean paragraph only (no bullets, hashtags, or emojis).
      - HINDI: provide a high-quality Hindi summary following the same factual and length constraints.

      Articles:
      ${itemsToEnrich.map((item, i) => `[Item ${i+1}]\nURL: ${item.link}\nTitle: ${item.rawTitle}\nContext: ${item.content.slice(0, 2000)}`).join('\n\n')}

      Format: [{"url": "...", "title_en": "...", "title_hi": "...", "summary_en": "...", "summary_hi": "...", "category": "..."}]`;

      const result = await model.generateContent(batchPrompt);
      const text = result.response.text().trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const processed = JSON.parse(text);

      processed.forEach((p: any) => {
        const original = itemsToEnrich.find(i => i.link === p.url);
        if (original) {
          INTEL_CACHE.set(p.url, {
            ...p,
            category: p.category?.toLowerCase() || original.sourceCategory,
            title_en: cleanText(p.title_en),
            title_hi: cleanText(p.title_hi),
            summary_en: cleanText(p.summary_en),
            summary_hi: cleanText(p.summary_hi),
            imageUrl: original.imageUrl,
            isFallback: false
          });
        }
      });
    } catch (error) {
      console.error("Batch AI Failure:", error instanceof Error ? error.message : error);
    }
  }

  return items.map(item => ({ ...item, ...INTEL_CACHE.get(item.link) }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category = 'all', page = '1', weights = '{}' } = req.query;
  let userWeights: Record<string, number> = {};
  try { userWeights = JSON.parse(weights as string) || {}; } catch (e) { userWeights = {}; }
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  // Optional scope params (all additive – omitting them gives the original behaviour).
  const qs = (v: any) => String(Array.isArray(v) ? v[0] : v ?? '').trim();
  const isStudent = qs(req.query.mode) === 'student';
  const examId = (EXAMS.find(e => e.id === qs(req.query.exam))?.id || 'ssc') as ExamId;
  const focus = qs(req.query.focus).split(',').filter((t): t is TopicId => (ALL_TOPICS as string[]).includes(t));
  const topicFilter = qs(req.query.topic);
  const sourceFilter = qs(req.query.source).toLowerCase();
  const queryText = qs(req.query.q).toLowerCase();
  const pageSize = Math.min(10, Math.max(1, parseInt(qs(req.query.limit)) || 5));

  try {
    const now = Date.now();
    if (now - LAST_FETCH_TIME > CACHE_TTL_MS || RAW_RSS_CACHE.length === 0) {
      const allFeeds = await Promise.all(RSS_SOURCES.map(async (source) => {
        const cacheKey = `${source.name}|${source.url}`;
        const response = await fetchWithTimeout(source.url);
        if (!response || !response.ok) { SOURCE_HEALTH[cacheKey] = false; return SOURCE_CACHE.get(cacheKey) || []; }
        try {
          const xml = await response.text();
          const feed = await parser.parseString(xml);
          const parsedItems = feed.items.map(item => {
             let img = null;
             // Comprehensive image extraction from RSS
             const mediaContent = item['media:content'];
             if (mediaContent) {
                if (Array.isArray(mediaContent)) img = mediaContent[0]?.$?.url;
                else img = mediaContent.$?.url || mediaContent.url;
             }
             if (!img) img = item.enclosure?.url;
             if (!img) {
                const thumb = item['media:thumbnail'];
                if (Array.isArray(thumb)) img = thumb[0]?.$?.url;
                else img = thumb?.$?.url || thumb?.url;
             }
             if (!img) {
                const searchBody = (item.description || "") + (item.content || "") + (item.contentEncoded || "");
                const match = searchBody.match(/<img[^>]+src="([^">]+)"/i);
                if (match) img = match[1];
             }
             
             return {
                id: item.guid || item.link || Math.random().toString(),
                rawTitle: item.title || "News Update",
                link: item.link || "",
                pubDate: safeDate(item.pubDate || item.isoDate),
                content: item.contentSnippet || item.content || item.description || "",
                source: source.name,
                sourceCategory: source.category,
                verified: source.verified,
                country: source.country,
                imageUrl: img
             };
          });
          SOURCE_CACHE.set(cacheKey, parsedItems);
          SOURCE_HEALTH[cacheKey] = true;
          return parsedItems;
        } catch (e) { SOURCE_HEALTH[cacheKey] = false; return SOURCE_CACHE.get(cacheKey) || []; }
      }));

      const merged = allFeeds.flat();
      RAW_RSS_CACHE = merged.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      const unique = new Map();
      RAW_RSS_CACHE.forEach(i => { if (i.link && !unique.has(i.link)) unique.set(i.link, i); });
      RAW_RSS_CACHE = Array.from(unique.values());
      // Unified layer: collapse same-event stories, then tag topics + exam relevance.
      try {
        RAW_RSS_CACHE = clusterEvents(RAW_RSS_CACHE).map(i => ({ ...i, ...annotate(i) }));
      } catch (e) { console.error("Intel layer skipped:", e); }
      LAST_FETCH_TIME = now;
    }

    let pool = [...RAW_RSS_CACHE];
    const isSearch = !!(queryText || sourceFilter);

    // Relevance for the requested exam (fixed exams are precomputed at ingest).
    const relOf = (i: any): number =>
      examId !== 'other' && i._scores ? (i._scores[examId] ?? 0)
        : relevanceFor(examId, i.topics || [], i, { coverageCount: i.coverageCount || 1 }, focus, i.weakTopics || []);

    if (sourceFilter) pool = pool.filter(i => i.source.toLowerCase().includes(sourceFilter) || (i.coverage || []).some((c: any) => c.source.toLowerCase().includes(sourceFilter)));
    if (topicFilter) pool = pool.filter(i => (i.topics || []).includes(topicFilter));
    if (queryText) {
      const terms = queryText.split(/\s+/).filter(Boolean);
      pool = pool.filter(i => {
        const hay = `${i.rawTitle} ${(i.content || '').slice(0, 500)} ${i.source} ${(i.topics || []).map((t: TopicId) => TOPIC_LABEL[t]).join(' ')} ${(i.examTags || []).join(' ')}`.toLowerCase();
        return terms.every(t => hay.includes(t));
      });
    }

    if (category !== 'all') {
      pool = pool.filter(i => i.sourceCategory === category || (i.altCategories || []).includes(category) || (i.extraCategories || []).includes(category));
      if (!isSearch) pool = diversify(pool);
    } else if (isStudent) {
      const now2 = Date.now();
      let scored = pool.map(i => ({ i, rel: relOf(i) }));
      if (!isSearch && !topicFilter) {
        const strong = scored.filter(x => x.rel >= 40);
        // Never return an empty exam feed just because a quiet news day has few strong matches.
        scored = strong.length >= pageSize * 2 ? strong : scored.filter(x => x.rel >= 15).sort((a, b) => b.rel - a.rel).slice(0, Math.max(strong.length, 20));
      }
      scored.sort((a, b) => studentRank(b.rel, b.i.pubDate, now2) - studentRank(a.rel, a.i.pubDate, now2));
      pool = scored.map(x => x.i);
      if (!isSearch) pool = diversify(pool);
    } else if (!isSearch) {
      pool = diversify(pool.sort((a, b) => {
        const sA = a.pubDate.getTime() + (userWeights[a.sourceCategory] || 0) * 3600000;
        const sB = b.pubDate.getTime() + (userWeights[b.sourceCategory] || 0) * 3600000;
        return sB - sA;
      }));
    }

    const start = (pageNum - 1) * pageSize;
    const window = pool.slice(start, start + pageSize);
    if (window.length === 0) return res.status(200).json({ items: [], hasMore: false });

    const processed = await batchProcessIntel(window);

    const final = processed.map(item => {
      const date = item.pubDate instanceof Date ? item.pubDate : new Date(item.pubDate);
      const timeStr = isNaN(date.getTime()) ? "Just now" : 
                      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " + 
                      date.toLocaleDateString([], { day: '2-digit', month: 'short' });

      const searchTerms = item.image_prompt || item.rawTitle;
      const encoded = encodeURIComponent(searchTerms.slice(0, 60) + " photorealistic 4k cinematic lighting news");
      const fallbackUrl = `https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80&sig=${encoded}`;

      const { _scores, ...clean } = item as any;
      const out: any = {
        ...clean,
        time: timeStr,
        imageUrl: item.imageUrl || fallbackUrl
      };
      if (isStudent) {
        out.relevance = relOf(item);
        out.importance = importanceOf(out.relevance);
        out.why = out.importance ? whyItMatters(examId, item.topics || [], item.source, focus) : undefined;
      }
      return out;
    });

    res.status(200).json({ items: final, hasMore: pool.length > start + pageSize, sources: SOURCE_HEALTH });
  } catch (error) {
    console.error("Critical Handler Error:", error);
    res.status(200).json({ items: [], hasMore: false });
  }
}