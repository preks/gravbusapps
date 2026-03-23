import React, { useMemo, useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Separator } from '@newwork/nw-design-system'
import { FolderTree } from 'lucide-react'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextBrowserTree } from './FlowContextBrowserTree'
import type { CatalogOption, EntityOption } from '../../hooks/useFlowStudioData'
import { FlowContextDataSourcesTree } from './FlowContextDataSourcesTree'
import { buildFlowContextTree, filterTree, type TreeNode } from './flowContextBrowserTreeUtils'

export interface FlowContextBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ExpressionSuggestionItem[]
  onSelect: (item: ExpressionSuggestionItem) => void
  title?: string
  dataSources?: {
    catalogs: CatalogOption[]
    catalogsLoading: boolean
    catalogsError: string | null
    catalogsQuery: string
    catalogsHasMore: boolean
    searchCatalogs: (query: string) => Promise<void>
    loadMoreCatalogs: () => Promise<void>
    entities: EntityOption[]
    entitiesLoading: boolean
    entitiesError: string | null
  }
  'data-testid'?: string
}

export const FlowContextBrowserDialog: React.FC<FlowContextBrowserDialogProps> = ({
  open,
  onOpenChange,
  items,
  onSelect,
  title = 'Browse flow context',
  dataSources,
  'data-testid': testId = 'flow-context-browser-dialog'
}) => {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root/trigger', 'root/workflow', 'root/steps']))
  const [tab, setTab] = useState<'flow' | 'data-sources'>('flow')

  const tree = useMemo(() => {
    return buildFlowContextTree(items)
  }, [items])

  const filteredTree = useMemo(() => {
    if (!query.trim()) return tree
    return tree.map(r => filterTree(r, query)).filter(Boolean) as TreeNode[]
  }, [query, tree])

  const visibleRoots = useMemo(() => {
    if (query.trim()) return filteredTree
    if (tab === 'flow') {
      return tree.filter(r => r.id === 'root/trigger' || r.id === 'root/workflow' || r.id === 'root/steps')
    }
    return tree.filter(r => r.id === 'root/orgchart')
  }, [filteredTree, query, tab, tree])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <FolderTree className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:flex gba:flex-col gba:gap-3">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'data-sources' ? 'Search catalogs and entities…' : 'Search flow context…'}
            className="gba:h-9"
            data-testid={`${testId}-search`}
          />
          <Separator />
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:flex gba:items-center gba:gap-1 gba:bg-muted gba:p-1 gba:rounded-md">
              <Button
                type="button"
                size="sm"
                variant={tab === 'flow' ? 'default' : 'ghost'}
                onClick={() => setTab('flow')}
                className="gba:h-7 gba:px-2 gba:text-xs"
                data-testid={`${testId}-tab-flow`}
              >
                Flow context
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === 'data-sources' ? 'default' : 'ghost'}
                onClick={() => setTab('data-sources')}
                className="gba:h-7 gba:px-2 gba:text-xs"
                data-testid={`${testId}-tab-data`}
              >
                Data sources
              </Button>
            </div>
          </div>

          {tab === 'data-sources' && dataSources ? (
            <FlowContextDataSourcesTree
              query={query}
              dataSources={dataSources}
              flowContextItems={items}
              onSelect={onSelect}
              testId={testId}
            />
          ) : (
            <FlowContextBrowserTree
              roots={visibleRoots}
              query={query}
              expanded={expanded}
              onToggle={toggle}
              onSelect={onSelect}
              testId={testId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
