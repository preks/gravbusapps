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
import { EventAndScopeFormSegment } from './EventAndScopeFormSegment'
import { TaskTemplateFormProps, TaskTemplateFormData } from '../types'
import {
  formSchedulingTypeForInput,
  normalizeTaskTemplateLinkageForForm,
  parseTaskTemplateExtensions
} from '../taskTemplateExtensions'
import { instantOrDateToDateInputValue } from '../taskTemplateDatePayload'

const defaultFormValues = (
  assigneeTypes: TaskTemplateFormProps['assigneeTypes'],
  holidayPolicies: TaskTemplateFormProps['holidayPolicies']
): TaskTemplateFormData => ({
  code: '',
  name: '',
  description: '',
  schedulingType: 'ONCE',
  typeRef: '',
  priorityRef: '',
  assigneeType: assigneeTypes?.[0]?.value || '',
  isActive: true,
  activeFrom: '',
  activeTo: '',
  recurringSchedule: {
    daysOfWeek: {},
    daysOfMonth: {},
    monthsOfYear: {},
    intervalDays: 0,
    holidayPolicy: holidayPolicies?.[0]?.value || ''
  },
  nextStartDate: '',
  eventTriggerEnabled: true,
  eventSourceEntityType: '',
  scopeLimited: false,
  scopedEntityType: '',
  scopedEntityId: '',
  eventInvestmentGroupRef: '',
  eventInvestmentTypeRef: ''
})

export const TaskTemplateForm: React.FC<
  TaskTemplateFormProps & {
    businessAppContext?: any
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
  templateEntityConfig,
  assigneeTypes = [],
  holidayPolicies = []
}) => {
  const form = useForm<TaskTemplateFormData>({
    defaultValues: defaultFormValues(assigneeTypes, holidayPolicies),
    mode: 'onChange'
  })

  useEffect(() => {
    if (editingTemplate) {
      const ext = parseTaskTemplateExtensions(editingTemplate.additionalProperties)
      const schedulingType = formSchedulingTypeForInput(ext)
      const link = normalizeTaskTemplateLinkageForForm(ext)
      const scopeMode = link.scopeLimited

      const formData: TaskTemplateFormData = {
        code: editingTemplate.code || '',
        name: editingTemplate.name || '',
        description: editingTemplate.description || '',
        schedulingType,
        typeRef: editingTemplate.typeRef || '',
        priorityRef: editingTemplate.priorityRef || '',
        assigneeType: (editingTemplate.assigneeType as string) || assigneeTypes[0]?.value || '',
        isActive: editingTemplate.isActive ?? true,
        activeFrom: instantOrDateToDateInputValue(editingTemplate.activeFrom),
        activeTo: instantOrDateToDateInputValue(editingTemplate.activeTo),
        recurringSchedule: editingTemplate.recurringSchedule || {
          daysOfWeek: editingTemplate.daysOfWeek || {},
          daysOfMonth: editingTemplate.daysOfMonth || {},
          monthsOfYear: editingTemplate.monthsOfYear || {},
          intervalDays: editingTemplate.intervalDays || 0,
          holidayPolicy: editingTemplate.holidayPolicy || holidayPolicies[0]?.value || ''
        },
        nextStartDate: instantOrDateToDateInputValue(editingTemplate.nextStartDate),
        eventTriggerEnabled: link.eventTriggerEnabled,
        eventSourceEntityType: scopeMode ? '' : ext.eventSourceEntityType,
        scopeLimited: link.scopeLimited,
        scopedEntityType: scopeMode ? ext.scopedEntityType : '',
        scopedEntityId: scopeMode ? ext.scopedEntityId : '',
        eventInvestmentGroupRef: scopeMode ? '' : ext.eventInvestmentGroupRef,
        eventInvestmentTypeRef: scopeMode ? '' : ext.eventInvestmentTypeRef
      }

      form.reset(formData)
    } else {
      form.reset(defaultFormValues(assigneeTypes, holidayPolicies))
    }
  }, [editingTemplate, form, assigneeTypes, holidayPolicies])

  const handleSubmit = async (data: TaskTemplateFormData) => {
    if (data.scopeLimited === data.eventTriggerEnabled) {
      form.setError('scopeLimited', {
        type: 'manual',
        message: 'Choose exactly one: one specific record or domain events.'
      })
      return
    }
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
              : 'Create a new task template with scheduling, optional domain events, and assignment rules.'}
          </DialogDescription>
        </DialogHeader>

        <CatalogSelectProvider
          {...businessAppContext}
          configs={catalogConfigs.length > 0 ? catalogConfigs : []}
          externalValues={{
            [taskTypeCatalogId]: form.watch('typeRef'),
            [taskPriorityCatalogId]: form.watch('priorityRef'),
            ...(templateEntityConfig?.showInvestmentEventFilters
              ? {
                  InvestmentGroup: form.watch('eventInvestmentGroupRef'),
                  InvestmentType: form.watch('eventInvestmentTypeRef')
                }
              : {})
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

              <div className="gba:space-y-4">
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Recurring Schedule</h3>
                <ScheduleFormSegment
                  value={form.watch('recurringSchedule')}
                  onChange={value => form.setValue('recurringSchedule', value)}
                  dataTestId={`${dataTestId}-schedule`}
                  schedulingType={form.watch('schedulingType')}
                  onSchedulingTypeChange={t => form.setValue('schedulingType', t)}
                  nextStartDate={form.watch('nextStartDate')}
                  onNextStartDateChange={v => form.setValue('nextStartDate', v)}
                  holidayPolicies={holidayPolicies}
                />
                {renderAdditionalFields?.(form)}
              </div>

              {templateEntityConfig && (
                <EventAndScopeFormSegment
                  form={form}
                  dataTestId={dataTestId}
                  config={{
                    ...templateEntityConfig,
                    prefixDataTestId: templateEntityConfig.prefixDataTestId || dataTestId
                  }}
                />
              )}

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
