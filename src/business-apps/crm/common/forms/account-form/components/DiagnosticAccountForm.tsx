import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { env } from '@/common/env/EnvUtils';

const DiagnosticAccountForm: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [selectedStaticValue, setSelectedStaticValue] = useState('');
  const [selectedApiValue, setSelectedApiValue] = useState('');

  const graphqlClient = useGraphQLClient(accessToken);

  // Static data test
  const staticOptions = [
    { id: 'customer', value: 'customer', label: 'Customer' },
    { id: 'prospect', value: 'prospect', label: 'Prospect' },
    { id: 'partner', value: 'partner', label: 'Partner' },
  ];

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStaticSelect = () => {
    if (staticOptions.length > 0) {
      addTestResult(`✅ Static select working: ${staticOptions.length} options available`);
    } else {
      addTestResult('❌ Static select failed: No options available');
    }
  };

  const testApiConnection = async () => {
    const endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK');
    addTestResult(`GraphQL Endpoint: ${endpoint || 'NOT CONFIGURED'}`);
    
    if (!accessToken) {
      addTestResult('❌ No access token available');
      return;
    }

    addTestResult(`✅ Access token available: ${accessToken.substring(0, 20)}...`);

    try {
      const query = `
        query TestQuery {
          CatalogEntry(limit: 1) {
            id
            value
          }
        }
      `;
      
      const result = await graphqlClient.request(query);
      addTestResult(`✅ GraphQL API test successful: ${result.CatalogEntry?.length || 0} records`);
    } catch (error) {
      addTestResult(`❌ GraphQL API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCountryQuery = async () => {
    try {
      const query = `
        query GetCountries {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "Country" }
                version: { _eq: "v1" }
              }
            }
            limit: 5
            orderBy: [{ value: ASC }]
          ) {
            id
            value
          }
        }
      `;
      
      const result = await graphqlClient.request(query);
      addTestResult(`✅ Country query successful: ${result.CatalogEntry?.length || 0} countries found`);
    } catch (error) {
      addTestResult(`❌ Country query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="gba:p-6 gba:max-w-2xl gba:mx-auto gba:space-y-6">
      <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Account Form Diagnostics</h1>
      
      {/* Static Select Test */}
      <div className="gba:bg-white gba:border gba:rounded-lg gba:p-4">
        <h2 className="gba:text-lg gba:font-semibold gba:mb-4">Static Select Test</h2>
        <Select value={selectedStaticValue} onValueChange={setSelectedStaticValue}>
          <SelectTrigger className="gba:w-full gba:mb-2">
            <SelectValue placeholder="Select an account type..." />
          </SelectTrigger>
          <SelectContent>
            {staticOptions.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="gba:text-sm gba:text-gray-600">
          Selected: {selectedStaticValue || 'None'}
        </p>
        <Button onClick={testStaticSelect} className="gba:mt-2">
          Test Static Select
        </Button>
      </div>

      {/* API Connection Tests */}
      <div className="gba:bg-white gba:border gba:rounded-lg gba:p-4">
        <h2 className="gba:text-lg gba:font-semibold gba:mb-4">API Connection Tests</h2>
        <div className="gba:space-x-2">
          <Button onClick={testApiConnection}>Test API Connection</Button>
          <Button onClick={testCountryQuery}>Test Country Query</Button>
        </div>
      </div>

      {/* Environment Info */}
      <div className="gba:bg-gray-50 gba:border gba:rounded-lg gba:p-4">
        <h2 className="gba:text-lg gba:font-semibold gba:mb-4">Environment Info</h2>
        <div className="gba:text-sm gba:space-y-1">
          <p><strong>Has Access Token:</strong> {accessToken ? 'Yes' : 'No'}</p>
          <p><strong>User ID:</strong> {userInfo?.employeeDetails?.employeeId || 'Not available'}</p>
          <p><strong>Environment:</strong> {typeof window !== 'undefined' ? 'Browser' : 'Server'}</p>
          <p><strong>GraphQL Endpoint:</strong> {env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'NOT CONFIGURED'}</p>
        </div>
      </div>

      {/* Test Results */}
      <div className="gba:bg-white gba:border gba:rounded-lg gba:p-4">
        <h2 className="gba:text-lg gba:font-semibold gba:mb-4">Test Results</h2>
        <div className="gba:bg-gray-50 gba:rounded gba:p-3 gba:max-h-60 gba:overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="gba:text-gray-500 gba:text-sm">No tests run yet. Click the test buttons above.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="gba:text-sm gba:mb-1 gba:font-mono">
                {result}
              </div>
            ))
          )}
        </div>
        <Button 
          onClick={() => setTestResults([])} 
          variant="secondary"
          className="gba:mt-2"
        >
          Clear Results
        </Button>
      </div>
    </div>
  );
};

export default DiagnosticAccountForm; 