import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { DataDisplay, Spinner, AiButton } from '@newwork/nw-design-system'
import { Upload } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { RealEstateAnalyticsTable } from './components/RealEstateAnalyticsTable'
import { useRealEstateInvestmentTypes } from './hooks/useRealEstateInvestmentTypes'
import type { RealEstateReportFilters } from './types'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { UseReportFiltersReturn, ColumnConfig, useReportFilters } from '../../hooks'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface RealEstateReportProps extends BusinessAppContextProps {
  'data-testid'?: string
  reportFilters: UseReportFiltersReturn
  onCurrenciesUpdate: (currencies: string[]) => void
  isTransposed: boolean
}

export const RealEstateReport: React.FC<RealEstateReportProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics',
  reportFilters,
  onCurrenciesUpdate,
  isTransposed
}) => {
  // Fetch dynamic real estate investment types from catalog
  const {
    investmentTypes,
    loading: typesLoading,
    error: typesError,
    catalogData
  } = useRealEstateInvestmentTypes(accessToken)

  // Use catalog types if available, otherwise use empty array (only Overview tab)
  const effectiveInvestmentTypes = typesError || investmentTypes.length === 0 ? [] : investmentTypes

  // Section management - start with first investment type
  const [currentSection, setCurrentSection] = useState<string>('')

  // Search state
  const [search, setSearch] = useState<string>('')

  // Track total counts for each section
  const [totalCounts, setTotalCounts] = useState<Record<string, { count: number; isLoading: boolean }>>({})

  // Track initial load status for each section
  const [initialLoadDone, setInitialLoadDone] = useState<Record<string, boolean>>({})

  // Get initial investment type from URL parameter
  const getInitialInvestmentType = useCallback(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const investmentTypeFromUrl = urlParams.get('investmentType')

    if (effectiveInvestmentTypes.length === 0) {
      return ''
    }

    // Validate against available investment types
    if (investmentTypeFromUrl && effectiveInvestmentTypes.some(type => type.code === investmentTypeFromUrl)) {
      return investmentTypeFromUrl
    }

    // Fall back to first available investment type
    return effectiveInvestmentTypes[0].code
  }, [effectiveInvestmentTypes])

  // Update URL when activeSubTab changes using platform navigation utilities
  const updateUrl = useCallback((investmentType: string) => {
    try {
      const currentUrl = new URL(globalThis.location.href)
      const params: Record<string, string> = {}

      // Preserve existing query parameters
      currentUrl.searchParams.forEach((value, key) => {
        params[key] = value
      })

      // Update investmentType parameter
      params.investmentType = investmentType

      // Use platform URL builder for safe navigation
      const newUrl = buildPlatformUrl(currentUrl.pathname, params)

      // Use safe history manipulation
      if (globalThis.history?.replaceState) {
        globalThis.history.replaceState({}, '', newUrl)
      }
    } catch (error) {
      console.warn('Failed to update URL:', error)
      // Fallback: just update the state without URL manipulation
    }
  }, [])

  // Unified handler for currentSection changes
  const handleSectionChange = useCallback(
    (code: string) => {
      setCurrentSection(code)
      updateUrl(code)
    },
    [updateUrl]
  )

  // Initialize section from URL when investment types are loaded
  useEffect(() => {
    if (!currentSection) {
      // Wait for loading to complete before making decisions
      if (typesLoading) {
        return
      }

      if (effectiveInvestmentTypes.length === 0) {
        setCurrentSection('overview')
        updateUrl('overview')
        return
      }
      const initialType = getInitialInvestmentType()
      if (initialType) {
        setCurrentSection(initialType)
        updateUrl(initialType)
      }
    }
  }, [effectiveInvestmentTypes, currentSection, getInitialInvestmentType, updateUrl, typesLoading])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentType = getInitialInvestmentType()
      if (currentType) {
        setCurrentSection(currentType)
        // Do not call updateUrl when handling popstate to avoid creating additional history entries
      }
    }

    globalThis.addEventListener('popstate', handlePopState)

    return () => {
      globalThis.removeEventListener('popstate', handlePopState)
    }
  }, [getInitialInvestmentType])

  // Define initial columns dynamically based on the ACTIVE TAB's investment type
  const initialColumns: ColumnConfig[] = useMemo(() => {
    const columns: ColumnConfig[] = [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true }
    ]

    // If catalog is loaded and we have an active section, get columns for that investment type
    if (catalogData?.investmentTypes && currentSection && currentSection !== 'overview') {
      // Find the active investment type in the catalog
      const activeInvestmentType = catalogData.investmentTypes.find((type: any) => type.code === currentSection)

      if (activeInvestmentType?.objectValue?.formFields) {
        activeInvestmentType.objectValue.formFields.forEach((group: any) => {
          group.fields.forEach((field: any) => {
            // Use the same ID generation as the table transformer (property with dots -> underscores)
            const columnId = field.property.replaceAll('.', '_')
            columns.push({
              id: columnId,
              label: field.label,
              visible: true // All visible by default
            })
          })
        })
      }
    } else {
      // Fallback to common columns if catalog not loaded yet or on overview tab
      columns.push(
        { id: 'name', label: 'Name', visible: true },
        { id: 'proprietor', label: 'Proprietor', visible: true },
        { id: 'location', label: 'Location', visible: true },
        { id: 'size', label: 'Size', visible: true },
        { id: 'buildingYear', label: 'Building Year', visible: true },
        { id: 'annualNetColdRent', label: 'Annual Net Cold Rent', visible: true },
        { id: 'occupancyPercent', label: 'Occupancy %', visible: true },
        { id: 'funding', label: 'Funding', visible: true }
      )
    }

    return columns
  }, [catalogData, currentSection])

  // Column config is managed separately per report component
  const localReportFilters = useReportFilters(initialColumns)

  // Callback for tables to report their total counts
  const handleTotalCountUpdate = useCallback((sectionId: string, count: number, isLoading: boolean) => {
    setTotalCounts(prev => ({
      ...prev,
      [sectionId]: { count, isLoading }
    }))
    // Mark section as loaded when loading completes
    if (!isLoading) {
      setInitialLoadDone(prev => {
        // Only update if not already done
        if (prev[sectionId]) {
          return prev
        }
        return {
          ...prev,
          [sectionId]: true
        }
      })
    }
  }, []) // Remove initialLoadDone from dependencies to prevent infinite loops

  // Find the selected investment type from catalog
  const selectedInvestmentType = useMemo(() => {
    return effectiveInvestmentTypes.find(type => type.code === currentSection)
  }, [currentSection, effectiveInvestmentTypes])

  // Create filters for real estate analytics (with investment type filtering)
  const realEstateAnalyticsFilters = useMemo((): RealEstateReportFilters => {
    return {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: selectedInvestmentType?.code || undefined,
      search: search || undefined
    }
  }, [
    reportFilters.computedFilters.startDate,
    reportFilters.computedFilters.endDate,
    reportFilters.computedFilters.currencyIds,
    selectedInvestmentType,
    search
  ])

  // Convert columnConfig to availableColumns/visibleColumns for DataDisplay
  const availableColumns = useMemo(
    () =>
      localReportFilters.columnConfig
        .filter(col => col.id !== 'investment') // Remove Investment column from visibility controller
        .map(col => ({ id: col.id, label: col.label })),
    [localReportFilters.columnConfig]
  )

  const visibleColumns = useMemo(() => localReportFilters.visibleColumns, [localReportFilters.visibleColumns])

  const handleVisibleColumnsChange = useCallback(
    (newVisibleColumns: string[]) => {
      localReportFilters.columnConfig.forEach(col => {
        const visible = newVisibleColumns.includes(col.id)
        if (col.visible !== visible && !col.disabled) {
          localReportFilters.handleColumnVisibilityChange(col.id, visible)
        }
      })
    },
    [localReportFilters]
  )

  // Primary action for "Add Report" - memoized to prevent reload on tab change
  const primaryActions = useMemo(() => {
    return (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.investmentReportCreate,
            contextData: { investmentId: '' }
          }
        ]}
        accessToken={accessToken || ''}
        data-testid="report-view-add-report-action"
      >
        {getTranslationFromI18nKeyAndLabel('investment.reports.addReport', 'Add Report')}
      </AppAction>
    )
  }, [accessToken])

  // Secondary action for "Upload Report" - using AiButton like in record
  const secondaryActions = useMemo(() => {
    return (
      <AppAction
        contextsArray={[FlowContextName.investmentReportUpload]}
        externalContextData={{}}
        accessToken={accessToken || ''}
        emptyStateBehavior="hide"
        prefixDataTestId="report-view-upload-report"
      >
        <AiButton
          variant="default"
          size="default"
          showIcon={true}
          icon={<Upload style={{ height: '1rem', width: '1rem' }} />}
          iconPosition="before"
          data-testid="report-view-upload-report-button"
        >
          {getTranslationFromI18nKeyAndLabel('investment.reports.uploadReport', 'Upload Report')}
        </AiButton>
      </AppAction>
    )
  }, [accessToken])

  // Don't render filter-dependent content until filters are initialized
  if (!localReportFilters.filtersInitialized) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  // Prepare sections for DataDisplay
  const typesForSections =
    effectiveInvestmentTypes.length > 0
      ? effectiveInvestmentTypes
      : [{ code: 'overview', value: getTranslationFromI18nKeyAndLabel('common.overview', 'Overview') }]

  return (
    <div data-testid={dataTestId}>
      {/* Real Estate Analytics Tables with Dynamic DataDisplay titleSections */}
      <DataDisplay
        titleSections={typesForSections.map(type => ({
          id: type.code,
          label: type.value,
          metadata: {
            count: totalCounts[type.code]?.count || 0,
            isLoading: totalCounts[type.code]?.isLoading || false
          }
        }))}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        searchValue={search}
        searchPlaceholder="Search investments..."
        onSearchChange={setSearch}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        primaryAction={primaryActions}
        secondaryActions={secondaryActions}
        toolbarDensity="default"
      >
        {typesForSections.map(type => (
          <div key={type.code} style={{ display: currentSection === type.code ? 'block' : 'none' }}>
            <RealEstateAnalyticsTable
              accessToken={accessToken}
              userInfo={userInfo}
              filters={realEstateAnalyticsFilters}
              investmentType={type.code === 'overview' ? '' : type.code}
              investmentTypeValue={type.value}
              catalogData={catalogData}
              isTransposed={isTransposed}
              visibleColumns={visibleColumns}
              onCurrenciesChange={onCurrenciesUpdate}
              onTotalCountChange={(count, isLoading) => handleTotalCountUpdate(type.code, count, isLoading)}
              isInitialLoad={!initialLoadDone[type.code]}
              data-testid={`${dataTestId}-${type.code.toLowerCase()}-table`}
            />
          </div>
        ))}
      </DataDisplay>
    </div>
  )
}

export default RealEstateReport
