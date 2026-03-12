/**
 * EmailProviderSettingsScreen - Admin-only screen for configuring email provider
 * OAuth credentials per tenant. Providers are displayed in separate tabs.
 */

import React, { useState } from 'react'
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

type ProviderTab = 'microsoft' | 'google' | 'imap_smtp'

const TABS: { key: ProviderTab; label: string }[] = [
  { key: 'microsoft', label: 'Microsoft 365' },
  { key: 'google', label: 'Google / Gmail' },
  { key: 'imap_smtp', label: 'IMAP / SMTP' }
]

const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/platform/mail/oauth/callback` : ''

export const EmailProviderSettingsScreen: React.FC<EmailProviderSettingsScreenProps> = ({
  accessToken,
  'data-testid': testId = 'email-provider-settings'
}) => {
  const { settings, isLoading, error, saveSettings } = useProviderSettings(accessToken)
  const [activeTab, setActiveTab] = useState<ProviderTab>('microsoft')

  const activeSettings = settings.find(s => s.provider === activeTab)

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateTo('/platform/every-office/emails')}
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

      {/* Provider tabs */}
      <div className="gba:border-b gba:bg-card gba:px-6">
        <div className="gba:flex gba:gap-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const providerSettings = settings.find(s => s.provider === tab.key)
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`gba:px-4 gba:py-2.5 gba:text-sm gba:font-medium gba:border-b-2 gba:transition-colors ${
                  isActive
                    ? 'gba:border-primary gba:text-primary'
                    : 'gba:border-transparent gba:text-muted-foreground hover:gba:text-foreground hover:gba:border-muted-foreground/30'
                }`}
                data-testid={`${testId}-tab-${tab.key}`}
              >
                {tab.label}
                {providerSettings?.isEnabled && (
                  <span className="gba:ml-2 gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:inline-block" />
                )}
              </button>
            )
          })}
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

          {!isLoading && activeTab !== 'imap_smtp' && (
            <ProviderSettingsCard
              provider={activeTab}
              existingSettings={activeSettings}
              onSave={saveSettings}
              redirectUri={REDIRECT_URI}
              data-testid={`${testId}-${activeTab}`}
            />
          )}

          {!isLoading && activeTab === 'imap_smtp' && (
            <ImapSmtpSettingsCard
              existingSettings={activeSettings}
              onSave={saveSettings}
              data-testid={`${testId}-imap-smtp`}
            />
          )}

          {/* Setup guide */}
          {!isLoading && <SetupGuide activeTab={activeTab} />}
        </div>
      </div>
    </div>
  )
}

/** Contextual setup guide shown below the active provider tab */
function SetupGuide({ activeTab }: { activeTab: ProviderTab }) {
  const guides: Record<ProviderTab, { title: string; steps: string[] }> = {
    microsoft: {
      title: 'Microsoft Setup Guide',
      steps: [
        'Go to Azure Portal > App Registrations > New registration.',
        'Choose "Web" as the platform type (not SPA) for reliable background sync.',
        'Add the redirect URI shown above in Authentication > Web.',
        'Create a Client Secret under Certificates & secrets.',
        'Enable the required permissions and grant admin consent if needed.',
        'After saving here, users can connect their Microsoft accounts from the Mail app.'
      ]
    },
    google: {
      title: 'Google Setup Guide',
      steps: [
        'Go to Google Cloud Console > APIs & Services > Credentials.',
        'Create an OAuth 2.0 Client ID (Web application type).',
        'Add the redirect URI shown above under Authorized redirect URIs.',
        'Enable the Gmail API in APIs & Services > Library.',
        'Configure the OAuth consent screen with required scopes.',
        'After saving here, users can connect their Google accounts from the Mail app.'
      ]
    },
    imap_smtp: {
      title: 'IMAP / SMTP Setup',
      steps: [
        'No external app registration needed.',
        'Enable this provider to let users connect any email account manually.',
        'Optionally pre-fill default server details so users only need their credentials.',
        'Users will enter their email, password, and server details (if not pre-filled).'
      ]
    }
  }

  const guide = guides[activeTab]

  return (
    <div className="gba:p-4 gba:rounded-lg gba:bg-info-secondary gba:text-info-secondary-foreground">
      <h3 className="gba:font-medium gba:mb-2">{guide.title}</h3>
      <ol className="gba:text-sm gba:space-y-1 gba:list-decimal gba:list-inside">
        {guide.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

export default EmailProviderSettingsScreen
