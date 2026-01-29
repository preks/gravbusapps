import React from 'react'
import { TableRow, TableCell, Button, ButtonGroup } from '@newwork/nw-design-system'
import { Save, X, Trash } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ActionWithContexts, ActionDTO } from '@/common/data/resources/types/action.types'
import { EditableCell, EditableComboboxCell, EditableSelectCell } from '@/components/editable-cell'
import type { UseEditableStateResult } from '../../../../../../hooks/useEditableState'
import { useEditableRow } from '../../../../../../hooks/useEditableRow'

interface ActionTableRowProps extends BusinessAppContextProps {
  action: ActionWithContexts
  editableState: UseEditableStateResult<ActionDTO>
  onFieldEdit: (actionId: string, field: keyof ActionDTO, value: any) => void
  onSaveEntry: (actionId: string) => Promise<void>
  onDiscardEntry: (actionId: string) => void
  onDelete: (action: ActionWithContexts) => void
  isUpdating: boolean
  isDeleting: boolean
  setDescriptionActionId: (id: string | null) => void
  setDescriptionDialogOpen: (open: boolean) => void
  domains: Array<{ id: string; name: string }>
  getProcessesForDomain: (domain: string) => Array<{ id: string; name: string }>
  screenComponentOptions: Array<{ id: string; name: string }>
  screenResourcesLoading: boolean
  refetchScreenResources: () => Promise<void>
  onSearchScreenComponents: (searchTerm: string) => void
  loadMoreScreenComponents: () => Promise<void>
  hasMoreScreenComponents: boolean
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
  validationErrors: Map<string, { roles?: boolean; features?: boolean; builderType?: boolean }>
}

