import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import { PerformanceEvaluationAnalysisDetailResponse } from '../types/performanceEvaluation.types'
import EntryCarouselSection from './detail-view/EntryCarouselSection'
import RadarComparisonCard from './detail-view/RadarComparisonCard'
import { PerformanceCycleGoalsSummary, PerformanceEvaluationCurrentEmployee } from './detail-view/types'
import { computeDetailViewData } from '../utils/detailViewData'

interface PerformanceEvaluationDetailViewProps {
  evaluationId: string
  loading: boolean
  error: string | null
  data: PerformanceEvaluationAnalysisDetailResponse | null
  cycleGoalsSummary: PerformanceCycleGoalsSummary
  cycleGoalsSummaryLoading: boolean
  cycleGoalsSummaryError: string | null
  currentEmployee?: PerformanceEvaluationCurrentEmployee
}

const PerformanceEvaluationDetailView: React.FC<PerformanceEvaluationDetailViewProps> = ({
  loading,
  error,
  data,
  cycleGoalsSummary,
  cycleGoalsSummaryLoading,
  cycleGoalsSummaryError,
  currentEmployee
}) => {
  const { t } = useTranslation(translations)

  if (loading) {
    return (
      <Card data-testid="employee-performance-evaluation-detail-loading">
        <CardContent className="gba:py-8 gba:flex gba:justify-center">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="employee-performance-evaluation-detail-error">
        <CardContent className="gba:py-6">
          <p className="gba:text-sm gba:text-destructive">{t('performance-evaluation-detail-load-error', { error })}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || !Object.keys(data).length) {
    return (
      <Card data-testid="employee-performance-evaluation-detail-empty">
        <CardContent className="gba:py-8">
          <EmptyState
            title={t('performance-evaluation-detail-empty-title')}
            description={t('performance-evaluation-detail-empty')}
          />
        </CardContent>
      </Card>
    )
  }

  const {
    overallNumericDisplay,
    ratingScaleLimit,
    overallProgressPercent,
    companyValuesAverageScore,
    skillsAverageScore,
    companyValuesProgressPercent,
    skillsProgressPercent,
    radarMaxDomain,
    overallChangeBadge,
    companyValuesChangeBadge,
    skillsChangeBadge,
    companyValuesRadarData,
    skillsRadarData,
    combinedCarouselEntries,
    selfReviewerFallback,
    managerReviewerFallback
  } = computeDetailViewData(data, currentEmployee, t)

  return (
    <div className="gba:space-y-6" data-testid="employee-performance-evaluation-detail">
      <div className="gba:space-y-1">
        <h3 className="gba:text-2xl gba:font-bold">{t('performance-evaluation-detail-title')}</h3>
        <p className="gba:text-muted-foreground">{t('performance-evaluation-detail-subtitle')}</p>
      </div>

      <div
        className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-4"
        data-testid="employee-performance-evaluation-summary-cards"
      >
        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-overall-progress')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:items-end gba:gap-2">
              <span className="gba:text-3xl gba:font-bold">{overallNumericDisplay}</span>
              <span className="gba:text-sm gba:text-muted-foreground">/{ratingScaleLimit}</span>
              {overallChangeBadge ? (
                <span className={`gba:text-sm gba:font-medium ${overallChangeBadge.className}`}>
                  {overallChangeBadge.text}
                </span>
              ) : null}
            </div>
            <Progress
              value={overallProgressPercent}
              data-testid="employee-performance-evaluation-overall-progress-bar"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-company-values-average')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:items-end gba:gap-2">
              <span className="gba:text-3xl gba:font-bold">{companyValuesAverageScore}</span>
              <span className="gba:text-sm gba:text-muted-foreground">/{ratingScaleLimit}</span>
              {companyValuesChangeBadge ? (
                <span className={`gba:text-sm gba:font-medium ${companyValuesChangeBadge.className}`}>
                  {companyValuesChangeBadge.text}
                </span>
              ) : null}
            </div>
            <Progress
              value={companyValuesProgressPercent}
              data-testid="employee-performance-evaluation-company-values-progress-bar"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-skills-average')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:items-end gba:gap-2">
              <span className="gba:text-3xl gba:font-bold">{skillsAverageScore}</span>
              <span className="gba:text-sm gba:text-muted-foreground">/{ratingScaleLimit}</span>
              {skillsChangeBadge ? (
                <span className={`gba:text-sm gba:font-medium ${skillsChangeBadge.className}`}>
                  {skillsChangeBadge.text}
                </span>
              ) : null}
            </div>
            <Progress value={skillsProgressPercent} data-testid="employee-performance-evaluation-skills-progress-bar" />
          </CardContent>
        </Card>

        <Card data-testid="employee-performance-evaluation-summary-review-card">
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-goals-title')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div
              className="gba:flex gba:items-end gba:gap-2"
              data-testid="employee-performance-evaluation-goals-progress-summary"
            >
              <span
                className="gba:text-3xl gba:font-bold"
                data-testid="employee-performance-evaluation-goals-progress-value"
              >
                {cycleGoalsSummaryLoading ? '--' : `${cycleGoalsSummary.averageProgressPercent}%`}
              </span>
            </div>
            <Progress
              value={cycleGoalsSummaryLoading ? 0 : cycleGoalsSummary.averageProgressPercent}
              data-testid="employee-performance-evaluation-goals-progress-bar"
            />
            <p
              className="gba:text-xs gba:text-muted-foreground"
              data-testid="employee-performance-evaluation-goals-progress-caption"
            >
              {cycleGoalsSummaryLoading
                ? t('performance-evaluation-summary-goals-progress-loading')
                : t('performance-evaluation-summary-goals-progress-caption', {
                    progress: cycleGoalsSummary.averageProgressPercent,
                    total: cycleGoalsSummary.total
                  })}
            </p>
            {cycleGoalsSummaryError ? (
              <p className="gba:text-xs gba:text-destructive" data-testid="employee-performance-evaluation-goals-error">
                {cycleGoalsSummaryError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="gba:space-y-4">
        <div
          className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-4"
          data-testid="employee-performance-evaluation-radar-section"
        >
          <RadarComparisonCard
            testId="employee-performance-evaluation-company-values-radar-card"
            title={t('performance-evaluation-radar-company-values-title')}
            description={t('performance-evaluation-radar-company-values-description')}
            averageScore={companyValuesAverageScore}
            averageScoreLabel={t('performance-evaluation-radar-average-score')}
            data={companyValuesRadarData}
            noDataLabel={t('performance-evaluation-radar-no-data')}
            selfLabel={t('performance-evaluation-self')}
            peerLabel={t('performance-evaluation-peer')}
            managerLabel={t('performance-evaluation-manager')}
            radarMaxDomain={radarMaxDomain}
          />

          <RadarComparisonCard
            testId="employee-performance-evaluation-skills-radar-card"
            title={t('performance-evaluation-radar-skills-title')}
            description={t('performance-evaluation-radar-skills-description')}
            averageScore={skillsAverageScore}
            averageScoreLabel={t('performance-evaluation-radar-average-score')}
            data={skillsRadarData}
            noDataLabel={t('performance-evaluation-radar-no-data')}
            selfLabel={t('performance-evaluation-self')}
            peerLabel={t('performance-evaluation-peer')}
            managerLabel={t('performance-evaluation-manager')}
            radarMaxDomain={radarMaxDomain}
          />
        </div>

        <EntryCarouselSection
          entries={combinedCarouselEntries}
          testIdPrefix="employee-performance-evaluation-main-carousel"
          selfLabel={t('performance-evaluation-self')}
          peerLabel={t('performance-evaluation-peer')}
          managerLabel={t('performance-evaluation-manager')}
          previousLabel={t('performance-evaluation-carousel-previous')}
          nextLabel={t('performance-evaluation-carousel-next')}
          reviewerColumnLabel={t('performance-evaluation-reviewer-column')}
          selfReviewerFallback={selfReviewerFallback}
          managerReviewerFallback={managerReviewerFallback}
        />
      </div>
    </div>
  )
}

export default PerformanceEvaluationDetailView
