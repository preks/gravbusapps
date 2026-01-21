import React from 'react'
import { DragOverlay } from '@dnd-kit/core'
import type { EnrichedMenuItem } from '../../types/menuTree.types'
import { MenuItemRow } from '../tree/MenuItem'
import { parseIconName, EMPTY_ICON_VALUE } from '../../../../../../../utils/iconUtils'
import { getEntityType } from '../../utils/menuItemUtils'

interface DragPreviewProps {
  item: EnrichedMenuItem | null
}

/**
 * Drag overlay preview component
 */
export const DragPreview: React.FC<DragPreviewProps> = ({ item }) => {
  if (!item) return null

  // Mock editableState for drag preview
  const mockEditableState = {
    state: {
      editedEntries: new Map(),
      savingEntryId: null,
      isSaving: false,
      draftEntryIds: new Set()
    },
    onFieldEdit: () => {},
    onDiscardEntry: () => {},
    hasEdits: () => false,
    isDraft: () => false,
    setSaving: () => {},
    setState: () => {}
  }

  return (
    <DragOverlay>
      <div className="gba:bg-background gba:border gba:border-border gba:rounded gba:shadow-lg gba:opacity-90">
        <MenuItemRow
          item={item}
          depth={0}
          isExpanded={false}
          hasChildren={!!(item.children && item.children.length > 0)}
          isHub={item.level === 0}
          entityType={getEntityType(item)}
          hasEdits={false}
          isSaving={false}
          isDraft={item.id.startsWith('draft:')}
          displayName={item.name}
          displayIconDB={item.icon ?? EMPTY_ICON_VALUE}
          displayDescription={item.description ?? ''}
          displayCode={item.code ?? ''}
          nameTranslated={item.nameTranslated ?? {}}
          descriptionTranslated={item.descriptionTranslated ?? {}}
          displayIconName={parseIconName(item.icon ?? EMPTY_ICON_VALUE)}
          dataTestId="drag-preview"
          toggleExpansion={() => {}}
          handleQuickAdd={() => {}}
          handleSaveEntry={() => {}}
          handleDiscardEntry={() => {}}
          handleDelete={() => {}}
          editableState={mockEditableState as any}
          resourceUrlOptions={[]}
          onResourceUrlSearch={() => {}}
          navigationsLoading={false}
        />
      </div>
    </DragOverlay>
  )
}
