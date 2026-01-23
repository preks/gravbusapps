import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Checkbox
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ContextDTO, ContextDataDTO } from '@/common/data/resources/types/context.types'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { EditableCell, EditableSelectCell, EditableComboboxCell } from '@/components/editable-cell'
import { Plus, Trash } from 'lucide-react'

interface ContextDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (contextData: Omit<ContextDTO, 'id'>, actionIds: string[]) => Promise<void>
  actions: ActionDTO[]
  mode: 'create'
  'data-testid'?: string
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

export const ContextDialog: React.FC<ContextDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  actions,
  'data-testid': dataTestId = 'context-dialog'
}) => {
  const [contextName, setContextName] = useState('')
  const [permissionSchema, setPermissionSchema] = useState('')
  const [contextData, setContextData] = useState<ContextDataDTO[]>([])
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setContextName('')
      setPermissionSchema('')
      setContextData([])
      setSelectedActionIds([])
    }
  }, [open])

  const handleAddContextData = useCallback(() => {
    setContextData(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        contextDataName: '',
        contextDataType: 'STRING',
        mainContext: false
      }
    ])
  }, [])

  const handleRemoveContextData = useCallback((index: number) => {
    setContextData(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleContextDataChange = useCallback((index: number, field: keyof ContextDataDTO, value: any) => {
    setContextData(prev => {
      const newData = [...prev]
      newData[index] = { ...newData[index], [field]: value }
      return newData
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!contextName.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      const contextDataToSubmit: Omit<ContextDTO, 'id' | 'rank' | 'version'> & {
        contextData: Array<Omit<ContextDataDTO, 'id'>>
      } = {
        contextName: contextName.trim(),
        permissionSchema: permissionSchema.trim() || undefined,
        contextData: contextData
          .filter(data => data.contextDataName.trim() !== '')
          .map(data => ({
            contextDataName: data.contextDataName,
            contextDataType: data.contextDataType,
            mainContext: data.mainContext ?? false
          }))
      }

      await onSubmit(contextDataToSubmit, selectedActionIds)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting context:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [contextName, permissionSchema, contextData, selectedActionIds, onSubmit, onOpenChange])

  const actionOptions = actions.map(action => ({
    id: action.id,
    name: action.flowName
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-4xl" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>Create Context</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {/* Context Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="contextName">Context Name *</Label>
            <Input
              id="contextName"
              value={contextName}
              onChange={e => setContextName(e.target.value)}
              placeholder="Enter context name..."
              data-testid={`${dataTestId}-context-name-input`}
            />
          </div>

          {/* Permission Schema */}
          <div className="gba:space-y-2">
            <Label htmlFor="permissionSchema">Permission Schema</Label>
            <Input
              id="permissionSchema"
              value={permissionSchema}
              onChange={e => setPermissionSchema(e.target.value)}
              placeholder="Enter permission schema..."
              data-testid={`${dataTestId}-permission-schema-input`}
            />
          </div>

          {/* Context Data */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>Context Data</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddContextData}
                data-testid={`${dataTestId}-add-context-data-button`}
              >
                <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
                Add Context Data
              </Button>
            </div>
            {contextData.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Main Context</TableHead>
                    <TableHead className="gba:w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contextData.map((data, index) => (
                    <TableRow key={data.id}>
                      <TableCell>
                        <EditableCell
                          value={data.contextDataName}
                          onChange={value => handleContextDataChange(index, 'contextDataName', value)}
                          testId={`${dataTestId}-context-data-name-${index}`}
                          placeholder="Enter name"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableSelectCell
                          value={data.contextDataType}
                          onChange={value => handleContextDataChange(index, 'contextDataType', value)}
                          options={CONTEXT_DATA_TYPES}
                          testId={`${dataTestId}-context-data-type-${index}`}
                          placeholder="Select type"
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={data.mainContext}
                          onCheckedChange={checked => handleContextDataChange(index, 'mainContext', !!checked)}
                          data-testid={`${dataTestId}-context-data-main-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveContextData(index)}
                          data-testid={`${dataTestId}-context-data-delete-${index}`}
                        >
                          <Trash className="gba:h-4 gba:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Actions */}
          <div className="gba:space-y-2">
            <Label>Actions</Label>
            <EditableComboboxCell
              value={selectedActionIds}
              onChange={value => setSelectedActionIds(Array.isArray(value) ? value : [])}
              options={actionOptions}
              testId={`${dataTestId}-actions-select`}
              mode="multiple"
              placeholder="Select actions..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !contextName.trim()}
            data-testid={`${dataTestId}-save-button`}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
