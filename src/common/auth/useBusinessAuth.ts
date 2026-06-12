import { type default as Keycloak, type KeycloakInitOptions, type KeycloakTokenParsed } from 'keycloak-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import {
  STORAGE_KEY_USER_INFO,
  STORAGE_KEY_ACCESS_TOKEN,
  STORAGE_KEY_ADDITIONAL_DATA
} from '@/common/constants/ideStorageKeys'
import { NAVIGATION_BASE_PATH } from '@/common/utils/navigationUtils'
import { getKeycloakClient, initKeycloakClient } from './keycloakClient'

const SESSION_KEY_KEYCLOAK_RETURN_PATH = 'keycloak_return_path'
const MOBILE_TOKEN_KEY = 'com.newwork.mobile.accessToken'
const MOBILE_TOKEN_UPDATED_EVENT = 'com.newwork.mobile.token.updated'

/**
 * Check if current URL is a Microsoft OAuth callback
 * We detect this by checking if there's a pending MS OAuth state in sessionStorage
 */
function isMicrosoftOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const hasCode = params.has('code')
  const hasState = params.has('state')
  const hasMsOAuthState = sessionStorage.getItem('ms_oauth_state') !== null
  return hasCode && hasState && hasMsOAuthState
}

function isReactNativeWebView(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).ReactNativeWebView
}

function getMobileAccessToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return sessionStorage.getItem(MOBILE_TOKEN_KEY) || undefined
  } catch {
    return undefined
  }
}

function decodeJwtPayload(token: string): KeycloakTokenParsed | undefined {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return undefined
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    return JSON.parse(decoded) as KeycloakTokenParsed
  } catch {
    return undefined
  }
}

export interface UseBusinessAuthResult {
  initialized: boolean
  accessToken?: string
  tokenParsed?: KeycloakTokenParsed
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  isTokenExpired: boolean
  isMsOAuthCallback: boolean
}

