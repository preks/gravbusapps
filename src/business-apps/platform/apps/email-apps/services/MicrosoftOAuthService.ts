/**
 * MicrosoftOAuthService
 *
 * Handles Microsoft OAuth2 authentication for email access.
 * Uses MSAL-style authorization code flow with PKCE for SPAs.
 */

const MICROSOFT_CLIENT_ID = '861b3af1-129e-4674-9f0e-4fb4a3091fc0'
// Use /organizations for work/school accounts (single-tenant compatible)
const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/organizations'
// Redirect URI must match exactly what's registered in Azure App Registration
const REDIRECT_URI = `${window.location.origin}/platform/mail/oauth/callback`

// Scopes for Microsoft Graph API mail access
// Using short form which defaults to Microsoft Graph
const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'Mail.Read', 'Mail.Send']

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

export interface MicrosoftTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}

export interface MicrosoftUserInfo {
  email: string
  name: string
}

export const MicrosoftOAuthService = {
  /**
   * Get the configured Microsoft Client ID
   */
  getClientId(): string {
    return MICROSOFT_CLIENT_ID
  },

  /**
   * Initiates the OAuth flow using a popup window
   * Popup avoids platform's server-side routing that strips query params
   */
  async startAuth(): Promise<{ code: string; state: string }> {
    const { verifier, challenge } = await generatePKCE()
    const state = generateRandomString(32)

    // Store verifier and state for callback validation
    sessionStorage.setItem('ms_oauth_verifier', verifier)
    sessionStorage.setItem('ms_oauth_state', state)

    console.log('[MicrosoftOAuth] Starting auth flow (popup)')
    console.log('[MicrosoftOAuth] Redirect URI:', REDIRECT_URI)
    console.log('[MicrosoftOAuth] State stored:', state)

    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      response_mode: 'query',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account'
    })

    const authUrl = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`
    console.log('[MicrosoftOAuth] Opening popup:', authUrl)

    return new Promise((resolve, reject) => {
      // Open popup window
      const width = 500
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        'microsoft-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      )

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'))
        return
      }

      // Poll for the redirect URL in the popup
      const pollInterval = setInterval(() => {
        try {
          // Check if popup was closed
          if (popup.closed) {
            clearInterval(pollInterval)
            reject(new Error('Authentication cancelled'))
            return
          }

          // Try to read the popup URL (will fail while on Microsoft domain due to CORS)
          const popupUrl = popup.location.href

          // Check if we're back on our domain with OAuth params
          if (popupUrl.startsWith(window.location.origin)) {
            clearInterval(pollInterval)

            const url = new URL(popupUrl)
            const code = url.searchParams.get('code')
            const returnedState = url.searchParams.get('state')
            const error = url.searchParams.get('error')
            const errorDescription = url.searchParams.get('error_description')

            console.log('[MicrosoftOAuth] Popup returned to origin')
            console.log('[MicrosoftOAuth] Code:', code ? 'present' : 'missing')
            console.log('[MicrosoftOAuth] State:', returnedState)

            popup.close()

            if (error) {
              reject(new Error(errorDescription || error))
              return
            }

            if (code && returnedState) {
              resolve({ code, state: returnedState })
            } else {
              reject(new Error('Missing authorization code'))
            }
          }
        } catch {
          // Cross-origin error - popup is still on Microsoft domain, keep polling
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
  },

  /**
   * Handles the OAuth callback - exchanges code for tokens
   */
  async handleCallback(code: string, state: string): Promise<MicrosoftTokenResponse> {
    const storedState = sessionStorage.getItem('ms_oauth_state')
    const verifier = sessionStorage.getItem('ms_oauth_verifier')

    if (state !== storedState) {
      throw new Error('Invalid state parameter - possible CSRF attack')
    }

    if (!verifier) {
      throw new Error('Missing PKCE verifier - please restart the sign-in process')
    }

    // Clean up stored values
    sessionStorage.removeItem('ms_oauth_state')
    sessionStorage.removeItem('ms_oauth_verifier')

    // Exchange code for tokens
    const tokenResponse = await fetch(`${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      })
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      throw new Error(error.error_description || 'Failed to exchange authorization code')
    }

    return tokenResponse.json()
  },

  /**
   * Decodes the ID token to get user info
   */
  parseIdToken(idToken: string): MicrosoftUserInfo {
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format')
    }

    const payload = JSON.parse(atob(parts[1]))
    return {
      email: payload.preferred_username || payload.email || payload.upn || '',
      name: payload.name || payload.given_name || ''
    }
  },

  /**
   * Refreshes an access token using a refresh token
   */
  async refreshToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
    const tokenResponse = await fetch(`${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: SCOPES.join(' ')
      })
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      throw new Error(error.error_description || 'Failed to refresh token')
    }

    return tokenResponse.json()
  }
}

export default MicrosoftOAuthService
