import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Module-level month metadata to avoid recreating arrays per render
const MONTH_I18N_KEYS = [
  'lowcoder:absence_report.employee_table.january',
  'lowcoder:absence_report.employee_table.february',
  'lowcoder:absence_report.employee_table.march',
  'lowcoder:absence_report.employee_table.april',
  'lowcoder:absence_report.employee_table.may',
  'lowcoder:absence_report.employee_table.june',
  'lowcoder:absence_report.employee_table.july',
  'lowcoder:absence_report.employee_table.august',
  'lowcoder:absence_report.employee_table.september',
  'lowcoder:absence_report.employee_table.october',
  'lowcoder:absence_report.employee_table.november',
  'lowcoder:absence_report.employee_table.december'
]

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const GET_EMPLOYEE_ABSENCES_FOR_KPI = `
  query GetEmployeeAbsencesForKPI($supervisorId: uuid!) {
    EmployeeAbsence(
      limit: 500
      where: {
        isDeleted: {_eq: false}
        status: {_eq: "APPROVED"}
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
      orderBy: {startDate: DESC}
    ) {
      id
      startDate
      endDate
      calendarDays
      effectiveDays
      status
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
        parentEntry {
          objectValue
          translations {
            localeCode
            value
          }
          id
          value
        }
      }
    }
  }
`

interface EmployeeAbsence {
  id: string
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail?: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: any
    translations: { localeCode: string; value: string }[]
    id: string
    value: string
    parentEntryId: string
    parentEntry: {
      objectValue: any
      translations: { localeCode: string; value: string }[]
      id: string
      value: string
    }
    groupName?: string
    color?: string
  }
}

interface KPIData {
  barChartData: Array<{
    month: string
    [key: string]: string | number
  }>
  pieChartData: Array<{
    name: string
    value: number
    color?: string
  }>
  groupColors: { [key: string]: string }
  topAbsentees: Array<{
    name: string
    department: string
    total: number
    colorIdx: number
    absences: EmployeeAbsence[]
  }>
  totalAbsenceDays: number
  maxAbsenceDays: number
  vacationShare: number
  departmentData: Array<{
    department: string
    total: number
    colorIdx: number
    absences: EmployeeAbsence[]
  }>
}

