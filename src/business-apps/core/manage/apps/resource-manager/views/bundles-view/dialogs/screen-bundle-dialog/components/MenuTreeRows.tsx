import React from 'react'
import { Button, Checkbox, Input } from '@newwork/nw-design-system'
import { CaretDown, CaretUp, Folder, FolderOpen, PlusIcon, Target, TrashIcon } from '@phosphor-icons/react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { formatIconForDB, parseIconName } from '../../../../../utils/iconUtils'
import { IconSelect } from '@/components/icon-select/IconSelect'
import { PLACEHOLDER_MENU_ENTRY_NAME } from '../constants'
import type { MenuEntryRow, PendingMenuItem, UrlRow } from '../types'
import {
  getMergedChildRows,
  getItemLabel,
  getUrlEffectiveName,
  getMenuEntryEffectiveName,
  type MergedChildRow
} from '../utils'

export interface MenuTreeRowCallbacks {
  onToggleExpand: (id: string) => void
  onToggleUrlAtParent: (urlRowIndex: number, parentId: string, parentIsHub: boolean) => void
  onAddPendingChild: (parentNodeId: string, parentIsHub: boolean) => void
  onRemovePendingChild: (tempId: string) => void
  onPendingItemNameChange: (tempId: string, name: string) => void
  onMovePending: (tempId: string, direction: 'up' | 'down') => void
  onMenuEntryChange: (
    urlRowIndex: number,
    menuEntryIndex: number,
    field: keyof MenuEntryRow,
    value: string | null | boolean
  ) => void
  onRemoveMenuEntry: (urlRowIndex: number, menuEntryIndex: number) => void
  onMoveEntry: (urlRowIndex: number, menuEntryIndex: number, direction: 'up' | 'down') => void
}

type PathOptionById = Map<string, { path: string; item: MenuItemDTO }>

export interface PendingTreeRowProps {
  pending: PendingMenuItem
  depth: number
  urlRowIndex: number
  row: UrlRow
  rootName: string
  pathOptionById: PathOptionById
  expandedIds: Set<string>
  pendingMenuItems: PendingMenuItem[]
  highlightedNodeIds: Set<string>
  dataTestId: string
  callbacks: MenuTreeRowCallbacks
}

