import React, { useState, useEffect, useCallback } from 'react'
import { Row, Col, Pagination, Alert } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDate,
  getCatalogValue,
  formatNumberFunction
} from '@/common/utils/windowUtils'
import { hasEmployeeOrgchartCostCenter } from '@/business-apps/fin/expenses/common/utils/employeeOrgchartCostCenter'
import expenseFormsTranslations from '../../_i18n'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useExpensePlanWizardContext } from '../context/ExpensePlanWizardContext'
import ExpenseItemRow from '../../expense-request-wizard/components/ExpenseItemRow'
import ExpenseSummary from './components/ExpenseSummary'
import { noAllowanceItemsFunction, getAllowanceItemsFunction } from '../utils/itemsScreenUtils'
import { getDayName } from '../../expense-request-wizard/utils/allowanceScreenUtils'
import { createSummaryScreenLogObject } from '../utils/summaryScreenUtils'
import { EVENTS } from '../../../utils/constants'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { PLAN_TYPES } from '../../expense-plan/constants/constants'
import { PLAN_SUMMARY_SCREEN_ITEM_LIST_LIMIT } from '../../expense-request-wizard/constants/constants'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getExpenseRequestTypeConfig } from '../queries/ExpensePlanWizardQueries'

/**
 * PlanSummaryScreen component props
 */
interface PlanSummaryScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

/**
 * PlanSummaryScreen component for expense plan wizard
 * @param props - Component props
 * @returns PlanSummaryScreen component
 */
