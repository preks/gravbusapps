/**
 * Runtime Capabilities Test Tool
 *
 * This tool probes the prompt-manager js-runtime to discover
 * what built-in functions and capabilities are available.
 *
 * Use this to understand:
 * - What global functions exist (graphqlRequest, fetch, etc.)
 * - Whether mutations work
 * - Whether REST calls work
 * - What context/config is available
 */

import type { SchemaConfig } from '@/common/network/ai/prompt-manager/PromptManagerClient'

/**
 * Input schema
 */
export const RUNTIME_TEST_INPUT_SCHEMA: SchemaConfig['input'] = {
  type: 'object',
  properties: {
    test_type: {
      type: 'string',
      enum: ['capabilities', 'graphql_query', 'graphql_mutation', 'rest_call', 'create_lead'],
      description: 'Type of test to run'
    },
    graphql_query: {
      type: 'string',
      description: 'GraphQL query to execute (for graphql_query test)'
    },
    graphql_variables: {
      type: 'object',
      description: 'Variables for GraphQL query'
    },
    rest_url: {
      type: 'string',
      description: 'REST URL to call (for rest_call test)'
    },
    rest_method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'HTTP method for REST call'
    },
    rest_body: {
      type: 'object',
      description: 'Request body for REST call'
    },
    lead_data: {
      type: 'object',
      description: 'Lead data for create_lead test',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        companyName: { type: 'string' }
      }
    }
  },
  required: ['test_type']
}

/**
 * Output schema
 */
export const RUNTIME_TEST_OUTPUT_SCHEMA: SchemaConfig['output'] = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    test_type: { type: 'string' },
    capabilities: {
      type: 'object',
      description: 'Available runtime capabilities'
    },
    result: {
      type: 'object',
      description: 'Test result data'
    },
    error: { type: 'string' }
  },
  required: ['success', 'test_type']
}

/**
 * JavaScript source code for the runtime test tool
 */
