import { ApiErrorResponse, ApiSuccessResponse } from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
}

let refreshInFlight: Promise<boolean> | null = null;

async function attemptSessionRefresh(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const csrfToken = getCookie('ats_csrf_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAuthRefresh?: boolean } = {},
): Promise<T> {
  const { skipAuthRefresh = false, headers: customHeaders, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();

  const headers = new Headers(customHeaders);
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (!headers.has('Content-Type') && rest.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookie('ats_csrf_token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    method,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/register') &&
    !endpoint.startsWith('/auth/refresh')
  ) {
    const refreshed = await attemptSessionRefresh();
    if (refreshed) {
      return apiRequest<T>(endpoint, { ...options, skipAuthRefresh: true });
    }
  }

  const json = (await response.json().catch(() => null)) as
    | ApiSuccessResponse<T>
    | ApiErrorResponse
    | null;

  if (!response.ok || !json || !json.success) {
    const errPayload = json as ApiErrorResponse | null;
    throw new ApiClientError(
      errPayload?.message || `Request failed with status ${response.status}`,
      response.status,
      errPayload?.error?.code || 'REQUEST_FAILED',
      errPayload?.error?.details,
    );
  }

  return json.data;
}

