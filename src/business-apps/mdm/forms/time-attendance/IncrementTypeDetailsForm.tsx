import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedIncrementTypeVersionDetail } from '../../apps/time-attendance/types/increment-type-version-details'
import { TransformedTimeType } from '../../apps/time-attendance/types/time-types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { calculateSumTime } from '../../apps/time-attendance/utils/calculateSumTime'
import { useForm } from 'react-hook-form'

export const APPLIED_DAYS_OPTIONS = [
  { code: 'BEFORE_APPLIED_DAY', displayValue: 'Before' },
  { code: 'CURRENT_APPLIED_DAY', displayValue: 'Current' },
  { code: 'NEXT_APPLIED_DAY', displayValue: 'Next' }
]

export const TIME_ISSUE_TYPE_OPTIONS = [
  { code: 'ATTENDANCE_TIME_ISSUE', displayValue: 'Attendance' },
  { code: 'TARGET_TIME_ISSUE', displayValue: 'Target Time' },
  { code: 'OVERTIME_ISSUE', displayValue: 'Overtime' },
  { code: 'ABSENCE_TIME_ISSUE', displayValue: 'Absence' },
  { code: 'EXTRA_WORK_TIME_ISSUE', displayValue: 'Extra Work' },
  { code: 'BEFORE_NORMAL_START_ISSUE', displayValue: 'Before Normal Start' },
  { code: 'AFTER_NORMAL_END_ISSUE', displayValue: 'After Normal End' }
]

export const INCREMENT_CALCULATION_TYPE_OPTIONS = [
  { code: 'CALCULATED_INC_CALC_TYPE', displayValue: 'Calculated' },
  { code: 'MIN_INC_CALC_TYPE', displayValue: 'Minimum' },
  { code: 'MAX_INC_CALC_TYPE', displayValue: 'Maximum' },
  { code: 'FIXED_INC_CALC_TYPE', displayValue: 'Fix' }
]

export const INCLUDE_EXCLUDE_OPTIONS = [
  { code: 'NONE_IN_EX_OPTION', displayValue: 'None' },
  { code: 'INCLUDE_OPTION', displayValue: 'Include' },
  { code: 'EXCLUDE_OPTION', displayValue: 'Exclude' }
]

// Validation schema
const incrementTypeDetailsSchema = z
  .object({
    timeIssueType: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.time_issue_type_required',
          'Time Issue Type is required'
        )
      ),
    displayOrder: z
      .number()
      .min(
        0,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.display_order_required',
          'Display Order must be 0 or greater'
        )
      ),
    includeBreaks: z.boolean(),
    fromAppliedDay: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.day_from_required',
          'Day From is required'
        )
      ),
    startTime: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.start_time_required',
          'Start Time is required'
        )
      ),
    toAppliedDate: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.day_to_required',
          'Day To is required'
        )
      ),
    endTime: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.end_time_required',
          'End Time is required'
        )
      ),
    sumTime: z.string().optional(),
    timeTypeId: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.time_type_required',
          'Time Type is required'
        )
      ),
    incrementCalculationType: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.calculation_type_required',
          'Calculation Type is required'
        )
      ),
    fixedValue: z.string().nullable().optional(),
    includeExcludeOption: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.include_exclude_option_required',
          'Include/Exclude Option is required'
        )
      ),
    alternativeIncrementTypeVersionDetailId: z.string().nullable().optional(),
    checkStartBefore: z.boolean(),
    startBeforeTime: z.string().nullable().optional()
  })
  .superRefine((data, ctx) => {
    // Validate fixedValue when calculation type requires it
    if (
      (data.incrementCalculationType === 'MIN_INC_CALC_TYPE' ||
        data.incrementCalculationType === 'MAX_INC_CALC_TYPE' ||
        data.incrementCalculationType === 'FIXED_INC_CALC_TYPE') &&
      (!data.fixedValue || data.fixedValue === '')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['fixedValue'],
        message: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.fixed_value_required',
          'Fixed Value is required for Min, Max, or Fixed calculation types'
        )
      })
    }

    // Validate startBeforeTime when checkStartBefore is true
    if (data.checkStartBefore && (!data.startBeforeTime || data.startBeforeTime === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['startBeforeTime'],
        message: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.start_before_time_required',
          'Start Before Time is required when Start Before is checked'
        )
      })
    }

    // Validate Day From and Day To combination
    if (data.fromAppliedDay && data.toAppliedDate) {
      const dayOrder: Record<string, number> = {
        BEFORE_APPLIED_DAY: 0,
        CURRENT_APPLIED_DAY: 1,
        NEXT_APPLIED_DAY: 2
      }

      const fromOrder = dayOrder[data.fromAppliedDay]
      const toOrder = dayOrder[data.toAppliedDate]

      // Day To cannot be before Day From in temporal order
      if (fromOrder !== undefined && toOrder !== undefined && toOrder < fromOrder) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAppliedDate'],
          message: getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.day_to_before_day_from',
            'Day To cannot be before Day From in temporal order'
          )
        })
      }

      // When Day From equals Day To, Start Time must be before End Time
      if (data.fromAppliedDay === data.toAppliedDate && data.startTime && data.endTime) {
        const parseTime = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number)
          return hours * 60 + minutes
        }

        const startMinutes = parseTime(data.startTime)
        const endMinutes = parseTime(data.endTime)

        if (startMinutes >= endMinutes) {
          ctx.addIssue({
            code: 'custom',
            path: ['endTime'],
            message: getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.fields.end_time_before_start_time',
              'End Time must be after Start Time when Day From equals Day To'
            )
          })
        }
      }
    }
  })

