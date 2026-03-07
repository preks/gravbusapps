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

export interface TestFunctionCardProps {
  source: string
  schemaProperties: Record<string, unknown>
  requiredFields: string[]
  payload: Record<string, unknown>
  onPayloadChange: (payload: Record<string, unknown>) => void
  onPayloadFieldChange: (key: string, value: unknown) => void
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
  payload,
  onPayloadChange,
  onPayloadFieldChange,
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

  const content = (
    <div className="gba:space-y-4">
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
