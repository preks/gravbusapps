/**
 * Chat env and URL configuration for API, WebSocket, and Realtime Kit client.
 */

import { useMemo } from 'react'
import { env } from '@/common/env/EnvUtils'
import { RealtimeKitApiClient } from '../services/realtimeKitApiClient'

export interface UseChatEnvParams {
  accessToken: string | null
  additionalData?: Record<string, unknown>
}

export interface UseChatEnvReturn {
  apiUrl: string
  wsUrl: string
  wsSocketPath: string
  realtimeKitBaseUrl: string
  realtimeKitApiClient: RealtimeKitApiClient | null
}

export function useChatEnv({ accessToken }: UseChatEnvParams): UseChatEnvReturn {
  const baseUrl = useMemo(() => {
    const url = env('NEXT_PUBLIC_BASE_URL') || ''
    return url.endsWith('/') ? url.slice(0, -1) : url
  }, [])

  const chatServiceOverride = useMemo(() => env('NEXT_PUBLIC_CHAT_SERVICE_URL'), [])

  const { apiUrl, wsUrl, wsSocketPath, resolvedBaseUrl } = useMemo(() => {
    if (chatServiceOverride) {
      const localUrl = chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
      return {
        apiUrl: `${localUrl}/api/v1`,
        wsUrl: `${localUrl}/chat-service`,
        wsSocketPath: '/socket.io',
        resolvedBaseUrl: localUrl
      }
    }

    let resolvedBase = baseUrl
    const isLocalPlatform = baseUrl.includes('localhost')
    if (isLocalPlatform) {
      resolvedBase = 'https://newwork-dev.newwork.com'
    }

    let api = env('NEXT_PUBLIC_CHAT_API') || `${resolvedBase}/chat-service/api/v1` || ''
    if (api.includes('localhost')) {
      api = `${resolvedBase}/chat-service/api/v1`
    }

    const ws = `${resolvedBase}/chat-service`
    const wsPath = env('NEXT_PUBLIC_CHAT_WS_PATH') || '/chat-service/socket.io'

    return {
      apiUrl: api,
      wsUrl: ws,
      wsSocketPath: wsPath,
      resolvedBaseUrl: resolvedBase
    }
  }, [baseUrl, chatServiceOverride])

  const realtimeKitBaseUrl = useMemo(() => {
    if (chatServiceOverride) {
      return chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
    }
    return `${resolvedBaseUrl}/chat-service`
  }, [chatServiceOverride, resolvedBaseUrl])

  const realtimeKitApiClient = useMemo(() => {
    if (accessToken && realtimeKitBaseUrl) {
      return new RealtimeKitApiClient(realtimeKitBaseUrl, accessToken)
    }
    return null
  }, [accessToken, realtimeKitBaseUrl])

  return {
    apiUrl,
    wsUrl,
    wsSocketPath,
    realtimeKitBaseUrl,
    realtimeKitApiClient
  }
}
