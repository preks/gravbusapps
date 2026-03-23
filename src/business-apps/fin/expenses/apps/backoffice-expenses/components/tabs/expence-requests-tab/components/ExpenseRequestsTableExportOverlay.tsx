import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'

export interface ExpenseRequestsTableExportOverlayProps {
  visible: boolean
  isExporting: boolean
  totalItems: number
  onExportCsv: () => void
  onExportExcel: () => void
  getCsvTitle: () => string
  getExcelTitle: () => string
  labelExporting: string
  labelCsv: string
  labelExcel: string
}

function ExpenseRequestsTableExportOverlay(props: Readonly<ExpenseRequestsTableExportOverlayProps>) {
  const {
    visible,
    isExporting,
    totalItems,
    onExportCsv,
    onExportExcel,
    getCsvTitle,
    getExcelTitle,
    labelExporting,
    labelCsv,
    labelExcel
  } = props

  if (!visible) {
    return null
  }

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="export-buttons-overlay">
      <Button
        onClick={onExportCsv}
        variant="outline"
        size="sm"
        disabled={isExporting || totalItems === 0}
        data-testid="expense-requests-export-csv-button"
        title={getCsvTitle()}
      >
        <DownloadIcon className="gba:mr-2" />
        {isExporting ? labelExporting : labelCsv}
      </Button>
      <Button
        onClick={onExportExcel}
        variant="outline"
        size="sm"
        disabled={isExporting || totalItems === 0}
        data-testid="expense-requests-export-excel-button"
        title={getExcelTitle()}
      >
        <FileXlsIcon className="gba:mr-2" />
        {isExporting ? labelExporting : labelExcel}
      </Button>
    </div>
  )
}

export default React.memo(ExpenseRequestsTableExportOverlay)
