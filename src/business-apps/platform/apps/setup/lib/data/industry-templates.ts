export type IndustryTemplate = {
  translationKey: string
  departments: string[]
  capabilities: Record<string, Record<string, string[]>>
}

export const industryTemplates: Record<string, IndustryTemplate> = {
  Manufacturing: {
    translationKey: 'manufacturing',
    departments: [
      'operations_plant_management',
      'supply_chain_and_procurement',
      'quality_assurance',
      'production',
      'maintenance',
      'research_and_development',
      'engineering',
      'health_and_safety',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'sales_and_marketing'
    ],
    capabilities: {}
  },
  Technology: {
    translationKey: 'technology',
    departments: [
      'product_development',
      'engineering',
      'data_science_and_analytics',
      'ux_ui_design',
      'technical_support',
      'information_technology',
      'cloud_operations',
      'information_security',
      'customer_success',
      'management',
      'human_resources',
      'finance_and_accounting',
      'sales_and_marketing'
    ],
    capabilities: {}
  },
  'Financial Services': {
    translationKey: 'financial_services',
    departments: [
      'retail_banking',
      'commercial_banking',
      'investment_banking',
      'asset_management',
      'finance_and_accounting',
      'risk_management',
      'compliance',
      'technology',
      'management',
      'human_resources',
      'marketing_and_communications',
      'operations'
    ],
    capabilities: {}
  },
  Healthcare: {
    translationKey: 'healthcare',
    departments: [
      'medical_staff',
      'nursing',
      'pharmacy',
      'laboratory',
      'radiology',
      'physical_therapy',
      'medical_records',
      'insurance_and_billing',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'patient_relations',
      'facilities'
    ],
    capabilities: {}
  },
  Retail: {
    translationKey: 'retail',
    departments: [
      'store_operations',
      'merchandising',
      'inventory_management',
      'supply_chain',
      'e_commerce',
      'loss_prevention',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'marketing',
      'customer_experience'
    ],
    capabilities: {}
  },
  Education: {
    translationKey: 'education',
    departments: [
      'academic_affairs',
      'faculty',
      'student_services',
      'admissions',
      'registrar',
      'research',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'library_services',
      'alumni_relations'
    ],
    capabilities: {}
  },
  Hospitality: {
    translationKey: 'hospitality',
    departments: [
      'front_office',
      'housekeeping',
      'food_and_beverage',
      'events_and_catering',
      'security',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'sales_and_marketing',
      'customer_relations',
      'facilities'
    ],
    capabilities: {}
  },
  Nonprofit: {
    translationKey: 'nonprofit',
    departments: [
      'programs',
      'fundraising',
      'grant_management',
      'volunteer_coordination',
      'community_outreach',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'communications',
      'donor_relations',
      'advocacy'
    ],
    capabilities: {}
  },
  Government: {
    translationKey: 'government',
    departments: [
      'administration',
      'policy_and_planning',
      'public_services',
      'regulatory_affairs',
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'operations',
      'communications',
      'legal'
    ],
    capabilities: {}
  },
  default: {
    translationKey: 'default',
    departments: [
      'management',
      'human_resources',
      'finance_and_accounting',
      'information_technology',
      'operations',
      'sales_and_marketing',
      'customer_service',
      'research_and_development'
    ],
    capabilities: {}
  }
}
