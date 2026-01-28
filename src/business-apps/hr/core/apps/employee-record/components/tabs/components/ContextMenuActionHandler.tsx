import React, { useEffect } from 'react'
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
    // Ensure data is fetched
    handleDeferredFetch()
  }, [handleDeferredFetch])

  useEffect(() => {
    if (combinedData.length > 0) {
      // Execute the first available action
      const firstAction = combinedData[0]
      if (firstAction?.onClick) {
        firstAction.onClick()
        // Reset after a short delay to allow the process to start
        setTimeout(() => {
          onComplete()
        }, 100)
      }
    }
  }, [combinedData, onComplete])

  return null
}
