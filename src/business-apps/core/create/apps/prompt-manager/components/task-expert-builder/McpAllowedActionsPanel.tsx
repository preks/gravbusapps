import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Checkbox, Input, Label } from '@newwork/nw-design-system'
import type { McpAvailableAction } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

export interface McpAllowedActionsPanelProps {
  accessToken: string
  toolId: string
  toolCode: string
  allowedTools: string[]
  onChangeAllowedTools: (allowed: string[]) => void
}

export const McpAllowedActionsPanel: React.FC<McpAllowedActionsPanelProps> = props => {
  const { accessToken, toolId, toolCode, allowedTools, onChangeAllowedTools } = props
  const client = usePromptManagerClient(accessToken)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState<McpAvailableAction[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await client.getMcpAvailableActions(toolId)
      setAvailable(res.tools || [])
    } catch (e) {
      setAvailable([])
      setError(e instanceof Error ? e.message : 'Failed to load available actions')
    } finally {
      setIsLoading(false)
    }
  }, [client, toolId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const allowedSet = useMemo(() => new Set(allowedTools || []), [allowedTools])

  const filtered = useMemo(() => {
    if (!search.trim()) return available
    const q = search.trim().toLowerCase()
    return available.filter(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q))
  }, [available, search])

  const toggle = useCallback(
    (name: string) => {
      const next = new Set(allowedSet)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      onChangeAllowedTools(Array.from(next))
    },
    [allowedSet, onChangeAllowedTools]
  )

  const allowAll = useCallback(() => {
    onChangeAllowedTools((available || []).map(a => a.name))
  }, [available, onChangeAllowedTools])

  const allowNone = useCallback(() => {
    onChangeAllowedTools([])
  }, [onChangeAllowedTools])

  return (
    <div
      className="gba:space-y-3 gba:border gba:rounded-lg gba:p-3"
      data-testid={`agent-builder-mcp-allowlist-${toolId}`}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:space-y-1">
          <Label className="gba:text-sm">Allowed actions</Label>
          <div className="gba:text-xs gba:text-muted-foreground">
            Deny by default. Select what this agent can call for <span className="gba:font-mono">{toolCode}</span>.
          </div>
        </div>
        <Badge variant="secondary" data-testid={`agent-builder-mcp-allowlist-count-${toolId}`}>
          {(allowedTools || []).length} allowed
        </Badge>
      </div>

      {error && <div className="gba:text-sm gba:text-destructive">{error}</div>}

      <div className="gba:flex gba:items-center gba:gap-2">
        <div className="gba:flex-1">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isLoading ? 'Loading actions…' : 'Search actions…'}
            disabled={isLoading}
            data-testid={`agent-builder-mcp-allowlist-search-${toolId}`}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={allowNone}
          disabled={isLoading}
          data-testid={`agent-builder-mcp-allowlist-none-${toolId}`}
        >
          Allow none
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={allowAll}
          disabled={isLoading || available.length === 0}
          data-testid={`agent-builder-mcp-allowlist-all-${toolId}`}
        >
          Allow all
        </Button>
      </div>

      <div
        className="gba:border gba:rounded-lg gba:max-h-[220px] gba:overflow-y-auto"
        data-testid={`agent-builder-mcp-allowlist-list-${toolId}`}
      >
        {isLoading ? (
          <div className="gba:p-4 gba:text-sm gba:text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="gba:p-4 gba:text-sm gba:text-muted-foreground">
            {available.length === 0 ? 'No actions found' : 'No actions match your search'}
          </div>
        ) : (
          <div className="gba:divide-y">
            {filtered.map(a => (
              <div key={a.name} className="gba:flex gba:items-start gba:gap-3 gba:p-3">
                <Checkbox
                  checked={allowedSet.has(a.name)}
                  onCheckedChange={() => toggle(a.name)}
                  data-testid={`agent-builder-mcp-allowlist-action-${toolId}-${a.name}`}
                />
                <div className="gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:font-mono">{a.name}</div>
                  {a.description && <div className="gba:text-xs gba:text-muted-foreground">{a.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default McpAllowedActionsPanel
