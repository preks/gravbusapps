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
  timeIssueType: z.string().min(1, 'Time Issue Type is required'),
  displayOrder: z.number().min(0, 'Display Order must be 0 or greater'),
  includeBreaks: z.boolean(),
  fromAppliedDay: z.string().min(1, 'Day From is required'),
  startTime: z.string().min(1, 'Start Time is required'),
  toAppliedDate: z.string().min(1, 'Day To is required'),
  endTime: z.string().min(1, 'End Time is required'),
  sumTime: z.string().optional(),
  timeTypeId: z.string().min(1, 'Time Type is required'),
  incrementCalculationType: z.string().min(1, 'Calculation Type is required'),
  fixedValue: z.number().nullable().optional(),
  includeExcludeOption: z.string().min(1, 'Include/Exclude Option is required'),
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
      title={incrementTypeDetails?.id ? 'Edit Increment Details' : 'Create Increment Details'}
      description="Configure increment type version details"
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
              <FormLabel>Time Issue</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time issue" />
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
              <FormLabel>Display Order</FormLabel>
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
              <FormLabel>Day From</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day from" />
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
              <FormLabel>Start Time</FormLabel>
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
              <FormLabel>Day To</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day to" />
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
              <FormLabel>End Time</FormLabel>
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
              <FormLabel>Sum Time</FormLabel>
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
              <FormLabel>Time Type</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time type" />
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
              <FormLabel>Calculation Type</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select calculation type" />
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
              <FormLabel>Fixed Value</FormLabel>
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
              <FormLabel>Include Exclude Option</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
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
              <FormLabel>Include Breaks</FormLabel>
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
                <FormLabel>Alternative Increment Type Version Detail</FormLabel>
                <FormControl>
                  <Select onValueChange={value => field.onChange(value || null)} value={field.value || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select alternative detail" />
                    </SelectTrigger>
                    <SelectContent>
                      {alternativeOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.fixedValue === null ? 'N/A' : option.fixedValue.toString()}
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
