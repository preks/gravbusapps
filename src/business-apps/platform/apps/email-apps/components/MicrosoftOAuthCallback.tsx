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
        // Get code and state from URL
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')
        const error = params.get('error')
        const errorDescription = params.get('error_description')

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

        // Store the OAuth data in sessionStorage for after Keycloak auth completes
        // We can't create the account yet without a Keycloak token for our backend
        const oauthData = {
          email: userInfo.email,
          name: userInfo.name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token
        }
        console.log('[MicrosoftOAuthCallback] Storing OAuth data for:', userInfo.email)
        sessionStorage.setItem('ms_oauth_pending', JSON.stringify(oauthData))

        // Verify it was stored
        const storedData = sessionStorage.getItem('ms_oauth_pending')
        console.log('[MicrosoftOAuthCallback] Verified stored data:', storedData ? 'yes' : 'no')

        setStatus('success')
        setMessage('Microsoft sign-in successful!')

        // Redirect to clean URL - Keycloak will then authenticate, and email app will create account
        setTimeout(() => {
          onSuccess()
        }, 1000)
        return

        // Note: The code below is for when we have Keycloak token available
        // Set access token for API calls
        if (accessToken) {
          EmailApiService.setAccessToken(accessToken)
        } else {
          // No Keycloak token - store data and redirect
          return
        }

        // Create the email account with OAuth tokens (only if we have Keycloak auth)
        await EmailApiService.createAccount({
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
          isDefault: true
        })

        setStatus('success')
        setMessage('Email account connected successfully!')

        // Redirect after short delay
        setTimeout(() => {
          onSuccess()
        }, 1500)
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
