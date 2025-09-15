import React, { useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { DataControllerProps } from '@/components/dataController/DataController';
import { formatDate, getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { env } from '@/common/env/EnvUtils';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Card, CardContent, Spinner, Alert, Button, Dialog, DialogContent, DialogHeader } from '@newwork/nw-design-system';
import { useExpenseCalculationRules } from './hooks/useExpenseCalculationRules';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@newwork/nw-design-system';
import StandardIcon from './components/StandardIcon';
import StandardFilter from './components/filters/StandardFilter';
import ValidityPeriodFilter from './components/filters/ValidityPeriodFilter';
import CalculationFilter from './components/filters/CalculationFilter';
import { ListBulletsIcon, SortAscendingIcon, SortDescendingIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { EXPENSE_CALCULATION_RULES_FLOW_ACTIONS } from './constants/flowActions';
import FlowActionsButton from './components/FlowActionsButton';
import { CreateCalculationRuleForm } from '@/business-apps/fin/expenses/forms/create-calculation-rule';
import { GET_EXPENSE_RULE_FLAGS } from './queries/ExpenseCalculationRules.queries';

interface ExpenseCalculationRulesProps extends BusinessAppContextProps {}

const PREFIX = 'expense-calculation-rules';

const ExpenseCalculationRules: React.FC<ExpenseCalculationRulesProps> = (props) => {
  const {
    items,
    totalCount,
    isLoading,
    error,
    calculationTypes,
    reload,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setValidityRange,
    setStandard,
    setSelectedCalculationCodes,
    currentPage,
    pageSize,
    search,
    sortField,
    sortOrder,
    validityFrom,
    validityTo,
    standard,
    selectedCalculationCodes,
  } = useExpenseCalculationRules(props);

  // use hook as single source of truth for search; controller will update it directly


  const handleEnhancedTableChange = useCallback((pagination: { current: number; pageSize: number; }, _filters?: any, _sorter?: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, [setPage, setPageSize]);

  const [flowModalOpen, setFlowModalOpen] = React.useState<boolean>(false);
  const [selectedRow, setSelectedRow] = React.useState<any | null>(null);
  const openCalculationRuleModal = useCallback(() => setFlowModalOpen(true), []);
  const graphqlClient = useGraphqlClient(props.accessToken);
  const handleHeaderSort = useCallback((field: string) => {
    let next: 'ASC' | 'DESC' | '' = 'ASC';
    if (sortField === field) {
      if (sortOrder === 'ASC') next = 'DESC';
      else if (sortOrder === 'DESC') next = '';
      else next = 'ASC';
    }
    setSort(field, next);
  }, [sortField, sortOrder, setSort]);

  const flowIconUrl = useMemo(() => {
    const base = env('NEXT_PUBLIC_BASE_URL') || '';
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`;
  }, []);

  const buildRuleDetailsUrl = useCallback((row: any): string => {
    const base = env('NEXT_PUBLIC_BASE_URL') || '';
    const path = '/platform/landing_screen/srn_expenseCalculationRuleDetailsV2';

    const params: [string, any][] = [
      ['code', row?.code ?? ''],
      ['name', row?.name ?? ''],
      ['calculation', getCatalogValue(row?.calculationType) ?? ''],
      ['activeFrom', row?.activeFrom ?? ''],
      ['activeTo', row?.activeTo ?? ''],
      ['standard', String(!!row?.standard)],
      ['currency', row?.currency?.code ?? ''],
      ['id', row?.id ?? ''],
      ['version', String(row?.version ?? '')],
      ['deductionLimit', String(!!row?.deductionLimit)],
      ['taxesCode', row?.taxesCode ?? ''],
      ['useLastCountry', String(!!row?.useLastCountry)],
      ['nonpayableCode', row?.nonpayableCode ?? ''],
      ['advancePaymentCode', row?.advancePaymentCode ?? ''],
      ['ruleFlagId', JSON.stringify(row?.ruleFlagId ?? [])],
      ['countryRef', row?.countryRef ?? ''],
      ['useSingleCurrency', String(!!row?.useSingleCurrency)],
    ];

    const query = params
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

    return `${base}${path}?${query}`;
  }, []);

  const handleRowClick = useCallback(async (row: any) => {
    try {
      const res = await graphqlClient.request<any>(GET_EXPENSE_RULE_FLAGS, { id: row.id });
      const flagIds = (res?.ExpenseRuleFlag || []).map((f:any) => f?.expenseRuleId);
      const url = buildRuleDetailsUrl({ ...row, ruleFlagId: flagIds });
      window.location.href = url;
    } catch (_e) {
      const url = buildRuleDetailsUrl({ ...row, ruleFlagId: [] });
      window.location.href = url;
    }
  }, [graphqlClient, GET_EXPENSE_RULE_FLAGS, buildRuleDetailsUrl]);

  const columns = useMemo(() => ([
    { key: 'actions', title: '', width: '60px' },
    { key: 'code', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Code') },
    { key: 'name', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.name', 'Name') },
    { key: 'calculation', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.calculation', 'Calculation') },
    { key: 'activeFrom', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.valid_from', 'Valid From') },
    { key: 'activeTo', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.valid_to', 'Valid To') },
    { key: 'standard', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.standard', 'Standard') },
    { key: 'currency', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.currency', 'Currency') },
  ]), []);

  const [standardSelection, setStandardSelection] = React.useState<{ true: boolean; false: boolean }>({ true: false, false: false });
  React.useEffect(() => {
    if (standardSelection.true && !standardSelection.false) setStandard(true);
    else if (!standardSelection.true && standardSelection.false) setStandard(false);
    else setStandard(null);
  }, [standardSelection, setStandard]);

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'validity-period',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.validity_title', 'Filter by Validity Period'),
        customComponent: (
          <ValidityPeriodFilter from={validityFrom} to={validityTo} onChange={setValidityRange} data-testid={`${PREFIX}-validity-filter`} />
        ),
      },
      {
        id: 'standard',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.standard_filter', 'Filter by Standard'),
        customComponent: (
          <StandardFilter value={standardSelection} onChange={setStandardSelection} data-testid={`${PREFIX}-standard-filter`} />
        ),
      },
      {
        id: 'calculation',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.calculation_filter', 'Filter by Calculation'),
        customComponent: (
          <CalculationFilter options={calculationTypes as any} selectedCodes={selectedCalculationCodes} onChange={setSelectedCalculationCodes} data-testid={`${PREFIX}-calculation-filter`} />
        ),
      },
    ];
  }, [calculationTypes, selectedCalculationCodes, setSelectedCalculationCodes, setValidityRange, validityFrom, validityTo, setStandard, standard]);

  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_title', 'Expense Calculation Rules'),
    listAmount: totalCount,
    search: search,
    setSearch: (val: string) => { setSearch(val); },
    debounceDelay: 0,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <FlowActionsButton
        actions={EXPENSE_CALCULATION_RULES_FLOW_ACTIONS}
        onAction={(action) => {
          if (action.modalKey === 'openCalculationRuleModal') openCalculationRuleModal();
          if (action.link) window.location.href = action.link;
        }}
        dataTestId={PREFIX}
      />
    ),
  } as any;

  return (
    <div data-testid={`${PREFIX}-app`} className="gba:p-6">
      <DataContainer
        dataControllerProps={dataControllerProps}
        dataFilterProps={{ filterGroups }}
        dataBody={(
          <div className="gba:pr-6 gba:overflow-hidden" data-testid={`${PREFIX}-body`}>
            <Card>
              <CardContent className="gba:p-0">
                {isLoading && (
                  <div className="gba:flex gba:justify-center gba:p-4"><Spinner data-testid={`${PREFIX}-loading`} /></div>
                )}
                {error && (
                  <div className="gba:p-4">
                    <Alert variant="destructive" data-testid={`${PREFIX}-error`}>
                      {error}
                      <div className="gba:mt-2">
                        <Button size="sm" onClick={reload} data-testid={`${PREFIX}-retry-button`}>Retry</Button>
                      </div>
                    </Alert>
                  </div>
                )}
                <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-full">
                  <Table data-testid={`${PREFIX}-table`} className="gba:min-w-[1100px] gba:w-full">
                    <TableHeader>
                      <TableRow className="gba:border-b gba:bg-gray-50">
                        {columns.map((col) => (
                          <TableHead
                            key={col.key}
                            className={`gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 ${col.key === 'actions' ? 'gba:w-[60px]' : ''}`}
                            data-testid={`${PREFIX}-header-${col.key}`}
                          >
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:whitespace-nowrap">{col.title}</span>
                              {col.key !== 'actions' && (
                                <button
                                  type="button"
                                  className={`gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 ${sortField === col.key ? 'gba:text-black' : 'gba:text-gray-400'} gba:cursor-pointer hover:gba:text-black`}
                                  onClick={() => handleHeaderSort(col.key)}
                                  data-testid={`${PREFIX}-sort-${col.key}`}
                                  title="Sort"
                                >
                                  {sortField === col.key ? (sortOrder === 'ASC' ? <SortAscendingIcon size={16} /> : sortOrder === 'DESC' ? <SortDescendingIcon size={16} /> : <ListBulletsIcon size={16} />) : <ListBulletsIcon size={16} />}
                                </button>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!isLoading && items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="gba:py-8 gba:text-center">
                            <div className="gba:text-gray-500" data-testid={`${PREFIX}-empty`}>
                              {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data found')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((row) => (
                          <TableRow
                            key={row.id}
                            data-testid={`${PREFIX}-row-${row.id}`}
                            className="gba:cursor-pointer"
                            onClick={() => { handleRowClick(row as any); }}
                          >
                            <TableCell className="gba:py-3 gba:px-3" data-testid={`${PREFIX}-cell-actions-${row.id}`}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="gba:w-8 gba:h-8 gba:rounded"
                                data-testid={`${PREFIX}-actions-button-${row.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRow(row as any);
                                  setFlowModalOpen(true);
                                }}
                              >
                                <img src={flowIconUrl} alt="Actions" className="gba:w-5 gba:h-5" />
                              </Button>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-code-${row.id}`}>{row.code || getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.not_available', 'N/A')}</TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-name-${row.id}`}>{row.name || getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.not_available', 'N/A')}</TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-calculation-${row.id}`}>{getCatalogValue(row.calculationType) || getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.not_available', 'N/A')}</TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-from-${row.id}`}>{formatDate(row.activeFrom || '','date.long') || getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.not_available', 'N/A')}</TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-to-${row.id}`}>{formatDate(row.activeTo || '','date.long') || getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.not_available', 'N/A')}</TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-standard-${row.id}`}>
                              <StandardIcon value={row.standard ?? false} data-testid={`${PREFIX}-standard-icon-${row.id}`} />
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-currency-${row.id}`}>{row?.currency?.code || getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.not_available', 'N/A')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalCount > 0 && (
                  <div className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4" data-testid={`${PREFIX}-pagination`}>
                    <div className="gba:text-sm gba:text-gray-600" data-testid={`${PREFIX}-pagination-info`}>
                      {(() => {
                        const start = Math.max(0, (currentPage - 1) * pageSize) + 1;
                        const end = Math.min(currentPage * pageSize, totalCount);
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.pagination',
                          `${start}-${end} of ${totalCount}`,
                          {
                            range0:start, range1: end, total: totalCount,
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
                            onClick={() => handleEnhancedTableChange({ current: currentPage - 1, pageSize }, {}, {})}
                            data-testid={`${PREFIX}-pagination-prev`}
                          >
                            <CaretLeftIcon className="gba:h-4 gba:w-4" />
                            <span>{getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.previous', 'Previous')}</span>
                          </PaginationLink>
                        </PaginationItem>
                        {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                          .filter(page => page === 1 || page === Math.ceil(totalCount / pageSize) || Math.abs(page - currentPage) <= 1)
                          .map((page, index, array) => (
                            <React.Fragment key={page}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <PaginationItem>
                                  <span className="gba:px-2">...</span>
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => handleEnhancedTableChange({ current: page, pageSize }, {}, {})}
                                  className={page === currentPage ? 'gba:bg-blue-500 gba:text-white' : 'gba:cursor-pointer'}
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
                            className={`gba:gap-1 gba:pr-2.5 ${currentPage >= Math.ceil(totalCount / pageSize) ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                            onClick={() => handleEnhancedTableChange({ current: currentPage + 1, pageSize }, {}, {})}
                            data-testid={`${PREFIX}-pagination-next`}
                          >
                            <span>{getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.submit_button', 'Next')}</span>
                            <CaretRightIcon className="gba:h-4 gba:w-4" />
                          </PaginationLink>
                        </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${PREFIX}-page-size-selector`}>
                        <span className="gba:text-sm gba:text-gray-600">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.items_per_page', 'Items per page')}
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(val) => handleEnhancedTableChange({ current: 1, pageSize: Number(val) }, {}, {})}
                        >
                          <SelectTrigger className="gba:w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10,20,50].map(size => (
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

            {/* Create Calculation Rule Modal */}
            <Dialog open={flowModalOpen} onOpenChange={setFlowModalOpen}>
            <DialogContent data-testid={`${PREFIX}-create-modal`} 
            className="gba:h-[100vh] gba:max-h-[100vh] gba:flex gba:flex-col gba:px-[40px] gba:w-[100%] gba:overflow-hidden">
              <DialogHeader />
                <div className="gba:flex-1 gba:overflow-y-auto gba:pr-2">
                  <CreateCalculationRuleForm
                    accessToken={props.accessToken}
                    additionalData={{ nvi_navigationPayload: selectedRow || {} }}
                    onCancel={() => setFlowModalOpen(false)}
                    onCreate={() => setFlowModalOpen(false)}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      />
    </div>
  );
};

export default ExpenseCalculationRules;


