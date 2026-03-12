import { useMemo } from 'react'
import type { SlaKpiCounts } from '../../hooks/backofficeReportUtils'

const formatRate = (count: number, total: number) => (total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%')

const EMPTY_KPI_VALUES = {
  approvalBreachedLabel: '0/0',
  approvalBreachedRate: '0.0%',
  payoutBreachedLabel: '0/0',
  payoutBreachedRate: '0.0%',
  totalBreachedLabel: '0/0',
  totalBreachedRate: '0.0%',
  withinTotalLabel: '0/0',
  withinTotalRate: '0.0%'
}

export const useSlaKpiValues = (slaKpiCounts: SlaKpiCounts | null) =>
  useMemo(() => {
    if (!slaKpiCounts) return EMPTY_KPI_VALUES
    return {
      approvalBreachedLabel: `${slaKpiCounts.approvalBreached}/${slaKpiCounts.approvalEvaluated}`,
      approvalBreachedRate: formatRate(slaKpiCounts.approvalBreached, slaKpiCounts.approvalEvaluated),
      payoutBreachedLabel: `${slaKpiCounts.payoutBreached}/${slaKpiCounts.payoutEvaluated}`,
      payoutBreachedRate: formatRate(slaKpiCounts.payoutBreached, slaKpiCounts.payoutEvaluated),
      totalBreachedLabel: `${slaKpiCounts.totalBreached}/${slaKpiCounts.totalEvaluated}`,
      totalBreachedRate: formatRate(slaKpiCounts.totalBreached, slaKpiCounts.totalEvaluated),
      withinTotalLabel: `${slaKpiCounts.totalWithin}/${slaKpiCounts.totalEvaluated}`,
      withinTotalRate: formatRate(slaKpiCounts.totalWithin, slaKpiCounts.totalEvaluated)
    }
  }, [slaKpiCounts])
