import React from 'react'

type WeeklyWorkingHours = {
  sundayHours?: number
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
}

export const useEmployeeWorkingHours = (employee: any): WeeklyWorkingHours | undefined => {
  const wh = employee?.workingHours?.[0]

  return React.useMemo(
    () =>
      wh
        ? {
            sundayHours: wh.sundayHours,
            mondayHours: wh.mondayHours,
            tuesdayHours: wh.tuesdayHours,
            wednesdayHours: wh.wednesdayHours,
            thursdayHours: wh.thursdayHours,
            fridayHours: wh.fridayHours,
            saturdayHours: wh.saturdayHours
          }
        : undefined,
    [
      wh?.sundayHours,
      wh?.mondayHours,
      wh?.tuesdayHours,
      wh?.wednesdayHours,
      wh?.thursdayHours,
      wh?.fridayHours,
      wh?.saturdayHours
    ]
  )
}
