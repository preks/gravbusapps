export function getReportedEnvironmentFromUrl(rawUrl?: string | null): string | undefined {
  const value = String(rawUrl || '').trim()
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.hostname.toLowerCase() || undefined
  } catch {
    return undefined
  }
}
