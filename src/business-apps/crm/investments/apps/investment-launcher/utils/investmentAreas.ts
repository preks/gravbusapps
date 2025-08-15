import { InvestmentArea, InvestmentQuickAction } from '../types';
import { 
  UserPlus, 
  Target, 
  Building,
  AddressBook,
  FileText,
  ChartBar,
  Wallet
} from '@phosphor-icons/react';

export const investmentAreas: InvestmentArea[] = [
  // CRM Areas (identical to CRM functionality)
  {
    id: 'leads',
    title: 'Leads',
    description: 'Manage prospects and potential customers in your sales pipeline',
    icon: UserPlus,
    category: 'crm',
    path: '/crm/leads'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Track and manage sales opportunities through your pipeline',
    icon: Target,
    category: 'crm',
    path: '/crm/opportunities'
  },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Manage company and organization records and relationships',
    icon: Building,
    category: 'crm',
    path: '/crm/accounts'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Maintain individual person records and contact information',
    icon: AddressBook,
    category: 'crm',
    path: '/crm/contacts'
  },
  
  // Investment Areas
  {
    id: 'investments',
    title: 'Investments',
    description: 'Comprehensive investment portfolio management and tracking',
    icon: Wallet,
    category: 'portfolio',
    path: '/investments'
  },
  
  // Analytics & Reporting
  {
    id: 'analytics-reporting',
    title: 'Analytics & Reporting',
    description: 'Advanced analytics, performance metrics, and comprehensive reporting',
    icon: ChartBar,
    category: 'analytics',
    path: '/investments/analytics'
  }
];

export const investmentQuickActions: InvestmentQuickAction[] = [
  {
    id: 'add-lead',
    label: 'Add New Lead',
    icon: UserPlus,
    action: 'create-lead'
  },
  {
    id: 'create-opportunity',
    label: 'Create Opportunity',
    icon: Target,
    action: 'create-opportunity'
  },
  {
    id: 'add-contact',
    label: 'Add Contact',
    icon: AddressBook,
    action: 'create-contact'
  },
  {
    id: 'add-account',
    label: 'Add Account',
    icon: Building,
    action: 'create-account'
  },
  {
    id: 'add-investment',
    label: 'Add Investment',
    icon: Wallet,
    action: 'create-investment'
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: FileText,
    action: 'generate-report'
  }
];

export const categoryLabels = {
  crm: 'Customer Relationship Management',
  portfolio: 'Investment Portfolio',
  analytics: 'Analytics & Reporting'
};

export const getInvestmentAreasByCategory = () => {
  return investmentAreas.reduce((acc, area) => {
    if (!acc[area.category]) {
      acc[area.category] = [];
    }
    acc[area.category].push(area);
    return acc;
  }, {} as Record<string, InvestmentArea[]>);
}; 