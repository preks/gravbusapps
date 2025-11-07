import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Form,
  FormField,
  FormItem,
  Label,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useEmployeeSearch } from './hooks/useEmployeeSearch'

const formSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional(),
  startAssetConditionRef: z.string().optional(),
  notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

const AllocateAssetContent: React.FC<BusinessAppContextProps> = (context: BusinessAppContextProps) => {
  const { additionalData } = context
  const assetId =
    additionalData?.assetId ||
    additionalData?.psi_taskPayload?.assetId ||
    additionalData?.psi_taskPayload?.initialParameters?.assetId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.assetId ||
    null

  const existingAsset =
    additionalData?.asset ||
    additionalData?.psi_taskPayload?.asset ||
    additionalData?.psi_taskPayload?.initialParameters?.asset ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.asset ||
    null

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    searchEmployees
  } = useEmployeeSearch(context.accessToken)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      employeeId: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      startAssetConditionRef: '',
      notes: ''
    }
  })

  const defaultValues: FormValues = useMemo(
    () => ({
      employeeId: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      startAssetConditionRef: '',
      notes: ''
    }),
    []
  )

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:equipment.allocate_asset_form', 'Allocate Asset'),
    []
  )

  const isSubmitDisabled = useMemo(() => {
    return isSubmitting || employeesLoading || !form.formState.isValid
  }, [isSubmitting, employeesLoading, form.formState.isValid])

  const handleSubmit = async (values: FormValues) => {
    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    if (!values.employeeId?.trim()) {
      throw new Error('Employee is required')
    }

    const employeeAssetPayload: any = {
      startDate: values.startDate,
      employee: values.employeeId,
      asset: assetId
    }

    if (values.expectedEndDate) {
      employeeAssetPayload.expectedEndDate = values.expectedEndDate
    }

    if (values.startAssetConditionRef) {
      employeeAssetPayload.startAssetConditionRef = values.startAssetConditionRef
    }

    if (values.notes) {
      employeeAssetPayload.notes = values.notes
    }

    return {
      employeeAsset: employeeAssetPayload
    }
  }

  const handleEmployeeSearch = (value: string) => {
    setSearchQuery(value)
    if (value.length >= 2 || value.length === 0) {
      searchEmployees(value)
    }
  }

  const filteredEmployees = employees.filter(
    emp => !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const assetDisplayName = existingAsset
    ? `${existingAsset.assetBrand?.value || ''} ${existingAsset.model || ''}`.trim()
    : 'Asset'

  const formFields = (
    <div className="gba:flex-1 gba:space-y-4">
      {existingAsset && (
        <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">Asset: {assetDisplayName}</p>
          <p className="gba:text-xs gba:text-muted-foreground">Serial: {existingAsset.serialNumber || 'N/A'}</p>
        </div>
      )}

      <FormField
        control={form.control}
        name="employeeId"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="employeeId" data-testid="employee-label">
              Employee *
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={employeesLoading}>
              <SelectTrigger id="employeeId" data-testid="employee-select">
                <SelectValue placeholder={employeesLoading ? 'Loading employees...' : 'Select an employee'} />
              </SelectTrigger>
              <SelectContent>
                <div className="gba:p-2">
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={e => handleEmployeeSearch(e.target.value)}
                    className="gba:mb-2"
                  />
                </div>
                {filteredEmployees.length === 0 ? (
                  <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                    {employeesLoading ? 'Loading...' : 'No employees found'}
                  </div>
                ) : (
                  filteredEmployees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id} data-testid={`employee-option-${employee.id}`}>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium">{employee.name}</span>
                        {(employee.jobTitle || employee.department) && (
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {[employee.jobTitle, employee.department].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {employeesError && <p className="gba:text-sm gba:text-destructive">{employeesError}</p>}
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="startDate" data-testid="start-date-label">
              Allocation Start Date *
            </Label>
            <Input
              id="startDate"
              type="date"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="start-date-input"
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expectedEndDate"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="expectedEndDate" data-testid="expected-end-date-label">
              Expected Return Date
            </Label>
            <Input
              id="expectedEndDate"
              type="date"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="expected-end-date-input"
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="notes" data-testid="notes-label">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this allocation..."
              className="gba:min-h-[80px] gba:w-full"
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              data-testid="notes-textarea"
            />
          </FormItem>
        )}
      />
    </div>
  )

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full"
      data-testid="allocate-asset-container"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='allocate-asset-form']]:!py-0"
        data-testid="allocate-asset-form-content"
      >
        <AppActionForm
          processType="create"
          form={form as any}
          formData={defaultValues}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="allocate-asset-submit-button"
          cancelButtonTestId="allocate-asset-cancel-button"
          isSubmitDisabled={isSubmitDisabled}
          submitButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:equipment.allocate_asset', 'Allocate Asset')}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.initiate_cancel_button',
            'Cancel'
          )}
          onSubmit={handleSubmit}
          disableFormSubmission={true}
          customActions={
            <div className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4">
              <Button
                variant="outline"
                data-testid="allocate-asset-cancel-button"
                type="button"
                onClick={() => {
                  dispatchProcessContinueEvent('pse_abort', {})
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
              </Button>
              <Button
                data-testid="allocate-asset-submit-button"
                type="button"
                variant="default"
                disabled={isSubmitDisabled}
                onClick={async () => {
                  if (isSubmitting) return
                  const isValid = await form.trigger()
                  if (!isValid) {
                    return
                  }
                  setIsSubmitting(true)
                  try {
                    const values = form.getValues()
                    const result = await handleSubmit(values)
                    dispatchProcessContinueEvent('pse_submit', result)
                  } catch (error) {
                    setIsSubmitting(false)
                    throw error
                  }
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:equipment.allocate_asset', 'Allocate Asset')}
              </Button>
            </div>
          }
          data-testid="allocate-asset-form"
        >
          <Form {...(form as any)}>{formFields}</Form>
        </AppActionForm>
      </div>
    </div>
  )
}

export const AllocateAsset: React.FC<BusinessAppContextProps> = context => {
  return <AllocateAssetContent {...context} />
}

export default AllocateAsset
