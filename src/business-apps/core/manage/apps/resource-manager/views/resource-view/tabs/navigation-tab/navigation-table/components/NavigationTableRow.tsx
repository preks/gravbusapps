import React from 'react'
import { TableRow, TableCell, Button, ButtonGroup } from '@newwork/nw-design-system'
import { Save, X, Trash } from 'lucide-react'
import { EditableCell, EditableComboboxCell } from '@/components/editable-cell'
import type { UseEditableStateResult } from '../../../../../../hooks/useEditableState'
import type { NavigationWithMenuItems } from '../types/NavigationTypes'
import { useEditableRow } from '../../../../../../hooks/useEditableRow'

interface NavigationTableRowProps {
  navigation: NavigationWithMenuItems
  editableState: UseEditableStateResult<any>
  onFieldEdit: (navId: string, field: string, value: any) => void
  onSaveEntry: (navId: string) => Promise<void>
  onDiscardEntry: (navId: string) => void
  onDelete: (navigation: NavigationWithMenuItems) => void
  isDeleting: boolean
  setDescriptionNavigationId: (id: string | null) => void
  setDescriptionDialogOpen: (open: boolean) => void
  roleOptions: Array<{ id: string; name: string }>
  featureOptions: Array<{ id: string; name: string }>
  rolesLoading: boolean
  featuresLoading: boolean
  rolesError: string | null
  featuresError: string | null
  refetchRoles: () => Promise<void>
  refetchFeatures: () => Promise<void>
  onSearchRoles: (searchTerm: string) => void
  loadMoreRoles: () => Promise<void>
  hasMoreRoles: boolean
  dataTestId: string
}

const NavigationTableRowComponent: React.FC<NavigationTableRowProps> = ({
  navigation,
  editableState,
  onFieldEdit,
  onSaveEntry,
  onDiscardEntry,
  onDelete,
  isDeleting,
  setDescriptionNavigationId,
  setDescriptionDialogOpen,
  roleOptions,
  featureOptions,
  rolesLoading,
  featuresLoading,
  rolesError,
  featuresError,
  refetchRoles,
  refetchFeatures,
  onSearchRoles,
  loadMoreRoles,
  hasMoreRoles,
  dataTestId
}) => {
  const {
    entryId: navId,
    hasEdits,
    isSaving,
    getFieldValue,
    isFieldEdited,
    normalizeArrayValue
  } = useEditableRow(navigation, editableState)
  const isDraft = editableState.isDraft(navId)

  // Normalize array values using the hook
  const rolesValue = normalizeArrayValue('roles')
  const featuresValue = normalizeArrayValue('features')

  return (
    <TableRow data-testid={`${dataTestId}-navigation-row-${navId}`}>
      {/* Code */}
      <TableCell className="gba:px-2">
        <EditableCell
          value={getFieldValue('code') as string}
          onChange={value => onFieldEdit(navId, 'code', value)}
          testId={`${dataTestId}-code-${navId}`}
          isEdited={isFieldEdited('code')}
          disabled={isSaving}
          placeholder="Enter code"
        />
      </TableCell>

      {/* Name */}
      <TableCell className="gba:px-2">
        <EditableCell
          value={getFieldValue('name') as string}
          onChange={value => onFieldEdit(navId, 'name', value)}
          testId={`${dataTestId}-name-${navId}`}
          isEdited={isFieldEdited('name') || isFieldEdited('name_i18n')}
          isTranslatable={true}
          translations={(getFieldValue('name_i18n') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(navId, 'name_i18n', translations)}
          disabled={isSaving}
          placeholder="Enter name"
        />
      </TableCell>

      {/* URL */}
      <TableCell className="gba:px-2">
        <EditableCell
          value={getFieldValue('url') as string}
          onChange={value => onFieldEdit(navId, 'url', value)}
          testId={`${dataTestId}-url-${navId}`}
          isEdited={isFieldEdited('url')}
          disabled={isSaving}
          placeholder="Enter URL"
        />
      </TableCell>

      {/* Description */}
      <TableCell className="gba:px-2">
        <Button
          size="sm"
          variant="outline"
          onClick={e => {
            e.stopPropagation()
            setDescriptionNavigationId(navId)
            setDescriptionDialogOpen(true)
          }}
          data-testid={`${dataTestId}-description-button-${navId}`}
          className={`gba:[&&]:h-6 ${isFieldEdited('description_i18n') ? 'gba:border-info' : 'gba:border-primary'}`}
        >
          Description
        </Button>
      </TableCell>

      {/* Searchable */}
      <TableCell className="gba:px-2">
        <div className="gba:flex gba:items-center gba:justify-center">
          <input
            type="checkbox"
            checked={(getFieldValue('isSearchable') as boolean) ?? false}
            onChange={e => onFieldEdit(navId, 'isSearchable', e.target.checked)}
            disabled={isSaving}
            className={`gba:w-4 gba:h-4 ${isFieldEdited('isSearchable') ? 'gba:border-blue-500' : ''}`}
            data-testid={`${dataTestId}-searchable-${navId}`}
            onClick={e => e.stopPropagation()}
          />
        </div>
      </TableCell>

      {/* Groups/Roles */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={rolesValue}
          onChange={value => onFieldEdit(navId, 'roles', value)}
          options={roleOptions}
          testId={`${dataTestId}-roles-${navId}`}
          isEdited={isFieldEdited('roles')}
          disabled={isSaving}
          isLoading={rolesLoading}
          onOpenChange={open => {
            if (open && roleOptions.length === 0 && !rolesError) {
              refetchRoles().catch(() => {})
            }
          }}
          onSearch={onSearchRoles}
          onLoadMore={loadMoreRoles}
          hasMore={hasMoreRoles}
          placeholder="Select groups..."
          mode="multiple"
        />
      </TableCell>

      {/* Features */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={featuresValue}
          onChange={value => onFieldEdit(navId, 'features', value)}
          options={featureOptions}
          testId={`${dataTestId}-features-${navId}`}
          isEdited={isFieldEdited('features')}
          disabled={isSaving}
          isLoading={featuresLoading}
          onOpenChange={open => {
            if (open && featureOptions.length === 0 && !featuresError) {
              refetchFeatures().catch(() => {})
            }
          }}
          placeholder="Select features..."
          mode="multiple"
          enableClientFilter={true}
        />
      </TableCell>

      {/* Actions */}
      <TableCell className="gba:sticky gba:right-0 gba:bg-background gba:z-10 gba:px-2">
        <ButtonGroup onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="gba:h-6">
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onSaveEntry(navId)
            }}
            disabled={!hasEdits || isSaving}
            data-testid={`${dataTestId}-save-navigation-${navId}`}
            title="Save changes"
          >
            <Save className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onDiscardEntry(navId)
            }}
            disabled={!hasEdits || isSaving}
            data-testid={`${dataTestId}-discard-navigation-${navId}`}
            title="Discard changes"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            size="iconSm"
            variant="destructive"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onDelete(navigation)
            }}
            disabled={isDraft || isDeleting}
            data-testid={`${dataTestId}-delete-navigation-${navId}`}
            title="Delete navigation"
          >
            <Trash className="gba:h-4 gba:w-4" />
          </Button>
        </ButtonGroup>
      </TableCell>
    </TableRow>
  )
}

