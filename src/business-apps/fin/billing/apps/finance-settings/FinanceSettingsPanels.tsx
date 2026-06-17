import {
  Badge,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { FinanceSettingsDocument } from '../../common/settings/network/financeSettingsClient'
import { ROUNDING_MODES, type RoundingMode } from '../../common/settings/types'

type TranslateFn = (key: string) => string
type LegalEntity = FinanceSettingsDocument['legalEntities'][number]
type TaxCategory = FinanceSettingsDocument['taxCategories'][number]

interface FinanceSettingsPanelProps {
  draft: FinanceSettingsDocument
  editable: boolean
  patch: (next: Partial<FinanceSettingsDocument>) => void
  t: TranslateFn
}

function FieldRow({
  label,
  value,
  editable,
  onChange,
  type = 'text'
}: Readonly<{
  label: string
  value: string
  editable: boolean
  onChange?: (value: string) => void
  type?: string
}>) {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:border-b gba:py-2 gba:text-sm">
      <span className="gba:text-muted-foreground">{label}</span>
      {editable && onChange ? (
        <Input type={type} value={value} onChange={event => onChange(event.target.value)} className="gba:max-w-xs" />
      ) : (
        <span className="gba:font-medium">{value || '—'}</span>
      )}
    </div>
  )
}

function updateLegalEntity(
  draft: FinanceSettingsDocument,
  entityId: string,
  patch: (next: Partial<FinanceSettingsDocument>) => void,
  update: (entity: LegalEntity) => LegalEntity
) {
  patch({
    legalEntities: draft.legalEntities.map(entity => (entity.id === entityId ? update(entity) : entity))
  })
}

function updateFirstBankAccount(entity: LegalEntity, iban: string): LegalEntity {
  return {
    ...entity,
    bankAccounts: entity.bankAccounts.map((account, index) => (index === 0 ? { ...account, iban } : account))
  }
}

function updateTaxCategory(
  draft: FinanceSettingsDocument,
  categoryId: string,
  patch: (next: Partial<FinanceSettingsDocument>) => void,
  update: (category: TaxCategory) => TaxCategory
) {
  patch({
    taxCategories: draft.taxCategories.map(category => (category.id === categoryId ? update(category) : category))
  })
}

function updateFirstTaxRate(category: TaxCategory, ratePercent: number): TaxCategory {
  return {
    ...category,
    rates: category.rates.map((rate, index) => (index === 0 ? { ...rate, ratePercent } : rate))
  }
}

export function LegalEntitiesSettingsPanel({ draft, editable, patch, t }: Readonly<FinanceSettingsPanelProps>) {
  return (
    <Card className="gba:p-6 gba:flex gba:flex-col gba:gap-4" data-testid="settings-legal-entities">
      {draft.legalEntities.map(entity => (
        <div key={entity.id} className="gba:border-b gba:pb-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <span className="gba:font-semibold">{entity.name}</span>
            <Badge variant="secondary">{entity.countryCode}</Badge>
          </div>
          <FieldRow
            label={t('billing-settings-name')}
            value={entity.name}
            editable={editable}
            onChange={value => updateLegalEntity(draft, entity.id, patch, item => ({ ...item, name: value }))}
          />
          <FieldRow
            label={t('billing-settings-vat-id')}
            value={entity.vatId ?? ''}
            editable={editable}
            onChange={value => updateLegalEntity(draft, entity.id, patch, item => ({ ...item, vatId: value }))}
          />
          <FieldRow
            label={t('billing-settings-accounting-currency')}
            value={entity.accountingCurrency}
            editable={editable}
            onChange={value =>
              updateLegalEntity(draft, entity.id, patch, item => ({ ...item, accountingCurrency: value }))
            }
          />
          <FieldRow
            label={t('billing-settings-default-currency')}
            value={entity.defaultCurrency}
            editable={editable}
            onChange={value =>
              updateLegalEntity(draft, entity.id, patch, item => ({ ...item, defaultCurrency: value }))
            }
          />
          <FieldRow
            label={t('billing-settings-iban')}
            value={entity.bankAccounts[0]?.iban ?? ''}
            editable={editable && entity.bankAccounts.length > 0}
            onChange={value => updateLegalEntity(draft, entity.id, patch, item => updateFirstBankAccount(item, value))}
          />
          <FieldRow
            label={t('billing-settings-footer')}
            value={entity.invoiceFooter ?? ''}
            editable={editable}
            onChange={value => updateLegalEntity(draft, entity.id, patch, item => ({ ...item, invoiceFooter: value }))}
          />
        </div>
      ))}
    </Card>
  )
}

