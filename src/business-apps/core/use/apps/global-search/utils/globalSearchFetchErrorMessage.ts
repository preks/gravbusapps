/**
 * Browsers usually surface connection failures as a generic TypeError ("Failed to fetch").
 */
export function globalSearchFetchErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message
  if (
    message === 'Failed to fetch' ||
    message === 'Load failed' ||
    message.includes('NetworkError') ||
    message.toLowerCase().includes('network request failed')
  ) {
    return 'Cannot reach the search API. Start search-service (npm run start:dev, port 3000) or fix NEXT_PUBLIC_GLOBAL_SEARCH_API_URL. Optional: point the URL at this dev server origin with path /global-search/api/v1 to use the Vite proxy.'
  }

  return message
}
