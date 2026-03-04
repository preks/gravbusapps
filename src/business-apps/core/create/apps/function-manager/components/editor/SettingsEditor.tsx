import React from 'react'
import { Badge, Button, Input, Label } from '@newwork/nw-design-system'
import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'

export type ConfigRow = { key: string; value: string }

export interface SettingsEditorProps {
  rows: ConfigRow[]
  onChange: (rows: ConfigRow[]) => void
  'data-testid'?: string
}

export const SettingsEditor: React.FC<SettingsEditorProps> = ({
  rows,
  onChange,
  'data-testid': testId = 'function-editor-settings'
}) => {
  const safeRows = rows.length ? rows : [{ key: '', value: '' }]
  const [revealed, setRevealed] = React.useState<Record<number, boolean>>({})

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

  const toggleReveal = (idx: number) => {
    setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Label>Settings</Label>
        <Badge variant="secondary">Available at runtime: context.config</Badge>
        {nonEmptyKeyRows.length ? <Badge variant="secondary">{nonEmptyKeyRows.length} keys</Badge> : null}
        {missingValuesCount ? <Badge variant="outline">{missingValuesCount} missing values</Badge> : null}
      </div>

      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4">
        <div className="gba:text-sm gba:text-foreground gba:font-medium">How it works</div>
        <div className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:leading-relaxed">
          Add secrets and environment values here. They will be injected into your function as{' '}
          <span className="gba:font-mono">context.config.&lt;UPPERCASE_KEY&gt;</span>. Keep keys UPPERCASE and don’t log
          secret values.
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
              key={`${String(kv.key || '').trim()}-${idx}`}
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
                  <div className="gba:relative">
                    <Input
                      type={revealed[idx] ? 'text' : 'password'}
                      placeholder="Value"
                      value={kv.value}
                      onChange={e => {
                        const next = [...safeRows]
                        next[idx] = { ...next[idx], value: e.target.value }
                        onChange(next)
                      }}
                      className="gba:pr-10"
                      data-testid={`${testId}-value-${idx}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleReveal(idx)}
                      className="gba:absolute gba:right-1 gba:top-1/2 gba:-translate-y-1/2"
                      data-testid={`${testId}-toggle-${idx}`}
                      aria-label={revealed[idx] ? 'Hide value' : 'Show value'}
                    >
                      {revealed[idx] ? <EyeOff className="gba:h-4 gba:w-4" /> : <Eye className="gba:h-4 gba:w-4" />}
                    </Button>
                  </div>
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
            onClick={() => onChange([...safeRows, { key: '', value: '' }])}
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
