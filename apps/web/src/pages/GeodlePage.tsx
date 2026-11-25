import type { GeodleGuessRow, SecretCountryReveal } from '@terrahunt/shared';
import { RotateCcw, Trophy } from 'lucide-react';
import { CountryAutocomplete } from '../components/geodle/CountryAutocomplete';
import { CountryFlag } from '../components/geodle/CountryFlag';
import { GuessClueRow } from '../components/geodle/GuessClueRow';
import { useGeodleGame } from '../hooks/useGeodleGame';

const COLUMN_HEADERS = [
  'Country',
  'Continent',
  'Population',
  'Area',
  'Coastline',
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

const MIN_VISIBLE_BOARD_ROWS = 6;

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

  const wrongGuessesNewestFirst = session
    ? [...session.guesses].filter((g) => !g.isCorrect).reverse()
    : [];

  const totalFilledRows =
    wrongGuessesNewestFirst.length + (session?.secretCountry ? 1 : 0);
  const placeholderSlotCount = Math.max(0, MIN_VISIBLE_BOARD_ROWS - totalFilledRows);

  return (
    <div className="relative">
      {/* Subtle fading perspective grid backdrop */}
      <div className="pointer-events-none fixed inset-0 bg-cyber-grid z-0" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* 1. Header + Segmented Mode Switch */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.14em] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {session?.mode === 'DAILY' && session.dailyChallengeNumber
                  ? `Daily #${session.dailyChallengeNumber}`
                  : 'Free Play'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Guess the Country
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-lg bg-[#0A0D15]/90 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => void game.switchOrStartMode('DAILY')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
                  game.mode === 'DAILY'
                    ? 'bg-white/[0.10] text-white border border-white/[0.14] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => void game.switchOrStartMode('FREEPLAY')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
                  game.mode === 'FREEPLAY'
                    ? 'bg-white/[0.10] text-white border border-white/[0.14] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Free Play
              </button>
            </div>

            {session && (
              <div className="px-3.5 py-1.5 rounded-lg bg-[#0A0D15]/90 border border-white/[0.08] flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Tries
                </span>
                <span className="text-xs font-mono font-bold text-white tabular-nums">
                  {String(session.guessCount).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </section>

        {game.error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-400/30 px-4 py-2.5 text-xs text-rose-200">
            {game.error}
          </div>
        )}

        {game.loading ? (
          <div className="rounded-xl glass-panel h-72 flex items-center justify-center text-slate-400 text-xs font-mono">
            Loading game...
          </div>
        ) : session ? (
          <>
            {/* 2. Search Input Bar OR End-of-Game Bar */}
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
                    <span className="text-[11px] text-slate-500 mr-1">Quick start:</span>
                    {STARTER_PICKS.map((pick) => (
                      <button
                        key={pick.iso2}
                        type="button"
                        disabled={game.submitting}
                        onClick={() => void game.submitGuess(pick.iso2)}
                        className="px-2.5 py-1 rounded-md bg-[#0A0D15]/80 hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.18] text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition"
                      >
                        <CountryFlag iso2={pick.iso2} className="w-4 h-3" />
                        <span>{pick.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl glass-panel px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  {session.status === 'WON' && <Trophy className="w-4 h-4 text-emerald-400" />}
                  <span>
                    {session.status === 'WON'
                      ? `Solved in ${session.guessCount} ${session.guessCount === 1 ? 'try' : 'tries'}!`
                      : 'Game over — secret country revealed below'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void game.switchOrStartMode('FREEPLAY')}
                  className="px-3.5 py-1.5 rounded-md bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Play Free Play</span>
                </button>
              </div>
            )}

            {/* 3. Architectural Telemetry Matrix Container */}
            <section className="rounded-xl glass-panel overflow-hidden">
              {/* Column Header Strip */}
              <div className="hidden sm:grid sm:grid-cols-7 gap-1.5 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.07] text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
                {COLUMN_HEADERS.map((col) => (
                  <div key={col} className="px-1">
                    {col}
                  </div>
                ))}
              </div>

              <div className="p-3 sm:p-4 space-y-1.5">
                {(wrongGuessesNewestFirst.length > 0 || placeholderSlotCount > 0) && (
                  <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1 geodle-scroll">
                    {wrongGuessesNewestFirst.map((guess) => (
                      <GuessClueRow key={guess.guessOrder} guess={guess} />
                    ))}

                    {Array.from({ length: placeholderSlotCount }).map((_, idx) => {
                      const slotNumber = wrongGuessesNewestFirst.length + idx + 1;
                      return (
                        <div
                          key={`empty-slot-${slotNumber}`}
                          className="hidden sm:grid sm:grid-cols-7 gap-1.5"
                        >
                          <div className="px-3 py-2.5 rounded-md bg-white/[0.01] border border-white/[0.04] flex items-center text-[10px] font-mono text-slate-600 min-h-[52px]">
                            #{String(slotNumber).padStart(2, '0')}
                          </div>
                          {Array.from({ length: 6 }).map((__, cellIdx) => (
                            <div
                              key={cellIdx}
                              className="rounded-md bg-white/[0.008] border border-white/[0.035] min-h-[52px]"
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pinned Secret Country Row */}
                {session.secretCountry && (
                  <div className="pt-3 mt-2 border-t border-white/[0.08] space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400 px-1">
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
              </div>
            </section>

            {/* 4. Minimal Telemetry Legend */}
            <footer className="flex flex-wrap items-center justify-between gap-4 px-1 text-[11px] font-mono text-slate-500">
              <div className="flex items-center gap-5">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  <span className="text-slate-300">Exact</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  <span className="text-slate-300">Within ±25% / ±4°C / Region</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                  <span className="text-slate-400">Outside threshold</span>
                </span>
              </div>
              <span>Arrows indicate target delta (↑ higher · ↓ lower · ↗ bearing)</span>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
