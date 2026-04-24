import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { DataDisplay, Spinner, Button } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentReportTable, type InvestmentReportExportHelpers } from './shared/InvestmentReportTable'
import { buildInvestmentReportBaseWhereParts } from './shared/useInvestmentReportData'
import { UseReportFiltersReturn, useReportFilters } from '../hooks'
import { useInvestmentReportExport } from '../hooks/useInvestmentReportExport'
import { getReportGroupConfiguration } from '../config/reportGroupConfigurations'
import { getSubSectionsForStrategy, type SubSection } from '../utils/subSectionHelpers'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentLiquidFundReportCatalog } from '../tabs/liquid-fund-report-tab/hooks/useInvestmentLiquidFundReportCatalog'
import { convertDynamicColumnsToConfig, createLiquidFundStaticColumns } from '../utils/liquidFundColumnConverter'
import { transformFormFieldsToTableColumns } from '../tabs/liquid-fund-report-tab/utils/liquidFundReportColumnTransformer'

/**
 * Helper: Get columns from parent investment types (LEVEL 2 fallback)
 */
const getParentTypeColumns = (liquidFundTypeCode: string, liquidFundCatalogData: any): any[] => {
  const liquidFundEntry = liquidFundCatalogData.investmentLiquidFundTypes?.find(
    (e: any) => e.code === liquidFundTypeCode
  )

  if (liquidFundEntry?.parentEntryId) {
    const parentType = liquidFundCatalogData.investmentTypes?.find((e: any) => e.id === liquidFundEntry.parentEntryId)

    if (parentType?.objectValue) {
      const parsed =
        typeof parentType.objectValue === 'string' ? JSON.parse(parentType.objectValue) : parentType.objectValue
      return transformFormFieldsToTableColumns(parsed)
    }
  }

  return []
}

/**
 * Helper: Get columns from investment group level (LEVEL 3 fallback)
 */
const getGroupLevelColumns = (liquidFundCatalogData: any): any[] => {
  const groupEntry = liquidFundCatalogData.investmentGroups?.find((e: any) => e.code === 'LIQUID_FUND')

  if (groupEntry?.objectValue) {
    const parsed =
      typeof groupEntry.objectValue === 'string' ? JSON.parse(groupEntry.objectValue) : groupEntry.objectValue
    return transformFormFieldsToTableColumns(parsed)
  }

  return []
}

/**
 * Props for GenericReportTab component
 */
interface GenericReportTabProps extends BusinessAppContextProps {
  /** Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'LIQUID_FUND') */
  investmentGroup: string
  /** Display label for the group */
  groupLabel: string
  /** Shared filters from parent ReportView */
  reportFilters: UseReportFiltersReturn
  /** Callback when currencies are discovered */
  onCurrenciesUpdate: (currencies: string[]) => void
  /** Catalog data (shared across all tabs) */
  catalogData: any
  /** Whether this tab is currently active */
  enabled: boolean
  /** Data test ID prefix */
  dataTestId?: string
}

/**
 * Generic Report Tab Component
 *
 * This component works for ANY investment group by using configuration-driven behavior.
 * It replaces the specialized EquityReport, RealEstateReport, and LiquidFundReport components
 * with a single, reusable component that adapts based on configuration.
 *
 * Features:
 * - Dynamic sub-sections from catalog or hardcoded (based on strategy)
 * - Dynamic columns from catalog
 * - Dynamic filters from catalog (optional)
 * - Supports data transformation (for Liquid Fund)
 * - Works for unknown groups with sensible defaults
 *
 * Pattern: Mirrors GenericInvestmentsList architecture from Investment View
 */
