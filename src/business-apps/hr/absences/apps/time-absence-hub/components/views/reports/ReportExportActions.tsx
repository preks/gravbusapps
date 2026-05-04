import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { DownloadIcon } from '@phosphor-icons/react'

interface ReportExportActionsProps {
  isExporting: 'csv' | 'xlsx' | null
  disabled: boolean
  onCsv: () => void
  onXlsx: () => void
  csvLabel: string
  xlsxLabel: string
  csvTestId: string
  xlsxTestId: string
}

export const ReportExportActions: React.FC<ReportExportActionsProps> = ({
  isExporting,
  disabled,
  onCsv,
  onXlsx,
  csvLabel,
  xlsxLabel,
  csvTestId,
  xlsxTestId
}) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Button variant="outline" size="sm" onClick={onCsv} disabled={disabled} data-testid={csvTestId}>
      {isExporting === 'csv' ? <Spinner size="sm" /> : <DownloadIcon size={14} />}
      {csvLabel}
    </Button>
    <Button variant="outline" size="sm" onClick={onXlsx} disabled={disabled} data-testid={xlsxTestId}>
      {isExporting === 'xlsx' ? <Spinner size="sm" /> : <DownloadIcon size={14} />}
      {xlsxLabel}
    </Button>
  </div>
)
