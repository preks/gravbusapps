import { RestClient, RequestOptions } from '../rest/RestClient';
import { env } from '../../env/EnvUtils';
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils';
import { FlowPathParams, FlowPayload, FlowResponse } from '../../types/FlowTypes';

/**
 * Client for interacting with Flow service
 * Enables triggering and managing flows
 */
export class FlowClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') ?? '');
  }

  /**
   * Set the access token for authentication
   * @param accessToken - The access token to use for authentication
   */
  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {};
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken);
  }

  /**
   * Executes a new flow execution
   * @param payload - The flow execution payload
   * @param options - Additional request options
   * @returns A Promise that resolves to a FlowResponse containing the flow execution details
   */
  public async executeFlow(
    params: FlowPathParams,
    payload: FlowPayload,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<FlowResponse> {
    try {
      return await this.post<FlowResponse>(
        `/${params.accessScope}/${params.context}`,
        payload,
        options
      );
    } catch (error) {
      console.error('FlowClient: Error executing flow:', error);
      throw error;
    }
  }
}

export const flowClient = new FlowClient();
