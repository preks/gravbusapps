import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { Plug, Plus } from 'lucide-react'
import type { MCPConfig } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { TabProps, UnifiedCapability } from './types'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { McpToolItem } from './McpToolItem'

type CreateDraft = {
  name: string
  description: string
  url: string
  transport: 'http' | 'sse' | 'websocket'
}

export const McpToolsPanel: React.FC<Pick<TabProps, 'context' | 'state' | 'actions' | 'catalogs'>> = ({
  context,
  state,
  actions,
  catalogs
}) => {
  const client = usePromptManagerClient(context.accessToken)

  const [expandedToolId, setExpandedToolId] = useState<string | null>(null)
  const [pendingSelectPmToolId, setPendingSelectPmToolId] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    name: '',
    description: '',
    url: '',
    transport: 'http'
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const mcpCapabilities = useMemo(() => catalogs.capabilities.filter(c => c.kind === 'mcp'), [catalogs.capabilities])

  const selectedMcpCapabilities = useMemo(
    () => mcpCapabilities.filter(c => state.selectedToolIds.includes(c.id)),
    [mcpCapabilities, state.selectedToolIds]
  )

  const ensureSelected = useCallback(
    (capabilityId: string) => {
      if (state.selectedToolIds.includes(capabilityId)) return
      actions.setSelectedToolIds([...state.selectedToolIds, capabilityId])
    },
    [actions, state.selectedToolIds]
  )

  const findCapabilityByPmToolId = useCallback(
    (pmToolId: string): UnifiedCapability | undefined =>
      mcpCapabilities.find(c => c.sourceMeta?.promptManagerToolId === pmToolId),
    [mcpCapabilities]
  )

  useEffect(() => {
    if (!pendingSelectPmToolId) return
    const cap = findCapabilityByPmToolId(pendingSelectPmToolId)
    if (!cap) return
    ensureSelected(cap.id)
    setExpandedToolId(pendingSelectPmToolId)
    setPendingSelectPmToolId(null)
  }, [ensureSelected, findCapabilityByPmToolId, pendingSelectPmToolId])

  const startCreate = useCallback(() => {
    setShowCreate(true)
    setCreateError(null)
    setCreateDraft({ name: 'New MCP Tool', description: '', url: '', transport: 'http' })
  }, [])

  const createTool = useCallback(async () => {
    setCreateError(null)
    if (!createDraft.name.trim()) {
      setCreateError('Name is required')
      return
    }
    if (!createDraft.url.trim()) {
      setCreateError('Server URL is required')
      return
    }

    setIsCreating(true)
    try {
      const created = await client.createMcpTool({
        name: createDraft.name.trim(),
        description: createDraft.description.trim() || undefined,
        type: 'mcp',
        config: { transport: createDraft.transport, url: createDraft.url.trim() } as MCPConfig,
        settings: { config: { 'auth.type': 'none', 'http.headersJson': '{}' } }
      })
      setShowCreate(false)
      await catalogs.reloadCapabilities()
      if (created._id) setPendingSelectPmToolId(created._id)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create MCP tool')
    } finally {
      setIsCreating(false)
    }
  }, [catalogs, client, createDraft])

  return (
    <Card className="gba:!bg-background">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Plug className="gba:w-5 gba:h-5" />
              MCP Tools
            </CardTitle>
            <CardDescription>Select MCP tools in the Tools list above, then configure them here</CardDescription>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={startCreate}
              disabled={isCreating}
              data-testid="agent-builder-mcp-create"
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
              New MCP Tool
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        {createError && <div className="gba:text-sm gba:text-destructive">{createError}</div>}

        {showCreate && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:space-y-4" data-testid="agent-builder-mcp-create-form">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label>Name</Label>
                <Input
                  value={createDraft.name}
                  onChange={e => setCreateDraft({ ...createDraft, name: e.target.value })}
                />
              </div>
              <div className="gba:space-y-2">
                <Label>Transport</Label>
                <Select
                  value={createDraft.transport}
                  onValueChange={v => setCreateDraft({ ...createDraft, transport: v as CreateDraft['transport'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="sse">SSE</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label>Server URL</Label>
              <Input
                value={createDraft.url}
                onChange={e => setCreateDraft({ ...createDraft, url: e.target.value })}
                placeholder="https://example.com/mcp"
              />
            </div>

            <div className="gba:space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={createDraft.description}
                onChange={e => setCreateDraft({ ...createDraft, description: e.target.value })}
              />
            </div>

            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button size="sm" variant="default" onClick={createTool} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        )}

        {selectedMcpCapabilities.length === 0 ? (
          <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:border gba:rounded-lg gba:border-dashed">
            <Plug className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
            <p className="gba:text-sm">No MCP tools selected</p>
            <p className="gba:text-xs gba:mt-1">Select an MCP tool above to configure it here</p>
          </div>
        ) : (
          <div className="gba:space-y-3" data-testid="agent-builder-mcp-selected-tools">
            {selectedMcpCapabilities.map(cap => {
              const toolId = cap.sourceMeta?.promptManagerToolId
              if (!toolId) return null
              return (
                <McpToolItem
                  key={toolId}
                  accessToken={context.accessToken}
                  capability={cap}
                  toolId={toolId}
                  expanded={expandedToolId === toolId}
                  onToggle={() => setExpandedToolId(expandedToolId === toolId ? null : toolId)}
                  onAfterSaved={() => catalogs.reloadCapabilities()}
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default McpToolsPanel
