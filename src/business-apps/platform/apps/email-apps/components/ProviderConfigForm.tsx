/**
 * ProviderConfigForm - Provider-specific OAuth/IMAP configuration form.
 * Renders input fields for client credentials, scopes, and server settings.
 */

import React, { useMemo } from 'react'
import { Button, Input, Badge, Switch } from '@newwork/nw-design-system'
import { Eye, EyeOff } from 'lucide-react'
import type { AdminProviderConfig } from '../services/EmailProviderSettingsApi'
import type { ProviderKey, ProviderGuide } from './permissionGuideConfig'
import { ProviderPermissionGuide } from './ProviderPermissionGuide'

const OIDC_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access'])

function normalizeMicrosoftScopeForAdminConsent(scope: string): string {
  if (scope.includes('://')) return scope
  if (OIDC_SCOPES.has(scope)) return scope
  if (scope.startsWith('EWS.')) return `https://outlook.office365.com/${scope}`
  return `https://graph.microsoft.com/${scope}`
}

export interface ProviderConfigFormProps {
  activeProvider: ProviderKey
  guide: ProviderGuide
  currentConfig?: AdminProviderConfig
  isEnabled: boolean
  setIsEnabled: (v: boolean) => void
  clientId: string
  setClientId: (v: string) => void
  clientSecret: string
  setClientSecret: (v: string) => void
  showSecret: boolean
  setShowSecret: (v: boolean) => void
  authority: string
  setAuthority: (v: string) => void
  scopes: string
  setScopes: (v: string) => void
  defaultImapHost: string
  setDefaultImapHost: (v: string) => void
  defaultImapPort: string
  setDefaultImapPort: (v: string) => void
  defaultSmtpHost: string
  setDefaultSmtpHost: (v: string) => void
  defaultSmtpPort: string
  setDefaultSmtpPort: (v: string) => void
  onSave: () => void
  isSaving: boolean
  testId: string
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  activeProvider,
  guide,
  currentConfig,
  isEnabled,
  setIsEnabled,
  clientId,
  setClientId,
  clientSecret,
  setClientSecret,
  showSecret,
  setShowSecret,
  authority,
  setAuthority,
  scopes,
  setScopes,
  defaultImapHost,
  setDefaultImapHost,
  defaultImapPort,
  setDefaultImapPort,
  defaultSmtpHost,
  setDefaultSmtpHost,
  defaultSmtpPort,
  setDefaultSmtpPort,
  onSave,
  isSaving,
  testId
}) => {
  const microsoftAdminConsentUrl = useMemo(() => {
    if (activeProvider !== 'microsoft') return null

    const cid = clientId.trim()
    const auth = authority.trim()
    const rawScopes = scopes.trim()

    if (!cid || !auth || !rawScopes) return null

    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/platform/mail/oauth/callback` : ''

    const normalizedScopes = rawScopes
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeMicrosoftScopeForAdminConsent)
      .join(' ')

    const params = new URLSearchParams({
      client_id: cid,
      redirect_uri: redirectUri,
      scope: normalizedScopes,
      state: 'nw-email-admin-consent'
    })

    return `https://login.microsoftonline.com/${auth}/v2.0/adminconsent?${params.toString()}`
  }, [activeProvider, clientId, authority, scopes])

  return (
    <div className="gba:space-y-4">
      {/* Enable toggle */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg gba:border">
        <div>
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Enable {guide.name}</p>
          <p className="gba:text-xs gba:text-muted-foreground">Allow users to connect {guide.name} accounts</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={setIsEnabled} data-testid={`${testId}-enabled`} />
      </div>

      {/* Permissions & Instructions */}
      <ProviderPermissionGuide guide={guide} data-testid={`${testId}-guide`} />

      {/* OAuth fields for Microsoft/Google */}
      {activeProvider !== 'imap_smtp' && (
        <>
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
              Client ID (Application ID)
            </label>
            <Input
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="e.g., 861b3af1-129e-4674-9f0e-4fb4a3091fc0"
              data-testid={`${testId}-client-id`}
            />
          </div>

          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
              Client Secret
              {currentConfig?.hasClientSecret && (
                <Badge variant="success" className="gba:ml-2 gba:text-[10px]">
                  Configured
                </Badge>
              )}
            </label>
            <div className="gba:relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder={currentConfig?.hasClientSecret ? '(leave empty to keep existing)' : 'Enter client secret'}
                data-testid={`${testId}-client-secret`}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
                data-testid={`${testId}-toggle-secret`}
              >
                {showSecret ? <EyeOff className="gba:w-4 gba:h-4" /> : <Eye className="gba:w-4 gba:h-4" />}
              </button>
            </div>
          </div>

          {activeProvider === 'microsoft' && (
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
                Authority (Tenant)
              </label>
              <Input
                value={authority}
                onChange={e => setAuthority(e.target.value)}
                placeholder="organizations, common, or tenant-id"
                data-testid={`${testId}-authority`}
              />
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                Use &quot;organizations&quot; for multi-tenant, &quot;common&quot; for personal + org, or your tenant ID
              </p>
            </div>
          )}

          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">OAuth Scopes</label>
            <Input
              value={scopes}
              onChange={e => setScopes(e.target.value)}
              placeholder={guide.defaultScopes}
              data-testid={`${testId}-scopes`}
            />
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              Space-separated list of OAuth scopes. Defaults include email and calendar read.
            </p>
          </div>

          {activeProvider === 'microsoft' && microsoftAdminConsentUrl && (
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
                Admin consent URL (optional)
              </label>
              <div className="gba:flex gba:gap-2">
                <Input value={microsoftAdminConsentUrl} readOnly data-testid={`${testId}-ms-admin-consent-url`} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(microsoftAdminConsentUrl, '_blank', 'noopener,noreferrer')}
                  data-testid={`${testId}-ms-admin-consent-open`}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(microsoftAdminConsentUrl)
                    } catch {
                      // ignore clipboard failures; URL is still visible for manual copy
                    }
                  }}
                  data-testid={`${testId}-ms-admin-consent-copy`}
                >
                  Copy
                </Button>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground">
                If users see “Need admin approval”, an admin can open this link to grant consent for the configured
                scopes in the selected tenant.
              </p>
            </div>
          )}
        </>
      )}

      {/* IMAP/SMTP fields */}
      {activeProvider === 'imap_smtp' && (
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
              Default IMAP Host
            </label>
            <Input
              value={defaultImapHost}
              onChange={e => setDefaultImapHost(e.target.value)}
              placeholder="imap.example.com"
              data-testid={`${testId}-imap-host`}
            />
          </div>
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
              Default IMAP Port
            </label>
            <Input
              value={defaultImapPort}
              onChange={e => setDefaultImapPort(e.target.value)}
              placeholder="993"
              data-testid={`${testId}-imap-port`}
            />
          </div>
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
              Default SMTP Host
            </label>
            <Input
              value={defaultSmtpHost}
              onChange={e => setDefaultSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
              data-testid={`${testId}-smtp-host`}
            />
          </div>
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1 gba:block">
              Default SMTP Port
            </label>
            <Input
              value={defaultSmtpPort}
              onChange={e => setDefaultSmtpPort(e.target.value)}
              placeholder="587"
              data-testid={`${testId}-smtp-port`}
            />
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="gba:flex gba:justify-end gba:pt-2">
        <Button onClick={onSave} disabled={isSaving} data-testid={`${testId}-save`}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}
