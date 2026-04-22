import { UserIcon, IdentificationCardIcon, BuildingsIcon, ChartLineIcon } from '@phosphor-icons/react'
import { DataImportConfig } from '@/common/components/common-relations/apps/data-import/types/configTypes'
import { createEntityCard } from '@/common/components/common-relations/apps/data-import/config/cardFactory'
import { LeadImportView } from '../views/lead-import-view'
import { ContactImportView } from '../views/contact-import-view'
import { AccountImportView } from '../views/account-import-view'
import { OpportunityImportView } from '../views/opportunity-import-view'

export interface CrmDataImportCardLabels {
  title: string
  description: string
  buttonLabel: string
}

export interface CrmDataImportLabels {
  headerLabel: string
  headerDescription: string
  searchPlaceholder: string
  leadCard: CrmDataImportCardLabels
  contactCard: CrmDataImportCardLabels
  accountCard: CrmDataImportCardLabels
  opportunityCard: CrmDataImportCardLabels
}

export const createCrmDataImportConfig = (labels: CrmDataImportLabels): DataImportConfig => ({
  headerLabel: labels.headerLabel,
  headerDescription: labels.headerDescription,
  searchPlaceholder: labels.searchPlaceholder,
  backUrl: '/platform/use',
  prefixDataTestId: 'DataImport',

  validEntityTypes: new Set(['lead', 'contact', 'account', 'opportunity']),

  entityCards: [
    createEntityCard(labels.leadCard.title, labels.leadCard.description, UserIcon, labels.leadCard.buttonLabel, 'lead'),
    createEntityCard(
      labels.contactCard.title,
      labels.contactCard.description,
      IdentificationCardIcon,
      labels.contactCard.buttonLabel,
      'contact'
    ),
    createEntityCard(
      labels.accountCard.title,
      labels.accountCard.description,
      BuildingsIcon,
      labels.accountCard.buttonLabel,
      'account'
    ),
    createEntityCard(
      labels.opportunityCard.title,
      labels.opportunityCard.description,
      ChartLineIcon,
      labels.opportunityCard.buttonLabel,
      'opportunity'
    )
  ],

  entityViews: {
    lead: LeadImportView,
    contact: ContactImportView,
    account: AccountImportView,
    opportunity: OpportunityImportView
  }
})
