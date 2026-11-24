# Geodle — Full-Stack Interview Study Guide (Zero Unused Code)

Every single file, database table, and dependency in `/home/amine/projects/terrahunt` exists **only** for **Geodle**. There are **zero** unused tables, zero GIS libraries, and zero placeholder files.

---

## 1. Exact File Map (Only 15 Source Files Total!)

Ignore `node_modules/`, `dist/`, and `data/*.json`. Everything we wrote is just **15 small TypeScript files**:

```text
terrahunt/
├── packages/shared/src/                # Shared Rulebook (imported by both API & Web)
│   ├── enums.ts                        # 1. Continent, GameMode, ClueStatus enums
│   ├── geodle-logic.ts                 # 2. The 6-attribute comparison if/else logic
│   └── schemas.ts                      # 3. Zod request/response schemas
├── apps/api/                           # NestJS Backend + PostgreSQL 16
│   ├── prisma/schema.prisma            # 4. The 6 database tables
│   ├── prisma/seed.ts                  # 5. Inserts the 197 countries + borders
│   └── src/
│       ├── common/guest-cookie.middleware.ts # 6. Signed httpOnly guest cookie
│       ├── modules/countries/countries.module.ts # 7. GET /countries (ETag cached)
│       └── modules/geodle/
│           ├── geodle.dto.ts           # 8. Request validation DTOs
│           ├── geodle.controller.ts    # 9. URL routes (/games/geodle/...)
│           └── geodle.service.ts       # 10. DB transactions, anti-cheat, daily logic
└── apps/web/src/                       # React + Tailwind Frontend
    ├── api/client.ts                   # 11. fetch() wrapper with cookie credentials
    ├── hooks/useGeodleGame.ts          # 12. Custom hook holding game state & API calls
    ├── pages/GeodlePage.tsx            # 13. Clean declarative page layout
    └── components/geodle/
        ├── ClueSummaryBar.tsx          # 14. Math.min/max narrowed clues bar
        ├── CountryAutocomplete.tsx     # 15. Searchable EN/DE dropdown (↑/↓/Enter)
        ├── CountryFlag.tsx             # 16. SVG flag image (fixes missing Windows flag emojis)
        └── GuessClueRow.tsx            # 17. Renders the 6 Green/Yellow/Red cells

---

## 1.5 How to Reset Your Daily Game Yourself (For Testing & Interviews)

Because Daily progress is tied to your `geodle_guest_id` cookie in `game_sessions`, you have **3 easy ways** to reset it anytime:

1. **Fastest in Browser (3 seconds, zero terminal needed):**
   Press `F12` → **Application** tab (Chrome/Edge) or **Storage** (Firefox) → **Cookies** → `http://localhost:5173` → select `geodle_guest_id` → press **Delete** → Refresh (`F5`). The backend immediately gives you a brand-new guest ID!
2. **Visual Database GUI (Prisma Studio):**
   In `/home/amine/projects/terrahunt/apps/api`, run `npx prisma studio`, open `http://localhost:5555`, click `GameSession`, and delete your row.
3. **One-Line Terminal Reset (Deletes all played sessions, keeps all 197 countries):**
   ```bash
   docker exec -it terrahunt-postgres-dev psql -U terrahunt -d terrahunt -c "DELETE FROM game_sessions;"
   ```
