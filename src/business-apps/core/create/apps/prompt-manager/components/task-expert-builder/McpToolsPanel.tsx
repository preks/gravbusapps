import React, { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionText,
  DialogHeader,
  DialogTitle,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { Plug } from 'lucide-react'
import type { TabProps, UnifiedCapability } from './types'
import { McpAllowedActionsPanel } from './McpAllowedActionsPanel'
import translations from '../../_i18n'

export const McpToolsPanel: React.FC<Pick<TabProps, 'context' | 'state' | 'actions' | 'catalogs'>> = ({
  context,
  state,
  actions,
  catalogs
}) => {
  const { t } = useTranslation(translations)
  const [configuringCapCode, setConfiguringCapCode] = useState<string | null>(null)
  const [view, setView] = useState<'all' | 'selected'>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 5

  const [search, setSearch] = useState('')

  const mcpCapabilities = useMemo(() => catalogs.capabilities.filter(c => c.kind === 'mcp'), [catalogs.capabilities])

  const filteredMcpCapabilities = useMemo(() => {
    let result = mcpCapabilities
    if (view === 'selected') {
      const selected = new Set(state.selectedToolIds)
      result = result.filter(c => selected.has(c.id))
    }
    if (!search) return result
    const q = search.toLowerCase()
    return result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
  }, [mcpCapabilities, search, state.selectedToolIds, view])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMcpCapabilities.length / pageSize)),
    [filteredMcpCapabilities.length]
  )
  const currentPage = Math.min(pageIndex + 1, totalPages)
  const paged = useMemo(() => {
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredMcpCapabilities.slice(start, end)
  }, [filteredMcpCapabilities, pageIndex])

  const selectedMcpCapabilities = useMemo(
    () => mcpCapabilities.filter(c => state.selectedToolIds.includes(c.id)),
    [mcpCapabilities, state.selectedToolIds]
  )

  const selectedMcpCount = selectedMcpCapabilities.length

  const ensureSelected = useCallback(
    (capabilityId: string) => {
      if (state.selectedToolIds.includes(capabilityId)) return
      actions.setSelectedToolIds([...state.selectedToolIds, capabilityId])
    },
    [actions, state.selectedToolIds]
  )

  const ensureDeselected = useCallback(
    (capabilityId: string) => {
      if (!state.selectedToolIds.includes(capabilityId)) return
      actions.setSelectedToolIds(state.selectedToolIds.filter(id => id !== capabilityId))
    },
    [actions, state.selectedToolIds]
  )

  const toggleMcpTool = useCallback(
    (cap: UnifiedCapability) => {
      if (state.selectedToolIds.includes(cap.id)) {
        ensureDeselected(cap.id)
        // Remove per-prompt policy when tool is deselected
        if (state.toolPolicies?.[cap.code]) {
          const next = { ...(state.toolPolicies || {}) }
          delete next[cap.code]
          actions.setToolPolicies(next)
        }
      } else {
        ensureSelected(cap.id)
        // Deny-by-default: initialize empty allowlist for newly selected MCP tools
        if (!state.toolPolicies?.[cap.code]) {
          actions.setToolPolicies({
            ...(state.toolPolicies || {}),
            [cap.code]: { allowedTools: [] }
          })
        }
      }
    },
    [actions, ensureDeselected, ensureSelected, state.selectedToolIds, state.toolPolicies]
  )

  const onConfigureTools = useCallback(
    (cap: UnifiedCapability) => {
      // Ensure the tool is selected and has a policy entry (deny-by-default) before configuring allowlist.
      if (!state.selectedToolIds.includes(cap.id)) {
        ensureSelected(cap.id)
      }
      if (!state.toolPolicies?.[cap.code]) {
        actions.setToolPolicies({
          ...(state.toolPolicies || {}),
          [cap.code]: { allowedTools: [] }
        })
      }
      setConfiguringCapCode(cap.code)
    },
    [actions, ensureSelected, state.selectedToolIds, state.toolPolicies]
  )

  const configuringCapability = useMemo(
    () => (configuringCapCode ? mcpCapabilities.find(c => c.code === configuringCapCode) : undefined),
    [configuringCapCode, mcpCapabilities]
  )

  const configuringToolId = configuringCapability?.sourceMeta?.promptManagerToolId
  const configuringAllowedTools = configuringCapCode ? state.toolPolicies?.[configuringCapCode]?.allowedTools || [] : []

  return (
    <Card className="gba:!bg-background">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Plug className="gba:w-5 gba:h-5" />
          MCP Tools
        </CardTitle>
        <CardDescription>Select MCP tools and configure them</CardDescription>
      </CardHeader>

      <CardContent className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            size="sm"
            variant={view === 'all' ? 'default' : 'outline'}
            onClick={() => {
              setView('all')
              setPageIndex(0)
            }}
            data-testid="agent-builder-mcp-tools-view-all"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={view === 'selected' ? 'default' : 'outline'}
            onClick={() => {
              setView('selected')
              setPageIndex(0)
            }}
            data-testid="agent-builder-mcp-tools-view-selected"
          >
            Selected
          </Button>
          <div className="gba:flex-1" />
          <Badge variant="secondary" data-testid="agent-builder-mcp-selected-count">
            {selectedMcpCount} selected
          </Badge>
        </div>

        <Input
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPageIndex(0)
          }}
          placeholder="Search MCP tools..."
          data-testid="agent-builder-mcp-tool-search"
        />

        <div className="gba:border gba:rounded-lg gba:divide-y" data-testid="agent-builder-mcp-tool-selector">
          {filteredMcpCapabilities.length === 0 ? (
            <div className="gba:p-6 gba:text-center gba:text-muted-foreground">
              {view === 'selected'
                ? search
                  ? 'No selected MCP tools match your search'
                  : 'No MCP tools selected'
                : search
                  ? 'No MCP tools match your search'
                  : 'No MCP tools available'}
            </div>
          ) : (
            paged.map(cap => (
              <div
                key={cap.id}
                className={`gba:p-3 gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:transition-colors ${
                  state.selectedToolIds.includes(cap.id) ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
                }`}
                onClick={() => toggleMcpTool(cap)}
                data-testid={`agent-builder-mcp-tool-option-${cap.id}`}
              >
                <input
                  type="checkbox"
                  checked={state.selectedToolIds.includes(cap.id)}
                  onChange={() => toggleMcpTool(cap)}
                  className="gba:w-4 gba:h-4"
                />
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:font-medium">{cap.name}</span>
                    <Badge variant="outline" className="gba:text-xs">
                      MCP
                    </Badge>
                    {cap.sourceMeta?.internal && (
                      <Badge variant="secondary" className="gba:text-xs">
                        Internal
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="gba:text-xs"
                      data-testid={`agent-builder-mcp-tool-configured-count-${cap.id}`}
                    >
                      {(state.toolPolicies?.[cap.code]?.allowedTools || []).length} allowed
                    </Badge>
                  </div>
                  {cap.description && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{cap.description}</p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    onConfigureTools(cap)
                  }}
                  disabled={!cap.sourceMeta?.promptManagerToolId}
                  data-testid={`agent-builder-mcp-tool-configure-${cap.id}`}
                >
                  Configure tools
                </Button>
              </div>
            ))
          )}
        </div>

        {selectedMcpCapabilities.length === 0 && (
          <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:border gba:rounded-lg gba:border-dashed">
            <Plug className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
            <p className="gba:text-sm">No MCP tools selected</p>
            <p className="gba:text-xs gba:mt-1">Select an MCP tool above to enable it</p>
          </div>
        )}

        {filteredMcpCapabilities.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:text-muted-foreground gba:text-sm" data-testid="agent-builder-mcp-tools-page">
              Page {currentPage} of {totalPages}
            </div>
            <div className="gba:flex gba:gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                data-testid="agent-builder-mcp-tools-prev"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                data-testid="agent-builder-mcp-tools-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={!!configuringCapCode && !!configuringToolId}
        onOpenChange={open => {
          if (!open) setConfiguringCapCode(null)
        }}
      >
        <DialogContent data-testid="agent-builder-mcp-configure-tools-dialog">
          <DialogHeader>
            <DialogTitle>Configure tools</DialogTitle>
            <DialogDescriptionText>
              {t('mcp-tools-configure-help-prefix')}{' '}
              <span className="gba:font-medium">
                {configuringCapability?.name || t('mcp-tools-configure-help-fallback')}
              </span>
              .
            </DialogDescriptionText>
          </DialogHeader>

          {configuringToolId && configuringCapCode && (
            <McpAllowedActionsPanel
              accessToken={context.accessToken}
              toolId={configuringToolId}
              toolCode={configuringCapCode}
              allowedTools={configuringAllowedTools}
              onChangeAllowedTools={allowed =>
                actions.setToolPolicies({
                  ...(state.toolPolicies || {}),
                  [configuringCapCode]: { allowedTools: allowed }
                })
              }
            />
          )}

          <div className="gba:flex gba:justify-end">
            <Button
              variant="default"
              onClick={() => setConfiguringCapCode(null)}
              data-testid="agent-builder-mcp-configure-tools-done"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default McpToolsPanel
