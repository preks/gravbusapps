/**
 * MicrosoftOAuthService
 *
 * Handles Microsoft OAuth2 authorization flow with PKCE for SPAs.
 * The frontend obtains an authorization code and sends it to the backend
 * (document-service) for server-side token exchange (confidential client).
 *
 * The hardcoded FALLBACK_CLIENT_ID is used only when no tenant-specific
 * settings have been configured. It provides backwards compatibility but
 * may not support reliable background sync (SPA client limitation).
 */

const FALLBACK_CLIENT_ID = '861b3af1-129e-4674-9f0e-4fb4a3091fc0'
const DEFAULT_AUTHORITY = 'organizations'
const DEFAULT_SCOPES = 'openid profile email offline_access Mail.Read Mail.Send'

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
   * Builds the OAuth config from tenant settings (if provided) or falls back to defaults.
   */
  buildConfig(tenantConfig?: { clientId?: string; authority?: string; scopes?: string }): MicrosoftOAuthConfig {
    return {
      clientId: tenantConfig?.clientId || FALLBACK_CLIENT_ID,
      authority: tenantConfig?.authority || DEFAULT_AUTHORITY,
      scopes: tenantConfig?.scopes || DEFAULT_SCOPES
    }
  },

  /**
   * Initiates the OAuth flow using a popup window.
   * Returns the authorization code and PKCE verifier for backend exchange.
   */
  async startAuth(config: MicrosoftOAuthConfig): Promise<MicrosoftAuthResult> {
    const { verifier, challenge } = await generatePKCE()
    const state = generateRandomString(32)
    const redirectUri = `${window.location.origin}/platform/mail/oauth/callback`

    // Store verifier and state for callback validation
    sessionStorage.setItem('ms_oauth_verifier', verifier)
    sessionStorage.setItem('ms_oauth_state', state)

    const authorityUrl = `https://login.microsoftonline.com/${config.authority}`

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: config.scopes,
      response_mode: 'query',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account'
    })

    const authUrl = `${authorityUrl}/oauth2/v2.0/authorize?${params.toString()}`

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
            const errorDescription = url.searchParams.get('error_description')

            popup.close()

            if (error) {
              reject(new Error(errorDescription || error))
              return
            }

            // Validate state
            const storedState = sessionStorage.getItem('ms_oauth_state')
            if (returnedState !== storedState) {
              reject(new Error('Invalid state parameter'))
              return
            }

            // Clean up session storage
            sessionStorage.removeItem('ms_oauth_state')
            sessionStorage.removeItem('ms_oauth_verifier')

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
  }
}

export default MicrosoftOAuthService