```

---

## 2. Read in This Order (30-Minute Tour)

1. **`packages/shared/src/geodle-logic.ts`**
   Read `evaluateGeodleGuess(guess, secret, isNeighbor)`. It compares the 6 columns using plain `if / else`:
   - **Continent:** Same subregion = `MATCH` (Green), same continent = `CLOSE` (Yellow), else `WRONG` (Red).
   - **Population & Area (`km²`):** Exact = `MATCH`, within ±25% = `CLOSE`, else `WRONG` + `HIGHER` (`↑`) or `LOWER` (`↓`).
   - **Landlocked (*Binnenstaat*):** Same boolean = `MATCH`, else `WRONG`.
   - **Avg Temp (`°C`):** Within ±1.5°C = `MATCH`, within ±4.0°C = `CLOSE`, else `WRONG` + `HIGHER`/`LOWER`.
   - **Neighbor / Direction:** If they share a land border = `MATCH` (`"Yes (Borders!)"`); otherwise `WRONG` + 8-way compass direction (`↗ NE`) computed from `(lat, lng)` so islands are always solvable!

2. **`apps/api/prisma/schema.prisma`**
   Only **6 tables**:
   - `Country`, `CountryAlias`, `CountryNeighbor` (static geography catalog)
   - `DailyChallenge` (1 secret country per UTC date)
   - `GameSession` (tracks `guestId`, `mode`, `status`, `secretCountryIso2`)
   - `GeodleGuess` (`@@unique([sessionId, guessedCountryIso2])` guarantees you cannot guess the same country twice!)

3. **`apps/api/src/modules/geodle/geodle.service.ts`**
   Trace `submitGuess()`:
   - Runs inside `prisma.$transaction`.
   - Locks the `game_sessions` row with `SELECT ... FOR UPDATE` so double-clicking cannot create two guesses with the same `guessOrder`.
   - Checks `status === 'IN_PROGRESS'` and rejects duplicates with `409 Conflict`.
   - Calls `serializeSession()`, which **sets `secretCountry: null` while `status === 'IN_PROGRESS'`** so nobody can cheat in Chrome DevTools!

4. **`apps/web/src/hooks/useGeodleGame.ts` → `pages/GeodlePage.tsx`**
   Notice **Separation of Concerns**:
   - `useGeodleGame()` owns all `useState` / `fetch` logic and filters already-guessed countries out of `availableCountries`.
   - `GeodlePage.tsx`, `CountryAutocomplete.tsx`, and `GuessClueRow.tsx` just render clean UI from props.

---

## 3. Top 5 Interview Questions & Your Ready Answers

1. **"How do you prevent players from cheating via the browser Network tab?"**
   - *"The secret country stays on the backend in `game_sessions.secret_country_iso2`. In `GeodleService.serializeSession()`, `secretCountry` is strictly `null` while `status === 'IN_PROGRESS'`. The server evaluates each guess and only returns the clue statuses (`MATCH`, `CLOSE`, `WRONG`) until the player wins or gives up."*
2. **"How do guests keep their Daily progress on refresh without creating an account?"**
   - *"`GuestCookieMiddleware` issues a cryptographically signed, `httpOnly`, `SameSite=Strict` cookie (`geodle_guest_id`). `game_sessions` has a unique constraint on `(guestId, dailyChallengeId)`, so refreshing resumes the exact session."*
3. **"What happens if a user double-clicks or sends two simultaneous guess requests?"**
   - *"Two protections: first, `submitGuess()` acquires a PostgreSQL row lock (`SELECT ... FOR UPDATE`) on `game_sessions` inside a transaction so guesses are serialized; second, `geodle_guesses` enforces `@@unique([sessionId, guessedCountryIso2])` and `@@unique([sessionId, guessOrder])` at the database level."*
4. **"Why use a `pnpm` monorepo with `packages/shared`?"**
   - *"Single source of truth: our Zod schemas and `evaluateGeodleGuess()` live in `@terrahunt/shared`. NestJS uses `nestjs-zod` to validate incoming requests and generate Swagger docs from those exact schemas, while React uses the inferred TypeScript types—eliminating API drift."*
5. **"Why extract `useGeodleGame` into a custom hook?"**
   - *"Separation of concerns: `useGeodleGame` encapsulates async API state, error handling, and derived state (`availableCountries`), keeping `GeodlePage`, `CountryAutocomplete`, and `GuessClueRow` small, declarative, and easy to unit-test."*
