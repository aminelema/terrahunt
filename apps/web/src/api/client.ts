import type {
  CountriesCatalogResponse,
  GameMode,
  GeodleSession,
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
    credentials: 'include', // Automatically sends/receives our httpOnly guest cookie
    headers: {
      'Content-Type': 'application/json',
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
      // Ignore non-JSON error responses
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

export const apiClient = {
  getCountries(): Promise<CountriesCatalogResponse> {
    return requestJson<CountriesCatalogResponse>('/countries', { method: 'GET' });
  },

  startSession(mode: GameMode): Promise<GeodleSession> {
    return requestJson<GeodleSession>('/games/geodle', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  submitGuess(sessionId: string, countryIso2: string): Promise<GeodleSession> {
    return requestJson<GeodleSession>(`/games/geodle/${sessionId}/guess`, {
      method: 'POST',
      body: JSON.stringify({ countryIso2 }),
    });
  },

  giveUp(sessionId: string): Promise<GeodleSession> {
    return requestJson<GeodleSession>(`/games/geodle/${sessionId}/give-up`, {
      method: 'POST',
    });
  },
};
