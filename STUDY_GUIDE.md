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
        ├── CountryAutocomplete.tsx     # 14. Searchable EN/DE dropdown (↑/↓/Enter)
        ├── CountryFlag.tsx             # 15. SVG flag image (fixes missing Windows flag emojis)
        └── GuessClueRow.tsx            # 16. Renders the 6 Green/Yellow/Red cells

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
   Only **6 tables**, split cleanly into **Static World Data** (3 tables) and **Live Gameplay** (3 tables):

   ```mermaid
   erDiagram
       COUNTRIES ||--o{ COUNTRY_ALIASES : "1 : N (country_iso2)"
       COUNTRIES ||--o{ COUNTRY_NEIGHBORS : "1 : N (country_iso2)"
       COUNTRIES ||--o{ COUNTRY_NEIGHBORS : "1 : N (neighbor_iso2)"
       COUNTRIES ||--o{ DAILY_CHALLENGES : "1 : N (secret_country_iso2)"
       COUNTRIES ||--o{ GAME_SESSIONS : "1 : N (secret_country_iso2)"
       COUNTRIES ||--o{ GEODLE_GUESSES : "1 : N (guessed_country_iso2)"
       DAILY_CHALLENGES ||--o{ GAME_SESSIONS : "1 : N (daily_challenge_id)"
       GAME_SESSIONS ||--o{ GEODLE_GUESSES : "1 : N (session_id)"

       COUNTRIES {
           char_2 iso2 PK "e.g. 'AT', 'DE', 'JP'"
           varchar_120 name_en "e.g. 'Austria'"
           varchar_120 capital "nullable, e.g. 'Vienna'"
           CountryRegion region "EUROPE | ASIA | AFRICA | AMERICAS | OCEANIA"
           varchar_80 subregion "e.g. 'Central Europe'"
           int population "e.g. 8800000"
           float area_km2 "e.g. 83871.0"
           boolean is_landlocked "e.g. true"
           float avg_temp_c "e.g. 7.4"
           varchar_16 flag_emoji "e.g. 'AT'"
           float lat "e.g. 47.33"
           float lng "e.g. 13.33"
       }

       COUNTRY_ALIASES {
           int id PK "autoincrement"
           char_2 country_iso2 FK "-> countries.iso2"
           varchar_160 alias "e.g. 'Österreich'"
           varchar_160 alias_normalized "indexed, e.g. 'osterreich'"
       }

       COUNTRY_NEIGHBORS {
           char_2 country_iso2 PK,FK "-> countries.iso2"
           char_2 neighbor_iso2 PK,FK "-> countries.iso2"
       }

       DAILY_CHALLENGES {
           int id PK "autoincrement"
           int challenge_number UK "unique, e.g. 1"
           date challenge_date UK "unique, e.g. '2026-11-25'"
           char_2 secret_country_iso2 FK "-> countries.iso2"
           timestamptz created_at "timestamp"
       }

       GAME_SESSIONS {
           uuid id PK "session UUID"
           uuid guest_id UK "cookie UUID (unique with daily_challenge_id)"
           GameMode mode "DAILY | FREEPLAY"
           int daily_challenge_id FK "nullable -> daily_challenges.id"
           char_2 secret_country_iso2 FK "-> countries.iso2"
           SessionStatus status "IN_PROGRESS | WON | GAVE_UP"
           int guess_count "default 0"
           timestamptz started_at "timestamp"
           timestamptz ended_at "nullable timestamp"
       }

       GEODLE_GUESSES {
           uuid id PK "guess UUID"
           uuid session_id FK "-> game_sessions.id"
           int guess_order UK "unique per session, e.g. 1, 2"
           char_2 guessed_country_iso2 FK "unique per session -> countries.iso2"
           timestamptz created_at "timestamp"
       }
   ```

   - `Country`, `CountryAlias`, `CountryNeighbor` (static geography catalog seeded once)
   - `DailyChallenge` (1 secret country per German calendar date)
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

## 3. Screen-by-Screen Interview Questions & Ready Answers

When an interviewer looks at the live Geodle screen, their eyes go top-to-bottom across each UI feature. Here is every question that screen triggers and the exact answer to give:

