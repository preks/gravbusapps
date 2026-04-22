export type IndustryTemplate = {
  departments: string[]
  capabilities: Record<string, Record<string, string[]>>
}

export const industryTemplates: Record<string, IndustryTemplate> = {
  Manufacturing: {
    departments: [
      'Operations / Plant Management',
      'Supply Chain & Procurement',
      'Quality Assurance',
      'Engineering / R&D',
      'Finance & Controlling',
      'Human Resources',
      'Sales & Customer Service',
      'IT & Systems',
      'Health, Safety & Environment (HSE)',
      'Maintenance & Facilities'
    ],
    capabilities: {
      'Core Operations': {
        'Production Management': [
          'Production Planning',
          'Shop Floor Control',
          'Assembly Line Optimization',
          'Quality Assurance'
        ],
        'Maintenance & Engineering': [
          'Preventive Maintenance',
          'Equipment Calibration',
          'Industrial Engineering',
          'Process Improvement'
        ]
      },
      'Supply Chain & Logistics': {
        'Supply Management': ['Procurement', 'Vendor Management', 'Inventory Management'],
        'Logistics Execution': ['Inbound & Outbound Logistics', 'Warehouse Management', 'Freight Coordination']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Learning & Development', 'Shift & Labor Planning'],
        'Finance & Admin': ['Financial Planning & Analysis', 'Accounting & Controlling', 'Payroll & Timekeeping'],
        'IT & Systems': ['ERP System Administration', 'IT Support & Infrastructure', 'Data & Reporting']
      }
    }
  },
  Retail: {
    departments: [
      'Store Operations / Field Management',
      'Merchandising / Buying',
      'Inventory & Supply Chain',
      'Marketing & Promotions',
      'Finance & Accounting',
      'Human Resources',
      'E-Commerce & Digital',
      'IT & Retail Systems',
      'Customer Experience / CRM'
    ],
    capabilities: {
      'Core Operations': {
        'Retail Execution': ['Store Operations', 'Visual Merchandising', 'POS Management'],
        'Inventory & Planning': [
          'Replenishment Planning',
          'Product Lifecycle Management',
          'Returns & Reverse Logistics'
        ]
      },
      'Customer & Commercial': {
        'Sales & Experience': ['Omnichannel Sales', 'Customer Relationship Management', 'Loyalty Programs'],
        'Merchandising & Buying': ['Assortment Planning', 'Supplier Management', 'Promotion Planning']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Training & Onboarding'],
        'Finance & Admin': ['Financial Planning & Analysis', 'Retail Accounting', 'Loss Prevention'],
        'IT & Systems': ['Retail IT Systems', 'Inventory Analytics', 'E-Commerce Platform Management']
      }
    }
  },
  Logistics: {
    departments: [
      'Transportation & Fleet',
      'Warehouse & Distribution',
      'Operations Control Tower',
      'Customer Service',
      'Network Planning',
      'Finance & Billing',
      'Human Resources',
      'Compliance & Risk',
      'IT & System Integration',
      'Sales & Business Development'
    ],
    capabilities: {
      'Core Operations': {
        'Fleet & Route Management': ['Route Optimization', 'Fleet Maintenance', 'Load Planning'],
        Warehousing: ['Inventory Control', 'Pick-Pack-Ship', 'Warehouse Automation']
      },
      'Customer & Network': {
        'Network Planning': ['Capacity Forecasting', 'Network Design', '3PL Integration'],
        'Customer Service': ['Shipment Tracking', 'Service Issue Resolution']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Driver Training & Certification'],
        'Finance & Admin': ['Billing & Cost Control', 'Financial Planning & Analysis'],
        'IT & Systems': ['TMS / WMS Systems', 'System Integrations', 'EDI / API Management']
      }
    }
  },
  Consulting: {
    departments: [
      'Client Services / Delivery',
      'Business Development',
      'Practice Leads / Domain Expertise',
      'Finance & Admin',
      'Talent Acquisition & HR',
      'Knowledge Management',
      'IT & Collaboration Tools',
      'Marketing & Branding',
      'Legal & Compliance'
    ],
    capabilities: {
      'Core Operations': {
        'Project Delivery': ['Project Management', 'Solution Implementation', 'Stakeholder Engagement'],
        'Practice Development': ['Subject Matter Expertise', 'Framework & IP Development', 'Case Study Library']
      },
      'Commercial & Client': {
        'Business Development': ['Lead Generation', 'Proposal Development', 'Deal Closing']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Consultant Training', 'Utilization Reporting'],
        'Finance & Admin': ['Time Tracking & Billing', 'Financial Planning & Analysis'],
        'IT & Systems': ['Collaboration Tools', 'Knowledge Management']
      }
    }
  },
  Construction: {
    departments: [
      'Project Management Office (PMO)',
      'Site Operations',
      'Estimation & Tendering',
      'Procurement',
      'Architecture & Design',
      'Finance & Accounting',
      'HR & Labor Relations',
      'Safety & Compliance',
      'Equipment & Fleet',
      'IT & Project Systems'
    ],
    capabilities: {
      'Core Operations': {
        'Project Execution': ['Site Supervision', 'Construction Scheduling', 'Materials Coordination'],
        'Health & Safety': ['Risk Assessment', 'Site Safety Audits']
      },
      'Planning & Estimation': {
        'Planning & Pre-Construction': ['Cost Estimation', 'Tendering', 'Contract Management'],
        'Technical Design': ['Blueprint Review', 'BIM Coordination']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Contractor Onboarding'],
        'Finance & Admin': ['Job Cost Accounting', 'Budget Control'],
        'IT & Systems': ['Construction Management Software', 'Mobile Field Reporting']
      }
    }
  },
  Engineering: {
    departments: [
      'Engineering & Design',
      'Project Management',
      'Quality & Compliance',
      'Procurement & Vendor Management',
      'R&D / Innovation',
      'HR & People Ops',
      'Finance & Budgeting',
      'Sales Engineering / Pre-Sales',
      'Customer Support / Aftermarket',
      'IT & Tools'
    ],
    capabilities: {
      'Core Operations': {
        'Design & Development': ['CAD Design', 'Structural Engineering', 'Systems Integration'],
        'Testing & Validation': ['Simulation & Testing', 'Product Certification']
      },
      'Project & Compliance': {
        'Project Coordination': ['Milestone Planning', 'Client Approvals'],
        'Compliance & QA': ['Regulatory Documentation', 'Quality Control Audits']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Skill Tracking'],
        'Finance & Admin': ['Budgeting & Forecasting', 'Proposal Costing'],
        'IT & Systems': ['Engineering Toolchain', 'Document Management']
      }
    }
  },
  Finance: {
    departments: [
      'Portfolio / Asset Management',
      'Financial Planning & Analysis (FP&A)',
      'Accounting & Reporting',
      'Treasury & Cash Management',
      'Risk & Compliance',
      'Investor Relations',
      'IT & Systems',
      'Legal',
      'HR & Talent',
      'Strategy & M&A'
    ],
    capabilities: {
      'Core Operations': {
        'Financial Control': ['Accounting Operations', 'Accounts Payable / Receivable', 'Closing & Reporting'],
        Treasury: ['Liquidity Management', 'Investment Strategy']
      },
      'Performance & Risk': {
        'FP&A': ['Budgeting', 'Forecasting', 'Scenario Planning'],
        'Risk & Compliance': ['Internal Audit', 'Regulatory Compliance', 'Tax & Legal Affairs']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Compensation Planning'],
        'IT & Systems': ['Finance Systems', 'Reporting Tools']
      }
    }
  },
  Insurance: {
    departments: [
      'Underwriting',
      'Claims Management',
      'Actuarial & Risk',
      'Sales & Distribution',
      'Customer Service',
      'Product Development',
      'Finance & Compliance',
      'HR & Training',
      'IT / Core System Management',
      'Legal Affairs'
    ],
    capabilities: {
      'Core Operations': {
        'Underwriting & Claims': ['Risk Assessment', 'Policy Underwriting', 'Claims Processing'],
        Actuarial: ['Pricing Models', 'Reserve Forecasting']
      },
      'Customer & Distribution': {
        'Broker & Customer Service': ['Broker Management', 'Policyholder Support'],
        'Product Management': ['Policy Design', 'Market Fit Analysis']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Training Compliance'],
        'Finance & Admin': ['Premium Accounting', 'Regulatory Reporting'],
        'IT & Systems': ['Core Policy Systems', 'Document Automation']
      }
    }
  },
  Technology: {
    departments: [
      'Product Management',
      'Engineering / Development',
      'Sales & Customer Success',
      'Marketing & Growth',
      'Finance & Legal',
      'People / HR',
      'IT & Security',
      'Design / UX',
      'DevOps / Infrastructure',
      'Data & AI / Analytics'
    ],
    capabilities: {
      'Core Operations': {
        'Product & Engineering': ['Product Roadmapping', 'Software Development', 'QA & Release Management'],
        'DevOps & Infra': ['CI/CD Pipeline', 'Cloud Infrastructure', 'Observability & Monitoring']
      },
      'Customer & Market': {
        'Customer Experience': ['Implementation & Onboarding', 'Support & Ticketing', 'Success & Retention'],
        'Go-to-Market': ['Demand Generation', 'Sales Enablement', 'Product Marketing']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Tech Talent Acquisition'],
        'Finance & Admin': ['SaaS Metrics & Reporting', 'Billing & RevOps'],
        'IT & Security': ['Internal IT Ops', 'Security & Compliance']
      }
    }
  },
  default: {
    departments: [
      'Management',
      'Operations',
      'Finance',
      'Human Resources',
      'Sales & Marketing',
      'IT & Systems',
      'Customer Service',
      'Research & Development'
    ],
    capabilities: {
      'Core Operations': {
        'Business Operations': ['Process Management', 'Quality Control', 'Resource Planning']
      },
      'Customer & Market': {
        'Customer Management': ['Customer Acquisition', 'Customer Retention', 'Customer Support']
      },
      'Support Functions': {
        'People & Culture': ['HR Management', 'Training & Development'],
        'Finance & Admin': ['Financial Planning', 'Accounting'],
        'IT & Systems': ['IT Support', 'System Administration']
      }
    }
  }
}
