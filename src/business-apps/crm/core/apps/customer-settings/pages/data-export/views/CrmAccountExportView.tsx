import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { createCrmAccountExportDefinition } from '../crmAccountExportDefinition'
import translations from '../_i18n'

export interface CrmAccountExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const CrmAccountExportView: React.FC<CrmAccountExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchCustomerAccounts } = useCustomerAccounts(context)

  const definition = useMemo(
    () => ({
      ...createCrmAccountExportDefinition(fetchCustomerAccounts),
      entityLabel: t('account-entity-type')
    }),
    [fetchCustomerAccounts, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.account}
      headerTitle={t('account-page-title')}
      headerDescription={t('account-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmAccountExportView"
    />
  )
}

export default CrmAccountExportView
