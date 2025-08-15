import { InvestmentArea, InvestmentQuickAction } from '../types';

export const investmentAreas: InvestmentArea[] = [
  // CRM Areas (identical to CRM functionality)
  {
    id: 'leads',
    title: 'Leads',
    description: 'Manage prospects and potential customers in your sales pipeline',
    icon: 'RiUserAddLine',
    category: 'crm',
    path: '/crm/leads'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Track and manage sales opportunities through your pipeline',
    icon: 'RiTargetLine',
    category: 'crm',
    path: '/crm/opportunities'
  },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Manage company and organization records and relationships',
    icon: 'RiBuildingLine',
    category: 'crm',
    path: '/crm/accounts'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Maintain individual person records and contact information',
    icon: 'RiContactsLine',
    category: 'crm',
    path: '/crm/contacts'
  },
  
  // Investment Areas
  {
    id: 'investments',
    title: 'Investments',
    description: 'Comprehensive investment portfolio management and tracking',
    icon: 'RiFundsLine',
    category: 'portfolio',
    path: '/investments'
  },
  
  // Analytics & Reporting
  {
    id: 'analytics-reporting',
    title: 'Analytics & Reporting',
    description: 'Advanced analytics, performance metrics, and comprehensive reporting',
    icon: 'RiBarChartLine',
    category: 'analytics',
    path: '/investments/analytics'
  }
];

export const investmentQuickActions: InvestmentQuickAction[] = [
  {
    id: 'add-lead',
    label: 'Add New Lead',
    icon: 'RiUserAddLine',
    action: 'create-lead'
  },
  {
    id: 'create-opportunity',
    label: 'Create Opportunity',
    icon: 'RiTargetLine',
    action: 'create-opportunity'
  },
  {
    id: 'add-contact',
    label: 'Add Contact',
    icon: 'RiContactsLine',
    action: 'create-contact'
  },
  {
    id: 'add-account',
    label: 'Add Account',
    icon: 'RiBuildingLine',
    action: 'create-account'
  },
  {
    id: 'add-investment',
    label: 'Add Investment',
    icon: 'RiFundsLine',
    action: 'create-investment'
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: 'RiFileTextLine',
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