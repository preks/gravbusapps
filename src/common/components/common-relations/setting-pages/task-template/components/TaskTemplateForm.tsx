import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Form
} from '@newwork/nw-design-system'
import { CatalogSelectProvider } from '@/components/catalog-select'
import ScheduleFormSegment from './ScheduleFormSegment'
import DetailFormSegment from './DetailFormSegment'
import { TaskTemplateFormProps, TaskTemplateFormData } from '../types'

export const TaskTemplateForm: React.FC<
  TaskTemplateFormProps & {
    businessAppContext?: any
    hasEventConfig?: boolean
    catalogConfigs?: Array<{
      id: string
      catalogIdentifier: string
      prefetch?: boolean
      pageSize?: number
      parentField?: string
      childField?: string
      filterField?: Array<{ from: string; on: string }>
    }>
  }
> = ({
  isOpen,
  onClose,
  onSave,
  editingTemplate,
  renderAdditionalFields,
  dataTestId,
  catalogConfigs = [],
  businessAppContext,
  taskTypeCatalogId = 'SalesTaskType',
  taskPriorityCatalogId = 'SalesTaskPriority',
  hasEventConfig = false,
  assigneeTypes = [],
  holidayPolicies = []
}) => {
  const form = useForm<TaskTemplateFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      schedulingType: hasEventConfig ? 'EVENTS' : 'ONCE',
      typeRef: '',
      priorityRef: '',
      assigneeType: assigneeTypes[0]?.value || '',
      isActive: true,
      activeFrom: '',
      activeTo: '',
      recurringSchedule: {
        daysOfWeek: {},
        daysOfMonth: {},
        monthsOfYear: {},
        intervalDays: 0,
        holidayPolicy: holidayPolicies[0]?.value || ''
      },
      nextStartDate: '',
      investmentGroupRef: '',
      investmentTypeRef: ''
    },
    mode: 'onChange'
  })

  // Reset form when editing template changes
  useEffect(() => {
    if (editingTemplate) {
      const additionalProps = (editingTemplate.additionalProperties as any) || {}

      const formData = {
        code: editingTemplate.code || '',
        name: editingTemplate.name || '',
        description: editingTemplate.description || '',
        schedulingType: additionalProps.schedulingType || 'ONCE',
        typeRef: editingTemplate.typeRef || '',
        priorityRef: editingTemplate.priorityRef || '',
        assigneeType: (editingTemplate.assigneeType as any) || assigneeTypes[0]?.value || '',
        isActive: editingTemplate.isActive ?? true,
        activeFrom: (editingTemplate as any).activeFrom || '',
        activeTo: (editingTemplate as any).activeTo || '',
        recurringSchedule: editingTemplate.recurringSchedule || {
          daysOfWeek: editingTemplate.daysOfWeek || {},
          daysOfMonth: editingTemplate.daysOfMonth || {},
          monthsOfYear: editingTemplate.monthsOfYear || {},
          intervalDays: editingTemplate.intervalDays || 0,
          holidayPolicy: editingTemplate.holidayPolicy || holidayPolicies[0]?.value || ''
        },
        nextStartDate: (editingTemplate as any).nextStartDate || '',
        // Additional domain-specific fields from additionalProperties
        investmentGroupRef: additionalProps.investmentGroupRef || '',
        investmentTypeRef: additionalProps.investmentTypeRef || ''
      }

      form.reset(formData)
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        schedulingType: hasEventConfig ? 'EVENTS' : 'ONCE',
        typeRef: '',
        priorityRef: '',
        assigneeType: assigneeTypes[0]?.value || '',
        isActive: true,
        activeFrom: '',
        activeTo: '',
        recurringSchedule: {
          daysOfWeek: {},
          daysOfMonth: {},
          monthsOfYear: {},
          intervalDays: 0,
          holidayPolicy: holidayPolicies[0]?.value || ''
        },
        nextStartDate: '',
        investmentGroupRef: '',
        investmentTypeRef: ''
      })
    }
  }, [editingTemplate, form, assigneeTypes, holidayPolicies, hasEventConfig])

  const handleSubmit = async (data: TaskTemplateFormData) => {
    try {
      await onSave(data)
    } catch (error) {
      console.error('Error saving task template:', error)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => (open ? undefined : handleClose())}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle data-testid={`${dataTestId}-title`}>
            {editingTemplate ? 'Edit Task Template' : 'Create Task Template'}
          </DialogTitle>
          <DialogDescription>
            {editingTemplate
              ? 'Update the task template details below.'
              : 'Create a new task template with scheduling and assignment rules.'}
          </DialogDescription>
        </DialogHeader>

        <CatalogSelectProvider
          {...businessAppContext}
          configs={catalogConfigs.length > 0 ? catalogConfigs : []}
          externalValues={{
            [taskTypeCatalogId]: form.watch('typeRef'),
            [taskPriorityCatalogId]: form.watch('priorityRef')
          }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
              <DetailFormSegment
                form={form}
                dataTestId={dataTestId}
                taskTypeCatalogId={taskTypeCatalogId}
                taskPriorityCatalogId={taskPriorityCatalogId}
                assigneeTypes={assigneeTypes}
              />

              {/* Recurring Schedule Section */}
              <div className="gba:space-y-4">
                <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">Recurring Schedule</h3>
                <ScheduleFormSegment
                  value={form.watch('recurringSchedule')}
                  onChange={value => form.setValue('recurringSchedule', value)}
                  dataTestId={`${dataTestId}-schedule`}
                  schedulingType={form.watch('schedulingType') as any}
                  onSchedulingTypeChange={t => form.setValue('schedulingType', t)}
                  nextStartDate={form.watch('nextStartDate')}
                  onNextStartDateChange={v => form.setValue('nextStartDate', v)}
                  hasEventConfig={hasEventConfig}
                  holidayPolicies={holidayPolicies}
                />
                {renderAdditionalFields?.(form)}
              </div>

              {/* Assignment section removed; Assignee Type moved to Basic Information */}

              {/* Advanced section removed as interval days and holiday policy are part of Schedule */}

              {/* Form Actions */}
              <div className="gba:flex gba:justify-end gba:space-x-2 gba:pt-4 gba:border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  data-testid={`${dataTestId}-cancel-button`}
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid={`${dataTestId}-save-button`}>
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </Form>
        </CatalogSelectProvider>
      </DialogContent>
    </Dialog>
  )
}