export type IncrementTypeDetailsFormData = z.infer<typeof incrementTypeDetailsSchema>

export interface IncrementTypeDetailsFormProps extends BusinessAppContextProps {
  incrementTypeVersionId: string
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  availableIncrementTypeDetails?: TransformedIncrementTypeVersionDetail[]
  incrementTypeDetails?: TransformedIncrementTypeVersionDetail
  timeTypes: TransformedTimeType[]
}

const IncrementTypeDetailsForm: React.FC<IncrementTypeDetailsFormProps> = ({
  incrementTypeVersionId,
  prefixDataTestId,
  incrementTypeDetails,
  childAddButton,
  refetch,
  accessToken,
  availableIncrementTypeDetails = [],
  timeTypes
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'IncrementTypeDetailsForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  // Default values
  const defaultValues = useMemo(() => {
    const values: IncrementTypeDetailsFormData = {
      timeIssueType: incrementTypeDetails?.timeIssueType || '',
      displayOrder: incrementTypeDetails?.displayOrder ?? 0,
      includeBreaks: incrementTypeDetails?.includeBreaks ?? false,
      fromAppliedDay: incrementTypeDetails?.fromAppliedDay || '',
      startTime: incrementTypeDetails?.startTime || '',
      toAppliedDate: incrementTypeDetails?.toAppliedDate || '',
      endTime: incrementTypeDetails?.endTime || '',
      sumTime: incrementTypeDetails?.sumTime || '',
      timeTypeId: incrementTypeDetails?.timeTypeId || '',
      incrementCalculationType: incrementTypeDetails?.incrementCalculationType || '',
      fixedValue: incrementTypeDetails?.fixedValue ?? null,
      includeExcludeOption: incrementTypeDetails?.includeExcludeOption || 'NONE',
      alternativeIncrementTypeVersionDetailId: incrementTypeDetails?.alternativeIncrementTypeVersionDetailId ?? null,
      checkStartBefore: incrementTypeDetails?.checkStartBefore ?? false,
      startBeforeTime: incrementTypeDetails?.startBeforeTime ?? null
    }
    return values
  }, [incrementTypeDetails])

  // Create form instance for watching fields and calculating Sum Time
  const form = useForm<IncrementTypeDetailsFormData>({
    resolver: zodResolver(incrementTypeDetailsSchema) as any,
    defaultValues,
    mode: 'onChange'
  })

  // Watch fields for Sum Time calculation
  const watchedFromAppliedDay = form.watch('fromAppliedDay')
  const watchedStartTime = form.watch('startTime')
  const watchedToAppliedDate = form.watch('toAppliedDate')
  const watchedEndTime = form.watch('endTime')
  const watchedIncrementCalculationType = form.watch('incrementCalculationType')
  const watchedCheckStartBefore = form.watch('checkStartBefore')

  // Calculate Sum Time automatically when relevant fields change
  useEffect(() => {
    if (watchedFromAppliedDay && watchedStartTime && watchedToAppliedDate && watchedEndTime) {
      const calculatedSumTime = calculateSumTime(
        watchedFromAppliedDay,
        watchedStartTime,
        watchedToAppliedDate,
        watchedEndTime
      )
      form.setValue('sumTime', calculatedSumTime, { shouldDirty: false })
    }
  }, [watchedFromAppliedDay, watchedStartTime, watchedToAppliedDate, watchedEndTime, form])

  // Trigger validation for Day To when Day From changes
  useEffect(() => {
    if (watchedFromAppliedDay && watchedToAppliedDate) {
      form.trigger('toAppliedDate')
    }
  }, [watchedFromAppliedDay, form, watchedToAppliedDate])

  // Trigger validation for Day To when Day From changes
  useEffect(() => {
    if (watchedFromAppliedDay && watchedToAppliedDate) {
      form.trigger('toAppliedDate')
    }
  }, [watchedFromAppliedDay, form, watchedToAppliedDate])

  // Trigger validation for Day From when Day To changes
  useEffect(() => {
    if (watchedFromAppliedDay && watchedToAppliedDate) {
      form.trigger('fromAppliedDay')
    }
  }, [watchedToAppliedDate, form, watchedFromAppliedDay])

  // Trigger validation for End Time when Start Time changes (if same day)
  useEffect(() => {
    if (watchedFromAppliedDay === watchedToAppliedDate && watchedStartTime && watchedEndTime) {
      form.trigger('endTime')
    } else if (watchedFromAppliedDay !== watchedToAppliedDate) {
      // Clear validation errors when days are different
      form.clearErrors('endTime')
      form.clearErrors('startTime')
    }
  }, [watchedStartTime, watchedFromAppliedDay, watchedToAppliedDate, form, watchedEndTime])

  // Trigger validation for Start Time when End Time changes (if same day)
  useEffect(() => {
    if (watchedFromAppliedDay === watchedToAppliedDate && watchedStartTime && watchedEndTime) {
      form.trigger('startTime')
    } else if (watchedFromAppliedDay !== watchedToAppliedDate) {
      // Clear validation errors when days are different
      form.clearErrors('startTime')
      form.clearErrors('endTime')
    }
  }, [watchedEndTime, watchedFromAppliedDay, watchedToAppliedDate, form, watchedStartTime])

  // Trigger validation for Start Time and End Time when Day From or Day To changes
  useEffect(() => {
    if (watchedFromAppliedDay && watchedToAppliedDate) {
      if (watchedFromAppliedDay === watchedToAppliedDate && watchedStartTime && watchedEndTime) {
        // Revalidate if same day
        form.trigger(['startTime', 'endTime'])
      } else {
        // Clear errors if different days
        form.clearErrors('startTime')
        form.clearErrors('endTime')
      }
    }
  }, [watchedFromAppliedDay, watchedToAppliedDate, form, watchedStartTime, watchedEndTime])

  // Filter available increment type details (exclude current one if editing, only those with checkStartBefore = true)
  const alternativeOptions = useMemo(() => {
    return availableIncrementTypeDetails.filter(
      detail => detail.id !== incrementTypeDetails?.id && detail.checkStartBefore === true
    )
  }, [availableIncrementTypeDetails, incrementTypeDetails?.id])

  // Get total number of existing details for displayOrder validation
  const totalDetailsCount = useMemo(() => {
    return availableIncrementTypeDetails.length
  }, [availableIncrementTypeDetails.length])

  // Validate displayOrder against total count (max should be totalDetailsCount for new items, or totalDetailsCount - 1 for updates)
  const maxDisplayOrder = useMemo(() => {
    // For new items, max is totalDetailsCount (0-indexed, so last position is totalDetailsCount)
    // For updates, max is totalDetailsCount - 1 (since we're replacing one)
    return incrementTypeDetails?.id ? totalDetailsCount - 1 : totalDetailsCount
  }, [totalDetailsCount, incrementTypeDetails?.id])

  // Watch displayOrder for validation
  const watchedDisplayOrder = form.watch('displayOrder')

  // Validate displayOrder when it changes
  useEffect(() => {
    if (watchedDisplayOrder !== undefined && watchedDisplayOrder > maxDisplayOrder) {
      form.setError('displayOrder', {
        type: 'manual',
        message: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.display_order_max',
          `Display Order cannot exceed ${maxDisplayOrder} (total number of items)`
        )
      })
    } else {
      form.clearErrors('displayOrder')
    }
  }, [watchedDisplayOrder, maxDisplayOrder, form])

  const handleSubmit = async (values: IncrementTypeDetailsFormData) => {
    try {
      setLoading(true)

      const isUpdate = !!incrementTypeDetails?.id
      const newDisplayOrder = values.displayOrder
      const oldDisplayOrder = incrementTypeDetails?.displayOrder ?? -1

      // Calculate which details need to be updated
      const detailsToUpdate: Array<{ id: string; version: number; newDisplayOrder: number }> = []

      if (isUpdate) {
        // UPDATE: Adjust other details based on displayOrder change
        if (newDisplayOrder !== oldDisplayOrder) {
          if (newDisplayOrder < oldDisplayOrder) {
            // Moving up: increment details with displayOrder >= newDisplayOrder and < oldDisplayOrder
            availableIncrementTypeDetails.forEach(detail => {
              if (
                detail.id !== incrementTypeDetails.id &&
                detail.displayOrder >= newDisplayOrder &&
                detail.displayOrder < oldDisplayOrder
              ) {
                detailsToUpdate.push({
                  id: detail.id,
                  version: detail.version,
                  newDisplayOrder: detail.displayOrder + 1
                })
              }
            })
          } else {
            // Moving down: decrement details with displayOrder > oldDisplayOrder and <= newDisplayOrder
            availableIncrementTypeDetails.forEach(detail => {
              if (
                detail.id !== incrementTypeDetails.id &&
                detail.displayOrder > oldDisplayOrder &&
                detail.displayOrder <= newDisplayOrder
              ) {
                detailsToUpdate.push({
                  id: detail.id,
                  version: detail.version,
                  newDisplayOrder: detail.displayOrder - 1
                })
              }
            })
          }
        }
      } else {
        // CREATE: Increment all details with displayOrder >= newDisplayOrder
        availableIncrementTypeDetails.forEach(detail => {
          if (detail.displayOrder >= newDisplayOrder) {
            detailsToUpdate.push({
              id: detail.id,
              version: detail.version,
              newDisplayOrder: detail.displayOrder + 1
            })
          }
        })
      }

      // Update affected details first (before creating/updating the current one)
      for (const detailUpdate of detailsToUpdate) {
        try {
          const updatePayload = {
            changeMode: 'INSERT',
            incrementTypeVersionDetail: {
              id: detailUpdate.id,
              version: detailUpdate.version,
              incrementTypeVersion: incrementTypeVersionId,
              displayOrder: detailUpdate.newDisplayOrder
            }
          }
          await restClient.post(`/employee-time/updateIncrementTypeVersionDetail`, updatePayload, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        } catch (error) {
          console.error(`Error updating detail ${detailUpdate.id}:`, error)
          throw error
        }
      }

      // Convert fixedValue from HH:mm string to number (minutes) for backend
      const convertFixedValueToNumber = (value: string | null | undefined): number | null => {
        if (!value || value === '') return null
        // Parse HH:mm format to total minutes
        const parts = value.split(':')
        if (parts.length === 2) {
          const hours = Number.parseInt(parts[0], 10)
          const minutes = Number.parseInt(parts[1], 10)
          if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
            return hours * 60 + minutes
          }
        }
        return null
      }

      // Now create/update the current detail
      const payload = {
        changeMode: 'INSERT',
        incrementTypeVersionDetail: {
          incrementTypeVersion: incrementTypeVersionId,
          timeIssueType: values.timeIssueType,
          displayOrder: values.displayOrder,
          includeBreaks: values.includeBreaks,
          fromAppliedDay: values.fromAppliedDay,
          startTime: values.startTime,
          toAppliedDate: values.toAppliedDate,
          endTime: values.endTime,
          sumTime: values.sumTime || '',
          timeType: values.timeTypeId,
          incrementCalculationType: values.incrementCalculationType,
          fixedValue: convertFixedValueToNumber(values.fixedValue),
          includeExcludeOption: values.includeExcludeOption,
          alternativeIncrementTypeVersionDetail: values.alternativeIncrementTypeVersionDetailId ?? null,
          checkStartBefore: values.checkStartBefore ?? false,
          startBeforeTime: values.startBeforeTime ?? null,
          ...(incrementTypeDetails?.id ? { id: incrementTypeDetails.id, version: incrementTypeDetails.version } : {})
        }
      }

      const endpoint = incrementTypeDetails?.id
        ? 'updateIncrementTypeVersionDetail'
        : 'createIncrementTypeVersionDetail'
      await restClient.post(`/employee-time/${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      refetch()
    } catch (error) {
      console.error('Error saving increment type details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={
        incrementTypeDetails?.id
          ? getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.actions.edit_increment_details',
              'Edit Increment Details'
            )
          : getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.actions.create_increment_details',
              'Create Increment Details'
            )
      }
      description={getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.increment_type_versions.configure_increment_type_details',
        'Configure increment type version details'
      )}
      onSubmit={(values: any) => handleSubmit(values as IncrementTypeDetailsFormData)}
      defaultValues={defaultValues}
      isEditing={!!incrementTypeDetails}
      dataTestId={dataTestId}
      form={form as any}
      loading={loading}
      contentClassName="gba:max-h-[calc(100vh-200px)] gba:overflow-y-auto gba:overflow-x-hidden"
      formClassName="gba:flex gba:flex-col gba:w-full gba:max-w-md"
    >
      <div className="gba:space-y-6 gba:pr-2">
        {/* Basic Information Section */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <FormField
            name="timeIssueType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.fields.time_issue',
                    'Time Issue'
                  )}
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_type_versions.actions.select_time_issue',
                          'Select time issue'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ISSUE_TYPE_OPTIONS.map(option => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.displayValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="displayOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_type_versions.fields.display_order',
                    'Display Order'
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={maxDisplayOrder}
                    onChange={e => {
                      const inputValue = e.target.value
                      if (inputValue === '' || inputValue === '-') {
                        field.onChange(0)
                        e.target.value = '0'
                        return
                      }
                      const value = Number.parseInt(inputValue, 10)
                      if (!Number.isNaN(value)) {
                        const clampedValue = Math.max(0, Math.min(value, maxDisplayOrder))
                        field.onChange(clampedValue)
                        // Force update to remove leading zeros
                        e.target.value = clampedValue.toString()
                      }
                    }}
                    onBlur={e => {
                      const value = Number.parseInt(e.target.value) || 0
                      const clampedValue = Math.max(0, Math.min(value, maxDisplayOrder))
                      field.onChange(clampedValue)
                      e.target.value = clampedValue.toString()
                    }}
                    defaultValue={field.value}
                    key={field.value}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Time Range Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_type_versions.sections.time_range',
                'Time Range'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                name="fromAppliedDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.day_from',
                        'Day From'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.time_attendance.increment_type_versions.actions.select_day_from',
                              'Select day from'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLIED_DAYS_OPTIONS.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.displayValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.start_time',
                        'Start Time'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="time" placeholder="HH:mm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="toAppliedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.day_to',
                        'Day To'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.time_attendance.increment_type_versions.actions.select_day_to',
                              'Select day to'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLIED_DAYS_OPTIONS.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.displayValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.end_time',
                        'End Time'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="time" placeholder="HH:mm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="sumTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.sum_time',
                        'Sum Time'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="HH:mm" readOnly className="gba:bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Calculation Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_type_versions.sections.calculation',
                'Calculation'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                name="incrementCalculationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.calculation_type',
                        'Calculation Type'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.time_attendance.increment_type_versions.actions.select_calculation_type',
                              'Select calculation type'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {INCREMENT_CALCULATION_TYPE_OPTIONS.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.displayValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedIncrementCalculationType !== 'CALCULATED_INC_CALC_TYPE' && (
                <FormField
                  name="fixedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_type_versions.fields.fixed_value',
                          'Fixed Value'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="HH:mm"
                          value={field.value ?? ''}
                          onChange={e => {
                            const value = e.target.value
                            // Allow empty string
                            if (value === '') {
                              field.onChange(null)
                              return
                            }
                            // Allow partial input while typing (e.g., "1", "12", "12:", "12:3", "12:34")
                            // Allow digits, colon, and partial formats
                            if (/^[0-9]{0,2}(:([0-5]?[0-9]?)?)?$/.test(value)) {
                              field.onChange(value)
                            }
                          }}
                          onBlur={e => {
                            const value = e.target.value
                            // Validate complete HH:mm format on blur
                            if (value === '') {
                              field.onChange(null)
                              return
                            }
                            // Check if it's a valid complete format
                            if (/^([0-9]{1,2}):([0-5][0-9])$/.test(value)) {
                              field.onChange(value)
                            } else {
                              // If invalid format, try to fix it or clear
                              // Try to add missing colon or pad with zeros
                              const parts = value.split(':')
                              if (parts.length === 1 && parts[0].length <= 2) {
                                // Just hours, add :00
                                const hours = parts[0].padStart(2, '0')
                                if (Number.parseInt(hours) < 100) {
                                  field.onChange(`${hours}:00`)
                                  return
                                }
                              }
                              // If can't fix, clear or keep as is
                              field.onChange(value)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                name="timeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.time_type',
                        'Time Type'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.time_attendance.increment_type_versions.actions.select_time_type',
                              'Select time type'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {timeTypes.map(timeType => (
                            <SelectItem key={timeType.id} value={timeType.id}>
                              {timeType.code} - {timeType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Options Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.increment_type_versions.sections.options',
                'Options'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                name="includeBreaks"
                render={({ field }) => (
                  <FormItem className="gba:flex gba:flex-row gba:items-center gba:space-x-2 gba:space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="gba:mt-0!">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.include_breaks',
                        'Include Breaks'
                      )}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                name="checkStartBefore"
                render={({ field }) => (
                  <FormItem className="gba:flex gba:flex-row gba:items-center gba:space-x-2 gba:space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="gba:mt-0!">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.check_start_before',
                        'Start Before'
                      )}
                    </FormLabel>
                  </FormItem>
                )}
              />

              {watchedCheckStartBefore && (
                <FormField
                  name="startBeforeTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.time_attendance.increment_type_versions.fields.start_before_time',
                          'Start Before Time'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="time" placeholder="HH:mm" value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                name="includeExcludeOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.include_exclude_option',
                        'Include Exclude Option'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.time_attendance.increment_type_versions.actions.select_option',
                              'Select option'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {INCLUDE_EXCLUDE_OPTIONS.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.displayValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Alternative Section */}
        {alternativeOptions && alternativeOptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.increment_type_versions.sections.alternative',
                  'Alternative'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                name="alternativeIncrementTypeVersionDetailId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.increment_type_versions.fields.alternative_increment_type_version_detail',
                        'Alternative Increment Type Version Detail'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={value => field.onChange(value || null)} value={field.value || undefined}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.time_attendance.increment_type_versions.actions.select_alternative_detail',
                              'Select alternative detail'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {alternativeOptions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                              {`Display Order: ${option.displayOrder}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </FormWrapperModal>
  )
}

export default IncrementTypeDetailsForm
