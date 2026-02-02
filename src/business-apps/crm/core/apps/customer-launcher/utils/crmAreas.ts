import { CrmArea, QuickAction } from '../types'
import {
  UserPlusIcon,
  TargetIcon,
  BuildingIcon,
  AddressBookIcon,
  MegaphoneIcon,
  ChartBarIcon
} from '@phosphor-icons/react'

export const crmAreas: CrmArea[] = [
  // Sales Management
  {
    id: 'leads',
    title: 'Leads',
    description: 'Manage prospects and potential customers in your sales pipeline',
    icon: UserPlusIcon,
    category: 'sales',
    path: '/crm/leads'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Track and manage sales opportunities through your pipeline',
    icon: TargetIcon,
    category: 'sales',
    path: '/crm/opportunities'
  },

  // Customer Management
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Manage company and organization records and relationships',
    icon: BuildingIcon,
    category: 'customer',
    path: '/crm/accounts'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Maintain individual person records and contact information',
    icon: AddressBookIcon,
    category: 'customer',
    path: '/crm/contacts'
  },

  // Marketing & Campaigns
  {
    id: 'campaigns',
    title: 'Campaigns',
    description: 'Create and manage marketing campaigns and track performance',
    icon: MegaphoneIcon,
    category: 'marketing',
    path: '/crm/campaigns'
  },

  // Business Intelligence
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Analyze performance metrics and gain insights from your data',
    icon: ChartBarIcon,
    category: 'intelligence',
    path: '/crm/analytics'
  }
]

export const quickActions: QuickAction[] = [
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
    action: 'save-opportunity'
  },
  {
    id: 'add-contact',
    label: 'Add Contact',
    icon: AddressBookIcon,
    action: 'save-contact'
  },
  {
    id: 'add-account',
    label: 'Add Account',
    icon: BuildingIcon,
    action: 'create-account'
  }
]

export const categoryLabels = {
  sales: 'Sales Management',
  customer: 'Customer Management',
  marketing: 'Marketing & Campaigns',
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
