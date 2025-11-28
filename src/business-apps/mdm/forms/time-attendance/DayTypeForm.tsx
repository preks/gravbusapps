import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { SimpleDayType } from '../../apps/time-attendance/types/day-types'

// Validation schema - messages will be translated at runtime
const dayTypeSchema = z.object({
  code: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_types.code_required', 'Code is required')
    )
    .max(
      10,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_types.code_max_length',
        'Code must be less than 10 characters'
      )
    ),
  name: z
    .string()
    .min(1, getTranslationFromI18nKeyAndLabel('flow:template_wizard.name_required', 'Name is required'))
    .max(
      100,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_types.name_max_length',
        'Name must be less than 100 characters'
      )
    )
})

export type DayTypeFormData = z.infer<typeof dayTypeSchema>

export interface DayTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  dayType?: SimpleDayType
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  usedCodes: string[]
}

const DayTypeForm: React.FC<DayTypeFormProps> = ({
  prefixDataTestId,
  dayType,
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  usedCodes = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'DayTypeForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  // Create resolver with custom validation for code uniqueness
  const resolver = useMemo(() => {
    return zodResolver(
      dayTypeSchema.refine(
        data => {
          // Skip validation for edit mode if code hasn't changed
          if (dayType && data.code === dayType.code) {
            return true
          }

          // Check if code is already used
          return !usedCodes.includes(data.code)
        },
        {
          message: getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types.code_already_exists',
            'Code already exists'
          ),
          path: ['code']
        }
      )
    ) as any // Type assertion to match FormWrapperModal's resolver type
  }, [usedCodes, dayType])

  const handleCancel = () => {
    onCancel?.()
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        dayType: {
          code: values.code,
          name: values.name,
          ...(dayType ? { version: dayType.version, id: dayType.id } : {})
        }
      }

      await restClient.post('/employee-time/createDayType', payload, {
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
      code: dayType?.code || '',
      name: dayType?.name || ''
    }
    return values
  }, [dayType])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={
        dayType
          ? getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_types.actions.edit', 'Edit Day Type')
          : getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_types.actions.create_new',
              'Create Day Type'
            )
      }
      description={getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_types.configure_day_type_description',
        'Configure day type basic information'
      )}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      defaultValues={defaultValues}
      isEditing={!!dayType}
      dataTestId={dataTestId}
      resolver={resolver}
      loading={loading}
    >
      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.code.label', 'Code', 'Code')}
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
              {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name', 'Name')}
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
    </FormWrapperModal>
  )
}

export default DayTypeForm
