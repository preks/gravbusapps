import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmEntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { InvestmentGroupImportDefinition } from '../../types/commonInvestmentImportTypes'
import translations from './_i18n'

export interface GenericInvestmentReportImportViewProps extends BusinessAppContextProps {
  definition: InvestmentGroupImportDefinition
  onBack?: () => void
  'data-testid'?: string
}

export const GenericInvestmentReportImportView: React.FC<GenericInvestmentReportImportViewProps> = ({
  definition,
  onBack,
  'data-testid': testId,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const { group, importConfig, labels } = definition

  const groupLabel = group.label
  const groupLabelLower = groupLabel.toLowerCase()
  const genericArgs = { groupLabel, groupLabelLower }

  const resolve = (key: string | undefined, genericKey: string): string => (key ? t(key) : t(genericKey, genericArgs))
  const resolvedTestId = testId ?? labels.dataTestIdPrefix ?? `${group.tabId}-investment-report-import-view`

  return (
    <IrmEntityImportView
      config={importConfig}
      headerTitle={resolve(labels.pageTitleKey, 'page-title-generic-report')}
      headerDescription={resolve(labels.pageDescriptionKey, 'page-description-generic-report')}
      entityType={resolve(labels.entityTypePluralKey, 'entity-plural-generic-report')}
      entityTypeSingular={resolve(labels.entityTypeSingularKey, 'entity-singular-generic-report')}
      onBack={onBack}
      data-testid={resolvedTestId}
      {...context}
    />
  )
}

export default GenericInvestmentReportImportView
