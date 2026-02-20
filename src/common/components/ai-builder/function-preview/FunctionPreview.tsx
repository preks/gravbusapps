import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Label,
  Input
} from '@newwork/nw-design-system'
import { Play, Zap } from 'lucide-react'
import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'

export interface FunctionPreviewMock {
  id: string
  name: string
  description?: string | null
  source: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export interface FunctionPreviewProps {
  accessToken: string
  /** When provided, functionId is ignored. */
  mockFunction?: FunctionPreviewMock | null
  /** When mockFunction is not provided, fetch by this id. */
  functionId?: string
  'data-testid'?: string
}

function friendlyLabel(key: string): string {
  const lower = key.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export const FunctionPreview: React.FC<FunctionPreviewProps> = ({
  accessToken,
  mockFunction,
  functionId,
  'data-testid': testId = 'function-preview'
}) => {
  const [loaded, setLoaded] = useState<FunctionPreviewMock | null>(mockFunction ?? null)
  const [loading, setLoading] = useState(!mockFunction && !!functionId)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<Record<string, unknown>>({})
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string>('')
  const [testError, setTestError] = useState<string | null>(null)

  const client = useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])
  const isMock = !!mockFunction

  useEffect(() => {
    if (mockFunction) {
      setLoaded(mockFunction)
      setLoading(false)
      const props = (mockFunction.inputSchema as { properties?: Record<string, unknown> })?.properties ?? {}
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
        const meta = fn as { id: string; name: string; description?: string | null; version?: { source?: string } }
        const source = meta.version?.source ?? ''
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
  }, [client, functionId, accessToken, mockFunction])

  const schemaProperties = useMemo(() => {
    if (!loaded?.inputSchema) return {}
    const p = (loaded.inputSchema as { properties?: Record<string, unknown> }).properties
    return (typeof p === 'object' && p !== null ? p : {}) as Record<string, unknown>
  }, [loaded?.inputSchema])

  const runTest = useCallback(async () => {
    if (!loaded) return
    setTestLoading(true)
    setTestError(null)
    setTestResult('')
    if (isMock) {
      setTimeout(() => {
        setTestResult(JSON.stringify({ ok: true, demo: true, message: 'Demo mode: no API call.', payload }, null, 2))
        setTestLoading(false)
      }, 300)
      return
    }
    if (!loaded.source || !accessToken) {
      setTestLoading(false)
      return
    }
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
  }, [client, loaded, payload, accessToken, isMock])

  const setPayloadField = useCallback((key: string, value: unknown) => {
    setPayload(prev => ({ ...prev, [key]: value }))
  }, [])

  if (loading)
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  if (error)
    return (
      <Alert variant="destructive" data-testid={`${testId}-error`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (!loaded)
    return (
      <div className="gba:text-muted-foreground gba:py-4" data-testid={`${testId}-empty`}>
        No tool data.
      </div>
    )

  const propertyKeys = Object.keys(schemaProperties)

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      <Card className="gba:border-border">
        <CardHeader className="gba:border-b gba:border-border">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-xl gba:bg-primary/10">
              <Zap className="gba:h-8 gba:w-8 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <CardTitle className="gba:text-lg">{loaded.name}</CardTitle>
              {loaded.description ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{loaded.description}</p>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  Run this tool with the inputs below and see the result.
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
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
              {propertyKeys.map(key => (
                <div key={key} className="gba:space-y-1">
                  <Label htmlFor={`${testId}-input-${key}`}>{friendlyLabel(key)}</Label>
                  <Input
                    id={`${testId}-input-${key}`}
                    value={String(payload[key] ?? '')}
                    onChange={e => setPayloadField(key, e.target.value)}
                    placeholder={`Enter ${friendlyLabel(key).toLowerCase()}...`}
                    data-testid={`${testId}-input-${key}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">No inputs required. Click Run to execute.</p>
          )}
          <Button variant="default" size="sm" onClick={runTest} disabled={testLoading} data-testid={`${testId}-invoke`}>
            <Play className="gba:h-4 gba:w-4 gba:mr-1" /> {testLoading ? 'Running...' : 'Run'}
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
    </div>
  )
}
