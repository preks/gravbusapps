import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { DragOverlay } from '@dnd-kit/core'
import { Button, Badge } from '@newwork/nw-design-system'
import { CaretDown, CaretRight, Plus } from '@phosphor-icons/react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { parseIconName, EMPTY_ICON_VALUE } from '../../../../../utils/iconUtils'
import { useEditableState } from '../../../../../hooks/useEditableState'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getEntityType } from './utils/menuItemUtils'
import { SortableTreeItem } from './components/tree/SortableTreeItem'
import { TreeItem } from './components/tree/TreeItem'
import { MenuItemRow } from './components/tree/MenuItem'
import { DndTreeContext } from './components/dnd/DndTreeContext'
import { useMenuTreeState } from './hooks/useMenuTreeState'
import { useMenuTreeDnd } from './hooks/useMenuTreeDnd'
import { useMenuTreeActions } from './hooks/useMenuTreeActions'
import { useResourceUrlOptions } from './hooks/useResourceUrlOptions'
import { useUpdateMenuItem } from '@/common/data/resources/hooks/useUpdateMenuItem'
import type { SpaceType } from './types/menuTree.types'

interface MenuTableProps extends BusinessAppContextProps {
  menuItems: MenuItemDTO[]
  isLoading: boolean
  dataTestId: string
  onCountChange?: (count: number) => void
  currentView: string
  refetchMenuItems: () => Promise<void>
}

