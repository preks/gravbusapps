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
import { Info } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  ToolODM,
  MCPConfig,
  ToolSettings,
  SchemaConfig,
  ToolDetails
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

type ToolType = 'mcp'
type McpAuthType = 'none' | 'session' | 'bearer' | 'header'

const MCP_RESERVED_SETTINGS_KEYS = new Set([
  'auth.type',
  'auth.bearerToken',
  'auth.headerName',
  'auth.headerValue',
  'http.headersJson'
])

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
  const toolType: ToolType = 'mcp'

  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpTransport, setMcpTransport] = useState<'sse' | 'websocket' | 'http'>('sse')

  const [settings, setSettings] = useState<ToolSettings>({ config: {} })
  const [configKeys, setConfigKeys] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])

  const getConfigValue = useCallback((key: string) => configKeys.find(kv => kv.key === key)?.value ?? '', [configKeys])

  const setConfigValue = useCallback((key: string, value: string) => {
    setConfigKeys(prev => {
      const next = prev.slice()
      const idx = next.findIndex(kv => kv.key === key)
      const trimmed = value ?? ''

      if (!trimmed) {
        // Remove key if present
        if (idx >= 0) next.splice(idx, 1)
        return next.length > 0 ? next : [{ key: '', value: '' }]
      }

      if (idx >= 0) {
        next[idx] = { key, value: trimmed }
        return next
      }

      return [...next, { key, value: trimmed }]
    })
  }, [])

  const authType = useMemo(() => {
    const v = getConfigValue('auth.type')
    if (v === 'session' || v === 'bearer' || v === 'header') return v
    return 'none'
  }, [getConfigValue])

  const bearerToken = useMemo(() => getConfigValue('auth.bearerToken'), [getConfigValue])
  const headerName = useMemo(() => getConfigValue('auth.headerName'), [getConfigValue])
  const headerValue = useMemo(() => getConfigValue('auth.headerValue'), [getConfigValue])
  const headersJson = useMemo(() => getConfigValue('http.headersJson') || '{}', [getConfigValue])

  // Schema configuration
  const [inputSchema, setInputSchema] = useState<string>('')
  const [inputSchemaError, setInputSchemaError] = useState<string | null>(null)
  const [outputSchema, setOutputSchema] = useState<string>('')
  const [outputSchemaError, setOutputSchemaError] = useState<string | null>(null)
  const [schemaTab, setSchemaTab] = useState<'input' | 'output'>('input')

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    if (mode === 'edit' && tool) {
      setName(tool.name || '')
      setDescription(tool.description || '')
      const mcpConfig = tool.config as MCPConfig
      setMcpUrl(mcpConfig.url || '')
      setMcpTransport(mcpConfig.transport || 'sse')
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
      setMcpUrl('')
      setMcpTransport('sse')
      setSettings({ config: {} })
      setConfigKeys([
        // Defaults so auth controls have sane initial values
        { key: 'auth.type', value: 'none' },
        { key: 'http.headersJson', value: '{}' },
        { key: '', value: '' }
      ])
      setInputSchema('')
      setOutputSchema('')
      setInputSchemaError(null)
      setOutputSchemaError(null)
    }
  }, [mode, tool])

  const isValid = useMemo(() => !!name && !!mcpUrl, [name, mcpUrl])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const config: MCPConfig = { url: mcpUrl, transport: mcpTransport }

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

      // Validate MCP headers JSON if provided
      const hdr = finalSettings.config?.['http.headersJson']
      if (hdr && hdr.trim()) {
        JSON.parse(hdr)
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
    settings,
    configKeys,
    mode,
    tool,
    onCreate,
    onUpdate,
    onSaved,
    onClose
  ])

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
                <div className="gba:text-sm gba:text-muted-foreground">MCP</div>
              </div>
            </CardContent>
          </Card>

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
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMcpUrl(`${getFlowEngineApiBaseUrl()}/mcp`)
                      setMcpTransport('http')
                    }}
                    data-testid="tool-editor-flow-engine-mcp-preset"
                  >
                    Use Flow Engine MCP
                  </Button>
                  <div className="gba:text-xs gba:text-muted-foreground">
                    Default: <code className="gba:font-mono">{`${getFlowEngineApiBaseUrl()}/mcp`}</code>
                  </div>
                </div>
              </div>
              <div className="gba:space-y-2">
                <Label>Transport</Label>
                <Select value={mcpTransport} onValueChange={v => setMcpTransport(v as 'sse' | 'websocket' | 'http')}>
                  <SelectTrigger>
                    <SelectValue placeholder="sse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
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
                        <p>
                          <strong>Auth keys (recommended):</strong> <code>auth.type</code> (none|session|bearer|header),{' '}
                          <code>auth.bearerToken</code>, <code>auth.headerName</code>, <code>auth.headerValue</code>,{' '}
                          <code>http.headersJson</code>.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:space-y-2">
                <Label>Authentication</Label>
                <Select
                  value={authType}
                  onValueChange={v => {
                    const next = v as McpAuthType
                    if (next === 'none') setConfigValue('auth.type', '')
                    else setConfigValue('auth.type', next)

                    if (next !== 'bearer') setConfigValue('auth.bearerToken', '')
                    if (next !== 'header') {
                      setConfigValue('auth.headerName', '')
                      setConfigValue('auth.headerValue', '')
                    }
                  }}
                >
                  <SelectTrigger data-testid="tool-editor-mcp-auth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="session">Use session token</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="header">Custom header</SelectItem>
                  </SelectContent>
                </Select>
                <p className="gba:text-xs gba:text-muted-foreground">
                  For internal MCP tools (e.g. Flow Engine), auth is injected at runtime and these settings are ignored.
                </p>
              </div>

              {authType === 'bearer' && (
                <div className="gba:space-y-2">
                  <Label>Bearer Token</Label>
                  <Input
                    type="password"
                    value={bearerToken}
                    onChange={e => setConfigValue('auth.bearerToken', e.target.value)}
                    data-testid="tool-editor-mcp-bearer-token"
                  />
                </div>
              )}

              {authType === 'header' && (
                <div className="gba:space-y-2">
                  <Label>Custom Header</Label>
                  <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                    <Input
                      value={headerName}
                      onChange={e => setConfigValue('auth.headerName', e.target.value)}
                      placeholder="Header name"
                      data-testid="tool-editor-mcp-header-name"
                    />
                    <Input
                      type="password"
                      value={headerValue}
                      onChange={e => setConfigValue('auth.headerValue', e.target.value)}
                      placeholder="Header value"
                      data-testid="tool-editor-mcp-header-value"
                    />
                  </div>
                </div>
              )}

              <div className="gba:space-y-2">
                <Label>Additional Headers (JSON)</Label>
                <Textarea
                  rows={4}
                  value={headersJson}
                  onChange={e => setConfigValue('http.headersJson', e.target.value)}
                  className="gba:font-mono gba:text-xs"
                  placeholder='{"X-Header":"value"}'
                  data-testid="tool-editor-mcp-headers-json"
                />
              </div>

              <div className="gba:space-y-2">
                <Label>Advanced Runtime Configuration</Label>
                <div className="gba:space-y-2 gba:mt-3">
                  {configKeys
                    .filter(kv => !MCP_RESERVED_SETTINGS_KEYS.has(kv.key))
                    .map((kv, idx) => (
                      <div key={idx} className="gba:flex gba:gap-2">
                        <Input
                          placeholder="Key (e.g. API_KEY)"
                          value={kv.key}
                          onChange={e => {
                            const visible = configKeys.filter(k => !MCP_RESERVED_SETTINGS_KEYS.has(k.key))
                            const current = visible[idx]
                            if (!current) return
                            const next = configKeys.map(k => (k === current ? { ...k, key: e.target.value } : k))
                            setConfigKeys(next)
                          }}
                        />
                        <Input
                          type="password"
                          placeholder="Value"
                          value={kv.value}
                          onChange={e => {
                            const visible = configKeys.filter(k => !MCP_RESERVED_SETTINGS_KEYS.has(k.key))
                            const current = visible[idx]
                            if (!current) return
                            const next = configKeys.map(k => (k === current ? { ...k, value: e.target.value } : k))
                            setConfigKeys(next)
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const visible = configKeys.filter(k => !MCP_RESERVED_SETTINGS_KEYS.has(k.key))
                            const current = visible[idx]
                            if (!current) return
                            setConfigKeys(configKeys.filter(k => k !== current))
                          }}
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
