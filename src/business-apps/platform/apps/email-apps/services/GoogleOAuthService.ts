/**
 * GoogleOAuthService
 *
 * Handles Google OAuth2 authorization flow with PKCE for SPAs.
 * The frontend obtains an authorization code and sends it to the backend
 * (document-service) for server-side token exchange.
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
   * Initiates the Google OAuth flow using a popup window.
   * Returns the authorization code and PKCE verifier for backend exchange.
   */
  async startAuth(config: GoogleOAuthConfig): Promise<GoogleAuthResult> {
    const { verifier, challenge } = await generatePKCE()
    const state = generateRandomString(32)
    const redirectUri = `${window.location.origin}/platform/mail/oauth/callback`

    // Store state for validation
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

    return new Promise((resolve, reject) => {
      const width = 500
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      )

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'))
        return
      }

      const pollInterval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(pollInterval)
            reject(new Error('Authentication cancelled'))
            return
          }

          const popupUrl = popup.location.href

          if (popupUrl.startsWith(window.location.origin)) {
            clearInterval(pollInterval)

            const url = new URL(popupUrl)
            const code = url.searchParams.get('code')
            const returnedState = url.searchParams.get('state')
            const error = url.searchParams.get('error')

            popup.close()

            if (error) {
              reject(new Error(`Google OAuth error: ${error}`))
              return
            }

            // Validate state
            const storedState = sessionStorage.getItem('google_oauth_state')
            if (returnedState !== storedState) {
              reject(new Error('Invalid state parameter'))
              return
            }

            // Clean up
            sessionStorage.removeItem('google_oauth_state')
            sessionStorage.removeItem('google_oauth_verifier')

            if (code) {
              resolve({
                code,
                codeVerifier: verifier,
                redirectUri
              })
            } else {
              reject(new Error('Missing authorization code'))
            }
          }
        } catch {
          // Cross-origin error - popup is still on Google domain
        }
      }, 500)

      // Timeout after 5 minutes
      setTimeout(
        () => {
          clearInterval(pollInterval)
          if (!popup.closed) {
            popup.close()
          }
          reject(new Error('Authentication timed out'))
        },
        5 * 60 * 1000
      )
    })
  }
}

export default GoogleOAuthService
