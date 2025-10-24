import { Employee } from '../hooks/useGetEmployeesReport'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface KpiCardData {
  key: string
  label: string
  subLabel: string
  value: number | string
  iconName: string
  shouldShow: boolean
}

export const generateKpiCards = (allEmployees: Employee[], averageTenureFormatted: string): KpiCardData[] => {
  const internalEmployees = allEmployees.filter(e => e.employmentType === 'Internal')
  const externalEmployees = allEmployees.filter(e => e.employmentType === 'External')
  const contractWorkers = allEmployees.filter(e => e.employmentType === 'Contract worker')
  const fullTimeEmployees = allEmployees.filter(e => e.contractType?.toLowerCase().includes('full time'))
  const partTimeEmployees = allEmployees.filter(e => e.contractType?.toLowerCase().includes('part time'))

  const cards: KpiCardData[] = [
    {
      key: 'all',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total', 'Total'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.all_members', 'All members'),
      value: allEmployees.length,
      iconName: 'UserOutlined',
      shouldShow: true
    },
    {
      key: 'internal',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.internal', 'Internal'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_list_title', 'Employees'),
      value: internalEmployees.length,
      iconName: 'CheckOutlined',
      shouldShow: internalEmployees.length > 0
    },
    {
      key: 'external',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.external', 'External'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.workers', 'Workers'),
      value: externalEmployees.length,
      iconName: 'CheckOutlined',
      shouldShow: externalEmployees.length > 0
    },
    {
      key: 'contract',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.contract', 'Contract'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.contractors', 'Contractors'),
      value: contractWorkers.length,
      iconName: 'SolutionOutlined',
      shouldShow: contractWorkers.length > 0
    },
    {
      key: 'tenure',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.avg_tenure', 'Avg. Tenure'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.years_months', 'Years & Months'),
      value: averageTenureFormatted,
      iconName: 'CalendarOutlined',
      shouldShow: true
    },
    {
      key: 'fulltime',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.fulltime', 'Full-time'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_list_title', 'Employees'),
      value: fullTimeEmployees.length,
      iconName: 'IdcardOutlined',
      shouldShow: fullTimeEmployees.length > 0
    },
    {
      key: 'parttime',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_report_kpi.parttime', 'Part-time'),
      subLabel: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_list_title', 'Employees'),
      value: partTimeEmployees.length,
      iconName: 'CheckOutlined',
      shouldShow: partTimeEmployees.length > 0
    }
  ]

  return cards.filter(card => card.shouldShow)
}

export const matchesKpi = (employee: Employee, activeKpi: string): boolean => {
  switch (activeKpi) {
    case 'all':
      return true
    case 'tenure':
      return !!employee.startDate
    case 'internal':
      return employee.employmentType === 'Internal'
    case 'external':
      return employee.employmentType === 'External'
    case 'contract':
      return employee.employmentType === 'Contract worker'
    case 'fulltime':
      return !!employee.contractType?.toLowerCase().includes('full time')
    case 'parttime':
      return !!employee.contractType?.toLowerCase().includes('part time')
    default:
      return true
  }
}
