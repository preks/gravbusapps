'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, EmptyState, useTranslation } from '@newwork/nw-design-system'
import {
  BriefcaseIcon,
  CaretRightIcon,
  CheckCircleIcon,
  LightbulbIcon,
  RocketLaunchIcon,
  StarIcon,
  TargetIcon,
  TrendUpIcon
} from '@phosphor-icons/react'
import { HrGrowthInsightsSection, type HrGrowthInsightCard } from './components/HrGrowthInsightsSection'
import { Employee } from '../../hooks/useEmployeeData'
import { useCareerPath } from '../../hooks/useCareerPath'
import translations from '../../_i18n'
import {
  calculateMonthsSince,
  formatDuration,
  computeSkillGap,
  generateRecommendationBanner,
  type SkillGapItem
} from './career/careerHelpers'

function getTimelineNodeClasses(isCurrent: boolean, isPast: boolean): string {
  if (isCurrent) return 'gba:w-8 gba:h-8 gba:bg-blue-500 gba:border-blue-500 gba:ring-4 gba:ring-blue-100'
  if (isPast) return 'gba:w-7 gba:h-7 gba:bg-blue-500 gba:border-blue-500'
  return 'gba:w-7 gba:h-7 gba:bg-white gba:border-gray-300'
}

interface CareerTabProps {
  employee: Employee
  accessToken: string
}

