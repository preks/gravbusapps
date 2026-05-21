import { useMemo } from 'react'
import { ShieldWarningIcon, UsersIcon, WarningIcon } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  KpiCard,
  PageLayout,
  type KpiCardData,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CATEGORY_I18N_KEY } from '../services/dataQualityCompute'
import { useDataQualityContext } from '../hooks/dataQualityHooks'
import type { useDataQualityDashboardModel } from '../hooks/useDataQualityDashboardModel'
import { CompanyFilter } from './CompanyFilter'
import { ExpandableCard } from './ExpandableCard'
import { DataCompletionOverview } from './DataCompletionOverview'
import { BreakdownMatrixCard } from './BreakdownMatrixCard'
import { RecommendedActionsCard } from './RecommendedActionsCard'
import { TopUrgentRecordsCard } from './TopUrgentRecordsCard'
import { JobArchitectureCard } from './job-architecture/JobArchitectureCard'
import { RecordsTable } from './records/RecordsTable'
import translations from '../_i18n'

const JA_ISSUE_TO_DRAWER = {
  job_position_no_profile: 'profiles',
  job_profile_no_description: 'descriptions',
  job_profile_no_skills: 'skills'
} as const

interface DataQualityDashboardProps extends BusinessAppContextProps {
  readonly model: ReturnType<typeof useDataQualityDashboardModel>
}

export function DataQualityDashboard({ accessToken, model }: Readonly<DataQualityDashboardProps>) {
  const { t } = useTranslation(translations)
  const ctx = useDataQualityContext()
  const d = ctx.dashboard
  const errorMessage = useMemo(() => {
    if (!ctx.error) {
      return null
    }
    return ctx.error.startsWith('error-') ? t(ctx.error) : ctx.error
  }, [ctx.error, t])

  const categoryCount = Object.keys(CATEGORY_I18N_KEY).length

  const kpiCards = useMemo(
    () => [
      {
        data: {
          id: 'overall',
          title: t('kpi-overall-completion'),
          value: d.overallCompletionRate,
          suffix: '%',
          progress: { value: Math.min(100, Math.max(0, d.overallCompletionRate)) },
          footer: t('kpi-overall-footer', { employees: d.employeeSampleSize, areas: categoryCount })
        } satisfies KpiCardData
      },
      {
        data: {
          id: 'missing',
          title: t('kpi-employees-missing'),
          value: d.employeesWithMissingDataCount,
          suffix: ` / ${d.employeeSampleSize}`,
          icon: <UsersIcon className="gba:size-4" />,
          footer: t('kpi-employees-missing-footer')
        } satisfies KpiCardData
      },
      {
        data: {
          id: 'payroll',
          title: t('kpi-payroll-blockers'),
          value: d.criticalPayrollBlockersCount,
          trend:
            d.criticalPayrollBlockersCount > 0
              ? {
                  value: t('kpi-payroll-blockers-trend'),
                  badgeVariant: 'destructive' as const,
                  trendIcon: 'none' as const
                }
              : undefined,
          footer: t('kpi-payroll-blockers-footer')
        } satisfies KpiCardData
      }
    ],
    [d, categoryCount, t]
  )

  const kpiClickHandlers: Record<string, () => void> = useMemo(
    () => ({
      missing: () => model.navigateToIssues({}),
      payroll: () => model.navigateToIssues({ severity: ['critical'] })
    }),
    [model]
  )

  return (
    <PageLayout
      headerIcon={WarningIcon}
      headerTitle={t('hr-admin-cockpit-page-title')}
      headerDescription={t('hr-admin-cockpit-page-description')}
      onBack={null as unknown as (() => void) | undefined}
      headerContent={<CompanyFilter accessToken={accessToken} />}
      headerSubViews={{
        value: model.activeTab,
        items: [
          { value: 'overview', label: t('tab-overview') },
          { value: 'issues', label: t('tab-issues') }
        ],
        onValueChange: model.handleTabChange
      }}
    >
      {model.activeTab === 'overview' ? (
        <div className="gba:space-y-6">
          <div>
            <h2 className="gba:text-sm gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-2">
              {t('section-key-metrics')}
            </h2>
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              {kpiCards.map(({ data: card }) => {
                const clickable = Boolean(kpiClickHandlers[card.id])
                const cardClassName =
                  'gba:w-full gba:text-left gba:rounded-lg gba:transition-shadow hover:gba:ring-2 hover:gba:ring-ring hover:gba:ring-offset-1 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring gba:cursor-pointer'
                return clickable ? (
                  <button key={card.id} type="button" onClick={kpiClickHandlers[card.id]} className={cardClassName}>
                    <KpiCard card={card} className="gba:bg-muted" />
                  </button>
                ) : (
                  <div key={card.id}>
                    <KpiCard card={card} className="gba:bg-muted" />
                  </div>
                )
              })}
            </div>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <ShieldWarningIcon className="gba:size-4" />
              <AlertTitle>{t('error-load-failed')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="gba:grid gba:grid-cols-[340px_1fr_320px] gba:gap-4 gba:items-stretch">
            <ExpandableCard>
              <DataCompletionOverview />
            </ExpandableCard>
            <ExpandableCard>
              <BreakdownMatrixCard />
            </ExpandableCard>
            <ExpandableCard>
              <RecommendedActionsCard
                onActionClick={issueFocus => model.navigateToIssues({ missingFields: [issueFocus] })}
                onOpenJaDrawer={model.openJaDrawer}
                issueToDrawerMap={JA_ISSUE_TO_DRAWER}
              />
            </ExpandableCard>
          </div>

          <div className="gba:grid gba:grid-cols-[1fr_420px] gba:gap-4">
            <TopUrgentRecordsCard
              accessToken={accessToken}
              onViewAll={() => model.navigateToIssues(null)}
              onNonEmployeeReview={record => {
                const drawerKind = JA_ISSUE_TO_DRAWER[record.missingFields[0] as keyof typeof JA_ISSUE_TO_DRAWER]
                if (drawerKind) model.openJaDrawer(drawerKind)
              }}
            />
            <JobArchitectureCard
              accessToken={accessToken}
              drawerKind={model.jaDrawerKind}
              setDrawerKind={model.setJaDrawerKind}
              selectedProfileIdx={model.jaSelectedIdx}
              setSelectedProfileIdx={model.setJaSelectedIdx}
            />
          </div>
        </div>
      ) : (
        <div className="gba:space-y-4">
          <div>
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('issues-title')}</h2>
            <p className="gba:text-sm gba:text-muted-foreground">{t('issues-subtitle')}</p>
          </div>
          <RecordsTable accessToken={accessToken} initialFilters={model.issuesPreFilter} />
        </div>
      )}
    </PageLayout>
  )
}
