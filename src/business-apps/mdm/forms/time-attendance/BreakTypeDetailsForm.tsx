import React, { useMemo, useState, useEffect } from 'react'
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
import { useForm } from 'react-hook-form'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedBreakTypeVersionDetail } from '../../apps/time-attendance/types/break-type-version-details'

export const BREAK_TYPE_OPTIONS = [
  { code: 'UNKNOWN_BREAK_TYPE', displayValue: 'Unknown' },
  { code: 'BREAK_TYPE_FIXED', displayValue: 'Fixed' },
  { code: 'BREAK_TYPE_CLOCKING', displayValue: 'Clocking' },
  { code: 'BREAK_TYPE_ATTENDANCE', displayValue: 'Attendance' },
  { code: 'BREAK_TYPE_TARGET_TIME', displayValue: 'Target Time' }
]

export const PAY_OPTIONS = [
  { code: 'UNKNOWN_PAY_OPTION', displayValue: 'Unknown' },
  { code: 'PAY_OPTION_PAID', displayValue: 'Paid' },
  { code: 'PAY_OPTION_UNPAID', displayValue: 'Unpaid' },
  { code: 'PAY_OPTION_PAID_NO_INCREMENT', displayValue: 'Paid No Increment' }
]

// Validation schema with conditional validation based on type
const breakTypeDetailsSchema = z
  .object({
    type: z.string().min(1, 'Kind is required'),
    displayOrder: z.number().min(0, 'Display Order must be 0 or greater'),
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    hours: z.string().nullable().optional(),
    length: z.string().nullable().optional(),
    mandatory: z.boolean(),
    payOption: z.string().nullable().optional(),
    combinedWithBreakTypeVersionDetailId: z.string().nullable().optional()
  })
  .refine(
    data => {
      // Fixed and Clocking require both Start and End
      // This makes the form invalid but doesn't show error messages on fields
      if (data.type === 'BREAK_TYPE_FIXED' || data.type === 'BREAK_TYPE_CLOCKING') {
        return !!(data.startTime && data.endTime)
      }
      return true
    },
    {
      message: 'Both Start and End are required for Fixed and Clocking break types'
    }
  )
  .refine(
    data => {
      // Start and End cannot be identical (would result in 00:00 length)
      if (data.type === 'BREAK_TYPE_FIXED' || data.type === 'BREAK_TYPE_CLOCKING') {
        if (data.startTime && data.endTime && data.startTime === data.endTime) {
          return false
        }
      }
      return true
    },
    {
      message: 'Start and End times cannot be identical',
      path: ['endTime']
    }
  )
  .refine(
    data => {
      // Attendance and Target Time require Hours
      if (data.type === 'BREAK_TYPE_ATTENDANCE' || data.type === 'BREAK_TYPE_TARGET_TIME') {
        return !!data.hours
      }
      return true
    },
    {
      message: 'Hours is required for Attendance and Target Time break types',
      path: ['hours']
    }
  )
  .refine(
    data => {
      // Clocking requires Length and it must not exceed the time span
      if (data.type === 'BREAK_TYPE_CLOCKING') {
        if (!data.length) {
          return false // Length is required for Clocking
        }
        if (data.startTime && data.endTime && data.length) {
          // Calculate time span in minutes
          const [startHours, startMinutes] = data.startTime.split(':').map(Number)
          const [endHours, endMinutes] = data.endTime.split(':').map(Number)
          const [lengthHours, lengthMinutes] = data.length.split(':').map(Number)

          const startTotalMinutes = startHours * 60 + startMinutes
          const endTotalMinutes = endHours * 60 + endMinutes
          const lengthTotalMinutes = lengthHours * 60 + lengthMinutes

          // Handle case where endTime is on the next day
          let spanMinutes = endTotalMinutes - startTotalMinutes
          if (spanMinutes < 0) {
            spanMinutes += 24 * 60
          }

          return lengthTotalMinutes <= spanMinutes
        }
      }
      return true
    },
    {
      message: 'Length is required for Clocking and cannot exceed the time span between Start and End',
      path: ['length']
    }
  )
  .refine(
    data => {
      // Attendance and Target Time require Length
      if (data.type === 'BREAK_TYPE_ATTENDANCE' || data.type === 'BREAK_TYPE_TARGET_TIME') {
        return !!data.length
      }
      return true
    },
    {
      message: 'Length is required for Attendance and Target Time break types',
      path: ['length']
    }
  )

export type BreakTypeDetailsFormData = z.infer<typeof breakTypeDetailsSchema>

