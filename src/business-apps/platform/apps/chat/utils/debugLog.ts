/**
 * Debug logging utility for chat services
 * Only logs when localStorage flag 'debug:chat' is set to '1'
 */

const isChatDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('debug:chat') === '1'
}

export const debugLog = (...args: unknown[]): void => {
  if (isChatDebugEnabled()) {
    console.debug(...args)
  }
}

export const debugLogError = (...args: unknown[]): void => {
  // Always log errors, but use debug format if debug is enabled
  if (isChatDebugEnabled()) {
    console.debug(...args)
  } else {
    // In production, still log errors but less verbosely
    console.error(...args)
  }
}
