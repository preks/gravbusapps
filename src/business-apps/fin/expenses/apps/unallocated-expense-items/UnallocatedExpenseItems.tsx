import React, { useCallback, useMemo } from 'react'
import { PageLayout, Button, Spinner } from '@newwork/nw-design-system'
import { PiArrowLeft } from 'react-icons/pi'
import { WalletIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import UnallocatedExpenseItemsTable from './UnallocatedExpenseItemsTable'
import { useExpenseItemsFilters } from '../personal-expenses/hooks/useExpenseItemsFilters'
import { startProcess } from '@/common/utils/start-process'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

type UnallocatedExpenseItemsProps = BusinessAppContextProps

const UnallocatedExpenseItems: React.FC<UnallocatedExpenseItemsProps> = ({ accessToken, userInfo, additionalData }) => {
  // Block rendering until platform injects context to avoid unauthorized fetches
  const isContextReady = Boolean(accessToken && userInfo?.employeeDetails?.employeeId)
  // Restrict to CREATED by default
  const availableStatuses = useMemo(
    () => [
      'PREPARED',
      'CREATED',
      'ASSIGNED',
      'PENDING',
      'APPROVED',
      'REJECTED',
      'VERIFIED',
      'BOOKED',
      'PAID',
      'CLOSED',
      'TRANSFERRED'
    ],
    []
  )

  // Determine initial status from URL or default to 'created'
  const initialStatusFromUrl = (() => {
    const urlParams = new URLSearchParams(window.location.search)
    const statusParam = (urlParams.get('status') || '').toUpperCase()
    return !statusParam || statusParam === 'CREATED' ? 'created' : statusParam.toLowerCase()
  })()

  const {
    addFilter,
    removeFilter,
    clearFilters,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    setFilters,
    amountRange
  } = useExpenseItemsFilters(availableStatuses, [initialStatusFromUrl])

  const handleAddExpenseItem = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId
    if (!employeeId) return
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payload: { employeeId },
      builderType: 'NATIVE_SCREEN'
    })
  }, [userInfo?.employeeDetails?.employeeId])

  if (!isContextReady) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]"
        data-testid="unallocated-expense-items-loading"
      >
        <Spinner />
      </div>
    )
  }

  return (
    <div data-testid="unallocated-expense-items-container" className="gba:min-h-screen">
      {/* Back Navigation - match Backoffice Absences style */}
      <div className="gba:m-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const url = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: 'dashboard' })
            navigateTo(url)
          }}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="unallocated-expense-items-back-button"
        >
          <PiArrowLeft size={16} />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.dashboard_btn',
            'Back to Dashboard'
          )}
        </Button>
      </div>
      <PageLayout
        headerIcon={WalletIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.unallocated_expenses',
          'Unallocated Expenses'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.unlinked_items',
          'Expense items not linked to a request'
        )}
        variant="default"
      >
        <UnallocatedExpenseItemsTable
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          onAddExpenseItem={handleAddExpenseItem}
          selectedFilters={selectedFilters}
          addFilter={addFilter}
          removeFilter={removeFilter}
          clearFilters={clearFilters}
          filterGroups={filterGroups}
          filterLabelMap={filterLabelMap}
          getFilters={getFilters}
          setFilters={setFilters}
          availableStatuses={availableStatuses}
          amountRange={amountRange}
        />
      </PageLayout>
    </div>
  )
}

export default UnallocatedExpenseItems
