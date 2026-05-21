import React, { useCallback, useMemo } from 'react'
import { PageLayout, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { WalletIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import UnallocatedExpenseItemsTable from './UnallocatedExpenseItemsTable'
import personalTranslations from '../personal-expenses/_i18n'
import { useExpenseItemsFilters } from '../personal-expenses/hooks/useExpenseItemsFilters'
import { startProcess } from '@/common/utils/start-process'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

type UnallocatedExpenseItemsProps = BusinessAppContextProps
const ITEMS_TAB_AVAILABLE_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'VERIFIED',
  'BOOKED',
  'PAID',
  'TRANSFERRED'
] as const

const UnallocatedExpenseItems: React.FC<UnallocatedExpenseItemsProps> = ({ accessToken, userInfo, additionalData }) => {
  const { t } = useTranslation(personalTranslations)
  // Block rendering until platform injects context to avoid unauthorized fetches
  const isContextReady = Boolean(accessToken && userInfo?.employeeDetails?.employeeId)
  const availableStatuses = useMemo(() => [...ITEMS_TAB_AVAILABLE_STATUSES], [])
  const availableStatusSet = useMemo(
    () => new Set(availableStatuses.map(status => status.toLowerCase())),
    [availableStatuses]
  )

  // Determine initial status from URL or default to 'created'
  const initialStatusFromUrl = (() => {
    const urlParams = new URLSearchParams(window.location.search)
    const statusParam = (urlParams.get('status') || '').toLowerCase()

    if (availableStatusSet.has(statusParam)) {
      return statusParam
    }

    return 'created'
  })()

  const {
    addFilter,
    removeFilter,
    clearFilters,
    selectedFilters,
    filterLabelMap,
    getFilters,
    setFilters,
    amountRange,
    setAmountRange,
    expenseDateRange,
    setExpenseDateRange
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
          <ArrowLeftIcon size={16} />
          {t('personal-expenses-back-to-dashboard')}
        </Button>
      </div>
      <PageLayout
        headerIcon={WalletIcon}
        headerTitle={t('dashboard-stat-unallocated-expenses')}
        headerDescription={t('dashboard-stat-unlinked-items')}
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
          filterLabelMap={filterLabelMap}
          getFilters={getFilters}
          setFilters={setFilters}
          availableStatuses={availableStatuses}
          amountRange={amountRange}
          setAmountRange={setAmountRange}
          expenseDateRange={expenseDateRange}
          setExpenseDateRange={setExpenseDateRange}
        />
      </PageLayout>
    </div>
  )
}

export default UnallocatedExpenseItems
