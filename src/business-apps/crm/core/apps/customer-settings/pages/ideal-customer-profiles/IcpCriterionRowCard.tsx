import React from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customerSettingsI18n from '../../_i18n'
import { IcpCatalogValueSelect } from './IcpCatalogValueSelect'
import { IcpCriterionExtraFieldsEditor } from './IcpCriterionExtraFieldsEditor'
import {
  getLeadCriterionDefinition,
  isKnownLeadCriterionKey,
  LEAD_CRITERION_DEFINITIONS
} from './icpLeadCriterionDefinitions'
import type { IcpCriterionRowState } from './icpFormState'

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export interface IcpCriterionRowCardProps {
  row: IcpCriterionRowState
  dataTestIdPrefix: string
  onUpdate: (clientId: string, patch: Partial<IcpCriterionRowState>) => void
  onRemove: (clientId: string) => void
  compact?: boolean
  accessToken: BusinessAppContextProps['accessToken']
}

export function IcpCriterionRowCard(props: Readonly<IcpCriterionRowCardProps>) {
  const { row, dataTestIdPrefix, onUpdate, onRemove, compact, accessToken } = props
  const { t } = useTranslation(customerSettingsI18n)
  const padClass = compact ? 'gba:p-3' : 'gba:p-4'
  const def = getLeadCriterionDefinition(row.key)
  const fieldSelectValue = row.key.length > 0 && isKnownLeadCriterionKey(row.key) ? row.key : undefined

  const handleFieldChange = (nextId: string) => {
    onUpdate(row.clientId, { key: nextId, valueStr: '', legacyUnknownKey: false })
  }

  return (
    <div
      className={`gba:space-y-3 gba:border gba:border-border gba:rounded-md ${padClass}`}
      data-testid={`${dataTestIdPrefix}-criterion-${row.clientId}`}
    >
      {row.legacyUnknownKey && row.key ? (
        <Alert variant="default" className="gba:py-2">
          <AlertDescription className="gba:text-xs gba:text-muted-foreground">
            {t('icp-legacy-criterion-hint', { key: row.key })}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="gba:grid gba:gap-3 gba:md:grid-cols-12 gba:items-start">
        <div className="gba:md:col-span-4 gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">{t('icp-lead-field')}</Label>
          <Select
            value={fieldSelectValue}
            onValueChange={handleFieldChange}
            data-testid={`${dataTestIdPrefix}-criterion-${row.clientId}-field`}
          >
            <SelectTrigger className="gba:w-full">
              <SelectValue placeholder={t('icp-criterion-field-placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {LEAD_CRITERION_DEFINITIONS.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {t(`icp-criterion-field-${d.labelKeySuffix}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="gba:md:col-span-4 gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">{t('icp-target-value')}</Label>
          {def?.valueKind === 'catalog' && def.catalogRef ? (
            <IcpCatalogValueSelect
              accessToken={accessToken}
              catalogRef={def.catalogRef}
              value={row.valueStr}
              onChange={next => onUpdate(row.clientId, { valueStr: next })}
              data-testid={`${dataTestIdPrefix}-criterion-${row.clientId}-value`}
              disabled={!row.key}
            />
          ) : (
            <Textarea
              value={row.valueStr}
              onChange={e => onUpdate(row.clientId, { valueStr: e.target.value })}
              rows={2}
              disabled={!row.key}
              data-testid={`${dataTestIdPrefix}-criterion-${row.clientId}-value`}
            />
          )}
        </div>
        <div className="gba:md:col-span-2 gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">{t('icp-weight-percent')}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={row.weightPct}
            onChange={e => {
              const v = Number.parseInt(e.target.value, 10)
              onUpdate(row.clientId, { weightPct: clampPct(v) })
            }}
            data-testid={`${dataTestIdPrefix}-criterion-${row.clientId}-weight`}
          />
        </div>
        <div className="gba:md:col-span-2 gba:flex gba:justify-end gba:pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(row.clientId)}
            data-testid={`${dataTestIdPrefix}-criterion-${row.clientId}-remove`}
            aria-label={t('icp-remove-criterion-aria')}
          >
            <TrashIcon className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </div>
      <IcpCriterionExtraFieldsEditor
        pairs={row.extraPairs}
        onChange={next => onUpdate(row.clientId, { extraPairs: next })}
        dataTestIdPrefix={`${dataTestIdPrefix}-criterion-${row.clientId}-extras`}
      />
    </div>
  )
}
