import { z } from 'zod'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const APPLIED_DAYS_OPTIONS = [
  { code: 'UNKNOWN_APPLIED_DAY', displayValue: 'Unknown' },
  { code: 'BEFORE_APPLIED_DAY', displayValue: 'Before Applied Day' },
  { code: 'CURRENT_APPLIED_DAY', displayValue: 'Current Applied Day' },
  { code: 'NEXT_APPLIED_DAY', displayValue: 'Next Applied Day' }
]

// Validation schema for a single row
export const dayTypeDetailRowSchema = z.object({
  fieldType: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.field_type_required',
        'Field Type is required'
      )
    ),
  appliedDay: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.applied_day_required',
        'Applied Day is required'
      )
    ),
  timeValue: z
    .string()
    .min(
      1,
      getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.day_type_versions.time_value_required',
        'Time Value is required'
      )
    )
})

export type DayTypeDetailRowFormData = z.infer<typeof dayTypeDetailRowSchema>
