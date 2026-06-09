import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { createIrmTaskExportDefinition } from '../irmTaskExportDefinition'
import translations from '../_i18n'

export interface IrmTaskExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const IrmTaskExportView: React.FC<IrmTaskExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchInvestmentTasks } = useInvestmentTasks(context)

  const definition = useMemo(
    () => ({
      ...createIrmTaskExportDefinition(fetchInvestmentTasks),
      entityLabel: t('task-entity-type')
    }),
    [fetchInvestmentTasks, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.task}
      headerTitle={t('task-page-title')}
      headerDescription={t('task-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmTaskExportView"
    />
  )
}

export default IrmTaskExportView
