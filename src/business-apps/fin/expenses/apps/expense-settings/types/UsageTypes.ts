/**
 * Shared types for usage tracking across expense settings tabs
 * Single source of truth for usage-related interfaces
 */

/**
 * Represents what entities are using a specific record
 */
export interface UsedIn {
  planItems?: number
  items?: number
  positions?: number
  setups?: number
}

/**
 * Usage information for a record
 * Used across all tabs to determine if a record can be deleted or needs restricted editing
 */
export interface UsageInfo {
  isUsed: boolean
  usedIn: UsedIn
  message: string
}

/**
 * Map of record IDs to their usage status
 */
export type UsageMap = Record<string, boolean>
