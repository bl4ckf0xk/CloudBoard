/**
 * lib/services/adapters/aws/awsClient.ts
 * HTTP Client wrapper for CloudBoard AWS API Gateway backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';

const TOKEN_KEY = 'cloudboard_cognito_id_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY); // Clean up any legacy storage
}

export interface ApiRequestOptions extends RequestInit {
  authToken?: string | null;
  timeoutMs?: number;
}

export async function awsFetch<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('[AWS Configuration Error] NEXT_PUBLIC_API_GATEWAY_URL is not defined in environment.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const token = options.authToken !== undefined ? options.authToken : getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const timeout = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken();
      }
      let errorDetail = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.message) errorDetail = errJson.message;
      } catch {
        // Ignore JSON parse errors for non-JSON error bodies
      }
      throw new Error(`[AWS API Error] ${errorDetail}`);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`[AWS API Error] Request timed out after ${timeout}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
