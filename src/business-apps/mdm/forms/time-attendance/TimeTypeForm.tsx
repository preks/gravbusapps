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
  accessToken,
  usedCodes = [],
  systemTimeTypes
}) => {
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
      const type = values.type === 'System' ? TimeTypeEnum.TIME_TYPE_SYSTEM : TimeTypeEnum.TIME_TYPE_CUSTOM

      const payload = {
        changeMode: 'INSERT',
        timeType: {
          code: values.code,
          name: values.name,
          type: type,
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
                {getTranslationFromI18nKeyAndLabel('master-data:forms.department.fields.type.label', 'Type')}
              </FormLabel>
              <FormControl>
                <Select
                  onValueChange={value => {
                    field.onChange(value)
                    setIsSystemTimeType(value === 'System')

                    // Reset form fields when changing type
                    setSelectedTimeTypeOption(null)
                    setFieldsToReset(['code', 'name', 'visible'])
                  }}
                  defaultValue={field.value}
                  disabled={!!timeType}
                >
                  <SelectTrigger data-testid={`${dataTestId}-type-select`}>
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_form.select_type',
                        'Select a type'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="System">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.actors.system', 'System')}
                    </SelectItem>
                    <SelectItem value="Custom">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.time_attendance.time_types.fields.custom',
                        'Custom'
                      )}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isSystemTimeType && (
          <div className="nw:space-y-2">
            <Label>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.time_types.type_options.title',
                'Time Type Options'
              )}
            </Label>
            <Combobox
              className="gba:!min-w-[230px] gba:truncate"
              emptyText={getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.time_types.type_options.empty_text',
                'No time type options found.'
              )}
              onValueChange={value => {
                const selectedOption = systemTimeTypes.find(option => option.value === value)

                if (selectedOption) {
                  setSelectedTimeTypeOption(selectedOption)
                } else {
                  setSelectedTimeTypeOption(null)
                }
              }}
              options={systemTimeTypes}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.time_types.type_options.select_placeholder',
                'Select a time type option...'
              )}
              searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                'master-data:hr.time_attendance.time_types.type_options.search_placeholder',
                'Search time type options...'
              )}
            />
          </div>
        )}
      </div>

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
                disabled={isSystemTimeType}
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
                disabled={isSystemTimeType}
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
