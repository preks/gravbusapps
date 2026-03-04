import React, { useCallback } from 'react'
import { Card, Button, CardContent } from '@newwork/nw-design-system'
import { PlusCircleIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const QuickActionCards: React.FC<BusinessAppContextProps> = props => {
  const { userInfo } = props

  const handlePlanTrip = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      // TODO: Replace with nw-design-system toast when available
      console.warn('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpensePlan',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [userInfo?.employeeDetails?.employeeId])

  const handleRecordExpense = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      // TODO: Replace with nw-design-system toast when available
      console.warn('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [userInfo?.employeeDetails?.employeeId])

  const handleSubmitRequest = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      // TODO: Replace with nw-design-system toast when available
      console.warn('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [userInfo?.employeeDetails?.employeeId])

  const actionCards = [
    {
      id: 'plan-trip',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.submit_plan', 'Submit a Plan'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.record_expense_description',
        'Plan a new Business Trip.'
      ),
      icon: <PlusCircleOutlined className="gba:text-2xl gba:text-blue-500" />,
      features: [
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.request_plan_approval', 'Request plan approval'),
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label',
          'Request Advance Payment'
        ),
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.track_submission_status',
          'Track Submission Status'
        )
      ],
      buttonText: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.add_plan', 'Plan a new Business Trip'),
      buttonIcon: <PlusCircleIcon size={16} />,
      buttonAction: handlePlanTrip
    },
    {
      id: 'record-expense',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.record_expense', 'Add an Expense'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.record_expense_description',
        'Quickly add a new expense to your records. Keep track of your spending efficiently.'
      ),
      icon: <PlusCircleOutlined className="gba:text-2xl gba:text-blue-500" />,
      features: [
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.single_or_multiple_items',
          'Single or multiple items'
        ),
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.attach_receipts_easily',
          'Attach receipts easily'
        ),
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.categorize_for_clarity', 'Categorize for clarity')
      ],
      buttonText: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.new_expense', 'New Expense'),
      buttonIcon: <PlusCircleIcon size={16} />,
      buttonAction: handleRecordExpense
    },
    {
      id: 'submit-request',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.submit_request', 'Submit Request'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.submit_request_description',
        'Submit your expense reports for reimbursement and manage your trip requests efficiently.'
      ),
      icon: <SendOutlined className="gba:text-2xl gba:text-green-500" />,
      features: [
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.create_expense_report', 'Create expense report'),
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.request_trip_approval', 'Request trip approval'),
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.track_submission_status',
          'Track submission status'
        )
      ],
      buttonText: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.new_request', 'New Request'),
      buttonIcon: <PaperPlaneTiltIcon size={16} />,
      buttonAction: handleSubmitRequest
    }
  ]

  return (
    <div className="gba:grid gba:grid-cols-3 gba:gap-4">
      {actionCards.map(card => (
        <Card
          key={card.id}
          className="gba:quick-action-card gba:h-full gba:transition-all gba:duration-200 hover:gba:shadow-lg"
          data-testid={`quick-action-card-${card.id}`}
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:flex-col gba:h-full gba:space-y-4">
              <div className="gba:flex gba:items-center gba:space-x-3">
                {card.icon}
                <h3 className="gba:text-lg gba:font-semibold gba:m-0" data-testid={`card-title-${card.id}`}>
                  {card.title}
                </h3>
              </div>

              <p
                className="gba:text-sm gba:text-gray-600 gba:min-h-[60px] gba:flex-1"
                data-testid={`card-description-${card.id}`}
              >
                {card.description}
              </p>

              <div className="gba:space-y-1" data-testid={`card-features-${card.id}`}>
                {card.features.map((feature, index) => (
                  <div key={index} className="gba:text-sm gba:flex gba:items-center">
                    <span className="gba:mr-2">-</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="default"
                className="gba:w-full gba:mt-auto"
                onClick={card.buttonAction}
                data-testid={`action-button-${card.id}`}
              >
                <span className="gba:flex gba:items-center gba:justify-center gba:space-x-2">
                  {card.buttonIcon}
                  <span>{card.buttonText}</span>
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default QuickActionCards
