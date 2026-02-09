/**
 * EmailProviderSettingsScreen - Admin-only screen for configuring email provider
 * OAuth credentials per tenant. Admins configure Microsoft and Google here;
 * regular users never see this screen.
 */

import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { ChevronLeft, Loader2, AlertTriangle, Mail } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useProviderSettings } from './hooks/useProviderSettings'
import { ProviderSettingsCard } from './components/ProviderSettingsCard'
import { ImapSmtpSettingsCard } from './components/ImapSmtpSettingsCard'

export interface EmailProviderSettingsScreenProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/platform/mail/oauth/callback` : ''

export const EmailProviderSettingsScreen: React.FC<EmailProviderSettingsScreenProps> = ({
  accessToken,
  'data-testid': testId = 'email-provider-settings'
}) => {
  const { settings, isLoading, error, saveSettings } = useProviderSettings(accessToken)

  const microsoftSettings = settings.find(s => s.provider === 'microsoft')
  const googleSettings = settings.find(s => s.provider === 'google')
  const imapSettings = settings.find(s => s.provider === 'imap_smtp')

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateTo('/platform/mail')}
            data-testid={`${testId}-back`}
          >
            <ChevronLeft className="gba:w-5 gba:h-5" />
          </Button>

          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary gba:flex gba:items-center gba:justify-center">
              <Mail className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
            </div>
            <div>
              <h1 className="gba:text-lg gba:font-semibold gba:text-foreground">Email Provider Settings</h1>
              <p className="gba:text-sm gba:text-muted-foreground">
                Configure OAuth credentials so users can connect their email accounts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
        <div className="gba:max-w-3xl gba:mx-auto gba:space-y-6">
          {isLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <Loader2 className="gba:w-6 gba:h-6 gba:animate-spin gba:text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:rounded-lg gba:bg-destructive-secondary gba:text-destructive-secondary-foreground">
              <AlertTriangle className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
              <p className="gba:text-sm">{error}</p>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Microsoft settings card */}
              <ProviderSettingsCard
                provider="microsoft"
                existingSettings={microsoftSettings}
                onSave={saveSettings}
                redirectUri={REDIRECT_URI}
                data-testid={`${testId}-microsoft`}
              />

              {/* Google settings card */}
              <ProviderSettingsCard
                provider="google"
                existingSettings={googleSettings}
                onSave={saveSettings}
                redirectUri={REDIRECT_URI}
                data-testid={`${testId}-google`}
              />

              {/* IMAP/SMTP settings card */}
              <ImapSmtpSettingsCard
                existingSettings={imapSettings}
                onSave={saveSettings}
                data-testid={`${testId}-imap-smtp`}
              />

              {/* Help section */}
              <div className="gba:p-4 gba:rounded-lg gba:bg-info-secondary gba:text-info-secondary-foreground">
                <h3 className="gba:font-medium gba:mb-2">Setup Guide</h3>
                <ul className="gba:text-sm gba:space-y-1 gba:list-disc gba:list-inside">
                  <li>
                    <strong>Microsoft:</strong> Register a Web application (not SPA) in Azure Portal for reliable
                    background sync. Add the redirect URI shown above.
                  </li>
                  <li>
                    <strong>Google:</strong> Create OAuth credentials in Google Cloud Console. Enable the Gmail API. Add
                    the redirect URI shown above.
                  </li>
                  <li>
                    <strong>IMAP/SMTP:</strong> No external setup needed. Enable it to let users connect any email
                    account manually. Optionally pre-fill default server details.
                  </li>
                  <li>After saving, users can connect their accounts from the Mail app.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailProviderSettingsScreen
