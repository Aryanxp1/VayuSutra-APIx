import { isAxiosError } from 'axios';

/**
 * Convert an unknown thrown value (axios error, validation error, network failure)
 * into a human-readable message for the UI.
 */
export function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined;
    const detail = data?.detail;

    if (Array.isArray(detail)) {
      // FastAPI / Pydantic 422 validation detail entries.
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const entry = item as { loc?: unknown[]; msg?: string };
            const loc = Array.isArray(entry.loc) ? entry.loc.join('.') : '';
            const msg = typeof entry.msg === 'string' ? entry.msg : JSON.stringify(item);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return JSON.stringify(item);
        })
        .join(' · ');
    }

    if (typeof detail === 'string') return detail;

    if (error.response) {
      return `Request failed with status ${error.response.status}.`;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'The request timed out. The backend may be busy or unreachable.';
    }
    return error.message || 'Network error.';
  }

  if (error instanceof Error) return error.message;
  return 'Unexpected error. Please try again.';
}