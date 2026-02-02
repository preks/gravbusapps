import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@newwork/gravity-ui-catalog'
import { Pagination } from 'antd'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ICONS } from '../../../utils/icons'
import ExpenseItemCard from '../components/ExpenseItemCard/ExpenseItemCard'
import { createItemsScreenLogObject, formatArrayOfItems, noAllowanceItemsFunction } from '../utils/itemsScreenUtils'
import { fetchEmployeeExpenseItems, fetchEmployeeExpenseItemsFromPayload } from '../ExpenseRequestWizardQueries'
import { SearchBarWithLabel } from '../../../forms/expense-request/components'
import { EVENTS } from '../../../utils/constants'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { showToast } from '../../../utils/notificationUtils'
import RejectionComment from '../components/RejectionComment'
import { getLatestRejectComment } from '../utils/tripScreenUtils'
import { REQUEST_STATUS, DEFAULT_ITEM_LIST_LIMIT, DEFAULT_CURRENCY_FALLBACK } from '../constants/constants'

interface ItemsScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
  isTrip: boolean
}

const ItemsScreen: React.FC<ItemsScreenProps> = props => {
  const { accessToken, additionalData, userInfo, isTrip } = props
  const {
    expenseRequestData,
    setExpenseRequestData,
    employeeRuleId,
    currentTitle,
    currentCurrency,
    deletedItems,
    setDeletedItems,
    payloadItemsLoaded,
    setPayloadItemsLoaded,
    payloadItemIds,
    setPayloadItemIds,
    showSelectItems,
    setShowSelectItems
  } = useExpenseRequestWizardContext()
  const [selectItemsList, setSelectItemsList] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedItemsToInitial, setSelectedItemsToInitial] = useState<any[]>([])
  const [totalItems, setTotalItems] = useState<number>(0)
  const [selectedItemIdsForSelection, setSelectedItemIdsForSelection] = useState<string[]>([])
  const [initialCurrentPage, setInitialCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expenseTotals, setExpenseTotals] = useState<{ currency: string; amount: number }[]>([])

  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  const employeeId = userInfo?.employeeDetails?.employeeId
  const itemListLimit = DEFAULT_ITEM_LIST_LIMIT

  const graphQLClient = useGraphqlClient(accessToken)

  const expenseItems = useMemo(() => {
    const expensesArray = expenseRequestData?.ExpenseItem
    if (!expensesArray || !Array.isArray(expensesArray)) {
      return []
    }
    // Ensure locally deleted items are excluded from the working list
    const mappedDeletedItems = deletedItems.map((element: any) => element.id)
    const removeDeletedItems = expensesArray.filter((element: any) => !mappedDeletedItems.includes(element.id))
    return noAllowanceItemsFunction(removeDeletedItems)
  }, [expenseRequestData, deletedItems])

  useEffect(() => {
    const event = new CustomEvent('expense-wizard-update-footer', {
      detail: { itemsCount: expenseItems.length }
    })
    document.dispatchEvent(event)
  }, [expenseItems])

  const latestRejectComment = getLatestRejectComment(expenseRequestData)

  useEffect(() => {
    const calculateTotals = () => {
      if (!expenseItems || expenseItems.length === 0) {
        const defaultCurrency = expenseRequestData?.ExpenseRequestByPk?.currency?.code || DEFAULT_CURRENCY_FALLBACK
        return [{ currency: defaultCurrency, amount: 0 }]
      }

      const totals: Record<string, number> = {}
      expenseItems.forEach(item => {
        const currency = item.currency?.code || ''
        const amount = item.totalAmount || 0

        if (currency) {
          if (!totals[currency]) {
            totals[currency] = 0
          }
          totals[currency] += parseFloat(amount)
        }
      })
      return Object.entries(totals).map(([currency, amount]) => ({
        currency,
        amount
      }))
    }

    setExpenseTotals(calculateTotals())
  }, [expenseItems, expenseRequestData])

  const fetchSelectItems = useCallback(async () => {
    try {
      setIsLoading(true)

      const currentItemIds = expenseItems?.map((item: any) => item.id) || []
      // Exclude currently attached items and items selected in this view from both API and local lists appropriately
      const excludedIdsBase = [...currentItemIds, ...selectedItemsToInitial.map((item: any) => item.id)]
      // API should also exclude payload items and locally deleted items to prevent duplicates
      const excludedIdsForApi = [...excludedIdsBase, ...payloadItemIds, ...deletedItems.map((d: any) => d.id)]

      let itemCurrency = null
      if (currentCurrency) {
        itemCurrency = currentCurrency
      } else if (expenseRequestData.ExpenseItem && expenseRequestData.ExpenseItem.length > 0) {
        itemCurrency = expenseRequestData.ExpenseItem[0].currencyRef
      } else if (expenseItems && expenseItems.length > 0) {
        itemCurrency = expenseItems[0].currencyRef || ''
      }

      const userLocale = getCurrentActiveUserLocale()
      const countVariables = {
        employeeId,
        status: REQUEST_STATUS.CREATED,
        activeUserLocale: userLocale,
        idsArray: excludedIdsForApi,
        itemCurrency: itemCurrency
      }

      const countResponse = await graphQLClient.request(fetchEmployeeExpenseItems, {
        ...countVariables,
        limit: 1,
        offset: 0,
        titleSearch: searchQuery ? `%${searchQuery}%` : '%'
      })
      const apiItemsCount = countResponse?.ExpenseItemAggregate?.aggregate?.count || 0
      const globalStart = Math.max(0, (currentPage - 1) * itemListLimit)
      const filteredDeletedItems = deletedItems.filter((item: any) => {
        if (excludedIdsBase.includes(item.id)) return false
        if (searchQuery && item.title) {
          return item.title.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return true
      })

      const totalItemsCount = apiItemsCount + filteredDeletedItems.length
      setTotalItems(totalItemsCount)

      const deletedStart = globalStart < filteredDeletedItems.length ? globalStart : 0
      const deletedItemsInPage =
        globalStart < filteredDeletedItems.length
          ? Math.min(itemListLimit, filteredDeletedItems.length - globalStart)
          : 0
      const deletedSlice =
        deletedItemsInPage > 0 ? filteredDeletedItems.slice(deletedStart, deletedStart + deletedItemsInPage) : []

      const apiNeeded = Math.max(0, itemListLimit - deletedSlice.length)
      const apiOffset = Math.max(0, globalStart - filteredDeletedItems.length)
      let items: any[] = []
      if (apiNeeded > 0) {
        const variables = {
          ...countVariables,
          limit: Number(apiNeeded),
          offset: Math.max(0, Number(apiOffset)),
          titleSearch: searchQuery ? `%${searchQuery}%` : '%%'
        }
        const response = await graphQLClient.request(fetchEmployeeExpenseItems, variables)
        items = response?.ExpenseItemEmployee || []
      }

      const filteredApiItems = noAllowanceItemsFunction(items).filter(
        (apiItem: any) => !deletedItems.some((d: any) => d.id === apiItem.id)
      )

      let finalItems = deletedSlice
      if (filteredApiItems.length > 0) {
        finalItems = [...finalItems, ...filteredApiItems]
      }

      setSelectItemsList(finalItems)
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.error_fetch_items',
          'Error fetching expense items'
        ),
        'error'
      )
      const filteredDeletedItems = deletedItems.filter(
        (item: any) =>
          !expenseRequestData.ExpenseItem?.map((i: any) => i.id).includes(item.id) &&
          !selectedItemsToInitial.map((i: any) => i.id).includes(item.id)
      )

      setTotalItems(filteredDeletedItems.length)
      setSelectItemsList(filteredDeletedItems.slice(0, itemListLimit))
    } finally {
      setIsLoading(false)
    }
  }, [
    currentPage,
    deletedItems,
    employeeId,
    expenseRequestData?.ExpenseItem,
    graphQLClient,
    itemListLimit,
    selectedItemsToInitial,
    currentCurrency,
    searchQuery
  ])

  const handleDeleteItem = (itemId: string) => {
    if (!expenseRequestData?.ExpenseItem) return

    const deletedItem = expenseRequestData.ExpenseItem.find((item: any) => item.id === itemId)
    if (!deletedItem) return

    const isInSelectedItems = selectedItemsToInitial.some((item: any) => item.id === itemId)

    const updatedExpenseItems = expenseRequestData.ExpenseItem.filter((item: any) => item.id !== itemId)
    setExpenseRequestData({
      ...expenseRequestData,
      ExpenseItem: updatedExpenseItems
    })

    if (isInSelectedItems) {
      setSelectedItemsToInitial((prev: any[]) => prev.filter((item: any) => item.id !== itemId))
    }

    const isAlreadyDeleted = deletedItems.some((item: any) => item.id === itemId)
    if (!isAlreadyDeleted) {
      setDeletedItems([...deletedItems, deletedItem])
    }

    if (showSelectItems) {
      isPageChangeRef.current = true
      fetchSelectItems()
    }
  }

  const toggleSelectItemsView = () => {
    const newShowSelectItems = !showSelectItems
    setShowSelectItems(newShowSelectItems)

    if (newShowSelectItems) {
      setCurrentPage(1)
      setSelectedItemIdsForSelection([])
      const event = new CustomEvent('expense-wizard-update-footer', {
        detail: {
          showCustomFooter: true,
          selectedItemCount: 0
        }
      })
      document.dispatchEvent(event)
    } else {
      const event = new CustomEvent('expense-wizard-update-footer', {
        detail: { showCustomFooter: false }
      })
      document.dispatchEvent(event)
    }
  }

  const handleConfirmSelection = useCallback(() => {
    if (selectedItemIdsForSelection.length > 0) {
      const selectedItems = selectItemsList
        .filter((item: any) => selectedItemIdsForSelection.includes(item.id))
        .map((item: any) => ({
          ...item,
          isManuallySelected: true
        }))

      const currentItems = expenseRequestData?.ExpenseItem || []
      const mergedByIdMap = new Map<string, any>()
      for (const singleItem of currentItems) {
        if (singleItem?.id) mergedByIdMap.set(singleItem.id, singleItem)
      }
      for (const singleItem of selectedItems) {
        if (singleItem?.id) mergedByIdMap.set(singleItem.id, singleItem)
      }
      const updatedItems = Array.from(mergedByIdMap.values())
      setExpenseRequestData({
        ...expenseRequestData,
        ExpenseItem: updatedItems
      })

      setSelectedItemsToInitial((prev: any[]) => {
        const map = new Map<string, any>()
        for (const it of prev) {
          if (it?.id) map.set(it.id, it)
        }
        for (const it of selectedItems) {
          if (it?.id) map.set(it.id, it)
        }
        return Array.from(map.values())
      })

      setDeletedItems(deletedItems.filter((item: any) => !selectedItemIdsForSelection.includes(item.id)))
      setSelectedItemIdsForSelection([])
    }

    setSearchQuery('')
    setCurrentPage(1)
    setShowSelectItems(false)

    const footerEvent = new CustomEvent('expense-wizard-update-footer', {
      detail: { showCustomFooter: false }
    })
    document.dispatchEvent(footerEvent)
  }, [expenseRequestData, selectItemsList, selectedItemIdsForSelection])

  const handleCancelSelection = useCallback(() => {
    setSelectedItemIdsForSelection([])

    setSearchQuery('')
    setCurrentPage(1)
    setShowSelectItems(false)

    const footerEvent = new CustomEvent('expense-wizard-update-footer', {
      detail: { showCustomFooter: false }
    })
    document.dispatchEvent(footerEvent)
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handlePageChange = useCallback((page: number) => {
    isPageChangeRef.current = true
    setCurrentPage(page)
  }, [])

  const paginatedInitialItems = useMemo(() => {
    const startIndex = (initialCurrentPage - 1) * itemListLimit
    const endIndex = startIndex + itemListLimit
    return expenseItems.slice(startIndex, endIndex)
  }, [expenseItems, initialCurrentPage, itemListLimit])

  // When current page is empty after deleting items (e.g. were on page 2, deleted all on page 2),
  // go to last valid page so the user sees remaining items instead of a blank page.
  const lastValidInitialPage = useMemo(
    () =>
      expenseItems.length > 0 && itemListLimit > 0 ? Math.max(1, Math.ceil(expenseItems.length / itemListLimit)) : 1,
    [expenseItems.length, itemListLimit]
  )
  useEffect(() => {
    if (expenseItems.length > 0 && initialCurrentPage > lastValidInitialPage) {
      setInitialCurrentPage(lastValidInitialPage)
    }
  }, [expenseItems.length, initialCurrentPage, lastValidInitialPage])

  /**
   * Extracts valid item IDs from payload
   */
  const extractPayloadItemIds = (additionalData: any): string[] => {
    if (
      !additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems ||
      additionalData.psi_taskPayload.psi_initialParameters.expenseItems.length === 0
    ) {
      return []
    }

    return additionalData.psi_taskPayload.psi_initialParameters.expenseItems
      .filter((item: any) => item.itemId)
      .map((item: any) => item.itemId)
  }

  /**
   * Determines the currency to use for items
   */
  const determineItemCurrency = (currentCurrency: string, expenseRequestData: any, additionalData: any): string => {
    // Use current currency if available
    if (currentCurrency) return currentCurrency

    // Try expense request currency
    if (expenseRequestData?.ExpenseRequestByPk?.currencyRef) {
      return expenseRequestData.ExpenseRequestByPk.currencyRef
    }

    // Try first expense item currency
    if (expenseRequestData?.ExpenseItem?.length > 0) {
      return expenseRequestData.ExpenseItem[0].currencyRef
    }

    // Try payload currency
    if (additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItems?.length > 0) {
      const itemWithCurrency = additionalData.psi_taskPayload.psi_initialParameters.expenseItems.find(
        (item: any) => item.itemId && item.currencyId
      )
      return itemWithCurrency?.currencyId || ''
    }

    return ''
  }

  /**
   * Fetches and adds new items from payload
   */
  const fetchAndAddPayloadItems = async (newItemIds: string[], itemCurrency: string): Promise<void> => {
    const userLocale = getCurrentActiveUserLocale()
    const variables = {
      employeeId,
      status: REQUEST_STATUS.CREATED,
      activeUserLocale: userLocale,
      idsArray: newItemIds,
      itemCurrency: itemCurrency
    }

    const response = await graphQLClient.request(fetchEmployeeExpenseItemsFromPayload, variables)
    const payloadItems = response?.ExpenseItemEmployee || []

    if (payloadItems.length === 0) return

    const itemsToAdd = payloadItems.map((item: any) => ({ ...item }))
    const currentItems = expenseRequestData?.ExpenseItem || []
    const updatedItems = [...currentItems, ...itemsToAdd]

    setExpenseRequestData({
      ...expenseRequestData,
      ExpenseItem: updatedItems
    })

    setSelectedItemsToInitial((prev: any[]) => [...prev, ...itemsToAdd])
    setPayloadItemsLoaded(true)
  }

  useEffect(() => {
    const fetchItemsFromPayload = async () => {
      // Early returns for invalid states
      if (payloadItemsLoaded || !expenseRequestData) return

      const extractedPayloadItemIds = extractPayloadItemIds(additionalData)
      if (extractedPayloadItemIds.length === 0) return

      try {
        setIsLoading(true)
        setPayloadItemIds(extractedPayloadItemIds)

        // Filter out items that already exist
        const existingItemIds = expenseRequestData?.ExpenseItem?.map((item: any) => item.id) || []
        const newItemIds = extractedPayloadItemIds.filter((id: string) => !existingItemIds.includes(id))

        if (newItemIds.length === 0) return

        // Determine currency and fetch items
        const itemCurrency = determineItemCurrency(currentCurrency ?? '', expenseRequestData, additionalData)
        await fetchAndAddPayloadItems(newItemIds, itemCurrency)
      } catch {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:modify_expense_request.error_fetch_items_payload',
            'Error fetching items from payload'
          ),
          'error'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchItemsFromPayload()
  }, [additionalData, employeeId, graphQLClient, expenseRequestData, setExpenseRequestData, currentCurrency])

  const handleNextItems = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createItemsScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        currentCurrency || expenseItems[0]?.currencyRef || '',
        expenseItems,
        expenseRequestData,
        EVENTS.NEXT
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.NEXT, logObject)
    }
  }, [expenseRequestData, employeeRuleId, currentTitle, currentCurrency, expenseItems])

  const handleSaveItems = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createItemsScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        currentCurrency || expenseItems[0]?.currencyRef || '',
        expenseItems,
        expenseRequestData,
        EVENTS.SAVE
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject)
    }
  }, [expenseRequestData, employeeRuleId, currentTitle, currentCurrency, expenseItems])

  const { showCreateItem } = useExpenseRequestWizardContext()

  const handleCreateItem = useCallback(() => {
    showCreateItem()
  }, [showCreateItem])

  useEffect(() => {
    document.addEventListener('expense-items-cancel-selection', handleCancelSelection)
    document.addEventListener('expense-items-confirm-selection', handleConfirmSelection)
    document.addEventListener('expense-request-next-items', handleNextItems)
    document.addEventListener('expense-request-save-items', handleSaveItems)
    // Reset selection/search/page/showSelectItems on external reset
    const handleReset = () => {
      setSelectedItemIdsForSelection([])
      setSearchQuery('')
      setCurrentPage(1)
      setShowSelectItems(false)
    }
    document.addEventListener('expense-items-reset-selection', handleReset)

    return () => {
      document.removeEventListener('expense-items-cancel-selection', handleCancelSelection)
      document.removeEventListener('expense-items-confirm-selection', handleConfirmSelection)
      document.removeEventListener('expense-request-next-items', handleNextItems)
      document.removeEventListener('expense-request-save-items', handleSaveItems)
      document.removeEventListener('expense-items-reset-selection', handleReset)
    }
  }, [handleCancelSelection, handleConfirmSelection, handleNextItems, handleSaveItems])

  useEffect(() => {
    if (showSelectItems) {
      const event = new CustomEvent('expense-wizard-update-footer', {
        detail: {
          showCustomFooter: true,
          selectedItemCount: selectedItemIdsForSelection.length
        }
      })
      document.dispatchEvent(event)
    }
  }, [selectedItemIdsForSelection, showSelectItems])

  const prevSearchQueryRef = React.useRef('')
  const isPageChangeRef = React.useRef(false)

  useEffect(() => {
    if (showSelectItems) {
      if (searchQuery !== prevSearchQueryRef.current && !isPageChangeRef.current) {
        setCurrentPage(1)
      }
      prevSearchQueryRef.current = searchQuery
      isPageChangeRef.current = false

      fetchSelectItems()
    }
  }, [searchQuery, currentPage, showSelectItems])

  const toggleItemSelection = (itemId: string) => {
    if (selectedItemIdsForSelection.includes(itemId)) {
      setSelectedItemIdsForSelection((prevSelected: string[]) => prevSelected.filter((id: string) => id !== itemId))
    } else {
      setSelectedItemIdsForSelection((prevSelected: string[]) => [...prevSelected, itemId])
    }
  }

  const handleInitialPageChange = (page: number) => {
    setInitialCurrentPage(page)
  }

  /**
   * Returns the default total display when no expense totals are available
   */
  const getDefaultTotalDisplay = (): string => {
    if (expenseRequestData?.ExpenseRequestByPk && expenseRequestData.ExpenseRequestByPk.currency) {
      return `0.00 ${expenseRequestData.ExpenseRequestByPk.currency.code}`
    }
    return `0.00 ${DEFAULT_CURRENCY_FALLBACK}`
  }

  if (showSelectItems) {
    return (
      <div data-testid="expense-request-wizard-select-items-screen" style={{ flexGrow: 1 }}>
        <div
          className="gba:flex gba:justify-between gba:items-center gba:mb-4"
          data-testid="expense-request-wizard-select-items-header"
        >
          <SearchBarWithLabel
            onSearch={handleSearch}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:modify_expense_request.expense_header_title',
              'My Expense Items'
            )}
            label={
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:modify_expense_request.search_module',
                'Search In Expense Items List'
              ) + ` (${totalItems})`
            }
            data-testid="expense-request-wizard-search-bar"
          />
        </div>

        <div
          className="gba:bg-muted gba:border-t gba:border-b gba:border-muted gba:py-2 gba:px-2"
          data-testid="expense-request-wizard-select-items-content"
        >
          {isLoading ? (
            <div className="gba:text-center gba:p-8 gba:bg-muted" data-testid="loading-message">
              {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.loading_text', 'Loading items...')}
            </div>
          ) : selectItemsList.length > 0 ? (
            <>
              <div className="gba:grid gba:grid-cols-1 gba:gap-4" data-testid="selectable-items-list">
                {selectItemsList.map((item: any) => {
                  const formattedItem = formatArrayOfItems([item])[0]
                  return (
                    <div
                      key={item.id}
                      className="gba:cursor-pointer gba:hover:bg-gray-50"
                      style={{
                        border: selectedItemIdsForSelection.includes(item.id) ? '4px solid black' : 'none'
                      }}
                      onClick={() => toggleItemSelection(item.id)}
                      data-testid={`select-item-${item.id}`}
                    >
                      <ExpenseItemCard
                        key={item.id}
                        id={item.id}
                        title={formattedItem.title}
                        expenseGroup={formattedItem.expenseGroup}
                        expenseType={formattedItem.expenseType}
                        costCenter={formattedItem.costCenter}
                        amount={formattedItem.amount}
                        currency={formattedItem.currency}
                        attachmentDate={formattedItem.attachmentDate}
                      />
                    </div>
                  )
                })}
              </div>
              {totalItems > itemListLimit && (
                <div
                  className="gba:flex gba:justify-center gba:py-2 gba:mt-4 gba:flex gba:justify-center"
                  data-testid="expense-items-pagination-container"
                >
                  <Pagination
                    current={currentPage}
                    onChange={handlePageChange}
                    total={totalItems}
                    pageSize={itemListLimit}
                    showSizeChanger={false}
                    data-testid="expense-items-pagination"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="gba:text-center gba:p-8 gba:bg-muted" data-testid="no-items-message">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:modify_expense_request.no_items_to_select',
                'No expense items available to select'
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:flex-col"
      style={{ flexGrow: 1, height: '100%' }}
      data-testid="expense-request-wizard-items-screen"
    >
      {!isTrip && latestRejectComment && (
        <div className="gba:mb-4">
          <RejectionComment isRequest={true} comment={latestRejectComment} />
        </div>
      )}
      {expenseItems.length > 0 && (
        <div className="gba:flex gba:flex-row gba:justify-between gba:items-center gba:mb-4 gba:px-4">
          <div
            className="gba:m-0 gba:text-[16px] gba:font-bold"
            data-testid="expense-request-wizard-items-screen-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_overview.expense_items.expense_items_title',
              'Expense Items'
            )}
            {expenseItems.length > 0 && ` (${expenseItems.length})`}
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="secondary"
              icon={<img src={ICONS.ADD_CIRCLE} alt="Add" className="gba:w-4 gba:h-4" />}
              className="gba:flex gba:items-center gba:gap-1 gba:bg-border gba:rounded-full gba:font-semibold"
              data-testid="add-item-button"
              onClick={toggleSelectItemsView}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.add_items_text', 'Add Items')}
            </Button>
            <Button
              variant="secondary"
              icon={<img src={ICONS.FOCUS} alt="Create" className="gba:w-4 gba:h-4" />}
              className="gba:flex gba:items-center gba:gap-1 gba:bg-border gba:rounded-full gba:font-semibold"
              data-testid="create-item-button"
              onClick={handleCreateItem}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.create_item', 'Create Item')}
            </Button>
          </div>
        </div>
      )}

      <div
        className="gba:bg-muted gba:flex gba:flex-col gba:flex-grow gba:border-t gba:border-b gba:border-muted"
        data-testid="expense-request-wizard-items-screen-content"
        style={{ flex: '1 1 auto', minHeight: expenseItems.length === 0 ? '50vh' : 'auto' }}
      >
        {expenseItems.length > 0 ? (
          <div className="gba:py-2 gba:px-2 gba:flex gba:flex-col gba:flex-grow">
            <div className="gba:flex gba:flex-col gba:gap-2">
              {paginatedInitialItems.map(item => {
                const formattedItem = formatArrayOfItems([item])[0]
                return (
                  <ExpenseItemCard
                    key={item.id}
                    id={item.id}
                    title={formattedItem.title}
                    expenseGroup={formattedItem.expenseGroup}
                    expenseType={formattedItem.expenseType}
                    costCenter={formattedItem.costCenter}
                    amount={formattedItem.amount}
                    currency={formattedItem.currency}
                    attachmentDate={formattedItem.attachmentDate}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                )
              })}
            </div>

            {expenseItems.length > itemListLimit && (
              <div
                className="gba:flex gba:justify-center gba:py-2 gba:mt-4 gba:flex gba:justify-center"
                data-testid="expense-items-initial-pagination-container"
              >
                <Pagination
                  current={initialCurrentPage}
                  onChange={handleInitialPageChange}
                  total={expenseItems.length}
                  pageSize={itemListLimit}
                  showSizeChanger={false}
                  data-testid="expense-items-initial-pagination"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:bg-muted gba:gap-8"
            data-testid="empty-items-container"
            style={{
              flex: '1 1 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <Button
              variant="ghost"
              icon={<img src={ICONS.ADD_CIRCLE} alt="Add" style={{ width: '50px', height: '50px' }} />}
              className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:p-6"
              style={{
                height: 'auto',
                width: 'auto',
                padding: '0px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '24px',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none'
              }}
              data-testid="empty-add-item-button"
              onClick={toggleSelectItemsView}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.add_items_text', 'Add Item')}
            </Button>
            <Button
              variant="ghost"
              icon={<img src={ICONS.FOCUS} alt="Create" style={{ width: '50px', height: '50px' }} />}
              className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:p-6"
              style={{
                height: 'auto',
                width: 'auto',
                padding: '0px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '24px',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none'
              }}
              data-testid="empty-create-item-button"
              onClick={handleCreateItem}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.create_item', 'Create Item')}
            </Button>
          </div>
        )}
      </div>

      {/* Expense Total Display */}
      <div className="gba:mt-8 gba:mb-4 gba:px-4" data-testid="expense-items-total-container">
        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:text-base gba:font-normal">
            {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.expense_items_sum', 'Expenses')}
          </span>
          <div className="gba:flex gba:flex-col gba:items-end">
            {expenseTotals.length > 0 ? (
              expenseTotals.map((total, index) => (
                <span
                  key={`total-${index}`}
                  className="gba:text-3xl gba:font-bold"
                  data-testid={`expense-items-total-${total.currency}`}
                >
                  {total.amount.toFixed(2)} {total.currency}
                </span>
              ))
            ) : (
              <span className="gba:text-3xl gba:font-bold" data-testid="expense-items-total-default">
                {getDefaultTotalDisplay()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemsScreen
