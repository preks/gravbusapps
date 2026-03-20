import { useEffect } from 'react'

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

export function useSyncClientAccessToken(client: AccessTokenAwareClient, accessToken?: string) {
  if (accessToken) {
    client.setAccessToken(accessToken)
  }

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const handleTokenRefresh: EventListener = event => {
      client.setAccessToken(resolveAccessTokenFromRefreshEvent(event, accessToken))
    }

    globalThis.addEventListener(TOKEN_REFRESH_EVENT, handleTokenRefresh)

    return () => {
      globalThis.removeEventListener(TOKEN_REFRESH_EVENT, handleTokenRefresh)
    }
  }, [client, accessToken])
}
