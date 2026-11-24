interface CountryFlagProps {
  iso2: string;
  className?: string;
}

/**
 * Renders an SVG flag image instead of Unicode flag emojis, because Windows and Linux
 * system fonts render flag emojis as plain two-letter ISO codes (e.g. "DE", "JP").
 */
export function CountryFlag({ iso2, className = 'w-6 h-4' }: CountryFlagProps) {
  return (
    <img
      src={`https://flagcdn.com/${iso2.toLowerCase()}.svg`}
      alt={`${iso2} flag`}
      loading="lazy"
      className={`${className} object-cover rounded-[3px] shadow-sm border border-white/15 shrink-0`}
    />
  );
}
