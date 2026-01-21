import { Button } from '@newwork/nw-design-system'
import type { ContextWithActions, ContextDTO } from '@/common/data/resources/types/context.types'
import type { ColumnDef } from '@tanstack/react-table'
import { EditableCell } from '@/components/editable-cell'
import type { UseEditableStateResult } from '../../../../../hooks/useEditableState'
import { ContextDataDialog } from './components/ContextDataDialog'

export interface ContextTableColumnsConfig {
  dataTestId: string
  contextEntries: ContextDTO[]
  editableState: UseEditableStateResult<ContextDTO>
  contextDataDialogOpen: string | null
  setContextDataDialogOpen: (contextId: string | null) => void
}

export const createContextTableColumns = (
  config: ContextTableColumnsConfig
): ColumnDef<ContextWithActions & { id: string }>[] => {
  return [
    {
      id: 'contextName',
      accessorKey: 'context.contextName',
      header: 'Context Name',
      size: 250,
      cell: ({ row }) => {
        const contextId = row.original.context.id
        const context = config.contextEntries.find(c => c.id === contextId)
        const edits = config.editableState.state.editedEntries.get(contextId)
        const contextNameValue = edits?.contextName !== undefined ? edits.contextName : context?.contextName || ''
        const isEdited = config.editableState.isFieldEdited(contextId, 'contextName')
        const isSaving = config.editableState.state.savingEntryId === contextId && config.editableState.state.isSaving

        return (
          <EditableCell
            value={contextNameValue}
            onChange={value => config.editableState.onFieldEdit(contextId, 'contextName', value)}
            testId={`${config.dataTestId}-contextName-${contextId}`}
            isEdited={isEdited}
            disabled={isSaving}
            placeholder="Enter context name"
          />
        )
      }
    },
    {
      id: 'permissionSchema',
      accessorKey: 'context.permissionSchema',
      header: 'Permission Schema',
      size: 200,
      cell: ({ row }) => {
        const contextId = row.original.context.id
        const originalContext = row.original.context
        const context = config.contextEntries.find(c => c.id === contextId) || originalContext
        const edits = config.editableState.state.editedEntries.get(contextId)
        const permissionSchemaValue =
          edits?.permissionSchema !== undefined
            ? edits.permissionSchema
            : originalContext.permissionSchema || context?.permissionSchema || ''
        const isEdited = config.editableState.isFieldEdited(contextId, 'permissionSchema')
        const isSaving = config.editableState.state.savingEntryId === contextId && config.editableState.state.isSaving

        return (
          <EditableCell
            value={permissionSchemaValue}
            onChange={value => config.editableState.onFieldEdit(contextId, 'permissionSchema', value)}
            testId={`${config.dataTestId}-permissionSchema-${contextId}`}
            isEdited={isEdited}
            disabled={isSaving}
            placeholder="Enter permission schema"
          />
        )
      }
    },
    {
      id: 'contextData',
      accessorKey: 'context.contextData',
      header: 'Context Data',
      size: 300,
      cell: ({ row }) => {
        const contextId = row.original.context.id
        const originalContext = row.original.context
        const context = config.contextEntries.find(c => c.id === contextId) || originalContext
        const edits = config.editableState.state.editedEntries.get(contextId)
        const contextData =
          edits?.contextData !== undefined
            ? edits.contextData
            : originalContext.contextData || context?.contextData || []
        const isEdited = config.editableState.isFieldEdited(contextId, 'contextData')
        const isSaving = config.editableState.state.savingEntryId === contextId && config.editableState.state.isSaving

        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={e => {
                e.stopPropagation()
                config.setContextDataDialogOpen(contextId)
              }}
              disabled={isSaving}
              data-testid={`${config.dataTestId}-contextData-button-${contextId}`}
              className={`gba:[&&]:h-6 ${isEdited ? 'gba:border-info' : 'gba:border-primary'}`}
            >
              Context Data ({contextData.length})
            </Button>
            <ContextDataDialog
              open={config.contextDataDialogOpen === contextId}
              onOpenChange={open => config.setContextDataDialogOpen(open ? contextId : null)}
              contextId={contextId}
              contextName={originalContext.contextName || contextId}
              contextData={contextData}
              onContextDataChange={newContextData => {
                config.editableState.onFieldEdit(contextId, 'contextData', newContextData)
              }}
              isSaving={isSaving}
              dataTestId={config.dataTestId}
            />
          </>
        )
      }
    }
  ]
}
