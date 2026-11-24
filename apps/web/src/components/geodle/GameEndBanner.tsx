import { formatGeodleShareText, type GeodleSession } from '@terrahunt/shared';
import { Check, Copy, RotateCcw, Trophy } from 'lucide-react';
import { useState } from 'react';
import { formatCompactArea, formatCompactPopulation } from './GuessClueRow';

interface GameEndBannerProps {
  session: GeodleSession;
  onPlayFreeplay: () => void;
}

export function GameEndBanner({ session, onPlayFreeplay }: GameEndBannerProps) {
  const [copied, setCopied] = useState(false);
  const secret = session.secretCountry;
  if (!secret) return null;

  const won = session.status === 'WON';

  const handleCopyShare = async () => {
    const shareText = formatGeodleShareText({
      mode: session.mode,
      dailyChallengeNumber: session.dailyChallengeNumber,
      won,
      guesses: session.guesses,
    });
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl p-5 border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
        won
          ? 'bg-emerald-950/35 border-emerald-500/40'
          : 'bg-navy-900 border-rose-500/40'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {won && <Trophy className="w-5 h-5 text-amber-400" />}
          <h2 className="text-lg font-extrabold text-white">
            {won
              ? `Solved in ${session.guessCount} ${session.guessCount === 1 ? 'try' : 'tries'}!`
              : 'Secret Country Revealed'}
          </h2>
        </div>

        <p className="text-base text-slate-200">
          The secret country was{' '}
          <strong className="text-white">
            {secret.flagEmoji} {secret.nameEn}
          </strong>
          {secret.capital ? ` (Capital: ${secret.capital})` : ''}
        </p>

        <p className="text-xs font-mono text-slate-400">
          {secret.subregion} · Pop {formatCompactPopulation(secret.population)} ·{' '}
          {formatCompactArea(secret.areaKm2)} ·{' '}
          {secret.isLandlocked ? 'Landlocked' : 'Has Coast'} · {secret.avgTempC.toFixed(1)}°C
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {session.guesses.length > 0 && (
          <button
            type="button"
            onClick={() => void handleCopyShare()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? 'Copied!' : 'Share Grid'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onPlayFreeplay}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>New Free Play</span>
        </button>
      </div>
    </div>
  );
}
