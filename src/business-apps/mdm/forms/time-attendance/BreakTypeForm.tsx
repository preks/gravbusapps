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
import { BreakType } from '../../apps/time-attendance/types/break-types'

// Validation schema
const breakTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required')
})

export type BreakTypeFormData = z.infer<typeof breakTypeSchema>

export interface BreakTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  breakType?: BreakType
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  usedCodes: string[]
}

const BreakTypeForm: React.FC<BreakTypeFormProps> = ({
  prefixDataTestId,
  breakType,
  onCancel,
  childAddButton,
  refetch,
  accessToken: accessToken,
  usedCodes = []
}) => {
  const { t } = useTranslation('master-data')
  const dataTestId = formatDataTestId(prefixDataTestId, 'BreakTypeForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  // Create resolver with custom validation for code uniqueness
  const resolver = useMemo(() => {
    return zodResolver(
      breakTypeSchema.refine(
        data => {
          // Skip validation for edit mode if code hasn't changed
          if (breakType && data.code === breakType.code) {
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
  }, [usedCodes, breakType])

  const handleCancel = () => {
    onCancel?.()
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        breakType: {
          code: values.code,
          name: values.name,
          ...(breakType ? { version: breakType.version, id: breakType.id } : {})
        }
      }

      await restClient.post(`/employee-time/${breakType ? 'updateBreakType' : 'createBreakType'}`, payload, {
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
      code: breakType?.code || '',
      name: breakType?.name || ''
    }
    return values
  }, [breakType])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={breakType ? 'Edit Break Type' : 'Create Break Type'}
      description="Configure break type details"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      defaultValues={defaultValues}
      isEditing={!!breakType}
      dataTestId={dataTestId}
      resolver={resolver}
      loading={loading}
    >
      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.breakType.fields.code.label', {
                defaultValue: 'Code'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.breakType.fields.code.placeholder', {
                  defaultValue: 'Enter code (e.g., BR001)'
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
              {t('forms.breakType.fields.name.label', {
                defaultValue: 'Name'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.breakType.fields.name.placeholder', {
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

export default BreakTypeForm
