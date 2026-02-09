/**
 * MicrosoftOAuthCallback - Handles the OAuth redirect from Microsoft.
 * Exchanges the authorization code for tokens and creates the email account.
 */

import React, { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { MicrosoftOAuthService } from '../services/MicrosoftOAuthService'
import { EmailApiService } from '../services/EmailApiService'

interface MicrosoftOAuthCallbackProps {
  onSuccess: () => void
  onError: (error: string) => void
  accessToken: string | null
}

type CallbackStatus = 'processing' | 'success' | 'error'

export const MicrosoftOAuthCallback: React.FC<MicrosoftOAuthCallbackProps> = ({ onSuccess, onError, accessToken }) => {
  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [message, setMessage] = useState('Processing Microsoft sign-in...')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get code and state from URL (check query params, hash fragment, AND sessionStorage)
        let params = new URLSearchParams(window.location.search)
        let code = params.get('code')
        let state = params.get('state')
        let error = params.get('error')
        let errorDescription = params.get('error_description')

        // If not in query params, check hash fragment
        if (!code && window.location.hash) {
          console.log('[MicrosoftOAuthCallback] Checking hash fragment:', window.location.hash)
          params = new URLSearchParams(window.location.hash.substring(1))
          code = params.get('code')
          state = params.get('state')
          error = params.get('error')
          errorDescription = params.get('error_description')
        }

        // If still not found, check sessionStorage (platform may have stripped URL params)
        if (!code) {
          console.log('[MicrosoftOAuthCallback] Checking sessionStorage for OAuth params')
          const savedCode = sessionStorage.getItem('ms_oauth_code')
          const savedState = sessionStorage.getItem('ms_oauth_callback_state')
          if (savedCode && savedState) {
            console.log('[MicrosoftOAuthCallback] Found OAuth params in sessionStorage!')
            code = savedCode
            state = savedState
            // Clear them after use
            sessionStorage.removeItem('ms_oauth_code')
            sessionStorage.removeItem('ms_oauth_callback_state')
          }
        }

        console.log('[MicrosoftOAuthCallback] Code:', code ? 'present' : 'missing')
        console.log('[MicrosoftOAuthCallback] State:', state ? 'present' : 'missing')

        if (error) {
          throw new Error(errorDescription || error)
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter')
        }

        setMessage('Exchanging authorization code...')

        // Exchange code for tokens
        const tokens = await MicrosoftOAuthService.handleCallback(code, state)

        setMessage('Getting user information...')

        // Parse user info from ID token
        const userInfo = tokens.id_token ? MicrosoftOAuthService.parseIdToken(tokens.id_token) : { email: '', name: '' }

        if (!userInfo.email) {
          throw new Error('Could not get email address from Microsoft account')
        }

        setMessage('Setting up email account...')

        // We have the Keycloak access token, create the account directly
        if (accessToken) {
          console.log('[MicrosoftOAuthCallback] Creating account directly with accessToken')
          EmailApiService.setAccessToken(accessToken)

          try {
            const account = await EmailApiService.createAccount({
              displayName: userInfo.name || userInfo.email.split('@')[0],
              emailAddress: userInfo.email,
              provider: 'microsoft',
              imapHost: 'outlook.office365.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp.office365.com',
              smtpPort: 587,
              smtpSecure: false,
              oauthAccessToken: tokens.access_token,
              oauthRefreshToken: tokens.refresh_token,
              oauthProviderConfig: {
                clientId: MicrosoftOAuthService.getClientId(),
                tenantId: 'organizations'
              },
              isDefault: true
            })

            console.log('[MicrosoftOAuthCallback] Account created successfully:', account.id)
            setStatus('success')
            setMessage('Email account connected successfully!')

            // Redirect after short delay
            setTimeout(() => {
              onSuccess()
            }, 1500)
          } catch (createError) {
            console.error('[MicrosoftOAuthCallback] Failed to create account:', createError)
            throw createError
          }
        } else {
          // No Keycloak token yet - store data for later processing
          console.log('[MicrosoftOAuthCallback] No accessToken, storing for later')
          const oauthData = {
            email: userInfo.email,
            name: userInfo.name,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token
          }
          sessionStorage.setItem('ms_oauth_pending', JSON.stringify(oauthData))

          setStatus('success')
          setMessage('Microsoft sign-in successful!')

          setTimeout(() => {
            onSuccess()
          }, 1000)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setStatus('error')
        setMessage('Failed to connect email account')
        setErrorDetail(errorMessage)
        onError(errorMessage)
      }
    }

    processCallback()
  }, [accessToken, onSuccess, onError])

  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[300px] gba:p-8">
      {status === 'processing' && (
        <>
          <Loader2 className="gba:w-12 gba:h-12 gba:animate-spin gba:text-primary gba:mb-4" />
          <p className="gba:text-lg gba:font-medium gba:text-foreground">{message}</p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
            Please wait while we set up your email account...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="gba:w-12 gba:h-12 gba:text-success gba:mb-4" />
          <p className="gba:text-lg gba:font-medium gba:text-foreground">{message}</p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Redirecting to your inbox...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mb-4" />
          <p className="gba:text-lg gba:font-medium gba:text-foreground">{message}</p>
          {errorDetail && (
            <p className="gba:text-sm gba:text-destructive gba:mt-2 gba:text-center gba:max-w-md">{errorDetail}</p>
          )}
          <Button variant="outline" className="gba:mt-4" onClick={() => (window.location.href = '/platform/mail')}>
            Go back to email
          </Button>
        </>
      )}
    </div>
  )
}

export default MicrosoftOAuthCallback
