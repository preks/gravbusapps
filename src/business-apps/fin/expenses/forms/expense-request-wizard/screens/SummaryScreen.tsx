import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Row, Col, Pagination, Alert } from 'antd'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import {
  getCurrentActiveStructureId,
  formatDate,
  getCatalogValue,
  formatNumberFunction
} from '@/common/utils/windowUtils'
import { hasEmployeeOrgchartCostCenter } from '@/business-apps/fin/expenses/common/utils/employeeOrgchartCostCenter'
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
import { useExpenseRequestCreationTranslation } from '../../expense-request-creation/useExpenseRequestCreationTranslation'
import { useExpenseRequestWizardTranslation } from '../useExpenseRequestWizardTranslation'
import {
  resolveEffectiveCostCenterId,
  resolveEffectiveCostCenterName,
  resolveManualMainCostCenterId
} from '../../shared/utils/effectiveCostCenter'
import { resolvePrimaryEmployeePosition } from '../../expense-request/utils/resolvePrimaryEmployeePosition'

type CostCenterOption = { id: string; name: string; structureId?: string }

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
  const { expenseRequestData, employeeRuleId, currentTitle, getUserCostCentersCached } =
    useExpenseRequestWizardContext()
  const { hasFutureDates } = useExpenseRequestDateValidation()
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(props.additionalData)
  const { t: tCreation } = useExpenseRequestCreationTranslation()
  const { t: tWizard } = useExpenseRequestWizardTranslation()
  const requestData = expenseRequestData?.ExpenseRequestByPk
  const requestItemData = expenseRequestData?.ExpenseItem
  const expenseItems = noAllowanceItemsFunction(requestItemData)
  const effectiveCostCenterId = resolveEffectiveCostCenterId(
    expenseRequestData?.EmployeePosition,
    requestData?.costCenterId || ''
  )
  const effectiveCostCenterName = resolveEffectiveCostCenterName(
    expenseRequestData?.EmployeePosition,
    requestData?.costCenter?.name || ''
  )
  const savedManualMainCostCenterId = resolveManualMainCostCenterId(requestData?.additionalProperties)
  const initialMainCostCenterId = savedManualMainCostCenterId || effectiveCostCenterId
  const [showMainCostCenterSelect, setShowMainCostCenterSelect] = useState(false)
  const [mainCostCenters, setMainCostCenters] = useState<CostCenterOption[]>([])
  const [selectedMainCostCenterId, setSelectedMainCostCenterId] = useState('')
  const [draftMainCostCenterId, setDraftMainCostCenterId] = useState('')
  const missingOrgchartCostCenter =
    Boolean(expenseRequestData) && !hasEmployeeOrgchartCostCenter(expenseRequestData?.EmployeePosition)

  const selectedMainCostCenter = useMemo(
    () => mainCostCenters.find(costCenter => costCenter.id === selectedMainCostCenterId),
    [mainCostCenters, selectedMainCostCenterId]
  )
  const mainCostCenterName =
    selectedMainCostCenter?.name ||
    (savedManualMainCostCenterId ? requestData?.costCenter?.name || '' : effectiveCostCenterName)
  const mainCostCenterIdForPayload = showMainCostCenterSelect
    ? draftMainCostCenterId || selectedMainCostCenterId
    : selectedMainCostCenterId
  let manualMainCostCenterIdForPayload: string | undefined
  if (showMainCostCenterSelect) {
    manualMainCostCenterIdForPayload =
      mainCostCenterIdForPayload === effectiveCostCenterId ? '' : mainCostCenterIdForPayload
  }

  useEffect(() => {
    setSelectedMainCostCenterId(initialMainCostCenterId)
    setDraftMainCostCenterId(initialMainCostCenterId)
  }, [initialMainCostCenterId, requestData?.id])

  useEffect(() => {
    const fetchMainCostCenters = async () => {
      const positions = expenseRequestData?.EmployeePosition || []
      const primaryPosition = resolvePrimaryEmployeePosition(positions, getCurrentActiveStructureId())
      const structureId = primaryPosition?.structureId ?? positions[0]?.structureId ?? getCurrentActiveStructureId()
      if (!structureId) {
        setMainCostCenters([])
        return
      }

      const response = await getUserCostCentersCached(structureId)
      const costCenters = response?.userCostCenters || []
      setMainCostCenters(
        costCenters.map((costCenter: any) => ({
          id: costCenter.id,
          name: costCenter.name || '',
          structureId: costCenter.structureId
        }))
      )
    }

    fetchMainCostCenters()
  }, [expenseRequestData?.EmployeePosition, getUserCostCentersCached])

  const handleSave = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createSummaryScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        expenseRequestData,
        EVENTS.SAVE,
        mainCostCenterIdForPayload,
        manualMainCostCenterIdForPayload
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject)
    }
  }, [expenseRequestData, employeeRuleId, currentTitle, mainCostCenterIdForPayload, manualMainCostCenterIdForPayload])

  const handleSubmit = useCallback(() => {
    if (!expenseRequestData?.ExpenseRequestByPk) {
      return
    }
    if (!hasEmployeeOrgchartCostCenter(expenseRequestData.EmployeePosition)) {
      return
    }
    const logObject = createSummaryScreenLogObject(
      expenseRequestData.ExpenseRequestByPk,
      employeeRuleId,
      currentTitle,
      expenseRequestData,
      EVENTS.SUBMIT,
      mainCostCenterIdForPayload,
      manualMainCostCenterIdForPayload
    )
    dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, logObject)
  }, [expenseRequestData, employeeRuleId, currentTitle, mainCostCenterIdForPayload, manualMainCostCenterIdForPayload])

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

  const handleToggleMainCostCenterSelect = () => {
    if (showMainCostCenterSelect) {
      setDraftMainCostCenterId(selectedMainCostCenterId)
      setShowMainCostCenterSelect(false)
      return
    }

    setDraftMainCostCenterId(selectedMainCostCenterId || effectiveCostCenterId)
    setShowMainCostCenterSelect(true)
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
                <span data-testid="expense-request-id-value">{requestData?.code || tWizard('summary-no-code')}</span>
              </div>
            </Col>
            <Col xs={24} md={12} className="gba:text-right">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                <span className="gba:font-normal" data-testid="expense-request-creation-label">
                  {tWizard('summary-request-creation')}
                </span>
                <span data-testid="expense-request-creation-value">
                  {requestData?.createdAt ? formatDate(requestData.createdAt) : tWizard('summary-no-creation-date')}
                </span>
              </div>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
            <Col xs={24} className="gba:text-left">
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1">
                <span
                  className="gba:font-normal gba:flex-shrink-0 gba:whitespace-nowrap gba:leading-none"
                  data-testid="expense-request-cost-center-label"
                >
                  {tWizard('summary-main-cost-center-label')}
                </span>
                {showMainCostCenterSelect ? (
                  <div
                    className="gba:m-0 gba:inline-block gba:flex-none gba:self-center gba:p-0"
                    data-testid="expense-request-main-cost-center-select-container"
                  >
                    <Select
                      value={draftMainCostCenterId || undefined}
                      onValueChange={setDraftMainCostCenterId}
                      showClearButton={false}
                    >
                      <SelectTrigger
                        id="expense-request-main-cost-center"
                        size="sm"
                        className="gba:w-max gba:max-w-xs gba:min-w-0 gba:!h-6 gba:!min-h-6 gba:!max-h-6 gba:!gap-1 gba:!py-0 gba:!px-1 gba:text-xs gba:leading-none gba:shadow-none [&_svg]:gba:h-3 [&_svg]:gba:w-3"
                        data-testid="expense-request-main-cost-center-select"
                        aria-label={tWizard('wizard-cost-center-label')}
                      >
                        <SelectValue placeholder={tWizard('wizard-cost-center-placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {mainCostCenters.map(costCenter => (
                          <SelectItem key={costCenter.id} value={costCenter.id}>
                            {costCenter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span
                    className="gba:min-w-0 gba:flex-1 gba:text-left"
                    data-testid="expense-request-cost-center-value"
                  >
                    {mainCostCenterName || tWizard('summary-no-cost-center')}
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="gba:mt-2"
                data-testid="expense-request-change-main-cost-center-button"
                onClick={handleToggleMainCostCenterSelect}
              >
                {showMainCostCenterSelect ? tWizard('action-cancel') : tWizard('action-change-main-cost-center')}
              </Button>
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
                {tWizard('summary-expense-plan-label')}
              </span>

              <div className="gba:mb-4" data-testid="expense-request-plan-card-container">
                <div className="gba:font-bold" data-testid="summary-plan-card-custom-container">
                  <PlanCard
                    key={requestData.expensePlan.id}
                    plan={getPlanCardData(requestData.expensePlan, null, tCreation)}
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
              {tWizard('summary-allowances-title') + ' (' + allowanceItems?.length + ')'}
            </span>
            {allowanceItems && allowanceItems.length > 0 ? (
              <>
                <div data-testid="expense-request-allowances-list">
                  {paginatedAllowanceItems.map(item => (
                    <ExpenseItemRow
                      key={item.id}
                      id={item.id}
                      leftPrimary={getDayName(item.expenseDate, tWizard)}
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
                {tWizard('wizard-no-allowances-text')}
              </div>
            )}

            <div className="gba:mt-6" data-testid="expense-request-expense-items-section">
              <span
                className="gba:inline-block gba:font-bold gba:w-[100%] gba:bg-muted gba:px-4 gba:py-5 gba:text-sm gba:mb-3"
                data-testid="expense-request-expense-items-section-title"
              >
                {tWizard('summary-expense-items-title') + ' (' + positionsArray.length + ')'}
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
                  {tWizard('summary-no-expense-items')}
                </div>
              )}
            </div>
          </div>
        </div>
        <ExpenseSummary requestData={requestData} />
        {missingOrgchartCostCenter && (
          <div className="gba:mt-4 gba:mb-4" data-testid="expense-request-missing-orgchart-cost-center-container">
            <Alert
              message={tWizard('missing-orgchart-cost-center-wizard-message')}
              type="error"
              showIcon
              data-testid="expense-request-missing-orgchart-cost-center-warning"
            />
          </div>
        )}
        {hasFutureDates && (
          <div className="gba:mt-4 gba:mb-4" data-testid="expense-request-future-dates-container">
            <Alert
              message={tWizard('summary-future-dates-warning')}
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
