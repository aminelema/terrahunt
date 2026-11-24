import { Clock, Globe2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Calculates HH:MM:SS remaining until 00:00 in German time (Europe/Berlin). */
function getCountdownToBerlinMidnight(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const second = Number(parts.find((p) => p.type === 'second')?.value ?? 0);

  const remaining = Math.max(0, 86_400 - (hour * 3600 + minute * 60 + second));
  const hh = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function Navbar() {
  const [countdown, setCountdown] = useState(() => getCountdownToBerlinMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownToBerlinMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-slate-800/80 bg-navy-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold tracking-tight text-lg text-white">Geodle</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 hidden sm:inline">Next Daily (00:00 DE):</span>
          <span className="font-mono font-bold text-white">{countdown}</span>
        </div>
      </div>
    </header>
  );
}
