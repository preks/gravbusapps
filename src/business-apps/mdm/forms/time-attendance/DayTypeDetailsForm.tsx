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
  SelectValue
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { FieldTypeOption } from '../../apps/time-attendance/types/day-type-version-details'

export const APPLIED_DAYS_OPTIONS = [
  { code: 'UNKNOWN_APPLIED_DAY', displayValue: 'Unknown' },
  { code: 'BEFORE_APPLIED_DAY', displayValue: 'Before Applied Day' },
  { code: 'CURRENT_APPLIED_DAY', displayValue: 'Current Applied Day' },
  { code: 'NEXT_APPLIED_DAY', displayValue: 'Next Applied Day' }
]

// Validation schema - messages will be translated at runtime
const dayTypeDetailsSchema = z.object({
  fieldType: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.field_type_required',
        'Field Type is required'
      )
    ),
  appliedDay: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.applied_day_required',
        'Applied Day is required'
      )
    ),
  timeValue: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.time_value_required',
        'Time Value is required'
      )
    )
})

export type DayTypeDetailsFormData = z.infer<typeof dayTypeDetailsSchema>

export interface DayTypeDetailsFormProps extends BusinessAppContextProps {
  dayTypeVersionId: string
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  refetch: (formData: any) => void
  accessToken: string
  dayTypeDetails?: {
    id: string
    version: number
    fieldType: string
    appliedDay: string
    timeValue: string
  }
  fieldTypeOptions: FieldTypeOption[]
}

const DayTypeDetailsForm: React.FC<DayTypeDetailsFormProps> = ({
  dayTypeVersionId,
  prefixDataTestId,
  dayTypeDetails,
  childAddButton,
  refetch,
  accessToken,
  fieldTypeOptions
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'DayTypeDetailsForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        dayTypeVersionDetail: {
          dayTypeVersion: dayTypeVersionId,
          fieldType: values.fieldType,
          appliedDay: values.appliedDay,
          timeValue: values.timeValue,
          ...(dayTypeDetails?.id ? { id: dayTypeDetails.id, version: dayTypeDetails.version } : {})
        }
      }

      const endpoint = dayTypeDetails?.id ? 'updateDayTypeVersionDetail' : 'createDayTypeVersionDetail'
      const response = await restClient.post(`/employee-time/${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      const newDayTypeSetupData = {
        fieldType: values.fieldType,
        appliedDay: values.appliedDay,
        timeValue: values.timeValue,
        id: response.dayTypeVersionDetail.id,
        version: response.dayTypeVersionDetail.version
      }

      refetch(newDayTypeSetupData)
    } catch (error) {
      console.error('Error saving day type details:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(() => {
    const values = {
      fieldType: dayTypeDetails?.fieldType || '',
      appliedDay: dayTypeDetails?.appliedDay || '',
      timeValue: dayTypeDetails?.timeValue || ''
    }
    return values
  }, [dayTypeDetails])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={
        dayTypeDetails?.id
          ? getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.actions.edit_day_type_details',
              'Edit Day Type Details'
            )
          : getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.actions.create_day_type_details',
              'Create Day Type Details'
            )
      }
      description={getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.configure_day_type_details',
        'Configure day type details'
      )}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      isEditing={!!dayTypeDetails}
      dataTestId={dataTestId}
      resolver={zodResolver(dayTypeDetailsSchema) as any}
      loading={loading}
    >
      <FormField
        name="fieldType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.day_type_versions.field_type',
                'Field Type'
              )}
            </FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.day_type_versions.actions.select_field_type',
                      'Select field type'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypeOptions.map(fieldType => (
                    <SelectItem key={fieldType.code} value={fieldType.code}>
                      {fieldType.displayValue}
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
        name="appliedDay"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.day_type_versions.applied_day',
                'Applied Day'
              )}
            </FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.day_type_versions.actions.select_applied_day',
                      'Select applied day'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {APPLIED_DAYS_OPTIONS.map(appliedDay => (
                    <SelectItem key={appliedDay.code} value={appliedDay.code}>
                      {appliedDay.displayValue}
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
        name="timeValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.day_type_versions.time_value',
                'Time Value'
              )}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_type_versions.actions.enter_time_value',
                  'Enter time value'
                )}
                data-testid={`${dataTestId}-time-value-input`}
                type="time"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default DayTypeDetailsForm
