/**
 * RealtimeKit Debug Utility
 *
 * Centralized debug logging for RTK/Chat features.
 * Logs are disabled by default and can be enabled via:
 * - localStorage.setItem('RTK_DEBUG', 'true') in browser console
 * - Environment variable (for development)
 */

const isDebugEnabled = (): boolean => {
  if (typeof globalThis.window === 'undefined') return false

  try {
    // Only enable if explicitly set in localStorage
    // Removed automatic enabling in DEV mode to prevent logs showing in UI
    return localStorage.getItem('RTK_DEBUG') === 'true'
  } catch {
    return false
  }
}

/**
 * Debug logger that only logs when debug mode is enabled
 */
export const rtkDebug = {
  log: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      rtkDebug.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]) => {
    // Only log errors when debug mode is enabled
    if (isDebugEnabled()) {
      console.error(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.debug(...args)
    }
  }
}

/**
 * Enable/disable RTK debug logging at runtime
 */
export const setRtkDebug = (enabled: boolean) => {
  if (typeof globalThis.window !== 'undefined') {
    try {
      if (enabled) {
        localStorage.setItem('RTK_DEBUG', 'true')
        rtkDebug.log('✅ RTK Debug logging enabled. Reload the page to see logs.')
      } else {
        localStorage.removeItem('RTK_DEBUG')
        rtkDebug.log('❌ RTK Debug logging disabled.')
      }
    } catch (err) {
      console.error('Failed to set RTK debug mode:', err)
    }
  }
}

// Expose helper functions to window for easy access in console
if (typeof globalThis.window !== 'undefined') {
  ;(globalThis as any).enableRtkDebug = () => setRtkDebug(true)
  ;(globalThis as any).disableRtkDebug = () => setRtkDebug(false)
}
