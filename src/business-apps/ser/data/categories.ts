import { ServiceCategory } from '../types';

/**
 * Seed service categories for Services+ POC
 * Based on Services+ Contract specifications
 */
export const serviceCategories: ServiceCategory[] = [
  {
    id: 'hr',
    name: 'Human Resources',
    icon: 'users',
    description: 'Employee lifecycle, contracts, and HR processes',
    order: 1
  },
  {
    id: 'it',
    name: 'Information Technology',
    icon: 'laptop',
    description: 'Hardware, software, and technical support',
    order: 2
  },
  {
    id: 'travel',
    name: 'Travel and Business Trips',
    icon: 'plane',
    description: 'Business travel, bookings, and travel-related requests',
    order: 3
  },
  {
    id: 'facilities',
    name: 'Facilities and Workplace',
    icon: 'building',
    description: 'Office space, facilities, and workplace management',
    order: 4
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'dollar-sign',
    description: 'Financial processes, vendors, and budget management',
    order: 5
  },
  {
    id: 'procurement',
    name: 'Procurement',
    icon: 'shopping-cart',
    description: 'Purchase requests, contracts, and supplier management',
    order: 6
  },
  {
    id: 'legal',
    name: 'Legal',
    icon: 'file-text',
    description: 'Legal documents, contracts, and compliance',
    order: 7
  },
  {
    id: 'security',
    name: 'Security',
    icon: 'shield',
    description: 'Security incidents, data protection, and compliance',
    order: 8
  },
  {
    id: 'access-identity',
    name: 'Access and Identity',
    icon: 'key',
    description: 'User access, permissions, and identity management',
    order: 9
  },
  {
    id: 'data-analytics',
    name: 'Data and Analytics',
    icon: 'bar-chart',
    description: 'BI dashboards, data analysis, and reporting',
    order: 10
  },
  {
    id: 'learning-development',
    name: 'Learning and Development',
    icon: 'book',
    description: 'Training, certifications, and professional development',
    order: 11
  },
  {
    id: 'fleet',
    name: 'Fleet Management',
    icon: 'car',
    description: 'Company vehicles, fuel cards, and fleet operations',
    order: 12
  },
  {
    id: 'admin',
    name: 'Administrative',
    icon: 'clipboard',
    description: 'Office supplies, events, and general administrative support',
    order: 13
  },
  {
    id: 'flow-templates',
    name: 'Flow Templates',
    icon: 'workflow', // Note: will map to Tree icon in iconMapping
    description: 'Dynamic workflow templates from custom-flow-engine with automatic form generation',
    order: 0 // Show first in the list
  }
];

// Helper functions
export const getCategoryById = (id: string): ServiceCategory | undefined => {
  return serviceCategories.find(category => category.id === id);
};

export const getCategoriesByIds = (ids: string[]): ServiceCategory[] => {
  return serviceCategories.filter(category => ids.includes(category.id));
};

export const getSortedCategories = (): ServiceCategory[] => {
  return [...serviceCategories].sort((a, b) => a.order - b.order);
};