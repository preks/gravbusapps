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
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, Download } from 'lucide-react'
import translations from '../../_i18n'

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
  <TranslatedUnstructuredImportConfig
    connectorName={connectorName}
    estimatedTotal={estimatedTotal}
    limit={limit}
    onLimitChange={onLimitChange}
    keepConnected={keepConnected}
    onKeepConnectedChange={onKeepConnectedChange}
    refreshMode={refreshMode}
    onRefreshModeChange={onRefreshModeChange}
    isImporting={isImporting}
    onBack={onBack}
    onImport={onImport}
    data-testid={testId}
  />
)

const TranslatedUnstructuredImportConfig: React.FC<UnstructuredImportConfigProps> = ({
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
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <p className="gba:text-sm gba:text-muted-foreground">
        {t('external-import-config-intro', { connectorName })}
        {estimatedTotal ? ` ${t('external-import-config-available', { count: estimatedTotal.toLocaleString() })}` : ''}.
      </p>

      <div className="gba:rounded gba:border gba:border-info/50 gba:bg-info-secondary gba:p-3">
        <p className="gba:text-xs gba:text-info-foreground">{t('external-import-config-readonly')}</p>
      </div>

      <div>
        <Label className="gba:text-xs" htmlFor={`${testId}-limit`}>
          {t('external-import-config-max-items')}
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
          <div className="gba:text-sm gba:font-medium gba:text-foreground">
            {t('external-import-config-keep-connected')}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground">{t('external-import-config-keep-connected-desc')}</div>
        </div>
        <Switch
          checked={keepConnected}
          onCheckedChange={onKeepConnectedChange}
          data-testid={`${testId}-keep-connected`}
        />
      </div>

      {keepConnected && (
        <div>
          <Label className="gba:text-xs">{t('external-import-config-refresh-mode')}</Label>
          <Select value={refreshMode} onValueChange={v => onRefreshModeChange(v as typeof refreshMode)}>
            <SelectTrigger className="gba:h-9" data-testid={`${testId}-refresh-mode`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('external-import-config-refresh-manual')}</SelectItem>
              <SelectItem value="onOpen">{t('external-import-config-refresh-on-open')}</SelectItem>
              <SelectItem value="periodic">{t('external-import-config-refresh-periodic')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="gba:flex gba:justify-between gba:pt-2">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isImporting} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-3 gba:h-3 gba:mr-1" /> {t('external-import-back')}
        </Button>
        <Button size="sm" onClick={onImport} disabled={isImporting} data-testid={`${testId}-import`}>
          {isImporting ? (
            <>
              <Spinner size="sm" /> {t('external-import-config-importing')}
            </>
          ) : (
            <>
              <Download className="gba:w-3 gba:h-3 gba:mr-1" /> {t('external-import-config-start-import')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
