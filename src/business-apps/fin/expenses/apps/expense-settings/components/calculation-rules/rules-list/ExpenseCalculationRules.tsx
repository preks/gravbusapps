import React, { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { DataControllerProps } from '@/components/dataController/DataController'
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDate as formatDateSafe } from '../../../utils/dateUtils'
import { env } from '@/common/env/EnvUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  Spinner,
  Alert,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon, PencilIcon, TrashIcon, PlusIcon } from '@phosphor-icons/react'
import { useExpenseCalculationRules } from './hooks/useExpenseCalculationRules'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import StandardIcon from './components/StandardIcon'
import StandardFilter from './components/filters/StandardFilter'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import ValidityPeriodFilter from './components/filters/ValidityPeriodFilter'
import CalculationFilter from './components/filters/CalculationFilter'
import {
  ListBulletsIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  CaretLeftIcon,
  CaretRightIcon
} from '@phosphor-icons/react'
import CreateRuleDialog from './components/CreateRuleDialog'
import DeleteRuleDialog from './components/DeleteRuleDialog'
import { GET_EXPENSE_RULE_FLAGS } from './queries/ExpenseCalculationRules.queries'
import { useRestClient } from '@/common/network/rest/useRestClient'

interface ExpenseCalculationRulesProps extends BusinessAppContextProps {
  onRuleSelect?: (ruleId: string) => void
}

const PREFIX = 'expense-calculation-rules'

