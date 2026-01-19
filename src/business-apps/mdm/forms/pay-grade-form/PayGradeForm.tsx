import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
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
import { env } from '@/common/env/EnvUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { PayGrade } from '../../apps/compensation-data/components/tabs'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const DATA_TEST_ID_PREFIX = 'PayGradeForm'

export interface PayGradeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  refetch: () => void
  payGradeLevel?: number
  payGrade?: PayGrade
  childAddButton: React.ReactNode
  onCancel?: () => void
  defaultValues?: Record<string, any>
  isDrawerActive?: boolean
}

export const PayGradeForm: React.FC<PayGradeFormProps> = ({
  prefixDataTestId,
  refetch,
  payGradeLevel,
  payGrade,
  accessToken,
  childAddButton,
  onCancel,
  defaultValues = {},
  isDrawerActive = false
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { t } = useTranslation('master-data')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        compensationBand: {
          ...(payGrade ? { version: payGrade.version, id: payGrade.id } : {}),
          name: values.name,
          currency: values.currency,
          maxSalary: values.maxSalary,
          minSalary: values.minSalary,
          payGrade: payGradeLevel
        }
      }

      await restClient.post(
        '/employee/saveCompensationBand',
        {
          ...payload
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      refetch()
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={
        payGrade
          ? t('forms.compensationBand.edit.title', { defaultValue: 'Edit Compensation Band' })
          : t('forms.compensationBand.create.title', {
              defaultValue: 'Create Compensation Band'
            })
      }
      description={t('forms.compensationBand.description', {
        defaultValue: 'Configure compensation band details and salary ranges'
      })}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={
        payGrade
          ? {
              ...payGrade,
              // Transform currency object to string format if needed
              currency: payGrade.currency?.id
                ? `Currency:v1:${payGrade.currency.id}`
                : payGrade.currency || 'Currency:v1:EUR'
            }
          : {
              ...defaultValues,
              currency: 'Currency:v1:EUR'
            }
      }
      isEditing={!!payGrade}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="name"
        rules={{
          required: t('forms.compensationBand.fields.name.validation', {
            defaultValue: 'Please enter compensation band name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.compensationBand.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.compensationBand.fields.name.placeholder', {
                  defaultValue: 'Enter compensation band name'
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          name="minSalary"
          rules={{
            required: t('forms.compensationBand.fields.minSalary.validation', {
              defaultValue: 'Please enter minimum salary'
            })
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.compensationBand.fields.minSalary.label', {
                  defaultValue: 'Minimum Salary'
                })}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t('forms.compensationBand.fields.minSalary.placeholder', {
                    defaultValue: 'Minimum salary'
                  })}
                  className="gba:w-full"
                  {...field}
                  onChange={e => field.onChange(Number.parseFloat(e.target.value) || 0)}
                  data-testid={`${dataTestId}-min-salary-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="maxSalary"
          rules={{
            required: t('forms.compensationBand.fields.maxSalary.validation', {
              defaultValue: 'Please enter maximum salary'
            })
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.compensationBand.fields.maxSalary.label', {
                  defaultValue: 'Maximum Salary'
                })}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t('forms.compensationBand.fields.maxSalary.placeholder', {
                    defaultValue: 'Maximum salary'
                  })}
                  className="gba:w-full"
                  {...field}
                  onChange={e => field.onChange(Number.parseFloat(e.target.value) || 0)}
                  data-testid={`${dataTestId}-max-salary-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name="currency"
        rules={{
          required: t('forms.compensationBand.fields.currency.validation', {
            defaultValue: 'Please select currency'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.compensationBand.fields.currency.label', {
                defaultValue: 'Currency'
              })}
            </FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger data-testid={`${dataTestId}-currency-select`}>
                  <SelectValue
                    placeholder={t('forms.compensationBand.fields.currency.placeholder', {
                      defaultValue: 'Select currency'
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Currency:v1:EUR">
                    {t('forms.compensationBand.fields.currency.options.eur', {
                      defaultValue: 'Euro (EUR)'
                    })}
                  </SelectItem>
                  <SelectItem value="Currency:v1:USD">
                    {t('forms.compensationBand.fields.currency.options.usd', {
                      defaultValue: 'US Dollar (USD)'
                    })}
                  </SelectItem>
                  <SelectItem value="Currency:v1:GBP">
                    {t('forms.compensationBand.fields.currency.options.gbp', {
                      defaultValue: 'British Pound (GBP)'
                    })}
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

export default PayGradeForm
