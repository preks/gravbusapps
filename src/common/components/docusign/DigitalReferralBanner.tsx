import React from 'react'
import { Alert, AlertDescription, AlertTitle, Button } from '@newwork/nw-design-system'

type DigitalReferralBannerProps = {
  onStartReferral: () => void
  className?: string
}

export const DigitalReferralBanner: React.FC<DigitalReferralBannerProps> = ({ onStartReferral, className }) => {
  return (
    <Alert className={`gba:flex gba:flex-col gba:gap-2 ${className || ''}`}>
      <AlertTitle className="gba:text-sm gba:font-semibold">Need a DocuSign account?</AlertTitle>
      <AlertDescription className="gba:text-sm gba:text-muted-foreground">
        DocuSign requires every signer to authenticate with their own account. Launch a DocuSign trial without leaving
        the task flow, then return to finish connecting your envelope.
      </AlertDescription>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
        <Button size="sm" onClick={onStartReferral} data-testid="docusign-referral-banner-button">
          Start DocuSign trial
        </Button>
        <span className="gba:text-xs gba:text-muted-foreground">Free trial • No credit card required</span>
      </div>
    </Alert>
  )
}

export default DigitalReferralBanner
