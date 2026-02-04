import React, { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { Wrench } from 'lucide-react'
import type { TabProps, UnifiedCapability } from './types'

export const FunctionToolsPanel: React.FC<Pick<TabProps, 'state' | 'actions' | 'catalogs'>> = ({
  state,
  actions,
  catalogs
}) => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'all' | 'selected'>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 5

  const functionCapabilities = useMemo(
    () => catalogs.capabilities.filter(c => c.kind === 'function'),
    [catalogs.capabilities]
  )

  const filtered = useMemo(() => {
    let result = functionCapabilities
    if (view === 'selected') {
      const selected = new Set(state.selectedToolIds)
      result = result.filter(c => selected.has(c.id))
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    return result
  }, [functionCapabilities, search, state.selectedToolIds, view])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length])
  const currentPage = Math.min(pageIndex + 1, totalPages)
  const paged = useMemo(() => {
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filtered.slice(start, end)
  }, [filtered, pageIndex])

  const selectedFunctionCount = useMemo(
    () => functionCapabilities.filter(c => state.selectedToolIds.includes(c.id)).length,
    [functionCapabilities, state.selectedToolIds]
  )

  const toggleTool = useCallback(
    (tool: UnifiedCapability) => {
      if (state.selectedToolIds.includes(tool.id)) {
        actions.setSelectedToolIds(state.selectedToolIds.filter(id => id !== tool.id))
        const newVersions = { ...state.selectedToolVersion }
        delete newVersions[tool.id]
        actions.setSelectedToolVersion(newVersions)
      } else {
        actions.setSelectedToolIds([...state.selectedToolIds, tool.id])
      }
    },
    [actions, state.selectedToolIds, state.selectedToolVersion]
  )

  return (
    <Card className="gba:!bg-background" data-testid="agent-builder-function-tools-panel">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Wrench className="gba:w-5 gba:h-5" />
              Function Tools
            </CardTitle>
            <CardDescription>Select the functions the agent can call</CardDescription>
          </div>
          <Badge variant="secondary">{selectedFunctionCount} selected</Badge>
        </div>
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
            data-testid="agent-builder-function-tools-view-all"
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
            data-testid="agent-builder-function-tools-view-selected"
          >
            Selected
          </Button>
        </div>

        <Input
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPageIndex(0)
          }}
          placeholder="Search function tools..."
          data-testid="agent-builder-function-tool-search"
        />

        <div className="gba:border gba:rounded-lg gba:divide-y">
          {catalogs.capabilitiesLoading ? (
            <div className="gba:p-8 gba:flex gba:justify-center">
              <Spinner />
            </div>
          ) : catalogs.capabilitiesError ? (
            <div className="gba:p-4 gba:text-destructive gba:text-sm">{catalogs.capabilitiesError}</div>
          ) : filtered.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
              {view === 'selected'
                ? search
                  ? 'No selected function tools match your search'
                  : 'No function tools selected'
                : search
                  ? 'No function tools match your search'
                  : 'No function tools available'}
            </div>
          ) : (
            paged.map(tool => (
              <div
                key={tool.id}
                className={`gba:p-3 gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:transition-colors ${
                  state.selectedToolIds.includes(tool.id) ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
                }`}
                onClick={() => toggleTool(tool)}
                data-testid={`agent-builder-function-tool-${tool.id}`}
              >
                <input
                  type="checkbox"
                  checked={state.selectedToolIds.includes(tool.id)}
                  onChange={() => toggleTool(tool)}
                  className="gba:w-4 gba:h-4"
                />
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:font-medium">{tool.name}</span>
                    <Badge variant="outline" className="gba:text-xs">
                      Function
                    </Badge>
                  </div>
                  {tool.description && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{tool.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:text-muted-foreground gba:text-sm" data-testid="agent-builder-function-tools-page">
              Page {currentPage} of {totalPages}
            </div>
            <div className="gba:flex gba:gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                data-testid="agent-builder-function-tools-prev"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                data-testid="agent-builder-function-tools-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FunctionToolsPanel
