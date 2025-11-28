import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'

interface MenuTableProps {
  menuItems: MenuItemDTO[]
  isLoading: boolean
  error: string | null
  dataTestId: string
  onCountChange?: (count: number) => void
  currentView: string
}

export const MenuTable: React.FC<MenuTableProps> = ({
  menuItems: menuItemsProp,
  isLoading,
  error,
  dataTestId,
  onCountChange,
  currentView
}) => {
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemDTO[]>(menuItemsProp)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set(['USE', 'CREATE', 'MANAGE']))

  useEffect(() => {
    if (onCountChange && currentView === 'menu') {
      onCountChange(localMenuItems.length)
    }
  }, [localMenuItems.length, currentView, onCountChange])

  useEffect(() => {
    setLocalMenuItems(menuItemsProp)
  }, [menuItemsProp])

  const toggleExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const toggleSpaceExpansion = useCallback((spaceType: string) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev)
      if (next.has(spaceType)) {
        next.delete(spaceType)
      } else {
        next.add(spaceType)
      }
      return next
    })
  }, [])

  const groupedBySpace = useMemo(() => {
    const spaces: Record<string, MenuItemDTO[]> = {
      USE: [],
      CREATE: [],
      MANAGE: [],
      OTHER: []
    }

    localMenuItems.forEach(item => {
      if (item.level === 0) {
        const spaceType = item.type || 'OTHER'
        if (spaces[spaceType]) {
          spaces[spaceType].push(item)
        } else {
          spaces.OTHER.push(item)
        }
      } else {
        spaces.OTHER.push(item)
      }
    })

    Object.keys(spaces).forEach(space => {
      spaces[space].sort((a, b) => (a.rank || 0) - (b.rank || 0))
    })

    return spaces
  }, [localMenuItems])

  const renderMenuItem = useCallback(
    (item: MenuItemDTO, depth: number = 0) => {
      const isExpanded = expandedItems.has(item.id)
      const hasChildren = item.children && item.children.length > 0
      const isHub = item.level === 0

      return (
        <div
          key={item.id}
          className="gba:border-l gba:border-border"
          data-testid={`${dataTestId}-menu-item-${item.id}`}
        >
          <div
            className={`gba:flex gba:items-center gba:gap-2 gba:py-2 gba:px-3 gba:hover:bg-muted/50 gba:transition-colors ${
              isHub ? 'gba:bg-muted/30 gba:font-semibold' : ''
            }`}
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation()
                  toggleExpansion(item.id)
                }}
                className="gba:h-6 gba:w-6"
              >
                {isExpanded ? <CaretDown className="gba:h-4 gba:w-4" /> : <CaretRight className="gba:h-4 gba:w-4" />}
              </Button>
            ) : (
              <div className="gba:w-6" />
            )}
            {item.icon && (
              <span className="gba:text-lg" data-testid={`${dataTestId}-menu-icon-${item.id}`}>
                {item.icon}
              </span>
            )}
            <span className={`gba:flex-1 ${isHub ? 'gba:font-semibold' : 'gba:font-medium'}`}>{item.name}</span>
            {isHub && item.code && (
              <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">{item.code}</code>
            )}
            {item.resourceUrl && (
              <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                {item.resourceUrl.url || item.resourceUrlId}
              </code>
            )}
            {item.rank !== undefined && <span className="gba:text-xs gba:text-muted-foreground">#{item.rank}</span>}
          </div>
          {hasChildren && isExpanded && <div>{item.children?.map(child => renderMenuItem(child, depth + 1))}</div>}
        </div>
      )
    },
    [expandedItems, toggleExpansion, dataTestId]
  )

  const renderSpace = useCallback(
    (spaceType: string, spaceLabel: string, items: MenuItemDTO[]) => {
      if (items.length === 0) return null

      const isExpanded = expandedSpaces.has(spaceType)

      return (
        <div key={spaceType} className="gba:mb-4" data-testid={`${dataTestId}-space-${spaceType}`}>
          <div
            className="gba:flex gba:items-center gba:gap-2 gba:py-3 gba:px-4 gba:bg-muted gba:rounded-t-md gba:border-b gba:border-border gba:cursor-pointer gba:hover:bg-muted/80 gba:transition-colors"
            onClick={() => toggleSpaceExpansion(spaceType)}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={e => {
                e.stopPropagation()
                toggleSpaceExpansion(spaceType)
              }}
              className="gba:h-6 gba:w-6"
            >
              {isExpanded ? <CaretDown className="gba:h-4 gba:w-4" /> : <CaretRight className="gba:h-4 gba:w-4" />}
            </Button>
            <span className="gba:text-lg gba:font-bold">{spaceLabel}</span>
            <span className="gba:text-sm gba:text-muted-foreground">
              ({items.length} hub{items.length !== 1 ? 's' : ''})
            </span>
          </div>
          {isExpanded && (
            <div className="gba:border gba:border-t-0 gba:rounded-b-md gba:bg-background">
              {items.map(item => renderMenuItem(item, 0))}
            </div>
          )}
        </div>
      )
    },
    [expandedSpaces, toggleSpaceExpansion, renderMenuItem, dataTestId]
  )

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center">
        <p className="gba:text-muted-foreground">Loading menu tree...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">Error loading menu tree: {error}</p>
      </div>
    )
  }

  if (localMenuItems.length === 0) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-muted-foreground">No menu items found</p>
      </div>
    )
  }

  return (
    <div className="gba:p-4" data-testid={`${dataTestId}-menu-tree`}>
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold">Menu Tree</h3>
        <p className="gba:text-sm gba:text-muted-foreground">
          Menu structure grouped by Spaces (Hub Types). Drag & drop functionality will be available soon.
        </p>
      </div>
      <div className="gba:space-y-4">
        {renderSpace('USE', 'Use Space', groupedBySpace.USE)}
        {renderSpace('CREATE', 'Create Space', groupedBySpace.CREATE)}
        {renderSpace('MANAGE', 'Manage Space', groupedBySpace.MANAGE)}
        {groupedBySpace.OTHER.length > 0 && renderSpace('OTHER', 'Other', groupedBySpace.OTHER)}
      </div>
    </div>
  )
}
