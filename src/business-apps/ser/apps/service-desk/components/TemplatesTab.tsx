import React, { useState } from 'react';
import { 
  Table, Card, Button, Input, Space, Typography, Modal, Tag, 
  Alert, Spin, Badge, Tooltip, message 
} from 'antd';
import { 
  Search, Code, Eye, RefreshCw, FileText, Calendar, 
  User, Hash, Database, Settings 
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useTemplates, Template } from '../hooks/useTemplates';
import { resetWorkflowEngine } from '../../../services/workflowEngineProvider';

const { Text, Title } = Typography;
const { TextArea } = Input;

export interface TemplatesTabProps extends BusinessAppContextProps {}

/**
 * TemplatesTab component - Development tool for viewing workflow templates
 * Shows loaded templates from custom-flow-engine with JSON inspection
 */
export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  accessToken,
  userInfo
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isJsonModalVisible, setIsJsonModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { 
    templates, 
    isLoading, 
    error, 
    totalCount, 
    refetch,
    setSearch 
  } = useTemplates({ accessToken, userInfo }, {
    limit: 100,
    onlyLatest: true,
    includeDrafts: true,
    autoFetch: true
  });

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchText(value);
    setSearch(value);
  };

  // Handle template row click - show JSON modal
  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setIsJsonModalVisible(true);
  };

  // Handle refresh (also resets workflow engine to pick up new configuration)
  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing templates and resetting workflow engine...');
      // Reset workflow engine to pick up ConductorWorkflowEngineAdapter
      resetWorkflowEngine();
      await refetch();
      message.success('Templates refreshed successfully');
    } catch (err) {
      message.error('Failed to refresh templates');
    }
  };

  // Format template type with color
  const renderTemplateType = (type: string) => {
    const color = type === 'TEMPLATE' ? 'blue' : 'green';
    return <Tag color={color} className="gba:font-mono">{type}</Tag>;
  };

  // Format version info
  const renderVersion = (version: number, isDraft?: boolean, isLatest?: boolean) => {
    return (
      <div className="gba:flex gba:items-center gba:gap-1">
        <Text code className="gba:text-sm">v{version}</Text>
        {isDraft && <Tag color="orange" size="small">DRAFT</Tag>}
        {isLatest && <Tag color="green" size="small">LATEST</Tag>}
      </div>
    );
  };

  // Format steps count
  const renderStepsCount = (steps: any[]) => {
    if (!Array.isArray(steps)) return <Text type="secondary">-</Text>;
    
    return (
      <div className="gba:flex gba:items-center gba:gap-1">
        <Hash className="gba:w-3 gba:h-3 gba:text-gray-500" />
        <Text>{steps.length}</Text>
        <Text type="secondary" className="gba:text-xs">steps</Text>
      </div>
    );
  };

  // Format date
  const renderDate = (dateString?: string) => {
    if (!dateString) return <Text type="secondary">-</Text>;
    
    const date = new Date(dateString);
    return (
      <Tooltip title={date.toLocaleString()}>
        <Text className="gba:text-sm">{date.toLocaleDateString()}</Text>
      </Tooltip>
    );
  };

  // Table columns configuration
  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (name: string, record: Template) => (
        <div 
          className="gba:cursor-pointer gba:hover:text-blue-600 gba:transition-colors"
          onClick={() => handleTemplateClick(record)}
          data-testid={`template-name-${record.id}`}
        >
          <div className="gba:flex gba:items-start gba:gap-2">
            <FileText className="gba:w-4 gba:h-4 gba:text-blue-500 gba:mt-0.5 gba:flex-shrink-0" />
            <div>
              <Text strong className="gba:block gba:text-sm">{name}</Text>
              <Text type="secondary" className="gba:text-xs gba:block gba:mt-1">
                {record.id}
              </Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => (
        <Text className="gba:text-sm" title={description}>
          {description || '-'}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: renderTemplateType,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version: number, record: Template) => 
        renderVersion(version, record.isDraft, record.isLatestVersion),
    },
    {
      title: 'Steps',
      dataIndex: 'steps',
      key: 'steps',
      width: 80,
      render: renderStepsCount,
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 80,
      render: (count?: number) => (
        <div className="gba:flex gba:items-center gba:gap-1">
          <User className="gba:w-3 gba:h-3 gba:text-gray-500" />
          <Text>{count || 0}</Text>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: renderDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: Template) => (
        <Button
          type="text"
          size="small"
          icon={<Code className="gba:w-3 gba:h-3" />}
          onClick={() => handleTemplateClick(record)}
          data-testid={`view-json-${record.id}`}
        >
          View JSON
        </Button>
      ),
    },
  ];

  return (
    <div data-testid="templates-tab" className="gba:p-4">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
          <div>
            <Title level={3} className="gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('services.templates.title', 'Workflow Templates')}
            </Title>
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel(
                'services.templates.description', 
                'Development view of loaded workflow templates from custom-flow-engine'
              )}
            </Text>
          </div>
          
          <Space>
            <Badge 
              count={totalCount} 
              showZero 
              color="#1890ff"
              className="gba:text-sm"
            >
              <Database className="gba:w-5 gba:h-5 gba:text-gray-500" />
            </Badge>
          </Space>
        </div>
        
        <Alert
          message="Development Tool"
          description="This tab shows live workflow templates from custom-flow-engine. Use this to inspect and debug real template structures for development purposes."
          type="info"
          showIcon
          className="gba:mb-4"
          icon={<Settings className="gba:w-4 gba:h-4" />}
        />
      </div>

      {/* Controls */}
      <Card className="gba:mb-4" size="small">
        <div className="gba:flex gba:justify-between gba:items-center">
          <Space size="middle">
            <Input
              placeholder="Search templates..."
              prefix={<Search className="gba:w-4 gba:h-4 gba:text-gray-400" />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 300 }}
              data-testid="templates-search"
            />
            <Text type="secondary" className="gba:text-sm">
              {totalCount} templates
            </Text>
          </Space>
          
          <Button
            icon={<RefreshCw className="gba:w-4 gba:h-4" />}
            onClick={handleRefresh}
            loading={isLoading}
            data-testid="refresh-templates"
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Alert
          message="Error Loading Templates"
          description={error}
          type="error"
          showIcon
          className="gba:mb-4"
          action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {/* Templates Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} templates`
          }}
          onRow={(record) => ({
            className: 'gba:cursor-pointer gba:hover:bg-gray-50',
            onClick: () => handleTemplateClick(record)
          })}
          data-testid="templates-table"
        />
      </Card>

      {/* JSON Modal */}
      <Modal
        title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <Code className="gba:w-4 gba:h-4" />
            <Text strong>Template JSON: {selectedTemplate?.name}</Text>
          </div>
        }
        open={isJsonModalVisible}
        onCancel={() => setIsJsonModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsJsonModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="copy"
            type="primary"
            onClick={() => {
              if (selectedTemplate) {
                navigator.clipboard.writeText(JSON.stringify(selectedTemplate, null, 2));
                message.success('Template JSON copied to clipboard');
              }
            }}
          >
            Copy JSON
          </Button>
        ]}
        data-testid="template-json-modal"
      >
        {selectedTemplate && (
          <div>
            <div className="gba:mb-4 gba:p-3 gba:bg-gray-50 gba:rounded">
              <Space direction="vertical" size="small">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Text strong>ID:</Text>
                  <Text code>{selectedTemplate.id}</Text>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Text strong>Type:</Text>
                  {renderTemplateType(selectedTemplate.type)}
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Text strong>Version:</Text>
                  {renderVersion(selectedTemplate.version, selectedTemplate.isDraft, selectedTemplate.isLatestVersion)}
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Text strong>Steps:</Text>
                  {renderStepsCount(selectedTemplate.steps)}
                </div>
              </Space>
            </div>
            
            <TextArea
              value={JSON.stringify(selectedTemplate, null, 2)}
              rows={20}
              readOnly
              className="gba:font-mono gba:text-xs"
              data-testid="template-json-content"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
