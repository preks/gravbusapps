import { env } from "../../env/EnvUtils";
import { setAccessTokenToAuthorizationHeader } from "../HeaderUtils";

export class GraphQLClient {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async request<T = any>(
    accessToken: string,
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const headers = {
      'Authorization': setAccessTokenToAuthorizationHeader(accessToken)
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }
}

export const graphQLClient = new GraphQLClient(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') ?? '');