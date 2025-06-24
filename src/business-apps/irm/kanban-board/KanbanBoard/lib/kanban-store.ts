import { create } from 'zustand';
import { Stage, Opportunity } from './types';
import { FIXED_STAGES } from './stages';
import { GET_OPPORTUNITIES } from '../queries/kanbanQueries';
import { graphQLClient } from '../../../../../common/network/graphql/GraphQLClient';
import { opportunityClient } from '../../../../../common/network/opportunity/OpportunityClient';

// Simplified Kanban store
interface KanbanStore {
  // State
  stages: Stage[];
  opportunities: Opportunity[];
  loading: boolean;
  error: Error | null;
  isAddingOpportunity: boolean;
  isEditingOpportunity: boolean;
  editingOpportunityId: string | null;

  // Actions
  fetchOpportunities: (accessToken: string) => Promise<Opportunity[]>;
  moveOpportunity: (opportunityId: string, targetStageId: string, accessToken: string) => Promise<void>;
  addOpportunity: (opportunityData: Partial<Opportunity>, accessToken: string) => Promise<void>;
  updateOpportunity: (opportunityId: string, updates: Partial<Opportunity>, accessToken: string) => Promise<void>;
  deleteOpportunity: (opportunityId: string, accessToken: string) => Promise<void>;
  setEditingOpportunity: (opportunityId: string | null) => void;
  setIsAddingOpportunity: (isAdding: boolean) => void;
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  // Initial state
  stages: FIXED_STAGES,
  opportunities: [],
  loading: false,
  error: null,
  isAddingOpportunity: false,
  isEditingOpportunity: false,
  editingOpportunityId: null,

  // Actions
  fetchOpportunities: async (accessToken: string) => {
    set({ loading: true, error: null });
    try {
      // Set the access token before making the request
      graphQLClient.setAccessToken(accessToken);
      const response = await graphQLClient.request(GET_OPPORTUNITIES, { offset: 0 });
      
      if (!response || !response.Opportunity) {
        console.error('Invalid response format:', response);
        set({ error: new Error('Invalid response format from server'), loading: false });
        return [];
      }

      const opportunities = response.Opportunity.map((opp: any) => ({
        ...opp,
        id: opp.id || '',
        title: opp.name || '', // Using name from the query
        stageId: opp.stage || FIXED_STAGES[0].id, // Using stage field directly from the query 
        version: opp.version || 0,
        owner: opp.ownerEmployee?.fullName || 'Unassigned',
        account: opp.account?.name || '',
        amount: opp.estimatedAmount || 0
      }));
      
      set({ opportunities, loading: false });
      return opportunities;
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      set({ error: error as Error, loading: false });
      return [];
    }
  },
  
  moveOpportunity: async (opportunityId: string, targetStageId: string, accessToken: string) => {
    try {
      const opportunity = get().opportunities.find(opp => opp.id === opportunityId);
      if (!opportunity) return;
      
      console.log('Moving opportunity to new stage:', { opportunityId, targetStageId, currentVersion: opportunity.version });
      
      // Use the REST client to update the opportunity stage - use the current version, not incremented
      await opportunityClient.updateOpportunityStage(
        opportunityId,
        targetStageId,
        opportunity.version, // Don't increment version here, server will handle it
        opportunity,
        accessToken
      );
      
      // Update local state after successful API call
      set(state => ({
        opportunities: state.opportunities.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, stageId: targetStageId, version: opp.version + 1 } 
            : opp
        )
      }));
    } catch (error) {
      console.error('Error moving opportunity:', error);
      set({ error: error as Error });
    }
  },
  
  addOpportunity: async (opportunityData: Partial<Opportunity>, accessToken: string) => {
    console.log('Adding opportunity with data:', opportunityData, 'using token:', accessToken);
    // In a real implementation, we would call an API endpoint to create a new opportunity
    // For now, we'll just add it to the local state
    set({ isAddingOpportunity: false });
    return Promise.resolve();
  },
  
  updateOpportunity: async (opportunityId: string, updates: Partial<Opportunity>, accessToken: string) => {
    console.log('Updating opportunity:', opportunityId, 'with updates:', updates, 'using token:', accessToken);
    // In a real implementation, we would call an API endpoint to update the opportunity
    // For now, we'll just update it in the local state
    set(state => ({
      opportunities: state.opportunities.map(opp => 
        opp.id === opportunityId ? { ...opp, ...updates } : opp
      ),
      isEditingOpportunity: false,
      editingOpportunityId: null
    }));
    return Promise.resolve();
  },
  
  deleteOpportunity: async (opportunityId: string, accessToken: string) => {
    console.log('Deleting opportunity:', opportunityId, 'using token:', accessToken);
    // In a real implementation, we would call an API endpoint to delete the opportunity
    // For now, we'll just remove it from the local state
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
  
  setIsAddingOpportunity: (isAdding: boolean) => {
    set({ isAddingOpportunity: isAdding });
  }
}));
