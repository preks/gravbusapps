const INTERNAL_ERROR_MARKERS: readonly string[] = [
  "client error '400",
  "client error '401",
  "client error '403",
  "client error '404",
  "client error '500",
  "client error '502",
  "client error '503",
  "client error '504",
  'for more information check: https://developer.mozilla.org/',
  'flow engine http error',
  'functions service call failed',
  'promptodm lookup failed',
  'traceback (most recent call last)',
  'exception:',
  'error:'
]

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const EMAIL_RE = /[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,64}/
const STACK_FRAME_RE = /(?:^|\n)[ \t]{1,8}at[ \t]{1,4}\S{1,256}/

/**
 * Returns true when the string clearly contains raw internals (JSON payload,
 * UUID, email, stack frame, internal error blob, or anything implausibly long
 * for a status line). Used to keep tool payloads, IDs, and errors out of the
 * fading status pill, activity ticker, and agent thinking stream.
 */
export const looksLikeRawPayload = (content: string, maxLen = 200): boolean => {
  if (!content) return false
  const trimmed = content.trim()
  if (!trimmed) return false
  if (trimmed.length > maxLen) return true
  const first = trimmed.charAt(0)
  if (first === '{' || first === '[' || first === '<') return true
  if (UUID_RE.test(trimmed)) return true
  if (EMAIL_RE.test(trimmed)) return true
  if (STACK_FRAME_RE.test(trimmed)) return true
  const normalized = trimmed.toLowerCase()
  for (const marker of INTERNAL_ERROR_MARKERS) {
    if (normalized.includes(marker)) return true
  }
  return false
}

/** Blocks recognised HTTP / internal error blobs in response_stream snapshots. */
export const looksLikeInternalErrorLeak = (content: string): boolean => {
  if (!content) return false
  const normalized = content.toLowerCase()
  for (const marker of INTERNAL_ERROR_MARKERS) {
    if (normalized.includes(marker)) return true
  }
  return false
}

/** True when streamed text is (partial) chart/dashboard JSON, not user-facing prose. */
export const looksLikeDashboardJson = (content: string): boolean => {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('{')) return false

  // Early stream tokens before chartType/sections arrive (e.g. "{", '{"', '{"title"').
  if (trimmed.length <= 12) return true

  const markers = [
    '"sections"',
    '"chartType"',
    '"chart_type"',
    '"chart-grid"',
    '"dataKeys"',
    '"chart":',
    '"kind"',
    '"content"'
  ]
  if (markers.some(marker => trimmed.includes(marker))) return true

  if (/^\{"title"\s*:\s*"/.test(trimmed)) return true

  // Incomplete JSON object prefix while the model streams a chart payload.
  if (trimmed.length < 160 && /^\{\s*"/.test(trimmed)) return true

  return false
}
