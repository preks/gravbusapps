import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Typography, Pagination } from 'antd'
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale, getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useExpenseRequestWizardTranslation } from '../useExpenseRequestWizardTranslation'
import { resolvePrimaryEmployeePosition } from '../../expense-request/utils/resolvePrimaryEmployeePosition'
import { BusinessAppContextProps } from '@/business-apps/types'
import AllowanceContainer from '../components/AllowanceContainer'
import { CostCenter } from '../utils/types'
import {
  getTravelRegionsAndUser,
  getUserCostCenters,
  getUserProjects,
  getAllowanceData
} from '../ExpenseRequestWizardQueries'
import {
  DEDUCTIONS_TYPES_ENUM,
  DEDUCTIONS_TYPES_ENUM_V2,
  DEDUCTION_KEYS,
  DEFAULT_ITEM_LIST_LIMIT
} from '../constants/constants'
import { getAllowanceItemsFunction } from '../utils/itemsScreenUtils'
import { processAllowanceDataRow } from '../utils/allowanceScreenRowProcessing'
import { toSortedCacheKey } from '../utils/cacheKeyUtils'
import { createAllowanceScreenLogObject } from '../utils/allowanceScreenUtils'
import { EVENTS } from '../../../utils/constants'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { showToast } from '../../../utils/notificationUtils'
import { resolveEffectiveCostCenterId, resolveManualMainCostCenterId } from '../../shared/utils/effectiveCostCenter'

const { Title } = Typography

/**
 * AllowanceScreen component props
 */
interface AllowanceScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

/**
 * AllowanceScreen component for expense request wizard
 * @param props - Component props
 * @returns AllowanceScreen component
 */
