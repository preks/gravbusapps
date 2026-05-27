import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  GaugeIcon,
  UserIcon,
  UsersIcon,
  BuildingsIcon,
  CurrencyDollarIcon,
  ChartLineIcon,
  MapPinIcon
} from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  type FilterConfiguration,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import Dashboard from './components/views/dashboard/Dashboard'
import Demographics from './components/views/demographics'
import Workforce from './components/views/workforce'
import StructuralAnalysisReport from './components/views/structural-analysis/StructuralAnalysisReport'
import Compensation from './components/views/compensation'
import Forecasting from './components/views/forecasting'
import OfficeUsage from '@/business-apps/hr/core/apps/office-usage'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { HrAnalyticsFiltersProvider } from './context/HrAnalyticsFiltersContext'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation/hooks/useActiveStructureCompanies'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { BackofficeDataDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeDataDisplay'
import { BackofficeFilterSheet } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeFilterSheet'
import { CompanyFilterGroup } from './components/shared/CompanyFilterGroup'
import { HrAnalyticsFilterSummary } from './components/shared/HrAnalyticsFilterSummary'

export const HrAnalyticsView: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(hrTranslations)
  const { companies } = useActiveStructureCompanies(context.accessToken)

  const companyLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of companies) {
      map[c.id] = c.name
    }
    return map
  }, [companies])

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  const viewOptions = [
    {
      key: 'dashboard',
      icon: <GaugeIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.dashboard_tab_label',
        'Dashboard'
      )
    },
    {
      key: 'demographics',
      icon: <UserIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.demographics_tab_label',
        'Demographics'
      )
    },
    {
      key: 'workforce',
      icon: <UsersIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.workforce_tab_label',
        'Workforce'
      )
    },
    {
      key: 'compensation',
      icon: <CurrencyDollarIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.compensation_tab_label',
        'Compensation'
      )
    },
    {
      key: 'forecasting',
      icon: <ChartLineIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.forecasting_tab_label',
        'Forecasting'
      )
    },
    {
      key: 'structural-analysis',
      icon: <BuildingsIcon size={16} />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.structural_analysis_tab_label',
        'Structural Analysis'
      )
    },
    {
      key: 'office-presence',
      icon: <MapPinIcon />,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.analytics_section.office_presence_tab_label',
        'Office Presence'
      )
    }
  ]

  // Get initial tab from URL
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')

    // Validate that the tab exists in our options
    if (tabFromUrl && viewOptions.some(option => option.key === tabFromUrl)) {
      return tabFromUrl
    }

    return viewOptions[0].key
  }

  const [activeSubTab, setActiveSubTab] = useState<string>(getInitialTab())
  const [error, setError] = useState<string | null>(null)
  const [isLoading] = useState<boolean>(false)

  const companyFilterGroupTitle = t('hr-analytics-filter-company-title')

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'hr-analytics-filters',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.title', 'HR Analytics'),
      groups: [
        {
          id: 'company-group',
          label: companyFilterGroupTitle,
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'companyIds',
              field: 'companyIds',
              label: companyFilterGroupTitle,
              type: 'multi-select',
              config: {
                options: companies.map(company => ({ id: company.id, label: company.name })),
                showSearch: true,
                showSelectAll: true
              }
            }
          ]
        }
      ]
    }),
    [companies, companyFilterGroupTitle]
  )

  const filtersObject = useMemo<Record<string, unknown>>(
    () => (selectedCompanyIds.length > 0 ? { companyIds: selectedCompanyIds } : {}),
    [selectedCompanyIds]
  )
  const selectedCompanies = useMemo(
    () =>
      selectedCompanyIds
        .map(companyId => {
          const companyName = companyLabelMap[companyId]
          return companyName ? { id: companyId, name: companyName } : null
        })
        .filter((company): company is { id: string; name: string } => company !== null),
    [companyLabelMap, selectedCompanyIds]
  )

  const removeSelectedCompany = useCallback((companyId: string) => {
    setSelectedCompanyIds(currentIds => currentIds.filter(currentCompanyId => currentCompanyId !== companyId))
  }, [])

  const clearSelectedCompanies = useCallback(() => {
    setSelectedCompanyIds([])
  }, [])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    setSelectedCompanyIds((filters.companyIds as string[] | undefined) ?? [])
  }, [])

  const renderCompanyFilterGroup = useCallback(
    ({ selectedIds, onSelectedIdsChange }: { selectedIds: string[]; onSelectedIdsChange: (ids: string[]) => void }) => (
      <CompanyFilterGroup
        companies={companies.map(company => ({ id: company.id, name: company.name }))}
        selectedIds={selectedIds}
        onSelectedIdsChange={onSelectedIdsChange}
        searchPlaceholder={t('hr-analytics-filter-company-search-placeholder')}
        previousLabel={t('hr-analytics-filter-previous')}
        nextLabel={t('hr-analytics-filter-next')}
        ofLabel={t('hr-analytics-filter-of')}
        emptyLabel={t('hr-analytics-filter-company-empty')}
      />
    ),
    [companies, t]
  )

  const companyCustomGroup = useMemo(
    () => ({
      groupId: 'company-group',
      valueKey: 'companyIds',
      render: renderCompanyFilterGroup
    }),
    [renderCompanyFilterGroup]
  )

  const renderFilterSheet = useCallback(
    (open: boolean, onOpenChange: (open: boolean) => void) => (
      <BackofficeFilterSheet
        open={open}
        onOpenChange={onOpenChange}
        configuration={filterConfiguration}
        values={filtersObject}
        onApply={handleFilterChangeFromDisplay}
        onChange={handleFilterChangeFromDisplay}
        title={t('hr-analytics-filter-sheet-title')}
        description={t('hr-analytics-filter-sheet-description')}
        noFiltersConfiguredLabel={t('hr-analytics-filter-no-filters-configured')}
        clearAllLabel={t('hr-analytics-filter-clear-all')}
        cancelLabel={t('hr-analytics-filter-cancel')}
        applyFiltersLabel={t('hr-analytics-filter-apply-filters')}
        customGroup={companyCustomGroup}
      />
    ),
    [companyCustomGroup, filterConfiguration, filtersObject, handleFilterChangeFromDisplay, t]
  )

  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value)

    // Update URL to reflect the current tab
    const urlParams = new URLSearchParams(globalThis.location.search)
    urlParams.set('tab', value)

    // Define which tabs have content sections
    const tabsWithContent = ['workforce', 'structural-analysis', 'forecasting']

    // If switching to a tab without content sections, remove the content parameter
    if (!tabsWithContent.includes(value)) {
      urlParams.delete('content')
    }

    const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
    globalThis.history.replaceState({}, '', newUrl)
  }

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveSubTab(newTab)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const renderErrorContent = (viewName: string) => {
    if (error) {
      return (
        <div className="gba:p-6">
          <Alert variant="destructive">
            <AlertTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.analytics_section.error_loading',
                `Error Loading ${viewName}`
              )}
            </AlertTitle>
            <AlertDescription className="gba:flex gba:items-center gba:justify-between gba:gap-4">
              <span>{error}</span>
              <Button
                size="sm"
                variant="default"
                onClick={() => setError(null)}
                data-testid="hr-analytics-retry-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.retry', 'Retry')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }
    return null
  }

  const renderLoadingContent = (viewName: string) => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
          <div className="gba:text-center">
            <Spinner />
            <div className="gba:mt-4 gba:text-muted-foreground gba:text-lg">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.analytics_section.loading',
                `Loading ${viewName}...`
              )}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const renderTabContent = () => {
    const errorContent = renderErrorContent(
      getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.title', 'HR Analytics')
    )
    if (errorContent) return errorContent

    const loadingContent = renderLoadingContent(
      getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.title', 'HR Analytics')
    )
    if (loadingContent) return loadingContent

    switch (activeSubTab) {
      case 'dashboard':
        return (
          <TabsContent value="dashboard" data-testid="analytics-dashboard-content">
            <Dashboard accessToken={context.accessToken} userInfo={context.userInfo} />
          </TabsContent>
        )
      case 'demographics':
        return (
          <TabsContent value="demographics" data-testid="analytics-demographics-content">
            <Demographics {...context} />
          </TabsContent>
        )
      case 'workforce':
        return (
          <TabsContent value="workforce" data-testid="analytics-workforce-content">
            <Workforce {...context} />
          </TabsContent>
        )
      case 'compensation':
        return (
          <TabsContent value="compensation" data-testid="analytics-compensation-content">
            <Compensation {...context} />
          </TabsContent>
        )
      case 'forecasting':
        return (
          <TabsContent value="forecasting" data-testid="analytics-forecasting-content">
            <Forecasting {...context} />
          </TabsContent>
        )
      case 'structural-analysis':
        return (
          <TabsContent value="structural-analysis" data-testid="analytics-structural-analysis-content">
            <StructuralAnalysisReport {...context} />
          </TabsContent>
        )
      case 'office-presence':
        return (
          <TabsContent value="office-presence" data-testid="analytics-office-presence-content">
            <OfficeUsage {...context} companyIds={selectedCompanyIds} />
          </TabsContent>
        )
      default:
        return null
    }
  }

  return (
    <div data-testid="hr-analytics-view" className="gba:h-full">
      <HrAnalyticsFiltersProvider
        selectedCompanyIds={selectedCompanyIds}
        setSelectedCompanyIds={setSelectedCompanyIds}
        companyLabelMap={companyLabelMap}
      >
        <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="gba:h-full">
          <BackofficeDataDisplay
            className="gba:pr-1"
            titleSections={[
              {
                id: 'analytics',
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.analytics_section.title',
                  'HR Analytics'
                )
              }
            ]}
            currentSection="analytics"
            filters={filtersObject}
            filterConfiguration={filterConfiguration}
            onFilterChange={handleFilterChangeFromDisplay}
            customFilterActionLabel={t('hr-analytics-filter-button')}
            hideToolbarGeneratedFilterChips
            customFilterSummary={
              <HrAnalyticsFilterSummary
                selectedCompanies={selectedCompanies}
                filtersLabel={t('hr-analytics-filter-button')}
                companyLabel={t('hr-analytics-filter-company-title')}
                clearAllLabel={t('hr-analytics-filter-clear-all')}
                onRemoveCompany={removeSelectedCompany}
                onClearAll={clearSelectedCompanies}
              />
            }
            renderFilterSheet={renderFilterSheet}
          >
            <div className="gba:min-w-0 gba:flex gba:flex-col gba:pt-3 gba:h-full">
              <TabsList className="gba:mb-4">
                {viewOptions.map(option => (
                  <TabsTrigger
                    key={option.key}
                    value={option.key}
                    data-testid={`analytics-${option.key}-tab`}
                    className="gba:flex gba:flex-row gba:items-center gba:gap-2"
                  >
                    <span className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:whitespace-nowrap">
                      {option.icon}
                      {option.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="gba:flex-1 gba:overflow-auto">{renderTabContent()}</div>
            </div>
          </BackofficeDataDisplay>
        </Tabs>
      </HrAnalyticsFiltersProvider>
    </div>
  )
}

export default HrAnalyticsView
