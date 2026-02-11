/**
 * MicrosoftOAuthService
 *
 * Handles Microsoft OAuth2 authorization flow with PKCE.
 * Uses a redirect flow (not popup) for maximum platform compatibility.
 * The frontend redirects to Microsoft, gets redirected back with a code,
 * and the callback page sends the code to the backend for server-side exchange.
 */

function normalize(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const MICROSOFT_OIDC_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access'])

function normalizeMicrosoftScopes(scopes: string): string {
  // Prevent ambiguous scope resolution between Microsoft Graph and Exchange Online.
  // If a scope is not a standard OIDC scope and not already resource-qualified,
  // treat it as a Microsoft Graph delegated scope.
  return scopes
    .split(/\s+/)
    .filter(Boolean)
    .map(scope => {
      if (scope.includes('://')) return scope
      if (MICROSOFT_OIDC_SCOPES.has(scope)) return scope
      return `https://graph.microsoft.com/${scope}`
    })
    .join(' ')
}

/** Generate a random string for PKCE */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

/** Generate PKCE code verifier and challenge */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64)
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return { verifier, challenge }
}

export interface MicrosoftOAuthConfig {
  clientId: string
  authority: string
  scopes: string
}

export interface MicrosoftAuthResult {
  code: string
  codeVerifier: string
  redirectUri: string
}

export const MicrosoftOAuthService = {
  /**
   * Builds the OAuth config from tenant settings.
   */
  buildConfig(tenantConfig?: { clientId?: string; authority?: string; scopes?: string }): MicrosoftOAuthConfig {
    const clientId = normalize(tenantConfig?.clientId)
    const authority = normalize(tenantConfig?.authority)
    const scopes = normalize(tenantConfig?.scopes)

    if (!clientId) {
      throw new Error(
        'Microsoft OAuth client ID is not configured. Please ask your admin to configure the Microsoft provider.'
      )
    }
    if (!authority) {
      throw new Error(
        'Microsoft OAuth authority (tenant) is not configured. Please ask your admin to configure the Microsoft provider.'
      )
    }
    if (!scopes) {
      throw new Error(
        'Microsoft OAuth scopes are not configured. Please ask your admin to configure the Microsoft provider.'
      )
    }

    return {
      clientId,
      authority,
      scopes
    }
  },

  /**
   * Initiates the OAuth flow by redirecting the main window to Microsoft login.
   * Stores PKCE verifier in sessionStorage for the callback page to use.
   * This function does NOT return — the page navigates away.
   */
  async startAuth(config: MicrosoftOAuthConfig): Promise<never> {
    const { verifier, challenge } = await generatePKCE()
    const state = generateRandomString(32)
    const redirectUri = `${window.location.origin}/platform/mail/oauth/callback`

    // Store PKCE verifier and state for the callback page
    sessionStorage.setItem('ms_oauth_verifier', verifier)
    sessionStorage.setItem('ms_oauth_state', state)
    sessionStorage.setItem(
      'ms_oauth_debug',
      JSON.stringify({
        clientId: config.clientId,
        authority: config.authority,
        scopes: normalizeMicrosoftScopes(config.scopes)
      })
    )

    const authorityUrl = `https://login.microsoftonline.com/${config.authority}`

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: normalizeMicrosoftScopes(config.scopes),
      response_mode: 'fragment',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account'
    })

    const authUrl = `${authorityUrl}/oauth2/v2.0/authorize?${params.toString()}`

    // Redirect the main window — this navigates away, function never returns
    window.location.href = authUrl

    // Return a never-resolving promise so callers' await doesn't continue
    return new Promise<never>(() => {})
  }
}

export default MicrosoftOAuthService