export const RUNTIME_TEST_SOURCE = `
/**
 * Runtime Capabilities Test Tool
 * Probes what functions and capabilities are available in the js-runtime
 */
async function execute(input) {
  const { test_type } = input;
  
  try {
    switch (test_type) {
      case 'capabilities':
        return await testCapabilities();
      
      case 'graphql_query':
        return await testGraphQLQuery(input);
      
      case 'graphql_mutation':
        return await testGraphQLMutation(input);
      
      case 'rest_call':
        return await testRestCall(input);
      
      case 'create_lead':
        return await testCreateLead(input);
      
      default:
        return {
          success: false,
          test_type,
          error: 'Unknown test type: ' + test_type
        };
    }
  } catch (error) {
    return {
      success: false,
      test_type,
      error: error.message || String(error),
      stack: error.stack
    };
  }
}

/**
 * Test 1: Discover available capabilities
 */
async function testCapabilities() {
  const capabilities = {
    // Check for common global functions
    has_graphqlRequest: typeof graphqlRequest !== 'undefined',
    has_fetch: typeof fetch !== 'undefined',
    has_console: typeof console !== 'undefined',
    has_JSON: typeof JSON !== 'undefined',
    has_Promise: typeof Promise !== 'undefined',
    has_setTimeout: typeof setTimeout !== 'undefined',
    has_Buffer: typeof Buffer !== 'undefined',
    
    // Check for context/config
    has_context: typeof context !== 'undefined',
    has_config: typeof config !== 'undefined',
    has_settings: typeof settings !== 'undefined',
    has_env: typeof env !== 'undefined',
    has_process: typeof process !== 'undefined',
    
    // Check for HTTP helpers
    has_httpRequest: typeof httpRequest !== 'undefined',
    has_restRequest: typeof restRequest !== 'undefined',
    has_apiCall: typeof apiCall !== 'undefined',
    
    // Try to list global keys
    globalKeys: []
  };
  
  // Try to get global object keys
  try {
    if (typeof globalThis !== 'undefined') {
      capabilities.globalKeys = Object.keys(globalThis).slice(0, 50);
    } else if (typeof global !== 'undefined') {
      capabilities.globalKeys = Object.keys(global).slice(0, 50);
    } else if (typeof window !== 'undefined') {
      capabilities.globalKeys = Object.keys(window).slice(0, 50);
    }
  } catch (e) {
    capabilities.globalKeysError = e.message;
  }
  
  // Try to inspect context if available
  if (typeof context !== 'undefined') {
    try {
      capabilities.contextKeys = Object.keys(context);
      capabilities.contextConfig = context.config ? Object.keys(context.config) : null;
    } catch (e) {
      capabilities.contextError = e.message;
    }
  }
  
  // Check if we have access token somewhere
  capabilities.has_accessToken = !!(
    (typeof context !== 'undefined' && context?.accessToken) ||
    (typeof context !== 'undefined' && context?.config?.accessToken) ||
    (typeof settings !== 'undefined' && settings?.accessToken) ||
    (typeof env !== 'undefined' && env?.ACCESS_TOKEN)
  );
  
  return {
    success: true,
    test_type: 'capabilities',
    capabilities,
    message: 'Runtime capabilities discovered'
  };
}

/**
 * Test 2: Try a simple GraphQL query
 */
async function testGraphQLQuery(input) {
  const query = input.graphql_query || \`
    query TestQuery {
      Lead(limit: 1) {
        id
        firstName
        lastName
      }
    }
  \`;
  
  const variables = input.graphql_variables || {};
  
  // Try graphqlRequest if available
  if (typeof graphqlRequest !== 'undefined') {
    const result = await graphqlRequest(query, variables);
    return {
      success: true,
      test_type: 'graphql_query',
      method: 'graphqlRequest',
      result
    };
  }
  
  // Try fetch as fallback
  if (typeof fetch !== 'undefined') {
    // We'd need the GraphQL endpoint URL - check if it's in context/config
    const endpoint = 
      (typeof context !== 'undefined' && context?.config?.GRAPHQL_ENDPOINT) ||
      (typeof env !== 'undefined' && env?.GRAPHQL_ENDPOINT) ||
      null;
    
    if (!endpoint) {
      return {
        success: false,
        test_type: 'graphql_query',
        error: 'No GraphQL endpoint found. graphqlRequest not available and no GRAPHQL_ENDPOINT in config.',
        suggestion: 'Add GRAPHQL_ENDPOINT to tool settings'
      };
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    
    const result = await response.json();
    return {
      success: true,
      test_type: 'graphql_query',
      method: 'fetch',
      result
    };
  }
  
  return {
    success: false,
    test_type: 'graphql_query',
    error: 'Neither graphqlRequest nor fetch is available'
  };
}

/**
 * Test 3: Try a GraphQL mutation
 */
async function testGraphQLMutation(input) {
  // Simple mutation that shouldn't actually change data
  // Just checking if mutations are supported
  const query = input.graphql_query || \`
    mutation TestMutation {
      __typename
    }
  \`;
  
  if (typeof graphqlRequest !== 'undefined') {
    const result = await graphqlRequest(query, {});
    return {
      success: true,
      test_type: 'graphql_mutation',
      method: 'graphqlRequest',
      result,
      note: 'Mutations appear to be supported'
    };
  }
  
  return {
    success: false,
    test_type: 'graphql_mutation',
    error: 'graphqlRequest not available for mutations'
  };
}

/**
 * Test 4: Try a REST API call
 */
async function testRestCall(input) {
  if (typeof fetch === 'undefined') {
    return {
      success: false,
      test_type: 'rest_call',
      error: 'fetch is not available in this runtime'
    };
  }
  
  const url = input.rest_url || 'https://httpbin.org/get';
  const method = input.rest_method || 'GET';
  const body = input.rest_body;
  
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  // Add auth if available
  const accessToken = 
    (typeof context !== 'undefined' && context?.accessToken) ||
    (typeof context !== 'undefined' && context?.config?.ACCESS_TOKEN) ||
    null;
  
  if (accessToken) {
    options.headers['Authorization'] = 'Bearer ' + accessToken;
  }
  
  const response = await fetch(url, options);
  const result = await response.json().catch(() => response.text());
  
  return {
    success: response.ok,
    test_type: 'rest_call',
    status: response.status,
    hasAuthToken: !!accessToken,
    result
  };
}

/**
 * Test 5: Try to create a CRM Lead
 */
async function testCreateLead(input) {
  const leadData = input.lead_data || {
    firstName: 'Test',
    lastName: 'Lead',
    email: 'test@example.com',
    companyName: 'Test Company'
  };
  
  // First, check if we have graphqlRequest for mutations
  if (typeof graphqlRequest !== 'undefined') {
    // Try GraphQL mutation
    const mutation = \`
      mutation InsertLead($object: LeadInsertInput!) {
        insertLead(object: $object) {
          id
          firstName
          lastName
          email
        }
      }
    \`;
    
    const variables = {
      object: {
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        companyName: leadData.companyName,
        leadStatusRef: 'LeadStatus:v1:NEW'
      }
    };
    
    try {
      const result = await graphqlRequest(mutation, variables);
      return {
        success: !result.errors,
        test_type: 'create_lead',
        method: 'graphql_mutation',
        result,
        note: result.errors ? 'Mutation failed - check schema' : 'Lead created successfully!'
      };
    } catch (e) {
      return {
        success: false,
        test_type: 'create_lead',
        method: 'graphql_mutation',
        error: e.message,
        note: 'GraphQL mutation threw an error'
      };
    }
  }
  
  // Try REST API as fallback
  if (typeof fetch !== 'undefined') {
    const baseUrl = 
      (typeof context !== 'undefined' && context?.config?.API_BASE_URL) ||
      (typeof env !== 'undefined' && env?.API_BASE_URL) ||
      null;
    
    const accessToken = 
      (typeof context !== 'undefined' && context?.accessToken) ||
      (typeof context !== 'undefined' && context?.config?.ACCESS_TOKEN) ||
      null;
    
    if (!baseUrl) {
      return {
        success: false,
        test_type: 'create_lead',
        error: 'No API_BASE_URL configured for REST call',
        suggestion: 'Add API_BASE_URL to tool settings'
      };
    }
    
    const payload = {
      lead: {
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email,
        companyName: leadData.companyName,
        leadStatusRef: 'LeadStatus:v1:NEW'
      },
      changeMode: 'INSERT'
    };
    
    const response = await fetch(baseUrl + '/customer-relations/saveLead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': 'Bearer ' + accessToken } : {})
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json().catch(() => ({ text: await response.text() }));
    
    return {
      success: response.ok,
      test_type: 'create_lead',
      method: 'rest_api',
      status: response.status,
      hasAuthToken: !!accessToken,
      result
    };
  }
  
  return {
    success: false,
    test_type: 'create_lead',
    error: 'No method available to create lead (neither graphqlRequest nor fetch)'
  };
}
`

/**
 * This tool used to be a prompt-manager persisted function tool (js-runtime).
 *
 * Prompt Manager no longer persists function tools; functions are discovered from functions-service.
 * Keep the schema/source here for reference when implementing a functions-service tool.
 */
export const RUNTIME_CAPABILITIES_TEST_FUNCTION_CODE = 'function.runtime_capabilities_test'
