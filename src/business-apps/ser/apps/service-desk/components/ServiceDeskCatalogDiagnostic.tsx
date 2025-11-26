import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';

interface ServiceDeskCatalogDiagnosticProps extends BusinessAppContextProps {}

export const ServiceDeskCatalogDiagnostic: React.FC<ServiceDeskCatalogDiagnosticProps> = ({
  accessToken,
  userInfo
}) => {
  const [diagnosticResults, setDiagnosticResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Check environment variables
      results.envVars = {
        graphqlEndpoint: env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK'),
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        userId: userInfo?.id,
        windowEnvs: typeof window !== 'undefined' ? (window as any)['nw-envs'] : null
      };

      // Test GraphQL endpoint connectivity
      const graphqlEndpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'https://newwork-dev.newwork.com/v1/graphql';
      
      try {
        // Test 1: Check all catalogs
        const allCatalogsQuery = `
          query GetAllCatalogs {
            Catalog {
              id
              identifier
              version
              name
              description
            }
          }
        `;

        const allCatalogsResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: allCatalogsQuery
          }),
        });

        if (allCatalogsResponse.ok) {
          const allCatalogsResult = await allCatalogsResponse.json();
          results.allCatalogs = {
            success: true,
            data: allCatalogsResult.data?.Catalog || [],
            count: allCatalogsResult.data?.Catalog?.length || 0
          };
        } else {
          results.allCatalogs = {
            success: false,
            status: allCatalogsResponse.status,
            statusText: allCatalogsResponse.statusText,
            error: await allCatalogsResponse.text()
          };
        }

        // Test 2: Check specific ServiceDeskCatalog
        const serviceDeskQuery = `
          query GetServiceDeskCatalog {
            Catalog(where: {identifier: {_eq: "ServiceDeskCatalog"}}) {
              id
              identifier
              version
              name
              description
              catalogEntries(where: {isDeleted: {_eq: false}}) {
                id
                code
                value
                additionalValue1
                additionalValue2
                additionalValue3
                isDeleted
              }
            }
          }
        `;

        const serviceDeskResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: serviceDeskQuery
          }),
        });

        if (serviceDeskResponse.ok) {
          const serviceDeskResult = await serviceDeskResponse.json();
          results.serviceDeskCatalog = {
            success: true,
            data: serviceDeskResult.data?.Catalog || [],
            catalogCount: serviceDeskResult.data?.Catalog?.length || 0,
            entriesCount: serviceDeskResult.data?.Catalog?.[0]?.catalogEntries?.length || 0,
            entries: serviceDeskResult.data?.Catalog?.[0]?.catalogEntries || []
          };
        } else {
          results.serviceDeskCatalog = {
            success: false,
            status: serviceDeskResponse.status,
            statusText: serviceDeskResponse.statusText,
            error: await serviceDeskResponse.text()
          };
        }

        // Test 3: Search for catalogs with "desk" or "service" in name
        const searchQuery = `
          query SearchDeskCatalogs {
            Catalog(where: {
              _or: [
                {identifier: {_ilike: "%desk%"}},
                {identifier: {_ilike: "%service%"}},
                {name: {_ilike: "%desk%"}},
                {name: {_ilike: "%service%"}}
              ]
            }) {
              id
              identifier
              version
              name
              description
              catalogEntries(limit: 5) {
                id
                code
                value
                additionalValue3
              }
            }
          }
        `;

        const searchResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: searchQuery
          }),
        });

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          results.searchResults = {
            success: true,
            data: searchResult.data?.Catalog || [],
            count: searchResult.data?.Catalog?.length || 0
          };
        } else {
          results.searchResults = {
            success: false,
            status: searchResponse.status,
            statusText: searchResponse.statusText,
            error: await searchResponse.text()
          };
        }

      } catch (networkError) {
        results.networkError = {
          message: networkError instanceof Error ? networkError.message : String(networkError),
          endpoint: graphqlEndpoint
        };
      }

    } catch (error) {
      results.generalError = {
        message: error instanceof Error ? error.message : String(error)
      };
    }

    setDiagnosticResults(results);
    setLoading(false);
  };

  useEffect(() => {
    if (accessToken) {
      runDiagnostics();
    }
  }, [accessToken]);

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-sm" data-testid="service-desk-catalog-diagnostic">
      <h2 className="gba:text-xl gba:font-semibold gba:mb-4">Service Desk Catalog Diagnostic</h2>
      
      <button
        onClick={runDiagnostics}
        disabled={loading || !accessToken}
        className="gba:mb-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:disabled:opacity-50"
        data-testid="run-diagnostics-button"
      >
        {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </button>

      {Object.keys(diagnosticResults).length > 0 && (
        <div className="gba:space-y-4">
          {/* Environment Variables */}
          <div className="gba:border gba:rounded gba:p-4" data-testid="env-vars-section">
            <h3 className="gba:font-semibold gba:mb-2">Environment Variables</h3>
            <pre className="gba:bg-gray-100 gba:p-2 gba:rounded gba:text-sm gba:overflow-auto">
              {JSON.stringify(diagnosticResults.envVars, null, 2)}
            </pre>
          </div>

          {/* All Catalogs */}
          {diagnosticResults.allCatalogs && (
            <div className="gba:border gba:rounded gba:p-4" data-testid="all-catalogs-section">
              <h3 className="gba:font-semibold gba:mb-2">All Catalogs ({diagnosticResults.allCatalogs.count})</h3>
              <pre className="gba:bg-gray-100 gba:p-2 gba:rounded gba:text-sm gba:overflow-auto gba:max-h-60">
                {JSON.stringify(diagnosticResults.allCatalogs, null, 2)}
              </pre>
            </div>
          )}

          {/* Service Desk Catalog */}
          {diagnosticResults.serviceDeskCatalog && (
            <div className="gba:border gba:rounded gba:p-4" data-testid="service-desk-catalog-section">
              <h3 className="gba:font-semibold gba:mb-2">
                Service Desk Catalog (Entries: {diagnosticResults.serviceDeskCatalog.entriesCount})
              </h3>
              <pre className="gba:bg-gray-100 gba:p-2 gba:rounded gba:text-sm gba:overflow-auto gba:max-h-60">
                {JSON.stringify(diagnosticResults.serviceDeskCatalog, null, 2)}
              </pre>
            </div>
          )}

          {/* Search Results */}
          {diagnosticResults.searchResults && (
            <div className="gba:border gba:rounded gba:p-4" data-testid="search-results-section">
              <h3 className="gba:font-semibold gba:mb-2">
                Search Results ({diagnosticResults.searchResults.count})
              </h3>
              <pre className="gba:bg-gray-100 gba:p-2 gba:rounded gba:text-sm gba:overflow-auto gba:max-h-60">
                {JSON.stringify(diagnosticResults.searchResults, null, 2)}
              </pre>
            </div>
          )}

          {/* Network Error */}
          {diagnosticResults.networkError && (
            <div className="gba:border gba:border-red-300 gba:rounded gba:p-4 gba:bg-red-50" data-testid="network-error-section">
              <h3 className="gba:font-semibold gba:mb-2 gba:text-red-700">Network Error</h3>
              <pre className="gba:bg-red-100 gba:p-2 gba:rounded gba:text-sm gba:overflow-auto">
                {JSON.stringify(diagnosticResults.networkError, null, 2)}
              </pre>
            </div>
          )}

          {/* General Error */}
          {diagnosticResults.generalError && (
            <div className="gba:border gba:border-red-300 gba:rounded gba:p-4 gba:bg-red-50" data-testid="general-error-section">
              <h3 className="gba:font-semibold gba:mb-2 gba:text-red-700">General Error</h3>
              <pre className="gba:bg-red-100 gba:p-2 gba:rounded gba:text-sm gba:overflow-auto">
                {JSON.stringify(diagnosticResults.generalError, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
