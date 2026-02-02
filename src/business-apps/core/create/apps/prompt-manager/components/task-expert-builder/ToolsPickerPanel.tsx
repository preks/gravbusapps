import React, { useCallback, useMemo, useState } from 'react'
import {
  Input,
  Button,
  Badge,
  Spinner,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@newwork/nw-design-system'
import { Search, Wrench } from 'lucide-react'
import type { TabProps, UnifiedCapability } from './types'

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'internal', label: 'Internal' },
  { id: 'function', label: 'Business Tools' },
  { id: 'mcp', label: 'MCP' }
]

export const ToolsPickerPanel: React.FC<Pick<TabProps, 'state' | 'actions' | 'catalogs'>> = ({
  state,
  actions,
  catalogs
}) => {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredCapabilities = useMemo(() => {
    let result = catalogs.capabilities
    if (categoryFilter !== 'all') {
      result = result.filter(c => c.kind === categoryFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    return result
  }, [catalogs.capabilities, categoryFilter, search])

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
    [state.selectedToolIds, state.selectedToolVersion, actions]
  )

  const selectedCount = state.selectedToolIds.length

  return (
    <Card className="gba:!bg-background">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Wrench className="gba:w-5 gba:h-5" />
              Tools
            </CardTitle>
            <CardDescription>Select tools the agent can use</CardDescription>
          </div>
          <Badge variant="secondary">{selectedCount} selected</Badge>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:relative gba:flex-1">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="gba:pl-9"
              data-testid="agent-builder-tool-search"
            />
          </div>
          <div className="gba:flex gba:gap-1">
            {CATEGORY_FILTERS.map(cat => (
              <Button
                key={cat.id}
                size="sm"
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                onClick={() => setCategoryFilter(cat.id)}
                data-testid={`agent-builder-filter-${cat.id}`}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="gba:border gba:rounded-lg gba:divide-y gba:max-h-[400px] gba:overflow-y-auto">
          {catalogs.capabilitiesLoading ? (
            <div className="gba:p-8 gba:flex gba:justify-center">
              <Spinner />
            </div>
          ) : catalogs.capabilitiesError ? (
            <div className="gba:p-4 gba:text-destructive gba:text-sm">{catalogs.capabilitiesError}</div>
          ) : filteredCapabilities.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
              {search ? 'No tools match your search' : 'No tools available'}
            </div>
          ) : (
            filteredCapabilities.map(tool => (
              <div
                key={tool.id}
                className={`gba:p-3 gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:transition-colors ${
                  state.selectedToolIds.includes(tool.id) ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
                }`}
                onClick={() => toggleTool(tool)}
                data-testid={`agent-builder-tool-${tool.id}`}
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
                      {tool.kind === 'internal' ? 'Internal' : tool.kind === 'function' ? 'Business' : 'MCP'}
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
      </CardContent>
    </Card>
  )
}

export default ToolsPickerPanel
