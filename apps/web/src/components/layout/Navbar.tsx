import { Globe2 } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-slate-800/80 bg-navy-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold tracking-tight text-lg text-white">Geodle</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
            Country Deduction
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Exact
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Close
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" /> Wrong
          </span>
        </div>
      </div>
    </header>
  );
}
