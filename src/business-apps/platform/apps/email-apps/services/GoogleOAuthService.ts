/**
 * GoogleOAuthService
 *
 * Handles Google OAuth2 authorization flow with PKCE.
 * Uses a redirect flow (not popup) for maximum platform compatibility.
 * The frontend redirects to Google, gets redirected back with a code,
 * and the callback page sends the code to the backend for server-side exchange.
 */

const DEFAULT_SCOPES = 'openid email profile https://mail.google.com/'

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

export interface GoogleOAuthConfig {
  clientId: string
  scopes: string
}

export interface GoogleAuthResult {
  code: string
  codeVerifier: string
  redirectUri: string
}

export const GoogleOAuthService = {
  /**
   * Builds the OAuth config from tenant settings.
   */
  buildConfig(tenantConfig?: { clientId?: string; scopes?: string }): GoogleOAuthConfig {
    if (!tenantConfig?.clientId) {
      throw new Error('Google OAuth client ID is not configured')
    }
    return {
      clientId: tenantConfig.clientId,
      scopes: tenantConfig.scopes || DEFAULT_SCOPES
    }
  },

  /**
   * Initiates the Google OAuth flow by redirecting the main window.
   * Stores PKCE verifier in sessionStorage for the callback page to use.
   * This function does NOT return — the page navigates away.
   */
  async startAuth(config: GoogleOAuthConfig): Promise<never> {
    const { verifier, challenge } = await generatePKCE()
    const state = generateRandomString(32)
    const redirectUri = `${window.location.origin}/platform/mail/oauth/callback`

    // Store PKCE verifier and state for the callback page
    sessionStorage.setItem('google_oauth_state', state)
    sessionStorage.setItem('google_oauth_verifier', verifier)

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: config.scopes,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent'
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    // Redirect the main window — this navigates away, function never returns
    window.location.href = authUrl

    // Return a never-resolving promise so callers' await doesn't continue
    return new Promise<never>(() => {})
  }
}

export default GoogleOAuthService
