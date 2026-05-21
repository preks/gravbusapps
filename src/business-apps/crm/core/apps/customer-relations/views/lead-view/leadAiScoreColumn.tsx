import type { CellContext, ColumnDef } from '@tanstack/react-table'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { LeadAiScoreCell } from './LeadAiScoreCell'

export type LeadAiScoreColumnLabels = {
  header: string
  notScoredLabel: string
  notAvailableLabel: string
}

function renderLeadAiScoreCell(
  context: CellContext<CustomerLead, unknown>,
  labels: Pick<LeadAiScoreColumnLabels, 'notScoredLabel' | 'notAvailableLabel'>
) {
  return (
    <LeadAiScoreCell
      score={context.row.original.aiLeadScore}
      grade={context.row.original.aiLeadGrade}
      notScoredLabel={labels.notScoredLabel}
      notAvailableLabel={labels.notAvailableLabel}
    />
  )
}

export function createLeadAiScoreColumn(labels: LeadAiScoreColumnLabels): ColumnDef<CustomerLead> {
  const cellLabels = {
    notScoredLabel: labels.notScoredLabel,
    notAvailableLabel: labels.notAvailableLabel
  }

  return {
    id: 'aiLeadScore',
    accessorFn: row => row.aiLeadScore ?? null,
    header: labels.header,
    size: 160,
    minSize: 140,
    maxSize: 220,
    cell: context => renderLeadAiScoreCell(context, cellLabels)
  }
}
