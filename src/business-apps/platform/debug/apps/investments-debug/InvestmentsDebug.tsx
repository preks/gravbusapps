// Investment Data Foundation Debug App
import React, { useState } from 'react';
import { Button, Card, Divider, Input, Alert, Spin, Typography, Space, Row, Col, Tag, Collapse } from 'antd';
import { PlayCircleOutlined, SearchOutlined, DatabaseOutlined, LineChartOutlined, ReloadOutlined, BugOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Import all investment data hooks
import {
  useGetInvestments,
  useGetInvestmentById,
  useSearchInvestments,
  useGetInvestmentAccounts,
  useGetInvestmentAccountById,
  useGetInvestmentContacts,
  useGetInvestmentContactById,
  useGetInvestmentLeads,
  useGetInvestmentLeadById,
  useGetInvestmentOpportunities,
  useGetInvestmentOpportunityById,
  useGetInvestmentReports,
  useGetInvestmentReportById,
  useGetInvestmentTransactions,
  useGetInvestmentTransactionById,
  useGetEquityInvestmentReports,
  useGetEquityInvestmentRounds,
  useGetRealEstateInvestmentReports,
  useGetRealEstateInvestmentRentalUnits,
  useGetLiquidFundInvestmentReports,
  useInvestmentDataIntegration
} from '@/common/data/investment';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface InvestmentsDebugProps extends BusinessAppContextProps {}

interface TestResult {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  timestamp?: Date;
  duration?: number;
  query?: string;
  variables?: any;
}

const InvestmentsDebug: React.FC<InvestmentsDebugProps> = (context) => {
  // State for test results
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [filterValues] = useState<any>({});
  
  // Get all hooks
  const { fetchInvestments } = useGetInvestments(context);
  const { fetchInvestmentById } = useGetInvestmentById(context);
  const { searchInvestments } = useSearchInvestments(context);
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context);
  const { fetchInvestmentAccountById } = useGetInvestmentAccountById(context);
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context);
  const { fetchInvestmentContactById } = useGetInvestmentContactById(context);
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context);
  const { fetchInvestmentLeadById } = useGetInvestmentLeadById(context);
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context);
  const { fetchInvestmentOpportunityById } = useGetInvestmentOpportunityById(context);
  
  // Report hooks
  const { fetchInvestmentReports } = useGetInvestmentReports(context);
  const { fetchInvestmentReportById } = useGetInvestmentReportById(context);
  const { fetchInvestmentTransactions } = useGetInvestmentTransactions(context);
  const { fetchInvestmentTransactionById } = useGetInvestmentTransactionById(context);
  const { fetchEquityInvestmentReports } = useGetEquityInvestmentReports(context);
  const { fetchEquityInvestmentRounds } = useGetEquityInvestmentRounds(context);
  const { fetchRealEstateInvestmentReports } = useGetRealEstateInvestmentReports(context);
  const { fetchRealEstateInvestmentRentalUnits } = useGetRealEstateInvestmentRentalUnits(context);
  const { fetchLiquidFundInvestmentReports } = useGetLiquidFundInvestmentReports(context);
  
  // Integration hooks
  const { 
    investments, 
    investmentAccounts, 
    investmentContacts, 
    investmentOpportunities,
    investmentLeads,
    stats,
    isLoading: integrationLoading, 
    error: integrationError, 
    refetch: refetchIntegration 
  } = useInvestmentDataIntegration(context);

  // Helper function to execute test with query tracking
  const executeTest = async (
    testName: string, 
    testFunction: () => Promise<any>,
    query?: string,
    variables?: any
  ) => {
    const startTime = Date.now();
    
    setTestResults(prev => ({
      ...prev,
      [testName]: { 
        name: testName, 
        status: 'loading',
        query,
        variables
      }
    }));

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          name: testName,
          status: 'success',
          data: result,
          timestamp: new Date(),
          duration,
          query,
          variables
        }
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          name: testName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          duration,
          query,
          variables
        }
      }));
    }
  };

  // Test functions with query tracking
  const testCoreInvestments = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined,
      ...filterValues
    };
    return executeTest(
      'core-investments', 
      () => fetchInvestments(variables),
      'Core Investment Query - GET_INVESTMENTS',
      variables
    );
  };

  const testInvestmentReports = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'investment-reports', 
      () => fetchInvestmentReports(variables),
      'Investment Reports Query - GET_INVESTMENT_REPORTS',
      variables
    );
  };

  const testSearchInvestments = () => {
    const searchQuery = searchTerm || 'test';
    const variables = { limit: 5 };
    return executeTest(
      'search-investments', 
      () => searchInvestments(searchQuery, variables),
      'Search Investment Query - SEARCH_INVESTMENTS',
      { searchTerm: searchQuery, ...variables }
    );
  };

  const testInvestmentAccounts = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'investment-accounts', 
      () => fetchInvestmentAccounts(variables),
      'Investment Accounts Query - GET_INVESTMENT_ACCOUNTS',
      variables
    );
  };

  const testInvestmentContacts = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'investment-contacts', 
      () => fetchInvestmentContacts(variables),
      'Investment Contacts Query - GET_INVESTMENT_CONTACTS',
      variables
    );
  };

  const testInvestmentLeads = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'investment-leads', 
      () => fetchInvestmentLeads(variables),
      'Investment Leads Query - GET_INVESTMENT_LEADS',
      variables
    );
  };

  const testInvestmentOpportunities = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'investment-opportunities', 
      () => fetchInvestmentOpportunities(variables),
      'Investment Opportunities Query - GET_INVESTMENT_OPPORTUNITIES',
      variables
    );
  };

  const testInvestmentTransactions = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'investment-transactions', 
      () => fetchInvestmentTransactions(variables),
      'Investment Transactions Query - GET_INVESTMENT_TRANSACTIONS',
      variables
    );
  };

  const testEquityInvestmentReportsTest = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'equity-investment-reports', 
      () => fetchEquityInvestmentReports(variables),
      'Investment Reports Query - GET_INVESTMENT_REPORTS (includes Equity)',
      variables
    );
  };

  const testRealEstateInvestmentReportsTest = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'real-estate-investment-reports', 
      () => fetchRealEstateInvestmentReports(variables),
      'Investment Reports Query - GET_INVESTMENT_REPORTS (includes Real Estate)',
      variables
    );
  };

  const testEquityReports = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'equity-reports', 
      () => fetchEquityInvestmentReports(variables),
      'Investment Reports Query - GET_INVESTMENT_REPORTS (Enhanced)',
      variables
    );
  };

  const testEquityRounds = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'equity-rounds', 
      () => fetchEquityInvestmentRounds(variables),
      'Equity Investment Rounds Query - GET_EQUITY_INVESTMENT_ROUNDS',
      variables
    );
  };

  const testRealEstateRentalUnits = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'real-estate-rental-units', 
      () => fetchRealEstateInvestmentRentalUnits(variables),
      'Real Estate Investment Rental Units Query - GET_REAL_ESTATE_INVESTMENT_RENTAL_UNITS',
      variables
    );
  };

  const testLiquidFundReports = () => {
    const variables = { 
      limit: 10,
      search: searchTerm || undefined
    };
    return executeTest(
      'liquid-fund-reports', 
      () => fetchLiquidFundInvestmentReports(variables),
      'Investment Reports Query - GET_INVESTMENT_REPORTS (includes Liquid Fund)',
      variables
    );
  };

  // Test by ID functions (using selected test ID)
  const testInvestmentById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'investment-by-id', 
      () => fetchInvestmentById(testId),
      `Investment By ID Query - GET_INVESTMENT_BY_ID`,
      { id: testId }
    );
  };

  const testAccountById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'account-by-id', 
      () => fetchInvestmentAccountById(testId),
      `Investment Account By ID Query - GET_INVESTMENT_ACCOUNT_BY_ID`,
      { id: testId }
    );
  };

  const testContactById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'contact-by-id', 
      () => fetchInvestmentContactById(testId),
      `Investment Contact By ID Query - GET_INVESTMENT_CONTACT_BY_ID`,
      { id: testId }
    );
  };

  const testLeadById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'lead-by-id', 
      () => fetchInvestmentLeadById(testId),
      `Investment Lead By ID Query - GET_INVESTMENT_LEAD_BY_ID`,
      { id: testId }
    );
  };

  const testOpportunityById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'opportunity-by-id', 
      () => fetchInvestmentOpportunityById(testId),
      `Investment Opportunity By ID Query - GET_INVESTMENT_OPPORTUNITY_BY_ID`,
      { id: testId }
    );
  };

  const testInvestmentReportById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'investment-report-by-id', 
      () => fetchInvestmentReportById(testId),
      `Investment Report By ID Query - GET_INVESTMENT_REPORT_BY_ID`,
      { id: testId }
    );
  };

  const testInvestmentTransactionById = () => {
    const testId = selectedTestId || '00000000-0000-0000-0000-000000000001';
    return executeTest(
      'investment-transaction-by-id', 
      () => fetchInvestmentTransactionById(testId),
      `Investment Transaction By ID Query - GET_INVESTMENT_TRANSACTION_BY_ID`,
      { id: testId }
    );
  };

  // Clear all results
  const clearResults = () => {
    setTestResults({});
  };

  // Run all core tests
  const runAllCoreTests = async () => {
    await testCoreInvestments();
    await testInvestmentAccounts();
    await testInvestmentContacts();
    await testInvestmentLeads();
    await testInvestmentOpportunities();
  };

  // Run all specific type tests
  const runAllSpecificTests = async () => {
    await testInvestmentReports();
    await testInvestmentTransactions();
    await testEquityInvestmentReportsTest();
    await testRealEstateInvestmentReportsTest();
    // Note: Performance metrics test removed - hook not implemented
  };

  // Run all tests with current search term
  const runAllTestsWithSearch = async () => {
    if (!searchTerm.trim()) {
      alert('Please enter a search term first');
      return;
    }
    
    // Run all core tests
    await testCoreInvestments();
    await testInvestmentAccounts();
    await testInvestmentContacts();
    await testInvestmentLeads();
    await testInvestmentOpportunities();
    
    // Run all specific tests
    await testInvestmentReports();
    await testInvestmentTransactions();
    await testEquityInvestmentReportsTest();
    await testRealEstateInvestmentReportsTest();
    await testEquityReports();
    await testEquityRounds();
    await testRealEstateRentalUnits();
    await testLiquidFundReports();
  };

  // Get result component with query display
  const getResultComponent = (testKey: string) => {
    const result = testResults[testKey];
    if (!result) return null;

    const { status, data, error, timestamp, duration, query, variables } = result;

    let statusColor = 'default';
    let statusText = 'Idle';
    
    switch (status) {
      case 'loading':
        statusColor = 'processing';
        statusText = 'Loading...';
        break;
      case 'success':
        statusColor = 'success';
        statusText = `Success (${duration}ms)`;
        break;
      case 'error':
        statusColor = 'error';
        statusText = `Error (${duration}ms)`;
        break;
    }

    // Determine if this is a by-ID test (single item) or a list test (with aggregate count)
    const isByIdTest = testKey.includes('-by-id');
    
    let dataCount = 0;
    let totalCount = 0;
    
    if (isByIdTest) {
      // For by-ID tests, just show if we got data or not
      dataCount = data ? 1 : 0;
    } else {
      // For list tests, try to get the actual count from GraphQL response
      if (data && typeof data === 'object') {
        // Check if we have an aggregate count (e.g., InvestmentAggregate.aggregate.count)
        const aggregateKeys = Object.keys(data).filter(key => key.includes('Aggregate'));
        if (aggregateKeys.length > 0) {
          const aggregateKey = aggregateKeys[0];
          const aggregate = data[aggregateKey];
          if (aggregate?.aggregate?.count !== undefined) {
            totalCount = aggregate.aggregate.count;
          }
        }
        
        // Get the actual items count
        const itemsKey = Object.keys(data).find(key => !key.includes('Aggregate'));
        if (itemsKey && Array.isArray(data[itemsKey])) {
          dataCount = data[itemsKey].length;
        } else if (Array.isArray(data)) {
          dataCount = data.length;
        }
      }
    }

    return (
      <Card 
        size="small" 
        style={{ marginTop: 8 }}
        title={
          <Space>
            <Tag color={statusColor}>{statusText}</Tag>
            {timestamp && <Text type="secondary">{timestamp.toLocaleTimeString()}</Text>}
            {status === 'success' && (
              isByIdTest ? (
                <Tag color="blue">{dataCount === 1 ? 'Found' : 'Not Found'}</Tag>
              ) : (
                <Tag color="blue">
                  {dataCount} items {totalCount > 0 && `(${totalCount} total)`}
                </Tag>
              )
            )}
          </Space>
        }
      >
        {status === 'loading' && <Spin />}
        {status === 'error' && (
          <Alert
            type="error"
            message="Test Failed"
            description={error}
            showIcon
          />
        )}
        {status === 'success' && data && (
          <Collapse size="small" style={{ marginTop: 8 }}>
            <Panel header="📊 Data Results" key="data">
              <Text strong>Data Retrieved:</Text>
              {!isByIdTest && totalCount > 0 && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <Tag color="green">Total Records: {totalCount}</Tag>
                  <Tag color="blue">Items Returned: {dataCount}</Tag>
                  {dataCount < totalCount && (
                    <Tag color="orange">Limited by pagination (limit: {variables?.limit || 'default'})</Tag>
                  )}
                </div>
              )}
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 4, 
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto',
                marginTop: 8
              }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </Panel>
            {query && (
              <Panel header="📝 Query Information" key="query">
                <Text strong>Query:</Text>
                <pre style={{ 
                  background: '#f0f8ff', 
                  padding: 12, 
                  borderRadius: 4, 
                  fontSize: 12,
                  marginTop: 8,
                  border: '1px solid #d1ecf1'
                }}>
                  {query}
                </pre>
                {variables && Object.keys(variables).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Text strong>Variables:</Text>
                    <pre style={{ 
                      background: '#f8f9fa', 
                      padding: 8, 
                      borderRadius: 4, 
                      fontSize: 12,
                      marginTop: 4,
                      border: '1px solid #dee2e6'
                    }}>
                      {JSON.stringify(variables, null, 2)}
                    </pre>
                  </div>
                )}
              </Panel>
            )}
          </Collapse>
        )}
      </Card>
    );
  };

  return (
    <div
      data-testid="investments-debug-container"
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
          <BugOutlined /> Investment Data Foundation Debug
        </Title>
        <Paragraph style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
          Test all aspects of the newly created investment data system with enhanced types and computed fields
        </Paragraph>
        <Alert 
          type="success" 
          message="✅ Updated with Enhanced Data Integration" 
          description="This debug app now uses the updated hooks with mappers that transform base GraphQL responses to enhanced types with computed display fields (displayName, *Label, etc.)"
          showIcon 
          style={{ marginBottom: 16 }}
        />
        {searchTerm && (
          <Alert 
            type="info" 
            message={`🔍 Search Active: "${searchTerm}"`}
            description="Search term will be applied to all list queries. Use 'Run All with Search' to test search across all entities."
            showIcon 
            style={{ marginBottom: 16 }}
          />
        )}
      </div>

      {/* Controls */}
      <Card 
        title={<><DatabaseOutlined /> Test Controls</>}
        style={{ marginBottom: 24 }}
        data-testid="debug-controls-card"
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Text strong>Search Term:</Text>
            <Input
              data-testid="debug-search-input"
              placeholder="Enter search term for testing..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              suffix={
                searchTerm && (
                  <Button
                    size="small"
                    type="text"
                    onClick={() => setSearchTerm('')}
                    style={{ marginRight: -8 }}
                  >
                    ✕
                  </Button>
                )
              }
            />
            {searchTerm && (
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
                🔍 Search will be applied to: Investments, Accounts, Contacts, Leads, Opportunities, Transactions, Reports, Rounds, and Rental Units
              </Text>
            )}
          </Col>
          <Col span={8}>
            <Text strong>Test ID (for by-ID tests):</Text>
            <Input
              data-testid="debug-test-id-input"
              placeholder="UUID for by-ID tests"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
            />
            {selectedTestId && (
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
                💡 Use this ID for testing individual record retrieval
              </Text>
            )}
          </Col>
          <Col span={8}>
            <Text strong>Actions:</Text>
            <br />
            <Space>
              <Button 
                data-testid="debug-run-all-core-button"
                onClick={runAllCoreTests}
                type="primary"
              >
                Run All Core
              </Button>
              <Button 
                data-testid="debug-run-all-specific-button"
                onClick={runAllSpecificTests}
                type="primary"
              >
                Run All Specific
              </Button>
              <Button 
                data-testid="debug-run-all-with-search-button"
                onClick={runAllTestsWithSearch}
                type="primary"
                disabled={!searchTerm.trim()}
                icon={<SearchOutlined />}
              >
                Run All with Search
              </Button>
              <Button 
                data-testid="debug-clear-results-button"
                onClick={clearResults}
                icon={<ReloadOutlined />}
              >
                Clear Results
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Integration Hooks Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card 
            title={<><LineChartOutlined /> Data Integration Hook</>}
            data-testid="debug-integration-status-card"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Status: </Text>
                <Tag color={integrationLoading ? 'processing' : integrationError ? 'error' : 'success'}>
                  {integrationLoading ? 'Loading...' : integrationError ? 'Error' : 'Ready'}
                </Tag>
              </div>
              {integrationError && (
                <Alert type="error" message={integrationError} showIcon />
              )}
              <div>
                <Text>Investments: </Text><Tag>{investments.length}</Tag>
                <Text>Accounts: </Text><Tag>{investmentAccounts.length}</Tag>
                <Text>Contacts: </Text><Tag>{investmentContacts.length}</Tag>
                <Text>Opportunities: </Text><Tag>{investmentOpportunities.length}</Tag>
                <Text>Leads: </Text><Tag>{investmentLeads.length}</Tag>
              </div>
              {stats && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>Statistics (Enhanced Types):</Text>
                  <div>
                    <Text>Total Market Value: </Text><Tag color="green">${stats.totalMarketValue.toLocaleString()}</Tag>
                  </div>
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    ℹ️ All data now includes computed fields like displayName, *Label for catalog entries, fullName, etc.
                  </div>
                </div>
              )}
              <Button 
                data-testid="debug-refetch-integration-button"
                onClick={() => refetchIntegration()} 
                loading={integrationLoading}
                icon={<ReloadOutlined />}
              >
                Refetch Integration Data
              </Button>
            </Space>
          </Card>
        </Col>
        {/* Analytics hook not implemented yet */}
        <Col span={12}>
          <Card 
            title={<><LineChartOutlined /> Analytics Hook</>}
            data-testid="debug-analytics-status-card"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert 
                type="info" 
                message="Analytics Hook Not Implemented" 
                description="Analytics and performance metrics hooks are not yet implemented in the investment data foundation."
                showIcon 
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Test Sections */}
      <Collapse defaultActiveKey={['core']} data-testid="debug-test-sections">
        {/* Core Investment Tests */}
        <Panel header="Core Investment Entity Tests" key="core">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Button 
                data-testid="debug-test-core-investments-button"
                onClick={testCoreInvestments}
                loading={testResults['core-investments']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Investments
              </Button>
              {getResultComponent('core-investments')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-investment-reports-button"
                onClick={testInvestmentReports}
                loading={testResults['investment-reports']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Investment Reports
              </Button>
              {getResultComponent('investment-reports')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-search-investments-button"
                onClick={testSearchInvestments}
                loading={testResults['search-investments']?.status === 'loading'}
                icon={<SearchOutlined />}
                block
              >
                Test Search
              </Button>
              {getResultComponent('search-investments')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-investment-by-id-button"
                onClick={testInvestmentById}
                loading={testResults['investment-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test By ID
              </Button>
              {getResultComponent('investment-by-id')}
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Button 
                data-testid="debug-test-accounts-button"
                onClick={testInvestmentAccounts}
                loading={testResults['investment-accounts']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Accounts
              </Button>
              {getResultComponent('investment-accounts')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-contacts-button"
                onClick={testInvestmentContacts}
                loading={testResults['investment-contacts']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Contacts
              </Button>
              {getResultComponent('investment-contacts')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-leads-button"
                onClick={testInvestmentLeads}
                loading={testResults['investment-leads']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Leads
              </Button>
              {getResultComponent('investment-leads')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-opportunities-button"
                onClick={testInvestmentOpportunities}
                loading={testResults['investment-opportunities']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Opportunities
              </Button>
              {getResultComponent('investment-opportunities')}
            </Col>
          </Row>
        </Panel>

        {/* Investment Reports & Transactions Tests */}
        <Panel header="Investment Reports & Transactions Tests" key="specific">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Button 
                data-testid="debug-test-investment-transactions-button"
                onClick={testInvestmentTransactions}
                loading={testResults['investment-transactions']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Investment Transactions
              </Button>
              {getResultComponent('investment-transactions')}
            </Col>
            <Col span={8}>
              <Button 
                data-testid="debug-test-equity-reports-detailed-button"
                onClick={testEquityInvestmentReportsTest}
                loading={testResults['equity-investment-reports']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Equity Reports
              </Button>
              {getResultComponent('equity-investment-reports')}
            </Col>
            <Col span={8}>
              <Button 
                data-testid="debug-test-real-estate-reports-detailed-button"
                onClick={testRealEstateInvestmentReportsTest}
                loading={testResults['real-estate-investment-reports']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Test Real Estate Reports
              </Button>
              {getResultComponent('real-estate-investment-reports')}
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Button 
                data-testid="debug-test-equity-reports-button"
                onClick={testEquityReports}
                loading={testResults['equity-reports']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Equity Reports
              </Button>
              {getResultComponent('equity-reports')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-equity-rounds-button"
                onClick={testEquityRounds}
                loading={testResults['equity-rounds']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Equity Rounds
              </Button>
              {getResultComponent('equity-rounds')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-rental-units-button"
                onClick={testRealEstateRentalUnits}
                loading={testResults['real-estate-rental-units']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Rental Units
              </Button>
              {getResultComponent('real-estate-rental-units')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-liquid-fund-reports-button"
                onClick={testLiquidFundReports}
                loading={testResults['liquid-fund-reports']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Liquid Fund Reports
              </Button>
              {getResultComponent('liquid-fund-reports')}
            </Col>
          </Row>
        </Panel>

        {/* By ID Tests */}
        <Panel header="By ID Tests" key="byid">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Button 
                data-testid="debug-test-account-by-id-button"
                onClick={testAccountById}
                loading={testResults['account-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Account By ID
              </Button>
              {getResultComponent('account-by-id')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-contact-by-id-button"
                onClick={testContactById}
                loading={testResults['contact-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Contact By ID
              </Button>
              {getResultComponent('contact-by-id')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-lead-by-id-button"
                onClick={testLeadById}
                loading={testResults['lead-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Lead By ID
              </Button>
              {getResultComponent('lead-by-id')}
            </Col>
            <Col span={6}>
              <Button 
                data-testid="debug-test-opportunity-by-id-button"
                onClick={testOpportunityById}
                loading={testResults['opportunity-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Opportunity By ID
              </Button>
              {getResultComponent('opportunity-by-id')}
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Button 
                data-testid="debug-test-investment-report-by-id-button"
                onClick={testInvestmentReportById}
                loading={testResults['investment-report-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Investment Report By ID
              </Button>
              {getResultComponent('investment-report-by-id')}
            </Col>
            <Col span={12}>
              <Button 
                data-testid="debug-test-investment-transaction-by-id-button"
                onClick={testInvestmentTransactionById}
                loading={testResults['investment-transaction-by-id']?.status === 'loading'}
                icon={<PlayCircleOutlined />}
                block
              >
                Investment Transaction By ID
              </Button>
              {getResultComponent('investment-transaction-by-id')}
            </Col>
          </Row>
        </Panel>

        {/* Analytics Tests - Not Implemented Yet */}
        <Panel header="Analytics & Performance Tests (Not Implemented)" key="analytics">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert 
                type="info" 
                message="Analytics and Performance Features Not Implemented" 
                description="Analytics hooks (useInvestmentSummaryAnalytics, useGetInvestmentPerformanceMetrics) are not yet implemented in the investment data foundation. These features will be added in future iterations."
                showIcon 
              />
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </div>
  );
};

export default InvestmentsDebug;
