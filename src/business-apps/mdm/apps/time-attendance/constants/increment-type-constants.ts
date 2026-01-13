import { z } from 'zod'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const INCREMENT_APPLIED_DAYS_OPTIONS = [
  { code: 'BEFORE_APPLIED_DAY', displayValue: 'Before' },
  { code: 'CURRENT_APPLIED_DAY', displayValue: 'Current' },
  { code: 'NEXT_APPLIED_DAY', displayValue: 'Next' }
]

export const TIME_ISSUE_TYPE_OPTIONS = [
  { code: 'ATTENDANCE_TIME_ISSUE', displayValue: 'Attendance' },
  { code: 'TARGET_TIME_ISSUE', displayValue: 'Target Time' },
  { code: 'OVERTIME_ISSUE', displayValue: 'Overtime' },
  { code: 'ABSENCE_TIME_ISSUE', displayValue: 'Absence' },
  { code: 'EXTRA_WORK_TIME_ISSUE', displayValue: 'Extra Work' },
  { code: 'BEFORE_NORMAL_START_ISSUE', displayValue: 'Before Normal Start' },
  { code: 'AFTER_NORMAL_END_ISSUE', displayValue: 'After Normal End' }
]

export const INCREMENT_CALCULATION_TYPE_OPTIONS = [
  { code: 'CALCULATED_INC_CALC_TYPE', displayValue: 'Calculated' },
  { code: 'MIN_INC_CALC_TYPE', displayValue: 'Minimum' },
  { code: 'MAX_INC_CALC_TYPE', displayValue: 'Maximum' },
  { code: 'FIXED_INC_CALC_TYPE', displayValue: 'Fix' }
]

export const INCLUDE_EXCLUDE_OPTIONS = [
  { code: 'NONE_IN_EX_OPTION', displayValue: 'None' },
  { code: 'INCLUDE_OPTION', displayValue: 'Include' },
  { code: 'EXCLUDE_OPTION', displayValue: 'Exclude' }
]

// Validation schema for a single row
export const incrementTypeDetailRowSchema = z
  .object({
    timeIssueType: z.string().min(1, 'Time Issue Type is required'),
    displayOrder: z.number().min(0, 'Display Order must be 0 or greater'),
    includeBreaks: z.boolean(),
    fromAppliedDay: z.string().min(1, 'Day From is required'),
    startTime: z.string().min(1, 'Start Time is required'),
    toAppliedDate: z.string().min(1, 'Day To is required'),
    endTime: z.string().min(1, 'End Time is required'),
    sumTime: z.string().optional(),
    timeTypeId: z.string().min(1, 'Time Type is required'),
    incrementCalculationType: z.string().min(1, 'Calculation Type is required'),
    fixedValue: z.string().nullable().optional(),
    includeExcludeOption: z.string().min(1, 'Include/Exclude Option is required'),
    alternativeIncrementTypeVersionDetailId: z.string().nullable().optional(),
    checkStartBefore: z.boolean(),
    startBeforeTime: z.string().nullable().optional()
  })
  .superRefine((data, ctx) => {
    // Validate fixedValue when calculation type requires it
    if (
      (data.incrementCalculationType === 'MIN_INC_CALC_TYPE' ||
        data.incrementCalculationType === 'MAX_INC_CALC_TYPE' ||
        data.incrementCalculationType === 'FIXED_INC_CALC_TYPE') &&
      (!data.fixedValue || data.fixedValue === '')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['fixedValue'],
        message: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.fixed_value_required',
          'Fixed Value is required for Min, Max, or Fixed calculation types'
        )
      })
    }

    // Validate startBeforeTime when checkStartBefore is true
    if (data.checkStartBefore && (!data.startBeforeTime || data.startBeforeTime === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['startBeforeTime'],
        message: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.fields.start_before_time_required',
          'Start Before Time is required when Start Before is checked'
        )
      })
    }

    // Validate Day From and Day To combination
    if (data.fromAppliedDay && data.toAppliedDate) {
      const dayOrder: Record<string, number> = {
        BEFORE_APPLIED_DAY: 0,
        CURRENT_APPLIED_DAY: 1,
        NEXT_APPLIED_DAY: 2
      }

      const fromOrder = dayOrder[data.fromAppliedDay]
      const toOrder = dayOrder[data.toAppliedDate]

      // Day To cannot be before Day From in temporal order
      if (fromOrder !== undefined && toOrder !== undefined && toOrder < fromOrder) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAppliedDate'],
          message: getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.fields.day_to_before_day_from',
            'Day To cannot be before Day From in temporal order'
          )
        })
      }

      // When Day From equals Day To, Start Time must be before End Time
      if (data.fromAppliedDay === data.toAppliedDate && data.startTime && data.endTime) {
        const parseTime = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number)
          return hours * 60 + minutes
        }

        const startMinutes = parseTime(data.startTime)
        const endMinutes = parseTime(data.endTime)

        if (startMinutes >= endMinutes) {
          ctx.addIssue({
            code: 'custom',
            path: ['endTime'],
            message: getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.fields.end_time_before_start_time',
              'End Time must be after Start Time when Day From equals Day To'
            )
          })
        }
      }
    }
  })

export type IncrementTypeDetailRowFormData = z.infer<typeof incrementTypeDetailRowSchema>

// Helper function to get default values for a new row
export const getDefaultIncrementTypeDetailValues = (): IncrementTypeDetailRowFormData => ({
  timeIssueType: '',
  displayOrder: 0,
  includeBreaks: false,
  fromAppliedDay: '',
  startTime: '',
  toAppliedDate: '',
  endTime: '',
  sumTime: '',
  timeTypeId: '',
  incrementCalculationType: '',
  fixedValue: null,
  includeExcludeOption: 'NONE_IN_EX_OPTION',
  alternativeIncrementTypeVersionDetailId: null,
  checkStartBefore: false,
  startBeforeTime: null
})
