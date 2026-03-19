import { useState, useEffect, useCallback } from 'react'
import { FlowItemReduced } from '../types/FlowRegistryTypes'
import { ActionOption } from '@newwork/nw-design-system'
import { startProcess } from '../utils/start-process'
import { navigateTo } from '../utils/navigationUtils'
import { useFlowRegistryClient } from '../network/flows/useFlowRegistryClient'
import { getCurrentActiveUserLocale } from '../utils/windowUtils'

export interface ExternalContextData {
  [key: string]: any
}

interface UseFlowItemsProps {
  mainContextsData: any
  externalContextData: ExternalContextData
  isFlowButtonOrigin?: boolean
  accessToken?: string
  manualFetch?: boolean // When true, data will not be fetched automatically
}

/**
 * Hook to fetch and process flow items from the flow registry
 */
export const useFlowItems = ({
  mainContextsData,
  externalContextData,
  accessToken = '',
  manualFetch = false
}: UseFlowItemsProps) => {
  const [flowData, setFlowData] = useState<ActionOption[]>([])
  const [isLoading, setIsLoading] = useState(!manualFetch)
  const [lastFetchedContexts, setLastFetchedContexts] = useState<string>('') // Track last fetched contexts
  const flowRegistry = useFlowRegistryClient(accessToken)

  // Function that can be called manually to fetch flow items
  // Optional directContextData parameter allows passing context data directly without relying on state
  const fetchFlowItems = useCallback(
    async (directContextData?: Record<string, string>) => {
      const contextData = directContextData || mainContextsData
      if (!contextData) return

      // Create a unique key for this context combination to prevent duplicate fetches
      const contextKey = JSON.stringify({ contextData, externalContextData })
      if (contextKey === lastFetchedContexts && !directContextData) {
        return // Skip if we've already fetched for these exact contexts
      }
      setIsLoading(true)
      try {
        const contexts = Object.entries(contextData).map(([contextName, mainContextDataId]) => ({
          contextName: contextName as any,
          mainContextDataId: externalContextData?.[mainContextDataId as string] as string
        }))

        if (contexts.length === 0) return

        const response = await flowRegistry.getPermissionFlowItemsV2({
          contexts
        })

        if (response?.flowItems) {
          const mappedFlowItems = mapFlowItemsToActionOptions(response.flowItems, externalContextData)
          setFlowData(mappedFlowItems)
          setLastFetchedContexts(contextKey) // Update last fetched contexts
        }
      } catch (error) {
        console.error('Error fetching flow items:', error)
        setFlowData([])
      } finally {
        setIsLoading(false)
      }
    },
    [mainContextsData, externalContextData, flowRegistry, lastFetchedContexts]
  )

  // Only automatically fetch flow items if not in manual mode
  useEffect(() => {
    if (!manualFetch && mainContextsData) {
      fetchFlowItems()
    }
  }, [mainContextsData, manualFetch]) // Removed fetchFlowItems to avoid circular dependency

  return { flowData, fetchFlowItems, isLoading }
}

/**
 * Maps flow items from the API response to ActionOption objects for the ActionButton component
 */