export interface BreakTypeDetailsFormProps extends BusinessAppContextProps {
  breakTypeVersionId: string
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  availableBreakTypeDetails?: TransformedBreakTypeVersionDetail[]
  breakTypeDetails?: {
    id: string
    version: number
    displayOrder: number
    type: string
    startTime: string | null
    endTime: string | null
    hours: string | null
    length: string | null
    mandatory: boolean
    payOption: string | null
    combinedWithBreakTypeVersionDetailId: string | null
  }
}

const BreakTypeDetailsForm: React.FC<BreakTypeDetailsFormProps> = ({
  breakTypeVersionId,
  prefixDataTestId,
  breakTypeDetails,
  childAddButton,
  refetch,
  accessToken,
  availableBreakTypeDetails = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'BreakTypeDetailsForm')
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)
  const [previousType, setPreviousType] = useState<string | null>(null)

  const defaultValues = useMemo(() => {
    const values: BreakTypeDetailsFormData = {
      type: breakTypeDetails?.type || '',
      displayOrder: breakTypeDetails?.displayOrder ?? 0,
      startTime: breakTypeDetails?.startTime || null,
      endTime: breakTypeDetails?.endTime || null,
      hours: breakTypeDetails?.hours || null,
      length: breakTypeDetails?.length || null,
      mandatory: breakTypeDetails?.mandatory ?? false,
      payOption: breakTypeDetails?.payOption || null,
      combinedWithBreakTypeVersionDetailId: breakTypeDetails?.combinedWithBreakTypeVersionDetailId || null
    }
    return values
  }, [breakTypeDetails])

  // Create form instance to access watch and setValue
  const form = useForm<BreakTypeDetailsFormData>({
    resolver: zodResolver(breakTypeDetailsSchema),
    defaultValues,
    mode: 'onChange'
  })

  // Reset form when defaultValues change
  useEffect(() => {
    form.reset(defaultValues)
    setPreviousType(defaultValues.type)
  }, [defaultValues, form])

  // Filter available break type details (exclude current one if editing)
  const combinedOptions = useMemo(() => {
    return availableBreakTypeDetails.filter(detail => detail.id !== breakTypeDetails?.id)
  }, [availableBreakTypeDetails, breakTypeDetails?.id])

  // Calculate length as difference between endTime and startTime
  const calculateLength = (startTime: string | null, endTime: string | null): string | null => {
    if (!startTime || !endTime) return null

    try {
      // Parse time strings (format: "HH:mm")
      const [startHours, startMinutes] = startTime.split(':').map(Number)
      const [endHours, endMinutes] = endTime.split(':').map(Number)

      // Calculate total minutes
      const startTotalMinutes = startHours * 60 + startMinutes
      const endTotalMinutes = endHours * 60 + endMinutes

      // Calculate difference
      let diffMinutes = endTotalMinutes - startTotalMinutes

      // Handle case where endTime is on the next day
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60 // Add 24 hours
      }

      // Convert to hours and minutes
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60

      // Format as "HH:mm" (required format for time input)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch (error) {
      console.error('Error calculating length:', error)
      return null
    }
  }

  // Watch form values
  const currentType = form.watch('type')
  const startTime = form.watch('startTime')
  const endTime = form.watch('endTime')

  // Determine which fields should be enabled/disabled based on type
  const isFixedOrClocking = useMemo(() => {
    return currentType === 'BREAK_TYPE_FIXED' || currentType === 'BREAK_TYPE_CLOCKING'
  }, [currentType])

  const isAttendanceOrTargetTime = useMemo(() => {
    return currentType === 'BREAK_TYPE_ATTENDANCE' || currentType === 'BREAK_TYPE_TARGET_TIME'
  }, [currentType])

  const isFixed = useMemo(() => {
    return currentType === 'BREAK_TYPE_FIXED'
  }, [currentType])

  const isClocking = useMemo(() => {
    return currentType === 'BREAK_TYPE_CLOCKING'
  }, [currentType])

  // Reset fields when type changes
  useEffect(() => {
    if (previousType && previousType !== currentType) {
      // Reset fields that are not relevant for the new type
      if (isFixedOrClocking) {
        // If switching to Fixed/Clocking, clear Hours
        form.setValue('hours', null, { shouldValidate: false })
      } else if (isAttendanceOrTargetTime) {
        // If switching to Attendance/Target Time, clear Start and End
        form.setValue('startTime', null, { shouldValidate: false })
        form.setValue('endTime', null, { shouldValidate: false })
        if (!isClocking) {
          form.setValue('length', null, { shouldValidate: false })
        }
      } else {
        // Unknown type - clear all optional fields
        form.setValue('startTime', null, { shouldValidate: false })
        form.setValue('endTime', null, { shouldValidate: false })
        form.setValue('hours', null, { shouldValidate: false })
        form.setValue('length', null, { shouldValidate: false })
      }
      setPreviousType(currentType)
    }
  }, [currentType, previousType, isFixedOrClocking, isAttendanceOrTargetTime, isClocking, form])

  // Calculate length for Fixed type
  const calculatedLength = useMemo(() => {
    if (isFixed && startTime && endTime) {
      return calculateLength(startTime, endTime)
    }
    return null
  }, [isFixed, startTime, endTime])

  // Update length field when it's Fixed type
  useEffect(() => {
    if (isFixed && calculatedLength) {
      form.setValue('length', calculatedLength, { shouldValidate: false })
    }
  }, [isFixed, calculatedLength, form])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      // Calculate length based on type
      let finalLength: string | null = null
      if (isFixed) {
        // For Fixed, calculate automatically
        finalLength = calculateLength(values.startTime, values.endTime)
      } else if (isClocking || isAttendanceOrTargetTime) {
        // For Clocking, Attendance, and Target Time, use the value from form
        finalLength = values.length || null
      }

      const payload = {
        changeMode: 'INSERT',
        breakTypeVersionDetail: {
          breakTypeVersion: breakTypeVersionId,
          type: values.type,
          displayOrder: values.displayOrder,
          startTime: isFixedOrClocking ? values.startTime || null : null,
          endTime: isFixedOrClocking ? values.endTime || null : null,
          hours: isAttendanceOrTargetTime ? values.hours || null : null,
          length: finalLength,
          mandatory: values.mandatory,
          payOption: values.payOption || null,
          combinedWithBreakTypeVersionDetail: values.combinedWithBreakTypeVersionDetailId || null,
          ...(breakTypeDetails?.id ? { id: breakTypeDetails.id, version: breakTypeDetails.version } : {})
        }
      }

      const endpoint = breakTypeDetails?.id ? 'updateBreakTypeVersionDetail' : 'createBreakTypeVersionDetail'
      await restClient.post(`/employee-time/${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      refetch()
    } catch (error) {
      console.error('Error saving break type details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={breakTypeDetails?.id ? 'Edit Break Details' : 'Create Break Details'}
      description="Configure break type version details"
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      isEditing={!!breakTypeDetails}
      dataTestId={dataTestId}
      form={form as any}
      loading={loading}
    >
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {BREAK_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.displayValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="displayOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                  value={field.value}
                  placeholder="0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="startTime"
          render={({ field }) => (
            <FormItem className="gba:flex gba:flex-col">
              <FormLabel>Start</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="time"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value || null)}
                  placeholder="HH:mm"
                  disabled={!isFixedOrClocking}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="endTime"
          render={({ field }) => (
            <FormItem className="gba:flex gba:flex-col">
              <FormLabel>End</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="time"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value || null)}
                  placeholder="HH:mm"
                  disabled={!isFixedOrClocking}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="hours"
          render={({ field }) => (
            <FormItem className="gba:flex gba:flex-col">
              <FormLabel>Hours</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="time"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value || null)}
                  placeholder="HH:mm"
                  disabled={!isAttendanceOrTargetTime}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="length"
          render={({ field }) => (
            <FormItem className="gba:flex gba:flex-col">
              <FormLabel>Length</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="time"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value || null)}
                  placeholder="HH:mm"
                  disabled={isFixed}
                  readOnly={isFixed}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="mandatory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mandatory</FormLabel>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="payOption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setting</FormLabel>
              <FormControl>
                <Select onValueChange={value => field.onChange(value || null)} value={field.value || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select setting" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_OPTIONS.map(option => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.displayValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {combinedOptions && combinedOptions.length > 0 && (
          <FormField
            name="combinedWithBreakTypeVersionDetailId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Combine</FormLabel>
                <FormControl>
                  <Select onValueChange={value => field.onChange(value || null)} value={field.value || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select break to combine with" />
                    </SelectTrigger>
                    <SelectContent>
                      {combinedOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          Order {option.displayOrder} -{' '}
                          {BREAK_TYPE_OPTIONS.find(opt => opt.code === option.type)?.displayValue || option.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </FormWrapperModal>
  )
}

export default BreakTypeDetailsForm
