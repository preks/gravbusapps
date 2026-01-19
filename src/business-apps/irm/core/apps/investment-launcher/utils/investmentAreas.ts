import { InvestmentArea, InvestmentQuickAction } from '../types'
import {
  UserPlusIcon,
  TargetIcon,
  BuildingIcon,
  AddressBookIcon,
  FileTextIcon,
  ChartBarIcon,
  WalletIcon
} from '@phosphor-icons/react'

export const investmentAreas: InvestmentArea[] = [
  // CRM Areas (identical to CRM functionality)
  {
    id: 'leads',
    title: 'Leads',
    description: 'Manage prospects and potential customers in your sales pipeline',
    icon: UserPlusIcon,
    category: 'crm',
    path: '/crm/leads'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Track and manage sales opportunities through your pipeline',
    icon: TargetIcon,
    category: 'crm',
    path: '/crm/opportunities'
  },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Manage company and organization records and relationships',
    icon: BuildingIcon,
    category: 'crm',
    path: '/crm/accounts'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Maintain individual person records and contact information',
    icon: AddressBookIcon,
    category: 'crm',
    path: '/crm/contacts'
  },

  // Investment Areas
  {
    id: 'investments',
    title: 'Investments',
    description: 'Comprehensive investment portfolio management and tracking',
    icon: WalletIcon,
    category: 'portfolio',
    path: '/investments'
  },

  // Analytics & Reporting
  {
    id: 'analytics-reporting',
    title: 'Analytics and Reporting',
    description: 'Advanced analytics, performance metrics, and comprehensive reporting',
    icon: ChartBarIcon,
    category: 'analytics',
    path: '/investments/analytics'
  }
]

export const investmentQuickActions: InvestmentQuickAction[] = [
  {
    id: 'add-lead',
    label: 'Add New Lead',
    icon: UserPlusIcon,
    action: 'create-lead'
  },
  {
    id: 'create-opportunity',
    label: 'Create Opportunity',
    icon: TargetIcon,
    action: 'create-opportunity'
  },
  {
    id: 'add-contact',
    label: 'Add Contact',
    icon: AddressBookIcon,
    action: 'create-contact'
  },
  {
    id: 'add-account',
    label: 'Add Account',
    icon: BuildingIcon,
    action: 'create-account'
  },
  {
    id: 'add-investment',
    label: 'Add Investment',
    icon: WalletIcon,
    action: 'create-investment'
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: FileTextIcon,
    action: 'generate-report'
  }
]

export const categoryLabels = {
  crm: 'Customer Relationship Management',
  portfolio: 'Investment Portfolio',
  analytics: 'Analytics & Reporting'
}

export const getInvestmentAreasByCategory = () => {
  return investmentAreas.reduce(
    (acc, area) => {
      if (!acc[area.category]) {
        acc[area.category] = []
      }
      acc[area.category].push(area)
      return acc
    },
    {} as Record<string, InvestmentArea[]>
  )
}
