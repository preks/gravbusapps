import React from 'react';
import { Card, Alert, Button, Collapse } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveStructureId } from '@/common/utils/windowUtils';
import { useUserCapabilitiesGraphQL } from '../../../hooks/useUserCapabilitiesGraphQL';
import { useDesksForUser } from '../../../hooks/useDesksForUser';
import { useUserCapabilities } from '../hooks/useUserCapabilities';

const { Panel } = Collapse;

export interface ServiceDeskDiagnosticProps extends BusinessAppContextProps {}

/**
 * Diagnostic component to help debug Service Desk capability loading issues
 */
export const ServiceDeskDiagnostic: React.FC<ServiceDeskDiagnosticProps> = ({
  accessToken,
  userInfo,
}) => {
  // Get data from all hooks
  const graphqlHook = useUserCapabilitiesGraphQL({ accessToken, userInfo });
  const desksHook = useDesksForUser({ accessToken, userInfo });
  const capabilitiesHook = useUserCapabilities({ accessToken, userInfo });

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleClearCache = () => {
    // Clear any service-related sessionStorage data
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('services-plus-')) {
        sessionStorage.removeItem(key);
      }
    });
    handleRefresh();
  };

  const diagnosticData = {
    environment: {
      accessToken: !!accessToken,
      employeeId: userInfo?.employeeDetails?.employeeId || 'N/A',
      structureId: getCurrentActiveStructureId(),
      userAgent: navigator.userAgent,
    },
    graphqlHook: {
      capabilities: graphqlHook.capabilities.length,
      organizationalUnits: graphqlHook.organizationalUnits.length,
      positions: graphqlHook.positions.length,
      isLoading: graphqlHook.isLoading,
      error: graphqlHook.error,
    },
    desksHook: {
      availableDesks: desksHook.availableDesks.length,
      deskNames: desksHook.availableDesks.map(d => d.desk),
      isLoading: desksHook.isLoading,
      error: desksHook.error,
    },
    capabilitiesHook: {
      capabilities: capabilitiesHook.capabilities?.length || 0,
      capabilityNames: capabilitiesHook.capabilities?.map(c => c.name) || [],
      isLoading: capabilitiesHook.isLoading,
      error: capabilitiesHook.error,
    },
  };

  return (
    <div data-testid="service-desk-diagnostic" className="gba:p-6 gba:max-w-4xl gba:mx-auto">
      <Card 
        title={getTranslationFromI18nKeyAndLabel(
          'services.diagnostic.title',
          'Service Desk Diagnostic'
        )}
        className="gba:mb-6"
      >
        <div className="gba:mb-4">
          <Alert
            message={getTranslationFromI18nKeyAndLabel(
              'services.diagnostic.description.title',
              'Diagnostic Information'
            )}
            description={getTranslationFromI18nKeyAndLabel(
              'services.diagnostic.description.text',
              'Use this information to debug Service Desk capability loading issues.'
            )}
            type="info"
            showIcon
            className="gba:mb-4"
          />
          
          <div className="gba:flex gba:gap-2">
            <Button type="primary" onClick={handleRefresh}>
              {getTranslationFromI18nKeyAndLabel('services.diagnostic.refresh', 'Refresh')}
            </Button>
            <Button onClick={handleClearCache}>
              {getTranslationFromI18nKeyAndLabel('services.diagnostic.clearCache', 'Clear Cache')}
            </Button>
          </div>
        </div>

        <Collapse defaultActiveKey={['status']}>
          <Panel 
            header={getTranslationFromI18nKeyAndLabel('services.diagnostic.status', 'Current Status')} 
            key="status"
          >
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
              <Card size="small" title="GraphQL Hook">
                <div className="gba:space-y-2">
                  <div>Capabilities: <strong>{diagnosticData.graphqlHook.capabilities}</strong></div>
                  <div>Org Units: <strong>{diagnosticData.graphqlHook.organizationalUnits}</strong></div>
                  <div>Loading: <strong>{diagnosticData.graphqlHook.isLoading ? 'Yes' : 'No'}</strong></div>
                  {diagnosticData.graphqlHook.error && (
                    <Alert message={diagnosticData.graphqlHook.error} type="error" size="small" />
                  )}
                </div>
              </Card>

              <Card size="small" title="Desks Hook">
                <div className="gba:space-y-2">
                  <div>Available Desks: <strong>{diagnosticData.desksHook.availableDesks}</strong></div>
                  <div>Desk Names: <strong>{diagnosticData.desksHook.deskNames.join(', ') || 'None'}</strong></div>
                  <div>Loading: <strong>{diagnosticData.desksHook.isLoading ? 'Yes' : 'No'}</strong></div>
                  {diagnosticData.desksHook.error && (
                    <Alert message={diagnosticData.desksHook.error} type="error" size="small" />
                  )}
                </div>
              </Card>

              <Card size="small" title="Final Capabilities">
                <div className="gba:space-y-2">
                  <div>Capabilities: <strong>{diagnosticData.capabilitiesHook.capabilities}</strong></div>
                  <div>Names: <strong>{diagnosticData.capabilitiesHook.capabilityNames.join(', ') || 'None'}</strong></div>
                  <div>Loading: <strong>{diagnosticData.capabilitiesHook.isLoading ? 'Yes' : 'No'}</strong></div>
                  {diagnosticData.capabilitiesHook.error && (
                    <Alert message={diagnosticData.capabilitiesHook.error} type="error" size="small" />
                  )}
                </div>
              </Card>
            </div>
          </Panel>

          <Panel 
            header={getTranslationFromI18nKeyAndLabel('services.diagnostic.environment', 'Environment')} 
            key="environment"
          >
            <pre className="gba:bg-gray-100 gba:p-4 gba:rounded gba:text-sm gba:overflow-auto">
              {JSON.stringify(diagnosticData.environment, null, 2)}
            </pre>
          </Panel>

          <Panel 
            header={getTranslationFromI18nKeyAndLabel('services.diagnostic.rawData', 'Raw Hook Data')} 
            key="rawData"
          >
            <div className="gba:space-y-4">
              <div>
                <h4 className="gba:font-semibold gba:mb-2">GraphQL Capabilities</h4>
                <pre className="gba:bg-gray-100 gba:p-4 gba:rounded gba:text-sm gba:overflow-auto">
                  {JSON.stringify(graphqlHook.capabilities, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="gba:font-semibold gba:mb-2">Available Desks</h4>
                <pre className="gba:bg-gray-100 gba:p-4 gba:rounded gba:text-sm gba:overflow-auto">
                  {JSON.stringify(desksHook.availableDesks, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="gba:font-semibold gba:mb-2">Final Capabilities</h4>
                <pre className="gba:bg-gray-100 gba:p-4 gba:rounded gba:text-sm gba:overflow-auto">
                  {JSON.stringify(capabilitiesHook.capabilities, null, 2)}
                </pre>
              </div>
            </div>
          </Panel>

          <Panel 
            header={getTranslationFromI18nKeyAndLabel('services.diagnostic.troubleshooting', 'Troubleshooting')} 
            key="troubleshooting"
          >
            <div className="gba:space-y-4">
              <Alert
                message="Common Issues"
                description={
                  <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                    <li>If GraphQL Hook shows errors: Check network/authentication</li>
                    <li>If Desks Hook shows 0 desks: GraphQL data might be empty (fallback should work)</li>
                    <li>If Final Capabilities shows errors: Integration issue between hooks</li>
                    <li>If all hooks show loading: Check browser console for errors</li>
                  </ul>
                }
                type="warning"
              />

              <div>
                <h4 className="gba:font-semibold gba:mb-2">Console Commands</h4>
                <pre className="gba:bg-gray-100 gba:p-4 gba:rounded gba:text-sm">
{`// Check GraphQL endpoint
console.log('GraphQL Endpoint:', process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK);

// Check user info
console.log('User Info:', window.userInfo);

// Enable debug logging
localStorage.setItem('debug', 'ser:*');

// Test GraphQL directly
fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'query { __schema { queryType { name } } }'
  })
}).then(r => r.json()).then(console.log);`}
                </pre>
              </div>
            </div>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};
