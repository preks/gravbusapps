/**
 * MicrosoftOAuthCallback - Handles the OAuth redirect from Microsoft/Google.
 * In the popup flow, this page is loaded inside the popup window.
 * The parent window polls for the redirect URL and extracts the code.
 *
 * If the user lands on this page directly (non-popup redirect), we display
 * a message and redirect them back to the mail app.
 */

import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface MicrosoftOAuthCallbackProps {
  onSuccess: () => void
  onError: (error: string) => void
  accessToken: string | null
}

export const MicrosoftOAuthCallback: React.FC<MicrosoftOAuthCallbackProps> = ({ onSuccess, onError }) => {
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    // Check for error in URL params
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      onError(errorDescription || error)
      return
    }

    // If we have a code, the popup parent should pick it up.
    // If we're not in a popup, redirect to mail.
    const code = params.get('code')

    if (code) {
      // Give the parent window time to read our URL
      const timer = setTimeout(() => {
        // If we're still here after 3s, we're probably not in a popup
        setIsRedirecting(false)
        onSuccess()
        window.history.replaceState({}, '', '/platform/mail')
      }, 3000)

      return () => clearTimeout(timer)
    }

    // No code, no error — redirect back
    setIsRedirecting(false)
    window.history.replaceState({}, '', '/platform/mail')
    onSuccess()
  }, [onSuccess, onError])

  if (!isRedirecting) {
    return null
  }

  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[300px] gba:p-8">
      <Loader2 className="gba:w-12 gba:h-12 gba:animate-spin gba:text-primary gba:mb-4" />
      <p className="gba:text-lg gba:font-medium gba:text-foreground">Processing sign-in...</p>
      <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">This window will close automatically.</p>
    </div>
  )
}

export default MicrosoftOAuthCallback
