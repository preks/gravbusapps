import React from 'react'
import { Button, Badge, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import {
  ChevronRight,
  ChevronDown,
  Workflow,
  Database,
  FolderOpen,
  User,
  Calendar,
  Clock,
  Hash,
  Type,
  CheckSquare,
  List,
  Box,
  Circle,
  Link,
  Info,
  Tag,
  Plus
} from 'lucide-react'
import { TreeNode as TreeNodeType } from '../../types/expressionTree'

interface TreeNodeProps {
  node: TreeNodeType
  onSelect: (node: TreeNodeType) => void
  onToggle: (nodeId: string) => void
  level?: number
  'data-testid'?: string
}

const iconMap: Record<string, React.ReactNode> = {
  workflow: <Workflow className="gba:h-4 gba:w-4 gba:text-blue-600" />,
  database: <Database className="gba:h-4 gba:w-4 gba:text-green-600" />,
  'folder-open': <FolderOpen className="gba:h-4 gba:w-4 gba:text-amber-600" />,
  link: <Link className="gba:h-4 gba:w-4 gba:text-purple-600" />,
  user: <User className="gba:h-4 gba:w-4" />,
  calendar: <Calendar className="gba:h-4 gba:w-4" />,
  clock: <Clock className="gba:h-4 gba:w-4" />,
  hash: <Hash className="gba:h-4 gba:w-4" />,
  type: <Type className="gba:h-3 gba:w-3" />,
  'check-square': <CheckSquare className="gba:h-3 gba:w-3" />,
  list: <List className="gba:h-3 gba:w-3" />,
  box: <Box className="gba:h-3 gba:w-3" />,
  circle: <Circle className="gba:h-2 gba:w-2 gba:text-gray-400" />,
  folder: <FolderOpen className="gba:h-4 gba:w-4" />,
  info: <Info className="gba:h-4 gba:w-4" />,
  tag: <Tag className="gba:h-4 gba:w-4" />
}

const dataTypeBadgeColors: Record<string, string> = {
  string: 'gba:bg-blue-100 gba:text-blue-800',
  number: 'gba:bg-green-100 gba:text-green-800',
  date: 'gba:bg-purple-100 gba:text-purple-800',
  datetime: 'gba:bg-purple-100 gba:text-purple-800',
  boolean: 'gba:bg-yellow-100 gba:text-yellow-800',
  object: 'gba:bg-gray-100 gba:text-gray-800',
  array: 'gba:bg-gray-100 gba:text-gray-800'
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, onSelect, onToggle, level = 0, 'data-testid': testId }) => {
  const hasChildren = node.children && node.children.length > 0
  const isExpandable = hasChildren
  const paddingLeft = level * 12

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isExpandable) {
      onToggle(node.id)
    }
  }

  const handleSelect = () => {
    // If node has children, toggle expansion
    if (hasChildren) {
      onToggle(node.id)
    }

    // Also allow selection of leaf nodes (fields) or special catalog nodes
    if (!hasChildren || node.type === 'catalog-container' || node.expressionTemplate) {
      onSelect(node)
    }
  }

  return (
    <div data-testid={testId}>
      <div
        className={`
          gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-2 gba:rounded
          hover:gba:bg-purple-50 gba:cursor-pointer gba:group gba:transition-colors
          ${node.metadata?.isCurrent ? 'gba:bg-purple-50' : ''}
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* Toggle button */}
        <div className="gba:w-4 gba:shrink-0">
          {isExpandable ? (
            <button className="gba:p-0 gba:border-0 gba:bg-transparent" onClick={handleToggle}>
              {node.isExpanded ? (
                <ChevronDown className="gba:h-4 gba:w-4 gba:text-gray-600" />
              ) : (
                <ChevronRight className="gba:h-4 gba:w-4 gba:text-gray-600" />
              )}
            </button>
          ) : (
            <Circle className="gba:h-2 gba:w-2 gba:text-gray-400" />
          )}
        </div>

        {/* Icon */}
        {node.icon && (
          <span className="gba:shrink-0">{iconMap[node.icon] || <Circle className="gba:h-3 gba:w-3" />}</span>
        )}

        {/* Label with tooltip */}
        {node.description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`gba:flex-1 gba:text-sm gba:cursor-pointer ${
                  node.type === 'field' || node.type === 'catalog-field' ? 'gba:font-normal' : 'gba:font-medium'
                }`}
                onClick={handleSelect}
              >
                {node.label}
              </span>
            </TooltipTrigger>
            <TooltipContent className="gba:max-w-sm gba:whitespace-pre-line">
              <p>{node.description}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span
            className={`gba:flex-1 gba:text-sm ${
              node.type === 'field' || node.type === 'catalog-field' ? 'gba:font-normal' : 'gba:font-medium'
            }`}
            onClick={handleSelect}
          >
            {node.label}
          </span>
        )}

        {/* Data type badge */}
        {node.dataType && (
          <Badge variant="outline" className={`gba:text-xs ${dataTypeBadgeColors[node.dataType]}`}>
            {node.dataType}
          </Badge>
        )}

        {/* Add button (for fields) */}
        {(node.type === 'field' || node.type === 'catalog-field' || node.type === 'catalog-container') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-6 gba:w-6 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                onClick={e => {
                  e.stopPropagation()
                  onSelect(node)
                }}
                data-testid={`${testId}-add`}
              >
                <Plus className="gba:h-3 gba:w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{node.expressionTemplate ? 'Insert template' : 'Insert expression'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Render children */}
      {isExpandable && node.isExpanded && node.children && (
        <div className="gba:mt-0.5">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              onToggle={onToggle}
              level={level + 1}
              data-testid={`${testId}-child-${child.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
