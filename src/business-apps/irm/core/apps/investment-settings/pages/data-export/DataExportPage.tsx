import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataExportLayout, type DataExportConfig } from '@/common/components/common-relations/apps/data-export'
import { createExportEntityCard } from '@/common/components/common-relations/apps/data-export/config/exportCardFactory'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { IrmLeadExportView } from './views/IrmLeadExportView'
import { IrmContactExportView } from './views/IrmContactExportView'
import { IrmAccountExportView } from './views/IrmAccountExportView'
import { IrmOpportunityExportView } from './views/IrmOpportunityExportView'
import { IrmInvestmentExportView } from './views/IrmInvestmentExportView'
import { IrmInvestmentReportExportView } from './views/IrmInvestmentReportExportView'
import { IrmActivityExportView } from './views/IrmActivityExportView'
import { IrmTaskExportView } from './views/IrmTaskExportView'
import translations from './_i18n'

export interface IrmDataExportPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const IrmDataExportPage: React.FC<IrmDataExportPageProps> = ({ onBack, prefixDataTestId, ...context }) => {
  const { t } = useTranslation(translations)

  const config = useMemo<DataExportConfig>(
    () => ({
      headerLabel: t('data-export-header-title'),
      headerDescription: t('data-export-header-description'),
      searchPlaceholder: t('data-export-search-placeholder'),
      prefixDataTestId: prefixDataTestId ?? 'IrmDataExport',
      validEntityTypes: new Set([
        'lead',
        'contact',
        'account',
        'opportunity',
        'investment',
        'investment-report',
        'activity',
        'task'
      ]),
      entityItems: [
        createExportEntityCard(t('card-lead-title'), RELATION_ENTITY_ICONS.lead, 'lead'),
        createExportEntityCard(t('card-contact-title'), RELATION_ENTITY_ICONS.contact, 'contact'),
        createExportEntityCard(t('card-account-title'), RELATION_ENTITY_ICONS.account, 'account'),
        createExportEntityCard(t('card-opportunity-title'), RELATION_ENTITY_ICONS.opportunity, 'opportunity'),
        createExportEntityCard(t('card-investment-title'), RELATION_ENTITY_ICONS.investment, 'investment'),
        createExportEntityCard(
          t('card-investment-report-title'),
          RELATION_ENTITY_ICONS.investmentReport,
          'investment-report'
        ),
        createExportEntityCard(t('card-activity-title'), RELATION_ENTITY_ICONS.activity, 'activity'),
        createExportEntityCard(t('card-task-title'), RELATION_ENTITY_ICONS.task, 'task')
      ],
      entityViews: {
        lead: IrmLeadExportView,
        contact: IrmContactExportView,
        account: IrmAccountExportView,
        opportunity: IrmOpportunityExportView,
        investment: IrmInvestmentExportView,
        'investment-report': IrmInvestmentReportExportView,
        activity: IrmActivityExportView,
        task: IrmTaskExportView
      }
    }),
    [prefixDataTestId, t]
  )

  return <DataExportLayout config={config} onBack={onBack} {...context} />
}

export default IrmDataExportPage
