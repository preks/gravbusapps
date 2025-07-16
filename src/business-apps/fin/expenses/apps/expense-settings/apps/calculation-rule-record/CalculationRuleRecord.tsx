import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Descriptions, 
  Table, 
  Spin,
  Tabs,
  Statistic
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import { 
  PiArrowLeft, 
  PiPencil, 
  PiWarning, 
  PiPlus,
  PiCalendar,
  PiMapPin,
  PiOfficeChair,
  PiUser
} from 'react-icons/pi';
import { EnhancedExpenseRuleAssignment } from '../../types/ExpenseRuleTypes';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface CalculationRuleRecordProps extends BusinessAppContextProps {
  ruleId: string;
  page?: string;
  onNavigateBack: () => void;
}

interface CalculationRuleDetails {
  id: string;
  code: string;
  name?: string;
  activeFrom?: string;
  activeTo?: string;
  deductionLimit: boolean;
  advancePaymentCode?: string;
  calculationType?: {
    id: string;
    value: string;
  };
  country?: {
    id: string;
    value: string;
    code?: string;
  };
  currency?: {
    id: string;
    value: string;
    code?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  isDeleted: boolean;
}

const CalculationRuleRecord: React.FC<CalculationRuleRecordProps> = ({
  ruleId,
  page,
  onNavigateBack,
  accessToken,
  ...context
}) => {
  const [ruleDetails, setRuleDetails] = useState<CalculationRuleDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  // Mock assignments data - replace with actual hook when available
  const [assignments, setAssignments] = useState<EnhancedExpenseRuleAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  
  const refetchAssignments = useCallback(() => {
    // TODO: Implement actual assignment fetching
    setAssignments([]);
  }, []);

  // Mock function to load rule details - replace with actual GraphQL query
  const loadRuleDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual GraphQL query to fetch expense rule details
      // This is mock data for demonstration
      const mockDetails: CalculationRuleDetails = {
        id: ruleId,
        code: 'CR_001',
        name: 'Standard Calculation Rule',
        activeFrom: '2024-01-01T00:00:00Z',
        activeTo: '2024-12-31T23:59:59Z',
        deductionLimit: true,
        advancePaymentCode: 'APC_001',
        calculationType: {
          id: 'CalculationType:v1:STANDARD',
          value: 'Standard Calculation'
        },
        country: {
          id: 'Country:v1:DE',
          value: 'Germany',
          code: 'DE'
        },
        currency: {
          id: 'Currency:v1:EUR',
          value: 'European euro',
          code: 'EUR'
        },
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        isDeleted: false
      };
      
      setRuleDetails(mockDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rule details');
    } finally {
      setIsLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    if (ruleId && accessToken) {
      loadRuleDetails();
    }
  }, [ruleId, accessToken, loadRuleDetails]);

  const handleNavigateBack = () => {
    onNavigateBack();
  };

