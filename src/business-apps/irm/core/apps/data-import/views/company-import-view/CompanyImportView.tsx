import React, { useMemo, useState } from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmEntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { investmentCompanyImportConfig } from '@/common/data/investment/types/investmentCompanyImportConfig'
import { investmentCompanyImportOverride } from '@/business-apps/irm/core/apps/data-import/config/overrides/investmentCompanyImportOverride'
import { InvestmentCompanyGroupSelect } from '@/common/components/investment/selects/investment-company-group-select'
import translations from './_i18n'

export interface CompanyImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const CompanyImportView: React.FC<CompanyImportViewProps> = ({
  onBack,
  'data-testid': testId = 'company-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const config = useMemo(() => ({ ...investmentCompanyImportConfig, ...investmentCompanyImportOverride }), [])

  const additionalEnforcedFields = useMemo(() => {
    if (!selectedGroupId) return undefined
    return { investmentCompanyGroupRef: selectedGroupId }
  }, [selectedGroupId])

  const customSelectsSlot = (
    <div>
      <Label>{t('company-group-label')}</Label>
      <InvestmentCompanyGroupSelect
        value={selectedGroupId}
        onValueChange={setSelectedGroupId}
        businessAppContext={context}
        className="gba:mt-2"
        dataTestId={`${testId}-group-select`}
      />
    </div>
  )

  return (
    <IrmEntityImportView
      config={config}
      headerTitle={t('company-page-title')}
      headerDescription={t('company-page-description')}
      entityType={t('company-entity-type')}
      entityTypeSingular={t('company-entity-type-singular')}
      additionalEnforcedFields={additionalEnforcedFields}
      customSelectsSlot={customSelectsSlot}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default CompanyImportView
