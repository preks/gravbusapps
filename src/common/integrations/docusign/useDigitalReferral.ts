import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/common/env/EnvUtils'

export type DigitalReferralPayload = {
  contactEmail?: string
  contactFirstName?: string
  contactLastName?: string
  contactPhone?: string
}

export type DigitalReferralResult = {
  success: boolean
}

type ReferralOptions = {
  onActivation?: (details: { returnTo: string }) => void
}

interface UseDigitalReferralResult {
  submitReferral: (payload: DigitalReferralPayload, options?: ReferralOptions) => Promise<DigitalReferralResult>
  viewPlans: () => Promise<void>
  isSubmitting: boolean
  scriptReady: boolean
  scriptError: string | null
}

const DIGITAL_REFERRAL_SCRIPT_SRC = 'https://www.docusign.com/scripts/ds-digital-signup.js'
const DIGITAL_REFERRAL_REDIRECT_PATH = '/platform/docusign/referral-complete'
const DEFAULT_RETURN_TO = '/platform/use'

export const useDigitalReferral = (): UseDigitalReferralResult => {
  const [scriptReady, setScriptReady] = useState<boolean>(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const loaderPromiseRef = useRef<Promise<void> | null>(null)

  const loadScript = useCallback(() => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Digital referrals can only be started in the browser'))
    }

    if (window.DSDigitalSignup) {
      setScriptReady(true)
      return Promise.resolve()
    }

    if (loaderPromiseRef.current) {
      return loaderPromiseRef.current
    }

    loaderPromiseRef.current = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-docusign-digital-referral]')

      const script = existing ?? document.createElement('script')
      const handleLoad = () => {
        setScriptReady(true)
        resolve()
      }
      const handleError = () => {
        const message = 'Failed to load DocuSign Digital Referral SDK'
        setScriptError(message)
        reject(new Error(message))
      }

      script.addEventListener('load', handleLoad, { once: true })
      script.addEventListener('error', handleError, { once: true })

      if (!existing) {
        script.src = DIGITAL_REFERRAL_SCRIPT_SRC
        script.async = true
        script.dataset.docusignDigitalReferral = 'true'
        document.body.appendChild(script)
      }
    })

    return loaderPromiseRef.current
  }, [])

  useEffect(() => {
    loadScript().catch(() => {
      // errors are captured via scriptError state
    })
  }, [loadScript])

  const submitReferral = useCallback(
    async (payload: DigitalReferralPayload, options?: ReferralOptions): Promise<DigitalReferralResult> => {
      await loadScript()
      const sdk = window.DSDigitalSignup
      if (!sdk?.startSignup) {
        throw new Error('DocuSign Digital Referral SDK is unavailable')
      }

      const partnerIK = env('NEXT_PUBLIC_DOCUSIGN_CLIENT_ID')
      if (!partnerIK) {
        throw new Error('NEXT_PUBLIC_DOCUSIGN_CLIENT_ID is not configured')
      }
      const returnTo = buildReturnTo()
      const loginRedirectUri = buildRedirectUrl(returnTo)

      if (sdk.registerSignupActivationCallback) {
        sdk.registerSignupActivationCallback(() => {
          options?.onActivation?.({ returnTo })
        }, true)
      }

      setIsSubmitting(true)
      try {
        sdk.startSignup(
          payload.contactFirstName?.trim() || '',
          payload.contactLastName?.trim() || '',
          payload.contactEmail?.trim() || '',
          payload.contactPhone?.trim() || '',
          partnerIK,
          loginRedirectUri,
          'en-us'
        )

        return { success: true }
      } finally {
        setIsSubmitting(false)
      }
    },
    [loadScript]
  )

  const viewPlans = useCallback(async () => {
    await loadScript()
    const sdk = window.DSDigitalSignup
    if (!sdk?.viewPlans) {
      throw new Error('DocuSign Digital Referral SDK is unavailable')
    }
    const partnerIK = env('NEXT_PUBLIC_DOCUSIGN_CLIENT_ID')
    if (!partnerIK) {
      throw new Error('NEXT_PUBLIC_DOCUSIGN_CLIENT_ID is not configured')
    }
    const loginRedirectUri = buildRedirectUrl(DEFAULT_RETURN_TO)
    sdk.viewPlans(partnerIK, loginRedirectUri, 'en')
  }, [loadScript])

  return {
    submitReferral,
    viewPlans,
    isSubmitting,
    scriptReady,
    scriptError
  }
}

function buildReturnTo(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_RETURN_TO
  }
  try {
    const path = window.location.pathname + window.location.search + window.location.hash
    return path.startsWith('/') ? path : DEFAULT_RETURN_TO
  } catch {
    return DEFAULT_RETURN_TO
  }
}

function buildRedirectUrl(returnTo: string): string {
  if (typeof window === 'undefined') {
    return DIGITAL_REFERRAL_REDIRECT_PATH
  }
  const origin = window.location.origin || ''
  return `${origin}${DIGITAL_REFERRAL_REDIRECT_PATH}?returnTo=${encodeURIComponent(returnTo)}`
}

export default useDigitalReferral
