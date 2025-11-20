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

const createBasicCards = (allEmployees: Employee[], averageTenureFormatted: string): KpiCardData[] => {
  return [
    {
      key: 'all',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total', 'Total'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.all_members', 'All members'),
      value: allEmployees.length,
      iconName: 'UserOutlined',
      shouldShow: true,
      row: 1
    },
    {
      key: 'tenure',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.avg_tenure', 'Avg. Tenure'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.years_months', 'Years & Months'),
      value: averageTenureFormatted,
      iconName: 'CalendarOutlined',
      shouldShow: true,
      row: 1
    }
  ]
}

const getActiveWorkingConditions = (
  workingConditions: EmployeeWorkingCondition[],
  today: dayjs.Dayjs
): EmployeeWorkingCondition[] => {
  return workingConditions.filter(wc => {
    if (wc.exitDate) {
      const exitDate = dayjs(wc.exitDate)
      return exitDate.isAfter(today) || exitDate.isSame(today, 'day')
    }
    return true
  })
}

const getExpiringContracts = (
  activeWorkingConditions: EmployeeWorkingCondition[],
  today: dayjs.Dayjs,
  days30: dayjs.Dayjs,
  days60: dayjs.Dayjs,
  days90: dayjs.Dayjs
) => {
  const expiring30Days = activeWorkingConditions.filter(wc => {
    if (!wc.exitDate) return false
    const exitDate = dayjs(wc.exitDate).startOf('day')
    return exitDate.isAfter(today) && (exitDate.isBefore(days30) || exitDate.isSame(days30, 'day'))
  })

  const expiring60Days = activeWorkingConditions.filter(wc => {
    if (!wc.exitDate) return false
    const exitDate = dayjs(wc.exitDate).startOf('day')
    return exitDate.isAfter(days30) && (exitDate.isBefore(days60) || exitDate.isSame(days60, 'day'))
  })

  const expiring90Days = activeWorkingConditions.filter(wc => {
    if (!wc.exitDate) return false
    const exitDate = dayjs(wc.exitDate).startOf('day')
    return exitDate.isAfter(days60) && (exitDate.isBefore(days90) || exitDate.isSame(days90, 'day'))
  })

  return { expiring30Days, expiring60Days, expiring90Days }
}

const buildExpiringContractsDescription = (
  expiring30Count: number,
  expiring60Count: number,
  expiring90Count: number
): string => {
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

  if (expiring30Count > 0) {
    const contractWord = expiring30Count === 1 ? contractSingular : contractPlural
    return `${contractWord} ${expiringIn30Days}`
  }

  if (expiring60Count > 0) {
    const contractWord = expiring60Count === 1 ? contractSingular : contractPlural
    return `${contractWord} ${expiringIn60Days}`
  }

  if (expiring90Count > 0) {
    const contractWord = expiring90Count === 1 ? contractSingular : contractPlural
    return `${contractWord} ${expiringIn90Days}`
  }

  return ''
}

const buildCombinedExpiringDescription = (
  expiring30Count: number,
  expiring60Count: number,
  expiring90Count: number,
  totalExpiring: number
): string => {
  const contractSingular = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.contract_singular', 'contract')
  const contractPlural = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.contracts_plural', 'contracts')
  const in30Days = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.in_30_days', 'in 30 days')
  const in60Days = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.in_60_days', 'in 60 days')
  const in90Days = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.in_90_days', 'in 90 days')
  const expiring = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.expiring', 'expiring')

  const parts: string[] = []
  if (expiring30Count > 0) parts.push(`${expiring30Count} ${in30Days}`)
  if (expiring60Count > 0) parts.push(`${expiring60Count} ${in60Days}`)
  if (expiring90Count > 0) parts.push(`${expiring90Count} ${in90Days}`)
  const contractWord = totalExpiring === 1 ? contractSingular : contractPlural
  return `${contractWord} ${expiring} (${parts.join(', ')})`
}

const createExpiringContractsCard = (workingConditions: EmployeeWorkingCondition[]): KpiCardData | null => {
  const today = dayjs().startOf('day')
  const days30 = today.add(30, 'day')
  const days60 = today.add(60, 'day')
  const days90 = today.add(90, 'day')

  const activeWorkingConditions = getActiveWorkingConditions(workingConditions, today)
  const { expiring30Days, expiring60Days, expiring90Days } = getExpiringContracts(
    activeWorkingConditions,
    today,
    days30,
    days60,
    days90
  )

  const expiring30Count = expiring30Days.length
  const expiring60Count = expiring60Days.length
  const expiring90Count = expiring90Days.length
  const totalExpiring = expiring30Count + expiring60Count + expiring90Count

  if (totalExpiring === 0) return null

  let description = buildExpiringContractsDescription(expiring30Count, expiring60Count, expiring90Count)

  if (expiring30Count > 0 && (expiring60Count > 0 || expiring90Count > 0)) {
    description = buildCombinedExpiringDescription(expiring30Count, expiring60Count, expiring90Count, totalExpiring)
  }

  return {
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
  }
}

const createProbationReviewCard = (workingConditions: EmployeeWorkingCondition[]): KpiCardData | null => {
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

  if (probationDueThisMonth.length === 0) return null

  const employeeNeeds = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employee_needs', 'employee needs')
  const employeesNeed = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.employees_need', 'employees need')
  const probationFeedbackThisMonth = getTranslationFromI18nKeyAndLabel(
    'lowcoder:team_report_kpi.probation_feedback_this_month',
    'probation feedback this month'
  )

  return {
    key: 'probation-review',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.probation_review_due', 'Probation Review Due'),
    subLabel: `${probationDueThisMonth.length === 1 ? employeeNeeds : employeesNeed} ${probationFeedbackThisMonth}`,
    value: probationDueThisMonth.length,
    iconName: 'ClockCircleOutlined',
    shouldShow: true,
    row: 1
  }
}

