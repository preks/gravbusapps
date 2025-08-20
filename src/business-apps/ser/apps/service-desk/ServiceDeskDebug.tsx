import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Space, Typography } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getWorkflowEngine, mockDataHelpers } from '../../services/workflowEngineProvider';
import type { WorkflowEngine, SubmittedRequest } from 'packages/services-plus-core';

const { Text, Title } = Typography;

/**
 * ServiceDeskDebug - Debug component to test MockWorkflowEngineAdapter
 * Use this to verify the engine is working before using the full ServiceDesk
 */
export interface ServiceDeskDebugProps extends BusinessAppContextProps {}

const ServiceDeskDebug: React.FC<ServiceDeskDebugProps> = ({
  accessToken,
  userInfo,
}) => {
  const [engine, setEngine] = useState<WorkflowEngine | null>(null);
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [hrTickets, setHrTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(`ServiceDeskDebug: ${message}`);
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    try {
      addLog('Initializing workflow engine...');
      const workflowEngine = getWorkflowEngine('debug-user-123');
      setEngine(workflowEngine);
      addLog('Workflow engine initialized successfully');
    } catch (err) {
      addLog(`Error initializing engine: ${err}`);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const handleSeedData = async () => {
    if (!engine) {
      addLog('No engine available');
      return;
    }

    try {
      setIsLoading(true);
      addLog('Seeding sample data...');
      
      await mockDataHelpers.seedSampleData(engine);
      addLog('Sample data seeded successfully');
      
      // Refresh data
      await handleRefreshData();
    } catch (err) {
      addLog(`Error seeding data: ${err}`);
      setError(err instanceof Error ? err.message : 'Seeding failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    if (!engine) {
      addLog('No engine available');
      return;
    }

    try {
      setIsLoading(true);
      addLog('Refreshing data...');

      // Get requests
      const myRequests = await engine.getMyRequests();
      setRequests(myRequests);
      addLog(`Found ${myRequests.length} requests`);

      // Get HR tickets
      const tickets = await engine.getDeskTickets('HR');
      setHrTickets(tickets);
      addLog(`Found ${tickets.length} HR tickets`);
      
      setError(null);
    } catch (err) {
      addLog(`Error refreshing data: ${err}`);
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!engine) {
      addLog('No engine available');
      return;
    }

    try {
      setIsLoading(true);
      addLog('Creating new request...');

      const requestId = await engine.startRequest('new-hardware-request', {
        hardwareType: 'Debug Laptop',
        justification: 'Debug testing',
        urgency: 'Low',
      });

      addLog(`Created request: ${requestId}`);
      await handleRefreshData();
    } catch (err) {
      addLog(`Error creating request: ${err}`);
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimTicket = async (ticketId: string) => {
    if (!engine) {
      addLog('No engine available');
      return;
    }

    try {
      setIsLoading(true);
      addLog(`Claiming ticket: ${ticketId}`);

      await engine.claim(ticketId);
      addLog('Ticket claimed successfully');
      
      await handleRefreshData();
    } catch (err) {
      addLog(`Error claiming ticket: ${err}`);
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    if (!engine) {
      addLog('No engine available');
      return;
    }

    try {
      mockDataHelpers.clearData(engine);
      setRequests([]);
      setHrTickets([]);
      addLog('All data cleared');
    } catch (err) {
      addLog(`Error clearing data: ${err}`);
    }
  };

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="service-desk-debug">
      <div>
        <Title level={2}>Service Desk Debug Panel</Title>
        <Text type="secondary">
          Test the MockWorkflowEngineAdapter functionality
        </Text>
      </div>

      {/* Controls */}
      <Card title="Controls">
        <Space wrap>
          <Button 
            type="primary" 
            onClick={handleSeedData} 
            loading={isLoading}
          >
            Seed Sample Data
          </Button>
          <Button 
            onClick={handleRefreshData} 
            loading={isLoading}
          >
            Refresh Data
          </Button>
          <Button 
            onClick={handleCreateRequest} 
            loading={isLoading}
          >
            Create Test Request
          </Button>
          <Button 
            onClick={handleClearData}
            danger
          >
            Clear All Data
          </Button>
        </Space>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* Status Info */}
      <Card title="Status">
        <div className="gba:space-y-2">
          <div>Engine Initialized: {engine ? '✅ Yes' : '❌ No'}</div>
          <div>Access Token: {accessToken ? '✅ Present' : '❌ Missing'}</div>
          <div>User Info: {userInfo ? '✅ Present' : '❌ Missing'}</div>
          <div>Employee ID: {userInfo?.employeeDetails?.employeeId || 'Not available'}</div>
        </div>
      </Card>

      {/* Requests */}
      <Card title={`My Requests (${requests.length})`}>
        {requests.length === 0 ? (
          <Text type="secondary">No requests found</Text>
        ) : (
          <div className="gba:space-y-2">
            {requests.map(request => (
              <div key={request.id} className="gba:p-3 gba:border gba:rounded">
                <div><strong>ID:</strong> {request.id}</div>
                <div><strong>Title:</strong> {request.titleSnapshot}</div>
                <div><strong>Status:</strong> {request.status}</div>
                <div><strong>Steps:</strong> {request.steps.length}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* HR Tickets */}
      <Card title={`HR Tickets (${hrTickets.length})`}>
        {hrTickets.length === 0 ? (
          <Text type="secondary">No HR tickets found</Text>
        ) : (
          <div className="gba:space-y-2">
            {hrTickets.map(ticket => (
              <div key={ticket.id} className="gba:p-3 gba:border gba:rounded">
                <div><strong>ID:</strong> {ticket.id}</div>
                <div><strong>Name:</strong> {ticket.name}</div>
                <div><strong>Status:</strong> {ticket.status}</div>
                <div><strong>Desk:</strong> {ticket.desk}</div>
                {ticket.status === 'ready' && (
                  <Button 
                    size="small" 
                    onClick={() => handleClaimTicket(ticket.id)}
                    loading={isLoading}
                  >
                    Claim Ticket
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Debug Log */}
      <Card title="Debug Log">
        <div className="gba:max-h-60 gba:overflow-y-auto gba:space-y-1">
          {log.length === 0 ? (
            <Text type="secondary">No log entries</Text>
          ) : (
            log.map((entry, index) => (
              <div key={index} className="gba:text-sm gba:font-mono gba:text-gray-600">
                {entry}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ServiceDeskDebug;
