/**
 * Generic Investment Import View
 *
 * Single IRM view that drives every `InvestmentGroup` card entry. Labels
 * come from `InvestmentGroupImportDefinition.labels` (curated i18n keys
 * per known group, generic `${key}-generic` fallbacks otherwise). The
 * underlying `ImportConfig` is looked up through
 * `getGroupImportConfiguration` at the call site.
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmEntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { InvestmentGroupImportDefinition } from '../../types/commonInvestmentImportTypes'
import translations from './_i18n'

export interface GenericInvestmentImportViewProps extends BusinessAppContextProps {
  definition: InvestmentGroupImportDefinition
  onBack?: () => void
  'data-testid'?: string
}

export const GenericInvestmentImportView: React.FC<GenericInvestmentImportViewProps> = ({
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

  const resolvedTestId = testId ?? labels.dataTestIdPrefix ?? `${group.tabId}-investment-import-view`

  return (
    <IrmEntityImportView
      config={importConfig}
      headerTitle={resolve(labels.pageTitleKey, 'page-title-generic')}
      headerDescription={resolve(labels.pageDescriptionKey, 'page-description-generic')}
      entityType={resolve(labels.entityTypePluralKey, 'entity-plural-generic')}
      entityTypeSingular={resolve(labels.entityTypeSingularKey, 'entity-singular-generic')}
      onBack={onBack}
      data-testid={resolvedTestId}
      {...context}
    />
  )
}

export default GenericInvestmentImportView
