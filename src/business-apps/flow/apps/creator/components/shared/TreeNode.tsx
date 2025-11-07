import React, { useState } from 'react'
import { Button, Badge, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Plus, Circle } from 'lucide-react'
import { TreeNode as TreeNodeType } from '../../types/expressionTree'

interface TreeNodeProps {
  node: TreeNodeType
  depth: number
  onSelect: (node: TreeNodeType) => void
  searchTerm?: string
  'data-testid'?: string
}

/**
 * TreeNode - Recursive tree node component
 *
 * Displays a single node in the expression tree with expand/collapse and selection
 */
export const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, onSelect, searchTerm, 'data-testid': testId }) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpandedByDefault ?? false)
  const hasChildren = node.children && node.children.length > 0

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    } else if (node.type === 'field') {
      // If it's a field without children, clicking the row should select it
      onSelect(node)
    }
  }

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node)
  }

  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchTerm) return text

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="gba:bg-yellow-200 gba:px-0">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const getFieldTypeBadge = () => {
    if (!node.fieldType) return null

    const colors = {
      string: 'gba:bg-blue-100 gba:text-blue-800',
      number: 'gba:bg-green-100 gba:text-green-800',
      date: 'gba:bg-purple-100 gba:text-purple-800',
      datetime: 'gba:bg-purple-100 gba:text-purple-800',
      boolean: 'gba:bg-amber-100 gba:text-amber-800',
      object: 'gba:bg-gray-100 gba:text-gray-800',
      array: 'gba:bg-gray-100 gba:text-gray-800'
    }

    return (
      <Badge variant="outline" className={`gba:text-xs ${colors[node.fieldType]}`}>
        {node.fieldType}
      </Badge>
    )
  }

  return (
    <div style={{ paddingLeft: `${depth * 12}px` }} data-testid={testId}>
      <div
        className={`
          gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-2 gba:rounded
          hover:gba:bg-purple-50 gba:cursor-pointer gba:group gba:transition-colors
          ${node.type === 'field' ? 'gba:ml-2' : ''}
        `}
        onClick={handleToggle}
      >
        {/* Expand/collapse icon */}
        <div className="gba:w-4 gba:shrink-0">
          {hasChildren ? (
            <button onClick={handleToggle} className="gba:p-0 gba:border-0 gba:bg-transparent">
              {isExpanded ? (
                <ChevronDown className="gba:h-4 gba:w-4 gba:text-gray-600" />
              ) : (
                <ChevronRight className="gba:h-4 gba:w-4 gba:text-gray-600" />
              )}
            </button>
          ) : (
            <Circle className="gba:h-2 gba:w-2 gba:text-gray-400" />
          )}
        </div>

        {/* Node icon */}
        {node.icon && <span className="gba:shrink-0">{node.icon}</span>}

        {/* Label */}
        <span className={`gba:flex-1 gba:text-sm ${node.type === 'field' ? 'gba:font-normal' : 'gba:font-medium'}`}>
          {highlightText(node.label)}
        </span>

        {/* Type badge */}
        {getFieldTypeBadge()}

        {/* Add button (appears on hover for field nodes) */}
        {node.type === 'field' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gba:h-6 gba:w-6 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                  onClick={handleSelect}
                  data-testid={`${testId}-add`}
                >
                  <Plus className="gba:h-3 gba:w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="gba:text-xs">Add to expression</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Description tooltip (if available) */}
      {node.description && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="gba:hidden">{/* Tooltip anchor */}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="gba:text-xs">{node.description}</p>
              {node.example && <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Example: {node.example}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Children (if expanded) */}
      {isExpanded && hasChildren && (
        <div className="gba:mt-0.5">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              searchTerm={searchTerm}
              data-testid={`${testId}-child-${child.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
