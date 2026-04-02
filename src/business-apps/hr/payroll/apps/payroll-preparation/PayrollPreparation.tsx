import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import {
  HouseLineIcon,
  TableIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
  FlagIcon,
  ExportIcon,
  ArrowLeftIcon
} from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import {
  usePayrollEmployees,
  usePayrollSummary,
  useCompanyList,
  useFilteredEmployees
} from './hooks/usePayrollEmployees'
import type { PayrollCompany } from './hooks/usePayrollEmployees'
import type { PayrollGridFilters as FilterState, PayrollRun } from './types/payrollTypes'
import { usePayrollRunStore } from './hooks/usePayrollRunStore'
import { usePayrollRun } from './hooks/usePayrollRun'
import { usePayrollRuns } from './hooks/usePayrollRuns'
import { PayrollRunSelector } from './components/shared/PayrollRunSelector'
import { CreatePayrollRunDialog } from './components/shared/CreatePayrollRunDialog'
import type { CreatePayrollRunParams } from './components/shared/CreatePayrollRunDialog'
import { OverviewView } from './components/views/overview/OverviewView'
import { PayrollGridView } from './components/views/payroll-grid/PayrollGrid'
import { ExceptionsView } from './components/views/exceptions/ExceptionsView'
import { ChangesView } from './components/views/changes/ChangesView'
import { CountryChecksView } from './components/views/country-checks/CountryChecksView'
import { ExportSignoffView } from './components/views/export-signoff/ExportSignoffView'
import translations from './_i18n'
import { DEFAULT_PAYROLL_COUNTRY } from './utils/payrollDefaults'

const moduleColor = MODULE_COLORS.HR

type ViewKey = 'overview' | 'grid' | 'exceptions' | 'changes' | 'country-checks' | 'export'

