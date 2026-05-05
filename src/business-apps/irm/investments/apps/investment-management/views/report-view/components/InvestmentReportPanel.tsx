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
import { buildReportConfiguration } from '../utils/reportListColumnTransformer'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for InvestmentReportPanel.
 *
 * This component renders the toolbar + filtered investment report table for ONE
 * already-resolved sub-section. It does NOT discover sub-sections, sync the
 * URL, or render the section bar — that orchestration lives in the consumer
 * (e.g. `GenericReportTab` for the portfolio view).
 *
 * Both the portfolio report view and the investment record's reports tab
 * consume this panel so that catalog-driven filtering, dynamic columns,
 * sorting, search, and exports work identically across both surfaces.
 */
export interface InvestmentReportPanelProps extends BusinessAppContextProps {
  investmentGroup: string
  groupLabel: string
  sections: SubSection[]
  currentSection: string
  onSectionChange?: (code: string) => void
  showSectionBar?: boolean
  reportFilters: UseReportFiltersReturn
  extraWhereFilters?: Record<string, any>
  initialSearch?: string
  onSearchChange?: (search: string) => void
  initialSorting?: Array<{ id: string; desc: boolean }> | null
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialFilters?: Record<string, any>
  onFiltersChange?: (filters: Record<string, any>) => void
  initialVisibleColumns?: string[] | null
  onVisibleColumnsChange?: (columns: string[]) => void
  catalogData: any
  enabled?: boolean
  primaryAction?: React.ReactNode
  showExportButtons?: boolean
  onCurrenciesUpdate?: (currencies: string[]) => void
  exportFilenamePrefix?: string
  hideInvestmentScopeControls?: boolean
  dataTestId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Investment Report Panel
 *
 * The unified, group-agnostic rendering surface for filtered investment
 * reports. Any group present in the catalog renders consistently with
 * catalog-driven columns, sorting, and filters.
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
  hideInvestmentScopeControls = false,
  accessToken,
  userInfo,
  dataTestId = 'investment-report-panel'
}) => {
  const config = getReportGroupConfiguration()

  // Search state
  const [search, setSearch] = useState<string>(initialSearch ?? '')
  // Catalog-based filter values
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters ?? {})
  // Sort state
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

  const activeSection = useMemo(
    () => sections.find(section => section.code === currentSection),
    [sections, currentSection]
  )
  const sectionKind = activeSection?.kind

  // Scope filter dropdown options to the active (group, sub-section) so that
  // selecting an investment can never produce zero rows due to cross-group/type
  // mismatch.
  const filterBaseWhereParts = useMemo(
    () => buildInvestmentReportBaseWhereParts(investmentGroup, currentSection, sectionKind),
    [investmentGroup, currentSection, sectionKind]
  )

  // Fetch filter options once a sub-section is known.
  const filterGroups = useFilterGroups({ accessToken, userInfo }, 'InvestmentReport', INVESTMENT_REPORT_DESCRIPTORS, {
    limit: 100,
    enabled: !!currentSection,
    baseWhereParts: filterBaseWhereParts
  })

  // ---------------------------------------------------------------------------
  // Single cascade call — produces columnConfig, sortableColumns, filterConfig
  // ---------------------------------------------------------------------------
  const {
    columnConfig: cascadeColumnConfig,
    sortableColumns,
    filterConfiguration
  } = useMemo(
    () =>
      buildReportConfiguration(
        investmentGroup,
        currentSection,
        config.entityPrefix,
        catalogData,
        filterGroups,
        sectionKind
      ),
    [investmentGroup, currentSection, config.entityPrefix, catalogData, filterGroups.filterData, sectionKind]
  )

  const hiddenColumnIds = useMemo(
    () => (hideInvestmentScopeControls ? ['investment'] : []),
    [hideInvestmentScopeControls]
  )

  const effectiveColumnConfig = useMemo(
    () =>
      hideInvestmentScopeControls
        ? cascadeColumnConfig.filter(col => !hiddenColumnIds.includes(col.id))
        : cascadeColumnConfig,
    [cascadeColumnConfig, hiddenColumnIds, hideInvestmentScopeControls]
  )

  const effectiveSortableColumns = useMemo(
    () =>
      hideInvestmentScopeControls ? sortableColumns.filter(col => !hiddenColumnIds.includes(col.id)) : sortableColumns,
    [hiddenColumnIds, hideInvestmentScopeControls, sortableColumns]
  )

  const effectiveFilterConfiguration = useMemo(
    () =>
      hideInvestmentScopeControls
        ? {
            ...filterConfiguration,
            groups: filterConfiguration.groups.filter(group => group.id !== 'investmentIds-group')
          }
        : filterConfiguration,
    [filterConfiguration, hideInvestmentScopeControls]
  )

  // Apply cached column visibility so localStorage-saved preferences are
  // honoured on the first render for each section.
  const initialColumnsWithCache = useMemo(() => {
    if (!cachedVisibleColumns) return effectiveColumnConfig
    return effectiveColumnConfig.map(col => ({
      ...col,
      visible: col.disabled ? true : cachedVisibleColumns.includes(col.id)
    }))
  }, [effectiveColumnConfig, cachedVisibleColumns])

  // Local report filters — only used here for column visibility management.
  const localReportFilters = useReportFilters(initialColumnsWithCache)

  const { columnConfig, visibleColumns, handleColumnVisibilityChange } = localReportFilters

  // Column picker entries (excludes the locked "investment" column)
  const availableColumns = useMemo(
    () => columnConfig.filter(col => col.id !== 'investment').map(col => ({ id: col.id, label: col.label })),
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

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  const [exportHelpers, setExportHelpers] = useState<InvestmentReportExportHelpers | null>(null)

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
    hiddenColumnIds
  })

  // ---------------------------------------------------------------------------
  // Filter / sort handlers
  // ---------------------------------------------------------------------------
  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      setSelectedFilters(newFilters)
      onFiltersChange?.(newFilters)
    },
    [onFiltersChange]
  )

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

  // ---------------------------------------------------------------------------
  // Table filters (passed to the data query)
  // ---------------------------------------------------------------------------
  const reportFiltersForTable = useMemo(
    () => ({
      dateFrom: reportFilters.computedFilters.startDate,
      dateTo: reportFilters.computedFilters.endDate,
      currencyIds: reportFilters.computedFilters.currencyIds,
      investmentType: currentSection || '',
      search: search || undefined,
      ...selectedFilters,
      ...(extraWhereFilters || {})
    }),
    [reportFilters, currentSection, search, selectedFilters, extraWhereFilters]
  )

  // ---------------------------------------------------------------------------
  // Toolbar primary action slot
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!localReportFilters.filtersInitialized) {
    return (
      <div className="gba:flex gba:min-h-64 gba:items-center gba:justify-center">
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  const titleSections = showSectionBar
    ? sections.map(section => ({ id: section.code, label: section.label }))
    : undefined

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
        filters={selectedFilters}
        filterConfiguration={effectiveFilterConfiguration}
        onFilterChange={handleFilterChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        sorting={sorting}
        sortableColumns={effectiveSortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={composedPrimaryAction}
        toolbarDensity="default"
      >
        <InvestmentReportTable
          config={config.tableConfig}
          investmentGroup={investmentGroup}
          accessToken={accessToken}
          userInfo={userInfo}
          filters={reportFiltersForTable}
          investmentType={currentSection}
          sectionKind={sectionKind}
          investmentTypeValue={activeSection?.label || ''}
          catalogData={catalogData}
          visibleColumns={visibleColumns}
          onCurrenciesChange={onCurrenciesUpdate}
          onExportReady={setExportHelpers}
          enabled={enabled}
          hiddenColumnIds={hiddenColumnIds}
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
