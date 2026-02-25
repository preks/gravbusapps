import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Spinner
} from '@newwork/nw-design-system'
import { ChevronLeft, Link2 } from 'lucide-react'
import type { EntityQueryDef } from '../../queries/entityQueries'

export interface ImportConfigProps {
  entityDef: EntityQueryDef
  total: number
  selectedFieldCount: number
  limit: number
  onLimitChange: (limit: number) => void
  mode: 'replace' | 'append' | 'merge'
  onModeChange: (mode: 'replace' | 'append' | 'merge') => void
  mergeKey: string
  onMergeKeyChange: (key: string) => void
  isImporting: boolean
  onBack: () => void
  onImport: () => void
  keepConnected?: boolean
  onKeepConnectedChange?: (v: boolean) => void
  refreshMode?: 'manual' | 'onOpen' | 'periodic'
  onRefreshModeChange?: (m: 'manual' | 'onOpen' | 'periodic') => void
  hideModeSelector?: boolean
  'data-testid'?: string
}

export const ImportConfig: React.FC<ImportConfigProps> = ({
  entityDef,
  total,
  selectedFieldCount,
  limit,
  onLimitChange,
  mode,
  onModeChange,
  mergeKey,
  onMergeKeyChange,
  isImporting,
  onBack,
  onImport,
  keepConnected = false,
  onKeepConnectedChange,
  refreshMode = 'manual',
  onRefreshModeChange,
  hideModeSelector,
  'data-testid': testId = 'import-config'
}) => {
  const effectiveCount = limit > 0 ? Math.min(limit, total) : total

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
        <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" /> Back
      </Button>

      <div className="gba:rounded gba:border gba:border-border gba:p-3 gba:space-y-1">
        <p className="gba:text-sm gba:font-medium">Import summary</p>
        <p className="gba:text-xs gba:text-muted-foreground">
          Source: <span className="gba:font-medium gba:text-foreground">{entityDef.displayName}</span>
        </p>
        <p className="gba:text-xs gba:text-muted-foreground">
          Fields: <span className="gba:font-medium gba:text-foreground">{selectedFieldCount}</span>
        </p>
        <p className="gba:text-xs gba:text-muted-foreground">
          Records: <span className="gba:font-medium gba:text-foreground">{effectiveCount.toLocaleString()}</span>
          {total > effectiveCount && <span> of {total.toLocaleString()} available</span>}
        </p>
      </div>

      <div className={hideModeSelector ? '' : 'gba:grid gba:grid-cols-2 gba:gap-3'}>
        <div>
          <Label className="gba:text-xs">Max records</Label>
          <Input
            type="number"
            value={String(limit)}
            onChange={e => onLimitChange(Math.max(1, Math.min(500, Number(e.target.value) || 100)))}
            className="gba:h-9"
            data-testid={`${testId}-limit`}
          />
        </div>
        {!hideModeSelector && (
          <div>
            <Label className="gba:text-xs">Import mode</Label>
            <Select value={mode} onValueChange={v => onModeChange(v as 'replace' | 'append' | 'merge')}>
              <SelectTrigger className="gba:h-9" data-testid={`${testId}-mode`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Replace all rows</SelectItem>
                <SelectItem value="append">Append new rows</SelectItem>
                <SelectItem value="merge">Merge by key</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {mode === 'merge' && !hideModeSelector && (
        <div>
          <Label className="gba:text-xs">Merge key column</Label>
          <Input
            value={mergeKey}
            onChange={e => onMergeKeyChange(e.target.value)}
            placeholder="e.g. id"
            className="gba:h-9"
            data-testid={`${testId}-merge-key`}
          />
        </div>
      )}

      {onKeepConnectedChange && (
        <div className="gba:rounded gba:border gba:border-border gba:p-3 gba:space-y-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Link2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <div>
                <p className="gba:text-xs gba:font-medium">Keep connected</p>
                <p className="gba:text-xs gba:text-muted-foreground">Auto-refresh data from source</p>
              </div>
            </div>
            <Switch
              checked={keepConnected}
              onCheckedChange={onKeepConnectedChange}
              data-testid={`${testId}-keep-connected`}
            />
          </div>
          {keepConnected && onRefreshModeChange && (
            <div>
              <Label className="gba:text-xs">Refresh mode</Label>
              <Select
                value={refreshMode}
                onValueChange={v => onRefreshModeChange(v as 'manual' | 'onOpen' | 'periodic')}
              >
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-refresh-mode`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual only</SelectItem>
                  <SelectItem value="onOpen">Refresh on open</SelectItem>
                  <SelectItem value="periodic">Auto-refresh periodically</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <p className="gba:text-xs gba:text-muted-foreground">
        {keepConnected
          ? 'Data will stay connected. Changes in the source system will be reflected based on your refresh settings.'
          : 'This is a one-time snapshot. Data will not update when the source changes.'}
      </p>

      <Button
        onClick={onImport}
        disabled={isImporting || selectedFieldCount === 0}
        className="gba:w-full gba:gap-1.5"
        data-testid={`${testId}-import-btn`}
      >
        {isImporting ? (
          <>
            <Spinner size="sm" /> Importing...
          </>
        ) : (
          `Import ${effectiveCount.toLocaleString()} ${entityDef.displayName}`
        )}
      </Button>
    </div>
  )
}
