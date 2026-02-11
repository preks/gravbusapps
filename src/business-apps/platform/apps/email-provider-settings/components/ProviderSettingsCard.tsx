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
  Badge
} from '@newwork/nw-design-system'
import { Globe, Mail, Save, Eye, EyeOff, Loader2, Check, ExternalLink, Copy } from 'lucide-react'
import type {
  AdminProviderConfig,
  UpsertProviderSettingsRequest
} from '../../email-apps/services/EmailProviderSettingsApi'
import { PermissionToggles } from './ScopesEditor'

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
  const isMicrosoft = provider === 'microsoft'
  const title = isMicrosoft ? 'Microsoft 365 / Outlook' : 'Google / Gmail'
  const description = isMicrosoft
    ? 'Configure Azure App Registration for Microsoft OAuth. Users will be able to connect their Microsoft email accounts.'
    : 'Configure Google OAuth credentials. Users will be able to connect their Gmail/Google Workspace accounts.'

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

  // Admin consent URL for Microsoft (helps when users see "Need admin approval")
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
      toast.error('Client ID is required')
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
      setClientSecret('') // Clear secret field after save
      toast.success(`${title} settings saved successfully`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }, [clientId, authority, scopes, clientSecret, isEnabled, provider, isMicrosoft, title, onSave])

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
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            {existingSettings && (
              <Badge variant={existingSettings.isEnabled ? 'success' : 'secondary'}>
                {existingSettings.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            )}
            {existingSettings?.hasClientSecret && (
              <Badge variant="outline">
                <Check className="gba:w-3 gba:h-3 gba:mr-1" />
                Secret configured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        {/* Client ID */}
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-client-id`}>{isMicrosoft ? 'Application (Client) ID' : 'OAuth Client ID'}</Label>
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
            {isMicrosoft
              ? 'From Azure Portal > App Registrations > Your App > Overview'
              : 'From Google Cloud Console > APIs & Services > Credentials'}
          </p>
        </div>

        {/* Authority (Microsoft only) */}
        {isMicrosoft && (
          <div className="gba:space-y-2">
            <Label htmlFor={`${testId}-authority`}>Authority / Tenant</Label>
            <Input
              id={`${testId}-authority`}
              value={authority}
              onChange={e => setAuthority(e.target.value)}
              placeholder="organizations"
              data-testid={`${testId}-authority`}
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              Use &quot;organizations&quot; for work/school accounts, &quot;common&quot; for all accounts, or a specific
              tenant ID.
            </p>
          </div>
        )}

        {/* Client Secret */}
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-client-secret`}>Client Secret</Label>
          <div className="gba:flex gba:gap-2">
            <div className="gba:flex-1 gba:relative">
              <Input
                id={`${testId}-client-secret`}
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder={
                  existingSettings?.hasClientSecret
                    ? '(secret already configured — leave empty to keep)'
                    : 'Enter client secret'
                }
                data-testid={`${testId}-client-secret`}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? <EyeOff className="gba:w-4 gba:h-4" /> : <Eye className="gba:w-4 gba:h-4" />}
            </Button>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {isMicrosoft
              ? 'Required for background email sync (confidential app). From Azure Portal > Certificates & secrets.'
              : 'Required for server-side token exchange. From Google Cloud Console > Credentials.'}
          </p>
        </div>

        {/* Permissions */}
        <PermissionToggles
          provider={provider}
          scopes={scopes}
          onChange={setScopes}
          grantedScopes={existingSettings?.grantedScopes}
          testId={testId}
        />

        {/* Redirect URI (read-only display) */}
        <div className="gba:space-y-2">
          <Label>Redirect URI (add this to your app registration)</Label>
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-md gba:bg-muted gba:text-sm gba:font-mono gba:break-all">
            {redirectUri}
          </div>
        </div>

        {/* Admin consent URL (Microsoft only) */}
        {isMicrosoft && adminConsentUrl && (
          <div className="gba:space-y-2">
            <Label>Admin Consent URL</Label>
            <div className="gba:flex gba:gap-2">
              <Input value={adminConsentUrl} readOnly data-testid={`${testId}-admin-consent-url`} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.open(adminConsentUrl, '_blank', 'noopener,noreferrer')}
                data-testid={`${testId}-admin-consent-open`}
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
                    toast.success('Copied to clipboard')
                  } catch {
                    // URL is visible for manual copy
                  }
                }}
                data-testid={`${testId}-admin-consent-copy`}
              >
                <Copy className="gba:w-4 gba:h-4" />
              </Button>
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">
              If users see &quot;Need admin approval&quot;, open this link to grant consent for the configured scopes.
            </p>
          </div>
        )}

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
          <Label htmlFor={`${testId}-enabled`}>Enable this provider for users</Label>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
          {isSaving ? (
            <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
          ) : (
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
          )}
          Save {title} settings
        </Button>
      </CardFooter>
    </Card>
  )
}
