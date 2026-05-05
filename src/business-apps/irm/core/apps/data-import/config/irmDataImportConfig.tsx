import {
  UserIcon,
  IdentificationCardIcon,
  BuildingsIcon,
  TrendUpIcon,
  ChartLineIcon,
  FileTextIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataImportConfig } from '@/common/components/common-relations/apps/data-import/types/configTypes'
import {
  createEntityCard,
  createMultiEntryCard
} from '@/common/components/common-relations/apps/data-import/config/cardFactory'
import { LeadImportView } from '../views/lead-import-view'
import { ContactImportView } from '../views/contact-import-view'
import { AccountImportView } from '../views/account-import-view'
import { OpportunityImportView } from '../views/opportunity-import-view'
import { GenericInvestmentImportView } from '../views/generic-investment-import-view'
import { GenericInvestmentReportImportView } from '../views/generic-investment-report-import-view'
import { InvestmentImportGroupDescriptor } from '../types/commonInvestmentImportTypes'
import { getGroupImportConfiguration } from './groupImportConfigurations'
import { getGroupReportImportConfiguration, toInvestmentReportEntryLabel } from './groupReportImportConfigurations'
import { toInvestmentEntryLabel } from './investmentGroupImportUtils'

const STATIC_ENTITY_TYPES = ['lead', 'contact', 'account', 'opportunity'] as const

export interface IrmDataImportCardLabels {
  title: string
  description: string
  buttonLabel: string
}

export interface IrmDataImportLabels {
  headerLabel: string
  headerDescription: string
  searchPlaceholder: string
  leadCard: IrmDataImportCardLabels
  contactCard: IrmDataImportCardLabels
  accountCard: IrmDataImportCardLabels
  opportunityCard: IrmDataImportCardLabels
  investmentsCard: {
    title: string
    description: string
  }
  investmentReportsCard: {
    title: string
    description: string
  }
}

export const createIrmDataImportConfig = (
  investmentGroups: InvestmentImportGroupDescriptor[],
  labels: IrmDataImportLabels
): DataImportConfig => {
  const groupDefinitions = investmentGroups.map(getGroupImportConfiguration)
  const reportDefinitions = investmentGroups.map(getGroupReportImportConfiguration)

  const investmentEntries = groupDefinitions.map(definition => ({
    label: toInvestmentEntryLabel(definition.group.label),
    entityType: definition.group.entityType
  }))

  const investmentReportEntries = reportDefinitions.map(definition => ({
    label: toInvestmentReportEntryLabel(definition.group.label),
    entityType: definition.importConfig.entityType
  }))

  const dynamicViews = Object.fromEntries(
    groupDefinitions.map(definition => [
      definition.group.entityType,
      (props: BusinessAppContextProps & { onBack?: () => void }) => (
        <GenericInvestmentImportView {...props} definition={definition} />
      )
    ])
  ) as DataImportConfig['entityViews']

  const dynamicReportViews = Object.fromEntries(
    reportDefinitions.map(definition => [
      definition.importConfig.entityType,
      (props: BusinessAppContextProps & { onBack?: () => void }) => (
        <GenericInvestmentReportImportView {...props} definition={definition} />
      )
    ])
  ) as DataImportConfig['entityViews']

  return {
    headerLabel: labels.headerLabel,
    headerDescription: labels.headerDescription,
    searchPlaceholder: labels.searchPlaceholder,
    backUrl: '/platform/use',
    prefixDataTestId: 'DataImport',

    validEntityTypes: new Set([
      ...STATIC_ENTITY_TYPES,
      ...groupDefinitions.map(definition => definition.group.entityType),
      ...reportDefinitions.map(definition => definition.importConfig.entityType)
    ]),

    entityCards: [
      createEntityCard(
        labels.leadCard.title,
        labels.leadCard.description,
        UserIcon,
        labels.leadCard.buttonLabel,
        'lead'
      ),
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
      ),
      createMultiEntryCard(
        labels.investmentsCard.title,
        labels.investmentsCard.description,
        TrendUpIcon,
        investmentEntries
      ),
      createMultiEntryCard(
        labels.investmentReportsCard.title,
        labels.investmentReportsCard.description,
        FileTextIcon,
        investmentReportEntries
      )
    ],

    entityViews: {
      lead: LeadImportView,
      contact: ContactImportView,
      account: AccountImportView,
      opportunity: OpportunityImportView,
      ...dynamicViews,
      ...dynamicReportViews
    }
  }
}
