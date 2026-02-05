/**
 * Utility for getting the chat service API URL
 */

import { env } from '@/common/env/EnvUtils'

/**
 * Get the chat service API URL
 *
 * Uses environment variables or constructs from base URL
 */
export function getChatServiceApiUrl(): string {
  // Check for explicit chat service URL override
  const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')
  if (chatServiceOverride) {
    return chatServiceOverride
  }

  // Check for explicit API URL
  const chatApiUrl = env('NEXT_PUBLIC_CHAT_API')
  if (chatApiUrl && !chatApiUrl.includes('localhost')) {
    return chatApiUrl
  }

  // Build from base URL
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // Handle local development platform
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''
  const currentPort = typeof window !== 'undefined' ? window.location.port : ''
  const isLocalPlatform = currentHost === 'localhost' && ['3000', '5173'].includes(currentPort)

  if (isLocalPlatform) {
    baseUrl = 'https://newwork-dev.newwork.com'
  }

  return `${baseUrl}/chat-service/api/v1`
}

export default getChatServiceApiUrl
