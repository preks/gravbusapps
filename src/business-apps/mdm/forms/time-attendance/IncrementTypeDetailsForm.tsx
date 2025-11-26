import React, { useMemo, useState } from 'react'
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
  Checkbox
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useTimeTypesData } from '../../apps/time-attendance/hooks/useTimeTypesData'
import { TransformedIncrementTypeVersionDetail } from '../../apps/time-attendance/types/increment-type-version-details'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const APPLIED_DAYS_OPTIONS = [
  { code: 'UNKNOWN_APPLIED_DAY', displayValue: 'Unknown' },
  { code: 'BEFORE_APPLIED_DAY', displayValue: 'Before' },
  { code: 'CURRENT_APPLIED_DAY', displayValue: 'Current' },
  { code: 'NEXT_APPLIED_DAY', displayValue: 'Next' }
]

export const TIME_ISSUE_TYPE_OPTIONS = [
  { code: 'UNKNOWN_TIME_ISSUE_TYPE', displayValue: 'Unknown' },
  { code: 'ATTENDANCE_TIME_ISSUE', displayValue: 'Attendance' },
  { code: 'TARGET_TIME_ISSUE', displayValue: 'Target' },
  { code: 'OVERTIME_ISSUE', displayValue: 'Overtime' },
  { code: 'ABSENCE_TIME_ISSUE', displayValue: 'Absence' },
  { code: 'EXTRA_WORK_TIME_ISSUE', displayValue: 'Extra Work' },
  { code: 'BEFORE_NORMAL_START_ISSUE', displayValue: 'Before Normal Start' },
  { code: 'AFTER_NORMAL_END_ISSUE', displayValue: 'After Normal End' }
]

export const INCREMENT_CALCULATION_TYPE_OPTIONS = [
  { code: 'UNKNOWN_INC_CALC_TYPE', displayValue: 'Unknown' },
  { code: 'CALCULATED_INC_CALC_TYPE', displayValue: 'Calculated' },
  { code: 'MIN_INC_CALC_TYPE', displayValue: 'Min' },
  { code: 'MAX_INC_CALC_TYPE', displayValue: 'Max' },
  { code: 'FIXED_INC_CALC_TYPE', displayValue: 'Fixed' }
]

export const INCLUDE_EXCLUDE_OPTIONS = [
  { code: 'UNKNOWN_IN_EX_OPTION', displayValue: 'Unknown' },
  { code: 'NONE_IN_EX_OPTION', displayValue: 'None' },
  { code: 'INCLUDE_OPTION', displayValue: 'Include' },
  { code: 'EXCLUDE_OPTION', displayValue: 'Exclude' }
]

// Validation schema
const incrementTypeDetailsSchema = z.object({
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
  fixedValue: z.number().nullable().optional(),
  includeExcludeOption: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.increment_type_versions.fields.include_exclude_option_required',
        'Include/Exclude Option is required'
      )
    ),
  alternativeIncrementTypeVersionDetailId: z.string().nullable().optional()
})

export type IncrementTypeDetailsFormData = z.infer<typeof incrementTypeDetailsSchema>

export interface IncrementTypeDetailsFormProps extends BusinessAppContextProps {
  incrementTypeVersionId: string
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  availableIncrementTypeDetails?: TransformedIncrementTypeVersionDetail[]
  incrementTypeDetails?: {
    id: string
    version: number
    timeIssueType: string
    displayOrder: number
    includeBreaks: boolean
    fromAppliedDay: string
    startTime: string
    toAppliedDate: string
    endTime: string
    sumTime: string
    timeTypeId: string
    incrementCalculationType: string
    fixedValue: number | null
    includeExcludeOption: string
    alternativeIncrementTypeVersionDetailId: string | null
  }
}

const IncrementTypeDetailsForm: React.FC<IncrementTypeDetailsFormProps> = ({
  incrementTypeVersionId,
  prefixDataTestId,
  incrementTypeDetails,
  childAddButton,
  refetch,
  accessToken,
  availableIncrementTypeDetails = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'IncrementTypeDetailsForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const { timeTypes } = useTimeTypesData({ accessToken })

  const [loading, setLoading] = useState(false)

  // Filter available increment type details (exclude current one if editing)
  const alternativeOptions = useMemo(() => {
    return availableIncrementTypeDetails.filter(
      detail => detail.id !== incrementTypeDetails?.id && detail.fixedValue !== null
    )
  }, [availableIncrementTypeDetails, incrementTypeDetails?.id])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

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
          fixedValue: values.fixedValue ?? null,
          includeExcludeOption: values.includeExcludeOption,
          alternativeIncrementTypeVersionDetail: values.alternativeIncrementTypeVersionDetailId ?? null,
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
      alternativeIncrementTypeVersionDetailId: incrementTypeDetails?.alternativeIncrementTypeVersionDetailId ?? null
    }
    return values
  }, [incrementTypeDetails])

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
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      isEditing={!!incrementTypeDetails}
      dataTestId={dataTestId}
      resolver={zodResolver(incrementTypeDetailsSchema) as any}
      loading={loading}
    >
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
                  {...field}
                  type="number"
                  onChange={e => field.onChange(Number.parseInt(e.target.value) || 0)}
                  value={field.value}
                  placeholder="0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <Input {...field} type="time" placeholder="HH:mm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  type="number"
                  step="0.01"
                  onChange={e => field.onChange(e.target.value ? Number.parseFloat(e.target.value) : null)}
                  value={field.value ?? ''}
                  placeholder="0.00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          name="includeBreaks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.increment_type_versions.fields.include_breaks',
                  'Include Breaks'
                )}
              </FormLabel>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {alternativeOptions && alternativeOptions.length > 0 && (
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
                          {option.fixedValue === null
                            ? getTranslationFromI18nKeyAndLabel('master-data:forms.common.not_available', 'N/A')
                            : option.fixedValue.toString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </FormWrapperModal>
  )
}

export default IncrementTypeDetailsForm
