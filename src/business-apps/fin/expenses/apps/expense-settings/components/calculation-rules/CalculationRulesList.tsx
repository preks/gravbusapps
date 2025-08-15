import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Input, 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system';
import { 
  PiPlus, 
  PiFunnel, 
  PiArrowClockwise, 
  PiMagnifyingGlass
} from 'react-icons/pi';
import { ContextMenu, createEditAction, createDeleteAction } from '../ContextMenu';
import { CalculationRuleForm, CalculationRuleFormData } from '../../forms/calculation-rule-form';
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import { 
  ExpenseRule
} from '../../types/ExpenseRuleTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';



export interface CalculationRulesListProps extends BusinessAppContextProps {
  rules: ExpenseRule[];
  isLoading: boolean;
  onRefresh: () => void;
  onSearch: (params: { search?: string }) => Promise<void>;
  onNavigateToRule?: (ruleId: string, page?: string) => void;
}

const CalculationRulesList: React.FC<CalculationRulesListProps> = ({
  accessToken,
  rules,
  isLoading,
  onRefresh,
  onSearch,
  onNavigateToRule
}) => {
  // Simple toast implementation until design system provides one
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    const style = variant === 'destructive' ? 'color: red' : 'color: green';
    console.log(`%c${title}: ${description}`, style);
    // TODO: Replace with proper toast implementation when available in design system
  };
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal state management
  const [isCreateRuleModalVisible, setIsCreateRuleModalVisible] = useState(false);
  const [isEditRuleModalVisible, setIsEditRuleModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null);

  // Modal handlers
  const handleCreateRule = () => {
    setIsCreateRuleModalVisible(true);
  };

  const handleEditRule = (rule: ExpenseRule) => {
    setEditingRule(rule);
    setIsEditRuleModalVisible(true);
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ExpenseRule | null>(null);

  const handleDeleteRule = (rule: ExpenseRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    try {
      await expenseSettingsClient.deleteCalculationRule(ruleToDelete.id, ruleToDelete.version);
      toast({
        title: "Success",
        description: "Calculation rule deleted successfully"
      });
          await onRefresh();
        } catch (error) {
          console.error('Error deleting calculation rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete calculation rule",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  // Transform ExpenseRule to CalculationRuleFormData
  const transformRuleToFormData = (rule: ExpenseRule): CalculationRuleFormData => {
    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      standard: rule.standard,
      activeFrom: rule.activeFrom,
      activeTo: rule.activeTo,
      deductionLimit: rule.deductionLimit,
      useLastCountry: rule.useLastCountry,
      useSingleCurrency: rule.useSingleCurrency,
      taxesCode: rule.taxesCode,
      nonpayableCode: rule.nonpayableCode,
      advancePaymentCode: rule.advancePaymentCode,
      calculationTypeRef: rule.calculationType?.id,
      countryRef: rule.country?.id,
      currencyRef: rule.currency?.id,
      version: rule.version,
    };
  };

  const handleCreateRuleSubmit = async (_formData: CalculationRuleFormData) => {
    try {
      // TODO: Implement actual create API call
      toast({
        title: "Success",
        description: "Rule created successfully"
      });
      setIsCreateRuleModalVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error",
        description: "Failed to create rule",
        variant: "destructive"
      });
    }
  };

  const handleEditRuleSubmit = async (_formData: CalculationRuleFormData) => {
    try {
      // TODO: Implement actual update API call
      toast({
        title: "Success",
        description: "Rule updated successfully"
      });
      setIsEditRuleModalVisible(false);
      setEditingRule(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive"
      });
    }
  };

  const handleModalCancel = () => {
    setIsCreateRuleModalVisible(false);
    setIsEditRuleModalVisible(false);
    setEditingRule(null);
  };

  const handleSearch = (value: string) => {
    onSearch({ search: value.trim() || undefined });
  };

  const handleRowClick = (record: ExpenseRule) => {
    // Navigate to rule record if navigation function is provided
    if (onNavigateToRule) {
      onNavigateToRule(record.id, 'Rules');
    }
  };

  const renderRulesTable = () => {
      return (
      <div className="gba:w-full gba:overflow-x-auto">
        <Table className="gba:min-w-[900px] gba:table-fixed gba:text-sm">
        <TableHeader>
          <TableRow className="gba:h-10">
            <TableHead className="gba:w-[220px] gba:py-2 gba:px-3 gba:text-xs">RULE</TableHead>
            <TableHead className="gba:w-[140px] gba:py-2 gba:px-3 gba:text-xs">CALCULATION TYPE</TableHead>
            <TableHead className="gba:w-[100px] gba:py-2 gba:px-3 gba:text-xs">COUNTRY</TableHead>
            <TableHead className="gba:w-[90px] gba:py-2 gba:px-3 gba:text-xs">CURRENCY</TableHead>
            <TableHead className="gba:w-[80px] gba:py-2 gba:px-3 gba:text-xs">STANDARD</TableHead>
            <TableHead className="gba:w-[170px] gba:py-2 gba:px-3 gba:text-xs">ACTIVE PERIOD</TableHead>
            <TableHead className="gba:w-[70px] gba:py-2 gba:px-3 gba:text-xs">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
                        <TableRow 
              key={rule.id}
              className="gba:cursor-pointer hover:gba:bg-gray-50 gba:h-12"
              onClick={() => handleRowClick(rule)}
              data-testid={`calculation-rules-rule-row-${rule.id}`}
            >
              <TableCell className="gba:py-2 gba:px-3 gba:w-[220px]">
        <div>
                  <div className="gba:font-medium gba:text-gray-900 gba:text-sm gba:truncate gba:leading-tight" title={rule.name || '-'}>
                    {rule.name || '-'}
                </div>
                  <div className="gba:text-xs gba:text-gray-500 gba:truncate gba:leading-tight" title={rule.code}>
                    {rule.code}
              </div>
        </div>
              </TableCell>
              <TableCell className="gba:py-2 gba:px-3 gba:w-[140px]">
                <div className="gba:text-gray-900 gba:text-sm gba:truncate" title={rule.calculationType?.value || '-'}>
                  {rule.calculationType?.value || '-'}
          </div>
              </TableCell>
              <TableCell className="gba:py-2 gba:px-3 gba:w-[100px]">
                <div className="gba:text-gray-900 gba:text-sm gba:truncate" title={rule.country?.value || '-'}>
                  {rule.country?.value || '-'}
          </div>
              </TableCell>
              <TableCell className="gba:py-2 gba:px-3 gba:w-[90px]">
                <div className="gba:text-gray-900 gba:text-sm gba:truncate" title={rule.currency?.value || '-'}>
                  {rule.currency?.value || '-'}
          </div>
              </TableCell>
              <TableCell className="gba:py-2 gba:px-3 gba:w-[80px]">
                <Badge variant={rule.standard ? 'default' : 'secondary'} className="gba:text-xs gba:px-2 gba:py-0.5">
                  {rule.standard ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
              <TableCell className="gba:py-2 gba:px-3 gba:w-[170px]">
                {(() => {
        const now = new Date();
                  const activeFrom = new Date(rule.activeFrom);
                  const activeTo = rule.activeTo ? new Date(rule.activeTo) : null;
                  const isActive = activeFrom <= now && (!activeTo || activeTo >= now);
                  const timeFrame = `${dayjs(rule.activeFrom).format('DD/MM/YYYY')} - ${rule.activeTo ? dayjs(rule.activeTo).format('DD/MM/YYYY') : 'Ongoing'}`;
        
        return (
                    <div 
                      className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-center gba:truncate ${
                        isActive 
                          ? 'gba:bg-green-100 gba:text-green-800 gba:border gba:border-green-200' 
                          : 'gba:bg-gray-100 gba:text-gray-600 gba:border gba:border-gray-200'
                      }`}
                      title={`${timeFrame} (${isActive ? 'Active' : 'Inactive'})`}
                    >
                      {timeFrame}
          </div>
        );
                })()}
              </TableCell>
              <TableCell className="gba:py-2 gba:px-3 gba:w-[70px]">
                <div className="gba:flex gba:justify-center">
                  <ContextMenu
                    actions={[
                      createEditAction(() => handleEditRule(rule)),
                      createDeleteAction(() => handleDeleteRule(rule))
                    ]}
                    triggerTestId={`calculation-rules-actions-${rule.id}`}
          />
        </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
          </div>
        );
  };

  return (
    <div
      data-testid="calculation-rules-container"
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.title', 'Expense Rules')}
          </h2>
          <Badge variant="secondary">{rules.length} items</Badge>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
            onClick={handleCreateRule}
            data-testid="calculation-rules-create-rule-button"
          >
            <PiPlus className="gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createRule', 'Create Rule')}
            </Button>
          
              <Button 
            onClick={onRefresh}
            data-testid="calculation-rules-refresh-rules-button"
          >
            <PiArrowClockwise className="gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="gba:relative gba:max-w-sm">
          <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-gray-400 gba:h-4 gba:w-4" />
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.search.rules.placeholder', 'Search rules by code, type, country...')}
            className="gba:pl-10"
            onChange={(e) => handleSearch(e.target.value)}
            data-testid="calculation-rules-search-rules-input"
          />
        </div>
        <Button 
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="calculation-rules-filter-rules-button"
        >
          <PiFunnel className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('common.filters', 'Filters')}
        </Button>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.description', 'Manage calculation rules that define how expenses are processed and validated.')}
        </p>
      </div>

      {/* Rules Table */}
      <div className="gba:border gba:rounded-md">
        {isLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:p-8">
            <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600"></div>
            </div>
        ) : (
          renderRulesTable()
        )}
        {/* Pagination for rules */}
        {rules.length > 20 && (
          <div className="gba:p-4 gba:border-t gba:text-center gba:text-sm gba:text-gray-500">
            Showing {Math.min(20, rules.length)} of {rules.length} rules
            </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="calculation-rules-delete-confirmation-dialog">
          <DialogHeader>
            <DialogTitle>Delete Calculation Rule</DialogTitle>
          </DialogHeader>
          <div className="gba:py-4">
            <p className="gba:text-sm gba:text-gray-600">
              Are you sure you want to delete the calculation rule "{ruleToDelete?.code}"
              {ruleToDelete?.name ? ` - ${ruleToDelete.name}` : ''}? This action cannot be undone.
            </p>
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRule}>
              Delete
            </Button>
      </div>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateRuleModalVisible} onOpenChange={setIsCreateRuleModalVisible}>
        <DialogContent className="gba:max-w-4xl" data-testid="calculation-rules-create-rule-dialog">
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createRule.title', 'Create Calculation Rule')}</DialogTitle>
          </DialogHeader>
        <CalculationRuleForm
          accessToken={accessToken}
          onSave={handleCreateRuleSubmit}
          onCancel={handleModalCancel}
          isEditing={false}
        />
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={isEditRuleModalVisible} onOpenChange={setIsEditRuleModalVisible}>
        <DialogContent className="gba:max-w-4xl" data-testid="calculation-rules-edit-rule-dialog">
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editRule.title', 'Edit Calculation Rule')}</DialogTitle>
          </DialogHeader>
        {editingRule && (
          <CalculationRuleForm
            accessToken={accessToken}
            onSave={handleEditRuleSubmit}
            onCancel={handleModalCancel}
            isEditing={true}
            initialData={transformRuleToFormData(editingRule)}
          />
        )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalculationRulesList; 