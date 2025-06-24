import { 
  GET_PIPELINE_OPPORTUNITIES, 
  GET_PIPELINES, 
  GET_PIPELINE_STAGES, 
  UPDATE_OPPORTUNITY_STAGE 
} from '../queries/kanbanQueries';
import { type Pipeline, type Stage, type Opportunity } from './data';
import { GraphQLClient } from '../../../../../common/network/graphql/GraphQLClient';

/**
 * Service for kanban board data management
 */
export class KanbanService {
  private client: GraphQLClient;
  
  constructor(client: GraphQLClient) {
    this.client = client;
  }
  /**
   * Fetch all pipelines
   */
  async fetchPipelines(): Promise<Pipeline[]> {
    try {
      console.log('Fetching pipelines with query:', GET_PIPELINES);
      const data = await this.client.request<{ Pipeline: Pipeline[] }>(GET_PIPELINES);
      console.log('Pipeline query response:', data);
      
      return data?.Pipeline || [];
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      return [];
    }
  }

  /**
   * Fetch stages for a specific pipeline
   */
  async fetchPipelineStages(pipelineId: string): Promise<Stage[]> {
    try {
      console.log('Fetching stages for pipeline:', pipelineId);
      console.log('Query:', GET_PIPELINE_STAGES);
      console.log('Variables:', { pipelineId });
      
      const data = await this.client.request<{ Stage: Stage[] }>(
        GET_PIPELINE_STAGES,
        { pipelineId }
      );
      
      console.log('Stage query response:', data);
      return data?.Stage || [];
    } catch (error) {
      console.error('Error fetching pipeline stages:', error);
      return [];
    }
  }

  /**
   * Fetch opportunities for a specific pipeline
   */
  async fetchPipelineOpportunities(pipelineId: string): Promise<Opportunity[]> {
    try {
      console.log('Fetching opportunities for pipeline:', pipelineId);
      console.log('Query:', GET_PIPELINE_OPPORTUNITIES);
      console.log('Variables:', { pipelineRef: pipelineId });
      
      const data = await this.client.request<{ Opportunity: any[] }>(
        GET_PIPELINE_OPPORTUNITIES,
        { pipelineRef: pipelineId }
      );
      
      console.log('Opportunity query response:', data);
      
      // Map the GraphQL response to our Opportunity interface
      const opportunities = data?.Opportunity || [];
      console.log('Raw opportunities data:', opportunities);
      
      if (opportunities.length === 0) {
        console.warn('No opportunities returned from API for pipeline:', pipelineId);
      }
      
      const mappedOpportunities = opportunities.map((opp: any) => {
        console.log('Mapping opportunity:', opp);
        return {
          id: opp.id,
          title: opp.title,
          description: opp.description,
          value: opp.value,
          pipelineId: opp.pipelineId,
          stageId: opp.stageId,
          assignedTo: opp.assignedTo,
          createdAt: opp.createdAt,
          updatedAt: opp.updatedAt,
          lastActivityAt: opp.lastActivityAt,
          company: opp.company?.name || '',
          contact: '', // Map contact information if available in the API
          tags: opp.tags || [],
          stageEnteredAt: opp.lastActivityAt, // Use last activity as stage entered time
        };
      });
      
      return mappedOpportunities;
    } catch (error) {
      console.error('Error fetching pipeline opportunities:', error);
      return [];
    }
  }

  /**
   * Update an opportunity's stage
   */
  async updateOpportunityStage(opportunityId: string, stageId: string): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      await this.client.request(
        UPDATE_OPPORTUNITY_STAGE,
        {
          id: opportunityId,
          stageId: stageId,
          lastActivityAt: now
        }
      );
      return true;
    } catch (error) {
      console.error('Error updating opportunity stage:', error);
      return false;
    }
  }
}

/**
 * Hook to use the KanbanService
 */
export const useKanbanService = () => {
  return new KanbanService();
};