const CareerTab: React.FC<CareerTabProps> = ({ employee, accessToken }) => {
  const { t } = useTranslation(translations)

  const jobFunctionId = employee.employeePosition?.jobPosition?.jobFunction?.id
  const currentJobLevelId = employee.employeePosition?.jobPosition?.jobLevel?.id
  const positionStartDate = employee.employeePosition?.hireDate ?? employee.workingCondition?.[0]?.hireDate

  const { ladder, currentStepIndex, currentStep, nextStep, isDataAvailable, loading } = useCareerPath({
    accessToken,
    jobFunctionId,
    currentJobLevelId
  })

  const timeInRole = useMemo(() => calculateMonthsSince(positionStartDate), [positionStartDate])
  // V1: uses position start date; future: derive from promotion/level change history
  const timeOnLevel = useMemo(() => calculateMonthsSince(positionStartDate), [positionStartDate])

  const currentLevelSkills = useMemo<SkillGapItem[]>(() => {
    if (!currentStep || currentStep.jobProfileSkills.length === 0) return []
    return computeSkillGap(employee.skills || [], currentStep.jobProfileSkills)
  }, [employee.skills, currentStep])

  const nextLevelSkillGap = useMemo<SkillGapItem[]>(() => {
    if (!nextStep || nextStep.jobProfileSkills.length === 0) return []
    return computeSkillGap(employee.skills || [], nextStep.jobProfileSkills)
  }, [employee.skills, nextStep])

  const promotionCriteria = useMemo(() => currentStep?.promotionCriteria ?? [], [currentStep])

  const recommendationMessage = useMemo(() => generateRecommendationBanner(nextLevelSkillGap), [nextLevelSkillGap])

  const skillColumnLabels = useMemo(
    () => ({
      skill: t('career-skills-gap-col-skill'),
      current: t('career-skills-gap-col-current'),
      required: t('career-skills-gap-col-required'),
      gap: t('career-skills-gap-col-gap')
    }),
    [t]
  )

  const possibleNextRoles = useMemo(() => {
    if (!nextStep?.hasProfile) return []
    return ladder
      .filter(step => step.hierarchyOrder === nextStep.hierarchyOrder && step.hasProfile && step.jobProfileName)
      .map(step => ({
        id: step.jobProfileId!,
        name: step.jobProfileName!,
        function: employee.employeePosition?.jobPosition?.jobFunction?.name ?? ''
      }))
  }, [ladder, nextStep, employee.employeePosition?.jobPosition?.jobFunction?.name])

  const currentPositionName =
    employee.employeePosition?.jobPosition?.jobProfile?.name || employee.employeePosition?.jobPosition?.name || '—'
  const currentLevelDisplay = currentStep
    ? `${currentStep.jobLevelCode} ${currentStep.jobLevelName}`
    : (employee.employeePosition?.jobPosition?.jobLevel?.name ?? '—')
  const nextLevelDisplay = nextStep ? `${nextStep.jobLevelCode} ${nextStep.jobLevelName}` : '—'

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-48">
        <div className="gba:animate-spin gba:h-6 gba:w-6 gba:border-2 gba:border-primary gba:border-t-transparent gba:rounded-full" />
      </div>
    )
  }

  if (!isDataAvailable) {
    return (
      <EmptyState
        type="no-data"
        title={t('career-empty-state-title')}
        description={t('career-empty-state-description')}
        data-testid="career-tab-empty-state"
      />
    )
  }

  return (
    <div className="gba:space-y-5" data-testid="career-tab">
      {/* ═══ Section 1: Career Path Timeline ═══ */}
      <section data-testid="career-timeline-section">
        <div className="gba:mb-2">
          <h2 className="gba:text-xl gba:font-bold">{t('career-tab-title')}</h2>
          {employee.employeePosition?.jobPosition?.jobFunction?.name && (
            <p className="gba:text-sm gba:text-muted-foreground">
              {employee.employeePosition.jobPosition.jobFunction.name} {t('career-career-path-suffix')}
            </p>
          )}
        </div>
        <Card>
          <CardContent className="gba:py-6 gba:px-4 gba:overflow-x-auto">
            <div className="gba:flex gba:items-start gba:justify-between gba:min-w-max gba:gap-1">
              {ladder.map((step, index) => {
                const isCurrent = index === currentStepIndex
                const isPast = index < currentStepIndex
                const label = step.jobLevelName
                const code = step.jobLevelCode ? `(${step.jobLevelCode})` : ''

                return (
                  <div
                    key={step.jobLevelId}
                    className="gba:flex gba:flex-col gba:items-center gba:relative gba:flex-1 gba:min-w-[80px]"
                  >
                    {/* Connector line */}
                    {index > 0 && (
                      <div
                        className={`gba:absolute gba:top-[14px] gba:right-1/2 gba:w-full gba:h-0.5 ${
                          isPast || isCurrent ? 'gba:bg-blue-500' : 'gba:bg-gray-200'
                        }`}
                      />
                    )}
                    {/* Node */}
                    <div
                      className={`gba:relative gba:z-10 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:border-2 ${getTimelineNodeClasses(isCurrent, isPast)}`}
                    >
                      {(isPast || isCurrent) && (
                        <CheckCircleIcon weight="fill" className="gba:h-4 gba:w-4 gba:text-white" />
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={`gba:text-xs gba:mt-2 gba:text-center gba:leading-tight ${
                        isCurrent ? 'gba:font-bold gba:text-blue-600' : 'gba:text-muted-foreground'
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`gba:text-[10px] gba:text-center ${
                        isCurrent ? 'gba:text-blue-600' : 'gba:text-muted-foreground'
                      }`}
                    >
                      {code}
                    </span>
                    {/* Current level annotation */}
                    {isCurrent && (
                      <div className="gba:mt-1 gba:flex gba:flex-col gba:items-center gba:bg-blue-50 gba:rounded gba:px-2 gba:py-1">
                        <span className="gba:text-[10px] gba:font-bold gba:text-blue-600 gba:uppercase">
                          {t('career-timeline-current-level')}
                        </span>
                        {timeInRole !== null && (
                          <span className="gba:text-[10px] gba:text-muted-foreground">
                            {formatDuration(timeInRole)} {t('career-timeline-on-role')}
                          </span>
                        )}
                        {timeOnLevel !== null && (
                          <span className="gba:text-[10px] gba:text-muted-foreground">
                            {formatDuration(timeOnLevel)} {t('career-timeline-on-level')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══ Section 2: Position Summary Cards ═══ */}
      <section data-testid="career-position-summary">
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
          {/* Current Position */}
          <Card>
            <CardContent className="gba:p-4 gba:flex gba:items-start gba:gap-3">
              <div className="gba:p-2 gba:rounded-lg gba:bg-blue-50">
                <BriefcaseIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-xs gba:text-muted-foreground">{t('career-current-position')}</div>
                <div className="gba:text-sm gba:font-semibold gba:truncate">{currentPositionName}</div>
              </div>
            </CardContent>
          </Card>
          {/* Current Level */}
          <Card>
            <CardContent className="gba:p-4 gba:flex gba:items-start gba:gap-3">
              <div className="gba:p-2 gba:rounded-lg gba:bg-green-50">
                <TrendUpIcon className="gba:h-5 gba:w-5 gba:text-green-600" />
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-xs gba:text-muted-foreground">{t('career-current-level-card')}</div>
                <div className="gba:text-sm gba:font-semibold">{currentLevelDisplay}</div>
              </div>
            </CardContent>
          </Card>
          {/* Next Career Level */}
          <Card>
            <CardContent className="gba:p-4 gba:flex gba:items-start gba:gap-3">
              <div className="gba:p-2 gba:rounded-lg gba:bg-purple-50">
                <CaretRightIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-xs gba:text-muted-foreground">{t('career-next-career-level')}</div>
                <div className="gba:text-sm gba:font-semibold">{nextLevelDisplay}</div>
              </div>
            </CardContent>
          </Card>
          {/* Potential Level */}
          <Card>
            <CardContent className="gba:p-4 gba:flex gba:items-start gba:gap-3">
              <div className="gba:p-2 gba:rounded-lg gba:bg-amber-50">
                <StarIcon className="gba:h-5 gba:w-5 gba:text-amber-600" />
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-xs gba:text-muted-foreground">{t('career-potential-level')}</div>
                <div className="gba:text-sm gba:font-semibold gba:text-muted-foreground gba:italic">
                  {t('career-potential-not-assessed')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══ Section 3: 2×2 Grid — Current Skills | Next Skills | Criteria | Next Roles ═══ */}
      <section className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
        {/* Current Level Skills Gap */}
        <Card data-testid="career-skills-current">
          <CardContent className="gba:p-5">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">
              {t('career-skills-current-title')} {currentStep ? `(${currentStep.jobLevelCode})` : ''}
            </h3>
            {currentLevelSkills.length > 0 ? (
              <SkillGapTable
                skills={currentLevelSkills}
                emptyText={t('career-skills-empty-description')}
                columnLabels={skillColumnLabels}
              />
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">{t('career-skills-empty-description')}</p>
            )}
          </CardContent>
        </Card>

        {/* Next Level Skills Gap */}
        <Card data-testid="career-skills-gap">
          <CardContent className="gba:p-5">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">
              {t('career-skills-gap-title')} {nextStep ? `(${nextStep.jobLevelCode})` : ''}
            </h3>
            {nextLevelSkillGap.length > 0 ? (
              <SkillGapTable
                skills={nextLevelSkillGap}
                emptyText={t('career-skills-gap-empty')}
                columnLabels={skillColumnLabels}
              />
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">{t('career-skills-gap-empty')}</p>
            )}
          </CardContent>
        </Card>

        {/* Promotion Criteria */}
        <Card data-testid="career-promotion-criteria">
          <CardContent className="gba:p-5">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">
              {t('career-promotion-criteria-title')}{' '}
              {currentStep && nextStep ? `(${currentStep.jobLevelCode} → ${nextStep.jobLevelCode})` : ''}
            </h3>
            {promotionCriteria.length > 0 ? (
              <ul className="gba:space-y-2">
                {promotionCriteria.map(criterion => (
                  <li key={criterion} className="gba:flex gba:items-start gba:gap-2">
                    <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5 gba:shrink-0" />
                    <span className="gba:text-xs">{criterion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">{t('career-promotion-criteria-empty')}</p>
            )}
          </CardContent>
        </Card>

        {/* Possible Next Roles */}
        <Card data-testid="career-next-roles">
          <CardContent className="gba:p-5">
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">{t('career-next-roles-title')}</h3>
            {possibleNextRoles.length > 0 ? (
              <div className="gba:space-y-0">
                {possibleNextRoles.slice(0, 5).map(role => (
                  <div
                    key={role.id}
                    className="gba:flex gba:items-center gba:justify-between gba:py-2.5 gba:border-b gba:border-border/50 last:gba:border-0"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2.5">
                      <div className="gba:p-1.5 gba:rounded gba:bg-blue-50">
                        <RocketLaunchIcon className="gba:h-4 gba:w-4 gba:text-blue-600" />
                      </div>
                      <div>
                        <div className="gba:text-xs gba:font-medium">{role.name}</div>
                        {role.function && (
                          <div className="gba:text-[10px] gba:text-muted-foreground">{role.function}</div>
                        )}
                      </div>
                    </div>
                    <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">{t('career-next-roles-empty')}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ═══ Next Best Actions ═══ */}
      <CareerInsights nextLevelSkillGap={nextLevelSkillGap} recommendationMessage={recommendationMessage} t={t} />
    </div>
  )
}

// ─── Skill Gap Table ──────────────────────────────────────────────────────────

interface SkillGapTableProps {
  skills: SkillGapItem[]
  emptyText: string
  columnLabels?: { skill: string; current: string; required: string; gap: string }
}

const DEFAULT_COLUMN_LABELS = { skill: 'Skill', current: 'Current', required: 'Required', gap: 'Gap' }

const SkillGapTable: React.FC<SkillGapTableProps> = ({ skills, emptyText, columnLabels = DEFAULT_COLUMN_LABELS }) => {
  if (skills.length === 0) {
    return <p className="gba:text-xs gba:text-muted-foreground">{emptyText}</p>
  }
  return (
    <div className="gba:space-y-0">
      <div className="gba:grid gba:grid-cols-[1fr_60px_55px_35px] gba:gap-1 gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:mb-2 gba:px-1">
        <span>{columnLabels.skill}</span>
        <span className="gba:text-center">{columnLabels.current}</span>
        <span className="gba:text-center">{columnLabels.required}</span>
        <span className="gba:text-center">{columnLabels.gap}</span>
      </div>
      {skills.map(item => (
        <div
          key={item.skillId}
          className="gba:grid gba:grid-cols-[1fr_60px_55px_35px] gba:gap-1 gba:items-center gba:py-1.5 gba:px-1 gba:border-b gba:border-border/50 last:gba:border-0"
        >
          <span className="gba:text-xs gba:truncate">{item.skillName}</span>
          <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
            <span className="gba:text-xs gba:font-medium">{item.employeeLevel}</span>
            <div className="gba:w-8 gba:h-1.5 gba:rounded-full gba:bg-gray-200 gba:overflow-hidden">
              <div
                className="gba:h-full gba:bg-blue-500 gba:rounded-full"
                style={{
                  width: `${item.requiredLevel > 0 ? Math.min((item.employeeLevel / item.requiredLevel) * 100, 100) : 0}%`
                }}
              />
            </div>
          </div>
          <span className="gba:text-xs gba:text-center">{item.requiredLevel}</span>
          <span
            className={`gba:text-xs gba:text-center gba:font-bold ${item.gap > 0 ? 'gba:text-red-500' : 'gba:text-green-600'}`}
          >
            {item.gap > 0 ? item.gap : '✓'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Career Insights (Next Best Actions) ─────────────────────────────────────

interface CareerInsightsProps {
  nextLevelSkillGap: SkillGapItem[]
  recommendationMessage: string | null
  t: (key: string, args?: Record<string, unknown>) => string
}

const CareerInsights: React.FC<CareerInsightsProps> = ({ nextLevelSkillGap, recommendationMessage, t }) => {
  const cards = useMemo<HrGrowthInsightCard[]>(() => {
    const result: HrGrowthInsightCard[] = []

    const topGaps = nextLevelSkillGap.filter(s => s.gap > 0).slice(0, 3)
    topGaps.forEach(gap => {
      result.push({
        id: `skill-gap-${gap.skillId}`,
        priority: gap.gap >= 3 ? 'high' : 'recommended',
        icon: <TargetIcon className="gba:h-5 gba:w-5" weight="fill" />,
        title: t('career-insight-close-gap', { skill: gap.skillName }),
        description: t('career-insight-close-gap-description', {
          current: gap.employeeLevel,
          required: gap.requiredLevel,
          gap: gap.gap
        })
      })
    })

    if (recommendationMessage && result.length === 0) {
      result.push({
        id: 'general-recommendation',
        priority: 'opportunity',
        icon: <LightbulbIcon className="gba:h-5 gba:w-5" weight="fill" />,
        title: t('career-insight-tip-title'),
        description: recommendationMessage
      })
    }

    return result
  }, [nextLevelSkillGap, recommendationMessage, t])

  if (cards.length === 0) return null

  return (
    <HrGrowthInsightsSection
      title={t('career-insights-title')}
      description={t('career-insights-description')}
      cards={cards}
      testIds={{
        section: 'career-insights-section',
        toggle: 'career-insights-toggle',
        scrollLeft: 'career-insights-scroll-left',
        scrollRight: 'career-insights-scroll-right',
        cardPrefix: 'career-insight-card',
        menuPrefix: 'career-insight'
      }}
    />
  )
}

export default CareerTab
