import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from '@newwork/nw-design-system'
import { Check, Copy } from 'lucide-react'
import { CodeEditor } from './CodeEditor'
import { newEmptyConfigRow, type ConfigRow } from './SettingsEditor'
import { CredentialBindField } from '@/common/components/credential-bind/CredentialBindField'
import type { CredentialBindOption } from '@/common/utils/credentialBindOptions'

/** True when JSON Schema says this property is an array of strings (lenient multi-line + CSV editor). */
function arrayItemsAreStrings(propObj: Record<string, unknown>): boolean {
  const items = propObj.items
  if (!items || typeof items !== 'object' || Array.isArray(items)) return false
  return (items as Record<string, unknown>).type === 'string'
}

/** Render either an array or a previously mistyped string into the textarea verbatim (one per line). */
function stringArrayFieldLines(value: unknown, defaultValue: unknown): string {
  if (Array.isArray(value)) {
    return value.map(v => String(v)).join('\n')
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(defaultValue)) {
    return defaultValue.map(v => String(v)).join('\n')
  }
  return ''
}

/**
 * Parse a textarea value into a string[] using a lenient rule:
 * - split on newline AND comma (so "'Python', 'Go'" or multi-line both work)
 * - trim each token
 * - strip optional matching single/double quotes or backticks on the outside
 * - drop empty tokens
 */
function parseStringArrayInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(tok => tok.trim())
    .map(tok => {
      if (tok.length >= 2) {
        const first = tok[0]
        const last = tok[tok.length - 1]
        if ((first === '"' || first === "'" || first === '`') && first === last) {
          return tok.slice(1, -1).trim()
        }
      }
      return tok
    })
    .filter(tok => tok.length > 0)
}

export interface TestFunctionCardProps {
  source: string
  schemaProperties: Record<string, unknown>
  requiredFields: string[]
  /**
   * Optional example payloads surfaced as clickable presets in the Test tab.
   * Normalised from JSON-Schema `examples` / `x-testExamples` in the editor hook.
   */
  examples?: Array<{ name: string; description?: string; payload: Record<string, unknown> }>
  payload: Record<string, unknown>
  onPayloadChange: (payload: Record<string, unknown>) => void
  onPayloadFieldChange: (key: string, value: unknown) => void
  testOverrideRows: ConfigRow[]
  onTestOverrideRowsChange: (rows: ConfigRow[]) => void
  /** When set, value column can bind fnsecret refs like function settings. */
  credentialBindOptions?: CredentialBindOption[]
  onTest: () => void
  isTesting: boolean
  testError: string | null
  testResult: string
  testLogs?: Array<{ level: string; message: string }>
  onFixWithAi?: () => void
  isFixingWithAi?: boolean
  fixWithAiError?: string | null
  variant?: 'card' | 'embedded'
  'data-testid'?: string
}

