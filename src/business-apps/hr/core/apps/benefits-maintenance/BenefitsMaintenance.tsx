import React, { useState, useCallback, useMemo } from 'react'
import { PageLayout, KpiCard, useTranslation, toast } from '@newwork/nw-design-system'
import type { KpiCardData } from '@newwork/nw-design-system'
import {
  HeartIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  BuildingsIcon,
  ClockCountdownIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { BenefitTypeEntry, BenefitTypeFormData } from './types/benefitsMaintenanceTypes'
import useLegalEntityOptions from './hooks/useLegalEntityOptions'
import { useBenefitsKpiData } from './hooks/useBenefitsKpiData'
import { usePendingBenefitApprovals } from './hooks/usePendingBenefitApprovals'
import useBenefitTypesCatalog from './hooks/useBenefitTypesCatalog'
import BenefitTypesView from './components/BenefitTypesView'
import BenefitProvidersView from './components/BenefitProvidersView'
import EmployeeAssignmentsView, { type AssignmentKpiCounts } from './components/EmployeeAssignmentsView'
import BenefitPendingApprovalsView from './components/BenefitPendingApprovalsView'
import BenefitTypeDialog from './components/BenefitTypeDialog'
import useBenefitMutations from './hooks/useBenefitMutations'

interface BenefitsMaintenanceProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

function formatTrend(delta: number): string {
  if (delta === 0) return '0%'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}`
}

export const BenefitsMaintenance: React.FC<BenefitsMaintenanceProps> = context => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState('benefits')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [selectedBenefitForProviders, setSelectedBenefitForProviders] = useState<BenefitTypeEntry | null>(null)
  const [assignmentCounts, setAssignmentCounts] = useState<AssignmentKpiCounts>({
    totalBenefits: 0,
    employeesWithBenefits: 0,
    avgBenefitsPerEmployee: 0
  })
  const handleAssignmentKpiChange = useCallback((counts: AssignmentKpiCounts) => {
    setAssignmentCounts(counts)
  }, [])

  const {
    legalEntities,
    loading: legalEntitiesLoading,
    fetchLegalEntities
  } = useLegalEntityOptions({
    accessToken: context.accessToken
  })
  const mutations = useBenefitMutations(context)
  const { counts: employeeKpiCounts, trends: employeeKpiTrends } = useBenefitsKpiData(context.accessToken)

  const { entries: providerKpiBenefitEntries } = useBenefitTypesCatalog({
    accessToken: context.accessToken,
    autoFetch: activeTab === 'providers'
  })

  const {
    tasks: pendingTasks,
    totalCount: pendingTotal,
    isLoading: isPendingLoading,
    error: pendingError,
    isActioning: isPendingActioning,
    refetch: refetchPending,
    approve: approvePending,
    reject: rejectPending
  } = usePendingBenefitApprovals(context.accessToken, context.userInfo?.id)

  const handleViewProviders = useCallback((entry: BenefitTypeEntry) => {
    setSelectedBenefitForProviders(entry)
    setActiveTab('providers')
  }, [])

  const handleBackFromProviders = useCallback(() => {
    setSelectedBenefitForProviders(null)
    setActiveTab('benefits')
  }, [])

  const handleCreateSubmit = async (data: BenefitTypeFormData) => {
    try {
      await mutations.createBenefitType(data)
      toast.success(t('toast-created', { name: data.value }))
      setRefreshKey(k => k + 1)
    } catch (err) {
      toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
    }
  }

  // --- Benefits tab KPIs ---
  const benefitsKpis = useMemo<KpiCardData[]>(() => {
    return [
      {
        id: 'available',
        title: t('kpi-available-benefits'),
        value: employeeKpiCounts.availableBenefits,
        icon: <HeartIcon className="gba:size-4" />,
        trend: {
          value: formatTrend(employeeKpiTrends.availableBenefitsDelta),
          positive: employeeKpiTrends.availableBenefitsDelta >= 0,
          description: t('kpi-trend-vs-last-month')
        },
        footer: t('kpi-available-footer')
      },
      {
        id: 'private',
        title: t('kpi-private-benefits'),
        value: employeeKpiCounts.privateBenefits,
        icon: <ShieldCheckIcon className="gba:size-4" />,
        trend: {
          value: formatTrend(employeeKpiTrends.privateBenefitsDelta),
          positive: employeeKpiTrends.privateBenefitsDelta >= 0,
          description: t('kpi-trend-vs-last-month')
        },
        footer: t('kpi-private-footer')
      },
      {
        id: 'employees',
        title: t('kpi-employees-with-benefits'),
        value: employeeKpiCounts.employeesWithBenefits,
        icon: <UsersIcon className="gba:size-4" />,
        trend: {
          value: formatTrend(employeeKpiTrends.employeesWithBenefitsDelta),
          positive: employeeKpiTrends.employeesWithBenefitsDelta >= 0,
          description: t('kpi-trend-vs-last-month')
        },
        footer: t('kpi-employees-footer')
      },
      {
        id: 'avg',
        title: t('kpi-avg-per-employee'),
        value: employeeKpiCounts.avgBenefitsPerEmployee,
        decimalPlaces: 1,
        icon: <ChartBarIcon className="gba:size-4" />,
        trend: {
          value: formatTrend(employeeKpiTrends.avgBenefitsPerEmployeeDelta),
          positive: employeeKpiTrends.avgBenefitsPerEmployeeDelta >= 0,
          description: t('kpi-trend-vs-last-month')
        },
        footer: t('kpi-avg-footer')
      }
    ]
  }, [employeeKpiCounts, employeeKpiTrends, t])

  // --- Providers tab KPIs ---
  const providersKpis = useMemo<KpiCardData[]>(() => {
    const activeBenefits = providerKpiBenefitEntries.filter(e => !e.isDeleted)
    const benefitCount = activeBenefits.length
    const providerCount = activeBenefits.reduce((sum, e) => sum + (e.providersCount ?? 0), 0)
    const avgProviders = benefitCount > 0 ? Math.round((providerCount / benefitCount) * 10) / 10 : 0

    return [
      {
        id: 'providers',
        title: t('kpi-providers-count'),
        value: providerCount,
        icon: <BuildingsIcon className="gba:size-4" />,
        footer: t('kpi-providers-footer', { count: String(benefitCount) })
      },
      {
        id: 'avgProviders',
        title: t('kpi-providers-avg'),
        value: avgProviders,
        decimalPlaces: 1,
        icon: <ChartBarIcon className="gba:size-4" />,
        footer: t('kpi-providers-avg-footer')
      }
    ]
  }, [providerKpiBenefitEntries, t])

  // --- Employee Assignments tab KPIs (computed from actual table data, excluding pending) ---
  const assignmentsKpis = useMemo<KpiCardData[]>(
    () => [
      {
        id: 'employees',
        title: t('kpi-assignments-employees'),
        value: assignmentCounts.employeesWithBenefits,
        icon: <UsersIcon className="gba:size-4" />,
        footer: t('kpi-assignments-employees-footer')
      },
      {
        id: 'totalBenefits',
        title: t('kpi-assignments-total'),
        value: assignmentCounts.totalBenefits,
        icon: <ShieldCheckIcon className="gba:size-4" />,
        footer: t('kpi-assignments-total-footer')
      },
      {
        id: 'avg',
        title: t('kpi-assignments-avg'),
        value: assignmentCounts.avgBenefitsPerEmployee,
        decimalPlaces: 1,
        icon: <HeartIcon className="gba:size-4" />,
        footer: t('kpi-assignments-avg-footer')
      }
    ],
    [assignmentCounts, t]
  )

  // --- Pending Approvals tab KPIs ---
  const pendingKpis = useMemo<KpiCardData[]>(() => {
    const distinctEmployees = new Set(pendingTasks.map(t => t.employeeId).filter(Boolean)).size

    return [
      {
        id: 'pending',
        title: t('kpi-pending-total'),
        value: pendingTotal,
        icon: <ClockCountdownIcon className="gba:size-4" />,
        footer: t('kpi-pending-total-footer')
      },
      {
        id: 'employees',
        title: t('kpi-pending-employees'),
        value: distinctEmployees,
        icon: <UsersIcon className="gba:size-4" />,
        footer: t('kpi-pending-employees-footer')
      }
    ]
  }, [pendingTasks, pendingTotal, t])

  const activeKpis = useMemo(() => {
    switch (activeTab) {
      case 'benefits':
        return benefitsKpis
      case 'providers':
        return providersKpis
      case 'assignments':
        return assignmentsKpis
      case 'pending':
        return pendingKpis
      default:
        return benefitsKpis
    }
  }, [activeTab, benefitsKpis, providersKpis, assignmentsKpis, pendingKpis])

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'benefits':
        return (
          <BenefitTypesView
            key={refreshKey}
            t={t}
            legalEntities={legalEntities}
            legalEntitiesLoading={legalEntitiesLoading}
            onLoadLegalEntities={fetchLegalEntities}
            onViewProviders={handleViewProviders}
            onCreateBenefit={() => setCreateDialogOpen(true)}
            {...context}
          />
        )
      case 'providers':
        return (
          <BenefitProvidersView
            t={t}
            parentBenefitType={selectedBenefitForProviders}
            benefitTypes={providerKpiBenefitEntries}
            onBack={handleBackFromProviders}
            {...context}
          />
        )
      case 'assignments':
        return (
          <EmployeeAssignmentsView accessToken={context.accessToken} t={t} onKpiChange={handleAssignmentKpiChange} />
        )
      case 'pending':
        return (
          <BenefitPendingApprovalsView
            t={t}
            accessToken={context.accessToken}
            userId={context.userInfo?.id}
            tasks={pendingTasks}
            totalCount={pendingTotal}
            isLoading={isPendingLoading}
            isActioning={isPendingActioning}
            error={pendingError}
            refetch={refetchPending}
            approve={approvePending}
            reject={rejectPending}
          />
        )
      default:
        return null
    }
  }, [
    activeTab,
    refreshKey,
    t,
    legalEntities,
    legalEntitiesLoading,
    fetchLegalEntities,
    handleViewProviders,
    selectedBenefitForProviders,
    handleBackFromProviders,
    handleAssignmentKpiChange,
    context,
    pendingTasks,
    pendingTotal,
    isPendingLoading,
    pendingError,
    isPendingActioning,
    refetchPending,
    approvePending,
    rejectPending
  ])

  const kpiGridCols = activeKpis.length <= 2 ? 'gba:grid-cols-2' : 'gba:grid-cols-4'

  return (
    <>
      <PageLayout
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        headerIcon={HeartIcon}
        headerSubViews={{
          value: activeTab,
          onValueChange: setActiveTab,
          items: [
            { value: 'benefits', label: t('tab-benefits') },
            { value: 'providers', label: t('tab-providers') },
            { value: 'assignments', label: t('tab-employee-assignments') },
            { value: 'pending', label: t('tab-pending-approvals') }
          ]
        }}
        className="gba:min-h-screen"
      >
        <div className={`gba:grid ${kpiGridCols} gba:gap-3 gba:mb-6`}>
          {activeKpis.map(card => (
            <div key={card.id} className="gba:bg-muted/40 gba:rounded-xl gba:border">
              <KpiCard card={card} />
            </div>
          ))}
        </div>
        {tabContent}
      </PageLayout>

      <BenefitTypeDialog
        t={t}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
        mode="create"
        legalEntities={legalEntities}
        selectedLegalEntityId={null}
      />
    </>
  )
}

export default BenefitsMaintenance
