/**
 * MicrosoftOAuthCallback - Handles the OAuth redirect from Microsoft/Google.
 *
 * After the redirect flow, this component extracts the authorization code
 * (from URL params or sessionStorage) and sends it to the backend for exchange.
 */

import React, { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { EmailProviderSettingsApi } from '../services/EmailProviderSettingsApi'

interface MicrosoftOAuthCallbackProps {
  onSuccess: () => void
  onError: (error: string) => void
  accessToken: string | null
}

export const MicrosoftOAuthCallback: React.FC<MicrosoftOAuthCallbackProps> = ({ onSuccess, onError, accessToken }) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Check for error in URL
    const error = params.get('error')
    const errorDescription = params.get('error_description')
    if (error) {
      setStatus('error')
      setErrorMessage(errorDescription || error)
      onError(errorDescription || error)
      return
    }

    // Get code from URL params OR from sessionStorage (captured by IIFE before platform strips params)
    const code = params.get('code') || sessionStorage.getItem('ms_oauth_code')

    if (!code) {
      // No code, no error — redirect back
      onSuccess()
      window.history.replaceState({}, '', '/platform/mail')
      return
    }

    // Perform the code exchange
    const performExchange = async () => {
      try {
        // Get PKCE verifier from sessionStorage (stored before redirect)
        const codeVerifier =
          sessionStorage.getItem('ms_oauth_verifier') || sessionStorage.getItem('google_oauth_verifier')

        if (!codeVerifier) {
          throw new Error('Missing PKCE verifier. Please try signing in again.')
        }

        // Validate state
        const returnedState = params.get('state') || sessionStorage.getItem('ms_oauth_callback_state')
        const storedState = sessionStorage.getItem('ms_oauth_state') || sessionStorage.getItem('google_oauth_state')

        if (storedState && returnedState && storedState !== returnedState) {
          throw new Error('Invalid state parameter. Please try signing in again.')
        }

        const redirectUri = `${window.location.origin}/platform/mail/oauth/callback`

        if (accessToken) {
          EmailProviderSettingsApi.setAccessToken(accessToken)
        }

        // Determine provider from stored session keys
        const isMicrosoft = !!sessionStorage.getItem('ms_oauth_verifier')

        if (isMicrosoft) {
          await EmailProviderSettingsApi.exchangeMicrosoftCode({
            code,
            codeVerifier,
            redirectUri
          })
        } else {
          await EmailProviderSettingsApi.exchangeGoogleCode({
            code,
            codeVerifier,
            redirectUri
          })
        }

        // Clean up all OAuth session storage
        sessionStorage.removeItem('ms_oauth_verifier')
        sessionStorage.removeItem('ms_oauth_state')
        sessionStorage.removeItem('ms_oauth_code')
        sessionStorage.removeItem('ms_oauth_callback_state')
        sessionStorage.removeItem('google_oauth_verifier')
        sessionStorage.removeItem('google_oauth_state')

        setStatus('success')

        // Redirect to mail after a short delay so user sees success
        setTimeout(() => {
          onSuccess()
          window.history.replaceState({}, '', '/platform/mail')
        }, 1500)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to connect email account'
        setStatus('error')
        setErrorMessage(msg)
        onError(msg)

        // Clean up session storage on error too
        sessionStorage.removeItem('ms_oauth_verifier')
        sessionStorage.removeItem('ms_oauth_state')
        sessionStorage.removeItem('ms_oauth_code')
        sessionStorage.removeItem('ms_oauth_callback_state')
        sessionStorage.removeItem('google_oauth_verifier')
        sessionStorage.removeItem('google_oauth_state')

        // Redirect back after showing error
        setTimeout(() => {
          window.history.replaceState({}, '', '/platform/mail')
        }, 4000)
      }
    }

    performExchange()
  }, [onSuccess, onError, accessToken])

  if (status === 'success') {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[300px] gba:p-8">
        <CheckCircle className="gba:w-12 gba:h-12 gba:text-success gba:mb-4" />
        <p className="gba:text-lg gba:font-medium gba:text-foreground">Email account connected!</p>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Redirecting to your inbox...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[300px] gba:p-8">
        <XCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mb-4" />
        <p className="gba:text-lg gba:font-medium gba:text-foreground">Sign-in failed</p>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">{errorMessage}</p>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-4">Redirecting back...</p>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[300px] gba:p-8">
      <Loader2 className="gba:w-12 gba:h-12 gba:animate-spin gba:text-primary gba:mb-4" />
      <p className="gba:text-lg gba:font-medium gba:text-foreground">Connecting your email account...</p>
      <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Please wait while we complete the sign-in.</p>
    </div>
  )
}

export default MicrosoftOAuthCallback
