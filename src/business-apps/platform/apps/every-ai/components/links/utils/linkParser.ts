/**
 * Utilities for parsing and decoding entity protocol URLs.
 */
export interface LinkFragmentMetadata {
  /** Alternate entity ID for redirect resolution */
  alternateId?: string
}

/**
 * Result of parsing an entity protocol URL.
 */
export interface ParsedEntityUrl {
  /** The protocol/entity type (e.g., "employee_asset") */
  protocol: string
  /** The entity ID */
  id: string
  /** Raw fragment string including # prefix, or null */
  fragment: string | null
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse a custom protocol URL into its components.
 * Supports: `protocol://uuid` and `protocol://uuid#fragmentbase64encodedjson`
 *
 * @param url - The URL to parse (e.g., "employee_asset://uuid#base64data")
 * @returns Parsed URL components or null if invalid
 */
export function parseEntityUrl(url: string): ParsedEntityUrl | null {
  if (!url) return null

  const match = url.match(/^([a-zA-Z0-9_]+):\/\/([^#]+)(#.*)?$/i)
  if (!match) return null

  return {
    protocol: match[1].toLowerCase(),
    id: (match[2] || '').trim(),
    fragment: match[3] || null
  }
}

// ============================================================================
// Fragment Decoding
// ============================================================================

/**
 * Decode a base64-encoded JSON fragment from a URL.
 * The fragment may contain metadata like alternateId for redirect handling.
 *
 * @param fragment - Fragment string with or without # prefix (e.g., "#eyJhbHRlcm5hdGVJZCI6IjEyMyJ9")
 * @returns Decoded metadata or null if invalid/empty
 */
export function decodeUrlFragment(fragment: string | null): LinkFragmentMetadata | null {
  if (!fragment) return null

  // Remove # prefix if present
  const encoded = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!encoded) return null

  // Convert URL-safe base64 to standard base64
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')

  try {
    const json = atob(padded)
    const parsed = JSON.parse(json)

    if (!parsed || typeof parsed !== 'object') return null

    return {
      alternateId: typeof parsed.alternateId === 'string' ? parsed.alternateId : undefined
    }
  } catch {
    return null
  }
}
