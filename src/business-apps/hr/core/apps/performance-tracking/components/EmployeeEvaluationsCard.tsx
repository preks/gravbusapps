import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { EmployeeEvalItem } from '../types'
import { EvaluationTableCard } from './EvaluationTableCard'
import { ExpandableEvaluationRow } from './ExpandableEvaluationRow'
import translations from '../_i18n'

interface EmployeeEvaluationsCardProps {
  readonly employeeName: string
  readonly evaluations: readonly EmployeeEvalItem[]
  readonly loading: boolean
  readonly error: string | null
}

export const EmployeeEvaluationsCard: React.FC<EmployeeEvaluationsCardProps> = ({
  employeeName,
  evaluations,
  loading,
  error
}) => {
  const { t } = useTranslation(translations)

  return (
    <EvaluationTableCard
      testId="employee-evaluations-card"
      title={t('employee-evaluations-title', { name: employeeName })}
      description={t('employee-evaluations-description', { count: evaluations.length })}
      firstColumnHeader={t('table-cycle')}
      emptyMessage={t('empty-no-evaluations-for-employee')}
      loading={loading}
      error={error}
      isEmpty={evaluations.length === 0}
    >
      {evaluations.map(evalItem => (
        <ExpandableEvaluationRow
          key={evalItem.id}
          id={evalItem.id}
          label={evalItem.cycleName}
          statusRef={evalItem.statusRef}
          startDate={evalItem.startDate}
          completionDate={evalItem.actualCompletionDate}
          reviewers={evalItem.reviewers}
          testIdPrefix="employee-eval-row"
        />
      ))}
    </EvaluationTableCard>
  )
}