const PlanSummaryScreen: React.FC<PlanSummaryScreenProps> = props => {
  const { additionalData, accessToken } = props
  const { expensePlanData, employeeRuleId, currentTitle } = useExpensePlanWizardContext()
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)
  const { t: tForms } = useTranslation(expenseFormsTranslations)
  const graphqlClient = useGraphqlClient(accessToken)
  const planData = expensePlanData?.ExpensePlanByPk
  const planItemData = expensePlanData?.ExpensePlanItem
  const expenseItems = noAllowanceItemsFunction(planItemData)
  const missingOrgchartCostCenter =
    Boolean(expensePlanData) && !hasEmployeeOrgchartCostCenter(expensePlanData?.EmployeePosition)
  const isTrip = expensePlanData?.ExpensePlanByPk?.requestTypeRef?.toLowerCase().includes(PLAN_TYPES.TRIP)

  // State to store createAbsenceFromPlan from catalog
  const [createBusinessTrip, setCreateBusinessTrip] = useState(false)

  // Fetch catalog configuration when component mounts or requestTypeRef changes
  useEffect(() => {
    const fetchCatalogConfig = async () => {
      const requestTypeRef = expensePlanData?.ExpensePlanByPk?.requestTypeRef
      if (!requestTypeRef || !accessToken) return

      try {
        const response = await graphqlClient.request(getExpenseRequestTypeConfig, {
          requestTypeRef
        })

        const catalogEntry = response.CatalogEntry?.[0]
        if (catalogEntry?.objectValue?.createAbsenceFromPlan !== undefined) {
          setCreateBusinessTrip(catalogEntry.objectValue.createAbsenceFromPlan)
        } else {
          setCreateBusinessTrip(false) // Default to false if not configured
        }
      } catch (error) {
        console.warn('[PlanSummaryScreen] Failed to fetch catalog config:', error)
        setCreateBusinessTrip(false) // Default to false on error
      }
    }

    fetchCatalogConfig()
  }, [expensePlanData?.ExpensePlanByPk?.requestTypeRef, accessToken, graphqlClient])

  const handleSave = useCallback(() => {
    let skipStep = false
    if (additionalData?.psi_taskPayload.stepKey && additionalData?.psi_taskPayload.stepKey.includes(EVENTS.SKIP)) {
      skipStep = true
    }
    if (expensePlanData?.ExpensePlanByPk) {
      const logObject = createSummaryScreenLogObject(
        expensePlanData.ExpensePlanByPk,
        employeeRuleId,
        currentTitle,
        expensePlanData,
        EVENTS.SAVE,
        skipStep,
        createBusinessTrip
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject)
    }
  }, [expensePlanData, employeeRuleId, currentTitle, createBusinessTrip])

  const handleSubmit = useCallback(() => {
    let skipStep = false
    if (additionalData?.psi_taskPayload.stepKey && additionalData?.psi_taskPayload.stepKey.includes(EVENTS.SKIP)) {
      skipStep = true
    }
    if (!expensePlanData?.ExpensePlanByPk) {
      return
    }
    if (!hasEmployeeOrgchartCostCenter(expensePlanData.EmployeePosition)) {
      return
    }
    const logObject = createSummaryScreenLogObject(
      expensePlanData.ExpensePlanByPk,
      employeeRuleId,
      currentTitle,
      expensePlanData,
      EVENTS.SUBMIT,
      skipStep,
      createBusinessTrip
    )
    dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, logObject)
  }, [expensePlanData, employeeRuleId, currentTitle, createBusinessTrip])

  useEffect(() => {
    document.addEventListener('expense-plan-save-summary', handleSave)
    document.addEventListener('expense-plan-submit-summary', handleSubmit)

    return () => {
      document.removeEventListener('expense-plan-save-summary', handleSave)
      document.removeEventListener('expense-plan-submit-summary', handleSubmit)
    }
  }, [handleSave, handleSubmit])

  const allowanceItems = getAllowanceItemsFunction(planItemData)
  const normalItems: any = []

  if (expenseItems && expenseItems.length > 0) {
    expenseItems.forEach(item => {
      normalItems.push({
        id: item.id,
        title: item.title,
        currency: (item.currency && item.currency.code) || '',
        amount: formatNumberFunction(item.totalAmount),
        expenseGroup: getCatalogValue(item.expenseGroup) || (item.expenseGroup && item.expenseGroup.code) || '',
        expenseType: (item.expenseRuleGeneralExpense && item.expenseRuleGeneralExpense.name) || '',
        costCenter: (item.costCenter && item.costCenter.name) || ''
      })
    })
  }
  // Pagination state
  const itemListLimit = PLAN_SUMMARY_SCREEN_ITEM_LIST_LIMIT
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

  const paginatedExpenseItems = normalItems?.slice(
    (expenseCurrentPage - 1) * itemListLimit,
    expenseCurrentPage * itemListLimit
  )

  return (
    <div
      className="gba:flex gba:flex-col gba:flex-grow"
      data-testid="expense-plan-wizard-summary-screen"
      style={{ minHeight: '50vh' }}
    >
      <div className="gba:flex gba:flex-col gba:flex-grow" data-testid="expense-plan-wizard-summary-screen-content">
        <div className="gba:rounded-lg" data-testid="expense-plan-summary-header">
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12} className="gba:text-left">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-normal" data-testid="expense-plan-id-label">
                  ID:
                </span>
                <span data-testid="expense-plan-id-value">
                  {planData?.code ||
                    getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_code', 'No code')}
                </span>
              </div>
            </Col>
            {isTrip ? (
              <Col xs={24} md={12} className="gba:text-right">
                <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                  <span className="gba:font-normal" data-testid="expense-plan-start-date-label">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:add_items_to_plan.add_trip_info_to_plan.start_date_label',
                      'Start Date'
                    ) + ': '}
                  </span>
                  <span data-testid="expense-plan-start-date-value">
                    {planData?.startDate
                      ? formatDate(planData.startDate)
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_summary_request.no_start_date',
                          'No start date'
                        )}
                  </span>
                </div>
              </Col>
            ) : (
              <Col xs={24} md={12} className="gba:text-right">
                <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:font-normal" data-testid="expense-request-cost-center-label">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_summary_request.plan_creation',
                        'Plan Creation:'
                      )}
                    </span>
                    <span data-testid="expense-request-cost-center-value">
                      {planData?.createdAt
                        ? formatDate(planData.createdAt)
                        : getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_summary_request.no_creation_date',
                            'No creation date'
                          )}
                    </span>
                  </div>
                </div>
              </Col>
            )}
          </Row>
          {isTrip && (
            <Row gutter={[24, 16]} className="gba:mb-2 gba:justify-end">
              <Col xs={24} md={12} className="gba:text-right">
                <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                  <span className="gba:font-normal" data-testid="expense-plan-end-date-label">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:add_items_to_plan.add_trip_info_to_plan.end_date_label',
                      'End Date'
                    ) + ': '}
                  </span>
                  <span data-testid="expense-plan-end-date-value">
                    {planData?.endDate
                      ? formatDate(planData.endDate)
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_summary_request.no_end_date',
                          'No end date'
                        )}
                  </span>
                </div>
              </Col>
            </Row>
          )}
        </div>
        <div style={{ flexGrow: 1 }}>
          <div className="gba:mt-6" data-testid="expense-plan-allowances-section">
            <span
              className="gba:inline-block gba:font-bold gba:w-full gba:bg-muted gba:px-4 gba:py-5 gba:text-sm gba:mb-3"
              data-testid="expense-plan-allowances-section-title"
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
                <div data-testid="expense-plan-allowances-list">
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
              <div className="gba:text-gray-500 gba:px-4 gba:py-5" data-testid="expense-plan-no-allowances">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:add_allowance_info_request.no_allowances_text',
                  'No allowances created'
                )}
              </div>
            )}
          </div>

          <div className="gba:mt-6" data-testid="expense-plan-expense-items-section">
            <span
              className="gba:inline-block gba:font-bold gba:w-full gba:bg-muted gba:px-4 gba:py-5 gba:text-sm gba:mb-3"
              data-testid="expense-plan-expense-items-section-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:add_items_to_plan.expense_items_counter',
                'Estimated Expense Items'
              ) +
                ' (' +
                normalItems.length +
                ')'}
            </span>

            {normalItems && normalItems.length > 0 ? (
              <>
                <div data-testid="expense-plan-expense-items-list">
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

                {normalItems.length > itemListLimit && (
                  <div className="gba:flex gba:justify-center" data-testid="expense-items-pagination-container">
                    <Pagination
                      current={expenseCurrentPage}
                      onChange={handleExpensePageChange}
                      total={normalItems.length}
                      pageSize={itemListLimit}
                      showSizeChanger={false}
                      data-testid="expense-items-pagination"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="gba:text-gray-500 gba:px-4 gba:py-5" data-testid="expense-plan-no-expense-items">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.add_request_trip_details.no_estimated_items',
                  'No Estimated Expense Items Added'
                )}
              </div>
            )}
          </div>
        </div>
        <ExpenseSummary planData={planData} />
        {missingOrgchartCostCenter && (
          <div className="gba:mt-4 gba:mb-4" data-testid="expense-plan-missing-orgchart-cost-center-container">
            <Alert
              message={tForms('missing-orgchart-cost-center-wizard-message')}
              type="error"
              showIcon
              data-testid="expense-plan-missing-orgchart-cost-center-warning"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default PlanSummaryScreen
