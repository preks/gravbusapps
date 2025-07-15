import { create } from 'zustand';
import { Stage, Opportunity } from './types';
import { FIXED_STAGES } from './stages';
import { GET_OPPORTUNITIES } from '../queries/kanbanQueries';
import { graphQLClient } from '@/common/network/graphql/GraphQLClient';
import { opportunityClient } from '@/common/network/opportunity/OpportunityClient';
import { enforceQueryLimit } from '../../../utils/queryLimits';

interface KanbanStore {
  stages: Stage[];
  opportunities: Opportunity[];
  loading: boolean;
  error: Error | null;
  isEditingOpportunity: boolean;
  editingOpportunityId: string | null;
  selectedOpportunity: Opportunity | null;
  isViewingOpportunity: boolean;

  fetchOpportunities: (accessToken: string, employeeId?: string, sourceApp?: string, selectedEmployeeIds?: string[]) => Promise<Opportunity[]>;
  moveOpportunity: (opportunityId: string, targetStageId: string, accessToken: string) => Promise<void>;
  updateOpportunity: (opportunityId: string, updates: Partial<Opportunity>, accessToken: string) => Promise<void>;
  deleteOpportunity: (opportunityId: string, accessToken: string) => Promise<void>;
  setEditingOpportunity: (opportunityId: string | null) => void;
  selectOpportunity: (opportunityId: string | null) => void;
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

  fetchOpportunities: async (accessToken: string, employeeId?: string, sourceApp?: string, selectedEmployeeIds?: string[]) => {
    set({ loading: true, error: null });
    try {

      graphQLClient.setAccessToken(accessToken);
      
      // Build where conditions
      const where: any = { isDeleted: { _eq: false } };
      
      // Add sourceApp filtering if provided
      if (sourceApp) {
        where.sourceApp = { _eq: sourceApp };
      }
      
      // Handle employee filtering logic
      if (selectedEmployeeIds !== undefined) {
        if (selectedEmployeeIds.length > 0) {
          // If specific employees are selected, filter by those
          where.ownerEmployeeId = { _in: selectedEmployeeIds };
        } else {
          // If in "selected employees" mode but none selected, show no results
          where.ownerEmployeeId = { _in: [] };
        }
      } else if (employeeId) {
        // Fallback to single employee filter (for "My Opportunities")
        where.ownerEmployeeId = { _eq: employeeId };
      }
      // If no employee filtering is specified, show all opportunities
      
      const response = await graphQLClient.request(GET_OPPORTUNITIES, { 
        offset: 0, 
        limit: enforceQueryLimit(200), // Enforce the 100 item limit instead of 200
        where 
      });
      
      if (!response || !response.Opportunity) {
  
        set({ error: new Error('Invalid response format from server'), loading: false });
        return [];
      }

      let opportunities = response.Opportunity.map((opp: any) => ({
        ...opp,
        id: opp.id || '',
        title: opp.name || '',
        stageId: opp.stage || FIXED_STAGES[0].id, 
        version: opp.version || 0,
        owner: opp.ownerEmployee?.fullName || 'Unassigned',
        account: opp.account?.name || '',
        amount: opp.estimatedAmount || 0
      }));
      
      set({ opportunities, loading: false });
      return opportunities;
    } catch (error) {
      set({ error: error as Error, loading: false });
      return [];
    }
  },
  
  moveOpportunity: async (opportunityId: string, targetStageId: string, accessToken: string) => {
    try {
      const opportunity = get().opportunities.find(opp => opp.id === opportunityId);
      if (!opportunity) return;
      
      
      await opportunityClient.updateOpportunityStage(
        opportunityId,
        targetStageId,
        opportunity.version,
        opportunity,
        accessToken
      );
      
      
      set(state => ({
        opportunities: state.opportunities.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, stageId: targetStageId, version: opp.version + 1 } 
            : opp
        )
      }));
    } catch (error) {
      set({ error: error as Error });
    }
  },
  

  
  updateOpportunity: async (opportunityId: string, updates: Partial<Opportunity>, _accessToken: string) => {
    set(state => ({
      opportunities: state.opportunities.map(opp => 
        opp.id === opportunityId ? { ...opp, ...updates } : opp
      ),
      isEditingOpportunity: false,
      editingOpportunityId: null
    }));
    return Promise.resolve();
  },
  
  deleteOpportunity: async (opportunityId: string, _accessToken: string) => {
    set(state => ({
      opportunities: state.opportunities.filter(opp => opp.id !== opportunityId)
    }));
    return Promise.resolve();
  },
  
  setEditingOpportunity: (opportunityId: string | null) => {
    set({
      editingOpportunityId: opportunityId,
      isEditingOpportunity: opportunityId !== null
    });
  },
  
  selectOpportunity: (opportunityId: string | null) => {
    if (opportunityId === null) {
      set({
        selectedOpportunity: null,
        isViewingOpportunity: false
      });
      return;
    }

    const opportunity = get().opportunities.find(opp => opp.id === opportunityId);
    
    set({
      selectedOpportunity: opportunity || null,
      isViewingOpportunity: opportunity !== undefined
    });
  }
})); 