'use client'

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { Employee } from '../../../hooks/useEmployeeData'
import { useEmployeePerformanceEvaluations } from './hooks/useEmployeePerformanceEvaluations'
import translations from '../../../_i18n'

interface PerformanceEvaluationTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
}

const formatDisplayDate = (value: string | null) => {
  if (!value) return '-'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : '-'
}

const getStatusBadgeVariant = (statusCode: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
  if (statusCode === 'COMPLETED') return 'success'
  if (statusCode === 'IN_PROGRESS') return 'warning'
  if (statusCode === 'CANCELLED') return 'destructive'
  return 'default'
}

const PerformanceEvaluationTab: React.FC<PerformanceEvaluationTabProps> = ({ employee, accessToken, employeeId }) => {
  const { t } = useTranslation(translations)
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null)

  const effectiveEmployeeId = employeeId || employee.id
  const { data, loading, error } = useEmployeePerformanceEvaluations({
    accessToken,
    employeeId: effectiveEmployeeId
  })

  const summary = useMemo(() => {
    const cycles = data?.performanceCycles ?? []
    const totalCycles = cycles.length
    const totalEvaluations = cycles.reduce((acc, cycle) => acc + cycle.totalEvaluations, 0)
    const totalCompleted = cycles.reduce((acc, cycle) => acc + cycle.completedEvaluations, 0)
    const totalInProgress = cycles.reduce((acc, cycle) => acc + cycle.inProgressEvaluations, 0)

    return {
      totalCycles,
      totalEvaluations,
      totalCompleted,
      totalInProgress
    }
  }, [data])

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:py-12"
        data-testid="employee-performance-evaluation-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card data-testid="employee-performance-evaluation-error">
        <CardContent className="gba:py-8">
          <div className="gba:text-destructive gba:text-sm">{t('performance-evaluation-load-error', { error })}</div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.performanceCycles?.length) {
    return (
      <Card data-testid="employee-performance-evaluation-empty">
        <CardContent className="gba:py-10">
          <EmptyState title={t('performance-evaluation-empty-title')} description={t('performance-evaluation-empty')} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="employee-performance-evaluation-container">
      <div data-testid="employee-performance-evaluation-header">
        <h2 className="gba:text-2xl gba:font-semibold">{t('performance-evaluation-title')}</h2>
        <p className="gba:text-muted-foreground gba:text-sm">{t('performance-evaluation-description')}</p>
      </div>

      <div
        className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-3"
        data-testid="employee-performance-evaluation-summary"
      >
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground">{t('performance-evaluation-kpi-cycles')}</p>
            <p className="gba:text-xl gba:font-semibold">{summary.totalCycles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground">{t('performance-evaluation-kpi-evaluations')}</p>
            <p className="gba:text-xl gba:font-semibold">{summary.totalEvaluations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground">{t('performance-evaluation-kpi-in-progress')}</p>
            <p className="gba:text-xl gba:font-semibold">{summary.totalInProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground">{t('performance-evaluation-kpi-completed')}</p>
            <p className="gba:text-xl gba:font-semibold">{summary.totalCompleted}</p>
          </CardContent>
        </Card>
      </div>

      <div className="gba:space-y-4" data-testid="employee-performance-evaluation-cycles">
        {data.performanceCycles.map(cycle => (
          <Card
            key={cycle.performanceCycleId}
            data-testid={`employee-performance-evaluation-cycle-${cycle.performanceCycleId}`}
          >
            <CardHeader>
              <div className="gba:flex gba:justify-between gba:items-start gba:gap-4">
                <div>
                  <CardTitle>{cycle.performanceCycleName}</CardTitle>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {formatDisplayDate(cycle.performanceCycleStartDate)} -{' '}
                    {formatDisplayDate(cycle.performanceCycleEndDate)}
                  </p>
                </div>
                <div className="gba:text-right gba:text-sm">
                  <p className="gba:text-muted-foreground">{t('performance-evaluation-cycle-total')}</p>
                  <p className="gba:font-semibold">{cycle.totalEvaluations}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              {cycle.evaluations.map(evaluation => (
                <div
                  key={evaluation.evaluationId}
                  className="gba:border gba:rounded-md gba:p-3 gba:space-y-2"
                  data-testid={`employee-performance-evaluation-item-${evaluation.evaluationId}`}
                >
                  <div className="gba:flex gba:justify-between gba:items-center gba:gap-3">
                    <Badge variant={getStatusBadgeVariant(evaluation.statusCode)}>
                      {t(`performance-evaluation-status-${evaluation.statusCode.toLowerCase()}`)}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      data-testid={`employee-performance-evaluation-view-details-${evaluation.evaluationId}`}
                      onClick={() => setSelectedEvaluationId(evaluation.evaluationId)}
                    >
                      {t('performance-evaluation-view-details')}
                    </Button>
                  </div>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-2 gba:text-sm">
                    <div>
                      <p className="gba:text-muted-foreground">{t('performance-evaluation-start-date')}</p>
                      <p>{formatDisplayDate(evaluation.startDate)}</p>
                    </div>
                    <div>
                      <p className="gba:text-muted-foreground">{t('performance-evaluation-target-completion-date')}</p>
                      <p>{formatDisplayDate(evaluation.targetCompletionDate)}</p>
                    </div>
                    <div>
                      <p className="gba:text-muted-foreground">{t('performance-evaluation-actual-completion-date')}</p>
                      <p>{formatDisplayDate(evaluation.actualCompletionDate)}</p>
                    </div>
                    <div>
                      <p className="gba:text-muted-foreground">{t('performance-evaluation-overall-rating')}</p>
                      <p>{evaluation.overallRatingLabel || '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEvaluationId && (
        <Card data-testid="employee-performance-evaluation-phase2-placeholder">
          <CardContent className="gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('performance-evaluation-detail-placeholder', { evaluationId: selectedEvaluationId })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PerformanceEvaluationTab
