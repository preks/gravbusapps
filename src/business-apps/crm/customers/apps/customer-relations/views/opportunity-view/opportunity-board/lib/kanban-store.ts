import { create } from 'zustand'
import { Stage, Opportunity } from './types'
import { FIXED_STAGES } from './stages'
import { GET_OPPORTUNITIES } from '../queries/kanbanQueries'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { opportunityClient } from '@/common/network/opportunity/OpportunityClient'
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits'

interface KanbanStore {
  stages: Stage[]
  opportunities: Opportunity[]
  loading: boolean
  error: Error | null
  isEditingOpportunity: boolean
  editingOpportunityId: string | null
  selectedOpportunity: Opportunity | null
  isViewingOpportunity: boolean

  fetchOpportunities: (
    accessToken: string,
    employeeId?: string,
    sourceApp?: string,
    selectedEmployeeIds?: string[],
    selectedPipelineId?: string
  ) => Promise<Opportunity[]>
  updateStages: (stages: Stage[]) => void
  moveOpportunity: (opportunityId: string, targetStageId: string, accessToken: string) => Promise<void>
  moveOpportunityToStage: (opportunityId: string, targetStageId: string, accessToken: string) => Promise<void>
  moveOpportunityToPosition: (
    opportunityId: string,
    targetStageId: string,
    position: number,
    accessToken: string
  ) => Promise<void>
  reorderOpportunities: (stageId: string, reorderedOpportunities: Opportunity[]) => void
  updateOpportunity: (opportunityId: string, updates: Partial<Opportunity>, accessToken: string) => Promise<void>
  quickUpdateOpportunity: (opportunityId: string, updates: Partial<Opportunity>) => Promise<void>
  deleteOpportunity: (opportunityId: string, accessToken: string) => Promise<void>
  setEditingOpportunity: (opportunityId: string | null) => void
  selectOpportunity: (opportunityId: string | null) => void
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  stages: FIXED_STAGES,
  opportunities: [],
  loading: false,
  error: null,
  isEditingOpportunity: false,
  editingOpportunityId: null,
  selectedOpportunity: null,
  isViewingOpportunity: false,

  updateStages: (stages: Stage[]) => {
    set({ stages })
  },

  fetchOpportunities: async (
    accessToken: string,
    employeeId?: string,
    sourceApp?: string,
    selectedEmployeeIds?: string[],
    selectedPipelineId?: string
  ) => {
    set({ loading: true, error: null })
    try {
      graphQLClient.setAccessToken(accessToken)

      // Build where conditions
      const where: any = { isDeleted: { _eq: false } }

      // Add sourceApp filtering if provided
      if (sourceApp) {
        where.sourceApp = { _eq: sourceApp }
      }

      // Add pipeline filtering if provided
      if (selectedPipelineId) {
        where.salesPipelineRef = { _eq: selectedPipelineId }
      }

      // Handle employee filtering logic
      if (selectedEmployeeIds !== undefined) {
        if (selectedEmployeeIds.length > 0) {
          // If specific employees are selected, filter by those
          where.ownerEmployeeId = { _in: selectedEmployeeIds }
        } else {
          // If in "selected employees" mode but none selected, show no results
          where.ownerEmployeeId = { _in: [] }
        }
      } else if (employeeId) {
        // Fallback to single employee filter (for "My Opportunities")
        where.ownerEmployeeId = { _eq: employeeId }
      }
      // If no employee filtering is specified, show all opportunities

      const response = await graphQLClient.request(GET_OPPORTUNITIES, {
        offset: 0,
        limit: enforceQueryLimit(200), // Enforce the 100 item limit instead of 200
        where
      })

      if (!response || !response.Opportunity) {
        set({ error: new Error('Invalid response format from server'), loading: false })
        return []
      }

      const opportunities = response.Opportunity.map((opp: any, index: number) => ({
        ...opp,
        id: opp.id || '',
        title: opp.name || '',
        stageId: opp.salesPipelineStageRef || FIXED_STAGES[0].id,
        salesPipelineRef: opp.salesPipelineRef,
        salesPipelineStageRef: opp.salesPipelineStageRef,
        version: opp.version || 0,
        owner: opp.ownerEmployee?.fullName || 'Unassigned',
        account: opp.account?.name || '',
        amount: opp.estimatedAmount || 0,
        position: opp.position || index // Add position for ordering
      }))

      set({ opportunities, loading: false })
      return opportunities
    } catch (error) {
      set({ error: error as Error, loading: false })
      return []
    }
  },

