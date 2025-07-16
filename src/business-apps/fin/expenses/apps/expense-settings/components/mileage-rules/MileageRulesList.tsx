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
import { useMileageRulesIntegration, EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration';
import { MileageRuleForm, MileageRuleFormData } from '../../forms/mileage-rule-form';
import { 
  PiPlus, 
  PiMagnifyingGlass, 
  PiArrowClockwise,
  PiCar,
  PiGasPump,
  PiCalendar,
  PiPencil
} from 'react-icons/pi';

const { Title } = Typography;
const { Search } = Input;

// Re-export the enhanced interface for external use
export type { EnhancedMileageRule as MileageRule };

export interface MileageRulesListProps extends BusinessAppContextProps {
  viewType: 'rates' | 'vehicle-types';
  prefixDataTestId?: string;
}

const MileageRulesList: React.FC<MileageRulesListProps> = ({
  viewType,
  prefixDataTestId = '',
  accessToken,
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state management
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<EnhancedMileageRule | null>(null);

  // Modal handlers
  const handleCreateRule = () => {
    setIsCreateModalVisible(true);
  };

  const handleEditRule = (rule: EnhancedMileageRule) => {
    setEditingRule(rule);
    setIsEditModalVisible(true);
  };

  const handleCreateSubmit = async (formData: MileageRuleFormData) => {
    try {
      // TODO: Implement actual create API call
      console.log('Creating mileage rule:', formData);
      message.success('Mileage rule created successfully');
      setIsCreateModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Error creating mileage rule:', error);
      message.error('Failed to create mileage rule');
    }
  };

  const handleEditSubmit = async (formData: MileageRuleFormData) => {
    try {
      // TODO: Implement actual update API call
      console.log('Updating mileage rule:', formData);
      message.success('Mileage rule updated successfully');
      setIsEditModalVisible(false);
      setEditingRule(null);
      refetch();
    } catch (error) {
      console.error('Error updating mileage rule:', error);
      message.error('Failed to update mileage rule');
    }
  };

  const handleModalCancel = () => {
    setIsCreateModalVisible(false);
    setIsEditModalVisible(false);
    setEditingRule(null);
  };

  // Use the GraphQL integration hook
  const {
    mileageRules,
    isLoading,
    error,
    totalCount,
    searchMileageRules,
    refetch
  } = useMileageRulesIntegration({ ...context, accessToken });

  // Handle search with debounced effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchMileageRules(searchTerm);
      } else {
        refetch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMileageRules, refetch]);

  // Filter data based on search term (for immediate UI feedback)
  const filteredData = useMemo(() => {
    return mileageRules.filter(rule =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mileageRules, searchTerm]);

  // Column definitions for rates view
  const ratesColumns = [
    {
      title: '',
      key: 'actions',
      width: '60px',
      render: (_: any, record: EnhancedMileageRule) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <Button
            type="text"
            size="small"
            icon={<PiPencil />}
            data-testid={`${prefixDataTestId}-edit-mileage-rate-button-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEditRule(record);
            }}
            title="Edit Mileage Rule"
          />
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.name', 'Rule Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.name.localeCompare(b.name),
      render: (text: string, record: EnhancedMileageRule) => (
        <div className="gba:flex gba:flex-col">
          <span className="gba:font-medium">{text}</span>
          {record.description && (
            <span className="gba:text-sm gba:text-gray-500">{record.description}</span>
          )}
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.vehicleType', 'Vehicle Type'),
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.vehicleType.localeCompare(b.vehicleType),
      render: (vehicleType: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCar className="gba:text-blue-500" />
          <span>{vehicleType}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.rate', 'Rate per KM'),
      dataIndex: 'ratePerKm',
      key: 'rate',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.ratePerKm - b.ratePerKm,
      render: (rate: number, record: EnhancedMileageRule) => (
        <div className="gba:flex gba:items-center gba:gap-1">
          <PiGasPump className="gba:text-green-500" />
          <span className="gba:font-mono">{rate.toFixed(2)} {record.currency}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.effectivePeriod', 'Effective Period'),
      key: 'effectivePeriod',
      render: (record: EnhancedMileageRule) => (
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
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.status', 'Status'),
      dataIndex: 'isActive',
      key: 'status',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => Number(a.isActive) - Number(b.isActive),
      render: (isActive: boolean) => (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  // Vehicle types columns (simplified view focusing on vehicle management)
  const vehicleTypesColumns = [
    {
      title: '',
      key: 'actions',
      width: '60px',
      render: (_: any, record: EnhancedMileageRule) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <Button
            type="text"
            size="small"
            icon={<PiPencil />}
            data-testid={`${prefixDataTestId}-edit-vehicle-type-button-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEditRule(record);
            }}
            title="Edit Mileage Rule"
          />
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.vehicleType', 'Vehicle Type'),
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.vehicleType.localeCompare(b.vehicleType),
      render: (vehicleType: string, record: EnhancedMileageRule) => (
        <div className="gba:flex gba:flex-col">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCar className="gba:text-blue-500" />
            <span className="gba:font-medium">{vehicleType}</span>
          </div>
          {record.description && (
            <span className="gba:text-sm gba:text-gray-500">{record.description}</span>
          )}
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.currentRate', 'Current Rate'),
      dataIndex: 'ratePerKm',
      key: 'rate',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.ratePerKm - b.ratePerKm,
      render: (rate: number, record: EnhancedMileageRule) => (
        <span className="gba:font-mono">{rate.toFixed(2)} {record.currency}/km</span>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.status', 'Status'),
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  const columns = viewType === 'rates' ? ratesColumns : vehicleTypesColumns;

  const handleRefresh = () => {
    refetch();
  };

  const handleAdd = () => {
    handleCreateRule();
  };

  if (error) {
    return (
      <Alert
        message="Error Loading Mileage Rules"
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
    <div data-testid={`${prefixDataTestId}-mileage-rules-list`}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Title level={4} className="gba:m-0 gba:text-gray-900">
            {viewType === 'rates' 
              ? getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.rates.title', 'Mileage Rates')
              : getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.vehicleTypes.title', 'Vehicle Types')
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
            {viewType === 'rates' 
              ? getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.addRate', 'Add Rate')
              : getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.addVehicleType', 'Add Vehicle Type')
            }
          </Button>
        </Space>
      </div>

      {/* Search */}
      <div className="gba:mb-4">
        <DebouncedInput
          placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.searchPlaceholder', 'Search rules...')}
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

      {/* Create Mileage Rule Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createMileageRule.title', 'Create Mileage Rule')}
        open={isCreateModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={1000}
        destroyOnClose
        data-testid={`${prefixDataTestId}-create-mileage-rule-modal`}
      >
        <MileageRuleForm
          accessToken={accessToken}
          onSave={handleCreateSubmit}
          onCancel={handleModalCancel}
          isEditing={false}
        />
      </Modal>

      {/* Edit Mileage Rule Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editMileageRule.title', 'Edit Mileage Rule')}
        open={isEditModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={1000}
        destroyOnClose
        data-testid={`${prefixDataTestId}-edit-mileage-rule-modal`}
      >
        {editingRule && (
          <MileageRuleForm
            accessToken={accessToken}
            initialData={{
              id: editingRule.id,
              code: editingRule.code,
              name: editingRule.name,
              ruleOrder: editingRule.ruleOrder,
              activeFrom: editingRule.effectiveFrom,
              activeTo: editingRule.effectiveTo,
              details: editingRule.details.map(detail => ({
                id: detail.id,
                amount: detail.amount,
                limitFrom: detail.limitFrom,
                limitTo: detail.limitTo,
                detailOrder: detail.detailOrder
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

export default MileageRulesList; 