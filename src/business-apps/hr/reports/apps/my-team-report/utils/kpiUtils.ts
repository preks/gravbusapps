import dayjs from 'dayjs'
import { Employee, EmployeeWorkingCondition } from '../hooks/useGetEmployeesReport'
import { CatalogEntryData } from '../hooks/useCatalogEntries'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'

export interface KpiCardData {
  key: string
  label: string
  subLabel: string
  value: number | string
  iconName: string
  shouldShow: boolean
  row?: number
}

const isDateInMonth = (date: string | null | undefined): boolean => {
  if (!date) return false
  const targetDate = dayjs(date)
  const today = dayjs().startOf('day')
  const daysDiff = targetDate.diff(today, 'day')
  return daysDiff >= 0 && daysDiff <= 30
}

export const generateKpiCards = (
  allEmployees: Employee[],
  averageTenureFormatted: string,
  workingConditions: EmployeeWorkingCondition[],
  contractTypes: CatalogEntryData[],
  employmentTypes: CatalogEntryData[]
): KpiCardData[] => {
  const cards: KpiCardData[] = []

  cards.push({
    key: 'all',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total', 'Total'),
    subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.all_members', 'All members'),
    value: allEmployees.length,
    iconName: 'UserOutlined',
    shouldShow: true,
    row: 1
  })

  cards.push({
    key: 'tenure',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.avg_tenure', 'Avg. Tenure'),
    subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.years_months', 'Years & Months'),
    value: averageTenureFormatted,
    iconName: 'CalendarOutlined',
    shouldShow: true,
    row: 1
  })

  const today = dayjs().startOf('day')
  const days30 = today.add(30, 'day')
  const days60 = today.add(60, 'day')
  const days90 = today.add(90, 'day')

  // Count contracts expiring in 30/60/90 days using exitDate field
  // Active contracts are those where exitDate is null or in the future
  const activeWorkingConditions = workingConditions.filter(wc => {
    // If exitDate exists, check if it's in the future (contract still active)
    if (wc.exitDate) {
      const exitDate = dayjs(wc.exitDate)
      return exitDate.isAfter(today) || exitDate.isSame(today, 'day')
    }
    // If no exitDate, consider active (no expiration date means ongoing)
    return true
  })

  // Contracts expiring in 30 days (within next 30 days, including today)
  const expiring30Days = activeWorkingConditions.filter(wc => {
    if (!wc.exitDate) return false
    const exitDate = dayjs(wc.exitDate).startOf('day')
    return exitDate.isAfter(today) && (exitDate.isBefore(days30) || exitDate.isSame(days30, 'day'))
  })

  // Contracts expiring in 60 days (31-60 days from now)
  const expiring60Days = activeWorkingConditions.filter(wc => {
    if (!wc.exitDate) return false
    const exitDate = dayjs(wc.exitDate).startOf('day')
    return exitDate.isAfter(days30) && (exitDate.isBefore(days60) || exitDate.isSame(days60, 'day'))
  })

  // Contracts expiring in 90 days (61-90 days from now)
  const expiring90Days = activeWorkingConditions.filter(wc => {
    if (!wc.exitDate) return false
    const exitDate = dayjs(wc.exitDate).startOf('day')
    return exitDate.isAfter(days60) && (exitDate.isBefore(days90) || exitDate.isSame(days90, 'day'))
  })

  const totalExpiring = expiring30Days.length + expiring60Days.length + expiring90Days.length

  if (totalExpiring > 0) {
    const expiring30Count = expiring30Days.length
    const expiring60Count = expiring60Days.length
    const expiring90Count = expiring90Days.length

    // Build description showing counts for each time period
    let description = ''
    const contractSingular = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.contract_singular', 'contract')
    const contractPlural = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.contracts_plural', 'contracts')
    const expiringIn30Days = getTranslationFromI18nKeyAndLabel(
      'lowcoder:team_report_kpi.expiring_in_30_days',
      'expiring in 30 days'
    )
    const expiringIn60Days = getTranslationFromI18nKeyAndLabel(
      'lowcoder:team_report_kpi.expiring_in_60_days',
      'expiring in 60 days'
    )
    const expiringIn90Days = getTranslationFromI18nKeyAndLabel(
      'lowcoder:team_report_kpi.expiring_in_90_days',
      'expiring in 90 days'
    )
    const in30Days = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.in_30_days', 'in 30 days')
    const in60Days = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.in_60_days', 'in 60 days')
    const in90Days = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.in_90_days', 'in 90 days')

    if (expiring30Count > 0) {
      const contractWord = expiring30Count === 1 ? contractSingular : contractPlural
      description = `${expiring30Count} ${contractWord} ${expiringIn30Days}`
    } else if (expiring60Count > 0) {
      const contractWord = expiring60Count === 1 ? contractSingular : contractPlural
      description = `${expiring60Count} ${contractWord} ${expiringIn60Days}`
    } else if (expiring90Count > 0) {
      const contractWord = expiring90Count === 1 ? contractSingular : contractPlural
      description = `${expiring90Count} ${contractWord} ${expiringIn90Days}`
    }

    // If multiple time periods have contracts, combine them
    if (expiring30Count > 0 && (expiring60Count > 0 || expiring90Count > 0)) {
      const parts: string[] = []
      if (expiring30Count > 0) parts.push(`${expiring30Count} ${in30Days}`)
      if (expiring60Count > 0) parts.push(`${expiring60Count} ${in60Days}`)
      if (expiring90Count > 0) parts.push(`${expiring90Count} ${in90Days}`)
      const contractWord = totalExpiring === 1 ? contractSingular : contractPlural
      const expiring = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.expiring', 'expiring')
      description = `${totalExpiring} ${contractWord} ${expiring} (${parts.join(', ')})`
    }

    cards.push({
      key: 'expiring-contracts',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_report_kpi.expiring_contracts',
        'Expiring Contracts (30/60/90 days)'
      ),
      subLabel: description,
      value: totalExpiring,
      iconName: 'FileTextOutlined',
      shouldShow: true,
      row: 1
    })
  }

  const startOfMonth = dayjs().startOf('month')
  const endOfMonth = dayjs().endOf('month')

  const probationDueThisMonth = workingConditions.filter(wc => {
    if (!wc.probationEnd) return false
    const probationEnd = dayjs(wc.probationEnd).startOf('day')

    return (
      (probationEnd.isAfter(startOfMonth) || probationEnd.isSame(startOfMonth, 'day')) &&
      (probationEnd.isBefore(endOfMonth) || probationEnd.isSame(endOfMonth, 'day'))
    )
  })

  if (probationDueThisMonth.length > 0) {
    const employeeNeeds = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employee_needs', 'employee needs')
    const employeesNeed = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employees_need', 'employees need')
    const probationFeedbackThisMonth = getTranslationFromI18nKeyAndLabel(
      'lowcoder:team_report_kpi.probation_feedback_this_month',
      'probation feedback this month'
    )

    cards.push({
      key: 'probation-review',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.probation_review_due', 'Probation Review Due'),
      subLabel: `${probationDueThisMonth.length} ${
        probationDueThisMonth.length === 1 ? employeeNeeds : employeesNeed
      } ${probationFeedbackThisMonth}`,
      value: probationDueThisMonth.length,
      iconName: 'ClockCircleOutlined',
      shouldShow: true,
      row: 1
    })
  }

  const contractStartsNext30Days = workingConditions.filter(wc => {
    if (!wc.hireDate) return false
    return isDateInMonth(wc.hireDate)
  })

  if (contractStartsNext30Days.length > 0) {
    const upcomingContract = contractStartsNext30Days
      .map(wc => ({
        wc,
        hireDate: wc.hireDate ? dayjs(wc.hireDate) : null
      }))
      .filter(c => c.hireDate !== null)
      .sort((a, b) => (a.hireDate?.valueOf() || 0) - (b.hireDate?.valueOf() || 0))[0]

    const newHire = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.new_hire', 'new hire')
    const newHires = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.new_hires', 'new hires')
    const starting = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.starting', 'starting')

    let description = `${contractStartsNext30Days.length} ${contractStartsNext30Days.length === 1 ? newHire : newHires}`
    if (upcomingContract?.hireDate) {
      const dateStr =
        formatDate(upcomingContract.hireDate.toDate(), 'date.short') || upcomingContract.hireDate.format('MMM D')

      const contractType =
        upcomingContract.wc.contractType?.value ||
        getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employee', 'Employee')
      description += ` ${starting} ${dateStr} (${contractType})`
    }

    cards.push({
      key: 'contract-start',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_report_kpi.contract_start',
        'Contract Start (Next 30 Days)'
      ),
      subLabel: description,
      value: contractStartsNext30Days.length,
      iconName: 'CalendarOutlined',
      shouldShow: true,
      row: 1
    })
  }

  const employeeSingular = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employee', 'employee')
  const employeesPlural = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employees', 'employees')

  contractTypes.forEach(contractType => {
    const count = workingConditions.filter(wc => wc.contractType?.id === contractType.id).length
    if (count > 0) {
      cards.push({
        key: `contract-type-${contractType.id}`,
        label: contractType.value,
        subLabel: `${count} ${count === 1 ? employeeSingular : employeesPlural}`,
        value: count,
        iconName: 'IdcardOutlined',
        shouldShow: true,
        row: 2
      })
    }
  })

  employmentTypes.forEach(employmentType => {
    const count = workingConditions.filter(wc => wc.employmentType?.id === employmentType.id).length
    if (count > 0) {
      cards.push({
        key: `employment-type-${employmentType.id}`,
        label: employmentType.value,
        subLabel: `${count} ${count === 1 ? employeeSingular : employeesPlural}`,
        value: count,
        iconName: 'TeamOutlined',
        shouldShow: true,
        row: 3
      })
    }
  })

  return cards.filter(card => card.shouldShow)
}

export const matchesKpi = (employee: Employee, activeKpi: string): boolean => {
  switch (activeKpi) {
    case 'all':
      return true
    case 'tenure':
      return !!employee.startDate
    case 'internal': {
      const value = employee.employmentType?.value || ''
      return value === 'Internal'
    }
    case 'external': {
      const value = employee.employmentType?.value || ''
      return value === 'External'
    }
    case 'contract': {
      const value = employee.employmentType?.value || ''
      return value === 'Contract worker'
    }
    case 'fulltime': {
      const value = employee.contractType?.value || ''
      return value.toLowerCase().includes('full time')
    }
    case 'parttime': {
      const value = employee.contractType?.value || ''
      return value.toLowerCase().includes('part time')
    }
    default:
      return true
  }
}
