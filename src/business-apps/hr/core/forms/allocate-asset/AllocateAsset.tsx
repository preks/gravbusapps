import React, { useMemo, useState, useEffect, useCallback } from 'react'
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
  Textarea,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import dayjs from 'dayjs'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useEmployeeSearch } from './hooks/useEmployeeSearch'
import { useRoomOptions } from './hooks/useRoomOptions'
import { AssetProcessClient, CreateEmployeeAssetPayload } from '../../apps/assets/services/AssetProcessClient'
import { AssetStatus } from '../../apps/assets/types'
import { useAssetConditionCatalog } from '../equipment-registration/hooks/useAssetConditionCatalog'
import { useAssetFormData } from '../return-asset/hooks/useAssetFormData'
import { useAssetVersion } from '../return-asset/hooks/useAssetVersion'
import { dispatchProcessCompletionEvents } from '../return-asset/utils/processEventUtils'
import { useAssetService } from '../../apps/assets/services/useAssetService'
import assetsTranslations from '../../apps/assets/_i18n'

type AllocationTarget = 'EMPLOYEE' | 'WORKPLACE'

type FormValues = {
  allocationTarget: AllocationTarget
  employeeId: string
  roomId: string
  startDate: string
  expectedEndDate?: string
  startAssetConditionRef?: string
  notes?: string
}

