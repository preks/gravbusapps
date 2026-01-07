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
  SelectValue,
  Checkbox
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface ConditionFormData {
  name: string
  description: string
  generate_task: boolean
  checked_type: 'Automated' | 'User' | 'Manager' | 'Owner'
  deadline_enabled: boolean
  deadline_duration: number
  deadline_duration_measurement_unit_ref: string
}

interface ConditionFormProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingCondition?: any
  selectedStage: any
  catalogConfig: {
    conditionCatalog: string
    version?: string
  }
  prefixDataTestId?: string
}

const CHECKED_TYPE_OPTIONS = [
  { value: 'Automated', label: 'Automated' },
  { value: 'User', label: 'User' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Owner', label: 'Owner' }
]

const ConditionForm: React.FC<ConditionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCondition,
  selectedStage,
  catalogConfig,
  accessToken
}) => {
  const [operationLoading, setOperationLoading] = useState(false)
  const catalogClient = useCatalogManagerClient(accessToken)

  const form = useForm<ConditionFormData>({
    defaultValues: {
      name: '',
      description: '',
      generate_task: false,
      checked_type: 'User',
      deadline_enabled: false,
      deadline_duration: 1,
      deadline_duration_measurement_unit_ref: ''
    }
  })

  const handleCreateCondition = async (data: ConditionFormData) => {
    if (!selectedStage) return

    try {
      setOperationLoading(true)

      // Auto-generate code from condition name
      const code = `CONDITION_${Date.now()}`
      const newRank = 1 // Will be calculated based on existing conditions

      const newConditionEntry = {
        code: code,
        value: data.name,
        alternativeCode: 'CONDITION',
        parentEntryId: selectedStage.id,
        additionalValue1: newRank.toString(),
        displayOrder: newRank,
        additionalValue2: undefined,
        additionalValue3: undefined,
        objectValue: {
          description: data.description,
          generateTask: data.generate_task,
          check_type: data.checked_type,
          deadline_enabled: data.deadline_enabled,
          deadline_duration: data.deadline_duration,
          deadline_duration_measurement_unit_ref: data.deadline_duration_measurement_unit_ref
        },
        translations: []
      }

      await catalogClient.createCatalogEntry(
        catalogConfig.conditionCatalog,
        catalogConfig.version || 'v1',
        newConditionEntry
      )

      onClose()
      form.reset()
      onSuccess()
    } catch (err) {
      console.error('Error creating condition:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleUpdateCondition = async (data: ConditionFormData) => {
    if (!editingCondition || !selectedStage) return

    try {
      setOperationLoading(true)

      // Fetch the current condition data to preserve all fields
      const currentCondition = await catalogClient.getCatalogEntryById(editingCondition.id)

      const updateData = {
        id: editingCondition.id,
        code: editingCondition.code,
        value: data.name,
        alternativeCode: 'CONDITION',
        parentEntryId: selectedStage.id,
        displayOrder: editingCondition.displayOrder,
        additionalValue1: editingCondition.additionalValue1,
        additionalValue2: currentCondition.additionalValue2 || undefined,
        additionalValue3: currentCondition.additionalValue3 || undefined,
        objectValue: {
          description: data.description,
          generateTask: data.generate_task,
          check_type: data.checked_type,
          deadline_enabled: data.deadline_enabled,
          deadline_duration: data.deadline_duration,
          deadline_duration_measurement_unit_ref: data.deadline_duration_measurement_unit_ref
        }
      }

      await catalogClient.updateCatalogEntry(
        catalogConfig.conditionCatalog,
        catalogConfig.version || 'v1',
        editingCondition.id,
        updateData
      )

      onClose()
      form.reset()
      onSuccess()
    } catch (err) {
      console.error('Error updating condition:', err)
    } finally {
      setOperationLoading(false)
    }
  }

  const handleSubmit = editingCondition ? handleUpdateCondition : handleCreateCondition

  // Reset form when modal opens/closes or editing condition changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingCondition) {
        form.reset({
          name: editingCondition.value,
          description: editingCondition.objectValue?.description || editingCondition.additionalValue1 || '',
          generate_task: editingCondition.objectValue?.generateTask || false,
          checked_type: editingCondition.objectValue?.check_type || 'User',
          deadline_enabled: editingCondition.objectValue?.deadline_enabled || false,
          deadline_duration: editingCondition.objectValue?.deadline_duration || 1,
          deadline_duration_measurement_unit_ref:
            editingCondition.objectValue?.deadline_duration_measurement_unit_ref || ''
        })
      } else {
        form.reset({
          name: '',
          description: '',
          generate_task: false,
          checked_type: 'User',
          deadline_enabled: false,
          deadline_duration: 1,
          deadline_duration_measurement_unit_ref: ''
        })
      }
    }
  }, [isOpen, editingCondition, form])

  const getSubmitButtonText = () => {
    if (operationLoading) return 'Saving...'
    if (editingCondition) return 'Update Condition'
    return 'Create Condition'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCondition ? 'Edit Condition' : 'Create New Condition'}</DialogTitle>
          <DialogDescription>
            {editingCondition
              ? 'Update the condition information below.'
              : `Add a new condition for stage: ${selectedStage?.value}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
            {/* Basic Information Section */}
            <div className="gba:space-y-4">
              <h4 className="gba:font-medium gba:text-gray-900 gba:text-sm gba:border-b gba:border-gray-200 gba:pb-2">
                Basic Information
              </h4>

              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Please enter a condition name' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Please Enter..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Please Enter..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Configuration Section */}
            <div className="gba:space-y-4">
              <h4 className="gba:font-medium gba:text-gray-900 gba:text-sm gba:border-b gba:border-gray-200 gba:pb-2">
                Configuration
              </h4>

              <FormField
                control={form.control}
                name="checked_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checked By</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select who checks this condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHECKED_TYPE_OPTIONS.map(option => (
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

              <FormField
                control={form.control}
                name="generate_task"
                render={({ field }) => (
                  <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="gba:space-y-1 gba:leading-none">
                      <FormLabel>Generate Task</FormLabel>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        Automatically create a task when this condition is met
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline_enabled"
                render={({ field }) => (
                  <FormItem className="gba:flex gba:flex-row gba:items-start gba:space-x-3 gba:space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="gba:space-y-1 gba:leading-none">
                      <FormLabel>Enable Deadline</FormLabel>
                      <p className="gba:text-sm gba:text-muted-foreground">Set a deadline for this condition</p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('deadline_enabled') && (
                <FormField
                  control={form.control}
                  name="deadline_duration"
                  rules={{ min: 1 }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline Duration (Days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          onChange={e => field.onChange(Number.parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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

export default ConditionForm
