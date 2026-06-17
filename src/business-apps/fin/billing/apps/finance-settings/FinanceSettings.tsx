import React, { useEffect, useState } from 'react'
import {
  PageLayout,
  Alert,
  AlertDescription,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Toaster,
  useTranslation
} from '@newwork/nw-design-system'
import { GearIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../../common/_i18n'
import { useBillingPermissions } from '../../common/hooks/useBillingPermissions'
import { useFinanceSettings } from '../../common/hooks/useFinanceSettings'
import type { FinanceSettingsDocument } from '../../common/settings/network/financeSettingsClient'
import { PeriodClosePanel } from './PeriodClosePanel'
import {
  CurrencySettingsPanel,
  LegalEntitiesSettingsPanel,
  NumberingSettingsPanel,
  PaymentTermsSettingsPanel,
  PostingSettingsPanel,
  TaxSettingsPanel
} from './FinanceSettingsPanels'

type FinanceSettingsProps = BusinessAppContextProps

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
          <LegalEntitiesSettingsPanel draft={draft} editable={editable} patch={patch} t={t} />
        </TabsContent>

        <TabsContent value="tax" className="gba:mt-4">
          <TaxSettingsPanel draft={draft} editable={editable} patch={patch} t={t} />
        </TabsContent>

        <TabsContent value="currencies" className="gba:mt-4">
          <CurrencySettingsPanel draft={draft} editable={editable} patch={patch} t={t} />
        </TabsContent>

        <TabsContent value="terms" className="gba:mt-4">
          <PaymentTermsSettingsPanel draft={draft} editable={editable} patch={patch} t={t} />
        </TabsContent>

        <TabsContent value="numbering" className="gba:mt-4">
          <NumberingSettingsPanel draft={draft} editable={editable} patch={patch} t={t} />
        </TabsContent>

        <TabsContent value="posting" className="gba:mt-4">
          <PostingSettingsPanel draft={draft} editable={editable} patch={patch} t={t} />
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
