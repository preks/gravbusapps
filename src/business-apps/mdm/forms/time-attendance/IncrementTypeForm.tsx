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
import { IncrementType } from '../../apps/time-attendance/types/increment-types'

// Validation schema
const incrementTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required')
})

export type IncrementTypeFormData = z.infer<typeof incrementTypeSchema>

export interface IncrementTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  incrementType?: IncrementType
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  usedCodes: string[]
}

const IncrementTypeForm: React.FC<IncrementTypeFormProps> = ({
  prefixDataTestId,
  incrementType,
  onCancel,
  childAddButton,
  refetch,
  accessToken: accessToken,
  usedCodes = []
}) => {
  const { t } = useTranslation('master-data')
  const dataTestId = formatDataTestId(prefixDataTestId, 'IncrementTypeForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  // Create resolver with custom validation for code uniqueness
  const resolver = useMemo(() => {
    return zodResolver(
      incrementTypeSchema.refine(
        data => {
          // Skip validation for edit mode if code hasn't changed
          if (incrementType && data.code === incrementType.code) {
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
  }, [usedCodes, incrementType])

  const handleCancel = () => {
    onCancel?.()
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        incrementType: {
          code: values.code,
          name: values.name,
          ...(incrementType ? { version: incrementType.version, id: incrementType.id } : {})
        }
      }

      await restClient.post(
        `/employee-time/${incrementType ? 'updateIncrementType' : 'createIncrementType'}`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      refetch()
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(() => {
    const values = {
      code: incrementType?.code || '',
      name: incrementType?.name || ''
    }
    return values
  }, [incrementType])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={incrementType ? 'Edit Increment Type' : 'Create Increment Type'}
      description="Configure increment type details"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      defaultValues={defaultValues}
      isEditing={!!incrementType}
      dataTestId={dataTestId}
      resolver={resolver}
      loading={loading}
    >
      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.incrementType.fields.code.label', {
                defaultValue: 'Code'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.incrementType.fields.code.placeholder', {
                  defaultValue: 'Enter code (e.g., INC001)'
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
              {t('forms.incrementType.fields.name.label', {
                defaultValue: 'Name'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.incrementType.fields.name.placeholder', {
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

export default IncrementTypeForm