const AllowanceScreen: React.FC<AllowanceScreenProps> = props => {
  const { accessToken, userInfo, additionalData } = props
  const { t } = useExpenseRequestWizardTranslation()
  const graphQLClient = useGraphqlClient(accessToken)
  const { employeeRuleId, expenseRequestData, currentTitle, updateTripFormValidation } =
    useExpenseRequestWizardContext()

  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(props.additionalData)

  /** Session cache for repeated lookups (cost centers, projects, allowance data, regions) */
  const queryCacheRef = useRef(new Map<string, any>())
  /**
   * Cache helper that also deduplicates in-flight requests.
   * Important for React 18 StrictMode/dev where effects may run twice.
   */
  const getCachedOrFetch = useCallback((key: string, fetchFn: () => Promise<any>): Promise<any> => {
    const cache = queryCacheRef.current
    if (cache.has(key)) {
      return Promise.resolve(cache.get(key))
    }

    const inFlight = fetchFn()
      .then(result => {
        cache.set(key, result)
        return result
      })
      .catch(err => {
        // Don't keep failed results cached; allow retry on next call
        cache.delete(key)
        throw err
      })

    // Store promise immediately so concurrent callers share it
    cache.set(key, inFlight)
    return inFlight
  }, [])

  const [, setTravelRegionsData] = useState<any>(null)
  const [, setCostCentersData] = useState<any>(null)
  const [deductionsData, setDeductionsData] = useState<any[]>([])
  const [visibleDeductionKeys, setVisibleDeductionKeys] = useState<string[]>([])
  const [hasDeductions, setHasDeductions] = useState<boolean>(false)
  const [defaultCostCenter, setDefaultCostCenter] = useState<string>('')
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [listDataArray, setListDataArray] = useState<any[]>([])
  const [collapsedStates, setCollapsedStates] = useState<Record<number, boolean>>({})
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [structureIdArray, setStructureIdArray] = useState<string[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const itemListLimit = DEFAULT_ITEM_LIST_LIMIT

  useEffect(() => {
    const fetchTravelRegionsAndCostCenters = async () => {
      if (!accessToken?.trim() || !employeeRuleId) return

      try {
        const employeeIdValue = userInfo?.employeeDetails?.employeeId
        const locale = getCurrentActiveUserLocale()
        const travelRegionsCacheKey = `travelRegionsAndUser:${employeeRuleId}:${employeeIdValue ?? 'no-employee'}:${locale}`
        const travelRegionsResponse = await getCachedOrFetch(travelRegionsCacheKey, () =>
          graphQLClient.request(getTravelRegionsAndUser, {
            expenseRuleId: employeeRuleId,
            employeeId: employeeIdValue,
            activeUserLocale: locale
          })
        )
        setTravelRegionsData(travelRegionsResponse)
        const positions = travelRegionsResponse?.EmployeePosition ?? []
        const requestData = expenseRequestData?.ExpenseRequestByPk
        const primaryPosition = resolvePrimaryEmployeePosition(positions, getCurrentActiveStructureId())
        const structureId = primaryPosition?.structureId ?? positions[0]?.structureId ?? getCurrentActiveStructureId()
        const savedRequestCostCenterId =
          resolveManualMainCostCenterId(requestData?.additionalProperties) || requestData?.costCenterId || ''
        const defaultAllowanceCostCenterId = savedRequestCostCenterId || resolveEffectiveCostCenterId(positions)

        if (positions.length > 0 && structureId) {
          const costCentersCacheKey = `userCostCenters:${structureId}`
          const costCentersResponse = await getCachedOrFetch(costCentersCacheKey, () =>
            graphQLClient.request(getUserCostCenters, { structureId })
          )

          setCostCentersData(costCentersResponse)

          if (costCentersResponse?.userCostCenters && costCentersResponse.userCostCenters.length > 0) {
            if (defaultAllowanceCostCenterId) {
              setDefaultCostCenter(defaultAllowanceCostCenterId)
            }
            const formattedCostCenters = costCentersResponse.userCostCenters.map((cc: any) => ({
              id: cc.id || cc,
              name: cc.name || '',
              structureId: cc.structureId || ''
            }))
            setCostCenters(formattedCostCenters)
          }
        }
      } catch {
        showToast(t('wizard-error-fetch-regions-cost-centers'), 'error')
      }
    }

    fetchTravelRegionsAndCostCenters()
  }, [
    accessToken,
    employeeRuleId,
    expenseRequestData?.ExpenseRequestByPk?.additionalProperties,
    expenseRequestData?.ExpenseRequestByPk?.costCenterId,
    graphQLClient,
    getCachedOrFetch,
    userInfo?.employeeDetails?.employeeId
  ])

  useEffect(() => {
    const fetchAllowanceData = async () => {
      if (!accessToken?.trim() || !expenseRequestData?.ExpenseRequestByPk) return
      try {
        const employeeIdValue = userInfo?.employeeDetails?.employeeId
        const expenseRequestId = additionalData?.psi_taskPayload?.expenseRequest?.id
        const ruleId = expenseRequestData?.ExpenseRequestByPk?.expenseRuleId
        const requestVersion = expenseRequestData?.ExpenseRequestByPk?.version ?? 0
        const locale = getCurrentActiveUserLocale()
        // Invalidate automatically when request version changes (after save/next updates)
        const allowanceCacheKey = `allowanceData:${employeeIdValue ?? 'no-employee'}:${expenseRequestId ?? 'no-request'}:${ruleId ?? 'no-rule'}:${requestVersion}:${locale}`
        const response = await getCachedOrFetch(allowanceCacheKey, () =>
          graphQLClient.request(getAllowanceData, {
            employeeId: employeeIdValue,
            expenseRequestId,
            expenseRequestRuleId: ruleId
          })
        )
        const setup = Array.isArray(response?.ExpenseRuleAllowanceSetup) ? response.ExpenseRuleAllowanceSetup : []
        const issues = new Set<string>(setup.map((s: any) => s.issue).filter(Boolean))
        const keys: string[] = []
        if (issues.has(DEDUCTIONS_TYPES_ENUM.BREAKFAST) || issues.has(DEDUCTIONS_TYPES_ENUM_V2.BREAKFAST))
          keys.push(DEDUCTION_KEYS.BREAKFAST)
        if (issues.has(DEDUCTIONS_TYPES_ENUM.LUNCH) || issues.has(DEDUCTIONS_TYPES_ENUM_V2.LUNCH))
          keys.push(DEDUCTION_KEYS.LUNCH)
        if (issues.has(DEDUCTIONS_TYPES_ENUM.DINNER) || issues.has(DEDUCTIONS_TYPES_ENUM_V2.DINNER))
          keys.push(DEDUCTION_KEYS.DINNER)
        if (issues.has(DEDUCTIONS_TYPES_ENUM.OVERNIGHT) || issues.has(DEDUCTIONS_TYPES_ENUM_V2.OVERNIGHT))
          keys.push(DEDUCTION_KEYS.OVERNIGHT)
        setVisibleDeductionKeys(keys)
        if (keys.length === 0) {
          setDeductionsData([])
        } else {
          setDeductionsData(response.TravelBreakdown || [])
        }
      } catch {
        showToast(t('wizard-error-fetch-regions-cost-centers'), 'error')
      }
    }
    fetchAllowanceData()
  }, [
    accessToken,
    expenseRequestData,
    graphQLClient,
    getCachedOrFetch,
    userInfo?.employeeDetails?.employeeId,
    additionalData
  ])
  useEffect(() => {
    // Determine if deductions exist
    const anyDeductions = Array.isArray(deductionsData) && deductionsData.length > 0
    setHasDeductions(anyDeductions)
  }, [deductionsData])

  useEffect(() => {
    if (!expenseRequestData?.ExpenseRequestByPk) return

    const requestProject = expenseRequestData.ExpenseRequestByPk
    const allowanceData = getAllowanceItemsFunction(expenseRequestData.ExpenseItem)
    const tripData = requestProject.ExpenseItem?.expenseRequestTrip || []

    const getDeductionForDate = (date: string) => {
      const match = (deductionsData || []).find((d: any) => d.expenseDate === date)
      return match
        ? {
            id: match.id,
            version: match.version,
            deductionDay: null,
            breakfast: match.breakfast,
            lunch: match.lunch,
            dinner: match.dinner,
            overnight: match.overnight
          }
        : null
    }

    const getDeductionByDate = (date: string) => {
      return (arrDeductions || []).find((d: any) => d.expenseDate === date) || null
    }

    const arrDeductions = (allowanceData || [])
      .map((item: any) => {
        const deduction = getDeductionForDate(item.expenseDate)
        return deduction
          ? {
              expenseDate: item.expenseDate,
              ...deduction
            }
          : null
      })
      .filter(Boolean) as any[]

    const processedData = allowanceData
      .map(element =>
        processAllowanceDataRow(element, {
          requestProject,
          tripData,
          defaultCostCenter,
          hasDeductions,
          getDeductionByDate,
          visibleDeductionKeys
        })
      )
      .sort((a: any, b: any) => {
        const positionA = a.itemOrder ?? 0
        const positionB = b.itemOrder ?? 0
        return positionA - positionB
      })
    setListDataArray(processedData)

    const initialCollapsedStates: Record<number, boolean> = {}
    processedData.forEach((_, index) => {
      initialCollapsedStates[index] = false
    })
    setCollapsedStates(initialCollapsedStates)

    if (costCenters.length > 0) {
      updateStructureIdArrayFromListData(processedData)
    }
  }, [expenseRequestData, defaultCostCenter, deductionsData, hasDeductions, visibleDeductionKeys])

  const handleToggleCollapse = (index: number) => {
    setCollapsedStates(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }
  const fetchProjects = async (structureIds: string[]) => {
    if (!accessToken?.trim() || !structureIds.length) {
      setProjects([])
      return
    }

    try {
      const normalized = toSortedCacheKey(structureIds, ',')
      const projectsCacheKey = `userProjects:${normalized}`
      const projectsResponse = await getCachedOrFetch(projectsCacheKey, () =>
        graphQLClient.request(getUserProjects, {
          structureIdArray: structureIds
        })
      )

      if (projectsResponse?.Project) {
        setProjects(projectsResponse.Project)
      }
    } catch {
      showToast(t('wizard-error-fetch-projects'), 'error')
    }
  }
  useEffect(() => {
    if (structureIdArray.length > 0) {
      fetchProjects(structureIdArray)
    }
  }, [accessToken, structureIdArray])

  useEffect(() => {
    if (costCenters.length > 0 && listDataArray.length > 0) {
      updateStructureIdArrayFromListData(listDataArray)
    }
  }, [costCenters, listDataArray])

  const handleCostCenterChange = (index: number, value: string | undefined) => {
    setListDataArray(prev => {
      const newArray = [...prev]
      newArray[index] = {
        ...newArray[index],
        costCenterId: value || undefined,
        projectId: undefined // Clear project when cost center changes
      }
      const updatedArray = [...newArray]
      setTimeout(() => {
        updateStructureIdArrayFromListData(updatedArray)
      }, 0)

      return newArray
    })
  }

  const handleProjectChange = (index: number, value: string | undefined) => {
    setListDataArray(prev => {
      const newArray = [...prev]
      newArray[index] = {
        ...newArray[index],
        projectId: value || undefined
      }
      return newArray
    })
  }

  const handleDeductionsChange = (index: number, deductions: string[]) => {
    setListDataArray(prev => {
      const newArray = [...prev]
      const current = { ...newArray[index] }

      // Update string list for compatibility
      current.deductions = deductions

      // Ensure deductionDay exists when toggling
      if (!current.deductionDay) {
        current.deductionDay = {
          id: null,
          version: 0,
          breakfast: false,
          lunch: false,
          dinner: false,
          overnight: false
        }
      }

      const setFromList = (key: 'breakfast' | 'lunch' | 'dinner' | 'overnight') => {
        current.deductionDay[key] = deductions.includes(key)
      }
      setFromList('breakfast')
      setFromList('lunch')
      setFromList('dinner')
      setFromList('overnight')

      newArray[index] = current
      return newArray
    })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  const totalItems = listDataArray.length
  const startIndex = (currentPage - 1) * itemListLimit
  const endIndex = Math.min(startIndex + itemListLimit, totalItems)
  const paginatedItems = listDataArray.slice(startIndex, endIndex)

  const updateStructureIdArrayFromListData = (dataArray: any[]) => {
    const structureIds: string[] = []

    dataArray.forEach(item => {
      if (item.costCenterId) {
        const costCenter = costCenters.find(cc => cc.id === item.costCenterId)
        if (costCenter?.structureId && !structureIds.includes(costCenter.structureId)) {
          structureIds.push(costCenter.structureId)
        }
      }
    })

    if (structureIds.length > 0) {
      setStructureIdArray(structureIds)
    }
  }

  // Check if all allowance items have a cost center selected
  const isFormValid = useMemo(() => {
    return listDataArray.every(item => item.costCenterId)
  }, [listDataArray])

  // Update the wizard context with the form validation state
  useEffect(() => {
    updateTripFormValidation(isFormValid)
  }, [isFormValid, updateTripFormValidation])

  // Set up event listeners for save and next actions from the wizard footer
  useEffect(() => {
    // Save event handler
    const handleSaveEvent = () => {
      if (expenseRequestData?.ExpenseRequestByPk) {
        const logObject = createAllowanceScreenLogObject(
          expenseRequestData.ExpenseRequestByPk,
          employeeRuleId,
          currentTitle,
          listDataArray,
          expenseRequestData,
          deductionsData,
          EVENTS.SAVE
        )
        dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject)
      }
    }

    // Next event handler
    const handleNextEvent = () => {
      if (expenseRequestData?.ExpenseRequestByPk) {
        const logObject = createAllowanceScreenLogObject(
          expenseRequestData.ExpenseRequestByPk,
          employeeRuleId,
          currentTitle,
          listDataArray,
          expenseRequestData,
          deductionsData,
          EVENTS.NEXT
        )
        dispatchProcessContinueEventIfEnabled(EVENTS.NEXT, logObject)
      }
    }

    // Add event listeners
    document.addEventListener('expense-request-save-allowance', handleSaveEvent)
    document.addEventListener('expense-request-next-allowance', handleNextEvent)

    // Clean up event listeners
    return () => {
      document.removeEventListener('expense-request-save-allowance', handleSaveEvent)
      document.removeEventListener('expense-request-next-allowance', handleNextEvent)
    }
  }, [expenseRequestData, employeeRuleId, currentTitle, listDataArray])

  return (
    <div className="gba:flex gba:flex-col gba:w-[100%] gba:px-4" data-testid="expense-request-wizard-allowance-screen">
      {listDataArray.length === 0 ? (
        <Title
          level={4}
          className="gba:text-center gba:text-2xl gba:font-medium gba:pt-6"
          data-testid="expense-request-wizard-allowance-screen-title"
        >
          {t('wizard-no-allowances-text')}
        </Title>
      ) : (
        <>
          <div
            className="gba:flex gba:flex-col gba:w-[100%] gba:gap-6 gba:mt-4"
            data-testid="expense-request-wizard-allowance-list"
          >
            {paginatedItems.map((item, index) => (
              <AllowanceContainer
                key={`allowance-${startIndex + index}`}
                item={item}
                index={startIndex + index}
                isCollapsed={collapsedStates[startIndex + index] || false}
                onToggleCollapse={() => handleToggleCollapse(startIndex + index)}
                costCenters={costCenters}
                onCostCenterChange={handleCostCenterChange}
                projects={projects}
                onProjectChange={handleProjectChange}
                onDeductionsChange={handleDeductionsChange}
                hasDeductions={hasDeductions && visibleDeductionKeys.length > 0}
                visibleDeductionKeys={visibleDeductionKeys}
              />
            ))}
          </div>

          {totalItems > itemListLimit && (
            <div className="gba:mt-4 gba:flex gba:justify-center" data-testid="expense-allowance-pagination-container">
              <Pagination
                current={currentPage}
                onChange={handlePageChange}
                total={totalItems}
                pageSize={itemListLimit}
                showSizeChanger={false}
                data-testid="expense-allowance-pagination"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AllowanceScreen
