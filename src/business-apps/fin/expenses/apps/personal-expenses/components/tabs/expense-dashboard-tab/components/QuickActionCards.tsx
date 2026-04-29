import React, { useCallback, useMemo } from 'react'
import { Card, Button, CardContent, useTranslation } from '@newwork/nw-design-system'
import { PlusCircleIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import personalTranslations from '../../../../_i18n'

const QuickActionCards: React.FC<BusinessAppContextProps> = props => {
  const { userInfo } = props
  const { t } = useTranslation(personalTranslations)

  const handlePlanTrip = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
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

  const actionCards = useMemo(
    () => [
      {
        id: 'plan-trip',
        title: t('dashboard-quick-action-plan-title'),
        description: t('dashboard-quick-action-plan-description'),
        icon: <PlusCircleIcon className="gba:text-2xl gba:text-blue-500" />,
        features: [
          t('dashboard-quick-action-plan-feature-approval'),
          t('dashboard-quick-action-plan-feature-advance'),
          t('dashboard-quick-action-plan-feature-track')
        ],
        buttonText: t('dashboard-quick-action-plan-button'),
        buttonIcon: <PlusCircleIcon size={16} />,
        buttonAction: handlePlanTrip
      },
      {
        id: 'record-expense',
        title: t('dashboard-quick-action-record-title'),
        description: t('dashboard-quick-action-record-description'),
        icon: <PlusCircleIcon className="gba:text-2xl gba:text-blue-500" />,
        features: [
          t('dashboard-quick-action-record-feature-items'),
          t('dashboard-quick-action-record-feature-receipts'),
          t('dashboard-quick-action-record-feature-categories')
        ],
        buttonText: t('dashboard-quick-action-expense-item-button'),
        buttonIcon: <PlusCircleIcon size={16} />,
        buttonAction: handleRecordExpense
      },
      {
        id: 'submit-request',
        title: t('dashboard-quick-action-submit-title'),
        description: t('dashboard-quick-action-submit-description'),
        icon: <PaperPlaneTiltIcon className="gba:text-2xl gba:text-green-500" />,
        features: [
          t('dashboard-quick-action-submit-feature-report'),
          t('dashboard-quick-action-submit-feature-trip'),
          t('dashboard-quick-action-submit-feature-track')
        ],
        buttonText: t('dashboard-quick-action-request-button'),
        buttonIcon: <PaperPlaneTiltIcon size={16} />,
        buttonAction: handleSubmitRequest
      }
    ],
    [t, handlePlanTrip, handleRecordExpense, handleSubmitRequest]
  )

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
                {card.features.map(feature => (
                  <div key={feature} className="gba:text-sm gba:flex gba:items-center">
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
