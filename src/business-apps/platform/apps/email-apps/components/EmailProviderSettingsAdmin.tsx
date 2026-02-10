/**
 * EmailProviderSettingsAdmin - Admin settings for email provider configuration.
 * Shows clear guidance on required permissions/scopes for each provider and feature.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { Settings, CheckCircle } from 'lucide-react'
import { EmailProviderSettingsApi } from '../services/EmailProviderSettingsApi'
import type { AdminProviderConfig, UpsertProviderSettingsRequest } from '../services/EmailProviderSettingsApi'
import { PERMISSION_GUIDE, type ProviderKey } from './permissionGuideConfig'
import { ProviderConfigForm } from './ProviderConfigForm'

interface EmailProviderSettingsAdminProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string | null
  'data-testid'?: string
}

export const EmailProviderSettingsAdmin: React.FC<EmailProviderSettingsAdminProps> = ({
  open,
  onOpenChange,
  accessToken,
  'data-testid': testId = 'provider-settings-admin'
}) => {
  const [settings, setSettings] = useState<AdminProviderConfig[]>([])
  const [activeProvider, setActiveProvider] = useState<ProviderKey>('microsoft')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  // Form state
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [authority, setAuthority] = useState('organizations')
  const [scopes, setScopes] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const [defaultImapHost, setDefaultImapHost] = useState('')
  const [defaultImapPort, setDefaultImapPort] = useState('')
  const [defaultSmtpHost, setDefaultSmtpHost] = useState('')
  const [defaultSmtpPort, setDefaultSmtpPort] = useState('')

  // Load settings
  useEffect(() => {
    if (!open || !accessToken) return
    EmailProviderSettingsApi.setAccessToken(accessToken)

    const load = async () => {
      setIsLoading(true)
      try {
        const data = await EmailProviderSettingsApi.getAdminSettings()
        setSettings(data)
      } catch (err) {
        console.error('Failed to load provider settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [open, accessToken])

  // Populate form when switching provider or settings load
  useEffect(() => {
    const config = settings.find(s => s.provider === activeProvider)
    const guide = PERMISSION_GUIDE[activeProvider]

    if (config) {
      setClientId(config.publicConfig?.clientId || '')
      setAuthority((config.publicConfig?.authority as string) || 'organizations')
      setScopes((config.publicConfig?.scopes as string) || guide.defaultScopes)
      setIsEnabled(config.isEnabled)
      setDefaultImapHost((config.publicConfig?.defaultImapHost as string) || '')
      setDefaultImapPort((config.publicConfig?.defaultImapPort as string) || '')
      setDefaultSmtpHost((config.publicConfig?.defaultSmtpHost as string) || '')
      setDefaultSmtpPort((config.publicConfig?.defaultSmtpPort as string) || '')
    } else {
      setClientId('')
      setAuthority('organizations')
      setScopes(guide.defaultScopes)
      setIsEnabled(true)
      setDefaultImapHost('')
      setDefaultImapPort('')
      setDefaultSmtpHost('')
      setDefaultSmtpPort('')
    }
    setClientSecret('')
    setShowSecret(false)
  }, [activeProvider, settings])

  const handleSave = useCallback(async () => {
    if (activeProvider !== 'imap_smtp' && isEnabled) {
      const missing: string[] = []

      if (!clientId.trim()) missing.push('Client ID')
      if (activeProvider === 'microsoft' && !authority.trim()) missing.push('Authority (Tenant)')
      if (!scopes.trim()) missing.push('OAuth scopes')

      const existing = settings.find(s => s.provider === activeProvider)
      const hasSecret = !!existing?.hasClientSecret
      if (!hasSecret && !clientSecret.trim()) missing.push('Client Secret')

      if (missing.length > 0) {
        toast.error(`Missing required settings: ${missing.join(', ')}`)
        return
      }
    }

    setIsSaving(true)
    try {
      const publicConfig: Record<string, unknown> = {}
      const privateConfig: Record<string, unknown> = {}

      if (activeProvider !== 'imap_smtp') {
        if (clientId.trim()) publicConfig.clientId = clientId.trim()
        if (scopes.trim()) publicConfig.scopes = scopes.trim()
        if (activeProvider === 'microsoft' && authority.trim()) publicConfig.authority = authority.trim()
        if (clientSecret.trim()) privateConfig.clientSecret = clientSecret.trim()
      } else {
        if (defaultImapHost) publicConfig.defaultImapHost = defaultImapHost
        if (defaultImapPort) publicConfig.defaultImapPort = defaultImapPort
        if (defaultSmtpHost) publicConfig.defaultSmtpHost = defaultSmtpHost
        if (defaultSmtpPort) publicConfig.defaultSmtpPort = defaultSmtpPort
      }

      const request: UpsertProviderSettingsRequest = {
        provider: activeProvider,
        publicConfig,
        isEnabled
      }

      if (Object.keys(privateConfig).length > 0) {
        request.privateConfig = privateConfig
      }

      await EmailProviderSettingsApi.upsertSettings(request)
      toast.success(`${PERMISSION_GUIDE[activeProvider].name} settings saved`)

      // Reload settings
      const data = await EmailProviderSettingsApi.getAdminSettings()
      setSettings(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }, [
    activeProvider,
    clientId,
    clientSecret,
    authority,
    scopes,
    isEnabled,
    defaultImapHost,
    defaultImapPort,
    defaultSmtpHost,
    defaultSmtpPort
  ])

  const guide = PERMISSION_GUIDE[activeProvider]
  const currentConfig = settings.find(s => s.provider === activeProvider)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-3xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Settings className="gba:w-5 gba:h-5" />
            Email Provider Settings
          </DialogTitle>
          <DialogDescription>
            Configure OAuth credentials and permissions for email providers. Users need these to connect their accounts.
          </DialogDescription>
        </DialogHeader>

        {/* Provider tabs */}
        <div className="gba:flex gba:gap-2 gba:mb-4">
          {(Object.keys(PERMISSION_GUIDE) as ProviderKey[]).map(key => (
            <Button
              key={key}
              variant={activeProvider === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveProvider(key)}
              data-testid={`${testId}-tab-${key}`}
            >
              {PERMISSION_GUIDE[key].name}
              {settings.find(s => s.provider === key)?.isEnabled && (
                <CheckCircle className="gba:w-3 gba:h-3 gba:ml-1" />
              )}
            </Button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <ProviderConfigForm
            activeProvider={activeProvider}
            guide={guide}
            currentConfig={currentConfig}
            isEnabled={isEnabled}
            setIsEnabled={setIsEnabled}
            clientId={clientId}
            setClientId={setClientId}
            clientSecret={clientSecret}
            setClientSecret={setClientSecret}
            showSecret={showSecret}
            setShowSecret={setShowSecret}
            authority={authority}
            setAuthority={setAuthority}
            scopes={scopes}
            setScopes={setScopes}
            defaultImapHost={defaultImapHost}
            setDefaultImapHost={setDefaultImapHost}
            defaultImapPort={defaultImapPort}
            setDefaultImapPort={setDefaultImapPort}
            defaultSmtpHost={defaultSmtpHost}
            setDefaultSmtpHost={setDefaultSmtpHost}
            defaultSmtpPort={defaultSmtpPort}
            setDefaultSmtpPort={setDefaultSmtpPort}
            onSave={handleSave}
            isSaving={isSaving}
            testId={testId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
