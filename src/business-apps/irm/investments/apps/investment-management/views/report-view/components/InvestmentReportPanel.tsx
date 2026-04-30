import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { DataDisplay, Spinner, Button } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentReportTable, type InvestmentReportExportHelpers } from './shared/InvestmentReportTable'
import { buildInvestmentReportBaseWhereParts } from './shared/useInvestmentReportData'
import { useReportFilters, type UseReportFiltersReturn } from '../hooks'
import { useInvestmentReportExport } from '../hooks/useInvestmentReportExport'
import { getReportGroupConfiguration } from '../config/reportGroupConfigurations'
import type { SubSection } from '../utils/subSectionHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'
import { useInvestmentLiquidFundReportCatalog } from '../hooks/useInvestmentLiquidFundReportCatalog'
import { convertDynamicColumnsToConfig, createLiquidFundStaticColumns } from '../utils/liquidFundColumnConverter'
import { transformFormFieldsToTableColumns } from '../utils/liquidFundReportColumnTransformer'

/**
 * Helper: Get columns from parent investment types (LEVEL 2 fallback) for Liquid Fund.
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
 * Helper: Get columns from investment group level (LEVEL 3 fallback) for Liquid Fund.
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
 * Props for InvestmentReportPanel.
 *
 * This component renders the toolbar + filtered investment report table for ONE
 * already-resolved sub-section. It does NOT discover sub-sections, sync the URL,
 * or render the section bar — that orchestration lives in the consumer
 * (e.g. {@link GenericReportTab} for the portfolio view).
 *
 * Both the portfolio report view and the investment record's reports tab
 * consume this panel so that catalog-driven filtering, dynamic columns,
 * sorting, search, exports, and the per-group configuration dispatch
 * (`getReportGroupConfiguration`) work identically across both surfaces.
 */
export interface InvestmentReportPanelProps extends BusinessAppContextProps {
  /** Investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'LIQUID_FUND'). */
  investmentGroup: string
  /** Display label for the group (used by the export hook for sheet names). */
  groupLabel: string
  /**
   * The sub-sections this panel knows about. The portfolio view passes the
   * full discovered list; the record view passes a single locked section.
   */
  sections: SubSection[]
  /** Active sub-section code (must match a `code` in `sections`). */
  currentSection: string
  /** Notifies parent of section changes (only used when `showSectionBar` is true). */
  onSectionChange?: (code: string) => void
  /**
   * When true (default), the section bar is rendered in the toolbar via
   * `DataDisplay`'s `titleSections`. Record-level usage sets this to `false`
   * so the locked section is hidden from the UI.
   */
  showSectionBar?: boolean
  /**
   * Shared filter state owned by the consumer (date range, currency, etc.).
   * The portfolio view shares one instance across tabs; the record view
   * creates its own.
   */
  reportFilters: UseReportFiltersReturn
  /**
   * Extra where-clause filters merged into the table query *before*
   * `buildWhere` runs. Use `INVESTMENT_REPORT_DESCRIPTORS` keys (e.g.
   * `{ investmentIds: [investmentId] }`) so they translate cleanly into
   * GraphQL conditions.
   */
  extraWhereFilters?: Record<string, any>
  /**
   * Last search the user had on this section — restored when switching back to it.
   */
  initialSearch?: string
  onSearchChange?: (search: string) => void
  /** Cached sorting for this section — restored from localStorage. */
  initialSorting?: Array<{ id: string; desc: boolean }> | null
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  /** Cached filters for this section — restored from localStorage. */
  initialFilters?: Record<string, any>
  onFiltersChange?: (filters: Record<string, any>) => void
  /** Cached visible column IDs for this section — restored from localStorage. */
  initialVisibleColumns?: string[] | null
  onVisibleColumnsChange?: (columns: string[]) => void
  /** Catalog data shared across tabs / records. */
  catalogData: any
  /** Whether this panel is currently active and should fetch data. */
  enabled?: boolean
  /**
   * Extra element(s) to render after the built-in CSV/Excel export buttons in
   * the primary action slot — e.g. an "Add Report" `AppAction`. The panel always
   * renders the export buttons; this prop appends consumer-specific actions.
   */
  primaryAction?: React.ReactNode
  /** When true (default), render the CSV/Excel export buttons in the toolbar. */
  showExportButtons?: boolean
  /** Callback invoked with discovered currency IDs from fetched reports. */
  onCurrenciesUpdate?: (currencies: string[]) => void
  /** Filename prefix for exports (CSV/Excel). */
  exportFilenamePrefix?: string
  /** Data test id prefix. */
  dataTestId?: string
}

