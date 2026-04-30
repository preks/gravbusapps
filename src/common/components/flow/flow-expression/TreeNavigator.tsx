import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Input, ScrollArea } from '@newwork/nw-design-system'
import { Loader2, Search } from 'lucide-react'
import { TreeNode as TreeNodeType } from '@/common/data/flow/types/expressionTree'
import { filterTreeNodes } from '@/common/data/flow/utils/expressionTreeBuilder'
import { TreeNode } from './TreeNode'

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

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initialExpandedNodes = new Set<string>()
    const collectExpanded = (nodeList: TreeNodeType[]) => {
      nodeList.forEach(node => {
        if (node.isExpanded) {
          initialExpandedNodes.add(node.id)
        }
        if (node.children) {
          collectExpanded(node.children)
        }
      })
    }
    collectExpanded(nodes)
    return initialExpandedNodes
  })

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

    const nextExpandedNodes = collectExpanded(nodes)
    setExpandedNodes(previousExpandedNodes => new Set([...previousExpandedNodes, ...nextExpandedNodes]))
  }, [nodes])

  const filteredNodes = useMemo(() => {
    return filterTreeNodes(nodes, searchQuery)
  }, [nodes, searchQuery])

  const totalFields = useMemo(() => {
    const countFields = (nodeList: TreeNodeType[]): number => {
      return nodeList.reduce((fieldCount, node) => {
        const isField = node.type === 'field' || node.type === 'catalog-field' || node.type === 'entity-field'
        const childCount = node.children ? countFields(node.children) : 0
        return fieldCount + (isField ? 1 : 0) + childCount
      }, 0)
    }
    return countFields(nodes)
  }, [nodes])

  const handleToggle = (nodeId: string) => {
    setExpandedNodes(previousExpandedNodes => {
      const nextExpandedNodes = new Set(previousExpandedNodes)
      if (nextExpandedNodes.has(nodeId)) {
        nextExpandedNodes.delete(nodeId)
      } else {
        nextExpandedNodes.add(nodeId)
      }
      return nextExpandedNodes
    })
  }

  const nodesWithExpansion = useMemo(() => {
    const applyExpansion = (nodeList: TreeNodeType[]): TreeNodeType[] => {
      return nodeList.map(node => ({
        ...node,
        isExpanded: expandedNodes.has(node.id),
        children: node.children ? applyExpansion(node.children) : undefined
      }))
    }
    return applyExpansion(filteredNodes)
  }, [expandedNodes, filteredNodes])

  return (
    <div className="gba:space-y-3" data-testid={testId}>
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

        <div className="gba:relative">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
          <Input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search fields..."
            className="gba:pl-10"
            data-testid={`${testId}-search`}
          />
        </div>
      </div>

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
                onSelect={onSelect}
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
