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
  Badge
} from '@newwork/nw-design-system'
import { Server, Save, Loader2 } from 'lucide-react'
import type {
  AdminProviderConfig,
  UpsertProviderSettingsRequest
} from '../../email-apps/services/EmailProviderSettingsApi'

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
      toast.success('IMAP/SMTP settings saved successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }, [defaultImapHost, defaultImapPort, defaultSmtpHost, defaultSmtpPort, isEnabled, onSave])

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Server className="gba:w-6 gba:h-6 gba:text-primary" />
            <div>
              <CardTitle>IMAP / SMTP (Generic)</CardTitle>
              <CardDescription>
                Allow users to connect any email account via IMAP/SMTP. Optionally set default server details so users
                only need to enter their credentials.
              </CardDescription>
            </div>
          </div>
          {existingSettings && (
            <Badge variant={existingSettings.isEnabled ? 'success' : 'secondary'}>
              {existingSettings.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        {/* Enable/Disable toggle */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <input
            type="checkbox"
            id={`${testId}-enabled`}
            checked={isEnabled}
            onChange={e => setIsEnabled(e.target.checked)}
            className="gba:w-4 gba:h-4"
            data-testid={`${testId}-enabled`}
          />
          <Label htmlFor={`${testId}-enabled`}>Enable IMAP/SMTP for users</Label>
        </div>

        {/* Default server settings (optional) */}
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Default Server Settings (optional)</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            Pre-fill server details so users only need to enter their email and password. Leave empty to let users
            configure everything themselves.
          </p>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-imap-host`}>Default IMAP Host</Label>
            <Input
              id={`${testId}-imap-host`}
              value={defaultImapHost}
              onChange={e => setDefaultImapHost(e.target.value)}
              placeholder="e.g. imap.company.com"
              data-testid={`${testId}-imap-host`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-imap-port`}>Default IMAP Port</Label>
            <Input
              id={`${testId}-imap-port`}
              value={defaultImapPort}
              onChange={e => setDefaultImapPort(e.target.value)}
              placeholder="993"
              data-testid={`${testId}-imap-port`}
            />
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-smtp-host`}>Default SMTP Host</Label>
            <Input
              id={`${testId}-smtp-host`}
              value={defaultSmtpHost}
              onChange={e => setDefaultSmtpHost(e.target.value)}
              placeholder="e.g. smtp.company.com"
              data-testid={`${testId}-smtp-host`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-smtp-port`}>Default SMTP Port</Label>
            <Input
              id={`${testId}-smtp-port`}
              value={defaultSmtpPort}
              onChange={e => setDefaultSmtpPort(e.target.value)}
              placeholder="587"
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
          Save IMAP/SMTP settings
        </Button>
      </CardFooter>
    </Card>
  )
}