export const PayrollPreparation: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context
  const { t } = useTranslation(translations)

  const { selectedCompanyId, selectedCompanyName, detectedCountry, activeRun, setDetectedCountry, setActiveRun } =
    usePayrollRunStore()

  const { companies, loading: companiesLoading } = useCompanyList(accessToken)
  const { runs, loading: runsLoading, refetch: refetchRuns } = usePayrollRuns(accessToken, selectedCompanyId)

  const activeMonth = activeRun?.month ?? 0
  const activeYear = activeRun?.year ?? 0

  const {
    employees,
    loading,
    error,
    refetch: refetchEmployees
  } = usePayrollEmployees(accessToken, activeRun ? selectedCompanyId : null, activeMonth, activeYear, detectedCountry)
  const summary = usePayrollSummary(employees)

  const {
    payrollRun,
    saving: runSaving,
    auditEvents,
    createRun,
    updateStatus,
    markReadyForReview,
    submitReview,
    recordExport
  } = usePayrollRun(accessToken, selectedCompanyId, selectedCompanyName, detectedCountry, activeRun, userInfo)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [pendingOverviewRunId, setPendingOverviewRunId] = useState<string | null>(null)

  const handleCreateRun = useCallback(
    async (params: CreatePayrollRunParams) => {
      const created = await createRun(params)
      if (created) {
        setActiveRun(created)
        await refetchRuns()
      }
    },
    [createRun, setActiveRun, refetchRuns]
  )

  const handleSelectRun = useCallback(
    (run: PayrollRun) => {
      setPendingOverviewRunId(run.id)
      setActiveRun(run)
    },
    [setActiveRun]
  )

  const handleBackToRuns = useCallback(() => {
    setPendingOverviewRunId(null)
    setActiveRun(null)
    setActiveTab('overview')
  }, [setActiveRun])

  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetchEmployees()
    } finally {
      setRefreshing(false)
    }
  }, [refetchEmployees])

  const [gridFilters, setGridFilters] = useState<FilterState>({
    search: '',
    readinessStatus: 'all',
    changedOnly: false,
    issueCategory: 'all',
    department: 'all'
  })

  const filteredEmployees = useFilteredEmployees(employees, gridFilters)

  const gridFiltersActive = useMemo(
    () =>
      gridFilters.search !== '' ||
      gridFilters.readinessStatus !== 'all' ||
      gridFilters.changedOnly ||
      gridFilters.issueCategory !== 'all' ||
      gridFilters.department !== 'all',
    [gridFilters]
  )

  const handleCompanyChange = useCallback(
    (company: PayrollCompany) => {
      setDetectedCountry(company.countryCode)
    },
    [setDetectedCountry]
  )

  const getInitialView = (): ViewKey => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')
    const validViews: ViewKey[] = ['overview', 'grid', 'exceptions', 'changes', 'country-checks', 'export']
    if (viewFromUrl && validViews.includes(viewFromUrl as ViewKey)) {
      return viewFromUrl as ViewKey
    }
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<ViewKey>(getInitialView())

  const viewOptions = useMemo(
    () => [
      {
        key: 'overview' as ViewKey,
        icon: <HouseLineIcon />,
        label: t('tab-overview'),
        title: t('overview-title'),
        description: t('overview-description')
      },
      {
        key: 'grid' as ViewKey,
        icon: <TableIcon />,
        label: t('tab-payroll-grid'),
        title: t('grid-title'),
        description: t('grid-description')
      },
      {
        key: 'exceptions' as ViewKey,
        icon: <WarningCircleIcon />,
        label: t('tab-exceptions'),
        title: t('exceptions-title'),
        description: t('exceptions-description')
      },
      {
        key: 'changes' as ViewKey,
        icon: <ArrowsClockwiseIcon />,
        label: t('tab-changes'),
        title: t('changes-title'),
        description: t('changes-description')
      },
      {
        key: 'country-checks' as ViewKey,
        icon: <FlagIcon />,
        label: t('tab-country-checks'),
        title: t('country-checks-title'),
        description: t('country-checks-description')
      },
      {
        key: 'export' as ViewKey,
        icon: <ExportIcon />,
        label: t('tab-export'),
        title: t('export-title'),
        description: t('export-description')
      }
    ],
    [t]
  )

  const updateUrl = (view: ViewKey) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('view', view)
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleTabChange = (key: string) => {
    if (!key || key === activeTab) return
    setActiveTab(key as ViewKey)
    updateUrl(key as ViewKey)
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialView())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!activeRun) {
      setPendingOverviewRunId(null)
      return
    }

    if (loading && pendingOverviewRunId === activeRun.id) {
      setPendingOverviewRunId(null)
    }
  }, [activeRun, loading, pendingOverviewRunId])

  const activeTabInfo = viewOptions.find(o => o.key === activeTab) || viewOptions[0]

  const renderLoadingState = () => (
    <div className="gba:flex gba:items-center gba:justify-center gba:py-24">
      <Spinner />
      <span className="gba:ml-3 gba:text-muted-foreground">{t('loading')}</span>
    </div>
  )

  const renderNoCompanyState = () => (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-24 gba:text-muted-foreground">
      <TableIcon size={64} className="gba:mb-4 gba:text-muted-foreground/30" />
      <p className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('payroll-prep-title')}</p>
      <p className="gba:text-sm">{t('no-company-selected')}</p>
    </div>
  )

  const renderNoRunSelectedState = () => (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-24 gba:text-muted-foreground">
      <TableIcon size={64} className="gba:mb-4 gba:text-muted-foreground/30" />
      <p className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('runs-title')}</p>
      <p className="gba:text-sm">{t('runs-select-hint')}</p>
    </div>
  )

  const renderErrorState = () => (
    <div className="gba:flex gba:items-center gba:justify-center gba:py-24 gba:text-destructive">
      <p>{t('error-loading')}</p>
    </div>
  )

  const renderOverviewContent = (waitingForOverviewLoad: boolean) => {
    if (activeRun && (loading || waitingForOverviewLoad)) {
      return renderLoadingState()
    }

    return (
      <OverviewView
        activeRun={activeRun}
        runs={runs}
        runsLoading={runsLoading}
        summary={summary}
        employees={employees}
        onSelectRun={handleSelectRun}
        onCreateRun={() => setCreateDialogOpen(true)}
        t={t}
      />
    )
  }

  const renderContent = () => {
    const waitingForOverviewLoad = activeRun?.id === pendingOverviewRunId
    const requiresSelectedRun = activeTab !== 'overview'

    if (!selectedCompanyId) {
      return renderNoCompanyState()
    }

    if (!requiresSelectedRun) {
      return renderOverviewContent(waitingForOverviewLoad)
    }

    if (!activeRun) {
      return renderNoRunSelectedState()
    }

    if (loading) {
      return renderLoadingState()
    }

    if (error) {
      return renderErrorState()
    }

    switch (activeTab) {
      case 'grid':
        return (
          <PayrollGridView
            employees={employees}
            country={detectedCountry || DEFAULT_PAYROLL_COUNTRY}
            filters={gridFilters}
            onFiltersChange={setGridFilters}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            t={t}
          />
        )
      case 'exceptions':
        return <ExceptionsView employees={employees} onRefresh={handleRefresh} refreshing={refreshing} t={t} />
      case 'changes':
        return <ChangesView employees={employees} t={t} />
      case 'country-checks':
        return <CountryChecksView employees={employees} country={detectedCountry || DEFAULT_PAYROLL_COUNTRY} t={t} />
      case 'export':
        return (
          <ExportSignoffView
            employees={employees}
            filteredEmployees={filteredEmployees}
            gridFiltersActive={gridFiltersActive}
            payrollRun={payrollRun}
            summary={summary}
            auditEvents={auditEvents}
            updateStatus={updateStatus}
            markReadyForReview={markReadyForReview}
            submitReview={submitReview}
            recordExport={recordExport}
            saving={runSaving}
            t={t}
          />
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="payroll-preparation-app">
      <PageLayout
        headerIcon={TableIcon}
        headerTitle={t('payroll-prep-title')}
        headerDescription={t('payroll-prep-description')}
        sectionTitle={activeTabInfo.title}
        sectionDescription={activeTabInfo.description}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        <div className="gba:mb-6 gba:flex gba:items-center gba:justify-between gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            {activeRun && (
              <Button variant="outline" size="sm" onClick={handleBackToRuns}>
                <ArrowLeftIcon size={16} className="gba:mr-1" />
                {t('back-to-runs')}
              </Button>
            )}
            <PayrollRunSelector
              companies={companies}
              companiesLoading={companiesLoading}
              onCompanyChange={handleCompanyChange}
              t={t}
            />
          </div>
          {activeRun && (
            <div className="gba:text-sm gba:text-muted-foreground">
              {t(`month-${activeRun.month}`)} {activeRun.year}
            </div>
          )}
        </div>

        <div className="gba:h-full gba:overflow-auto">{renderContent()}</div>
      </PageLayout>

      <CreatePayrollRunDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        existingRuns={runs}
        saving={runSaving}
        onSubmit={handleCreateRun}
        t={t}
      />
    </div>
  )
}

export default PayrollPreparation
