import type { GeodleGuessRow } from '@terrahunt/shared';
import { describe, expect, it } from 'vitest';
import { deriveDetectiveNotes } from './ClueSummaryBar';

describe('deriveDetectiveNotes', () => {
  it('narrows population, area, temperature, and landlocked bounds across guesses', () => {
    const sampleGuesses: GeodleGuessRow[] = [
      {
        guessOrder: 1,
        countryIso2: 'AT',
        countryName: 'Austria',
        flagEmoji: '🇦🇹',
        isCorrect: false,
        createdAt: new Date().toISOString(),
        clues: {
          continent: { status: 'WRONG', region: 'EUROPE', subregion: 'Central Europe' },
          population: { status: 'CLOSE', trend: 'HIGHER', value: 8_800_000 },
          areaKm2: { status: 'CLOSE', trend: 'HIGHER', value: 83_871 },
          landlocked: { status: 'MATCH', value: true },
          avgTempC: { status: 'WRONG', trend: 'HIGHER', value: 7.4 },
          neighborOrDirection: { status: 'WRONG', isNeighbor: false, direction: 'E' },
        },
      },
      {
        guessOrder: 2,
        countryIso2: 'JP',
        countryName: 'Japan',
        flagEmoji: '🇯🇵',
        isCorrect: false,
        createdAt: new Date().toISOString(),
        clues: {
          continent: { status: 'CLOSE', region: 'ASIA', subregion: 'Eastern Asia' },
          population: { status: 'WRONG', trend: 'LOWER', value: 126_500_000 },
          areaKm2: { status: 'WRONG', trend: 'LOWER', value: 377_930 },
          landlocked: { status: 'WRONG', value: false },
          avgTempC: { status: 'MATCH', trend: 'HIGHER', value: 11.8 },
          neighborOrDirection: { status: 'WRONG', isNeighbor: false, direction: 'NW' },
        },
      },
    ];

    const notes = deriveDetectiveNotes(sampleGuesses);
    expect(notes.confirmedRegion).toBe('ASIA');
    expect(notes.minPop).toBe(8_800_000);
    expect(notes.maxPop).toBe(126_500_000);
    expect(notes.minArea).toBe(83_871);
    expect(notes.maxArea).toBe(377_930);
    expect(notes.landlocked).toBe(true);
    expect(notes.minTemp).toBe(11.8);
  });
});
