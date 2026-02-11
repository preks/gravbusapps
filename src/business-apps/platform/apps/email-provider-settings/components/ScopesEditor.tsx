/**
 * PermissionToggles - Feature-based permission editor for OAuth scopes.
 * Shows human-readable feature names with toggles. Required features are locked.
 * Displays provider status: which scopes are actually granted vs configured.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Badge, Button, Input, Label } from '@newwork/nw-design-system'
import { Check, AlertTriangle, Plus, Lock, X, Info } from 'lucide-react'

/** A single permission/feature definition */
interface PermissionDef {
  scope: string
  label: string
  description: string
  required?: boolean
}

const MICROSOFT_PERMISSIONS: PermissionDef[] = [
  { scope: 'openid', label: 'OpenID', description: 'Basic identity', required: true },
  { scope: 'profile', label: 'Profile', description: 'User profile info', required: true },
  { scope: 'email', label: 'Email identity', description: 'User email address', required: true },
  {
    scope: 'offline_access',
    label: 'Offline access',
    description: 'Refresh tokens for background sync',
    required: true
  },
  { scope: 'Mail.Read', label: 'Read emails', description: 'Read user mailbox' },
  { scope: 'Mail.Send', label: 'Send emails', description: 'Send mail on behalf of user' },
  { scope: 'Mail.ReadWrite', label: 'Read/write emails', description: 'Full mailbox access' },
  { scope: 'Calendars.Read', label: 'Read calendars', description: 'View calendar events' },
  { scope: 'Calendars.ReadWrite', label: 'Read/write calendars', description: 'Manage calendar events' },
  { scope: 'Contacts.Read', label: 'Read contacts', description: 'View user contacts' }
]

const GOOGLE_PERMISSIONS: PermissionDef[] = [
  { scope: 'openid', label: 'OpenID', description: 'Basic identity', required: true },
  { scope: 'email', label: 'Email identity', description: 'User email address', required: true },
  { scope: 'profile', label: 'Profile', description: 'User profile info', required: true },
  { scope: 'https://mail.google.com/', label: 'Full mail access', description: 'Read, send, and manage email' },
  {
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    label: 'Read calendars',
    description: 'View calendar events'
  },
  {
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    label: 'Read contacts',
    description: 'View user contacts'
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
  const [customScope, setCustomScope] = useState('')

  const permissions = provider === 'microsoft' ? MICROSOFT_PERMISSIONS : GOOGLE_PERMISSIONS
  const scopeList = useMemo(() => scopes.split(/\s+/).filter(Boolean), [scopes])
  const grantedList = useMemo(() => (grantedScopes ? grantedScopes.split(/\s+/).filter(Boolean) : []), [grantedScopes])

  // Scopes that are active but not in our known permissions list
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
      <Label>Permissions</Label>

      {/* Feature toggles */}
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

              {/* Label + description */}
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{perm.label}</span>
                  {perm.required && <Lock className="gba:w-3 gba:h-3 gba:text-muted-foreground" />}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{perm.description}</p>
                <code className="gba:text-[10px] gba:text-muted-foreground">{perm.scope}</code>
              </div>

              {/* Provider status indicator */}
              {isActive && status === 'granted' && (
                <Badge variant="success" className="gba:gap-1 gba:flex-shrink-0">
                  <Check className="gba:w-3 gba:h-3" />
                  Active
                </Badge>
              )}
              {isActive && status === 'not_granted' && (
                <Badge variant="warning" className="gba:gap-1 gba:flex-shrink-0">
                  <AlertTriangle className="gba:w-3 gba:h-3" />
                  Not granted
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      {/* Custom scopes (not in known list) */}
      {customScopes.length > 0 && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs">Custom scopes</Label>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {customScopes.map(scope => (
              <Badge key={scope} variant="outline" className="gba:gap-1 gba:py-1 gba:px-2">
                <span className="gba:max-w-[200px] gba:truncate gba:text-xs">{scope}</span>
                <button
                  type="button"
                  onClick={() => removeCustomScope(scope)}
                  className="gba:ml-1 gba:rounded-full gba:hover:bg-muted gba:p-0.5"
                >
                  <X className="gba:w-3 gba:h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add custom scope */}
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
          placeholder="Add custom scope..."
          className="gba:flex-1 gba:text-sm"
          data-testid={`${testId}-custom-scope`}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAddCustom} disabled={!customScope.trim()}>
          <Plus className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      {/* Provider status note */}
      {grantedScopes ? (
        <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:rounded-md gba:bg-muted gba:text-xs gba:text-muted-foreground">
          <Info className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
          <span>
            Status badges show which permissions are actually active on the provider side (captured from the last
            successful user connection). &quot;Not granted&quot; means the scope is configured here but not yet approved
            in your app registration.
          </span>
        </div>
      ) : (
        <div className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:rounded-md gba:bg-muted gba:text-xs gba:text-muted-foreground">
          <Info className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
          <span>
            Connect a test account to verify which permissions are active on the provider side. Status badges will
            appear once a user has successfully connected.
          </span>
        </div>
      )}
    </div>
  )
}

// Re-export with the old name for backward compatibility
export { PermissionToggles as ScopesEditor }
