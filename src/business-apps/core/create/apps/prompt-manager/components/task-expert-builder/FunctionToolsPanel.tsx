import React, { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { Search, Wrench } from 'lucide-react'
import type { TabProps, UnifiedCapability } from './types'

export const FunctionToolsPanel: React.FC<Pick<TabProps, 'state' | 'actions' | 'catalogs'>> = ({
  state,
  actions,
  catalogs
}) => {
  const [search, setSearch] = useState('')

  const functionCapabilities = useMemo(
    () => catalogs.capabilities.filter(c => c.kind === 'function'),
    [catalogs.capabilities]
  )

  const filtered = useMemo(() => {
    let result = functionCapabilities
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    return result
  }, [functionCapabilities, search])

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
        <div className="gba:relative">
          <Search className="gba:absolute gba:start-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search function tools..."
            className="gba:ps-10"
            data-testid="agent-builder-function-tool-search"
          />
        </div>

        <div className="gba:border gba:rounded-lg gba:divide-y gba:max-h-[400px] gba:overflow-y-auto">
          {catalogs.capabilitiesLoading ? (
            <div className="gba:p-8 gba:flex gba:justify-center">
              <Spinner />
            </div>
          ) : catalogs.capabilitiesError ? (
            <div className="gba:p-4 gba:text-destructive gba:text-sm">{catalogs.capabilitiesError}</div>
          ) : filtered.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
              {search ? 'No function tools match your search' : 'No function tools available'}
            </div>
          ) : (
            filtered.map(tool => (
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
      </CardContent>
    </Card>
  )
}

export default FunctionToolsPanel
