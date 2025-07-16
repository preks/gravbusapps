import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table, 
  Spin, 
  Alert, 
  Button, 
  Input, 
  Tag, 
  Typography,
  Space,
  Tooltip,
  Modal,
  message
} from 'antd';
import { Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useTravelRegionRulesIntegration, EnhancedTravelRegionRule } from '../../hooks/useTravelRegionRulesIntegration';
import { TravelRegionRuleForm, TravelRegionRuleFormData } from '../../forms/travel-region-rule-form';
import { 
  PiPlus, 
  PiMagnifyingGlass, 
  PiArrowClockwise,
  PiGlobe,
  PiMapPin,
  PiCurrencyCircleDollar,
  PiCalendar,
  PiBuildings,
  PiPencil
} from 'react-icons/pi';

const { Title } = Typography;
const { Search } = Input;

// Re-export the enhanced interface for external use
export type { EnhancedTravelRegionRule as TravelRegionRule };

export interface TravelRegionRulesListProps extends BusinessAppContextProps {
  viewType: 'allowances' | 'regions';
  prefixDataTestId?: string;
}

const TravelRegionRulesList: React.FC<TravelRegionRulesListProps> = ({
  viewType,
  prefixDataTestId = '',
  accessToken,
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state management
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<EnhancedTravelRegionRule | null>(null);

  // Modal handlers
  const handleCreateRule = () => setIsCreateModalVisible(true);
  const handleEditRule = (rule: EnhancedTravelRegionRule) => {
    setEditingRule(rule);
    setIsEditModalVisible(true);
  };
  const handleModalCancel = () => {
    setIsCreateModalVisible(false);
    setIsEditModalVisible(false);
    setEditingRule(null);
  };
  const handleCreateSubmit = async (formData: TravelRegionRuleFormData) => {
    try {
      console.log('Creating travel region rule:', formData);
      message.success('Travel region rule created successfully');
      setIsCreateModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Error creating rule:', error);
      message.error('Failed to create rule');
    }
  };
  const handleEditSubmit = async (formData: TravelRegionRuleFormData) => {
    try {
      console.log('Updating travel region rule:', formData);
      message.success('Travel region rule updated successfully');
      setIsEditModalVisible(false);
      setEditingRule(null);
      refetch();
    } catch (error) {
      console.error('Error updating rule:', error);
      message.error('Failed to update rule');
    }
  };

  // Use the GraphQL integration hook
  const {
    travelRegionRules,
    isLoading,
    error,
    totalCount,
    searchTravelRegionRules,
    refetch
  } = useTravelRegionRulesIntegration({ ...context, accessToken });

  // Handle search with debounced effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchTravelRegionRules(searchTerm);
      } else {
        refetch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchTravelRegionRules, refetch]);

  // Filter data based on search term (for immediate UI feedback)
  const filteredData = useMemo(() => {
    return travelRegionRules.filter(rule =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.allowanceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [travelRegionRules, searchTerm]);

  // Get allowance type color
  const getAllowanceTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'blue';
      case 'hourly': return 'green';
      case 'meal': return 'orange';
      case 'accommodation': return 'purple';
      default: return 'default';
    }
  };

  // Get allowance type icon
  const getAllowanceTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <PiCalendar className="gba:text-blue-500" />;
      case 'hourly': return <PiCurrencyCircleDollar className="gba:text-green-500" />;
      case 'meal': return <PiBuildings className="gba:text-orange-500" />;
      case 'accommodation': return <PiGlobe className="gba:text-purple-500" />;
      default: return <PiMapPin />;
    }
  };

  // Column definitions for allowances view
  const allowancesColumns = [
    {
      title: '',
      key: 'actions',
      width: '60px',
      render: (_: any, record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <Button
            type="text"
            size="small"
            icon={<PiPencil />}
            data-testid={`${prefixDataTestId}-edit-travel-allowance-button-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEditRule(record);
            }}
            title="Edit Travel Region Rule"
          />
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.name', 'Allowance Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a: EnhancedTravelRegionRule, b: EnhancedTravelRegionRule) => a.name.localeCompare(b.name),
      render: (text: string, record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:flex-col">
          <span className="gba:font-medium">{text}</span>
          {record.description && (
            <span className="gba:text-sm gba:text-gray-500">{record.description}</span>
          )}
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.location', 'Location'),
      key: 'location',
      sorter: (a: EnhancedTravelRegionRule, b: EnhancedTravelRegionRule) => a.country.localeCompare(b.country),
      render: (record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:flex-col">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiMapPin className="gba:text-blue-500" />
            <span className="gba:font-medium">{record.country}</span>
          </div>
          <span className="gba:text-sm gba:text-gray-500">{record.region}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.allowanceType', 'Type'),
      dataIndex: 'allowanceType',
      key: 'allowanceType',
      sorter: (a: EnhancedTravelRegionRule, b: EnhancedTravelRegionRule) => a.allowanceType.localeCompare(b.allowanceType),
      render: (type: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {getAllowanceTypeIcon(type)}
          <Tag color={getAllowanceTypeColor(type)}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Tag>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.amount', 'Amount'),
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a: EnhancedTravelRegionRule, b: EnhancedTravelRegionRule) => a.amount - b.amount,
      render: (amount: number, record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:items-center gba:gap-1">
          <PiCurrencyCircleDollar className="gba:text-green-500" />
          <span className="gba:font-mono">{amount.toFixed(2)} {record.currency}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.effectivePeriod', 'Effective Period'),
      key: 'effectivePeriod',
      render: (record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCalendar className="gba:text-purple-500" />
          <span>
            {record.effectiveFrom}
            {record.effectiveTo ? ` - ${record.effectiveTo}` : ' - ongoing'}
          </span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.status', 'Status'),
      dataIndex: 'isActive',
      key: 'status',
      sorter: (a: EnhancedTravelRegionRule, b: EnhancedTravelRegionRule) => Number(a.isActive) - Number(b.isActive),
      render: (isActive: boolean) => (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  // Regions columns (simplified view focusing on geographic regions)
  const regionsColumns = [
    {
      title: '',
      key: 'actions',
      width: '60px',
      render: (_: any, record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <Button
            type="text"
            size="small"
            icon={<PiPencil />}
            data-testid={`${prefixDataTestId}-edit-travel-region-button-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEditRule(record);
            }}
            title="Edit Travel Region Rule"
          />
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.region', 'Region'),
      dataIndex: 'region',
      key: 'region',
      sorter: (a: EnhancedTravelRegionRule, b: EnhancedTravelRegionRule) => a.region.localeCompare(b.region),
      render: (region: string, record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:flex-col">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiGlobe className="gba:text-blue-500" />
            <span className="gba:font-medium">{region}</span>
          </div>
          <span className="gba:text-sm gba:text-gray-500">{record.country}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.countries', 'Countries'),
      dataIndex: 'country',
      key: 'country',
      render: (country: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiMapPin className="gba:text-green-500" />
          <span>{country}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.allowanceTypes', 'Allowance Types'),
      key: 'allowanceTypes',
      render: (record: EnhancedTravelRegionRule) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {getAllowanceTypeIcon(record.allowanceType)}
          <Tag color={getAllowanceTypeColor(record.allowanceType)}>
            {record.allowanceType.charAt(0).toUpperCase() + record.allowanceType.slice(1)}
          </Tag>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.columns.status', 'Status'),
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  const columns = viewType === 'allowances' ? allowancesColumns : regionsColumns;

  const handleRefresh = () => {
    refetch();
  };

  const handleAdd = () => {
    handleCreateRule();
  };

  if (error) {
    return (
      <Alert
        message="Error Loading Travel Region Rules"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div data-testid={`${prefixDataTestId}-travel-region-rules-list`}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Title level={4} className="gba:m-0 gba:text-gray-900">
            {viewType === 'allowances' 
              ? getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.allowances.title', 'Travel Allowances')
              : getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.regions.title', 'Travel Regions')
            }
          </Title>
          <Tag color="blue">{filteredData.length} items</Tag>
        </div>
        <Space>
          <Button 
            icon={<PiArrowClockwise />} 
            onClick={handleRefresh}
            loading={isLoading}
            data-testid={`${prefixDataTestId}-refresh-button`}
          >
            {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
          </Button>
          <Button 
            type="primary" 
            icon={<PiPlus />} 
            onClick={handleAdd}
            data-testid={`${prefixDataTestId}-add-button`}
          >
            {viewType === 'allowances' 
              ? getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.addAllowance', 'Add Allowance')
              : getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.addRegion', 'Add Region')
            }
          </Button>
        </Space>
      </div>

      {/* Search */}
      <div className="gba:mb-4">
        <DebouncedInput
          placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.travelRegionRules.searchPlaceholder', 'Search rules...')}
          value={searchTerm}
          onChange={setSearchTerm}
          className="gba:max-w-md"
          data-testid={`${prefixDataTestId}-search-input`}
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
        data-testid={`${prefixDataTestId}-table`}
      />

      {/* Create Travel Region Rule Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createTravelRegionRule.title', 'Create Travel Region Rule')}
        open={isCreateModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={1000}
        destroyOnClose
        data-testid={`${prefixDataTestId}-create-travel-region-rule-modal`}
      >
        <TravelRegionRuleForm
          accessToken={accessToken}
          onSave={handleCreateSubmit}
          onCancel={handleModalCancel}
          isEditing={false}
        />
      </Modal>

      {/* Edit Travel Region Rule Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editTravelRegionRule.title', 'Edit Travel Region Rule')}
        open={isEditModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={1000}
        destroyOnClose
        data-testid={`${prefixDataTestId}-edit-travel-region-rule-modal`}
      >
        {editingRule && (
          <TravelRegionRuleForm
            accessToken={accessToken}
            initialData={{
              id: editingRule.id,
              code: editingRule.code,
              name: editingRule.name,
              ruleOrder: editingRule.ruleOrder || 1,
              activeFrom: editingRule.effectiveFrom,
              activeTo: editingRule.effectiveTo,
              details: editingRule.details.map(detail => ({
                id: detail.id,
                amount: detail.amount,
                countryRef: detail.countryRef,
                currencyRef: detail.currencyRef
              }))
            }}
            onSave={handleEditSubmit}
            onCancel={handleModalCancel}
            isEditing={true}
          />
        )}
      </Modal>
    </div>
  );
};

export default TravelRegionRulesList; 