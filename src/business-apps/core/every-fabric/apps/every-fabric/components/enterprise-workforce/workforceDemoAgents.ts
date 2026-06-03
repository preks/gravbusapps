// Dev-only preview seed for the Agent Orbit.
//
// This injects a handful of synthetic workforce agents so the orbit can be
// eyeballed with more than one agent without touching the real backend. It is
// strictly opt-in and suppressed entirely in production builds. With nothing
// configured it returns 0, so this has zero runtime effect in normal use (and
// in tests).
//
// How to enable (the URL is owned by the platform router, so we use
// localStorage instead of a query param to avoid bouncing off the screen):
//   localStorage.setItem('orbitDemo', '8')   // then reload the Workforce screen
//   localStorage.removeItem('orbitDemo')      // to turn it back off
// A `?orbitDemo=<n>` query param is still honoured where routing allows it.
//
// Note: the demo agents are visual-only - Pause/Activate/Archive call the real
// API with synthetic ids and will no-op/error, which is expected for a preview.

import { emptyMetricsTotals, type WorkforceAgent, type WorkforceProfile } from './workforceTypes'
import type { WorkforceAgentSummary } from './useWorkforceData'

const MAX_DEMO_AGENTS = 24

interface DemoSpec {
  name: string
  role: string
  department: string
  description: string
  domain: string
}

const DEMO_SPECS: DemoSpec[] = [
  {
    name: 'Payroll Auditor',
    role: 'Payroll specialist',
    department: 'Finance Ops',
    domain: 'finance',
    description: 'Reconciles payroll runs against contracts and flags anomalies before pay day.'
  },
  {
    name: 'Recruiting Screener',
    role: 'Talent screener',
    department: 'People',
    domain: 'hr',
    description: 'Screens inbound applications, shortlists candidates, and schedules first calls.'
  },
  {
    name: 'IT Helpdesk Triage',
    role: 'Support engineer',
    department: 'IT Ops',
    domain: 'it',
    description: 'Triages inbound IT tickets, resolves common requests, and escalates the rest.'
  },
  {
    name: 'Contract Reviewer',
    role: 'Legal analyst',
    department: 'Legal',
    domain: 'legal',
    description: 'Reviews vendor contracts against policy and surfaces risky clauses for a human.'
  },
  {
    name: 'Expense Approver',
    role: 'Finance reviewer',
    department: 'Finance Ops',
    domain: 'finance',
    description: 'Checks employee expenses against policy and auto-approves the clean ones.'
  },
  {
    name: 'Onboarding Buddy',
    role: 'People coordinator',
    department: 'People',
    domain: 'hr',
    description: 'Walks new hires through onboarding tasks and answers day-one questions.'
  },
  {
    name: 'Sales Lead Qualifier',
    role: 'Revenue assistant',
    department: 'Revenue',
    domain: 'crm',
    description: 'Qualifies inbound leads, enriches accounts, and routes hot ones to reps.'
  },
  {
    name: 'Support Deflector',
    role: 'Customer success agent',
    department: 'Customer Success',
    domain: 'support',
    description: 'Answers common support questions from the knowledge base before a human steps in.'
  },
  {
    name: 'Compliance Watchdog',
    role: 'Risk analyst',
    department: 'Risk',
    domain: 'compliance',
    description: 'Monitors activity for compliance breaches and opens cases when thresholds trip.'
  },
  {
    name: 'Data Hygiene Bot',
    role: 'Data steward',
    department: 'Data',
    domain: 'data',
    description: 'De-duplicates and normalises records so downstream reports stay trustworthy.'
  },
  {
    name: 'Invoice Matcher',
    role: 'AP specialist',
    department: 'Finance Ops',
    domain: 'finance',
    description: 'Three-way matches invoices to POs and receipts, queueing mismatches for review.'
  },
  {
    name: 'Security Alert Triage',
    role: 'Security analyst',
    department: 'Security',
    domain: 'security',
    description: 'Triages security alerts, suppresses noise, and pages on-call for real threats.'
  }
]

function isProductionRuntime(): boolean {
  return globalThis.process?.env?.NODE_ENV === 'production'
}

// Prefer localStorage (does not touch the route), then fall back to a query
// param for environments where it does not interfere with navigation.
function readDemoConfig(): string | null {
  try {
    const stored = window.localStorage?.getItem('orbitDemo')
    if (stored) return stored
  } catch {
    // localStorage may be unavailable (private mode / sandboxed iframe) - ignore.
  }
  try {
    return new URLSearchParams(window.location.search).get('orbitDemo')
  } catch {
    return null
  }
}

/** Reads the requested demo agent count. Opt-in via localStorage/query; off in prod. */
export function readOrbitDemoCount(): number {
  if (isProductionRuntime()) return 0
  if (typeof window === 'undefined') return 0
  const raw = readDemoConfig()
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return 0
  return Math.min(parsed, MAX_DEMO_AGENTS)
}

function demoProfile(spec: DemoSpec): WorkforceProfile {
  return {
    role: spec.role,
    department: spec.department,
    owner_user_id: null,
    autonomy_level: 'approval_required',
    escalation: {
      owner_user_id: null,
      ticket_queue: null,
      notify_emails: [],
      confidence_threshold: 0.7,
      blocked_intents: []
    },
    budget: {
      daily_credit_limit: null,
      weekly_credit_limit: null,
      monthly_credit_limit: null,
      on_exceeded: 'pause'
    },
    knowledge_refs: [],
    instructions: ''
  }
}

function buildDemoSummary(spec: DemoSpec, index: number): WorkforceAgentSummary {
  // Every fourth agent is paused so the amber ring is visible in the preview.
  const isPaused = index % 4 === 3
  const agentId = `demo-agent-${index + 1}`
  const triggerCount = (index % 3) + 1
  const activeTriggerCount = isPaused ? 0 : triggerCount
  const hoursAgo = (index + 1) * 2
  const agent: WorkforceAgent = {
    agent_id: agentId,
    name: spec.name.toLowerCase().replace(/\s+/g, '_'),
    display_name: spec.name,
    description: spec.description,
    domain: spec.domain,
    surfaces: ['workforce'],
    is_active: !isPaused,
    status: isPaused ? 'paused' : 'active',
    tags: [spec.department],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: demoProfile(spec),
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
  return {
    agent,
    triggerCount,
    activeTriggerCount,
    metrics: emptyMetricsTotals(),
    creditsThisWeek: (index + 1) * 37,
    runsThisWeek: (index + 1) * 3,
    lastCompletedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
  }
}

/** Builds `count` synthetic agent summaries cycling through the demo specs. */
export function buildWorkforceDemoSummaries(count: number): WorkforceAgentSummary[] {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, index) => buildDemoSummary(DEMO_SPECS[index % DEMO_SPECS.length], index))
}