export const useAbsenceKPIData = (context: BusinessAppContextProps) => {
  const { accessToken, userInfo } = context
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLocale, setCurrentLocale] = useState<string>(getCurrentActiveUserLocale() ?? 'en-US')

  const graphQLClient = useGraphQLClient(accessToken)

  const getMonthName = (date: string): string => {
    const monthIndex = new Date(date).getMonth()
    return getTranslationFromI18nKeyAndLabel(MONTH_I18N_KEYS[monthIndex], MONTH_LABELS[monthIndex])
  }

  const getTranslatedName = (translations: { localeCode: string; value: string }[], currentLocale: string): string => {
    const translation = translations.find(t => t.localeCode === currentLocale)
    return translation?.value || translations.find(t => t.localeCode === 'en-US')?.value || 'Unknown'
  }

  const processData = useCallback((absences: EmployeeAbsence[], currentLocale: string): KPIData => {
    const enrichedAbsences = absences.map(absence => {
      const groupObjectValue = absence.type.parentEntry.objectValue
      const rawColor = groupObjectValue?.color

      let color = 'var(--nw-chart-1)'
      if (rawColor) {
        color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`
      }

      return {
        ...absence,
        type: {
          ...absence.type,
          groupName: getTranslatedName(absence.type.parentEntry.translations, currentLocale),
          color: color
        }
      }
    })

    const organizedAbsences: { [month: string]: { [type: string]: number } } = {}
    enrichedAbsences.forEach(absence => {
      const month = getMonthName(absence.startDate)
      const type = absence.type.groupName || 'Unknown'
      if (!organizedAbsences[month]) organizedAbsences[month] = {}
      if (!organizedAbsences[month][type]) organizedAbsences[month][type] = 0
      organizedAbsences[month][type] += 1
    })

    const translatedMonthNames = MONTH_I18N_KEYS.map((key, index) =>
      getTranslationFromI18nKeyAndLabel(key, MONTH_LABELS[index])
    )

    const allGroupsInData = new Set<string>()
    Object.values(organizedAbsences).forEach(monthData => {
      Object.keys(monthData).forEach(group => allGroupsInData.add(group))
    })

    const sortedGroups = Array.from(allGroupsInData).sort((a, b) => a.localeCompare(b))

    const barChartData = translatedMonthNames.map(month => {
      const monthData: any = { month }
      sortedGroups.forEach(group => {
        monthData[group] = organizedAbsences[month]?.[group] || 0
      })
      return monthData
    })

    const totalAbsenceDays = enrichedAbsences.reduce((total, absence) => total + (absence.calendarDays || 0), 0)

    const currentYear = new Date().getFullYear()
    const currentYearAbsences = enrichedAbsences.filter(absence => {
      const absenceYear = new Date(absence.startDate).getFullYear()
      return absenceYear === currentYear
    })

    const groupTotals: { [key: string]: number } = {}
    const groupColors: { [key: string]: string } = {}
    currentYearAbsences.forEach(absence => {
      const groupName = absence.type.groupName || 'Unknown'
      const color = absence.type.color || 'var(--nw-chart-1)'

      if (!groupTotals[groupName]) groupTotals[groupName] = 0
      groupTotals[groupName] += absence.calendarDays || 0
      groupColors[groupName] = color
    })

    const currentYearTotalDays = currentYearAbsences.reduce((total, absence) => total + (absence.calendarDays || 0), 0)

    const sortedPieEntries = Object.entries(groupTotals).sort(([a], [b]) => a.localeCompare(b))

    const pieChartData = sortedPieEntries.map(([name, value]) => ({
      name,
      value,
      color: groupColors[name] || 'var(--nw-chart-1)'
    }))

    const employeeAbsences: {
      [key: string]: {
        employee: EmployeeAbsence['employee']
        totalDays: number
        absenceCount: number
        absences: EmployeeAbsence[]
      }
    } = {}
    enrichedAbsences.forEach(absence => {
      const originalGroupName = absence.type.parentEntry.value || ''
      if (originalGroupName.toLowerCase().includes('work leave')) {
        return
      }

      const employeeId = absence.employee.id
      if (!employeeAbsences[employeeId]) {
        employeeAbsences[employeeId] = {
          employee: absence.employee,
          totalDays: 0,
          absenceCount: 0,
          absences: []
        }
      }
      employeeAbsences[employeeId].totalDays += absence.calendarDays || 0
      employeeAbsences[employeeId].absenceCount += 1
      employeeAbsences[employeeId].absences.push(absence)
    })

    const topAbsenteesRaw = Object.values(employeeAbsences)
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, 5)

    const topAbsentees = topAbsenteesRaw.map((emp, index) => ({
      name: `${emp.employee.firstName} ${emp.employee.lastName}`,
      department: emp.employee.employeePosition.organizationalUnit.name,
      total: emp.totalDays,
      colorIdx: index,
      absences: emp.absences
    }))

    const maxAbsenceDays = Math.max(...topAbsentees.map(ta => ta.total), 0)

    const vacationGroupName = Object.keys(groupTotals).find(
      groupName =>
        groupName.toLowerCase().includes('vacation') ||
        groupName.toLowerCase().includes('urlaub') ||
        groupName.toLowerCase().includes('vacances') ||
        groupName.toLowerCase().includes('ferie') ||
        groupName.toLowerCase().includes('holiday') ||
        groupName.toLowerCase().includes('concediu') ||
        groupName.toLowerCase().includes('erholungsurlaub')
    )
    const vacationDays = vacationGroupName ? groupTotals[vacationGroupName] : 0
    const vacationShare = currentYearTotalDays > 0 ? (vacationDays / currentYearTotalDays) * 100 : 0

    const departmentTotals: { [key: string]: EmployeeAbsence[] } = {}
    enrichedAbsences.forEach(absence => {
      const department = absence.employee.employeePosition.organizationalUnit.name
      if (!departmentTotals[department]) departmentTotals[department] = []
      departmentTotals[department].push(absence)
    })

    const departmentData = Object.entries(departmentTotals).map(([department, absences], index) => ({
      department,
      total: absences.reduce((sum, absence) => sum + (absence.calendarDays || 0), 0),
      colorIdx: index,
      absences
    }))

    return {
      barChartData,
      pieChartData,
      groupColors,
      topAbsentees,
      totalAbsenceDays,
      maxAbsenceDays,
      vacationShare,
      departmentData
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!userInfo?.employeeDetails?.employeeId) {
      setError('Employee ID not found')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphQLClient.request<{
        EmployeeAbsence: EmployeeAbsence[]
      }>(GET_EMPLOYEE_ABSENCES_FOR_KPI, {
        supervisorId: userInfo.employeeDetails.employeeId
      })

      const processedData = processData(result.EmployeeAbsence, currentLocale)
      setData(processedData)
    } catch (err) {
      console.error('Error fetching KPI data:', err)
      setError('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [userInfo?.employeeDetails?.employeeId, graphQLClient, processData, currentLocale])

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale() ?? 'en-US'
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()

    const interval = setInterval(checkLocale, 1000)

    return () => clearInterval(interval)
  }, [currentLocale])

  useEffect(() => {
    if (accessToken && userInfo?.employeeDetails?.employeeId) {
      loadData()
    }
  }, [loadData, accessToken, userInfo?.employeeDetails?.employeeId])

  return {
    data,
    loading,
    error,
    refetch: loadData
  }
}
