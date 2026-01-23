import React, { useState } from 'react'
import { Button, Input, Badge, Combobox } from '@newwork/nw-design-system'
import { CaretDown, CaretRight, Plus, DotsSixVertical } from '@phosphor-icons/react'
import { Trash } from 'lucide-react'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { TranslatableField } from '@/components/translatable-field/TranslatableField'
import { IconSelect } from '@/components/icon-select/IconSelect'
import { formatIconForDB, getIconDBTitle } from '../../../../../../../utils/iconUtils'
import { getTypeBadgeColor } from '../../utils/menuItemUtils'
import { DragHandleContext } from './TreeItem'
import { MenuItemDescriptionDialog } from '../dialogs/MenuItemDescriptionDialog'

export interface MenuItemRowProps {
  item: MenuItemDTO
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isHub: boolean
  entityType: 'SPACE' | 'HUB' | 'MENUITEM'
  hasEdits: boolean
  isSaving: boolean
  isDraft: boolean
  isPendingDelete: boolean
  isDropTarget?: boolean
  displayName: string
  displayIconDB: string
  displayDescription: string
  displayCode: string
  nameTranslated: Record<string, string>
  descriptionTranslated: Record<string, string>
  displayIconName: string
  dataTestId: string
  toggleExpansion: (id: string) => void
  handleQuickAdd: (item: Partial<MenuItemDTO>) => void
  handleSaveEntry: (id: string) => void
  handleDiscardEntry: (id: string) => void
  handleDelete: (id: string) => void
  editableState: any
  resourceUrlOptions: Array<{ value: string; label: string }>
  onResourceUrlSearch: (search: string) => void
  navigationsLoading: boolean
}

