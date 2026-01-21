import type { ActionWithContexts } from '@/common/data/resources/types/action.types'
import type { ColumnDef } from '@tanstack/react-table'
import { EditableCell, EditableComboboxCell, EditableSelectCell } from '@/components/editable-cell'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import type { UseEditableStateResult } from '../../../../../hooks/useEditableState'

export interface ActionTableColumnsConfig {
  dataTestId: string
  actionEntries: ActionDTO[]
  editableState: UseEditableStateResult<ActionDTO>
  onDelete: (action: ActionWithContexts) => void
  handleSaveEntry: (actionId: string) => Promise<void>
  isUpdating: boolean
  isDeleting: boolean
  setDescriptionActionId: (id: string | null) => void
  setDescriptionDialogOpen: (open: boolean) => void
  // Service/Process related (from context)
  domains: Array<{ id: string; name: string }>
  getProcessesForDomain: (domain: string) => Array<{ id: string; name: string }>
  // Component related
  screenComponentOptions: Array<{ id: string; name: string }>
  screenResourcesLoading: boolean
  screenResourcesLength: number
  refetchScreenResources: () => Promise<void>
  searchScreenComponents: () => void
  // Roles/Features
  roleOptions: Array<{ id: string; name: string }>
  featureOptions: Array<{ id: string; name: string }>
  rolesLoading: boolean
  featuresLoading: boolean
  rolesError: string | null
  featuresError: string | null
  refetchRoles: () => Promise<void>
  refetchFeatures: () => Promise<void>
}