const createContractStartCard = (workingConditions: EmployeeWorkingCondition[]): KpiCardData | null => {
  const contractStartsNext30Days = workingConditions.filter(wc => {
    if (!wc.hireDate) return false
    return isDateInMonth(wc.hireDate)
  })

  if (contractStartsNext30Days.length === 0) return null

  const upcomingContracts = contractStartsNext30Days
    .map(wc => ({
      wc,
      hireDate: wc.hireDate ? dayjs(wc.hireDate) : null
    }))
    .filter(c => c.hireDate !== null)
    .sort((a, b) => (a.hireDate?.valueOf() || 0) - (b.hireDate?.valueOf() || 0))

  const newHire = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.new_hire', 'new hire')
  const newHires = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.new_hires', 'new hires')
  const starting = getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.starting', 'starting')

  let description = `${contractStartsNext30Days.length} ${contractStartsNext30Days.length === 1 ? newHire : newHires}`

  if (upcomingContracts.length > 0) {
    const employeeDescriptions = upcomingContracts.map(contract => {
      const dateStr = formatDate(contract.hireDate!.toDate(), 'date.short') || contract.hireDate!.format('MMM D')
      const employmentType = contract.wc.employmentType?.value || ''
      return `${starting} ${dateStr} (${employmentType})`
    })
    description += ` ${employeeDescriptions.join(', ')}`
  }

  return {
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
  }
}

const createCatalogTypeCards = (
  catalogEntries: CatalogEntryData[],
  workingConditions: EmployeeWorkingCondition[],
  getCount: (wc: EmployeeWorkingCondition, entryId: string) => boolean,
  keyPrefix: string,
  iconName: string,
  row: number
): KpiCardData[] => {
  const employeeSingular = getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'employee')
  const employeesPlural = getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_list_title', 'employees')
  const cards: KpiCardData[] = []

  catalogEntries.forEach(entry => {
    const count = workingConditions.filter(wc => getCount(wc, entry.id)).length
    if (count > 0) {
      cards.push({
        key: `${keyPrefix}-${entry.id}`,
        label: entry.value,
        subLabel: `${count === 1 ? employeeSingular : employeesPlural}`,
        value: count,
        iconName,
        shouldShow: true,
        row
      })
    }
  })

  return cards
}

export const generateKpiCards = (
  allEmployees: Employee[],
  averageTenureFormatted: string,
  workingConditions: EmployeeWorkingCondition[],
  contractTypes: CatalogEntryData[],
  employmentTypes: CatalogEntryData[]
): KpiCardData[] => {
  const cards: KpiCardData[] = []

  cards.push(...createBasicCards(allEmployees, averageTenureFormatted))

  const expiringContractsCard = createExpiringContractsCard(workingConditions)
  if (expiringContractsCard) cards.push(expiringContractsCard)

  const probationReviewCard = createProbationReviewCard(workingConditions)
  if (probationReviewCard) cards.push(probationReviewCard)

  const contractStartCard = createContractStartCard(workingConditions)
  if (contractStartCard) cards.push(contractStartCard)

  cards.push(
    ...createCatalogTypeCards(
      contractTypes,
      workingConditions,
      (wc, id) => wc.contractType?.id === id,
      'contract-type',
      'IdcardOutlined',
      2
    )
  )

  cards.push(
    ...createCatalogTypeCards(
      employmentTypes,
      workingConditions,
      (wc, id) => wc.employmentType?.id === id,
      'employment-type',
      'TeamOutlined',
      3
    )
  )

  return cards.filter(card => card.shouldShow)
}

export const matchesKpi = (employee: Employee, activeKpi: string): boolean => {
  if (activeKpi === 'all') {
    return true
  }

  if (activeKpi === 'tenure') {
    return !!employee.startDate
  }

  if (activeKpi.startsWith('contract-type-')) {
    const contractTypeId = activeKpi.replace('contract-type-', '')
    const employeeContractTypeId = (employee.contractType as any)?.id
    return employeeContractTypeId === contractTypeId
  }

  if (activeKpi.startsWith('employment-type-')) {
    const employmentTypeId = activeKpi.replace('employment-type-', '')
    const employeeEmploymentTypeId = (employee.employmentType as any)?.id
    return employeeEmploymentTypeId === employmentTypeId
  }

  if (activeKpi === 'internal') {
    const value = employee.employmentType?.value || ''
    return value === 'Internal'
  }

  if (activeKpi === 'external') {
    const value = employee.employmentType?.value || ''
    return value === 'External'
  }

  if (activeKpi === 'contract') {
    const value = employee.employmentType?.value || ''
    return value === 'Contract worker'
  }

  if (activeKpi === 'fulltime') {
    const value = employee.contractType?.value || ''
    return value.toLowerCase().includes('full time')
  }

  if (activeKpi === 'parttime') {
    const value = employee.contractType?.value || ''
    return value.toLowerCase().includes('part time')
  }

  if (activeKpi === 'expiring-contracts') {
    if (!employee.exitDate) return false
    const exitDate = dayjs(employee.exitDate)
    const today = dayjs().startOf('day')
    const days90 = today.add(90, 'day')
    return exitDate.isAfter(today) && (exitDate.isBefore(days90) || exitDate.isSame(days90, 'day'))
  }

  if (activeKpi === 'probation-review') {
    return false
  }

  if (activeKpi === 'contract-start') {
    if (!employee.startDate) return false
    return isDateInMonth(employee.startDate)
  }

  return true
}
