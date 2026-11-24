import { Calendar, Sparkles } from 'lucide-react';
import { CountryAutocomplete } from '../components/geodle/CountryAutocomplete';
import { GameEndBanner } from '../components/geodle/GameEndBanner';
import { GuessClueRow } from '../components/geodle/GuessClueRow';
import { useGeodleGame } from '../hooks/useGeodleGame';

const COLUMN_HEADERS = [
  'Country',
  'Continent',
  'Population',
  'Area',
  'Landlocked',
  'Avg Temp',
  'Neighbor / Dir',
];

/**
 * Main Geodle Page Orchestrator
 *
 * Separation of Concerns:
 * - `useGeodleGame()` manages API calls and session state.
 * - `CountryAutocomplete`, `GuessClueRow`, and `GameEndBanner` render plain props.
 */
export function GeodlePage() {
  const game = useGeodleGame();

  // Display newest guesses at the top right below the search bar
  const newestFirstGuesses = game.session ? [...game.session.guesses].reverse() : [];

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      {/* 1. Top Game Mode & Counter Card */}
      <section className="rounded-2xl bg-navy-800 border border-slate-700/70 px-4 py-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Guess the Country</h1>
            {game.session?.mode === 'DAILY' && game.session.dailyChallengeNumber && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Daily #{game.session.dailyChallengeNumber}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Type any country to reveal 6 attribute clues. Arrows point toward the secret country!
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              <span>New Free Play</span>
            </button>
          </div>

          {game.session && (
            <div className="bg-navy-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Guesses
              </div>
              <div className="text-sm font-mono font-bold text-white">
                {game.session.guessCount}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Error Banner */}
      {game.error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-4 py-3 text-sm text-rose-200">
          {game.error}
        </div>
      )}

      {/* 3. Search Bar OR End-of-Game Reveal Banner */}
      {game.loading ? (
        <div className="rounded-2xl bg-navy-900 border border-slate-800 h-44 flex items-center justify-center text-slate-400 text-sm">
          Loading Geodle session...
        </div>
      ) : game.session ? (
        <>
          {game.session.status === 'IN_PROGRESS' ? (
            <CountryAutocomplete
              countries={game.availableCountries}
              submitting={game.submitting}
              canGiveUp={game.session.guessCount > 0}
              onSelectCountry={(iso2) => void game.submitGuess(iso2)}
              onGiveUp={() => void game.giveUp()}
            />
          ) : (
            <GameEndBanner
              session={game.session}
              onPlayFreeplay={() => void game.switchOrStartMode('FREEPLAY')}
            />
          )}

          {/* 4. Attribute Comparison Table */}
          {newestFirstGuesses.length === 0 ? (
            <div className="rounded-2xl bg-navy-900/60 border border-slate-800/80 p-8 text-center text-sm text-slate-400">
              Pick your first country above (e.g. <strong className="text-slate-200">Germany</strong>
              , <strong className="text-slate-200">Brazil</strong>, or{' '}
              <strong className="text-slate-200">Japan</strong>) to unlock clues!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid sm:grid-cols-7 gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                {COLUMN_HEADERS.map((col) => (
                  <div key={col}>{col}</div>
                ))}
              </div>

              <div className="space-y-2">
                {newestFirstGuesses.map((guess) => (
                  <GuessClueRow key={guess.guessOrder} guess={guess} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
