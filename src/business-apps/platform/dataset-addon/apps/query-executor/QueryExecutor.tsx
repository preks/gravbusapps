import React, { useState } from 'react';
import { Typography, Space, Button, Alert, Spin, Tabs } from 'antd';
import { ReloadOutlined, PlayCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout } from '@/components/layout/pageLayout';
import { QueryDefinition, Services, getAllServices, getServiceLabel } from '@/common/network/dataset';
import { useQueryExecutorData } from './hooks/useQueryExecutorData';
import { QueryList } from './components/QueryList';
import { QueryExecutionForm } from './components/QueryExecutionForm';
import { QueryResults } from './components/QueryResults';

const { Title } = Typography;

const QueryExecutor: React.FC<BusinessAppContextProps> = (context) => {
  const [selectedQuery, setSelectedQuery] = useState<QueryDefinition | null>(null);
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  const [activeService, setActiveService] = useState<Services>(Services.EMPLOYEE);

  const {
    queries,
    isLoading,
    error,
    executionResults,
    isExecuting,
    executionError,
    executeQuery,
    clearResults,
    refetch
  } = useQueryExecutorData(context, activeService);

  const handleExecuteQuery = (query: QueryDefinition) => {
    setSelectedQuery(query);
    setShowExecutionForm(true);
  };

  const handleExecuteWithParameters = async (parameters: any) => {
    if (selectedQuery) {
      await executeQuery(selectedQuery.name, selectedQuery.queryType, parameters);
      setShowExecutionForm(false);
      setSelectedQuery(null);
    }
  };

  const handleCancelExecution = () => {
    setShowExecutionForm(false);
    setSelectedQuery(null);
  };

  const renderServiceContent = (service: Services) => (
    <div className="gba:max-w-6xl gba:mx-auto">
      {/* Error Display */}
      {error && (
        <Alert
          message="Error Loading Queries"
          description={error}
          type="error"
          showIcon
          closable
          className="gba:mb-4"
          action={
            <Button size="small" onClick={refetch}>
              Retry
            </Button>
          }
          data-testid="queries-error-alert"
        />
      )}

      {/* Execution Error Display */}
      {executionError && (
        <Alert
          message="Query Execution Failed"
          description={executionError}
          type="error"
          showIcon
          closable
          className="gba:mb-4"
          data-testid="execution-error-alert"
        />
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spin size="large" />
          <span className="gba:ml-3">Loading available queries...</span>
        </div>
      ) : (
        <>
          {/* Query List */}
          {queries.length > 0 ? (
            <QueryList
              queries={queries}
              onExecuteQuery={handleExecuteQuery}
              isExecuting={isExecuting}
            />
          ) : (
            <Alert
              message="No Queries Available"
              description={`There are no active queries available for execution in ${getServiceLabel(service)}. Please contact your administrator to create and activate queries.`}
              type="info"
              showIcon
              data-testid="no-queries-alert"
            />
          )}

          {/* Query Results */}
          <QueryResults
            results={executionResults}
            onClear={clearResults}
          />
        </>
      )}

      {/* Query Execution Form Modal */}
      <QueryExecutionForm
        query={selectedQuery}
        visible={showExecutionForm}
        onExecute={handleExecuteWithParameters}
        onCancel={handleCancelExecution}
        isExecuting={isExecuting}
      />
    </div>
  );

  const tabItems = getAllServices().map(service => ({
    key: service,
    label: (
      <Space>
        <DatabaseOutlined />
        {getServiceLabel(service)}
      </Space>
    ),
    children: renderServiceContent(service)
  }));

  return (
    <PageLayout
      headerIcon={<PlayCircleOutlined />}
      headerLabel="Query Executor"
      pageHeaderRight={
        <Button
          icon={<ReloadOutlined />}
          onClick={refetch}
          loading={isLoading}
          data-testid="refresh-queries-button"
        >
          Refresh
        </Button>
      }
      contentContainer={
        <Tabs
          activeKey={activeService}
          onChange={(key) => setActiveService(key as Services)}
          items={tabItems}
          size="large"
          className="gba:h-full"
        />
      }
    />
  );
};

export { QueryExecutor };
export default QueryExecutor;