export const GenericReportTab: React.FC<GenericReportTabProps> = ({
  investmentGroup,
  groupLabel,
  reportFilters,
  onCurrenciesUpdate,
  catalogData,
  enabled,
  accessToken,
  userInfo,
  dataTestId = 'generic-report-tab'
}) => {
  // Get configuration for this investment group
  const config = getReportGroupConfiguration(investmentGroup)

  // Sub-section management
  const [currentSection, setCurrentSection] = useState<string>('')
  const [subSections, setSubSections] = useState<SubSection[]>([])
  const [subSectionsLoading, setSubSectionsLoading] = useState(true)

  // Search state
  const [search, setSearch] = useState<string>('')

  // Filter state (for catalog-based filters)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Sorting state
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  // Scope filter dropdown options to the active (group, sub-section) so that
  // selecting an investment can never produce zero rows due to cross-group/type
  // mismatch.
  const filterBaseWhereParts = useMemo(
    () => buildInvestmentReportBaseWhereParts(investmentGroup, currentSection),
    [investmentGroup, currentSection]
  )

  // Fetch filter groups once a sub-section is known. Skipping the first render
  // (when `currentSection` is still '') avoids a redundant query that would be
  // immediately superseded by the section-scoped fetch.
  const filterGroups = useFilterGroups({ accessToken, userInfo }, 'InvestmentReport', INVESTMENT_REPORT_DESCRIPTORS, {
    limit: 100,
    enabled: !!currentSection,
    baseWhereParts: filterBaseWhereParts
  })

  // Fetch liquid fund catalog for dynamic column generation (only for LIQUID_FUND group)
  const { getDynamicColumnsForType, catalogData: liquidFundCatalogData } = useInvestmentLiquidFundReportCatalog({
    accessToken,
    userInfo,
    catalogData
  })

  // Fetch sub-sections based on strategy
  useEffect(() => {
    const loadSubSections = async () => {
      if (!accessToken) {
        setSubSectionsLoading(false)
        return
      }

      setSubSectionsLoading(true)
      try {
        let sections = await getSubSectionsForStrategy(config.subSectionStrategy, investmentGroup, accessToken)

        // Auto-fallback: If no sections found and strategy was 'investmentTypes', try 'none' strategy
        // This handles groups without investment types (fields defined at group level only)
        if (sections.length === 0 && config.subSectionStrategy === 'investmentTypes') {
          sections = await getSubSectionsForStrategy('none', investmentGroup, accessToken)
        }

        setSubSections(sections)

        // Initialize current section from URL or use first section
        if (sections.length > 0 && !currentSection) {
          const urlParams = new URLSearchParams(globalThis.location.search)
          const investmentTypeFromUrl = urlParams.get('investmentType')

          if (investmentTypeFromUrl && sections.some(s => s.code === investmentTypeFromUrl)) {
            setCurrentSection(investmentTypeFromUrl)
          } else {
            setCurrentSection(sections[0].code)
          }
        }
      } catch (error) {
        console.error(`Error loading sub-sections for ${investmentGroup}:`, error)
        setSubSections([])
      } finally {
        setSubSectionsLoading(false)
      }
    }

    loadSubSections()
  }, [config.subSectionStrategy, investmentGroup, accessToken])

  // Generate columns for current section
  const initialColumns = useMemo(() => {
    // Special handling for LIQUID_FUND: Generate visibility columns from dynamic catalog columns
    if (investmentGroup === 'LIQUID_FUND' && liquidFundCatalogData) {
      const liquidFundTypeCode = currentSection

      if (liquidFundTypeCode) {
        const dynamicCols = getDynamicColumnsForType(liquidFundTypeCode)

        // Convert dynamic columns to visibility format with matching IDs
        const visibilityColumns = [
          { id: 'investment', label: 'Investment', visible: true, disabled: true },
          { id: 'date', label: 'Date', visible: true },
          ...dynamicCols.map(col => ({
            id: col.id, // ✅ This matches the column.key in columnsOverride
            label: col.label,
            visible: true
          }))
        ]

        return visibilityColumns
      }
    }

    // For other groups, use configured column generator
    if (config.columnGenerator) {
      return config.columnGenerator(catalogData, currentSection)
    }

    // Fallback columns if no generator provided
    return [
      { id: 'investment', label: 'Investment', visible: true, disabled: true },
      { id: 'date', label: 'Date', visible: true },
      { id: 'name', label: 'Name', visible: true },
      { id: 'totalInvestmentAmount', label: 'Total Investment', visible: true }
    ]
  }, [investmentGroup, config, catalogData, currentSection, liquidFundCatalogData, getDynamicColumnsForType])

  // Local report filters for column visibility management
  const localReportFilters = useReportFilters(initialColumns)

  // Generate filter configuration. A group without a `filterGenerator` opts out
  // of the filter sheet entirely.
  const filterConfiguration = useMemo(() => {
    if (!config.filterGenerator) {
      return { id: 'empty-filters', name: 'Filters', groups: [] }
    }
    return config.filterGenerator(catalogData, currentSection, filterGroups)
  }, [config, catalogData, currentSection, filterGroups])

  // Get investment type for current section.
  // Section `code` IS the catalog code for both InvestmentType-based groups
  // (Equity, Real Estate, …) and InvestmentLiquidFundType-based groups
  // (Liquid Fund), so the data layer can use it as-is.
  const getCurrentInvestmentType = useCallback((): string => {
    return currentSection || ''
  }, [currentSection])

  // Build filters for InvestmentReportTable
  const hasFilterSheet = !!config.filterGenerator
  const reportFiltersForTable = useMemo(() => {
    const investmentTypeForTable = getCurrentInvestmentType()

    return {
      startDate: reportFilters.computedFilters.startDate,
      endDate: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: investmentTypeForTable,
      search: search || undefined,
      ...(hasFilterSheet ? selectedFilters : {})
    }
  }, [reportFilters, getCurrentInvestmentType, search, selectedFilters, hasFilterSheet])

  // URL management
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
    }
  }, [])

  // Unified handler for section changes.
  // Per-section state (selected filters, search, sort) is reset on actual
  // section changes so values from one sub-section never leak into another
  // (e.g. an investment that exists in FIXED_TERM_DEPOSIT but not in BONDS,
  // or a Liquid Fund-specific column sort that has no analogue elsewhere).
  const handleSectionChange = useCallback(
    (code: string) => {
      setCurrentSection(prev => {
        if (prev !== code) {
          setSelectedFilters({})
          setSearch('')
          setSortField('')
          setSortOrder('DESC')
        }
        return code
      })
      updateUrl(code)
    },
    [updateUrl]
  )

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      const investmentTypeFromUrl = urlParams.get('investmentType')
      if (investmentTypeFromUrl && subSections.some(s => s.code === investmentTypeFromUrl)) {
        setCurrentSection(prev => {
          if (prev !== investmentTypeFromUrl) {
            setSelectedFilters({})
            setSearch('')
            setSortField('')
            setSortOrder('DESC')
          }
          return investmentTypeFromUrl
        })
      }
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [subSections])

  // Sorting handlers
  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    if (newSorting.length === 0) {
      setSortField('')
      setSortOrder('DESC')
    } else {
      setSortField(newSorting[0].id)
      setSortOrder(newSorting[0].desc ? 'DESC' : 'ASC')
    }
  }, [])

  // Convert sorting to DataTable format
  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  // `useReportFilters` returns a fresh object literal every render. Destructure
  // the underlying `useState` / `useCallback` references once so downstream
  // memos and callbacks have stable dependencies.
  const { columnConfig, visibleColumns: visibleColumnsState, handleColumnVisibilityChange } = localReportFilters

  // Column visibility handlers
  const availableColumns = useMemo(
    () =>
      columnConfig
        .filter(col => col.id !== 'investment') // Remove Investment column from visibility controller
        .map(col => ({ id: col.id, label: col.label })),
    [columnConfig]
  )

  const visibleColumns = visibleColumnsState

  const handleVisibleColumnsChange = useCallback(
    (newVisibleColumns: string[]) => {
      columnConfig.forEach(col => {
        const visible = newVisibleColumns.includes(col.id)
        if (col.visible !== visible && !col.disabled) {
          handleColumnVisibilityChange(col.id, visible)
        }
      })
    },
    [columnConfig, handleColumnVisibilityChange]
  )

  // Raw DynamicTableColumn[] for the current liquid fund section — used by both the table and the export hook
  const rawDynamicColumns = useMemo(() => {
    if (investmentGroup !== 'LIQUID_FUND') return undefined

    const liquidFundTypeCode = currentSection
    if (!liquidFundTypeCode || !liquidFundCatalogData) return undefined

    // LEVEL 1: Try investmentLiquidFundTypes (most specific)
    let dynamicCols = getDynamicColumnsForType(liquidFundTypeCode)

    // LEVEL 2: If not found, try parent investmentTypes
    if (dynamicCols.length === 0) {
      dynamicCols = getParentTypeColumns(liquidFundTypeCode, liquidFundCatalogData)
    }

    // LEVEL 3: If still not found, try investmentGroups (LIQUID_FUND group level)
    if (dynamicCols.length === 0) {
      dynamicCols = getGroupLevelColumns(liquidFundCatalogData)
    }

    return dynamicCols.length > 0 ? dynamicCols : undefined
  }, [investmentGroup, currentSection, getDynamicColumnsForType, liquidFundCatalogData])

  // Generate columnsOverride for Liquid Fund (catalog hierarchy fallback)
  const columnsOverride = useMemo(() => {
    if (!rawDynamicColumns) return undefined

    // Convert dynamic columns to render format
    const convertedDynamicCols = convertDynamicColumnsToConfig(rawDynamicColumns)

    // Combine static columns (Investment, Date) with dynamic columns
    const staticCols = createLiquidFundStaticColumns()
    return [...staticCols, ...convertedDynamicCols]
  }, [rawDynamicColumns])

  // Export helpers — supplied by the active InvestmentReportTable via onExportReady
  const [exportHelpers, setExportHelpers] = useState<InvestmentReportExportHelpers | null>(null)

  // Reset export helpers whenever the active sub-section changes so the newly
  // active table can register its own helpers (columns + fetchAll) fresh.
  useEffect(() => {
    setExportHelpers(null)
  }, [currentSection])

  const currentSectionSlug = useMemo(() => {
    const label = subSections.find(s => s.code === currentSection)?.label || currentSection
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }, [subSections, currentSection])

  const { isExporting, handleExportCsv, handleExportExcel } = useInvestmentReportExport({
    exportHelpers,
    groupLabel,
    filenamePrefix: `investment-reports-${investmentGroup.toLowerCase()}-${currentSectionSlug}`,
    dynamicColumns: rawDynamicColumns
  })

  // Filter change handler
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setSelectedFilters(newFilters)
  }, [])

  // Primary action slot: export buttons + "Add Report"
  const primaryAction = useMemo(
    () => (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isExporting || !exportHelpers || exportHelpers.totalCount === 0}
          title={isExporting ? 'Exporting…' : 'Export as CSV'}
          data-testid="report-export-csv-button"
        >
          <DownloadIcon size={16} />
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting || !exportHelpers || exportHelpers.totalCount === 0}
          title={isExporting ? 'Exporting…' : 'Export as Excel'}
          data-testid="report-export-excel-button"
        >
          <FileXlsIcon size={16} />
          Excel
        </Button>
        <AppAction
          variant="create-primary"
          contexts={[
            {
              context: FlowContextName.investmentReportCreate,
              contextData: {}
            }
          ]}
          accessToken={accessToken || ''}
          data-testid="report-view-add-report-action"
        >
          {getTranslationFromI18nKeyAndLabel('investment.reports.addReport', 'Add Report')}
        </AppAction>
      </>
    ),
    [accessToken, handleExportCsv, handleExportExcel, isExporting, exportHelpers]
  )

  // Don't render until filters are initialized
  if (!localReportFilters.filtersInitialized || subSectionsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  // Show message if no sub-sections found
  if (subSections.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <div className="gba:text-center gba:text-muted-foreground">No report categories found for {groupLabel}</div>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        titleSections={subSections.map(section => ({
          id: section.code,
          label: section.label
        }))}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        searchValue={search}
        searchPlaceholder="Search investments..."
        onSearchChange={setSearch}
        filters={hasFilterSheet ? selectedFilters : undefined}
        filterConfiguration={hasFilterSheet ? filterConfiguration : undefined}
        onFilterChange={hasFilterSheet ? handleFilterChange : undefined}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        sorting={sorting}
        sortableColumns={config.sortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryAction}
        toolbarDensity="default"
      >
        {/* Render all sub-sections to load data in parallel, but only show active one */}
        {subSections.map(section => (
          <div key={section.code} style={{ display: currentSection === section.code ? 'block' : 'none' }}>
            <InvestmentReportTable
              config={config.tableConfig}
              accessToken={accessToken}
              userInfo={userInfo}
              filters={reportFiltersForTable}
              investmentType={section.code}
              investmentTypeValue={section.label}
              catalogData={catalogData}
              visibleColumns={visibleColumns}
              onCurrenciesChange={onCurrenciesUpdate}
              onExportReady={currentSection === section.code ? setExportHelpers : undefined}
              enabled={enabled && currentSection === section.code}
              dataTransformer={config.dataTransformer}
              columnsOverride={columnsOverride}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortingChange={handleSortingChange}
              data-testid={`${dataTestId}-${section.id}-table`}
            />
          </div>
        ))}
      </DataDisplay>
    </div>
  )
}

export default GenericReportTab