  moveOpportunity: async (opportunityId: string, targetStageId: string, accessToken: string) => {
    const opportunity = get().opportunities.find(opp => opp.id === opportunityId)
    if (!opportunity) return

    const originalStageId = opportunity.stageId
    const originalSalesPipelineStageRef = opportunity.salesPipelineStageRef

    set(state => ({
      opportunities: state.opportunities.map(opp =>
        opp.id === opportunityId
          ? {
              ...opp,
              stageId: targetStageId,
              salesPipelineStageRef: targetStageId, // Update both fields
              version: opp.version + 1
            }
          : opp
      )
    }))

    opportunityClient
      .updateOpportunityStage(opportunityId, targetStageId, opportunity.version, opportunity, accessToken)
      .catch(error => {
        set(state => ({
          opportunities: state.opportunities.map(opp =>
            opp.id === opportunityId
              ? {
                  ...opp,
                  stageId: originalStageId,
                  salesPipelineStageRef: originalSalesPipelineStageRef,
                  version: opportunity.version
                }
              : opp
          ),
          error: error as Error
        }))
      })
  },

  moveOpportunityToStage: async (opportunityId: string, targetStageId: string, accessToken: string) => {
    const opportunity = get().opportunities.find(opp => opp.id === opportunityId)
    if (!opportunity) return

    const originalStageId = opportunity.stageId
    const originalSalesPipelineStageRef = opportunity.salesPipelineStageRef

    // Get the target stage opportunities to determine position (add to end)
    const targetStageOpportunities = get().opportunities.filter(op => {
      return op.salesPipelineStageRef === targetStageId
    })
    const newPosition = targetStageOpportunities.length

    // Optimistic update - move the card to end of target stage
    set(state => ({
      opportunities: state.opportunities.map(opp =>
        opp.id === opportunityId
          ? {
              ...opp,
              stageId: targetStageId,
              salesPipelineStageRef: targetStageId, // Update both fields
              position: newPosition,
              version: opp.version + 1
            }
          : opp
      )
    }))

    // Make API call in background
    opportunityClient
      .updateOpportunityStage(opportunityId, targetStageId, opportunity.version, opportunity, accessToken)
      .catch(error => {
        // Revert on error
        set(state => ({
          opportunities: state.opportunities.map(opp =>
            opp.id === opportunityId
              ? {
                  ...opp,
                  stageId: originalStageId,
                  salesPipelineStageRef: originalSalesPipelineStageRef,
                  position: opportunity.position,
                  version: opportunity.version
                }
              : opp
          ),
          error: error as Error
        }))
      })
  },

