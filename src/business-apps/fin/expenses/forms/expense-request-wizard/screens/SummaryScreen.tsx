import React, { useState, useEffect, useCallback } from 'react'
import { Row, Col, Pagination, Alert } from 'antd'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDate,
  getCatalogValue,
  formatNumberFunction
} from '@/common/utils/windowUtils'
import { useExpenseRequestDateValidation } from '../utils/dateValidationUtils'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext'
import { PlanCard } from '../../expense-request/components'
import ExpenseItemRow from '../components/ExpenseItemRow'
import ExpenseSummary from './components/ExpenseSummary'
import { noAllowanceItemsFunction, getAllowanceItemsFunction } from '../utils/itemsScreenUtils'
import { getDayName } from '../utils/allowanceScreenUtils'
import { createSummaryScreenLogObject } from '../utils/summaryScreenUtils'
import { EVENTS } from '../../../utils/constants'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { SUMMARY_SCREEN_ITEM_LIST_LIMIT } from '../constants/constants'
import { getPlanCardData } from '../../expense-request/utils/planUtils'

/**
 * SummaryScreen component props
 */
interface SummaryScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

/**
 * SummaryScreen component for expense request wizard
 * @param props - Component props
 * @returns SummaryScreen component
 */
const SummaryScreen: React.FC<SummaryScreenProps> = props => {
  const { expenseRequestData, employeeRuleId, currentTitle } = useExpenseRequestWizardContext()
  const { hasFutureDates } = useExpenseRequestDateValidation()
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(props.additionalData)
  const requestData = expenseRequestData?.ExpenseRequestByPk
  const requestItemData = expenseRequestData?.ExpenseItem
  const expenseItems = noAllowanceItemsFunction(requestItemData)

  const handleSave = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createSummaryScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        expenseRequestData,
        EVENTS.SAVE
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject)
    }
  }, [expenseRequestData, employeeRuleId, currentTitle])

  const handleSubmit = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createSummaryScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        expenseRequestData,
        EVENTS.SUBMIT
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, logObject)
    }
  }, [expenseRequestData, employeeRuleId, currentTitle])

  useEffect(() => {
    document.addEventListener('expense-request-save-summary', handleSave)
    document.addEventListener('expense-request-submit-summary', handleSubmit)

    return () => {
      document.removeEventListener('expense-request-save-summary', handleSave)
      document.removeEventListener('expense-request-submit-summary', handleSubmit)
    }
  }, [handleSave, handleSubmit])

  const allowanceItems = getAllowanceItemsFunction(requestItemData)
  const positionsArray: any = []

  if (expenseItems && expenseItems.length > 0) {
    expenseItems.forEach(item => {
      if (item.expensePosition && item.expensePosition.length > 0)
        item.expensePosition.forEach((positionElement: any) => {
          positionsArray.push({
            id: positionElement.id,
            title: item.title,
            currency: (item.currency && item.currency.code) || '',
            amount: formatNumberFunction(positionElement.totalAmount),
            expenseGroup:
              getCatalogValue(positionElement.expenseGroup) ||
              (positionElement.expenseGroup && positionElement.expenseGroup.code) ||
              '',
            expenseType:
              (positionElement.expenseRuleGeneralExpense && positionElement.expenseRuleGeneralExpense.name) || '',
            costCenter: (item.costCenter && item.costCenter.name) || ''
          })
        })
    })
  }
  // Pagination state
  const itemListLimit = SUMMARY_SCREEN_ITEM_LIST_LIMIT
  const [allowanceCurrentPage, setAllowanceCurrentPage] = useState(1)
  const [expenseCurrentPage, setExpenseCurrentPage] = useState(1)

  // Pagination handlers
  const handleAllowancePageChange = (page: number) => {
    setAllowanceCurrentPage(page)
  }

  const handleExpensePageChange = (page: number) => {
    setExpenseCurrentPage(page)
  }

  // Get paginated data
  const paginatedAllowanceItems = allowanceItems
    ?.sort((a: any, b: any) => {
      const positionA = a.itemOrder ?? 0
      const positionB = b.itemOrder ?? 0
      return positionA - positionB
    })
    .slice((allowanceCurrentPage - 1) * itemListLimit, allowanceCurrentPage * itemListLimit)

  const paginatedExpenseItems = positionsArray?.slice(
    (expenseCurrentPage - 1) * itemListLimit,
    expenseCurrentPage * itemListLimit
  )

  return (
    <div
      className="gba:flex gba:flex-col gba:flex-grow"
      data-testid="expense-request-wizard-summary-screen"
      style={{ minHeight: '50vh' }}
    >
      <div className="gba:flex gba:flex-col gba:flex-grow" data-testid="expense-request-wizard-summary-screen-content">
        <div className="gba:rounded-lg" data-testid="expense-request-summary-header">
          <Row gutter={[24, 16]} className="gba:mb-2">
            <Col xs={24} md={12} className="gba:text-left">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-normal" data-testid="expense-request-id-label">
                  ID:
                </span>
                <span data-testid="expense-request-id-value">
                  {requestData?.code ||
                    getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_code', 'No code')}
                </span>
              </div>
            </Col>
            <Col xs={24} md={12} className="gba:text-right">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                <span className="gba:font-normal" data-testid="expense-request-creation-label">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_summary_request.request_creation',
                    'Request Creation:'
                  )}
                </span>
                <span data-testid="expense-request-creation-value">
                  {requestData?.createdAt
                    ? formatDate(requestData.createdAt)
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_summary_request.no_creation_date',
                        'No creation date'
                      )}
                </span>
              </div>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
            <Col xs={24} md={12} className="gba:text-left">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-normal" data-testid="expense-request-cost-center-label">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_summary_request.id_cost_center_text_main_cost',
                    'Main Cost Center:'
                  )}
                </span>
                <span data-testid="expense-request-cost-center-value">
                  {requestData?.costCenter?.name ||
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_summary_request.no_cost_center',
                      'No cost center'
                    )}
                </span>
              </div>
            </Col>
          </Row>
        </div>
        <div style={{ flexGrow: 1 }}>
          {requestData?.expensePlan && (
            <div className="gba:mt-6" data-testid="expense-request-plan-section">
              <span
                className="gba:inline-block gba:font-bold gba:w-[100%] gba:bg-muted gba:px-4 gba:py-5 gba:text-sm gba:mb-3"
                data-testid="expense-request-plan-section-title"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.initial_expense_plan_select_label',
                  'Expense Plan'
                )}
              </span>

              <div className="gba:mb-4" data-testid="expense-request-plan-card-container">
                <div className="gba:font-bold" data-testid="summary-plan-card-custom-container">
                  <PlanCard
                    key={requestData.expensePlan.id}
                    plan={getPlanCardData(requestData.expensePlan, null)}
                    selectable={false}
                    onClick={undefined}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="gba:mt-6" data-testid="expense-request-allowances-section">
            <span
              className="gba:inline-block gba:font-bold gba:w-[100%] gba:bg-muted gba:px-4 gba:py-5 gba:text-sm gba:mb-3"
              data-testid="expense-request-allowances-section-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.expense_group_placeholder',
                'Allowances'
              ) +
                ' (' +
                allowanceItems?.length +
                ')'}
            </span>
            {allowanceItems && allowanceItems.length > 0 ? (
              <>
                <div data-testid="expense-request-allowances-list">
                  {paginatedAllowanceItems.map(item => (
                    <ExpenseItemRow
                      key={item.id}
                      id={item.id}
                      leftPrimary={getDayName(item.expenseDate)}
                      leftSecondary={formatDate(item.expenseDate)}
                      rightSecondary={`${formatNumberFunction(item.totalAmount)} ${item.currency.code}`}
                    />
                  ))}
                </div>

                {allowanceItems.length > itemListLimit && (
                  <div className="gba:flex gba:justify-center" data-testid="allowance-items-pagination-container">
                    <Pagination
                      current={allowanceCurrentPage}
                      onChange={handleAllowancePageChange}
                      total={allowanceItems.length}
                      pageSize={itemListLimit}
                      showSizeChanger={false}
                      data-testid="allowance-items-pagination"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="gba:text-gray-500 gba:px-4 gba:py-5" data-testid="expense-request-no-allowances">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:add_allowance_info_request.no_allowances_text',
                  'No allowances created'
                )}
              </div>
            )}

            <div className="gba:mt-6" data-testid="expense-request-expense-items-section">
              <span
                className="gba:inline-block gba:font-bold gba:w-[100%] gba:bg-muted gba:px-4 gba:py-5 gba:text-sm gba:mb-3"
                data-testid="expense-request-expense-items-section-title"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_item_list.search_module.text_content',
                  'Expense Items'
                ) +
                  ' (' +
                  positionsArray.length +
                  ')'}
              </span>

              {positionsArray && positionsArray.length > 0 ? (
                <>
                  <div data-testid="expense-request-expense-items-list">
                    {paginatedExpenseItems.map((element: any) => (
                      <ExpenseItemRow
                        key={element.id}
                        id={element.id}
                        leftPrimary={element.title}
                        leftSecondary={`${element.expenseGroup} ${element.expenseType}`}
                        rightSecondary={`${element.amount} ${element.currency}`}
                      />
                    ))}
                  </div>

                  {positionsArray.length > itemListLimit && (
                    <div className="gba:flex gba:justify-center" data-testid="expense-items-pagination-container">
                      <Pagination
                        current={expenseCurrentPage}
                        onChange={handleExpensePageChange}
                        total={positionsArray.length}
                        pageSize={itemListLimit}
                        showSizeChanger={false}
                        data-testid="expense-items-pagination"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="gba:text-gray-500 gba:px-4 gba:py-5" data-testid="expense-request-no-expense-items">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_summary_request.no_expense_items',
                    'No expense items created'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <ExpenseSummary requestData={requestData} />
        {hasFutureDates && (
          <div className="gba:mt-4 gba:mb-4" data-testid="expense-request-future-dates-container">
            <Alert
              message={getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_summary_request.future_dates_warning',
                'Warning: Future dates detected in this expense request. Submission is disabled.'
              )}
              type="warning"
              showIcon
              data-testid="expense-request-future-dates-warning"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default SummaryScreen
