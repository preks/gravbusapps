import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { SimpleDayType } from '../../apps/time-attendance/types/day-types'

// Validation schema
const dayTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required')
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
  accessToken: accessToken,
  usedCodes = []
}) => {
  const { t } = useTranslation('master-data')
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
          message: 'Code already exists',
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
      title={dayType ? 'Edit Day Type' : 'Create Day Type'}
      description="Configure day type basic information"
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
              {t('forms.dayType.fields.code.label', {
                defaultValue: 'Code'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.dayType.fields.code.placeholder', {
                  defaultValue: 'Enter code (e.g., WK, BR, OT)'
                })}
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
              {t('forms.dayType.fields.name.label', {
                defaultValue: 'Name'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.dayType.fields.name.placeholder', {
                  defaultValue: 'Enter name'
                })}
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
