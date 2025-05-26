import { env } from "../../env/EnvUtils";
import { setAccessTokenToAuthorizationHeader } from "../HeaderUtils";

export class GraphQLClient {
  private endpoint: string;
  private headers: Record<string, string> = {};

  constructor(endpoint: string, headers: Record<string, string> = {}) {
    this.endpoint = endpoint;
    this.headers = headers;
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {};
    }

    this.headers["Authorization"] = setAccessTokenToAuthorizationHeader(accessToken);
  }
  
  async request<T = any>(query: string,
    variables?: Record<string, any>
  ): Promise<T> {

    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
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