const ActionTableRowComponent: React.FC<ActionTableRowProps> = ({
  action,
  editableState,
  onFieldEdit,
  onSaveEntry,
  onDiscardEntry,
  onDelete,
  isUpdating,
  isDeleting,
  setDescriptionActionId,
  setDescriptionDialogOpen,
  domains,
  getProcessesForDomain,
  screenComponentOptions,
  screenResourcesLoading,
  refetchScreenResources,
  onSearchScreenComponents,
  loadMoreScreenComponents,
  hasMoreScreenComponents,
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
  dataTestId,
  validationErrors
}) => {
  const {
    entryId: actionId,
    hasEdits,
    isSaving,
    getFieldValue,
    isFieldEdited,
    normalizeArrayValue
  } = useEditableRow(action.action, editableState)

  const errors = validationErrors.get(actionId)

  // Process name options
  const selectedDomain = getFieldValue('domain') as string | undefined
  const domainProcesses = selectedDomain ? getProcessesForDomain(selectedDomain) : []
  const processNameValue = getFieldValue('processName') as string | undefined
  const processes = (() => {
    if (processNameValue?.trim() && !domainProcesses.some(p => p.id === processNameValue)) {
      return [...domainProcesses, { id: processNameValue, name: processNameValue }]
    }
    return domainProcesses
  })()

  // Normalize array values using the hook
  const rolesValue = normalizeArrayValue('roles')
  const featuresValue = normalizeArrayValue('features')

  return (
    <TableRow data-testid={`${dataTestId}-action-row-${actionId}`}>
      {/* Flow Name */}
      <TableCell className="gba:px-2">
        <EditableCell
          value={getFieldValue('flowName') as string}
          onChange={value => onFieldEdit(actionId, 'flowName', value)}
          testId={`${dataTestId}-flowName-${actionId}`}
          isEdited={isFieldEdited('flowName')}
          isTranslatable={true}
          translations={(getFieldValue('flowNameTranslation') as Record<string, string>) || {}}
          onTranslationsChange={translations => onFieldEdit(actionId, 'flowNameTranslation', translations)}
          disabled={isSaving}
          placeholder="Enter flow name"
        />
      </TableCell>

      {/* Description */}
      <TableCell className="gba:px-2">
        <Button
          size="sm"
          variant="outline"
          onClick={e => {
            e.stopPropagation()
            setDescriptionActionId(actionId)
            setDescriptionDialogOpen(true)
          }}
          data-testid={`${dataTestId}-description-button-${actionId}`}
          className={`gba:[&&]:h-6 ${isFieldEdited('description') ? 'gba:border-info' : 'gba:border-primary'}`}
        >
          Description
        </Button>
      </TableCell>

      {/* Service/Domain */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={getFieldValue('domain') as string}
          onChange={value => {
            onFieldEdit(actionId, 'domain', value)
            onFieldEdit(actionId, 'processName', '')
          }}
          options={domains}
          testId={`${dataTestId}-service-${actionId}`}
          isEdited={isFieldEdited('domain')}
          disabled={isSaving}
          placeholder="Select service..."
          enableClientFilter={true}
        />
      </TableCell>

      {/* Process Name */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={processNameValue as string}
          onChange={value => onFieldEdit(actionId, 'processName', value)}
          options={processes}
          testId={`${dataTestId}-processName-${actionId}`}
          isEdited={isFieldEdited('processName')}
          disabled={isSaving || !selectedDomain}
          placeholder={selectedDomain ? 'Select process...' : 'Select service first'}
          enableClientFilter={true}
        />
      </TableCell>

      {/* Flow Type */}
      <TableCell className="gba:px-2">
        <EditableSelectCell
          value={getFieldValue('flowType') as string}
          onChange={value => onFieldEdit(actionId, 'flowType', value)}
          options={[
            { value: 'ACTION', label: 'ACTION' },
            { value: 'NAVIGATION', label: 'NAVIGATION' },
            { value: 'REPORT', label: 'REPORT' }
          ]}
          testId={`${dataTestId}-flowType-${actionId}`}
          isEdited={isFieldEdited('flowType')}
          disabled={isSaving}
          placeholder="Select type..."
        />
      </TableCell>

      {/* Target Desktop */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={getFieldValue('targetDesktop') as string}
          onChange={value => onFieldEdit(actionId, 'targetDesktop', value)}
          options={screenComponentOptions}
          testId={`${dataTestId}-targetDesktop-${actionId}`}
          isEdited={isFieldEdited('targetDesktop')}
          disabled={isSaving}
          isLoading={screenResourcesLoading}
          onOpenChange={open => {
            if (open && screenComponentOptions.length === 0) {
              refetchScreenResources()
            }
          }}
          onSearch={onSearchScreenComponents}
          onLoadMore={loadMoreScreenComponents}
          hasMore={hasMoreScreenComponents}
          placeholder="Select component..."
        />
      </TableCell>

      {/* Target Mobile */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={getFieldValue('targetMobile') as string}
          onChange={value => onFieldEdit(actionId, 'targetMobile', value)}
          options={screenComponentOptions}
          testId={`${dataTestId}-targetMobile-${actionId}`}
          isEdited={isFieldEdited('targetMobile')}
          disabled={isSaving}
          isLoading={screenResourcesLoading}
          onOpenChange={open => {
            if (open && screenComponentOptions.length === 0) {
              refetchScreenResources()
            }
          }}
          onSearch={onSearchScreenComponents}
          onLoadMore={loadMoreScreenComponents}
          hasMore={hasMoreScreenComponents}
          placeholder="Select component..."
        />
      </TableCell>

      {/* Searchable */}
      <TableCell className="gba:px-2">
        <div className="gba:flex gba:items-center gba:justify-center">
          <input
            type="checkbox"
            checked={(getFieldValue('searchEnabled') as boolean) ?? false}
            onChange={e => onFieldEdit(actionId, 'searchEnabled', e.target.checked)}
            disabled={isSaving}
            className={`gba:w-4 gba:h-4 ${isFieldEdited('searchEnabled') ? 'gba:border-blue-500' : ''}`}
            data-testid={`${dataTestId}-searchEnabled-${actionId}`}
            onClick={e => e.stopPropagation()}
          />
        </div>
      </TableCell>

      {/* Groups/Roles */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={rolesValue}
          onChange={value => onFieldEdit(actionId, 'roles', value)}
          options={roleOptions}
          testId={`${dataTestId}-roles-${actionId}`}
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
          hasError={errors?.roles}
        />
      </TableCell>

      {/* Features */}
      <TableCell className="gba:px-2">
        <EditableComboboxCell
          value={featuresValue}
          onChange={value => onFieldEdit(actionId, 'features', value)}
          options={featureOptions}
          testId={`${dataTestId}-features-${actionId}`}
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
          hasError={errors?.features}
          enableClientFilter={true}
        />
      </TableCell>

      {/* Builder Type */}
      <TableCell className="gba:px-2">
        <div className="gba:relative">
          <EditableSelectCell
            value={getFieldValue('builderType') as string}
            onChange={value => onFieldEdit(actionId, 'builderType', value)}
            options={[
              { value: 'NATIVE_SCREEN', label: 'NATIVE_SCREEN' },
              { value: 'LOWCODER', label: 'LOWCODER' }
            ]}
            testId={`${dataTestId}-builderType-${actionId}`}
            isEdited={isFieldEdited('builderType')}
            disabled={isSaving}
            placeholder="Select builder type..."
            hasError={errors?.builderType}
          />
          {getFieldValue('builderType') !== 'native' && (
            <span
              className="gba:absolute gba:-top-1 gba:-right-1 gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"
              title="Deprecated"
            />
          )}
        </div>
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
              onSaveEntry(actionId)
            }}
            disabled={!hasEdits || isSaving || isUpdating || isDeleting}
            data-testid={`${dataTestId}-save-action-${actionId}`}
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
              onDiscardEntry(actionId)
            }}
            disabled={!hasEdits || isSaving || isUpdating || isDeleting}
            data-testid={`${dataTestId}-discard-action-${actionId}`}
            title="Discard changes"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onDelete(action)
            }}
            disabled={isUpdating || isDeleting}
            data-testid={`${dataTestId}-delete-action-${actionId}`}
            title="Delete"
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

// Helper to check if editableState changed for this specific entry
const editableStateChanged = (
  prevState: UseEditableStateResult<ActionDTO>,
  nextState: UseEditableStateResult<ActionDTO>,
  entryId: string
): boolean => {
  const prevEdited = prevState.state.editedEntries.get(entryId)
  const nextEdited = nextState.state.editedEntries.get(entryId)
  const prevIsDraft = prevState.state.draftEntryIds.has(entryId)
  const nextIsDraft = nextState.state.draftEntryIds.has(entryId)
  const prevIsSaving = prevState.state.savingEntryId === entryId
  const nextIsSaving = nextState.state.savingEntryId === entryId

  if (prevIsDraft !== nextIsDraft || prevIsSaving !== nextIsSaving) return true

  if (prevEdited === nextEdited) return false
  if (!prevEdited && !nextEdited) return false
  if (!prevEdited || !nextEdited) return true

  return hasEditedEntriesChanged(prevEdited, nextEdited)
}

// Helper to compare edited entry objects
const hasEditedEntriesChanged = (prevEdited: any, nextEdited: any): boolean => {
  const prevKeys = Object.keys(prevEdited)
  const nextKeys = Object.keys(nextEdited)
  if (prevKeys.length !== nextKeys.length) return true

  for (const key of prevKeys) {
    const prevValue = prevEdited[key]
    const nextValue = nextEdited[key]

    if (prevValue === nextValue) continue

    if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
      if (!arraysEqual(prevValue, nextValue)) return true
    } else {
      return true
    }
  }

  return false
}

