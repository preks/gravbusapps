import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { 
  Badge,
  Button,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { useMileageRulesIntegration, EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration';
import { useExpenseSettingsIntegration } from '../../hooks/useExpenseSettingsIntegration';
import { MileageRuleForm, MileageRuleFormData } from '../../forms/mileage-rule-form';
import MileageRuleDetails from './MileageRuleDetails';
import { 
  PiPlus, 
  PiMagnifyingGlass, 
  PiArrowClockwise,
  PiCalendar,
  PiEye,
  PiUsers,
  PiCar
} from 'react-icons/pi';
import { ContextMenu, createEditAction, createViewAction } from '../ContextMenu';

// Custom toast implementation until design system provides one
const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
  const style = variant === 'destructive' ? 'color: red' : 'color: green';
  console.log(`%c${title}: ${description}`, style);
  // TODO: Replace with proper toast implementation when available in design system
};

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
      await createMileageRule(formData);
      toast({
        title: "Success",
        description: "Mileage rule created successfully"
      });
      setIsCreateModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error",
        description: "Failed to create mileage rule",
        variant: "destructive"
      });
    }
  };

  const handleEditSubmit = async (formData: MileageRuleFormData) => {
    try {
      if (!editingRule) return;
      await updateMileageRule(editingRule.id, formData);
      toast({
        title: "Success",
        description: "Mileage rule updated successfully"
      });
      setIsEditModalVisible(false);
      setEditingRule(null);
      refetch();
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: "Error",
        description: "Failed to update mileage rule",
        variant: "destructive"
      });
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

  // Use the API integration hook for CRUD operations
  const { 
    createMileageRule, 
    updateMileageRule 
  } = useExpenseSettingsIntegration({ ...context, accessToken });

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
        <div className="gba:flex gba:justify-center">
          <ContextMenu
            actions={[
              createViewAction(() => handleViewRuleDetails(record)),
              createEditAction(() => handleEditRule(record))
            ]}
            triggerTestId={`${prefixDataTestId}-mileage-rule-actions-${record.id}`}
          />
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.mileageRule', 'Mileage Rule'),
      key: 'mileageRule',
      width: 250,
      sorter: (a: EnhancedMileageRule, b: EnhancedMileageRule) => a.code.localeCompare(b.code),
      render: (_, record: EnhancedMileageRule) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCar className="gba:text-gray-400" />
          <div>
            <div className="gba:font-mono gba:font-medium gba:text-sm gba:text-blue-600">
              {record.code}
            </div>
            <div className="gba:text-gray-600 gba:text-xs">
              {record.name}
            </div>
          </div>
        </div>
      )
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.columns.period', 'Rule Period'),
      dataIndex: 'rulePeriodLabel',
      key: 'rulePeriod',
      render: (periodLabel: string) => (
        <Badge variant="default">
          {periodLabel}
        </Badge>
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
          <Badge variant={usageCount > 0 ? 'default' : 'secondary'}>
            {usageCount}
          </Badge>
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
      <Alert className="gba:mb-4">
        <AlertDescription>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <strong>Error Loading Mileage Rules</strong>
              <br />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div data-testid={`${prefixDataTestId}-mileage-rules-list`}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h4 className="gba:text-lg gba:font-semibold gba:m-0 gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.rates.title', 'Mileage Rates')}
          </h4>
          <Badge variant="default">{filteredData.length} items</Badge>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid={`${prefixDataTestId}-refresh-button`}
          >
            <PiArrowClockwise className="gba:mr-2 gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
          </Button>
          <Button 
            onClick={handleCreateRule}
            data-testid={`${prefixDataTestId}-add-button`}
          >
            <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.addRate', 'Add Rate')}
          </Button>
        </div>
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
      {isLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <div className="gba:text-gray-500">Loading mileage rules...</div>
        </div>
      ) : (
        <div className="gba:w-full gba:overflow-x-auto">
          <Table className="gba:min-w-[800px] gba:table-fixed gba:text-sm" data-testid={`${prefixDataTestId}-table`}>
            <TableHeader>
              <TableRow className="gba:h-10">
                <TableHead className="gba:w-[250px] gba:py-2 gba:px-3 gba:text-xs">MILEAGE RULE</TableHead>
                <TableHead className="gba:w-[120px] gba:py-2 gba:px-3 gba:text-xs">PERIOD</TableHead>
                <TableHead className="gba:w-[180px] gba:py-2 gba:px-3 gba:text-xs">VALID PERIOD</TableHead>
                <TableHead className="gba:w-[120px] gba:py-2 gba:px-3 gba:text-xs">USED IN RULES</TableHead>
                <TableHead className="gba:w-[100px] gba:py-2 gba:px-3 gba:text-xs">STATUS</TableHead>
                <TableHead className="gba:w-[60px] gba:py-2 gba:px-3 gba:text-xs">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((record) => (
                <TableRow 
                  key={record.id}
                  className="gba:cursor-pointer hover:gba:bg-gray-50 gba:h-12"
                  onClick={() => handleViewRuleDetails(record)}
                  data-testid={`${prefixDataTestId}-mileage-rule-row-${record.id}`}
                >
                  <TableCell className="gba:py-2 gba:px-3 gba:w-[250px]">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <PiCar className="gba:text-gray-400" />
                      <div>
                        <div className="gba:font-mono gba:font-medium gba:text-sm gba:text-blue-600 gba:truncate" title={record.code}>
                          {record.code}
                        </div>
                        <div className="gba:text-gray-600 gba:text-xs gba:truncate" title={record.name}>
                          {record.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-2 gba:px-3 gba:w-[120px]">
                    <Badge variant="default">
                      {record.rulePeriodLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:py-2 gba:px-3 gba:w-[180px]">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <PiCalendar className="gba:text-purple-500" />
                      <span className="gba:text-sm gba:truncate" title={record.validityPeriod}>{record.validityPeriod}</span>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-2 gba:px-3 gba:w-[120px]">
                    <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
                      <PiUsers className="gba:text-blue-500" size={14} />
                      <Badge variant={record.usageCount > 0 ? 'default' : 'secondary'}>
                        {record.usageCount}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-2 gba:px-3 gba:w-[100px]">
                    <Badge variant={record.isActive ? 'default' : 'secondary'}>
                      {record.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:py-2 gba:px-3 gba:w-[60px]">
                    <div className="gba:flex gba:justify-center">
                      <ContextMenu
                        actions={[
                          createViewAction(() => handleViewRuleDetails(record)),
                          createEditAction(() => handleEditRule(record))
                        ]}
                        triggerTestId={`${prefixDataTestId}-mileage-rule-actions-${record.id}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
          {editingRule && (() => {
            const initialData = {
              id: editingRule.id,
              version: editingRule.version,
              code: editingRule.code,
              ruleName: editingRule.name,
              description: editingRule.description || '',
              rulePeriod: editingRule.rulePeriod || '',
              activeFrom: editingRule.effectiveFrom ? dayjs(editingRule.effectiveFrom).format('YYYY-MM-DD') : '',
              activeTo: editingRule.effectiveTo ? dayjs(editingRule.effectiveTo).format('YYYY-MM-DD') : '',
              details: editingRule.details.map(detail => ({
                id: detail.id,
                version: detail.version,
                rateAmount: detail.amount,
                limitFrom: detail.limitFrom,
                limitTo: detail.limitTo,
                detailOrder: detail.detailOrder,
                activeFrom: detail.activeFrom ? dayjs(detail.activeFrom).format('YYYY-MM-DD') : '',
                activeTo: detail.activeTo ? dayjs(detail.activeTo).format('YYYY-MM-DD') : ''
              }))
            };
            
            // DEBUG: Log what we're passing to the form
            console.log('🐛 EditingRule initial data:', {
              ruleId: initialData.id,
              ruleVersion: initialData.version,
              ruleCode: initialData.code,
              detailsWithVersions: initialData.details.map(d => ({ 
                id: d.id, 
                version: d.version 
              }))
            });
            
            return (
              <MileageRuleForm
                accessToken={accessToken}
                initialData={initialData}
                onSubmit={handleEditSubmit}
                onCancel={handleModalCancel}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MileageRulesList; 