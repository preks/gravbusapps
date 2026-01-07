import React, { useMemo } from 'react'
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
  Checkbox
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export const CLOCKING_TYPE_OPTIONS = [
  { code: 'IN_CLOCKING_TYPE', displayValue: 'Clocking In' },
  { code: 'OUT_CLOCKING_TYPE', displayValue: 'Clocking Out' },
  { code: 'ALL_CLOCKING_TYPE', displayValue: 'All' }
]

export const ROUNDING_TYPE_OPTIONS = [
  { code: 'UP_ROUNDING_TYPE', displayValue: 'Round Up' },
  { code: 'DOWN_ROUNDING_TYPE', displayValue: 'Round Down' },
  { code: 'START_ROUNDING_TYPE', displayValue: 'Start Rounding' },
  { code: 'END_ROUNDING_TYPE', displayValue: 'End Rounding' }
]

// Validation schema
const roundingRuleDetailsSchema = z.object({
  displayOrder: z.number().min(0, 'Display Order must be 0 or greater'),
  clockingType: z.string().min(1, 'Clocking Type is required'),
  roundingType: z.string().min(1, 'Rounding Type is required'),
  startTime: z.string().min(1, 'Start Time is required'),
  endTime: z.string().min(1, 'End Time is required'),
  gracePeriod: z.string().optional(),
  roundingValue: z.string().min(1, 'Rounding Value is required'),
  onlyFirstLast: z.boolean()
})

export type RoundingRuleDetailsFormData = z.infer<typeof roundingRuleDetailsSchema>

export interface RoundingRuleDetailsFormProps extends BusinessAppContextProps {
  roundingRuleVersionId: string
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  roundingRuleDetail?: {
    id: string
    version: number
    displayOrder: number
    clockingType: string
    roundingType: string
    startTime: string | null
    endTime: string | null
    gracePeriod: string | null
    roundingValue: string | null
    onlyFirstLast: boolean
  }
}

export const RoundingRuleDetailsForm: React.FC<RoundingRuleDetailsFormProps> = ({
  roundingRuleVersionId,
  prefixDataTestId,
  childAddButton,
  refetch,
  accessToken,
  roundingRuleDetail
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'RoundingRuleDetailsForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const isEditMode = !!roundingRuleDetail

  const defaultValues = useMemo<RoundingRuleDetailsFormData>(
    () => ({
      displayOrder: roundingRuleDetail?.displayOrder ?? 0,
      clockingType: roundingRuleDetail?.clockingType ?? '',
      roundingType: roundingRuleDetail?.roundingType ?? '',
      startTime: roundingRuleDetail?.startTime ?? '',
      endTime: roundingRuleDetail?.endTime ?? '',
      gracePeriod: roundingRuleDetail?.gracePeriod ?? '',
      roundingValue: roundingRuleDetail?.roundingValue ?? '',
      onlyFirstLast: roundingRuleDetail?.onlyFirstLast ?? false
    }),
    [roundingRuleDetail]
  )

  const handleSubmit = async (data: any) => {
    try {
      const payload = {
        changeMode: 'INSERT',
        roundingRuleVersionDetail: {
          ...(isEditMode ? { id: roundingRuleDetail.id, version: roundingRuleDetail.version } : {}),
          displayOrder: data.displayOrder,
          clockingType: data.clockingType,
          roundingType: data.roundingType,
          startTime: data.startTime,
          endTime: data.endTime,
          gracePeriod: data.gracePeriod || null,
          roundingValue: data.roundingValue,
          onlyFirstLast: data.onlyFirstLast,
          roundingRuleVersion: roundingRuleVersionId
        }
      }

      await restClient.post(
        `/employee-time/${isEditMode ? 'updateRoundingRuleVersionDetail' : 'createRoundingRuleVersionDetail'}`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      refetch()
    } catch (error) {
      console.error('Error saving rounding rule detail:', error)
      throw error
    }
  }

  return (
    <FormWrapperModal
      title={isEditMode ? 'Edit Rounding Rule Detail' : 'Add Rounding Rule Detail'}
      description={isEditMode ? 'Update rounding rule detail configuration' : 'Create a new rounding rule detail'}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      childAddButton={childAddButton}
      dataTestId={dataTestId}
      resolver={zodResolver(roundingRuleDetailsSchema) as any}
      isEditing={isEditMode}
      schema={roundingRuleDetailsSchema}
    >
      <FormField
        name="displayOrder"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Display Order</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                value={field.value ?? 0}
                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                data-testid={formatDataTestId(dataTestId, 'display-order-input')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="clockingType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Clocking Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select clocking type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CLOCKING_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.displayValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="roundingType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rounding Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select rounding type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ROUNDING_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.displayValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="startTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start Time</FormLabel>
            <FormControl>
              <Input {...field} type="time" data-testid={formatDataTestId(dataTestId, 'start-time-input')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="endTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>End Time</FormLabel>
            <FormControl>
              <Input {...field} type="time" data-testid={formatDataTestId(dataTestId, 'end-time-input')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="gracePeriod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grace Period</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="time"
                data-testid={formatDataTestId(dataTestId, 'grace-period-input')}
                placeholder="HH:MM"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="roundingValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rounding Value</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="time"
                data-testid={formatDataTestId(dataTestId, 'rounding-value-input')}
                placeholder="HH:MM"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="onlyFirstLast"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First/Last Only</FormLabel>
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default RoundingRuleDetailsForm
