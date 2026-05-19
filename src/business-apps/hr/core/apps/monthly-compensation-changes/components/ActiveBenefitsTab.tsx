import type { ColumnDef } from '@tanstack/react-table'
import { Button, DataDisplay, KpiCard, type KpiCardData } from '@newwork/nw-design-system'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import {
  BenefitDetailPanel,
  type TranslationFn
} from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/ChangeDetailPanels'
import type { ActiveBenefitRow } from '../types/compensationChanges.types'
import { DetailSheet } from './DetailSheet'
import { TabDataTable } from './TabDataTable'

interface ActiveBenefitsTabProps {
  readonly t: TranslationFn
  readonly titleSections: Array<{ id: string; label: string; metadata?: { count: number } }>
  readonly currentSection: string
  readonly onSectionChange: (section: string) => void
  readonly searchValue: string
  readonly onSearchChange: (value: string) => void
  readonly filters: Record<string, string[]>
  readonly filterConfiguration: unknown
  readonly onFilterChange: (filters: Record<string, string[]>) => void
  readonly monthNavigator: React.ReactNode
  readonly isExporting: boolean
  readonly onExport: () => void
  readonly kpiCards: KpiCardData[]
  readonly rows: ActiveBenefitRow[]
  readonly columns: ColumnDef<ActiveBenefitRow>[]
  readonly loading: boolean
  readonly error: string | null
  readonly selectedRow: ActiveBenefitRow | null
  readonly setSelectedRow: (row: ActiveBenefitRow | null) => void
}

export function ActiveBenefitsTab({
  t,
  titleSections,
  currentSection,
  onSectionChange,
  searchValue,
  onSearchChange,
  filters,
  filterConfiguration,
  onFilterChange,
  monthNavigator,
  isExporting,
  onExport,
  kpiCards,
  rows,
  columns,
  loading,
  error,
  selectedRow,
  setSelectedRow
}: ActiveBenefitsTabProps) {
  return (
    <DataDisplay
      titleSections={titleSections}
      currentSection={currentSection}
      onSectionChange={onSectionChange}
      searchValue={searchValue}
      searchPlaceholder={t('search-benefits-placeholder')}
      onSearchChange={onSearchChange}
      filters={filters}
      filterConfiguration={filterConfiguration as never}
      onFilterChange={onFilterChange}
      filterSheetTitle={t('filter-benefits-title')}
      filterSheetDescription={t('filter-benefits-description')}
      secondaryActions={
        <div className="gba:flex gba:items-center gba:gap-2">
          {monthNavigator}
          <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting || rows.length === 0}>
            <DownloadSimpleIcon className="gba:size-4 gba:mr-1.5" />
            {isExporting ? t('export-button-loading') : t('export-button')}
          </Button>
        </div>
      }
      toolbarDensity="compact"
    >
      <div className="gba:px-4 gba:pt-4">
        <div className="gba:grid gba:grid-cols-3 gba:gap-3">
          {kpiCards.map(card => (
            <KpiCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      <TabDataTable
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        emptyMessage={t('empty-no-benefits')}
        onRowClick={setSelectedRow}
      />

      <DetailSheet open={selectedRow !== null} onClose={() => setSelectedRow(null)} title={t('sheet-benefit-details')}>
        {selectedRow && <BenefitDetailPanel record={selectedRow.raw} t={t} />}
      </DetailSheet>
    </DataDisplay>
  )
}
