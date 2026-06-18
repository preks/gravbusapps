import React, { useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { Plus, Trash2 } from 'lucide-react'
import type { TaskNodeConfig } from '../../../types/studioTypes'

type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array'

interface OutputFieldRow {
  id: string
  name: string
  type: FieldType
  description?: string
}

function toSchema(fields: OutputFieldRow[]): unknown {
  const properties: Record<string, any> = {}
  for (const f of fields) {
    const name = String(f.name || '').trim()
    if (!name) continue
    properties[name] = {
      type: f.type,
      ...(f.description ? { description: f.description } : {})
    }
  }
  return {
    type: 'object',
    properties
  }
}

function fromSchema(schema: unknown): OutputFieldRow[] {
  try {
    const s: any = schema
    const props: Record<string, any> | undefined = s?.type === 'object' ? s?.properties : undefined
    if (!props || typeof props !== 'object') return []
    return Object.entries(props).map(([name, def], idx) => ({
      id: `${name}-${idx}`,
      name,
      type: (def?.type as FieldType) || 'string',
      description: typeof def?.description === 'string' ? def.description : undefined
    }))
  } catch {
    return []
  }
}

interface AgentOutputSchemaSectionProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  title: string
  description: string
  testId: string
}

export const AgentOutputSchemaSection: React.FC<AgentOutputSchemaSectionProps> = ({
  config,
  update,
  title,
  description,
  testId
}) => {
  const initialRows = useMemo(() => fromSchema(config.agentConfig?.outputSchema), [config.agentConfig?.outputSchema])
  const [rows, setRows] = useState<OutputFieldRow[]>(() => (initialRows.length ? initialRows : []))
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonValue, setJsonValue] = useState(() =>
    JSON.stringify(config.agentConfig?.outputSchema ?? toSchema(rows), null, 2)
  )
  const [jsonError, setJsonError] = useState<string | null>(null)

  const persistRows = (nextRows: OutputFieldRow[]) => {
    setRows(nextRows)
    const schema = toSchema(nextRows)
    update({
      agentConfig: {
        ...(config.agentConfig ?? { promptId: '', promptName: undefined }),
        outputSchema: schema
      }
    })
    setJsonValue(JSON.stringify(schema, null, 2))
    setJsonError(null)
  }

  const onToggleJson = () => {
    const next = !jsonMode
    setJsonMode(next)
    if (next) {
      const schema = config.agentConfig?.outputSchema ?? toSchema(rows)
      setJsonValue(JSON.stringify(schema, null, 2))
      setJsonError(null)
    }
  }

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonValue)
      update({
        agentConfig: {
          ...(config.agentConfig ?? { promptId: '', promptName: undefined }),
          outputSchema: parsed
        }
      })
      setRows(fromSchema(parsed))
      setJsonError(null)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted"
      data-testid={`${testId}-output-schema`}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{title}</Label>
          <p className="gba:text-[11px] gba:text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleJson}
          data-testid={`${testId}-output-schema-toggle`}
        >
          {jsonMode ? 'Visual' : 'JSON'}
        </Button>
      </div>

      {jsonMode ? (
        <div className="gba:flex gba:flex-col gba:gap-2">
          <Textarea
            value={jsonValue}
            onChange={e => setJsonValue(e.target.value)}
            rows={10}
            className="gba:font-mono gba:text-xs"
            data-testid={`${testId}-output-schema-json`}
          />
          {jsonError && <p className="gba:text-xs gba:text-destructive">{jsonError}</p>}
          <div className="gba:flex gba:justify-end">
            <Button type="button" size="sm" onClick={applyJson} data-testid={`${testId}-output-schema-apply`}>
              Apply
            </Button>
          </div>
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-2">
          {rows.length === 0 ? (
            <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-output-schema-empty`}>
              No output fields yet.
            </p>
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-2">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="gba:grid gba:grid-cols-6 gba:gap-2 gba:items-start"
                  data-testid={`${testId}-output-schema-row-${idx}`}
                >
                  <div className="gba:col-span-2">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Field</Label>
                    <Input
                      value={row.name}
                      onChange={e => {
                        const next = rows.slice()
                        next[idx] = { ...row, name: e.target.value }
                        persistRows(next)
                      }}
                      className="gba:h-9 gba:text-xs gba:bg-background"
                      placeholder="e.g. summary"
                      data-testid={`${testId}-output-schema-name-${idx}`}
                    />
                  </div>
                  <div className="gba:col-span-2">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Type</Label>
                    <Select
                      value={row.type}
                      onValueChange={v => {
                        const next = rows.slice()
                        next[idx] = { ...row, type: v as FieldType }
                        persistRows(next)
                      }}
                    >
                      <SelectTrigger
                        className="gba:h-9 gba:text-xs gba:bg-background"
                        data-testid={`${testId}-output-schema-type-${idx}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">string</SelectItem>
                        <SelectItem value="number">number</SelectItem>
                        <SelectItem value="boolean">boolean</SelectItem>
                        <SelectItem value="object">object</SelectItem>
                        <SelectItem value="array">array</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="gba:col-span-2">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Description</Label>
                    <Input
                      value={row.description ?? ''}
                      onChange={e => {
                        const next = rows.slice()
                        next[idx] = { ...row, description: e.target.value }
                        persistRows(next)
                      }}
                      className="gba:h-9 gba:text-xs gba:bg-background"
                      placeholder="Optional"
                      data-testid={`${testId}-output-schema-desc-${idx}`}
                    />
                  </div>
                  <div className="gba:col-span-6 gba:flex gba:justify-end gba:-mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => persistRows(rows.filter((_, i) => i !== idx))}
                      data-testid={`${testId}-output-schema-remove-${idx}`}
                    >
                      <Trash2 className="gba:h-3 gba:w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="gba:flex gba:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                persistRows([...rows, { id: `field-${Date.now()}`, name: '', type: 'string', description: '' }])
              }
              data-testid={`${testId}-output-schema-add`}
            >
              <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
              Add field
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
