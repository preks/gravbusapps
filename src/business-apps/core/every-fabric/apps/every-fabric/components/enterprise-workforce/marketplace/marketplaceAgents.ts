// Predefined "Value Pack" agent catalog for the workforce marketplace.
//
// This is a forward-looking, presentational catalog: the templates here are
// NOT wired to real skills/tools/integrations yet. They convey the future
// "hire a digital employee, pay a fee" model described in the product vision
// (Value Packs across HR, CRM, Customer Service, Finance and ERP/Procurement).
//
// Hiring a template reuses the existing create flow: `createInput` prefills
// the standard Hire dialog so a real (paused) workforce agent is still
// provisioned via the current backend endpoint.

import type { Icon } from '@phosphor-icons/react'
import {
  BriefcaseIcon,
  ChartLineUpIcon,
  CoinsIcon,
  FileMagnifyingGlassIcon,
  GraduationCapIcon,
  HandshakeIcon,
  HeadsetIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TargetIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import type { WorkforceAgentCreateInput, WorkforceAutonomyLevel } from '../workforceTypes'

export type MarketplaceValuePack = 'hr' | 'crm' | 'service' | 'finance' | 'erp'

export interface MarketplaceValuePackMeta {
  id: MarketplaceValuePack
  labelKey: string
  description: string
}

export const VALUE_PACKS: MarketplaceValuePackMeta[] = [
  { id: 'hr', labelKey: 'marketplace-pack-hr', description: 'Recruiting, onboarding, talent and employee services.' },
  {
    id: 'crm',
    labelKey: 'marketplace-pack-crm',
    description: 'Customer 360, leads, opportunities and sales ops.'
  },
  {
    id: 'service',
    labelKey: 'marketplace-pack-service',
    description: 'Omnichannel service, incidents, tickets and knowledge.'
  },
  {
    id: 'finance',
    labelKey: 'marketplace-pack-finance',
    description: 'AP/AR, invoicing, payments, dunning and forecasting.'
  },
  {
    id: 'erp',
    labelKey: 'marketplace-pack-erp',
    description: 'Purchasing, suppliers, inventory and supply chain.'
  }
]

export interface MarketplaceAgentPricing {
  /** Display-only monthly base fee. */
  monthlyFee: number
  currency: 'EUR'
  /** Runs included in the base fee each month. */
  includedRunsPerMonth: number
  /** Credits drawn per run beyond the included allotment. */
  creditsPerRun: number
}

export interface MarketplaceAgentGovernance {
  autonomy: WorkforceAutonomyLevel
  highlights: string[]
}

export interface MarketplaceAgentTemplate {
  id: string
  displayName: string
  role: string
  department: string
  valuePack: MarketplaceValuePack
  /** Icon used on the card + detail header. */
  icon: Icon
  tagline: string
  description: string
  skills: string[]
  tools: string[]
  governance: MarketplaceAgentGovernance
  sampleTriggers: string[]
  pricing: MarketplaceAgentPricing
  /** 0-5, presentational popularity signal. */
  rating: number
  /** Display-only adoption count. */
  hires: number
  /** Used to prefill the existing create dialog. */
  createInput: Partial<WorkforceAgentCreateInput>
}

function autonomyLabel(level: WorkforceAutonomyLevel): string {
  switch (level) {
    case 'draft_only':
      return 'Assistive'
    case 'approval_required':
      return 'Approval Required'
    case 'auto_low_risk':
      return 'Delegated'
    case 'full_auto':
      return 'Autonomous'
  }
}

export function valuePackLabelKey(pack: MarketplaceValuePack): string {
  return VALUE_PACKS.find(p => p.id === pack)?.labelKey ?? 'marketplace-pack-general'
}

export function formatMonthlyFee(pricing: MarketplaceAgentPricing): string {
  return `€${pricing.monthlyFee.toLocaleString('en-US')}/mo`
}

export function autonomyDisplay(level: WorkforceAutonomyLevel): string {
  return autonomyLabel(level)
}

function template(t: MarketplaceAgentTemplate): MarketplaceAgentTemplate {
  return t
}

export const MARKETPLACE_AGENTS: MarketplaceAgentTemplate[] = [
  template({
    id: 'recruiting-coordinator',
    displayName: 'Riley',
    role: 'Recruiting Coordinator',
    department: 'Human Resources',
    valuePack: 'hr',
    icon: UserPlusIcon,
    tagline: 'Screens applicants and keeps your pipeline moving.',
    description:
      'Reviews inbound applications, screens candidates against the role profile, schedules interviews and keeps every applicant informed. Works the way a junior recruiter would, but never lets a candidate go cold.',
    skills: ['Resume screening', 'Candidate ranking', 'Interview scheduling', 'Applicant communication'],
    tools: ['Applicant Tracking System', 'Calendar', 'Email', 'Knowledge base'],
    governance: {
      autonomy: 'approval_required',
      highlights: ['Hiring-manager approval before rejections', 'GDPR-safe candidate handling', 'Full audit trail']
    },
    sampleTriggers: ['New application received', 'Interview feedback submitted', 'Daily pipeline review'],
    pricing: { monthlyFee: 390, currency: 'EUR', includedRunsPerMonth: 400, creditsPerRun: 3 },
    rating: 4.8,
    hires: 1240,
    createInput: {
      role: 'Recruiting Coordinator',
      department: 'Human Resources',
      description: 'Screens applicants, ranks candidates and schedules interviews.',
      autonomy_level: 'approval_required',
      instructions:
        'Screen incoming applications against the role profile. Rank candidates, propose interview slots, and keep applicants informed. Always get hiring-manager approval before sending a rejection.',
      tags: ['workforce', 'marketplace', 'hr', 'recruiting']
    }
  }),
  template({
    id: 'onboarding-buddy',
    displayName: 'Nova',
    role: 'Onboarding Specialist',
    department: 'People Operations',
    valuePack: 'hr',
    icon: GraduationCapIcon,
    tagline: 'Gives every new hire a smooth first 90 days.',
    description:
      'Runs the onboarding checklist end-to-end: provisions accounts, sends welcome material, books orientation and nudges managers on outstanding tasks so day one is never chaotic.',
    skills: ['Onboarding workflows', 'Task orchestration', 'Document collection', 'New-hire Q&A'],
    tools: ['HRIS', 'Identity provider', 'Email', 'Knowledge base'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Auto-handles routine setup', 'Escalates access requests', 'Manager visibility on every step']
    },
    sampleTriggers: ['New hire signed', 'Start date approaching', 'Onboarding task overdue'],
    pricing: { monthlyFee: 340, currency: 'EUR', includedRunsPerMonth: 300, creditsPerRun: 3 },
    rating: 4.7,
    hires: 860,
    createInput: {
      role: 'Onboarding Specialist',
      department: 'People Operations',
      description: 'Runs the new-hire onboarding checklist end-to-end.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Drive the onboarding checklist for each new hire: provision routine accounts, send welcome material, book orientation and remind managers about outstanding tasks. Escalate any access request that needs approval.',
      tags: ['workforce', 'marketplace', 'hr', 'onboarding']
    }
  }),
  template({
    id: 'employee-services-agent',
    displayName: 'Ada',
    role: 'Employee Services Agent',
    department: 'People Operations',
    valuePack: 'hr',
    icon: UsersThreeIcon,
    tagline: 'Answers HR questions so your team does not have to.',
    description:
      'A first line of support for employee questions on policies, benefits, leave and payroll basics. Resolves the routine ones instantly and routes the sensitive ones to a human.',
    skills: ['Policy Q&A', 'Leave requests', 'Benefits guidance', 'Ticket triage'],
    tools: ['HRIS', 'Knowledge base', 'Ticketing', 'Email'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Confidence threshold gating', 'Sensitive topics escalate', 'Cited policy answers']
    },
    sampleTriggers: ['Employee question received', 'Leave request submitted', 'Policy updated'],
    pricing: { monthlyFee: 290, currency: 'EUR', includedRunsPerMonth: 500, creditsPerRun: 2 },
    rating: 4.6,
    hires: 1530,
    createInput: {
      role: 'Employee Services Agent',
      department: 'People Operations',
      description: 'First-line support for employee HR questions.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Answer routine employee questions on policy, benefits, leave and payroll using the knowledge base, and always cite the source. Escalate sensitive or low-confidence cases to a human.',
      tags: ['workforce', 'marketplace', 'hr', 'employee-services']
    }
  }),
  template({
    id: 'lead-qualifier',
    displayName: 'Leo',
    role: 'Lead Qualification Rep',
    department: 'Sales',
    valuePack: 'crm',
    icon: TargetIcon,
    tagline: 'Qualifies inbound leads while they are still warm.',
    description:
      'Enriches and scores every inbound lead, books meetings for qualified ones and logs everything in the CRM so reps spend their time selling, not triaging.',
    skills: ['Lead enrichment', 'Lead scoring', 'Meeting booking', 'CRM hygiene'],
    tools: ['CRM', 'Enrichment API', 'Calendar', 'Email'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Auto-books qualified leads', 'Rep approval on outreach', 'Every touch logged in CRM']
    },
    sampleTriggers: ['New lead created', 'Form submitted', 'Hourly lead sweep'],
    pricing: { monthlyFee: 420, currency: 'EUR', includedRunsPerMonth: 600, creditsPerRun: 3 },
    rating: 4.7,
    hires: 980,
    createInput: {
      role: 'Lead Qualification Rep',
      department: 'Sales',
      description: 'Enriches, scores and qualifies inbound leads.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Enrich and score every inbound lead against the ICP. Book meetings for qualified leads, log all activity in the CRM, and get rep approval before any direct outreach.',
      tags: ['workforce', 'marketplace', 'crm', 'sales']
    }
  }),
  template({
    id: 'customer-360-analyst',
    displayName: 'Cleo',
    role: 'Customer 360 Analyst',
    department: 'Revenue Operations',
    valuePack: 'crm',
    icon: ChartLineUpIcon,
    tagline: 'Builds a live, complete picture of every customer.',
    description:
      'Loads the full Customer 360 snapshot (scores, satisfaction, contracts, service tickets/cases, invoices and balance) via the getCustomer360 tool, flags churn and expansion signals, and briefs owners before every renewal — always linking back to the Customer 360 workspace.',
    skills: ['Customer 360 snapshot', 'Health & churn signals', 'Service case review', 'Renewal briefings'],
    tools: [
      'Customer 360 (getCustomer360)',
      'CRM',
      'Custom Flow Engine (tickets/cases)',
      'Document service (contracts)',
      'Email'
    ],
    governance: {
      autonomy: 'draft_only',
      highlights: [
        'Read-only by default',
        'Drafts every briefing for review',
        'Source-linked, deep-links back to Customer 360'
      ]
    },
    sampleTriggers: ['Renewal approaching', 'Satisfaction drop detected', 'Weekly customer review'],
    pricing: { monthlyFee: 460, currency: 'EUR', includedRunsPerMonth: 350, creditsPerRun: 4 },
    rating: 4.5,
    hires: 540,
    createInput: {
      role: 'Customer 360 Analyst',
      department: 'Revenue Operations',
      description: 'Builds a consolidated 360 view of each customer using the getCustomer360 tool.',
      autonomy_level: 'draft_only',
      skill_ids: ['Data', 'CrmFunnel', 'Services', 'Documents', 'Search', 'Actions'],
      instructions:
        'Operate on the Customer 360 app. For the customer in context, call the getCustomer360 tool with customerType (account|contact) and customerId to load the normalized snapshot (the exact data the Customer 360 UI shows). Surface churn/expansion and service signals, and draft a renewal briefing for the owner. Always link insights to their source and deep-link back to the customer at /platform/crm/customer-360?type=<type>&id=<id>. Stay read-only — draft, never send.',
      tags: ['workforce', 'marketplace', 'crm', 'revops', 'customer-360']
    }
  }),
  template({
    id: 'service-desk-triage',
    displayName: 'Sage',
    role: 'Service Desk Triage Agent',
    department: 'Customer Service',
    valuePack: 'service',
    icon: HeadsetIcon,
    tagline: 'Triages every ticket and resolves the easy ones.',
    description:
      'Reads incoming tickets across channels, classifies and prioritises them, answers the common ones from the knowledge base, and routes the rest to the right team with full context.',
    skills: ['Ticket classification', 'Prioritisation', 'Knowledge answers', 'Smart routing'],
    tools: ['Ticketing', 'Knowledge base', 'Email', 'Chat'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Auto-resolves common tickets', 'Escalates VIP + low confidence', 'SLA-aware prioritisation']
    },
    sampleTriggers: ['New ticket created', 'Inbound email', 'SLA breach imminent'],
    pricing: { monthlyFee: 360, currency: 'EUR', includedRunsPerMonth: 800, creditsPerRun: 2 },
    rating: 4.8,
    hires: 2110,
    createInput: {
      role: 'Service Desk Triage Agent',
      department: 'Customer Service',
      description: 'Triages, prioritises and resolves inbound tickets.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Classify and prioritise every inbound ticket. Resolve common requests from the knowledge base, and route the rest to the right team with full context. Escalate VIP and low-confidence cases immediately.',
      tags: ['workforce', 'marketplace', 'service', 'support']
    }
  }),
  template({
    id: 'knowledge-curator',
    displayName: 'Quill',
    role: 'Knowledge Curator',
    department: 'Customer Service',
    valuePack: 'service',
    icon: FileMagnifyingGlassIcon,
    tagline: 'Keeps your knowledge base accurate and complete.',
    description:
      'Spots gaps and stale articles in your knowledge base from real ticket trends, drafts new articles and updates, and keeps support content trustworthy.',
    skills: ['Gap detection', 'Article drafting', 'Content updates', 'Trend analysis'],
    tools: ['Knowledge base', 'Ticketing', 'Analytics'],
    governance: {
      autonomy: 'draft_only',
      highlights: ['Drafts for editor approval', 'Cites ticket evidence', 'No publish without review']
    },
    sampleTriggers: ['Recurring ticket topic', 'Article flagged outdated', 'Weekly content audit'],
    pricing: { monthlyFee: 300, currency: 'EUR', includedRunsPerMonth: 250, creditsPerRun: 3 },
    rating: 4.4,
    hires: 410,
    createInput: {
      role: 'Knowledge Curator',
      department: 'Customer Service',
      description: 'Keeps the knowledge base accurate and complete.',
      autonomy_level: 'draft_only',
      instructions:
        'Analyse ticket trends to find knowledge gaps and stale articles. Draft new articles and updates with cited evidence, and never publish without an editor approving the draft.',
      tags: ['workforce', 'marketplace', 'service', 'knowledge']
    }
  }),
  template({
    id: 'invoice-clerk',
    displayName: 'Iris',
    role: 'Invoice Processing Clerk',
    department: 'Finance',
    valuePack: 'finance',
    icon: ReceiptIcon,
    tagline: 'Processes invoices from inbox to ledger.',
    description:
      'Extracts and validates invoice data, matches it against purchase orders, flags discrepancies and prepares clean entries for posting, eliminating manual data entry.',
    skills: ['Invoice extraction', '3-way matching', 'Discrepancy detection', 'Ledger preparation'],
    tools: ['ERP', 'Document OCR', 'Email', 'Approval workflow'],
    governance: {
      autonomy: 'approval_required',
      highlights: ['Approval before posting', 'Four-eyes on exceptions', 'Complete audit trail']
    },
    sampleTriggers: ['Invoice email received', 'Invoice uploaded', 'Daily AP run'],
    pricing: { monthlyFee: 410, currency: 'EUR', includedRunsPerMonth: 700, creditsPerRun: 3 },
    rating: 4.7,
    hires: 1290,
    createInput: {
      role: 'Invoice Processing Clerk',
      department: 'Finance',
      description: 'Extracts, validates and matches invoices for posting.',
      autonomy_level: 'approval_required',
      instructions:
        'Extract and validate invoice data, perform 3-way matching against purchase orders, and prepare clean ledger entries. Flag discrepancies and require human approval before any posting.',
      tags: ['workforce', 'marketplace', 'finance', 'ap']
    }
  }),
  template({
    id: 'dunning-specialist',
    displayName: 'Dex',
    role: 'Dunning Specialist',
    department: 'Finance',
    valuePack: 'finance',
    icon: CoinsIcon,
    tagline: 'Chases overdue invoices, politely and on time.',
    description:
      'Monitors receivables, sends staged dunning reminders in the right tone, reconciles incoming payments and escalates genuinely stuck accounts to collections.',
    skills: ['Receivables monitoring', 'Dunning sequences', 'Payment reconciliation', 'Escalation'],
    tools: ['ERP', 'Email', 'Payment gateway', 'CRM'],
    governance: {
      autonomy: 'approval_required',
      highlights: ['Approval before escalation', 'Tone-controlled messaging', 'Per-customer guardrails']
    },
    sampleTriggers: ['Invoice overdue', 'Payment received', 'Weekly AR review'],
    pricing: { monthlyFee: 350, currency: 'EUR', includedRunsPerMonth: 500, creditsPerRun: 2 },
    rating: 4.5,
    hires: 620,
    createInput: {
      role: 'Dunning Specialist',
      department: 'Finance',
      description: 'Monitors receivables and runs staged dunning.',
      autonomy_level: 'approval_required',
      instructions:
        'Monitor overdue receivables and send staged dunning reminders in an appropriate tone. Reconcile incoming payments and require approval before escalating an account to collections.',
      tags: ['workforce', 'marketplace', 'finance', 'ar']
    }
  }),
  template({
    id: 'forecasting-analyst',
    displayName: 'Faye',
    role: 'Forecasting Analyst',
    department: 'Finance',
    valuePack: 'finance',
    icon: ChartLineUpIcon,
    tagline: 'Turns your numbers into forecasts and reports.',
    description:
      'Pulls actuals from your systems, builds rolling forecasts, explains the variances in plain language and assembles the recurring reports your finance team needs.',
    skills: ['Variance analysis', 'Rolling forecasts', 'Report assembly', 'Narrative summaries'],
    tools: ['ERP', 'Data warehouse', 'Spreadsheets', 'Reporting'],
    governance: {
      autonomy: 'draft_only',
      highlights: ['Drafts for controller review', 'Traceable to source data', 'No filing without sign-off']
    },
    sampleTriggers: ['Month-end close', 'Weekly forecast refresh', 'Report requested'],
    pricing: { monthlyFee: 480, currency: 'EUR', includedRunsPerMonth: 200, creditsPerRun: 5 },
    rating: 4.6,
    hires: 470,
    createInput: {
      role: 'Forecasting Analyst',
      department: 'Finance',
      description: 'Builds forecasts and recurring finance reports.',
      autonomy_level: 'draft_only',
      instructions:
        'Pull actuals, build rolling forecasts and explain variances in plain language. Assemble recurring reports as drafts for the controller to review; never file without sign-off.',
      tags: ['workforce', 'marketplace', 'finance', 'fpa']
    }
  }),
  template({
    id: 'procurement-sourcing',
    displayName: 'Pax',
    role: 'Procurement Sourcing Agent',
    department: 'Procurement',
    valuePack: 'erp',
    icon: ShoppingCartIcon,
    tagline: 'Sources suppliers and prepares purchase orders.',
    description:
      'Takes purchase requests, finds and compares suppliers, negotiates within your guardrails, and prepares purchase orders ready for approval, keeping spend under control.',
    skills: ['Supplier sourcing', 'Quote comparison', 'PO preparation', 'Spend checks'],
    tools: ['ERP', 'Supplier portal', 'Email', 'Catalog'],
    governance: {
      autonomy: 'approval_required',
      highlights: ['Approval before ordering', 'Within negotiated guardrails', 'Policy-compliant spend']
    },
    sampleTriggers: ['Purchase request raised', 'Reorder point hit', 'Quote received'],
    pricing: { monthlyFee: 440, currency: 'EUR', includedRunsPerMonth: 300, creditsPerRun: 4 },
    rating: 4.5,
    hires: 380,
    createInput: {
      role: 'Procurement Sourcing Agent',
      department: 'Procurement',
      description: 'Sources suppliers and prepares purchase orders.',
      autonomy_level: 'approval_required',
      instructions:
        'Take purchase requests, source and compare suppliers, and prepare purchase orders within negotiated guardrails. Require approval before placing any order and keep spend policy-compliant.',
      tags: ['workforce', 'marketplace', 'erp', 'procurement']
    }
  }),
  template({
    id: 'supplier-onboarding',
    displayName: 'Vera',
    role: 'Supplier Onboarding Agent',
    department: 'Procurement',
    valuePack: 'erp',
    icon: HandshakeIcon,
    tagline: 'Onboards and vets new suppliers, compliantly.',
    description:
      'Collects supplier documentation, runs compliance and sanctions checks, sets up master data and keeps vendor records clean and audit-ready.',
    skills: ['Document collection', 'Compliance checks', 'Master data setup', 'Record hygiene'],
    tools: ['ERP', 'Supplier portal', 'Compliance API', 'Email'],
    governance: {
      autonomy: 'approval_required',
      highlights: ['Approval before activation', 'Sanctions screening', 'Audit-ready records']
    },
    sampleTriggers: ['New supplier requested', 'Documents submitted', 'Compliance re-check due'],
    pricing: { monthlyFee: 370, currency: 'EUR', includedRunsPerMonth: 250, creditsPerRun: 3 },
    rating: 4.4,
    hires: 290,
    createInput: {
      role: 'Supplier Onboarding Agent',
      department: 'Procurement',
      description: 'Onboards and vets new suppliers compliantly.',
      autonomy_level: 'approval_required',
      instructions:
        'Collect supplier documentation, run compliance and sanctions checks, and set up master data. Keep vendor records clean and audit-ready, and require approval before activating a supplier.',
      tags: ['workforce', 'marketplace', 'erp', 'supplier']
    }
  }),
  template({
    id: 'inventory-watcher',
    displayName: 'Milo',
    role: 'Inventory Operations Agent',
    department: 'Supply Chain',
    valuePack: 'erp',
    icon: PackageIcon,
    tagline: 'Watches stock levels and prevents shortages.',
    description:
      'Monitors inventory across locations, predicts shortages and overstock, proposes replenishment and keeps order fulfilment on track without manual stock-watching.',
    skills: ['Stock monitoring', 'Demand signals', 'Replenishment proposals', 'Fulfilment tracking'],
    tools: ['ERP', 'Warehouse system', 'Forecasting', 'Email'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Auto-flags low stock', 'Approval on large reorders', 'Location-aware rules']
    },
    sampleTriggers: ['Stock below threshold', 'Demand spike detected', 'Daily inventory sweep'],
    pricing: { monthlyFee: 400, currency: 'EUR', includedRunsPerMonth: 450, creditsPerRun: 3 },
    rating: 4.5,
    hires: 350,
    createInput: {
      role: 'Inventory Operations Agent',
      department: 'Supply Chain',
      description: 'Monitors stock levels and proposes replenishment.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Monitor inventory across locations, predict shortages and overstock, and propose replenishment. Auto-flag low stock and require approval for large reorders.',
      tags: ['workforce', 'marketplace', 'erp', 'inventory']
    }
  }),
  template({
    id: 'sales-ops-assistant',
    displayName: 'Remy',
    role: 'Sales Operations Assistant',
    department: 'Sales',
    valuePack: 'crm',
    icon: BriefcaseIcon,
    tagline: 'Keeps your pipeline clean and your reps honest.',
    description:
      'Maintains CRM data quality, updates opportunity stages from activity, prepares pipeline reports and reminds reps about stalled deals so forecasts stay trustworthy.',
    skills: ['Pipeline hygiene', 'Stage updates', 'Deal nudges', 'Pipeline reporting'],
    tools: ['CRM', 'Email', 'Reporting', 'Calendar'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Auto-cleans CRM data', 'Rep confirmation on stage moves', 'Manager-visible activity']
    },
    sampleTriggers: ['Deal inactive 14 days', 'Stage change detected', 'Weekly pipeline review'],
    pricing: { monthlyFee: 330, currency: 'EUR', includedRunsPerMonth: 500, creditsPerRun: 2 },
    rating: 4.6,
    hires: 720,
    createInput: {
      role: 'Sales Operations Assistant',
      department: 'Sales',
      description: 'Maintains pipeline hygiene and reporting.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Keep CRM data clean, update opportunity stages from activity, and prepare pipeline reports. Confirm stage moves with reps and nudge them about stalled deals.',
      tags: ['workforce', 'marketplace', 'crm', 'sales-ops']
    }
  }),
  template({
    id: 'talent-development',
    displayName: 'Theo',
    role: 'Learning & Development Agent',
    department: 'Human Resources',
    valuePack: 'hr',
    icon: UserCheckIcon,
    tagline: 'Builds growth plans your people actually follow.',
    description:
      'Maps skills gaps, recommends tailored learning paths, tracks progress and nudges employees and managers so development never falls off the calendar.',
    skills: ['Skills mapping', 'Learning paths', 'Progress tracking', 'Nudges'],
    tools: ['HRIS', 'LMS', 'Email', 'Knowledge base'],
    governance: {
      autonomy: 'auto_low_risk',
      highlights: ['Auto-recommends learning', 'Manager approval on budget', 'Private by default']
    },
    sampleTriggers: ['Review cycle complete', 'Skill gap identified', 'Course completed'],
    pricing: { monthlyFee: 300, currency: 'EUR', includedRunsPerMonth: 300, creditsPerRun: 3 },
    rating: 4.4,
    hires: 360,
    createInput: {
      role: 'Learning & Development Agent',
      department: 'Human Resources',
      description: 'Builds and tracks personalised growth plans.',
      autonomy_level: 'auto_low_risk',
      instructions:
        'Map skills gaps, recommend tailored learning paths and track progress. Nudge employees and managers, and require manager approval before committing any learning budget.',
      tags: ['workforce', 'marketplace', 'hr', 'l-and-d']
    }
  })
]

export function marketplaceAgentsByPack(pack: MarketplaceValuePack | 'all'): MarketplaceAgentTemplate[] {
  if (pack === 'all') return MARKETPLACE_AGENTS
  return MARKETPLACE_AGENTS.filter(agent => agent.valuePack === pack)
}

export function searchMarketplaceAgents(agents: MarketplaceAgentTemplate[], query: string): MarketplaceAgentTemplate[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return agents
  return agents.filter(agent => {
    const haystack = [
      agent.displayName,
      agent.role,
      agent.department,
      agent.tagline,
      agent.description,
      ...agent.skills,
      ...agent.tools
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(trimmed)
  })
}
