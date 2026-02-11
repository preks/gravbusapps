/**
 * EmailEmptyState - Shown when user has no email accounts connected.
 * Guides the user to connect their first email account.
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Mail, Plus, Shield, Zap, ArrowRight } from 'lucide-react'

interface EmailEmptyStateProps {
  onAddAccount: () => void
  'data-testid'?: string
}

export const EmailEmptyState: React.FC<EmailEmptyStateProps> = ({
  onAddAccount,
  'data-testid': testId = 'email-empty'
}) => {
  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-6" data-testid={testId}>
      <div className="gba:max-w-md gba:text-center">
        {/* Icon */}
        <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-6">
          <Mail className="gba:w-12 gba:h-12 gba:text-primary" />
        </div>

        <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-3">Welcome to NEWWORK Mail</h2>
        <p className="gba:text-muted-foreground gba:mb-8 gba:leading-relaxed">
          Connect your email account to send and receive messages, track conversations, and integrate with your CRM,
          calendar, and more.
        </p>

        {/* Features */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-8">
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <Zap className="gba:w-5 gba:h-5 gba:text-foreground" />
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">Outlook & Gmail</p>
          </div>
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <Shield className="gba:w-5 gba:h-5 gba:text-foreground" />
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">Secure sync</p>
          </div>
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <ArrowRight className="gba:w-5 gba:h-5 gba:text-foreground" />
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">CRM integration</p>
          </div>
        </div>

        <Button onClick={onAddAccount} size="lg" data-testid={`${testId}-add-account`}>
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Connect email account
        </Button>
      </div>
    </div>
  )
}
