/**
 * Stage Transition Conditions Configuration
 *
 * Defines conditions that must be met before allowing opportunity stage transitions.
 * These conditions trigger workflows in the custom-flow-engine.
 */

import { StageTransitionCondition } from '../types/stageTransition'

/**
 * Default stage transition conditions for standard sales pipeline
 */
export const DEFAULT_STAGE_TRANSITION_CONDITIONS: StageTransitionCondition[] = [
  {
    id: 'new-opportunity-to-qualification',
    fromStage: 'New Opportunity',
    toStage: 'In Qualification',
    pipelineId: 'SalesPipeline:v1:STANDARD',
    description: 'Basic qualification check before moving to qualification stage',
    conditions: [
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_opportunity_stage_approval',
        title: 'Qualification Approval',
        description: 'Manager approval required for qualification stage',
        requiredAssignments: {
          organizationalUnits: ['SALES_MANAGEMENT'],
          capabilities: ['OPPORTUNITY_APPROVAL']
        },
        autoAssign: true,
        timeoutMinutes: 1440 // 24 hours
      }
    ],
    isActive: true
  },
  {
    id: 'qualification-to-proposal',
    fromStage: 'In Qualification',
    toStage: 'Proposal In Progress',
    pipelineId: 'SalesPipeline:v1:STANDARD',
    description: 'Proposal stage requires budget confirmation and technical review',
    conditions: [
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_opportunity_stage_approval',
        title: 'Budget Confirmation',
        description: 'Budget approval required before proposal stage',
        requiredAssignments: {
          organizationalUnits: ['FINANCE'],
          capabilities: ['BUDGET_APPROVAL']
        },
        autoAssign: true,
        timeoutMinutes: 2880 // 48 hours
      },
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_opportunity_stage_approval',
        title: 'Technical Review',
        description: 'Technical feasibility review required',
        requiredAssignments: {
          organizationalUnits: ['TECHNICAL'],
          capabilities: ['TECHNICAL_REVIEW']
        },
        autoAssign: true,
        timeoutMinutes: 1440 // 24 hours
      }
    ],
    isActive: true
  },
  {
    id: 'proposal-to-negotiation',
    fromStage: 'Proposal In Progress',
    toStage: 'Negotiation',
    pipelineId: 'SalesPipeline:v1:STANDARD',
    description: 'Negotiation stage requires proposal acceptance and legal review',
    conditions: [
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_opportunity_stage_approval',
        title: 'Proposal Acceptance',
        description: 'Customer acceptance of proposal required',
        requiredAssignments: {
          users: ['ANY'] // Can be assigned to any user
        },
        autoAssign: false,
        timeoutMinutes: 7200 // 5 days
      },
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_opportunity_stage_approval',
        title: 'Legal Review',
        description: 'Legal review of proposal terms required',
        requiredAssignments: {
          organizationalUnits: ['LEGAL'],
          capabilities: ['LEGAL_REVIEW']
        },
        autoAssign: true,
        timeoutMinutes: 1440 // 24 hours
      }
    ],
    isActive: true
  },
  {
    id: 'negotiation-to-closed',
    fromStage: 'Negotiation',
    toStage: 'Closed',
    pipelineId: 'SalesPipeline:v1:STANDARD',
    description: 'Closing requires final approval and contract signing',
    conditions: [
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_highvalue_opportunity_approval',
        title: 'Final Approval',
        description: 'Final approval required for closing',
        requiredAssignments: {
          organizationalUnits: ['SALES_MANAGEMENT', 'FINANCE'],
          capabilities: ['FINAL_APPROVAL']
        },
        autoAssign: true,
        timeoutMinutes: 1440 // 24 hours
      }
    ],
    isActive: true
  }
]

/**
 * High-value opportunity conditions (for opportunities above threshold)
 */
export const HIGH_VALUE_STAGE_TRANSITION_CONDITIONS: StageTransitionCondition[] = [
  {
    id: 'high-value-qualification-to-proposal',
    fromStage: 'In Qualification',
    toStage: 'Proposal In Progress',
    pipelineId: 'SalesPipeline:v1:STANDARD',
    description: 'High-value opportunities require additional approvals',
    conditions: [
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_highvalue_opportunity_approval',
        title: 'Executive Approval',
        description: 'Executive approval required for high-value opportunities',
        requiredAssignments: {
          organizationalUnits: ['EXECUTIVE'],
          capabilities: ['EXECUTIVE_APPROVAL']
        },
        autoAssign: true,
        timeoutMinutes: 2880 // 48 hours
      },
      {
        type: 'APPROVAL',
        flowTemplateId: 'flow_opportunity_stage_approval',
        title: 'Risk Assessment',
        description: 'Risk assessment required for high-value deals',
        requiredAssignments: {
          organizationalUnits: ['RISK_MANAGEMENT'],
          capabilities: ['RISK_ASSESSMENT']
        },
        autoAssign: true,
        timeoutMinutes: 1440 // 24 hours
      }
    ],
    isActive: true
  }
]

/**
 * Get stage transition conditions for a specific pipeline and transition
 */
export function getStageTransitionConditions(
  fromStage: string,
  toStage: string,
  pipelineId: string = 'SalesPipeline:v1:STANDARD',
  opportunityValue?: number
): StageTransitionCondition[] {
  // Determine which conditions to use based on pipeline and value
  let conditions = DEFAULT_STAGE_TRANSITION_CONDITIONS

  // Add high-value conditions if opportunity value is above threshold
  const HIGH_VALUE_THRESHOLD = 100000 // $100k threshold
  if (opportunityValue && opportunityValue >= HIGH_VALUE_THRESHOLD) {
    conditions = [...conditions, ...HIGH_VALUE_STAGE_TRANSITION_CONDITIONS]
  }

  // Filter conditions for the specific transition
  return conditions.filter(
    condition =>
      condition.isActive &&
      condition.pipelineId === pipelineId &&
      condition.fromStage.toLowerCase() === fromStage.toLowerCase() &&
      condition.toStage.toLowerCase() === toStage.toLowerCase()
  )
}

/**
 * Get all active stage transition conditions
 */
export function getAllActiveStageTransitionConditions(): StageTransitionCondition[] {
  return [...DEFAULT_STAGE_TRANSITION_CONDITIONS, ...HIGH_VALUE_STAGE_TRANSITION_CONDITIONS].filter(
    condition => condition.isActive
  )
}

/**
 * Check if a stage transition requires conditions
 */
export function hasStageTransitionConditions(
  fromStage: string,
  toStage: string,
  pipelineId: string = 'SalesPipeline:v1:STANDARD',
  opportunityValue?: number
): boolean {
  const conditions = getStageTransitionConditions(fromStage, toStage, pipelineId, opportunityValue)
  return conditions.length > 0
}
