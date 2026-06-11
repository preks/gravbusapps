import React from 'react'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'

type WeeklyWorkingHours = {
  activeFrom?: string | null
  activeTo?: string | null
  sundayHours?: number
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
}

export const useEmployeeWorkingHours = (employee: any): WeeklyWorkingHours | undefined => {
  return React.useMemo(
    () => getActiveWorkingHours<WeeklyWorkingHours>(employee?.workingHours),
    [employee?.workingHours]
  )
}