const ExpenseCalculationRules: React.FC<ExpenseCalculationRulesProps> = ({ onRuleSelect, ...props }) => {
  const {
    items,
    totalCount,
    isLoading,
    error,
    calculationTypes,
    formCatalogs,
    usedRuleIds,
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
    selectedCalculationCodes
  } = useExpenseCalculationRules(props)

  const handleEnhancedTableChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      setPage(pagination.current)
      setPageSize(pagination.pageSize)
    },
    [setPage, setPageSize]
  )

  const [flowModalOpen, setFlowModalOpen] = React.useState<boolean>(false)
  const [selectedRow, setSelectedRow] = React.useState<any | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState<boolean>(false)
  const [deleteBlocked, setDeleteBlocked] = React.useState<boolean>(false)
  const openCalculationRuleModal = useCallback(() => {
    setSelectedRow(null)
    setFlowModalOpen(true)
  }, [])
  const graphqlClient = useGraphqlClient(props.accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const handleHeaderSort = useCallback(
    (field: string) => {
      let next: 'ASC' | 'DESC' | '' = 'ASC'
      if (sortField === field) {
        if (sortOrder === 'ASC') next = 'DESC'
        else if (sortOrder === 'DESC') next = ''
        else next = 'ASC'
      }
      setSort(field, next)
    },
    [sortField, sortOrder, setSort]
  )

  const buildRuleDetailsUrl = useCallback((row: any): string => {
    const base = env('NEXT_PUBLIC_BASE_URL') || ''
    const path = '/platform/landing_screen/srn_expenseCalculationRuleDetailsV2'

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
      ['useSingleCurrency', String(!!row?.useSingleCurrency)]
    ]

    const query = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')

    return `${base}${path}?${query}`
  }, [])

  const handleRowClick = useCallback(
    async (row: any) => {
      // If onRuleSelect callback is provided, use it instead of redirecting
      if (onRuleSelect) {
        onRuleSelect(row.id)
        return
      }

      // Fallback to old redirect behavior for backwards compatibility
      try {
        const res = await graphqlClient.request<any>(GET_EXPENSE_RULE_FLAGS, { id: row.id })
        const flagIds = (res?.ExpenseRuleFlag || []).map((f: any) => f?.expenseRuleId)
        const url = buildRuleDetailsUrl({ ...row, ruleFlagId: flagIds })
        window.location.href = url
      } catch {
        const url = buildRuleDetailsUrl({ ...row, ruleFlagId: [] })
        window.location.href = url
      }
    },
    [onRuleSelect, graphqlClient, GET_EXPENSE_RULE_FLAGS, buildRuleDetailsUrl]
  )

  const columns = useMemo(
    () => [
      { key: 'actions', title: '', width: '60px' },
      {
        key: 'code',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Code')
      },
      {
        key: 'name',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.name', 'Name')
      },
      {
        key: 'calculation',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_table.calculation',
          'Calculation'
        )
      },
      {
        key: 'activeFrom',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_table.valid_from',
          'Valid From'
        )
      },
      {
        key: 'activeTo',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.valid_to', 'Valid To')
      },
      {
        key: 'standard',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.standard', 'Standard')
      },
      {
        key: 'currency',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.currency', 'Currency')
      }
    ],
    []
  )

  const [standardSelection, setStandardSelection] = React.useState<{ true: boolean; false: boolean }>({
    true: false,
    false: false
  })
  React.useEffect(() => {
    if (standardSelection.true && !standardSelection.false) setStandard(true)
    else if (!standardSelection.true && standardSelection.false) setStandard(false)
    else setStandard(null)
  }, [standardSelection, setStandard])

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'validity-period',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.validity_title',
          'Filter by Validity Period'
        ),
        customComponent: (
          <ValidityPeriodFilter
            from={validityFrom}
            to={validityTo}
            onChange={setValidityRange}
            data-testid={`${PREFIX}-validity-filter`}
          />
        )
      },
      {
        id: 'standard',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.employee_report_filter.standard_filter',
          'Filter by Standard'
        ),
        customComponent: (
          <StandardFilter
            value={standardSelection}
            onChange={setStandardSelection}
            data-testid={`${PREFIX}-standard-filter`}
          />
        )
      },
      {
        id: 'calculation',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.employee_report_filter.calculation_filter',
          'Filter by Calculation'
        ),
        customComponent: (
          <CalculationFilter
            options={calculationTypes as any}
            selectedCodes={selectedCalculationCodes}
            onChange={setSelectedCalculationCodes}
            data-testid={`${PREFIX}-calculation-filter`}
          />
        )
      }
    ]
  }, [
    calculationTypes,
    selectedCalculationCodes,
    setSelectedCalculationCodes,
    setValidityRange,
    validityFrom,
    validityTo,
    setStandard,
    standard
  ])

  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_calculation_rule.expense_title',
      'Expense Calculation Rules'
    ),
    listAmount: totalCount,
    search: search,
    setSearch: (val: string) => {
      setSearch(val)
    },
    debounceDelay: 0,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <Button onClick={openCalculationRuleModal} data-testid={`${PREFIX}-create-button`}>
        <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.flow_button', 'Create Calculation Rule')}
      </Button>
    )
  } as any
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
                onClick={() => {
                  setValidityRange(null as any, null as any)
                  setSelectedCalculationCodes([])
                  setStandardSelection({ true: false, false: false })
                }}
                data-testid={`${PREFIX}-reset-filters-button`}
              >
                <img src={ICONS.DELETE_CIRCLE_ICON} alt="reset" className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.reset_filters_btn',
                  'Reset Filters'
                )}
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
                        <Button size="sm" onClick={reload} data-testid={`${PREFIX}-retry-button`}>
                          Retry
                        </Button>
                      </div>
                    </Alert>
                  </div>
                )}
                <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-[100%]">
                  <Table data-testid={`${PREFIX}-table`} className="gba:min-w-[1100px] gba:w-[100%]">
                    <TableHeader>
                      <TableRow className="gba:border-b gba:bg-gray-50">
                        {columns.map(col => (
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
                                  className={`gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 ${sortField === col.key ? 'gba:text-black' : 'gba:text-gray-400'} gba:cursor-pointer gba:hover:text-black`}
                                  onClick={() => handleHeaderSort(col.key)}
                                  data-testid={`${PREFIX}-sort-${col.key}`}
                                  title="Sort"
                                >
                                  {sortField === col.key ? (
                                    sortOrder === 'ASC' ? (
                                      <SortAscendingIcon size={16} />
                                    ) : sortOrder === 'DESC' ? (
                                      <SortDescendingIcon size={16} />
                                    ) : (
                                      <ListBulletsIcon size={16} />
                                    )
                                  ) : (
                                    <ListBulletsIcon size={16} />
                                  )}
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
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                                'No data found'
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((row, index) => (
                          <TableRow
                            key={row.id}
                            data-testid={`${PREFIX}-row-${index}`}
                            className="gba:cursor-pointer"
                            onClick={() => {
                              handleRowClick(row as any)
                            }}
                          >
                            <TableCell className="gba:py-3 gba:px-3" data-testid={`${PREFIX}-cell-actions-${index}`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`${PREFIX}-actions-button-${index}`}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={e => {
                                      e.stopPropagation()
                                      setSelectedRow(row as any)
                                      setFlowModalOpen(true)
                                    }}
                                    data-testid={`${PREFIX}-action-edit-${index}`}
                                  >
                                    <PencilIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                                    {getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:expense_calculation_rule.expense_table.edit',
                                      'Edit'
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {usedRuleIds.has(row.id) ? (
                                    <DropdownMenuItem
                                      disabled
                                      className="gba:text-muted-foreground gba:cursor-not-allowed"
                                      data-testid={`${PREFIX}-action-delete-${index}`}
                                    >
                                      <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2 gba:opacity-50" />
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:expense_calculation_rule.expense_table.delete_in_use',
                                        'Delete (in use)'
                                      )}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={e => {
                                        e.stopPropagation()
                                        setSelectedRow(row as any)
                                        setDeleteBlocked(false)
                                        setDeleteOpen(true)
                                      }}
                                      className="gba:text-destructive"
                                      data-testid={`${PREFIX}-action-delete-${index}`}
                                    >
                                      <TrashIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:expense_calculation_rule.expense_table.delete',
                                        'Delete'
                                      )}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-code-${index}`}>
                              {row.code ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:advance_payment_table.not_available',
                                  'N/A'
                                )}
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-name-${index}`}>
                              {row.name ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:advance_payment_table.not_available',
                                  'N/A'
                                )}
                            </TableCell>
                            <TableCell
                              className="gba:py-3 gba:px-6"
                              data-testid={`${PREFIX}-cell-calculation-${index}`}
                            >
                              {getCatalogValue(row.calculationType) ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:advance_payment_table.not_available',
                                  'N/A'
                                )}
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-from-${index}`}>
                              {formatDateSafe(row.activeFrom) ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:advance_payment_table.not_available',
                                  'N/A'
                                )}
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-to-${index}`}>
                              {formatDateSafe(row.activeTo) ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:advance_payment_table.not_available',
                                  'N/A'
                                )}
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-standard-${index}`}>
                              <StandardIcon
                                value={row.standard ?? false}
                                data-testid={`${PREFIX}-standard-icon-${index}`}
                              />
                            </TableCell>
                            <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-currency-${index}`}>
                              {row?.currency?.code ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:advance_payment_table.not_available',
                                  'N/A'
                                )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalCount > 0 && (
                  <div
                    className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4"
                    data-testid={`${PREFIX}-pagination`}
                  >
                    <div className="gba:text-sm gba:text-gray-600" data-testid={`${PREFIX}-pagination-info`}>
                      {(() => {
                        const start = Math.max(0, (currentPage - 1) * pageSize) + 1
                        const end = Math.min(currentPage * pageSize, totalCount)
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.pagination',
                          `${start}-${end} of ${totalCount}`,
                          {
                            range0: start,
                            range1: end,
                            total: totalCount,
                            interpolation: {
                              escapeValue: false
                            }
                          }
                        )
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
                              onClick={() => handleEnhancedTableChange({ current: currentPage - 1, pageSize })}
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
                          {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                            .filter(
                              page =>
                                page === 1 ||
                                page === Math.ceil(totalCount / pageSize) ||
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
                                    onClick={() => handleEnhancedTableChange({ current: page, pageSize })}
                                    className={
                                      page === currentPage
                                        ? 'gba:bg-blue-500 gba:text-background'
                                        : 'gba:cursor-pointer'
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
                              className={`gba:gap-1 gba:pr-2.5 ${currentPage >= Math.ceil(totalCount / pageSize) ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                              onClick={() => handleEnhancedTableChange({ current: currentPage + 1, pageSize })}
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
                          onValueChange={val => handleEnhancedTableChange({ current: 1, pageSize: Number(val) })}
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

            {/* Create Calculation Rule Modal */}
            <CreateRuleDialog
              key={selectedRow ? String(selectedRow.id) : 'create'}
              open={flowModalOpen}
              onOpenChange={open => {
                setFlowModalOpen(open)
                if (!open) {
                  setTimeout(() => setSelectedRow(null), 250)
                }
              }}
              accessToken={props.accessToken}
              additionalData={{ nvi_navigationPayload: selectedRow ? { ...selectedRow } : {} }}
              formCatalogs={formCatalogs}
              onCreated={reload}
            />

            {/* Delete Calculation Rule Modal */}
            <DeleteRuleDialog
              open={deleteOpen}
              onOpenChange={open => {
                setDeleteOpen(open)
                if (!open) {
                  setSelectedRow(null)
                }
              }}
              blocked={deleteBlocked}
              onConfirm={async () => {
                try {
                  if (!selectedRow) return
                  await restClient.post(
                    '/employee-expense/saveExpenseRule',
                    {
                      expenseRule: {
                        id: selectedRow.id,
                        version: selectedRow.version
                      },
                      changeMode: 'DELETE'
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${props.accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                      }
                    }
                  )
                  setDeleteOpen(false)
                  reload()
                } catch {
                  setDeleteOpen(false)
                }
              }}
            />
          </div>
        }
      />
    </div>
  )
}

export default ExpenseCalculationRules
