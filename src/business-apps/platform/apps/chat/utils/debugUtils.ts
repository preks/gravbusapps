/**
 * Debug utilities for selective logging
 * Only specific users will see enhanced debug logs
 */

// Hardcoded user IDs for debug logging
const DEBUG_USER_IDS = [
  '6b4f6b72-da51-47eb-9d14-d9a734408b09', // TODO: Replace with actual user ID
  '5650b196-8099-43c0-9985-296096ad4a09' // TODO: Replace with actual user ID
]

/**
 * Check if the current user should see debug logs
 */
export const shouldShowDebugLogs = (userId: string | undefined | null): boolean => {
  if (!userId) return false
  return DEBUG_USER_IDS.includes(userId)
}

/**
 * Conditional console.log - only logs for debug users
 */
export const debugLog = (userId: string | undefined | null, ...args: any[]): void => {
  if (shouldShowDebugLogs(userId)) {
    console.log(...args)
  }
}

/**
 * Conditional console.warn - only logs for debug users
 */
export const debugWarn = (userId: string | undefined | null, ...args: any[]): void => {
  if (shouldShowDebugLogs(userId)) {
    console.warn(...args)
  }
}

/**
 * Conditional console.error - only logs for debug users
 */
export const debugError = (userId: string | undefined | null, ...args: any[]): void => {
  if (shouldShowDebugLogs(userId)) {
    console.error(...args)
  }
}
