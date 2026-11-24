import type {
  CountriesCatalogResponse,
  SubmitTrueSizeGuessResponse,
  TrueSizeMode,
  TrueSizeSession,
} from '@terrahunt/shared';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'TerraHunt',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // ignore non-json body
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

export const apiClient = {
  getCountries(): Promise<CountriesCatalogResponse> {
    return requestJson<CountriesCatalogResponse>('/countries', { method: 'GET' });
  },

  startTrueSizeSession(mode: TrueSizeMode): Promise<TrueSizeSession> {
    return requestJson<TrueSizeSession>('/games/truesize', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  getTrueSizeSession(sessionId: string): Promise<TrueSizeSession> {
    return requestJson<TrueSizeSession>(`/games/truesize/${sessionId}`, {
      method: 'GET',
    });
  },

  submitTrueSizeGuess(
    sessionId: string,
    roundNumber: number,
    guessedRatio: number,
  ): Promise<SubmitTrueSizeGuessResponse> {
    return requestJson<SubmitTrueSizeGuessResponse>(`/games/truesize/${sessionId}/guess`, {
      method: 'POST',
      body: JSON.stringify({ roundNumber, guessedRatio }),
    });
  },
};
