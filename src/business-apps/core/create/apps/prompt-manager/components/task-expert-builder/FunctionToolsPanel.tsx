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
import { Cloud, ExternalLink, FolderOpen, Wrench } from 'lucide-react'
import { Navigation } from '@/common/utils/navigationUtils'
import type { TabProps, UnifiedCapability } from './types'

/**
 * Build a link to the Function Manager editor for the given function id.
 * Opens in a new tab so the user doesn't lose their unsaved Task Expert edits.
 */
const buildFunctionEditorUrl = (functionId: string): string =>
  `${Navigation.CREATE_FUNCTION_MANAGER}?functionId=${encodeURIComponent(functionId)}`

/**
 * Visual mode for this panel.
 * - `all`         → show every function (legacy behaviour; default).
 * - `connectors`  → only functions that wrap a Newwork Connect connection
 *                   (Anypoint Connect + Data Bridge). Used for the Connectors card.
 * - `non-connectors` → only regular business functions. Used for the Function Tools card
 *                      once Connectors have been split out into their own peer card.
 */
export type FunctionToolsPanelMode = 'all' | 'connectors' | 'non-connectors'

export interface FunctionToolsPanelProps extends Pick<TabProps, 'state' | 'actions' | 'catalogs'> {
  title?: string
  description?: string
  headerIcon?: React.ComponentType<{ className?: string }>
  mode?: FunctionToolsPanelMode
  /** When true, the rendered rows are split under `Anypoint Connect` / `Data Bridge` subheaders. */
  groupByConnectorKind?: boolean
  /** Test-id prefix. Defaults to `agent-builder-function-tools` to preserve existing e2e selectors. */
  testIdPrefix?: string
  /** Override the empty-state text (e.g. "No connectors available"). */
  emptyLabel?: string
}

type ConnectorKind = 'structured' | 'unstructured' | null | undefined

const isConnector = (c: UnifiedCapability): boolean => c.sourceMeta?.connectorEnabled === true
const connectorKindOf = (c: UnifiedCapability): ConnectorKind => c.sourceMeta?.connectorKind ?? null

const CONNECTOR_KIND_META: Record<
  'structured' | 'unstructured',
  { label: string; short: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  structured: { label: 'Anypoint Connect (structured sources)', short: 'Anypoint Connect', Icon: Cloud },
  unstructured: { label: 'Data Bridge (unstructured sources)', short: 'Data Bridge', Icon: FolderOpen }
}

