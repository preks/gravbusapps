import { useEffect } from 'react'
import { normalizeBearerAccessToken } from './HeaderUtils'

const TOKEN_REFRESH_EVENT = 'com.newwork.token.shouldRefreshAuthorizationHeader'

type AccessTokenAwareClient = {
  setAccessToken(accessToken: string): void
}

type TokenRefreshEventDetail = string | boolean | { accessToken?: string } | undefined

function resolveAccessTokenFromRefreshEvent(event: Event, fallbackAccessToken: string): string {
  if (!(event instanceof CustomEvent)) {
    return fallbackAccessToken
  }

  const eventDetail = event.detail as TokenRefreshEventDetail

  if (typeof eventDetail === 'string') {
    return eventDetail.trim() || fallbackAccessToken
  }

  if (eventDetail && typeof eventDetail === 'object' && 'accessToken' in eventDetail) {
    return String(eventDetail.accessToken ?? '').trim() || fallbackAccessToken
  }

  return fallbackAccessToken
}

function applyAccessToken(client: AccessTokenAwareClient, accessToken?: string) {
  const normalized = normalizeBearerAccessToken(accessToken)
  if (!normalized) {
    return
  }

  client.setAccessToken(normalized)
}

export function useSyncClientAccessToken(client: AccessTokenAwareClient, accessToken?: string) {
  applyAccessToken(client, accessToken)

  useEffect(() => {
    applyAccessToken(client, accessToken)

    const normalized = normalizeBearerAccessToken(accessToken)
    if (!normalized) {
      return
    }

    const handleTokenRefresh: EventListener = event => {
      const refreshed = normalizeBearerAccessToken(resolveAccessTokenFromRefreshEvent(event, normalized))
      if (refreshed) {
        client.setAccessToken(refreshed)
      }
    }

    globalThis.addEventListener(TOKEN_REFRESH_EVENT, handleTokenRefresh)

    return () => {
      globalThis.removeEventListener(TOKEN_REFRESH_EVENT, handleTokenRefresh)
    }
  }, [client, accessToken])
}
