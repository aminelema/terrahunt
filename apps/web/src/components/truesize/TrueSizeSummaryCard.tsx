import {
  formatTrueSizeShareText,
  getTrueSizeRoundRating,
  type TrueSizeSession,
} from '@terrahunt/shared';
import { Check, Copy, RotateCcw, Trophy } from 'lucide-react';
import { useState } from 'react';

interface TrueSizeSummaryCardProps {
  session: TrueSizeSession;
  onPlayFreeplay: () => void;
}

export function TrueSizeSummaryCard({
  session,
  onPlayFreeplay,
}: TrueSizeSummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyShare = async () => {
    const text = formatTrueSizeShareText({
      mode: session.mode,
      dailyChallengeNumber: session.dailyChallengeNumber,
      totalScore: session.totalScore,
      roundScores: session.rounds.map((r) => r.reveal?.score ?? 0),
    });
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="rounded-2xl bg-navy-900 border border-slate-800 p-6 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {session.mode === 'DAILY'
                ? `Daily TrueSize #${session.dailyChallengeNumber ?? ''} Complete!`
                : '5-Round TrueSize Complete!'}
            </h2>
            <p className="text-sm text-slate-400">
              Total Accuracy Score:{' '}
              <span className="text-amber-300 font-bold font-mono text-base">
                {session.totalScore.toLocaleString('en-US')} / 5,000
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyShare}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 border border-slate-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Share Score'}</span>
          </button>

          <button
            type="button"
            onClick={onPlayFreeplay}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Play Free Play</span>
          </button>
        </div>
      </div>

      {/* Round-by-round breakdown */}
      <div className="space-y-2.5">
        {session.rounds.map((r) => {
          const rev = r.reveal;
          const rating = getTrueSizeRoundRating(rev?.score ?? 0);
          return (
            <div
              key={r.roundNumber}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
            >
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-xs font-mono text-slate-500 w-6">R{r.roundNumber}</span>
                <span>
                  {r.baseCountry.flagEmoji} <strong className="text-slate-200">{r.baseCountry.nameEn}</strong>
                </span>
                <span className="text-slate-600">→</span>
                <span>
                  {r.targetCountry.flagEmoji}{' '}
                  <strong className="text-white">{r.targetCountry.nameEn}</strong>
                </span>
              </div>

              {rev && (
                <div className="flex items-center gap-4 text-xs sm:text-sm font-mono">
                  <span className="text-slate-400">
                    Guessed <strong className="text-slate-200">{rev.guessedRatio.toFixed(2)}×</strong>
                  </span>
                  <span className="text-slate-400">
                    True <strong className="text-emerald-300">{rev.trueRatio.toFixed(2)}×</strong>
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-lg font-bold text-white"
                    style={{ backgroundColor: rating.badgeColor }}
                  >
                    +{rev.score}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
