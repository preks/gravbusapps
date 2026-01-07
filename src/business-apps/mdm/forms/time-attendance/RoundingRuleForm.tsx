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
import { RoundingRule } from '../../apps/time-attendance/types/rounding-rules'

// Validation schema
const roundingRuleSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required')
})

export type RoundingRuleFormData = z.infer<typeof roundingRuleSchema>

export interface RoundingRuleFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  roundingRule?: RoundingRule
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  usedCodes: string[]
}

const RoundingRuleForm: React.FC<RoundingRuleFormProps> = ({
  prefixDataTestId,
  roundingRule,
  onCancel,
  childAddButton,
  refetch,
  accessToken: accessToken,
  usedCodes = []
}) => {
  const { t } = useTranslation('master-data')
  const dataTestId = formatDataTestId(prefixDataTestId, 'RoundingRuleForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  // Create resolver with custom validation for code uniqueness
  const resolver = useMemo(() => {
    return zodResolver(
      roundingRuleSchema.refine(
        data => {
          // Skip validation for edit mode if code hasn't changed
          if (roundingRule && data.code === roundingRule.code) {
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
  }, [usedCodes, roundingRule])

  const handleCancel = () => {
    onCancel?.()
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        roundingRule: {
          code: values.code,
          name: values.name,
          ...(roundingRule ? { version: roundingRule.version, id: roundingRule.id } : {})
        }
      }

      await restClient.post(`/employee-time/${roundingRule ? 'updateRoundingRule' : 'createRoundingRule'}`, payload, {
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
      code: roundingRule?.code || '',
      name: roundingRule?.name || ''
    }
    return values
  }, [roundingRule])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={roundingRule ? 'Edit Rounding Rule' : 'Create Rounding Rule'}
      description="Configure rounding rule details"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      defaultValues={defaultValues}
      isEditing={!!roundingRule}
      dataTestId={dataTestId}
      resolver={resolver}
      loading={loading}
      schema={roundingRuleSchema}
    >
      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.roundingRule.fields.code.label', {
                defaultValue: 'Code'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.roundingRule.fields.code.placeholder', {
                  defaultValue: 'Enter code (e.g., RR001)'
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
              {t('forms.roundingRule.fields.name.label', {
                defaultValue: 'Name'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.roundingRule.fields.name.placeholder', {
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

export default RoundingRuleForm
