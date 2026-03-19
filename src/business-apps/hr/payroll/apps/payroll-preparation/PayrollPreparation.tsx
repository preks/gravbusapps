import React, { useState, useEffect, useCallback } from 'react'
import { PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import {
  HouseLineIcon,
  TableIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
  FlagIcon,
  ExportIcon
} from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { usePayrollEmployees, usePayrollSummary, useCompanyList } from './hooks/usePayrollEmployees'
import type { PayrollCompany } from './hooks/usePayrollEmployees'
import { usePayrollRunStore } from './hooks/usePayrollRunStore'
import { PayrollRunSelector } from './components/shared/PayrollRunSelector'
import { OverviewView } from './components/views/overview/OverviewView'
import { PayrollGridView } from './components/views/payroll-grid/PayrollGrid'
import { ExceptionsView } from './components/views/exceptions/ExceptionsView'
import { ChangesView } from './components/views/changes/ChangesView'
import { CountryChecksView } from './components/views/country-checks/CountryChecksView'
import { ExportSignoffView } from './components/views/export-signoff/ExportSignoffView'
import translations from './_i18n'

const moduleColor = MODULE_COLORS.HR

type ViewKey = 'overview' | 'grid' | 'exceptions' | 'changes' | 'country-checks' | 'export'

export const PayrollPreparation: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context
  const { t } = useTranslation(translations)

  const {
    selectedCompanyId,
    selectedMonth,
    selectedYear,
    detectedCountry,
    payrollRun,
    auditEvents,
    setDetectedCountry,
    initializeRun
  } = usePayrollRunStore()

  const { companies, loading: companiesLoading } = useCompanyList(accessToken)
  const { employees, loading, error } = usePayrollEmployees(
    accessToken,
    selectedCompanyId,
    selectedMonth,
    selectedYear,
    detectedCountry
  )
  const summary = usePayrollSummary(employees)

  const handleCompanyChange = useCallback(
    (company: PayrollCompany) => {
      setDetectedCountry(company.countryCode)
    },
    [setDetectedCountry]
  )

  useEffect(() => {
    if (selectedCompanyId && employees.length > 0 && !payrollRun) {
      initializeRun()
    }
  }, [selectedCompanyId, employees.length, payrollRun, initializeRun])

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

  const viewOptions = [
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
  ]

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

  const activeTabInfo = viewOptions.find(o => o.key === activeTab) || viewOptions[0]

  const renderContent = () => {
    if (!selectedCompanyId) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-24 gba:text-muted-foreground">
          <TableIcon size={64} className="gba:mb-4 gba:text-muted-foreground/30" />
          <p className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('payroll-prep-title')}</p>
          <p className="gba:text-sm">{t('no-company-selected')}</p>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-24">
          <Spinner />
          <span className="gba:ml-3 gba:text-muted-foreground">{t('loading')}</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-24 gba:text-destructive">
          <p>{t('error-loading')}</p>
        </div>
      )
    }

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewView
            summary={summary}
            payrollRun={payrollRun}
            employees={employees}
            t={t}
            onNavigateToGrid={() => {
              setActiveTab('grid')
              updateUrl('grid')
            }}
          />
        )
      case 'grid':
        return <PayrollGridView employees={employees} country={detectedCountry || 'DE'} t={t} />
      case 'exceptions':
        return <ExceptionsView employees={employees} t={t} />
      case 'changes':
        return <ChangesView employees={employees} t={t} />
      case 'country-checks':
        return <CountryChecksView employees={employees} country={detectedCountry || 'DE'} t={t} />
      case 'export':
        return (
          <ExportSignoffView
            employees={employees}
            payrollRun={payrollRun}
            summary={summary}
            auditEvents={auditEvents}
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
        <div className="gba:mb-6">
          <PayrollRunSelector
            companies={companies}
            companiesLoading={companiesLoading}
            onCompanyChange={handleCompanyChange}
            t={t}
          />
        </div>

        <div className="gba:h-full gba:overflow-auto">{renderContent()}</div>
      </PageLayout>
    </div>
  )
}

export default PayrollPreparation
