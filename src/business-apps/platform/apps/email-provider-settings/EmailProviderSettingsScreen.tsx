/**
 * EmailProviderSettingsScreen - Admin-only screen for configuring email provider
 * OAuth credentials per tenant. Providers are displayed in separate tabs.
 */

import React, { useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChevronLeft, Loader2, AlertTriangle, Mail } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useProviderSettings } from './hooks/useProviderSettings'
import { useAssistantPolicySettings } from './hooks/useAssistantPolicySettings'
import { ProviderSettingsCard } from './components/ProviderSettingsCard'
import { ImapSmtpSettingsCard } from './components/ImapSmtpSettingsCard'
import { AssistantPolicyCard } from './components/AssistantPolicyCard'
import translations from './_i18n'

export interface EmailProviderSettingsScreenProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type ProviderTab = 'microsoft' | 'google' | 'imap_smtp' | 'assistant_policy'

const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/platform/mail/oauth/callback` : ''

export const EmailProviderSettingsScreen: React.FC<EmailProviderSettingsScreenProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'email-provider-settings'
}) => {
  const { t } = useTranslation(translations)
  const { settings, isLoading, error, errorFallbackKey, saveSettings } = useProviderSettings(accessToken)
  const {
    policy,
    isLoading: isPolicyLoading,
    isSaving: isPolicySaving,
    error: policyError,
    errorFallbackKey: policyErrorFallbackKey,
    savePolicy
  } = useAssistantPolicySettings(accessToken)
  const [activeTab, setActiveTab] = useState<ProviderTab>('microsoft')
  const tabs: { key: ProviderTab; label: string }[] = useMemo(
    () => [
      { key: 'microsoft', label: t('tab-microsoft') },
      { key: 'google', label: t('tab-google') },
      { key: 'imap_smtp', label: t('tab-imap-smtp') },
      { key: 'assistant_policy', label: t('tab-assistant-policy') }
    ],
    [t]
  )
  const isAdminUser = Boolean(
    (userInfo as { role?: string; roles?: string[] } | undefined)?.role === 'admin' ||
      (userInfo as { role?: string; roles?: string[] } | undefined)?.roles?.includes('admin')
  )
  const visibleTabs = isAdminUser ? tabs : tabs.filter(tab => tab.key !== 'assistant_policy')
  const displayedError =
    error ||
    policyError ||
    (errorFallbackKey ? t(errorFallbackKey) : null) ||
    (policyErrorFallbackKey ? t(policyErrorFallbackKey) : null)

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
            aria-label={t('back-button-label')}
          >
            <ChevronLeft className="gba:w-5 gba:h-5" />
          </Button>

          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary gba:flex gba:items-center gba:justify-center">
              <Mail className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
            </div>
            <div>
              <h1 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('screen-title')}</h1>
              <p className="gba:text-sm gba:text-muted-foreground">{t('screen-description')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="gba:border-b gba:bg-card gba:px-6">
        <div className="gba:flex gba:gap-1">
          {visibleTabs.map(tab => {
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
                {providerSettings?.isEnabled && tab.key !== 'assistant_policy' && (
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

          {displayedError && (
            <div className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:rounded-lg gba:bg-destructive-secondary gba:text-destructive-secondary-foreground">
              <AlertTriangle className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
              <p className="gba:text-sm">{displayedError}</p>
            </div>
          )}

          {!isLoading && activeTab !== 'imap_smtp' && activeTab !== 'assistant_policy' && (
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

          {!isPolicyLoading && activeTab === 'assistant_policy' && (
            <AssistantPolicyCard
              policy={policy}
              isSaving={isPolicySaving}
              onSave={savePolicy}
              data-testid={`${testId}-assistant-policy`}
            />
          )}

          {!isLoading && activeTab !== 'assistant_policy' && <SetupGuide activeTab={activeTab} />}
        </div>
      </div>
    </div>
  )
}

/** Contextual setup guide shown below the active provider tab */
function SetupGuide({ activeTab }: { activeTab: ProviderTab }) {
  const { t } = useTranslation(translations)
  const guides: Record<Exclude<ProviderTab, 'assistant_policy'>, { title: string; steps: string[] }> = {
    microsoft: {
      title: t('setup-guide-microsoft-title'),
      steps: [
        t('setup-guide-microsoft-step-1'),
        t('setup-guide-microsoft-step-2'),
        t('setup-guide-microsoft-step-3'),
        t('setup-guide-microsoft-step-4'),
        t('setup-guide-microsoft-step-5'),
        t('setup-guide-microsoft-step-6')
      ]
    },
    google: {
      title: t('setup-guide-google-title'),
      steps: [
        t('setup-guide-google-step-1'),
        t('setup-guide-google-step-2'),
        t('setup-guide-google-step-3'),
        t('setup-guide-google-step-4'),
        t('setup-guide-google-step-5'),
        t('setup-guide-google-step-6')
      ]
    },
    imap_smtp: {
      title: t('setup-guide-imap-smtp-title'),
      steps: [
        t('setup-guide-imap-smtp-step-1'),
        t('setup-guide-imap-smtp-step-2'),
        t('setup-guide-imap-smtp-step-3'),
        t('setup-guide-imap-smtp-step-4')
      ]
    }
  }

  const guide = guides[activeTab as Exclude<ProviderTab, 'assistant_policy'>]

  return (
    <div className="gba:p-4 gba:rounded-lg gba:bg-info-secondary gba:text-info-secondary-foreground">
      <h3 className="gba:font-medium gba:mb-2">{guide.title}</h3>
      <ol className="gba:text-sm gba:space-y-1 gba:list-decimal gba:list-inside">
        {guide.steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

export default EmailProviderSettingsScreen