/**
 * Investment Report Panel
 *
 * The unified, group-agnostic rendering surface for filtered investment reports.
 * Driven entirely by `getReportGroupConfiguration(investmentGroup)`, so any
 * group present in the catalog (known or unknown) renders consistently with the
 * appropriate configurable behavior layered on top of the generic fallback.
 */
export const InvestmentReportPanel: React.FC<InvestmentReportPanelProps> = ({
  investmentGroup,
  groupLabel,
  sections,
  currentSection,
  onSectionChange,
  showSectionBar = true,
  initialSearch,
  onSearchChange,
  initialSorting,
  onSortingChange: onSortingChangeProp,
  initialFilters,
  onFiltersChange,
  initialVisibleColumns: cachedVisibleColumns,
  onVisibleColumnsChange: onVisibleColumnsChangeProp,
  reportFilters,
  extraWhereFilters,
  catalogData,
  enabled = true,
  primaryAction,
  showExportButtons = true,
  onCurrenciesUpdate,
  exportFilenamePrefix,
  accessToken,
  userInfo,
  dataTestId = 'investment-report-panel'
}) => {
  const config = getReportGroupConfiguration(investmentGroup)

  // Search state (toolbar text search)
  const [search, setSearch] = useState<string>(initialSearch ?? '')

  // Filter state (for catalog-based filters)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters ?? {})

  // Sorting state
  const [sortField, setSortField] = useState(() => initialSorting?.[0]?.id ?? '')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(() =>
    initialSorting?.[0]?.desc === false ? 'ASC' : 'DESC'
  )

  // Synchronously reset per-section UI state when the active section changes
  // (React "adjusting state during render" pattern) so no stale query fires.
  const [prevSection, setPrevSection] = useState(currentSection)
  if (currentSection !== prevSection) {
    setPrevSection(currentSection)
    setSearch(initialSearch ?? '')
    setSelectedFilters(initialFilters ?? {})
    setSortField(initialSorting?.[0]?.id ?? '')
    setSortOrder(initialSorting?.[0]?.desc === false ? 'ASC' : 'DESC')
  }

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      onSearchChange?.(value)
    },
    [onSearchChange]
  )

  const hasFilterSheet = !!config.filterGenerator

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
    enabled: hasFilterSheet && !!currentSection,
    baseWhereParts: filterBaseWhereParts
  })

  // Liquid fund catalog (only used by LIQUID_FUND group for dynamic column generation)
  const { getDynamicColumnsForType, catalogData: liquidFundCatalogData } = useInvestmentLiquidFundReportCatalog({
    accessToken,
    userInfo,
    catalogData
  })

  // Generate visibility column list for the active section.
  // Section `code` IS the catalog code (Liquid Fund types and InvestmentTypes
  // alike), so generators can consume `currentSection` directly — no
  // id↔code mapping needed.
  const initialColumns = useMemo(() => {
    // LIQUID_FUND: derive visibility columns from dynamic catalog columns
    if (investmentGroup === 'LIQUID_FUND' && liquidFundCatalogData && currentSection) {
      const dynamicCols = getDynamicColumnsForType(currentSection)

      if (dynamicCols.length > 0) {
        return [
          { id: 'investment', label: 'Investment', visible: true, disabled: true },
          { id: 'date', label: 'Date', visible: true },
          ...dynamicCols.map(col => ({
            id: col.id,
            label: col.label,
            visible: true
          }))
        ]
      }
    }

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

  // Apply cached column visibility so localStorage-saved preferences are
  // honoured on the first render for each section.
  const initialColumnsWithCache = useMemo(() => {
    if (!cachedVisibleColumns) return initialColumns
    return initialColumns.map(col => ({
      ...col,
      visible: col.disabled ? true : cachedVisibleColumns.includes(col.id)
    }))
  }, [initialColumns, cachedVisibleColumns])

  // Local report filters: only used here for column visibility management.
  // Date range / currency / column visibility shared state lives on `reportFilters`,
  // but visible-column tracking is a panel-local concern (one column set per section).
  const localReportFilters = useReportFilters(initialColumnsWithCache)

  // Generate filter configuration. A group without a `filterGenerator` opts
  // out of the filter sheet entirely (its presence is the implicit gate).
  const filterConfiguration = useMemo(() => {
    if (!config.filterGenerator) {
      return { id: 'empty-filters', name: 'Filters', groups: [] }
    }
    return config.filterGenerator(catalogData, currentSection, filterGroups)
  }, [config, catalogData, currentSection, filterGroups])

  // Build the filter object handed to InvestmentReportTable / useInvestmentReportData.
  // `currentSection` is the catalog code in every group (Equity, Real Estate,
  // Liquid Fund, …), so it can be passed straight through.
  const reportFiltersForTable = useMemo(() => {
    return {
      dateFrom: reportFilters.computedFilters.startDate,
      dateTo: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: currentSection || '',
      search: search || undefined,
      ...(hasFilterSheet ? selectedFilters : {}),
      ...(extraWhereFilters || {})
    }
  }, [reportFilters, currentSection, search, selectedFilters, hasFilterSheet, extraWhereFilters])

  // Sorting handlers
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (newSorting.length === 0) {
        setSortField('')
        setSortOrder('DESC')
      } else {
        setSortField(newSorting[0].id)
        setSortOrder(newSorting[0].desc ? 'DESC' : 'ASC')
      }
      onSortingChangeProp?.(newSorting)
    },
    [onSortingChangeProp]
  )

  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  // `useReportFilters` returns a fresh object literal every render. Destructure
  // the underlying `useState` / `useCallback` references once so downstream
  // memos and callbacks have stable dependencies.
  const { columnConfig, visibleColumns, handleColumnVisibilityChange } = localReportFilters

  // Column visibility wiring for DataDisplay's column controller
  const availableColumns = useMemo(
    () =>
      columnConfig
        .filter(col => col.id !== 'investment') // Investment column is locked-on
        .map(col => ({ id: col.id, label: col.label })),
    [columnConfig]
  )

  const handleVisibleColumnsChange = useCallback(
    (newVisibleColumns: string[]) => {
      columnConfig.forEach(col => {
        const visible = newVisibleColumns.includes(col.id)
        if (col.visible !== visible && !col.disabled) {
          handleColumnVisibilityChange(col.id, visible)
        }
      })
      onVisibleColumnsChangeProp?.(newVisibleColumns)
    },
    [columnConfig, handleColumnVisibilityChange, onVisibleColumnsChangeProp]
  )

  // Liquid Fund: raw dynamic columns (used by both the table and the export hook).
  // `currentSection` is the catalog code, so no id↔code mapping is needed.
  const rawDynamicColumns = useMemo(() => {
    if (investmentGroup !== 'LIQUID_FUND') return undefined
    if (!currentSection || !liquidFundCatalogData) return undefined

    // LEVEL 1: most-specific lookup (investmentLiquidFundTypes)
    let dynamicCols = getDynamicColumnsForType(currentSection)

    // LEVEL 2: parent investmentTypes
    if (dynamicCols.length === 0) {
      dynamicCols = getParentTypeColumns(currentSection, liquidFundCatalogData)
    }

    // LEVEL 3: investment group level (LIQUID_FUND)
    if (dynamicCols.length === 0) {
      dynamicCols = getGroupLevelColumns(liquidFundCatalogData)
    }

    return dynamicCols.length > 0 ? dynamicCols : undefined
  }, [investmentGroup, currentSection, getDynamicColumnsForType, liquidFundCatalogData])

  // Liquid Fund: assemble columnsOverride for the table
  const columnsOverride = useMemo(() => {
    if (!rawDynamicColumns) return undefined

    const convertedDynamicCols = convertDynamicColumnsToConfig(rawDynamicColumns)
    const staticCols = createLiquidFundStaticColumns()
    return [...staticCols, ...convertedDynamicCols]
  }, [rawDynamicColumns])

  // Export helpers — registered by the active table and consumed by the export hook
  const [exportHelpers, setExportHelpers] = useState<InvestmentReportExportHelpers | null>(null)

  // Reset export helpers whenever the active section or scope (extra filters) changes
  // so the table can register fresh helpers for the new dataset.
  useEffect(() => {
    setExportHelpers(null)
  }, [currentSection, extraWhereFilters])

  const exportPrefix = useMemo(() => {
    if (exportFilenamePrefix) return exportFilenamePrefix
    const sectionLabel = sections.find(s => s.code === currentSection)?.label || currentSection
    const slug = sectionLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return `investment-reports-${investmentGroup.toLowerCase()}-${slug}`
  }, [exportFilenamePrefix, sections, currentSection, investmentGroup])

  const { isExporting, handleExportCsv, handleExportExcel } = useInvestmentReportExport({
    exportHelpers,
    groupLabel,
    filenamePrefix: exportPrefix,
    dynamicColumns: rawDynamicColumns
  })

  // Filter change handler
  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      setSelectedFilters(newFilters)
      onFiltersChange?.(newFilters)
    },
    [onFiltersChange]
  )

  // Compose the toolbar's primary action slot: built-in export buttons first,
  // then any consumer-supplied actions (e.g. "Add Report").
  const composedPrimaryAction = useMemo(() => {
    if (!showExportButtons && !primaryAction) return undefined
    return (
      <>
        {showExportButtons && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || !exportHelpers || exportHelpers.totalCount === 0}
              title={isExporting ? 'Exporting…' : 'Export as CSV'}
              data-testid={`${dataTestId}-export-csv-button`}
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
              data-testid={`${dataTestId}-export-excel-button`}
            >
              <FileXlsIcon size={16} />
              Excel
            </Button>
          </>
        )}
        {primaryAction}
      </>
    )
  }, [showExportButtons, primaryAction, handleExportCsv, handleExportExcel, isExporting, exportHelpers, dataTestId])

  // Don't render until column visibility is initialized
  if (!localReportFilters.filtersInitialized) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 'var(--nw-spacing-64)' }}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  // Resolved title sections for DataDisplay (omitted entirely when section bar is hidden)
  const titleSections = showSectionBar
    ? sections.map(section => ({
        id: section.code,
        label: section.label
      }))
    : undefined

  const activeSection = sections.find(s => s.code === currentSection)

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        key={currentSection}
        titleSections={titleSections}
        currentSection={showSectionBar ? currentSection : undefined}
        onSectionChange={showSectionBar ? onSectionChange : undefined}
        searchValue={search}
        searchPlaceholder="Search investments..."
        onSearchChange={handleSearchChange}
        filters={hasFilterSheet ? selectedFilters : undefined}
        filterConfiguration={hasFilterSheet ? filterConfiguration : undefined}
        onFilterChange={hasFilterSheet ? handleFilterChange : undefined}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        sorting={sorting}
        sortableColumns={config.sortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={composedPrimaryAction}
        toolbarDensity="default"
      >
        <InvestmentReportTable
          config={config.tableConfig}
          accessToken={accessToken}
          userInfo={userInfo}
          filters={reportFiltersForTable}
          investmentType={currentSection}
          investmentTypeValue={activeSection?.label || ''}
          catalogData={catalogData}
          visibleColumns={visibleColumns}
          onCurrenciesChange={onCurrenciesUpdate}
          onExportReady={setExportHelpers}
          enabled={enabled}
          dataTransformer={config.dataTransformer}
          columnsOverride={columnsOverride}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortingChange={handleSortingChange}
          data-testid={`${dataTestId}-table`}
        />
      </DataDisplay>
    </div>
  )
}

export default InvestmentReportPanel