  moveOpportunityToPosition: async (
    opportunityId: string,
    targetStageId: string,
    position: number,
    accessToken: string
  ) => {
    const opportunity = get().opportunities.find(opp => opp.id === opportunityId)
    if (!opportunity) return

    const originalStageId = opportunity.stageId
    const originalSalesPipelineStageRef = opportunity.salesPipelineStageRef
    const originalPosition = opportunity.position

    // Get target stage opportunities and insert at specific position
    const targetStageOpportunities = get()
      .opportunities.filter(op => {
        return op.salesPipelineStageRef === targetStageId && op.id !== opportunityId
      })
      .sort((a, b) => (a.position || 0) - (b.position || 0))

    // Insert the opportunity at the specified position
    targetStageOpportunities.splice(position, 0, {
      ...opportunity,
      stageId: targetStageId,
      salesPipelineStageRef: targetStageId
    })

    // Update positions for all opportunities in target stage
    const updatedTargetOpportunities = targetStageOpportunities.map((op, index) => ({
      ...op,
      position: index,
      stageId: targetStageId,
      salesPipelineStageRef: targetStageId
    }))

    // Optimistic update
    set(state => {
      const otherOpportunities = state.opportunities.filter(op => {
        return op.salesPipelineStageRef !== targetStageId && op.id !== opportunityId
      })

      return {
        opportunities: [
          ...otherOpportunities,
          ...updatedTargetOpportunities.map(op => (op.id === opportunityId ? { ...op, version: op.version + 1 } : op))
        ]
      }
    })

    // Make API call in background
    opportunityClient
      .updateOpportunityStage(opportunityId, targetStageId, opportunity.version, opportunity, accessToken)
      .catch(error => {
        // Revert on error
        set(state => ({
          opportunities: state.opportunities.map(opp =>
            opp.id === opportunityId
              ? {
                  ...opp,
                  stageId: originalStageId,
                  salesPipelineStageRef: originalSalesPipelineStageRef,
                  position: originalPosition,
                  version: opportunity.version
                }
              : opp
          ),
          error: error as Error
        }))
      })
  },

  reorderOpportunities: (stageId: string, reorderedOpportunities: Opportunity[]) => {
    set(state => {
      // Update positions for the reordered opportunities
      const updatedReorderedOps = reorderedOpportunities.map((op, index) => ({
        ...op,
        position: index
      }))

      // Update the opportunities array with the new positions
      const updatedOpportunities = state.opportunities.map(opp => {
        if (opp.salesPipelineStageRef === stageId) {
          const reorderedOp = updatedReorderedOps.find(rop => rop.id === opp.id)
          return reorderedOp || opp
        }
        return opp
      })

      // Sort opportunities by position within each stage
      const sortedOpportunities = updatedOpportunities.sort((a, b) => {
        if (a.salesPipelineStageRef === b.salesPipelineStageRef) {
          return (a.position || 0) - (b.position || 0)
        }
        return 0
      })

      return { opportunities: sortedOpportunities }
    })
  },

  updateOpportunity: async (opportunityId: string, updates: Partial<Opportunity>, _accessToken: string) => {
    set(state => ({
      opportunities: state.opportunities.map(opp => (opp.id === opportunityId ? { ...opp, ...updates } : opp)),
      isEditingOpportunity: false,
      editingOpportunityId: null
    }))
    return Promise.resolve()
  },

  quickUpdateOpportunity: async (opportunityId: string, updates: Partial<Opportunity>) => {
    set(state => ({
      opportunities: state.opportunities.map(opp => {
        if (opp.id !== opportunityId) return opp
        // Normalize quick-edit fields to canonical properties
        const normalized: Partial<Opportunity> = { ...updates }
        if (updates.title !== undefined) {
          normalized.name = updates.title
        }
        if (updates.amount !== undefined) {
          normalized.estimatedAmount = updates.amount
        }
        if (updates.estimatedCloseDate !== undefined) {
          normalized.closeDate = updates.estimatedCloseDate
        }
        return { ...opp, ...normalized }
      }),
      selectedOpportunity:
        state.selectedOpportunity?.id === opportunityId
          ? { ...state.selectedOpportunity, ...updates }
          : state.selectedOpportunity
    }))
    return Promise.resolve()
  },

  deleteOpportunity: async (opportunityId: string, _accessToken: string) => {
    set(state => ({
      opportunities: state.opportunities.filter(opp => opp.id !== opportunityId)
    }))
    return Promise.resolve()
  },

  setEditingOpportunity: (opportunityId: string | null) => {
    set({
      editingOpportunityId: opportunityId,
      isEditingOpportunity: opportunityId !== null
    })
  },

  selectOpportunity: (opportunityId: string | null) => {
    if (opportunityId === null) {
      set({
        selectedOpportunity: null,
        isViewingOpportunity: false
      })
      return
    }

    const opportunity = get().opportunities.find(opp => opp.id === opportunityId)

    set({
      selectedOpportunity: opportunity || null,
      isViewingOpportunity: opportunity !== undefined
    })
  }
}))