export function useBusinessAuth(): UseBusinessAuthResult {
  const [initialized, setInitialized] = useState(false)
  const [isMsOAuthCallback] = useState(() => isMicrosoftOAuthCallback())
  const [kcInstance, setKcInstance] = useState<Keycloak | null>(null)
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined)
  const [tokenParsed, setTokenParsed] = useState<KeycloakTokenParsed | undefined>(undefined)
  const isTokenExpired = Boolean(tokenParsed?.exp && tokenParsed.exp * 1000 <= Date.now() + 60_000)

  const keycloakConfig = useMemo(
    () => ({
      url: env('NEXT_PUBLIC_OIDC_URL')!,
      realm: env('NEXT_PUBLIC_OIDC_REALM')!,
      clientId: env('NEXT_PUBLIC_OIDC_CLIENT_ID')!
    }),
    []
  )

  useEffect(() => {
    // Skip Keycloak initialization if this is a Microsoft OAuth callback
    // The email app will handle the callback directly
    if (isMsOAuthCallback) {
      setInitialized(true)
      return
    }

    // Mobile WebView bypass: use token provided by native app instead of Keycloak.
    // Prevents Keycloak login-required redirect in WebViews after tenant switch.
    if (isReactNativeWebView()) {
      const mobileToken = getMobileAccessToken()
      if (mobileToken) {
        console.log('[BusinessAuth] Using mobile access token from native app')
        setAccessToken(mobileToken)
        setTokenParsed(decodeJwtPayload(mobileToken))
        setInitialized(true)

        const handleTokenUpdate = () => {
          const updated = getMobileAccessToken()
          if (updated) {
            setAccessToken(updated)
            setTokenParsed(decodeJwtPayload(updated))
            try {
              window.dispatchEvent(
                new CustomEvent('com.newwork.token.shouldRefreshAuthorizationHeader', {
                  detail: { accessToken: updated }
                })
              )
            } catch {
              // ignore
            }
          }
        }

        window.addEventListener(MOBILE_TOKEN_UPDATED_EVENT, handleTokenUpdate)
        return () => {
          window.removeEventListener(MOBILE_TOKEN_UPDATED_EVENT, handleTokenUpdate)
        }
      }
    }

    const kc = getKeycloakClient(keycloakConfig)
    setKcInstance(kc)

    let cancelled = false
    const minValiditySeconds = 60
    const stableRedirectUri =
      typeof window !== 'undefined' ? `${window.location.origin}${NAVIGATION_BASE_PATH}` : undefined

    const applyTokenFromInstance = () => {
      const token = kc.token ?? undefined
      const parsed = kc.tokenParsed as KeycloakTokenParsed | undefined
      setAccessToken(token)
      setTokenParsed(parsed)
      try {
        window.dispatchEvent(
          new CustomEvent('com.newwork.token.shouldRefreshAuthorizationHeader', { detail: { accessToken: token } })
        )
      } catch {
        // ignore dispatch errors in non-browser environments
      }
    }

    kc.onAuthRefreshSuccess = () => {
      applyTokenFromInstance()
    }

    kc.onTokenExpired = () => {
      kc.updateToken(minValiditySeconds)
        .then((refreshed: boolean) => {
          if (refreshed) {
            applyTokenFromInstance()
          }
        })
        .catch((err: unknown) => {
          console.error('[BusinessAuth] Token refresh failed', err)
          void kc.login({ redirectUri: stableRedirectUri })
        })
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (!params.has('code')) {
        try {
          sessionStorage.setItem(SESSION_KEY_KEYCLOAK_RETURN_PATH, window.location.pathname + window.location.search)
        } catch {
          // ignore
        }
      }
    }

    const initOptions: KeycloakInitOptions = {
      onLoad: 'login-required',
      responseMode: 'query',
      flow: 'standard',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      redirectUri: stableRedirectUri
    }

    ;(async () => {
      try {
        const authenticated = await initKeycloakClient(keycloakConfig, initOptions)
        if (cancelled) return

        if (!authenticated) {
          await kc.login({ redirectUri: stableRedirectUri })
          return
        }

        applyTokenFromInstance()
        setInitialized(true)

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const savedPath = sessionStorage.getItem(SESSION_KEY_KEYCLOAK_RETURN_PATH)
          const currentPath = window.location.pathname + window.location.search
          const isStartUrl =
            window.location.pathname === '' ||
            window.location.pathname === '/' ||
            window.location.pathname === NAVIGATION_BASE_PATH
          if (savedPath && savedPath !== currentPath) {
            try {
              if (params.has('code')) {
                sessionStorage.removeItem(SESSION_KEY_KEYCLOAK_RETURN_PATH)
                window.history.replaceState(null, '', savedPath)
              } else if (isStartUrl) {
                sessionStorage.removeItem(SESSION_KEY_KEYCLOAK_RETURN_PATH)
                window.history.replaceState(null, '', savedPath)
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err: unknown) {
        console.error('[BusinessAuth] Failed to initialize Keycloak', err)
        if (!cancelled) setInitialized(true)
      }
    })()

    return () => {
      cancelled = true
      kc.onAuthRefreshSuccess = undefined
      kc.onTokenExpired = undefined
    }
  }, [keycloakConfig, isMsOAuthCallback])

  const login = useCallback(async () => {
    if (!kcInstance) return
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_KEY_KEYCLOAK_RETURN_PATH, window.location.pathname + window.location.search)
      } catch {
        // ignore
      }
    }
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}${NAVIGATION_BASE_PATH}` : undefined
    await kcInstance.login({ redirectUri })
  }, [kcInstance])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleReauthRequest = () => {
      void login()
    }
    window.addEventListener('every-fabric:reauth-requested', handleReauthRequest)
    return () => window.removeEventListener('every-fabric:reauth-requested', handleReauthRequest)
  }, [login])

  const logout = useCallback(async () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY_USER_INFO)
      window.localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN)
      window.localStorage.removeItem(STORAGE_KEY_ADDITIONAL_DATA)
      window.localStorage.removeItem('everyai-submitted-forms')
      // EveryAI owns several per-session keys (the session pointer, every
      // ``newwork_every_ai:conversation:<sessionId>`` snapshot, and the
      // streamStore active-runs envelope). Removing only the pointer
      // here left snapshots / run state behind, which then leaked into
      // the next user's session on the same origin. ``useFlowBot``
      // exposes a sweep helper on ``window`` so we can clear all of
      // them without taking on an import dependency on the EveryAI
      // module from the auth layer.
      const sweep = (window as unknown as { __clearAllEveryAiStorage?: () => void }).__clearAllEveryAiStorage
      if (typeof sweep === 'function') {
        sweep()
      } else {
        // Fallback in case EveryAI never mounted in this session (e.g.
        // logout from a page that doesn't render the chat surface).
        window.localStorage.removeItem('newwork_every_ai')
        window.localStorage.removeItem('newwork_every_ai_active_runs')
        const keysToRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && key.startsWith('newwork_every_ai:conversation:')) {
            keysToRemove.push(key)
          }
        }
        for (const key of keysToRemove) {
          window.localStorage.removeItem(key)
        }
      }
    } catch {
      // ignore storage errors
    }

    setAccessToken(undefined)
    setTokenParsed(undefined)

    if (!kcInstance) return

    const redirectUri = typeof window !== 'undefined' ? window.location.origin : undefined
    await kcInstance.logout({ redirectUri })
  }, [kcInstance])

  const refreshToken = useCallback(async () => {
    if (!kcInstance) return false
    try {
      const refreshed: boolean = await kcInstance.updateToken(60)
      if (refreshed) {
        const token = kcInstance.token ?? undefined
        const parsed = kcInstance.tokenParsed as KeycloakTokenParsed | undefined
        setAccessToken(token)
        setTokenParsed(parsed)
        try {
          window.dispatchEvent(
            new CustomEvent('com.newwork.token.shouldRefreshAuthorizationHeader', { detail: { accessToken: token } })
          )
        } catch {
          // ignore dispatch errors
        }
      }
      return refreshed
    } catch (err: unknown) {
      console.error('[BusinessAuth] Manual token refresh failed', err)
      return false
    }
  }, [kcInstance])

  return {
    initialized,
    accessToken,
    tokenParsed,
    login,
    logout,
    refreshToken,
    isTokenExpired,
    isMsOAuthCallback
  }
}
