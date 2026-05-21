'use client'

import React from 'react'
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { CredentialBindField } from '@/common/components/credential-bind/CredentialBindField'
import { buildCredentialBindOptionsFromList, type CredentialBindOption } from '@/common/utils/credentialBindOptions'

export type ConfigRow = {
  key: string
  value: string
  /** Stable list identity; do not use for API payload */ rowId?: string
}

/** Stable id for config row list keys (not sent to the API). */
export function newConfigRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Use whenever adding an empty settings row so React keys stay stable while typing. */
export function newEmptyConfigRow(): ConfigRow {
  return { key: '', value: '', rowId: newConfigRowId() }
}

let settingsEditorFallbackRow: ConfigRow | null = null
function fallbackEmptyRow(): ConfigRow {
  if (!settingsEditorFallbackRow) {
    settingsEditorFallbackRow = newEmptyConfigRow()
  }
  return settingsEditorFallbackRow
}

export type StoredSecretOption = { id: string; displayName: string; fieldKeys: string[] }

export interface SettingsEditorProps {
  rows: ConfigRow[]
  onChange: (rows: ConfigRow[]) => void
  connectionOptions?: Array<{ id: string; name: string }>
  selectedConnectionId?: string | null
  onConnectionChange?: (connectionId: string | null) => void
  isLoadingConnections?: boolean
  /** When defined (including `[]`), enables the credential picker; options come from `credentialBindOptions` when non-empty, else from this list. */
  storedSecrets?: StoredSecretOption[]
  /** Merged picker list (per-field `fncred:` refs). When defined and non-empty, used instead of deriving from `storedSecrets`. */
  credentialBindOptions?: CredentialBindOption[]
  'data-testid'?: string
}

