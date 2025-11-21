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
import {
  TimeTypeEnum,
  TransformedSystemTimeType,
  TransformedTimeType
} from '../../apps/time-attendance/types/time-types'
// import { TimeTypeEnum, TransformedTimeType } from '../../apps/time-attendance/hooks/useTimeTypesData'

// Validation schema
const timeTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  visible: z.boolean({
    message: 'Please select visibility'
  })
})

export type TimeTypeFormData = z.infer<typeof timeTypeSchema>

export interface TimeTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeType?: TransformedTimeType
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  usedCodes: string[]
}

const TimeTypeForm: React.FC<TimeTypeFormProps> = ({
  prefixDataTestId,
  timeType,
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  usedCodes = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'TimeTypeForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  // Create resolver with custom validation for code uniqueness
  const resolver = useMemo(() => {
    return zodResolver(
      timeTypeSchema.refine(
        data => {
          // Skip validation for edit mode if code hasn't changed
          if (timeType && data.code === timeType.code) {
            return true
          }

          // Check if code is already used
          return !usedCodes.includes(data.code)
        },
        {
          message: 'Code already exists',
          path: ['code']
        }
      )
    ) as any // Type assertion to match FormWrapperModal's resolver type
  }, [usedCodes, timeType])

  const handleCancel = () => {
    onCancel?.()
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        timeType: {
          code: values.code,
          name: values.name,
          type: TimeTypeEnum.TIME_TYPE_CUSTOM,
          visible: values.visible,
          ...(timeType ? { version: timeType.version, id: timeType.id } : {})
        }
      }

      await restClient.post('/employee-time/createTimeType', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      refetch()
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(() => {
    const values = {
      code: timeType?.code || '',
      name: timeType?.name || '',
      visible: timeType?.visible ?? true
    }
    return values
  }, [timeType])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={
        timeType
          ? getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.time_types.actions.edit',
              'Edit Time Type'
            )
          : getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.time_types.actions.create_new',
              'Create Time Type'
            )
      }
      description={getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.time_types.description_create_new',
        'Configure time type details and access permissions'
      )}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      defaultValues={defaultValues}
      isEditing={!!timeType}
      dataTestId={dataTestId}
      resolver={resolver}
      loading={loading}
    >
      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.code.label', 'Code')}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.time_types.actions.enter_code_placeholder',
                  'Enter code (e.g., WK, BR, OT)'
                )}
                data-testid={`${dataTestId}-code-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name')}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.name_placeholder',
                  'Enter name'
                )}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="visible"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{getTranslationFromI18nKeyAndLabel('flow:flow_launcher.visibility', 'Visibility')}</FormLabel>
            <FormControl>
              <Select
                {...field}
                value={field.value ? 'true' : 'false'}
                onValueChange={value => field.onChange(value === 'true')}
              >
                <SelectTrigger data-testid={`${dataTestId}-visibility-select`}>
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.time_types.actions.select_visibility_placeholder',
                      'Select visibility'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.time_types.actions.visible',
                      'Visible'
                    )}
                  </SelectItem>
                  <SelectItem value="false">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.time_attendance.time_types.actions.hidden',
                      'Hidden'
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default TimeTypeForm
