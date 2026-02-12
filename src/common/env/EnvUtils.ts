declare const window: { [key: string]: any }
declare const process: { env: { [key: string]: string | undefined } }

export const WINDOW_ENV_KEY: any = 'nw-envs'

const FLOWBOT_OVERRIDE_STORAGE_KEY = 'flowbot-endpoint-override'
const FLOWBOT_OVERRIDE_QUERY_PARAM = 'flowbotEndpoint'
const FLOWBOT_ENV_KEYS = new Set(['NEXT_PUBLIC_FLOWBOT_ENDPOINT'])

function getFlowbotOverrideFromQuery(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const params = new URLSearchParams(window.location.search)
    const value = params.get(FLOWBOT_OVERRIDE_QUERY_PARAM)
    return value || undefined
  } catch {
    return undefined
  }
}

function getFlowbotOverrideFromStorage(): string | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined
  try {
    const value = window.localStorage.getItem(FLOWBOT_OVERRIDE_STORAGE_KEY)
    return value || undefined
  } catch {
    return undefined
  }
}

function setFlowbotOverrideInStorage(value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(FLOWBOT_OVERRIDE_STORAGE_KEY, value)
  } catch {
    // ignore errors (private browsing, quota exceeded, etc.)
  }
}

export function env(key: string): string | undefined {
  if (typeof window !== 'undefined') {
    if (!key.startsWith('NEXT_PUBLIC_')) {
      throw new Error(`Environment variable '${key}' is not public and cannot be accessed in the browser.`)
    }

    if (FLOWBOT_ENV_KEYS.has(key)) {
      const queryOverride = getFlowbotOverrideFromQuery()
      if (queryOverride) {
        setFlowbotOverrideInStorage(queryOverride)
        return queryOverride
      }

      const storedOverride = getFlowbotOverrideFromStorage()
      if (storedOverride) {
        return storedOverride
      }
    }

    if (window[WINDOW_ENV_KEY] && window[WINDOW_ENV_KEY][key]) {
      return window[WINDOW_ENV_KEY][key]
    }
  }

  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]
  }

  return undefined
}

/**
 * Returns the full runtime env object used by env() (window['nw-envs'] or process.env filtered by NEXT_PUBLIC_).
 * Used to pass the same object to the preview iframe so it can set window['nw-envs'] and use env() unchanged.
 */
export function getRuntimeEnvsForIframe(): Record<string, string | undefined> {
  const windowEnvs = globalThis.window?.[WINDOW_ENV_KEY]
  if (globalThis.window !== undefined && windowEnvs !== undefined && typeof windowEnvs === 'object') {
    return { ...windowEnvs }
  }
  const processEnv = globalThis.process?.env
  if (processEnv !== undefined) {
    return Object.fromEntries(Object.entries(processEnv).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))) as Record<
      string,
      string | undefined
    >
  }
  return {}
}
