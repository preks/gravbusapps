import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Loader2, Settings } from 'lucide-react'
import type { MCPConfig, ToolODM, ToolPatchDetails } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { UnifiedCapability } from './types'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { McpToolDraft, McpToolAuthType } from './mcpToolDraft'
import { McpToolConfigForm } from './McpToolConfigForm'

const getSettingsString = (tool: ToolODM, key: string): string =>
  String((tool.settings?.config || ({} as Record<string, string>))[key] || '')

export interface McpToolItemProps {
  accessToken: string
  capability: UnifiedCapability
  toolId: string
  expanded: boolean
  onToggle: () => void
  onAfterSaved: () => void
}

export const McpToolItem: React.FC<McpToolItemProps> = props => {
  const { accessToken, capability, toolId, expanded, onToggle, onAfterSaved } = props
  const client = usePromptManagerClient(accessToken)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [isInternal, setIsInternal] = useState(false)

  const [draft, setDraft] = useState<McpToolDraft | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const tool = await client.getMcpTool(toolId)
      const config = tool.config as MCPConfig
      setIsInternal(!!tool.internal)

      const authType = (getSettingsString(tool, 'auth.type') as McpToolAuthType) || 'none'
      const headersJson = getSettingsString(tool, 'http.headersJson') || '{}'

      setDraft({
        name: tool.name || capability.name,
        description: tool.description || '',
        url: config.url || '',
        transport: config.transport || 'http',
        envJson: JSON.stringify(config.env || {}, null, 2),
        authType,
        bearerToken: getSettingsString(tool, 'auth.bearerToken'),
        headerName: getSettingsString(tool, 'auth.headerName'),
        headerValue: getSettingsString(tool, 'auth.headerValue'),
        headersJson
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MCP tool')
    } finally {
      setIsLoading(false)
    }
  }, [client, toolId, capability.name])

  useEffect(() => {
    if (expanded && !draft && !isLoading) {
      load().catch(() => undefined)
    }
  }, [expanded, draft, isLoading, load])

  const canTest = !isInternal && !!draft?.url?.trim()

  const headersForTest = useMemo(() => {
    if (!draft) return null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (draft.authType === 'session') {
      if (accessToken?.trim()) headers['Authorization'] = `Bearer ${accessToken.trim()}`
    } else if (draft.authType === 'bearer') {
      if (draft.bearerToken?.trim()) headers['Authorization'] = `Bearer ${draft.bearerToken.trim()}`
    } else if (draft.authType === 'header') {
      if (draft.headerName?.trim() && draft.headerValue?.trim()) {
        headers[draft.headerName.trim()] = draft.headerValue.trim()
      }
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
    if (isInternal) {
      setError('This is an internal MCP tool and cannot be edited here.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      // Validate JSON
      const env = draft.envJson.trim() ? JSON.parse(draft.envJson) : {}
      if (draft.headersJson.trim()) JSON.parse(draft.headersJson)

      const settingsConfig: Record<string, string> = {}
      if (draft.authType !== 'none') settingsConfig['auth.type'] = draft.authType
      if (draft.authType === 'bearer' && draft.bearerToken.trim())
        settingsConfig['auth.bearerToken'] = draft.bearerToken.trim()
      if (draft.authType === 'header' && draft.headerName.trim() && draft.headerValue.trim()) {
        settingsConfig['auth.headerName'] = draft.headerName.trim()
        settingsConfig['auth.headerValue'] = draft.headerValue.trim()
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
  }, [client, draft, isInternal, onAfterSaved, toolId])

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
          {status === 'connected' && <CheckCircle className="gba:w-4 gba:h-4 gba:text-success" />}
          {status === 'error' && <AlertCircle className="gba:w-4 gba:h-4 gba:text-destructive" />}

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
          {isLoading || !draft ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
              <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin" />
            </div>
          ) : (
            <McpToolConfigForm
              toolId={toolId}
              draft={draft}
              onChange={patch => setDraft({ ...draft, ...patch })}
              error={error}
              readOnly={isInternal}
              canTest={canTest}
              isTesting={isTesting}
              isSaving={isSaving}
              onTest={onTest}
              onSave={onSave}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default McpToolItem
