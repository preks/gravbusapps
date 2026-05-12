import React from 'react'
import { Spinner } from '@newwork/nw-design-system'

export type WizardFooterAction = 'cancel' | 'save' | 'next'

interface WizardFooterButtonContentProps {
  isPending: boolean
  children: React.ReactNode
}

const WizardFooterButtonContent: React.FC<WizardFooterButtonContentProps> = ({ isPending, children }) => {
  if (!isPending) {
    return <>{children}</>
  }

  return (
    <span className="gba:inline-flex gba:items-center gba:gap-2">
      <Spinner size="sm" />
      {children}
    </span>
  )
}

export default WizardFooterButtonContent
