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
import { useTranslation } from 'react-i18next'
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

// Validation schema
const dayTypeDetailsSchema = z.object({
  fieldType: z.string().min(1, 'Field Type is required'),
  appliedDay: z.string().min(1, 'Applied Day is required'),
  timeValue: z.string().min(1, 'Time Value is required')
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
  accessToken: accessToken,
  fieldTypeOptions
}) => {
  const { t } = useTranslation('master-data')
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
      title={dayTypeDetails?.id ? 'Edit Day Type Details' : 'Create Day Type Details'}
      description="Configure day type details"
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
              {t('forms.dayTypeDetails.fields.fieldType.label', {
                defaultValue: 'Field Type'
              })}
            </FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
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
              {t('forms.dayTypeDetails.fields.appliedDay.label', {
                defaultValue: 'Applied Day'
              })}
            </FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select applied day" />
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
              {t('forms.dayTypeDetails.fields.timeValue.label', {
                defaultValue: 'Time Value'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.dayTypeDetails.fields.timeValue.placeholder', {
                  defaultValue: 'Enter time value'
                })}
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
