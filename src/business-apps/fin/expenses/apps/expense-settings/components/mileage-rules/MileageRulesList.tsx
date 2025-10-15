import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Card,
  CardContent,
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { env } from '@/common/env/EnvUtils';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { DataControllerProps } from '@/components/dataController/DataController';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { ICONS } from '@/business-apps/fin/expenses/utils/icons';
import { useMileageRulesIntegration, EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration';
import { useExpenseSettingsIntegration } from '../../hooks/useExpenseSettingsIntegration';
import { MileageRuleForm, MileageRuleFormData } from '../../forms/mileage-rule-form';
import MileageRuleDetails from './MileageRuleDetails';
import TimePeriodFilter from './filters/TimePeriodFilter';
import { RuleCodeFilter } from './filters/RuleCodeFilter';
import { NameFilter } from './filters/NameFilter';
import RulePeriodFilter from './filters/RulePeriodFilter';
import { MileageRulePeriod } from '../../types/ExpenseEnums';
import { 
  PiPlus,
  PiEye,
  PiPencil
} from 'react-icons/pi';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

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

const PREFIX = 'mileage-rules';

const MileageRulesList: React.FC<MileageRulesListProps> = ({
  prefixDataTestId = '',
  accessToken,
  ...context
}) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const isInitialMount = useRef(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState({ active: false, inactive: false });
  const [validFromFilter, setValidFromFilter] = useState<string | null>(null);
  const [validToFilter, setValidToFilter] = useState<string | null>(null);
  const [ruleCodeFilter, setRuleCodeFilter] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState<string[]>([]);
  const [rulePeriodFilter, setRulePeriodFilter] = useState<Record<MileageRulePeriod, boolean>>({
    [MileageRulePeriod.YEARLY]: false,
    [MileageRulePeriod.TRIP]: false,
    [MileageRulePeriod.TOTAL]: false
  });
  
  // Modal state management
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<EnhancedMileageRule | null>(null);

  // Drawer state management
  const [isDetailsDrawerVisible, setIsDetailsDrawerVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<EnhancedMileageRule | null>(null);

  // Flow icon URL
  const flowIconUrl = useMemo(() => {
    const base = env('NEXT_PUBLIC_BASE_URL') || '';
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`;
  }, []);

  // Modal handlers
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
      refetch({});
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
      refetch({});
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
    refetch,
    refetchWithFilters
  } = useMileageRulesIntegration({ ...context, accessToken });

  // Use the API integration hook for CRUD operations
  const { 
    createMileageRule, 
    updateMileageRule 
  } = useExpenseSettingsIntegration({ ...context, accessToken });

  // Handle search with debounced effect
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) return;
    
    const timeoutId = setTimeout(() => {
      // Convert rulePeriodFilter object to array of selected periods
      const selectedPeriods = Object.entries(rulePeriodFilter)
        .filter(([_, isSelected]) => isSelected)
        .map(([period, _]) => period);

      // Always call refetchWithFilters, passing search term (empty or not)
      refetchWithFilters({
        statusFilter,
        validFromFilter,
        validToFilter,
        ruleCodeFilter,
        nameFilter,
        rulePeriodFilter: selectedPeriods,
        search: search || undefined // Pass search term or undefined if empty
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, statusFilter, validFromFilter, validToFilter, ruleCodeFilter, nameFilter, rulePeriodFilter, refetchWithFilters]);

  // Trigger server-side filtering when filters change (not search - search has its own useEffect)
  useEffect(() => {
    // Skip on initial mount to avoid duplicate query
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // Trigger initial load with default filters
      refetchWithFilters({
        statusFilter,
        validFromFilter,
        validToFilter,
        ruleCodeFilter,
        nameFilter,
        rulePeriodFilter: [],
        search: undefined // No search on initial load
      });
      return;
    }

    // Convert rulePeriodFilter object to array of selected periods
    const selectedPeriods = Object.entries(rulePeriodFilter)
      .filter(([_, isSelected]) => isSelected)
      .map(([period, _]) => period);

    refetchWithFilters({
      statusFilter,
      validFromFilter,
      validToFilter,
      ruleCodeFilter,
      nameFilter,
      rulePeriodFilter: selectedPeriods,
      search: search || undefined // Include current search term
    });
  }, [statusFilter, validFromFilter, validToFilter, ruleCodeFilter, nameFilter, rulePeriodFilter]);

  // No client-side filtering - data comes filtered from GraphQL
  const filteredData = mileageRules;

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, validFromFilter, validToFilter, ruleCodeFilter, nameFilter, rulePeriodFilter]);

  const resetFilters = () => {
    setStatusFilter({ active: false, inactive: false });
    setValidFromFilter(null);
    setValidToFilter(null);
    setRuleCodeFilter([]);
    setNameFilter([]);
    setRulePeriodFilter({
      [MileageRulePeriod.YEARLY]: false,
      [MileageRulePeriod.TRIP]: false,
      [MileageRulePeriod.TOTAL]: false
    });
  };

  // Filter groups
  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'time-period',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.timePeriod', 'Filter by Time Period'),
        customComponent: (
          <TimePeriodFilter
            validFrom={validFromFilter}
            validTo={validToFilter}
            onValidFromChange={setValidFromFilter}
            onValidToChange={setValidToFilter}
            prefixDataTestId={`${PREFIX}-time-period-filter`}
          />
        )
      },
      {
        id: 'rule-code',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.ruleCode', 'Filter by Rule Code'),
        customComponent: (
          <RuleCodeFilter
            value={ruleCodeFilter}
            onChange={setRuleCodeFilter}
            prefixDataTestId={`${PREFIX}-rule-code-filter`}
            {...context}
            accessToken={accessToken}
          />
        )
      },
      {
        id: 'name',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.name', 'Filter by Name'),
        customComponent: (
          <NameFilter
            value={nameFilter}
            onChange={setNameFilter}
            prefixDataTestId={`${PREFIX}-name-filter`}
            {...context}
            accessToken={accessToken}
          />
        )
      },
      {
        id: 'rule-period',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.rulePeriod', 'Filter by Rule Period'),
        customComponent: (
          <RulePeriodFilter
            selectedPeriods={rulePeriodFilter}
            onChange={setRulePeriodFilter}
            prefixDataTestId={`${PREFIX}-rule-period-filter`}
          />
        )
      }
    ];
  }, [validFromFilter, validToFilter, ruleCodeFilter, nameFilter, rulePeriodFilter]);

  // Data controller props
  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.title', 'Mileage Rules'),
    listAmount: filteredData.length,
    search,
    setSearch,
    debounceDelay: 300,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <Button onClick={() => setIsCreateModalVisible(true)} data-testid={`${PREFIX}-create-button`}>
        <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('expenseSettings.mileageRules.addRate', 'Add Rate')}
      </Button>
    )
  } as any;

  return (
    <div data-testid={`${PREFIX}-app`} className="gba:p-6">
      <DataContainer
        dataControllerProps={dataControllerProps}
        dataFilterProps={{
          filterGroups,
          children: (
            <div className="gba:w-[100%] gba:mt-auto gba:pb-3" data-testid={`${PREFIX}-reset-filters-container`}>
              <button
                type="button"
                className="gba:flex gba:items-center gba:gap-2 gba:w-[100%] gba:px-3 gba:py-2 gba:border gba:rounded gba:text-sm"
                onClick={resetFilters}
                data-testid={`${PREFIX}-reset-filters-button`}
              >
                <img src={ICONS.DELETE_CIRCLE_ICON} alt="reset" className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('common.resetFilters', 'Reset Filters')}
              </button>
            </div>
          )
        }}
        dataBody={
          <div className="gba:pr-6 gba:overflow-hidden" data-testid={`${PREFIX}-body`}>
            <Card>
              <CardContent className="gba:p-0">
                {isLoading && (
                  <div className="gba:flex gba:justify-center gba:p-4">
                    <Spinner data-testid={`${PREFIX}-loading`} />
                  </div>
                )}
                {error && (
                  <div className="gba:p-4">
                    <Alert variant="destructive" data-testid={`${PREFIX}-error`}>
                      {error}
                      <div className="gba:mt-2">
                        <Button size="sm" onClick={() => refetch()} data-testid={`${PREFIX}-retry-button`}>
                          Retry
                        </Button>
                      </div>
                    </Alert>
                  </div>
                )}
                {!isLoading && !error && filteredData.length === 0 && (
                  <div className="gba:p-8 gba:text-center">
                    <div className="gba:text-gray-500" data-testid={`${PREFIX}-empty`}>
                      {getTranslationFromI18nKeyAndLabel('common.noDataFound', 'No data found')}
                    </div>
                  </div>
                )}
                {!isLoading && !error && filteredData.length > 0 && (
                  <>
                    <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-[100%]">
                      <Table data-testid={`${PREFIX}-table`} className="gba:min-w-[1100px] gba:w-[100%]">
                        <TableHeader>
                          <TableRow className="gba:border-b gba:bg-gray-50">
                            <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap"></span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">CODE</span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">NAME</span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">RULE PERIOD</span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">VALID FROM</span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">VALID TO</span>
                            </TableHead>
                            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                              <span className="gba:whitespace-nowrap">ORDER</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((record, index) => (
                          <TableRow 
                            key={record.id}
                            className="gba:border-b hover:gba:bg-gray-50 gba:cursor-pointer"
                            onClick={() => handleViewRuleDetails(record)}
                            data-testid={`${PREFIX}-mileage-rule-row-${record.id}`}
                          >
                            <TableCell className="gba:py-3 gba:px-3" data-testid={`${PREFIX}-cell-actions-${index}`}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="gba:w-8 gba:h-8 gba:rounded"
                                    data-testid={`${PREFIX}-actions-button-${index}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <img src={flowIconUrl} alt="Actions" className="gba:w-5 gba:h-5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="gba:p-0 gba:w-auto" onClick={(e) => e.stopPropagation()}>
                                  <div className="gba:flex gba:flex-col">
                                    <Button
                                      variant="ghost"
                                      className="gba:px-4 gba:py-2 gba:text-left gba:justify-start gba:text-[14px]"
                                      data-testid={`${PREFIX}-action-view-${index}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewRuleDetails(record);
                                      }}
                                    >
                                      <PiEye className="gba:mr-2 gba:h-4 gba:w-4" />
                                      {getTranslationFromI18nKeyAndLabel('common.view', 'View')}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="gba:px-4 gba:py-2 gba:text-left gba:justify-start gba:text-[14px]"
                                      data-testid={`${PREFIX}-action-edit-${index}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditRule(record);
                                      }}
                                    >
                                      <PiPencil className="gba:mr-2 gba:h-4 gba:w-4" />
                                      {getTranslationFromI18nKeyAndLabel('common.edit', 'Edit')}
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-code-${index}`}>
                              <div className="gba:font-mono gba:font-medium gba:text-sm gba:text-blue-600" title={record.code}>
                                {record.code}
                              </div>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-name-${index}`}>
                              <span className="gba:text-sm" title={record.name}>
                                {record.name}
                              </span>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-period-${index}`}>
                              <Badge variant="default">
                                {record.rulePeriodLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-valid-from-${index}`}>
                              <span className="gba:text-sm">{record.validFrom}</span>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-valid-to-${index}`}>
                              <span className="gba:text-sm">{record.validTo}</span>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-order-${index}`}>
                              <span className="gba:text-sm">{record.ruleOrder}</span>
                            </TableCell>
                          </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
                {/* Pagination */}
                {filteredData.length > 0 && (
                  <div
                    className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4"
                    data-testid={`${PREFIX}-pagination`}
                  >
                    <div className="gba:text-sm gba:text-gray-600" data-testid={`${PREFIX}-pagination-info`}>
                      {(() => {
                        const start = (currentPage - 1) * pageSize + 1;
                        const end = Math.min(currentPage * pageSize, filteredData.length);
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.pagination',
                          `${start}-${end} of ${filteredData.length}`,
                          {
                            range0: start,
                            range1: end,
                            total: filteredData.length,
                            interpolation: {
                              escapeValue: false
                            }
                          }
                        );
                      })()}
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:w-[100%]">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationLink
                              aria-label="Go to previous page"
                              size="default"
                              className={`gba:gap-1 gba:pl-2.5 ${currentPage <= 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                              onClick={() => setCurrentPage(currentPage - 1)}
                              data-testid={`${PREFIX}-pagination-prev`}
                            >
                              <CaretLeftIcon className="gba:h-4 gba:w-4" />
                              <span>
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:acknowledge_sick_leave.previous',
                                  'Previous'
                                )}
                              </span>
                            </PaginationLink>
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                              page =>
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                            )
                            .map((page, index, array) => (
                              <React.Fragment key={page}>
                                {index > 0 && array[index - 1] !== page - 1 && (
                                  <PaginationItem>
                                    <span className="gba:px-2">...</span>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    className={
                                      page === currentPage ? 'gba:bg-blue-500 gba:text-white' : 'gba:cursor-pointer'
                                    }
                                    data-testid={`${PREFIX}-pagination-page-${page}`}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            ))}
                          <PaginationItem>
                            <PaginationLink
                              aria-label="Go to next page"
                              size="default"
                              className={`gba:gap-1 gba:pr-2.5 ${currentPage >= totalPages ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                              onClick={() => setCurrentPage(currentPage + 1)}
                              data-testid={`${PREFIX}-pagination-next`}
                            >
                              <span>
                                {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.submit_button', 'Next')}
                              </span>
                              <CaretRightIcon className="gba:h-4 gba:w-4" />
                            </PaginationLink>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${PREFIX}-page-size-selector`}>
                        <span className="gba:text-sm gba:text-gray-600">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.items_per_page',
                            'Items per page'
                          )}
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={val => {
                            setPageSize(Number(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="gba:w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50].map(size => (
                              <SelectItem key={size} value={String(size)} data-testid={`${PREFIX}-page-size-${size}`}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        }
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