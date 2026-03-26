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

export interface UnstructuredImportConfigProps {
  connectorName: string
  estimatedTotal?: number
  limit: number
  onLimitChange: (limit: number) => void
  keepConnected: boolean
  onKeepConnectedChange: (connected: boolean) => void
  refreshMode: 'manual' | 'onOpen' | 'periodic'
  onRefreshModeChange: (mode: 'manual' | 'onOpen' | 'periodic') => void
  isImporting: boolean
  onBack: () => void
  onImport: () => void
  'data-testid'?: string
}

export const UnstructuredImportConfig: React.FC<UnstructuredImportConfigProps> = ({
  connectorName,
  estimatedTotal,
  limit,
  onLimitChange,
  keepConnected,
  onKeepConnectedChange,
  refreshMode,
  onRefreshModeChange,
  isImporting,
  onBack,
  onImport,
  'data-testid': testId = 'unstructured-import-config'
}) => (
  <div className="gba:space-y-4" data-testid={testId}>
    <p className="gba:text-sm gba:text-muted-foreground">
      Import documents from <strong>{connectorName}</strong>
      {estimatedTotal ? ` (~${estimatedTotal.toLocaleString()} items available)` : ''}.
    </p>

    <div className="gba:rounded gba:border gba:border-info/50 gba:bg-info-secondary gba:p-3">
      <p className="gba:text-xs gba:text-info-foreground">
        Imported documents will be <strong>read-only</strong> while connected to the external source. You can create an
        editable copy at any time, which will break the connection.
      </p>
    </div>

    <div>
      <Label className="gba:text-xs" htmlFor={`${testId}-limit`}>
        Max items to import
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

    <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border gba:rounded-md gba:p-3">
      <div className="gba:min-w-0">
        <div className="gba:text-sm gba:font-medium gba:text-foreground">Keep connected</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          Stay connected so updates from the source propagate automatically.
        </div>
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
            <SelectItem value="onOpen">On open — sync when documents are opened</SelectItem>
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
