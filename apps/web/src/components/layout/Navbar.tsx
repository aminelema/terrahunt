import { Compass, Globe2, Layers, Route } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'TrueSize',
      badge: 'Live',
      active: location.pathname === '/' || location.pathname.startsWith('/truesize'),
      icon: Layers,
      live: true,
    },
    {
      to: '/georoute',
      label: 'GeoRoute',
      badge: 'M2',
      active: location.pathname.startsWith('/georoute'),
      icon: Route,
      live: false,
    },
    {
      to: '/terrahunt',
      label: 'TerraHunt',
      badge: 'M3',
      active: location.pathname.startsWith('/terrahunt'),
      icon: Compass,
      live: false,
    },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-navy-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-amber-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Globe2 className="w-5 h-5 text-slate-950 stroke-[2.4]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg text-white">TerraHunt</span>
            <span className="ml-1.5 text-xs font-medium uppercase tracking-wider text-sky-400">
              Arcade
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  item.active
                    ? 'bg-navy-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {!item.live && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
