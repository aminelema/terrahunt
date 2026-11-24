import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CountryAutocomplete } from './CountryAutocomplete';

const SAMPLE_COUNTRIES = [
  {
    iso2: 'AT',
    nameEn: 'Austria',
    flagEmoji: '🇦🇹',
    region: 'EUROPE' as const,
    aliases: ['Österreich', 'Republic of Austria'],
  },
  {
    iso2: 'DE',
    nameEn: 'Germany',
    flagEmoji: '🇩🇪',
    region: 'EUROPE' as const,
    aliases: ['Deutschland'],
  },
];

describe('CountryAutocomplete', () => {
  it('matches German aliases without umlauts ("osterreich" -> Austria) and submits on Enter', () => {
    const onSelectCountry = vi.fn();
    const onGiveUp = vi.fn();

    render(
      <CountryAutocomplete
        countries={SAMPLE_COUNTRIES}
        submitting={false}
        canGiveUp={true}
        onSelectCountry={onSelectCountry}
        onGiveUp={onGiveUp}
      />,
    );

    const input = screen.getByPlaceholderText(/Type a country name/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'osterreich' } });

    expect(screen.getByText('Austria')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectCountry).toHaveBeenCalledWith('AT');
  });
});
