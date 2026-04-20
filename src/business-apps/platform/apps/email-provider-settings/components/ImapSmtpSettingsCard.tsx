/**
 * ImapSmtpSettingsCard - Admin card to enable/disable generic IMAP/SMTP
 * and optionally pre-fill default server settings for users.
 */

import React, { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import { Server, Save, Loader2 } from 'lucide-react'
import type {
  AdminProviderConfig,
  UpsertProviderSettingsRequest
} from '../../email-apps/services/EmailProviderSettingsApi'
import translations from '../_i18n'

interface ImapSmtpSettingsCardProps {
  existingSettings?: AdminProviderConfig
  onSave: (data: UpsertProviderSettingsRequest) => Promise<void>
  'data-testid'?: string
}

export const ImapSmtpSettingsCard: React.FC<ImapSmtpSettingsCardProps> = ({
  existingSettings,
  onSave,
  'data-testid': testId = 'provider-card-imap-smtp'
}) => {
  const { t } = useTranslation(translations)
  const [isEnabled, setIsEnabled] = useState(existingSettings?.isEnabled ?? true)
  const [defaultImapHost, setDefaultImapHost] = useState(
    (existingSettings?.publicConfig?.defaultImapHost as string) || ''
  )
  const [defaultImapPort, setDefaultImapPort] = useState(
    (existingSettings?.publicConfig?.defaultImapPort as string) || '993'
  )
  const [defaultSmtpHost, setDefaultSmtpHost] = useState(
    (existingSettings?.publicConfig?.defaultSmtpHost as string) || ''
  )
  const [defaultSmtpPort, setDefaultSmtpPort] = useState(
    (existingSettings?.publicConfig?.defaultSmtpPort as string) || '587'
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const data: UpsertProviderSettingsRequest = {
        provider: 'imap_smtp',
        publicConfig: {
          ...(defaultImapHost.trim() ? { defaultImapHost: defaultImapHost.trim() } : {}),
          ...(defaultImapPort.trim() ? { defaultImapPort: defaultImapPort.trim() } : {}),
          ...(defaultSmtpHost.trim() ? { defaultSmtpHost: defaultSmtpHost.trim() } : {}),
          ...(defaultSmtpPort.trim() ? { defaultSmtpPort: defaultSmtpPort.trim() } : {})
        },
        isEnabled
      }

      await onSave(data)
      toast.success(t('imap-toast-settings-saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('provider-toast-save-failed'))
    } finally {
      setIsSaving(false)
    }
  }, [defaultImapHost, defaultImapPort, defaultSmtpHost, defaultSmtpPort, isEnabled, onSave, t])

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Server className="gba:w-6 gba:h-6 gba:text-primary" />
            <div>
              <CardTitle>{t('imap-card-title')}</CardTitle>
              <CardDescription>{t('imap-card-description')}</CardDescription>
            </div>
          </div>
          {existingSettings && (
            <Badge variant={existingSettings.isEnabled ? 'success' : 'secondary'}>
              {existingSettings.isEnabled ? t('common-enabled') : t('common-disabled')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <input
            type="checkbox"
            id={`${testId}-enabled`}
            checked={isEnabled}
            onChange={e => setIsEnabled(e.target.checked)}
            className="gba:w-4 gba:h-4"
            data-testid={`${testId}-enabled`}
          />
          <Label htmlFor={`${testId}-enabled`}>{t('imap-label-enable-provider')}</Label>
        </div>

        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('imap-defaults-title')}</p>
          <p className="gba:text-xs gba:text-muted-foreground">{t('imap-defaults-description')}</p>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-imap-host`}>{t('imap-label-imap-host')}</Label>
            <Input
              id={`${testId}-imap-host`}
              value={defaultImapHost}
              onChange={e => setDefaultImapHost(e.target.value)}
              placeholder={t('imap-placeholder-imap-host')}
              data-testid={`${testId}-imap-host`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-imap-port`}>{t('imap-label-imap-port')}</Label>
            <Input
              id={`${testId}-imap-port`}
              value={defaultImapPort}
              onChange={e => setDefaultImapPort(e.target.value)}
              placeholder={t('imap-placeholder-imap-port')}
              data-testid={`${testId}-imap-port`}
            />
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-smtp-host`}>{t('imap-label-smtp-host')}</Label>
            <Input
              id={`${testId}-smtp-host`}
              value={defaultSmtpHost}
              onChange={e => setDefaultSmtpHost(e.target.value)}
              placeholder={t('imap-placeholder-smtp-host')}
              data-testid={`${testId}-smtp-host`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-smtp-port`}>{t('imap-label-smtp-port')}</Label>
            <Input
              id={`${testId}-smtp-port`}
              value={defaultSmtpPort}
              onChange={e => setDefaultSmtpPort(e.target.value)}
              placeholder={t('imap-placeholder-smtp-port')}
              data-testid={`${testId}-smtp-port`}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
          {isSaving ? (
            <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
          ) : (
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
          )}
          {t('imap-button-save-settings')}
        </Button>
      </CardFooter>
    </Card>
  )
}
