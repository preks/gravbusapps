import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { DragOverlay } from '@dnd-kit/core'
import { Button, Skeleton } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react'
import { createTreeModifier } from './utils/dndModifiers'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { parseIconName, EMPTY_ICON_VALUE } from '../../../../../utils/iconUtils'
import { useEditableState } from '../../../../../hooks/useEditableState'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SortableTreeItem } from './components/tree/SortableTreeItem'
import { TreeItem } from './components/tree/TreeItem'
import { MenuItemRow } from './components/tree/MenuItem'
import { DndTreeContext } from './components/dnd/DndTreeContext'
import { useMenuTreeState } from './hooks/useMenuTreeState'
import { useMenuTreeDnd } from './hooks/useMenuTreeDnd'
import { useMenuTreeActions } from './hooks/useMenuTreeActions'
import { useResourceUrlOptions } from './hooks/useResourceUrlOptions'
import { useUpdateMenuItem } from '@/common/data/resources/hooks/useUpdateMenuItem'
import { useMenuTableSaveAll } from './hooks/useMenuTableSaveAll'
import type { SpaceType } from './types/menuTree.types'

interface MenuTableProps extends BusinessAppContextProps {
  menuItems: MenuItemDTO[]
  isLoading: boolean
  dataTestId: string
  searchValue?: string
  onCountChange?: (count: number) => void
  currentView: string
  refetchMenuItems: () => Promise<void>
  onSaveAllChange?: (saveAll: () => Promise<void>) => void
  onDiscardAllChange?: (discardAll: () => void) => void
  onHasChangesChange?: (hasChanges: boolean) => void
  onIsSavingChange?: (isSaving: boolean) => void
}