export function TaxSettingsPanel({ draft, editable, patch }: Readonly<FinanceSettingsPanelProps>) {
  return (
    <Card className="gba:p-6" data-testid="settings-tax">
      {draft.taxCategories.map(category => (
        <FieldRow
          key={category.id}
          label={`${category.name} (${category.treatment})`}
          value={String(category.rates[0]?.ratePercent ?? 0)}
          editable={editable && category.rates.length > 0}
          type="number"
          onChange={value =>
            updateTaxCategory(draft, category.id, patch, item => updateFirstTaxRate(item, Number(value)))
          }
        />
      ))}
    </Card>
  )
}

export function CurrencySettingsPanel({ draft, editable, patch, t }: Readonly<FinanceSettingsPanelProps>) {
  return (
    <Card className="gba:p-6 gba:flex gba:flex-col gba:gap-2" data-testid="settings-currencies">
      <FieldRow
        label={t('billing-settings-enabled-currencies')}
        value={draft.currencies.enabledCurrencies.join(', ')}
        editable={editable}
        onChange={value =>
          patch({
            currencies: {
              ...draft.currencies,
              enabledCurrencies: value
                .split(',')
                .map(code => code.trim().toUpperCase())
                .filter(Boolean)
            }
          })
        }
      />
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:py-2 gba:text-sm">
        <span className="gba:text-muted-foreground">{t('billing-settings-rounding-mode')}</span>
        {editable ? (
          <Select
            value={draft.currencies.roundingMode}
            onValueChange={value => patch({ currencies: { ...draft.currencies, roundingMode: value as RoundingMode } })}
          >
            <SelectTrigger className="gba:max-w-xs" data-testid="settings-rounding-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUNDING_MODES.map(mode => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="gba:font-medium">{draft.currencies.roundingMode}</span>
        )}
      </div>
    </Card>
  )
}

export function PaymentTermsSettingsPanel({ draft, editable, patch }: Readonly<FinanceSettingsPanelProps>) {
  return (
    <Card className="gba:p-6" data-testid="settings-terms">
      {draft.paymentTerms.map(term => (
        <FieldRow
          key={term.id}
          label={term.name}
          value={String(term.dueDays)}
          editable={editable}
          type="number"
          onChange={value =>
            patch({
              paymentTerms: draft.paymentTerms.map(item =>
                item.id === term.id ? { ...item, dueDays: Number(value) } : item
              )
            })
          }
        />
      ))}
    </Card>
  )
}

export function NumberingSettingsPanel({ draft, editable, patch, t }: Readonly<FinanceSettingsPanelProps>) {
  return (
    <Card className="gba:p-6" data-testid="settings-numbering">
      <FieldRow
        label={t('billing-settings-numbering-format')}
        value={draft.numbering.format}
        editable={editable}
        onChange={value => patch({ numbering: { ...draft.numbering, format: value } })}
      />
      <FieldRow
        label={t('billing-settings-numbering-reset')}
        value={draft.numbering.resetPolicy}
        editable={editable}
        onChange={value => patch({ numbering: { ...draft.numbering, resetPolicy: value } })}
      />
    </Card>
  )
}

export function PostingSettingsPanel({ draft, editable, patch, t }: Readonly<FinanceSettingsPanelProps>) {
  return (
    <Card className="gba:p-6" data-testid="settings-posting">
      {(
        [
          ['accountsReceivable', 'billing-settings-account-ar'],
          ['revenue', 'billing-settings-account-revenue'],
          ['taxPayable', 'billing-settings-account-tax'],
          ['cashClearing', 'billing-settings-account-cash'],
          ['fxGainLoss', 'billing-settings-account-fx'],
          ['badDebt', 'billing-settings-account-bad-debt'],
          ['rounding', 'billing-settings-account-rounding']
        ] as const
      ).map(([key, labelKey]) => (
        <FieldRow
          key={key}
          label={t(labelKey)}
          value={draft.postingAccounts[key]}
          editable={editable}
          onChange={value => patch({ postingAccounts: { ...draft.postingAccounts, [key]: value } })}
        />
      ))}
    </Card>
  )
}
