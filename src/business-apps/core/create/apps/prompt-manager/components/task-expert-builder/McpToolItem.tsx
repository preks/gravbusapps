import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Loader2, Settings } from 'lucide-react'
import type { MCPConfig, ToolODM, ToolPatchDetails } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { UnifiedCapability } from './types'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { McpToolDraft, McpToolAuthType } from './mcpToolDraft'
import { McpToolConfigForm } from './McpToolConfigForm'
import { McpAllowedActionsPanel } from './McpAllowedActionsPanel'

const getSettingsString = (tool: ToolODM, key: string): string =>
  String((tool.settings?.config || ({} as Record<string, string>))[key] || '')

export interface McpToolItemProps {
  accessToken: string
  capability: UnifiedCapability
  toolId: string
  toolCode: string
  allowedTools: string[]
  onChangeAllowedTools: (allowed: string[]) => void
  expanded: boolean
  onToggle: () => void
  onAfterSaved: () => void
}

export const McpToolItem: React.FC<McpToolItemProps> = props => {
  const {
    accessToken,
    capability,
    toolId,
    toolCode,
    allowedTools,
    onChangeAllowedTools,
    expanded,
    onToggle,
    onAfterSaved
  } = props
  const client = usePromptManagerClient(accessToken)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const isInternal = !!capability.sourceMeta?.internal

  const [draft, setDraft] = useState<McpToolDraft | null>(null)
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)

  const load = useCallback(async () => {
    if (isInternal) return
    setIsLoading(true)
    setError(null)
    try {
      const tool = await client.getMcpTool(toolId)
      const config = tool.config as MCPConfig
      setHasAttemptedLoad(true)

      const rawAuthType = getSettingsString(tool, 'auth.type')
      const rawPreferSession = getSettingsString(tool, 'auth.preferSession')
      const preferSession =
        rawAuthType === 'session' ||
        ['1', 'true', 'yes', 'y', 'on'].includes(
          String(rawPreferSession || '')
            .trim()
            .toLowerCase()
        )

      const authType: McpToolAuthType =
        rawAuthType === 'bearer' ||
        rawAuthType === 'basic' ||
        rawAuthType === 'header' ||
        rawAuthType === 'oauth_client_credentials'
          ? (rawAuthType as McpToolAuthType)
          : 'none'
      const headersJson = getSettingsString(tool, 'http.headersJson') || '{}'

      setDraft({
        name: tool.name || capability.name,
        description: tool.description || '',
        url: config.url || '',
        transport: config.transport || 'http',
        envJson: JSON.stringify(config.env || {}, null, 2),
        preferSession,
        authType,
        bearerToken: getSettingsString(tool, 'auth.bearerToken'),
        basicUsername: getSettingsString(tool, 'auth.basicUsername'),
        basicPassword: getSettingsString(tool, 'auth.basicPassword'),
        headerName: getSettingsString(tool, 'auth.headerName'),
        headerValue: getSettingsString(tool, 'auth.headerValue'),
        oauthTokenUrl: getSettingsString(tool, 'auth.oauth.tokenUrl'),
        oauthClientId: getSettingsString(tool, 'auth.oauth.clientId'),
        oauthClientSecret: getSettingsString(tool, 'auth.oauth.clientSecret'),
        oauthScope: getSettingsString(tool, 'auth.oauth.scope'),
        headersJson
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MCP tool')
      setHasAttemptedLoad(true)
    } finally {
      setIsLoading(false)
    }
  }, [client, toolId, capability.name])

  useEffect(() => {
    if (!expanded) return
    if (isInternal) return
    if (draft || isLoading || hasAttemptedLoad) return
    {
      load().catch(() => undefined)
    }
  }, [expanded, draft, isLoading, load, hasAttemptedLoad])

  const canTest = !!draft?.url?.trim()

  const headersForTest = useMemo(() => {
    if (!draft) return null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (draft.preferSession) {
      if (accessToken?.trim()) headers['Authorization'] = `Bearer ${accessToken.trim()}`
    } else if (draft.authType === 'bearer') {
      if (draft.bearerToken?.trim()) headers['Authorization'] = `Bearer ${draft.bearerToken.trim()}`
    } else if (draft.authType === 'basic') {
      if (draft.basicUsername?.trim() && draft.basicPassword) {
        const raw = `${draft.basicUsername.trim()}:${draft.basicPassword}`.trim()
        headers['Authorization'] = `Basic ${btoa(raw)}`
      }
    } else if (draft.authType === 'header') {
      if (draft.headerName?.trim() && draft.headerValue?.trim()) {
        headers[draft.headerName.trim()] = draft.headerValue.trim()
      }
    } else if (draft.authType === 'oauth_client_credentials') {
      // OAuth tokens are fetched server-side by Prompt Manager during actual agent runs.
      // Browser-based test calls cannot reliably fetch tokens due to CORS; keep test as a plain connectivity check.
    }

    try {
      const parsed = draft.headersJson.trim() ? JSON.parse(draft.headersJson) : {}
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed as Record<string, string>).forEach(([k, v]) => {
          if (k?.trim() && v?.trim()) headers[k.trim()] = String(v).trim()
        })
      }
    } catch {
      // ignore invalid JSON - will be surfaced on test
    }

    return headers
  }, [draft, accessToken])

  const onTest = useCallback(async () => {
    if (!draft?.url?.trim()) return
    setIsTesting(true)
    setError(null)
    try {
      // Validate JSON headers
      if (draft.headersJson.trim()) JSON.parse(draft.headersJson)
      const res = await fetch(`${draft.url}/info`, { method: 'GET', headers: headersForTest || undefined })
      setStatus(res.ok ? 'connected' : 'error')
      if (!res.ok) setError(`Connectivity test failed (${res.status})`)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Connectivity test failed')
    } finally {
      setIsTesting(false)
    }
  }, [draft, headersForTest])

  const onSave = useCallback(async () => {
    if (!draft) return
    setIsSaving(true)
    setError(null)
    try {
      // Validate JSON
      const env = draft.envJson.trim() ? JSON.parse(draft.envJson) : {}
      if (draft.headersJson.trim()) JSON.parse(draft.headersJson)

      if (draft.authType === 'oauth_client_credentials') {
        if (!draft.oauthTokenUrl.trim() || !draft.oauthClientId.trim() || !draft.oauthClientSecret) {
          throw new Error('OAuth client credentials requires token URL, client id, and client secret')
        }
      }
      if (draft.authType === 'basic') {
        if (!draft.basicUsername.trim() || !draft.basicPassword) {
          throw new Error('Basic auth requires username and password')
        }
      }

      const settingsConfig: Record<string, string> = {}
      if (draft.authType !== 'none') settingsConfig['auth.type'] = draft.authType
      if (draft.preferSession) settingsConfig['auth.preferSession'] = 'true'
      if (draft.authType === 'bearer' && draft.bearerToken.trim())
        settingsConfig['auth.bearerToken'] = draft.bearerToken.trim()
      if (draft.authType === 'basic' && draft.basicUsername.trim() && draft.basicPassword) {
        settingsConfig['auth.basicUsername'] = draft.basicUsername.trim()
        settingsConfig['auth.basicPassword'] = draft.basicPassword
      }
      if (draft.authType === 'header' && draft.headerName.trim() && draft.headerValue.trim()) {
        settingsConfig['auth.headerName'] = draft.headerName.trim()
        settingsConfig['auth.headerValue'] = draft.headerValue.trim()
      }
      if (draft.authType === 'oauth_client_credentials') {
        if (draft.oauthTokenUrl.trim()) settingsConfig['auth.oauth.tokenUrl'] = draft.oauthTokenUrl.trim()
        if (draft.oauthClientId.trim()) settingsConfig['auth.oauth.clientId'] = draft.oauthClientId.trim()
        if (draft.oauthClientSecret) settingsConfig['auth.oauth.clientSecret'] = draft.oauthClientSecret
        if (draft.oauthScope.trim()) settingsConfig['auth.oauth.scope'] = draft.oauthScope.trim()
      }
      if (draft.headersJson.trim()) settingsConfig['http.headersJson'] = draft.headersJson

      const patch: ToolPatchDetails = {
        name: draft.name,
        description: draft.description || undefined,
        type: 'mcp',
        config: { transport: draft.transport, url: draft.url, env } as MCPConfig,
        settings: { config: settingsConfig }
      }

      await client.patchMcpTool(toolId, patch)
      onAfterSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save MCP tool')
    } finally {
      setIsSaving(false)
    }
  }, [client, draft, onAfterSaved, toolId])

  return (
    <div className="gba:border gba:rounded-lg" data-testid={`agent-builder-mcp-tool-${toolId}`}>
      <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:font-medium">{capability.name}</span>
            <Badge variant="outline" className="gba:text-xs">
              MCP
            </Badge>
            {isInternal && (
              <Badge variant="secondary" className="gba:text-xs">
                Internal
              </Badge>
            )}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:truncate">
            {capability.sourceMeta?.mcpUrl || '—'}
          </p>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {!isInternal && status === 'connected' && <CheckCircle className="gba:w-4 gba:h-4 gba:text-success" />}
          {!isInternal && status === 'error' && <AlertCircle className="gba:w-4 gba:h-4 gba:text-destructive" />}

          <Button
            size="sm"
            variant="outline"
            onClick={onToggle}
            data-testid={`agent-builder-configure-mcp-tool-${toolId}`}
          >
            <Settings className="gba:w-4 gba:h-4 gba:mr-1" />
            Configure
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="gba:border-t gba:p-4 gba:space-y-4">
          {isInternal ? (
            <>
              <McpAllowedActionsPanel
                accessToken={accessToken}
                toolId={toolId}
                toolCode={toolCode}
                allowedTools={allowedTools}
                onChangeAllowedTools={onChangeAllowedTools}
              />
              <div className="gba:text-xs gba:text-muted-foreground">
                This is an internal MCP tool. Connection and credentials are managed by the system.
              </div>
            </>
          ) : isLoading || (!draft && !hasAttemptedLoad) ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
              <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin" />
            </div>
          ) : !draft ? (
            <div className="gba:text-sm gba:text-destructive gba:space-y-2">
              <div>{error || 'Failed to load MCP tool'}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHasAttemptedLoad(false)
                  load().catch(() => undefined)
                }}
                data-testid={`agent-builder-retry-mcp-tool-${toolId}`}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <McpAllowedActionsPanel
                accessToken={accessToken}
                toolId={toolId}
                toolCode={toolCode}
                allowedTools={allowedTools}
                onChangeAllowedTools={onChangeAllowedTools}
              />
              <McpToolConfigForm
                toolId={toolId}
                draft={draft}
                onChange={patch => setDraft({ ...draft, ...patch })}
                error={error}
                readOnly={false}
                canTest={canTest}
                isTesting={isTesting}
                isSaving={isSaving}
                onTest={onTest}
                onSave={onSave}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default McpToolItem