const renderBadge = (kind: ConnectorKind): React.ReactElement => {
  if (kind === 'structured') {
    return (
      <Badge variant="outline" className="gba:text-xs gba:border-primary/40 gba:text-primary">
        Anypoint Connect
      </Badge>
    )
  }
  if (kind === 'unstructured') {
    return (
      <Badge variant="outline" className="gba:text-xs gba:border-primary/40 gba:text-primary">
        Data Bridge
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gba:text-xs">
      Function
    </Badge>
  )
}

export const FunctionToolsPanel: React.FC<FunctionToolsPanelProps> = ({
  state,
  actions,
  catalogs,
  title = 'Function Tools',
  description = 'Select the functions the agent can call',
  headerIcon: HeaderIcon = Wrench,
  mode = 'all',
  groupByConnectorKind = false,
  testIdPrefix = 'agent-builder-function-tools',
  emptyLabel
}) => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'all' | 'selected'>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 5

  const scopedCapabilities = useMemo(() => {
    const functionsOnly = catalogs.capabilities.filter(c => c.kind === 'function')
    if (mode === 'connectors') return functionsOnly.filter(isConnector)
    if (mode === 'non-connectors') return functionsOnly.filter(c => !isConnector(c))
    return functionsOnly
  }, [catalogs.capabilities, mode])

  const filtered = useMemo(() => {
    let result = scopedCapabilities
    if (view === 'selected') {
      const selected = new Set(state.selectedToolIds)
      result = result.filter(c => selected.has(c.id))
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    return result
  }, [scopedCapabilities, search, state.selectedToolIds, view])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length])
  const currentPage = Math.min(pageIndex + 1, totalPages)
  const paged = useMemo(() => {
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filtered.slice(start, end)
  }, [filtered, pageIndex])

  const selectedCount = useMemo(
    () => scopedCapabilities.filter(c => state.selectedToolIds.includes(c.id)).length,
    [scopedCapabilities, state.selectedToolIds]
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

  const renderRow = (tool: UnifiedCapability): React.ReactElement => {
    const functionId = tool.sourceMeta?.functionId
    const editorUrl = functionId ? buildFunctionEditorUrl(functionId) : null
    const configureLabel = isConnector(tool)
      ? 'Configure connector in Function Manager'
      : 'Edit function in Function Manager'
    return (
      <div
        key={tool.id}
        className={`gba:p-3 gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:transition-colors ${
          state.selectedToolIds.includes(tool.id) ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
        }`}
        onClick={() => toggleTool(tool)}
        data-testid={`${testIdPrefix}-item-${tool.id}`}
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
            {renderBadge(connectorKindOf(tool))}
          </div>
          {tool.description && <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{tool.description}</p>}
        </div>
        {editorUrl && (
          <a
            href={editorUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Clicking Configure must NOT toggle the row's selection.
            onClick={e => e.stopPropagation()}
            title={configureLabel}
            aria-label={configureLabel}
            className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:px-2 gba:py-1 gba:rounded gba:border gba:border-transparent gba:hover:border-border gba:transition-colors"
            data-testid={`${testIdPrefix}-configure-${tool.id}`}
          >
            <ExternalLink className="gba:w-3.5 gba:h-3.5" />
            Configure
          </a>
        )}
      </div>
    )
  }

  const renderGroupedRows = (): React.ReactElement[] => {
    // Render paged items, inserting a subheader each time the connectorKind changes.
    const out: React.ReactElement[] = []
    let lastKind: ConnectorKind | 'init' = 'init'
    paged.forEach(tool => {
      const kind = connectorKindOf(tool)
      if (groupByConnectorKind && kind !== lastKind && (kind === 'structured' || kind === 'unstructured')) {
        const meta = CONNECTOR_KIND_META[kind]
        const SubheaderIcon = meta.Icon
        out.push(
          <div
            key={`subheader-${kind}`}
            className="gba:px-3 gba:py-2 gba:bg-muted/40 gba:flex gba:items-center gba:gap-2 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground"
            data-testid={`${testIdPrefix}-subheader-${kind}`}
          >
            <SubheaderIcon className="gba:w-3.5 gba:h-3.5" />
            {meta.label}
          </div>
        )
      }
      lastKind = kind
      out.push(renderRow(tool))
    })
    return out
  }

  const emptyText = emptyLabel
    ? emptyLabel
    : view === 'selected'
      ? search
        ? 'No selected items match your search'
        : 'No items selected'
      : search
        ? 'No items match your search'
        : mode === 'connectors'
          ? 'No connectors available. Create one in Newwork Connect, then enable Agent on its function.'
          : 'No function tools available'

  return (
    <Card className="gba:!bg-background" data-testid={`${testIdPrefix}-panel`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <HeaderIcon className="gba:w-5 gba:h-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{selectedCount} selected</Badge>
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
            data-testid={`${testIdPrefix}-view-all`}
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
            data-testid={`${testIdPrefix}-view-selected`}
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
          placeholder={mode === 'connectors' ? 'Search connectors...' : 'Search function tools...'}
          data-testid={`${testIdPrefix}-search`}
        />

        <div className="gba:border gba:rounded-lg gba:divide-y">
          {catalogs.capabilitiesLoading ? (
            <div className="gba:p-8 gba:flex gba:justify-center">
              <Spinner />
            </div>
          ) : catalogs.capabilitiesError ? (
            <div className="gba:p-4 gba:text-destructive gba:text-sm">{catalogs.capabilitiesError}</div>
          ) : filtered.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-muted-foreground">{emptyText}</div>
          ) : groupByConnectorKind ? (
            renderGroupedRows()
          ) : (
            paged.map(renderRow)
          )}
        </div>

        {filtered.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:text-muted-foreground gba:text-sm" data-testid={`${testIdPrefix}-page`}>
              Page {currentPage} of {totalPages}
            </div>
            <div className="gba:flex gba:gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                data-testid={`${testIdPrefix}-prev`}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                data-testid={`${testIdPrefix}-next`}
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
