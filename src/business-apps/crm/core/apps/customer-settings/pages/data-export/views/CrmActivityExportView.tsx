import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { createCrmActivityExportDefinition } from '../crmActivityExportDefinition'
import translations from '../_i18n'

export interface CrmActivityExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const CrmActivityExportView: React.FC<CrmActivityExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchCustomerActivities } = useCustomerActivities(context)

  const definition = useMemo(
    () => ({
      ...createCrmActivityExportDefinition(fetchCustomerActivities),
      entityLabel: t('activity-entity-type')
    }),
    [fetchCustomerActivities, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.activity}
      headerTitle={t('activity-page-title')}
      headerDescription={t('activity-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmActivityExportView"
    />
  )
}

export default CrmActivityExportView
