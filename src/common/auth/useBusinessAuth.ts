import Keycloak, { KeycloakInitOptions, type KeycloakTokenParsed } from 'keycloak-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import {
  STORAGE_KEY_USER_INFO,
  STORAGE_KEY_ACCESS_TOKEN,
  STORAGE_KEY_ADDITIONAL_DATA
} from '@/common/constants/ideStorageKeys'
import { NAVIGATION_BASE_PATH } from '@/common/utils/navigationUtils'

const SESSION_KEY_KEYCLOAK_RETURN_PATH = 'keycloak_return_path'

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

export interface UseBusinessAuthResult {
  initialized: boolean
  accessToken?: string
  tokenParsed?: KeycloakTokenParsed
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  isMsOAuthCallback: boolean
}

export function useBusinessAuth(): UseBusinessAuthResult {
  const [initialized, setInitialized] = useState(false)
  const [isMsOAuthCallback] = useState(() => isMicrosoftOAuthCallback())
  const [kcInstance, setKcInstance] = useState<Keycloak | null>(null)
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined)
  const [tokenParsed, setTokenParsed] = useState<KeycloakTokenParsed | undefined>(undefined)

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

    const kc = new Keycloak(keycloakConfig)
    setKcInstance(kc)

    let cancelled = false
    const minValiditySeconds = 60

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
        })
    }

    const stableRedirectUri =
      typeof window !== 'undefined' ? `${window.location.origin}${NAVIGATION_BASE_PATH}` : undefined

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
        const authenticated = await kc.init(initOptions)
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

  const logout = useCallback(async () => {
    if (!kcInstance) return

    try {
      window.localStorage.removeItem(STORAGE_KEY_USER_INFO)
      window.localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN)
      window.localStorage.removeItem(STORAGE_KEY_ADDITIONAL_DATA)
      window.localStorage.removeItem('newwork_every_ai')
      window.localStorage.removeItem('everyai-submitted-forms')
    } catch {
      // ignore storage errors
    }

    setAccessToken(undefined)
    setTokenParsed(undefined)

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
    isMsOAuthCallback
  }
}
