import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

/**
 * Default row actions component for task rows
 */
export const DefaultTaskRowActions = <TTask extends { id: string; reference?: any }>({
  row,
  accessToken,
  entityContext
}: {
  row: { original: TTask }
  accessToken: string
  entityContext: FlowContextName
}) => {
  // Build external context data with parent reference
  const externalContextData: Record<string, string> = { taskId: row.original.id }

  // Add parent reference ID based on task reference type
  if (row.original.reference) {
    const refType = row.original.reference.type
    const refId = row.original.reference.id

    switch (refType) {
      case 'investment':
        externalContextData.investmentId = refId
        break
      case 'lead':
        externalContextData.leadId = refId
        break
      case 'account':
        externalContextData.accountId = refId
        break
      case 'contact':
        externalContextData.contactId = refId
        break
      case 'opportunity':
        externalContextData.opportunityId = refId
        break
    }
  }

  return (
    <AppActionMenu
      contextsArray={[entityContext]}
      externalContextData={externalContextData}
      prefixDataTestId="task-actions"
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
    >
      <Button variant="ghost" size="icon" data-testid={`task-actions-${row.original.id}`}>
        <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </Button>
    </AppActionMenu>
  )
}
