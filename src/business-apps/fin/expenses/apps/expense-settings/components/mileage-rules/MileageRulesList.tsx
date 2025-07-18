import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
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
  message
} from 'antd';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { useMileageRulesIntegration, EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration';
import { MileageRuleForm, MileageRuleFormData } from '../../forms/mileage-rule-form';
import MileageRuleDetails from './MileageRuleDetails';
import { 
  PiPlus, 
  PiMagnifyingGlass, 
  PiArrowClockwise,
  PiCalendar,
  PiPencil,
  PiEye,
  PiUsers
} from 'react-icons/pi';

const { Title } = Typography;
const { Search } = Input;

// Re-export the enhanced interface for external use
export type { EnhancedMileageRule as MileageRule };

export interface MileageRulesListProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const MileageRulesList: React.FC<MileageRulesListProps> = ({
  prefixDataTestId = '',
  accessToken,
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state management
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<EnhancedMileageRule | null>(null);

  // Drawer state management
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<EnhancedMileageRule | null>(null);

  // Modal handlers
  const handleCreateRule = () => {
    setIsCreateModalVisible(true);
  };

  const handleEditRule = (rule: EnhancedMileageRule) => {
    setEditingRule(rule);
    setIsEditModalVisible(true);
  };

  // Drawer handlers
  const handleViewRuleDetails = (rule: EnhancedMileageRule) => {
    setSelectedRule(rule);
    setIsDetailsDrawerVisible(true);
  };

  const handleCloseDetailsDrawer = () => {
    setIsDetailsDrawerVisible(false);
    setSelectedRule(null);
  };

  const handleNavigateToCalculationRule = (ruleId: string, page?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('ruleId', ruleId);
    if (page) {
      urlParams.set('page', page);
    }
    
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Trigger a popstate event to notify the parent component of the URL change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleCreateSubmit = async (formData: MileageRuleFormData) => {
    try {
      // TODO: Implement actual API call using expense settings integration
      // await createMileageRule(formData);
      setIsCreateModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleEditSubmit = async (formData: MileageRuleFormData) => {
    try {
      // TODO: Implement actual API call using expense settings integration
      // await updateMileageRule(editingRule.id, formData);
      setIsEditModalVisible(false);
      setEditingRule(null);
      refetch();
    } catch (error) {
      console.error('Error updating rule:', error);
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
            icon={<PiEye />}
            data-testid={`${prefixDataTestId}-view-mileage-rate-button-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleViewRuleDetails(record);
            }}
            title="View Details"
          />
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
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.code', 'Code'),
      dataIndex: 'code',
      key: 'code',
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.code.localeCompare(b.code),
      render: (text: string) => (
        <span className="gba:font-mono gba:text-blue-600">{text}</span>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.name', 'Name'),
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
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.period', 'Rule Period'),
      dataIndex: 'rulePeriodLabel',
      key: 'rulePeriod',
      render: (periodLabel: string) => (
        <Tag color="blue">
          {periodLabel}
        </Tag>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.validPeriod', 'Valid From - Valid To'),
      dataIndex: 'validityPeriod',
      key: 'validityPeriod',
      render: (validityPeriod: string) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCalendar className="gba:text-purple-500" />
          <span className="gba:text-sm">{validityPeriod}</span>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.usageCount', 'Used in Rules'),
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 120,
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.usageCount - b.usageCount,
      render: (usageCount: number) => (
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
          <PiUsers className="gba:text-blue-500" size={14} />
          <Tag color={usageCount > 0 ? 'green' : 'default'}>
            {usageCount}
          </Tag>
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

  const columns = ratesColumns;

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
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.rates.title', 'Mileage Rates')}
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
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.addRate', 'Add Rate')}
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
        onRow={(record) => ({
          onClick: () => handleViewRuleDetails(record),
          style: { cursor: 'pointer' },
          'data-testid': `${prefixDataTestId}-mileage-rule-row-${record.id}`
        })}
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

      {/* Details Drawer */}
      <DataDetailsDrawer
        title={selectedRule ? `${selectedRule.name} (${selectedRule.code})` : ''}
        open={isDetailsDrawerVisible}
        onClose={handleCloseDetailsDrawer}
        width={600}
        placement="right"
        dataTestId={`${prefixDataTestId}-mileage-rule-details-drawer`}
      >
        {selectedRule && (
          <MileageRuleDetails
            mileageRule={selectedRule}
            onNavigateToCalculationRule={handleNavigateToCalculationRule}
            accessToken={accessToken}
            {...context}
          />
        )}
      </DataDetailsDrawer>

      {/* Create Mileage Rule Dialog */}
      <Dialog
        open={isCreateModalVisible}
        onOpenChange={(open) => !open && handleModalCancel()}
      >
        <DialogContent 
          className="gba:max-h-[90vh] gba:overflow-y-auto" 
          style={{ 
            width: 'min(95vw, 1200px)', 
            maxWidth: '1200px',
            minWidth: '600px'
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createMileageRule.title', 'Create Mileage Rule')}
            </DialogTitle>
          </DialogHeader>
          <MileageRuleForm
            accessToken={accessToken}
            onSubmit={handleCreateSubmit}
            onCancel={handleModalCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Mileage Rule Dialog */}
      <Dialog
        open={isEditModalVisible}
        onOpenChange={(open) => !open && handleModalCancel()}
      >
        <DialogContent 
          className="gba:max-h-[90vh] gba:overflow-y-auto" 
          style={{ 
            width: 'min(95vw, 1200px)', 
            maxWidth: '1200px',
            minWidth: '600px'
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editMileageRule.title', 'Edit Mileage Rule')}
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <MileageRuleForm
              accessToken={accessToken}
              initialData={{
                id: editingRule.id,
                ruleName: editingRule.name,
                description: editingRule.description || '',
                rulePeriod: editingRule.rulePeriod || '',
                activeFrom: editingRule.effectiveFrom ? dayjs(editingRule.effectiveFrom).format('YYYY-MM-DD') : '',
                activeTo: editingRule.effectiveTo ? dayjs(editingRule.effectiveTo).format('YYYY-MM-DD') : '',
                details: editingRule.details.map(detail => ({
                  id: detail.id,
                  rateAmount: detail.amount,
                  limitFrom: detail.limitFrom,
                  limitTo: detail.limitTo,
                  detailOrder: detail.detailOrder,
                  activeFrom: detail.activeFrom ? dayjs(detail.activeFrom).format('YYYY-MM-DD') : '',
                  activeTo: detail.activeTo ? dayjs(detail.activeTo).format('YYYY-MM-DD') : ''
                }))
              }}
              onSubmit={handleEditSubmit}
              onCancel={handleModalCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MileageRulesList; 