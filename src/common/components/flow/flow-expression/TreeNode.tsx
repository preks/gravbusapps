import React, { useState } from 'react'
import { Badge, Button, Input, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import {
  Box,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Database,
  FolderOpen,
  Hash,
  Info,
  Link,
  List,
  Plus,
  Search,
  Tag,
  Type,
  User,
  Workflow
} from 'lucide-react'
import { TreeNode as TreeNodeType } from '@/common/data/flow/types/expressionTree'

interface TreeNodeProps {
  node: TreeNodeType
  onSelect: (node: TreeNodeType) => void
  onToggle: (nodeId: string) => void
  onEntitySearch?: (nodeId: string, search: string) => void
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

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  onSelect,
  onToggle,
  onEntitySearch,
  level = 0,
  'data-testid': testId
}) => {
  const hasChildren = node.children && node.children.length > 0
  const isExpandable = hasChildren
  const paddingLeft = level * 12
  const [showEntitySearch, setShowEntitySearch] = useState(false)
  const [entitySearchValue, setEntitySearchValue] = useState(node.metadata?.search || '')

  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (isExpandable) {
      onToggle(node.id)
    }
  }

  const handleSelect = () => {
    if (node.type === 'entity-browser' && onEntitySearch) {
      if (hasChildren) {
        onToggle(node.id)
      } else {
        setShowEntitySearch(true)
      }
      return
    }

    if (hasChildren) {
      onToggle(node.id)
    }

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

        {node.icon && (
          <span className="gba:shrink-0">{iconMap[node.icon] || <Circle className="gba:h-3 gba:w-3" />}</span>
        )}

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

        {node.dataType && (
          <Badge variant="outline" className={`gba:text-xs ${dataTypeBadgeColors[node.dataType]}`}>
            {node.dataType}
          </Badge>
        )}

        {node.type === 'entity-browser' && hasChildren && node.metadata?.search && onEntitySearch && (
          <div className="gba:flex gba:items-center gba:gap-1">
            <Badge
              variant="secondary"
              className="gba:text-xs gba:bg-purple-100 gba:text-purple-800 gba:border-purple-200 gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5"
            >
              <Search className="gba:h-3 gba:w-3" />
              <span>{node.metadata.search}</span>
              <button
                onClick={event => {
                  event.stopPropagation()
                  setShowEntitySearch(true)
                }}
                className="gba:ml-1 gba:text-purple-600 hover:gba:text-purple-900 gba:font-semibold"
                data-testid={`${testId}-change-search`}
              >
                ×
              </button>
            </Badge>
          </div>
        )}

        {node.type === 'entity-browser' && hasChildren && !node.metadata?.search && onEntitySearch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-6 gba:w-6 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                onClick={event => {
                  event.stopPropagation()
                  setShowEntitySearch(true)
                }}
                data-testid={`${testId}-search-again`}
              >
                <Search className="gba:h-3 gba:w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search</p>
            </TooltipContent>
          </Tooltip>
        )}

        {(node.expressionTemplate ||
          node.type === 'field' ||
          node.type === 'catalog-field' ||
          node.type === 'catalog-container') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-6 gba:w-6 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                onClick={event => {
                  event.stopPropagation()
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

      {showEntitySearch && node.type === 'entity-browser' && onEntitySearch && (
        <div className="gba:mt-2 gba:ml-6 gba:mr-2 gba:p-2 gba:bg-purple-50 gba:rounded gba:border gba:border-purple-200">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Search className="gba:h-4 gba:w-4 gba:text-purple-600 gba:shrink-0" />
            <Input
              type="text"
              placeholder={`Search ${node.metadata?.entityType || 'entities'}...`}
              value={entitySearchValue}
              onChange={event => setEntitySearchValue(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  onEntitySearch(node.id, entitySearchValue)
                  setShowEntitySearch(false)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  setShowEntitySearch(false)
                  setEntitySearchValue(node.metadata?.search || '')
                }
              }}
              className="gba:flex-1 gba:text-sm"
              autoFocus
              data-testid={`${testId}-entity-search`}
            />
            <Button
              size="sm"
              onClick={event => {
                event.stopPropagation()
                onEntitySearch(node.id, entitySearchValue)
                setShowEntitySearch(false)
              }}
              data-testid={`${testId}-search-button`}
            >
              Search
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                setShowEntitySearch(false)
                setEntitySearchValue(node.metadata?.search || '')
              }}
              data-testid={`${testId}-cancel-button`}
            >
              Cancel
            </Button>
          </div>
          <p className="gba:text-xs gba:text-gray-600 gba:mt-1 gba:ml-6">Press Enter to search, Escape to cancel</p>
        </div>
      )}

      {isExpandable && node.isExpanded && node.children && (
        <div className="gba:mt-0.5">
          {node.children.map(childNode => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              onSelect={onSelect}
              onToggle={onToggle}
              onEntitySearch={onEntitySearch}
              level={level + 1}
              data-testid={`${testId}-child-${childNode.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
