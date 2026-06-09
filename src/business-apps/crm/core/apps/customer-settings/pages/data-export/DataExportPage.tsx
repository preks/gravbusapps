import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataExportLayout, type DataExportConfig } from '@/common/components/common-relations/apps/data-export'
import { createExportEntityCard } from '@/common/components/common-relations/apps/data-export/config/exportCardFactory'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { CrmLeadExportView } from './views/CrmLeadExportView'
import { CrmContactExportView } from './views/CrmContactExportView'
import { CrmAccountExportView } from './views/CrmAccountExportView'
import { CrmOpportunityExportView } from './views/CrmOpportunityExportView'
import { CrmCampaignExportView } from './views/CrmCampaignExportView'
import { CrmActivityExportView } from './views/CrmActivityExportView'
import { CrmTaskExportView } from './views/CrmTaskExportView'
import translations from './_i18n'

export interface CrmDataExportPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const CrmDataExportPage: React.FC<CrmDataExportPageProps> = ({ onBack, prefixDataTestId, ...context }) => {
  const { t } = useTranslation(translations)

  const config = useMemo<DataExportConfig>(
    () => ({
      headerLabel: t('data-export-header-title'),
      headerDescription: t('data-export-header-description'),
      searchPlaceholder: t('data-export-search-placeholder'),
      prefixDataTestId: prefixDataTestId ?? 'CrmDataExport',
      validEntityTypes: new Set(['lead', 'contact', 'account', 'opportunity', 'campaign', 'activity', 'task']),
      entityItems: [
        createExportEntityCard(t('card-lead-title'), RELATION_ENTITY_ICONS.lead, 'lead'),
        createExportEntityCard(t('card-contact-title'), RELATION_ENTITY_ICONS.contact, 'contact'),
        createExportEntityCard(t('card-account-title'), RELATION_ENTITY_ICONS.account, 'account'),
        createExportEntityCard(t('card-opportunity-title'), RELATION_ENTITY_ICONS.opportunity, 'opportunity'),
        createExportEntityCard(t('card-campaign-title'), RELATION_ENTITY_ICONS.campaign, 'campaign'),
        createExportEntityCard(t('card-activity-title'), RELATION_ENTITY_ICONS.activity, 'activity'),
        createExportEntityCard(t('card-task-title'), RELATION_ENTITY_ICONS.task, 'task')
      ],
      entityViews: {
        lead: CrmLeadExportView,
        contact: CrmContactExportView,
        account: CrmAccountExportView,
        opportunity: CrmOpportunityExportView,
        campaign: CrmCampaignExportView,
        activity: CrmActivityExportView,
        task: CrmTaskExportView
      }
    }),
    [prefixDataTestId, t]
  )

  return <DataExportLayout config={config} onBack={onBack} {...context} />
}

export default CrmDataExportPage
