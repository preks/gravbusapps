import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { PreviewTemplate } from '../preview-template'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Button,
  Badge,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  TabsContent
} from '@newwork/nw-design-system'
import { Play, Zap, Bot, GitBranch } from 'lucide-react'
import { PreviewHeaderCard } from '../preview-header'
import { friendlyLabel, getSchemaTypeLabel, PreviewTabs, PreviewLoading, PreviewError, PreviewEmpty } from '../shared'
import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'

export interface FunctionDefinition {
  id: string
  name: string
  description?: string | null
  source: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  agentEnabled?: boolean
  workflowEnabled?: boolean
}

export interface FunctionPreviewItem {
  id: string
  label: string
  definition: FunctionDefinition
}

export interface FunctionPreviewProps {
  accessToken: string
  /** Multiple preloaded functions with switcher. */
  items?: FunctionPreviewItem[]
  /** Single preloaded function definition (no switcher). */
  definition?: FunctionDefinition | null
  /** Fetch a single function by id (no switcher). */
  functionId?: string
  'data-testid'?: string
}

function functionSchemaTypeLabel(prop: Record<string, unknown>): string {
  return getSchemaTypeLabel(prop, { stringLabel: 'Short text', objectLabel: 'Data' })
}

export const FunctionPreview: React.FC<FunctionPreviewProps> = ({
  accessToken,
  items,
  definition,
  functionId,
  'data-testid': testId = 'function-preview'
}) => {
  if (items && items.length > 0) {
    return (
      <PreviewTemplate items={items} data-testid={testId}>
        {selectedId => {
          const active = items.find(i => i.id === selectedId) ?? items[0]
          return (
            <FunctionPreviewSingle
              key={active.id}
              accessToken={accessToken}
              definition={active.definition}
              testId={`${testId}-${active.id}`}
            />
          )
        }}
      </PreviewTemplate>
    )
  }
  return (
    <FunctionPreviewSingle accessToken={accessToken} definition={definition} functionId={functionId} testId={testId} />
  )
}

interface FunctionPreviewSingleProps {
  accessToken: string
  definition?: FunctionDefinition | null
  functionId?: string
  testId: string
}

