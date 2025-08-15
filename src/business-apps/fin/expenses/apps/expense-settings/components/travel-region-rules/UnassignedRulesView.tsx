import React, { useState, useEffect, useCallback } from 'react';
import { Table, Spin, Alert, Button, Tag, Typography, Space, Card, Modal, Select, message } from 'antd';
import { PiArrowLeft, PiPlus, PiWarning } from 'react-icons/pi';
import type { ColumnsType } from 'antd/es/table';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface UnassignedAllowanceRegionRule {
  id: string;
  code: string;
  name: string;
  activeFrom: string;
  activeTo?: string;
  ruleOrder?: number;
  detailCount: number;
  version?: number;
  additionalProperties?: any;
  businessKey?: string;
}

interface TravelRegionSet {
  id: string;
  code: string;
  value: string;
}

interface UnassignedRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  onBack: () => void;
}

const UnassignedRulesView: React.FC<UnassignedRulesViewProps> = ({
  accessToken,
  prefixDataTestId = '',
  onBack,
  ...context
}) => {
  const [unassignedRules, setUnassignedRules] = useState<UnassignedAllowanceRegionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal and assignment state
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<UnassignedAllowanceRegionRule | null>(null);
  const [selectedTravelRegionSet, setSelectedTravelRegionSet] = useState<string | null>(null);
  const [travelRegionSets, setTravelRegionSets] = useState<TravelRegionSet[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const graphqlClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const loadUnassignedRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Query for all rules and filter client-side for null travelRegionSetRef
      // Note: GraphQL schema doesn't support _is_null operator for this field
      const query = `
        query GetAllAllowanceRegionRulesForFiltering {
          AllowanceRegionRule(
            where: { isDeleted: { _eq: false } }
            orderBy: { code: ASC }
          ) {
            id
            code
            name
            activeFrom
            activeTo
            ruleOrder
            version
            travelRegionSetRef
            additionalProperties
            businessKey
            allowanceRegionRuleDetailAggregate(where: { isDeleted: { _eq: false } }) {
              aggregate {
                count
              }
            }
          }
        }
      `;

      const result = await graphqlClient.request<{ AllowanceRegionRule: any[] }>(query);
      
      // Filter for unassigned rules (null or empty travelRegionSetRef) on client side
      const unassignedRulesData = result.AllowanceRegionRule.filter((rule: any) => 
        !rule.travelRegionSetRef || rule.travelRegionSetRef.trim() === ''
      );
      
      const rules: UnassignedAllowanceRegionRule[] = unassignedRulesData.map((rule: any) => ({
        id: rule.id,
        code: rule.code,
        name: rule.name,
        activeFrom: rule.activeFrom,
        activeTo: rule.activeTo,
        ruleOrder: rule.ruleOrder,
        version: rule.version,
        additionalProperties: rule.additionalProperties,
        businessKey: rule.businessKey,
        detailCount: rule.allowanceRegionRuleDetailAggregate.aggregate.count
      }));
      
      setUnassignedRules(rules);
    } catch (err) {
      console.error('Error loading unassigned rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load unassigned rules');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient]);

  const loadTravelRegionSets = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TravelRegionSet', version: 'v1' },
        { 
          limit: 100, 
          offset: 0, 
          returnTotalRecords: true,
          includeChildCatalogEntries: true 
        }
      );
      
      const sets: TravelRegionSet[] = response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        value: item.value
      }));
      
      setTravelRegionSets(sets);
    } catch (err) {
      console.error('Error loading travel region sets:', err);
      message.error('Failed to load travel region sets');
    }
  }, [catalogClient]);

  useEffect(() => {
    if (accessToken) {
      loadUnassignedRules();
      loadTravelRegionSets();
    }
  }, [accessToken, loadUnassignedRules, loadTravelRegionSets]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const handleAssignToSet = (ruleId: string) => {
    const rule = unassignedRules.find(r => r.id === ruleId);
    if (rule) {
      setSelectedRule(rule);
      setIsAssignModalVisible(true);
      setSelectedTravelRegionSet(null);
    }
  };

  const handleAssignConfirm = async () => {
    if (!selectedRule || !selectedTravelRegionSet) {
      message.error('Please select a travel region set');
      return;
    }

    setIsAssigning(true);
    try {
      // Set access token on client
      expenseSettingsClient.setAccessToken(accessToken);
      
      // Prepare the data for saveAllowanceRegionRule
      const saveData = {
        allowanceRegionRule: {
          id: selectedRule.id,
          version: selectedRule.version || 0,
          code: selectedRule.code,
          name: selectedRule.name,
          activeFrom: selectedRule.activeFrom,
          activeTo: selectedRule.activeTo || null,
          ruleOrder: selectedRule.ruleOrder || null,
          businessKey: selectedRule.businessKey || null,
          travelRegionSetRef: selectedTravelRegionSet, // Assign to the selected set
          additionalProperties: selectedRule.additionalProperties || {}
        },
        changeMode: 'UPDATE'
      };

      console.log('🔄 Assigning rule to travel region set:', saveData);
      
      // Call the save endpoint
      await expenseSettingsClient.saveAllowanceRegionRule(saveData);
      
      message.success(`Successfully assigned "${selectedRule.name}" to travel region set`);
      
      // Close modal and refresh data
      setIsAssignModalVisible(false);
      setSelectedRule(null);
      setSelectedTravelRegionSet(null);
      loadUnassignedRules();
      
    } catch (error) {
      console.error('Error assigning rule to set:', error);
      message.error('Failed to assign rule to travel region set');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignCancel = () => {
    setIsAssignModalVisible(false);
    setSelectedRule(null);
    setSelectedTravelRegionSet(null);
  };

  const columns: ColumnsType<UnassignedAllowanceRegionRule> = [
    {
      title: 'Rule',
      key: 'rule',
      width: 250,
      render: (_, record) => (
        <div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <Text strong>{record.name}</Text>
            <Tag color="orange" size="small">
              <PiWarning className="gba:mr-1" />
              Unassigned
            </Tag>
          </div>
          <Text type="secondary" className="gba:text-sm">
            {record.code}
          </Text>
        </div>
      )
    },
    {
      title: 'Validity Period',
      key: 'validity',
      width: 200,
      render: (_, record) => (
        <div>
          <Text className="gba:text-sm">
            {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
          </Text>
        </div>
      )
    },
    {
      title: 'Details Count',
      dataIndex: 'detailCount',
      key: 'detailCount',
      width: 120,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count} details
        </Tag>
      )
    },
    {
      title: 'Order',
      dataIndex: 'ruleOrder',
      key: 'ruleOrder',
      width: 100,
      align: 'center',
      render: (order?: number) => order || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => handleAssignToSet(record.id)}
            data-testid={`${prefixDataTestId}-assign-rule-${record.id}`}
          >
            Assign to Set
          </Button>
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Unassigned Rules"
        description={error}
        type="error"
        showIcon
        action={<Button size="small" onClick={loadUnassignedRules}>Retry</Button>}
      />
    );
  }

  return (
    <div 
      data-testid={`${prefixDataTestId}-unassigned-rules-view`}
      className="gba:p-6"
    >
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button
            type="text"
            icon={<PiArrowLeft />}
            onClick={onBack}
            data-testid={`${prefixDataTestId}-back-button`}
          >
            Back to Travel Region Sets
          </Button>
        </div>
        
        <Card className="gba:mb-6">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <Title level={3} className="gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('expense-settings:unassigned_rules', 'Unassigned Allowance Rules')}
              </Title>
              <Text type="secondary">
                {unassignedRules.length} rules not assigned to any Travel Region Set
              </Text>
            </div>
            <Space>
              <Button type="primary" icon={<PiPlus />}>
                Create New Rule
              </Button>
            </Space>
          </div>
        </Card>
      </div>

      <Table
        columns={columns}
        dataSource={unassignedRules}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} unassigned rules`,
        }}
        data-testid={`${prefixDataTestId}-unassigned-rules-table`}
      />

      {unassignedRules.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <PiWarning className="gba:text-4xl gba:text-green-400 gba:mb-4" />
          <Title level={4} type="secondary">
            All Rules Are Assigned
          </Title>
          <Text type="secondary">
            Great! All allowance region rules are assigned to travel region sets.
          </Text>
        </div>
      )}

      {/* Assignment Modal */}
      <Modal
        title="Assign Rule to Travel Region Set"
        open={isAssignModalVisible}
        onOk={handleAssignConfirm}
        onCancel={handleAssignCancel}
        confirmLoading={isAssigning}
        okText="Assign"
        cancelText="Cancel"
        data-testid={`${prefixDataTestId}-assign-modal`}
      >
        {selectedRule && (
          <div className="gba:space-y-4">
            <div>
              <Text strong>Rule to assign:</Text>
              <div className="gba:mt-2 gba:p-3 gba:bg-gray-50 gba:rounded">
                <Text strong>{selectedRule.name}</Text>
                <br />
                <Text type="secondary">{selectedRule.code}</Text>
              </div>
            </div>
            
            <div>
              <Text strong>Select Travel Region Set:</Text>
              <Select
                className="gba:w-full gba:mt-2"
                placeholder="Choose a travel region set"
                value={selectedTravelRegionSet}
                onChange={setSelectedTravelRegionSet}
                data-testid={`${prefixDataTestId}-travel-region-set-select`}
              >
                {travelRegionSets.map((set) => (
                  <Select.Option key={set.id} value={set.id}>
                    {set.value} ({set.code})
                  </Select.Option>
                ))}
              </Select>
            </div>
            
            {selectedTravelRegionSet && (
              <div className="gba:p-3 gba:bg-blue-50 gba:rounded">
                <Text type="secondary">
                  The rule "{selectedRule.name}" will be assigned to the selected travel region set and will no longer appear in the unassigned list.
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UnassignedRulesView;
