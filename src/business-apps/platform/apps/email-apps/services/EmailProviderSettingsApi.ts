/**
 * EmailProviderSettingsApi
 *
 * Connects to the document-service backend for email provider settings management.
 * Used by admin settings screen (full CRUD) and email app (public read).
 */
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

let currentAccessToken: string | null = null

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = currentAccessToken
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

// ========== Types ==========

export interface PublicProviderConfig {
  provider: 'microsoft' | 'google' | 'imap_smtp'
  isEnabled: boolean
  publicConfig: {
    clientId?: string
    authority?: string
    scopes?: string
    defaultImapHost?: string
    defaultImapPort?: string
    defaultSmtpHost?: string
    defaultSmtpPort?: string
    [key: string]: unknown
  }
}

export interface AdminProviderConfig extends PublicProviderConfig {
  id: string
  hasClientSecret: boolean
  updatedAt: string
}

export interface UpsertProviderSettingsRequest {
  provider: 'microsoft' | 'google' | 'imap_smtp'
  publicConfig?: {
    clientId?: string
    authority?: string
    scopes?: string
    defaultImapHost?: string
    defaultImapPort?: string
    defaultSmtpHost?: string
    defaultSmtpPort?: string
    [key: string]: unknown
  }
  privateConfig?: {
    clientSecret?: string
    [key: string]: unknown
  }
  isEnabled?: boolean
}

export interface OAuthExchangeRequest {
  code: string
  codeVerifier: string
  redirectUri: string
}

export interface OAuthExchangeResponse {
  id: string
  displayName: string
  emailAddress: string
  provider: string
  status: string
  isDefault: boolean
}

// ========== API ==========

export const EmailProviderSettingsApi = {
  setAccessToken(token: string | null) {
    currentAccessToken = token
  },

  /** Get public settings (all authenticated users) */
  async getPublicSettings(): Promise<PublicProviderConfig[]> {
    return apiRequest<PublicProviderConfig[]>('/emails/provider-settings/public')
  },

  /** Get admin settings (includes hasSecret flags) */
  async getAdminSettings(): Promise<AdminProviderConfig[]> {
    return apiRequest<AdminProviderConfig[]>('/emails/provider-settings')
  },

  /** Upsert provider settings (admin only) */
  async upsertSettings(data: UpsertProviderSettingsRequest): Promise<AdminProviderConfig> {
    return apiRequest<AdminProviderConfig>('/emails/provider-settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  /** Exchange Microsoft authorization code for tokens (server-side) */
  async exchangeMicrosoftCode(data: OAuthExchangeRequest): Promise<OAuthExchangeResponse> {
    return apiRequest<OAuthExchangeResponse>('/emails/oauth/microsoft/exchange', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  /** Exchange Google authorization code for tokens (server-side) */
  async exchangeGoogleCode(data: OAuthExchangeRequest): Promise<OAuthExchangeResponse> {
    return apiRequest<OAuthExchangeResponse>('/emails/oauth/google/exchange', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}

export default EmailProviderSettingsApi