  // Assignment table columns
  const assignmentColumns: ColumnsType<EnhancedExpenseRuleAssignment> = [
    {
      title: '',
      key: 'actions',
      width: '60px',
      render: (_, record) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
                     <AppActionButton
             data-testid={`assignment-update-button-${record.id}`}
             variant="secondary"
             contextsArray={[FlowContextName.employeeExpenses]}
             externalContextData={{ assignmentId: record.id }}
             prefixDataTestId="assignment-update"
             accessToken={accessToken}
             emptyStateBehavior="disable"
             deferMainContextRequestsUntilClick
             onClick={(e) => e.stopPropagation()}
           />
        </div>
      ),
    },
    {
      title: 'Order',
      dataIndex: 'assignmentOrder',
      key: 'assignmentOrder',
      width: 80,
      sorter: true,
    },
    {
      title: 'Assignment Target',
      key: 'target',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.companyName && (
            <Space size="small">
              <PiOfficeChair className="gba:text-blue-500" />
              <Text>{record.companyName}</Text>
            </Space>
          )}
          {record.orgUnitName && (
            <Space size="small">
              <PiMapPin className="gba:text-green-500" />
              <Text>{record.orgUnitName}</Text>
            </Space>
          )}
          {record.employeeName && (
            <Space size="small">
              <PiUser className="gba:text-purple-500" />
              <Text>{record.employeeName}</Text>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Employment Details',
      key: 'employment',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.employmentTypeName && (
            <Tag color="blue">{record.employmentTypeName}</Tag>
          )}
          {record.contractTypeName && (
            <Tag color="green">{record.contractTypeName}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Effective Period',
      dataIndex: 'effectivePeriod',
      key: 'effectivePeriod',
      render: (text: string) => (
        <Space size="small">
          <PiCalendar className="gba:text-gray-500" />
          <Text>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Settings',
      key: 'settings',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.cascading && <Tag color="orange">Cascading</Tag>}
          {record.applicants && <Tag color="purple">Applicants</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const isActive = dayjs().isBetween(
          dayjs(record.activeFrom), 
          record.activeTo ? dayjs(record.activeTo) : dayjs().add(1, 'year'),
          'day',
          '[]'
        );
        
        return (
          <Space direction="vertical" size="small">
            <Tag color={isActive ? 'green' : 'red'}>
              {isActive ? 'Active' : 'Inactive'}
            </Tag>
            {record.conflictStatus !== 'NONE' && (
              <Tag color={record.conflictStatus === 'ERROR' ? 'red' : 'orange'}>
                {record.conflictStatus}
              </Tag>
            )}
          </Space>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div 
        data-testid="calculation-rule-record-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !ruleDetails) {
    return (
      <div data-testid="calculation-rule-record-error">
        <Alert
          message="Error Loading Rule Details"
          description={error || 'Rule not found'}
          type="error"
          showIcon
          icon={<PiWarning />}
          action={
            <Space>
              <Button size="small" onClick={loadRuleDetails}>
                Retry
              </Button>
              <Button size="small" onClick={handleNavigateBack}>
                Go Back
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid="calculation-rule-record-container">
      {/* Header with navigation */}
      <div 
        className="gba:flex gba:justify-between gba:items-center gba:mb-6"
        data-testid="calculation-rule-record-header"
      >
        <Space>
          <Button
            icon={<PiArrowLeft />}
            onClick={handleNavigateBack}
            data-testid="calculation-rule-record-back-button"
          >
            Back{page && ` to ${page}`}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Calculation Rule: {ruleDetails.code}
          </Title>
          {ruleDetails.name && (
            <Text type="secondary">({ruleDetails.name})</Text>
          )}
        </Space>
        
        <Space>
                     <AppActionButton
             data-testid="calculation-rule-record-edit-button"
             variant="primary"
             contextsArray={[FlowContextName.employeeExpenses]}
             externalContextData={{ ruleId: ruleDetails.id }}
             prefixDataTestId="calculation-rule-edit"
             accessToken={accessToken}
             emptyStateBehavior="disable"
             deferMainContextRequestsUntilClick
           />
        </Space>
      </div>

      {/* Rule Status and Quick Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Status"
              value={
                dayjs().isBetween(
                  dayjs(ruleDetails.activeFrom), 
                  ruleDetails.activeTo ? dayjs(ruleDetails.activeTo) : dayjs().add(1, 'year'),
                  'day',
                  '[]'
                ) ? 'Active' : 'Inactive'
              }
              valueStyle={{ 
                color: dayjs().isBetween(
                  dayjs(ruleDetails.activeFrom), 
                  ruleDetails.activeTo ? dayjs(ruleDetails.activeTo) : dayjs().add(1, 'year'),
                  'day',
                  '[]'
                ) ? '#3f8600' : '#cf1322' 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Assignments"
              value={assignments?.length || 0}
              loading={assignmentsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Active Assignments"
                             value={assignments?.filter((assignment: EnhancedExpenseRuleAssignment) => 
                 dayjs().isBetween(
                   dayjs(assignment.activeFrom), 
                   assignment.activeTo ? dayjs(assignment.activeTo) : dayjs().add(1, 'year'),
                   'day',
                   '[]'
                 )
               ).length || 0}
              loading={assignmentsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Deduction Limit"
              value={ruleDetails.deductionLimit ? 'Enabled' : 'Disabled'}
              valueStyle={{ 
                color: ruleDetails.deductionLimit ? '#3f8600' : '#8c8c8c' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs for different sections */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        data-testid="calculation-rule-record-tabs"
      >
        <TabPane tab="Rule Details" key="details">
          <Card title="Rule Information" data-testid="calculation-rule-details-card">
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
              <Descriptions.Item label="Rule Code">
                <Text strong>{ruleDetails.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Rule Name">
                {ruleDetails.name || <Text type="secondary">Not specified</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Calculation Type">
                {ruleDetails.calculationType?.value || <Text type="secondary">Not specified</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Country">
                {ruleDetails.country ? (
                  <Space>
                    <Text>{ruleDetails.country.value}</Text>
                    {ruleDetails.country.code && (
                      <Tag color="blue">{ruleDetails.country.code}</Tag>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary">Not specified</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Currency">
                {ruleDetails.currency ? (
                  <Space>
                    <Text>{ruleDetails.currency.value}</Text>
                    {ruleDetails.currency.code && (
                      <Tag color="green">{ruleDetails.currency.code}</Tag>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary">Not specified</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Advance Payment Code">
                {ruleDetails.advancePaymentCode || <Text type="secondary">Not specified</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Active From">
                {ruleDetails.activeFrom ? (
                  <Text>{dayjs(ruleDetails.activeFrom).format('YYYY-MM-DD HH:mm')}</Text>
                ) : (
                  <Text type="secondary">Not specified</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Active To">
                {ruleDetails.activeTo ? (
                  <Text>{dayjs(ruleDetails.activeTo).format('YYYY-MM-DD HH:mm')}</Text>
                ) : (
                  <Text type="secondary">No end date</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Deduction Limit">
                <Tag color={ruleDetails.deductionLimit ? 'green' : 'red'}>
                  {ruleDetails.deductionLimit ? 'Enabled' : 'Disabled'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {ruleDetails.createdAt ? (
                  <Text>{dayjs(ruleDetails.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                ) : (
                  <Text type="secondary">Unknown</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {ruleDetails.updatedAt ? (
                  <Text>{dayjs(ruleDetails.updatedAt).format('YYYY-MM-DD HH:mm')}</Text>
                ) : (
                  <Text type="secondary">Unknown</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={ruleDetails.isDeleted ? 'red' : 'green'}>
                  {ruleDetails.isDeleted ? 'Deleted' : 'Active'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </TabPane>

        <TabPane tab={`Assignments (${assignments?.length || 0})`} key="assignments">
          <Card 
            title="Rule Assignments"
            extra={
              <Button
                type="primary"
                icon={<PiPlus />}
                data-testid="calculation-rule-record-add-assignment-button"
              >
                Add Assignment
              </Button>
            }
            data-testid="calculation-rule-assignments-card"
          >
            {assignmentsError && (
              <Alert
                message="Error Loading Assignments"
                description={assignmentsError}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Button size="small" onClick={refetchAssignments}>
                    Retry
                  </Button>
                }
              />
            )}

            <Table
              columns={assignmentColumns}
              dataSource={assignments}
              rowKey="id"
              loading={assignmentsLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} assignments`,
              }}
              scroll={{ x: 800 }}
              data-testid="calculation-rule-assignments-table"
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CalculationRuleRecord; 