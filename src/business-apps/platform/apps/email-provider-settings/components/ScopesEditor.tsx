/**
 * PermissionToggles - Feature-based permission editor for OAuth scopes.
 * Shows human-readable feature names with toggles. Required features are locked.
 * Displays provider status: which scopes are actually granted vs configured.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Badge, Button, Input, Label, useTranslation } from '@newwork/nw-design-system'
import { Check, AlertTriangle, Plus, Lock, X, Info } from 'lucide-react'
import translations from '../_i18n'

interface PermissionDef {
  scope: string
  labelKey: string
  descriptionKey: string
  required?: boolean
}

const MICROSOFT_PERMISSIONS: PermissionDef[] = [
  {
    scope: 'openid',
    labelKey: 'permission-microsoft-openid-label',
    descriptionKey: 'permission-microsoft-openid-description',
    required: true
  },
  {
    scope: 'profile',
    labelKey: 'permission-microsoft-profile-label',
    descriptionKey: 'permission-microsoft-profile-description',
    required: true
  },
  {
    scope: 'email',
    labelKey: 'permission-microsoft-email-label',
    descriptionKey: 'permission-microsoft-email-description',
    required: true
  },
  {
    scope: 'offline_access',
    labelKey: 'permission-microsoft-offline-access-label',
    descriptionKey: 'permission-microsoft-offline-access-description',
    required: true
  },
  {
    scope: 'Mail.Read',
    labelKey: 'permission-microsoft-mail-read-label',
    descriptionKey: 'permission-microsoft-mail-read-description'
  },
  {
    scope: 'Mail.Send',
    labelKey: 'permission-microsoft-mail-send-label',
    descriptionKey: 'permission-microsoft-mail-send-description'
  },
  {
    scope: 'Mail.ReadWrite',
    labelKey: 'permission-microsoft-mail-readwrite-label',
    descriptionKey: 'permission-microsoft-mail-readwrite-description'
  },
  {
    scope: 'Calendars.Read',
    labelKey: 'permission-microsoft-calendars-read-label',
    descriptionKey: 'permission-microsoft-calendars-read-description'
  },
  {
    scope: 'Calendars.ReadWrite',
    labelKey: 'permission-microsoft-calendars-readwrite-label',
    descriptionKey: 'permission-microsoft-calendars-readwrite-description'
  },
  {
    scope: 'Contacts.Read',
    labelKey: 'permission-microsoft-contacts-read-label',
    descriptionKey: 'permission-microsoft-contacts-read-description'
  }
]

const GOOGLE_PERMISSIONS: PermissionDef[] = [
  {
    scope: 'openid',
    labelKey: 'permission-google-openid-label',
    descriptionKey: 'permission-google-openid-description',
    required: true
  },
  {
    scope: 'email',
    labelKey: 'permission-google-email-label',
    descriptionKey: 'permission-google-email-description',
    required: true
  },
  {
    scope: 'profile',
    labelKey: 'permission-google-profile-label',
    descriptionKey: 'permission-google-profile-description',
    required: true
  },
  {
    scope: 'https://mail.google.com/',
    labelKey: 'permission-google-mail-full-label',
    descriptionKey: 'permission-google-mail-full-description'
  },
  {
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    labelKey: 'permission-google-calendar-readonly-label',
    descriptionKey: 'permission-google-calendar-readonly-description'
  },
  {
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    labelKey: 'permission-google-contacts-readonly-label',
    descriptionKey: 'permission-google-contacts-readonly-description'
  }
]

interface PermissionTogglesProps {
  provider: 'microsoft' | 'google'
  scopes: string
  onChange: (scopes: string) => void
  grantedScopes?: string | null
  testId: string
}

export const PermissionToggles: React.FC<PermissionTogglesProps> = ({
  provider,
  scopes,
  onChange,
  grantedScopes,
  testId
}) => {
  const { t } = useTranslation(translations)
  const [customScope, setCustomScope] = useState('')

  const permissions = provider === 'microsoft' ? MICROSOFT_PERMISSIONS : GOOGLE_PERMISSIONS
  const scopeList = useMemo(() => scopes.split(/\s+/).filter(Boolean), [scopes])
  const grantedList = useMemo(() => (grantedScopes ? grantedScopes.split(/\s+/).filter(Boolean) : []), [grantedScopes])

  const customScopes = useMemo(
    () => scopeList.filter(s => !permissions.some(p => p.scope === s)),
    [scopeList, permissions]
  )

  const toggleScope = useCallback(
    (scope: string) => {
      if (scopeList.includes(scope)) {
        onChange(scopeList.filter(s => s !== scope).join(' '))
      } else {
        onChange([...scopeList, scope].join(' '))
      }
    },
    [scopeList, onChange]
  )

  const removeCustomScope = useCallback(
    (scope: string) => {
      onChange(scopeList.filter(s => s !== scope).join(' '))
    },
    [scopeList, onChange]
  )

  const handleAddCustom = useCallback(() => {
    const trimmed = customScope.trim()
    if (trimmed && !scopeList.includes(trimmed)) {
      onChange([...scopeList, trimmed].join(' '))
      setCustomScope('')
    }
  }, [customScope, scopeList, onChange])

  const getStatus = (scope: string): 'granted' | 'not_granted' | 'unknown' => {
    if (!grantedScopes) return 'unknown'
    return grantedList.includes(scope) ? 'granted' : 'not_granted'
  }

  return (
    <div className="gba:space-y-4" data-testid={`${testId}-permissions`}>
      <Label>{t('permissions-title')}</Label>
      <div className="gba:space-y-2">
        {permissions.map(perm => {
          const isActive = scopeList.includes(perm.scope)
          const status = isActive ? getStatus(perm.scope) : 'unknown'

          return (
            <div
              key={perm.scope}
              className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:border"
              data-testid={`${testId}-perm-${perm.scope}`}
            >
              {/* Toggle */}
              <input
                type="checkbox"
                checked={isActive}
                disabled={perm.required}
                onChange={() => toggleScope(perm.scope)}
                className="gba:w-4 gba:h-4 gba:flex-shrink-0"
              />

              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{t(perm.labelKey)}</span>
                  {perm.required && <Lock className="gba:w-3 gba:h-3 gba:text-muted-foreground" />}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{t(perm.descriptionKey)}</p>
                <code className="gba:text-xs gba:text-muted-foreground">{perm.scope}</code>
              </div>

              {isActive && status === 'granted' && (
                <Badge variant="success" className="gba:gap-1 gba:flex-shrink-0">
                  <Check className="gba:w-3 gba:h-3" />
                  {t('common-active')}
                </Badge>
              )}
              {isActive && status === 'not_granted' && (
                <Badge variant="warning" className="gba:gap-1 gba:flex-shrink-0">
                  <AlertTriangle className="gba:w-3 gba:h-3" />
                  {t('common-not-granted')}
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      {customScopes.length > 0 && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs">{t('permissions-custom-scopes-title')}</Label>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {customScopes.map(scope => (
              <Badge key={scope} variant="outline" className="gba:gap-1 gba:py-1 gba:px-2">
                <span className="gba:max-w-48 gba:truncate gba:text-xs">{scope}</span>
                <button
                  type="button"
                  onClick={() => removeCustomScope(scope)}
                  className="gba:ml-1 gba:rounded-full gba:hover:bg-muted gba:p-1"
                  aria-label={t('common-remove-custom-scope', { scope })}
                >
                  <X className="gba:w-3 gba:h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="gba:flex gba:gap-2">
        <Input
          value={customScope}
          onChange={e => setCustomScope(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddCustom()
            }
          }}
          placeholder={t('permissions-placeholder-custom-scope')}
          className="gba:flex-1 gba:text-sm"
          data-testid={`${testId}-custom-scope`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCustom}
          disabled={!customScope.trim()}
          aria-label={t('common-add-custom-scope')}
        >
          <Plus className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      {grantedScopes ? (
        <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:rounded-md gba:bg-muted gba:text-xs gba:text-muted-foreground">
          <Info className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
          <span>{t('permissions-note-granted')}</span>
        </div>
      ) : (
        <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:rounded-md gba:bg-muted gba:text-xs gba:text-muted-foreground">
          <Info className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
          <span>{t('permissions-note-pending')}</span>
        </div>
      )}
    </div>
  )
}

// Re-export with the old name for backward compatibility
export { PermissionToggles as ScopesEditor }
