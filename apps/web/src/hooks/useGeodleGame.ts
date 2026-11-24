import type { CountryOption, GameMode, GeodleSession } from '@terrahunt/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

/**
 * Custom Hook — Geodle Game State & API Actions
 *
 * Keeps all network requests and state updates cleanly separated from UI components.
 */
export function useGeodleGame() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [mode, setMode] = useState<GameMode>('DAILY');
  const [session, setSession] = useState<GeodleSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load the 197 searchable countries + start/resume today's Daily game when page opens
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [catalogRes, dailySession] = await Promise.all([
          apiClient.getCountries(),
          apiClient.startSession('DAILY'),
        ]);
        if (!cancelled) {
          setCountries(catalogRes.countries);
          setSession(dailySession);
          setMode('DAILY');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Geodle.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Switch between today's shared Daily challenge and a fresh Free Play round
  const switchOrStartMode = useCallback(async (targetMode: GameMode) => {
    setLoading(true);
    setError(null);
    try {
      const nextSession = await apiClient.startSession(targetMode);
      setSession(nextSession);
      setMode(targetMode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit a country guess by ISO2 code (e.g. "DE")
  const submitGuess = async (countryIso2: string) => {
    if (!session || session.status !== 'IN_PROGRESS' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiClient.submitGuess(session.sessionId, countryIso2);
      setSession(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit guess.');
    } finally {
      setSubmitting(false);
    }
  };

  // End the current game early and reveal the secret country
  const giveUp = async () => {
    if (!session || session.status !== 'IN_PROGRESS' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiClient.giveUp(session.sessionId);
      setSession(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to give up.');
    } finally {
      setSubmitting(false);
    }
  };

  // Hide countries the player already guessed in this session from the dropdown
  const availableCountries = useMemo(() => {
    const guessedSet = new Set(session?.guesses.map((g) => g.countryIso2) ?? []);
    return countries.filter((c) => !guessedSet.has(c.iso2));
  }, [countries, session]);

  return {
    mode,
    session,
    availableCountries,
    loading,
    submitting,
    error,
    switchOrStartMode,
    submitGuess,
    giveUp,
  };
}
