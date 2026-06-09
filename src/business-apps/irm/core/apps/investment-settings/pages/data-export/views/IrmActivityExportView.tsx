import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities'
import { createIrmActivityExportDefinition } from '../irmActivityExportDefinition'
import translations from '../_i18n'

export interface IrmActivityExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const IrmActivityExportView: React.FC<IrmActivityExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchInvestmentActivities } = useGetInvestmentActivities(context)

  const definition = useMemo(
    () => ({
      ...createIrmActivityExportDefinition(fetchInvestmentActivities),
      entityLabel: t('activity-entity-type')
    }),
    [fetchInvestmentActivities, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.activity}
      headerTitle={t('activity-page-title')}
      headerDescription={t('activity-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmActivityExportView"
    />
  )
}

export default IrmActivityExportView
