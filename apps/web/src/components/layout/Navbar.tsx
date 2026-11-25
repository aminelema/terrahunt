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
    <header className="pt-3 px-4 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto h-12 px-4 rounded-xl glass-panel flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.12] flex items-center justify-center">
            <Globe2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
          </div>
          <span className="font-bold tracking-[0.12em] text-sm text-white">GEODLE</span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0A0D15]/80 border border-white/[0.08] text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <Clock className="w-3 h-3 text-slate-500 hidden sm:inline" />
          <span className="text-slate-500 font-mono hidden sm:inline">RESET 00:00 DE</span>
          <span className="font-mono font-semibold text-slate-200 tabular-nums">{countdown}</span>
        </div>
      </div>
    </header>
  );
}
