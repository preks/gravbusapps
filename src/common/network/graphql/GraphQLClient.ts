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
    console.log('GraphQLClient making request to endpoint:', this.endpoint);
    console.log('Headers:', this.headers);
    console.log('Query:', query);
    console.log('Variables:', variables);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'same-origin',
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

    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    console.log('Response headers:', [...response.headers.entries()]);
    
    // If we get a redirect, log where it's trying to redirect to
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      console.error(`GraphQL request redirected (${response.status}) to: ${location}`);
      throw new Error(`Redirect detected: ${response.status} ${response.statusText} -> ${location}`);
    }

    if (!response.ok) {
      try {
        // Try to parse the response body for more info
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
      } catch (e) {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
      }
    }

    const result = await response.json();
    console.log('GraphQL response result:', result);

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }
}

export const graphQLClient = new GraphQLClient(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') ?? '');