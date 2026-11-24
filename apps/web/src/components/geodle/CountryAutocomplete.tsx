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
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-slate-700 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 transition"
        />

        {isOpen && filteredCountries.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl divide-y divide-slate-800/70"
          >
            {filteredCountries.map((country, idx) => (
              <li key={country.iso2} role="option" aria-selected={idx === highlightedIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chooseCountry(country)}
                  className={`w-full px-3.5 py-2 text-left text-sm flex items-center justify-between transition ${
                    idx === highlightedIndex
                      ? 'bg-emerald-500/20 text-white'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <CountryFlag iso2={country.iso2} />
                    <span className="font-medium">{country.nameEn}</span>
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
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
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Give Up</span>
        </button>
      )}
    </div>
  );
}