### A. Top-Right Timer (`Next Daily (00:00 DE)`) & `Daily #1` Badge
- **Question:** *"Do you run a cron job at midnight to generate the new Daily country? And how do you handle German summer/winter time (CET/CEST)?"*
- **Your Answer:** *"No cron job—if a server restarts at 00:00 a cron job can miss a run. Instead, `getOrCreateTodayDailyChallenge()` in `geodle.service.ts` creates today's puzzle **lazily on the first request** after `00:00 Europe/Berlin`. I use built-in `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' })` so CET/CEST daylight saving is automatic, exclude the last 90 days so countries don't repeat, and catch PostgreSQL `P2002` unique collisions if two users arrive at the exact same millisecond."*

### B. `Tries: 12` Persisting on Refresh (Without a Login Screen!)
- **Question:** *"There's no login button, yet refreshing keeps all 12 tries. Is this stored in `localStorage`? Could I edit `localStorage` to cheat?"*
- **Your Answer:** *"Nothing is in `localStorage`. `GuestCookieMiddleware` issues an `httpOnly`, HMAC-signed, `SameSite=Strict` cookie (`geodle_guest_id`). JavaScript cannot read `httpOnly` cookies, users cannot tamper with a signed UUID, and PostgreSQL enforces `UNIQUE(guest_id, daily_challenge_id)` to resume your exact session."*

### C. Browser DevTools Anti-Cheat
- **Question:** *"If I open Chrome DevTools → Network tab right now, can I find the secret country in the API response?"*
- **Your Answer:** *"No. `GeodleService.serializeSession()` sets `secretCountry: null` whenever `status === 'IN_PROGRESS'`. All clue comparisons happen on the backend; `secretCountry` is only populated once `status` transitions to `'WON'` or `'GAVE_UP'`."*

### D. Search Input (`Type a country name (English or German)...`)
- **Question:** *"Does typing in the input hit PostgreSQL on every keystroke? How does `'osterreich'` match `'Austria'`?"*
- **Your Answer:** *"No per-keystroke DB load! Because 197 countries is only ~18 KB, `GET /api/v1/countries` loads once on mount with `Cache-Control` + `ETag` (`304 Not Modified` on reloads). English and German names live in `country_aliases`, and `normalizeSearchText()` in `@terrahunt/shared` uses Unicode `NFD` normalization to strip accents/umlauts client-side inside `useMemo`, while filtering out already-guessed countries."*

### E. The 6-Column Clue Rows & Scrollable History
- **Question 1 (DB Normalization):** *"Do you save the colors (`CLOSE`, `WRONG`) and numbers (`26.3M`) inside `geodle_guesses`?"*
  - **Your Answer:** *"No, `geodle_guesses` is normalized (3NF): it only stores `(session_id, guess_order, guessed_country_iso2)`. Clues are computed via our shared pure function `evaluateGeodleGuess()` by joining `countries` and `country_neighbors`."*
- **Question 2 (Race Conditions):** *"What happens if a user double-clicks or scripts two concurrent POST requests?"*
  - **Your Answer:** *"`submitGuess()` runs inside `prisma.$transaction` and locks the `game_sessions` row with `SELECT ... FOR UPDATE`, backed by DB constraints `UNIQUE(session_id, guessed_country_iso2)` (`409 Conflict`) and `UNIQUE(session_id, guess_order)`."*
- **Question 3 (Islands & Pacific Compass `↖ NW`):** *"Why combine Neighbor and Compass Direction, and how does compass math handle the ±180° Pacific line?"*
  - **Your Answer:** *"Island nations like Madagascar or Indonesia have 0 land borders—a pure Neighbor column would always be Red. Checking `country_neighbors` first and falling back to spherical great-circle initial bearing (`atan2` in radians in `computeCompassDirection()`) handles both islands and the ±180° antimeridian cleanly."*
- **Question 4 (SVG Flags):** *"Why use `<img>` SVGs in `CountryFlag.tsx` instead of Unicode flag emojis?"*
  - **Your Answer:** *"Windows fonts omit political flag emojis and render two-letter ISO codes (`MG`, `AZ`) instead. Vector `.svg` images render identically on Windows, Linux, and macOS."*

### F. Classic Scaling Follow-Up Question
- **Question:** *"If 100,000 players opened Daily #1 at once, what would you optimize first?"*
- **Your Answer:** *"Today's `DailyChallenge` + all 197 `Country` rows + `country_neighbors` are tiny (~100 KB) and read-only, so I'd cache them in NestJS memory (or Redis across replicas) so `submitGuess()` only executes the single session lock + `INSERT INTO geodle_guesses` without re-reading static country tables."*
