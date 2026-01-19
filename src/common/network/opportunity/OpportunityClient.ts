import { RestClient } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'

export interface OpportunityAddress {
  id?: string
  version?: number
  businessKey?: string
  additionalProperties?: Record<string, any>
  addressType?: string
  addressLine?: string
  postalCode?: string
  city?: string
  regionRef?: string
  countryRef?: string
  opportunity?: string
}

export interface OpportunityCommunicationChannel {
  id?: string
  version?: number
  channelType?: string
  channelValue?: string
  isPrimary?: boolean
  opportunity?: string
}

export interface OpportunityTag {
  id?: string
  version?: number
  tagName?: string
  tagValue?: string
  opportunity?: string
}

export interface OpportunityPayload {
  id?: string
  version?: number
  name?: string
  businessKey?: string
  code?: string

  // Core opportunity fields
  estimatedAmount?: number
  winningChance?: number
  closeDate?: string
  lastInteraction?: string
  notesSummary?: string

  // Status and pipeline fields
  opportunityStatusRef?: string
  status?: string
  stage?: string
  pipelineRef?: string
  salesPipelineRef?: string
  salesPipelineStageRef?: string

  // Relationship fields
  accountId?: string
  leadId?: string
  ownerEmployeeId?: string
  ownerOrganizationId?: string

  // Campaign Information
  salesCampaignId?: string

  // Currency and system fields
  currencyRef?: string
  sourceApp?: string
  personal?: boolean

  // Additional properties
  additionalProperties?: Record<string, any>
  acl?: Record<string, any>
  express1?: Record<string, any>
  express2?: Record<string, any>

  // Related entities
  addresses?: OpportunityAddress[]
  communicationChannels?: OpportunityCommunicationChannel[]
  tags?: OpportunityTag[]

  // Audit fields
  activeFrom?: string
  activeTo?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  processInstanceId?: string
  recordState?: string
  synchronizedAt?: string
  isDeleted?: boolean
}

export interface OpportunitySavePayload {
  opportunity: OpportunityPayload
  changeMode: 'UPDATE' | 'INSERT' | 'DELETE'
}

export interface OpportunityUpdatePayload {
  opportunity: {
    id: string
    version: number
    name?: string
    lastInteraction?: string
    closeDate?: string
    estimatedAmount?: number
    winningChance?: number
    stage: string
    personal?: boolean
    currencyRef?: string
    sourceAppRef?: string
    salesPipelineRef?: string
    salesPipelineStageRef?: string
    status?: string
    account?: string
    ownerEmployee?: string
    ownerOrganization?: string
    addresses?: Array<{
      id: string
      version: number
      businessKey?: string
      additionalProperties?: Record<string, any>
      addressType?: string
      addressLine?: string
      postalCode?: string
      city?: string
      regionRef?: string
      countryRef?: string
      opportunity: string
    }>
  }
  changeMode: 'UPDATE' | 'INSERT' | 'DELETE'
}

export class OpportunityClient extends RestClient {
  private static instance: OpportunityClient

  private constructor() {
    super(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') || '')
  }

  public static getInstance(): OpportunityClient {
    if (!OpportunityClient.instance) {
      OpportunityClient.instance = new OpportunityClient()
    }
    return OpportunityClient.instance
  }

  /**
   * Creates or updates an opportunity
   * @param opportunityData The opportunity data to save
   * @param accessToken The access token for authentication
   * @param changeMode The operation mode (INSERT for create, UPDATE for update)
   * @returns A promise that resolves with the saved opportunity data
   */
  public async saveOpportunity(
    opportunityData: OpportunityPayload,
    accessToken: string,
    changeMode: 'INSERT' | 'UPDATE' = 'INSERT'
  ): Promise<any> {
    if (!accessToken) {
      throw new Error('Invalid access token for opportunity save operation')
    }

    const payload: OpportunitySavePayload = {
      opportunity: opportunityData,
      changeMode
    }

    return this.post('/customer-relations/saveOpportunity', payload, {
      headers: {
        Authorization: setAccessTokenToAuthorizationHeader(accessToken),
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Updates an opportunity's pipeline stage
   * @param opportunityId The opportunity ID
   * @param stageId The new stage ID (catalog entry ID)
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
      salesPipelineStageRef: stageId, // Use only catalog entry ID for salesPipelineStageRef (stage field is deprecated)
      ...(opportunityData.name ? { name: opportunityData.name } : {}),
      ...(typeof opportunityData.estimatedAmount !== 'undefined'
        ? { estimatedAmount: opportunityData.estimatedAmount }
        : {})
    }

    const payload = {
      opportunity: updatedOpportunity,
      changeMode: 'UPDATE'
    }

    // Ensure accessToken is valid
    if (!accessToken) {
      throw new Error('Invalid access token for opportunity stage update')
    }

    return this.post('/customer-relations/saveOpportunity', payload, {
      headers: {
        Authorization: setAccessTokenToAuthorizationHeader(accessToken)
      }
    })
  }
}

export const opportunityClient = OpportunityClient.getInstance()
