---
name: cult-film-curtis
description: |
  Builds a cult film recommendation agent with x402 payments. Use when creating
  entertainment-focused paid agents, building TMDB API integrations, or designing
  recommendation systems with micropayments.
---

# Cult Film Curtis - Lucid Agent

Movie-loving connoisseur that provides cult film recommendations for micropayments using TMDB API.

## Prerequisites

- Bun runtime
- [TMDB API key](https://www.themoviedb.org/settings/api) (free)

## Environment Variables

```bash
export EVM_PRIVATE_KEY="0x..."
export PAYMENTS_RECEIVABLE_ADDRESS="0x..."
export FACILITATOR_URL="https://x402.org/facilitator"
export NETWORK="base"
export TMDB_API_KEY="your_tmdb_api_key"
```

## Implementation

### package.json

```json
{
  "name": "cult-film-curtis",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@lucid-agents/core": "latest",
    "@lucid-agents/http": "latest",
    "@lucid-agents/hono": "latest",
    "@lucid-agents/payments": "latest",
    "hono": "^4.0.0",
    "zod": "^4.0.0"
  }
}
```

### src/index.ts

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY environment variable is required');
}
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Cult film keyword IDs from TMDB
const CULT_KEYWORDS = [9717, 12339, 156218]; // cult-film, midnight-movie, b-movie

interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  vote_average: number;
  poster_path: string | null;
  genre_ids: number[];
}

// Cache to avoid rate limits
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300_000; // 5 minutes

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

async function fetchCultFilms(page = 1): Promise<TMDBMovie[]> {
  try {
    const keywordId = CULT_KEYWORDS[Math.floor(Math.random() * CULT_KEYWORDS.length)];
    const url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_keywords=${keywordId}&sort_by=vote_count.desc&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`TMDB discover failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('fetchCultFilms error:', err);
    return [];
  }
}

async function fetchMovieDetails(movieId: number): Promise<Record<string, any> | null> {
  try {
    const url = `${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`TMDB movie details failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('fetchMovieDetails error:', err);
    return null;
  }
}

async function searchCultFilms(query: string): Promise<TMDBMovie[]> {
  try {
    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`TMDB search failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('searchCultFilms error:', err);
    return [];
  }
}

// Create agent with extensions
const agent = await createAgent({
  name: 'cult-film-curtis',
  version: '1.0.0',
  description: 'Cult film recommendations for micropayments',
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// FREE: Health check
addEntrypoint({
  key: 'health',
  description: 'Health check',
  input: z.object({}),
  price: { amount: 0 },
  handler: async () => ({
    output: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tmdbConnected: !!TMDB_API_KEY,
    },
  }),
});

// FREE: Overview of what Curtis offers
addEntrypoint({
  key: 'overview',
  description: 'Free overview of available recommendations',
  input: z.object({}),
  price: { amount: 0 },
  handler: async () => {
    const sample = await fetchWithCache('sample', () => fetchCultFilms(1));
    return {
      output: {
        endpoints: ['recommend', 'details', 'search'],
        dataSource: 'TMDB',
        sampleTitles: sample.slice(0, 5).map((m) => m.title),
        fetchedAt: new Date().toISOString(),
      },
    };
  },
});

// PAID: Get recommendation ($0.01)
addEntrypoint({
  key: 'recommend',
  description: 'Get a cult film recommendation',
  input: z.object({
    mood: z.string().optional().describe('Genre or mood preference'),
    page: z.number().min(1).max(10).optional().describe('Result page (1-10)'),
  }),
  price: { amount: 10000 }, // 0.01 USDC
  handler: async (ctx) => {
    const page = ctx.input.page || Math.ceil(Math.random() * 5);
    const films = await fetchWithCache(`films:${page}`, () => fetchCultFilms(page));

    if (films.length === 0) {
      return { output: { error: 'No films available', fetchedAt: new Date().toISOString() } };
    }

    let selection = films;
    if (ctx.input.mood) {
      const mood = ctx.input.mood.toLowerCase();
      selection = films.filter(
        (f) => f.overview.toLowerCase().includes(mood) || f.title.toLowerCase().includes(mood)
      );
      if (selection.length === 0) selection = films;
    }

    const film = selection[Math.floor(Math.random() * selection.length)];
    return {
      output: {
        id: film.id,
        title: film.title,
        year: film.release_date?.split('-')[0],
        rating: film.vote_average,
        synopsis: film.overview,
        poster: film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null,
        source: 'tmdb',
        fetchedAt: new Date().toISOString(),
      },
    };
  },
});

// PAID: Detailed film info ($0.005)
addEntrypoint({
  key: 'details',
  description: 'Get detailed information about a specific film',
  input: z.object({
    movieId: z.number().describe('TMDB movie ID'),
  }),
  price: { amount: 5000 }, // 0.005 USDC
  handler: async (ctx) => {
    const details = await fetchWithCache(`details:${ctx.input.movieId}`, () =>
      fetchMovieDetails(ctx.input.movieId)
    );

    if (!details) {
      return { output: { error: 'Movie not found', movieId: ctx.input.movieId, fetchedAt: new Date().toISOString() } };
    }

    return {
      output: {
        id: details.id,
        title: details.title,
        year: details.release_date?.split('-')[0],
        runtime: details.runtime,
        rating: details.vote_average,
        synopsis: details.overview,
        genres: details.genres?.map((g: any) => g.name) || [],
        director: details.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
        cast: details.credits?.cast?.slice(0, 5).map((c: any) => c.name) || [],
        keywords: details.keywords?.keywords?.map((k: any) => k.name) || [],
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        imdbId: details.imdb_id,
        source: 'tmdb',
        fetchedAt: new Date().toISOString(),
      },
    };
  },
});

// PAID: Search films ($0.002)
addEntrypoint({
  key: 'search',
  description: 'Search for cult films by title',
  input: z.object({
    query: z.string().min(2).describe('Search query'),
  }),
  price: { amount: 2000 }, // 0.002 USDC
  handler: async (ctx) => {
    const results = await searchCultFilms(ctx.input.query);
    return {
      output: {
        query: ctx.input.query,
        count: results.length,
        films: results.slice(0, 10).map((f) => ({
          id: f.id,
          title: f.title,
          year: f.release_date?.split('-')[0],
          rating: f.vote_average,
        })),
        fetchedAt: new Date().toISOString(),
      },
    };
  },
});

const port = Number(process.env.PORT ?? 3000);
console.log(`Cult Film Curtis running on port ${port}`);

export default { port, fetch: app.fetch };
```

## Pricing

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/health` | Free | Health check |
| `/overview` | Free | Sample titles, discover endpoints |
| `/recommend` | 0.01 USDC | Random cult film recommendation |
| `/details` | 0.005 USDC | Full movie details with cast/crew |
| `/search` | 0.002 USDC | Search by title |

## Testing

```bash
bun install && bun run dev

# Free endpoints
curl http://localhost:3000/health
curl http://localhost:3000/entrypoints/overview/invoke -X POST -H "Content-Type: application/json" -d '{}'

# Paid endpoint (returns 402 without payment)
curl http://localhost:3000/entrypoints/recommend/invoke -X POST \
  -H "Content-Type: application/json" \
  -d '{"mood": "horror"}'
```

## Deployment

```bash
railway login && railway init
railway variables set TMDB_API_KEY="..." EVM_PRIVATE_KEY="0x..." \
  PAYMENTS_RECEIVABLE_ADDRESS="0x..." FACILITATOR_URL="https://x402.org/facilitator" NETWORK="base"
railway up && railway domain
```
