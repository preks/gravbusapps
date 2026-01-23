/**
 * RealtimeKit Debug Utility
 *
 * Centralized debug logging for RTK/Chat features.
 * Logs are disabled by default and can be enabled via:
 * - localStorage.setItem('RTK_DEBUG', 'true') in browser console
 * - Environment variable (for development)
 */

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    return (
      localStorage.getItem('RTK_DEBUG') === 'true' || (import.meta.env.DEV && import.meta.env.VITE_RTK_DEBUG === 'true')
    )
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
      console.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors
    console.error(...args)
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
  if (typeof window !== 'undefined') {
    try {
      if (enabled) {
        localStorage.setItem('RTK_DEBUG', 'true')
        console.log('✅ RTK Debug logging enabled. Reload the page to see logs.')
      } else {
        localStorage.removeItem('RTK_DEBUG')
        console.log('❌ RTK Debug logging disabled.')
      }
    } catch (err) {
      console.error('Failed to set RTK debug mode:', err)
    }
  }
}

// Expose helper functions to window for easy access in console
if (typeof window !== 'undefined') {
  ;(window as any).enableRtkDebug = () => setRtkDebug(true)
  ;(window as any).disableRtkDebug = () => setRtkDebug(false)
}
