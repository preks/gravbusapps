import React, { useState, useMemo, useEffect } from 'react'
import { Input, Badge, ScrollArea } from '@newwork/nw-design-system'
import { Search, Loader2 } from 'lucide-react'
import { TreeNode } from './TreeNode'
import { TreeNode as TreeNodeType } from '../../types/expressionTree'
import { filterTreeNodes } from '../../utils/expressionTreeBuilder'

interface TreeNavigatorProps {
  nodes: TreeNodeType[]
  onSelect: (node: TreeNodeType) => void
  onEntitySearch?: (nodeId: string, search: string) => void
  isLoading?: boolean
  'data-testid'?: string
}

export const TreeNavigator: React.FC<TreeNavigatorProps> = ({
  nodes,
  onSelect,
  onEntitySearch,
  isLoading = false,
  'data-testid': testId
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize expanded nodes from the tree structure
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>()
    const collectExpanded = (nodeList: TreeNodeType[]) => {
      nodeList.forEach(node => {
        if (node.isExpanded) {
          initialExpanded.add(node.id)
        }
        if (node.children) {
          collectExpanded(node.children)
        }
      })
    }
    collectExpanded(nodes)
    return initialExpanded
  })

  // Sync expansion state when tree data changes (e.g., after loading catalog entries)
  useEffect(() => {
    const collectExpanded = (nodeList: TreeNodeType[]) => {
      const expanded = new Set<string>()
      nodeList.forEach(node => {
        if (node.isExpanded) {
          expanded.add(node.id)
        }
        if (node.children) {
          collectExpanded(node.children).forEach(id => expanded.add(id))
        }
      })
      return expanded
    }

    const newExpanded = collectExpanded(nodes)

    // Merge with previous state, but also respect when nodes should be collapsed
    // Keep manually toggled nodes, but add programmatically expanded nodes
    setExpandedNodes(prev => {
      const merged = new Set([...prev, ...newExpanded])
      console.log('TreeNavigator: Syncing expansion state', {
        previousCount: prev.size,
        newCount: newExpanded.size,
        mergedCount: merged.size,
        newExpanded: Array.from(newExpanded),
        added: Array.from(newExpanded).filter(id => !prev.has(id))
      })
      return merged
    })
  }, [nodes])

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    return filterTreeNodes(nodes, searchQuery)
  }, [nodes, searchQuery])

  // Count total fields
  const totalFields = useMemo(() => {
    const countFields = (nodeList: TreeNodeType[]): number => {
      return nodeList.reduce((count, node) => {
        const isField = node.type === 'field' || node.type === 'catalog-field' || node.type === 'entity-field'
        const childCount = node.children ? countFields(node.children) : 0
        return count + (isField ? 1 : 0) + childCount
      }, 0)
    }
    return countFields(nodes)
  }, [nodes])

  // Handle node toggle
  const handleToggle = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  // Handle node selection
  const handleSelect = (node: TreeNodeType) => {
    onSelect(node)
  }

  // Apply expansion state from local state only
  const nodesWithExpansion = useMemo(() => {
    const applyExpansion = (nodeList: TreeNodeType[]): TreeNodeType[] => {
      return nodeList.map(node => ({
        ...node,
        isExpanded: expandedNodes.has(node.id),
        children: node.children ? applyExpansion(node.children) : undefined
      }))
    }
    return applyExpansion(filteredNodes)
  }, [filteredNodes, expandedNodes])

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {/* Header */}
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:text-sm gba:font-semibold gba:text-gray-900">Data Navigator</h3>
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:gap-2">
              <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin gba:text-gray-500" />
              <span className="gba:text-xs gba:text-gray-500">Loading...</span>
            </div>
          ) : (
            <Badge variant="secondary" className="gba:text-xs">
              {totalFields} fields
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search fields..."
            className="gba:pl-10"
            data-testid={`${testId}-search`}
          />
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="gba:border gba:rounded-md gba:p-2" style={{ height: '450px' }}>
        {isLoading ? (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-gray-500"
            style={{ height: '400px' }}
          >
            <Loader2 className="gba:h-8 gba:w-8 gba:animate-spin gba:mb-2" />
            <p className="gba:text-sm">Loading catalog data...</p>
          </div>
        ) : filteredNodes.length > 0 ? (
          <div className="gba:space-y-0.5">
            {nodesWithExpansion.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onEntitySearch={onEntitySearch}
                data-testid={`${testId}-node-${node.id}`}
              />
            ))}
          </div>
        ) : (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-gray-500"
            style={{ height: '400px' }}
          >
            <Search className="gba:h-8 gba:w-8 gba:mb-2" />
            <p className="gba:text-sm">No fields found</p>
            {searchQuery && <p className="gba:text-xs gba:mt-1">Try a different search term</p>}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