export const SettingsEditor: React.FC<SettingsEditorProps> = ({
  rows,
  onChange,
  connectionOptions = [],
  selectedConnectionId = null,
  onConnectionChange,
  isLoadingConnections = false,
  storedSecrets,
  credentialBindOptions,
  'data-testid': testId = 'function-editor-settings'
}) => {
  const safeRows = rows.length ? rows : [fallbackEmptyRow()]
  const secretsEnabled = storedSecrets !== undefined
  const bindOptions: CredentialBindOption[] = React.useMemo(() => {
    if (credentialBindOptions !== undefined && credentialBindOptions.length > 0) {
      return credentialBindOptions
    }
    return buildCredentialBindOptionsFromList(storedSecrets || [])
  }, [credentialBindOptions, storedSecrets])

  const normalizedKeys = safeRows.map(r => String(r.key || '').trim())
  const keyCounts = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const k of normalizedKeys) {
      const kk = k.toUpperCase()
      if (!kk) continue
      map.set(kk, (map.get(kk) || 0) + 1)
    }
    return map
  }, [normalizedKeys.join('|')])

  const nonEmptyKeyRows = safeRows.filter(r => String(r.key || '').trim())
  const missingValuesCount = nonEmptyKeyRows.filter(r => !String(r.value || '').trim()).length

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Label>Settings</Label>
        <Badge variant="secondary">Available at runtime: context.config</Badge>
        {nonEmptyKeyRows.length ? <Badge variant="secondary">{nonEmptyKeyRows.length} keys</Badge> : null}
        {missingValuesCount ? <Badge variant="outline">{missingValuesCount} missing values</Badge> : null}
      </div>

      {onConnectionChange ? (
        <div className="gba:space-y-2">
          <Label>Shared connection</Label>
          <Select
            value={selectedConnectionId || '__none__'}
            onValueChange={value => onConnectionChange(value === '__none__' ? null : value)}
          >
            <SelectTrigger
              className="gba:h-9"
              data-testid={`${testId}-shared-connection`}
              aria-label="Shared connection"
            >
              <SelectValue
                placeholder={isLoadingConnections ? 'Loading shared connections...' : 'No shared connection selected'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No shared connection</SelectItem>
              {connectionOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="gba:text-xs gba:text-muted-foreground">
            Optional Prompt Manager connection: its <span className="gba:font-mono">config</span> /{' '}
            <span className="gba:font-mono">env</span> merge into <span className="gba:font-mono">context.config</span>{' '}
            first. The key/value rows below are <strong>this function’s</strong> own settings (and overrides), not the
            connection editor—same runtime map, saved on the function.
          </div>
        </div>
      ) : null}

      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:text-sm gba:text-foreground gba:font-medium">How it works</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:leading-relaxed">
              Add environment-style keys for this function. They are injected as{' '}
              <span className="gba:font-mono">context.config.&lt;UPPERCASE_KEY&gt;</span>. Keep keys UPPERCASE and don’t
              log credential values.
              {secretsEnabled ? (
                <>
                  {' '}
                  Create credentials from Function Manager’s top-level <strong>Credentials</strong> tab; here, bind a
                  field as <span className="gba:font-mono">fncred:&lt;uuid&gt;:&lt;key&gt;</span> instead of putting
                  secret text in saved settings. Field keys are short labels: letters, numbers, hyphen, underscore, or
                  dot—no spaces.
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="gba:space-y-2">
        <div className="gba:hidden gba:sm:grid gba:sm:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_auto] gba:gap-3 gba:px-1">
          <div className="gba:text-xs gba:text-muted-foreground">Key</div>
          <div className="gba:text-xs gba:text-muted-foreground">Value</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-right">Actions</div>
        </div>

        <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:overflow-hidden">
          {safeRows.map((kv, idx) => (
            <div
              key={kv.rowId ?? `idx-${idx}`}
              className={['gba:px-4 gba:py-3', idx === 0 ? '' : 'gba:border-t gba:border-border'].join(' ')}
              data-testid={`${testId}-row-${idx}`}
            >
              <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_auto] gba:sm:items-start">
                <div className="gba:space-y-1">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:text-xs gba:text-muted-foreground gba:sm:hidden">Key</div>
                    {(() => {
                      const rawKey = String(kv.key || '').trim()
                      const upperKey = rawKey.toUpperCase()
                      const isUppercase = !rawKey || rawKey === upperKey
                      const isDuplicate = rawKey && (keyCounts.get(upperKey) || 0) > 1
                      if (isDuplicate) return <Badge variant="destructive">Duplicate</Badge>
                      if (!isUppercase) return <Badge variant="outline">Will be uppercased</Badge>
                      return null
                    })()}
                  </div>
                  <Input
                    placeholder="Key (e.g. API_KEY)"
                    value={kv.key}
                    onChange={e => {
                      const next = [...safeRows]
                      next[idx] = { ...next[idx], key: e.target.value }
                      onChange(next)
                    }}
                    onBlur={() => {
                      const rawKey = String(safeRows[idx]?.key || '').trim()
                      if (!rawKey) return
                      const next = [...safeRows]
                      next[idx] = { ...next[idx], key: rawKey.toUpperCase() }
                      onChange(next)
                    }}
                    data-testid={`${testId}-key-${idx}`}
                  />
                  {String(kv.key || '').trim() ? (
                    <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      <span className="gba:font-mono">
                        Use: context.config.
                        {String(kv.key || '')
                          .trim()
                          .toUpperCase()}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="gba:space-y-1">
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                    <div className="gba:text-xs gba:text-muted-foreground gba:sm:hidden">Value</div>
                  </div>
                  {secretsEnabled ? (
                    <CredentialBindField
                      value={kv.value}
                      onChange={nextVal => {
                        const n = [...safeRows]
                        n[idx] = { ...n[idx], value: nextVal }
                        onChange(n)
                      }}
                      bindOptions={bindOptions}
                      plainInputType="text"
                      plainPlaceholder="Plain value (use Credentials tab to store secrets)"
                      data-testid={`${testId}-bind-${idx}`}
                    />
                  ) : (
                    <Input
                      type="text"
                      placeholder="Value"
                      value={kv.value}
                      onChange={e => {
                        const next = [...safeRows]
                        next[idx] = { ...next[idx], value: e.target.value }
                        onChange(next)
                      }}
                      data-testid={`${testId}-value-${idx}`}
                    />
                  )}
                </div>

                <div className="gba:flex gba:items-center gba:justify-end gba:gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const k = String(safeRows[idx]?.key || '').trim()
                      if (!k) return
                      try {
                        await navigator.clipboard.writeText(k.toUpperCase())
                      } catch {
                        // ignore
                      }
                    }}
                    disabled={!String(kv.key || '').trim()}
                    data-testid={`${testId}-copy-${idx}`}
                    aria-label="Copy key"
                  >
                    <Copy className="gba:h-4 gba:w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange(safeRows.filter((_, i) => i !== idx))}
                    disabled={safeRows.length === 1}
                    data-testid={`${testId}-remove-${idx}`}
                    aria-label="Remove row"
                  >
                    <Trash2 className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="gba:flex gba:justify-start">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange([...safeRows, newEmptyConfigRow()])}
            data-testid={`${testId}-add`}
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            Add key
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SettingsEditor
