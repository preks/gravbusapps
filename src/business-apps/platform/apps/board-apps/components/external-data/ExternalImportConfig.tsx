import React from 'react'
import {
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { ArrowLeft, Download } from 'lucide-react'

export interface ExternalImportConfigProps {
  connectorName: string
  selectedFieldCount: number
  estimatedTotal?: number
  limit: number
  onLimitChange: (limit: number) => void
  mode: 'replace' | 'append' | 'merge'
  onModeChange: (mode: 'replace' | 'append' | 'merge') => void
  mergeKey: string
  onMergeKeyChange: (key: string) => void
  keepConnected: boolean
  onKeepConnectedChange: (connected: boolean) => void
  refreshMode: 'manual' | 'onOpen' | 'periodic'
  onRefreshModeChange: (mode: 'manual' | 'onOpen' | 'periodic') => void
  isImporting: boolean
  onBack: () => void
  onImport: () => void
  'data-testid'?: string
}

export const ExternalImportConfig: React.FC<ExternalImportConfigProps> = ({
  connectorName,
  selectedFieldCount,
  estimatedTotal,
  limit,
  onLimitChange,
  mode,
  onModeChange,
  mergeKey,
  onMergeKeyChange,
  keepConnected,
  onKeepConnectedChange,
  refreshMode,
  onRefreshModeChange,
  isImporting,
  onBack,
  onImport,
  'data-testid': testId = 'external-import-config'
}) => (
  <div className="gba:space-y-4" data-testid={testId}>
    <p className="gba:text-sm gba:text-muted-foreground">
      Import <strong>{selectedFieldCount}</strong> fields from <strong>{connectorName}</strong>
      {estimatedTotal ? ` (~${estimatedTotal.toLocaleString()} records available)` : ''}.
    </p>

    <div>
      <Label className="gba:text-xs" htmlFor={`${testId}-limit`}>
        Max records to import
      </Label>
      <Input
        id={`${testId}-limit`}
        type="number"
        min={1}
        value={limit}
        onChange={e => onLimitChange(Math.max(1, Number(e.target.value)))}
        className="gba:h-9"
        data-testid={`${testId}-limit`}
      />
    </div>

    <div>
      <Label className="gba:text-xs">Import mode</Label>
      <Select value={mode} onValueChange={v => onModeChange(v as typeof mode)}>
        <SelectTrigger className="gba:h-9" data-testid={`${testId}-mode`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="replace">Replace — clear sheet, then insert</SelectItem>
          <SelectItem value="append">Append — add after existing rows</SelectItem>
          <SelectItem value="merge">Merge — match on a key column</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {mode === 'merge' && (
      <div>
        <Label className="gba:text-xs" htmlFor={`${testId}-merge-key`}>
          Merge key (column name in incoming data)
        </Label>
        <Input
          id={`${testId}-merge-key`}
          value={mergeKey}
          onChange={e => onMergeKeyChange(e.target.value)}
          placeholder="e.g. id"
          className="gba:h-9"
          data-testid={`${testId}-merge-key`}
        />
      </div>
    )}

    <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border gba:rounded-md gba:p-3">
      <div className="gba:min-w-0">
        <div className="gba:text-sm gba:font-medium gba:text-foreground">Keep connected</div>
        <div className="gba:text-xs gba:text-muted-foreground">Save the connection so you can re-sync later.</div>
      </div>
      <Switch
        checked={keepConnected}
        onCheckedChange={onKeepConnectedChange}
        data-testid={`${testId}-keep-connected`}
      />
    </div>

    {keepConnected && (
      <div>
        <Label className="gba:text-xs">Refresh mode</Label>
        <Select value={refreshMode} onValueChange={v => onRefreshModeChange(v as typeof refreshMode)}>
          <SelectTrigger className="gba:h-9" data-testid={`${testId}-refresh-mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual — sync on demand</SelectItem>
            <SelectItem value="onOpen">On open — sync when board opens</SelectItem>
            <SelectItem value="periodic">Periodic — auto-sync on schedule</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}

    <div className="gba:flex gba:justify-between gba:pt-2">
      <Button variant="outline" size="sm" onClick={onBack} disabled={isImporting} data-testid={`${testId}-back`}>
        <ArrowLeft className="gba:w-3 gba:h-3 gba:mr-1" /> Back
      </Button>
      <Button size="sm" onClick={onImport} disabled={isImporting} data-testid={`${testId}-import`}>
        {isImporting ? (
          <>
            <Spinner size="sm" /> Importing...
          </>
        ) : (
          <>
            <Download className="gba:w-3 gba:h-3 gba:mr-1" /> Start import
          </>
        )}
      </Button>
    </div>
  </div>
)