// Helper function to compare arrays by reference and length
const arraysEqual = (a: any[] | undefined, b: any[] | undefined): boolean => {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return true // Assume arrays are stable references
}

// Helper to check if edits object changed
const editsObjectChanged = (
  prevEdited: Record<string, unknown> | undefined,
  nextEdited: Record<string, unknown> | undefined
): boolean => {
  if (prevEdited === nextEdited) return false
  if (!prevEdited && !nextEdited) return false
  if (!prevEdited || !nextEdited) return true

  // Deep compare edited entries
  const prevKeys = Object.keys(prevEdited)
  const nextKeys = Object.keys(nextEdited)
  if (prevKeys.length !== nextKeys.length) return true

  for (const key of prevKeys) {
    if (prevEdited[key] !== nextEdited[key]) {
      // For arrays, compare by reference (they should be stable)
      if (Array.isArray(prevEdited[key]) && Array.isArray(nextEdited[key])) {
        if (!arraysEqual(prevEdited[key], nextEdited[key])) return true
      } else {
        return true
      }
    }
  }

  return false
}

// Helper to check if editableState changed for this specific entry
const editableStateChanged = (
  prevState: UseEditableStateResult<any>,
  nextState: UseEditableStateResult<any>,
  entryId: string
): boolean => {
  const prevEdited = prevState.state.editedEntries.get(entryId)
  const nextEdited = nextState.state.editedEntries.get(entryId)
  const prevIsDraft = prevState.state.draftEntryIds.has(entryId)
  const nextIsDraft = nextState.state.draftEntryIds.has(entryId)
  const prevIsSaving = prevState.state.savingEntryId === entryId
  const nextIsSaving = nextState.state.savingEntryId === entryId

  if (prevIsDraft !== nextIsDraft || prevIsSaving !== nextIsSaving) return true

  return editsObjectChanged(prevEdited, nextEdited)
}

export const NavigationTableRow = React.memo(NavigationTableRowComponent, (prevProps, nextProps) => {
  // Compare navigation data
  if (
    prevProps.navigation.id !== nextProps.navigation.id ||
    prevProps.navigation.code !== nextProps.navigation.code ||
    prevProps.navigation.name !== nextProps.navigation.name ||
    prevProps.navigation.url !== nextProps.navigation.url ||
    prevProps.navigation.isSearchable !== nextProps.navigation.isSearchable
  ) {
    return false
  }

  // Compare navigation roles/features (if they exist on navigation object)
  const prevRoles = (prevProps.navigation as any).roles
  const nextRoles = (nextProps.navigation as any).roles
  if (!arraysEqual(prevRoles, nextRoles)) return false

  const prevFeatures = (prevProps.navigation as any).features
  const nextFeatures = (nextProps.navigation as any).features
  if (!arraysEqual(prevFeatures, nextFeatures)) return false

  // Compare editable state for this specific entry
  const navId = prevProps.navigation.id
  if (navId && editableStateChanged(prevProps.editableState, nextProps.editableState, navId)) {
    return false
  }

  // Compare simple props
  if (
    prevProps.isExpanded !== nextProps.isExpanded ||
    prevProps.isDeleting !== nextProps.isDeleting ||
    prevProps.rolesLoading !== nextProps.rolesLoading ||
    prevProps.featuresLoading !== nextProps.featuresLoading ||
    prevProps.rolesError !== nextProps.rolesError ||
    prevProps.featuresError !== nextProps.featuresError ||
    prevProps.dataTestId !== nextProps.dataTestId
  ) {
    return false
  }

  // Compare arrays (options) - assume they're stable references
  if (!arraysEqual(prevProps.roleOptions, nextProps.roleOptions)) return false
  if (!arraysEqual(prevProps.featureOptions, nextProps.featureOptions)) return false

  // Callbacks are assumed to be stable (wrapped in useCallback)
  // If they change, we want to re-render anyway

  return true
})
