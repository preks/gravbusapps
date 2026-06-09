import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { createCrmTaskExportDefinition } from '../crmTaskExportDefinition'
import translations from '../_i18n'

export interface CrmTaskExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const CrmTaskExportView: React.FC<CrmTaskExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchCustomerTasks } = useCustomerTasks(context)

  const definition = useMemo(
    () => ({
      ...createCrmTaskExportDefinition(fetchCustomerTasks),
      entityLabel: t('task-entity-type')
    }),
    [fetchCustomerTasks, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.task}
      headerTitle={t('task-page-title')}
      headerDescription={t('task-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmTaskExportView"
    />
  )
}

export default CrmTaskExportView
