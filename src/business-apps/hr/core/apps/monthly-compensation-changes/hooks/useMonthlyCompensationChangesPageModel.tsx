import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { CurrencyDollarIcon, GiftIcon, HeartIcon, ShieldCheckIcon, TrendUpIcon, UsersIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { KpiCardData } from '@newwork/nw-design-system'
import { format, startOfMonth } from 'date-fns'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation/hooks/useActiveStructureCompanies.ts'
import { exportWorkbookToExcel } from '@/common/utils/excelExportUtils'
import { buildBenefitColumns, buildChangeColumns } from '../components/tableColumns'
import type {
  ActiveBenefitRow,
  BenefitChangeRecord,
  BonusRecord,
  CompensationChangeRow,
  SalaryChangeRecord
} from '../types/compensationChanges.types'
import { formatDateShort, formatMonthYear, translateStatusLabel } from '../utils/formatUtils'
import { buildBenefitsFilterConfig, buildChangesFilterConfig } from './buildFilterConfigs'
import { useActiveBenefits } from './useActiveBenefits'
import { useEmployeeIdsByCompany } from './useEmployeeIdsByCompany'
import { useMonthlyCompensationChanges } from './useMonthlyCompensationChanges'

type TranslationFn = (key: string, variables?: Record<string, unknown>) => string

const toExportValue = (value: number | null | undefined) => (value == null ? '' : value.toString())
const EMPTY_EMPLOYEE_SET = new Set<string>()

export function useMonthlyCompensationChangesPageModel(accessToken: string, t: TranslationFn, locale: string) {
  const [activeTab, setActiveTab] = useState('changes')
  const [selectedDate, setSelectedDate] = useState(() => startOfMonth(new Date()))

  const [changeSection, setChangeSection] = useState('all')
  const [changesSearch, setChangesSearch] = useState('')
  const [changesFilters, setChangesFilters] = useState<Record<string, string[]>>({})
  const [selectedChangeRow, setSelectedChangeRow] = useState<CompensationChangeRow | null>(null)

  const [benefitSection, setBenefitSection] = useState('all')
  const [benefitsSearch, setBenefitsSearch] = useState('')
  const [benefitsFilters, setBenefitsFilters] = useState<Record<string, string[]>>({})
  const [selectedBenefitRow, setSelectedBenefitRow] = useState<ActiveBenefitRow | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Keep the filter UI responsive even when filtering large arrays.
  // The *UI state* (filters/search) updates immediately, while the expensive filtering work uses deferred values.
  const deferredChangeSection = useDeferredValue(changeSection)
  const deferredChangesSearch = useDeferredValue(changesSearch)
  const deferredChangesFilters = useDeferredValue(changesFilters)
  const deferredBenefitSection = useDeferredValue(benefitSection)
  const deferredBenefitsSearch = useDeferredValue(benefitsSearch)
  const deferredBenefitsFilters = useDeferredValue(benefitsFilters)

  const { companies } = useActiveStructureCompanies(accessToken)

  const changesLegalEntityIds: string[] = changesFilters.legalEntity ?? []
  const benefitsLegalEntityIds: string[] = benefitsFilters.legalEntity ?? []

  const companyIdsForLookup = useMemo(() => {
    const all = [...changesLegalEntityIds, ...benefitsLegalEntityIds].filter(Boolean)
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b))
  }, [changesLegalEntityIds, benefitsLegalEntityIds])
  const { employeeIdsByCompany, loading: employeeIdsLoading } = useEmployeeIdsByCompany(
    accessToken,
    companyIdsForLookup
  )

  const changesCompanyLookupLoading = useMemo(
    () =>
      changesLegalEntityIds.length > 0 && changesLegalEntityIds.some(companyId => !employeeIdsByCompany.has(companyId)),
    [changesLegalEntityIds, employeeIdsByCompany]
  )

  const benefitsCompanyLookupLoading = useMemo(
    () =>
      benefitsLegalEntityIds.length > 0 &&
      benefitsLegalEntityIds.some(companyId => !employeeIdsByCompany.has(companyId)),
    [benefitsLegalEntityIds, employeeIdsByCompany]
  )

  const changesAllowedEmployeeIds = useMemo(() => {
    if (changesLegalEntityIds.length === 0) {
      return null
    }
    if (employeeIdsLoading || changesCompanyLookupLoading) {
      return undefined
    }
    const union = new Set<string>()
    for (const companyId of changesLegalEntityIds) {
      const set = employeeIdsByCompany.get(companyId)
      if (set) {
        for (const id of set) union.add(id)
      }
    }
    return union.size > 0 ? union : EMPTY_EMPLOYEE_SET
  }, [changesLegalEntityIds, employeeIdsByCompany, employeeIdsLoading, changesCompanyLookupLoading])

  const benefitsAllowedEmployeeIds = useMemo(() => {
    if (benefitsLegalEntityIds.length === 0) {
      return null
    }
    if (employeeIdsLoading || benefitsCompanyLookupLoading) {
      return undefined
    }
    const union = new Set<string>()
    for (const companyId of benefitsLegalEntityIds) {
      const set = employeeIdsByCompany.get(companyId)
      if (set) {
        for (const id of set) union.add(id)
      }
    }
    return union.size > 0 ? union : EMPTY_EMPLOYEE_SET
  }, [benefitsLegalEntityIds, employeeIdsByCompany, employeeIdsLoading, benefitsCompanyLookupLoading])

  const {
    rows: changeRows,
    loading: changesLoading,
    error: changesError,
    counts: changeCounts
  } = useMonthlyCompensationChanges(accessToken, selectedDate, changesAllowedEmployeeIds)

  const {
    rows: benefitRows,
    loading: benefitsLoading,
    error: benefitsError
  } = useActiveBenefits(accessToken, selectedDate, benefitsAllowedEmployeeIds)

  const changeColumns = useMemo<ColumnDef<CompensationChangeRow>[]>(() => buildChangeColumns(t, locale), [t, locale])
  const benefitColumns = useMemo<ColumnDef<ActiveBenefitRow>[]>(() => buildBenefitColumns(t, locale), [t, locale])

  const companyFilterOptions = useMemo(
    () => companies.map(company => ({ id: company.id, label: company.name })),
    [companies]
  )

  const benefitProviderOptions = useMemo(() => {
    const providers = new Set(benefitRows.map(row => row.provider).filter(provider => provider && provider !== '-'))
    return Array.from(providers)
      .sort((a, b) => a.localeCompare(b))
      .map(provider => ({ id: provider, label: provider }))
  }, [benefitRows])

  const benefitsFilterConfig = useMemo(
    () => buildBenefitsFilterConfig(t, companyFilterOptions, benefitProviderOptions),
    [companyFilterOptions, benefitProviderOptions, t]
  )

  const changeTitleSections = useMemo(
    () => [
      { id: 'all', label: t('section-all-changes'), metadata: { count: changeCounts.total } },
      { id: 'salary', label: t('section-salary-changes'), metadata: { count: changeCounts.salary } },
      { id: 'bonus', label: t('section-bonuses'), metadata: { count: changeCounts.bonus } },
      { id: 'benefit', label: t('section-benefit-changes'), metadata: { count: changeCounts.benefit } }
    ],
    [changeCounts, t]
  )

  const localizedChangeRows = useMemo(() => {
    const perMonthSuffix = t('amount-per-month-suffix')
    const salaryAdjustmentLabel = t('description-salary-adjustment')
    const bonusLabel = t('category-bonus')
    const benefitLabel = t('category-benefit')
    return changeRows.map(row => {
      const localizedAmount = row.amount.endsWith('__PER_MONTH__')
        ? `${row.amount.slice(0, -13)}${perMonthSuffix}`
        : row.amount

      let localizedDescription = row.description
      if (localizedDescription.startsWith('description-salary-adjustment')) {
        localizedDescription = localizedDescription.replace('description-salary-adjustment', salaryAdjustmentLabel)
      } else if (localizedDescription === 'category-bonus') {
        localizedDescription = bonusLabel
      } else if (localizedDescription === 'category-benefit') {
        localizedDescription = benefitLabel
      }

      return {
        ...row,
        amount: localizedAmount,
        description: localizedDescription
      }
    })
  }, [changeRows, t])

  const changeStatusFilterOptions = useMemo(() => {
    const statuses = new Set(localizedChangeRows.map(row => row.status).filter(status => status && status !== '-'))

    return Array.from(statuses)
      .sort((a, b) => translateStatusLabel(a, t).localeCompare(translateStatusLabel(b, t)))
      .map(status => ({ id: status, label: translateStatusLabel(status, t) }))
  }, [localizedChangeRows, t])

  const changesFilterConfig = useMemo(
    () => buildChangesFilterConfig(t, companyFilterOptions, changeStatusFilterOptions),
    [changeStatusFilterOptions, companyFilterOptions, t]
  )

  const filteredChangeRows = useMemo(() => {
    let rows = localizedChangeRows

    if (deferredChangeSection !== 'all') {
      rows = rows.filter(row => row.category === deferredChangeSection)
    }

    if (deferredChangesSearch.trim()) {
      const query = deferredChangesSearch.toLowerCase()
      rows = rows.filter(
        row =>
          row.employeeName.toLowerCase().includes(query) ||
          row.description.toLowerCase().includes(query) ||
          row.detail.toLowerCase().includes(query)
      )
    }

    const statusFilter: string[] = deferredChangesFilters.status ?? []
    if (statusFilter.length > 0) {
      rows = rows.filter(row => statusFilter.some(status => row.status.toLowerCase().includes(status.toLowerCase())))
    }

    return rows
  }, [localizedChangeRows, deferredChangeSection, deferredChangesSearch, deferredChangesFilters.status])

  const monthLabel = formatMonthYear(selectedDate, locale)

  const changeKpiCards = useMemo<KpiCardData[]>(() => {
    const salaryCount = filteredChangeRows.filter(row => row.category === 'salary').length
    const bonusCount = filteredChangeRows.filter(row => row.category === 'bonus').length
    const benefitCount = filteredChangeRows.filter(row => row.category === 'benefit').length

    return [
      {
        id: 'total',
        title: t('kpi-total-changes'),
        value: filteredChangeRows.length,
        icon: <CurrencyDollarIcon className="gba:size-4" />,
        footer: t('kpi-total-changes-footer', { month: monthLabel })
      },
      {
        id: 'salary',
        title: t('kpi-salary-adjustments'),
        value: salaryCount,
        icon: <TrendUpIcon className="gba:size-4" />,
        footer: t('kpi-salary-adjustments-footer')
      },
      {
        id: 'bonus',
        title: t('kpi-bonuses'),
        value: bonusCount,
        icon: <GiftIcon className="gba:size-4" />,
        footer: t('kpi-bonuses-footer')
      },
      {
        id: 'benefit',
        title: t('kpi-benefit-changes'),
        value: benefitCount,
        icon: <HeartIcon className="gba:size-4" />,
        footer: t('kpi-benefit-changes-footer')
      }
    ]
  }, [filteredChangeRows, monthLabel, t])

  const benefitTypeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of benefitRows) {
      const key = row.benefitType || '-'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [benefitRows])

  const benefitTitleSections = useMemo(
    () => [
      { id: 'all', label: t('section-all-benefits'), metadata: { count: benefitRows.length } },
      ...Array.from(benefitTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({
          id: type,
          label: type,
          metadata: { count }
        }))
    ],
    [benefitRows.length, benefitTypeCounts, t]
  )

  const filteredBenefitRows = useMemo(() => {
    let rows = benefitRows

    if (deferredBenefitSection !== 'all') {
      rows = rows.filter(row => row.benefitType === deferredBenefitSection)
    }

    if (deferredBenefitsSearch.trim()) {
      const query = deferredBenefitsSearch.toLowerCase()
      rows = rows.filter(
        row =>
          row.employeeName.toLowerCase().includes(query) ||
          row.benefitType.toLowerCase().includes(query) ||
          row.provider.toLowerCase().includes(query)
      )
    }

    const providerFilter: string[] = deferredBenefitsFilters.provider ?? []
    if (providerFilter.length > 0) {
      rows = rows.filter(row => providerFilter.includes(row.provider))
    }

    const statusFilter: string[] = deferredBenefitsFilters.status ?? []
    if (statusFilter.length > 0) {
      rows = rows.filter(row => statusFilter.some(status => row.status.toLowerCase().includes(status.toLowerCase())))
    }

    return rows
  }, [
    benefitRows,
    deferredBenefitSection,
    deferredBenefitsSearch,
    deferredBenefitsFilters.provider,
    deferredBenefitsFilters.status
  ])

  const benefitKpiCards = useMemo<KpiCardData[]>(() => {
    const totalBenefits = filteredBenefitRows.length
    const employeesWithBenefits = new Set(filteredBenefitRows.map(row => row.employeeId)).size
    const avgBenefitsPerEmployee =
      employeesWithBenefits > 0 ? Math.round((totalBenefits / employeesWithBenefits) * 10) / 10 : 0

    return [
      {
        id: 'employees',
        title: t('kpi-employees-with-benefits'),
        value: employeesWithBenefits,
        icon: <UsersIcon className="gba:size-4" />,
        footer: t('kpi-employees-footer', { month: monthLabel })
      },
      {
        id: 'totalBenefits',
        title: t('kpi-total-active-benefits'),
        value: totalBenefits,
        icon: <ShieldCheckIcon className="gba:size-4" />,
        footer: t('kpi-total-active-benefits-footer')
      },
      {
        id: 'avg',
        title: t('kpi-avg-benefits'),
        value: avgBenefitsPerEmployee,
        icon: <HeartIcon className="gba:size-4" />,
        footer: t('kpi-avg-benefits-footer')
      }
    ]
  }, [filteredBenefitRows, monthLabel, t])

  const handleExportBenefits = useCallback(async () => {
    if (isExporting || filteredBenefitRows.length === 0) return

    setIsExporting(true)
    try {
      const excelData = filteredBenefitRows.map(row => ({
        employee: row.employeeName,
        benefitType: row.benefitType,
        provider: row.provider,
        monthlyAmount: toExportValue(row.monthlyAmount),
        yearlyAmount: toExportValue(row.yearlyAmount),
        employeeContribution: toExportValue(row.employeeContribution),
        currency: row.currency,
        startDate: formatDateShort(row.startDate),
        endDate: formatDateShort(row.endDate),
        status: row.status
      }))

      await exportWorkbookToExcel(`Active-Benefits-${format(selectedDate, 'yyyy-MM')}`, [
        {
          name: t('export-sheet-name', { month: monthLabel }),
          columns: [
            { header: t('col-employee'), key: 'employee' },
            { header: t('col-benefit-type'), key: 'benefitType' },
            { header: t('col-provider'), key: 'provider' },
            { header: t('col-monthly-amount'), key: 'monthlyAmount' },
            { header: t('col-yearly-amount'), key: 'yearlyAmount' },
            { header: t('col-employee-contribution'), key: 'employeeContribution' },
            { header: t('col-currency'), key: 'currency' },
            { header: t('col-start-date'), key: 'startDate' },
            { header: t('col-end-date'), key: 'endDate' },
            { header: t('col-status'), key: 'status' }
          ],
          data: excelData
        }
      ])
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [filteredBenefitRows, isExporting, monthLabel, selectedDate, t])

  const selectedSalaryRecord =
    selectedChangeRow?.category === 'salary' ? (selectedChangeRow.raw as SalaryChangeRecord) : null
  const selectedBonusRecord = selectedChangeRow?.category === 'bonus' ? (selectedChangeRow.raw as BonusRecord) : null
  const selectedChangeBenefitRecord =
    selectedChangeRow?.category === 'benefit' ? (selectedChangeRow.raw as BenefitChangeRecord) : null

  return {
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    changeSection,
    setChangeSection,
    changesSearch,
    setChangesSearch,
    changesFilters,
    setChangesFilters,
    selectedChangeRow,
    setSelectedChangeRow,
    selectedSalaryRecord,
    selectedBonusRecord,
    selectedChangeBenefitRecord,
    benefitSection,
    setBenefitSection,
    benefitsSearch,
    setBenefitsSearch,
    benefitsFilters,
    setBenefitsFilters,
    selectedBenefitRow,
    setSelectedBenefitRow,
    isExporting,
    handleExportBenefits,
    changesFilterConfig,
    benefitsFilterConfig,
    changeTitleSections,
    benefitTitleSections,
    filteredChangeRows,
    filteredBenefitRows,
    changeKpiCards,
    benefitKpiCards,
    changeColumns,
    benefitColumns,
    changesLoading: changesLoading || employeeIdsLoading || changesCompanyLookupLoading,
    changesError,
    benefitsLoading: benefitsLoading || employeeIdsLoading || benefitsCompanyLookupLoading,
    benefitsError
  }
}
