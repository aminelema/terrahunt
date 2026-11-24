import type { TrueSizeCountryRef, TrueSizeRoundReveal } from '@terrahunt/shared';
import { Layers, SplitSquareHorizontal } from 'lucide-react';
import {
  areaRatioToLinearScale,
  computeStageCameraZoom,
  type NormalizedCountryShape,
} from '../../utils/equalAreaShape';

interface CountryShapeStageProps {
  baseCountry: TrueSizeCountryRef;
  targetCountry: TrueSizeCountryRef;
  baseShape: NormalizedCountryShape;
  targetShape: NormalizedCountryShape;
  liveGuessedRatio: number;
  reveal: TrueSizeRoundReveal | null;
  overlapMode: boolean;
  onToggleOverlap: () => void;
}

export function CountryShapeStage({
  baseCountry,
  targetCountry,
  baseShape,
  targetShape,
  liveGuessedRatio,
  reveal,
  overlapMode,
  onToggleOverlap,
}: CountryShapeStageProps) {
  const activeRatio = reveal ? reveal.trueRatio : liveGuessedRatio;
  const maxRatioInScene = reveal
    ? Math.max(reveal.trueRatio, reveal.guessedRatio)
    : liveGuessedRatio;

  const maxHalfSpanBudget = overlapMode ? 140 : 128;
  const cameraZoom = computeStageCameraZoom(
    baseShape,
    targetShape,
    maxRatioInScene,
    maxHalfSpanBudget,
  );

  const baseScale = cameraZoom;
  const targetScale = cameraZoom * areaRatioToLinearScale(activeRatio);
  const ghostGuessScale = reveal
    ? cameraZoom * areaRatioToLinearScale(reveal.guessedRatio)
    : null;

  const baseX = overlapMode ? 0 : -158;
  const targetX = overlapMode ? 0 : 158;

  return (
    <div className="relative rounded-2xl bg-navy-900 border border-slate-800 overflow-hidden shadow-xl">
      {/* Top country badges + Overlap switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-400 inline-block shadow shadow-sky-400/50" />
            <span className="text-lg leading-none">{baseCountry.flagEmoji}</span>
            <span className="font-semibold text-white">{baseCountry.nameEn}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
              Reference (1.00×)
            </span>
          </div>

          <span className="text-slate-600 font-bold">vs</span>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow shadow-amber-400/50" />
            <span className="text-lg leading-none">{targetCountry.flagEmoji}</span>
            <span className="font-semibold text-white">{targetCountry.nameEn}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {reveal ? `True: ${reveal.trueRatio.toFixed(2)}×` : `Guess: ${liveGuessedRatio.toFixed(2)}×`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleOverlap}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            overlapMode
              ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
        >
          {overlapMode ? (
            <>
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span>Side-by-Side View</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5" />
              <span>Stack & Overlap</span>
            </>
          )}
        </button>
      </div>

      {/* Equal-area SVG viewport */}
      <svg
        viewBox="-330 -175 660 350"
        className="w-full h-[240px] sm:h-[275px] block select-none"
        role="img"
        aria-label={`Equal-area comparison between ${baseCountry.nameEn} and ${targetCountry.nameEn}`}
      >
        <defs>
          <pattern
            id="carto-grid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="rgba(148, 163, 184, 0.07)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect x="-330" y="-175" width="660" height="350" fill="url(#carto-grid)" />

        {/* Subtle reference rings */}
        {!overlapMode ? (
          <>
            <circle
              cx={-158}
              cy={0}
              r={95}
              fill="none"
              stroke="rgba(56, 189, 248, 0.12)"
              strokeDasharray="4 4"
            />
            <circle
              cx={158}
              cy={0}
              r={95}
              fill="none"
              stroke="rgba(245, 158, 11, 0.12)"
              strokeDasharray="4 4"
            />
            <line
              x1={0}
              y1={-150}
              x2={0}
              y2={150}
              stroke="rgba(148, 163, 184, 0.12)"
              strokeDasharray="4 6"
            />
          </>
        ) : (
          <circle
            cx={0}
            cy={0}
            r={120}
            fill="none"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeDasharray="4 4"
          />
        )}

        {/* Base Country (Reference) */}
        <g
          transform={`translate(${baseX}, 0) scale(${baseScale})`}
          style={{
            transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <path
            d={baseShape.pathD}
            fill="rgba(56, 189, 248, 0.42)"
            stroke="#38BDF8"
            strokeWidth={2 / baseScale}
            strokeLinejoin="round"
          />
        </g>

        {/* Ghost outline of player's guess after reveal */}
        {reveal && ghostGuessScale !== null && (
          <g
            transform={`translate(${targetX}, 0) scale(${ghostGuessScale})`}
            style={{
              transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <path
              d={targetShape.pathD}
              fill="none"
              stroke="rgba(248, 250, 252, 0.65)"
              strokeWidth={1.8 / ghostGuessScale}
              strokeDasharray={`${5 / ghostGuessScale} ${4 / ghostGuessScale}`}
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Resizable Target Country */}
        <g
          transform={`translate(${targetX}, 0) scale(${targetScale})`}
          style={{
            transition: reveal
              ? 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'transform 60ms linear',
          }}
        >
          <path
            d={targetShape.pathD}
            fill={reveal ? 'rgba(34, 197, 94, 0.48)' : 'rgba(245, 158, 11, 0.48)'}
            stroke={reveal ? '#4ADE80' : '#FBBF24'}
            strokeWidth={2.2 / targetScale}
            strokeLinejoin="round"
          />
        </g>

        {/* Stage captions */}
        {!overlapMode && (
          <>
            <text
              x={-158}
              y={154}
              textAnchor="middle"
              className="fill-slate-400 text-[12px] font-medium"
            >
              {baseCountry.nameEn}
              {reveal ? ` · ${Math.round(reveal.baseAreaKm2).toLocaleString('en-US')} km²` : ''}
            </text>
            <text
              x={158}
              y={154}
              textAnchor="middle"
              className="fill-slate-300 text-[12px] font-medium"
            >
              {targetCountry.nameEn}
              {reveal ? ` · ${Math.round(reveal.targetAreaKm2).toLocaleString('en-US')} km²` : ''}
            </text>
          </>
        )}
      </svg>

      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
        <span>Equal-Area Azimuthal Projection (zero Mercator distortion)</span>
        {reveal && (
          <span className="text-slate-300">
            Dashed white outline = your guess ({reveal.guessedRatio.toFixed(2)}×)
          </span>
        )}
      </div>
    </div>
  );
}
