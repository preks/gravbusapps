'use client'

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Card,
  CardContent,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { Employee } from '../../../hooks/useEmployeeData'
import { useEmployeePerformanceEvaluations } from './hooks/useEmployeePerformanceEvaluations'
import { usePerformanceEvaluationDetail } from './hooks/usePerformanceEvaluationDetail'
import { usePerformanceCycleGoalsSummary } from './hooks/usePerformanceCycleGoalsSummary'
import PerformanceEvaluationDetailView from './components/PerformanceEvaluationDetailView'
import { findLatestEvaluationIdByCycleId, findLatestPerformanceCycleId } from './utils/performanceEvaluationMappers'
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

const PerformanceEvaluationTab: React.FC<PerformanceEvaluationTabProps> = ({ employee, accessToken, employeeId }) => {
  const { t } = useTranslation(translations)
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)

  const effectiveEmployeeId = employeeId || employee.id
  const { data, loading, error } = useEmployeePerformanceEvaluations({
    accessToken,
    employeeId: effectiveEmployeeId
  })
  const detailQuery = useMemo(
    () => ({
      employeeId: effectiveEmployeeId,
      includePeerReviewerIdentity: true
    }),
    [effectiveEmployeeId]
  )
  const latestCycleId = findLatestPerformanceCycleId(data)
  const hasSelectedCycle =
    selectedCycleId !== null && data?.performanceCycles.some(cycle => cycle.performanceCycleId === selectedCycleId)
  const activeCycleId = hasSelectedCycle ? selectedCycleId : latestCycleId
  const activeCycle = useMemo(
    () => data?.performanceCycles.find(cycle => cycle.performanceCycleId === activeCycleId),
    [data?.performanceCycles, activeCycleId]
  )
  const activeEvaluationId = findLatestEvaluationIdByCycleId(data, activeCycleId)

  const {
    data: detailData,
    loading: detailLoading,
    error: detailError
  } = usePerformanceEvaluationDetail({
    accessToken,
    evaluationId: activeEvaluationId,
    query: detailQuery
  })
  const {
    summary: cycleGoalsSummary,
    loading: cycleGoalsSummaryLoading,
    error: cycleGoalsSummaryError
  } = usePerformanceCycleGoalsSummary({
    accessToken,
    employeeId: effectiveEmployeeId,
    activeCycle
  })

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
      <div
        className="gba:flex gba:justify-between gba:items-start gba:gap-4"
        data-testid="employee-performance-evaluation-header"
      >
        <div>
          <h2 className="gba:text-2xl gba:font-semibold">{t('performance-evaluation-title')}</h2>
          <p className="gba:text-muted-foreground gba:text-sm">{t('performance-evaluation-description')}</p>
        </div>

        <div className="gba:w-full gba:max-w-[360px] gba:space-y-1">
          <p className="gba:text-sm gba:font-medium">{t('performance-evaluation-selector-label')}</p>
          <Select
            value={activeCycleId ?? ''}
            onValueChange={value => {
              setSelectedCycleId(value)
            }}
          >
            <SelectTrigger data-testid="employee-performance-evaluation-selector-trigger" className="gba:w-full">
              <SelectValue placeholder={t('performance-evaluation-selector-placeholder')} />
            </SelectTrigger>
            <SelectContent data-testid="employee-performance-evaluation-selector-content">
              {data.performanceCycles.map(cycle => (
                <SelectItem
                  key={cycle.performanceCycleId}
                  value={cycle.performanceCycleId}
                  data-testid={`employee-performance-evaluation-selector-option-${cycle.performanceCycleId}`}
                >
                  {cycle.performanceCycleName} ({formatDisplayDate(cycle.performanceCycleStartDate)} -{' '}
                  {formatDisplayDate(cycle.performanceCycleEndDate)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PerformanceEvaluationDetailView
        evaluationId={activeEvaluationId || ''}
        loading={detailLoading}
        error={detailError}
        data={detailData}
        cycleGoalsSummary={cycleGoalsSummary}
        cycleGoalsSummaryLoading={cycleGoalsSummaryLoading}
        cycleGoalsSummaryError={cycleGoalsSummaryError}
        currentEmployee={{
          displayName: employee.displayName,
          firstName: employee.firstName,
          lastName: employee.lastName,
          pictureThumbnail: employee.pictureThumbnail
        }}
      />
    </div>
  )
}

export default PerformanceEvaluationTab
