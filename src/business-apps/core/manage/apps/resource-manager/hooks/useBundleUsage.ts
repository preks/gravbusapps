import { useState, useCallback, useEffect, useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { urlPathToScreenKey, getScreenKeyCategory } from '../utils/componentKeyUtils'

const BATCH_SIZE = 100

export interface BundleUsageResult {
  screens: NavigationDTO[]
  actionItems: ActionDTO[]
  taskItems: ActionDTO[]
  isLoading: boolean
  error: string | null
}

/**
 * Loads usage data (navigations/screens, actions, tasks) for a given set of screen keys.
 * Call with non-null screenKeys when a bundle is expanded; returns filtered lists.
 */
export function useBundleUsage(context: BusinessAppContextProps, screenKeys: string[] | null): BundleUsageResult {
  const [screens, setScreens] = useState<NavigationDTO[]>([])
  const [actionItems, setActionItems] = useState<ActionDTO[]>([])
  const [taskItems, setTaskItems] = useState<ActionDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const loadUsage = useCallback(
    async (keys: string[]) => {
      if (!context.accessToken || keys.length === 0) {
        setScreens([])
        setActionItems([])
        setTaskItems([])
        setIsLoading(false)
        return
      }

      const keySet = new Set(keys)
      setIsLoading(true)
      setError(null)

      try {
        const navAccumulated: NavigationDTO[] = []
        let navOffset = 0
        let navTotal = BATCH_SIZE

        while (navOffset < navTotal) {
          const result = await resourceClient.navigation.getNavigations({
            limit: BATCH_SIZE,
            offset: navOffset
          })
          const data = result?.data ?? []
          navTotal = result?.totalCount ?? data.length
          for (const nav of data) {
            const key = urlPathToScreenKey(nav.url?.replace(/^\//, '') ?? '')
            if (keySet.has(key) && getScreenKeyCategory(key) === 'screen') {
              navAccumulated.push(nav)
            }
          }
          navOffset += data.length
          if (data.length < BATCH_SIZE) break
        }
        setScreens(navAccumulated)

        const actionAccumulated: ActionDTO[] = []
        const taskAccumulated: ActionDTO[] = []
        let actionOffset = 0
        let actionTotal = BATCH_SIZE

        while (actionOffset < actionTotal) {
          const response = await resourceClient.action.getActions({
            limit: BATCH_SIZE,
            offset: actionOffset,
            returnTotalRecords: true
          })
          const data = response?.data ?? []
          actionTotal = response?.paging?.totalRecords ?? data.length
          for (const a of data) {
            const desktop = a.targetDesktop?.trim()
            const mobile = a.targetMobile?.trim()
            const catDesktop = desktop ? getScreenKeyCategory(desktop) : null
            const catMobile = mobile ? getScreenKeyCategory(mobile) : null
            const matchesAction =
              (desktop && keySet.has(desktop) && catDesktop === 'action') ||
              (mobile && keySet.has(mobile) && catMobile === 'action')
            const matchesTask =
              (desktop && keySet.has(desktop) && catDesktop === 'task') ||
              (mobile && keySet.has(mobile) && catMobile === 'task')
            if (matchesAction) actionAccumulated.push(a)
            if (matchesTask) taskAccumulated.push(a)
          }
          actionOffset += data.length
          if (data.length < BATCH_SIZE) break
        }
        setActionItems(actionAccumulated)
        setTaskItems(taskAccumulated)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load bundle usage'
        setError(errorMessage)
        setScreens([])
        setActionItems([])
        setTaskItems([])
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  const screenKeysKey = useMemo(
    () => (screenKeys && screenKeys.length > 0 ? [...screenKeys].sort().join(',') : ''),
    [screenKeys]
  )

  useEffect(() => {
    if (screenKeys && screenKeys.length > 0) {
      loadUsage(screenKeys)
    } else {
      setScreens([])
      setActionItems([])
      setTaskItems([])
      setError(null)
      setIsLoading(false)
    }
  }, [screenKeysKey, loadUsage])

  return {
    screens,
    actionItems,
    taskItems,
    isLoading,
    error
  }
}
