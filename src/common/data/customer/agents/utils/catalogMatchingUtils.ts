/**
 * Catalog matching utilities
 * Extracted from LeadImportExample lines 312-325
 */

import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

/**
 * Lookup catalog entry by value with fuzzy matching
 * Returns catalog entry ID if found, null otherwise
 */
export function lookupCatalogEntry(entries: CatalogEntry[], searchValue: string): string | null {
  if (!searchValue || searchValue.trim() === '' || entries.length === 0) {
    return null
  }

  const search = searchValue.toLowerCase().trim()

  // 1. Exact match on code or value (trim catalog values to handle trailing spaces)
  const exactMatch = entries.find(
    entry => entry.code?.toLowerCase().trim() === search || entry.value.toLowerCase().trim() === search
  )
  if (exactMatch) {
    return exactMatch.id
  }

  // 2. For multi-value inputs (comma-separated), try matching the first value
  if (search.includes(',')) {
    const firstValue = search.split(',')[0].trim()
    const firstValueMatch = entries.find(
      entry => entry.code?.toLowerCase().trim() === firstValue || entry.value.toLowerCase().trim() === firstValue
    )
    if (firstValueMatch) {
      return firstValueMatch.id
    }
  }

  // 3. Special handling for numeric ranges (e.g., CompanySize)
  // If search is a number and catalog has range patterns like "01-10", "501-1,000"
  const numericValue = Number.parseInt(search.replaceAll(',', ''))
  if (!Number.isNaN(numericValue)) {
    const rangeMatch = entries.find(entry => {
      const value = entry.value.toLowerCase().trim()
      // Match patterns like "01-10", "501-1,000", "10,001+"
      // Using {1,3} and * to avoid ReDoS vulnerability from nested quantifiers
      const rangePattern = /(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)/
      const plusPattern = /(\d{1,3}(?:,\d{3})*)\+/

      const rangeExecResult = rangePattern.exec(value)
      if (rangeExecResult) {
        const min = Number.parseInt(rangeExecResult[1].replaceAll(',', ''))
        const max = Number.parseInt(rangeExecResult[2].replaceAll(',', ''))
        return numericValue >= min && numericValue <= max
      }

      const plusExecResult = plusPattern.exec(value)
      if (plusExecResult) {
        const min = Number.parseInt(plusExecResult[1].replaceAll(',', ''))
        return numericValue >= min
      }

      return false
    })
    if (rangeMatch) {
      return rangeMatch.id
    }
  }

  // 4. Code starts with (e.g., "CH" for "Switzerland")
  const codeMatch = entries.find(entry => entry.code?.toLowerCase().trim().startsWith(search))
  if (codeMatch) {
    return codeMatch.id
  }

  // 5. Value starts with
  const startsWithMatch = entries.find(entry => entry.value.toLowerCase().trim().startsWith(search))
  if (startsWithMatch) {
    return startsWithMatch.id
  }

  // 6. Word-based partial matching (better for multi-word searches)
  // Split search into words and check if all words are in value
  const searchWords = search.split(/\s+/).filter(w => w.length > 2)
  if (searchWords.length > 0) {
    const wordMatch = entries.find(entry => {
      const entryValue = entry.value.toLowerCase().trim()
      return searchWords.every(word => entryValue.includes(word))
    })
    if (wordMatch) {
      return wordMatch.id
    }
  }

  // 7. Fuzzy match on value (partial match)
  const fuzzyMatch = entries.find(entry => entry.value.toLowerCase().trim().includes(search))
  if (fuzzyMatch) {
    return fuzzyMatch.id
  }

  // 8. Reverse partial match (catalog value contains search term)
  const reverseMatch = entries.find(entry => search.includes(entry.value.toLowerCase().trim()))
  if (reverseMatch) {
    return reverseMatch.id
  }

  return null
}

/**
 * Batch lookup multiple catalog values with caching
 */
export function batchLookupCatalogEntries(
  entries: CatalogEntry[],
  searchValues: string[],
  cache?: Map<string, string | null>
): Map<string, string | null> {
  const results = cache || new Map<string, string | null>()

  for (const searchValue of searchValues) {
    if (!results.has(searchValue)) {
      const catalogId = lookupCatalogEntry(entries, searchValue)
      results.set(searchValue, catalogId)
    }
  }

  return results
}

/**
 * Calculate match confidence score (0-1)
 * Used for showing match quality to users
 */
export function calculateMatchConfidence(entry: CatalogEntry, searchValue: string): number {
  if (!searchValue || !entry) {
    return 0
  }

  const search = searchValue.toLowerCase().trim()
  const entryValue = entry.value.toLowerCase().trim()
  const entryCode = entry.code?.toLowerCase().trim() || ''

  // Exact match
  if (entryValue === search || entryCode === search) {
    return 1
  }

  // Starts with
  if (entryValue.startsWith(search) || entryCode.startsWith(search)) {
    return 0.9
  }

  // Contains
  if (entryValue.includes(search) || entryCode.includes(search)) {
    return 0.7
  }

  return 0
}
