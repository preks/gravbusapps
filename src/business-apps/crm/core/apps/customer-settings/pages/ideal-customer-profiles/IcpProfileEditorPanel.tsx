import React from 'react'
import { Button, EmptyState, Input, Label, Spinner, useTranslation } from '@newwork/nw-design-system'
import customerSettingsI18n from '../../_i18n'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import { TranslatableField } from '@/components/translatable-field'
import {
  DEFAULT_CATALOG_LOCALE,
  DEFAULT_CATALOG_TRANSLATIONS,
  type CatalogTranslationMap
} from '@/common/components/common-relations/setting-pages/utils/catalogTranslations'
import { IcpCriteriaForm } from './IcpCriteriaForm'
import { isWeightsTotalOverLimit, type IcpFormState } from './icpFormState'

export interface IcpProfileEditorPanelProps {
  accessToken: string
  selectedId: string | null
  detailLoading: boolean
  selectedEntry: CatalogEntry | null
  profileName: string
  onProfileNameChange: (name: string) => void
  profileNameTranslations: CatalogTranslationMap
  onProfileNameTranslationsChange: (translations: CatalogTranslationMap) => void
  formState: IcpFormState
  onFormStateChange: (next: IcpFormState) => void
  saving: boolean
  onSave: () => void
  dataTestIdPrefix: string
}

export const IcpProfileEditorPanel: React.FC<IcpProfileEditorPanelProps> = ({
  accessToken,
  selectedId,
  detailLoading,
  selectedEntry,
  profileName,
  onProfileNameChange,
  profileNameTranslations,
  onProfileNameTranslationsChange,
  formState,
  onFormStateChange,
  saving,
  onSave,
  dataTestIdPrefix
}) => {
  const { t } = useTranslation(customerSettingsI18n)

  if (!selectedId) {
    return <EmptyState title={t('icp-select-profile-title')} description={t('icp-select-profile-hint')} />
  }

  if (detailLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!selectedEntry) {
    return null
  }

  const saveDisabled = saving || isWeightsTotalOverLimit(formState)

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-4">
        <div className="gba:space-y-4 gba:flex-1 gba:min-w-48">
          <div className="gba:space-y-2">
            <Label htmlFor={`${dataTestIdPrefix}-code`}>{t('icp-code')}</Label>
            <Input
              id={`${dataTestIdPrefix}-code`}
              value={selectedEntry.code}
              disabled
              data-testid={`${dataTestIdPrefix}-code`}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor={`${dataTestIdPrefix}-name`}>{t('icp-display-name')}</Label>
            <TranslatableField
              label=""
              value={profileName}
              onChange={onProfileNameChange}
              translations={profileNameTranslations || DEFAULT_CATALOG_TRANSLATIONS}
              onTranslationsChange={onProfileNameTranslationsChange}
              defaultLanguage={DEFAULT_CATALOG_LOCALE}
              data-testid={`${dataTestIdPrefix}-name`}
            />
          </div>
        </div>
        <Button type="button" onClick={onSave} disabled={saveDisabled} data-testid={`${dataTestIdPrefix}-save`}>
          {saving ? (
            <>
              <Spinner size="sm" className="gba:mr-2" />
              {t('icp-saving')}
            </>
          ) : (
            t('icp-save-profile')
          )}
        </Button>
      </div>

      <IcpCriteriaForm
        formState={formState}
        onChange={onFormStateChange}
        dataTestIdPrefix={dataTestIdPrefix}
        accessToken={accessToken}
      />
    </div>
  )
}
