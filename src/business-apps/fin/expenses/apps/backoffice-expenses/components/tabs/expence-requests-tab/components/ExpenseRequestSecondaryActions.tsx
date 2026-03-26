import type { ReactNode } from 'react'
import { Button } from '@newwork/nw-design-system'
import ExpenseRequestsTableExportOverlay from './ExpenseRequestsTableExportOverlay'

interface ExpenseRequestSecondaryActionsProps {
  currencySecondaryAction: ReactNode
  showExport: boolean
  isExporting: boolean
  totalItems: number
  onExportCsv: () => void
  onExportExcel: () => void
  getCsvTitle: () => string
  getExcelTitle: () => string
  labelExporting: string
  labelCsv: string
  labelExcel: string
  showBulkTransfer: boolean
  onBulkTransfer: () => void
  bulkTransferLabel: string
  transferInProgressLabel: string
  transferSelectedLabel: string
  selectedBookableCount: number
  isBulkTransferInProgress: boolean
}

export default function ExpenseRequestSecondaryActions({
  currencySecondaryAction,
  showExport,
  isExporting,
  totalItems,
  onExportCsv,
  onExportExcel,
  getCsvTitle,
  getExcelTitle,
  labelExporting,
  labelCsv,
  labelExcel,
  showBulkTransfer,
  onBulkTransfer,
  bulkTransferLabel,
  transferInProgressLabel,
  transferSelectedLabel,
  selectedBookableCount,
  isBulkTransferInProgress
}: Readonly<ExpenseRequestSecondaryActionsProps>) {
  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-end gba:gap-2">
      {currencySecondaryAction}
      {showExport ? (
        <ExpenseRequestsTableExportOverlay
          visible
          isExporting={isExporting}
          totalItems={totalItems}
          onExportCsv={onExportCsv}
          onExportExcel={onExportExcel}
          getCsvTitle={getCsvTitle}
          getExcelTitle={getExcelTitle}
          labelExporting={labelExporting}
          labelCsv={labelCsv}
          labelExcel={labelExcel}
        />
      ) : null}
      {showBulkTransfer ? (
        <Button
          key={`bulk-transfer-${selectedBookableCount}`}
          onClick={onBulkTransfer}
          data-testid="bulk-transfer-payment-button"
          variant="outline"
          size="sm"
          disabled={isBulkTransferInProgress}
        >
          {isBulkTransferInProgress ? transferInProgressLabel : bulkTransferLabel} ({selectedBookableCount}{' '}
          {transferSelectedLabel})
        </Button>
      ) : null}
    </div>
  )
}
