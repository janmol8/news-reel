# News Reel 📰

A modern, reels-style news aggregation app built with **Next.js**. Scroll through a personalized feed of verified news from around the world — with AI-powered summaries in **English and Hindi**, and a special **student mode** that surfaces news relevant to competitive exams.

## Features

- 📱 **Reels-style feed** — swipeable, card-based news with infinite scroll
- 🌍 **25+ verified sources** — PIB India, BBC, Reuters, Al Jazeera, CNN, Economic Times, LiveMint, Moneycontrol, TechCrunch, ESPN, NASA and more
- 🤖 **AI summaries** — short, factual summaries in English *and* Hindi, generated with Google Gemini
- 🎓 **Student mode** — exam-focused news for SSC, Banking, UPSC, Railways, Defence and State PSC, with relevance scores, importance tags (🔥 Must read / ⭐ Important / 📌 Good to know) and "why it matters" notes
- 🗂️ **Categories** — Politics, World, Economy, Business, Tech, Entertainment, Science, Health, Leaders, Sports
- 🔍 **Search** — full-text search across titles, summaries, sources and topics
- 🔖 **Saved stories** — bookmark articles to read later
- 🧠 **Smart clustering** — same-event stories from different outlets are merged into one card
- 📊 **Learns what you read** — dwell-time weighting personalizes your feed (stored locally in your browser)
- 🌗 **Light / dark theme**

## Installation

```bash
git clone https://github.com/janmol8/news-reel.git
cd news-reel
npm install
```

Start the dev server:

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

Production build:

```bash
npm run build
npm start
```

## API configuration

The app fetches all news from **public RSS feeds — no news API keys required**.

The only optional key is the **Google Gemini** key used for AI summaries:

1. Copy the example env file:

   ```bash
   cp .env.example .env.local
   ```

2. Get a free key from [Google AI Studio](https://aistudio.google.com/apikey) and paste it in:

   ```text
   GEMINI_API_KEY=your_key_here
   ```

> ℹ️ Without a key the app still works — it falls back to basic summaries. Your `.env.local` is git-ignored, so your key is never uploaded to GitHub.

## Project structure

```text
news-reel/
├── pages/
│   ├── api/news.ts        # RSS aggregation + AI summarization API
│   ├── index.tsx          # Main feed
│   └── _app.tsx
├── components/            # NewsCard, SearchView, SavedView, TabBar, ...
├── lib/                   # Exam defs, news intel (clustering/scoring), types
├── styles/                # Global styles (Tailwind)
├── public/
├── .env.example           # Template for your environment variables
└── package.json
```

## Tech stack

Next.js 14 · TypeScript · Tailwind CSS · framer-motion · rss-parser · Google Generative AI

## License

Feel free to use and modify.
