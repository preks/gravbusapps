import { UserIcon, IdentificationCardIcon, BuildingsIcon, TrendUpIcon, ChartLineIcon } from '@phosphor-icons/react'
import { DataImportConfig } from '@/common/components/common-relations/apps/data-import/types/configTypes'
import {
  createEntityCard,
  createMultiEntryCard
} from '@/common/components/common-relations/apps/data-import/config/cardFactory'
import { LeadImportView } from '../views/lead-import-view'
import { ContactImportView } from '../views/contact-import-view'
import { AccountImportView } from '../views/account-import-view'
import { OpportunityImportView } from '../views/opportunity-import-view'
import { RealEstateInvestmentImportView } from '../views/real-estate-investment-import-view/RealEstateInvestmentImportView'
import { EquityInvestmentImportView } from '../views/equity-investment-import-view/EquityInvestmentImportView'
import { LiquidFundInvestmentImportView } from '../views/liquid-fund-investment-import-view/LiquidFundInvestmentImportView'

export const createIrmDataImportConfig = (): DataImportConfig => ({
  headerLabel: 'Data Import',
  headerDescription:
    'Import data from CSV files with AI-powered field mapping. Upload your file, review suggested mappings, and import.',
  searchPlaceholder: 'Search import types...',
  backUrl: '/platform/use',
  prefixDataTestId: 'DataImport',

  validEntityTypes: new Set([
    'lead',
    'contact',
    'account',
    'opportunity',
    'real-estate-investment',
    'equity-investment',
    'liquid-fund-investment'
  ]),

  entityCards: [
    createEntityCard(
      'Import Leads',
      'Import investment leads from CSV with company information, investment details, financial data, and property information. AI-powered field mapping helps you quickly map your data.',
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
      'Import investment opportunities from CSV with pipeline stages, forecasts, deal information, and investment-specific fields. AI-powered mapping streamlines the process.',
      ChartLineIcon,
      'Start Opportunity Import',
      'opportunity'
    ),
    createMultiEntryCard(
      'Import Investments',
      'Import real estate properties, equity investments, or liquid funds with AI-powered field mapping. Choose your investment type to get started.',
      TrendUpIcon,
      [
        { label: 'Real Estate Investments', entityType: 'real-estate-investment' },
        { label: 'Equity Investments', entityType: 'equity-investment' },
        { label: 'Liquid Fund Investments', entityType: 'liquid-fund-investment' }
      ]
    )
  ],

  entityViews: {
    lead: LeadImportView,
    contact: ContactImportView,
    account: AccountImportView,
    opportunity: OpportunityImportView,
    'real-estate-investment': RealEstateInvestmentImportView,
    'equity-investment': EquityInvestmentImportView,
    'liquid-fund-investment': LiquidFundInvestmentImportView
  }
})