export const createActionTableColumns = (
  config: ActionTableColumnsConfig
): ColumnDef<ActionWithContexts & { id: string }>[] => {
  return [
    {
      id: 'flowName',
      header: 'Name',
      size: 300,
      accessorFn: (row: ActionWithContexts) => row.action.flowName || '',
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const flowNameValue = edits?.flowName !== undefined ? edits.flowName : action?.flowName || ''
        const flowNameTranslation = edits?.flowNameTranslation || action?.flowNameTranslation || {}
        const isEdited = config.editableState.isFieldEdited(actionId, 'flowName')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <EditableCell
            value={flowNameValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'flowName', value)}
            testId={`${config.dataTestId}-flowName-${actionId}`}
            isEdited={isEdited}
            isTranslatable={true}
            translations={flowNameTranslation}
            onTranslationsChange={translations =>
              config.editableState.onFieldEdit(actionId, 'flowNameTranslation', translations)
            }
            disabled={isSaving}
            placeholder="Enter flow name"
          />
        )
      }
    },
    {
      id: 'description',
      header: 'Description',
      size: 120,
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const isEdited = config.editableState.isFieldEdited(actionId, 'description')

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation()
              config.setDescriptionActionId(actionId)
              config.setDescriptionDialogOpen(true)
            }}
            data-testid={`${config.dataTestId}-description-button-${actionId}`}
            className={`gba:[&&]:h-6 ${isEdited ? 'gba:border-info' : 'gba:border-primary'}`}
          >
            Description
          </Button>
        )
      }
    },
    {
      id: 'domain',
      header: 'Service',
      size: 180,
      accessorFn: (row: ActionWithContexts) => row.action.domain || '',
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const domainValue = edits?.domain !== undefined ? edits.domain : action?.domain || ''
        const isEdited = config.editableState.isFieldEdited(actionId, 'domain')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={domainValue}
            onChange={value => {
              config.editableState.onFieldEdit(actionId, 'domain', value)
              config.editableState.onFieldEdit(actionId, 'processName', '')
            }}
            options={config.domains}
            testId={`${config.dataTestId}-service-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving}
            placeholder="Select service..."
          />
        )
      }
    },
    {
      id: 'processName',
      header: 'Process Name',
      size: 200,
      accessorFn: (row: ActionWithContexts) => row.action.processName || '',
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const processNameValue = edits?.processName !== undefined ? edits.processName : action?.processName || ''
        const isEdited = config.editableState.isFieldEdited(actionId, 'processName')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        const selectedDomain = edits?.domain !== undefined ? edits.domain : action?.domain || null
        const domainProcesses = selectedDomain ? config.getProcessesForDomain(selectedDomain) : []
        const processes = (() => {
          if (processNameValue && processNameValue.trim() && !domainProcesses.find(p => p.id === processNameValue)) {
            return [...domainProcesses, { id: processNameValue, name: processNameValue }]
          }
          return domainProcesses
        })()

        return (
          <EditableComboboxCell
            value={processNameValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'processName', value)}
            options={processes}
            testId={`${config.dataTestId}-processName-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving || !selectedDomain}
            placeholder={selectedDomain ? 'Select process...' : 'Select service first'}
          />
        )
      }
    },
    {
      id: 'flowType',
      header: 'Flow Type',
      size: 120,
      accessorFn: (row: ActionWithContexts) => row.action.flowType || '',
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const flowTypeValue = edits?.flowType !== undefined ? edits.flowType : action?.flowType || 'ACTION'
        const isEdited = config.editableState.isFieldEdited(actionId, 'flowType')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        const flowTypeOptions = [
          { value: 'ACTION', label: 'ACTION' },
          { value: 'NAVIGATION', label: 'NAVIGATION' },
          { value: 'REPORT', label: 'REPORT' }
        ]

        return (
          <EditableSelectCell
            value={flowTypeValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'flowType', value)}
            options={flowTypeOptions}
            testId={`${config.dataTestId}-flowType-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving}
            placeholder="Select type..."
          />
        )
      }
    },
    {
      id: 'targetDesktop',
      header: 'Target Desktop',
      size: 250,
      accessorFn: (row: ActionWithContexts) => row.action.targetDesktop || '',
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const targetDesktopValue =
          edits?.targetDesktop !== undefined ? edits.targetDesktop : action?.targetDesktop || ''
        const isEdited = config.editableState.isFieldEdited(actionId, 'targetDesktop')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={targetDesktopValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'targetDesktop', value)}
            options={config.screenComponentOptions}
            testId={`${config.dataTestId}-targetDesktop-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving}
            isLoading={config.screenResourcesLoading}
            onSearch={config.searchScreenComponents}
            onOpenChange={open => {
              if (open) {
                if (!config.screenResourcesLoading && config.screenResourcesLength === 0) {
                  config.refetchScreenResources()
                }
              }
            }}
            placeholder="Select component..."
          />
        )
      }
    },
    {
      id: 'targetMobile',
      header: 'Target Mobile',
      size: 250,
      accessorFn: (row: ActionWithContexts) => row.action.targetMobile || '',
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const targetMobileValue = edits?.targetMobile !== undefined ? edits.targetMobile : action?.targetMobile || ''
        const isEdited = config.editableState.isFieldEdited(actionId, 'targetMobile')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={targetMobileValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'targetMobile', value)}
            options={config.screenComponentOptions}
            testId={`${config.dataTestId}-targetMobile-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving}
            isLoading={config.screenResourcesLoading}
            onSearch={config.searchScreenComponents}
            onOpenChange={open => {
              if (open) {
                if (!config.screenResourcesLoading && config.screenResourcesLength === 0) {
                  config.refetchScreenResources()
                }
              }
            }}
            placeholder="Select component..."
          />
        )
      }
    },
    {
      id: 'searchEnabled',
      header: 'Searchable',
      size: 120,
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const searchEnabledValue =
          edits?.searchEnabled !== undefined ? edits.searchEnabled : (action?.searchEnabled ?? false)
        const isEdited = config.editableState.isFieldEdited(actionId, 'searchEnabled')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <div className="gba:flex gba:items-center gba:justify-center">
            <input
              type="checkbox"
              checked={searchEnabledValue}
              onChange={e => config.editableState.onFieldEdit(actionId, 'searchEnabled', e.target.checked)}
              disabled={isSaving}
              className={`gba:w-4 gba:h-4 ${isEdited ? 'gba:border-blue-500' : ''}`}
              data-testid={`${config.dataTestId}-searchEnabled-${actionId}`}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )
      }
    },
    {
      id: 'roles',
      header: 'Groups',
      size: 300,
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const rawRoles = edits?.roles !== undefined ? edits.roles : action?.roles || []
        const rolesValue = Array.isArray(rawRoles)
          ? rawRoles.map(r => {
              if (typeof r === 'string') return r
              if (typeof r === 'object' && r !== null) {
                return (r as any)?.id || (r as any)?.name || String(r)
              }
              return String(r)
            })
          : []
        const isEdited = config.editableState.isFieldEdited(actionId, 'roles')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={rolesValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'roles', value)}
            options={config.roleOptions}
            testId={`${config.dataTestId}-roles-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving}
            isLoading={config.rolesLoading}
            onOpenChange={open => {
              if (open) {
                if (config.roleOptions.length === 0 && !config.rolesError) {
                  config.refetchRoles().catch(() => {})
                }
              }
            }}
            placeholder="Select groups..."
            mode="multiple"
          />
        )
      }
    },
    {
      id: 'features',
      header: 'Features',
      size: 300,
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const rawFeatures = edits?.features !== undefined ? edits.features : action?.features || []
        const featuresValue = Array.isArray(rawFeatures)
          ? rawFeatures.map(f => {
              if (typeof f === 'string') return f
              if (typeof f === 'object' && f !== null) {
                return (f as any)?.id || (f as any)?.name || String(f)
              }
              return String(f)
            })
          : []
        const isEdited = config.editableState.isFieldEdited(actionId, 'features')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        return (
          <EditableComboboxCell
            value={featuresValue}
            onChange={value => config.editableState.onFieldEdit(actionId, 'features', value)}
            options={config.featureOptions}
            testId={`${config.dataTestId}-features-${actionId}`}
            isEdited={isEdited}
            disabled={isSaving}
            isLoading={config.featuresLoading}
            onOpenChange={open => {
              if (open) {
                if (config.featureOptions.length === 0 && !config.featuresError) {
                  config.refetchFeatures().catch(() => {})
                }
              }
            }}
            placeholder="Select features..."
            mode="multiple"
          />
        )
      }
    },
    {
      id: 'builderType',
      header: 'Builder Type',
      size: 150,
      cell: ({ row }) => {
        const actionId = row.original.action.id
        const action = config.actionEntries.find(a => a.id === actionId)
        const edits = config.editableState.state.editedEntries.get(actionId)
        const builderTypeValue = edits?.builderType !== undefined ? edits.builderType : action?.builderType || 'native'
        const isEdited = config.editableState.isFieldEdited(actionId, 'builderType')
        const isSaving = config.editableState.state.savingEntryId === actionId && config.editableState.state.isSaving

        const builderTypeOptions = [
          { value: 'native', label: 'Native' },
          { value: 'lowcoder', label: 'Lowcoder' },
          { value: 'NATIVE_SCREEN', label: 'NATIVE_SCREEN' },
          { value: 'LOWCODER', label: 'LOWCODER' }
        ]

        return (
          <div className="gba:relative">
            <EditableSelectCell
              value={builderTypeValue}
              onChange={value => config.editableState.onFieldEdit(actionId, 'builderType', value)}
              options={builderTypeOptions}
              testId={`${config.dataTestId}-builderType-${actionId}`}
              isEdited={isEdited}
              disabled={isSaving}
              placeholder="Select builder type..."
            />
            {builderTypeValue !== 'native' && (
              <span
                className="gba:absolute gba:-top-1 gba:-right-1 gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"
                title="Deprecated"
              />
            )}
          </div>
        )
      }
    }
  ]
}
