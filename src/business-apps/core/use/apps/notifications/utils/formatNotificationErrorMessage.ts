const REST_ERROR_PREFIX = /^REST request failed:\s*\d+\s*-\s*/i

/**
 * Returns a short, user-safe message from a notification API failure (no tokens or raw payloads).
 */
export function formatNotificationErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof Error)) {
    return fallbackMessage
  }

  const withoutPrefix = error.message.replace(REST_ERROR_PREFIX, '').trim()
  if (!withoutPrefix) {
    return fallbackMessage
  }

  return withoutPrefix
}
