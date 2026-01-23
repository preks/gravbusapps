import React, { useCallback, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button
} from '@newwork/nw-design-system'
import { Trash, Plus } from '@phosphor-icons/react'
import type { ContextDataDTO } from '@/common/data/resources/types/context.types'
import { EditableCell, EditableSelectCell } from '@/components/editable-cell'

interface ContextDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contextId: string
  contextName?: string
  contextData: ContextDataDTO[]
  onSave: (contextData: ContextDataDTO[]) => void
  isSaving?: boolean
  dataTestId: string
}

const CONTEXT_DATA_TYPES = [
  { value: 'UUID', label: 'UUID' },
  { value: 'STRING', label: 'STRING' },
  { value: 'NUMBER', label: 'NUMBER' },
  { value: 'BOOLEAN', label: 'BOOLEAN' },
  { value: 'DATE', label: 'DATE' },
  { value: 'DATE_TIME', label: 'DATE_TIME' },
  { value: 'UUID_LIST', label: 'UUID_LIST' },
  { value: 'STRING_LIST', label: 'STRING_LIST' },
  { value: 'NUMBER_LIST', label: 'NUMBER_LIST' },
  { value: 'BOOLEAN_LIST', label: 'BOOLEAN_LIST' },
  { value: 'DATE_LIST', label: 'DATE_LIST' },
  { value: 'DATE_TIME_LIST', label: 'DATE_TIME_LIST' }
] as const

export const ContextDataDialog: React.FC<ContextDataDialogProps> = ({
  open,
  onOpenChange,
  contextId,
  contextName,
  contextData,
  onSave,
  isSaving = false,
  dataTestId
}) => {
  // Local state for editing - only update parent on save
  const [localContextData, setLocalContextData] = useState<ContextDataDTO[]>(contextData)

  // Reset local state when dialog opens/closes or contextData changes from parent
  useEffect(() => {
    if (open) {
      setLocalContextData(contextData)
    }
  }, [open, contextData])

  const handleMainContextChange = useCallback(
    (index: number, checked: boolean) => {
      const newContextData = [...localContextData]

      if (checked) {
        // If this one is being checked, uncheck all others
        newContextData.forEach((data, i) => {
          newContextData[i] = { ...data, mainContext: i === index }
        })
      } else {
        // If this one is being unchecked, just update this one
        newContextData[index] = { ...newContextData[index], mainContext: false }
      }

      setLocalContextData(newContextData)
    },
    [localContextData]
  )

  const handleAddContextData = useCallback(() => {
    const newContextData = [
      ...localContextData,
      {
        id: `temp-${Date.now()}`,
        contextDataName: '',
        contextDataType: 'STRING' as const,
        mainContext: false
      }
    ]
    setLocalContextData(newContextData)
  }, [localContextData])

  const handleRemoveContextData = useCallback(
    (index: number) => {
      const newContextData = localContextData.filter((_, i) => i !== index)
      setLocalContextData(newContextData)
    },
    [localContextData]
  )

  const handleNameChange = useCallback(
    (index: number, value: string) => {
      const newContextData = [...localContextData]
      newContextData[index] = { ...newContextData[index], contextDataName: value }
      setLocalContextData(newContextData)
    },
    [localContextData]
  )

  const handleTypeChange = useCallback(
    (index: number, value: string) => {
      const newContextData = [...localContextData]
      newContextData[index] = {
        ...newContextData[index],
        contextDataType: value as ContextDataDTO['contextDataType']
      }
      setLocalContextData(newContextData)
    },
    [localContextData]
  )

  const handleApply = useCallback(() => {
    onSave(localContextData)
    onOpenChange(false)
  }, [localContextData, onSave, onOpenChange])

  const handleCancel = useCallback(() => {
    setLocalContextData(contextData) // Reset to original
    onOpenChange(false)
  }, [contextData, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Context Data for {contextName || contextId}</DialogTitle>
        </DialogHeader>
        <div className="gba:mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Main Context</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localContextData && localContextData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground">
                    No context data defined
                  </TableCell>
                </TableRow>
              ) : (
                localContextData.map((data, index) => (
                  <TableRow key={data.id || index}>
                    <TableCell>
                      <EditableCell
                        value={data.contextDataName}
                        onChange={value => handleNameChange(index, value)}
                        testId={`${dataTestId}-contextData-name-${contextId}-${index}`}
                        isEdited={false}
                        disabled={isSaving}
                        placeholder="Enter name"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableSelectCell
                        value={data.contextDataType}
                        onChange={value => handleTypeChange(index, value)}
                        options={CONTEXT_DATA_TYPES}
                        testId={`${dataTestId}-contextData-type-${contextId}-${index}`}
                        isEdited={false}
                        disabled={isSaving}
                        placeholder="Select type"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={data.mainContext || false}
                        onChange={e => handleMainContextChange(index, e.target.checked)}
                        disabled={isSaving}
                        data-testid={`${dataTestId}-contextData-main-${contextId}-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveContextData(index)}
                        disabled={isSaving}
                        data-testid={`${dataTestId}-contextData-delete-${contextId}-${index}`}
                      >
                        <Trash className="gba:h-4 gba:w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="gba:mt-4 gba:flex gba:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddContextData}
              disabled={isSaving}
              data-testid={`${dataTestId}-contextData-add-${contextId}`}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
              Add Context Data
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            data-testid={`${dataTestId}-contextData-cancel-${contextId}`}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isSaving}
            data-testid={`${dataTestId}-contextData-apply-${contextId}`}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
