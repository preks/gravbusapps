import type { ColumnDef } from '@tanstack/react-table'
import { DataDisplay, KpiCard, type KpiCardData } from '@newwork/nw-design-system'
import {
  BenefitDetailPanel,
  BonusDetailPanel,
  SalaryDetailPanel,
  type TranslationFn
} from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/ChangeDetailPanels'
import type {
  BenefitChangeRecord,
  BonusRecord,
  CompensationChangeRow,
  SalaryChangeRecord
} from '../types/compensationChanges.types'
import { DetailSheet } from './DetailSheet'
import { TabDataTable } from './TabDataTable'

interface CompensationChangesTabProps {
  readonly t: TranslationFn
  readonly accessToken: string
  readonly titleSections: Array<{ id: string; label: string; metadata?: { count: number } }>
  readonly currentSection: string
  readonly onSectionChange: (section: string) => void
  readonly searchValue: string
  readonly onSearchChange: (value: string) => void
  readonly filters: Record<string, string[]>
  readonly filterConfiguration: unknown
  readonly onFilterChange: (filters: Record<string, string[]>) => void
  readonly monthNavigator: React.ReactNode
  readonly kpiCards: KpiCardData[]
  readonly rows: CompensationChangeRow[]
  readonly columns: ColumnDef<CompensationChangeRow>[]
  readonly loading: boolean
  readonly error: string | null
  readonly selectedRow: CompensationChangeRow | null
  readonly setSelectedRow: (row: CompensationChangeRow | null) => void
}

export function CompensationChangesTab({
  t,
  accessToken,
  titleSections,
  currentSection,
  onSectionChange,
  searchValue,
  onSearchChange,
  filters,
  filterConfiguration,
  onFilterChange,
  monthNavigator,
  kpiCards,
  rows,
  columns,
  loading,
  error,
  selectedRow,
  setSelectedRow
}: CompensationChangesTabProps) {
  return (
    <DataDisplay
      titleSections={titleSections}
      currentSection={currentSection}
      onSectionChange={onSectionChange}
      searchValue={searchValue}
      searchPlaceholder={t('search-changes-placeholder')}
      onSearchChange={onSearchChange}
      filters={filters}
      filterConfiguration={filterConfiguration as never}
      onFilterChange={onFilterChange}
      filterSheetTitle={t('filter-changes-title')}
      filterSheetDescription={t('filter-changes-description')}
      secondaryActions={monthNavigator}
      toolbarDensity="compact"
    >
      <div className="gba:px-4 gba:pt-4">
        <div className="gba:grid gba:grid-cols-4 gba:gap-3">
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
        emptyMessage={t('empty-no-changes')}
        onRowClick={setSelectedRow}
      />

      <DetailSheet open={selectedRow !== null} onClose={() => setSelectedRow(null)} title={t('sheet-change-details')}>
        {selectedRow?.category === 'salary' && (
          <SalaryDetailPanel record={selectedRow.raw as SalaryChangeRecord} t={t} accessToken={accessToken} />
        )}
        {selectedRow?.category === 'bonus' && <BonusDetailPanel record={selectedRow.raw as BonusRecord} t={t} />}
        {selectedRow?.category === 'benefit' && (
          <BenefitDetailPanel record={selectedRow.raw as BenefitChangeRecord} t={t} />
        )}
      </DetailSheet>
    </DataDisplay>
  )
}
