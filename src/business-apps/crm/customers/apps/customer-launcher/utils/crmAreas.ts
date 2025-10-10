import { CrmArea, QuickAction } from '../types'
import { UserPlus, Target, Building, AddressBook, FileText, ChartBar, Upload } from '@phosphor-icons/react'

export const crmAreas: CrmArea[] = [
  // Sales Management
  {
    id: 'leads',
    title: 'Leads',
    description: 'Manage prospects and potential customers in your sales pipeline',
    icon: UserPlus,
    category: 'sales',
    path: '/crm/leads'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Track and manage sales opportunities through your pipeline',
    icon: Target,
    category: 'sales',
    path: '/crm/opportunities'
  },

  // Customer Management
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Manage company and organization records and relationships',
    icon: Building,
    category: 'customer',
    path: '/crm/accounts'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Maintain individual person records and contact information',
    icon: AddressBook,
    category: 'customer',
    path: '/crm/contacts'
  },

  // Business Intelligence
  {
    id: 'reports',
    title: 'Reports',
    description: 'Generate and view detailed reports on CRM data and activities',
    icon: FileText,
    category: 'intelligence',
    path: '/crm/reports'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Analyze performance metrics and gain insights from your data',
    icon: ChartBar,
    category: 'intelligence',
    path: '/crm/analytics'
  }
]

export const quickActions: QuickAction[] = [
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
    action: 'save-opportunity'
  },
  {
    id: 'add-contact',
    label: 'Add Contact',
    icon: AddressBook,
    action: 'save-contact'
  },
  {
    id: 'add-account',
    label: 'Add Account',
    icon: Building,
    action: 'create-account'
  },
  {
    id: 'import-data',
    label: 'Import Data',
    icon: Upload,
    action: 'import-data'
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: FileText,
    action: 'generate-report'
  }
]

export const categoryLabels = {
  sales: 'Sales Management',
  customer: 'Customer Management',
  intelligence: 'Business Intelligence'
}

export const getCrmAreasByCategory = () => {
  return crmAreas.reduce(
    (acc, area) => {
      if (!acc[area.category]) {
        acc[area.category] = []
      }
      acc[area.category].push(area)
      return acc
    },
    {} as Record<string, CrmArea[]>
  )
}
