import { UserIcon, IdentificationCardIcon, BuildingsIcon, ChartLineIcon } from '@phosphor-icons/react'
import { DataImportConfig } from '@/common/components/common-relations/apps/data-import/types/configTypes'
import { createEntityCard } from '@/common/components/common-relations/apps/data-import/config/cardFactory'
import { LeadImportView } from '../views/lead-import-view'
import { ContactImportView } from '../views/contact-import-view'
import { AccountImportView } from '../views/account-import-view'
import { OpportunityImportView } from '../views/opportunity-import-view'

export const createCrmDataImportConfig = (): DataImportConfig => ({
  headerLabel: 'Data Import',
  headerDescription:
    'Import data from CSV files with AI-powered field mapping. Upload your file, review suggested mappings, and import.',
  searchPlaceholder: 'Search import types...',
  backUrl: '/platform/use',
  prefixDataTestId: 'DataImport',

  validEntityTypes: new Set(['lead', 'contact', 'account', 'opportunity']),

  entityCards: [
    createEntityCard(
      'Import Leads',
      'Import potential customers from CSV with company information, contact details, and lead management fields. AI-powered field mapping helps you quickly map your data.',
      UserIcon,
      'Start Lead Import',
      'lead'
    ),
    createEntityCard(
      'Import Contacts',
      'Import individual contacts from CSV with personal information, contact details, and language preferences. AI automatically detects and maps fields.',
      IdentificationCardIcon,
      'Start Contact Import',
      'contact'
    ),
    createEntityCard(
      'Import Accounts',
      'Import company accounts from CSV with organization details, industry information, revenue data, and communication channels. AI-powered mapping streamlines the process.',
      BuildingsIcon,
      'Start Account Import',
      'account'
    ),
    createEntityCard(
      'Import Opportunities',
      'Import sales opportunities from CSV with pipeline stages, forecasts, and deal information. AI-powered mapping streamlines the process.',
      ChartLineIcon,
      'Start Opportunity Import',
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