const FunctionPreviewSingle: React.FC<FunctionPreviewSingleProps> = ({
  accessToken,
  definition,
  functionId,
  testId
}) => {
  const [loaded, setLoaded] = useState<FunctionDefinition | null>(definition ?? null)
  const [loading, setLoading] = useState(!definition && !!functionId)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<Record<string, unknown>>({})
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string>('')
  const [testError, setTestError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'try-it'>('overview')

  const client = useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])

  useEffect(() => {
    if (definition) {
      setLoaded(definition)
      setLoading(false)
      const props = (definition.inputSchema as { properties?: Record<string, unknown> })?.properties ?? {}
      setPayload(Object.fromEntries(Object.keys(props).map(k => [k, ''])))
      return
    }
    if (!functionId || !accessToken) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [fn, versionsRes] = await Promise.all([
          client.getFunction(functionId),
          client.getVersions(functionId).catch(() => ({ versions: [] }))
        ])
        if (cancelled) return
        const meta = fn.metadata as { id: string; name: string; description?: string | null }
        const source = fn.version?.source ?? ''
        const versions = versionsRes.versions ?? []
        const latestVer = versions.length > 0 ? versions.reduce((a, b) => (a.version > b.version ? a : b)) : null
        const inputSchema = (latestVer?.inputSchema as Record<string, unknown>) ?? {}
        const outputSchema = (latestVer?.outputSchema as Record<string, unknown>) ?? {}
        setLoaded({
          id: meta.id,
          name: meta.name,
          description: meta.description ?? undefined,
          source: typeof source === 'string' ? source : '',
          inputSchema: typeof inputSchema === 'object' && inputSchema !== null ? inputSchema : {},
          outputSchema:
            typeof outputSchema === 'object' && outputSchema !== null && Object.keys(outputSchema).length > 0
              ? outputSchema
              : undefined
        })
        const props = (inputSchema as { properties?: Record<string, unknown> }).properties ?? {}
        setPayload(Object.fromEntries(Object.keys(props).map(k => [k, ''])))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load this tool')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, functionId, accessToken, definition])

  const schemaProperties = useMemo(() => {
    if (!loaded?.inputSchema) return {}
    const p = loaded.inputSchema['properties']
    return typeof p === 'object' && p !== null ? (p as Record<string, unknown>) : {}
  }, [loaded?.inputSchema])

  const requiredFields = useMemo(() => {
    if (!loaded?.inputSchema) return [] as string[]
    const r = (loaded.inputSchema as { required?: string[] }).required
    return Array.isArray(r) ? r : []
  }, [loaded?.inputSchema])

  const outputProperties = useMemo(() => {
    if (!loaded?.outputSchema) return {} as Record<string, unknown>
    const p = loaded.outputSchema['properties']
    return typeof p === 'object' && p !== null ? (p as Record<string, unknown>) : {}
  }, [loaded?.outputSchema])

  const runTest = useCallback(async () => {
    if (!loaded?.source || !accessToken) return
    setTestLoading(true)
    setTestError(null)
    setTestResult('')
    try {
      const res = await client.testFunction({
        source: loaded.source,
        payload,
        inputSchema: loaded.inputSchema
      })
      setTestResult(JSON.stringify(res.result, null, 2))
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Something went wrong. Please check your inputs and try again.')
    } finally {
      setTestLoading(false)
    }
  }, [client, loaded, payload, accessToken])

  const setPayloadField = useCallback((key: string, value: unknown) => {
    setPayload(prev => ({ ...prev, [key]: value }))
  }, [])

  if (loading) return <PreviewLoading testId={testId} />
  if (error) return <PreviewError testId={testId} message={error} />
  if (!loaded) return <PreviewEmpty testId={testId} message="No tool data." />

  const propertyKeys = Object.keys(schemaProperties)
  const outputKeys = Object.keys(outputProperties)

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:min-h-0" data-testid={testId}>
      <PreviewHeaderCard
        icon={Zap}
        title={loaded.name}
        description={loaded.description ?? 'Run this tool with the inputs below and see the result.'}
        badges={
          loaded.agentEnabled || loaded.workflowEnabled ? (
            <>
              {loaded.agentEnabled && (
                <Badge variant="outline" className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                  <Bot className="gba:h-3 gba:w-3" />
                  Agent-enabled
                </Badge>
              )}
              {loaded.workflowEnabled && (
                <Badge variant="outline" className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                  <GitBranch className="gba:h-3 gba:w-3" />
                  Workflow-enabled
                </Badge>
              )}
            </>
          ) : undefined
        }
        data-testid={`${testId}-header`}
      />

      <PreviewTabs value={activeTab} onValueChange={setActiveTab} testId={testId}>
        <TabsContent
          value="overview"
          className="gba:mt-0 gba:flex-1 gba:min-h-0 gba:space-y-4"
          data-testid={`${testId}-overview`}
        >
          <Card className="gba:border-border gba:overflow-hidden">
            <CardHeader className="gba:py-3 gba:border-b gba:border-border">
              <CardTitle className="gba:text-sm gba:font-medium">What you provide</CardTitle>
            </CardHeader>
            <CardContent className="gba:p-0">
              {propertyKeys.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:py-6 gba:px-4">No inputs required.</p>
              ) : (
                <ul className="gba:divide-y gba:divide-border">
                  {propertyKeys.map(key => {
                    const prop = schemaProperties[key] as Record<string, unknown>
                    const isRequired = requiredFields.includes(key)
                    return (
                      <li
                        key={key}
                        className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3 gba:text-sm"
                        data-testid={`${testId}-overview-input-${key}`}
                      >
                        <div className="gba:min-w-0 gba:flex-1">
                          <span className="gba:font-medium gba:text-foreground">{friendlyLabel(key)}</span>
                          <span className="gba:text-muted-foreground gba:ml-2">{functionSchemaTypeLabel(prop)}</span>
                        </div>
                        <Badge variant="outline" className="gba:text-xs gba:shrink-0">
                          {isRequired ? 'Required' : 'Optional'}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="gba:border-border gba:overflow-hidden">
            <CardHeader className="gba:py-3 gba:border-b gba:border-border">
              <CardTitle className="gba:text-sm gba:font-medium">What you get back</CardTitle>
            </CardHeader>
            <CardContent className="gba:p-0">
              {outputKeys.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:py-6 gba:px-4">
                  No structured output described.
                </p>
              ) : (
                <ul className="gba:divide-y gba:divide-border">
                  {outputKeys.map(key => {
                    const prop = outputProperties[key] as Record<string, unknown>
                    return (
                      <li
                        key={key}
                        className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:text-sm"
                        data-testid={`${testId}-overview-output-${key}`}
                      >
                        <span className="gba:font-medium gba:text-foreground gba:shrink-0">{friendlyLabel(key)}</span>
                        <span className="gba:text-muted-foreground">{functionSchemaTypeLabel(prop)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="try-it" className="gba:mt-0 gba:flex-1 gba:min-h-0" data-testid={`${testId}-try-it`}>
          {/* Run and test */}
          <Card className="gba:border-border">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <Play className="gba:h-4 gba:w-4" /> Run and test
              </CardTitle>
              <p className="gba:text-sm gba:text-muted-foreground">
                Enter the required information and run the tool to see the result.
              </p>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              {propertyKeys.length > 0 ? (
                <div className="gba:space-y-3">
                  {propertyKeys.map(key => {
                    const prop = schemaProperties[key] as Record<string, unknown>
                    const type = prop?.type as string | undefined
                    const enumValues = prop?.enum as unknown[] | undefined
                    const description = prop?.description as string | undefined
                    const isRequired = requiredFields.includes(key)
                    const label = friendlyLabel(key)

                    return (
                      <div key={key} className="gba:space-y-1">
                        <Label htmlFor={`${testId}-input-${key}`}>
                          {label}
                          {isRequired && <span className="gba:text-destructive gba:ml-0.5">*</span>}
                        </Label>
                        {description && <p className="gba:text-xs gba:text-muted-foreground">{description}</p>}
                        {(() => {
                          const payloadStringValue = typeof payload[key] === 'string' ? payload[key] : ''
                          if (type === 'boolean') {
                            return (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <Checkbox
                                  id={`${testId}-input-${key}`}
                                  checked={!!payload[key]}
                                  onCheckedChange={checked => setPayloadField(key, checked)}
                                  data-testid={`${testId}-input-${key}`}
                                />
                                <Label
                                  htmlFor={`${testId}-input-${key}`}
                                  className="gba:cursor-pointer gba:font-normal"
                                >
                                  {payload[key] ? 'Yes' : 'No'}
                                </Label>
                              </div>
                            )
                          }
                          if (enumValues && enumValues.length > 0) {
                            return (
                              <Select value={payloadStringValue} onValueChange={v => setPayloadField(key, v)}>
                                <SelectTrigger id={`${testId}-input-${key}`} data-testid={`${testId}-input-${key}`}>
                                  <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {enumValues.map(v => (
                                    <SelectItem key={String(v)} value={String(v)}>
                                      {String(v)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          }
                          if (type === 'number' || type === 'integer') {
                            return (
                              <Input
                                id={`${testId}-input-${key}`}
                                type="number"
                                value={payloadStringValue}
                                onChange={e =>
                                  setPayloadField(
                                    key,
                                    type === 'integer'
                                      ? Number.parseInt(e.target.value) || 0
                                      : Number.parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder={description ?? `Enter ${label.toLowerCase()}...`}
                                data-testid={`${testId}-input-${key}`}
                              />
                            )
                          }
                          return (
                            <Input
                              id={`${testId}-input-${key}`}
                              value={payloadStringValue}
                              onChange={e => setPayloadField(key, e.target.value)}
                              placeholder={description ?? `Enter ${label.toLowerCase()}...`}
                              data-testid={`${testId}-input-${key}`}
                            />
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground">No inputs required. Click Run to execute.</p>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={runTest}
                disabled={testLoading}
                data-testid={`${testId}-invoke`}
              >
                <Play className="gba:h-4 gba:w-4 gba:mr-1" />
                {testLoading ? 'Running...' : 'Run'}
              </Button>

              {testError && (
                <Alert variant="destructive">
                  <AlertDescription>{testError}</AlertDescription>
                </Alert>
              )}

              {testResult && (
                <div className="gba:mt-4 gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-4">
                  <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Result</p>
                  <pre
                    className="gba:text-sm gba:text-foreground gba:overflow-auto gba:max-h-40 gba:whitespace-pre-wrap"
                    data-testid={`${testId}-result`}
                  >
                    {testResult}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </PreviewTabs>
    </div>
  )
}
