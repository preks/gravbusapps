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
  changeMode: 'UPDATE' | 'CREATE';
}

export class OpportunityClient extends RestClient {
  private static instance: OpportunityClient;

  private constructor() {
    super(env('NEXT_PUBLIC_CUSTOMER_RELATIONS_ENDPOINT') || '');
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
    opportunityData: any, // The existing opportunity data
    accessToken: string
  ): Promise<any> {

    console.log('Updating opportunity stage:', { opportunityId, stageId, version, opportunityData })
    // Create payload with exact structure from API documentation
    // Ensure all UUID fields are strings, not objects
    console.log('DEBUG - Updating opportunity:', {
      id: opportunityId, 
      currentStage: opportunityData.stage,
      newStage: stageId,
      version: version
    });
    
    // Send essential fields plus any mandatory fields that might be required by backend validation
    // Different opportunities may have different validation requirements
    const updatedOpportunity = {
      id: opportunityId,
      version: version,
      stage: stageId,
      // Include name if present (likely a required field)
      ...(opportunityData.name ? { name: opportunityData.name } : {}),
      // Include estimatedAmount if present (likely a required field)
      ...(typeof opportunityData.estimatedAmount !== 'undefined' ? { estimatedAmount: opportunityData.estimatedAmount } : {})
    };
    
    console.log('Using essential fields payload for stage update');
    
    // Create the exact payload expected by the API
    const payload = {
      opportunity: updatedOpportunity,
      changeMode: 'UPDATE'
    };

    console.log('Update opportunity payload:', JSON.stringify(payload, null, 2));

    // Ensure accessToken is valid
    if (!accessToken) {
      throw new Error('Invalid access token for opportunity stage update');
    }

    return this.post('https://newwork-dev.newwork.com/processes/customer-relations/saveOpportunity', payload, {
      headers: {
        'Authorization': setAccessTokenToAuthorizationHeader(accessToken)
      }
    });
  }
}

export const opportunityClient = OpportunityClient.getInstance();
