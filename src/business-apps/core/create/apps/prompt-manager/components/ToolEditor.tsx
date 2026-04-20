import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Checkbox,
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
  useTranslation,
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
  ToolDetails,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import translations from '../_i18n'
import { useCredentialBindOptions } from '@/common/hooks/useCredentialBindOptions'
import { CredentialBindField } from '@/common/components/credential-bind/CredentialBindField'
type ToolType = 'mcp'
type McpAuthType = 'none' | 'bearer' | 'basic' | 'header' | 'oauth_client_credentials'

export interface ToolEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  tool?: ToolODM | null
  onClose: () => void
  onSaved: () => void
  onCreate?: (entry: ToolDetails) => Promise<ToolODM>
  onUpdate?: (id: string, entry: ToolDetails) => Promise<ToolODM>
}

export const ToolEditor: React.FC<ToolEditorProps> = props => {
  const { mode, tool, onClose, onSaved, onCreate, onUpdate, accessToken } = props
  const { t } = useTranslation(translations)
  const { credentialBindOptions } = useCredentialBindOptions(accessToken)
  const [name, setName] = useState('')
  const toolType: ToolType = 'mcp'
  const pmClient = usePromptManagerClient(accessToken)

  // Test connection state
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpTransport, setMcpTransport] = useState<'sse' | 'websocket' | 'http'>('sse')
  const [externalConnectionId, setExternalConnectionId] = useState<string>('')
  const [availableConnections, setAvailableConnections] = useState<ExternalConnectionODM[]>([])

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
    if (v === 'bearer' || v === 'basic' || v === 'header' || v === 'oauth_client_credentials') return v
    return 'none'
  }, [getConfigValue])

  const preferSession = useMemo(() => {
    const rawType = getConfigValue('auth.type')
    const raw = getConfigValue('auth.preferSession')
    if (rawType === 'session') return true
    const s = String(raw || '')
      .trim()
      .toLowerCase()
    return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on'
  }, [getConfigValue])

  const bearerToken = useMemo(() => getConfigValue('auth.bearerToken'), [getConfigValue])
  const basicUsername = useMemo(() => getConfigValue('auth.basicUsername'), [getConfigValue])
  const basicPassword = useMemo(() => getConfigValue('auth.basicPassword'), [getConfigValue])
  const headerName = useMemo(() => getConfigValue('auth.headerName'), [getConfigValue])
  const headerValue = useMemo(() => getConfigValue('auth.headerValue'), [getConfigValue])
  const oauthTokenUrl = useMemo(() => getConfigValue('auth.oauth.tokenUrl'), [getConfigValue])
  const oauthClientId = useMemo(() => getConfigValue('auth.oauth.clientId'), [getConfigValue])
  const oauthClientSecret = useMemo(() => getConfigValue('auth.oauth.clientSecret'), [getConfigValue])
  const oauthScope = useMemo(() => getConfigValue('auth.oauth.scope'), [getConfigValue])
  const headersJson = useMemo(() => getConfigValue('http.headersJson') || '{}', [getConfigValue])

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    if (mode === 'edit' && tool) {
      setName(tool.name || '')
      const mcpConfig = tool.config as MCPConfig
      setMcpUrl(mcpConfig.url || '')
      setMcpTransport(mcpConfig.transport || 'sse')
      setExternalConnectionId(tool.externalConnectionId || tool.external_connection_id || '')
      const toolSettings = tool.settings || { config: {} }
      setSettings(toolSettings)
      // Load config key-value pairs
      if (toolSettings.config) {
        setConfigKeys(Object.entries(toolSettings.config).map(([k, v]) => ({ key: k, value: v })))
      } else {
        setConfigKeys([{ key: '', value: '' }])
      }
    } else if (mode === 'create') {
      // Reset all fields for new tool
      setName('')
      setMcpUrl('')
      setMcpTransport('sse')
      setExternalConnectionId('')
      setSettings({ config: {} })
      setConfigKeys([
        // Defaults so auth controls have sane initial values
        { key: 'auth.type', value: 'none' },
        { key: 'http.headersJson', value: '{}' },
        { key: '', value: '' }
      ])
    }
  }, [mode, tool])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await pmClient.getExternalConnections({
          kind: 'mcp',
          consumerType: 'mcp_tool',
          limit: 100,
          offset: 0,
          returnTotalRecords: true
        })
        if (!cancelled) setAvailableConnections(result.data || [])
      } catch {
        if (!cancelled) setAvailableConnections([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pmClient])

  const selectedExternalConnection = useMemo(
    () =>
      availableConnections.find(
        connection => (connection.connectionId || connection.connection_id || '') === externalConnectionId
      ) || null,
    [availableConnections, externalConnectionId]
  )

  const isValid = useMemo(() => !!name && (!!externalConnectionId || !!mcpUrl), [name, externalConnectionId, mcpUrl])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const config: MCPConfig = {
        url: selectedExternalConnection?.url || mcpUrl,
        transport: (selectedExternalConnection?.transport as 'sse' | 'websocket' | 'http' | undefined) || mcpTransport,
        serverId: selectedExternalConnection?.connectionId || selectedExternalConnection?.connection_id || undefined,
        env: selectedExternalConnection?.env || undefined
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

      // Validate MCP headers JSON if provided
      const hdr = finalSettings.config?.['http.headersJson']
      if (hdr && hdr.trim()) {
        JSON.parse(hdr)
      }

      const payload: ToolDetails = {
        name,
        type: toolType,
        config,
        settings: finalSettings,
        externalConnectionId: externalConnectionId || null
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
    toolType,
    mcpUrl,
    mcpTransport,
    selectedExternalConnection,
    settings,
    configKeys,
    externalConnectionId,
    mode,
    tool,
    onCreate,
    onUpdate,
    onSaved,
    onClose
  ])

  const handleTest = useCallback(async () => {
    if (!tool?._id) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await pmClient.getMcpAvailableActions(tool._id)
      const count = response.tools?.length ?? 0
      setTestResult({
        success: true,
        message: t('tool-editor-test-success', { count })
      })
    } catch (e) {
      setTestResult({
        success: false,
        message: e instanceof Error ? e.message : t('tool-editor-test-failed')
      })
    } finally {
      setIsTesting(false)
    }
  }, [pmClient, t, tool?._id])

  return (
    <div data-testid="tool-editor" className="gba:w-full gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" onClick={onClose} data-testid="tool-editor-back">
            {t('back')}
          </Button>
          <div className="gba:text-lg gba:font-semibold">
            {mode === 'edit' ? name || tool?.name : t('tool-editor-add-mcp')}
          </div>
        </div>
        <div className="gba:flex gba:gap-2">
          {mode === 'edit' && tool?._id && (
            <Button variant="outline" onClick={handleTest} disabled={isTesting} data-testid="tool-editor-test">
              {isTesting ? t('connections-test-running') : t('connections-test')}
            </Button>
          )}
          <Button variant="default" onClick={handleSave} disabled={!isValid || isSaving} data-testid="tool-editor-save">
            {isSaving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>

      {testResult && (
        <div
          className={testResult.success ? 'gba:text-success' : 'gba:text-destructive'}
          data-testid="tool-editor-test-result"
        >
          {testResult.message}
        </div>
      )}

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
              <CardTitle>{t('tool-editor-basic-information')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:space-y-2">
                <Label>{t('column-name')}</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('tool-editor-display-name')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('tool-editor-mcp-configuration')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:space-y-2">
                <Label>{t('tool-editor-managed-mcp')}</Label>
                <Select
                  value={externalConnectionId || '__custom__'}
                  onValueChange={v => setExternalConnectionId(v === '__custom__' ? '' : v)}
                >
                  <SelectTrigger data-testid="tool-editor-external-connection">
                    <SelectValue placeholder={t('tool-editor-custom-mcp-config')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom__">{t('tool-editor-custom-mcp-config')}</SelectItem>
                    {availableConnections.map(connection => {
                      const value = connection.connectionId || connection.connection_id || ''
                      if (!value) return null
                      return (
                        <SelectItem key={value} value={value}>
                          {connection.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedExternalConnection ? (
                  <div className="gba:text-xs gba:text-muted-foreground">{t('tool-editor-managed-mcp-help')}</div>
                ) : null}
              </div>
              <div className="gba:space-y-2">
                <Label>URL</Label>
                <Input
                  value={mcpUrl}
                  onChange={e => setMcpUrl(e.target.value)}
                  placeholder="https://mcp-server.example.com/api"
                  disabled={!!selectedExternalConnection}
                />
              </div>
              <div className="gba:space-y-2">
                <Label>Transport</Label>
                <Select
                  value={selectedExternalConnection?.transport || mcpTransport}
                  onValueChange={v => setMcpTransport(v as 'sse' | 'websocket' | 'http')}
                  disabled={!!selectedExternalConnection}
                >
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

        {/* Right sidebar: Settings */}
        <div className="gba:w-80 gba:flex-shrink-0 gba:space-y-4">
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
                          <strong>Auth keys (recommended):</strong> <code>auth.preferSession</code> (true|false),{' '}
                          <code>auth.type</code> (none|bearer|basic|header|oauth_client_credentials),{' '}
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
                <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1">
                  <Checkbox
                    checked={preferSession}
                    onCheckedChange={() => {
                      const next = !preferSession
                      setConfigValue('auth.preferSession', next ? 'true' : '')
                      if (!next && getConfigValue('auth.type') === 'session') setConfigValue('auth.type', '')
                      if (next && getConfigValue('auth.type') === 'session') setConfigValue('auth.type', '')
                    }}
                    data-testid="tool-editor-mcp-prefer-session"
                  />
                  <div className="gba:text-xs gba:text-muted-foreground">Prefer session token (if available)</div>
                </div>
                <Select
                  value={authType}
                  onValueChange={v => {
                    const next = v as McpAuthType
                    if (next === 'none') setConfigValue('auth.type', '')
                    else setConfigValue('auth.type', next)

                    // Normalize legacy value
                    if (getConfigValue('auth.type') === 'session') setConfigValue('auth.type', '')

                    if (next !== 'bearer') setConfigValue('auth.bearerToken', '')
                    if (next !== 'basic') {
                      setConfigValue('auth.basicUsername', '')
                      setConfigValue('auth.basicPassword', '')
                    }
                    if (next !== 'header') {
                      setConfigValue('auth.headerName', '')
                      setConfigValue('auth.headerValue', '')
                    }
                    if (next !== 'oauth_client_credentials') {
                      setConfigValue('auth.oauth.tokenUrl', '')
                      setConfigValue('auth.oauth.clientId', '')
                      setConfigValue('auth.oauth.clientSecret', '')
                      setConfigValue('auth.oauth.scope', '')
                    }
                  }}
                >
                  <SelectTrigger data-testid="tool-editor-mcp-auth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="basic">Basic auth</SelectItem>
                    <SelectItem value="header">Custom header</SelectItem>
                    <SelectItem value="oauth_client_credentials">OAuth client credentials</SelectItem>
                  </SelectContent>
                </Select>
                <p className="gba:text-xs gba:text-muted-foreground">
                  For internal MCP tools (e.g. Flow Engine), auth is injected at runtime and these settings are ignored.
                </p>
              </div>

              {authType === 'bearer' && (
                <div className="gba:space-y-2">
                  <Label>Bearer Token</Label>
                  {credentialBindOptions.length ? (
                    <CredentialBindField
                      value={bearerToken}
                      onChange={v => setConfigValue('auth.bearerToken', v)}
                      bindOptions={credentialBindOptions}
                      plainInputType="password"
                      data-testid="tool-editor-mcp-bearer-token"
                    />
                  ) : (
                    <Input
                      type="password"
                      value={bearerToken}
                      onChange={e => setConfigValue('auth.bearerToken', e.target.value)}
                      data-testid="tool-editor-mcp-bearer-token"
                    />
                  )}
                </div>
              )}

              {authType === 'basic' && (
                <div className="gba:space-y-2">
                  <Label>Basic Auth</Label>
                  <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                    <Input
                      value={basicUsername}
                      onChange={e => setConfigValue('auth.basicUsername', e.target.value)}
                      placeholder="Username"
                      data-testid="tool-editor-mcp-basic-username"
                    />
                    {credentialBindOptions.length ? (
                      <CredentialBindField
                        value={basicPassword}
                        onChange={v => setConfigValue('auth.basicPassword', v)}
                        bindOptions={credentialBindOptions}
                        plainInputType="password"
                        plainPlaceholder="Password"
                        data-testid="tool-editor-mcp-basic-password"
                      />
                    ) : (
                      <Input
                        type="password"
                        value={basicPassword}
                        onChange={e => setConfigValue('auth.basicPassword', e.target.value)}
                        placeholder="Password"
                        data-testid="tool-editor-mcp-basic-password"
                      />
                    )}
                  </div>
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
                    {credentialBindOptions.length ? (
                      <CredentialBindField
                        value={headerValue}
                        onChange={v => setConfigValue('auth.headerValue', v)}
                        bindOptions={credentialBindOptions}
                        plainInputType="password"
                        plainPlaceholder="Header value"
                        data-testid="tool-editor-mcp-header-value"
                      />
                    ) : (
                      <Input
                        type="password"
                        value={headerValue}
                        onChange={e => setConfigValue('auth.headerValue', e.target.value)}
                        placeholder="Header value"
                        data-testid="tool-editor-mcp-header-value"
                      />
                    )}
                  </div>
                </div>
              )}

              {authType === 'oauth_client_credentials' && (
                <div className="gba:space-y-2">
                  <Label>OAuth Client Credentials</Label>
                  <div className="gba:space-y-2">
                    <Input
                      value={oauthTokenUrl}
                      onChange={e => setConfigValue('auth.oauth.tokenUrl', e.target.value)}
                      placeholder="Token URL"
                      data-testid="tool-editor-mcp-oauth-token-url"
                    />
                    <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                      <Input
                        value={oauthClientId}
                        onChange={e => setConfigValue('auth.oauth.clientId', e.target.value)}
                        placeholder="Client ID"
                        data-testid="tool-editor-mcp-oauth-client-id"
                      />
                      {credentialBindOptions.length ? (
                        <CredentialBindField
                          value={oauthClientSecret}
                          onChange={v => setConfigValue('auth.oauth.clientSecret', v)}
                          bindOptions={credentialBindOptions}
                          plainInputType="password"
                          plainPlaceholder="Client Secret"
                          data-testid="tool-editor-mcp-oauth-client-secret"
                        />
                      ) : (
                        <Input
                          type="password"
                          value={oauthClientSecret}
                          onChange={e => setConfigValue('auth.oauth.clientSecret', e.target.value)}
                          placeholder="Client Secret"
                          data-testid="tool-editor-mcp-oauth-client-secret"
                        />
                      )}
                    </div>
                    <Input
                      value={oauthScope}
                      onChange={e => setConfigValue('auth.oauth.scope', e.target.value)}
                      placeholder="Scope (optional)"
                      data-testid="tool-editor-mcp-oauth-scope"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ToolEditor