// Helper to compare validation errors for this entry
const validationErrorsChanged = (
  prevErrors: Map<string, { roles?: boolean; features?: boolean; builderType?: boolean }>,
  nextErrors: Map<string, { roles?: boolean; features?: boolean; builderType?: boolean }>,
  entryId: string
): boolean => {
  const prev = prevErrors.get(entryId)
  const next = nextErrors.get(entryId)
  if (prev === next) return false
  if (!prev && !next) return false
  if (!prev || !next) return true
  return prev.roles !== next.roles || prev.features !== next.features || prev.builderType !== next.builderType
}

export const ActionTableRow = React.memo(ActionTableRowComponent, (prevProps, nextProps) => {
  // Compare action data
  const prevAction = prevProps.action.action
  const nextAction = nextProps.action.action

  if (
    prevAction.id !== nextAction.id ||
    prevAction.flowName !== nextAction.flowName ||
    prevAction.domain !== nextAction.domain ||
    prevAction.processName !== nextAction.processName ||
    prevAction.flowType !== nextAction.flowType ||
    prevAction.targetDesktop !== nextAction.targetDesktop ||
    prevAction.targetMobile !== nextAction.targetMobile ||
    prevAction.searchEnabled !== nextAction.searchEnabled ||
    prevAction.builderType !== nextAction.builderType
  ) {
    return false
  }

  // Compare action roles/features
  if (!arraysEqual(prevAction.roles as any, nextAction.roles as any)) return false
  if (!arraysEqual(prevAction.features as any, nextAction.features as any)) return false

  // Compare editable state for this specific entry
  if (editableStateChanged(prevProps.editableState, nextProps.editableState, prevAction.id)) {
    return false
  }

  // Compare validation errors
  if (validationErrorsChanged(prevProps.validationErrors, nextProps.validationErrors, prevAction.id)) {
    return false
  }

  // Compare simple props
  if (
    prevProps.isUpdating !== nextProps.isUpdating ||
    prevProps.isDeleting !== nextProps.isDeleting ||
    prevProps.rolesLoading !== nextProps.rolesLoading ||
    prevProps.featuresLoading !== nextProps.featuresLoading ||
    prevProps.screenResourcesLoading !== nextProps.screenResourcesLoading ||
    prevProps.rolesError !== nextProps.rolesError ||
    prevProps.featuresError !== nextProps.featuresError ||
    prevProps.dataTestId !== nextProps.dataTestId
  ) {
    return false
  }

  // Compare arrays (options) - assume they're stable references
  if (!arraysEqual(prevProps.domains, nextProps.domains)) return false
  if (!arraysEqual(prevProps.roleOptions, nextProps.roleOptions)) return false
  if (!arraysEqual(prevProps.featureOptions, nextProps.featureOptions)) return false
  if (!arraysEqual(prevProps.screenComponentOptions, nextProps.screenComponentOptions)) return false

  // getProcessesForDomain is a function - assume stable (wrapped in useCallback)
  // Callbacks are assumed to be stable (wrapped in useCallback)

  return true
})
