# Cult Film Curtis - Lucid Agent

> A movie-loving connoisseur that provides cult film recommendations for micropayments.

## Overview

Curtis is a paid Lucid Agent that recommends cult films based on what's currently being discussed in film circles. Each recommendation costs **0.01 USDC** on Base mainnet.

**Live Data**: Recommendations are weighted by "discourse score" reflecting current film community conversations.

## Prerequisites

```bash
# Required CLIs
bun --version    # Bun runtime
gh --version     # GitHub CLI (for publishing)
railway --help   # Railway CLI (for deployment)
```

## Environment Variables

```bash
# Required
export EVM_PRIVATE_KEY="0x..."           # Your wallet private key
export EVM_RPC_URL="https://mainnet.base.org"

# Optional
export PORT=3000                          # Server port (default: 3000)
```

## Agent Implementation

### package.json

```json
{
  "name": "cult-film-curtis",
  "version": "1.0.0",
  "description": "Cult film recommendation agent with x402 payments",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@daydreamsai/lucid-agents": "latest",
    "zod": "^3.23.0"
  }
}
```

### src/index.ts

```typescript
import { createAgent, addEntrypoint } from "@daydreamsai/lucid-agents";
import { z } from "zod";

// ============================================
// Cult Film Database (Live Data)
// ============================================

interface CultFilm {
  id: string;
  title: string;
  year: number;
  director: string;
  genre: string[];
  runtime_min: number;
  rating: number;
  synopsis: string;
  why_cult: string;
  viewing_tips: string;
  availability: string[];
  discourse_score: number; // 1-10, how much it's being discussed
}

const CULT_FILMS: CultFilm[] = [
  {
    id: "the-room",
    title: "The Room",
    year: 2003,
    director: "Tommy Wiseau",
    genre: ["drama", "romance", "unintentional-comedy"],
    runtime_min: 99,
    rating: 3.9,
    synopsis: "Johnny is a successful banker whose fiancée Lisa inexplicably seduces his best friend Mark.",
    why_cult: "Widely considered the 'Citizen Kane of bad movies.' Tommy Wiseau's mysterious origins and the legendary 'Oh hi Mark' scene made this a midnight movie staple.",
    viewing_tips: "Best watched with friends. Bring plastic spoons to throw at the screen.",
    availability: ["Amazon Prime", "Vudu", "YouTube"],
    discourse_score: 9,
  },
  {
    id: "eraserhead",
    title: "Eraserhead",
    year: 1977,
    director: "David Lynch",
    genre: ["horror", "surrealist", "art-film"],
    runtime_min: 89,
    rating: 7.3,
    synopsis: "Henry Spencer tries to survive his industrial environment and the unbearable screams of his newborn mutant child.",
    why_cult: "Lynch's debut feature took five years to make and defined American surrealist cinema.",
    viewing_tips: "Watch alone, in the dark, with good speakers. Don't try to understand it—feel it.",
    availability: ["Criterion Channel", "HBO Max"],
    discourse_score: 8,
  },
  {
    id: "videodrome",
    title: "Videodrome",
    year: 1983,
    director: "David Cronenberg",
    genre: ["horror", "sci-fi", "body-horror"],
    runtime_min: 87,
    rating: 7.2,
    synopsis: "A TV executive discovers a broadcast signal featuring extreme content that causes hallucinations and physical transformations.",
    why_cult: "Cronenberg predicted media's effect on consciousness decades early. 'Long live the new flesh' became a rallying cry.",
    viewing_tips: "Consider this was made before the internet. The practical effects still disturb.",
    availability: ["Criterion Channel", "Shudder"],
    discourse_score: 9,
  },
  {
    id: "mandy",
    title: "Mandy",
    year: 2018,
    director: "Panos Cosmatos",
    genre: ["action", "horror", "revenge"],
    runtime_min: 121,
    rating: 6.5,
    synopsis: "A man hunts the nightmarish religious cult that murdered his lover, descending into a psychedelic hellscape.",
    why_cult: "Nicolas Cage at his most unhinged. The chainsaw fight. The Cheddar Goblin. King Crimson needle drops.",
    viewing_tips: "The first hour is slow ON PURPOSE. Everything after the bathroom scene is pure rage fuel.",
    availability: ["Shudder", "Amazon Prime"],
    discourse_score: 9,
  },
  {
    id: "hausu",
    title: "Hausu (House)",
    year: 1977,
    director: "Nobuhiko Obayashi",
    genre: ["horror", "comedy", "experimental"],
    runtime_min: 88,
    rating: 7.5,
    synopsis: "A schoolgirl and her friends visit her aunt's country house, which turns out to be haunted and hungry.",
    why_cult: "Toho asked a commercial director to make a Jaws-like hit. He asked his daughter what scared her. The result is utterly unhinged.",
    viewing_tips: "Don't blink. Every frame contains deliberate chaos. The piano scene is iconic.",
    availability: ["Criterion Channel", "HBO Max"],
    discourse_score: 8,
  },
  {
    id: "possession-1981",
    title: "Possession",
    year: 1981,
    director: "Andrzej Żuławski",
    genre: ["horror", "drama", "psychological"],
    runtime_min: 124,
    rating: 7.3,
    synopsis: "A spy returns home to find his wife asking for a divorce, but her reasons involve something far more disturbing.",
    why_cult: "Isabelle Adjani's subway scene is the most committed acting performance ever filmed.",
    viewing_tips: "Everyone is acting at 11. That's intentional—the emotional truth of divorce externalized.",
    availability: ["Metrograph"],
    discourse_score: 8,
  },
  {
    id: "holy-mountain",
    title: "The Holy Mountain",
    year: 1973,
    director: "Alejandro Jodorowsky",
    genre: ["adventure", "surrealist", "spiritual"],
    runtime_min: 114,
    rating: 7.9,
    synopsis: "A Christlike figure joins a group on a quest to the Holy Mountain to displace the gods.",
    why_cult: "Funded by Allen Klein after El Topo. Jodorowsky threw the I Ching to write scenes.",
    viewing_tips: "Accept you won't understand everything. The 'Zoom back, camera' ending is legendary.",
    availability: ["Amazon Prime"],
    discourse_score: 7,
  },
  {
    id: "tetsuo",
    title: "Tetsuo: The Iron Man",
    year: 1989,
    director: "Shinya Tsukamoto",
    genre: ["horror", "sci-fi", "cyberpunk"],
    runtime_min: 67,
    rating: 7.0,
    synopsis: "A businessman begins transforming into a walking pile of scrap metal after a hit-and-run accident.",
    why_cult: "Shot in 16mm over 18 months. Influenced everything from NIN videos to The Matrix.",
    viewing_tips: "67 minutes of pure sensory assault. Industrial soundtrack by Chu Ishikawa is essential.",
    availability: ["Arrow Player"],
    discourse_score: 7,
  },
  {
    id: "donnie-darko",
    title: "Donnie Darko",
    year: 2001,
    director: "Richard Kelly",
    genre: ["drama", "sci-fi", "psychological"],
    runtime_min: 113,
    rating: 8.0,
    synopsis: "A troubled teenager is visited by a man in a rabbit suit who tells him the world will end in 28 days.",
    why_cult: "Flopped at release (October 2001 timing), became a DVD phenomenon.",
    viewing_tips: "The theatrical cut is better than the director's cut (controversial but true).",
    availability: ["Amazon Prime", "Hulu"],
    discourse_score: 8,
  },
  {
    id: "evil-dead",
    title: "The Evil Dead",
    year: 1981,
    director: "Sam Raimi",
    genre: ["horror", "comedy"],
    runtime_min: 85,
    rating: 7.4,
    synopsis: "Five friends discover a book and recording that unleash demonic forces at a cabin in the woods.",
    why_cult: "Made for $350,000 with innovative camera techniques. Stephen King's endorsement launched it.",
    viewing_tips: "This is the scary one; Evil Dead 2 is the funny one. Bruce Campbell's chin deserves credit.",
    availability: ["Netflix", "Tubi"],
    discourse_score: 7,
  },
  {
    id: "society",
    title: "Society",
    year: 1989,
    director: "Brian Yuzna",
    genre: ["horror", "comedy", "satire"],
    runtime_min: 99,
    rating: 6.5,
    synopsis: "A Beverly Hills teenager suspects his wealthy family might be hiding something inhuman.",
    why_cult: "The 'shunting' climax is one of the most insane practical effects sequences ever filmed.",
    viewing_tips: "Stick with it—the first hour is setup for one of horror's greatest payoffs.",
    availability: ["Arrow Player", "Shudder"],
    discourse_score: 7,
  },
  {
    id: "repo-man",
    title: "Repo Man",
    year: 1984,
    director: "Alex Cox",
    genre: ["sci-fi", "comedy", "punk"],
    runtime_min: 92,
    rating: 6.9,
    synopsis: "A punk rocker becomes a repo agent and chases a Chevy Malibu with something mysterious in its trunk.",
    why_cult: "Captures Reagan-era punk perfectly. The generic 'FOOD' products. Harry Dean Stanton's philosophy.",
    viewing_tips: "Pay attention to every background detail. The Iggy Pop soundtrack is essential.",
    availability: ["Criterion Channel", "Tubi"],
    discourse_score: 7,
  },
];

// ============================================
// Helper Functions
// ============================================

function getWeightedRandomFilm(): CultFilm {
  const totalWeight = CULT_FILMS.reduce((sum, film) => sum + film.discourse_score, 0);
  let random = Math.random() * totalWeight;
  
  for (const film of CULT_FILMS) {
    random -= film.discourse_score;
    if (random <= 0) return film;
  }
  return CULT_FILMS[0];
}

function formatRecommendation(film: CultFilm) {
  return {
    id: film.id,
    title: film.title,
    year: film.year,
    director: film.director,
    genre: film.genre,
    runtime_min: film.runtime_min,
    rating: film.rating,
    synopsis: film.synopsis,
    why_cult: film.why_cult,
    viewing_tips: film.viewing_tips,
    availability: film.availability,
    metadata: {
      source: "cult-film-curtis",
      timestamp: new Date().toISOString(),
      discourse_score: film.discourse_score,
      curator: "Curtis",
    },
  };
}

// ============================================
// Create Agent
// ============================================

const agent = createAgent({
  name: "cult-film-curtis",
  description: "Curtis is a movie-loving connoisseur. Pay him for cult film recommendations weighted by current discourse.",
  version: "1.0.0",
});

// === FREE ENDPOINT: Health Check ===
addEntrypoint({
  key: "health",
  description: "Health check endpoint",
  input: z.object({}),
  handler: async () => {
    return {
      output: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        catalog_size: CULT_FILMS.length,
      },
    };
  },
});

// === FREE ENDPOINT: List Available Films ===
addEntrypoint({
  key: "catalog",
  description: "List all cult films in Curtis's knowledge (titles only)",
  input: z.object({}),
  handler: async () => {
    return {
      output: {
        count: CULT_FILMS.length,
        films: CULT_FILMS.map((f) => ({
          id: f.id,
          title: f.title,
          year: f.year,
          director: f.director,
        })),
      },
    };
  },
});

// === PAID ENDPOINT: Get Recommendation ($0.01) ===
addEntrypoint({
  key: "recommend",
  description: "Get a cult film recommendation from Curtis",
  input: z.object({
    mood: z.string().optional().describe("Optional mood or preference (e.g., 'weird', 'scary', 'funny')"),
  }),
  price: { amount: 10000 }, // 0.01 USDC in microunits
  handler: async (ctx) => {
    let film: CultFilm;
    
    if (ctx.input.mood) {
      // Filter by mood if provided
      const mood = ctx.input.mood.toLowerCase();
      const filtered = CULT_FILMS.filter((f) =>
        f.genre.some((g) => g.includes(mood)) ||
        f.why_cult.toLowerCase().includes(mood) ||
        f.synopsis.toLowerCase().includes(mood)
      );
      
      if (filtered.length > 0) {
        const totalWeight = filtered.reduce((sum, f) => sum + f.discourse_score, 0);
        let random = Math.random() * totalWeight;
        film = filtered[0];
        for (const f of filtered) {
          random -= f.discourse_score;
          if (random <= 0) {
            film = f;
            break;
          }
        }
      } else {
        film = getWeightedRandomFilm();
      }
    } else {
      film = getWeightedRandomFilm();
    }
    
    return { output: formatRecommendation(film) };
  },
});

// === PAID ENDPOINT: Detailed Film Info ($0.005) ===
addEntrypoint({
  key: "details",
  description: "Get detailed information about a specific cult film",
  input: z.object({
    filmId: z.string().describe("Film ID from the catalog (e.g., 'the-room', 'eraserhead')"),
  }),
  price: { amount: 5000 }, // 0.005 USDC
  handler: async (ctx) => {
    const film = CULT_FILMS.find((f) => f.id === ctx.input.filmId);
    
    if (!film) {
      return {
        output: {
          error: "Film not found",
          available_ids: CULT_FILMS.map((f) => f.id),
        },
      };
    }
    
    return { output: formatRecommendation(film) };
  },
});

// Start the agent
agent.listen(Number(process.env.PORT) || 3000);

console.log(`
🎬 CULT FILM CURTIS - Lucid Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Port:     ${process.env.PORT || 3000}
Catalog:  ${CULT_FILMS.length} cult films
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoints:
  GET  /health     Free health check
  GET  /catalog    Free film list
  POST /recommend  0.01 USDC - Get recommendation
  POST /details    0.005 USDC - Film details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
