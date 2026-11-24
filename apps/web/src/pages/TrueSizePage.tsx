import {
  getTrueSizeRoundRating,
  TRUESIZE_ROUNDS_PER_GAME,
  type TrueSizeMode,
  type TrueSizeSession,
} from '@terrahunt/shared';
import { ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { CountryShapeStage } from '../components/truesize/CountryShapeStage';
import { ScaleSliderControls } from '../components/truesize/ScaleSliderControls';
import { TrueSizeSummaryCard } from '../components/truesize/TrueSizeSummaryCard';
import {
  buildNormalizedCountryShape,
  formatRelativeComparison,
  loadPlayableCountryFeatures,
  type NormalizedCountryShape,
} from '../utils/equalAreaShape';

export function TrueSizePage() {
  const [mode, setMode] = useState<TrueSizeMode>('DAILY');
  const [session, setSession] = useState<TrueSizeSession | null>(null);
  const [viewedRoundNum, setViewedRoundNum] = useState<number>(1);
  const [guessedRatio, setGuessedRatio] = useState<number>(1.0);
  const [overlapMode, setOverlapMode] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [shapesReady, setShapesReady] = useState<boolean>(false);
  const [featureMap, setFeatureMap] = useState<Awaited<
    ReturnType<typeof loadPlayableCountryFeatures>
  > | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayableCountryFeatures()
      .then((map) => {
        setFeatureMap(map);
        setShapesReady(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load world geometries.');
      });
  }, []);

  const loadSession = useCallback(async (targetMode: TrueSizeMode) => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiClient.startTrueSizeSession(targetMode);
      setSession(next);
      setMode(targetMode);
      setGuessedRatio(1.0);
      setOverlapMode(false);
      if (next.status === 'COMPLETED') {
        setViewedRoundNum(TRUESIZE_ROUNDS_PER_GAME);
        setShowSummary(true);
      } else {
        setViewedRoundNum(next.currentRound);
        setShowSummary(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start TrueSize session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession('DAILY');
  }, [loadSession]);

  const activeRound = useMemo(() => {
    if (!session) return null;
    return (
      session.rounds.find((r) => r.roundNumber === viewedRoundNum) ?? session.rounds[0] ?? null
    );
  }, [session, viewedRoundNum]);

  const { baseShape, targetShape } = useMemo((): {
    baseShape: NormalizedCountryShape | null;
    targetShape: NormalizedCountryShape | null;
  } => {
    if (!featureMap || !activeRound) {
      return { baseShape: null, targetShape: null };
    }
    const baseFeat = featureMap.get(activeRound.baseCountry.iso2);
    const targetFeat = featureMap.get(activeRound.targetCountry.iso2);
    if (!baseFeat || !targetFeat) {
      return { baseShape: null, targetShape: null };
    }
    return {
      baseShape: buildNormalizedCountryShape(
        baseFeat,
        activeRound.baseCountry.iso2,
        activeRound.baseCountry.labelLat,
        activeRound.baseCountry.labelLng,
      ),
      targetShape: buildNormalizedCountryShape(
        targetFeat,
        activeRound.targetCountry.iso2,
        activeRound.targetCountry.labelLat,
        activeRound.targetCountry.labelLng,
      ),
    };
  }, [featureMap, activeRound]);

  const handleLockInGuess = async () => {
    if (!session || !activeRound || activeRound.answered || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.submitTrueSizeGuess(
        session.sessionId,
        activeRound.roundNumber,
        guessedRatio,
      );
      setSession(result.session);
      // Automatically turn on overlap on reveal so the player sees the real size stack!
      setOverlapMode(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit guess.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceRound = () => {
    if (!session) return;
    if (viewedRoundNum < TRUESIZE_ROUNDS_PER_GAME) {
      setViewedRoundNum(viewedRoundNum + 1);
      setGuessedRatio(1.0);
      setOverlapMode(false);
    } else {
      setShowSummary(true);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-4 space-y-3.5">
      {/* Top Game HUD Card */}
      <section className="rounded-2xl bg-navy-800 border border-slate-700/70 px-4 py-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              TrueSize Duel
            </h1>
            {session?.mode === 'DAILY' && session.dailyChallengeNumber && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Daily #{session.dailyChallengeNumber}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Both countries start normalized to the same visual size. Scale the right country to its
            true real-world area!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-navy-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => void loadSession('DAILY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'DAILY'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => void loadSession('FREEPLAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'FREEPLAY'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Free Play</span>
            </button>
          </div>

          {/* Score & Round Pill */}
          {session && (
            <div className="flex items-center gap-3 bg-navy-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Round
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {viewedRoundNum} / {TRUESIZE_ROUNDS_PER_GAME}
                </div>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Score
                </div>
                <div className="text-sm font-mono font-bold text-amber-400">
                  {session.totalScore.toLocaleString('en-US')}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Round Progress Dots */}
      {session && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {session.rounds.map((r) => {
              const isCurrent = !showSummary && r.roundNumber === viewedRoundNum;
              const rating = r.reveal ? getTrueSizeRoundRating(r.reveal.score) : null;
              const canClick = r.answered || r.roundNumber === session.currentRound;
              return (
                <button
                  key={r.roundNumber}
                  type="button"
                  disabled={!canClick}
                  onClick={() => {
                    setShowSummary(false);
                    setViewedRoundNum(r.roundNumber);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                    isCurrent
                      ? 'bg-slate-800 text-white border-sky-400'
                      : r.answered
                        ? 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-slate-500'
                        : 'bg-slate-950/50 text-slate-600 border-slate-900 cursor-not-allowed'
                  }`}
                >
                  R{r.roundNumber} {rating ? `${rating.emoji} ${r.reveal!.score}` : ''}
                </button>
              );
            })}
          </div>

          {session.status === 'COMPLETED' && !showSummary && (
            <button
              type="button"
              onClick={() => setShowSummary(true)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
            >
              View Final Summary →
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading || !shapesReady ? (
        <div className="rounded-2xl bg-navy-900 border border-slate-800 h-[380px] flex items-center justify-center text-slate-400 text-sm">
          Loading equal-area country shapes...
        </div>
      ) : showSummary && session ? (
        <TrueSizeSummaryCard
          session={session}
          onPlayFreeplay={() => void loadSession('FREEPLAY')}
        />
      ) : activeRound && baseShape && targetShape ? (
        <>
          <CountryShapeStage
            baseCountry={activeRound.baseCountry}
            targetCountry={activeRound.targetCountry}
            baseShape={baseShape}
            targetShape={targetShape}
            liveGuessedRatio={guessedRatio}
            reveal={activeRound.reveal}
            overlapMode={overlapMode}
            onToggleOverlap={() => setOverlapMode((prev) => !prev)}
          />

          {!activeRound.answered ? (
            <ScaleSliderControls
              baseName={activeRound.baseCountry.nameEn}
              targetName={activeRound.targetCountry.nameEn}
              guessedRatio={guessedRatio}
              onChangeRatio={setGuessedRatio}
              onSubmit={() => void handleLockInGuess()}
              submitting={submitting}
            />
          ) : (
            activeRound.reveal && (
              <div className="rounded-2xl bg-navy-900 border border-emerald-500/30 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-extrabold text-white"
                      style={{
                        backgroundColor: getTrueSizeRoundRating(activeRound.reveal.score)
                          .badgeColor,
                      }}
                    >
                      +{activeRound.reveal.score} pts ·{' '}
                      {getTrueSizeRoundRating(activeRound.reveal.score).label}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Your guess: {activeRound.reveal.guessedRatio.toFixed(2)}× · True:{' '}
                      <strong className="text-emerald-300">
                        {activeRound.reveal.trueRatio.toFixed(2)}×
                      </strong>
                    </span>
                  </div>
                  <p className="text-base font-semibold text-white">
                    {formatRelativeComparison(
                      activeRound.reveal.trueRatio,
                      activeRound.baseCountry.nameEn,
                      activeRound.targetCountry.nameEn,
                    )}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {activeRound.baseCountry.flagEmoji} {activeRound.baseCountry.nameEn}:{' '}
                    {Math.round(activeRound.reveal.baseAreaKm2).toLocaleString('en-US')} km² ·{' '}
                    {activeRound.targetCountry.flagEmoji} {activeRound.targetCountry.nameEn}:{' '}
                    {Math.round(activeRound.reveal.targetAreaKm2).toLocaleString('en-US')} km²
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAdvanceRound}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <span>
                    {viewedRoundNum < TRUESIZE_ROUNDS_PER_GAME
                      ? `Next Country Pair (Round ${viewedRoundNum + 1})`
                      : 'View Final Score'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.6]" />
                </button>
              </div>
            )
          )}
        </>
      ) : null}
    </main>
  );
}
