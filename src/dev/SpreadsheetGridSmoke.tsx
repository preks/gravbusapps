/**
 * Dev-only full-screen Univer smoke test (no auth, no API).
 * Open: http://localhost:<port>/?spreadsheetGridSmoke=1
 *
 * Uses calendar as default view + sheet.viewType calendar — the same shape that used to yield a blank main pane
 * before resolveRenderedSpreadsheetViewType; here we mount TableView directly to prove the grid still renders.
 */
import { ThemeProvider, LocalizationProvider } from '@newwork/nw-design-system'
import { TableView } from '@/business-apps/core/office/apps/spreadsheets/views/TableView'
import type { SpreadsheetColumn, SpreadsheetSheet } from '@/business-apps/core/office/apps/spreadsheets/types'

function col(
  p: Pick<SpreadsheetColumn, 'id' | 'name' | 'label' | 'order'> & Partial<SpreadsheetColumn>
): SpreadsheetColumn {
  return {
    type: 'text',
    isVisible: true,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    ...p
  }
}

const smokeSheet: SpreadsheetSheet = {
  id: 'smoke-sheet',
  name: 'equipment-tracker-smoke',
  viewType: 'calendar',
  columns: [
    col({ id: 'c1', name: 'item', label: 'Item', order: 0 }),
    col({ id: 'c2', name: 'qty', label: 'Qty', type: 'number', order: 1 })
  ],
  views: [
    {
      id: 'v-cal',
      name: 'Calendar',
      type: 'calendar',
      isDefault: true,
      config: { type: 'calendar', dateColumn: 'item', titleColumn: 'qty' }
    }
  ],
  data: [
    { _id: 'r1', _rowUuid: 'r1', item: 'Drill', qty: 2 },
    { _id: 'r2', _rowUuid: 'r2', item: 'Saw', qty: 1 }
  ],
  settings: {
    allowAdd: true,
    allowEdit: true,
    allowDelete: true,
    allowExport: true,
    allowImport: true,
    rowsPerPage: 50,
    showRowNumbers: true
  }
}

export function SpreadsheetGridSmoke() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="spreadsheet-grid-smoke-theme">
      <LocalizationProvider locale="en-US">
        <div className="gba:flex gba:flex-col gba:h-dvh gba:w-screen gba:bg-background gba:text-foreground">
          <header
            className="gba:shrink-0 gba:border-b gba:px-4 gba:py-2 gba:text-sm gba:text-muted-foreground"
            data-testid="spreadsheet-grid-smoke-banner"
          >
            Dev smoke: calendar default metadata + Univer grid (spreadsheetGridSmoke=1)
          </header>
          <div className="gba:relative gba:flex-1 gba:min-h-0 gba:w-full gba:min-w-0">
            <TableView
              sheet={smokeSheet}
              data={smokeSheet.data}
              columns={[]}
              spreadsheetColumns={smokeSheet.columns}
              testId="spreadsheet-grid-smoke-table"
              isReadOnly={false}
              snapshotSeed="smoke-seed"
            />
          </div>
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
