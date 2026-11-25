import { normalizeSearchText, type CountryOption } from '@terrahunt/shared';
import { Flag, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { CountryFlag } from './CountryFlag';

interface CountryAutocompleteProps {
  countries: CountryOption[];
  submitting: boolean;
  canGiveUp: boolean;
  onSelectCountry: (iso2: string) => void;
  onGiveUp: () => void;
}

/**
 * Searchable Country Dropdown (English & German names + ArrowUp/Down/Enter keyboard nav).
 */
export function CountryAutocomplete({
  countries,
  submitting,
  canGiveUp,
  onSelectCountry,
  onGiveUp,
}: CountryAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return countries.slice(0, 10);
    }

    const startsWith: CountryOption[] = [];
    const contains: CountryOption[] = [];

    for (const country of countries) {
      const normName = normalizeSearchText(country.nameEn);
      const normAliases = country.aliases.map(normalizeSearchText);

      if (
        normName.startsWith(normalizedQuery) ||
        normAliases.some((a) => a.startsWith(normalizedQuery))
      ) {
        startsWith.push(country);
      } else if (
        normName.includes(normalizedQuery) ||
        normAliases.some((a) => a.includes(normalizedQuery))
      ) {
        contains.push(country);
      }
    }

    return [...startsWith, ...contains].slice(0, 10);
  }, [countries, query]);

  const chooseCountry = (country: CountryOption) => {
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
    onSelectCountry(country.iso2);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        filteredCountries.length === 0 ? 0 : (prev + 1) % filteredCountries.length,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        filteredCountries.length === 0
          ? 0
          : (prev - 1 + filteredCountries.length) % filteredCountries.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = filteredCountries[highlightedIndex];
      if (picked && !submitting) {
        chooseCountry(picked);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1 group">
        <Search className="w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
        <input
          type="text"
          value={query}
          disabled={submitting}
          placeholder="Type a country name (English or German)..."
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0A0D15]/90 border border-white/[0.09] backdrop-blur-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/[0.25] transition"
        />

        {isOpen && filteredCountries.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-lg bg-[#0A0D15]/98 backdrop-blur-2xl border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.9)] divide-y divide-white/[0.04] p-1"
          >
            {filteredCountries.map((country, idx) => (
              <li key={country.iso2} role="option" aria-selected={idx === highlightedIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chooseCountry(country)}
                  className={`w-full px-3 py-2 rounded-md text-left text-xs flex items-center justify-between transition ${
                    idx === highlightedIndex
                      ? 'bg-white/[0.08] text-white'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <CountryFlag iso2={country.iso2} className="w-5 h-3.5" />
                    <span className="font-medium">{country.nameEn}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                    {country.region}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canGiveUp && (
        <button
          type="button"
          disabled={submitting}
          onClick={onGiveUp}
          className="px-4 py-2.5 rounded-lg bg-[#0A0D15]/90 hover:bg-rose-500/10 border border-white/[0.09] hover:border-rose-400/35 text-slate-400 hover:text-rose-200 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition shrink-0"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Give Up</span>
        </button>
      )}
    </div>
  );
}
