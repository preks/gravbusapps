import React, { useEffect, useRef } from 'react'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useAppActionData } from '@/common/hooks/useAppActionData'

interface ContextMenuActionHandlerProps {
  employeeId: string
  absenceTypeId: string
  flowType: string
  startDate: string
  endDate: string
  accessToken: string
  onComplete: () => void
}

/**
 * Component to handle context menu absence action execution
 * Extracted to separate file for better code organization and reusability
 */
export const ContextMenuActionHandler: React.FC<ContextMenuActionHandlerProps> = ({
  employeeId,
  absenceTypeId,
  flowType,
  startDate,
  endDate,
  accessToken,
  onComplete
}) => {
  const hasExecutedRef = useRef(false)
  const actionKeyRef = useRef<string>('')

  // Create a unique key for this action to detect when props actually change
  const currentActionKey = `${employeeId}-${absenceTypeId}-${flowType}-${startDate}-${endDate}`

  const { combinedData, handleDeferredFetch } = useAppActionData(
    {
      contextsArray: [FlowContextName.employeeAbsenceRecord],
      externalContextData: {
        employeeId,
        absenceType: absenceTypeId,
        flowType,
        startDate,
        endDate
      },
      accessToken,
      deferMainContextRequestsUntilClick: false,
      emptyStateBehavior: 'enable'
    },
    'context-menu-absence'
  )

  useEffect(() => {
    // Reset the execution flag when the action key changes (new context menu selection)
    if (actionKeyRef.current !== currentActionKey) {
      hasExecutedRef.current = false
      actionKeyRef.current = currentActionKey
    }
    // Ensure data is fetched
    handleDeferredFetch()
  }, [handleDeferredFetch, currentActionKey])

  useEffect(() => {
    if (combinedData.length > 0 && !hasExecutedRef.current) {
      // Execute the first available action only once
      const firstAction = combinedData[0]
      if (firstAction?.onClick) {
        hasExecutedRef.current = true
        try {
          firstAction.onClick()
          // Reset after a short delay to allow the process to start
          setTimeout(() => {
            onComplete()
          }, 100)
        } catch {
          onComplete()
        }
      } else {
        onComplete()
      }
    }
  }, [combinedData, onComplete, absenceTypeId, flowType, startDate, endDate, employeeId])

  return null
}
