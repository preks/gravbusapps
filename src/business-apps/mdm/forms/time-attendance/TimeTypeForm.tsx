import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  Combobox,
  Label
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedSystemTimeType, TransformedTimeType } from '../../apps/time-attendance/types/time-types'

// Validation schema
const timeTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['System', 'Custom'], {
    message: 'Please select a type'
  }),
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
  systemTimeTypes: TransformedSystemTimeType[]
}

const TimeTypeForm: React.FC<TimeTypeFormProps> = ({
  prefixDataTestId,
  timeType,
  onCancel,
  childAddButton,
  refetch,
  accessToken: accessToken,
  usedCodes = [],
  systemTimeTypes
}) => {
  const { t } = useTranslation('master-data')
  const dataTestId = formatDataTestId(prefixDataTestId, 'TimeTypeForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [selectedTimeTypeOption, setSelectedTimeTypeOption] = useState<TransformedSystemTimeType | null>(null)
  const [isSystemTimeType, setIsSystemTimeType] = useState(false)
  const [fieldsToReset, setFieldsToReset] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleResetFields = useCallback(() => {
    setSelectedTimeTypeOption(null)
    setIsSystemTimeType(false)
    setFieldsToReset([])
  }, [])

  useEffect(() => {
    setSelectedTimeTypeOption(null)
  }, [isSystemTimeType])

  // Reset fieldsToReset after it's been used
  useEffect(() => {
    if (fieldsToReset.length > 0) {
      setFieldsToReset([])
    }
  }, [fieldsToReset])

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
    handleResetFields()
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      const type = values.type === 'System' ? 'TIME_TYPE_SYSETM' : 'TIME_TYPE_CUSTOM'

      const payload = {
        changeMode: 'INSERT',
        timeType: {
          code: values.code,
          name: values.name,
          type: type,
          visible: values.visible,
          access: values.access,
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
      handleResetFields()
    }
  }

  const defaultValues = useMemo(() => {
    const values = {
      code: timeType?.code || '',
      name: timeType?.name || '',
      type: timeType?.type || 'Custom',
      visible: timeType?.visible ?? true
    }
    return values
  }, [timeType])

  // Values to update form when Combobox selection changes
  const updateValues = useMemo(() => {
    const values = {
      code: selectedTimeTypeOption?.code || '',
      name: selectedTimeTypeOption?.label || '',
      type: 'System',
      visible: selectedTimeTypeOption?.visible ?? true
    }

    if (isSystemTimeType) {
      return values
    } else {
      return undefined
    }
  }, [selectedTimeTypeOption])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={timeType ? 'Edit Time Type' : 'Create Time Type'}
      description="Configure time type details and access permissions"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      defaultValues={defaultValues}
      updateValues={updateValues}
      resetFields={fieldsToReset}
      isEditing={!!timeType}
      dataTestId={dataTestId}
      resolver={resolver}
      loading={loading}
    >
      <div className="gba:flex gba:items-center gba:gap-6">
        <FormField
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.timeType.fields.type.label', {
                  defaultValue: 'Type'
                })}
              </FormLabel>
              <FormControl>
                <Select
                  onValueChange={value => {
                    field.onChange(value)
                    setIsSystemTimeType(value === 'System')

                    // Reset form fields when changing type
                    setSelectedTimeTypeOption(null)
                    setFieldsToReset(['code', 'name', 'visible', 'access'])
                  }}
                  defaultValue={field.value}
                  disabled={!!timeType}
                >
                  <SelectTrigger data-testid={`${dataTestId}-type-select`}>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="System">System</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isSystemTimeType && (
          <div className="nw:space-y-2">
            <Label>Time Type Options</Label>
            <Combobox
              emptyText="No time type options found."
              onValueChange={value => {
                const selectedOption = systemTimeTypes.find(option => option.value === value)

                if (selectedOption) {
                  setSelectedTimeTypeOption(selectedOption)
                } else {
                  setSelectedTimeTypeOption(null)
                }
              }}
              options={systemTimeTypes}
              placeholder="Select a time type option..."
              searchPlaceholder="Search time type options..."
            />
          </div>
        )}
      </div>

      <FormField
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('forms.timeType.fields.code.label', {
                defaultValue: 'Code'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.timeType.fields.code.placeholder', {
                  defaultValue: 'Enter code (e.g., WK, BR, OT)'
                })}
                data-testid={`${dataTestId}-code-input`}
                disabled={isSystemTimeType}
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
              {t('forms.timeType.fields.name.label', {
                defaultValue: 'Name'
              })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('forms.timeType.fields.name.placeholder', {
                  defaultValue: 'Enter name'
                })}
                data-testid={`${dataTestId}-name-input`}
                disabled={isSystemTimeType}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="gba:flex gba:items-center gba:gap-6">
        <FormField
          name="visible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.timeType.fields.visibility.label', {
                  defaultValue: 'Visibility'
                })}
              </FormLabel>
              <FormControl>
                <Select
                  {...field}
                  value={field.value ? 'true' : 'false'}
                  disabled={isSystemTimeType}
                  onValueChange={value => field.onChange(value === 'true')}
                >
                  <SelectTrigger data-testid={`${dataTestId}-visibility-select`}>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Visible</SelectItem>
                    <SelectItem value="false">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormWrapperModal>
  )
}

export default TimeTypeForm
