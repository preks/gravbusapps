/**
 * ProviderSettingsCard - Renders a form card for configuring a single email provider.
 * Used inside the admin settings screen for Microsoft and Google providers.
 */

import React, { useState, useCallback, useMemo } from 'react'
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
import { Globe, Mail, Save, Eye, EyeOff, Loader2, Check, ExternalLink, Copy } from 'lucide-react'
import type {
  AdminProviderConfig,
  UpsertProviderSettingsRequest
} from '../../email-apps/services/EmailProviderSettingsApi'
import { PermissionToggles } from './ScopesEditor'
import translations from '../_i18n'

interface ProviderSettingsCardProps {
  provider: 'microsoft' | 'google'
  existingSettings?: AdminProviderConfig
  onSave: (data: UpsertProviderSettingsRequest) => Promise<void>
  redirectUri: string
  'data-testid'?: string
}

export const ProviderSettingsCard: React.FC<ProviderSettingsCardProps> = ({
  provider,
  existingSettings,
  onSave,
  redirectUri,
  'data-testid': testId = `provider-card-${provider}`
}) => {
  const { t } = useTranslation(translations)
  const isMicrosoft = provider === 'microsoft'
  const providerName = t(isMicrosoft ? 'provider-name-microsoft' : 'provider-name-google')
  const description = t(isMicrosoft ? 'provider-description-microsoft' : 'provider-description-google')

  const [clientId, setClientId] = useState((existingSettings?.publicConfig?.clientId as string) || '')
  const [authority, setAuthority] = useState(
    (existingSettings?.publicConfig?.authority as string) || (isMicrosoft ? 'organizations' : '')
  )
  const [scopes, setScopes] = useState(
    (existingSettings?.publicConfig?.scopes as string) ||
      (isMicrosoft
        ? 'openid profile email offline_access Mail.Read Mail.Send'
        : 'openid email profile https://mail.google.com/')
  )
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isEnabled, setIsEnabled] = useState(existingSettings?.isEnabled ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const adminConsentUrl = useMemo(() => {
    if (!isMicrosoft) return null
    const cid = clientId.trim()
    const auth = authority.trim()
    const rawScopes = scopes.trim()
    if (!cid || !auth || !rawScopes) return null

    const OIDC = new Set(['openid', 'profile', 'email', 'offline_access'])
    const normalizedScopes = rawScopes
      .split(/\s+/)
      .filter(Boolean)
      .map(s => {
        if (s.includes('://')) return s
        if (OIDC.has(s)) return s
        return `https://graph.microsoft.com/${s}`
      })
      .join(' ')

    const params = new URLSearchParams({
      client_id: cid,
      redirect_uri: redirectUri,
      scope: normalizedScopes,
      state: 'nw-email-admin-consent'
    })
    return `https://login.microsoftonline.com/${auth}/v2.0/adminconsent?${params.toString()}`
  }, [isMicrosoft, clientId, authority, scopes, redirectUri])

  const handleSave = useCallback(async () => {
    if (!clientId.trim()) {
      toast.error(t('provider-toast-client-id-required'))
      return
    }

    setIsSaving(true)
    try {
      const data: UpsertProviderSettingsRequest = {
        provider,
        publicConfig: {
          clientId: clientId.trim(),
          ...(isMicrosoft && authority ? { authority: authority.trim() } : {}),
          scopes: scopes.trim()
        },
        privateConfig: {
          ...(clientSecret ? { clientSecret: clientSecret.trim() } : {})
        },
        isEnabled
      }

      await onSave(data)
      setClientSecret('')
      toast.success(t('provider-toast-settings-saved', { providerName }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('provider-toast-save-failed'))
    } finally {
      setIsSaving(false)
    }
  }, [clientId, authority, scopes, clientSecret, isEnabled, provider, isMicrosoft, onSave, providerName, t])

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            {isMicrosoft ? (
              <Globe className="gba:w-6 gba:h-6 gba:text-primary" />
            ) : (
              <Mail className="gba:w-6 gba:h-6 gba:text-primary" />
            )}
            <div>
              <CardTitle>{providerName}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            {existingSettings && (
              <Badge variant={existingSettings.isEnabled ? 'success' : 'secondary'}>
                {existingSettings.isEnabled ? t('common-enabled') : t('common-disabled')}
              </Badge>
            )}
            {existingSettings?.hasClientSecret && (
              <Badge variant="outline">
                <Check className="gba:w-3 gba:h-3 gba:mr-1" />
                {t('common-secret-configured')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-client-id`}>
            {t(isMicrosoft ? 'provider-label-client-id-microsoft' : 'provider-label-client-id-google')}
          </Label>
          <Input
            id={`${testId}-client-id`}
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder={
              isMicrosoft ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'xxxxxxxxxxxx.apps.googleusercontent.com'
            }
            data-testid={`${testId}-client-id`}
          />
          <p className="gba:text-xs gba:text-muted-foreground">
            {t(isMicrosoft ? 'provider-hint-client-id-microsoft' : 'provider-hint-client-id-google')}
          </p>
        </div>

        {isMicrosoft && (
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-authority`}>{t('provider-label-authority')}</Label>
            <Input
              id={`${testId}-authority`}
              value={authority}
              onChange={e => setAuthority(e.target.value)}
              placeholder={t('provider-placeholder-authority')}
              data-testid={`${testId}-authority`}
            />
            <p className="gba:text-xs gba:text-muted-foreground">{t('provider-hint-authority')}</p>
          </div>
        )}

        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-client-secret`}>{t('provider-label-client-secret')}</Label>
          <div className="gba:flex gba:gap-2">
            <div className="gba:flex-1 gba:relative">
              <Input
                id={`${testId}-client-secret`}
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder={
                  existingSettings?.hasClientSecret
                    ? t('provider-placeholder-client-secret-existing')
                    : t('provider-placeholder-client-secret-empty')
                }
                data-testid={`${testId}-client-secret`}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSecret(!showSecret)}
              aria-label={t(showSecret ? 'common-hide-secret' : 'common-show-secret')}
            >
              {showSecret ? <EyeOff className="gba:w-4 gba:h-4" /> : <Eye className="gba:w-4 gba:h-4" />}
            </Button>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {t(isMicrosoft ? 'provider-hint-client-secret-microsoft' : 'provider-hint-client-secret-google')}
          </p>
        </div>

        <PermissionToggles
          provider={provider}
          scopes={scopes}
          onChange={setScopes}
          grantedScopes={existingSettings?.grantedScopes}
          testId={testId}
        />

        <div className="gba:space-y-2">
          <Label>{t('provider-label-redirect-uri')}</Label>
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-md gba:bg-muted gba:text-sm gba:font-mono gba:break-all">
            {redirectUri}
          </div>
        </div>

        {isMicrosoft && adminConsentUrl && (
          <div className="gba:space-y-2">
            <Label>{t('provider-label-admin-consent-url')}</Label>
            <div className="gba:flex gba:gap-2">
              <Input value={adminConsentUrl} readOnly data-testid={`${testId}-admin-consent-url`} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.open(adminConsentUrl, '_blank', 'noopener,noreferrer')}
                data-testid={`${testId}-admin-consent-open`}
                aria-label={t('common-open-link')}
              >
                <ExternalLink className="gba:w-4 gba:h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(adminConsentUrl)
                    toast.success(t('common-copied-to-clipboard'))
                  } catch {
                    return
                  }
                }}
                data-testid={`${testId}-admin-consent-copy`}
                aria-label={t('common-copy-link')}
              >
                <Copy className="gba:w-4 gba:h-4" />
              </Button>
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">{t('provider-hint-admin-consent')}</p>
          </div>
        )}

        <div className="gba:flex gba:items-center gba:gap-3">
          <input
            type="checkbox"
            id={`${testId}-enabled`}
            checked={isEnabled}
            onChange={e => setIsEnabled(e.target.checked)}
            className="gba:w-4 gba:h-4"
            data-testid={`${testId}-enabled`}
          />
          <Label htmlFor={`${testId}-enabled`}>{t('provider-label-enable-provider')}</Label>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
          {isSaving ? (
            <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
          ) : (
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
          )}
          {t('provider-button-save-settings', { providerName })}
        </Button>
      </CardFooter>
    </Card>
  )
}