export function PendingTreeRow({
  pending,
  depth,
  urlRowIndex,
  row,
  rootName,
  pathOptionById,
  expandedIds,
  pendingMenuItems,
  highlightedNodeIds,
  dataTestId,
  callbacks
}: PendingTreeRowProps) {
  const merged = getMergedChildRows(pending.tempId, false, [], row.menuEntries, pendingMenuItems)
  const hasChildren = merged.length > 0
  const isExpanded = expandedIds.has(pending.tempId)
  const hasUrlEntryHere = row.menuEntries.some(e => e.parentId === pending.tempId)
  const urlEffectiveName = getUrlEffectiveName(row, rootName)
  const siblings = pendingMenuItems
    .filter(p => p.parentNodeId === pending.parentNodeId && p.parentIsHub === pending.parentIsHub)
    .sort((a, b) => a.rank - b.rank)
  const siblingIndex = siblings.findIndex(p => p.tempId === pending.tempId)
  const canMoveUp = siblingIndex > 0
  const canMoveDown = siblingIndex >= 0 && siblingIndex < siblings.length - 1
  const hasPendingChild = pendingMenuItems.some(p => p.parentNodeId === pending.tempId && !p.parentIsHub)

  const renderChild = (child: MergedChildRow) => {
    if (child.type === 'real') {
      return (
        <MenuTreeRow
          key={child.item.id}
          item={child.item}
          depth={depth + 1}
          urlRowIndex={urlRowIndex}
          row={row}
          rootName={rootName}
          pathOptionById={pathOptionById}
          expandedIds={expandedIds}
          pendingMenuItems={pendingMenuItems}
          highlightedNodeIds={highlightedNodeIds}
          dataTestId={dataTestId}
          callbacks={callbacks}
        />
      )
    }
    if (child.type === 'pending') {
      return (
        <PendingTreeRow
          key={child.pending.tempId}
          pending={child.pending}
          depth={depth + 1}
          urlRowIndex={urlRowIndex}
          row={row}
          rootName={rootName}
          pathOptionById={pathOptionById}
          expandedIds={expandedIds}
          pendingMenuItems={pendingMenuItems}
          highlightedNodeIds={highlightedNodeIds}
          dataTestId={dataTestId}
          callbacks={callbacks}
        />
      )
    }
    return (
      <div
        key={`entry-${child.menuEntryIndex}`}
        className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:min-w-0 gba:rounded-md gba:hover:bg-muted/10 gba:transition-colors"
        style={{ paddingLeft: (depth + 1) * 16 }}
      >
        <span className="gba:w-6 gba:shrink-0 gba:inline-block" aria-hidden />
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:shrink-0">
          <Checkbox
            id={`${dataTestId}-menu-use-custom-name-${urlRowIndex}-${child.menuEntryIndex}`}
            checked={child.entry.useCustomName ?? false}
            onCheckedChange={checked =>
              callbacks.onMenuEntryChange(urlRowIndex, child.menuEntryIndex, 'useCustomName', checked === true)
            }
            data-testid={`${dataTestId}-menu-use-custom-name-${urlRowIndex}-${child.menuEntryIndex}`}
          />
          {child.entry.useCustomName ? (
            <Input
              value={child.entry.name}
              onChange={e => callbacks.onMenuEntryChange(urlRowIndex, child.menuEntryIndex, 'name', e.target.value)}
              placeholder={PLACEHOLDER_MENU_ENTRY_NAME}
              className={`gba:w-28 gba:min-w-0 gba:max-w-[10rem] gba:h-8 ${child.entry.nameError ? 'gba:border-destructive' : ''}`}
              data-testid={`${dataTestId}-menu-name-${urlRowIndex}-${child.menuEntryIndex}`}
            />
          ) : (
            <span
              className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[10rem]"
              title={urlEffectiveName}
            >
              {getMenuEntryEffectiveName(child.entry, urlEffectiveName)}
            </span>
          )}
        </div>
        <div
          className="gba:flex-shrink-0"
          data-testid={`${dataTestId}-menu-icon-${urlRowIndex}-${child.menuEntryIndex}`}
        >
          <IconSelect
            value={parseIconName(child.entry.icon)}
            onValueChange={v =>
              callbacks.onMenuEntryChange(urlRowIndex, child.menuEntryIndex, 'icon', formatIconForDB(v))
            }
            className="gba:h-8 gba:w-8"
          />
        </div>
        <div
          className="gba:flex gba:flex-col gba:h-7 gba:w-6 gba:shrink-0 gba:rounded-md gba:border gba:border-border/60 gba:overflow-hidden gba:[&_button]:min-h-0 gba:[&_button]:flex-1 gba:[&_button]:flex gba:[&_button]:items-center gba:[&_button]:justify-center gba:[&_button]:rounded-none gba:[&_button]:border-0 gba:[&_button]:bg-transparent gba:[&_button]:hover:bg-muted/30"
          role="group"
          aria-label="Reihenfolge"
        >
          <button
            type="button"
            onClick={() => callbacks.onMoveEntry(urlRowIndex, child.menuEntryIndex, 'up')}
            aria-label="Nach oben"
            data-testid={`${dataTestId}-menu-move-up-${urlRowIndex}-${child.menuEntryIndex}`}
          >
            <CaretUp size={10} />
          </button>
          <button
            type="button"
            onClick={() => callbacks.onMoveEntry(urlRowIndex, child.menuEntryIndex, 'down')}
            aria-label="Nach unten"
            data-testid={`${dataTestId}-menu-move-down-${urlRowIndex}-${child.menuEntryIndex}`}
          >
            <CaretDown size={10} />
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:shrink-0 gba:text-muted-foreground gba:hover:text-destructive"
          onClick={() => callbacks.onRemoveMenuEntry(urlRowIndex, child.menuEntryIndex)}
          data-testid={`${dataTestId}-remove-menu-${urlRowIndex}-${child.menuEntryIndex}`}
        >
          <TrashIcon size={14} />
        </Button>
      </div>
    )
  }

  return (
    <>
      <div
        className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:min-w-0 gba:rounded-md gba:hover:bg-muted/10 gba:transition-colors"
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          type="button"
          className="gba:shrink-0 gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded-md gba:hover:bg-muted/30 gba:border-0 gba:bg-transparent gba:cursor-pointer gba:transition-colors"
          onClick={() => hasChildren && callbacks.onToggleExpand(pending.tempId)}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : undefined}
          data-testid={`${dataTestId}-pending-toggle-${pending.tempId}`}
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen size={16} className="gba:text-muted-foreground" />
            ) : (
              <Folder size={16} className="gba:text-muted-foreground" />
            )
          ) : (
            <span className="gba:w-4 gba:inline-block" />
          )}
        </button>
        <Input
          value={pending.name}
          onChange={e => callbacks.onPendingItemNameChange(pending.tempId, e.target.value)}
          placeholder="New menu item name"
          className="gba:w-44 gba:min-w-0 gba:max-w-[12rem] gba:h-8 gba:shrink-0 gba:border-muted-foreground/40"
          data-testid={`${dataTestId}-pending-name-${pending.tempId}`}
        />
        {!hasPendingChild && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="gba:shrink-0 gba:h-7 gba:w-7 gba:rounded-md gba:text-muted-foreground gba:hover:text-foreground"
            onClick={() => callbacks.onAddPendingChild(pending.tempId, false)}
            aria-label="Add new child"
            data-testid={`${dataTestId}-pending-add-child-${pending.tempId}`}
          >
            <PlusIcon size={14} />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`gba:shrink-0 gba:h-7 gba:w-7 gba:rounded-md ${hasUrlEntryHere ? 'gba:text-green-600 gba:bg-green-500/10' : 'gba:text-muted-foreground gba:hover:text-foreground'}`}
          onClick={() => callbacks.onToggleUrlAtParent(urlRowIndex, pending.tempId, false)}
          aria-label={hasUrlEntryHere ? 'Remove URL from here' : 'Place URL here as child'}
          data-testid={`${dataTestId}-pending-place-url-${pending.tempId}`}
        >
          <Target size={14} />
        </Button>
        {(canMoveUp || canMoveDown) && (
          <div
            className="gba:flex gba:flex-col gba:h-7 gba:w-6 gba:shrink-0 gba:rounded-md gba:border gba:border-border/60 gba:overflow-hidden gba:[&_button]:min-h-0 gba:[&_button]:flex-1 gba:[&_button]:flex gba:[&_button]:items-center gba:[&_button]:justify-center gba:[&_button]:rounded-none gba:[&_button]:border-0 gba:[&_button]:bg-transparent gba:[&_button]:hover:bg-muted/30"
            role="group"
            aria-label="Reihenfolge"
          >
            {canMoveUp && (
              <button
                type="button"
                onClick={() => callbacks.onMovePending(pending.tempId, 'up')}
                aria-label="Nach oben"
                data-testid={`${dataTestId}-pending-move-up-${pending.tempId}`}
              >
                <CaretUp size={10} />
              </button>
            )}
            {canMoveDown && (
              <button
                type="button"
                onClick={() => callbacks.onMovePending(pending.tempId, 'down')}
                aria-label="Nach unten"
                data-testid={`${dataTestId}-pending-move-down-${pending.tempId}`}
              >
                <CaretDown size={10} />
              </button>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:shrink-0 gba:text-muted-foreground gba:hover:text-destructive"
          onClick={() => callbacks.onRemovePendingChild(pending.tempId)}
          aria-label="Remove"
          data-testid={`${dataTestId}-remove-pending-${pending.tempId}`}
        >
          <TrashIcon size={14} />
        </Button>
      </div>
      {isExpanded && <>{merged.map(renderChild)}</>}
    </>
  )
}

export interface MenuTreeRowProps {
  item: MenuItemDTO
  depth: number
  urlRowIndex: number
  row: UrlRow
  rootName: string
  pathOptionById: PathOptionById
  expandedIds: Set<string>
  pendingMenuItems: PendingMenuItem[]
  highlightedNodeIds: Set<string>
  dataTestId: string
  callbacks: MenuTreeRowCallbacks
}

export function MenuTreeRow({
  item,
  depth,
  urlRowIndex,
  row,
  rootName,
  pathOptionById,
  expandedIds,
  pendingMenuItems,
  highlightedNodeIds,
  dataTestId,
  callbacks
}: MenuTreeRowProps) {
  const label = getItemLabel(item)
  const parentIsHub = item.level === 0
  const merged = getMergedChildRows(item.id, parentIsHub, item.children ?? [], row.menuEntries, pendingMenuItems)
  const hasChildren = merged.length > 0
  const isExpanded = expandedIds.has(item.id)
  const hasUrlEntryHere = row.menuEntries.some(
    e => (parentIsHub && e.hubId === item.id) || (!parentIsHub && e.parentId === item.id)
  )
  const hasPendingChild = pendingMenuItems.some(p => p.parentNodeId === item.id && p.parentIsHub === parentIsHub)
  const isOnPath = highlightedNodeIds.has(item.id)

  const renderChild = (child: MergedChildRow) => {
    if (child.type === 'real') {
      return (
        <MenuTreeRow
          key={child.item.id}
          item={child.item}
          depth={depth + 1}
          urlRowIndex={urlRowIndex}
          row={row}
          rootName={rootName}
          pathOptionById={pathOptionById}
          expandedIds={expandedIds}
          pendingMenuItems={pendingMenuItems}
          highlightedNodeIds={highlightedNodeIds}
          dataTestId={dataTestId}
          callbacks={callbacks}
        />
      )
    }
    if (child.type === 'pending') {
      return (
        <PendingTreeRow
          key={child.pending.tempId}
          pending={child.pending}
          depth={depth + 1}
          urlRowIndex={urlRowIndex}
          row={row}
          rootName={rootName}
          pathOptionById={pathOptionById}
          expandedIds={expandedIds}
          pendingMenuItems={pendingMenuItems}
          highlightedNodeIds={highlightedNodeIds}
          dataTestId={dataTestId}
          callbacks={callbacks}
        />
      )
    }
    return (
      <div
        key={`entry-${child.menuEntryIndex}`}
        className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:min-w-0 gba:rounded-md gba:hover:bg-muted/10 gba:transition-colors"
        style={{ paddingLeft: (depth + 1) * 16 }}
      >
        <span className="gba:w-6 gba:shrink-0 gba:inline-block" aria-hidden />
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:shrink-0">
          <Checkbox
            id={`${dataTestId}-menu-use-custom-name-${urlRowIndex}-${child.menuEntryIndex}`}
            checked={child.entry.useCustomName ?? false}
            onCheckedChange={checked =>
              callbacks.onMenuEntryChange(urlRowIndex, child.menuEntryIndex, 'useCustomName', checked === true)
            }
            data-testid={`${dataTestId}-menu-use-custom-name-${urlRowIndex}-${child.menuEntryIndex}`}
          />
          {child.entry.useCustomName ? (
            <Input
              value={child.entry.name}
              onChange={e => callbacks.onMenuEntryChange(urlRowIndex, child.menuEntryIndex, 'name', e.target.value)}
              placeholder={PLACEHOLDER_MENU_ENTRY_NAME}
              className={`gba:w-28 gba:min-w-0 gba:max-w-[10rem] gba:h-8 ${child.entry.nameError ? 'gba:border-destructive' : ''}`}
              data-testid={`${dataTestId}-menu-name-${urlRowIndex}-${child.menuEntryIndex}`}
            />
          ) : (
            <span
              className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-[10rem]"
              title={getUrlEffectiveName(row, rootName)}
            >
              {getMenuEntryEffectiveName(child.entry, getUrlEffectiveName(row, rootName))}
            </span>
          )}
        </div>
        <div
          className="gba:flex-shrink-0"
          data-testid={`${dataTestId}-menu-icon-${urlRowIndex}-${child.menuEntryIndex}`}
        >
          <IconSelect
            value={parseIconName(child.entry.icon)}
            onValueChange={v =>
              callbacks.onMenuEntryChange(urlRowIndex, child.menuEntryIndex, 'icon', formatIconForDB(v))
            }
            className="gba:h-8 gba:w-8"
          />
        </div>
        <div
          className="gba:flex gba:flex-col gba:h-7 gba:w-6 gba:shrink-0 gba:rounded-md gba:border gba:border-border/60 gba:overflow-hidden gba:[&_button]:min-h-0 gba:[&_button]:flex-1 gba:[&_button]:flex gba:[&_button]:items-center gba:[&_button]:justify-center gba:[&_button]:rounded-none gba:[&_button]:border-0 gba:[&_button]:bg-transparent gba:[&_button]:hover:bg-muted/30"
          role="group"
          aria-label="Reihenfolge"
        >
          <button
            type="button"
            onClick={() => callbacks.onMoveEntry(urlRowIndex, child.menuEntryIndex, 'up')}
            aria-label="Nach oben"
            data-testid={`${dataTestId}-menu-move-up-${urlRowIndex}-${child.menuEntryIndex}`}
          >
            <CaretUp size={10} />
          </button>
          <button
            type="button"
            onClick={() => callbacks.onMoveEntry(urlRowIndex, child.menuEntryIndex, 'down')}
            aria-label="Nach unten"
            data-testid={`${dataTestId}-menu-move-down-${urlRowIndex}-${child.menuEntryIndex}`}
          >
            <CaretDown size={10} />
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:shrink-0 gba:text-muted-foreground gba:hover:text-destructive"
          onClick={() => callbacks.onRemoveMenuEntry(urlRowIndex, child.menuEntryIndex)}
          data-testid={`${dataTestId}-remove-menu-${urlRowIndex}-${child.menuEntryIndex}`}
        >
          <TrashIcon size={14} />
        </Button>
      </div>
    )
  }

  return (
    <>
      <div
        className={`gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:min-w-0 gba:rounded-md gba:transition-colors ${isOnPath ? 'gba:bg-amber-500/15 gba:ring-1 gba:ring-amber-500/30' : 'gba:hover:bg-muted/10'}`}
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          type="button"
          className="gba:shrink-0 gba:w-6 gba:h-6 gba:flex gba:items-center gba:justify-center gba:rounded-md gba:hover:bg-muted/30 gba:border-0 gba:bg-transparent gba:cursor-pointer gba:transition-colors"
          onClick={() => hasChildren && callbacks.onToggleExpand(item.id)}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : undefined}
          data-testid={`${dataTestId}-menu-tree-toggle-${item.id}`}
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen size={16} className="gba:text-muted-foreground" />
            ) : (
              <Folder size={16} className="gba:text-muted-foreground" />
            )
          ) : (
            <span className="gba:w-4 gba:inline-block" />
          )}
        </button>
        <span className="gba:text-sm gba:truncate gba:min-w-0 gba:font-medium gba:text-foreground/90">{label}</span>
        {!hasPendingChild && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="gba:shrink-0 gba:h-7 gba:w-7 gba:rounded-md gba:text-muted-foreground gba:hover:text-foreground"
            onClick={() => callbacks.onAddPendingChild(item.id, parentIsHub)}
            aria-label="Add new child"
            data-testid={`${dataTestId}-menu-tree-add-child-${urlRowIndex}-${item.id}`}
          >
            <PlusIcon size={14} />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`gba:shrink-0 gba:h-7 gba:w-7 gba:rounded-md ${hasUrlEntryHere ? 'gba:text-green-600 gba:bg-green-500/10' : 'gba:text-muted-foreground gba:hover:text-foreground'}`}
          onClick={() => callbacks.onToggleUrlAtParent(urlRowIndex, item.id, parentIsHub)}
          aria-label={hasUrlEntryHere ? 'Remove URL from here' : 'Place URL here as child'}
          data-testid={`${dataTestId}-menu-tree-place-url-${urlRowIndex}-${item.id}`}
        >
          <Target size={14} />
        </Button>
      </div>
      {isExpanded && <>{merged.map(renderChild)}</>}
    </>
  )
}
