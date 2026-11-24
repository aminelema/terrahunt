import { ArrowLeft, Compass, Route } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComingSoonPageProps {
  title: string;
  milestone: string;
  description: string;
  modeType: 'georoute' | 'terrahunt';
}

export function ComingSoonPage({
  title,
  milestone,
  description,
  modeType,
}: ComingSoonPageProps) {
  const Icon = modeType === 'georoute' ? Route : Compass;
  return (
    <main className="max-w-3xl mx-auto px-4 py-14">
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-8 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto">
          <Icon className="w-7 h-7 text-sky-400" />
        </div>
        <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-sky-300">
          Scheduled Next · {milestone}
        </span>
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        <p className="text-slate-300 max-w-lg mx-auto text-sm leading-relaxed">{description}</p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Playable TrueSize Duel</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
