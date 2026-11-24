import { Check, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  formatRelativeComparison,
  ratioToSliderPosition,
  sliderPositionToRatio,
} from '../../utils/equalAreaShape';

interface ScaleSliderControlsProps {
  baseName: string;
  targetName: string;
  guessedRatio: number;
  onChangeRatio: (nextRatio: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}

const PRESET_RATIOS = [0.2, 0.5, 1.0, 2.0, 5.0];

export function ScaleSliderControls({
  baseName,
  targetName,
  guessedRatio,
  onChangeRatio,
  onSubmit,
  submitting,
}: ScaleSliderControlsProps) {
  const sliderPos = ratioToSliderPosition(guessedRatio);

  const nudgeSlider = (deltaPos: number) => {
    const nextPos = Math.max(-1, Math.min(1, sliderPos + deltaPos));
    onChangeRatio(sliderPositionToRatio(nextPos));
  };

  return (
    <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Drag Slider to True Real-World Size
          </p>
          <p className="text-base sm:text-lg font-semibold text-white mt-0.5">
            {formatRelativeComparison(guessedRatio, baseName, targetName)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold text-lg">
            {guessedRatio.toFixed(2)}×
          </span>
          <button
            type="button"
            onClick={() => onChangeRatio(1.0)}
            title="Reset to 1.00× equal size"
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logarithmic Range Slider */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => nudgeSlider(-0.04)}
          aria-label="Shrink country"
          className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition shrink-0"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.005}
            value={sliderPos}
            onChange={(e) => onChangeRatio(sliderPositionToRatio(Number(e.target.value)))}
            aria-label={`Relative area ratio of ${targetName} compared to ${baseName}`}
            className="w-full truesize-slider"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1 px-0.5">
            <span>0.10× (10× smaller)</span>
            <span className="text-slate-300 font-semibold">1.00× (Same Size)</span>
            <span>10.0× (10× larger)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => nudgeSlider(0.04)}
          aria-label="Enlarge country"
          className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Presets + Lock In */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">Quick scale:</span>
          {PRESET_RATIOS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeRatio(preset)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition ${
                Math.abs(guessedRatio - preset) < 0.02
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {preset}×
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
        >
          <Check className="w-4 h-4 stroke-[2.8]" />
          <span>{submitting ? 'Locking in...' : 'Lock In True Size'}</span>
        </button>
      </div>
    </div>
  );
}
