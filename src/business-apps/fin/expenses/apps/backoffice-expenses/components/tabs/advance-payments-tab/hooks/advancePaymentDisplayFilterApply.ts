import dayjs from 'dayjs'
import { applyDateRangeFromFilter } from '../../../../../manager-expenses/components/tabs/expense-plans-tab/config/dataDisplayFilterUtils'

interface ApplyAdvancePaymentDisplayFiltersParams {
  filters: Record<string, unknown>
  setStatusFilter: (value: string[]) => void
  setSelectedReporters: (value: string[]) => void
  setReporterFilter: (value: string) => void
  setDepartmentId: (value: string) => void
  setDateFrom: (value: string) => void
  setDateTo: (value: string) => void
  setAmountMinFilter: (value: string) => void
  setAmountMaxFilter: (value: string) => void
  setAdvanceMinFilter: (value: string) => void
  setAdvanceMaxFilter: (value: string) => void
  setCurrentPage: (value: number) => void
}

function parseNumberRange(raw: unknown): { minValue: string; maxValue: string } {
  const range = raw as { min?: number; max?: number } | undefined
  if (!range) {
    return { minValue: '', maxValue: '' }
  }

  const minValue = range.min !== undefined && !Number.isNaN(Number(range.min)) ? String(range.min) : ''
  const maxValue = range.max !== undefined && !Number.isNaN(Number(range.max)) ? String(range.max) : ''
  return { minValue, maxValue }
}

export function applyAdvancePaymentDisplayFilters(params: ApplyAdvancePaymentDisplayFiltersParams): void {
  const { filters } = params
  if (Object.keys(filters).length === 0) {
    params.setStatusFilter([])
    params.setSelectedReporters([])
    params.setReporterFilter('')
    params.setDepartmentId('')
    params.setDateFrom('')
    params.setDateTo('')
    params.setAmountMinFilter('')
    params.setAmountMaxFilter('')
    params.setAdvanceMinFilter('')
    params.setAdvanceMaxFilter('')
    params.setCurrentPage(1)
    return
  }

  const statusIds = (filters.statusIds as string[] | undefined) ?? []
  params.setStatusFilter(statusIds)

  const reporterIds = (filters.reporterIds as string[] | undefined) ?? []
  params.setSelectedReporters(reporterIds)
  params.setReporterFilter(reporterIds.join(','))

  const departmentIds = (filters.departmentIds as string[] | undefined) ?? []
  params.setDepartmentId(departmentIds[0] ?? '')

  applyDateRangeFromFilter(filters.dateRange, range => {
    const from = range?.[0] ? dayjs(range[0]).format('YYYY-MM-DD') : ''
    const to = range?.[1] ? dayjs(range[1]).format('YYYY-MM-DD') : ''
    params.setDateFrom(from)
    params.setDateTo(to)
  })

  const amountRange = parseNumberRange(filters.amount)
  params.setAmountMinFilter(amountRange.minValue)
  params.setAmountMaxFilter(amountRange.maxValue)

  const advanceRange = parseNumberRange(filters.advance)
  params.setAdvanceMinFilter(advanceRange.minValue)
  params.setAdvanceMaxFilter(advanceRange.maxValue)

  params.setCurrentPage(1)
}
