import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type DayKey =
  | 'mondayHours'
  | 'tuesdayHours'
  | 'wednesdayHours'
  | 'thursdayHours'
  | 'fridayHours'
  | 'saturdayHours'
  | 'sundayHours'

export interface WorkingHoursFormValues {
  activeFrom: string
  activeTo: string
  mondayHours: number | ''
  tuesdayHours: number | ''
  wednesdayHours: number | ''
  thursdayHours: number | ''
  fridayHours: number | ''
  saturdayHours: number | ''
  sundayHours: number | ''
}

export const minHours = 0
export const maxHours = 10

export const dayOrder: Array<{ key: DayKey; labelKey: string; fallback: string }> = [
  { key: 'mondayHours', labelKey: 'lowcoder:absence_hub.day_mon', fallback: 'Mon' },
  { key: 'tuesdayHours', labelKey: 'lowcoder:absence_hub.day_tue', fallback: 'Tue' },
  { key: 'wednesdayHours', labelKey: 'lowcoder:absence_hub.day_wed', fallback: 'Wed' },
  { key: 'thursdayHours', labelKey: 'lowcoder:absence_hub.day_thu', fallback: 'Thu' },
  { key: 'fridayHours', labelKey: 'lowcoder:absence_hub.day_fri', fallback: 'Fri' },
  { key: 'saturdayHours', labelKey: 'lowcoder:absence_hub.day_sat', fallback: 'Sat' },
  { key: 'sundayHours', labelKey: 'lowcoder:absence_hub.day_sun', fallback: 'Sun' }
]

export const fullDayLabels: Record<DayKey, { labelKey: string; fallback: string }> = {
  mondayHours: { labelKey: 'lowcoder:weekdays.monday', fallback: 'Monday' },
  tuesdayHours: { labelKey: 'lowcoder:weekdays.tuesday', fallback: 'Tuesday' },
  wednesdayHours: { labelKey: 'lowcoder:weekdays.wednesday', fallback: 'Wednesday' },
  thursdayHours: { labelKey: 'lowcoder:weekdays.thursday', fallback: 'Thursday' },
  fridayHours: { labelKey: 'lowcoder:weekdays.friday', fallback: 'Friday' },
  saturdayHours: { labelKey: 'lowcoder:weekdays.saturday', fallback: 'Saturday' },
  sundayHours: { labelKey: 'lowcoder:weekdays.sunday', fallback: 'Sunday' }
}

export const dayInputTestIds: Record<DayKey, string> = {
  mondayHours: 'flw_updateWorkingHours_mondayInput',
  tuesdayHours: 'flw_updateWorkingHours_tuesdayInput',
  wednesdayHours: 'flw_updateWorkingHours_wednesdayInput',
  thursdayHours: 'flw_updateWorkingHours_thursdayInput',
  fridayHours: 'flw_updateWorkingHours_fridayInput',
  saturdayHours: 'flw_updateWorkingHours_saturdayInput',
  sundayHours: 'flw_updateWorkingHours_sundayInput'
}

export const buildDayMissingValueError = (dayName: string): string =>
  getTranslationFromI18nKeyAndLabel(
    'lowcoder:working_hours_form.day_missing_value_validation_error',
    `Please enter a valid number of hours (0 - 10) for ${dayName}.`,
    { dayName, interpolation: { escapeValue: false } }
  )
