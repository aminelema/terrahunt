# TerraHunt Codebase Study Guide (Zero-Token Self-Paced Walkthrough)

You can read this file anytime in your editor with **zero AI chat tokens**.
**Golden Rule #1:** Never open `node_modules/`, `dist/`, or `data/*.json` when learning the code. Those are generated/downloaded files. Everything *we* actually wrote is just **~19 small TypeScript files**!

---

## 1. Why Is Everything in One Folder (`terrahunt/`) Instead of Separate Repos?

Think of `/home/amine/projects/terrahunt` as an **apartment building** with **3 separate projects** inside:

```text
terrahunt/                     <-- The building (Monorepo root)
├── packages/
│   └── shared/                <-- Apartment 1: Shared Rulebook (Zod types + score math)
├── apps/
│   ├── api/                   <-- Apartment 2: Standalone NestJS Backend + Prisma DB
│   └── web/                   <-- Apartment 3: Standalone React + Vite Frontend
├── scripts/
│   └── build-geodata.ts       <-- One-time offline script that cleaned the world map data
└── docker-compose.dev.yml     <-- Runs PostgreSQL 16 in Docker
```

- **`apps/api` IS a real, standalone backend project.** When you want to study the backend, collapse everything else in the file explorer and only look inside `apps/api/`.
- **Why keep them under one roof?** Both `apps/api` and `apps/web` import `@terrahunt/shared`. If you had two separate repositories (`terrahunt-backend` and `terrahunt-frontend`), every time you changed an API field or scoring rule, you would have to copy-paste files between two repositories manually.

---

## 2. Why Are There 4 `node_modules` Folders?

We use **`pnpm` workspaces**. It does **not** download 4 copies of libraries:

1. **`terrahunt/node_modules/.pnpm`** holds the **single real copy** of every downloaded package on disk.
2. **`apps/api/node_modules`** only contains tiny **shortcut links (symlinks)** to backend libraries (`@nestjs/*`, `@prisma/client`). That prevents the backend from accidentally importing `react`.
3. **`apps/web/node_modules`** only contains tiny **shortcut links** to browser libraries (`react`, `d3-geo`, `tailwindcss`). That prevents the browser bundle from accidentally importing database code!
4. **`packages/shared/node_modules`** only links to `zod` and `tsup`.

---

## 3. Read the Code in This Exact Order (45-Minute Tour)

Do **not** read files alphabetically. Read these **9 core files** in order from `1 → 9`:

### Step A — The Shared Rulebook (`packages/shared` — 10 mins)
1. **`packages/shared/src/enums.ts`**
   Defines the vocabulary of the app (`DAILY` vs `FREEPLAY`, continents, game statuses).
2. **`packages/shared/src/scoring.ts`**
   Pure functions with zero database or UI noise! Look at `computeTrueSizeRoundScore(guessedRatio, trueRatio)`:
   - It uses `Math.abs(Math.log2(guessedRatio / trueRatio))`.
   - Why `log2`? Because guessing `2.0×` when the answer is `1.0×` (`2/1 = 2`, `log2(2) = 1`) and guessing `0.5×` when the answer is `1.0×` (`0.5/1 = 0.5`, `|log2(0.5)| = 1`) both give **500 points**! Linear math would punish one side unfairly.
3. **`packages/shared/src/schemas.ts`**
   Defines the exact JSON shapes the backend sends to the frontend (`TrueSizeSessionSchema`, `SubmitTrueSizeGuessRequestSchema`). Notice `reveal` is `nullable()`—before you lock in a round, `reveal` is `null` so nobody can peek in Chrome DevTools Network tab to cheat!

### Step B — The Database & Backend (`apps/api` — 20 mins)
4. **`apps/api/prisma/schema.prisma`**
   Look at just **3 models** right now (the others like `GeoRouteGuess` and `TerraHuntGuess` are ready for Milestones 2 & 3):
   - `Country`: stores `iso2`, `nameEn`, `areaKm2`, `labelLat`, `labelLng`.
   - `GameSession`: one 5-round game (`status`, `score`, `stepCount`, `guestId`).
   - `TrueSizeRound`: each of the 5 rounds (`roundNumber 1..5`, `baseIso2`, `targetIso2`, `trueRatio`, `guessedRatio`, `score`).
