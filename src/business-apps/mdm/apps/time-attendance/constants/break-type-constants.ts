import { z } from 'zod'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
export const breakTypeDetailRowSchema = z
  .object({
    type: z
      .string()
      .min(
        1,
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.break_type_versions.kind_required',
          'Kind is required'
        )
      ),
    displayOrder: z.number().min(0, 'Display Order must be 0 or greater'),
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    hours: z.string().nullable().optional(),
    length: z.string().nullable().optional(),
    mandatory: z.boolean(),
    payOption: z.string().nullable().optional(),
    combinedWithBreakTypeVersionDetailId: z.string().nullable().optional()
  })
  .superRefine((data, ctx) => {
    // Fixed and Clocking require both Start and End
    if (data.type === 'BREAK_TYPE_FIXED' || data.type === 'BREAK_TYPE_CLOCKING') {
      if (!data.startTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'Start time is required for Fixed and Clocking break types',
          path: ['startTime']
        })
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'End time is required for Fixed and Clocking break types',
          path: ['endTime']
        })
      }
      // Start and End cannot be identical
      if (data.startTime && data.endTime && data.startTime === data.endTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'Start and End times cannot be identical',
          path: ['endTime']
        })
      }
    }

    // Attendance and Target Time require Hours
    if (data.type === 'BREAK_TYPE_ATTENDANCE' || data.type === 'BREAK_TYPE_TARGET_TIME') {
      if (!data.hours) {
        ctx.addIssue({
          code: 'custom',
          message: 'Hours is required for Attendance and Target Time break types',
          path: ['hours']
        })
      }
      if (!data.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Length is required for Attendance and Target Time break types',
          path: ['length']
        })
      }
    }

    // Clocking requires Length
    if (data.type === 'BREAK_TYPE_CLOCKING') {
      if (!data.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Length is required for Clocking break type',
          path: ['length']
        })
      }
      // Validate that length doesn't exceed time span
      if (data.startTime && data.endTime && data.length) {
        const [startHours, startMinutes] = data.startTime.split(':').map(Number)
        const [endHours, endMinutes] = data.endTime.split(':').map(Number)
        const [lengthHours, lengthMinutes] = data.length.split(':').map(Number)

        const startTotalMinutes = startHours * 60 + startMinutes
        const endTotalMinutes = endHours * 60 + endMinutes
        const lengthTotalMinutes = lengthHours * 60 + lengthMinutes

        let spanMinutes = endTotalMinutes - startTotalMinutes
        if (spanMinutes < 0) {
          spanMinutes += 24 * 60
        }

        if (lengthTotalMinutes > spanMinutes) {
          ctx.addIssue({
            code: 'custom',
            message: 'Length cannot exceed the time span between Start and End',
            path: ['length']
          })
        }
      }
    }
  })

export type BreakTypeDetailRowFormData = z.infer<typeof breakTypeDetailRowSchema>

// Helper to calculate length from start and end times
export const calculateLength = (startTime: string | null, endTime: string | null): string | null => {
  if (!startTime || !endTime) return null

  try {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes

    let diffMinutes = endTotalMinutes - startTotalMinutes
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60
    }

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch {
    return null
  }
}

// Default values for a new row
export const getDefaultBreakTypeDetailValues = (): BreakTypeDetailRowFormData => ({
  type: '',
  displayOrder: 0,
  startTime: null,
  endTime: null,
  hours: null,
  length: null,
  mandatory: false,
  payOption: null,
  combinedWithBreakTypeVersionDetailId: null
})
