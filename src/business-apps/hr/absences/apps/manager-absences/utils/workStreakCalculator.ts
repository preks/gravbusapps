import dayjs from 'dayjs'

export const calculateWorkStreaks = (absencesForStreak: any[]): number[] => {
  const employeeAbsences: { [key: string]: any[] } = {}

  absencesForStreak.forEach(absence => {
    const employeeId = absence.employee.id
    if (!employeeAbsences[employeeId]) {
      employeeAbsences[employeeId] = []
    }
    employeeAbsences[employeeId].push(absence)
  })

  const workStreaks: number[] = []
  const currentDate = dayjs()
  const yearStart = dayjs().startOf('year')

  Object.keys(employeeAbsences).forEach(employeeId => {
    const employeeAbsenceList = [...employeeAbsences[employeeId]]
    employeeAbsenceList.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))

    let currentStreak = 0
    let lastAbsenceEnd = yearStart

    employeeAbsenceList.forEach(absence => {
      const absenceStart = dayjs(absence.startDate)
      const absenceEnd = dayjs(absence.endDate)

      if (absenceStart.isAfter(lastAbsenceEnd)) {
        const workDays = absenceStart.diff(lastAbsenceEnd, 'day')
        currentStreak += workDays
      }

      if (absenceEnd.isAfter(lastAbsenceEnd)) {
        lastAbsenceEnd = absenceEnd
      }
    })

    if (currentDate.isAfter(lastAbsenceEnd)) {
      const finalWorkDays = currentDate.diff(lastAbsenceEnd, 'day')
      currentStreak += finalWorkDays
    }

    workStreaks.push(currentStreak)
  })

  return workStreaks
}

export const calculateAverageWorkStreak = (workStreaks: number[]): string => {
  if (workStreaks.length === 0) return '0.0'

  const average = workStreaks.reduce((sum, streak) => sum + streak, 0) / workStreaks.length
  return (Math.round(average * 10) / 10).toFixed(1)
}
