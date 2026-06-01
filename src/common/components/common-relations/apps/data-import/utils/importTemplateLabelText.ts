/**
 * Linear-time string helpers for import template label cleanup (ReDoS-safe).
 */

const ASCII_WHITESPACE = new Set([' ', '\t', '\n', '\r', '\f', '\v'])

export const isAsciiWhitespaceChar = (char: string): boolean => char.length === 1 && ASCII_WHITESPACE.has(char)

export const trimAsciiWhitespace = (value: string): string => trimAsciiWhitespaceEnd(trimAsciiWhitespaceStart(value))

export const trimAsciiWhitespaceEnd = (value: string): string => {
  let end = value.length
  while (end > 0 && isAsciiWhitespaceChar(value[end - 1]!)) {
    end -= 1
  }
  return value.slice(0, end)
}

export const trimAsciiWhitespaceStart = (value: string): string => {
  let start = 0
  while (start < value.length && isAsciiWhitespaceChar(value[start]!)) {
    start += 1
  }
  return value.slice(start)
}

export const endsWithIgnoreCase = (value: string, suffix: string): boolean => {
  if (suffix.length === 0 || value.length < suffix.length) {
    return suffix.length === 0
  }
  const start = value.length - suffix.length
  return value.slice(start).toLowerCase() === suffix.toLowerCase()
}

export const startsWithIgnoreCase = (value: string, prefix: string): boolean => {
  if (prefix.length === 0) {
    return true
  }
  if (value.length < prefix.length) {
    return false
  }
  return value.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()
}

/** Removes a trailing suffix and any ASCII whitespace immediately before it. */
export const stripTrailingSuffixIgnoreCase = (value: string, suffix: string): string => {
  const trimmed = trimAsciiWhitespaceEnd(value)
  if (!endsWithIgnoreCase(trimmed, suffix)) {
    return value
  }
  return trimAsciiWhitespaceEnd(trimmed.slice(0, trimmed.length - suffix.length))
}

/** Removes a leading prefix and any ASCII whitespace immediately after it. */
export const stripLeadingPrefixIgnoreCase = (value: string, prefix: string): string => {
  const trimmedStart = trimAsciiWhitespaceStart(value)
  if (!startsWithIgnoreCase(trimmedStart, prefix)) {
    return value
  }
  return trimAsciiWhitespaceStart(trimmedStart.slice(prefix.length))
}

export const fieldNameEndsWithIgnoreCase = (fieldName: string, suffix: string): boolean =>
  endsWithIgnoreCase(fieldName, suffix)