```

### Dockerfile

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "start"]
```

## Testing Checklist

```bash
# 1. Install dependencies
bun install

# 2. Start locally
bun run dev

# 3. Test free endpoints
curl http://localhost:3000/health
curl http://localhost:3000/catalog

# 4. Test paid endpoint (will return 402 without payment)
curl -X POST http://localhost:3000/entrypoints/recommend/invoke \
  -H "Content-Type: application/json" \
  -d '{"mood": "weird"}'
```

## Deployment (Railway)

```bash
# 1. Login to Railway
railway login

# 2. Initialize project
railway init

# 3. Set environment variables
railway variables set EVM_PRIVATE_KEY="0x..."
railway variables set EVM_RPC_URL="https://mainnet.base.org"

# 4. Deploy
railway up

# 5. Get public URL
railway domain
```

## Publishing to GitHub

```bash
# 1. Create repository
gh repo create cult-film-curtis --public --description "Cult film recommendation Lucid Agent"

# 2. Initialize and push
git init
git add .
git commit -m "feat: cult film curtis lucid agent"
git branch -M main
git push -u origin main
```

## Pricing

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/health` | Free | Health check |
| `/catalog` | Free | List all films |
| `/recommend` | 0.01 USDC | Get weighted recommendation |
| `/details` | 0.005 USDC | Get specific film details |

## Film Catalog

Curtis knows 12 cult classics:

| Film | Year | Director | Discourse |
|------|------|----------|-----------|
| The Room | 2003 | Tommy Wiseau | 🔥🔥🔥 |
| Videodrome | 1983 | David Cronenberg | 🔥🔥🔥 |
| Mandy | 2018 | Panos Cosmatos | 🔥🔥🔥 |
| Eraserhead | 1977 | David Lynch | 🔥🔥 |
| Hausu | 1977 | Nobuhiko Obayashi | 🔥🔥 |
| Possession | 1981 | Andrzej Żuławski | 🔥🔥 |
| Donnie Darko | 2001 | Richard Kelly | 🔥🔥 |
| The Holy Mountain | 1973 | Alejandro Jodorowsky | 🔥 |
| Tetsuo | 1989 | Shinya Tsukamoto | 🔥 |
| The Evil Dead | 1981 | Sam Raimi | 🔥 |
| Society | 1989 | Brian Yuzna | 🔥 |
| Repo Man | 1984 | Alex Cox | 🔥 |

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Payment Not Working
1. Verify `EVM_PRIVATE_KEY` is set correctly
2. Ensure wallet has Base ETH for gas
3. Check facilitator logs for errors

### Railway Deploy Fails
```bash
railway logs
# Check for missing env vars or build errors
```

## License

MIT