5. **`apps/api/src/common/guest-cookie.middleware.ts`**
   Runs before every request. Checks if the browser sent a cryptographically signed cookie named `th_guest_id`. If not, it invents a random UUID (`crypto.randomUUID()`) and sets the cookie so guests can refresh the page without losing their Daily progress!
6. **`apps/api/src/modules/truesize/truesize.controller.ts`**
   Thin "receptionist" layer—defines the 3 URLs:
   - `POST /api/v1/games/truesize` (start or resume game)
   - `GET /api/v1/games/truesize/:id` (read game)
   - `POST /api/v1/games/truesize/:id/guess` (lock in slider guess)
7. **`apps/api/src/modules/truesize/truesize.service.ts`** *(The Brain of the Backend)*
   Focus on 3 methods:
   - `pickFivePairs()`: picks 5 random country pairs (`areaKm2 >= 10,000` and true ratio between `0.14×` and `7.0×`), preferring countries at very different latitudes (because Mercator flat maps trick human brains across latitudes!).
   - `submitGuess()`: runs inside `prisma.$transaction`, locks the session row with `SELECT ... FOR UPDATE` (so double-clicking cannot submit Round 1 twice), computes the score, saves it, and marks the game `COMPLETED` after Round 5.
   - `serializeSession()`: converts DB rows to JSON, hiding `trueRatio` and `areaKm2` for any round where `answeredAt === null`.

### Step C — The Browser Game (`apps/web` — 15 mins)
8. **`apps/web/src/utils/equalAreaShape.ts`** *(The Cool Cartography Trick)*
   - `buildNormalizedCountryShape()`: takes any country from `countries-50m.topo.json` and rotates the globe with `d3.geoAzimuthalEqualArea().rotate([-labelLng, -labelLat])` so that country sits right at `(0, 0)` on the equator—**zero distortion**! Then it scales the projection so Country A and Country B start with the **exact same `11,000 px²` pixel area** on screen.
   - `areaRatioToLinearScale(areaRatio)`: returns `Math.sqrt(areaRatio)`. Why square root? Because if you double a shape's width *and* height (`scale(2)`), its 2D area becomes `2 × 2 = 4×` bigger! So to make the visual area `R×` bigger, you scale width & height by `√R`.
9. **`apps/web/src/pages/TrueSizePage.tsx` & `components/truesize/CountryShapeStage.tsx`**
   - `TrueSizePage.tsx` calls `apiClient.startTrueSizeSession('DAILY')` on load, holds `guessedRatio` state while you drag the slider, and calls `apiClient.submitTrueSizeGuess(...)` when you click **Lock In True Size**.
   - `CountryShapeStage.tsx` renders the `<svg>` with `<g transform="scale(...)">` for both countries.

---

## 4. Hands-On Zero-Token Experiments (Learn by Breaking & Inspecting!)

Run these in your Ubuntu terminal (`/home/amine/projects/terrahunt`) to see the system come alive:

1. **Inspect Live Database Rows Visually (`Prisma Studio`):**
   ```bash
   cd /home/amine/projects/terrahunt/apps/api
   export PATH="$HOME/.nvm/versions/node/v22.23.5/bin:$PATH"
   npx prisma studio
   ```
   Open `http://localhost:5555` in your browser! Click `GameSession` and `TrueSizeRound`, play a round at `http://localhost:5173`, refresh Prisma Studio, and watch your `guessedRatio` and `score` appear in real time!

2. **Inspect the Live Interactive API Docs (`Swagger`):**
   Open `http://localhost:3000/api/docs` in your browser. You can click **"Try it out"** on `GET /api/v1/health` or `GET /api/v1/countries` directly without writing any code!

3. **Run Single Test Files & Edit Assertions:**
   Open `packages/shared/src/scoring.test.ts`, add your own `expect(computeTrueSizeRoundScore(...))` line, and run:
   ```bash
   pnpm --filter @terrahunt/shared test
   ```

4. **Change a Visual Detail & Watch Hot-Reload:**
   Open `apps/web/src/components/truesize/CountryShapeStage.tsx`, change `#38BDF8` (the blue reference country stroke) to `#A855F7` (purple), save the file, and watch `http://localhost:5173` update instantaneously!