export const MenuTable: React.FC<MenuTableProps> = ({
  menuItems: menuItemsProp,
  isLoading,
  dataTestId,
  searchValue: externalSearchValue,
  onCountChange,
  currentView,
  refetchMenuItems,
  onSaveAllChange,
  onDiscardAllChange,
  onHasChangesChange,
  onIsSavingChange,
  ...context
}) => {
  // Local state
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemDTO[]>(menuItemsProp)
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItemDTO[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())
  const searchValue = externalSearchValue ?? ''

  // Filter menu items based on search
  const filteredMenuItems = useMemo(() => {
    if (!searchValue.trim()) return menuItemsProp

    const searchLower = searchValue.toLowerCase().trim()
    const filterItem = (item: MenuItemDTO): boolean => {
      const matchesSearch =
        item.name?.toLowerCase().includes(searchLower) ||
        item.code?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        Object.values(item.nameTranslated || {}).some(v => v.toLowerCase().includes(searchLower))

      const childrenMatch = item.children?.some(child => filterItem(child)) || false

      return matchesSearch || childrenMatch
    }

    const filterTree = (items: MenuItemDTO[]): MenuItemDTO[] => {
      return items
        .map(item => {
          const matches = filterItem(item)
          if (!matches) return null

          const filteredChildren = item.children ? filterTree(item.children) : undefined
          return {
            ...item,
            children: filteredChildren
          }
        })
        .filter((item): item is MenuItemDTO => item !== null)
    }

    return filterTree(menuItemsProp)
  }, [menuItemsProp, searchValue])

  // Sync local state with filtered menu items
  useEffect(() => {
    setLocalMenuItems(filteredMenuItems)
  }, [filteredMenuItems])

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
    setMovedItemIds: treeState.setMovedItemIds,
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
    draftMenuItems,
    setDraftMenuItems,
    refetchMenuItems,
    setExpandedItems: treeState.setExpandedItems,
    setPendingDeletes
  })

  // Save All hook
  const saveAll = useMenuTableSaveAll({
    context,
    sourceTree: treeState.sourceTree,
    targetTree: treeState.targetTree,
    editableState,
    pendingDeletes,
    movedItemIds: treeState.movedItemIds,
    setSourceTree: treeState.setSourceTree,
    setTargetTree: treeState.setTargetTree,
    setDraftMenuItems,
    setPendingDeletes,
    setMovedItemIds: treeState.setMovedItemIds,
    refetchMenuItems
  })

  // Expose Save All / Discard All functions to parent
  useEffect(() => {
    if (onSaveAllChange) {
      onSaveAllChange(saveAll.handleSaveAll)
    }
  }, [onSaveAllChange, saveAll.handleSaveAll])

  useEffect(() => {
    if (onDiscardAllChange) {
      onDiscardAllChange(saveAll.handleDiscardAll)
    }
  }, [onDiscardAllChange, saveAll.handleDiscardAll])

  useEffect(() => {
    if (onHasChangesChange) {
      onHasChangesChange(saveAll.hasChanges)
    }
  }, [onHasChangesChange, saveAll.hasChanges])

  useEffect(() => {
    if (onIsSavingChange) {
      onIsSavingChange(saveAll.isSaving)
    }
  }, [onIsSavingChange, saveAll.isSaving])

  // Menu item renderer (flat, no recursion)
  const handleDiscardRow = useCallback(
    (itemId: string) => {
      if (pendingDeletes.has(itemId)) {
        setPendingDeletes(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      } else {
        actions.handleDiscardEntry(itemId)
      }
    },
    [pendingDeletes, setPendingDeletes, actions]
  )

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
      const hasEdits = editableState.hasEdits(itemId)
      const isSaving = editableState.state.savingEntryId === itemId && editableState.state.isSaving
      const isDraft = itemId.startsWith('draft:')
      const isPendingDelete = pendingDeletes.has(itemId)

      // Drop target feedback: Only show blue when this item would become the parent
      const wouldBecomeParent = dnd.projected?.visualParentId === itemId
      const isDropTarget = wouldBecomeParent && dnd.activeId && dnd.activeId !== itemId
      const canReceiveDrop = !isHub && dnd.activeId && dnd.flattenedItems.find(i => i.id === dnd.activeId)?.level !== 0

      const edits = editableState.state.editedEntries.get(itemId)
      const displayName = edits?.name ?? item.name
      const displayIconDB = edits?.icon ?? item.icon ?? EMPTY_ICON_VALUE
      const displayDescription = edits?.description ?? item.description ?? ''
      const nameTranslated = edits?.nameTranslated ?? item.nameTranslated ?? {}
      const descriptionTranslated = edits?.descriptionTranslated ?? item.descriptionTranslated ?? {}
      const displayIconName = parseIconName(displayIconDB)
      const comboboxResourceUrlId =
        (edits?.resourceUrlId as string) ??
        item.resourceUrlId ??
        (item as { resourceUrl?: { id: string } }).resourceUrl?.id ??
        ''

      return (
        <div key={itemId} className="gba:border-l gba:border-border" data-testid={`${dataTestId}-menu-item-${itemId}`}>
          <MenuItemRow
            item={item}
            depth={displayDepth}
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            isHub={isHub}
            hasEdits={hasEdits}
            isSaving={isSaving}
            isDraft={isDraft}
            isPendingDelete={isPendingDelete}
            isDropTarget={isDropTarget && canReceiveDrop}
            displayName={displayName}
            displayIconDB={displayIconDB}
            displayDescription={displayDescription}
            nameTranslated={nameTranslated}
            descriptionTranslated={descriptionTranslated}
            displayIconName={displayIconName}
            dataTestId={dataTestId}
            toggleExpansion={treeState.toggleExpansion}
            handleQuickAdd={actions.handleQuickAdd}
            handleSaveEntry={actions.handleSaveEntry}
            handleDiscardEntry={actions.handleDiscardEntry}
            handleDelete={actions.handleDelete}
            handleDiscard={handleDiscardRow}
            onFieldEdit={editableState.onFieldEdit}
            comboboxResourceUrlId={comboboxResourceUrlId}
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
      dnd.overId,
      dnd.projected,
      treeState.toggleExpansion,
      editableState,
      dataTestId,
      actions,
      handleDiscardRow,
      resourceUrlOptions,
      handleNavigationSearch,
      navigationsLoading,
      pendingDeletes
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
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:py-3 gba:px-4 gba:bg-muted gba:rounded-t-md gba:border-b gba:border-border gba:cursor-pointer gba:hover:bg-muted/80 gba:transition-colors"
            onClick={() => treeState.toggleSpaceExpansion(spaceType)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                treeState.toggleSpaceExpansion(spaceType)
              }
            }}
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
              {isExpanded ? (
                <CaretDownIcon className="gba:h-4 gba:w-4" />
              ) : (
                <CaretRightIcon className="gba:h-4 gba:w-4" />
              )}
            </Button>
            <span className="gba:text-lg gba:font-bold">{spaceLabel}</span>
            <span className="gba:text-sm gba:text-muted-foreground">
              ({items.length} hub{items.length === 1 ? '' : 's'})
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
                <PlusIcon className="gba:h-4 gba:w-4" />
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
      <div className="gba:p-4 gba:space-y-4" data-testid={`${dataTestId}-menu-skeleton`}>
        {[1, 2, 3].map(space => (
          <div key={space} className="gba:space-y-2">
            <Skeleton className="gba:h-4 gba:w-24" />
            <div className="gba:pl-4 gba:space-y-1">
              {[1, 2, 3, 4].map(row => (
                <Skeleton key={row} className="gba:h-8 gba:w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndTreeContext
      sensors={dnd.sensors}
      allSortableIds={treeState.allSortableIds}
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
        <DragOverlay
          dropAnimation={null}
          modifiers={[createTreeModifier(dnd.projected, dnd.activeItem?.level === 0, dnd.activeItem?.depth ?? 0, 24)]}
        >
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
