import { RestClient } from '../rest/RestClient';
import { env } from '../../env/EnvUtils';
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils';

export interface OpportunityUpdatePayload {
  opportunity: {
    id: string;
    version: number;
    name?: string;
    lastInteraction?: string;
    closeDate?: string;
    estimatedAmount?: number;
    winningChance?: number;
    stage: string;
    personal?: boolean;
    currencyRef?: string;
    sourceAppRef?: string;
    salesPipelineRef?: string;
    salesPipelineStageRef?: string;
    status?: string;
    account?: string;
    ownerEmployee?: string;
    ownerOrganization?: string;
    addresses?: Array<{
      id: string;
      version: number;
      businessKey?: string;
      additionalProperties?: Record<string, any>;
      addressType?: string;
      addressLine?: string;
      postalCode?: string;
      city?: string;
      regionRef?: string;
      countryRef?: string;
      opportunity: string;
    }>;
  };
  changeMode: 'UPDATE' | 'INSERT' | 'DELETE';
}

export class OpportunityClient extends RestClient {
  private static instance: OpportunityClient;

  private constructor() {
    super(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') || '');
  }

  public static getInstance(): OpportunityClient {
    if (!OpportunityClient.instance) {
      OpportunityClient.instance = new OpportunityClient();
    }
    return OpportunityClient.instance;
  }

  /**
   * Updates an opportunity's stage
   * @param opportunityId The opportunity ID
   * @param stageId The new stage ID
   * @param version The opportunity version
   * @param opportunityData The existing opportunity data
   * @param accessToken The access token for authentication
   * @returns A promise that resolves when the update is complete
   */
  public async updateOpportunityStage(
    opportunityId: string,
    stageId: string, 
    version: number,
    opportunityData: any, 
    accessToken: string
  ): Promise<any> {
    
    const updatedOpportunity = {
      id: opportunityId,
      version: version,
      stage: stageId,
      ...(opportunityData.name ? { name: opportunityData.name } : {}),
      ...(typeof opportunityData.estimatedAmount !== 'undefined' ? { estimatedAmount: opportunityData.estimatedAmount } : {})
    };
    
    const payload = {
      opportunity: updatedOpportunity,
      changeMode: 'UPDATE'
    };


    // Ensure accessToken is valid
    if (!accessToken) {
      throw new Error('Invalid access token for opportunity stage update');
    }

    return this.post('/customer-relations/saveOpportunity', payload, {
      headers: {
        'Authorization': setAccessTokenToAuthorizationHeader(accessToken)
      }
    });
  }
}

export const opportunityClient = OpportunityClient.getInstance();
