import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface StageFormData {
  value: string
  type: string
}

interface StageFormProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingStage?: any
  pipeline: any
  catalogConfig: {
    stageCatalog: string
    version?: string
  }
  prefixDataTestId?: string
}

const STAGE_TYPE_OPTIONS = [
  { value: 'DISCOVERY', label: 'Discovery' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' }
]

const StageForm: React.FC<StageFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingStage,
  pipeline,
  catalogConfig,
  accessToken
}) => {
  const [operationLoading, setOperationLoading] = useState(false)
  const catalogClient = useCatalogManagerClient(accessToken)

  const form = useForm<StageFormData>({
    defaultValues: {
      value: '',
      type: 'DISCOVERY'
    }
  })

  const handleCreateStage = async (data: StageFormData) => {
    if (!pipeline) return

    try {
      setOperationLoading(true)

      // Auto-generate code from stage name
      const code = data.value.toUpperCase().replaceAll(/[^A-Z0-9]/g, '_')
      const displayOrder = 1 // Will be calculated based on existing stages

      const newStageEntry = {
        code: code,
        value: data.value,
        type: data.type,
        alternativeCode: data.type, // Set alternativeCode as fallback for type
        parentEntryId: pipeline.id,
        displayOrder: displayOrder,
        additionalValue1: displayOrder.toString().padStart(2, '0'),
        additionalValue2: undefined,
        additionalValue3: undefined,
        objectValue: {},
        translations: []
      }

      await catalogClient.createCatalogEntry(catalogConfig.stageCatalog, catalogConfig.version || 'v1', newStageEntry)

      onClose()
      form.reset()
      onSuccess()
    } catch (err) {
      console.error('Error creating stage:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleUpdateStage = async (data: StageFormData) => {
    if (!editingStage) return

    try {
      setOperationLoading(true)

      // Fetch the current stage data to preserve all fields
      const currentStage = await catalogClient.getCatalogEntryById(editingStage.id)

      const updateData = {
        id: editingStage.id,
        code: editingStage.code,
        value: data.value,
        type: data.type,
        alternativeCode: data.type,
        parentEntryId: editingStage.parentEntryId || currentStage.parentEntryId,
        displayOrder: editingStage.displayOrder || currentStage.displayOrder,
        additionalValue1:
          editingStage.displayOrder?.toString().padStart(2, '0') || currentStage.additionalValue1 || '01',
        additionalValue2: currentStage.additionalValue2 || undefined,
        additionalValue3: currentStage.additionalValue3 || undefined,
        objectValue: editingStage.objectValue || currentStage.objectValue || {}
      }

      await catalogClient.updateCatalogEntry(
        catalogConfig.stageCatalog,
        catalogConfig.version || 'v1',
        editingStage.id,
        updateData
      )

      onClose()
      form.reset()
      onSuccess()
    } catch (err) {
      console.error('Error updating stage:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleSubmit = editingStage ? handleUpdateStage : handleCreateStage

  // Reset form when modal opens/closes or editing stage changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingStage) {
        form.reset({
          value: editingStage.value,
          type: editingStage.type || editingStage.alternativeCode || 'DISCOVERY'
        })
      } else {
        form.reset({
          value: '',
          type: 'DISCOVERY'
        })
      }
    }
  }, [isOpen, editingStage, form])

  const getSubmitButtonText = () => {
    if (operationLoading) return 'Saving...'
    if (editingStage) return 'Update Stage'
    return 'Create Stage'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingStage ? 'Edit Stage' : 'Create New Stage'}</DialogTitle>
          <DialogDescription>
            {editingStage ? 'Update the stage information below.' : 'Enter the stage details below.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-4">
            <FormField
              control={form.control}
              name="value"
              rules={{ required: 'Stage name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter stage name..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              rules={{ required: 'Stage type is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STAGE_TYPE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={operationLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={operationLoading}>
                {getSubmitButtonText()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default StageForm
