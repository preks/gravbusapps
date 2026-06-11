import React, { useEffect, useState } from 'react'
import {
  PageLayout,
  Card,
  Alert,
  AlertDescription,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toaster,
  useTranslation
} from '@newwork/nw-design-system'
import { GearIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../../common/_i18n'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { useFinanceSettings } from '../../common/hooks/useFinanceSettings'
import type { FinanceSettingsDocument } from '../../common/network/financeAdminClient'
import { ROUNDING_MODES, type RoundingMode } from '../../common/types'
import { PeriodClosePanel } from './PeriodClosePanel'

type FinanceSettingsProps = BusinessAppContextProps

function FieldRow({
  label,
  value,
  editable,
  onChange,
  type = 'text'
}: {
  label: string
  value: string
  editable: boolean
  onChange?: (value: string) => void
  type?: string
}) {
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

const FinanceSettings: React.FC<FinanceSettingsProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const permissions = useBillingPermissions(props)
  const { settings, loading, saving, error, notSeeded, save } = useFinanceSettings(props)
  const [tab, setTab] = useState('legal-entities')
  const [draft, setDraft] = useState<FinanceSettingsDocument | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const editable = permissions.canEditSettings

  const patch = (next: Partial<FinanceSettingsDocument>) => setDraft(prev => (prev ? { ...prev, ...next } : prev))

  const handleSave = async () => {
    if (!draft) return
    try {
      await save(draft)
      toast.success(t('billing-settings-saved'))
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : t('billing-settings-save-error'))
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="finance-settings-loading"
      >
        <Spinner />
      </div>
    )
  }

  if (error || notSeeded || !draft) {
    return (
      <PageLayout
        headerIcon={GearIcon}
        headerTitle={t('billing-settings-title')}
        headerDescription={t('billing-settings-description')}
        variant="default"
      >
        <Alert data-testid="finance-settings-error">
          <AlertDescription>{error ?? t('billing-settings-not-seeded')}</AlertDescription>
        </Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      headerIcon={GearIcon}
      headerTitle={t('billing-settings-title')}
      headerDescription={t('billing-settings-description')}
      variant="default"
    >
      {!editable && (
        <Alert className="gba:mb-4" data-testid="settings-readonly-notice">
          <AlertDescription>{t('billing-settings-readonly-notice')}</AlertDescription>
        </Alert>
      )}

      {editable && (
        <div className="gba:flex gba:justify-end gba:mb-4">
          <Button size="sm" onClick={handleSave} disabled={saving} data-testid="settings-save-button">
            {t('billing-settings-save')}
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="gba:inline-flex gba:w-auto gba:flex-wrap">
          <TabsTrigger value="legal-entities">{t('billing-settings-tab-legal-entities')}</TabsTrigger>
          <TabsTrigger value="tax">{t('billing-settings-tab-tax')}</TabsTrigger>
          <TabsTrigger value="currencies">{t('billing-settings-tab-currencies')}</TabsTrigger>
          <TabsTrigger value="terms">{t('billing-settings-tab-terms')}</TabsTrigger>
          <TabsTrigger value="numbering">{t('billing-settings-tab-numbering')}</TabsTrigger>
          <TabsTrigger value="posting">{t('billing-settings-tab-posting')}</TabsTrigger>
          <TabsTrigger value="period-close">{t('billing-period-close-tab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="legal-entities" className="gba:mt-4">
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
                  onChange={value =>
                    patch({
                      legalEntities: draft.legalEntities.map(e => (e.id === entity.id ? { ...e, name: value } : e))
                    })
                  }
                />
                <FieldRow
                  label={t('billing-settings-vat-id')}
                  value={entity.vatId ?? ''}
                  editable={editable}
                  onChange={value =>
                    patch({
                      legalEntities: draft.legalEntities.map(e => (e.id === entity.id ? { ...e, vatId: value } : e))
                    })
                  }
                />
                <FieldRow
                  label={t('billing-settings-accounting-currency')}
                  value={entity.accountingCurrency}
                  editable={editable}
                  onChange={value =>
                    patch({
                      legalEntities: draft.legalEntities.map(e =>
                        e.id === entity.id ? { ...e, accountingCurrency: value } : e
                      )
                    })
                  }
                />
                <FieldRow
                  label={t('billing-settings-default-currency')}
                  value={entity.defaultCurrency}
                  editable={editable}
                  onChange={value =>
                    patch({
                      legalEntities: draft.legalEntities.map(e =>
                        e.id === entity.id ? { ...e, defaultCurrency: value } : e
                      )
                    })
                  }
                />
                <FieldRow
                  label={t('billing-settings-iban')}
                  value={entity.bankAccounts[0]?.iban ?? ''}
                  editable={editable && entity.bankAccounts.length > 0}
                  onChange={value =>
                    patch({
                      legalEntities: draft.legalEntities.map(e =>
                        e.id === entity.id
                          ? {
                              ...e,
                              bankAccounts: e.bankAccounts.map((account, index) =>
                                index === 0 ? { ...account, iban: value } : account
                              )
                            }
                          : e
                      )
                    })
                  }
                />
                <FieldRow
                  label={t('billing-settings-footer')}
                  value={entity.invoiceFooter ?? ''}
                  editable={editable}
                  onChange={value =>
                    patch({
                      legalEntities: draft.legalEntities.map(e =>
                        e.id === entity.id ? { ...e, invoiceFooter: value } : e
                      )
                    })
                  }
                />
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="gba:mt-4">
          <Card className="gba:p-6" data-testid="settings-tax">
            {draft.taxCategories.map(category => (
              <FieldRow
                key={category.id}
                label={`${category.name} (${category.treatment})`}
                value={String(category.rates[0]?.ratePercent ?? 0)}
                editable={editable && category.rates.length > 0}
                type="number"
                onChange={value =>
                  patch({
                    taxCategories: draft.taxCategories.map(item =>
                      item.id === category.id
                        ? {
                            ...item,
                            rates: item.rates.map((rate, index) =>
                              index === 0 ? { ...rate, ratePercent: Number(value) } : rate
                            )
                          }
                        : item
                    )
                  })
                }
              />
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="gba:mt-4">
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
                  onValueChange={value =>
                    patch({ currencies: { ...draft.currencies, roundingMode: value as RoundingMode } })
                  }
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
        </TabsContent>

        <TabsContent value="terms" className="gba:mt-4">
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
        </TabsContent>

        <TabsContent value="numbering" className="gba:mt-4">
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
        </TabsContent>

        <TabsContent value="posting" className="gba:mt-4">
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
        </TabsContent>

        <TabsContent value="period-close" className="gba:mt-4">
          <PeriodClosePanel context={props} canManage={editable} />
        </TabsContent>
      </Tabs>
      <Toaster />
    </PageLayout>
  )
}

export default FinanceSettings
