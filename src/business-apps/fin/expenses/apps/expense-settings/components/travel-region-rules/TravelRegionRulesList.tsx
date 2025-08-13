import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { message } from 'antd';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { DataDetails } from '@/components/data-details';
import { useTravelRegionRulesIntegration, EnhancedTravelRegionRule } from '../../hooks/useTravelRegionRulesIntegration';
import { useExpenseSettingsIntegration } from '../../hooks/useExpenseSettingsIntegration';
import { TravelRegionRuleForm, TravelRegionRuleFormData } from '../../forms/travel-region-rule-form';
import { 
  PiPlus, 
  PiArrowClockwise,
  PiMapPin,
  PiCurrencyCircleDollar,
  PiCalendar,
  PiPencil,
  PiGlobe
} from 'react-icons/pi';

// Re-export the enhanced interface for external use
export type { EnhancedTravelRegionRule as TravelRegionRule };

export interface TravelRegionRulesListProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Date formatting utility (consistent with other tables)
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  // Handle various date formats
  const date = dayjs(dateString);
  return date.isValid() ? date.format('DD/MM/YYYY') : dateString;
};

const TravelRegionRulesList: React.FC<TravelRegionRulesListProps> = ({
  prefixDataTestId = '',
  accessToken,
  ...context
}) => {


  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRule, setSelectedRule] = useState<EnhancedTravelRegionRule | null>(null);
  
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
      console.log('🚀 Creating travel region rule:', formData);
      await createTravelRegionRule(formData);
      console.log('✅ Travel region rule created successfully');
      message.success('Allowance region rule created successfully');
      setIsCreateModalVisible(false);
      refetch();
    } catch (error) {
      console.error('❌ Error creating travel region rule:', error);
      message.error('Failed to create allowance region rule');
    }
  };
  const handleEditSubmit = async (formData: TravelRegionRuleFormData) => {
    try {
      if (!editingRule) return;
      console.log('🚀 Updating travel region rule:', { 
        id: editingRule.id, 
        version: editingRule.version, 
        data: formData 
      });
      await updateTravelRegionRule(editingRule.id, formData, editingRule.version);
      console.log('✅ Travel region rule updated successfully');
      message.success('Allowance region rule updated successfully');
      setIsEditModalVisible(false);
      setEditingRule(null);
      refetch();
    } catch (error) {
      console.error('❌ Error updating travel region rule:', error);
      message.error('Failed to update allowance region rule');
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

  // Use the API integration hook for CRUD operations
  const { 
    createTravelRegionRule, 
    updateTravelRegionRule,
    deleteTravelRegionRule
  } = useExpenseSettingsIntegration({ ...context, accessToken });

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
      rule.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.details.some(detail => 
        detail.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        detail.travelRegion.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [travelRegionRules, searchTerm]);

  const handleRefresh = () => {
    refetch();
  };

  const handleAdd = () => {
    handleCreateRule();
  };

  const handleRowClick = (rule: EnhancedTravelRegionRule) => {
    setSelectedRule(rule);
  };

  const handleCloseDetails = () => {
    setSelectedRule(null);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error Loading Allowance Region Rules: {error}
        </AlertDescription>
        <Button size="sm" onClick={handleRefresh} className="gba:mt-2">
          Retry
        </Button>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="gba:flex gba:h-full">
      {/* Main Content */}
      <div className={`gba:transition-all gba:duration-300 ${selectedRule ? 'gba:w-2/3' : 'gba:w-full'}`}>
        <div data-testid={`${prefixDataTestId}-allowance-region-rules-list`} className="gba:space-y-6 gba:p-6">
          {/* Header */}
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-4">
              <h4 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:m-0">
                {getTranslationFromI18nKeyAndLabel('expenseSettings.allowanceRegionRules.title', 'Allowance Region Rules')}
              </h4>
              <Badge variant="secondary">
                {filteredData.length} items
              </Badge>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                data-testid={`${prefixDataTestId}-refresh-button`}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiArrowClockwise className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
              </Button>
              <Button 
                onClick={handleAdd}
                data-testid={`${prefixDataTestId}-add-button`}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiPlus className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('expenseSettings.allowanceRegionRules.addRule', 'Add Allowance Rule')}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div>
            <DebouncedInput
              placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.allowanceRegionRules.searchPlaceholder', 'Search allowance region rules...')}
              value={searchTerm}
              onChange={setSearchTerm}
              className="gba:max-w-md"
              data-testid={`${prefixDataTestId}-search-input`}
            />
          </div>

          {/* Table */}
          <div className="gba:border gba:rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-16">Actions</TableHead>
                  <TableHead>Rule Code</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Details Count</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((rule) => (
                  <TableRow 
                    key={rule.id}
                    onClick={() => handleRowClick(rule)}
                    className={`gba:cursor-pointer hover:gba:bg-gray-100 ${
                      selectedRule?.id === rule.id ? 'gba:bg-blue-50 gba:border-l-4 gba:border-l-blue-500' : ''
                    }`}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`${prefixDataTestId}-edit-allowance-region-rule-button-${rule.id}`}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEditRule(rule);
                        }}
                        title="Edit Allowance Region Rule"
                      >
                        <PiPencil className="gba:h-4 gba:w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <strong>{rule.code}</strong>
                    </TableCell>
                    <TableCell>
                      <span className="gba:font-medium">{rule.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:flex-col gba:gap-1">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiMapPin className="gba:text-blue-500 gba:h-4 gba:w-4" />
                          <span className="gba:font-medium">
                            {rule.details.length === 1 
                              ? rule.details[0].country 
                              : `${rule.details.length} countries`
                            }
                          </span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiGlobe className="gba:text-green-500 gba:h-4 gba:w-4" />
                          <span className="gba:text-sm gba:text-gray-500">
                            {rule.details.length === 1 
                              ? rule.details[0].travelRegion 
                              : `${new Set(rule.details.map(d => d.travelRegion)).size} regions`
                            }
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rule.details.length} detail{rule.details.length !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar className="gba:text-purple-500 gba:h-4 gba:w-4" />
                        <span className="gba:text-sm">
                          {formatDate(rule.effectiveFrom)}
                          {rule.effectiveTo ? ` - ${formatDate(rule.effectiveTo)}` : ' - ∞'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && !isLoading && (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              No allowance region rules found. Click "Add Allowance Rule" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Details Bar */}
      {selectedRule && (
        <div className="gba:w-1/3 gba:border-l gba:border-gray-200 gba:bg-white">
          <DataDetails
            title={selectedRule.name}
            onClose={handleCloseDetails}
            data-testid={`${prefixDataTestId}-allowance-region-rule-details`}
          >
            <div className="gba:space-y-6">
              {/* Basic Information */}
              <div className="gba:space-y-4">
                <h6 className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:uppercase gba:tracking-wider">
                  Basic Information
                </h6>
                <div className="gba:grid gba:grid-cols-1 gba:gap-3">
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                      Rule Code
                    </label>
                    <p className="gba:text-sm gba:font-medium gba:text-gray-900">{selectedRule.code}</p>
                  </div>
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                      Rule Name
                    </label>
                    <p className="gba:text-sm gba:text-gray-900">{selectedRule.name}</p>
                  </div>
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                      Status
                    </label>
                    <div className="gba:mt-1">
                      <Badge variant={selectedRule.isActive ? 'default' : 'secondary'}>
                        {selectedRule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coverage Summary */}
              <div className="gba:space-y-4">
                <h6 className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:uppercase gba:tracking-wider">
                  Coverage Summary
                </h6>
                <div className="gba:grid gba:grid-cols-1 gba:gap-3">
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                      Countries Covered
                    </label>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                      <PiMapPin className="gba:text-blue-500 gba:h-4 gba:w-4" />
                      <span className="gba:text-sm gba:font-medium gba:text-gray-900">
                        {new Set(selectedRule.details.map(d => d.country)).size} countries
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                      Travel Regions
                    </label>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                      <PiGlobe className="gba:text-green-500 gba:h-4 gba:w-4" />
                      <span className="gba:text-sm gba:text-gray-900">
                        {new Set(selectedRule.details.map(d => d.travelRegion)).size} regions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Effective Period */}
              <div className="gba:space-y-4">
                <h6 className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:uppercase gba:tracking-wider">
                  Effective Period
                </h6>
                <div className="gba:grid gba:grid-cols-1 gba:gap-3">
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                      From - To
                    </label>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                      <PiCalendar className="gba:text-purple-500 gba:h-4 gba:w-4" />
                      <span className="gba:text-sm gba:text-gray-900">
                        {formatDate(selectedRule.effectiveFrom)}
                        {selectedRule.effectiveTo ? ` - ${formatDate(selectedRule.effectiveTo)}` : ' - ∞'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule Details */}
              <div className="gba:space-y-4">
                <h6 className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:uppercase gba:tracking-wider">
                  Rule Details ({selectedRule.details.length})
                </h6>
                <div className="gba:space-y-3">
                  {selectedRule.details.map((detail, index) => (
                    <div 
                      key={detail.id || index} 
                      className="gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border"
                    >
                      <div className="gba:grid gba:grid-cols-1 gba:gap-2">
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <span className="gba:text-xs gba:font-medium gba:text-gray-500">
                            Detail {index + 1}
                          </span>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiCurrencyCircleDollar className="gba:text-green-500 gba:h-4 gba:w-4" />
                            <span className="gba:text-sm gba:font-medium gba:text-gray-900">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: detail.currency || 'EUR'
                              }).format(detail.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="gba:text-xs gba:text-gray-600">
                          <div>{detail.country}</div>
                          <div>{detail.currency}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DataDetails>
        </div>
      )}

      {/* Create Allowance Region Rule Dialog */}
      <Dialog open={isCreateModalVisible} onOpenChange={setIsCreateModalVisible}>
        <DialogContent style={{ 
          width: 'min(95vw, 1200px)', 
          maxWidth: '1200px', 
          minWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createAllowanceRegionRule.title', 'Create Allowance Region Rule')}
            </DialogTitle>
          </DialogHeader>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <TravelRegionRuleForm
              accessToken={accessToken}
              onSave={handleCreateSubmit}
              onCancel={handleModalCancel}
              isEditing={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Allowance Region Rule Dialog */}
      <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
        <DialogContent style={{ 
          width: 'min(95vw, 1200px)', 
          maxWidth: '1200px', 
          minWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editAllowanceRegionRule.title', 'Edit Allowance Region Rule')}
            </DialogTitle>
          </DialogHeader>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {editingRule && (
              <TravelRegionRuleForm
                accessToken={accessToken}
                initialData={{
                  id: editingRule.id,
                  code: editingRule.code,
                  name: editingRule.name,
                  activeFrom: editingRule.effectiveFrom,
                  activeTo: editingRule.effectiveTo,
                  details: editingRule.details.map(detail => ({
                    id: detail.id,
                    countryRef: detail.countryRef || '',
                    currencyRef: detail.currencyRef || '',
                    travelRegion: detail.travelRegionRef || '',  // Use ID for form select
                    travelRegionRef: detail.travelRegionRef || '',
                    home: detail.home || false,
                    activeFrom: detail.activeFrom || editingRule.effectiveFrom,
                    activeTo: detail.activeTo || editingRule.effectiveTo,
                    amounts: [detail.amount]
                  }))
                }}
                onSave={handleEditSubmit}
                onCancel={handleModalCancel}
                isEditing={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TravelRegionRulesList; 