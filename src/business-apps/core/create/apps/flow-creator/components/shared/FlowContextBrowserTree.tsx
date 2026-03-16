import React, { useCallback } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Circle } from 'lucide-react'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import type { TreeNode } from './flowContextBrowserTreeUtils'

const INDENT_CLASS_BY_DEPTH = ['gba:pl-0', 'gba:pl-4', 'gba:pl-6', 'gba:pl-8', 'gba:pl-10', 'gba:pl-12'] as const

const indentClass = (depth: number): string =>
  INDENT_CLASS_BY_DEPTH[Math.min(Math.max(0, depth), INDENT_CLASS_BY_DEPTH.length - 1)] || 'gba:pl-0'

interface FlowContextBrowserTreeProps {
  roots: TreeNode[]
  query: string
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelect: (item: ExpressionSuggestionItem) => void
  testId: string
}

export const FlowContextBrowserTree: React.FC<FlowContextBrowserTreeProps> = ({
  roots,
  query,
  expanded,
  onToggle,
  onSelect,
  testId
}) => {
  const renderNode = useCallback(
    (node: TreeNode, depth: number) => {
      const hasChildren = Boolean(node.children && node.children.length > 0)
      const isLeaf = Boolean(node.item)
      const isExpanded = expanded.has(node.id) || (query.trim().length > 0 && hasChildren)
      const isRoot = node.id.startsWith('root/')

      if (isLeaf) {
        return (
          <Button
            key={node.id}
            type="button"
            variant="ghost"
            size="sm"
            className={['gba:w-full gba:justify-start gba:text-left gba:h-8', indentClass(depth)].join(' ')}
            onClick={() => node.item && onSelect(node.item)}
            data-testid={`${testId}-leaf-${node.item?.id ?? node.id}`}
          >
            <Circle className="gba:h-2 gba:w-2 gba:mr-2 gba:text-muted-foreground" />
            <span className="gba:truncate gba:text-xs">{node.label}</span>
          </Button>
        )
      }

      return (
        <div key={node.id} className="gba:flex gba:flex-col">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={[
              'gba:w-full gba:justify-start gba:text-left gba:h-8',
              indentClass(depth),
              isRoot ? 'gba:font-semibold' : ''
            ].join(' ')}
            onClick={() => hasChildren && onToggle(node.id)}
            data-testid={`${testId}-node-${node.id}`}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
              ) : (
                <ChevronRight className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
              )
            ) : (
              <span className="gba:w-5 gba:mr-2" />
            )}
            <span className={['gba:truncate gba:text-xs', isRoot ? 'gba:font-semibold' : 'gba:font-medium'].join(' ')}>
              {node.label}
            </span>
          </Button>
          {hasChildren && isExpanded ? (
            <div className="gba:flex gba:flex-col">{node.children!.map(c => renderNode(c, depth + 1))}</div>
          ) : null}
        </div>
      )
    },
    [expanded, onSelect, onToggle, query, testId]
  )

  return (
    <div className="gba:max-h-96 gba:overflow-y-auto gba:flex gba:flex-col gba:gap-0.5">
      {roots.length === 0 ? (
        <div className="gba:text-xs gba:text-muted-foreground gba:p-2" data-testid={`${testId}-empty`}>
          No results.
        </div>
      ) : (
        roots.map(r => renderNode(r, 0))
      )}
    </div>
  )
}