export const MenuTable: React.FC<MenuTableProps> = ({
  menuItems: menuItemsProp,
  isLoading,
  dataTestId,
  onCountChange,
  currentView,
  refetchMenuItems,
  ...context
}) => {
  // Local state
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemDTO[]>(menuItemsProp)
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItemDTO[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Sync local state with prop changes
  useEffect(() => {
    setLocalMenuItems(menuItemsProp)
  }, [menuItemsProp])

  // Tree state hook
  const treeState = useMenuTreeState({
    menuItemsProp: localMenuItems,
    draftMenuItems,
    isDragging,
    currentView,
    onCountChange
  })

  // DND hook
  const { updateMenuItem } = useUpdateMenuItem(context)
  const dnd = useMenuTreeDnd({
    targetTree: treeState.targetTree,
    sourceTree: treeState.sourceTree,
    expandedItems: treeState.expandedItems,
    indentationWidth: 20,
    setSourceTree: treeState.setSourceTree,
    setTargetTree: treeState.setTargetTree,
    setExpandedItems: treeState.setExpandedItems,
    setIsDragging,
    updateMenuItem,
    refetchMenuItems
  })

  // Prepare menu entries for editable state
  const menuEntries = useMemo(
    () =>
      dnd.flattenedItems.map(item => ({
        id: item.id || '',
        name: item.name,
        nameTranslated: item.nameTranslated || {},
        description: item.description || '',
        descriptionTranslated: item.descriptionTranslated || {},
        icon: item.icon || '',
        rank: item.rank ?? 0,
        resourceUrlId: item.resourceUrlId || item.resourceUrl?.id || '',
        code: item.code || '',
        level: item.level ?? 0,
        parentId: item.parentId || undefined,
        hubId: item.hubId || undefined,
        type: item.type
      })),
    [dnd.flattenedItems]
  )

  const editableState = useEditableState<(typeof menuEntries)[number]>(menuEntries)

  // Resource URL options hook
  const { resourceUrlOptions, navigationsLoading, handleNavigationSearch } = useResourceUrlOptions(context)

  // Actions hook
  const actions = useMenuTreeActions({
    context,
    allMenuItemsFlat: dnd.flattenedItems,
    editableState,
    setDraftMenuItems,
    refetchMenuItems,
    setExpandedItems: treeState.setExpandedItems
  })

  // Menu item renderer (flat, no recursion)
  const renderMenuItem = useCallback(
    (item: MenuItemDTO) => {
      const itemId = item.id

      // Find depth from flattenedItems
      const flattenedItem = dnd.flattenedItems.find(fi => fi.id === itemId)
      const depth = flattenedItem?.depth ?? 0

      // Use projected depth if this is the active item being dragged
      const displayDepth = itemId === dnd.activeId && dnd.projected ? dnd.projected.depth : depth

      const isExpanded = treeState.expandedItems.has(itemId)
      const hasChildren = !!(item.children && item.children.length > 0)
      const isHub = item.level === 0
      const entityType = getEntityType(item)
      const hasEdits = editableState.hasEdits(itemId)
      const isSaving = editableState.state.savingEntryId === itemId && editableState.state.isSaving
      const isDraft = itemId.startsWith('draft:')

      const edits = editableState.state.editedEntries.get(itemId)
      const displayName = (edits?.name as string | undefined) ?? item.name
      const displayIconDB = (edits?.icon as string | undefined) ?? item.icon ?? EMPTY_ICON_VALUE
      const displayDescription = (edits?.description as string | undefined) ?? item.description ?? ''
      const displayCode = (edits?.code as string | undefined) ?? item.code ?? ''
      const nameTranslated = (edits?.nameTranslated as Record<string, string> | undefined) ?? item.nameTranslated ?? {}
      const descriptionTranslated =
        (edits?.descriptionTranslated as Record<string, string> | undefined) ?? item.descriptionTranslated ?? {}
      const displayIconName = parseIconName(displayIconDB)

      return (
        <div key={itemId} className="gba:border-l gba:border-border" data-testid={`${dataTestId}-menu-item-${itemId}`}>
          <MenuItemRow
            item={item}
            depth={displayDepth}
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            isHub={isHub}
            entityType={entityType}
            hasEdits={hasEdits}
            isSaving={isSaving}
            isDraft={isDraft}
            displayName={displayName}
            displayIconDB={displayIconDB}
            displayDescription={displayDescription}
            displayCode={displayCode}
            nameTranslated={nameTranslated}
            descriptionTranslated={descriptionTranslated}
            displayIconName={displayIconName}
            dataTestId={dataTestId}
            toggleExpansion={treeState.toggleExpansion}
            handleQuickAdd={actions.handleQuickAdd}
            handleSaveEntry={actions.handleSaveEntry}
            handleDiscardEntry={actions.handleDiscardEntry}
            handleDelete={actions.handleDelete}
            editableState={editableState}
            resourceUrlOptions={resourceUrlOptions}
            onResourceUrlSearch={handleNavigationSearch}
            navigationsLoading={navigationsLoading}
          />
        </div>
      )
    },
    [
      treeState.expandedItems,
      dnd.flattenedItems,
      dnd.activeId,
      dnd.projected,
      treeState.toggleExpansion,
      editableState,
      dataTestId,
      actions,
      resourceUrlOptions,
      handleNavigationSearch,
      navigationsLoading
    ]
  )

  // Space renderer (flat iteration)
  const renderSpace = useCallback(
    (spaceType: SpaceType, spaceLabel: string, items: MenuItemDTO[]) => {
      const isExpanded = treeState.expandedSpaces.has(spaceType)

      // Check if a hub is being dragged over this space
      const activeIsHub = dnd.activeId && dnd.flattenedItems.find(item => item.id === dnd.activeId)?.level === 0
      const isDraggingHubOverSpace = activeIsHub && dnd.overId && items.some(item => item.id === dnd.overId)

      // Filter flattenedItems for this space - collect all hubs and their descendants
      const itemsToRender: EnrichedMenuItem[] = []

      if (isExpanded || isDraggingHubOverSpace) {
        // Get all hubs of this type from flattenedItems
        const hubsInSpace = dnd.flattenedItems.filter(item => item.level === 0 && item.type === spaceType)

        hubsInSpace.forEach(hub => {
          const hubIndex = dnd.flattenedItems.indexOf(hub)
          itemsToRender.push(hub)

          // Get all descendants (items after this hub until next hub or end)
          for (let i = hubIndex + 1; i < dnd.flattenedItems.length; i++) {
            const item = dnd.flattenedItems[i]

            // Stop at next hub (level 0)
            if (item.level === 0) break

            // Check if item belongs to this hub (by hubId or parent chain)
            if (item.hubId === hub.id) {
              itemsToRender.push(item)
            } else {
              // Check if any ancestor is in our itemsToRender (parent chain check)
              const hasAncestorInHub = itemsToRender.some(ancestor => ancestor.id === item.parentId)
              if (hasAncestorInHub) {
                itemsToRender.push(item)
              }
            }
          }
        })
      }

      return (
        <div key={spaceType} className="gba:mb-4" data-testid={`${dataTestId}-space-${spaceType}`}>
          <div
            className="gba:flex gba:items-center gba:gap-2 gba:py-3 gba:px-4 gba:bg-muted gba:rounded-t-md gba:border-b gba:border-border gba:cursor-pointer gba:hover:bg-muted/80 gba:transition-colors"
            onClick={() => treeState.toggleSpaceExpansion(spaceType)}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={e => {
                e.stopPropagation()
                treeState.toggleSpaceExpansion(spaceType)
              }}
              className="gba:h-6 gba:w-6"
            >
              {isExpanded ? <CaretDown className="gba:h-4 gba:w-4" /> : <CaretRight className="gba:h-4 gba:w-4" />}
            </Button>
            <Badge variant="outline" className="gba:text-xs">
              S
            </Badge>
            <span className="gba:text-lg gba:font-bold">{spaceLabel}</span>
            <span className="gba:text-sm gba:text-muted-foreground">
              ({items.length} hub{items.length !== 1 ? 's' : ''})
            </span>
            <div className="gba:flex-1" />
            {(spaceType === 'USE' || spaceType === 'CREATE' || spaceType === 'MANAGE') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation()
                  actions.handleQuickAdd({ type: spaceType })
                }}
                className="gba:h-6 gba:w-6"
                title="Add hub to this space"
              >
                <Plus className="gba:h-4 gba:w-4" />
              </Button>
            )}
          </div>
          {(isExpanded || isDraggingHubOverSpace) && (
            <div className="gba:border gba:border-t-0 gba:rounded-b-md gba:bg-background">
              {itemsToRender.length === 0 && !isDraggingHubOverSpace ? (
                <div className="gba:p-4 gba:text-center gba:text-muted-foreground gba:text-sm">
                  No hubs in this space
                </div>
              ) : (
                <>
                  {itemsToRender.map(item => {
                    const flatItem = dnd.flattenedItems.find(f => f.id === item.id)
                    const depth = flatItem?.depth ?? 0
                    // Use projected depth if this is the active item
                    const finalDepth = item.id === dnd.activeId && dnd.projected ? dnd.projected.depth : depth

                    // #region agent log
                    if (typeof fetch !== 'undefined' && item.id === dnd.activeId) {
                      fetch('http://127.0.0.1:7244/ingest/00afbd5c-2483-4caa-966f-80d58bf9e341', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          location: 'MenuTable.tsx:295',
                          message: 'Render active item with depth',
                          data: {
                            itemId: item.id,
                            depth,
                            projectedDepth: dnd.projected?.depth,
                            finalDepth,
                            indentationWidth: finalDepth * 20
                          },
                          timestamp: Date.now(),
                          sessionId: 'debug-session',
                          runId: 'run1',
                          hypothesisId: 'H3.1,H3.2'
                        })
                      }).catch(() => {})
                    }
                    // #endregion

                    return (
                      <SortableTreeItem
                        key={item.id}
                        id={item.id}
                        isDraft={item.id.startsWith('draft:')}
                        indicator={true}
                        indentationWidth={finalDepth * 20}
                      >
                        {renderMenuItem(item)}
                      </SortableTreeItem>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )
    },
    [
      treeState.expandedSpaces,
      dnd.flattenedItems,
      treeState.toggleSpaceExpansion,
      renderMenuItem,
      actions,
      dataTestId,
      dnd.activeId,
      dnd.overId
    ]
  )

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center">
        <p className="gba:text-muted-foreground">Loading menu tree...</p>
      </div>
    )
  }

  return (
    <DndTreeContext
      sensors={dnd.sensors}
      allSortableIds={treeState.allSortableIds}
      activeItem={dnd.activeItem}
      onDragStart={dnd.handleDragStart}
      onDragMove={dnd.handleDragMove}
      onDragOver={dnd.handleDragOver}
      onDragEnd={dnd.handleDragEnd}
    >
      <div className="gba:p-4" data-testid={`${dataTestId}-menu-tree`}>
        <div className="gba:space-y-4">
          {renderSpace('USE', 'Use Space', treeState.groupedBySpace.USE)}
          {renderSpace('CREATE', 'Create Space', treeState.groupedBySpace.CREATE)}
          {renderSpace('MANAGE', 'Manage Space', treeState.groupedBySpace.MANAGE)}
          {treeState.groupedBySpace.OTHER.length > 0 && renderSpace('OTHER', 'Other', treeState.groupedBySpace.OTHER)}
        </div>
      </div>

      {/* DragOverlay for the dragged item */}
      {createPortal(
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {dnd.activeItem && (
            <TreeItem
              id={dnd.activeItem.id}
              isDraft={dnd.activeItem.id.startsWith('draft:')}
              clone={true}
              indentationWidth={0}
            >
              {renderMenuItem(dnd.activeItem)}
            </TreeItem>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndTreeContext>
  )
}
