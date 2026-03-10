declare const window: { [key: string]: any }
declare const process: { env: { [key: string]: string | undefined } }

export const WINDOW_ENV_KEY: any = 'nw-envs'

const FLOWBOT_OVERRIDE_STORAGE_KEY = 'flowbot-endpoint-override'
const FLOWBOT_OVERRIDE_QUERY_PARAM = 'flowbotEndpoint'
const FLOWBOT_ENV_KEYS = new Set(['NEXT_PUBLIC_FLOWBOT_ENDPOINT'])

const PROMPT_MANAGER_OVERRIDE_STORAGE_KEY = 'prompt-manager-url-override'
const PROMPT_MANAGER_OVERRIDE_QUERY_PARAM = 'promptManagerUrl'
const PROMPT_MANAGER_ENV_KEYS = new Set(['NEXT_PUBLIC_PROMPT_MANAGER_API_URL'])

const PRODUCT_REPORT_OVERRIDE_STORAGE_KEY = 'product-report-base-url-override'
const PRODUCT_REPORT_OVERRIDE_QUERY_PARAM = 'productReportBaseUrl'
const PRODUCT_REPORT_ENV_KEYS = new Set(['NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL'])

function normalizeAbsoluteHttpUrl(value: string | null): string | undefined {
  const v = (value || '').trim()
  if (!v) return undefined
  try {
    const url = new URL(v)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.toString().replace(/\/+$/, '')
  } catch {
    return undefined
  }
}

function getFlowbotOverrideFromQuery(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const params = new URLSearchParams(window.location.search)
    const value = params.get(FLOWBOT_OVERRIDE_QUERY_PARAM)
    return normalizeAbsoluteHttpUrl(value)
  } catch {
    return undefined
  }
}

function getFlowbotOverrideFromStorage(): string | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined
  try {
    const value = window.localStorage.getItem(FLOWBOT_OVERRIDE_STORAGE_KEY)
    const normalized = normalizeAbsoluteHttpUrl(value)
    if (!normalized && value) {
      window.localStorage.removeItem(FLOWBOT_OVERRIDE_STORAGE_KEY)
    }
    return normalized
  } catch {
    return undefined
  }
}

function setFlowbotOverrideInStorage(value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const normalized = normalizeAbsoluteHttpUrl(value)
    if (!normalized) return
    window.localStorage.setItem(FLOWBOT_OVERRIDE_STORAGE_KEY, normalized)
  } catch {
    // ignore errors (private browsing, quota exceeded, etc.)
  }
}

function getPromptManagerOverrideFromQuery(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const params = new URLSearchParams(window.location.search)
    const value = params.get(PROMPT_MANAGER_OVERRIDE_QUERY_PARAM)
    return normalizeAbsoluteHttpUrl(value)
  } catch {
    return undefined
  }
}

function getPromptManagerOverrideFromStorage(): string | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined
  try {
    const value = window.localStorage.getItem(PROMPT_MANAGER_OVERRIDE_STORAGE_KEY)
    const normalized = normalizeAbsoluteHttpUrl(value)
    if (!normalized && value) {
      window.localStorage.removeItem(PROMPT_MANAGER_OVERRIDE_STORAGE_KEY)
    }
    return normalized
  } catch {
    return undefined
  }
}

function setPromptManagerOverrideInStorage(value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const normalized = normalizeAbsoluteHttpUrl(value)
    if (!normalized) return
    window.localStorage.setItem(PROMPT_MANAGER_OVERRIDE_STORAGE_KEY, normalized)
  } catch {
    // ignore errors (private browsing, quota exceeded, etc.)
  }
}

function getProductReportOverrideFromQuery(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const params = new URLSearchParams(window.location.search)
    const value = params.get(PRODUCT_REPORT_OVERRIDE_QUERY_PARAM)
    return normalizeAbsoluteHttpUrl(value)
  } catch {
    return undefined
  }
}

function getProductReportOverrideFromStorage(): string | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined
  try {
    const value = window.localStorage.getItem(PRODUCT_REPORT_OVERRIDE_STORAGE_KEY)
    const normalized = normalizeAbsoluteHttpUrl(value)
    if (!normalized && value) {
      window.localStorage.removeItem(PRODUCT_REPORT_OVERRIDE_STORAGE_KEY)
    }
    return normalized
  } catch {
    return undefined
  }
}

export function setProductReportBaseUrlOverride(value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    const normalized = normalizeAbsoluteHttpUrl(value)
    if (!normalized) return false
    window.localStorage.setItem(PRODUCT_REPORT_OVERRIDE_STORAGE_KEY, normalized)
    return true
  } catch {
    return false
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

    if (PROMPT_MANAGER_ENV_KEYS.has(key)) {
      const queryOverride = getPromptManagerOverrideFromQuery()
      if (queryOverride) {
        setPromptManagerOverrideInStorage(queryOverride)
        return queryOverride
      }

      const storedOverride = getPromptManagerOverrideFromStorage()
      if (storedOverride) {
        return storedOverride
      }
    }

    if (PRODUCT_REPORT_ENV_KEYS.has(key)) {
      const queryOverride = getProductReportOverrideFromQuery()
      if (queryOverride) {
        setProductReportBaseUrlOverride(queryOverride)
        return queryOverride
      }

      const storedOverride = getProductReportOverrideFromStorage()
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
  const windowEnvsRaw = globalThis.window?.[WINDOW_ENV_KEY] as unknown
  if (globalThis.window !== undefined && windowEnvsRaw !== undefined && typeof windowEnvsRaw === 'object') {
    const entries = Object.entries(windowEnvsRaw as Record<string, unknown>).filter(
      ([key, value]) => key.startsWith('NEXT_PUBLIC_') && (typeof value === 'string' || value === undefined)
    )
    return Object.fromEntries(entries) as Record<string, string | undefined>
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
