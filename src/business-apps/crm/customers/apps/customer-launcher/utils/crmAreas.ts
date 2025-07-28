import { CrmArea, QuickAction } from '../types';

export const crmAreas: CrmArea[] = [
  // Sales Management
  {
    id: 'leads',
    title: 'Leads',
    description: 'Manage prospects and potential customers in your sales pipeline',
    icon: 'RiUserAddLine',
    category: 'sales',
    path: '/crm/leads'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Track and manage sales opportunities through your pipeline',
    icon: 'RiTargetLine',
    category: 'sales',
    path: '/crm/opportunities'
  },
  
  // Customer Management
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Manage company and organization records and relationships',
    icon: 'RiBuildingLine',
    category: 'customer',
    path: '/crm/accounts'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Maintain individual person records and contact information',
    icon: 'RiContactsLine',
    category: 'customer',
    path: '/crm/contacts'
  },
  
  // Business Intelligence
  {
    id: 'reports',
    title: 'Reports',
    description: 'Generate and view detailed reports on CRM data and activities',
    icon: 'RiFileTextLine',
    category: 'intelligence',
    path: '/crm/reports'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Analyze performance metrics and gain insights from your data',
    icon: 'RiBarChartLine',
    category: 'intelligence',
    path: '/crm/analytics'
  }
];

export const quickActions: QuickAction[] = [
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
    action: 'save-opportunity'
  },
  {
    id: 'add-contact',
    label: 'Add Contact',
    icon: 'RiContactsLine',
    action: 'save-contact'
  },
  {
    id: 'add-account',
    label: 'Add Account',
    icon: 'RiBuildingLine',
    action: 'create-account'
  },
  {
    id: 'import-data',
    label: 'Import Data',
    icon: 'RiUploadLine',
    action: 'import-data'
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: 'RiFileTextLine',
    action: 'generate-report'
  }
];

export const categoryLabels = {
  sales: 'Sales Management',
  customer: 'Customer Management',
  intelligence: 'Business Intelligence'
};

export const getCrmAreasByCategory = () => {
  return crmAreas.reduce((acc, area) => {
    if (!acc[area.category]) {
      acc[area.category] = [];
    }
    acc[area.category].push(area);
    return acc;
  }, {} as Record<string, CrmArea[]>);
};