export const TestFunctionCard: React.FC<TestFunctionCardProps> = ({
  source,
  schemaProperties,
  requiredFields,
  examples,
  payload,
  onPayloadChange,
  onPayloadFieldChange,
  testOverrideRows,
  onTestOverrideRowsChange,
  credentialBindOptions,
  onTest,
  isTesting,
  testError,
  testResult,
  testLogs,
  onFixWithAi,
  isFixingWithAi = false,
  fixWithAiError,
  variant = 'card',
  'data-testid': testId = 'function-editor-test'
}) => {
  const hasSchemaFields = Object.keys(schemaProperties || {}).length > 0
  const [hasCopiedResult, setHasCopiedResult] = React.useState(false)
  const [hasCopiedLogs, setHasCopiedLogs] = React.useState(false)
  /** Draft text for non–string-array JSON Schema `array` fields while the JSON is temporarily invalid. */
  const [genericArrayJsonDraft, setGenericArrayJsonDraft] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    setGenericArrayJsonDraft({})
  }, [schemaProperties])
  const logsText = React.useMemo(() => {
    const logs = Array.isArray(testLogs) ? testLogs : []
    return logs
      .map(l => {
        const level = String((l as any)?.level || 'log')
        const msg = String((l as any)?.message || '')
        return `[${level}] ${msg}`
      })
      .filter(Boolean)
      .join('\n')
  }, [testLogs])

  const copyToClipboard = React.useCallback(async (text: string) => {
    const t = String(text || '')
    if (!t.trim()) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(t)
        return
      }
    } catch {
      // fall through to legacy copy
    }

    const el = document.createElement('textarea')
    el.value = t
    el.setAttribute('readonly', 'true')
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(el)
    }
  }, [])

  const handleCopyResult = React.useCallback(async () => {
    try {
      await copyToClipboard(testResult)
      setHasCopiedResult(true)
      window.setTimeout(() => setHasCopiedResult(false), 1200)
    } catch {
      // ignore
    }
  }, [copyToClipboard, testResult])

  const handleCopyLogs = React.useCallback(async () => {
    try {
      await copyToClipboard(logsText)
      setHasCopiedLogs(true)
      window.setTimeout(() => setHasCopiedLogs(false), 1200)
    } catch {
      // ignore
    }
  }, [copyToClipboard, logsText])

  const isNon200Result = React.useMemo(() => {
    if (!testResult || !String(testResult).trim()) return false
    try {
      const parsed = JSON.parse(testResult) as any
      const code =
        typeof parsed?.statusCode === 'number'
          ? parsed.statusCode
          : typeof parsed?.status === 'number'
            ? parsed.status
            : undefined
      if (typeof code === 'number') return code !== 200
      return false
    } catch {
      return false
    }
  }, [testResult])
  const isUnsuccessfulResult = React.useMemo(() => {
    if (!testResult || !String(testResult).trim()) return false
    try {
      const parsed = JSON.parse(testResult) as any
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
      if (parsed?.success === false) return true
      if (parsed?.ok === false) return true
      if (typeof parsed?.error === 'string' && parsed.error.trim()) return true
      return false
    } catch {
      return false
    }
  }, [testResult])
  const showFixWithAi = Boolean(onFixWithAi) && (Boolean(testError) || isNon200Result || isUnsuccessfulResult)

  const safeOverrideRows = testOverrideRows?.length ? testOverrideRows : [{ key: '', value: '' }]

  const content = (
    <div className="gba:space-y-4">
      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/20 gba:p-4 gba:space-y-3">
        <div>
          <Label className="gba:text-sm">Test-only config overrides</Label>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            Plaintext merged after stored credentials resolve for this run only. Nothing here is saved with the
            function.
          </p>
        </div>
        <div className="gba:space-y-2">
          {safeOverrideRows.map((kv, idx) => (
            <div
              key={`to-${idx}`}
              className="gba:grid gba:grid-cols-1 gba:gap-2 gba:sm:grid-cols-[1fr_1fr_auto] gba:items-end"
            >
              <div className="gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">Key</Label>
                <Input
                  placeholder="API_KEY"
                  value={kv.key}
                  onChange={e => {
                    const next = [...safeOverrideRows]
                    next[idx] = { ...next[idx], key: e.target.value }
                    onTestOverrideRowsChange(next)
                  }}
                  data-testid={`${testId}-override-key-${idx}`}
                />
              </div>
              <div className="gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">Value</Label>
                {credentialBindOptions && credentialBindOptions.length ? (
                  <CredentialBindField
                    value={kv.value}
                    onChange={nextVal => {
                      const next = [...safeOverrideRows]
                      next[idx] = { ...next[idx], value: nextVal }
                      onTestOverrideRowsChange(next)
                    }}
                    bindOptions={credentialBindOptions}
                    plainPlaceholder="override for test"
                    data-testid={`${testId}-override-value-${idx}`}
                  />
                ) : (
                  <Input
                    type="text"
                    placeholder="override for test"
                    value={kv.value}
                    onChange={e => {
                      const next = [...safeOverrideRows]
                      next[idx] = { ...next[idx], value: e.target.value }
                      onTestOverrideRowsChange(next)
                    }}
                    data-testid={`${testId}-override-value-${idx}`}
                  />
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gba:justify-self-end"
                disabled={safeOverrideRows.length <= 1}
                onClick={() => onTestOverrideRowsChange(safeOverrideRows.filter((_, i) => i !== idx))}
                data-testid={`${testId}-override-remove-${idx}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onTestOverrideRowsChange([...safeOverrideRows, newEmptyConfigRow()])}
          data-testid={`${testId}-override-add`}
        >
          Add override row
        </Button>
      </div>

      {examples && examples.length > 0 ? (
        <div
          className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/10 gba:p-4 gba:space-y-3"
          data-testid={`${testId}-examples`}
        >
          <div>
            <Label className="gba:text-sm">Example payloads</Label>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              Click an example to load it into the form / JSON below. Edit as needed before running.
            </p>
          </div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {examples.map((ex, idx) => (
              <Button
                key={`${testId}-example-${idx}`}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPayloadChange({ ...ex.payload })}
                title={ex.description || undefined}
                data-testid={`${testId}-example-${idx}`}
              >
                {ex.name}
              </Button>
            ))}
          </div>
          {examples.some(e => e.description) ? (
            <ul className="gba:text-xs gba:text-muted-foreground gba:space-y-1 gba:pl-4 gba:list-disc">
              {examples.map((ex, idx) =>
                ex.description ? (
                  <li key={`${testId}-example-desc-${idx}`}>
                    <span className="gba:font-medium">{ex.name}:</span> {ex.description}
                  </li>
                ) : null
              )}
            </ul>
          ) : null}
        </div>
      ) : null}

      {hasSchemaFields ? (
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-2">
          <div className="gba:space-y-4">
            <Label>Input Fields</Label>
            <div className="gba:space-y-3">
              {Object.entries(schemaProperties).map(([key, prop]) => {
                const propObj = prop as Record<string, unknown>
                const propType = propObj.type as string
                const isRequired = requiredFields.includes(key)
                const description = propObj.description as string | undefined
                const defaultValue = propObj.default as unknown
                const enumValues = propObj.enum as unknown[] | undefined

                return (
                  <div key={key} className="gba:space-y-1">
                    <Label htmlFor={`${testId}-field-${key}`}>
                      {key}
                      {isRequired ? <span className="gba:text-destructive"> *</span> : null}
                    </Label>
                    {description ? <p className="gba:text-xs gba:text-muted-foreground">{description}</p> : null}

                    {propType === 'string' && enumValues ? (
                      <Select
                        value={String(payload[key] || defaultValue || '')}
                        onValueChange={value => onPayloadFieldChange(key, value)}
                      >
                        <SelectTrigger id={`${testId}-field-${key}`} data-testid={`${testId}-field-${key}`}>
                          <SelectValue placeholder={`Select ${key}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {enumValues.map((val, idx) => (
                            <SelectItem key={`${key}-${idx}`} value={String(val)}>
                              {String(val)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : propType === 'boolean' ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Checkbox
                          id={`${testId}-field-${key}`}
                          checked={Boolean(payload[key] ?? defaultValue ?? false)}
                          onCheckedChange={checked => onPayloadFieldChange(key, checked)}
                          data-testid={`${testId}-field-${key}`}
                        />
                        <Label htmlFor={`${testId}-field-${key}`} className="gba:cursor-pointer">
                          {String(payload[key] ?? defaultValue ?? false)}
                        </Label>
                      </div>
                    ) : propType === 'number' || propType === 'integer' ? (
                      <Input
                        id={`${testId}-field-${key}`}
                        type="number"
                        value={String(payload[key] ?? defaultValue ?? '')}
                        onChange={e =>
                          onPayloadFieldChange(
                            key,
                            propType === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder={description || `Enter ${key}`}
                        data-testid={`${testId}-field-${key}`}
                      />
                    ) : propType === 'array' && arrayItemsAreStrings(propObj) ? (
                      <Textarea
                        id={`${testId}-field-${key}`}
                        rows={4}
                        className="gba:font-mono gba:text-sm"
                        value={stringArrayFieldLines(payload[key], defaultValue)}
                        onChange={e => onPayloadFieldChange(key, parseStringArrayInput(e.target.value))}
                        placeholder={description || 'One value per line, or comma-separated'}
                        data-testid={`${testId}-field-${key}`}
                      />
                    ) : propType === 'array' ? (
                      <Textarea
                        id={`${testId}-field-${key}`}
                        rows={6}
                        className="gba:font-mono gba:text-sm"
                        value={
                          genericArrayJsonDraft[key] !== undefined
                            ? genericArrayJsonDraft[key]
                            : Array.isArray(payload[key])
                              ? JSON.stringify(payload[key], null, 2)
                              : defaultValue !== undefined && Array.isArray(defaultValue)
                                ? JSON.stringify(defaultValue, null, 2)
                                : '[]'
                        }
                        onChange={e => {
                          const t = e.target.value
                          setGenericArrayJsonDraft(prev => ({ ...prev, [key]: t }))
                          try {
                            const parsed = JSON.parse(t.trim() === '' ? '[]' : t)
                            if (Array.isArray(parsed)) {
                              onPayloadFieldChange(key, parsed)
                              setGenericArrayJsonDraft(prev => {
                                const next = { ...prev }
                                delete next[key]
                                return next
                              })
                            }
                          } catch {
                            /* keep draft until JSON becomes valid */
                          }
                        }}
                        placeholder='JSON array, e.g. [1, 2] or [{"id": "a"}]'
                        data-testid={`${testId}-field-${key}`}
                      />
                    ) : (
                      <Input
                        id={`${testId}-field-${key}`}
                        type="text"
                        value={String(payload[key] ?? defaultValue ?? '')}
                        onChange={e => onPayloadFieldChange(key, e.target.value)}
                        placeholder={description || `Enter ${key}`}
                        data-testid={`${testId}-field-${key}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>Payload Preview</Label>
            <div className="gba:border gba:rounded-md gba:overflow-hidden gba:min-h-72">
              <CodeEditor
                language="json"
                value={JSON.stringify(payload, null, 2)}
                onChange={() => {}}
                height="300px"
                readOnly
                data-testid={`${testId}-payload-preview`}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="gba:space-y-2">
          <Label>Test Payload (JSON)</Label>
          <Textarea
            value={JSON.stringify(payload, null, 2)}
            onChange={e => {
              try {
                onPayloadChange(JSON.parse(e.target.value || '{}'))
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"name": "Alice", "greeting": "Hi"}'
            rows={5}
            className="gba:font-mono gba:text-sm"
            data-testid={`${testId}-payload`}
          />
        </div>
      )}

      <div className="gba:flex gba:flex-wrap gba:gap-2">
        <Button
          variant="default"
          onClick={onTest}
          disabled={!source.trim() || isTesting || isFixingWithAi}
          data-testid={`${testId}-run`}
        >
          {isTesting ? 'Testing…' : 'Test Function'}
        </Button>

        {showFixWithAi ? (
          <Button
            variant="secondary"
            onClick={onFixWithAi}
            disabled={!source.trim() || isTesting || isFixingWithAi}
            data-testid={`${testId}-fix-ai`}
          >
            {isFixingWithAi ? 'Fixing…' : 'Fix with AI'}
          </Button>
        ) : null}
      </div>

      {testError ? (
        <div className="gba:text-destructive gba:text-sm" data-testid={`${testId}-error`}>
          {testError}
        </div>
      ) : null}

      {fixWithAiError ? (
        <div className="gba:text-destructive gba:text-sm" data-testid={`${testId}-fix-ai-error`}>
          {fixWithAiError}
        </div>
      ) : null}

      {testResult ? (
        logsText ? (
          <div className="gba:space-y-2" data-testid={`${testId}-output`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
              <Label>Output</Label>
            </div>
            <Tabs defaultValue="result" data-testid={`${testId}-output-tabs`}>
              <TabsList>
                <TabsTrigger value="result" data-testid={`${testId}-output-tab-result`}>
                  Result
                </TabsTrigger>
                <TabsTrigger value="logs" data-testid={`${testId}-output-tab-logs`}>
                  Logs
                </TabsTrigger>
              </TabsList>
              <TabsContent value="result" className="gba:mt-2">
                <div
                  className="gba:relative gba:max-h-72 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted"
                  data-testid={`${testId}-result-container`}
                >
                  <pre
                    className="gba:whitespace-pre-wrap gba:break-words gba:font-mono gba:text-sm gba:p-3 gba:pr-12"
                    data-testid={`${testId}-result`}
                  >
                    {testResult}
                  </pre>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyResult}
                    disabled={!String(testResult || '').trim()}
                    className="gba:absolute gba:top-2 gba:right-2"
                    data-testid={`${testId}-result-copy`}
                    aria-label={hasCopiedResult ? 'Copied' : 'Copy result'}
                  >
                    {hasCopiedResult ? <Check className="gba:h-4 gba:w-4" /> : <Copy className="gba:h-4 gba:w-4" />}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="logs" className="gba:mt-2">
                <div
                  className="gba:relative gba:max-h-72 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted"
                  data-testid={`${testId}-logs-container`}
                >
                  <pre
                    className="gba:whitespace-pre-wrap gba:break-words gba:font-mono gba:text-sm gba:p-3 gba:pr-12"
                    data-testid={`${testId}-logs`}
                  >
                    {logsText}
                  </pre>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyLogs}
                    disabled={!logsText.trim()}
                    className="gba:absolute gba:top-2 gba:right-2"
                    data-testid={`${testId}-logs-copy`}
                    aria-label={hasCopiedLogs ? 'Copied' : 'Copy logs'}
                  >
                    {hasCopiedLogs ? <Check className="gba:h-4 gba:w-4" /> : <Copy className="gba:h-4 gba:w-4" />}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="gba:space-y-2">
            <Label>Result</Label>
            <div
              className="gba:relative gba:max-h-72 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted"
              data-testid={`${testId}-result-container`}
            >
              <pre
                className="gba:whitespace-pre-wrap gba:break-words gba:font-mono gba:text-sm gba:p-3 gba:pr-12"
                data-testid={`${testId}-result`}
              >
                {testResult}
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyResult}
                disabled={!String(testResult || '').trim()}
                className="gba:absolute gba:top-2 gba:right-2"
                data-testid={`${testId}-result-copy`}
                aria-label={hasCopiedResult ? 'Copied' : 'Copy result'}
              >
                {hasCopiedResult ? <Check className="gba:h-4 gba:w-4" /> : <Copy className="gba:h-4 gba:w-4" />}
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  )

  if (variant === 'embedded') {
    return (
      <div className="gba:pt-4" data-testid={testId}>
        {content}
      </div>
    )
  }

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>Test Function</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">{content}</CardContent>
    </Card>
  )
}

export default TestFunctionCard