const mapFlowItemsToActionOptions = (
  flowItems: FlowItemReduced[],
  externalContextData: ExternalContextData
): ActionOption[] => {
  /**
   * Formats a flow name by removing a leading bracketed prefix like "[ABC]" and trimming whitespace.
   */
  const formatFlowName = (rawName: string): string => {
    if (!rawName) return ''
    let name = String(rawName).trim()
    if (name.startsWith('[')) {
      const closingIndex = name.indexOf(']')
      if (closingIndex !== -1) {
        name = name.slice(closingIndex + 1)
      }
    }
    return name.trim()
  }

  // Prefer screen-based flows but allow ACTION flows (even EXECUTE) so destructive actions like delete work
  let allowed = flowItems.filter(fi => {
    const type = (fi.builderType || '').toUpperCase()
    const flowType = (fi.flowType || '').toUpperCase()
    if (flowType === 'NAVIGATION' || flowType === 'REPORT') return true
    // Allow all ACTION flows (SCREEN/FORM/NATIVE_SCREEN/LOWCODER/EXECUTE)
    if (flowType === 'ACTION') return true
    // Fallback: keep known UI builders
    return type === 'LOWCODER' || type === 'NATIVE_SCREEN' || type === 'SCREEN' || type === 'FORM'
  })

  // Heuristic: prefer flows that match the entity implied by externalContextData
  const hasTaskHints =
    'taskId' in externalContextData ||
    'salesTask' in externalContextData ||
    'salesTaskId' in externalContextData ||
    'investmentTask' in externalContextData
  const hasNoteHints =
    'noteId' in externalContextData || 'crmNote' in externalContextData || 'investmentNote' in externalContextData
  const hasActivityHints =
    'activityId' in externalContextData ||
    'salesActivity' in externalContextData ||
    'investmentActivity' in externalContextData

  const getFlowString = (fi: FlowItemReduced): string => {
    const pn = (fi.processName || '').toLowerCase()
    const name = (fi.flowName || '').toLowerCase()
    const trans = (typeof fi.flowNameTranslation === 'string' ? fi.flowNameTranslation : '')?.toLowerCase()
    return `${pn} ${name} ${trans}`
  }

  // Strong filter: if we clearly know the entity, keep only matching flows when possible
  if (hasTaskHints) {
    const onlyTask = allowed.filter(fi => /\b(task|salestask)\b/.test(getFlowString(fi)))
    if (onlyTask.length > 0) allowed = onlyTask
    else allowed = allowed.filter(fi => !/\b(note|crmnote|investmentnote)\b/.test(getFlowString(fi)))
  } else if (hasNoteHints) {
    const onlyNote = allowed.filter(fi => /\b(note|crmnote|investmentnote)\b/.test(getFlowString(fi)))
    if (onlyNote.length > 0) allowed = onlyNote
  } else if (hasActivityHints) {
    const onlyAct = allowed.filter(fi => /(activity|salesactivity|investmentactivity)/.test(getFlowString(fi)))
    if (onlyAct.length > 0) allowed = onlyAct
  }

  const scoreFlow = (fi: FlowItemReduced): number => {
    const str = getFlowString(fi)
    if (hasTaskHints && /task/.test(str)) return 0
    if (hasActivityHints && /(activity|salesactivity|investmentactivity)/.test(str)) return 0
    if (hasNoteHints && /(note|crmnote|investmentnote)/.test(str)) return 0
    // otherwise keep order but deprioritize
    return 1
  }

  allowed = allowed.slice().sort((a, b) => scoreFlow(a) - scoreFlow(b))

  return allowed.map(flowItem => {
    // Create payload directly from externalContextData
    // The context.contextData from the API is just metadata about what context is expected
    const payload: Record<string, any> = { ...externalContextData }

    // Create ActionOption with required properties
    const id = flowItem.id || ''

    let rawFlowName = flowItem.flowName

    if (flowItem.flowNameTranslation) {
      if (typeof flowItem.flowNameTranslation === 'string') {
        rawFlowName = flowItem.flowNameTranslation
      } else if (typeof flowItem.flowNameTranslation === 'object') {
        const currentLocale = getCurrentActiveUserLocale()

        if (flowItem.flowNameTranslation[currentLocale]) {
          rawFlowName = flowItem.flowNameTranslation[currentLocale]
        } else {
          const languageCode = currentLocale.split('-')[0]
          if (flowItem.flowNameTranslation[languageCode]) {
            rawFlowName = flowItem.flowNameTranslation[languageCode]
          } else {
            const commonLocales = ['en', 'de', 'ro', 'en-US', 'de-DE', 'ro-RO']
            for (const locale of commonLocales) {
              if (flowItem.flowNameTranslation[locale]) {
                rawFlowName = flowItem.flowNameTranslation[locale]
                break
              }
            }
          }
        }
      }
    }

    const flowName = formatFlowName(rawFlowName)

    // Handle different flow types differently
    let onClick: () => void

    switch (flowItem.flowType) {
      case 'NAVIGATION':
      case 'REPORT':
        // For NAVIGATION and REPORT types, navigate to the target URL
        onClick = () => {
          // Replace placeholders in targetDesktop with actual values from externalContextData
          let targetUrl = flowItem.targetDesktop

          // The context.contextData tells us what context names are expected
          // We use those names to find values in externalContextData
          if (flowItem.context?.contextData) {
            flowItem.context.contextData.forEach(contextDataItem => {
              const placeholder = `{${contextDataItem.contextDataName}}`
              const contextValue = externalContextData[contextDataItem.contextDataName]

              if (contextValue && targetUrl.includes(placeholder)) {
                targetUrl = targetUrl.replace(placeholder, contextValue)
              }
            })
          }

          // Navigate to the target URL using the navigation utility
          // This handles environment-specific logic (dev vs prod) and platform URL mapping
          navigateTo(targetUrl)
        }
        break

      case 'ACTION':
      default:
        // For ACTION and unknown flow types, start a process
        onClick = () => {
          const builder = (flowItem.builderType || '').toUpperCase()
          const uiBuilder = builder === 'NATIVE_SCREEN' ? 'NATIVE_SCREEN' : 'LOWCODER'
          startProcess({
            processName: flowItem.processName,
            domain: flowItem.domain,
            payload,
            builderType: uiBuilder,
            targetDesktop: flowItem.targetDesktop,
            targetMobile: flowItem.targetMobile
          })
        }
        break
    }

    return {
      key: id,
      label: flowName,
      onClick,
      // Additional properties for internal use
      processName: flowItem.processName,
      domain: flowItem.domain,
      category: flowItem.flowType,
      payload,
      targetDesktop: flowItem.targetDesktop,
      targetMobile: flowItem.targetMobile
    } as ActionOption
  })
}
