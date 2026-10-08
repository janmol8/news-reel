# Redesign: implementation report

## What loads the news (unchanged core)
`pages/api/news.ts`: RSS_SOURCES -> fetchWithTimeout -> rss-parser -> 60s in-memory cache ->
pagination (5/page) -> quickScrape + Gemini summaries (INTEL_CACHE). `pages/index.tsx` calls
`/api/news?page&category&weights`. State = React state + localStorage (`news_weights`).
No DB, no auth, no router (single page). PIB ("PIB India") was already an RSS source - preserved.

## Files modified
- pages/api/news.ts - additive patches only (see below)
- pages/index.tsx - re-composed UI; fetch / pagination / infinite-scroll / dwell-weights logic kept
- pages/_app.tsx (reduced-motion), styles/globals.css, tailwind.config.js

## Files added
- lib/exams.ts, lib/newsIntel.ts (dedupe, topics, exam relevance, importance, why-it-matters), lib/client.ts, lib/types.ts
- components/: Onboarding, ExamPicker, NewsCard, StudentHome, SearchView, SavedView, ExamsView, ProfileView, TabBar, Sheets, ui

## Left untouched
RSS parsing + image extraction, quickScrape, Gemini batch prompt + INTEL_CACHE, the 19 existing
sources and categories, .env.local, package.json (no new dependencies).

## Changes inside news.ts
1. +5 feeds: Al Jazeera (world); CNN world / politics / tech / science.
2. Per-feed last-good cache: a failing feed serves its previous items and never affects others.
3. After the existing link-dedupe: clusterEvents (same-event merge) + annotate (topics, exam scores).
4. Optional query params: mode, exam, focus, topic, q, source, limit. Omitted = original behaviour.
5. Fixes: type error that broke `next build`; malformed `weights` JSON no longer 500s; invalid pubDate guarded.
