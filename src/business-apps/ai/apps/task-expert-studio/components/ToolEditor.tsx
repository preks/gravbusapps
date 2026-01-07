import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  ToolODM,
  MCPConfig,
  FunctionConfig,
  ToolSettings,
  SchemaConfig,
  ToolDetails
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { useRuntimeInvoke } from '../hooks/useRuntimeInvoke'

type ToolType = 'mcp' | 'function'

export interface ToolEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  tool?: ToolODM | null
  onClose: () => void
  onSaved: () => void
  onCreate?: (entry: ToolDetails) => Promise<ToolODM>
  onUpdate?: (id: string, entry: ToolDetails) => Promise<ToolODM>
}

export const ToolEditor: React.FC<ToolEditorProps> = props => {
  const { mode, tool, onClose, onSaved, onCreate, onUpdate } = props
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [toolType, setToolType] = useState<ToolType>('function')
  const [source, setSource] = useState('')

  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpTransport, setMcpTransport] = useState<'sse' | 'websocket'>('sse')

  const [settings, setSettings] = useState<ToolSettings>({ config: {} })
  const [configKeys, setConfigKeys] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])

  // Schema configuration
  const [inputSchema, setInputSchema] = useState<string>('')
  const [inputSchemaError, setInputSchemaError] = useState<string | null>(null)
  const [outputSchema, setOutputSchema] = useState<string>('')
  const [outputSchemaError, setOutputSchemaError] = useState<string | null>(null)
  const [schemaTab, setSchemaTab] = useState<'input' | 'output'>('input')
  const [isSourceExpanded, setIsSourceExpanded] = useState(false)

  // Testing state (only for function tools)
  const [testPayload, setTestPayload] = useState<string>('{}')
  const [testResult, setTestResult] = useState<string>('')
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { test } = useRuntimeInvoke()

  // Load initial data
  useEffect(() => {
    if (mode === 'edit' && tool) {
      setName(tool.name || '')
      setDescription(tool.description || '')
      setToolType(tool.type || 'function')
      if (tool.type === 'function') {
        const funcConfig = tool.config as FunctionConfig
        setSource(funcConfig.source || '')
      } else if (tool.type === 'mcp') {
        const mcpConfig = tool.config as MCPConfig
        setMcpUrl(mcpConfig.url || '')
        setMcpTransport(mcpConfig.transport || 'sse')
      }
      const toolSettings = tool.settings || { config: {} }
      setSettings(toolSettings)
      // Load config key-value pairs
      if (toolSettings.config) {
        setConfigKeys(Object.entries(toolSettings.config).map(([k, v]) => ({ key: k, value: v })))
      } else {
        setConfigKeys([{ key: '', value: '' }])
      }

      // Load schema configuration (check both camelCase and snake_case field names)
      // API returns schema_config (snake_case), but TypeScript interface uses schemaConfig
      const schemaConfig = tool.schemaConfig || tool.schema_config || null
      if (schemaConfig && typeof schemaConfig === 'object') {
        const inputSchemaStr = schemaConfig.input ? JSON.stringify(schemaConfig.input, null, 2) : ''
        const outputSchemaStr = schemaConfig.output ? JSON.stringify(schemaConfig.output, null, 2) : ''
        setInputSchema(inputSchemaStr)
        setOutputSchema(outputSchemaStr)
      } else {
        setInputSchema('')
        setOutputSchema('')
      }
    } else if (mode === 'create') {
      // Reset all fields for new tool
      setName('')
      setDescription('')
      setToolType('function')
      setSource('')
      setMcpUrl('')
      setMcpTransport('sse')
      setSettings({ config: {} })
      setConfigKeys([{ key: '', value: '' }])
      setInputSchema('')
      setOutputSchema('')
      setInputSchemaError(null)
      setOutputSchemaError(null)
    }
  }, [mode, tool])

  const isValid = useMemo(() => !!name && (toolType === 'mcp' ? !!mcpUrl : !!source), [name, toolType, mcpUrl, source])

  // Get preview lines (first 5 lines) of source code
  const sourcePreview = useMemo(() => {
    if (!source) return ''
    const lines = source.split('\n')
    return lines.slice(0, 5).join('\n')
  }, [source])

  const sourceLineCount = useMemo(() => {
    if (!source) return 0
    return source.split('\n').length
  }, [source])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      let config: MCPConfig | FunctionConfig

      if (toolType === 'mcp') {
        config = { url: mcpUrl, transport: mcpTransport }
      } else {
        config = { runtime: 'js-runtime', source }
      }

      // Build settings with config key-value pairs
      const finalSettings: ToolSettings = {
        ...settings,
        config: configKeys.reduce<Record<string, string>>((acc, kv) => {
          if (kv.key && kv.value) {
            acc[kv.key] = kv.value
          }
          return acc
        }, {})
      }

      // Build schema configuration
      let schemaConfig: SchemaConfig | undefined = undefined
      try {
        const input = inputSchema.trim() ? JSON.parse(inputSchema) : undefined
        const output = outputSchema.trim() ? JSON.parse(outputSchema) : undefined
        if (input || output) {
          schemaConfig = {}
          if (input) schemaConfig.input = input
          if (output) schemaConfig.output = output
        }
      } catch (e) {
        throw new Error(`Invalid JSON schema: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      const payload: ToolDetails = {
        name,
        description,
        type: toolType,
        config,
        settings: finalSettings,
        schemaConfig
      } as ToolDetails

      if (mode === 'create' && onCreate) {
        await onCreate(payload as ToolDetails)
      } else if (mode === 'edit' && tool?._id && onUpdate) {
        // For PUT, we need full tool details matching the tool type
        await onUpdate(tool._id, payload as ToolDetails)
      } else {
        throw new Error('Create or update function not provided')
      }

      setIsSaving(false)
      onSaved()
      onClose()
    } catch (e) {
      setIsSaving(false)
      setError(e instanceof Error ? e.message : 'Failed to save tool')
    }
  }, [
    name,
    description,
    toolType,
    mcpUrl,
    mcpTransport,
    source,
    settings,
    configKeys,
    mode,
    tool,
    onCreate,
    onUpdate,
    onSaved,
    onClose
  ])

  const handleTest = useCallback(async () => {
    if (toolType !== 'function' || !source) {
      setTestError('Source code is required for testing')
      return
    }

    setIsTesting(true)
    setTestError(null)
    setTestResult('')

    try {
      // Parse test payload
      let parsedPayload = {}
      try {
        parsedPayload = JSON.parse(testPayload || '{}')
      } catch {
        throw new Error('Invalid JSON in test payload')
      }

      // Build config and settings from current form state
      const testConfig: FunctionConfig = { runtime: 'js-runtime', source }
      const testSettings: ToolSettings = {
        config: configKeys.reduce<Record<string, string>>((acc, kv) => {
          if (kv.key && kv.value) {
            acc[kv.key] = kv.value
          }
          return acc
        }, {})
      }

      // Build schema configuration for test
      let testSchemaConfig: SchemaConfig | undefined = undefined
      try {
        const hasInputSchema = inputSchema.trim() !== ''
        const hasOutputSchema = outputSchema.trim() !== ''

        if (hasInputSchema || hasOutputSchema) {
          testSchemaConfig = {} as SchemaConfig
          if (hasInputSchema) {
            testSchemaConfig.input = JSON.parse(inputSchema)
          }
          if (hasOutputSchema) {
            testSchemaConfig.output = JSON.parse(outputSchema)
          }
        }
      } catch (e) {
        throw new Error(`Invalid JSON schema: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }

      const testOptions: {
        source: string
        payload: unknown
        config: FunctionConfig
        settings: ToolSettings
        schemaConfig?: SchemaConfig
      } = {
        source,
        payload: parsedPayload,
        config: testConfig,
        settings: testSettings
      }

      // Only add schemaConfig if it's defined and has at least one property
      if (testSchemaConfig && (testSchemaConfig.input || testSchemaConfig.output)) {
        testOptions.schemaConfig = testSchemaConfig
      }

      const result = await test(testOptions)

      setTestResult(JSON.stringify(result, null, 2))
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Test failed')
      setTestResult('')
    } finally {
      setIsTesting(false)
    }
  }, [toolType, source, testPayload, configKeys, inputSchema, outputSchema, test])

  return (
    <div data-testid="tool-editor" className="gba:w-full gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" onClick={onClose} data-testid="tool-editor-back">
            Back
          </Button>
          <div className="gba:text-lg gba:font-semibold">{mode === 'edit' ? name || tool?.name : 'New Tool'}</div>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="default" onClick={handleSave} disabled={!isValid || isSaving} data-testid="tool-editor-save">
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="gba:text-destructive" data-testid="tool-editor-error">
          {error}
        </div>
      )}

      <div className="gba:flex gba:gap-4">
        {/* Main content */}
        <div className="gba:flex-1 gba:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" />
              </div>
              <div className="gba:space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
              </div>
              <div className="gba:space-y-2">
                <Label>Type</Label>
                <div className="gba:flex gba:gap-2">
                  <Button
                    size="sm"
                    variant={toolType === 'function' ? 'default' : 'outline'}
                    onClick={() => setToolType('function')}
                  >
                    Function
                  </Button>
                  <Button
                    size="sm"
                    variant={toolType === 'mcp' ? 'default' : 'outline'}
                    onClick={() => setToolType('mcp')}
                  >
                    MCP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {toolType === 'function' ? (
            <>
              <Card>
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle>Function Source (JS)</CardTitle>
                    {sourceLineCount > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSourceExpanded(!isSourceExpanded)}
                        className="gba:flex gba:items-center gba:gap-1"
                      >
                        {isSourceExpanded ? (
                          <>
                            <ChevronUp className="gba:w-4 gba:h-4" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="gba:w-4 gba:h-4" />
                            Expand {sourceLineCount} lines
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="gba:space-y-3">
                  {isSourceExpanded ? (
                    <Textarea
                      rows={Math.min(sourceLineCount + 2, 30)}
                      value={source}
                      onChange={e => setSource(e.target.value)}
                      placeholder={`export async function handler(event, context) {\n  return { ok: true };\n}`}
                      className="gba:font-mono gba:text-sm"
                    />
                  ) : (
                    <div>
                      <pre className="gba:border gba:rounded-md gba:p-3 gba:bg-muted gba:font-mono gba:text-xs gba:overflow-x-auto gba:max-h-[120px] gba:overflow-y-auto">
                        <code>{sourcePreview || '// No source code yet...'}</code>
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSourceExpanded(true)}
                        className="gba:mt-2 gba:w-full"
                      >
                        Edit Source Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle>Testing</CardTitle>
                    <Button
                      variant="default"
                      onClick={handleTest}
                      disabled={isTesting || !source}
                      data-testid="tool-editor-test-button"
                    >
                      {isTesting ? 'Testing…' : 'Test Function'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="gba:space-y-3">
                  <div className="gba:space-y-2">
                    <Label>Test Payload (JSON)</Label>
                    <Textarea
                      rows={4}
                      value={testPayload}
                      onChange={e => setTestPayload(e.target.value)}
                      placeholder='{"key": "value"}'
                    />
                  </div>
                  {testError && (
                    <div className="gba:text-destructive gba:text-sm" data-testid="tool-editor-test-error">
                      Error: {testError}
                    </div>
                  )}
                  {testResult && (
                    <div className="gba:space-y-2">
                      <Label>Test Result</Label>
                      <Textarea rows={8} readOnly value={testResult} className="gba:font-mono gba:text-xs" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>MCP Configuration</CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                <div className="gba:space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={mcpUrl}
                    onChange={e => setMcpUrl(e.target.value)}
                    placeholder="https://mcp-server.example.com/api"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>Transport</Label>
                  <Select value={mcpTransport} onValueChange={v => setMcpTransport(v as 'sse' | 'websocket')}>
                    <SelectTrigger>
                      <SelectValue placeholder="sse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                      <SelectItem value="websocket">WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: Schema and Settings */}
        <div className="gba:w-80 gba:flex-shrink-0 gba:space-y-4">
          {/* Schema Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>JSON Schema</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <Tabs value={schemaTab} onValueChange={v => setSchemaTab(v as 'input' | 'output')}>
                <TabsList className="gba:w-full">
                  <TabsTrigger value="input" className="gba:flex-1">
                    Input
                  </TabsTrigger>
                  <TabsTrigger value="output" className="gba:flex-1">
                    Output
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="input" className="gba:mt-3">
                  <div className="gba:space-y-2">
                    <Textarea
                      rows={10}
                      value={inputSchema}
                      onChange={e => {
                        setInputSchema(e.target.value)
                        try {
                          if (e.target.value.trim()) {
                            JSON.parse(e.target.value)
                            setInputSchemaError(null)
                          } else {
                            setInputSchemaError(null)
                          }
                        } catch (error) {
                          setInputSchemaError(error instanceof Error ? error.message : 'Invalid JSON')
                        }
                      }}
                      placeholder='{"type": "object", "properties": {"name": {"type": "string"}}}'
                      className="gba:font-mono gba:text-xs gba:border gba:rounded-md gba:bg-muted"
                      data-testid="tool-editor-input-schema"
                    />
                    {inputSchemaError && (
                      <div className="gba:text-destructive gba:text-xs" data-testid="tool-editor-input-schema-error">
                        {inputSchemaError}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="output" className="gba:mt-3">
                  <div className="gba:space-y-2">
                    <Textarea
                      rows={10}
                      value={outputSchema}
                      onChange={e => {
                        setOutputSchema(e.target.value)
                        try {
                          if (e.target.value.trim()) {
                            JSON.parse(e.target.value)
                            setOutputSchemaError(null)
                          } else {
                            setOutputSchemaError(null)
                          }
                        } catch (error) {
                          setOutputSchemaError(error instanceof Error ? error.message : 'Invalid JSON')
                        }
                      }}
                      placeholder='{"type": "object", "properties": {"result": {"type": "string"}}}'
                      className="gba:font-mono gba:text-xs gba:border gba:rounded-md gba:bg-muted"
                      data-testid="tool-editor-output-schema"
                    />
                    {outputSchemaError && (
                      <div className="gba:text-destructive gba:text-xs" data-testid="tool-editor-output-schema-error">
                        {outputSchemaError}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle>Settings</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="gba:max-w-xs">
                      <div className="gba:space-y-2">
                        <p>
                          Key-value pairs for credentials, authentication, environment variables, etc. These will be
                          provided at runtime.
                        </p>
                        {toolType === 'mcp' && (
                          <p>
                            <strong>For MCP tools:</strong> Use keys like <code>API_KEY</code>,{' '}
                            <code>BEARER_TOKEN</code>, <code>X-API-KEY</code>, or custom headers. The runtime will use
                            these for authentication when connecting to the MCP server.
                          </p>
                        )}
                        {toolType === 'function' && (
                          <p>
                            <strong>For Function tools:</strong> These are available as environment variables or in the
                            function context at runtime.
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:space-y-2">
                <Label>Runtime Configuration</Label>
                <div className="gba:space-y-2 gba:mt-3">
                  {configKeys.map((kv, idx) => (
                    <div key={idx} className="gba:flex gba:gap-2">
                      <Input
                        placeholder="Key (e.g. API_KEY)"
                        value={kv.key}
                        onChange={e => {
                          const newKeys = [...configKeys]
                          newKeys[idx].key = e.target.value
                          setConfigKeys(newKeys)
                        }}
                      />
                      <Input
                        type="password"
                        placeholder="Value"
                        value={kv.value}
                        onChange={e => {
                          const newKeys = [...configKeys]
                          newKeys[idx].value = e.target.value
                          setConfigKeys(newKeys)
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfigKeys(configKeys.filter((_, i) => i !== idx))}
                        disabled={configKeys.length === 1}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfigKeys([...configKeys, { key: '', value: '' }])}
                  >
                    + Add Config
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ToolEditor
