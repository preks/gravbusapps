import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { EvaluationDetail } from '../types'
import { EvaluationTableCard } from './EvaluationTableCard'
import { ExpandableEvaluationRow } from './ExpandableEvaluationRow'
import translations from '../_i18n'

interface CycleDetailViewProps {
  evaluations: EvaluationDetail[]
  loading: boolean
  error: string | null
  cycleName: string
}

export const CycleDetailView: React.FC<CycleDetailViewProps> = ({ evaluations, loading, error, cycleName }) => {
  const { t } = useTranslation(translations)

  return (
    <EvaluationTableCard
      testId="cycle-detail-view"
      title={t('cycle-evaluations-title', { name: cycleName })}
      description={t('cycle-evaluations-description', { count: evaluations.length })}
      firstColumnHeader={t('table-employee')}
      emptyMessage={t('empty-no-evaluations-for-cycle')}
      loading={loading}
      error={error}
      isEmpty={evaluations.length === 0}
    >
      {evaluations.map(evaluation => (
        <ExpandableEvaluationRow
          key={evaluation.id}
          id={evaluation.id}
          label={evaluation.employeeName}
          statusRef={evaluation.statusRef}
          startDate={evaluation.startDate}
          completionDate={evaluation.actualCompletionDate}
          reviewers={evaluation.reviewers}
          testIdPrefix="evaluation-row"
        />
      ))}
    </EvaluationTableCard>
  )
}
