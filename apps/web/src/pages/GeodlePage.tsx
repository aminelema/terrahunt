import type { GeodleGuessRow, SecretCountryReveal } from '@terrahunt/shared';
import { Calendar, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { ClueSummaryBar } from '../components/geodle/ClueSummaryBar';
import { CountryAutocomplete } from '../components/geodle/CountryAutocomplete';
import { CountryFlag } from '../components/geodle/CountryFlag';
import { GuessClueRow } from '../components/geodle/GuessClueRow';
import { useGeodleGame } from '../hooks/useGeodleGame';

const COLUMN_HEADERS = [
  'Country',
  'Continent',
  'Population',
  'Area',
  'Landlocked',
  'Avg Temp',
  'Neighbor',
];

const STARTER_PICKS = [
  { iso2: 'DE', name: 'Germany' },
  { iso2: 'JP', name: 'Japan' },
  { iso2: 'BR', name: 'Brazil' },
  { iso2: 'EG', name: 'Egypt' },
  { iso2: 'US', name: 'USA' },
  { iso2: 'AU', name: 'Australia' },
];

const MIN_VISIBLE_BOARD_ROWS = 5;

/** Converts the revealed secretCountry into an all-green GuessClueRow for the pinned bottom row. */
function buildAllGreenRevealRow(
  secret: SecretCountryReveal,
  guessCount: number,
): GeodleGuessRow {
  return {
    guessOrder: guessCount,
    countryIso2: secret.iso2,
    countryName: secret.nameEn,
    flagEmoji: secret.flagEmoji,
    isCorrect: true,
    createdAt: new Date().toISOString(),
    clues: {
      continent: { status: 'MATCH', region: secret.region, subregion: secret.subregion },
      population: { status: 'MATCH', trend: 'EQUAL', value: secret.population },
      areaKm2: { status: 'MATCH', trend: 'EQUAL', value: secret.areaKm2 },
      landlocked: { status: 'MATCH', value: secret.isLandlocked },
      avgTempC: { status: 'MATCH', trend: 'EQUAL', value: secret.avgTempC },
      neighborOrDirection: { status: 'MATCH', isNeighbor: true, direction: null },
    },
  };
}

export function GeodlePage() {
  const game = useGeodleGame();
  const session = game.session;

  // Exclude the winning guess from the scrollable list above so it isn't shown twice
  // when pinned as the all-green answer row right underneath!
  const wrongGuessesNewestFirst = session
    ? [...session.guesses].filter((g) => !g.isCorrect).reverse()
    : [];

  const totalFilledRows =
    wrongGuessesNewestFirst.length + (session?.secretCountry ? 1 : 0);
  const placeholderSlotCount = Math.max(0, MIN_VISIBLE_BOARD_ROWS - totalFilledRows);

  return (
    <main className="max-w-5xl mx-auto px-4 py-4 space-y-3.5">
      {/* 1. Compact Header Card */}
      <section className="rounded-2xl bg-navy-800 border border-slate-700/70 px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">Guess the Country</h1>
            {session?.mode === 'DAILY' && session.dailyChallengeNumber && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Daily #{session.dailyChallengeNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Guess any country — arrows point toward the secret answer.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-navy-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => void game.switchOrStartMode('DAILY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                game.mode === 'DAILY'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => void game.switchOrStartMode('FREEPLAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                game.mode === 'FREEPLAY'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Play</span>
            </button>
          </div>

          {session && (
            <div className="bg-navy-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Tries
              </div>
              <div className="text-sm font-mono font-bold text-white">{session.guessCount}</div>
            </div>
          )}
        </div>
      </section>

      {game.error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-4 py-2.5 text-xs text-rose-200">
          {game.error}
        </div>
      )}

      {game.loading ? (
        <div className="rounded-2xl bg-navy-900 border border-slate-800 h-60 flex items-center justify-center text-slate-400 text-sm">
          Loading Geodle...
        </div>
      ) : session ? (
        <>
          {/* 2. Search Input (while playing) OR Compact Play-Again Bar (when finished) */}
          {session.status === 'IN_PROGRESS' ? (
            <div className="space-y-2">
              <CountryAutocomplete
                countries={game.availableCountries}
                submitting={game.submitting}
                canGiveUp={session.guessCount > 0}
                onSelectCountry={(iso2) => void game.submitGuess(iso2)}
                onGiveUp={() => void game.giveUp()}
              />

              {session.guessCount === 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 mr-1">Start with:</span>
                  {STARTER_PICKS.map((pick) => (
                    <button
                      key={pick.iso2}
                      type="button"
                      disabled={game.submitting}
                      onClick={() => void game.submitGuess(pick.iso2)}
                      className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-medium inline-flex items-center gap-1.5 transition"
                    >
                      <CountryFlag iso2={pick.iso2} className="w-4 h-3" />
                      <span>{pick.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-navy-900 border border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                {session.status === 'WON' && <Trophy className="w-4 h-4 text-amber-400" />}
                <span>
                  {session.status === 'WON'
                    ? `Solved in ${session.guessCount} ${session.guessCount === 1 ? 'try' : 'tries'}!`
                    : 'Game Over — Secret Country Revealed Below'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void game.switchOrStartMode('FREEPLAY')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Play Free Play</span>
              </button>
            </div>
          )}

          {/* 3. Narrowed Clues Summary */}
          <ClueSummaryBar guesses={session.guesses} />

          {/* 4. Clue Grid: Scrollable Guesses + Pinned All-Green Answer Row Underneath */}
          <section className="space-y-2">
            <div className="hidden sm:grid sm:grid-cols-7 gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              {COLUMN_HEADERS.map((col) => (
                <div key={col}>{col}</div>
              ))}
            </div>

            {/* Scrollable Guesses Container (handles 12+ guesses cleanly without hiding the answer row) */}
            {(wrongGuessesNewestFirst.length > 0 || placeholderSlotCount > 0) && (
              <div className="max-h-[290px] overflow-y-auto space-y-2 pr-1">
                {wrongGuessesNewestFirst.map((guess) => (
                  <GuessClueRow key={guess.guessOrder} guess={guess} />
                ))}

                {Array.from({ length: placeholderSlotCount }).map((_, idx) => {
                  const slotNumber = wrongGuessesNewestFirst.length + idx + 1;
                  return (
                    <div
                      key={`empty-slot-${slotNumber}`}
                      className="hidden sm:grid sm:grid-cols-7 gap-2 opacity-50"
                    >
                      <div className="px-3 py-2 rounded-xl bg-navy-900/50 border border-dashed border-slate-800 flex items-center text-xs font-mono text-slate-600 min-h-[52px]">
                        #{slotNumber}
                      </div>
                      {Array.from({ length: 6 }).map((__, cellIdx) => (
                        <div
                          key={cellIdx}
                          className="rounded-xl bg-navy-900/35 border border-dashed border-slate-800/80 min-h-[52px]"
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pinned All-Green Answer Row (always visible right underneath the scrollable guesses!) */}
            {session.secretCountry && (
              <div className="pt-1 border-t border-emerald-500/30 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 px-1">
                  Secret Country
                </div>
                <GuessClueRow
                  guess={buildAllGreenRevealRow(session.secretCountry, session.guessCount)}
                  subtitleLabel={
                    session.secretCountry.capital
                      ? `Capital: ${session.secretCountry.capital}`
                      : 'Answer'
                  }
                />
              </div>
            )}
          </section>

          {/* 5. Short Legend Strip */}
          <footer className="rounded-xl bg-navy-900/50 border border-slate-800/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              <strong className="text-emerald-400">🟩 Exact</strong> match
            </span>
            <span>
              <strong className="text-amber-400">🟨 Close</strong> (±25% Pop/Area, ±4°C, or same
              continent)
            </span>
            <span>
              <strong className="text-rose-400">↑ ↓ ↗</strong> Secret is higher, lower, or in that
              direction
            </span>
          </footer>
        </>
      ) : null}
    </main>
  );
}