const AllocateAssetContent: React.FC<BusinessAppContextProps> = (context: BusinessAppContextProps) => {
  const { additionalData, userInfo } = context
  const { assetId, existingAsset, assetVersion, assetDisplayName } = useAssetFormData(additionalData)
  const { resolveAssetVersion } = useAssetVersion(context, {
    assetId,
    existingAsset,
    fallbackVersion: assetVersion
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())
  const [allocationError, setAllocationError] = React.useState<string | null>(null)

  const { t } = useTranslation(assetsTranslations)
  const { getAllocationsForAsset, deallocateAsset } = useAssetService(context)

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()

    const interval = setInterval(checkLocale, 500)

    return () => clearInterval(interval)
  }, [currentLocale])

  const acquisitionDate = existingAsset?.acquisitionDate

  const issueDateBeforePurchaseMessage = t('issue-date-not-before-purchase')

  const isStartDateBeforeAcquisition = useCallback(
    (startDateStr: string): boolean => {
      if (!startDateStr || !acquisitionDate) return false
      let start = dayjs(startDateStr).startOf('day')
      if (!start.isValid() && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(startDateStr.trim())) {
        const [d, m, y] = startDateStr.split('/').map(Number)
        start = dayjs(new Date(y, m - 1, d))
      }
      const acquisition = dayjs(acquisitionDate).startOf('day')
      if (!start.isValid() || !acquisition.isValid()) return false
      return start.isBefore(acquisition)
    },
    [acquisitionDate]
  )

  const formSchema = useMemo(
    () =>
      z
        .object({
          allocationTarget: z.enum(['EMPLOYEE', 'WORKPLACE']),
          employeeId: z.string(),
          roomId: z.string(),
          startDate: z
            .string()
            .min(
              1,
              getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.start_date_required', 'Start date is required')
            ),
          expectedEndDate: z.string().optional(),
          startAssetConditionRef: z.string().optional(),
          notes: z.string().optional()
        })
        .superRefine((data, ctx) => {
          if (data.allocationTarget === 'EMPLOYEE' && !data.employeeId?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['employeeId'],
              message: t('please_select_employee')
            })
          }

          if (data.allocationTarget === 'WORKPLACE' && !data.roomId?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['roomId'],
              message: t('please_select_room')
            })
          }
        })
        .refine(
          data => {
            if (!data.startDate || !acquisitionDate) return true
            return !isStartDateBeforeAcquisition(data.startDate)
          },
          { message: issueDateBeforePurchaseMessage, path: ['startDate'] }
        ),
    [currentLocale, acquisitionDate, isStartDateBeforeAcquisition, issueDateBeforePurchaseMessage, t]
  )

  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    searchEmployees
  } = useEmployeeSearch(context.accessToken)

  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    client.setAccessToken(context.accessToken)
    return client
  }, [context.accessToken])

  const { options: conditionOptions, isLoading: conditionsLoading } = useAssetConditionCatalog(context)

  const defaultStartDate = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    if (!acquisitionDate) return today
    const acquisitionStr = dayjs(acquisitionDate).format('YYYY-MM-DD')
    return dayjs(today).isBefore(dayjs(acquisitionStr), 'day') ? acquisitionStr : today
  }, [acquisitionDate])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      allocationTarget: 'EMPLOYEE',
      employeeId: '',
      roomId: '',
      startDate: defaultStartDate,
      expectedEndDate: '',
      startAssetConditionRef: '',
      notes: ''
    }
  })

  const allocationTarget = form.watch('allocationTarget')
  const {
    rooms,
    isLoading: roomsLoading,
    error: roomsError
  } = useRoomOptions(context.accessToken, allocationTarget === 'WORKPLACE', t('rooms-load-error'))

  useEffect(() => {
    if (allocationTarget === 'EMPLOYEE') {
      form.setValue('roomId', '', { shouldValidate: true })
      return
    }

    form.setValue('employeeId', '', { shouldValidate: true })
  }, [allocationTarget, form])

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset_form', 'Allocate Asset'),
    [currentLocale]
  )

  const allocateButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset', 'Allocate Asset'),
    [currentLocale]
  )

  const cancelButtonText = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel'),
    [currentLocale]
  )

  const isSubmitDisabled = useMemo(() => {
    const isTargetLoading = allocationTarget === 'EMPLOYEE' ? employeesLoading : roomsLoading
    return isSubmitting || isTargetLoading || conditionsLoading || !form.formState.isValid
  }, [isSubmitting, allocationTarget, employeesLoading, roomsLoading, conditionsLoading, form.formState.isValid])

  const handleEmployeeSearch = (value: string) => {
    setSearchQuery(value)
    if (value.length >= 2 || value.length === 0) {
      searchEmployees(value)
    }
  }

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
  }

  const handleSearchInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation()
  }

  const filteredEmployees = employees.filter(
    emp => !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const checkAllocationOverlap = React.useCallback(
    async (startDate: string, expectedEndDate?: string) => {
      if (!assetId) return null

      try {
        const existingAllocations = await getAllocationsForAsset(assetId)
        const newStart = new Date(startDate)
        newStart.setHours(0, 0, 0, 0)
        const newEnd = expectedEndDate ? new Date(expectedEndDate) : null
        if (newEnd) {
          newEnd.setHours(0, 0, 0, 0)
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // New allocation start must be on or after the latest recorded return date
        let latestReturnDate: Date | null = null
        for (const allocation of existingAllocations) {
          if (allocation.isDeleted || !allocation.endDate) continue
          const end = new Date(allocation.endDate)
          if (Number.isNaN(end.getTime())) continue
          end.setHours(0, 0, 0, 0)
          if (!latestReturnDate || end > latestReturnDate) {
            latestReturnDate = end
          }
        }
        if (latestReturnDate && newStart < latestReturnDate) {
          const minDateStr = formatDate(latestReturnDate, 'date.short') ?? latestReturnDate.toLocaleDateString()
          return getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.start-date-not-before-last-return',
            `Allocation start date must be on or after the last return date (${minDateStr}).`
          )
        }

        for (const allocation of existingAllocations) {
          if (allocation.isDeleted) continue
          if (allocation.endDate) continue
          if (!allocation.startDate || allocation.startDate.trim() === '') continue
          const existingStart = new Date(allocation.startDate)
          if (Number.isNaN(existingStart.getTime())) continue
          existingStart.setHours(0, 0, 0, 0)
          if (existingStart.getTime() === 0) continue

          if (allocation.expectedEndDate) {
            const expectedEnd = new Date(allocation.expectedEndDate)
            expectedEnd.setHours(0, 0, 0, 0)
            if (expectedEnd < today) continue
          }
          const existingEnd = allocation.expectedEndDate ? new Date(allocation.expectedEndDate) : null
          if (existingEnd) {
            existingEnd.setHours(0, 0, 0, 0)
          }

          if (newEnd === null && existingEnd === null) {
            return getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.multiple_open_allocations_error',
              'Cannot create multiple open-ended allocations for the same asset'
            )
          }

          const hasOverlap =
            (newEnd === null || newEnd >= existingStart) && (existingEnd === null || newStart <= existingEnd)

          if (hasOverlap) {
            const existingEndDateStr = existingEnd
              ? existingEnd.toLocaleDateString()
              : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.present', 'Present')

            const fromText = existingStart.toLocaleDateString()
            const toText = getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.to', 'to')

            return getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_assets.allocation_overlap_error',
              `This allocation overlaps with an existing allocation from ${fromText} ${toText} ${existingEndDateStr}`
            )
          }
        }

        return null
      } catch (error) {
        console.error('Error checking allocation overlap:', error)
        return null
      }
    },
    [assetId, getAllocationsForAsset]
  )

  const formFields = (
    <div className="gba:flex-1 gba:space-y-4">
      {existingAsset && (
        <div className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg">
          <p className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.asset', 'Asset')}: {assetDisplayName}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}:{' '}
            {existingAsset.serialNumber || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name="allocationTarget"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="allocationTarget" data-testid="allocation-target-label">
              {t('allocation_target')}
            </Label>
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="allocationTarget" data-testid="allocation-target-select" className="gba:w-full">
                <SelectValue placeholder={t('select_allocation_target')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE" data-testid="allocation-target-employee-option">
                  {t('allocation_target_employee')}
                </SelectItem>
                <SelectItem value="WORKPLACE" data-testid="allocation-target-workplace-option">
                  {t('allocation_target_workplace')}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {allocationTarget === 'EMPLOYEE' ? (
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="employeeId" data-testid="employee-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.employee', 'Employee')}
              </Label>
              <Select onValueChange={field.onChange} value={field.value} disabled={employeesLoading}>
                <style>{`#employeeId [data-job-title] { display: none !important; }`}</style>
                <SelectTrigger id="employeeId" data-testid="employee-select" className="gba:w-full">
                  <SelectValue
                    placeholder={
                      employeesLoading
                        ? getTranslationFromI18nKeyAndLabel(
                            'lowcoder:hr_assets.loading_employees',
                            'Loading employees...'
                          )
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.select_employee', 'Select an employee')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <div className="gba:p-2">
                    <Input
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:hr_assets.search_employees',
                        'Search employees...'
                      )}
                      value={searchQuery}
                      onChange={e => handleEmployeeSearch(e.target.value)}
                      onKeyDown={handleSearchInputKeyDown}
                      onClick={handleSearchInputClick}
                      onFocus={e => e.stopPropagation()}
                      className="gba:mb-2"
                      data-testid="employee-search-input"
                    />
                  </div>
                  {filteredEmployees.length === 0 ? (
                    <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                      {employeesLoading
                        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading', 'Loading...')
                        : getTranslationFromI18nKeyAndLabel(
                            'lowcoder:hr_assets.no_employees_found',
                            'No employees found'
                          )}
                    </div>
                  ) : (
                    filteredEmployees.map(employee => (
                      <SelectItem
                        key={employee.id}
                        value={employee.id}
                        data-testid={`employee-option-${employee.id}`}
                        textValue={employee.name}
                      >
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium">{employee.name}</span>
                          {employee.jobTitle && (
                            <span data-job-title className="gba:text-xs gba:text-muted-foreground">
                              {employee.jobTitle}
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
      ) : (
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="roomId" data-testid="room-label">
                {t('workplace_room')}
              </Label>
              <Select onValueChange={field.onChange} value={field.value} disabled={roomsLoading}>
                <SelectTrigger id="roomId" data-testid="room-select" className="gba:w-full">
                  <SelectValue placeholder={roomsLoading ? t('loading_rooms') : t('select_room')} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 ? (
                    <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                      {roomsLoading ? t('loading') : t('no_rooms_found')}
                    </div>
                  ) : (
                    rooms.map(room => (
                      <SelectItem key={room.id} value={room.id} data-testid={`room-option-${room.id}`}>
                        {room.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {roomsError && <p className="gba:text-sm gba:text-destructive">{roomsError}</p>}
            </FormItem>
          )}
        />
      )}

      <div className="gba:flex gba:gap-4 gba:items-start">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="gba:flex-1 gba:min-w-0">
              <Label htmlFor="startDate" data-testid="start-date-label">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocation_start_date', 'Allocation Start Date')}{' '}
                *
              </Label>
              <DateInput
                type="date"
                value={field.value || ''}
                onChange={(v: string | [string | null, string | null] | null) => {
                  const dateValue = typeof v === 'string' ? v : ''
                  field.onChange(dateValue)
                  setAllocationError(null)
                  form.clearErrors('startDate')
                  form.clearErrors('expectedEndDate')

                  if (dateValue) {
                    if (isStartDateBeforeAcquisition(dateValue)) {
                      form.setError('startDate', {
                        type: 'manual',
                        message: issueDateBeforePurchaseMessage
                      })
                      return
                    }
                    form.trigger('startDate')
                    const expectedEndDate = form.getValues('expectedEndDate')
                    checkAllocationOverlap(dateValue, expectedEndDate).then(error => {
                      if (error) {
                        setAllocationError(error)
                        form.setError('startDate', { type: 'manual', message: error })
                      } else {
                        form.clearErrors('startDate')
                        form.clearErrors('expectedEndDate')
                      }
                    })
                  }
                }}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
                  'Please Select'
                )}
                className="gba:w-full"
                data-testid="start-date-input"
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expectedEndDate"
          render={({ field }) => {
            const startDate = form.watch('startDate')

            return (
              <FormItem className="gba:flex-1 gba:min-w-0">
                <Label htmlFor="expectedEndDate" data-testid="expected-end-date-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.expected_return_date', 'Expected Return Date')}
                </Label>
                <DateInput
                  type="date"
                  value={field.value || ''}
                  onChange={(v: string | [string | null, string | null] | null) => {
                    const dateValue = typeof v === 'string' ? v : ''
                    field.onChange(dateValue)
                    setAllocationError(null)
                    form.clearErrors('startDate')
                    form.clearErrors('expectedEndDate')

                    if (dateValue && startDate) {
                      checkAllocationOverlap(startDate, dateValue).then(error => {
                        if (error) {
                          setAllocationError(error)
                          form.setError('expectedEndDate', { type: 'manual', message: error })
                        } else {
                          form.clearErrors('startDate')
                          form.clearErrors('expectedEndDate')
                        }
                      })
                    }
                  }}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
                    'Please Select'
                  )}
                  className="gba:w-full"
                  data-testid="expected-end-date-input"
                />
              </FormItem>
            )
          }}
        />
      </div>
      {(form.formState.errors.startDate?.message ||
        form.formState.errors.expectedEndDate?.message ||
        allocationError) && (
        <p className="gba:text-sm gba:font-medium gba:text-destructive gba:mt-1" data-testid="start-date-error">
          {form.formState.errors.startDate?.message ||
            form.formState.errors.expectedEndDate?.message ||
            allocationError}
        </p>
      )}

      <FormField
        control={form.control}
        name="startAssetConditionRef"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="startAssetConditionRef" data-testid="condition-start-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_assets.condition_at_allocation',
                'Condition at Allocation'
              )}
            </Label>
            <Select onValueChange={field.onChange} value={field.value} disabled={conditionsLoading}>
              <SelectTrigger id="startAssetConditionRef" data-testid="condition-start-select">
                <SelectValue
                  placeholder={
                    conditionsLoading
                      ? getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.loading_conditions',
                          'Loading conditions...'
                        )
                      : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.select_condition', 'Select condition')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.length === 0 ? (
                  <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                    {conditionsLoading
                      ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading', 'Loading...')
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.no_conditions_available',
                          'No conditions available'
                        )}
                  </div>
                ) : (
                  conditionOptions.map(condition => (
                    <SelectItem
                      key={condition.id}
                      value={condition.id}
                      data-testid={`condition-option-${condition.id}`}
                    >
                      {condition.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="notes" data-testid="notes-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.notes', 'Notes')}
            </Label>
            <Textarea
              id="notes"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_assets.allocation_notes_placeholder',
                'Any additional notes about this allocation...'
              )}
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
          formData={{}}
          onSubmit={async () => ({})}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          submitButtonTestId="allocate-asset-submit-button"
          cancelButtonTestId="allocate-asset-cancel-button"
          isSubmitDisabled={isSubmitDisabled}
          submitButtonText={allocateButtonText}
          cancelButtonText={cancelButtonText}
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
                {cancelButtonText}
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

                  const values = form.getValues()

                  if (values.startDate && acquisitionDate && isStartDateBeforeAcquisition(values.startDate)) {
                    form.setError('startDate', { type: 'manual', message: issueDateBeforePurchaseMessage })
                    return
                  }

                  if (values.startDate) {
                    const overlapError = await checkAllocationOverlap(values.startDate, values.expectedEndDate)
                    if (overlapError) {
                      setAllocationError(overlapError)
                      form.setError('startDate', { type: 'manual', message: overlapError })
                      return
                    }
                  }

                  setIsSubmitting(true)
                  let assetStatusUpdated = false

                  try {
                    if (!assetId) {
                      throw new Error(
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.asset_id_required',
                          'Asset ID is required'
                        )
                      )
                    }

                    if (values.allocationTarget === 'EMPLOYEE' && !values.employeeId?.trim()) {
                      throw new Error(
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.employee_required',
                          'Employee is required'
                        )
                      )
                    }

                    if (values.allocationTarget === 'WORKPLACE' && !values.roomId?.trim()) {
                      throw new Error(t('room_required'))
                    }

                    const currentAssetVersion = await resolveAssetVersion()

                    // Close any active allocation so only one person has the asset at a time
                    const allocations = await getAllocationsForAsset(assetId)
                    const newStartDate = values.startDate
                    const endDateForPrevious =
                      newStartDate && dayjs(newStartDate).isValid()
                        ? dayjs(newStartDate).subtract(1, 'day').format('YYYY-MM-DD')
                        : new Date().toISOString().slice(0, 10)
                    for (const alloc of allocations) {
                      if (!alloc.endDate) {
                        await deallocateAsset(alloc.id, alloc.version, endDateForPrevious)
                      }
                    }

                    const employeeAssetPayload: CreateEmployeeAssetPayload = {
                      startDate: values.startDate,
                      asset: assetId
                    }

                    if (values.allocationTarget === 'EMPLOYEE') {
                      employeeAssetPayload.employee = values.employeeId
                    } else {
                      employeeAssetPayload.room = values.roomId
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

                    const allocatorUserId = userInfo?.id ?? ''
                    const selectedEmployee =
                      values.allocationTarget === 'EMPLOYEE' ? employees.find(e => e.id === values.employeeId) : null
                    const employeeUserId = selectedEmployee?.userId ?? ''

                    if (!allocatorUserId) {
                      throw new Error(
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.allocator_user_required',
                          'Unable to identify the current user. Please sign in again.'
                        )
                      )
                    }

                    if (values.allocationTarget === 'EMPLOYEE' && !employeeUserId) {
                      throw new Error(
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:hr_assets.employee_user_required',
                          'The selected employee has no user account. Please select another employee or contact HR.'
                        )
                      )
                    }

                    const isWorkplaceAllocation = values.allocationTarget === 'WORKPLACE'
                    const processResponse = isWorkplaceAllocation
                      ? await assetProcessClient.createEmployeeAsset(employeeAssetPayload)
                      : await assetProcessClient.startAllocateAssetToEmployee({
                          employeeAsset: employeeAssetPayload,
                          allocatorUserId,
                          employeeUserId
                        })

                    if (isWorkplaceAllocation) {
                      await assetProcessClient.updateAsset({
                        id: assetId,
                        version: currentAssetVersion,
                        assetStatus: AssetStatus.ALLOCATED
                      })
                      assetStatusUpdated = true
                    }

                    dispatchProcessContinueEvent('pse_submit', {})

                    dispatchProcessCompletionEvents({
                      resolution: 'success',
                      processName: isWorkplaceAllocation ? 'createEmployeeAsset' : 'allocateAssetToEmployee',
                      domain: 'employee',
                      response: {
                        employeeAsset: {
                          id: processResponse?.id || processResponse?.employeeAsset?.id,
                          assetId: assetId,
                          ...(values.employeeId ? { employeeId: values.employeeId } : {}),
                          ...(values.roomId ? { roomId: values.roomId } : {})
                        },
                        asset: {
                          id: assetId,
                          version: currentAssetVersion,
                          assetStatus: isWorkplaceAllocation ? AssetStatus.ALLOCATED : AssetStatus.PENDING
                        }
                      }
                    })
                  } catch (error) {
                    if (assetStatusUpdated && assetId) {
                      try {
                        const rollbackVersion = await resolveAssetVersion()
                        if (rollbackVersion !== undefined) {
                          await assetProcessClient.updateAsset({
                            id: assetId,
                            version: rollbackVersion,
                            assetStatus: AssetStatus.AVAILABLE
                          })
                        }
                      } catch {
                        // Rollback failed
                      }
                    }

                    setIsSubmitting(false)
                    throw error
                  }
                }}
              >
                {allocateButtonText}
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
