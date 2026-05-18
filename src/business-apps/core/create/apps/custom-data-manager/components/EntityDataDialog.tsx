import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import type { CustomDataDefinition, RowMutationResult } from '../types'
import { EntityDataTable } from './EntityDataTable'

interface EntityDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: CustomDataDefinition
  allDefinitions: CustomDataDefinition[]
  accessToken: string
  onCreateRow: (
    namespace: string,
    entityName: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onUpdateRow: (
    namespace: string,
    entityName: string,
    rowId: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onDeleteRow: (namespace: string, entityName: string, rowId: string) => Promise<RowMutationResult>
  'data-testid'?: string
}

export const EntityDataDialog: React.FC<EntityDataDialogProps> = ({
  open,
  onOpenChange,
  definition,
  allDefinitions,
  accessToken,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  'data-testid': testId = 'entity-data-dialog'
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      aria-describedby={`${testId}-description`}
      className="gba:flex gba:h-5/6 gba:max-h-screen gba:w-full gba:max-w-5xl gba:flex-col gba:overflow-hidden"
      data-testid={testId}
    >
      <DialogHeader className="gba:space-y-1">
        <DialogTitle className="gba:text-base">
          {definition.displayName || definition.entityName} data
        </DialogTitle>
        <DialogDescription id={`${testId}-description`} className="gba:text-xs">
          Manage table rows for the promoted entity in namespace {definition.namespace}.
        </DialogDescription>
      </DialogHeader>
      <EntityDataTable
        definition={definition}
        allDefinitions={allDefinitions}
        accessToken={accessToken}
        onCreateRow={onCreateRow}
        onUpdateRow={onUpdateRow}
        onDeleteRow={onDeleteRow}
        data-testid={`${testId}-table`}
      />
    </DialogContent>
  </Dialog>
)
