import React, { useState } from 'react'
import { Input, ScrollArea, Badge } from '@newwork/nw-design-system'
import { Search } from 'lucide-react'
import { TreeNode as TreeNodeType } from '../../types/expressionTree'
import { TreeNode } from './TreeNode'
import { filterTreeNodes } from '../../utils/expressionTreeBuilder'

interface TreeNavigatorProps {
  nodes: TreeNodeType[]
  onSelect: (node: TreeNodeType) => void
  'data-testid'?: string
}

/**
 * TreeNavigator - Tree view with search for navigating available expressions
 */
export const TreeNavigator: React.FC<TreeNavigatorProps> = ({
  nodes,
  onSelect,
  'data-testid': testId = 'tree-navigator'
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter nodes based on search
  const filteredNodes = searchTerm ? filterTreeNodes(nodes, searchTerm) : nodes

  // Count total selectable fields
  const countFields = (nodes: TreeNodeType[]): number => {
    return nodes.reduce((count, node) => {
      const nodeCount = node.type === 'field' ? 1 : 0
      const childCount = node.children ? countFields(node.children) : 0
      return count + nodeCount + childCount
    }, 0)
  }

  const totalFields = countFields(nodes)
  const filteredFieldCount = countFields(filteredNodes)

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {/* Header */}
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:text-sm gba:font-semibold gba:text-gray-900">Data Navigator</h3>
          <Badge variant="secondary" className="gba:text-xs">
            {searchTerm ? `${filteredFieldCount}/` : ''}
            {totalFields} fields
          </Badge>
        </div>

        {/* Search input */}
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search fields..."
            className="gba:pl-10"
            data-testid={`${testId}-search`}
          />
        </div>
      </div>

      {/* Tree view */}
      <ScrollArea className="gba:border gba:rounded-md gba:p-2" style={{ height: '450px' }}>
        {filteredNodes.length > 0 ? (
          <div className="gba:space-y-0.5">
            {filteredNodes.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                onSelect={onSelect}
                searchTerm={searchTerm}
                data-testid={`${testId}-node-${node.id}`}
              />
            ))}
          </div>
        ) : (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-gray-500"
            style={{ height: '450px' }}
          >
            <Search className="gba:h-8 gba:w-8 gba:mb-2 gba:opacity-50" />
            <p className="gba:text-sm">No fields found</p>
            <p className="gba:text-xs">Try a different search term</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