export const MenuItemRow: React.FC<MenuItemRowProps> = ({
  item,
  depth,
  isExpanded,
  hasChildren,
  isHub,
  entityType,
  hasEdits,
  isDraft,
  isPendingDelete,
  isDropTarget = false,
  displayName,
  displayIconDB,
  displayDescription,
  displayCode,
  nameTranslated,
  descriptionTranslated,
  displayIconName,
  dataTestId,
  toggleExpansion,
  handleQuickAdd,
  handleDelete,
  editableState,
  resourceUrlOptions,
  onResourceUrlSearch,
  navigationsLoading
}) => {
  const dragListeners = React.useContext(DragHandleContext)
  const itemId = item.id
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false)

  const edits = editableState.state.editedEntries.get(itemId)
  const displayResourceUrlId =
    (edits?.resourceUrlId as string) ?? item.resourceUrlId ?? (item as any).resourceUrl?.id ?? ''

  const currentResourceUrl = (item as any).resourceUrl
  const currentResourceUrlOption = currentResourceUrl
    ? { value: currentResourceUrl.id, label: `${currentResourceUrl.name} (${currentResourceUrl.url})` }
    : null

  const mergedResourceUrlOptions = React.useMemo(() => {
    if (!currentResourceUrlOption || !displayResourceUrlId) return resourceUrlOptions

    const existsInOptions = resourceUrlOptions.some(opt => opt.value === displayResourceUrlId)
    if (existsInOptions) return resourceUrlOptions

    return [currentResourceUrlOption, ...resourceUrlOptions]
  }, [currentResourceUrlOption, displayResourceUrlId, resourceUrlOptions])

  const handleDescriptionSave = (description: string, translations: Record<string, string>) => {
    editableState.onFieldEdit(itemId, 'description', description)
    editableState.onFieldEdit(itemId, 'descriptionTranslated', translations)
  }

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2 gba:py-2 gba:px-3 gba:hover:bg-muted/50 gba:transition-colors ${
        isHub ? 'gba:bg-muted/30' : ''
      } ${isPendingDelete ? 'gba:opacity-50 gba:line-through gba:bg-destructive/10' : ''} ${
        hasEdits && !isPendingDelete ? 'gba:border-l-4 gba:border-l-blue-500' : ''
      } ${isDropTarget ? 'gba:bg-blue-100 gba:border-2 gba:border-blue-500 gba:border-dashed' : ''}`}
      style={{ paddingLeft: `${depth * 24 + 12}px` }}
    >
      {dragListeners ? (
        <button
          {...dragListeners}
          className="gba:cursor-grab active:gba:cursor-grabbing gba:flex-shrink-0 gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors"
          title="Drag to reorder"
        >
          <DotsSixVertical className="gba:h-5 gba:w-5" />
        </button>
      ) : (
        <div className="gba:w-5 gba:flex-shrink-0" />
      )}

      {hasChildren ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={e => {
            e.stopPropagation()
            toggleExpansion(itemId)
          }}
          className="gba:h-6 gba:w-6 gba:flex-shrink-0"
        >
          {isExpanded ? <CaretDown className="gba:h-4 gba:w-4" /> : <CaretRight className="gba:h-4 gba:w-4" />}
        </Button>
      ) : (
        <div className="gba:w-6 gba:flex-shrink-0" />
      )}

      <Badge variant={getTypeBadgeColor(entityType)} className="gba:text-xs gba:flex-shrink-0">
        {entityType === 'SPACE' ? 'S' : entityType === 'HUB' ? 'H' : 'M'}
      </Badge>

      <div className="gba:flex-shrink-0" title={getIconDBTitle(displayIconDB)}>
        <IconSelect
          value={displayIconName}
          onValueChange={value => {
            const dbValue = formatIconForDB(value)
            editableState.onFieldEdit(itemId, 'icon', dbValue)
          }}
          className="gba:h-8 gba:w-8"
        />
      </div>

      <Input
        value={displayCode}
        onChange={e => editableState.onFieldEdit(itemId, 'code', e.target.value)}
        placeholder="code"
        className="gba:w-32 gba:h-8"
        disabled={isPendingDelete}
      />

      <div className="gba:flex-[0.6] gba:min-w-[150px]">
        <TranslatableField
          label=""
          value={displayName}
          translations={nameTranslated}
          onChange={value => editableState.onFieldEdit(itemId, 'name', value)}
          onTranslationsChange={translations => editableState.onFieldEdit(itemId, 'nameTranslated', translations)}
          placeholder="Menu item name"
          className="gba:h-8"
          disabled={isPendingDelete}
        />
      </div>

      <div className="gba:flex-[1.4] gba:min-w-[250px]">
        <Combobox
          value={displayResourceUrlId || undefined}
          onValueChange={value => editableState.onFieldEdit(itemId, 'resourceUrlId', value || '')}
          options={mergedResourceUrlOptions}
          onSearch={onResourceUrlSearch}
          loading={navigationsLoading}
          placeholder="Select navigation..."
          searchPlaceholder="Search navigations..."
          emptyText="No navigations found"
          className="gba:h-8 gba:w-full gba:truncate"
          disabled={isPendingDelete}
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDescriptionDialogOpen(true)}
        className="gba:h-8 gba:flex-shrink-0"
        disabled={isPendingDelete}
      >
        Description
      </Button>

      <MenuItemDescriptionDialog
        open={descriptionDialogOpen}
        onOpenChange={setDescriptionDialogOpen}
        description={displayDescription}
        descriptionTranslation={descriptionTranslated}
        onSave={handleDescriptionSave}
        dataTestId={`${dataTestId}-description-dialog`}
      />

      {!isDraft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={e => {
            e.stopPropagation()
            handleQuickAdd(item)
          }}
          className="gba:h-6 gba:w-6 gba:flex-shrink-0"
          title="Add child item"
          disabled={isPendingDelete}
        >
          <Plus className="gba:h-4 gba:w-4" />
        </Button>
      )}

      <Button
        size="iconSm"
        variant="destructive"
        className="gba:h-6 gba:flex-shrink-0"
        onClick={e => {
          e.stopPropagation()
          handleDelete(itemId)
        }}
        title={isPendingDelete ? 'Marked for deletion' : 'Delete item'}
        disabled={isPendingDelete}
      >
        <Trash className="gba:h-4 gba:w-4" />
      </Button>
    </div>
  )
}
